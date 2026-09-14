#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.147-fix1"
PAGE="apps-script/Admin_Conventions_PFMP.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV147_avant_FIX1_${STAMP}"
mkdir -p "$BACKUP"
cp "$PAGE" "$BACKUP/"

echo "CmZyb20gcGF0aGxpYiBpbXBvcnQgUGF0aAppbXBvcnQgcmUKCnA9UGF0aCgiYXBwcy1zY3JpcHQvQWRtaW5fQ29udmVudGlvbnNfUEZNUC5odG1sIikKcz1wLnJlYWRfdGV4dChlbmNvZGluZz0idXRmLTgiKQoKIyBMb2NhbGlzZXIgZXQgcmV0aXJlciBsYSBtb2RhbGUgREVWLjE0NyBzaSBlbGxlIGVzdCBwbGFjw6llIGFwcsOocyBsZSBzY3JpcHQgcHJpbmNpcGFsLgptPXJlLnNlYXJjaChyJ1xuPzxkaXYgaWQ9ImNvbmZpcm1Nb2RhbCIuKj88L2Rpdj5ccyo8L2Rpdj5ccyo8L2Rpdj5ccyonLCBzLCByZS5TKQppZiBub3QgbToKICAgIHJhaXNlIFN5c3RlbUV4aXQoIkVSUkVVUiA6IGJsb2MgY29uZmlybU1vZGFsIGludHJvdXZhYmxlLiIpCgptb2RhbD1tLmdyb3VwKDApLnN0cmlwKCkKcz1zWzptLnN0YXJ0KCldK3NbbS5lbmQoKTpdCgojIFLDqWluc8OpcmVyIGxhIG1vZGFsZSBBVkFOVCBsZSBzY3JpcHQgcHJpbmNpcGFsLCBwb3VyIHF1ZSBnZXRFbGVtZW50QnlJZCgpCiMgdHJvdXZlIGxlcyDDqWzDqW1lbnRzIGTDqHMgbCdleMOpY3V0aW9uIGR1IEphdmFTY3JpcHQuCm1hcmtlcj0iPHNjcmlwdD5cbmNvbnN0IEM9IgppZiBtYXJrZXIgbm90IGluIHM6CiAgICByYWlzZSBTeXN0ZW1FeGl0KCJFUlJFVVIgOiBzY3JpcHQgcHJpbmNpcGFsIGludHJvdXZhYmxlLiIpCgpzPXMucmVwbGFjZShtYXJrZXIsIG1vZGFsKyJcblxuIittYXJrZXIsIDEpCgpwLndyaXRlX3RleHQocyxlbmNvZGluZz0idXRmLTgiKQpwcmludCgiT0sgOiBtb2RhbGUgZMOpcGxhY8OpZSBhdmFudCBsZSBzY3JpcHQgcHJpbmNpcGFsLiIpCg==" | base64 -d > /tmp/dev147_fix1_patch.py
python3 /tmp/dev147_fix1_patch.py

echo "============================================================"
echo " DEV.147 FIX1 — CONTROLES"
echo "============================================================"

python3 - <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Admin_Conventions_PFMP.html").read_text(encoding="utf-8")

pos_modal=s.find('id="confirmModal"')
pos_script=s.find('<script>\nconst C=')

if pos_modal<0 or pos_script<0:
    raise SystemExit("ERREUR : modale ou script introuvable.")
if pos_modal>pos_script:
    raise SystemExit("ERREUR : la modale est encore placée après le script.")

scripts=re.findall(r"<script>(.*?)</script>",s,re.S)
js="\n".join(scripts)
js=re.sub(r"<\?!=.*?\?>","{}",js)
Path("/tmp/Admin_Conventions_PFMP_DEV147_FIX1.js").write_text(js,encoding="utf-8")

print("OK : modale présente avant le script principal.")
PY

node --check /tmp/Admin_Conventions_PFMP_DEV147_FIX1.js

grep -q "const DOSSIERS_INIT=" "$PAGE"
grep -q "function askConfirm" "$PAGE"
grep -q "Validation en cours" "$PAGE"

echo "OK : JavaScript client valide."
echo "OK : dossiers initiaux conservés."
echo "OK : modale et feedback traitement conservés."

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
echo " DEV.147 FIX1 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ JavaScript réactivé"
echo "✓ autocomplétion restaurée"
echo "✓ modale personnalisée conservée"
echo "✓ boutons avec état de traitement conservés"
echo "✓ push + version + déploiement principal"
echo "============================================================"
