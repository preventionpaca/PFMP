#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

echo "============================================================"
echo " DIAGNOSTIC DEV.161 — CHAMPS OBLIGATOIRES / QR 15s / DIPLOME CAP"
echo "============================================================"

QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"
WEBAPP="apps-script/EUC_PFMP_WebApp.gs"
DONNEES="apps-script/EUC_CONVENTION_PFMP_DonneesV80.gs"
DIPLOME="apps-script/EUC_CONVENTION_PFMP_DiplomeV108.gs"

for f in "$QR_PAGE" "$QR_SERVICE" "$WEBAPP" "$DONNEES" "$DIPLOME"; do
  [ -f "$f" ] && echo "✓ $f" || echo "⚠ ABSENT : $f"
done

echo
echo "============================================================"
echo " 1) RESPONSABLE / TUTEUR — IDS, LABELS, REQUIRED"
echo "============================================================"
grep -nE \
  'responsable(Nom|Prenom|Telephone|Courriel|Fonction)|tuteur(Nom|Prenom|Telephone|Courriel|Fonction)|required|obligatoire|\\*' \
  "$QR_PAGE" | head -n 360 || true

echo
echo "=== BACKEND : VALIDATIONS RESPONSABLE / TUTEUR ==="
python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")
a=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
if a < 0:
    raise SystemExit("ERREUR : fonction enregistrerEntrepriseV117 introuvable.")
b=s.find("\nfunction ",a+10)
if b < 0:b=len(s)
print(s[a:b])
PY

echo
echo "============================================================"
echo " 2) QR — ROUTE INITIALE AVANT SAISIE DATE DE NAISSANCE"
echo "============================================================"
nl -ba "$WEBAPP" | sed -n '1,180p'

echo
echo "=== APPELS SERVEUR / GRIST EXECUTES AVANT RENDU QR ==="
grep -RniE \
  "function EUC_PFMP_afficher|page=pfmp|PFMP_Acces_QR_V116|createTemplateFromFile\\('PFMP_Acces_QR_V116'|EUC_CONVENTION_resoudre|lireAcces|lireRecordDirect|EUC_ENT_grist|EUC_IMPORT_lireRecords_|CacheService|PropertiesService|Utilities\\.sleep|UrlFetchApp" \
  apps-script/EUC_PFMP_WebApp.gs \
  apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs \
  apps-script/*.gs 2>/dev/null | head -n 420 || true

echo
echo "=== TEMPLATE QR : APPELS AU CHARGEMENT ==="
grep -nE \
  "DOMContentLoaded|window\\.onload|google\\.script\\.run|EUC_CONVENTION_|fetch\\(|setTimeout|setInterval" \
  "$QR_PAGE" | head -n 360 || true

echo
echo "============================================================"
echo " 3) DIPLOME CAP — TABLES ET LOGIQUE"
echo "============================================================"
echo "--- résolution V80 actuelle ---"
grep -nE \
  "function EUC_CONVENTION_diplomeV94_|EUC_OFFRES_FORMATION|EUC_DIPLOMES|EUC_CLASSES_DIPLOMES_PFMP|Formation_Pronote|Formation" \
  "$DONNEES" | head -n 240 || true

echo
echo "--- résolution stricte V108 ---"
nl -ba "$DIPLOME" | sed -n '1,120p'

echo
echo "--- outils admin de correspondance diplôme/classe ---"
grep -RniE \
  "EUC_CLASSES_DIPLOMES_PFMP|Diplômes par classe|Intitule_diplome|enregistrerDiplomesParClasse|lireDiplomesParClasse" \
  apps-script --include='*.gs' --include='*.html' | head -n 300 || true

echo
echo "=== TEST SERVEUR A AJOUTER MANUELLEMENT SI BESOIN ==="
cat <<'TXT'
Le diagnostic confirme l'existence de deux niveaux :
- EUC_OFFRES_FORMATION -> EUC_DIPLOMES
- EUC_CLASSES_DIPLOMES_PFMP (correspondance explicite classe -> intitulé imprimé)
Il faut identifier lequel contient actuellement "1CAP2 CARROSSIER AUTOMOBILE".
TXT

echo
echo "============================================================"
echo " 4) SYNTAXE ACTUELLE"
echo "============================================================"
for f in "$QR_SERVICE" "$WEBAPP" "$DONNEES" "$DIPLOME"; do
  cp "$f" "/tmp/$(basename "$f").js"
  if node --check "/tmp/$(basename "$f").js" >/tmp/node.log 2>&1; then
    echo "✓ $f"
  else
    echo "✗ $f"
    cat /tmp/node.log
  fi
done

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
