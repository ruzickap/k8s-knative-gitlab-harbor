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

kubectl apply \
   --filename https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/serving.yaml \
   --filename https://github.com/knative/eventing/releases/download/${KNATIVE_VERSION}/eventing.yaml \
   --filename https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/monitoring.yaml

kubectl apply -f https://github.com/knative/eventing-contrib/releases/download/${KNATIVE_VERSION}/github.yaml
sleep 60
```

Output:

```text
customresourcedefinition.apiextensions.k8s.io/certificates.networking.internal.knative.dev created
customresourcedefinition.apiextensions.k8s.io/clusteringresses.networking.internal.knative.dev created
customresourcedefinition.apiextensions.k8s.io/images.caching.internal.knative.dev created
customresourcedefinition.apiextensions.k8s.io/ingresses.networking.internal.knative.dev created
customresourcedefinition.apiextensions.k8s.io/metrics.autoscaling.internal.knative.dev created
customresourcedefinition.apiextensions.k8s.io/podautoscalers.autoscaling.internal.knative.dev created
customresourcedefinition.apiextensions.k8s.io/serverlessservices.networking.internal.knative.dev created
customresourcedefinition.apiextensions.k8s.io/configurations.serving.knative.dev created
customresourcedefinition.apiextensions.k8s.io/revisions.serving.knative.dev created
customresourcedefinition.apiextensions.k8s.io/routes.serving.knative.dev created
customresourcedefinition.apiextensions.k8s.io/services.serving.knative.dev created
customresourcedefinition.apiextensions.k8s.io/apiserversources.sources.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/brokers.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/channels.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/channels.messaging.knative.dev created
customresourcedefinition.apiextensions.k8s.io/containersources.sources.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/cronjobsources.sources.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/eventtypes.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/parallels.messaging.knative.dev created
customresourcedefinition.apiextensions.k8s.io/sequences.messaging.knative.dev created
customresourcedefinition.apiextensions.k8s.io/subscriptions.messaging.knative.dev created
customresourcedefinition.apiextensions.k8s.io/triggers.eventing.knative.dev created
namespace/knative-serving created
clusterrole.rbac.authorization.k8s.io/knative-serving-istio created
clusterrole.rbac.authorization.k8s.io/custom-metrics-server-resources created
clusterrole.rbac.authorization.k8s.io/knative-serving-namespaced-admin created
clusterrole.rbac.authorization.k8s.io/knative-serving-admin created
clusterrole.rbac.authorization.k8s.io/knative-serving-core created
serviceaccount/controller created
clusterrolebinding.rbac.authorization.k8s.io/custom-metrics:system:auth-delegator created
clusterrolebinding.rbac.authorization.k8s.io/hpa-controller-custom-metrics created
clusterrolebinding.rbac.authorization.k8s.io/knative-serving-controller-admin created
rolebinding.rbac.authorization.k8s.io/custom-metrics-auth-reader created
gateway.networking.istio.io/knative-ingress-gateway created
gateway.networking.istio.io/cluster-local-gateway created
customresourcedefinition.apiextensions.k8s.io/certificates.networking.internal.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/clusteringresses.networking.internal.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/images.caching.internal.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/ingresses.networking.internal.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/metrics.autoscaling.internal.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/podautoscalers.autoscaling.internal.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/serverlessservices.networking.internal.knative.dev unchanged
service/activator-service created
service/controller created
service/webhook created
image.caching.internal.knative.dev/queue-proxy created
deployment.apps/activator created
horizontalpodautoscaler.autoscaling/activator created
deployment.apps/autoscaler-hpa created
service/autoscaler created
deployment.apps/autoscaler created
configmap/config-autoscaler created
configmap/config-defaults created
configmap/config-deployment created
configmap/config-domain created
configmap/config-gc created
configmap/config-istio created
configmap/config-logging created
configmap/config-network created
configmap/config-observability created
configmap/config-tracing created
deployment.apps/controller created
apiservice.apiregistration.k8s.io/v1beta1.custom.metrics.k8s.io created
deployment.apps/networking-istio created
deployment.apps/webhook created
customresourcedefinition.apiextensions.k8s.io/configurations.serving.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/revisions.serving.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/routes.serving.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/services.serving.knative.dev unchanged
namespace/knative-eventing created
clusterrole.rbac.authorization.k8s.io/addressable-resolver created
clusterrole.rbac.authorization.k8s.io/service-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/serving-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/channel-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/broker-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/messaging-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/eventing-broker-filter created
clusterrole.rbac.authorization.k8s.io/eventing-broker-ingress created
clusterrole.rbac.authorization.k8s.io/eventing-config-reader created
clusterrole.rbac.authorization.k8s.io/channelable-manipulator created
clusterrole.rbac.authorization.k8s.io/knative-eventing-namespaced-admin created
clusterrole.rbac.authorization.k8s.io/knative-messaging-namespaced-admin created
clusterrole.rbac.authorization.k8s.io/knative-eventing-sources-namespaced-admin created
clusterrole.rbac.authorization.k8s.io/knative-eventing-controller created
serviceaccount/eventing-controller created
serviceaccount/eventing-webhook created
serviceaccount/eventing-source-controller created
clusterrole.rbac.authorization.k8s.io/source-resolver created
clusterrole.rbac.authorization.k8s.io/eventing-source-resolver created
clusterrole.rbac.authorization.k8s.io/knative-gcp-source-resolver created
clusterrole.rbac.authorization.k8s.io/knative-eventing-source-controller created
clusterrole.rbac.authorization.k8s.io/knative-eventing-webhook created
clusterrolebinding.rbac.authorization.k8s.io/eventing-controller created
clusterrolebinding.rbac.authorization.k8s.io/eventing-controller-resolver created
clusterrolebinding.rbac.authorization.k8s.io/eventing-controller-source-resolver created
clusterrolebinding.rbac.authorization.k8s.io/eventing-controller-manipulator created
clusterrolebinding.rbac.authorization.k8s.io/eventing-webhook created
clusterrolebinding.rbac.authorization.k8s.io/eventing-source-controller created
clusterrolebinding.rbac.authorization.k8s.io/eventing-source-controller-resolver created
customresourcedefinition.apiextensions.k8s.io/apiserversources.sources.eventing.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/brokers.eventing.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/channels.eventing.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/channels.messaging.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/containersources.sources.eventing.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/cronjobsources.sources.eventing.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/eventtypes.eventing.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/parallels.messaging.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/sequences.messaging.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/subscriptions.messaging.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/triggers.eventing.knative.dev unchanged
configmap/default-ch-webhook created
service/eventing-webhook created
deployment.apps/eventing-controller created
deployment.apps/sources-controller created
deployment.apps/eventing-webhook created
configmap/config-logging created
configmap/config-observability created
configmap/config-tracing created
namespace/knative-monitoring created
service/elasticsearch-logging created
serviceaccount/elasticsearch-logging created
clusterrole.rbac.authorization.k8s.io/elasticsearch-logging created
clusterrolebinding.rbac.authorization.k8s.io/elasticsearch-logging created
statefulset.apps/elasticsearch-logging created
service/kibana-logging created
deployment.apps/kibana-logging created
configmap/fluentd-ds-config created
serviceaccount/fluentd-ds created
clusterrole.rbac.authorization.k8s.io/fluentd-ds created
clusterrolebinding.rbac.authorization.k8s.io/fluentd-ds created
service/fluentd-ds created
daemonset.apps/fluentd-ds created
serviceaccount/kube-state-metrics created
role.rbac.authorization.k8s.io/kube-state-metrics-resizer created
rolebinding.rbac.authorization.k8s.io/kube-state-metrics created
clusterrole.rbac.authorization.k8s.io/kube-state-metrics created
clusterrolebinding.rbac.authorization.k8s.io/kube-state-metrics created
deployment.extensions/kube-state-metrics created
service/kube-state-metrics created
configmap/grafana-dashboard-definition-kubernetes-deployment created
configmap/grafana-dashboard-definition-kubernetes-capacity-planning created
configmap/grafana-dashboard-definition-kubernetes-cluster-health created
configmap/grafana-dashboard-definition-kubernetes-cluster-status created
configmap/grafana-dashboard-definition-kubernetes-control-plane-status created
configmap/grafana-dashboard-definition-kubernetes-resource-requests created
configmap/grafana-dashboard-definition-kubernetes-nodes created
configmap/grafana-dashboard-definition-kubernetes-pods created
configmap/grafana-dashboard-definition-kubernetes-statefulset created
serviceaccount/node-exporter created
clusterrole.rbac.authorization.k8s.io/node-exporter created
clusterrolebinding.rbac.authorization.k8s.io/node-exporter created
daemonset.extensions/node-exporter created
service/node-exporter created
configmap/grafana-custom-config created
configmap/grafana-dashboard-definition-knative-efficiency created
configmap/grafana-dashboard-definition-knative-reconciler created
configmap/scaling-config created
configmap/grafana-dashboard-definition-knative created
configmap/grafana-datasources created
configmap/grafana-dashboards created
service/grafana created
deployment.apps/grafana created
configmap/prometheus-scrape-config created
service/kube-controller-manager created
service/prometheus-system-discovery created
serviceaccount/prometheus-system created
role.rbac.authorization.k8s.io/prometheus-system created
role.rbac.authorization.k8s.io/prometheus-system created
role.rbac.authorization.k8s.io/prometheus-system created
role.rbac.authorization.k8s.io/prometheus-system created
clusterrole.rbac.authorization.k8s.io/prometheus-system created
rolebinding.rbac.authorization.k8s.io/prometheus-system created
rolebinding.rbac.authorization.k8s.io/prometheus-system created
rolebinding.rbac.authorization.k8s.io/prometheus-system created
rolebinding.rbac.authorization.k8s.io/prometheus-system created
clusterrolebinding.rbac.authorization.k8s.io/prometheus-system created
service/prometheus-system-np created
statefulset.apps/prometheus-system created
Warning: kubectl apply should be used on resource created by either kubectl create --save-config or kubectl apply
service/zipkin configured
deployment.apps/zipkin created
namespace/knative-sources created
serviceaccount/github-controller-manager created
clusterrole.rbac.authorization.k8s.io/eventing-sources-github-controller created
clusterrolebinding.rbac.authorization.k8s.io/eventing-sources-github-controller created
clusterrolebinding.rbac.authorization.k8s.io/eventing-sources-github-addressable-resolver created
customresourcedefinition.apiextensions.k8s.io/githubsources.sources.eventing.knative.dev created
service/github-controller created
statefulset.apps/github-controller-manager created
```

Install Tekton with Dashboard and Webhooks:

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
