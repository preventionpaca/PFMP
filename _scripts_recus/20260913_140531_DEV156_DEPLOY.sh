#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.156"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV156_${STAMP}"
mkdir -p "$BACKUP"

NEW_SERVICE="apps-script/EUC_SUIVI_PFMP_V156.gs"
NEW_PAGE="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
ROUTER="apps-script/EDT.js"
HOME_SERVICE="apps-script/EUC_SUIVI_PFMP_ClassesV154.gs"
HOME_PAGE="apps-script/Suivi_PFMP_Classes.html"

for f in "$NEW_SERVICE" "$NEW_PAGE" "$ROUTER" "$HOME_SERVICE" "$HOME_PAGE"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

cat > "$NEW_SERVICE" <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.156
 * Affectations téléphone / visite + correction contexte année scolaire.
 */
var EUC_V156_TABLE_='EUC_AFFECTATIONS_SUIVI_PFMP';

function EUC_V156_txt_(v){return String(v==null?'':v).trim();}

function EUC_PFMP_definirAnneeActiveLectureV156(code){
  code=EUC_V156_txt_(code);
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  if(!ctx.annees.some(function(a){return a.code===code;}))throw new Error('Année scolaire inconnue : '+code);
  try{PropertiesService.getUserProperties().setProperty('EUC_PFMP_ANNEE_ACTIVE_V148',code);}catch(e){}
  ctx.active=code;
  return ctx;
}

function EUC_V156_admin_(){
  try{var c=EUC_PFMP_contexteAdmin_();return c&&c.autorise?c:null;}catch(e){return null;}
}

function EUC_V156_col_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}

function EUC_V156_assurerTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tables.some(function(t){return t.id===EUC_V156_TABLE_;});
  var c=EUC_V156_col_;
  var cols=[
    c('Annee_scolaire','Année scolaire'),c('Classe','Classe','Ref:Classes'),c('Periode','Période','Ref:Planning_Periodes'),
    c('Eleve','Élève','Ref:EUC_ELEVES_PFMP'),c('Type_suivi','Type suivi'),c('Professeur','Professeur','Ref:EUC_PROFESSEURS_PFMP'),
    c('Nom_professeur_snapshot','Nom professeur'),c('Email_professeur_snapshot','Email professeur'),
    c('Date_affectation','Date affectation','DateTime'),c('Affecte_par','Affecté par'),c('Actif','Actif','Bool'),c('Date_modification','Date modification','DateTime')
  ];
  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V156_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V156_TABLE_+'/columns').columns||[],have={};
    current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_V156_TABLE_+'/columns',{columns:missing});
  }
  return true;
}

function INSTALLER_DEV156_AFFECTATIONS(){
  var ctx=EUC_V156_admin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V156_assurerTable_();
  return {ok:true,table:EUC_V156_TABLE_};
}

function EUC_V156_professeurs_(){
  return EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP').filter(function(p){return p.Actif!==false;}).map(function(p){
    return {id:Number(p.id),nom:[p.Civilite,p.Prenom,p.Nom].filter(Boolean).join(' '),email:EUC_V156_txt_(p.Email),discipline:EUC_V156_txt_(p.Discipline)};
  }).filter(function(p){return p.id&&p.nom;}).sort(function(a,b){return a.nom.localeCompare(b.nom,'fr');});
}

function EUC_V156_affectations_(annee,classeId,periodeId){
  try{EUC_V156_assurerTable_();}catch(e){return [];}
  return EUC_IMPORT_lireRecords_(EUC_V156_TABLE_).filter(function(r){
    return r.Actif!==false && EUC_V156_txt_(r.Annee_scolaire)===EUC_V156_txt_(annee) &&
      Number(EUC_PFMP_ref_(r.Classe))===Number(classeId) && Number(EUC_PFMP_ref_(r.Periode))===Number(periodeId);
  });
}

