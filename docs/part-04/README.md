# Install Harbor

![Harbor logo](https://raw.githubusercontent.com/cncf/artwork/c33a8386bce4eabc36e1d4972e0996db4630037b/projects/harbor/horizontal/color/harbor-horizontal-color.svg?sanitize=true
"Harbor logo")

Label Harbor namespace and copy there the secret with certificates signed by
Let's Encrypt certificate:

```bash
kubectl create namespace harbor-system
kubectl label namespace harbor-system app=kubed
```

Create Istio Gateways and VirtualServices to allow accessing Harbor from
"outside":

```bash
cat << EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: harbor-gateway
  namespace: harbor-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http-harbor
      protocol: HTTP
    hosts:
    - harbor.${MY_DOMAIN}
  - port:
      number: 443
      name: https-harbor
      protocol: HTTPS
    hosts:
    - harbor.${MY_DOMAIN}
    - notary.${MY_DOMAIN}
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: harbor-http-virtual-service
  namespace: harbor-system
spec:
  hosts:
  - harbor.${MY_DOMAIN}
  gateways:
  - harbor-gateway
  http:
  - match:
    - port: 80
    route:
    - destination:
        host: harbor.harbor-system.svc.cluster.local
        port:
          number: 80
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: harbor-https-virtual-service
  namespace: harbor-system
spec:
  hosts:
  - harbor.${MY_DOMAIN}
  gateways:
  - harbor-gateway
  tls:
  - match:
    - port: 443
      sniHosts:
      - harbor.${MY_DOMAIN}
    route:
    - destination:
        host: harbor.harbor-system.svc.cluster.local
        port:
          number: 443
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: harbor-notary-virtual-service
  namespace: harbor-system
spec:
  hosts:
  - notary.${MY_DOMAIN}
  gateways:
  - harbor-gateway
  tls:
  - match:
    - port: 443
      sniHosts:
      - notary.${MY_DOMAIN}
    route:
    - destination:
        host: harbor.harbor-system.svc.cluster.local
        port:
          number: 4443
EOF
```

Add Harbor Helm repository:

```bash
helm repo add harbor https://helm.goharbor.io
helm repo update
```

Install Harbor using Helm:

```bash
helm install --wait --name harbor --namespace harbor-system harbor/harbor --version v1.1.2 \
  --set expose.tls.enabled=true \
  --set expose.tls.secretName=ingress-cert-${LETSENCRYPT_ENVIRONMENT} \
  --set expose.type=clusterIP \
  --set externalURL=https://harbor.${MY_DOMAIN} \
  --set harborAdminPassword=admin \
  --set persistence.enabled=false
```

Open the [https://harbor.mylabs.dev](https://harbor.mylabs.dev):

![Harbor login page](./harbor_login_page.png "Harbor login page")

Log in:

* User: `admin`
* Password: `admin`

You should see the Web UI:

![Harbor](./harbor_projects.png "Harbor")

Create new robot account for `library` project:

```bash
HARBOR_ROBOT_TOKEN=$(curl -s -k -u "admin:admin" -X POST -H "Content-Type: application/json" "https://harbor.${MY_DOMAIN}/api/projects/1/robots" -d \
"{
  \"name\": \"myrobot\",
  \"description\": \"Robot account with Push/Pull access to library project\",
  \"access\": [
    {
      \"resource\": \"/project/library/repository\",
      \"action\": \"push\"
    }
  ]
}" | jq -r ".token")
echo ${HARBOR_ROBOT_TOKEN}
```

Enable automated vulnerability scan after each "image push" to the project
`library`:

```bash
curl -s -k -u "admin:admin" -X PUT "https://harbor.${MY_DOMAIN}/api/projects/1" -H  "Content-Type: application/json" -d \
"{
  \"metadata\": {
    \"auto_scan\": \"true\"
  }
}"
```

Test Harbor functionality by uploading docker image (optional):

```shell
if [ ${LETSENCRYPT_ENVIRONMENT} = "staging" ]; then
  export SSL_CERT_FILE=$PWD/tmp/fakelerootx1.pem
fi

echo admin | docker login --username admin --password-stdin harbor.${MY_DOMAIN}
docker pull gcr.io/kuar-demo/kuard-amd64:blue
docker tag gcr.io/kuar-demo/kuard-amd64:blue harbor.${MY_DOMAIN}/library/kuard-amd64:blue
export DOCKER_CONTENT_TRUST=1
export DOCKER_CONTENT_TRUST_SERVER=https://notary.${MY_DOMAIN}
export DOCKER_CONTENT_TRUST_REPOSITORY_PASSPHRASE="mypassphrase123"
export DOCKER_CONTENT_TRUST_ROOT_PASSPHRASE="rootpassphrase123"
docker push harbor.${MY_DOMAIN}/library/kuard-amd64:blue

unset DOCKER_CONTENT_TRUST
unset SSL_CERT_FILE
```
