#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix7"

FIX_SERVICE="apps-script/EUC_PFMP_FixV161_7.gs"
ROUTER="apps-script/EDT.js"
CLASSES_PAGE="apps-script/Suivi_PFMP_Classes.html"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX7_${STAMP}"
mkdir -p "$BACKUP"
for f in "$FIX_SERVICE" "$ROUTER" "$CLASSES_PAGE" "$DETAIL_PAGE" "$QR_PAGE" "$QR_SERVICE"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

for f in "$ROUTER" "$CLASSES_PAGE" "$DETAIL_PAGE" "$QR_PAGE" "$QR_SERVICE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
done

echo "============================================================"
echo " DEV.161 FIX7 — ENT PUBLIC + PDF + MONACO COMPLET"
echo "============================================================"

cat > "$FIX_SERVICE" <<'GS'
/** Eucalyptus PFMP — v1.0.0-dev.161-fix7 */
function EUC_V1617_txt_(v){return String(v==null?'':v).trim();}
function EUC_V1617_norm_(v){return EUC_V1617_txt_(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}

function EUC_V1617_afficherEntClasses(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var requested=EUC_V1617_txt_(e&&e.parameter&&e.parameter.annee);
  if(requested && ctx.annees && ctx.annees.some(function(a){return a.code===requested;}))ctx.active=requested;
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classes');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl(),entMode:true});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.accueilJson=JSON.stringify(EUC_SUIVI_CLASSES_accueilV154(ctx.active));
  return tpl.evaluate().setTitle('Suivi PFMP par classe').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_V1617_afficherEntClasse(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V1617_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  if(classeId<=0)throw new Error('Classe manquante.');
  var detail;
  if(typeof EUC_SUIVI_CLASSE_detailV162==='function')detail=EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId);
  else if(typeof EUC_SUIVI_CLASSE_detailV161==='function')detail=EUC_SUIVI_CLASSE_detailV161(annee,classeId,periodeId);
  else detail=EUC_SUIVI_CLASSE_detailV155(annee,classeId,periodeId);
  detail.peutModifier=false;
  detail.professeursDisponibles=[];
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl(),entMode:true});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);
  return tpl.evaluate().setTitle('Suivi PFMP — '+detail.classe.nom).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_V1617_tableEntreprises_(){var c=EUC_ENT_lireConfiguration();return c.EUC_ENT_TABLE_ENTREPRISES||'EUC_ENTREPRISES';}
function EUC_V1617_col_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}

function EUC_V1617_assurerColonnesMonaco_(){
  var table=EUC_V1617_tableEntreprises_();
  var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[],have={};
  cols.forEach(function(c){have[c.id]=true;});
  var wanted=[
    EUC_V1617_col_('NIS','NIS Monaco'),
    EUC_V1617_col_('RCI','RCI Monaco'),
    EUC_V1617_col_('Statut_validation','Statut validation'),
    EUC_V1617_col_('Source_creation','Source création')
  ];
  var missing=wanted.filter(function(c){return !have[c.id];});
  if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/columns',{columns:missing});
  return table;
}

function EUC_V1617_rechercherNis(nis){
  nis=EUC_V1617_txt_(nis);
  if(!nis)return {found:false};
  var table=EUC_V1617_assurerColonnesMonaco_();
  var rows=EUC_IMPORT_lireRecords_(table);
  var hit=rows.filter(function(r){return EUC_V1617_norm_(r.Pays)==='monaco' && EUC_V1617_norm_(r.NIS)===EUC_V1617_norm_(nis);})[0];
  if(!hit)return {found:false,nis:nis};
  return {found:true,source:'grist_monaco',entreprise:{nis:EUC_V1617_txt_(hit.NIS),rci:EUC_V1617_txt_(hit.RCI),raisonSociale:EUC_V1617_txt_(hit.Raison_sociale),enseigne:EUC_V1617_txt_(hit.Enseigne),numeroVoie:EUC_V1617_txt_(hit.Adresse),complementAdresse:EUC_V1617_txt_(hit.Complement_adresse),codePostal:EUC_V1617_txt_(hit.Code_postal),commune:EUC_V1617_txt_(hit.Commune)||'Monaco',pays:'Monaco'}};
}

