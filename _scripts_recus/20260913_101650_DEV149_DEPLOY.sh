#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.149"
SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
PAGE="apps-script/Admin_Conventions_PFMP.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV149_${STAMP}"
mkdir -p "$BACKUP"
cp "$SERVICE" "$BACKUP/"
cp "$PAGE" "$BACKUP/"

cat >> "$SERVICE" <<'EOF'

/* DEV.149 — corrections administratives + suppression tracée */

function EUC_ADMIN_WORKFLOW_assurerColonnesV149_(){
  var table=EUC_CONVENTION_ACCES_TABLE_;
  var current=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[];
  var have={};current.forEach(function(c){have[c.id]=true;});
  function c(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
  var cols=[
    c('Supprimee_admin','Supprimée administrativement','Bool'),
    c('Date_suppression_admin','Date suppression administrative','DateTime'),
    c('Auteur_suppression_admin','Auteur suppression administrative'),
    c('Motif_suppression_admin','Motif suppression administrative'),
    c('Snapshot_suppression_JSON','Snapshot suppression JSON'),
    c('Derniere_correction_admin','Dernière correction administrative','DateTime'),
    c('Auteur_derniere_correction_admin','Auteur dernière correction administrative')
  ];
  var missing=cols.filter(function(x){return !have[x.id];});
  if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/columns',{columns:missing});
  return missing.map(function(x){return x.id;});
}

function INSTALLER_DEV149_CORRECTIONS_SUPPRESSIONS(){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();
  return {ok:true,version:'v1.0.0-dev.149',auteur:ctx.email||'',colonnesCreees:EUC_ADMIN_WORKFLOW_assurerColonnesV149_()};
}

function EUC_ADMIN_WORKFLOW_champsModifiablesV149_(){
  return {
    Entreprise_raison_sociale:'Entreprise',Entreprise_siret:'SIRET',Entreprise_adresse:'Adresse entreprise',
    Entreprise_code_postal:'Code postal entreprise',Entreprise_commune:'Commune entreprise',
    Responsable_nom:'Nom responsable',Responsable_prenom:'Prénom responsable',Responsable_fonction:'Fonction responsable',
    Responsable_telephone:'Téléphone responsable',Responsable_courriel:'Courriel responsable',
    Tuteur_nom:'Nom tuteur',Tuteur_prenom:'Prénom tuteur',Tuteur_fonction:'Fonction tuteur',
    Tuteur_telephone:'Téléphone tuteur',Tuteur_courriel:'Courriel tuteur',
    Date_debut:'Date début',Date_fin:'Date fin'
  };
}

function EUC_ADMIN_WORKFLOW_corrigerV149(accesId,changements,motif){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();
  var a=EUC_ADMIN_WORKFLOW_lireDossierV144_(accesId);
  if(a.Supprimee_admin===true)throw new Error('Cette convention est supprimée administrativement.');

  motif=EUC_ADMIN_WORKFLOW_txtV144_(motif,1000);
  if(!motif)throw new Error('Motif de correction obligatoire.');

  var allowed=EUC_ADMIN_WORKFLOW_champsModifiablesV149_(),fields={},avant={},apres={};
  changements=changements||{};

  Object.keys(changements).forEach(function(k){
    if(!allowed[k])return;
    var nv=(k==='Date_debut'||k==='Date_fin')?String(changements[k]||'').trim():EUC_ADMIN_WORKFLOW_txtV144_(changements[k],1000);
    var ov=a[k];
    if(String(ov==null?'':ov)===String(nv==null?'':nv))return;
    avant[k]=ov==null?'':ov;apres[k]=nv;fields[k]=nv;
  });

  if(!Object.keys(fields).length)throw new Error('Aucune modification détectée.');

  var now=EUC_ADMIN_WORKFLOW_nowV144_();
  fields.Derniere_correction_admin=now;
  fields.Auteur_derniere_correction_admin=ctx.email||'';

  var h=EUC_ADMIN_WORKFLOW_historiqueV144_(a);
  h.push({date:now,auteur:ctx.email||'',action:'CORRECTION_ADMINISTRATIVE',motif:motif,avant:avant,apres:apres});
  fields.Historique_admin_JSON=JSON.stringify(h);

  EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:Number(a.id),fields:fields}]});
  return EUC_ADMIN_WORKFLOW_vueV146(a.id);
}

