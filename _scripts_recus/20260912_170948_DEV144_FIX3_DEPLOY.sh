#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.144-fix3"

FILE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV144_avant_FIX3_${STAMP}"
mkdir -p "$BACKUP"
cp "$FILE" "$BACKUP/"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs")
s=p.read_text(encoding="utf-8")

anchor="function EUC_ADMIN_WORKFLOW_historiqueV144_(a){"

helper=r"""
function EUC_ADMIN_WORKFLOW_dateLisibleV144_(v){
  if(v===null||v===undefined||v==='')return '';

  var d=null;

  if(typeof v==='number'){
    d=new Date(v*1000);
  }else{
    var txt=String(v).trim();

    if(/^\d+(?:\.\d+)?$/.test(txt)){
      d=new Date(Number(txt)*1000);
    }else{
      d=new Date(txt);
    }
  }

  if(!d||isNaN(d.getTime()))return String(v);

  return Utilities.formatDate(
    d,
    Session.getScriptTimeZone()||'Europe/Paris',
    'dd/MM/yyyy HH:mm'
  );
}

"""

if "function EUC_ADMIN_WORKFLOW_dateLisibleV144_" not in s:
    if anchor not in s:
        raise SystemExit("ERREUR : point d'insertion introuvable.")
    s=s.replace(anchor,helper+anchor,1)

old="""    console.log(
      (e.validee?'✓ ':'○ ')+e.label+
      (e.date?' | '+e.date:'')+
      (e.auteur?' | '+e.auteur:'')
    );"""

new="""    console.log(
      (e.validee?'✓ ':'○ ')+e.label+
      (e.date?' | '+EUC_ADMIN_WORKFLOW_dateLisibleV144_(e.date):'')+
      (e.auteur?' | '+e.auteur:'')
    );"""

if old not in s:
    raise SystemExit("ERREUR : bloc diagnostic introuvable.")
s=s.replace(old,new,1)

# entête propre
lines=s.splitlines()
for i,line in enumerate(lines[:8]):
    if "Eucalyptus PFMP" in line:
        lines[i]=" * Eucalyptus PFMP — v1.0.0-dev.144-fix3"
        break
s="\n".join(lines)+"\n"

p.write_text(s,encoding="utf-8")
print("FIX3 appliqué : affichage des DateTime au format français.")
PY

echo "=== CONTROLES DEV.144 FIX3 ==="
cp "$FILE" /tmp/EUC_ADMIN_WORKFLOW_V144_FIX3.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V144_FIX3.js
grep -q "EUC_ADMIN_WORKFLOW_dateLisibleV144_" "$FILE"

echo "OK : syntaxe valide."
echo "OK : formatage des dates présent."

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
echo "============================================================"
echo " DEV.144 FIX3 DEPLOYEE"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ dates affichées en jj/mm/aaaa hh:mm"
echo "✓ push + version + déploiement principal effectués"
echo "✓ aucune donnée métier modifiée"
echo "✓ aucun courriel envoyé"
echo
echo "Relancer ensuite :"
echo "DIAGNOSTIC_DEV144_PFMP_000223"
echo "============================================================"
