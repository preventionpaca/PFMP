#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.154-fix1"
SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
PAGE="apps-script/Admin_Conventions_PFMP.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV154_avant_FIX1_${STAMP}"
mkdir -p "$BACKUP"
cp "$SERVICE" "$BACKUP/"
cp "$PAGE" "$BACKUP/"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs")
s=p.read_text(encoding="utf-8")

helper = """
function EUC_ADMIN_WORKFLOW_etatsTraceV154_(a){
  var historique=String(a.Historique_admin_JSON||'');
  return {
    supprimee:a.Supprimee_admin===true || String(a.Statut_administratif||'')==='SUPPRIMEE_ADMIN',
    corrigee:historique.indexOf('CORRECTION_ADMINISTRATIVE')>=0
  };
}

"""
anchor="function EUC_ADMIN_WORKFLOW_listerDossiersParAnneeV148(codeAnnee){"
if "function EUC_ADMIN_WORKFLOW_etatsTraceV154_" not in s:
    if anchor not in s:
        raise SystemExit("ERREUR : fonction V148 introuvable.")
    s=s.replace(anchor,helper+anchor,1)

# En administration, les conventions supprimées restent recherchables.
s=s.replace("      if(a.Supprimee_admin===true)return false;\n","",1)

needle="      var anneeDossier=EUC_PFMP_anneeDossierV148_(a);\n\n      return {\n        id:Number(a.id),"
replacement="      var anneeDossier=EUC_PFMP_anneeDossierV148_(a);\n      var trace=EUC_ADMIN_WORKFLOW_etatsTraceV154_(a);\n\n      return {\n        supprimeeAdmin:trace.supprimee,\n        corrigeeAdmin:trace.corrigee,\n        id:Number(a.id),"
if needle in s:
    s=s.replace(needle,replacement,1)
elif "corrigeeAdmin:trace.corrigee" not in s:
    raise SystemExit("ERREUR : mapping V148 introuvable.")

needle2="  base.supprimeeAdmin=a.Supprimee_admin===true;\n"
replacement2="  base.supprimeeAdmin=(a.Supprimee_admin===true || String(a.Statut_administratif||'')==='SUPPRIMEE_ADMIN');\n  base.corrigeeAdmin=String(a.Historique_admin_JSON||'').indexOf('CORRECTION_ADMINISTRATIVE')>=0;\n"
if needle2 in s:
    s=s.replace(needle2,replacement2,1)
elif "base.corrigeeAdmin=" not in s:
    raise SystemExit("ERREUR : vue détaillée V146 introuvable.")

p.write_text(s,encoding="utf-8")
print("OK : états correction/suppression exposés côté serveur.")
PY

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Admin_Conventions_PFMP.html")
s=p.read_text(encoding="utf-8")

if ".suggestion.corrigee" not in s:
    css=(
        "    .suggestion.corrigee{background:#fff7ed;border-left:5px solid #f59e0b}\\n"
        "    .suggestion.corrigee b,.suggestion.corrigee small{color:#b45309}\\n"
        "    .suggestion.supprimee{background:#fff1f2;border-left:5px solid #dc2626}\\n"
        "    .suggestion.supprimee b,.suggestion.supprimee small{color:#b91c1c;font-weight:800}\\n"
        "    .title-corrigee{color:#b45309!important;background:#fff7ed;border:1px solid #f59e0b;border-radius:10px;padding:10px}\\n"
        "    .title-supprimee{color:#b91c1c!important;background:#fff1f2;border:2px solid #dc2626;border-radius:10px;padding:10px}\\n"
        "    .history-item.correction{color:#b45309!important;font-weight:800;background:#fff7ed!important;border-left:5px solid #f59e0b;padding:9px 10px!important;border-radius:8px}\\n"
        "    .history-item.suppression{color:#b91c1c!important;font-weight:900;background:#fff1f2!important;border:2px solid #dc2626;padding:9px 10px!important;border-radius:8px}\\n"
    )
    marker="    @media(max-width:850px){"
    if marker not in s:
        raise SystemExit("ERREUR : ancre CSS introuvable.")
    s=s.replace(marker,css+marker,1)

old_suggest = """    suggestions.innerHTML=found.length?found.map(function(d){
      return '<div class="suggestion" data-id="'+d.id+'"><b>'+esc(d.numero)+' — '+esc(d.jeune||'Jeune non renseigné')+'</b><small>'+esc([d.classe,d.entreprise].filter(Boolean).join(' — '))+'</small></div>';
    }).join(''):'<div class="suggestion">Aucun dossier trouvé</div>';"""