function EUC_ADMIN_WORKFLOW_supprimerV149(accesId,motif){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();
  var a=EUC_ADMIN_WORKFLOW_lireDossierV144_(accesId);

  motif=EUC_ADMIN_WORKFLOW_txtV144_(motif,1000);
  if(!motif)throw new Error('Motif de suppression obligatoire.');
  if(a.Supprimee_admin===true)throw new Error('Cette convention est déjà supprimée administrativement.');

  var now=EUC_ADMIN_WORKFLOW_nowV144_(),snapshot={};
  Object.keys(a).forEach(function(k){if(typeof a[k]!=='function')snapshot[k]=a[k];});

  var h=EUC_ADMIN_WORKFLOW_historiqueV144_(a);
  h.push({date:now,auteur:ctx.email||'',action:'SUPPRESSION_CONVENTION',motif:motif,numero:EUC_ADMIN_WORKFLOW_numeroV144_(a)});

  EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:Number(a.id),fields:{
    Supprimee_admin:true,Date_suppression_admin:now,Auteur_suppression_admin:ctx.email||'',
    Motif_suppression_admin:motif,Snapshot_suppression_JSON:JSON.stringify(snapshot),
    Statut_administratif:'SUPPRIMEE_ADMIN',Historique_admin_JSON:JSON.stringify(h)
  }}]});

  return {ok:true,id:Number(a.id),numero:EUC_ADMIN_WORKFLOW_numeroV144_(a),statut:'SUPPRIMEE_ADMIN',date:now,auteur:ctx.email||'',motif:motif};
}
EOF

python3 <<'PY'
from pathlib import Path
import re
p=Path("apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs")
s=p.read_text(encoding="utf-8")

# Etendre la vue V146
needle="  return base;\n}"
insert="""  base.supprimeeAdmin=a.Supprimee_admin===true;
  base.suppressionAdmin={
    date:a.Date_suppression_admin||'',
    dateLisible:a.Date_suppression_admin?EUC_ADMIN_WORKFLOW_dateLisibleV144_(a.Date_suppression_admin):'',
    auteur:String(a.Auteur_suppression_admin||''),
    motif:String(a.Motif_suppression_admin||'')
  };
  base.correction={
    Entreprise_raison_sociale:String(a.Entreprise_raison_sociale||''),Entreprise_siret:String(a.Entreprise_siret||''),
    Entreprise_adresse:String(a.Entreprise_adresse||''),Entreprise_code_postal:String(a.Entreprise_code_postal||''),
    Entreprise_commune:String(a.Entreprise_commune||''),Responsable_nom:String(a.Responsable_nom||''),
    Responsable_prenom:String(a.Responsable_prenom||''),Responsable_fonction:String(a.Responsable_fonction||''),
    Responsable_telephone:String(a.Responsable_telephone||''),Responsable_courriel:String(a.Responsable_courriel||''),
    Tuteur_nom:String(a.Tuteur_nom||''),Tuteur_prenom:String(a.Tuteur_prenom||''),Tuteur_fonction:String(a.Tuteur_fonction||''),
    Tuteur_telephone:String(a.Tuteur_telephone||''),Tuteur_courriel:String(a.Tuteur_courriel||''),
    Date_debut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),Date_fin:EUC_IMPORT_dateExistanteISO_(a.Date_fin)
  };
  return base;
}"""
if "base.supprimeeAdmin=" not in s:
    idx=s.find(needle,s.find("function EUC_ADMIN_WORKFLOW_vueV146"))
    if idx<0: raise SystemExit("ERREUR : fin vue V146 introuvable.")
    s=s[:idx]+insert+s[idx+len(needle):]

