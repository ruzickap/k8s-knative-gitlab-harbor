# Install GitLab

Add GitLab repository:

```bash
helm repo add gitlab https://charts.gitlab.io/
helm repo update
```

Create `gitlab` namespaces with secrets needed for GitLab
(certificates and passwords):

```bash
kubectl create namespace gitlab
kubectl create secret generic gitlab-initial-root-password --from-literal=password="admin123" -n gitlab
kubectl create secret generic custom-ca --from-file=unique_name=tmp/fakelerootx1.pem -n gitlab
```

Create Istio Gateways and VirtualServices to allow accessing GitLab from
"outside":

```bash
cat << EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: gitlab-gateway
  namespace: gitlab
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 22
      name: ssh-gitlab
      protocol: TCP
    hosts:
    - gitlab.${MY_DOMAIN}
  - port:
      number: 80
      name: http-gitlab
      protocol: HTTP
    hosts:
    - gitlab.${MY_DOMAIN}
    - minio.${MY_DOMAIN}
    tls:
      httpsRedirect: true
  - port:
      number: 443
      name: https-gitlab
      protocol: HTTPS
    hosts:
    - gitlab.${MY_DOMAIN}
    - minio.${MY_DOMAIN}
    tls:
      credentialName: ingress-cert-${LETSENCRYPT_ENVIRONMENT}
      mode: SIMPLE
      privateKey: sds
      serverCertificate: sds
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: gitlab-ssh-virtual-service
  namespace: gitlab
spec:
  hosts:
  - gitlab.${MY_DOMAIN}
  gateways:
  - gitlab-gateway
  tcp:
  - match:
    - port: 22
    route:
    - destination:
        host: gitlab-gitlab-shell.gitlab.svc.cluster.local
        port:
          number: 22
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: gitlab-http-virtual-service
  namespace: gitlab
spec:
  hosts:
  - gitlab.${MY_DOMAIN}
  gateways:
  - gitlab-gateway
  http:
  - match:
    - uri:
        prefix: /admin/sidekiq
    route:
    - destination:
        host: gitlab-unicorn.gitlab.svc.cluster.local
        port:
          number: 8080
  - route:
    - destination:
        host: gitlab-unicorn.gitlab.svc.cluster.local
        port:
          number: 8181
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: gitlab-minio-virtual-service
  namespace: gitlab
spec:
  hosts:
  - minio.${MY_DOMAIN}
  gateways:
  - gitlab-gateway
  http:
  - route:
    - destination:
        host: gitlab-minio-svc.gitlab.svc.cluster.local
        port:
          number: 9000
EOF
```

Install GitLab using Helm:

```bash
helm install gitlab gitlab/gitlab --namespace gitlab --wait --version 2.6.0 \
  --set certmanager.install=false \
  --set gitlab-runner.install=false \
  --set gitlab.gitaly.persistence.size=1Gi \
  --set gitlab.unicorn.ingress.enabled=false \
  --set global.appConfig.cron_jobs.ci_archive_traces_cron_worker.cron="17 * * * *" \
  --set global.appConfig.cron_jobs.expire_build_artifacts_worker.cron="50 * * * *" \
  --set global.appConfig.cron_jobs.pipeline_schedule_worker.cron="19 * * * *" \
  --set global.appConfig.cron_jobs.repository_archive_cache_worker.cron="0 * * * *" \
  --set global.appConfig.cron_jobs.repository_check_worker.cron="20 * * * *" \
  --set global.appConfig.cron_jobs.stuck_ci_jobs_worker.cron="0 * * * *" \
  --set global.appConfig.gravatar.plainUrl="https://www.gravatar.com/avatar/%{hash}?s=%{size}&d=identicon" \
  --set global.appConfig.gravatar.sslUrl="https://secure.gravatar.com/avatar/%{hash}?s=%{size}&d=identicon" \
  --set global.certificates.customCAs[0].secret=custom-ca \
  --set global.edition=ce \
  --set global.hosts.domain=${MY_DOMAIN} \
  --set global.ingress.configureCertmanager=false \
  --set global.ingress.enabled=false \
  --set global.initialRootPassword.secret=gitlab-initial-root-password \
  --set minio.persistence.size=5Gi \
  --set nginx-ingress.enabled=false \
  --set postgresql.persistence.size=1Gi \
  --set prometheus.install=false \
  --set redis.persistence.size=1Gi \
  --set registry.enabled=false
```

Output:

