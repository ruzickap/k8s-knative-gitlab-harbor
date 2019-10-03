# Install Knative

Set Knative version variable

```bash
export KNATIVE_VERSION="v0.9.0"
```

Knative installation...

```bash
kubectl apply --selector knative.dev/crd-install=true \
   --filename https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/serving.yaml \
   --filename https://github.com/knative/eventing/releases/download/${KNATIVE_VERSION}/eventing.yaml \
   --filename https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/monitoring.yaml

# kubectl apply \
#    --filename https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/serving.yaml \
#    --filename https://github.com/knative/eventing/releases/download/${KNATIVE_VERSION}/eventing.yaml \
#    --filename https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/monitoring.yaml

kubectl apply -f https://github.com/knative/eventing-contrib/releases/download/${KNATIVE_VERSION}/github.yaml
sleep 60
```

Install Tekton with Dashboard:

```bash
kubectl apply --filename https://storage.googleapis.com/tekton-releases/latest/release.yaml
kubectl apply --filename https://github.com/tektoncd/dashboard/releases/download/v0.2.0/release.yaml
kubectl apply -n tekton-pipelines --filename https://github.com/tektoncd/dashboard/releases/download/v0.2.0/webhooks-extension_release.yaml
```

Output:

```text
namespace/tekton-pipelines created
podsecuritypolicy.policy/tekton-pipelines created
clusterrole.rbac.authorization.k8s.io/tekton-pipelines-admin created
serviceaccount/tekton-pipelines-controller created
clusterrolebinding.rbac.authorization.k8s.io/tekton-pipelines-controller-admin created
customresourcedefinition.apiextensions.k8s.io/clustertasks.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/conditions.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/images.caching.internal.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/pipelines.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/pipelineruns.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/pipelineresources.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/tasks.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/taskruns.tekton.dev created
service/tekton-pipelines-controller created
service/tekton-pipelines-webhook created
clusterrole.rbac.authorization.k8s.io/tekton-aggregate-edit created
clusterrole.rbac.authorization.k8s.io/tekton-aggregate-view created
configmap/config-artifact-bucket created
configmap/config-artifact-pvc created
configmap/config-defaults created
configmap/config-logging created
configmap/config-observability created
deployment.apps/tekton-pipelines-controller created
deployment.apps/tekton-pipelines-webhook created
serviceaccount/tekton-dashboard created
customresourcedefinition.apiextensions.k8s.io/extensions.dashboard.tekton.dev created
clusterrole.rbac.authorization.k8s.io/tekton-dashboard-minimal created
clusterrolebinding.rbac.authorization.k8s.io/tekton-dashboard-minimal created
deployment.apps/tekton-dashboard created
service/tekton-dashboard created
task.tekton.dev/pipeline0-task created
pipeline.tekton.dev/pipeline0 created
serviceaccount/tekton-webhooks-extension created
clusterrole.rbac.authorization.k8s.io/tekton-webhooks-extension-minimal created
clusterrolebinding.rbac.authorization.k8s.io/tekton-webhooks-extension-minimal created
deployment.apps/webhooks-extension created
service/webhooks-extension created
service.serving.knative.dev/webhooks-extension-sink created
task.tekton.dev/monitor-result-task created
```

