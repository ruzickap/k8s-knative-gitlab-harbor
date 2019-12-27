# Automated deployment with Tekton

Take a real example [Podinfo](https://github.com/stefanprodan/podinfo)
application and create full pipeline for it...

## Fork podinfo application

Fork the [Podinfo](https://github.com/stefanprodan/podinfo) repository
`podinfo`:

```bash
cd tmp
hub clone "stefanprodan/podinfo"
hub -C "podinfo" fork
```

Output:

```text
Cloning into 'podinfo'...
remote: Enumerating objects: 10, done.
remote: Counting objects: 100% (10/10), done.
remote: Compressing objects: 100% (10/10), done.
remote: Total 5266 (delta 0), reused 3 (delta 0), pack-reused 5256
Receiving objects: 100% (5266/5266), 9.52 MiB | 1.93 MiB/s, done.
Resolving deltas: 100% (2342/2342), done.
Updating ruzickap
From https://github.com/stefanprodan/podinfo
 * [new branch]      gh-pages   -> ruzickap/gh-pages
 * [new branch]      master     -> ruzickap/master
 * [new branch]      v0.x       -> ruzickap/v0.x
 * [new branch]      v1.x       -> ruzickap/v1.x
 * [new branch]      v3.x       -> ruzickap/v3.x
new remote: ruzickap
```

## Create Tekton Triggers configuration

Create new namespace:

```bash
kubectl create namespace getting-started
```

Create the admin user, role and rolebinding:

```bash
cat << EOF | kubectl apply -f -
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: tekton-triggers-admin
  namespace: getting-started
rules:
- apiGroups:
  - tekton.dev
  resources:
  - eventlisteners
  - triggerbindings
  - triggertemplates
  - pipelineresources
  verbs:
  - get
- apiGroups:
  - tekton.dev
  resources:
  - pipelineruns
  - pipelineresources
  verbs:
  - create
- apiGroups:
  - ""
  resources:
  - configmaps
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - apps
  resources:
  - deployments
  verbs:
  - get
  - list
  - watch
  - create
  - patch
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-triggers-admin
  namespace: getting-started
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tekton-triggers-admin-binding
  namespace: getting-started
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: tekton-triggers-admin
EOF
```

Create the `create-webhook` user, role and rolebinding:

```bash
cat << EOF | kubectl apply -f -
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: tekton-triggers-createwebhook
  namespace: getting-started
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - get
  - list
  - create
  - update
  - delete
- apiGroups:
  - tekton.dev
  resources:
  - eventlisteners
  verbs:
  - get
  - list
  - create
  - update
  - delete
- apiGroups:
  - networking.istio.io
  resources:
  - virtualservices
  - gateways
  verbs:
  - create
  - get
  - list
  - delete
  - update
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-triggers-createwebhook
  namespace: getting-started
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tekton-triggers-createwebhook
  namespace: getting-started
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-createwebhook
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: tekton-triggers-createwebhook
EOF
```

Create secret for Harbor registry to let Tekton pipeline to upload the container
image:

```bash
kubectl create secret docker-registry -n getting-started harbor-docker-config \
  --docker-server="${CONTAINER_REGISTRY_SERVER}" \
  --docker-username="${CONTAINER_REGISTRY_USERNAME}" \
  --docker-password="${CONTAINER_REGISTRY_PASSWORD}"
```

Install the Pipeline:

```bash
cat << \EOF | kubectl apply -f -
apiVersion: tekton.dev/v1alpha1
kind: Task
metadata:
  name: build-docker-image-from-git-task
  namespace: getting-started
spec:
  inputs:
    resources:
      - name: docker-source
        type: git
    params:
      - name: pathToDockerFile
        description: The path to the dockerfile to build
        default: /workspace/docker-source/Dockerfile
      - name: pathToContext
        description:
          The build context used by Kaniko
          (https://github.com/GoogleContainerTools/kaniko#kaniko-build-contexts)
        default: /workspace/docker-source
  outputs:
    resources:
      - name: image-source
        type: image
  volumes:
    - name: docker-config
      secret:
        secretName: harbor-docker-config
        items:
          - key: .dockerconfigjson
            path: config.json
    - name: shared-storage
      emptyDir: {}
  steps:
    - name: build
      image: gcr.io/kaniko-project/executor
      env:
        - name: "DOCKER_CONFIG"
          value: "/builder/home/.docker/"
      command:
        - /kaniko/executor
      args:
        - --dockerfile=$(inputs.params.pathToDockerFile)
        - --destination=$(outputs.resources.image-source.url)
        - --context=$(inputs.params.pathToContext)
        - --skip-tls-verify
      volumeMounts:
        - name: docker-config
          mountPath: /builder/home/.docker/
---
apiVersion: tekton.dev/v1alpha1
kind: Task
metadata:
  name: deploy-locally
  namespace: getting-started
spec:
  inputs:
    resources:
      - name: image-source
        type: image
  outputs:
    resources:
    - name: event-to-sink
      type: cloudEvent
  steps:
    - name: run-kubectl
      image: lachlanevenson/k8s-kubectl:latest
      command:
      - sh
      args:
      - -ce
      - |
        set -ex
        kubectl run podinfo --image $(inputs.resources.image-source.url) -o yaml --dry-run | kubectl apply -f -
---
apiVersion: tekton.dev/v1alpha1
kind: Pipeline
metadata:
  name: getting-started-pipeline
  namespace: getting-started
spec:
  resources:
  - name: docker-source
    type: git
  - name: image-source
    type: image
  - name: event-to-sink
    type: cloudEvent
  tasks:
    - name: build-docker-image-from-git-task-run
      taskRef:
        name: build-docker-image-from-git-task
      params:
      - name: pathToDockerFile
        value: Dockerfile
      - name: pathToContext
        value: /workspace/docker-source/
      resources:
        inputs:
        - name: docker-source
          resource: docker-source
        outputs:
        - name: image-source
          resource: image-source
    - name: deploy-locally
      taskRef:
        name: deploy-locally
      resources:
        inputs:
          - name: image-source
            resource: image-source
            from:
              - build-docker-image-from-git-task-run
        outputs:
          - name: event-to-sink
            resource: event-to-sink
---
apiVersion: v1
kind: Service
metadata:
  name: event-display
  namespace: getting-started
  labels:
    app: event-display
spec:
  type: ClusterIP
  ports:
    - name: listener
      port: 8080
      protocol: TCP
  selector:
    app: event-display
---
  apiVersion: v1
  kind: Pod
  metadata:
    name: event-display
    namespace: getting-started
    labels:
      name: event-display
  spec:
    hostname: event-display
    containers:
    - image: gcr.io/knative-releases/github.com/knative/eventing-sources/cmd/event_display
      name: web
EOF
```

Install the TriggerTemplate, TriggerBinding and EventListener:

```bash
cat << EOF | kubectl apply -f -
apiVersion: tekton.dev/v1alpha1
kind: TriggerTemplate
metadata:
  name: getting-started-triggertemplate
  namespace: getting-started
spec:
  params:
    - name: gitrevision
      description: The git revision
      default: master
    - name: gitrepositoryurl
      description: The git repository url
    - name: image_registry_url
      description: The container registry url
    - name: namespace
      description: The namespace to create the resources
  resourcetemplates:
    - apiVersion: tekton.dev/v1alpha1
      kind: PipelineResource
      metadata:
        name: source-repo-\$(uid)
        namespace: \$(params.namespace)
      spec:
        type: git
        params:
        - name: revision
          value: \$(params.gitrevision)
        - name: url
          value: \$(params.gitrepositoryurl)
    - apiVersion: tekton.dev/v1alpha1
      kind: PipelineResource
      metadata:
        name: image-source-\$(uid)
        namespace: \$(params.namespace)
      spec:
        type: image
        params:
          - name: url
            value: \$(params.image_registry_url)
    - apiVersion: tekton.dev/v1alpha1
      kind: PipelineResource
      metadata:
        name: event-to-sink-\$(uid)
        namespace: \$(params.namespace)
      spec:
        type: cloudEvent
        params:
          - name: targetURI
            value: http://event-display.getting-started.svc.cluster.local
    - apiVersion: tekton.dev/v1alpha1
      kind: PipelineRun
      metadata:
        name: getting-started-pipeline-run-\$(uid)
        namespace: \$(params.namespace)
      spec:
        serviceAccount: tekton-triggers-admin
        pipelineRef:
          name: getting-started-pipeline
        resources:
          - name: docker-source
            resourceRef:
              name: source-repo-\$(uid)
          - name: image-source
            resourceRef:
              name: image-source-\$(uid)
          - name: event-to-sink
            resourceRef:
              name: event-to-sink-\$(uid)
---
apiVersion: tekton.dev/v1alpha1
kind: TriggerBinding
metadata:
  name: getting-started-pipelinebinding
  namespace: getting-started
spec:
  params:
    - name: gitrevision
      value: \$(body.head_commit.id)
    - name: namespace
      value: getting-started
    - name: gitrepositoryurl
      value: "https://github.com/\$(body.repository.full_name)"
    - name: image_registry_url
      value: "harbor.${MY_DOMAIN}/library/\$(body.repository.name)"
---
apiVersion: tekton.dev/v1alpha1
kind: EventListener
metadata:
  name: getting-started-listener
  namespace: getting-started
spec:
  serviceAccountName: tekton-triggers-admin
  triggers:
    - binding:
        name: getting-started-pipelinebinding
      template:
        name: getting-started-triggertemplate
EOF
```

### Configure webhook

Create Task which will create Istio Gateway and VirtualService to handle
incoming webhook form GitHub:

```bash
cat << \EOF2 | kubectl apply -f -
apiVersion: tekton.dev/v1alpha1
kind: Task
metadata:
  name: create-istio-gateway-virtualservice
  namespace: getting-started
spec:
  volumes:
  - name: work
    emptyDir: {}

  inputs:
    params:
    - name: TLScredentialName
      description: "Specify the secret with wildcard certificate"
    - name: ExternalDomain
      description: "The external domain for the EventListener"
    - name: Service
      description: "The name of the Service used in the VirtualService"
    - name: ServicePort
      description: "The service port that the VirtualService is being created on"

  steps:
  - name: create-istio-gateway-virtualservice
    image: lachlanevenson/k8s-kubectl:latest
    command:
    - sh
    args:
    - -ce
    - |
      set -ex
      cat << EOF | kubectl create -f -
      apiVersion: networking.istio.io/v1alpha3
      kind: Gateway
      metadata:
        name: $(inputs.params.Service)-gateway
      spec:
        selector:
          istio: ingressgateway
        servers:
        - port:
            number: 443
            name: https-$(inputs.params.Service)
            protocol: HTTPS
          hosts:
          - $(inputs.params.ExternalDomain)
          tls:
            credentialName: $(inputs.params.TLScredentialName)
            mode: SIMPLE
            privateKey: sds
            serverCertificate: sds
      ---
      apiVersion: networking.istio.io/v1alpha3
      kind: VirtualService
      metadata:
        name: $(inputs.params.Service)-virtual-service
      spec:
        hosts:
        - $(inputs.params.ExternalDomain)
        gateways:
        - $(inputs.params.Service)-gateway
        http:
        - route:
          - destination:
              host: $(inputs.params.Service)
              port:
                number: $(inputs.params.ServicePort)
      EOF
EOF2
```

Create TaskRun to start `create-istio-gateway-virtualservice` Task:

```bash
cat << EOF | kubectl apply -f -
apiVersion: tekton.dev/v1alpha1
kind: TaskRun
metadata:
  name: create-istio-gateway-virtualservice-run
  namespace: getting-started
spec:
  taskRef:
    name: create-istio-gateway-virtualservice
  inputs:
    params:
    - name: TLScredentialName
      value: ingress-cert-${LETSENCRYPT_ENVIRONMENT}
    - name: ExternalDomain
      value: getting-started.${MY_DOMAIN}
    - name: Service
      value: el-getting-started-listener
    - name: ServicePort
      value: "8080"
  timeout: 1000s
  serviceAccount: tekton-triggers-createwebhook
EOF
```

Create webhook Task:

```bash
cat << \EOF | kubectl apply -f -
apiVersion: tekton.dev/v1alpha1
kind: Task
metadata:
  name: create-webhook
  namespace: getting-started
spec:
  volumes:
  - name: github-secret
    secret:
      secretName: $(inputs.params.GitHubSecretName)

  inputs:
    params:
    - name: ExternalDomain
      description: "The external domain for the EventListener e.g. `$(inputs.params.EventListenerName).<PROXYIP>.nip.io`"
    - name: GitHubUser
      description: "The GitHub user"
    - name: GitHubRepo
      description: "The GitHub repo where the webhook will be created"
    - name: GitHubOrg
      description: "The GitHub organization where the webhook will be created"
    - name: GitHubSecretName
      description: "The Secret name for GitHub access token. This is always mounted and must exist"
    - name: GitHubAccessTokenKey
      description: "The GitHub access token key name"
    - name: GitHubSecretStringKey
      description: "The GitHub secret string key name"
    - name: GitHubDomain
      description: "The GitHub domain. Override for GitHub Enterprise"
      default: "github.com"
    - name: WebhookEvents
      description: "List of events the webhook will send notifications for"
      default: "[\\\"push\\\",\\\"pull_request\\\"]"

  steps:
  - name: create-webhook
    image: pstauffer/curl:latest
    volumeMounts:
    - name: github-secret
      mountPath: /var/secret
    command:
    - sh
    args:
    - -ce
    - |
      set -e
      echo "Create Webhook"
      if [ $(inputs.params.GitHubDomain) = "github.com" ];then
        curl -v -d "{\"name\": \"web\",\"active\": true,\"events\": $(inputs.params.WebhookEvents),\"config\": {\"url\": \"https://$(inputs.params.ExternalDomain)\",\"content_type\": \"json\",\"insecure_ssl\": \"1\" ,\"secret\": \"$(cat /var/secret/$(inputs.params.GitHubSecretStringKey))\"}}" -X POST -u $(inputs.params.GitHubUser):$(cat /var/secret/$(inputs.params.GitHubAccessTokenKey)) -L https://api.github.com/repos/$(inputs.params.GitHubOrg)/$(inputs.params.GitHubRepo)/hooks
      else
        curl -d "{\"name\": \"web\",\"active\": true,\"events\": $(inputs.params.WebhookEvents),\"config\": {\"url\": \"https://$(inputs.params.ExternalDomain)/\",\"content_type\": \"json\",\"insecure_ssl\": \"1\" ,\"secret\": \"$(cat /var/secret/$(inputs.params.GitHubSecretStringKey))\"}}" -X POST -u $(inputs.params.GitHubUser):$(cat /var/secret/$(inputs.params.GitHubAccessTokenKey)) -L https://$(inputs.params.GitHubDomain)/api/v3/repos/$(inputs.params.GitHubOrg)/$(inputs.params.GitHubRepo)/hooks
      fi
EOF
```

Create secret with [GitHub Personal Access Token](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line#creating-a-token):

```bash
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: webhook-secret
  namespace: getting-started
stringData:
  token: ${GITHUB_API_TOKEN}
  secret: random-string-data
EOF
```

Create TaskRun to initiate Webhook:

```bash
sleep 20 # Wait for DNS created by previous TaskRun
cat << EOF | kubectl apply -f -
apiVersion: tekton.dev/v1alpha1
kind: TaskRun
metadata:
  name: create-webhook-run
  namespace: getting-started
spec:
  taskRef:
    name: create-webhook
  inputs:
    params:
    - name: GitHubOrg
      value: "ruzickap"
    - name: GitHubUser
      value: "ruzickap"
    - name: GitHubRepo
      value: "podinfo"
    - name: GitHubSecretName
      value: webhook-secret
    - name: GitHubAccessTokenKey
      value: token
    - name: GitHubSecretStringKey
      value: secret
    - name: ExternalDomain
      value: getting-started.${MY_DOMAIN}
  timeout: 1000s
  serviceAccount: tekton-triggers-createwebhook
EOF
sleep 5
```

Verify if the TaskRuns were successfully executed:

```bash
kubectl get taskruns.tekton.dev -n getting-started
```

Output:

```text
NAME                                      SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
create-istio-gateway-virtualservice-run   True        Succeeded   80s         71s
create-webhook-run                        Unknown     Pending     2s
```

Look at the logs from `create-istio-gateway-virtualservice` TaskRun:

```bash
tkn taskrun logs -n getting-started create-istio-gateway-virtualservice-run
```

Output:

```text
[create-istio-gateway-virtualservice] + + kubectl create -f -
[create-istio-gateway-virtualservice] cat
[create-istio-gateway-virtualservice] gateway.networking.istio.io/el-getting-started-listener-gateway created
[create-istio-gateway-virtualservice] virtualservice.networking.istio.io/el-getting-started-listener-virtual-service created
```

Look at the logs from `create-webhook-run` TaskRun:

```bash
tkn taskrun logs -n getting-started create-webhook-run
```

Output:

```text
[create-webhook] Create Webhook
[create-webhook] Note: Unnecessary use of -X or --request, POST is already inferred.
[create-webhook]   % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
[create-webhook]                                  Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0*   Trying 140.82.118.6...
[create-webhook] * TCP_NODELAY set
[create-webhook] * Connected to api.github.com (140.82.118.6) port 443 (#0)
[create-webhook] * ALPN, offering h2
[create-webhook] * ALPN, offering http/1.1
[create-webhook] * successfully set certificate verify locations:
[create-webhook] *   CAfile: /etc/ssl/certs/ca-certificates.crt
[create-webhook]   CApath: none
[create-webhook] * TLSv1.2 (OUT), TLS handshake, Client hello (1):
[create-webhook] } [232 bytes data]
[create-webhook] * TLSv1.2 (IN), TLS handshake, Server hello (2):
[create-webhook] { [108 bytes data]
[create-webhook] * TLSv1.2 (IN), TLS handshake, Certificate (11):
[create-webhook] { [2851 bytes data]
[create-webhook] * TLSv1.2 (IN), TLS handshake, Server key exchange (12):
[create-webhook] { [300 bytes data]
[create-webhook] * TLSv1.2 (IN), TLS handshake, Server finished (14):
[create-webhook] { [4 bytes data]
[create-webhook] * TLSv1.2 (OUT), TLS handshake, Client key exchange (16):
[create-webhook] } [37 bytes data]
[create-webhook] * TLSv1.2 (OUT), TLS change cipher, Client hello (1):
[create-webhook] } [1 bytes data]
[create-webhook] * TLSv1.2 (OUT), TLS handshake, Finished (20):
[create-webhook] } [16 bytes data]
[create-webhook] * TLSv1.2 (IN), TLS change cipher, Client hello (1):
[create-webhook] { [1 bytes data]
[create-webhook] * TLSv1.2 (IN), TLS handshake, Finished (20):
[create-webhook] { [16 bytes data]
[create-webhook] * SSL connection using TLSv1.2 / ECDHE-RSA-AES128-GCM-SHA256
[create-webhook] * ALPN, server accepted to use http/1.1
[create-webhook] * Server certificate:
[create-webhook] *  subject: C=US; ST=California; L=San Francisco; O=GitHub, Inc.; CN=*.github.com
[create-webhook] *  start date: Jul  8 00:00:00 2019 GMT
[create-webhook] *  expire date: Jul 16 12:00:00 2020 GMT
[create-webhook] *  subjectAltName: host "api.github.com" matched cert's "*.github.com"
[create-webhook] *  issuer: C=US; O=DigiCert Inc; OU=www.digicert.com; CN=DigiCert SHA2 High Assurance Server CA
[create-webhook] *  SSL certificate verify ok.
[create-webhook] * Server auth using Basic with user 'ruzickap'
[create-webhook] > POST /repos/ruzickap/podinfo/hooks HTTP/1.1
[create-webhook] > Host: api.github.com
[create-webhook] > Authorization: Basic cnxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxU3MA==
[create-webhook] > User-Agent: curl/7.60.0
[create-webhook] > Accept: */*
[create-webhook] > Content-Length: 195
[create-webhook] > Content-Type: application/x-www-form-urlencoded
[create-webhook] >
[create-webhook] } [195 bytes data]
[create-webhook] * upload completely sent off: 195 out of 195 bytes
[create-webhook] < HTTP/1.1 201 Created
[create-webhook] < Date: Fri, 27 Dec 2019 10:19:37 GMT
[create-webhook] < Content-Type: application/json; charset=utf-8
[create-webhook] < Content-Length: 688
[create-webhook] < Server: GitHub.com
[create-webhook] < Status: 201 Created
[create-webhook] < X-RateLimit-Limit: 5000
[create-webhook] < X-RateLimit-Remaining: 4992
[create-webhook] < X-RateLimit-Reset: 1577445296
[create-webhook] < Cache-Control: private, max-age=60, s-maxage=60
[create-webhook] < Vary: Accept, Authorization, Cookie, X-GitHub-OTP
[create-webhook] < ETag: "a9xxxxxxxxxxxxxxxxxxxxxxxxxxxxe3"
[create-webhook] < X-OAuth-Scopes: admin:org_hook, admin:repo_hook, delete_repo, read:org, repo, user:email
[create-webhook] < X-Accepted-OAuth-Scopes: admin:repo_hook, public_repo, repo, write:repo_hook
[create-webhook] < Location: https://api.github.com/repos/ruzickap/podinfo/hooks/170061618
[create-webhook] < X-GitHub-Media-Type: github.v3; format=json
[create-webhook] < Access-Control-Expose-Headers: ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type
[create-webhook] < Access-Control-Allow-Origin: *
[create-webhook] < Strict-Transport-Security: max-age=31536000; includeSubdomains; preload
[create-webhook] < X-Frame-Options: deny
[create-webhook] < X-Content-Type-Options: nosniff
[create-webhook] < X-XSS-Protection: 1; mode=block
[create-webhook] < Referrer-Policy: origin-when-cross-origin, strict-origin-when-cross-origin
[create-webhook] < Content-Security-Policy: default-src 'none'
[create-webhook] < Vary: Accept-Encoding
[create-webhook] < X-GitHub-Request-Id: CEXX:XXXXX:XXXXXXX:XXXXXXX:XXXXXXB9
[create-webhook] <
[create-webhook] { [688 bytes data]
100   883  100   688  100   195   1746    494 --:--:-- --:--:-- --:--:--  2241
[create-webhook] * Connection #0 to host api.github.com left intact
[create-webhook] {
[create-webhook]   "type": "Repository",
[create-webhook]   "id": 170061618,
[create-webhook]   "name": "web",
[create-webhook]   "active": true,
[create-webhook]   "events": [
[create-webhook]     "pull_request",
[create-webhook]     "push"
[create-webhook]   ],
[create-webhook]   "config": {
[create-webhook]     "content_type": "json",
[create-webhook]     "insecure_ssl": "1",
[create-webhook]     "secret": "********",
[create-webhook]     "url": "https://getting-started.mylabs.dev"
[create-webhook]   },
[create-webhook]   "updated_at": "2019-12-27T10:19:37Z",
[create-webhook]   "created_at": "2019-12-27T10:19:37Z",
[create-webhook]   "url": "https://api.github.com/repos/ruzickap/podinfo/hooks/170061618",
[create-webhook]   "test_url": "https://api.github.com/repos/ruzickap/podinfo/hooks/170061618/test",
[create-webhook]   "ping_url": "https://api.github.com/repos/ruzickap/podinfo/hooks/170061618/pings",
[create-webhook]   "last_response": {
[create-webhook]     "code": null,
[create-webhook]     "status": "unused",
[create-webhook]     "message": null
[create-webhook]   }
[create-webhook] }
```

You should also see in the GitHub / Settings / Webhook the registration [https://github.com/ruzickap/podinfo/settings/hooks/](https://github.com/ruzickap/podinfo/settings/hooks/):

![GitHub Webhooks](./GitHub_Webhooks.png "GitHub Webhooks")

After clicking on the Webhook you can see the details:

![GitHub Webhooks - Details](./GitHub_Webhooks-Details.png "GitHub Webhooks - Details")

In case you are troubleshooting the incoming traffic from GitHub the look at
the logs of the pod. You should be able to see the details
in the `kubectl logs`.

```bash
kubectl get pods -n getting-started -l eventlistener=getting-started-listener
sleep 5
```

Output:

```text
NAME                                          READY   STATUS    RESTARTS   AGE
el-getting-started-listener-fcffc467d-xwsfp   1/1     Running   0          2m6s
```

## Change the source code of the app

Trigger the pipeline by calling the:

```bash
echo "Trigger build" >> podinfo/README.md
git -C podinfo commit -s -a -m "Standard version"
git -C podinfo push ruzickap
sleep 30
kubectl --timeout=10m -n getting-started wait --for=condition=Succeeded pipelineruns --all
sleep 5
```

Output:

```text
[master d4120e6] Standard version
 1 file changed, 1 insertion(+), 1 deletion(-)
Warning: Permanently added '[ssh.github.com]:443,[192.30.253.122]:443' (RSA) to the list of known hosts.
Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Delta compression using up to 4 threads
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 325 bytes | 162.00 KiB/s, done.
Total 3 (delta 2), reused 0 (delta 0)
remote: Resolving deltas: 100% (2/2), completed with 2 local objects.
To github.com:ruzickap/podinfo.git
   948de81..d4120e6  master -> master
pipelinerun.tekton.dev/getting-started-pipeline-run-fzrtg condition met
```

Look at the logs of the newly deployed pod (look at `"Starting podinfo"`):

```bash
PODINFO_POD=$(kubectl get pods -n getting-started -l=run=podinfo -o jsonpath="{.items[0].metadata.name}")
kubectl -n getting-started logs -n getting-started ${PODINFO_POD}
```

Output:

```json
{"level":"info","ts":"2019-11-27T15:00:58.907Z","caller":"podinfo/main.go:120","msg":"Starting podinfo","version":"3.1.5","revision":"164a27b33b09d1b50fad277a60a6c19d353cb9d8","port":"9898"}
```

Let's try to change the code of the application:

```bash
sed -i "s/Starting podinfo/Starting podinfo - new Tekton build version/" podinfo/cmd/podinfo/main.go
git -C podinfo diff
git -C podinfo commit -s -a -m "String changed"
git -C podinfo push ruzickap
sleep 20
```

Output:

```text
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
modified: cmd/podinfo/main.go
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
@ cmd/podinfo/main.go:120 @ func main() {
    }

    // log version and port
    logger.Info("Starting podinfo",
    logger.Info("Starting podinfo - new Tekton build version",
        zap.String("version", viper.GetString("version")),
        zap.String("revision", viper.GetString("revision")),
        zap.String("port", srvCfg.Port),
[master 4d9f5bc] String changed
 1 file changed, 1 insertion(+), 1 deletion(-)
Warning: Permanently added '[ssh.github.com]:443,[192.30.253.122]:443' (RSA) to the list of known hosts.
Enumerating objects: 9, done.
Counting objects: 100% (9/9), done.
Delta compression using up to 4 threads
Compressing objects: 100% (4/4), done.
Writing objects: 100% (5/5), 459 bytes | 459.00 KiB/s, done.
Total 5 (delta 2), reused 0 (delta 0)
remote: Resolving deltas: 100% (2/2), completed with 2 local objects.
To github.com:ruzickap/podinfo.git
   d4120e6..4d9f5bc  master -> master
```

Wait for the pipelines to complete:

```bash
kubectl --timeout=10m -n getting-started wait --for=condition=Succeeded pipelineruns --all
sleep 5
```

Output:

```text
pipelinerun.tekton.dev/getting-started-pipeline-run-dzqdl condition met
pipelinerun.tekton.dev/getting-started-pipeline-run-fzrtg condition met
```

Check how the logs of the newly deployed podinfo logs should contain
"Starting podinfo - new Tekton build version":

```bash
PODINFO_POD=$(kubectl get pods -n getting-started -l=run=podinfo -o jsonpath="{.items[0].metadata.name}")
kubectl -n getting-started delete pod -n getting-started ${PODINFO_POD}
sleep 5
PODINFO_POD=$(kubectl get pods -n getting-started -l=run=podinfo -o jsonpath="{.items[0].metadata.name}")
kubectl -n getting-started logs -n getting-started ${PODINFO_POD}
cd ..
```

Output:

```json
pod "podinfo-6ccfb5f9b6-bwrbn" deleted
{"level":"info","ts":"2019-12-27T10:28:22.304Z","caller":"podinfo/main.go:120","msg":"Starting podinfo - new Tekton build version","version":"3.1.5","revision":"4d9f5bc71bd9a8c7ae44a9cd9631e45067727a2e","port":"9898"}
```
