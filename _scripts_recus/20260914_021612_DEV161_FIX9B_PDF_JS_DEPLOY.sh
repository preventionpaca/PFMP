#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix9b-pdf-js"

PDF_HTML="apps-script/Convention_PFMP_PdfV95.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX9B_${STAMP}"
mkdir -p "$BACKUP"
cp "$PDF_HTML" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX9B — REPARATION JAVASCRIPT PDF"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Convention_PFMP_PdfV95.html")
s=p.read_text(encoding="utf-8")

# Supprimer précisément le reliquat laissé par l'ancienne surcharge graphique.
patterns = [
    r"\n?\s*\);\s*page\.drawText\('N° SIRET \(France\) / NIS \(Monaco\) :',\{x:r\.x\+2,y:r\.y\+5,size:7\.5,font:bold,color:COLORS\.NOIR\}\);\}\s*",
    r"\n?\s*page\.drawText\('N° SIRET \(France\) / NIS \(Monaco\) :'.*?\);\}\s*"
]

changed=False
for pat in patterns:
    s2,n=re.subn(pat,"\n",s,count=1,flags=re.S)
    if n:
        s=s2
        changed=True
        break

# Garde-fou : la surcharge ne doit plus exister nulle part.
if "N° SIRET (France) / NIS (Monaco) :" in s:
    raise SystemExit("ERREUR : reliquat SIRET/NIS encore présent dans le template PDF.")

if "drawSiretNisLabel" in s or "SIRET_LABEL_V161" in s:
    raise SystemExit("ERREUR : ancienne surcharge PDF encore présente.")

if not changed:
    print("INFO : aucun reliquat exact à supprimer ; vérification de syntaxe tout de même.")

p.write_text(s,encoding="utf-8")
print("OK : reliquat JavaScript PDF supprimé.")
PY

echo
echo "============================================================"
echo " CONTROLE JAVASCRIPT DU TEMPLATE PDF"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Convention_PFMP_PdfV95.html").read_text(encoding="utf-8")
scripts=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',s,re.S|re.I)

js=[]
for x in scripts:
    if "<?!= payload ?>" in x:
        x=x.replace("<?!= payload ?>","{}")
    js.append(x)

Path("/tmp/Convention_PFMP_PdfV95_FIX9B.js").write_text("\n".join(js),encoding="utf-8")
print("scripts extraits :",len(scripts))
PY

node --check /tmp/Convention_PFMP_PdfV95_FIX9B.js

grep -q "PDFDocument.load" "$PDF_HTML"
grep -q "drawQR" "$PDF_HTML"
grep -q "buildOne" "$PDF_HTML"
grep -q "URL.createObjectURL" "$PDF_HTML"

! grep -q "drawSiretNisLabel" "$PDF_HTML"
! grep -q "SIRET_LABEL_V161" "$PDF_HTML"
! grep -q "N° SIRET (France) / NIS (Monaco) :" "$PDF_HTML"

echo "✓ syntaxe JavaScript PDF valide"
echo "✓ génération PDF conservée"
echo "✓ QR conservé"
echo "✓ aucune surcharge SIRET/NIS restante"

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
echo " DEV.161 FIX9B DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Générez maintenant une NOUVELLE convention pour tester."
echo "============================================================"