Export Knative services ([Prometheus](https://prometheus.io/) and
[Grafana](https://grafana.com/)) to be visible externally:

```bash
cat << EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: knative-services-gateway
  namespace: knative-monitoring
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http-knative-services
      protocol: HTTP
    hosts:
    - knative-grafana.${MY_DOMAIN}
    - knative-prometheus.${MY_DOMAIN}
    - knative-tekton.${MY_DOMAIN}
  - port:
      number: 443
      name: https-knative-services
      protocol: HTTPS
    hosts:
    - knative-grafana.${MY_DOMAIN}
    - knative-prometheus.${MY_DOMAIN}
    - knative-tekton.${MY_DOMAIN}
    tls:
      credentialName: ingress-cert-${LETSENCRYPT_ENVIRONMENT}
      mode: SIMPLE
      privateKey: sds
      serverCertificate: sds
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: grafana-virtual-service
  namespace: knative-monitoring
spec:
  hosts:
  - "knative-grafana.${MY_DOMAIN}"
  gateways:
  - knative-services-gateway
  http:
  - route:
    - destination:
        host: grafana.knative-monitoring.svc.cluster.local
        port:
          number: 30802
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: prometheus-virtual-service
  namespace: knative-monitoring
spec:
  hosts:
  - "knative-prometheus.${MY_DOMAIN}"
  gateways:
  - knative-services-gateway
  http:
  - route:
    - destination:
        host: prometheus-system-np.knative-monitoring.svc.cluster.local
        port:
          number: 8080
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: tekton-virtual-service
  namespace: knative-monitoring
spec:
  hosts:
  - "knative-tekton.${MY_DOMAIN}"
  gateways:
  - knative-services-gateway
  http:
  - route:
    - destination:
        host: tekton-dashboard.tekton-pipelines.svc.cluster.local
        port:
          number: 9097
EOF
```

Output:

```text
gateway.networking.istio.io/knative-services-gateway created
virtualservice.networking.istio.io/grafana-virtual-service created
virtualservice.networking.istio.io/prometheus-virtual-service created
virtualservice.networking.istio.io/tekton-virtual-service created
```

Set up a custom domain for Knative:

```bash
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-domain
  namespace: knative-serving
data:
  ${MY_DOMAIN}: ""
EOF
```

Output:

```text
configmap/config-domain configured
```

Changing the controller deployment is needed if you are not using the valid
certificates (self-signed):

```bash
if [ ${LETSENCRYPT_ENVIRONMENT} = "staging" ]; then
  kubectl --namespace knative-serving create secret generic customca --from-file=customca.crt=tmp/fakelerootx1.pem
  kubectl patch deployment controller --namespace knative-serving --patch "
    {
        \"spec\": {
            \"template\": {
                \"spec\": {
                    \"containers\": [{
                        \"env\": [{
                            \"name\": \"SSL_CERT_DIR\",
                            \"value\": \"/etc/customca\"
                        }],
                        \"name\": \"controller\",
                        \"volumeMounts\": [{
                            \"mountPath\": \"/etc/customca\",
                            \"name\": \"customca\"
                        }]
                    }],
                    \"volumes\": [{
                        \"name\": \"customca\",
                        \"secret\": {
                            \"defaultMode\": 420,
                            \"secretName\": \"customca\"
                        }
                    }]
                }
            }
        }
    }"
fi
```

Output:

```text
secret/customca created
deployment.extensions/controller patched
```

## Enable automatic TLS certificate provisioning for Knative

Install `networking-certmanager`:

```bash
kubectl apply --filename https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/serving-cert-manager.yaml
```

Output:

```text
clusterrole.rbac.authorization.k8s.io/knative-serving-certmanager created
configmap/config-certmanager created
deployment.apps/networking-certmanager created
```

Update your `config-certmanager` ConfigMap in the `knative-serving` namespace to
define your new ClusterIssuer configuration and your your DNS provider:

```bash
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-certmanager
  namespace: knative-serving
  labels:
    networking.knative.dev/certificate-provider: cert-manager
data:
  issuerRef: |
    kind: ClusterIssuer
    name: letsencrypt-${LETSENCRYPT_ENVIRONMENT}-dns
  solverConfig: |
    dns01:
      provider: aws-route53
EOF
```

Output:

```text
configmap/config-certmanager configured
```

Update the `config-network` ConfigMap in the `knative-serving` namespace to enable
`autoTLS`:

```bash
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-network
  namespace: knative-serving
data:
  autoTLS: Enabled
  httpProtocol: Enabled
EOF
```

Output:

```text
configmap/config-network configured
```
