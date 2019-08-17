# Istio + Knative + cert-manager + kubed installation

Before we move on with other tasks it is necessary to install Nginx Ingress.
It's also handy to install cert-manager for managing SSL certificates.

<img src="https://raw.githubusercontent.com/jetstack/cert-manager/ed2c0e0b3df1d10c3ad219348ed7b1ba56771655/logo/logo.svg?sanitize=true"
width="200">

## Install cert-manager

cert-manager architecture:

![cert-manager high level overview](https://raw.githubusercontent.com/jetstack/cert-manager/4f30ed75e88e5d0defeb950501b5cac6da7fa7fe/docs/images/high-level-overview.png
"cert-manager high level overview")

Install the CRDs resources separately:

```bash
kubectl apply -f https://raw.githubusercontent.com/jetstack/cert-manager/release-0.9/deploy/manifests/00-crds.yaml
sleep 5
```

Output:

```text
```

Create the namespace for cert-manager and label it to disable resource
validation:

```bash
kubectl create namespace cert-manager
kubectl label namespace cert-manager certmanager.k8s.io/disable-validation=true
```

Output:

```text
```

Install the cert-manager Helm chart:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install --name cert-manager --namespace cert-manager --wait jetstack/cert-manager --version v0.9.1
```

Output:

```text
```

### Create ClusterIssuer for Let's Encrypt

Create `ClusterIssuer` for Route53 used by cert-manager. It will allow Let's
Encrypt to generate certificate. Route53 (DNS) method of requesting certificate
from Let's Encrypt must be used to create wildcard certificate `*.mylabs.dev`
(details [here](https://community.letsencrypt.org/t/wildcard-certificates-via-http-01/51223)).

![ACME DNS Challenge](https://b3n.org/wp-content/uploads/2016/09/acme_letsencrypt_dns-01-challenge.png
"ACME DNS Challenge")

([https://b3n.org/intranet-ssl-certificates-using-lets-encrypt-dns-01/](https://b3n.org/intranet-ssl-certificates-using-lets-encrypt-dns-01/))

```bash
export ROUTE53_AWS_SECRET_ACCESS_KEY_BASE64=$(echo -n "$ROUTE53_AWS_SECRET_ACCESS_KEY" | base64)
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: aws-route53-secret-access-key-secret
  namespace: cert-manager
data:
  secret-access-key: $ROUTE53_AWS_SECRET_ACCESS_KEY_BASE64
---
apiVersion: certmanager.k8s.io/v1alpha1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging-dns
  namespace: cert-manager
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: petr.ruzicka@gmail.com
    privateKeySecretRef:
      name: letsencrypt-staging-dns
    dns01:
      providers:
      - name: aws-route53
        route53:
          accessKeyID: ${ROUTE53_AWS_ACCESS_KEY_ID}
          region: eu-central-1
          secretAccessKeySecretRef:
            name: aws-route53-secret-access-key-secret
            key: secret-access-key
---
apiVersion: certmanager.k8s.io/v1alpha1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production-dns
  namespace: cert-manager
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: petr.ruzicka@gmail.com
    privateKeySecretRef:
      name: letsencrypt-production-dns
    dns01:
      providers:
      - name: aws-route53
        route53:
          accessKeyID: ${ROUTE53_AWS_ACCESS_KEY_ID}
          region: eu-central-1
          secretAccessKeySecretRef:
            name: aws-route53-secret-access-key-secret
            key: secret-access-key
EOF
```

Output:

```text{16,23,48}
```

## Generate TLS certificate

Create certificate using cert-manager:

```bash
cat << EOF | kubectl apply -f -
apiVersion: certmanager.k8s.io/v1alpha1
kind: Certificate
metadata:
  name: ingress-cert-${LETSENCRYPT_ENVIRONMENT}
  namespace: cert-manager
spec:
  secretName: ingress-cert-${LETSENCRYPT_ENVIRONMENT}
  issuerRef:
    kind: ClusterIssuer
    name: letsencrypt-${LETSENCRYPT_ENVIRONMENT}-dns
  commonName: "*.${MY_DOMAIN}"
  dnsNames:
  - "*.${MY_DOMAIN}"
  acme:
    config:
    - dns01:
        provider: aws-route53
      domains:
      - "*.${MY_DOMAIN}"
