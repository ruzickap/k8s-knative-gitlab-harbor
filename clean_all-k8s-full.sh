#!/bin/bash -eu

sed -n "/^\`\`\`bash.*/,/^\`\`\`$/p" docs/part-10/README.md | sed '/^```*/d' | sh -x
