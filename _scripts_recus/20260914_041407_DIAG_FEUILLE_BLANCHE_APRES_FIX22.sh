#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
ROUTER="apps-script/EDT.js"
FIX18="apps-script/EUC_SUIVI_PFMP_FixV161_18.gs"

echo "============================================================"
echo " DIAGNOSTIC FEUILLE BLANCHE — APRES FIX22"
echo "============================================================"

for f in "$HTML" "$ROUTER" "$FIX18"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
done

echo
echo "=== 1) ROUTE ==="
grep -n "suivi-pfmp-classe" "$ROUTER" || true

echo
echo "=== 2) STRUCTURE HTML ==="
grep -nE "<html|</html>|<body|</body>|<script|</script>|DEV161_FIX3_ENHANCEMENT|EUC_FIX20|EUC_FIX22" "$HTML" || true

echo
echo "=== 3) CONTROLE EQUILIBRE TAGS ==="
python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")

for tag in ["html","body","script","style","div"]:
    o=len(re.findall(r"<"+tag+r"\b",s,re.I))
    c=len(re.findall(r"</"+tag+r">",s,re.I))
    print(f"{tag}: ouverts={o} fermés={c} delta={o-c}")

print("DEV161_FIX3_ENHANCEMENT :", s.count('id="DEV161_FIX3_ENHANCEMENT"'))
print("EUC_FIX20_RETRAIT_SCRIPT :", s.count('id="EUC_FIX20_RETRAIT_SCRIPT"'))
print("EUC_SUIVI_DESAFFECTER_V162 :", s.count("EUC_SUIVI_DESAFFECTER_V162"))
print("EUC_SUIVI_DESAFFECTER_F18 :", s.count("EUC_SUIVI_DESAFFECTER_F18"))
PY

echo
echo "=== 4) CHECK DE TOUS LES SCRIPTS INLINE ==="
rm -rf /tmp/diag_blank_inline
mkdir -p /tmp/diag_blank_inline

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
s=s.replace("<?!= config ?>","{}")
s=s.replace("<?!= anneeContextJson ?>","{}")
s=s.replace("<?!= detailJson ?>","{}")

scripts=re.findall(r"<script\b([^>]*)>(.*?)</script>",s,re.S|re.I)
out=Path("/tmp/diag_blank_inline")
n=0
for attrs,code in scripts:
    if "src=" in attrs.lower():
        continue
    n+=1
    (out/f"inline_{n:02d}.js").write_text(code,encoding="utf-8")
print("Scripts inline détectés :",n)
PY

shopt -s nullglob
FILES=(/tmp/diag_blank_inline/*.js)
for f in "${FILES[@]}"; do
  echo "-- $f"
  node --check "$f" || true
done

echo
echo "=== 5) EXTRAIT DEV161_FIX3_ENHANCEMENT ==="
python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
m=re.search(r'<script id="DEV161_FIX3_ENHANCEMENT">(.*?)</script>',s,re.S)
if not m:
    print("BLOC INTROUVABLE")
else:
    print(m.group(1))
PY

echo
echo "=== 6) DEPLOIEMENT PRINCIPAL ==="
clasp deployments | grep -E 'AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg|Found' || true

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