# Exclure supprimées
s=s.replace(
"      if(!(a.Date_saisie_entreprise||a.Numero_enregistrement||a.Entreprise_raison_sociale||a.Statut==='ENTREPRISE_SAISIE'))return false;",
"      if(a.Supprimee_admin===true)return false;\\n      if(!(a.Date_saisie_entreprise||a.Numero_enregistrement||a.Entreprise_raison_sociale||a.Statut==='ENTREPRISE_SAISIE'))return false;",
1)

p.write_text(s,encoding="utf-8")
PY

cat > /tmp/dev149_block.html <<'EOF'
<div class="card" id="correctionAdminV149">
  <h2>Corriger la convention</h2>
  <div class="sub">Toute correction est historisée avec les valeurs avant/après et un motif obligatoire.</div>
  <div class="edit-grid" style="margin-top:14px">
    <label><span>Entreprise</span><input data-corr="Entreprise_raison_sociale"></label>
    <label><span>SIRET</span><input data-corr="Entreprise_siret"></label>
    <label><span>Adresse entreprise</span><input data-corr="Entreprise_adresse"></label>
    <label><span>Code postal</span><input data-corr="Entreprise_code_postal"></label>
    <label><span>Commune</span><input data-corr="Entreprise_commune"></label>
    <label><span>Nom responsable</span><input data-corr="Responsable_nom"></label>
    <label><span>Prénom responsable</span><input data-corr="Responsable_prenom"></label>
    <label><span>Fonction responsable</span><input data-corr="Responsable_fonction"></label>
    <label><span>Téléphone responsable</span><input data-corr="Responsable_telephone"></label>
    <label><span>Courriel responsable</span><input data-corr="Responsable_courriel"></label>
    <label><span>Nom tuteur</span><input data-corr="Tuteur_nom"></label>
    <label><span>Prénom tuteur</span><input data-corr="Tuteur_prenom"></label>
    <label><span>Fonction tuteur</span><input data-corr="Tuteur_fonction"></label>
    <label><span>Téléphone tuteur</span><input data-corr="Tuteur_telephone"></label>
    <label><span>Courriel tuteur</span><input data-corr="Tuteur_courriel"></label>
    <label><span>Date début</span><input type="date" data-corr="Date_debut"></label>
    <label><span>Date fin</span><input type="date" data-corr="Date_fin"></label>
  </div>
  <label style="display:block;margin-top:14px;font-weight:700">Motif de correction
    <textarea id="correctionReason" rows="3" placeholder="Motif obligatoire"></textarea>
  </label>
  <div class="edit-actions"><button id="saveCorrectionBtn" class="primary">Enregistrer les corrections</button></div>
</div>

<div class="card">
  <div class="archive-box">
    <h3>Supprimer administrativement la convention</h3>
    <p class="sub">La convention disparaît des listes courantes, mais la suppression, son motif, son auteur et un snapshot complet sont conservés.</p>
    <textarea id="deleteReason" rows="3" placeholder="Motif de suppression obligatoire"></textarea>
    <button id="deleteConventionBtn" class="danger" style="margin-top:10px">Supprimer la convention</button>
  </div>
</div>
EOF

python3 <<'PY'
from pathlib import Path
p=Path("apps-script/Admin_Conventions_PFMP.html")
s=p.read_text(encoding="utf-8")

if ".edit-grid{" not in s:
    s=s.replace("    @media(max-width:850px){","    .edit-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}\\n    .edit-grid label span{display:block;margin-bottom:6px;font-weight:700}\\n    .edit-actions{display:flex;justify-content:flex-end;margin-top:14px}\\n    .archive-box{border:1px solid #f3b7b7;background:#fff8f8;border-radius:14px;padding:16px}\\n    .archive-box h3{margin:0 0 8px;color:#a61b1b}\\n    @media(max-width:850px){.edit-grid{grid-template-columns:1fr}",1)

if 'id="correctionAdminV149"' not in s:
    block=Path("/tmp/dev149_block.html").read_text(encoding="utf-8")
    marker='    <div class="card">\\n      <h2>Actions exceptionnelles</h2>'
    if marker not in s: raise SystemExit("ERREUR : bloc actions exceptionnelles introuvable.")
    s=s.replace(marker,block+"\\n"+marker,1)

