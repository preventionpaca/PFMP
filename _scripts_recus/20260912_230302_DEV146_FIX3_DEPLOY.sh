#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
WEBAPP_URL="https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec"
LABEL="PFMP v1.0.0-dev.146-fix3"

FILE="apps-script/Admin_PFMP.html"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV146_avant_FIX3_${STAMP}"
mkdir -p "$BACKUP"
cp "$FILE" "$BACKUP/"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Admin_PFMP.html")
s=p.read_text(encoding="utf-8")

deployment_id="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
url=f"https://script.google.com/macros/s/{deployment_id}/exec?page=admin-conventions-pfmp"

old='<?!= config.baseUrl ?>?page=admin-conventions-pfmp'

if old in s:
    s=s.replace(old,url)
elif 'undefined?page=admin-conventions-pfmp' in s:
    s=s.replace('undefined?page=admin-conventions-pfmp',url)
elif url not in s:
    raise SystemExit("ERREUR : lien de la vignette DEV.146 introuvable.")

p.write_text(s,encoding="utf-8")
print("OK : lien de la vignette remplacé par l’URL absolue de la WebApp.")
PY

echo "============================================================"
echo " DEV.146 FIX3 — CONTROLES"
echo "============================================================"

grep -q "admin-conventions-pfmp" "$FILE"
grep -q "$DEPLOYMENT_ID" "$FILE"

if grep -q "config.baseUrl.*admin-conventions-pfmp" "$FILE"; then
  echo "ERREUR : ancien lien config.baseUrl encore présent."
  exit 1
fi

echo "OK : la vignette pointe vers la WebApp principale."
echo "URL : $WEBAPP_URL?page=admin-conventions-pfmp"

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
echo "============================================================"
echo " DEV.146 FIX3 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ lien undefined corrigé"
echo "✓ push + version + déploiement principal effectués"
echo
echo "Recharge Admin PFMP avec Ctrl+Shift+R puis reclique sur"
echo "Administration des conventions."
echo "============================================================"
