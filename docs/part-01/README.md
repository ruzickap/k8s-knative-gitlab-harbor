# Create k8s cluster

Before starting with the main content, it's necessary to provision
the Kubernetes in AWS.

Use the `MY_DOMAIN` variable containing domain and `LETSENCRYPT_ENVIRONMENT`
variable.
The `LETSENCRYPT_ENVIRONMENT` variable should be one of:

* `staging` - Let’s Encrypt will create testing certificate (not valid)

* `production` - Let’s Encrypt will create valid certificate (use with care)

```bash
export MY_DOMAIN=${MY_DOMAIN:-mylabs.dev}
export LETSENCRYPT_ENVIRONMENT=${LETSENCRYPT_ENVIRONMENT:-staging}
echo "${MY_DOMAIN} | ${LETSENCRYPT_ENVIRONMENT}"
```

## Prepare the local working environment

::: tip
You can skip these steps if you have all the required software already
installed.
:::

Install necessary software:

```bash
if [ -x /usr/bin/apt ]; then
  apt update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq awscli curl git jq openssh-client sudo wget > /dev/null
fi
```

Install [kubectl](https://github.com/kubernetes/kubectl) binary:

```bash
if [ ! -x /usr/local/bin/kubectl ]; then
  sudo curl -s -Lo /usr/local/bin/kubectl https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl
  sudo chmod a+x /usr/local/bin/kubectl
fi
```

Install [kops](https://github.com/kubernetes/kops):

```bash
if [ ! -x /usr/local/bin/kops ]; then
  sudo curl -s -L "https://github.com/kubernetes/kops/releases/download/1.14.0-alpha.3/kops-linux-amd64" > /usr/local/bin/kops
  sudo chmod a+x /usr/local/bin/kops
fi
```

## Configure AWS

Authorize to AWS using AWS CLI: [https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)

```bash
aws configure
...
```

Create DNS zone:

```bash
aws route53 create-hosted-zone --name ${MY_DOMAIN} --caller-reference ${MY_DOMAIN}
```

Use your domain registrar to change the nameservers for your zone (for example
`mylabs.dev`) to use the Amazon Route 53 nameservers. Here is the way how you
can find out the the Route 53 nameservers:

```bash
aws route53 get-hosted-zone --id $(aws route53 list-hosted-zones --query "HostedZones[?Name==\`${MY_DOMAIN}.\`].Id" --output text) --query "DelegationSet.NameServers"
```

Create policy allowing the cert-manager to change Route 53 settings. This will
allow cert-manager to generate wildcard SSL certificates by Let's Encrypt
certificate authority.

```bash
aws iam create-policy \
  --policy-name ${USER}-AmazonRoute53Domains-cert-manager \
  --description "Policy required by cert-manager to be able to modify Route 53 when generating wildcard certificates using Lets Encrypt" \
  --policy-document file://files/route_53_change_policy.json \
| jq
```

Output:

```json
{
    "Policy": {
        "PolicyName": "pruzicka-AmazonRoute53Domains-cert-manager",
        "PolicyId": "ANPA36ZNO4Q4MTW5T5ZLX",
        "Arn": "arn:aws:iam::822044714040:policy/pruzicka-AmazonRoute53Domains-cert-manager",
        "Path": "/",
        "DefaultVersionId": "v1",
        "AttachmentCount": 0,
        "IsAttachable": true,
        "CreateDate": "2019-06-05T11:16:58Z",
        "UpdateDate": "2019-06-05T11:16:58Z"
    }
}
```

Create user which will use the policy above allowing the cert-manager to change
Route 53 settings:

```bash
aws iam create-user --user-name ${USER}-route53 | jq && \
POLICY_ARN=$(aws iam list-policies --query "Policies[?PolicyName==\`${USER}-AmazonRoute53Domains-cert-manager\`].{ARN:Arn}" --output text) && \
aws iam attach-user-policy --user-name "${USER}-route53" --policy-arn $POLICY_ARN && \
aws iam create-access-key --user-name ${USER}-route53 > $HOME/.aws/${USER}-route53-${MY_DOMAIN} && \
export ROUTE53_AWS_ACCESS_KEY_ID=$(awk -F\" "/AccessKeyId/ { print \$4 }" $HOME/.aws/${USER}-route53-${MY_DOMAIN}) && \
export ROUTE53_AWS_SECRET_ACCESS_KEY=$(awk -F\" "/SecretAccessKey/ { print \$4 }" $HOME/.aws/${USER}-route53-${MY_DOMAIN})
```

Output:

```json
```

The `AccessKeyId` and `SecretAccessKey` is need for creating the `ClusterIssuer`
definition for `cert-manager`.

## Create K8s in AWS

![Architecture](https://raw.githubusercontent.com/aws-samples/eks-workshop/65b766c494a5b4f5420b2912d8373c4957163541/static/images/3-service-animated.gif
"Architecture")

Generate SSH keys if not exists:

```bash
test -f $HOME/.ssh/id_rsa || ( install -m 0700 -d $HOME/.ssh && ssh-keygen -b 2048 -t rsa -f $HOME/.ssh/id_rsa -q -N "" )
```

Clone the `k8s-knative-gitlab-harbor` Git repository if it wasn't done already:

```bash
if [ ! -d .git ]; then
  git clone --quiet https://github.com/ruzickap/k8s-k8s-knative-gitlab-harbor && cd k8s-knative-gitlab-harbor
fi
```

Create S3 bucket where the kops will store cluster status:

```bash
aws s3api create-bucket --bucket ${USER}-kops-k8s --region eu-central-1 --create-bucket-configuration LocationConstraint=eu-central-1
```

Create Kubernetes cluster in AWS by using [kops](https://github.com/kubernetes/kops):

```bash
kops create cluster \
  --name=${USER}-k8s.${MY_DOMAIN} \
  --state=s3://${USER}-kops-k8s \
  --zones=eu-central-1a \
  --node-count=5 \
  --node-size=t3.large \
  --node-volume-size=20 \
  --master-count=1 \
  --master-size=t3.small \
  --master-volume-size=10 \
  --dns-zone=${MY_DOMAIN} \
  --cloud-labels "Owner=${USER},Environment=Test,Division=Services" \
  --ssh-public-key $HOME/.ssh/id_rsa.pub \
  --yes
```

Output:

```text
```

Wait for cluster to be up and running:

```bash
sleep 200
while `kops validate cluster --state=s3://${USER}-kops-k8s -o yaml 2>&1 | grep -q failures`; do sleep 5; echo -n .; done
```

Store `kubeconfig` in current directory:

```bash
kops export kubecfg ${USER}-k8s.${MY_DOMAIN} --state=s3://${USER}-kops-k8s --kubeconfig kubeconfig.conf
```

Check if the new Kubernetes cluster is available:

```bash
export KUBECONFIG=$PWD/kubeconfig.conf
kubectl get nodes -o wide
```

Output:

```text
```