function EUC_V1617_enregistrerEntrepriseMonaco(payload){
  payload=payload||{};
  var nis=EUC_V1617_txt_(payload.nis);
  if(!nis)throw new Error('NIS Monaco absent.');
  var table=EUC_V1617_assurerColonnesMonaco_();
  var rows=EUC_IMPORT_lireRecords_(table);
  var existing=rows.filter(function(r){return EUC_V1617_norm_(r.Pays)==='monaco' && EUC_V1617_norm_(r.NIS)===EUC_V1617_norm_(nis);})[0];
  var fields={NIS:nis,RCI:EUC_V1617_txt_(payload.rci),Raison_sociale:EUC_V1617_txt_(payload.raisonSociale),Enseigne:EUC_V1617_txt_(payload.enseigne),Adresse:EUC_V1617_txt_(payload.adresse),Complement_adresse:EUC_V1617_txt_(payload.complement),Code_postal:EUC_V1617_txt_(payload.codePostal),Commune:EUC_V1617_txt_(payload.commune)||'Monaco',Pays:'Monaco',Statut_validation:existing?(EUC_V1617_txt_(existing.Statut_validation)||'VALIDE'):'A_VALIDER',Source_creation:existing?(EUC_V1617_txt_(existing.Source_creation)||'QR_PFMP'):'QR_PFMP'};
  if(existing){EUC_ENT_grist('patch','/tables/'+encodeURIComponent(table)+'/records',{records:[{id:existing.id,fields:fields}]});return {ok:true,created:false,id:existing.id};}
  return {ok:true,created:true,result:EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/records',{records:[{fields:fields}]})};
}
GS

python3 <<'PY'
from pathlib import Path
import re

# 1. Routes ENT dédiées
p=Path('apps-script/EDT.js'); s=p.read_text(encoding='utf-8')
for page,call in [('suivi-pfmp-ent-classe','EUC_V1617_afficherEntClasse(e)'),('suivi-pfmp-ent','EUC_V1617_afficherEntClasses(e)')]:
    if page in s: continue
    pos=s.find("if (page === 'suivi-pfmp-classes')")
    if pos<0: pos=s.find("if(page === 'suivi-pfmp-classes')")
    if pos<0: raise SystemExit('ERREUR : ancre route suivi-pfmp-classes introuvable.')
    s=s[:pos]+"if (page === '"+page+"') return "+call+";\n  "+s[pos:]
p.write_text(s,encoding='utf-8')
print('OK 1/5 : routes ENT dédiées.')

# 2. Convention : tous les modèles, notamment le vrai PDF V95
changed=[]
for p in Path('apps-script').glob('Convention_PFMP_*.html'):
    txt=p.read_text(encoding='utf-8'); before=txt
    for a,b in [
        ('N° SIRET :','N° SIRET (France) / NIS (Monaco) :'),
        ('N° SIRET','N° SIRET (France) / NIS (Monaco)'),
        ('SIRET / NIS (Monaco) :','N° SIRET (France) / NIS (Monaco) :'),
        ('SIRET / NIS (Monaco)','N° SIRET (France) / NIS (Monaco)')
    ]: txt=txt.replace(a,b)
    if txt!=before: p.write_text(txt,encoding='utf-8'); changed.append(p.name)
print('OK 2/5 : modèles convention corrigés :',', '.join(changed) if changed else 'déjà corrects')

# 3. Sauvegarde QR : si Monaco, alimenter le référentiel interne
p=Path('apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs'); s=p.read_text(encoding='utf-8')
needle="EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:fields}]});var notif={};"
if 'EUC_V1617_enregistrerEntrepriseMonaco' not in s:
    if needle not in s: raise SystemExit('ERREUR : point insertion sauvegarde QR introuvable.')
    repl="EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:fields}]});if(pays.toLowerCase()==='monaco'){try{EUC_V1617_enregistrerEntrepriseMonaco({nis:siret,raisonSociale:raison,enseigne:txt(d.entrepriseEnseigne,250),adresse:adresse,complement:txt(d.entrepriseComplement,250),codePostal:txt(d.entrepriseCodePostal,20),commune:commune,rci:txt(d.entrepriseRci,100)});}catch(monacoErr){}}var notif={};"
    s=s.replace(needle,repl,1)
p.write_text(s,encoding='utf-8')
print('OK 3/5 : sauvegarde Monaco -> référentiel interne.')

# 4. Liste classes ENT : liens vers route publique dédiée
p=Path('apps-script/Suivi_PFMP_Classes.html'); s=p.read_text(encoding='utf-8')
if 'EUC_ENT_PUBLIC_FIX7' not in s:
    block=r'''<script id="EUC_ENT_PUBLIC_FIX7">
(function(){
  function ent(){try{var u=new URL(location.href);return u.searchParams.get('mode')==='ent'||u.searchParams.get('page')==='suivi-pfmp-ent';}catch(e){return false;}}
  function apply(){
    if(!ent())return;
    document.body.classList.add('euc-ent-mode');
    var back=document.getElementById('back');if(back)back.style.display='none';
    Array.from(document.querySelectorAll('a.classlink')).forEach(function(a){try{var u=new URL(a.href,location.href);u.searchParams.set('page','suivi-pfmp-ent-classe');u.searchParams.set('mode','ent');a.href=u.toString();}catch(e){}});
    var year=document.getElementById('yearSelect');
    if(year&&!year.dataset.entFix7){year.dataset.entFix7='1';year.addEventListener('change',function(ev){ev.stopImmediatePropagation();var base=(typeof C!=='undefined'&&C.baseUrl)?C.baseUrl:location.href.split('?')[0];location.href=base+'?page=suivi-pfmp-ent&mode=ent&annee='+encodeURIComponent(year.value);},true);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>'''
    s=s.replace('</body>',block+'</body>',1)
p.write_text(s,encoding='utf-8')
print('OK 4/5 : navigation liste ENT publique.')

# 5. Détail ENT + QR Monaco intégré
p=Path('apps-script/Suivi_PFMP_Classe_Detail_V156.html'); s=p.read_text(encoding='utf-8')
if 'EUC_ENT_DETAIL_PUBLIC_FIX7' not in s:
    block=r'''<script id="EUC_ENT_DETAIL_PUBLIC_FIX7">
(function(){
  function ent(){try{var u=new URL(location.href);return u.searchParams.get('mode')==='ent'||u.searchParams.get('page')==='suivi-pfmp-ent-classe';}catch(e){return false;}}
  function apply(){
    if(!ent())return;
    document.body.classList.add('euc-ent-mode');
    ['assignToolbar','assignToolbarV156','mailParams','sendTable'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
    var sh=document.getElementById('selectHead');if(sh)sh.style.display='none';
    Array.from(document.querySelectorAll('.student-check')).forEach(function(x){var td=x.closest('td');if(td)td.style.display='none';});
    var back=document.getElementById('back');if(back){var base=(typeof C!=='undefined'&&C.baseUrl)?C.baseUrl:location.href.split('?')[0];back.href=base+'?page=suivi-pfmp-ent&mode=ent&annee='+encodeURIComponent((typeof detail!=='undefined'&&detail.annee)||'');back.textContent='← Retour aux classes';}
    Array.from(document.querySelectorAll('#periodTabs [data-p]')).forEach(function(btn){if(btn.dataset.entFix7)return;btn.dataset.entFix7='1';btn.addEventListener('click',function(ev){ev.stopImmediatePropagation();var base=(typeof C!=='undefined'&&C.baseUrl)?C.baseUrl:location.href.split('?')[0];location.href=base+'?page=suivi-pfmp-ent-classe&mode=ent&annee='+encodeURIComponent(detail.annee)+'&classe='+encodeURIComponent(detail.classe.id)+'&periode='+encodeURIComponent(btn.dataset.p);},true);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>'''
    s=s.replace('</body>',block+'</body>',1)
p.write_text(s,encoding='utf-8')

p=Path('apps-script/PFMP_Acces_QR_V116.html'); s=p.read_text(encoding='utf-8')
s=re.sub(r'<style id="EUC_V161_MONACO_UI">.*?</script>\s*','',s,flags=re.S)
if 'EUC_MONACO_FIX7' not in s:
    block=r'''<style id="EUC_MONACO_FIX7">
.euc-mc-box{grid-column:1/-1;background:#f8fafc;border:1px solid #d9e1ec;border-radius:10px;padding:10px}.euc-mc-box select{width:100%;padding:9px;border:1px solid #b9c7d8;border-radius:8px;background:#fff;margin-top:6px}.euc-mc-msg{margin-top:7px;font-weight:700;font-size:13px}
</style>
<script id="EUC_MONACO_FIX7_SCRIPT">
(function(){
  function f(name){var form=document.getElementById('enterpriseForm');return form&&form.elements?form.elements[name]:null;}
  function init(){
    var form=document.getElementById('enterpriseForm'),ident=document.getElementById('siret'),search=document.getElementById('search'),state=document.getElementById('siretState'),count=document.getElementById('siretCount'),pays=f('entreprisePays');
    if(!form||!ident||!search||!pays||document.getElementById('eucCountryFix7'))return;
    var box=document.createElement('div');box.className='euc-mc-box';box.innerHTML='<b>Pays de l’entreprise</b><select id="eucCountryFix7"><option value="France">France</option><option value="Monaco">Monaco</option></select><div id="eucMcMsgFix7" class="euc-mc-msg"></div>';
    var lab=ident.closest('label');if(lab&&lab.parentElement)lab.parentElement.insertBefore(box,lab);
    var country=document.getElementById('eucCountryFix7'),msg=document.getElementById('eucMcMsgFix7');
    function mode(){var mc=country.value==='Monaco';pays.value=country.value;if(mc){ident.removeAttribute('pattern');ident.removeAttribute('maxlength');ident.setAttribute('inputmode','text');ident.placeholder='NIS Monaco';if(state)state.textContent=ident.value.trim()?'✓ NIS saisi':'Saisissez le NIS de l’entreprise';if(count)count.textContent='';search.disabled=!ident.value.trim();}else{ident.setAttribute('pattern','[0-9]{14}');ident.setAttribute('maxlength','14');ident.setAttribute('inputmode','numeric');ident.placeholder='14 chiffres';msg.textContent='';if(typeof controleSiret==='function')controleSiret();}}
    country.onchange=mode;
    ident.addEventListener('input',function(ev){if(country.value!=='Monaco')return;ev.stopImmediatePropagation();if(state)state.textContent=ident.value.trim()?'✓ NIS saisi':'Saisissez le NIS de l’entreprise';if(count)count.textContent='';search.disabled=!ident.value.trim();},true);
    search.addEventListener('click',function(ev){
      if(country.value!=='Monaco')return;ev.preventDefault();ev.stopImmediatePropagation();var nis=ident.value.trim();if(!nis){msg.textContent='Saisissez le NIS de l’entreprise.';msg.style.color='#b42318';return;}search.disabled=true;msg.textContent='Recherche du NIS dans le référentiel Monaco…';msg.style.color='#164e7a';
      google.script.run.withSuccessHandler(function(r){search.disabled=false;if(r&&r.found){var d=r.entreprise||{};[['entrepriseRaisonSociale',d.raisonSociale],['entrepriseEnseigne',d.enseigne],['entrepriseAdresse',d.numeroVoie],['entrepriseComplement',d.complementAdresse],['entrepriseCodePostal',d.codePostal],['entrepriseCommune',d.commune||'Monaco'],['entreprisePays','Monaco']].forEach(function(kv){var el=f(kv[0]);if(el)el.value=kv[1]||'';});msg.textContent='✓ Entreprise Monaco trouvée dans le référentiel.';msg.style.color='#067647';}else{['entrepriseRaisonSociale','entrepriseEnseigne','entrepriseAdresse','entrepriseComplement','entrepriseCodePostal'].forEach(function(k){var el=f(k);if(el)el.value='';});if(f('entrepriseCommune'))f('entrepriseCommune').value='Monaco';pays.value='Monaco';msg.textContent='NIS inconnu : complétez les coordonnées ci-dessous. Cette entreprise sera ajoutée au référentiel avec le statut « à valider ».';msg.style.color='#b45309';}}).withFailureHandler(function(e){search.disabled=false;msg.textContent='Erreur de recherche NIS : '+(e&&e.message||e);msg.style.color='#b42318';}).EUC_V1617_rechercherNis(nis);
    },true);
    mode();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>'''
    s=s.replace('</body>',block+'</body>',1)
p.write_text(s,encoding='utf-8')
print('OK 5/5 : détail ENT + parcours Monaco complet.')
PY

echo "============================================================"
echo " DEV.161 FIX7 — CONTROLES AVANT PUSH"
echo "============================================================"

check(){ local label="$1"; shift; if "$@"; then echo "✓ $label"; else echo "✗ ECHEC : $label"; exit 1; fi; }
check "route ENT classes" grep -q "suivi-pfmp-ent" "$ROUTER"
check "route ENT détail" grep -q "suivi-pfmp-ent-classe" "$ROUTER"
check "renderer ENT lecture seule" grep -q "EUC_V1617_afficherEntClasses" "$FIX_SERVICE"
check "PDF V95 Monaco" grep -q "NIS (Monaco)" apps-script/Convention_PFMP_PdfV95.html
check "QR Monaco intégré" grep -q "EUC_MONACO_FIX7" "$QR_PAGE"
check "table Monaco configurée" grep -q "EUC_V1617_tableEntreprises_" "$FIX_SERVICE"
check "statut A_VALIDER" grep -q "A_VALIDER" "$FIX_SERVICE"
check "sauvegarde QR -> Monaco" grep -q "EUC_V1617_enregistrerEntrepriseMonaco" "$QR_SERVICE"

cp "$FIX_SERVICE" /tmp/EUC_PFMP_FixV161_7.js
cp "$ROUTER" /tmp/EDT_FIX7.js
cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX7.js
node --check /tmp/EUC_PFMP_FixV161_7.js
node --check /tmp/EDT_FIX7.js
node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX7.js

echo "✓ syntaxe serveur valide"

echo "=== PUSH ==="
clasp push -f

echo "=== VERSION ==="
clasp version "$LABEL"

echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.161 FIX7 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Lien ENT :"
echo "https://script.google.com/macros/s/$DEPLOYMENT_ID/exec?page=suivi-pfmp-ent&mode=ent"
echo "Tests : ENT sans admin / PDF SIRET-NIS / QR France / QR Monaco connu / QR Monaco inconnu"
echo "============================================================"
