#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.158-fix3"
ADMIN_HOME="apps-script/Admin_PFMP.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV158_avant_FIX3_${STAMP}"
mkdir -p "$BACKUP"
cp "$ADMIN_HOME" "$BACKUP/"

echo "============================================================"
echo " DEV.158 FIX3 — LIEN VIGNETTE DESTINATAIRES"
echo "============================================================"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Admin_PFMP.html")
s=p.read_text(encoding="utf-8")

deployment="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
good="https://script.google.com/macros/s/"+deployment+"/exec?page=destinataires-envois-pfmp"

old="a.href=location.href.split('?')[0]+'?page=destinataires-envois-pfmp';"
new="a.href='"+good+"';"

if old in s:
    s=s.replace(old,new,1)
elif good not in s:
    raise SystemExit("ERREUR : lien de la vignette V158 introuvable.")

p.write_text(s,encoding="utf-8")
print("OK : vignette V158 pointe maintenant vers le vrai /exec Apps Script.")
PY

echo
echo "=== CONTROLES ==="
grep -q "destV158Tile" "$ADMIN_HOME"
grep -q "script.google.com/macros/s/$DEPLOYMENT_ID/exec?page=destinataires-envois-pfmp" "$ADMIN_HOME"

if grep -q "location.href.split('?')\[0\].*destinataires-envois-pfmp" "$ADMIN_HOME"; then
  echo "ERREUR : ancien lien googleusercontent encore présent."
  exit 1
fi

echo "✓ vignette présente"
echo "✓ URL /exec correcte"
echo "✓ plus de navigation vers userCodeAppPanel/googleusercontent"

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
VERSION_OUTPUT="$(clasp version "$LABEL")"
echo "$VERSION_OUTPUT"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo
echo "============================================================"
echo " DEV.158 FIX3 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ lien Destinataires & envois corrigé"
echo "✓ navigation vers le vrai WebApp /exec"
echo "✓ push + version + déploiement principal"
echo "============================================================"
