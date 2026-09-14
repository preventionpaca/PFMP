#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.144-fix2"

FILE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV144_avant_FIX2_${STAMP}"
mkdir -p "$BACKUP"

if [ ! -f "$FILE" ]; then
  echo "ERREUR : fichier introuvable : $FILE"
  exit 1
fi

cp "$FILE" "$BACKUP/"

python3 <<'PY'
from pathlib import Path

p = Path("apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs")
s = p.read_text(encoding="utf-8")

lines = s.splitlines()

# DEV.144 FIX1 avait remplacé seulement la première ligne du commentaire
# multi-ligne, laissant des lignes commençant par " *" sans ouverture /*.
# On nettoie uniquement ce bloc d'en-tête.
while lines and (
    lines[0].startswith("/** Eucalyptus PFMP")
    or lines[0].startswith(" * Workflow administratif")
    or lines[0].startswith(" * Aucun envoi")
    or lines[0].strip() == "*/"
):
    lines.pop(0)

header = [
    "/**",
    " * Eucalyptus PFMP — v1.0.0-dev.144-fix2",
    " * Workflow administratif + migration des dossiers existants.",
    " * Aucun courriel envoyé par les fonctions de diagnostic/migration.",
    " */",
    ""
]

s = "\n".join(header + lines).lstrip("\n") + "\n"
p.write_text(s, encoding="utf-8")

print("FIX2 appliqué : en-tête JavaScript réparé.")
PY

echo "============================================================"
echo " DEV.144 FIX2 — CONTROLES"
echo "============================================================"

cp "$FILE" /tmp/EUC_ADMIN_WORKFLOW_V144_FIX2.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V144_FIX2.js

grep -q "MIGRER_DEV144_DOSSIERS_EXISTANTS" "$FILE"
grep -q "EUC_ADMIN_WORKFLOW_numeroV144_" "$FILE"
grep -q "EUC_ADMIN_WORKFLOW_dateEnregistrementV144_" "$FILE"
grep -q "DIAGNOSTIC_DEV144_PFMP_000223" "$FILE"

echo "OK : syntaxe valide."
echo "OK : migration et diagnostic présents."

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
clasp version "$LABEL"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy \
  -i "$DEPLOYMENT_ID" \
  -d "$LABEL"

echo
echo "=== CONTROLE DEPLOIEMENTS ==="
clasp deployments

echo
echo "============================================================"
echo " DEV.144 FIX2 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ syntaxe réparée"
echo "✓ push effectué"
echo "✓ version créée"
echo "✓ déploiement principal mis à jour"
echo "✓ aucun courriel envoyé"
echo
echo "Dans Apps Script, exécuter ensuite :"
echo "1. MIGRER_DEV144_DOSSIERS_EXISTANTS"
echo "2. DIAGNOSTIC_DEV144_PFMP_000223"
echo "============================================================"
