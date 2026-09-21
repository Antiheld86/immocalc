#!/usr/bin/env bash
# Legt das GitHub-Repository an und lädt den Code hoch.
# Voraussetzung: git und die GitHub CLI (gh), angemeldet mit `gh auth login`.
set -euo pipefail

NAME="${1:-immocalc}"
SICHTBARKEIT="${2:-private}"   # private oder public

command -v gh >/dev/null || { echo "GitHub CLI fehlt: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Zuerst anmelden: gh auth login"; exit 1; }

cd "$(dirname "$0")"
rm -f github-einrichten.sh.bak

if [ ! -d .git ]; then
  git init -q -b main
  git add .
  git commit -q -m "Immocalc 2.0"
fi

gh repo create "$NAME" "--$SICHTBARKEIT" --source=. --remote=origin --push \
  --description "Renditerechner für vermietete Wohnimmobilien – einheitengenau, 40 Jahre, Steuern, Szenarien"

echo
echo "Fertig: $(gh repo view "$NAME" --json url -q .url)"
