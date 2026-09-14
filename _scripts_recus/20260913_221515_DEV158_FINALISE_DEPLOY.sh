#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.158"

echo "============================================================"
echo " DEV.158 — FINALISATION VERSION + DEPLOIEMENT"
echo "============================================================"

echo
echo "=== CONTROLE RAPIDE HEAD LOCAL ==="
grep -q "EUC_DESTINATAIRES_ENVOIS_PFMP" apps-script/EUC_SUIVI_PFMP_DestinatairesV158.gs
grep -q "EUC_V158_ccMails_" apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs
grep -q "destinataires-envois-pfmp" apps-script/EDT.js
grep -q "destV158Tile" apps-script/Admin_PFMP.html

echo "OK : DEV.158 présente localement."

echo
echo "=== VERSION ==="
VERSION_OUTPUT="$(clasp version "$LABEL")"
echo "$VERSION_OUTPUT"

VERSION_NUMBER="$(printf '%s\n' "$VERSION_OUTPUT" | sed -n 's/.*Created version \([0-9][0-9]*\).*/\1/p' | tail -n1)"

if [ -z "$VERSION_NUMBER" ]; then
  echo "ERREUR : impossible de récupérer le numéro de version créé."
  exit 1
fi

echo
echo "Version créée : $VERSION_NUMBER"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
DEPLOY_OUTPUT="$(clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL")"
echo "$DEPLOY_OUTPUT"

if ! printf '%s\n' "$DEPLOY_OUTPUT" | grep -q "$DEPLOYMENT_ID"; then
  echo "ERREUR : le déploiement principal n'a pas été confirmé."
  exit 1
fi

echo
echo "=== VERIFICATION DES DEPLOIEMENTS ==="
clasp deployments | grep -F "$DEPLOYMENT_ID"

echo
echo "============================================================"
echo " DEV.158 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ aucun nouveau push"
echo "✓ nouvelle version créée : $VERSION_NUMBER"
echo "✓ déploiement principal mis à jour"
echo "============================================================"
