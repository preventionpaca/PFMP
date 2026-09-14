#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.151"
SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
PAGE="apps-script/Admin_Conventions_PFMP.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV151_${STAMP}"
mkdir -p "$BACKUP"
cp "$SERVICE" "$BACKUP/"
cp "$PAGE" "$BACKUP/"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs")
s=p.read_text(encoding="utf-8")

corr="function EUC_ADMIN_WORKFLOW_corrigerV149(accesId,changements,motif){"
if corr not in s:
    raise SystemExit("ERREUR : fonction correction V149 absente.")
if corr+"\n  EUC_ADMIN_WORKFLOW_assurerColonnesV149_();" not in s:
    s=s.replace(corr,corr+"\n  EUC_ADMIN_WORKFLOW_assurerColonnesV149_();",1)

dele="function EUC_ADMIN_WORKFLOW_supprimerV149(accesId,motif){"
if dele not in s:
    raise SystemExit("ERREUR : fonction suppression V149 absente.")
if dele+"\n  EUC_ADMIN_WORKFLOW_assurerColonnesV149_();" not in s:
    s=s.replace(dele,dele+"\n  EUC_ADMIN_WORKFLOW_assurerColonnesV149_();",1)

if "function DIAGNOSTIC_DEV151_SCHEMA_SUPPRESSION()" not in s:
    block = (
        "\nfunction DIAGNOSTIC_DEV151_SCHEMA_SUPPRESSION(){\n"
        "  var table=EUC_CONVENTION_ACCES_TABLE_;\n"
        "  var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[];\n"
        "  var ids={}; cols.forEach(function(c){ids[c.id]=true;});\n"
        "  var requis=['Supprimee_admin','Date_suppression_admin','Auteur_suppression_admin','Motif_suppression_admin','Snapshot_suppression_JSON','Derniere_correction_admin','Auteur_derniere_correction_admin'];\n"
        "  console.log('=== DEV.151 — SCHEMA CORRECTION / SUPPRESSION ===');\n"
        "  requis.forEach(function(k){console.log(k+' : '+(ids[k]?'OK':'ABSENT'));});\n"
        "  var missing=requis.filter(function(k){return !ids[k];});\n"
        "  if(missing.length){var created=EUC_ADMIN_WORKFLOW_assurerColonnesV149_();console.log('Colonnes créées : '+created.join(', '));}\n"
        "  else{console.log('Schéma DEV.149 complet.');}\n"
        "  return {ok:true,manquantesAvant:missing};\n"
        "}\n"
    )
    s += block

p.write_text(s,encoding="utf-8")
print("OK : auto-réparation du schéma ajoutée.")
PY

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Admin_Conventions_PFMP.html")
s=p.read_text(encoding="utf-8")

if 'onclick="DEV151_saveCorrection()"' not in s:
    s=s.replace('id="saveCorrectionBtn" class="primary"','id="saveCorrectionBtn" class="primary" onclick="DEV151_saveCorrection()"',1)
if 'onclick="DEV151_deleteConvention()"' not in s:
    s=s.replace('id="deleteConventionBtn" class="danger"','id="deleteConventionBtn" class="danger" onclick="DEV151_deleteConvention()"',1)

anchor="  renderSchoolYears();"
if anchor not in s:
    raise SystemExit("ERREUR : ancre renderSchoolYears introuvable.")

handlers = r'''
  window.DEV151_saveCorrection=async function(){
    if(!current)return;
    const btn=document.getElementById('saveCorrectionBtn');
    const motif=document.getElementById('correctionReason').value.trim();
    if(!motif){setStatus('Motif de correction obligatoire.','err');return}

    const changements={};
    Array.from(document.querySelectorAll('[data-corr]')).forEach(function(el){
      changements[el.dataset.corr]=el.value;
    });

    const ok=await askConfirm(
      'Enregistrer les modifications ?',
      'Les anciennes valeurs et les nouvelles valeurs seront conservées dans l’historique du dossier.',
      'Enregistrer les modifications'
    );
    if(!ok)return;

    const oldText=btn.innerHTML;
    btn.disabled=true;
    btn.classList.add('busy');
    btn.innerHTML='<span class="spinner"></span>Modification en cours';

    google.script.run
      .withSuccessHandler(function(v){
        btn.disabled=false;
        btn.classList.remove('busy');
        btn.innerHTML=oldText;
        document.getElementById('correctionReason').value='';
        setStatus('Modifications enregistrées.','ok');
        render(v);
      })
      .withFailureHandler(function(e){
        btn.disabled=false;
        btn.classList.remove('busy');
        btn.innerHTML=oldText;
        setStatus('Erreur : '+(e&&e.message||e),'err');
      })
      .EUC_ADMIN_WORKFLOW_corrigerV149(current.id,changements,motif);
  };

  window.DEV151_deleteConvention=async function(){
    if(!current)return;
    const btn=document.getElementById('deleteConventionBtn');
    const motif=document.getElementById('deleteReason').value.trim();
    if(!motif){setStatus('Motif de suppression obligatoire.','err');return}

    const ok=await askConfirm(
      'Supprimer cette convention ?',
      'La convention sera retirée des listes courantes. Le motif, l’auteur, la date et un snapshot complet seront conservés.',
      'Supprimer la convention'
    );
    if(!ok)return;

    const oldText=btn.innerHTML;
    btn.disabled=true;
    btn.classList.add('busy');
    btn.innerHTML='<span class="spinner"></span>Suppression en cours';

    google.script.run
      .withSuccessHandler(function(){
        btn.disabled=false;
        btn.classList.remove('busy');
        btn.innerHTML=oldText;
        document.getElementById('deleteReason').value='';
        detail.classList.add('hidden');
        current=null;
        selected=null;
        search.value='';
        openBtn.disabled=true;
        reloadYear(yearContext.active);
      })
      .withFailureHandler(function(e){
        btn.disabled=false;
        btn.classList.remove('busy');
        btn.innerHTML=oldText;
        setStatus('Erreur : '+(e&&e.message||e),'err');
      })
      .EUC_ADMIN_WORKFLOW_supprimerV149(current.id,motif);
  };

'''

if "window.DEV151_saveCorrection" not in s:
    s=s.replace(anchor,handlers+anchor,1)

p.write_text(s,encoding="utf-8")
print("OK : boutons liés explicitement.")
PY

echo "=== CONTROLES DEV.151 ==="
cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_V151.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V151.js

grep -q "DIAGNOSTIC_DEV151_SCHEMA_SUPPRESSION" "$SERVICE"
grep -q "window.DEV151_saveCorrection" "$PAGE"
grep -q "window.DEV151_deleteConvention" "$PAGE"
grep -q 'onclick="DEV151_saveCorrection()"' "$PAGE"
grep -q 'onclick="DEV151_deleteConvention()"' "$PAGE"

echo "OK : contrôles terminés."

echo "=== PUSH ==="
clasp push -f

echo "=== VERSION ==="
clasp version "$LABEL"

echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.151 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Après déploiement, exécuter une fois dans Apps Script :"
echo "DIAGNOSTIC_DEV151_SCHEMA_SUPPRESSION"
echo "============================================================"
