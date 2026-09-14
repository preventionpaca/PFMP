#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

PDF="apps-script/Convention_PFMP_PdfV95.html"
WEBAPP="apps-script/EUC_CONVENTION_PFMP_WebApp.gs"
PDFGS="apps-script/EUC_CONVENTION_PFMP_PdfV95.gs"

echo "============================================================"
echo " DIAGNOSTIC PDF V95 — LIBELLE SIRET / NIS"
echo "============================================================"
echo

for f in "$PDF" "$WEBAPP" "$PDFGS"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
done

echo "=== 1) OCCURRENCES SIRET / ENTREPRISE DANS PDF V95 ==="
grep -niE "SIRET|NIS|entreprise|raison|adresse|company|siret" "$PDF" | head -n 220 || true

echo
echo "=== 2) DEBUT COMPLET DU TEMPLATE PDF V95 ==="
sed -n '1,260p' "$PDF"

echo
echo "=== 3) INCLUSIONS / TEMPLATES APPELES DEPUIS PDF V95 ==="
grep -niE "include|inclure|createTemplate|evaluate|innerHTML|payload|data" "$PDF" | head -n 220 || true

echo
echo "=== 4) GENERATION / PAYLOAD COTE SERVEUR ==="
grep -niE "payload|siret|entreprise|raison|adresse|render|html|template" "$PDFGS" | head -n 260 || true

echo
echo "=== 5) ROUTE WEBAPP PDF ==="
sed -n '1,45p' "$WEBAPP"

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
