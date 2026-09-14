#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

echo "============================================================"
echo " DIAGNOSTIC DEV.161 — DIPLOME CAP + RECHERCHE SIRET FRANCE"
echo "============================================================"

echo
echo "=== 1) DIPLOME — GENERATION PDF / CORRESPONDANCES ==="
grep -RniE \
  "DIPLOME_LIGNE|Diplome|Diplôme|diplome|Classe_convention_nom|Diplomes|Correspond|correspond|CAP2|CAP CARROSS|CARROSSIER" \
  apps-script/EUC_CONVENTION_PFMP_PdfV95.gs \
  apps-script/EUC_CONVENTION_PFMP_Service.gs \
  apps-script/EUC_CONVENTION_PFMP_*.gs \
  apps-script/*.gs 2>/dev/null | head -n 420 || true

echo
echo "=== 2) FONCTION DE PREPARATION DES DONNEES PDF ==="
python3 <<'PY'
from pathlib import Path
import re

files=list(Path("apps-script").glob("*.gs"))
for p in files:
    s=p.read_text(encoding="utf-8",errors="ignore")
    for name in [
        "EUC_PDF_preparerDataV117_",
        "EUC_CONVENTION_donneesImpressionV80",
        "EUC_CONVENTION_lireModelesLignesV108_"
    ]:
        marker="function "+name+"("
        a=s.find(marker)
        if a>=0:
            b=s.find("\nfunction ",a+10)
            if b<0:b=len(s)
            print("\n---",p.name,name,"---")
            print(s[a:b][:12000])
PY

echo
echo "=== 3) RECHERCHE SIRET — FONCTION REELLE ==="
grep -RniE \
  "function EUC_ENT_rechercherSiret|EUC_ENT_rechercherSiret\\(|rechercherSiret|api.*siret|siret.*api|SIRENE|sirene" \
  apps-script --include='*.gs' --include='*.html' | head -n 320 || true

python3 <<'PY'
from pathlib import Path
for p in Path("apps-script").glob("*"):
    if p.suffix not in (".gs",".js",".html"): continue
    s=p.read_text(encoding="utf-8",errors="ignore")
    marker="function EUC_ENT_rechercherSiret("
    a=s.find(marker)
    if a>=0:
        b=s.find("\nfunction ",a+10)
        if b<0:b=len(s)
        print("\n--- FONCTION REELLE",p.name,"---")
        print(s[a:b][:12000])
PY

echo
echo "=== 4) WRAPPER STRICT FRANCE ==="
if [ -f apps-script/EUC_SIRET_NIS_StrictV161.gs ]; then
  nl -ba apps-script/EUC_SIRET_NIS_StrictV161.gs | sed -n '1,220p'
fi

echo
echo "=== 5) HANDLER FRONTEND FRANCE ==="
if [ -f apps-script/PFMP_Acces_QR_V116.html ]; then
  grep -nE \
    "EUC_QR_CONTROLLER_FIX9|EUC_V161_verifierSiretFrance|Entreprise française retrouvée|SIRET non retrouvé|Erreur de recherche SIRET|search.addEventListener" \
    apps-script/PFMP_Acces_QR_V116.html | head -n 220 || true
fi

echo
echo "=== 6) SYNTAXE ==="
for f in \
  apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs \
  apps-script/EUC_SIRET_NIS_StrictV161.gs; do
  if [ -f "$f" ]; then
    cp "$f" "/tmp/$(basename "$f").js"
    node --check "/tmp/$(basename "$f").js" || true
  fi
done

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
