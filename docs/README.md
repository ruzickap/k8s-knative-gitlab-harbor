# Kubernetes + Knative + GitLab + Harbor

[![Build Status](https://travis-ci.com/ruzickap/k8s-knative-gitlab-harbor.svg?branch=master)](https://travis-ci.com/ruzickap/k8s-knative-gitlab-harbor)

* Demo GitHub repository: [https://github.com/ruzickap/k8s-knative-gitlab-harbor](https://github.com/ruzickap/k8s-knative-gitlab-harbor)
* Demo Web Pages: [https://ruzickap.github.io/k8s-knative-gitlab-harbor](https://ruzickap.github.io/k8s-knative-gitlab-harbor)

## Requirements

* [awscli](https://aws.amazon.com/cli/)
* [AWS IAM Authenticator for Kubernetes](https://github.com/kubernetes-sigs/aws-iam-authenticator)
* [AWS account](https://aws.amazon.com/account/)
* [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
* [kops](https://github.com/kubernetes/kops)
* Kubernetes, Docker, Linux, AWS knowledge required

## Content

* [Part 01 - Create "kops" cluster](part-01/README.md)
* [Part 02 - Install Helm](part-02/README.md)
* [Part 03 - Istio + cert-manager + kubed installation](part-03/README.md)
* [Part 04 - Harbor installation](part-04/README.md)
* [Part 05 - GitLab installation](part-05/README.md)
* [Part 06 - Knative installation](part-06/README.md)
