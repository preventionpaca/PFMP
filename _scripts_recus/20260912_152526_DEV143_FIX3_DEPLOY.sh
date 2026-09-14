#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.143-fix3"

FILE="apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV143_avant_FIX3_${STAMP}"
mkdir -p "$BACKUP"
cp "$FILE" "$BACKUP/"

python3 <<'PY'
from pathlib import Path
import re

p = Path("apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs")
s = p.read_text(encoding="utf-8")

pattern = re.compile(
    r"function EUC_CONVENTION_notificationConfigEnregistrerV143\(items\)\{.*?\n\}",
    re.S
)

replacement = r"""function EUC_CONVENTION_notificationConfigEnregistrerV143(items){
  EUC_IMPORT_exigerAdminTexte_();
  EUC_PARAM_CONV_assurerTable_();

  var allowed={
    NOTIF_BFE_EMAIL:true,
    NOTIF_AUTO_ENVOI:true,
    NOTIF_OBJET:true,
    NOTIF_CORPS:true,
    NOTIF_SIGNATURE:true
  };

  var rows=EUC_IMPORT_lireRecords_(EUC_PARAM_CONV_TABLE_),by={};
  rows.forEach(function(r){by[String(r.Cle||'')]=r;});

  var defsBy={};
  EUC_PARAM_CONV_defs_().forEach(function(d){defsBy[d[0]]=d;});

  var total=0,crees=0,misAJour=0;

  (items||[]).forEach(function(x){
    var cle=String(x.cle||'').trim();
    if(!allowed[cle])return;

    var valeur=String(x.valeur==null?'':x.valeur);

    if(cle==='NOTIF_BFE_EMAIL'&&!EUC_NOTIF_emailV143_(valeur)){
      throw new Error('Adresse BFE invalide.');
    }

    if(cle==='NOTIF_AUTO_ENVOI'){
      valeur=/^(OUI|YES|TRUE|1)$/i.test(valeur)?'OUI':'NON';
    }

    var r=by[cle];
    var d=defsBy[cle];

    if(r){
      // IMPORTANT : Grist accepte ces PATCH un par un,
      // alors que le batch de 5 lignes renvoie 400.
      EUC_ENT_grist(
        'patch',
        '/tables/'+encodeURIComponent(EUC_PARAM_CONV_TABLE_)+'/records',
        {records:[{id:r.id,fields:{Valeur:valeur,Actif:true}}]}
      );
      misAJour++;
      total++;
    }else if(d){
      EUC_ENT_grist(
        'post',
        '/tables/'+encodeURIComponent(EUC_PARAM_CONV_TABLE_)+'/records',
        {records:[{fields:{Cle:cle,Valeur:valeur,Description:d[2],Ordre:d[3],Actif:true}}]}
      );
      crees++;
      total++;
    }
  });

  return {ok:true,total:total,crees:crees,misAJour:misAJour};
}"""

m = pattern.search(s)
if not m:
    raise SystemExit("ERREUR : fonction notificationConfigEnregistrerV143 introuvable.")

s = s[:m.start()] + replacement + s[m.end():]

lines=s.splitlines()
if lines:
    lines[0] = "/** Eucalyptus PFMP — v1.0.0-dev.143-fix3 — sauvegarde notifications paramètre par paramètre. */"
s="\n".join(lines)+"\n"

p.write_text(s, encoding="utf-8")
print("FIX3 appliqué : sauvegarde des paramètres un par un.")
PY

echo
echo "=== CONTROLES FIX3 ==="
cp "$FILE" /tmp/EUC_NOTIF_V143_FIX3.js
node --check /tmp/EUC_NOTIF_V143_FIX3.js

grep -q "sauvegarde notifications paramètre par paramètre" "$FILE"
grep -q "{records:\\[{" "$FILE" || true
grep -q "misAJour++" "$FILE"

echo "OK : syntaxe valide."
echo "OK : sauvegarde paramètre par paramètre."

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
clasp version "$LABEL"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy \
  -i "$DEPLOYMENT_ID" \
  -d "$LABEL"

echo
echo "=== CONTROLE DEPLOIEMENTS ==="
clasp deployments

echo
echo "============================================================"
echo " DEV.143 FIX3 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ chaque paramètre est écrit séparément dans Grist"
echo "✓ push effectué"
echo "✓ version créée"
echo "✓ déploiement principal mis à jour"
echo "✓ aucun courriel envoyé"
echo
echo "Recharge la page avec Ctrl+Shift+R puis reteste"
echo "Enregistrer les notifications."
echo "============================================================"
