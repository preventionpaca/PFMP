#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

echo "============================================================"
echo " DIAGNOSTIC UI DESAFFECTATION APRES FIX16"
echo "============================================================"

[ -f "$HTML" ] || { echo "ERREUR : fichier introuvable : $HTML"; exit 1; }

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

def around(label, needle, before=1200, after=2200):
    i=s.find(needle)
    print("\n============================================================")
    print(label)
    print("============================================================")
    if i<0:
        print("INTRouvable :", needle)
        return
    print(s[max(0,i-before):min(len(s),i+after)])

around("1) CREATION BOUTONS RETIRER", "function openRet(type)")
around("2) HANDLER CONFIRMATION", "confirm.onclick=function()")
around("3) APPEL SERVEUR", ".EUC_SUIVI_DESAFFECTER_V162(")

print("\n============================================================")
print("4) OCCURRENCES CLES")
print("============================================================")
for needle in [
    "retireTELEPHONEV162",
    "retireVISITEV162",
    "retConfirmV162",
    "EUC_TRACE_DESAFFECT_RUN_V161",
    "affectationIds:affectationIds",
    "confirm.onclick=function()",
]:
    print(needle, "=>", s.count(needle))

print("\n============================================================")
print("5) EXTRACTION / CHECK DE TOUS LES SCRIPTS INLINE")
print("============================================================")
scripts=re.findall(r"<script\b([^>]*)>(.*?)</script>",s,re.S|re.I)
outdir=Path("/tmp/euc_inline_scripts")
outdir.mkdir(exist_ok=True)

for idx,(attrs,code) in enumerate(scripts,1):
    if "src=" in attrs.lower():
        continue
    f=outdir/f"inline_{idx:02d}.js"
    f.write_text(code,encoding="utf-8")
    print(f)
PY

echo
echo "=== NODE CHECK DES SCRIPTS INLINE ==="
FAIL=0
for f in /tmp/euc_inline_scripts/*.js; do
  [ -e "$f" ] || continue
  if ! node --check "$f"; then
    echo "ERREUR JS DANS : $f"
    FAIL=1
  fi
done

echo
echo "============================================================"
if [ "$FAIL" -eq 0 ]; then
  echo " SYNTAXE JS INLINE : OK"
else
  echo " SYNTAXE JS INLINE : ERREUR DETECTEE"
fi
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
