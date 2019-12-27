# Install Helm

Install [Helm](https://helm.sh/) binary:

```bash
curl -s https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash
```

Output:

```text
Downloading https://get.helm.sh/helm-v3.0.2-linux-amd64.tar.gz
Preparing to install helm into /usr/local/bin
helm installed into /usr/local/bin/helm
```

Add the "stable" repository:

```bash
helm repo add stable https://kubernetes-charts.storage.googleapis.com/
helm repo update
```

Output:

```text
"stable" has been added to your repositories
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "stable" chart repository
Update Complete. ⎈ Happy Helming!⎈
```

Install kube2iam to restrict pod's access:

```bash
helm install kube2iam stable/kube2iam --namespace=kube-system \
  --set host.iptables=true \
  --set rbac.create=true
```

Output:

```text
NAME: kube2iam
LAST DEPLOYED: Fri Dec 27 10:48:20 2019
NAMESPACE: kube-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
To verify that kube2iam has started, run:

  kubectl --namespace=kube-system get pods -l "app.kubernetes.io/name=kube2iam,app.kubernetes.io/instance=kube2iam"

Add an iam.amazonaws.com/role annotation to your pods with the role you want them to assume.

  https://github.com/jtblin/kube2iam#kubernetes-annotation

Use `curl` to verify the pod's role from within:

  curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
```
