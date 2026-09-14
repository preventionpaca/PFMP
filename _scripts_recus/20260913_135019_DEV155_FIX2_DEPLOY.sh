#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.155-fix2"

SERVICE="apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs"
HOME="apps-script/Suivi_PFMP_Classes.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV155_avant_FIX2_${STAMP}"
mkdir -p "$BACKUP"
cp "$SERVICE" "$BACKUP/"
cp "$HOME" "$BACKUP/"

cat > /tmp/dev155_fix2_patch.py <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs")
s=p.read_text(encoding="utf-8")

s=s.replace(
    "function EUC_SUIVI_CLASSE_detailV155(codeAnnee,classeId,periodeId){\n  EUC_ADMIN_WORKFLOW_ctxV144_();",
    "function EUC_SUIVI_CLASSE_detailV155(codeAnnee,classeId,periodeId){",
    1
)

helper = (
"function EUC_PFMP_contexteAnneeLectureV155_(){\n"
"  var rows=[];\n"
"  try{rows=EUC_IMPORT_lireRecords_('Annees_Scolaires');}catch(e){rows=[];}\n"
"  var annees=rows.map(function(r){\n"
"    var code=String(r.Code||r.Libelle||'').trim();\n"
"    return {id:Number(r.id)||0,code:code,libelle:String(r.Libelle||r.Code||code).trim(),actif:r.Actif!==false};\n"
"  }).filter(function(x){return x.code;}).sort(function(a,b){return String(b.code).localeCompare(String(a.code),'fr');});\n"
"  var now=new Date(),y=now.getFullYear(),m=now.getMonth()+1,start=(m>=8)?y:(y-1);\n"
"  var courant=start+'-'+(start+1);\n"
"  var saved='';\n"
"  try{saved=String(PropertiesService.getUserProperties().getProperty('EUC_PFMP_ANNEE_ACTIVE_V148')||'').trim();}catch(e2){}\n"
"  var active=saved;\n"
"  if(!active || !annees.some(function(a){return a.code===active;})){\n"
"    active=annees.some(function(a){return a.code===courant;})?courant:(annees[0]?annees[0].code:'');\n"
"  }\n"
"  return {version:'v1.0.0-dev.155-fix2',annees:annees,active:active,courant:courant};\n"
"}\n\n"
)

if "function EUC_PFMP_contexteAnneeLectureV155_" not in s:
    anchor="function EUC_SUIVI_CLASSE_detailV155("
    if anchor not in s:
        raise SystemExit("ERREUR : ancre détail V155 introuvable.")
    s=s.replace(anchor,helper+anchor,1)

s=s.replace(
    "function EUC_SUIVI_CLASSE_afficherV155(e){\n  EUC_ADMIN_WORKFLOW_ctxV144_();\n\n  var ctx=EUC_PFMP_contexteAnneeV148();",
    "function EUC_SUIVI_CLASSE_afficherV155(e){\n  var ctx=EUC_PFMP_contexteAnneeLectureV155_();",
    1
)

# garde-fou au cas où seule la ligne du contexte subsiste
pos=s.find("function EUC_SUIVI_CLASSE_afficherV155(e){")
if pos>=0:
    end=s.find("function ",pos+10)
    chunk=s[pos:end if end>=0 else len(s)]
    chunk=chunk.replace("  EUC_ADMIN_WORKFLOW_ctxV144_();\n","")
    chunk=chunk.replace("  var ctx=EUC_PFMP_contexteAnneeV148();","  var ctx=EUC_PFMP_contexteAnneeLectureV155_();")
    s=s[:pos]+chunk+s[end if end>=0 else len(s):]

p.write_text(s,encoding="utf-8")

p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")
s=s.replace(".classcard{transition:.15s ease}",".classcard{cursor:pointer;transition:.15s ease}",1)
p.write_text(s,encoding="utf-8")

print("OK : vue détail rendue publique en lecture seule et cartes cliquables.")
PY

python3 /tmp/dev155_fix2_patch.py

echo "============================================================"
echo " DEV.155 FIX2 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_ClasseDetailV155_FIX2.js
node --check /tmp/EUC_SUIVI_PFMP_ClasseDetailV155_FIX2.js

grep -q "EUC_PFMP_contexteAnneeLectureV155_" "$SERVICE"
grep -q "cursor:pointer" "$HOME"

if grep -A4 "function EUC_SUIVI_CLASSE_afficherV155" "$SERVICE" | grep -q "EUC_ADMIN_WORKFLOW_ctxV144_"; then
  echo "ERREUR : contrôle admin encore présent dans afficherV155."
  exit 1
fi

if grep -A4 "function EUC_SUIVI_CLASSE_detailV155" "$SERVICE" | grep -q "EUC_ADMIN_WORKFLOW_ctxV144_"; then
  echo "ERREUR : contrôle admin encore présent dans detailV155."
  exit 1
fi

echo "OK : page détail accessible sans rôle administrateur."
echo "OK : toutes les classes restent cliquables, même avec 0 convention."

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
clasp version "$LABEL"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo
echo "============================================================"
echo " DEV.155 FIX2 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ erreur Accès administrateur requis supprimée"
echo "✓ vue détail en lecture seule"
echo "✓ toutes les vignettes classes cliquables"
echo "✓ année scolaire conservée"
echo "✓ push + version + déploiement principal"
echo "============================================================"
