#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

echo "============================================================"
echo " DIAGNOSTIC DEV.161 — ENT / CONVENTION / MONACO"
echo "============================================================"
echo

echo "=== 1) ROUTES ENT / SUIVI ==="
grep -nE "suivi-pfmp-classes|suivi-pfmp-classe|mode=ent|mode.*ent" apps-script/EDT.js apps-script/EUC_SUIVI_PFMP_*.gs apps-script/Suivi_PFMP_*.html 2>/dev/null | head -n 240

echo
echo "=== 2) CONTROLES ADMIN DANS LES RENDERERS SUIVI ==="
grep -RniE "EUC_ADMIN_WORKFLOW_ctxV144_|EUC_PFMP_contexteAdmin_|Accès administrateur requis|controlerAccesUtilisateur" \
  apps-script/EUC_SUIVI_PFMP_*.gs apps-script/EUC_PFMP_International_StatusV161*.gs 2>/dev/null | head -n 240

echo
echo "=== 3) TEMPLATE REEL DE CONVENTION : OCCURRENCES SIRET / NIS ==="
grep -RniE "N.?°?.?SIRET|Numéro SIRET|SIRET / NIS|NIS \\(Monaco\\)|SIRET" \
  apps-script/Convention_PFMP_*.html apps-script/EUC_CONVENTION_PFMP_*.gs 2>/dev/null | head -n 260

echo
echo "=== 4) QR PUBLIC : ROUTE / TEMPLATE REEL ==="
grep -RniE "PFMP_Acces_QR_V116|PFMP_Acces_QR|createTemplateFromFile.*QR|resume|qr" \
  apps-script/EUC_PFMP_WebApp.gs apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs apps-script/EDT.js 2>/dev/null | head -n 220

echo
echo "=== 5) QR PUBLIC : LOGIQUE SIRET / NIS / MONACO ==="
grep -RniE "EUC_V161_MONACO_UI|rechercherEntrepriseMonaco|Monaco|NIS|SIRET|entreprise inconnue|complétez" \
  apps-script/PFMP_Acces_QR_V116.html apps-script/PFMP_Acces_QR.html apps-script/EUC_PFMP_International_StatusV161*.gs 2>/dev/null | head -n 320

echo
echo "=== 6) ENTREPRISES : COLONNES / CHAMPS UTILISES ==="
grep -RniE "Pays|NIS|RCI|Statut_validation|Source_creation|Entreprises" \
  apps-script/EUC_PFMP_International_StatusV161*.gs apps-script/EUC_ENT_*.gs 2>/dev/null | head -n 260

echo
echo "=== 7) SAUVEGARDE QR : FONCTIONS APPELEES ==="
grep -nE "google.script.run|withSuccessHandler|withFailureHandler|save|enregistr|SIRET|Entreprise" \
  apps-script/PFMP_Acces_QR_V116.html | head -n 320

echo
echo "=== 8) VERSION / DEPLOIEMENT PRINCIPAL ==="
clasp deployments | head -n 35 || true

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
