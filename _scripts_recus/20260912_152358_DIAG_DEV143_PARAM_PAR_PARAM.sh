#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

FILE="apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV143_diag_item_${STAMP}"
mkdir -p "$BACKUP"
cp "$FILE" "$BACKUP/"

cat >> "$FILE" <<'EOF'

function DIAGNOSTIC_DEV143_PARAM_PAR_PARAM(){
  EUC_IMPORT_exigerAdminTexte_();

  var table=EUC_PARAM_CONV_TABLE_;
  var rows=EUC_IMPORT_lireRecords_(table);
  var keys=['NOTIF_BFE_EMAIL','NOTIF_AUTO_ENVOI','NOTIF_OBJET','NOTIF_CORPS','NOTIF_SIGNATURE'];

  console.log('=== DEV.143 — DIAGNOSTIC PARAMETRE PAR PARAMETRE ===');

  keys.forEach(function(k){
    var r=rows.filter(function(x){return String(x.Cle||'')===k;})[0];
    if(!r){
      console.log(k+' : ABSENT');
      return;
    }

    var original=String(r.Valeur==null?'':r.Valeur);
    var test=original;

    if(k==='NOTIF_OBJET') test='[DIAG] '+original;
    else if(k==='NOTIF_BFE_EMAIL') test=original;
    else if(k==='NOTIF_AUTO_ENVOI') test=original;
    else if(k==='NOTIF_CORPS') test=original+'\\n';
    else if(k==='NOTIF_SIGNATURE') test=original+'\\n';

    try{
      EUC_ENT_grist('patch','/tables/'+encodeURIComponent(table)+'/records',{
        records:[{id:r.id,fields:{Valeur:test,Actif:true}}]
      });
      console.log(k+' : PATCH OK');

      EUC_ENT_grist('patch','/tables/'+encodeURIComponent(table)+'/records',{
        records:[{id:r.id,fields:{Valeur:original,Actif:true}}]
      });
      console.log(k+' : RESTAURATION OK');
    }catch(e){
      console.log(k+' : ECHEC');
      console.log(String(e&&e.stack?e.stack:(e&&e.message?e.message:e)));
      throw e;
    }
  });

  console.log('=== TOUS LES PARAMETRES TESTES ===');
  return {ok:true};
}
EOF

cp "$FILE" /tmp/EUC_NOTIF_V143_DIAG_ITEM.js
node --check /tmp/EUC_NOTIF_V143_DIAG_ITEM.js

clasp push -f

echo "============================================================"
echo " DIAGNOSTIC PAR PARAMETRE AJOUTE"
echo "============================================================"
echo "Dans Apps Script, exécuter :"
echo "DIAGNOSTIC_DEV143_PARAM_PAR_PARAM"
echo
echo "Chaque paramètre est testé séparément puis restauré."
echo "Aucun mail envoyé."
echo "============================================================"