EOF
```

Output:

```text
```

![cert-manager - Create certificate](https://i1.wp.com/blog.openshift.com/wp-content/uploads/OCP-PKI-and-certificates-cert-manager.png
"cert-manager - Create certificate")

([https://blog.openshift.com/self-serviced-end-to-end-encryption-approaches-for-applications-deployed-in-openshift/](https://blog.openshift.com/self-serviced-end-to-end-encryption-approaches-for-applications-deployed-in-openshift/))

## Install kubed

It's necessary to copy the wildcard certificate across all "future" namespaces
and that's the reason why [kubed](https://github.com/appscode/kubed) needs to be
installed (for now).
[kubed](https://github.com/appscode/kubed) can [synchronize ConfigMaps/Secrets](https://appscode.com/products/kubed/0.9.0/guides/config-syncer/)
across Kubernetes namespaces/clusters.

Kubed - synchronize secret diagram:

![Kubed - synchronize secret](./kubed.svg "Kubed - synchronize secret")

Add kubed helm repository:

```bash
helm repo add appscode https://charts.appscode.com/stable/
helm repo update
```

Output:

```text
```

Install kubed:

```bash
helm install appscode/kubed --name kubed --version 0.10.0 --namespace kube-system --wait \
  --set config.clusterName=my_k8s_cluster \
  --set apiserver.enabled=false
```

Output:

```text
```

Annotate (mark) the cert-manager secret to be copied to other namespaces
if necessary:

```bash
kubectl annotate secret ingress-cert-${LETSENCRYPT_ENVIRONMENT} -n cert-manager kubed.appscode.com/sync="app=kubed"
```

Output:

```text
```

## Install Istio

Add Istio helm chart repository:

```bash
export ISTIO_VERSION="1.2.4"
helm repo add istio.io https://storage.googleapis.com/istio-release/releases/${ISTIO_VERSION}/charts/
helm repo update
```

Install CRDs for Istio:

```bash
helm install istio.io/istio-init --wait --name istio-init --namespace istio-system --version ${ISTIO_VERSION}
sleep 25
```

Label Istio namespace and which will trigger `kubed` to copy there the secret
with certificates signed by Let's Encrypt:

```bash
kubectl label namespace istio-system app=kubed
```

Install Istio:

(steps take from [Knative page](https://github.com/knative/docs/blob/master/docs/install/installing-istio.md#installing-istio-with-SDS-to-secure-the-ingress-gateway))

```bash
helm install istio.io/istio --wait --name istio --namespace istio-system --version ${ISTIO_VERSION} \
  --set gateways.istio-ingressgateway.ports[0].name=status-port \
  --set gateways.istio-ingressgateway.ports[0].port=15020 \
  --set gateways.istio-ingressgateway.ports[0].targetPort=15020 \
  --set gateways.istio-ingressgateway.ports[1].name=http \
  --set gateways.istio-ingressgateway.ports[1].port=80 \
  --set gateways.istio-ingressgateway.ports[1].targetPort=80 \
  --set gateways.istio-ingressgateway.ports[1].nodePort=31380 \
  --set gateways.istio-ingressgateway.ports[2].name=https \
  --set gateways.istio-ingressgateway.ports[2].port=443 \
  --set gateways.istio-ingressgateway.ports[2].nodePort=31390 \
  --set gateways.istio-ingressgateway.ports[3].name=ssh \
  --set gateways.istio-ingressgateway.ports[3].port=22 \
  --set gateways.istio-ingressgateway.ports[3].nodePort=31400 \
  --set global.k8sIngress.enabled=true \
  --set global.k8sIngress.enableHttps=true \
  --set grafana.enabled=true \
  --set grafana.datasources."datasources\.yaml".datasources[0].name=Prometheus \
  --set grafana.datasources."datasources\.yaml".datasources[0].access=proxy \
  --set grafana.datasources."datasources\.yaml".datasources[0].editable=true \
  --set grafana.datasources."datasources\.yaml".datasources[0].isDefault=true \
  --set grafana.datasources."datasources\.yaml".datasources[0].jsonData.timeInterval=5s \
  --set grafana.datasources."datasources\.yaml".datasources[0].orgId=1 \
  --set grafana.datasources."datasources\.yaml".datasources[0].type=prometheus \
  --set grafana.datasources."datasources\.yaml".datasources[0].url=http://prometheus-system-np.knative-monitoring.svc.cluster.local:8080 \
  --set kiali.enabled=true \
  --set kiali.createDemoSecret=true \
  --set kiali.contextPath=/ \
  --set kiali.dashboard.grafanaURL=http://grafana.${MY_DOMAIN}/ \
  --set kiali.dashboard.jaegerURL=http://jaeger.${MY_DOMAIN}/ \
  --set kiali.prometheusAddr=http://prometheus-system-np.knative-monitoring.svc.cluster.local:8080 \
  --set tracing.enabled=true \
  --set sidecarInjectorWebhook.enabled=true \
  --set sidecarInjectorWebhook.enableNamespacesByDefault=true \
  --set global.proxy.autoInject=disabled \
  --set global.disablePolicyChecks=true \
  --set prometheus.enabled=false \
  --set mixer.adapters.prometheus.enabled=false \
  --set global.disablePolicyChecks=true \
  --set gateways.istio-ingressgateway.autoscaleMin=1 \
  --set gateways.istio-ingressgateway.autoscaleMax=1 \
  --set gateways.istio-ingressgateway.sds.enabled=true \
  --set pilot.traceSampling=100
