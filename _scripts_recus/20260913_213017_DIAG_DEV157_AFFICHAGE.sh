#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

echo "============================================================"
echo " DIAGNOSTIC DEV.157 — POURQUOI LES BOUTONS N'APPARAISSENT PAS"
echo "============================================================"
echo

echo "=== ROUTE suivi-pfmp-classe ==="
grep -nE "suivi-pfmp-classe|parametres-envois-pfmp" apps-script/EDT.js || true

echo
echo "=== FONCTIONS D'AFFICHAGE SUIVI CLASSE ==="
grep -RniE "function[[:space:]]+EUC_SUIVI_CLASSE_afficherV(155|156)|createTemplateFromFile|Suivi_PFMP_Classe_Detail" apps-script \
  --include='*.gs' --include='*.js' | head -n 200

echo
echo "=== PRESENCE DES BOUTONS DANS LE TEMPLATE LOCAL ==="
grep -nE "Envoyer le tableau par email|Paramètres des envois|sendTable|mailParams|mailModal" \
  apps-script/Suivi_PFMP_Classe_Detail.html || true

echo
echo "=== AUTRES TEMPLATES DETAIL CLASSE EVENTUELS ==="
find apps-script -maxdepth 1 -type f -iname '*Suivi*Classe*Detail*.html' -o -iname '*Classe*Detail*.html' | sort

echo
echo "=== FONCTIONS V157 ==="
grep -RniE "EUC_V157_afficherParametres|EUC_V157_preparerEnvoi|EUC_V157_envoyerTableau" apps-script \
  --include='*.gs' --include='*.js' | head -n 100

echo
echo "=== VERSION / DEPLOIEMENTS ==="
clasp deployments | head -n 30 || true

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
