# Install Knative

Knative installation...

```bash
kubectl apply --selector knative.dev/crd-install=true \
   --filename https://github.com/knative/serving/releases/download/v0.7.1/serving.yaml \
   --filename https://github.com/knative/eventing/releases/download/v0.7.1/release.yaml \
   --filename https://github.com/knative/serving/releases/download/v0.7.1/monitoring.yaml

echo "*** Run again - bug https://github.com/knative/docs/issues/817"
kubectl apply --selector knative.dev/crd-install=true \
   --filename https://github.com/knative/serving/releases/download/v0.7.1/serving.yaml \
   --filename https://github.com/knative/eventing/releases/download/v0.7.1/release.yaml \
   --filename https://github.com/knative/serving/releases/download/v0.7.1/monitoring.yaml

kubectl apply --selector networking.knative.dev/certificate-provider!=cert-manager \
   --filename https://github.com/knative/serving/releases/download/v0.7.1/serving.yaml \
   --filename https://github.com/knative/eventing/releases/download/v0.7.1/release.yaml \
   --filename https://github.com/knative/serving/releases/download/v0.7.1/monitoring.yaml

#kubectl apply -f https://github.com/knative/eventing-contrib/releases/download/v0.7.1/github.yaml
```

Install Tekton with Dashboard:

```bash
kubectl apply --filename https://storage.googleapis.com/tekton-releases/latest/release.yaml
kubectl apply --filename https://github.com/tektoncd/dashboard/releases/download/v0.1.0/release.yaml
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
      protocol: HTTP2
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

Set up a custom domain for Knative:

```bash
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-domain
  namespace: knative-serving
data:
  ${MY_DOMAIN}: |
    selector:
      app: prod
  ${MY_DOMAIN}: ""
EOF
```

## Enable automatic TLS certificate provisioning for Knative

Install `networking-certmanager`:

```bash
kubectl apply --selector networking.knative.dev/certificate-provider=cert-manager \
  --filename https://github.com/knative/serving/releases/download/v0.7.1/serving.yaml
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
EOF
```
