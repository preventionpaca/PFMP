#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

FILE="apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV143_diag_save_${STAMP}"
mkdir -p "$BACKUP"
cp "$FILE" "$BACKUP/"

cat >> "$FILE" <<'EOF'

function DIAGNOSTIC_DEV143_SAUVEGARDE_COMPLETE(){
  var cfg=EUC_CONVENTION_notificationConfigLireV143();
  var items=(cfg.items||[]).map(function(x){
    return {cle:x.cle,valeur:x.valeur};
  });

  console.log('=== DEV.143 — DIAGNOSTIC SAUVEGARDE COMPLETE ===');
  console.log('Nombre de paramètres : '+items.length);
  console.log('Clés : '+items.map(function(x){return x.cle;}).join(', '));

  try{
    var r=EUC_CONVENTION_notificationConfigEnregistrerV143(items);
    console.log('SAUVEGARDE COMPLETE : OK');
    console.log(JSON.stringify(r));
    return r;
  }catch(e){
    console.log('SAUVEGARDE COMPLETE : ECHEC');
    console.log(String(e&&e.stack?e.stack:(e&&e.message?e.message:e)));
    throw e;
  }
}
EOF

cp "$FILE" /tmp/EUC_NOTIF_V143_DIAG_SAVE.js
node --check /tmp/EUC_NOTIF_V143_DIAG_SAVE.js

clasp push -f

echo "============================================================"
echo " DIAGNOSTIC SAUVEGARDE COMPLETE AJOUTE"
echo "============================================================"
echo "Dans Apps Script, exécuter :"
echo "DIAGNOSTIC_DEV143_SAUVEGARDE_COMPLETE"
echo
echo "Aucun mail envoyé."
echo "Aucune valeur modifiée : les valeurs actuelles sont simplement"
echo "réécrites à l'identique pour tester le vrai chemin de sauvegarde."
echo "============================================================"
