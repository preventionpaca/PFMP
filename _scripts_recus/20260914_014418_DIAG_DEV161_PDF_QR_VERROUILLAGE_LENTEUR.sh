#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

echo "============================================================"
echo " DIAGNOSTIC DEV.161 — PDF / QR LENT / VERROUILLAGE"
echo "============================================================"

FILES=(
  "apps-script/Convention_PFMP_PdfV95.html"
  "apps-script/EUC_CONVENTION_PFMP_PdfV95.gs"
  "apps-script/PFMP_Acces_QR_V116.html"
  "apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"
  "apps-script/EUC_SIRET_NIS_StrictV161.gs"
  "apps-script/EUC_PFMP_Monaco_V161Fix8.gs"
  "apps-script/EUC_PFMP_WebApp.gs"
  "apps-script/EDT.js"
)

for f in "${FILES[@]}"; do
  [ -f "$f" ] && echo "✓ $f" || echo "⚠ ABSENT : $f"
done

echo
echo "============================================================"
echo " 1) PDF — EST-CE QUE LA SURCHARGE DESSINE ENCORE LE LIBELLE ?"
echo "============================================================"
grep -nE "drawSiretNisLabel|SIRET_LABEL_V161|drawRectangle|SIRET \\(France\\)|NIS \\(Monaco\\)|pdfBase64|EUC_PDF_TEMPLATE" \
  apps-script/Convention_PFMP_PdfV95.html \
  apps-script/EUC_CONVENTION_PFMP_PdfV95.gs 2>/dev/null || true

echo
echo "============================================================"
echo " 2) QR HTML — COMBIEN DE SURCOUCHES / HANDLERS ?"
echo "============================================================"
if [ -f apps-script/PFMP_Acces_QR_V116.html ]; then
  printf "country select count        : "
  grep -o 'entreprisePaysSelectV161' apps-script/PFMP_Acces_QR_V116.html | wc -l
  printf "strict V161 script count    : "
  grep -o 'EUC_SIRET_NIS_STRICT_V161' apps-script/PFMP_Acces_QR_V116.html | wc -l
  printf "FIX8 Monaco flow count      : "
  grep -o 'EUC_FIX8_MONACO_FLOW' apps-script/PFMP_Acces_QR_V116.html | wc -l
  printf "search click handlers count : "
  grep -o "search.addEventListener('click'" apps-script/PFMP_Acces_QR_V116.html | wc -l
  printf "save click handlers count   : "
  grep -o "save.addEventListener('click'" apps-script/PFMP_Acces_QR_V116.html | wc -l

  echo
  grep -nE \
    "entreprisePaysSelectV161|EUC_SIRET_NIS_STRICT_V161|EUC_FIX8_MONACO_FLOW|function bind\\(|function mode\\(|function lock\\(|readOnly|disabled|euc-locked|search.addEventListener\\('click'|save.addEventListener\\('click'|EUC_ENT_rechercherSiret|EUC_V161_verifierSiretFrance|EUC_V161_rechercherEntrepriseMonaco" \
    apps-script/PFMP_Acces_QR_V116.html | head -n 420 || true
fi

echo
echo "============================================================"
echo " 3) IDS REELS DES CHAMPS ENTREPRISE DANS LE FORMULAIRE"
echo "============================================================"
grep -nE \
  'id="(entrepriseRaisonSociale|entrepriseEnseigne|entrepriseAdresse|entrepriseComplement|entrepriseCodePostal|entrepriseCommune|entreprisePays|siret|search|save)"' \
  apps-script/PFMP_Acces_QR_V116.html 2>/dev/null || true

echo
echo "============================================================"
echo " 4) BACKEND QR — FONCTIONS ET DOUBLONS"
echo "============================================================"
if [ -f apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs ]; then
  grep -nE "^function EUC_CONVENTION_(verifierIdentite|verifierNaissance|repriseEntreprise|enregistrerEntreprise)|assurerColonnes|lireAccesFrais|EUC_V161_verifierSiretFrance|EUC_V161_rechercherEntrepriseMonaco" \
    apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs | head -n 260 || true

  echo
  python3 <<'PY'
from pathlib import Path
s=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs").read_text(encoding="utf-8")
names=[
"EUC_CONVENTION_verifierIdentiteV113",
"EUC_CONVENTION_verifierNaissanceV113_",
"EUC_CONVENTION_repriseEntrepriseV117",
"EUC_CONVENTION_enregistrerEntrepriseV117",
"EUC_CONVENTION_assurerColonnesEntrepriseV117_"
]
for n in names:
    print(f"{n}: {s.count('function '+n+'(')} définition(s)")
PY
fi

echo
echo "============================================================"
echo " 5) RECHERCHE DE CAUSES DE LENTEUR DANS LE PARCOURS QR"
echo "============================================================"
grep -RniE \
  "sleep\\(|Utilities\\.sleep|assurerColonnes|/columns|lireRecords_|lireAccesFrais|CacheService|LockService|UrlFetchApp|fetch\\(" \
  apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs \
  apps-script/EUC_SIRET_NIS_StrictV161.gs \
  apps-script/EUC_PFMP_Monaco_V161Fix8.gs \
  apps-script/EUC_PFMP_WebApp.gs 2>/dev/null | head -n 320 || true

echo
echo "============================================================"
echo " 6) ROUTE PUBLIQUE QR — TEMPLATE REELLEMENT SERVI"
echo "============================================================"
grep -RniE \
  "PFMP_Acces_QR_V116|afficherAcces|QRPublic|createTemplateFromFile|verifierIdentiteV113" \
  apps-script/EUC_PFMP_WebApp.gs apps-script/EDT.js apps-script/*.gs 2>/dev/null | head -n 260 || true

echo
echo "============================================================"
echo " 7) SYNTAXE JS / GS"
echo "============================================================"
for f in \
  apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs \
  apps-script/EUC_SIRET_NIS_StrictV161.gs \
  apps-script/EUC_PFMP_Monaco_V161Fix8.gs \
  apps-script/EDT.js; do
  if [ -f "$f" ]; then
    cp "$f" "/tmp/$(basename "$f").js"
    if node --check "/tmp/$(basename "$f").js" >/dev/null 2>&1; then
      echo "✓ syntaxe : $f"
    else
      echo "✗ syntaxe : $f"
      node --check "/tmp/$(basename "$f").js" || true
    fi
  fi
done

echo
echo "============================================================"
echo " 8) DEPLOIEMENTS ACTUELS"
echo "============================================================"
clasp deployments || true

echo
echo "============================================================"
echo " 9) ETAT LOCAL"
echo "============================================================"
git status --short -- \
  apps-script/Convention_PFMP_PdfV95.html \
  apps-script/EUC_CONVENTION_PFMP_PdfV95.gs \
  apps-script/PFMP_Acces_QR_V116.html \
  apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs \
  apps-script/EUC_SIRET_NIS_StrictV161.gs \
  apps-script/EUC_PFMP_Monaco_V161Fix8.gs \
  apps-script/EUC_PFMP_WebApp.gs \
  apps-script/EDT.js 2>/dev/null || true

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