# remplir les champs à l'ouverture
marker="    period.textContent=detailPeriod;"
fill="""    const corr=v.correction||{};
    Array.from(document.querySelectorAll('[data-corr]')).forEach(function(el){
      el.value=corr[el.dataset.corr]||'';
    });"""
if fill not in s:
    s=s.replace(marker,marker+"\\n"+fill,1)

# handlers
if "saveCorrectionBtn').onclick" not in s:
    handlers="""
  document.getElementById('saveCorrectionBtn').onclick=async function(){
    if(!current)return;
    const btn=this,motif=document.getElementById('correctionReason').value.trim();
    if(!motif){setStatus('Motif de correction obligatoire.','err');return}
    const changements={};
    Array.from(document.querySelectorAll('[data-corr]')).forEach(function(el){changements[el.dataset.corr]=el.value;});
    const ok=await askConfirm('Enregistrer les corrections ?','Les anciennes et nouvelles valeurs seront conservées dans l’historique.','Enregistrer les corrections');
    if(!ok)return;
    const old=btn.innerHTML;btn.disabled=true;btn.classList.add('busy');btn.innerHTML='<span class="spinner"></span>Correction en cours';
    google.script.run.withSuccessHandler(function(v){btn.disabled=false;btn.classList.remove('busy');btn.innerHTML=old;document.getElementById('correctionReason').value='';setStatus('Corrections enregistrées.','ok');render(v);})
      .withFailureHandler(function(e){btn.disabled=false;btn.classList.remove('busy');btn.innerHTML=old;setStatus('Erreur : '+(e&&e.message||e),'err');})
      .EUC_ADMIN_WORKFLOW_corrigerV149(current.id,changements,motif);
  };

  document.getElementById('deleteConventionBtn').onclick=async function(){
    if(!current)return;
    const btn=this,motif=document.getElementById('deleteReason').value.trim();
    if(!motif){setStatus('Motif de suppression obligatoire.','err');return}
    const ok=await askConfirm('Supprimer cette convention ?','Elle sera retirée des listes courantes. Un snapshot complet et le motif resteront conservés.','Supprimer la convention');
    if(!ok)return;
    const old=btn.innerHTML;btn.disabled=true;btn.classList.add('busy');btn.innerHTML='<span class="spinner"></span>Suppression en cours';
    google.script.run.withSuccessHandler(function(){btn.disabled=false;btn.classList.remove('busy');btn.innerHTML=old;detail.classList.add('hidden');current=null;selected=null;search.value='';openBtn.disabled=true;reloadYear(yearContext.active);})
      .withFailureHandler(function(e){btn.disabled=false;btn.classList.remove('busy');btn.innerHTML=old;setStatus('Erreur : '+(e&&e.message||e),'err');})
      .EUC_ADMIN_WORKFLOW_supprimerV149(current.id,motif);
  };

"""
    marker="  renderSchoolYears();"
    if marker not in s: raise SystemExit("ERREUR : ancre JS finale introuvable.")
    s=s.replace(marker,handlers+marker,1)

p.write_text(s,encoding="utf-8")
PY

echo "=== CONTROLES DEV.149 ==="
cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_V149.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V149.js
grep -q "INSTALLER_DEV149_CORRECTIONS_SUPPRESSIONS" "$SERVICE"
grep -q "EUC_ADMIN_WORKFLOW_corrigerV149" "$SERVICE"
grep -q "EUC_ADMIN_WORKFLOW_supprimerV149" "$SERVICE"
grep -q 'id="correctionAdminV149"' "$PAGE"
grep -q 'id="deleteConventionBtn"' "$PAGE"

echo "=== PUSH ==="
clasp push -f
echo "=== VERSION ==="
clasp version "$LABEL"
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.149 DEPLOYEE"
echo "============================================================"
echo "Avant test, exécuter dans Apps Script :"
echo "INSTALLER_DEV149_CORRECTIONS_SUPPRESSIONS"
echo "============================================================"