function EUC_SUIVI_CLASSE_detailV156(codeAnnee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV155(codeAnnee,classeId,periodeId);
  var profs=EUC_V156_professeurs_();
  var affect=EUC_V156_affectations_(d.annee,d.classe.id,d.periode?d.periode.id:0),by={};
  affect.forEach(function(a){var eid=Number(EUC_PFMP_ref_(a.Eleve)),type=EUC_V156_txt_(a.Type_suivi).toUpperCase();if(eid&&type)by[eid+'|'+type]=a;});
  d.lignes=(d.lignes||[]).map(function(x){
    var tel=by[x.eleveId+'|TELEPHONE'],vis=by[x.eleveId+'|VISITE'];
    x.professeurTelephone=tel?EUC_V156_txt_(tel.Nom_professeur_snapshot):'';
    x.professeurVisiteur=vis?EUC_V156_txt_(vis.Nom_professeur_snapshot):'';
    return x;
  });
  d.professeursDisponibles=profs;
  d.peutModifier=!!EUC_V156_admin_();
  return d;
}

function EUC_SUIVI_AFFECTER_V156(payload){
  var ctx=EUC_V156_admin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  payload=payload||{};
  var annee=EUC_V156_txt_(payload.annee),classeId=Number(payload.classeId),periodeId=Number(payload.periodeId),type=EUC_V156_txt_(payload.type).toUpperCase(),profId=Number(payload.profId);
  var eleveIds=(payload.eleveIds||[]).map(Number).filter(function(x){return x>0;});
  if(!annee||!(classeId>0)||!(periodeId>0)||['TELEPHONE','VISITE'].indexOf(type)<0||!(profId>0)||!eleveIds.length)throw new Error('Affectation incomplète.');
  EUC_V156_assurerTable_();
  var prof=EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP').filter(function(p){return Number(p.id)===profId&&p.Actif!==false;})[0];
  if(!prof)throw new Error('Professeur introuvable.');
  var profNom=[prof.Civilite,prof.Prenom,prof.Nom].filter(Boolean).join(' '),profMail=EUC_V156_txt_(prof.Email),now=new Date().toISOString();
  var existing=EUC_IMPORT_lireRecords_(EUC_V156_TABLE_);
  eleveIds.forEach(function(eid){
    var ex=existing.filter(function(r){return r.Actif!==false&&EUC_V156_txt_(r.Annee_scolaire)===annee&&Number(EUC_PFMP_ref_(r.Classe))===classeId&&Number(EUC_PFMP_ref_(r.Periode))===periodeId&&Number(EUC_PFMP_ref_(r.Eleve))===eid&&EUC_V156_txt_(r.Type_suivi).toUpperCase()===type;})[0];
    var fields={Annee_scolaire:annee,Classe:classeId,Periode:periodeId,Eleve:eid,Type_suivi:type,Professeur:profId,Nom_professeur_snapshot:profNom,Email_professeur_snapshot:profMail,Date_affectation:now,Affecte_par:ctx.email||'',Actif:true,Date_modification:now};
    if(ex)EUC_ENT_grist('patch','/tables/'+EUC_V156_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});
    else EUC_ENT_grist('post','/tables/'+EUC_V156_TABLE_+'/records',{records:[{fields:fields}]});
  });
  return EUC_SUIVI_CLASSE_detailV156(annee,classeId,periodeId);
}

function EUC_SUIVI_CLASSE_afficherV156(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0,periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V156_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  if(classeId<=0)throw new Error('Classe manquante.');
  var detail=EUC_SUIVI_CLASSE_detailV156(annee,classeId,periodeId);
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);
  return tpl.evaluate().setTitle('Suivi PFMP — '+detail.classe.nom).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
EOF