```

Let `istio-ingressgateway` to use cert-manager generated certificate via
[SDS](https://www.envoyproxy.io/docs/envoy/latest/configuration/secret). Steps
are taken from here [https://istio.io/docs/tasks/traffic-management/ingress/ingress-certmgr/](https://istio.io/docs/tasks/traffic-management/ingress/ingress-certmgr/).

```bash
kubectl -n istio-system patch gateway istio-autogenerated-k8s-ingress \
  --type=json \
  -p="[{"op": "replace", "path": "/spec/servers/1/tls", "value": {"credentialName": "ingress-cert-${LETSENCRYPT_ENVIRONMENT}", "mode": "SIMPLE", "privateKey": "sds", "serverCertificate": "sds"}}]"
```

Disable HTTP2 for gateway `istio-autogenerated-k8s-ingress` to be compatible
with Knative:

```bash
kubectl -n istio-system patch gateway istio-autogenerated-k8s-ingress \
  --type=json \
  -p="[{"op": "replace", "path": "/spec/servers/0/port", "value": {"name": "http", "number": "80", "protocol": "HTTP"}}]"
```

Allow the `default` namespace to use Istio injection:

```bash
kubectl label namespace default istio-injection=enabled
```

Configure the Istio services [Jaeger](https://www.jaegertracing.io/) and
[Kiali](https://www.kiali.io/) to be visible externally:

```bash
cat << EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: istio-services-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http-istio-services
      protocol: HTTP
    hosts:
    - grafana-istio.${MY_DOMAIN}
    - jaeger-istio.${MY_DOMAIN}
    - kiali-istio.${MY_DOMAIN}
  - port:
      number: 443
      name: https-istio-services
      protocol: HTTPS
    hosts:
    - grafana-istio.${MY_DOMAIN}
    - jaeger-istio.${MY_DOMAIN}
    - kiali-istio.${MY_DOMAIN}
    tls:
      credentialName: ingress-cert-${LETSENCRYPT_ENVIRONMENT}
      mode: SIMPLE
      privateKey: sds
      serverCertificate: sds
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: grafana-istio-virtual-service
  namespace: istio-system
spec:
  hosts:
  - grafana-istio.${MY_DOMAIN}
  gateways:
  - istio-services-gateway
  http:
  - route:
    - destination:
        host: grafana.istio-system.svc.cluster.local
        port:
          number: 3000
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: jaeger-istio-virtual-service
  namespace: istio-system
spec:
  hosts:
  - jaeger-istio.${MY_DOMAIN}
  gateways:
  - istio-services-gateway
  http:
  - route:
    - destination:
        host: tracing.istio-system.svc.cluster.local
        port:
          number: 80
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: kiali-istio-virtual-service
  namespace: istio-system
spec:
  hosts:
  - kiali-istio.${MY_DOMAIN}
  gateways:
  - istio-services-gateway
  http:
  - route:
    - destination:
        host: kiali.istio-system.svc.cluster.local
        port:
          number: 20001
EOF
```

## Create DNS records

Install [external-dns](https://github.com/kubernetes-incubator/external-dns) and
let it manage `mylabs.dev` entries in Route 53:

```bash
helm install --wait --name external-dns --namespace external-dns --version 2.5.1 stable/external-dns \
  --set aws.region=eu-central-1 \
  --set aws.credentials.secretKey="${ROUTE53_AWS_SECRET_ACCESS_KEY}" \
  --set aws.credentials.accessKey="${ROUTE53_AWS_ACCESS_KEY_ID}" \
  --set domainFilters={${MY_DOMAIN}} \
  --set policy="sync" \
  --set sources="{istio-gateway,service}" \
  --set istioIngressGateways={istio-system/istio-ingressgateway} \
  --set txtOwnerId="${USER}-k8s.${MY_DOMAIN}" \
  --set rbac.create=true
```

Output:

```json
```

![Architecture](https://raw.githubusercontent.com/aws-samples/eks-workshop/65b766c494a5b4f5420b2912d8373c4957163541/static/images/crystal.svg?sanitize=true
"Architecture")
