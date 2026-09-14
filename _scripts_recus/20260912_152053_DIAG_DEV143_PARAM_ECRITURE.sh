#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV143_avant_DIAG_ECRITURE_${STAMP}"
mkdir -p "$BACKUP"

FILE="apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs"
cp "$FILE" "$BACKUP/"

cat >> "$FILE" <<'EOF'

function DIAGNOSTIC_DEV143_PARAM_GRIST_400(){
  EUC_IMPORT_exigerAdminTexte_();

  var table=EUC_PARAM_CONV_TABLE_;
  var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[];
  var rows=EUC_IMPORT_lireRecords_(table);

  console.log('=== DEV.143 — DIAGNOSTIC GRIST 400 ===');
  console.log('Table : '+table);
  console.log('Colonnes : '+cols.map(function(c){return c.id+' ['+((c.fields||{}).type||'')+']';}).join(', '));

  var keys=['NOTIF_BFE_EMAIL','NOTIF_AUTO_ENVOI','NOTIF_OBJET','NOTIF_CORPS','NOTIF_SIGNATURE'];
  keys.forEach(function(k){
    var r=rows.filter(function(x){return String(x.Cle||'')===k;})[0];
    console.log(k+' : '+(r?('id='+r.id+' / Valeur='+String(r.Valeur||'').slice(0,120)):'ABSENT'));
  });

  var cible=rows.filter(function(x){return String(x.Cle||'')==='NOTIF_OBJET';})[0];
  if(!cible){
    console.log('NOTIF_OBJET absent : diagnostic arrêté avant écriture.');
    return {ok:false,raison:'NOTIF_OBJET_ABSENT'};
  }

  var original=String(cible.Valeur||'');
  var test='[DIAG TEMPORAIRE] '+original;

  console.log('Tentative PATCH minimale sur id='+cible.id);

  try{
    EUC_ENT_grist('patch','/tables/'+encodeURIComponent(table)+'/records',{
      records:[{id:cible.id,fields:{Valeur:test}}]
    });
    console.log('PATCH MINIMAL : OK');

    // restauration immédiate
    EUC_ENT_grist('patch','/tables/'+encodeURIComponent(table)+'/records',{
      records:[{id:cible.id,fields:{Valeur:original}}]
    });
    console.log('RESTAURATION : OK');
    return {ok:true,patchMinimal:true,restaure:true};
  }catch(e){
    console.log('PATCH MINIMAL : ECHEC');
    console.log('ERREUR EXACTE : '+String(e&&e.stack?e.stack:(e&&e.message?e.message:e)));
    throw e;
  }
}
EOF

cp "$FILE" /tmp/EUC_NOTIF_V143_DIAG400.js
node --check /tmp/EUC_NOTIF_V143_DIAG400.js

echo "=== PUSH ==="
clasp push -f

echo "============================================================"
echo " DIAGNOSTIC AJOUTE ET POUSSE"
echo "============================================================"
echo "Aucun déploiement public nécessaire pour exécuter la fonction"
echo "depuis l'éditeur Apps Script."
echo
echo "Exécuter dans Apps Script :"
echo "DIAGNOSTIC_DEV143_PARAM_GRIST_400"
echo
echo "Le diagnostic fait un PATCH temporaire sur NOTIF_OBJET puis"
echo "restaure immédiatement la valeur d'origine si le PATCH passe."
echo "============================================================"
