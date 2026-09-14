#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.157-fix1"

ROUTER="apps-script/EDT.js"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV157_avant_FIX1_${STAMP}"
mkdir -p "$BACKUP"
cp "$ROUTER" "$BACKUP/"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EDT.js")
s=p.read_text(encoding="utf-8")

bad="if (page === 'parametres-envois-pfmp') return EUC_V157_afficherParametres(e);\\n  if (page === 'suivi-pfmp-classe') return EUC_SUIVI_CLASSE_afficherV156(e);"
good="if (page === 'parametres-envois-pfmp') return EUC_V157_afficherParametres(e);\n  if (page === 'suivi-pfmp-classe') return EUC_SUIVI_CLASSE_afficherV156(e);"

if bad in s:
    s=s.replace(bad,good,1)
else:
    # garde-fou générique : convertir l'éventuel littéral \n situé entre ces deux routes
    s=s.replace(
        "return EUC_V157_afficherParametres(e);\\n  if (page === 'suivi-pfmp-classe')",
        "return EUC_V157_afficherParametres(e);\n  if (page === 'suivi-pfmp-classe')",
        1
    )

p.write_text(s,encoding="utf-8")
print("OK : littéral \\\\n supprimé dans EDT.js.")
PY

echo "============================================================"
echo " DEV.157 FIX1 — CONTROLES"
echo "============================================================"

cp "$ROUTER" /tmp/EDT_DEV157_FIX1.js
node --check /tmp/EDT_DEV157_FIX1.js

grep -q "parametres-envois-pfmp" "$ROUTER"
grep -q "suivi-pfmp-classe" "$ROUTER"

if grep -n "parametres-envois-pfmp.*\\\\n" "$ROUTER"; then
  echo "ERREUR : un littéral \\\\n subsiste encore dans la route."
  exit 1
fi

echo "OK : syntaxe EDT.js valide."
echo "OK : routes DEV.157 présentes."

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
clasp version "$LABEL"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo
echo "============================================================"
echo " DEV.157 FIX1 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ route paramètres corrigée"
echo "✓ syntaxe EDT.js valide"
echo "✓ push + version + déploiement principal"
echo "============================================================"
