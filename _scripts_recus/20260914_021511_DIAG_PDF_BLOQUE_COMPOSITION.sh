#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

HTML="apps-script/Convention_PFMP_PdfV95.html"
GS="apps-script/EUC_CONVENTION_PFMP_PdfV95.gs"

echo "============================================================"
echo " DIAGNOSTIC PDF — BLOQUE SUR COMPOSITION"
echo "============================================================"

for f in "$HTML" "$GS"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
done

echo
echo "=== 1) TEMPLATE PDF HTML COMPLET ==="
nl -ba "$HTML" | sed -n '1,140p'

echo
echo "=== 2) FONCTIONS PDF SERVEUR ==="
grep -nE \
  "EUC_PDF_modeleBase64_|EUC_PDF_fileByProp_|EUC_PDF_importerModele|CacheService|getScriptCache|put\\(|get\\(|remove\\(|EUC_PFMP_PDF_MASTER_B64" \
  "$GS" | head -n 240 || true

echo
echo "=== 3) EXTRACTION DU JAVASCRIPT DU TEMPLATE + NODE CHECK ==="
python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/Convention_PFMP_PdfV95.html").read_text(encoding="utf-8")
scripts=re.findall(r'<script(?:\\s[^>]*)?>(.*?)</script>',s,re.S|re.I)
js=[]
for x in scripts:
    if "<?!= payload ?>" in x:
        x=x.replace("<?!= payload ?>","{}")
    js.append(x)
Path("/tmp/Convention_PFMP_PdfV95_DIAG.js").write_text("\n".join(js),encoding="utf-8")
print("scripts extraits :",len(scripts))
PY
node --check /tmp/Convention_PFMP_PdfV95_DIAG.js || true

echo
echo "=== 4) OCCURRENCES IMPORTANTES ==="
grep -nE \
  "PAYLOAD|pdfBase64|PDFDocument.load|buildOne|drawQR|finalBytes|URL.createObjectURL|actions.hidden|status.textContent|catch\\(" \
  "$HTML" || true

echo
echo "=== 5) TAILLE / CACHE / MODELE ==="
grep -nE \
  "EUC_PDF_TEMPLATE_PROP_|EUC_PDF_TEMPLATE_NAME_|EUC_PDF_modeleInfo|EUC_PDF_modeleBase64_|base64Encode|getBytes|CacheService" \
  "$GS" | head -n 200 || true

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