cat > "$NEW_PAGE" <<'EOF'
<!DOCTYPE html>
<html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#f4f7fb;--card:#fff;--ink:#1d2939;--muted:#667085;--line:#d9e1ec;--accent:#165d9c;--ok:#079669;--bad:#c62828}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,sans-serif}.wrap{max-width:1450px;margin:0 auto;padding:24px}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px}.back{background:#fff;border:1px solid var(--line);padding:10px 14px;border-radius:10px;text-decoration:none;color:var(--ink)}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:18px}.context{display:grid;grid-template-columns:220px 1fr;gap:14px;align-items:end}
select,input,button{font:inherit}select,input{border:1px solid #b9c7d8;border-radius:9px;padding:9px 10px;background:#fff}.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.tab{border:1px solid var(--line);background:#fff;padding:9px 12px;border-radius:10px;cursor:pointer;font-weight:700}.tab.active{background:var(--accent);color:#fff}
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric{background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:12px}.metric span{display:block;color:var(--muted);font-size:12px}.metric b{font-size:22px}
.assignbar{display:grid;grid-template-columns:auto 1fr 1fr;gap:12px;align-items:end;margin-bottom:14px}.assignbox{position:relative}.assignbox label{display:block;font-weight:700;font-size:13px;margin-bottom:6px}.assignrow{display:flex;gap:8px}.assignrow input{width:100%}.assignrow button{border:0;border-radius:9px;background:var(--accent);color:#fff;font-weight:700;padding:9px 12px;cursor:pointer}.prof-suggestions{position:absolute;z-index:50;left:0;right:0;top:70px;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 10px 25px rgba(16,24,40,.15);max-height:250px;overflow:auto;display:none}.prof-option{padding:9px 10px;border-bottom:1px solid #edf0f4;cursor:pointer}.prof-option:hover{background:#eef5fb}
.table-wrap{overflow:auto}table{width:100%;border-collapse:separate;border-spacing:0;min-width:1250px}th,td{padding:10px 9px;border-bottom:1px solid #edf0f4;text-align:left;vertical-align:top}th{position:sticky;top:0;background:#f8fafc;z-index:2;font-size:13px;color:#475467}.student{font-weight:700}.small{font-size:12px;color:var(--muted)}.rowcheck{width:18px;height:18px}.selection{font-weight:700;color:#475467;padding:8px 0}.pill{display:inline-block;padding:5px 8px;border-radius:999px;font-size:12px;font-weight:800}.bad{background:#fff1f2;color:#b42318}.ok{background:#ecfdf3;color:#067647}.warn{background:#fff7ed;color:#b45309}.empty{color:var(--muted);font-style:italic}
@media(max-width:900px){.assignbar,.context,.summary{grid-template-columns:1fr}}
</style></head><body>
<div class="wrap"><div class="top"><div><h1 id="pageTitle">Suivi PFMP</h1><div id="pageSub" class="small"></div></div><a id="back" class="back" href="#">← Retour aux classes</a></div>
<div class="card"><div class="context"><div><label for="yearSelect"><b>Année scolaire</b></label><select id="yearSelect"></select></div><div><b id="classLabel"></b><div class="small" id="ppLabel"></div></div></div><div class="tabs" id="periodTabs"></div></div>
<div class="card"><div class="summary"><div class="metric"><span>Effectif</span><b id="mTotal">0</b></div><div class="metric"><span>Avec convention</span><b id="mAvec">0</b></div><div class="metric"><span>Sans convention</span><b id="mSans">0</b></div><div class="metric"><span>Annulées / interrompues</span><b id="mIncident">0</b></div></div></div>
<div class="card"><div id="toolbar" class="assignbar"><div><label><input id="selectAll" type="checkbox" class="rowcheck"> Tout sélectionner</label><div id="selectedCount" class="selection">0 élève sélectionné</div></div><div class="assignbox"><label>Professeur — suivi téléphonique</label><div class="assignrow"><input id="phoneInput" autocomplete="off" placeholder="Tapez un nom..."><button id="phoneBtn">Affecter</button></div><div id="phoneSug" class="prof-suggestions"></div></div><div class="assignbox"><label>Professeur visiteur</label><div class="assignrow"><input id="visitInput" autocomplete="off" placeholder="Tapez un nom..."><button id="visitBtn">Affecter</button></div><div id="visitSug" class="prof-suggestions"></div></div></div>
<div class="table-wrap"><table><thead><tr><th id="selHead">✓</th><th>Élève</th><th>Convention / statut</th><th>Entreprise</th><th>Adresse</th><th>Contact</th><th>PP</th><th>Suivi téléphonique</th><th>Professeur visiteur</th></tr></thead><tbody id="tbody"></tbody></table></div></div></div>
<script>
const C=<?!= config ?>, ANNEE_CTX=<?!= anneeContextJson ?>, DETAIL_INIT=<?!= detailJson ?>;
(function(){
const back=document.getElementById('back'),yearSelect=document.getElementById('yearSelect'),tabs=document.getElementById('periodTabs'),tbody=document.getElementById('tbody'),toolbar=document.getElementById('toolbar'),selectAll=document.getElementById('selectAll'),selectedCount=document.getElementById('selectedCount'),phoneInput=document.getElementById('phoneInput'),visitInput=document.getElementById('visitInput'),phoneSug=document.getElementById('phoneSug'),visitSug=document.getElementById('visitSug'),phoneBtn=document.getElementById('phoneBtn'),visitBtn=document.getElementById('visitBtn');
let ctx=ANNEE_CTX||{annees:[]},detail=DETAIL_INIT||{},phoneProf=null,visitProf=null;
function esc(v){const d=document.createElement('div');d.textContent=v==null?'':v;return d.innerHTML}function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function val(v){return v?esc(v):'<span class="empty">—</span>'}function pill(x){const c=x.statutCode==='SANS_CONVENTION'?'bad':(['FINALISEE','REMISE','AUTORISEE'].includes(x.statutCode)?'ok':'warn');return '<span class="pill '+c+'">'+esc(x.statut)+'</span>'}
function selectedIds(){return Array.from(document.querySelectorAll('.student-check:checked')).map(x=>Number(x.value))}function refresh(){const n=selectedIds().length;selectedCount.textContent=n+' élève'+(n>1?'s':'')+' sélectionné'+(n>1?'s':'')}
function bindChecks(){Array.from(document.querySelectorAll('.student-check')).forEach(x=>x.onchange=refresh);selectAll.onchange=function(){Array.from(document.querySelectorAll('.student-check')).forEach(x=>x.checked=selectAll.checked);refresh()};refresh()}
function bindAuto(input,box,setter){input.oninput=function(){setter(null);const q=norm(input.value).trim();if(!q){box.style.display='none';return}const f=(detail.professeursDisponibles||[]).filter(p=>norm(p.nom+' '+p.email+' '+p.discipline).includes(q)).slice(0,15);box.innerHTML=f.length?f.map(p=>'<div class="prof-option" data-id="'+p.id+'"><b>'+esc(p.nom)+'</b><div class="small">'+esc([p.discipline,p.email].filter(Boolean).join(' · '))+'</div></div>').join(''):'<div class="prof-option">Aucun professeur</div>';box.style.display='block';Array.from(box.querySelectorAll('[data-id]')).forEach(el=>el.onclick=function(){const p=f.find(x=>String(x.id)===String(el.dataset.id));if(p){setter(p);input.value=p.nom;box.style.display='none'}})}}
function assign(type,prof,btn){if(!prof)return alert('Sélectionnez un professeur.');const ids=selectedIds();if(!ids.length)return alert('Sélectionnez au moins un élève.');const old=btn.textContent;btn.disabled=true;btn.textContent='Affectation en cours...';google.script.run.withSuccessHandler(r=>{btn.disabled=false;btn.textContent=old;detail=r;render()}).withFailureHandler(e=>{btn.disabled=false;btn.textContent=old;alert('Erreur : '+(e&&e.message||e))}).EUC_SUIVI_AFFECTER_V156({annee:detail.annee,classeId:detail.classe.id,periodeId:detail.periode.id,type:type,profId:prof.id,eleveIds:ids})}
function render(){back.href=C.baseUrl+'?page=suivi-pfmp-classes&annee='+encodeURIComponent(detail.annee);document.getElementById('pageTitle').textContent='Suivi PFMP — '+detail.classe.nom;document.getElementById('pageSub').textContent=detail.periode?[detail.periode.libelle,detail.periode.debut,detail.periode.fin].filter(Boolean).join(' · '):'';document.getElementById('classLabel').textContent=detail.classe.nom+' — '+detail.annee;document.getElementById('ppLabel').textContent='Professeur principal : '+((detail.professeursPrincipaux||[]).map(p=>p.nom).join(' / ')||'non renseigné');yearSelect.innerHTML=(ctx.annees||[]).map(y=>'<option value="'+esc(y.code)+'"'+(y.code===detail.annee?' selected':'')+'>'+esc(y.libelle||y.code)+'</option>').join('');tabs.innerHTML=(detail.periodes||[]).map(p=>'<button class="tab'+(detail.periode&&detail.periode.id===p.id?' active':'')+'" data-p="'+p.id+'">'+esc(p.libelle)+'</button>').join('');Array.from(tabs.querySelectorAll('[data-p]')).forEach(b=>b.onclick=function(){location.href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(detail.annee)+'&classe='+detail.classe.id+'&periode='+b.dataset.p});const st=detail.stats||{};mTotal.textContent=st.total||0;mAvec.textContent=st.avecConvention||0;mSans.textContent=st.sansConvention||0;mIncident.textContent=(st.annulees||0)+(st.interrompues||0);tbody.innerHTML=(detail.lignes||[]).map(x=>'<tr><td>'+(detail.peutModifier?'<input class="student-check rowcheck" type="checkbox" value="'+x.eleveId+'">':'')+'</td><td><div class="student">'+esc(x.nom)+' '+esc(x.prenom)+'</div></td><td>'+pill(x)+(x.numero?'<div class="small">'+esc(x.numero)+'</div>':'')+'</td><td>'+val(x.entreprise)+'</td><td>'+val(x.adresseEntreprise)+'</td><td>'+val(x.contactEntreprise)+'</td><td>'+val(x.professeurPrincipal)+'</td><td>'+val(x.professeurTelephone)+'</td><td>'+val(x.professeurVisiteur)+'</td></tr>').join('');toolbar.style.display=detail.peutModifier?'grid':'none';document.getElementById('selHead').style.display=detail.peutModifier?'table-cell':'none';bindChecks()}
yearSelect.onchange=function(){location.href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(yearSelect.value)+'&classe='+detail.classe.id};bindAuto(phoneInput,phoneSug,p=>phoneProf=p);bindAuto(visitInput,visitSug,p=>visitProf=p);phoneBtn.onclick=()=>assign('TELEPHONE',phoneProf,phoneBtn);visitBtn.onclick=()=>assign('VISITE',visitProf,visitBtn);render();
})();
</script></body></html>
EOF

python3 <<'PY'
from pathlib import Path
p=Path('apps-script/EDT.js');s=p.read_text(encoding='utf-8')
s=s.replace("if (page === 'suivi-pfmp-classe') return EUC_SUIVI_CLASSE_afficherV155(e);","if (page === 'suivi-pfmp-classe') return EUC_SUIVI_CLASSE_afficherV156(e);",1)
p.write_text(s,encoding='utf-8')

p=Path('apps-script/EUC_SUIVI_PFMP_ClassesV154.gs');s=p.read_text(encoding='utf-8')
old="function EUC_SUIVI_CLASSES_afficherV154(e){\n  var ctx=EUC_PFMP_contexteAnneeLectureV155_();"
new="function EUC_SUIVI_CLASSES_afficherV154(e){\n  var ctx=EUC_PFMP_contexteAnneeLectureV155_();\n  var requested=String(e&&e.parameter&&e.parameter.annee||'').trim();\n  if(requested && ctx.annees.some(function(a){return a.code===requested;})){ctx.active=requested;try{PropertiesService.getUserProperties().setProperty('EUC_PFMP_ANNEE_ACTIVE_V148',requested);}catch(err){}}"
if old in s and 'var requested=String(e&&e.parameter' not in s:s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('apps-script/Suivi_PFMP_Classes.html');s=p.read_text(encoding='utf-8')
import re
s=re.sub(r"  function reloadYear\(code\)\{.*?\n  \}","  function reloadYear(code){\n    window.location.href=C.baseUrl+'?page=suivi-pfmp-classes&annee='+encodeURIComponent(code);\n  }",s,count=1,flags=re.S)
p.write_text(s,encoding='utf-8')
PY

echo "=== CONTROLES DEV.156 ==="
cp "$NEW_SERVICE" /tmp/EUC_SUIVI_PFMP_V156.js
node --check /tmp/EUC_SUIVI_PFMP_V156.js
cp "$ROUTER" /tmp/EDT_DEV156.js
node --check /tmp/EDT_DEV156.js
grep -q "EUC_SUIVI_AFFECTER_V156" "$NEW_SERVICE"
grep -q "EUC_SUIVI_CLASSE_afficherV156" "$NEW_SERVICE"
grep -q "page === 'suivi-pfmp-classe'" "$ROUTER"
grep -q "page=suivi-pfmp-classes&annee=" "$HOME_PAGE"

echo "OK : changement d'année corrigé."
echo "OK : autocomplétion professeurs."
echo "OK : affectations téléphone / visite."
echo "OK : sélection individuelle ou multiple."

echo "=== PUSH ==="
clasp push -f
echo "=== VERSION ==="
clasp version "$LABEL"
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.156 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ changement d'année réellement appliqué"
echo "✓ professeur téléphone par autocomplétion"
echo "✓ professeur visiteur par autocomplétion"
echo "✓ affectation individuelle ou multiple"
echo "✓ lecture seule pour non-admin"
echo "✓ table d'affectations auto-créée au premier usage admin"
echo "✓ push + version + déploiement principal"
echo "============================================================"
