#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.143-fix2"

echo "============================================================"
echo " PFMP — DEPLOIEMENT DEV.143 FIX2"
echo "============================================================"
echo "Projet      : $PWD"
echo "Déploiement : $DEPLOYMENT_ID"
echo "Libellé     : $LABEL"
echo "============================================================"

echo
echo "=== VERIFICATIONS LOCALES ==="
grep -q "EUC_PARAM_CONV_enregistrer(nettoyes)" apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs
grep -q "NOTIF_BFE_EMAIL" apps-script/EUC_PARAM_CONVENTION_PFMP.gs
grep -q "NOTIF_SIGNATURE" apps-script/EUC_PARAM_CONVENTION_PFMP.gs
echo "OK : FIX2 présente localement."

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== CREATION VERSION ==="
clasp version "$LABEL"

echo
echo "=== MISE A JOUR DU DEPLOIEMENT PRINCIPAL ==="
clasp deploy \
  -i "$DEPLOYMENT_ID" \
  -d "$LABEL"

echo
echo "=== CONTROLE ==="
clasp deployments

echo
echo "============================================================"
echo " DEV.143 FIX2 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Recharge ensuite la page avec Ctrl+Shift+R."
echo "Puis reteste le bouton Enregistrer les notifications."
echo "============================================================"
