#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.144-fix1"

FILE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV144_avant_FIX1_${STAMP}"
mkdir -p "$BACKUP"
cp "$FILE" "$BACKUP/"

python3 <<'PY'
from pathlib import Path

p = Path("apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs")
s = p.read_text(encoding="utf-8")

anchor = "function EUC_ADMIN_WORKFLOW_historiqueV144_(a){"
helper = r"""
function EUC_ADMIN_WORKFLOW_numeroV144_(a){
  var n=String(a.Numero_enregistrement||'').trim();
  if(n)return n;

  var annee=String(a.Annee_scolaire||'').trim();
  var y=(annee.match(/20\d{2}/)||['PFMP'])[0];

  return 'PFMP-'+y+'-'+String(Number(a.id||0)).padStart(6,'0');
}

function EUC_ADMIN_WORKFLOW_dateEnregistrementV144_(a){
  return a.Date_enregistrement || a.Date_saisie_entreprise || '';
}

"""
if "function EUC_ADMIN_WORKFLOW_numeroV144_" not in s:
    if anchor not in s:
        raise SystemExit("ERREUR : point d'insertion helper introuvable.")
    s = s.replace(anchor, helper + anchor, 1)

s = s.replace(
    "numero:a.Numero_enregistrement||'',",
    "numero:EUC_ADMIN_WORKFLOW_numeroV144_(a),",
    1
)

old = """      return {
        code:k,
        label:d.label,
        date:a[d.date]||'',
        auteur:a[d.auteur]||'',
        validee:!!a[d.date]
      };"""

new = """      var dateValeur=a[d.date]||'';
      if(k==='INFORMATIONS_ENREGISTREES'&&!dateValeur){
        dateValeur=EUC_ADMIN_WORKFLOW_dateEnregistrementV144_(a);
      }
      return {
        code:k,
        label:d.label,
        date:dateValeur,
        auteur:a[d.auteur]||'',
        validee:!!dateValeur
      };"""

if old in s:
    s = s.replace(old,new,1)

if "function MIGRER_DEV144_DOSSIERS_EXISTANTS()" not in s:
    s += r"""

function MIGRER_DEV144_DOSSIERS_EXISTANTS(){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();
  var rows=EUC_CONVENTION_lireAccesFraisV108_();

  var nb=0,ignores=0,erreurs=[];

  rows.forEach(function(a){
    var aDesInfosEntreprise=!!(
      a.Date_saisie_entreprise ||
      a.Entreprise_raison_sociale ||
      a.Statut==='ENTREPRISE_SAISIE'
    );

    if(!aDesInfosEntreprise){
      ignores++;
      return;
    }

    var fields={};
    var change=false;

    if(!String(a.Numero_enregistrement||'').trim()){
      fields.Numero_enregistrement=EUC_ADMIN_WORKFLOW_numeroV144_(a);
      change=true;
    }

    if(!a.Date_enregistrement && a.Date_saisie_entreprise){
      fields.Date_enregistrement=a.Date_saisie_entreprise;
      change=true;
    }

    if(!String(a.Statut_administratif||'').trim()){
      fields.Statut_administratif='INFORMATIONS_ENREGISTREES';
      change=true;
    }

    if(!change){
      ignores++;
      return;
    }

    try{
      EUC_ENT_grist(
        'patch',
        '/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',
        {records:[{id:Number(a.id),fields:fields}]}
      );
      nb++;
    }catch(e){
      erreurs.push({
        id:a.id,
        erreur:String(e&&e.message?e.message:e)
      });
    }
  });

  console.log('=== DEV.144 FIX1 — MIGRATION DOSSIERS EXISTANTS ===');
  console.log('Mis à jour : '+nb);
  console.log('Ignorés : '+ignores);
  console.log('Erreurs : '+erreurs.length);
  erreurs.forEach(function(x){
    console.log('ID '+x.id+' : '+x.erreur);
  });

  return {
    ok:erreurs.length===0,
    auteur:ctx.email||'',
    misAJour:nb,
    ignores:ignores,
    erreurs:erreurs
  };
}
"""

lines=s.splitlines()
if lines:
    lines[0] = "/** Eucalyptus PFMP — v1.0.0-dev.144-fix1 — backfill numéro/date/statut des dossiers existants. */"
s="\n".join(lines)+"\n"

p.write_text(s,encoding="utf-8")
print("DEV.144 FIX1 appliqué.")
PY

echo "============================================================"
echo " DEV.144 FIX1 — CONTROLES"
echo "============================================================"

cp "$FILE" /tmp/EUC_ADMIN_WORKFLOW_V144_FIX1.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V144_FIX1.js

grep -q "MIGRER_DEV144_DOSSIERS_EXISTANTS" "$FILE"
grep -q "EUC_ADMIN_WORKFLOW_numeroV144_" "$FILE"
grep -q "EUC_ADMIN_WORKFLOW_dateEnregistrementV144_" "$FILE"

echo "OK : syntaxe valide."
echo "OK : migration dossiers existants présente."

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
echo " DEV.144 FIX1 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ push effectué"
echo "✓ version créée"
echo "✓ déploiement principal mis à jour"
echo "✓ aucun courriel envoyé"
echo
echo "Dans Apps Script, exécuter ensuite :"
echo "1. MIGRER_DEV144_DOSSIERS_EXISTANTS"
echo "2. DIAGNOSTIC_DEV144_PFMP_000223"
echo "============================================================"