new_suggest = """    suggestions.innerHTML=found.length?found.map(function(d){
      const etatClass=d.supprimeeAdmin?' supprimee':(d.corrigeeAdmin?' corrigee':'');
      const etatLabel=d.supprimeeAdmin?'SUPPRIMÉE — ':(d.corrigeeAdmin?'CORRIGÉE — ':'');
      return '<div class="suggestion'+etatClass+'" data-id="'+d.id+'"><b>'+etatLabel+esc(d.numero)+' — '+esc(d.jeune||'Jeune non renseigné')+'</b><small>'+esc([d.classe,d.entreprise].filter(Boolean).join(' — '))+'</small></div>';
    }).join(''):'<div class="suggestion">Aucun dossier trouvé</div>';"""

if old_suggest in s:
    s=s.replace(old_suggest,new_suggest,1)
elif "const etatClass=d.supprimeeAdmin" not in s:
    raise SystemExit("ERREUR : rendu suggestions introuvable.")

old_title = """    title.textContent=[
      v.numero||('Dossier '+v.id),
      detailYoung!=='—'?detailYoung:'',
      detailClass!=='—'?detailClass:'',
      v.statut||''
    ].filter(Boolean).join(' — ');"""

new_title = """    const baseTitle=[
      v.numero||('Dossier '+v.id),
      detailYoung!=='—'?detailYoung:'',
      detailClass!=='—'?detailClass:'',
      v.statut||''
    ].filter(Boolean).join(' — ');

    title.classList.remove('title-corrigee','title-supprimee');

    if(v.supprimeeAdmin){
      title.textContent='CONVENTION SUPPRIMÉE — '+baseTitle;
      title.classList.add('title-supprimee');
    }else if(v.corrigeeAdmin){
      title.textContent='CONVENTION CORRIGÉE — '+baseTitle;
      title.classList.add('title-corrigee');
    }else{
      title.textContent=baseTitle;
    }"""

if old_title in s:
    s=s.replace(old_title,new_title,1)
elif "title.classList.remove('title-corrigee','title-supprimee')" not in s:
    raise SystemExit("ERREUR : rendu titre introuvable.")

pattern=re.compile(
    r"    const h=v\.historique\|\|\[\];\s*history\.innerHTML=h\.length\?h\.slice\(\)\.reverse\(\)\.map\(function\(x\)\{.*?\}\)\.join\(''\):'Aucun historique administratif complémentaire\.';",
    re.S
)

replacement = """    const h=v.historique||[];
    history.innerHTML=h.length?h.slice().reverse().map(function(x){
      const action=String(x.action||x.libelle||x.statut||'Action');
      const upper=action.toUpperCase();
      const isSupp=upper.indexOf('SUPPRESSION')>=0 || upper.indexOf('SUPPRIM')>=0;
      const isCorr=upper.indexOf('CORRECTION')>=0;
      const clsHist=isSupp?' suppression':(isCorr?' correction':'');
      const prefix=isSupp?'CONVENTION SUPPRIMÉE — ':(isCorr?'CORRECTION APPORTÉE — ':'');
      return '<div class="history-item'+clsHist+'">'+esc(
        prefix+(x.date||'')+' — '+action+
        (x.auteur?' — '+x.auteur:'')+
        (x.motif?' — '+x.motif:'')+
        (x.commentaire?' — '+x.commentaire:'')
      )+'</div>';
    }).join(''):'Aucun historique administratif complémentaire.';"""

m=pattern.search(s)
if m:
    s=s[:m.start()]+replacement+s[m.end():]
elif "const clsHist=isSupp" not in s:
    raise SystemExit("ERREUR : rendu historique introuvable.")

p.write_text(s,encoding="utf-8")
print("OK : orange correction / rouge suppression appliqués partout.")
PY

echo "=== CONTROLES DEV.154 FIX1 ==="
cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_V154_FIX1.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V154_FIX1.js

grep -q "corrigeeAdmin" "$SERVICE"
grep -q "supprimeeAdmin" "$SERVICE"
grep -q "suggestion.corrigee" "$PAGE"
grep -q "suggestion.supprimee" "$PAGE"
grep -q "CONVENTION CORRIGÉE" "$PAGE"
grep -q "CONVENTION SUPPRIMÉE" "$PAGE"
grep -q "CORRECTION APPORTÉE" "$PAGE"

python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/Admin_Conventions_PFMP.html").read_text(encoding="utf-8")
scripts=re.findall(r"<script>(.*?)</script>",s,re.S)
js="\n".join(scripts)
js=re.sub(r"<\?!=.*?\?>","{}",js)
Path("/tmp/Admin_Conventions_PFMP_DEV154_FIX1.js").write_text(js,encoding="utf-8")
PY

node --check /tmp/Admin_Conventions_PFMP_DEV154_FIX1.js

echo "=== PUSH ==="
clasp push -f

echo "=== VERSION ==="
clasp version "$LABEL"

echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.154 FIX1 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ CORRECTION = ORANGE partout"
echo "✓ SUPPRESSION = ROUGE partout"
echo "✓ historique"
echo "✓ titre du dossier"
echo "✓ liste/autocomplétion des dossiers"
echo "✓ conventions supprimées restent consultables en administration"
echo "============================================================"
