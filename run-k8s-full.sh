#!/usr/bin/env bash

set -eu

################################################
# include the magic
################################################
test -s ./demo-magic.sh || curl --silent https://raw.githubusercontent.com/paxtonhare/demo-magic/master/demo-magic.sh > demo-magic.sh
# shellcheck disable=SC1091
. ./demo-magic.sh

################################################
# Configure the options
################################################

#
# speed at which to simulate typing. bigger num = faster
#
export TYPE_SPEED=60

# Uncomment to run non-interactively
export PROMPT_TIMEOUT=0

# No wait
export NO_WAIT=true

#
# custom prompt
#
# see http://www.tldp.org/HOWTO/Bash-Prompt-HOWTO/bash-prompt-escape-sequences.html for escape sequences
#
#DEMO_PROMPT="${GREEN}➜ ${CYAN}\W "
export DEMO_PROMPT="${GREEN}➜ ${CYAN}$ "

# hide the evidence
#clear

### Please run these commands before running the script

# SSH agent needs to be enabled
# docker run -it --rm -e USER -e GITHUB_TOKEN -e SSH_AUTH_SOCK -v $PWD:/mnt -v $HOME/.aws:/root/.aws -v $HOME/.config/hub:/root/.config/hub:ro ubuntu
# echo $(hostname -I) $(hostname) >> /etc/hosts
# apt-get update -qq && apt-get install -qq -y curl git pv > /dev/null
# cd /mnt

# export LETSENCRYPT_ENVIRONMENT="production"  # Use with care - Let's Encrypt will generate real certificates
# export MY_DOMAIN="mylabs.dev"

# ./run-k8s-full.sh

[ ! -d .git ] && git clone --quiet https://github.com/ruzickap/k8s-knative-gitlab-harbor && cd k8s-knative-gitlab-harbor

sed docs/part-0{1..9}/README.md \
  -e '/^## Configure AWS/,/^Create policy allowing the cert-manager to change Route 53 settings./d' \
| \
sed -n "/^\`\`\`bash.*/,/^\`\`\`$/p" \
| \
sed \
  -e 's/^```bash.*/\npe '"'"'/' \
  -e 's/^```$/'"'"'/' \
> README.sh


if [ "$#" -eq 0 ]; then
  # shellcheck disable=SC1091
  source README.sh
else
  cat README.sh
fi
