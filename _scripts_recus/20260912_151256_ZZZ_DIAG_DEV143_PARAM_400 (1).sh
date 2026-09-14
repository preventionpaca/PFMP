#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

echo "============================================================"
echo " DIAGNOSTIC DEV.143 — PARAMETRES / ERREUR GRIST 400"
echo "============================================================"
echo

echo "=== REFERENCES AUX TABLES / PARAMETRES ==="
grep -RInE \
"EUC_PARAMETRES_CONVENTION_PFMP|EUC_PARAM_CONVENTION_PFMP|NOTIF_BFE_EMAIL|NOTIF_OBJET|NOTIF_CORPS|NOTIF_SIGNATURE|Cle|Valeur|Description|Ordre|Actif" \
apps-script/*.gs apps-script/*.html 2>/dev/null \
| head -n 300

echo
echo "=== FONCTION D'ECRITURE DEV.143 ==="
grep -nA110 -B10 \
"function EUC_CONVENTION_notificationConfigEnregistrerV143" \
apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs 2>/dev/null || true

echo
echo "=== FICHIER PARAMETRAGE EXISTANT ==="
grep -nA220 -B20 \
"EUC_PARAM" \
apps-script/EUC_PARAM_CONVENTION_PFMP.gs 2>/dev/null || true

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN COURRIEL"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