```text
NAME: gitlab
LAST DEPLOYED: Fri Dec 27 10:57:01 2019
NAMESPACE: gitlab
STATUS: deployed
REVISION: 1
NOTES:
WARNING: Automatic TLS certificate generation with cert-manager is disabled and no TLS certificates were provided. Self-signed certificates were generated.

You may retrieve the CA root for these certificates from the `gitlab-wildcard-tls-ca` secret, via the following command. It can then be imported to a web browser or system store.

    kubectl get secret gitlab-wildcard-tls-ca -ojsonpath='{.data.cfssl_ca}' | base64 --decode > gitlab.mylabs.dev.ca.pem

If you do not wish to use self-signed certificates, please set the following properties:
  - global.ingress.tls.secretName
  OR
  - gitlab.unicorn.ingress.tls.secretName
  - minio.ingress.tls.secretName
```

Try to access the GitLab using the URL [https://gitlab.mylabs.dev](https://gitlab.mylabs.dev)
with following credentials:

* Username: `root`
* Password: `admin123`

Create Personal Access Token `1234567890` for user `root`:

```bash
UNICORN_POD=$(kubectl get pods -n gitlab -l=app=unicorn -o jsonpath="{.items[0].metadata.name}")
echo ${UNICORN_POD}
kubectl exec -n gitlab -it $UNICORN_POD -c unicorn -- /bin/bash -c "
cd /srv/gitlab;
bin/rails r \"
token_digest = Gitlab::CryptoHelper.sha256 \\\"1234567890\\\";
token=PersonalAccessToken.create!(name: \\\"Full Access\\\", scopes: [:api], user: User.where(id: 1).first, token_digest: token_digest);
token.save!
\";
"
```

Output:

```text
gitlab-unicorn-566c465dc4-4dwdz
```

Create new user `myuser`:

```bash
GITLAB_USER_ID=$(curl -s -k -X POST -H "Content-type: application/json" -H "PRIVATE-TOKEN: 1234567890" https://gitlab.${MY_DOMAIN}/api/v4/users -d \
"{
  \"name\": \"myuser\",
  \"username\": \"myuser\",
  \"password\": \"myuser_password\",
  \"email\": \"myuser@${MY_DOMAIN}\",
  \"skip_confirmation\": true
}" | jq ".id")
echo ${GITLAB_USER_ID}
```

Output:

```text
2
```

Create a personal access token for user `myuser`:

```bash
kubectl exec -n gitlab -it $UNICORN_POD -c unicorn -- /bin/bash -c "
cd /srv/gitlab;
bin/rails r \"
token_digest = Gitlab::CryptoHelper.sha256 \\\"0987654321\\\";
token=PersonalAccessToken.create!(name: \\\"Full Access\\\", scopes: [:api], user: User.where(id: ${GITLAB_USER_ID}).first, token_digest: token_digest);
token.save!
\";
"
```

Create Impersonation token for `myuser`:

```bash
GILAB_MYUSER_TOKEN=$(curl -s -k -X POST -H "Content-type: application/json" -H "PRIVATE-TOKEN: 1234567890" https://gitlab.${MY_DOMAIN}/api/v4/users/${GITLAB_USER_ID}/impersonation_tokens -d \
"{
  \"name\": \"mytoken\",
  \"scopes\": [\"api\"]
}" | jq -r ".token")
echo ${GILAB_MYUSER_TOKEN}
```

Output:

```text
t_dJwRNpVkdsxWzs3Yv3
```

Create SSH key which will be imported to GitLab:

```bash
ssh-keygen -t ed25519 -f tmp/id_rsa_gitlab -q -N "" -C "my_ssh_key@mylabs.dev"
```

Add ssh key to the `myuser`:

```bash
curl -sk -X POST -F "private_token=${GILAB_MYUSER_TOKEN}" https://gitlab.${MY_DOMAIN}/api/v4/user/keys -F "title=my_ssh_key" -F "key=$(cat tmp/id_rsa_gitlab.pub)" | jq
```

Output:

```json
{
  "id": 1,
  "title": "my_ssh_key",
  "key": "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKH2+gqsWrziaAmzGumc/frT0EBMSrXSP0MT/jRcKwtm my_ssh_key@mylabs.dev",
  "created_at": "2019-12-27T10:01:45.403Z"
}
```

Create new project:

```bash
PROJECT_ID=$(curl -s -k -X POST -H "Content-type: application/json" -H "PRIVATE-TOKEN: 1234567890" https://gitlab.${MY_DOMAIN}/api/v4/projects/user/${GITLAB_USER_ID} -d \
"{
  \"user_id\": \"${GITLAB_USER_ID}\",
  \"name\": \"my-podinfo\",
  \"description\": \"My Test Project\",
  \"wiki_access_level\": \"disabled\",
  \"issues_access_level\": \"disabled\",
  \"builds_access_level\": \"disabled\",
  \"snippets_access_level\": \"disabled\",
  \"container-registry-enabled\": false,
  \"visibility\": \"public\"
}" | jq -r ".id")
echo ${PROJECT_ID}
```

Output:

```text
1
```

Clone the [podinfo](https://github.com/stefanprodan/podinfo) project and push
it to the newly created git repository `my-podinfo`:

```bash
export GIT_SSH_COMMAND="ssh -i $PWD/tmp/id_rsa_gitlab -o UserKnownHostsFile=/dev/null"
git clone --bare https://github.com/stefanprodan/podinfo tmp/podinfo
git -C tmp/podinfo push --mirror git@gitlab.${MY_DOMAIN}:myuser/my-podinfo.git
rm -rf tmp/podinfo
```

Output:

```text
loning into bare repository 'tmp/podinfo'...
remote: Enumerating objects: 10, done.
remote: Counting objects: 100% (10/10), done.
remote: Compressing objects: 100% (10/10), done.
remote: Total 5266 (delta 0), reused 3 (delta 0), pack-reused 5256
Receiving objects: 100% (5266/5266), 9.52 MiB | 1.28 MiB/s, done.
Resolving deltas: 100% (2342/2342), done.
Warning: Permanently added 'gitlab.mylabs.dev,18.184.227.16' (ECDSA) to the list of known hosts.
Enumerating objects: 5266, done.
Counting objects: 100% (5266/5266), done.
Delta compression using up to 4 threads
Compressing objects: 100% (2544/2544), done.
Writing objects: 100% (5266/5266), 9.52 MiB | 6.95 MiB/s, done.
Total 5266 (delta 2342), reused 5266 (delta 2342)
remote: Resolving deltas: 100% (2342/2342), done.
remote:
remote: To create a merge request for gh-pages, visit:
remote:   https://gitlab.mylabs.dev/myuser/my-podinfo/merge_requests/new?merge_request%5Bsource_branch%5D=gh-pages
remote:
remote: To create a merge request for v0.x, visit:
remote:   https://gitlab.mylabs.dev/myuser/my-podinfo/merge_requests/new?merge_request%5Bsource_branch%5D=v0.x
remote:
remote: To create a merge request for v1.x, visit:
remote:   https://gitlab.mylabs.dev/myuser/my-podinfo/merge_requests/new?merge_request%5Bsource_branch%5D=v1.x
remote:
remote: To create a merge request for v3.x, visit:
remote:   https://gitlab.mylabs.dev/myuser/my-podinfo/merge_requests/new?merge_request%5Bsource_branch%5D=v3.x
remote:
To gitlab.mylabs.dev:myuser/my-podinfo.git
 * [new branch]      gh-pages -> gh-pages
 * [new branch]      master -> master
 * [new branch]      v0.x -> v0.x
 * [new branch]      v1.x -> v1.x
 * [new branch]      v3.x -> v3.x
 * [new tag]         0.2.2 -> 0.2.2
 * [new tag]         2.0.0 -> 2.0.0
 * [new tag]         2.0.1 -> 2.0.1
 * [new tag]         2.0.2 -> 2.0.2
 * [new tag]         2.1.0 -> 2.1.0
 * [new tag]         2.1.1 -> 2.1.1
 * [new tag]         2.1.2 -> 2.1.2
 * [new tag]         2.1.3 -> 2.1.3
 * [new tag]         3.0.0 -> 3.0.0
 * [new tag]         3.1.0 -> 3.1.0
 * [new tag]         3.1.1 -> 3.1.1
 * [new tag]         3.1.2 -> 3.1.2
 * [new tag]         3.1.3 -> 3.1.3
 * [new tag]         3.1.4 -> 3.1.4
 * [new tag]         3.1.5 -> 3.1.5
 * [new tag]         flux-floral-pine-16 -> flux-floral-pine-16
 * [new tag]         flux-thawing-star-34 -> flux-thawing-star-34
 * [new tag]         v0.4.0 -> v0.4.0
 * [new tag]         v0.5.0 -> v0.5.0
 * [new tag]         v1.0.0 -> v1.0.0
 * [new tag]         v1.1.0 -> v1.1.0
 * [new tag]         v1.1.1 -> v1.1.1
 * [new tag]         v1.2.0 -> v1.2.0
 * [new tag]         v1.2.1 -> v1.2.1
 * [new tag]         v1.3.0 -> v1.3.0
 * [new tag]         v1.3.1 -> v1.3.1
 * [new tag]         v1.4.0 -> v1.4.0
 * [new tag]         v1.4.1 -> v1.4.1
 * [new tag]         v1.4.2 -> v1.4.2
 * [new tag]         v1.6.0 -> v1.6.0
 * [new tag]         v1.7.0 -> v1.7.0
 * [new tag]         v1.8.0 -> v1.8.0
```

GitLab Screenshot:

![GitLab](./GitLab.png "GitLab")
