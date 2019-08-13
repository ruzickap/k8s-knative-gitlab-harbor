# Install GitLab

Add GitLab repository:

```bash
helm repo add gitlab https://charts.gitlab.io/
```

Create `gitlab-system` namespaces with secrets needed for GitLab
(certificates and passwords):

```bash
kubectl create namespace gitlab-system
kubectl create secret generic gitlab-initial-root-password --from-literal=password="admin123" -n gitlab-system
wget -q https://letsencrypt.org/certs/fakelerootx1.pem -O /tmp/fakelerootx1.pem
kubectl create secret generic custom-ca --from-file=unique_name=/tmp/fakelerootx1.pem -n gitlab-system
```

Create Istio Gateways and VirtualServices to allow accessing GitLab from
"outside":

```bash
cat << EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: gitlab-gateway
  namespace: gitlab-system
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
      protocol: HTTP2
    hosts:
    - gitlab.${MY_DOMAIN}
    - minio.${MY_DOMAIN}
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
  namespace: gitlab-system
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
        host: gitlab-gitlab-shell.gitlab-system.svc.cluster.local
        port:
          number: 22
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: gitlab-http-virtual-service
  namespace: gitlab-system
spec:
  hosts:
  - gitlab.${MY_DOMAIN}
  gateways:
  - gitlab-gateway
  http:
  - route:
    - destination:
        host: gitlab-unicorn.gitlab-system.svc.cluster.local
        port:
          number: 8181
  - match:
    - uri:
        prefix: /admin/sidekiq
    route:
    - destination:
        host: gitlab-unicorn.gitlab-system.svc.cluster.local
        port:
          number: 8080
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: gitlab-minio-virtual-service
  namespace: gitlab-system
spec:
  hosts:
  - minio.${MY_DOMAIN}
  gateways:
  - gitlab-gateway
  http:
  - route:
    - destination:
        host: gitlab-minio-svc.gitlab-system.svc.cluster.local
        port:
          number: 9000
EOF
```

Install GitLab using Helm:

(Due to the bug [https://gitlab.com/charts/gitlab/issues/1497](https://gitlab.com/charts/gitlab/issues/1497)
use version `1.9.X` only, until GitLab `12.2` will be released)

```bash
helm install --name gitlab --namespace gitlab-system --wait gitlab/gitlab --version 1.9.7 \
  --set global.edition=ce \
  --set global.hosts.domain=${MY_DOMAIN} \
  --set global.initialRootPassword.secret=gitlab-initial-root-password \
  --set global.ingress.configureCertmanager=false \
  --set global.ingress.enabled=false \
  --set global.appConfig.cron_jobs.stuck_ci_jobs_worker.cron="0 * * * *" \
  --set global.appConfig.cron_jobs.repository_archive_cache_worker.cron="0 * * * *" \
  --set global.appConfig.cron_jobs.ci_archive_traces_cron_worker.cron="17 * * * *" \
  --set global.appConfig.cron_jobs.pipeline_schedule_worker.cron="19 * * * *" \
  --set global.appConfig.cron_jobs.repository_check_worker.cron="20 * * * *" \
  --set global.appConfig.cron_jobs.expire_build_artifacts_worker.cron="50 * * * *" \
  --set global.appConfig.gravatar.plainUrl="https://www.gravatar.com/avatar/%{hash}?s=%{size}&d=identicon" \
  --set global.appConfig.gravatar.sslUrl="https://secure.gravatar.com/avatar/%{hash}?s=%{size}&d=identicon" \
  --set global.certificates.customCAs[0].secret=custom-ca \
  --set certmanager.install=false \
  --set nginx-ingress.enabled=false \
  --set gitlab-runner.install=false \
  --set prometheus.install=false \
  --set registry.enabled=false \
  --set gitlab.gitaly.persistence.size=1Gi \
  --set postgresql.persistence.size=1Gi \
  --set minio.persistence.size=5Gi \
  --set redis.persistence.size=1Gi \
  --set gitlab.unicorn.ingress.enabled=false
```

Try to access the GitLab using the URL [https://gitlab.mylabs.dev](https://gitlab.mylabs.dev)
with following credentials:

* Username: `root`
* Password: `admin123`

Create Personal Access Token `1234567890` for user `root`:

```bash
UNICORN_POD=$(kubectl get pods -n gitlab-system -l=app=unicorn -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n gitlab-system -it $UNICORN_POD -c unicorn -- /bin/bash -c "
cd /srv/gitlab;
bin/rails r \"
token_digest = Gitlab::CryptoHelper.sha256 \\\"1234567890\\\";
token=PersonalAccessToken.create!(name: \\\"Full Access\\\", scopes: [:api], user: User.where(id: 1).first, token_digest: token_digest);
token.save!
\";
"
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

Create a personal access token for user `myuser`:

```bash
kubectl exec -n gitlab-system -it $UNICORN_POD -c unicorn -- /bin/bash -c "
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

Create `tmp` directory"

```bash
test -d tmp || mkdir tmp
```

Create SSH key which will be imported to GitLab:

```bash
ssh-keygen -t ed25519 -f tmp/id_rsa_gitlab -q -N ""
```

Add ssh key to the `myuser`:

```bash
curl -k -X POST -F "private_token=${GILAB_MYUSER_TOKEN}" https://gitlab.${MY_DOMAIN}/api/v4/user/keys -F "title=my_ssh_key" -F "key=$(cat tmp/id_rsa_gitlab.pub)" | jq
```

Create new project:

```bash
PROJECT_ID=$(curl -s -k -X POST -H "Content-type: application/json" -H "PRIVATE-TOKEN: 1234567890" https://gitlab.${MY_DOMAIN}/api/v4/projects/user/${GITLAB_USER_ID} -d \
"{
  \"user_id\": \"${GITLAB_USER_ID}\",
  \"name\": \"my-test-project\",
  \"description\": \"My Test Project\",
  \"wiki_access_level\": \"disabled\",
  \"issues_access_level\": \"disabled\",
  \"builds_access_level\": \"disabled\",
  \"snippets_access_level\": \"disabled\",
  \"container-registry-enabled\": false,
  \"visibility\": \"public\"
}" | jq -r ".id")
```

Clone the [podinfo](https://github.com/stefanprodan/podinfo) project and push
it to the newly created git repository `my-test-project`:

```bash
export GIT_SSH_COMMAND="ssh -i $PWD/tmp/id_rsa_gitlab"
git clone --bare https://github.com/stefanprodan/podinfo tmp/podinfo
git -C tmp/podinfo push --mirror git@gitlab.${MY_DOMAIN}:myuser/my-test-project.git
```
