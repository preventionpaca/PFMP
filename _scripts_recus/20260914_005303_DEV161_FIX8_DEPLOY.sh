#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix8"

ROUTER="apps-script/EDT.js"
CLASSES_PAGE="apps-script/Suivi_PFMP_Classes.html"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"
PDF_HTML="apps-script/Convention_PFMP_PdfV95.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX8_${STAMP}"
mkdir -p "$BACKUP"

for f in "$ROUTER" "$CLASSES_PAGE" "$DETAIL_PAGE" "$QR_PAGE" "$QR_SERVICE" "$PDF_HTML"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX8 — ENT PUBLIC + PDF MAITRE + MONACO COMPLET"
echo "============================================================"

cat > apps-script/EUC_SUIVI_PFMP_ENT_V161.gs <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.161-fix8
 * Renderers lecture seule dédiés à l'ENT.
 */
function EUC_SUIVI_ENT_afficherClassesV161(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var requested=String(e&&e.parameter&&e.parameter.annee||'').trim();
  if(requested && ctx.annees && ctx.annees.some(function(a){return a.code===requested;}))ctx.active=requested;
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classes');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl(),ent:true});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.accueilJson=JSON.stringify(EUC_V154_accueil_(ctx.active));
  return tpl.evaluate().setTitle('Suivi PFMP par classe').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_SUIVI_ENT_afficherClasseV161(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=String(e&&e.parameter&&e.parameter.annee||'').trim()||ctx.active;
  if(classeId<=0)throw new Error('Classe manquante.');
  var detail=EUC_SUIVI_CLASSE_detailV161(annee,classeId,periodeId);
  detail.peutModifier=false;
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl(),ent:true});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);
  return tpl.evaluate().setTitle('Suivi PFMP — '+detail.classe.nom).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
EOF

cat > apps-script/EUC_PFMP_Monaco_V161Fix8.gs <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.161-fix8 */
function EUC_V161F8_txt_(v){return String(v==null?'':v).trim();}
function EUC_V161F8_tableEntreprise_(){
  try{var c=EUC_ENT_lireConfiguration();return String(c.EUC_ENT_TABLE_ENTREPRISES||'EUC_ENTREPRISES').trim()||'EUC_ENTREPRISES';}
  catch(e){return 'EUC_ENTREPRISES';}
}
function EUC_V161F8_assurerColonnesMonaco_(){
  var table=EUC_V161F8_tableEntreprise_();
  var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[];
  var have={};cols.forEach(function(c){have[c.id]=true;});
  var defs=[['NIS','NIS Monaco','Text'],['RCI','RCI Monaco','Text'],['Statut_validation','Statut validation','Text'],['Source_creation','Source création','Text']];
  var missing=defs.filter(function(d){return !have[d[0]];}).map(function(d){return {id:d[0],fields:{label:d[1],type:d[2]}};});
  if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/columns',{columns:missing});
  return table;
}
function EUC_V161_rechercherEntrepriseMonaco(nis){
  var table=EUC_V161F8_assurerColonnesMonaco_();
  nis=EUC_V161F8_txt_(nis);if(!nis)return {found:false};
  var n=nis.toLowerCase().replace(/\s+/g,'');
  var hit=EUC_IMPORT_lireRecords_(table).filter(function(r){return EUC_V161F8_txt_(r.NIS).toLowerCase().replace(/\s+/g,'')===n;})[0];
  if(!hit)return {found:false,nis:nis};
  return {found:true,id:Number(hit.id)||0,pays:'Monaco',nis:EUC_V161F8_txt_(hit.NIS),rci:EUC_V161F8_txt_(hit.RCI),nom:EUC_V161F8_txt_(hit.Raison_sociale||hit.Nom||hit.Entreprise),adresse:EUC_V161F8_txt_(hit.Adresse||hit.Adresse_complete),cp:EUC_V161F8_txt_(hit.Code_postal),ville:EUC_V161F8_txt_(hit.Commune)||'Monaco',email:EUC_V161F8_txt_(hit.Email),telephone:EUC_V161F8_txt_(hit.Telephone),statut:EUC_V161F8_txt_(hit.Statut_validation)};
}
function EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d){
  d=d||{};if(EUC_V161F8_txt_(d.entreprisePays).toLowerCase()!=='monaco')return {created:false};
  var nis=EUC_V161F8_txt_(d.entrepriseSiret);if(!nis)return {created:false};
  var existing=EUC_V161_rechercherEntrepriseMonaco(nis);if(existing&&existing.found)return {created:false,id:existing.id};
  var table=EUC_V161F8_assurerColonnesMonaco_();
  var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[];var have={};cols.forEach(function(c){have[c.id]=true;});
  var fields={};function put(k,v){if(have[k]&&v!==undefined&&v!==null)fields[k]=v;}
  put('NIS',nis);put('RCI',EUC_V161F8_txt_(d.entrepriseRci));put('Raison_sociale',EUC_V161F8_txt_(d.entrepriseRaisonSociale));put('Enseigne',EUC_V161F8_txt_(d.entrepriseEnseigne));put('Adresse',EUC_V161F8_txt_(d.entrepriseAdresse));put('Complement_adresse',EUC_V161F8_txt_(d.entrepriseComplement));put('Code_postal',EUC_V161F8_txt_(d.entrepriseCodePostal));put('Commune',EUC_V161F8_txt_(d.entrepriseCommune)||'Monaco');put('Pays','Monaco');put('Statut_validation','A_VALIDER');put('Source_creation','QR_PFMP');
  var r=EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/records',{records:[{fields:fields}]});
  var id=0;try{id=Number(r.records&&r.records[0]&&r.records[0].id)||0;}catch(e){}
  return {created:true,id:id};
}
EOF

python3 <<'PY'
from pathlib import Path
import re

# 1) routes ENT dédiées
p=Path('apps-script/EDT.js'); s=p.read_text(encoding='utf-8')
s=re.sub(r"^\s*if\s*\(page\s*===\s*'suivi-pfmp-ent(?:-classe)?'\).*?$",'',s,flags=re.M)
anchor="if (page === 'suivi-pfmp-classes')"; pos=s.find(anchor)
if pos<0: raise SystemExit('ERREUR : route suivi-pfmp-classes introuvable.')
routes="  if (page === 'suivi-pfmp-ent') return EUC_SUIVI_ENT_afficherClassesV161(e);\n  if (page === 'suivi-pfmp-ent-classe') return EUC_SUIVI_ENT_afficherClasseV161(e);\n"
s=s[:pos]+routes+s[pos:]; p.write_text(s,encoding='utf-8')
print('OK 1/5 : routes ENT dédiées.')

# 2) navigation ENT liste
p=Path('apps-script/Suivi_PFMP_Classes.html'); s=p.read_text(encoding='utf-8')
needle="u.searchParams.set('mode','ent');"
if needle in s and "suivi-pfmp-ent-classe" not in s:
    s=s.replace(needle,needle+"\n        u.searchParams.set('page','suivi-pfmp-ent-classe');",1)
old="window.location.href=C.baseUrl+'?page=suivi-pfmp-classes&annee='+encodeURIComponent(code);"
new="window.location.href=C.baseUrl+'?page='+(ENT_MODE?'suivi-pfmp-ent':'suivi-pfmp-classes')+'&annee='+encodeURIComponent(code)+(ENT_MODE?'&mode=ent':'');"
if old in s:s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('OK 2/5 : navigation liste ENT.')

# 3) détail ENT
p=Path('apps-script/Suivi_PFMP_Classe_Detail_V156.html'); s=p.read_text(encoding='utf-8')
if 'EUC_FIX8_ENT_NAV' not in s:
    block="""
<script id=\"EUC_FIX8_ENT_NAV\">
(function(){
  function ent(){try{return new URLSearchParams(location.search).get('mode')==='ent';}catch(e){return false;}}
  function apply(){
    if(!ent())return;
    var back=document.getElementById('back');
    if(back){back.href=C.baseUrl+'?page=suivi-pfmp-ent&mode=ent';back.textContent='← Retour aux classes';}
    var year=document.getElementById('yearSelect');
    if(year)year.onchange=function(){location.href=C.baseUrl+'?page=suivi-pfmp-ent-classe&mode=ent&annee='+encodeURIComponent(year.value)+'&classe='+encodeURIComponent(detail.classe.id);};
    var tabs=document.getElementById('periodTabs');
    if(tabs)Array.from(tabs.querySelectorAll('[data-p]')).forEach(function(btn){btn.onclick=function(){location.href=C.baseUrl+'?page=suivi-pfmp-ent-classe&mode=ent&annee='+encodeURIComponent(detail.annee)+'&classe='+encodeURIComponent(detail.classe.id)+'&periode='+encodeURIComponent(btn.dataset.p);};});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
</script>
"""
    s=s.replace('</body>',block+'\n</body>',1)
p.write_text(s,encoding='utf-8')
print('OK 3/5 : navigation détail ENT.')

# 4) QR : pays France/Monaco + NIS
p=Path('apps-script/PFMP_Acces_QR_V116.html'); s=p.read_text(encoding='utf-8')
if 'id="entreprisePaysSelectV161"' not in s:
    marker='<label class="wide">\nSIRET'
    if marker not in s: raise SystemExit('ERREUR : label SIRET QR introuvable.')
    repl='''<label class="wide">\nPays de l’entreprise *\n<select id="entreprisePaysSelectV161">\n  <option value="France">France</option>\n  <option value="Monaco">Monaco</option>\n</select>\n</label>\n\n<label class="wide">\n<span id="identifiantLabelV161">SIRET</span>'''
    s=s.replace(marker,repl,1)
if 'EUC_FIX8_MONACO_FLOW' not in s:
    block="""
<script id=\"EUC_FIX8_MONACO_FLOW\">
(function(){
  var country=document.getElementById('entreprisePaysSelectV161');
  var input=document.getElementById('siret');
  var search=document.getElementById('search');
  var label=document.getElementById('identifiantLabelV161');
  var state=document.getElementById('siretState');
  var count=document.getElementById('siretCount');
  var form=document.getElementById('enterpriseForm');
  if(!country||!input||!search||!form)return;
  function isMonaco(){return country.value==='Monaco';}
  function syncCountry(){
    if(isMonaco()){
      label.textContent='NIS (Monaco)'; input.removeAttribute('pattern'); input.removeAttribute('maxlength'); input.setAttribute('inputmode','text'); input.placeholder='Numéro NIS';
      if(state)state.textContent='Saisissez le NIS de l’établissement monégasque'; if(count)count.textContent=''; search.disabled=!input.value.trim();
      var p=field('entreprisePays'); if(p)p.value='Monaco';
    }else{
      label.textContent='SIRET'; input.setAttribute('pattern','[0-9]{14}'); input.setAttribute('maxlength','14'); input.setAttribute('inputmode','numeric'); input.placeholder='14 chiffres';
      var p2=field('entreprisePays'); if(p2)p2.value='France'; if(typeof controleSiret==='function')controleSiret();
    }
  }
  country.addEventListener('change',syncCountry);
  input.addEventListener('input',function(){if(isMonaco()){search.disabled=!input.value.trim();if(state)state.textContent=input.value.trim()?'NIS prêt à rechercher':'Saisissez le NIS de l’établissement monégasque';if(count)count.textContent='';}});
  search.addEventListener('click',function(ev){
    if(!isMonaco())return; ev.preventDefault(); ev.stopImmediatePropagation();
    var nis=input.value.trim(); if(!nis){msg('Le NIS est obligatoire pour une entreprise monégasque.',true);return;}
    search.disabled=true; msg('Recherche du NIS '+nis+' dans le référentiel interne…',false,true);
    google.script.run.withSuccessHandler(function(r){
      search.disabled=false;
      if(r&&r.found){
        fill({entrepriseSiret:r.nis||nis,entrepriseRaisonSociale:r.nom||'',entrepriseAdresse:r.adresse||'',entrepriseCodePostal:r.cp||'',entrepriseCommune:r.ville||'Monaco',entreprisePays:'Monaco'});
        msg('✓ Entreprise Monaco existante chargée.',false); status.className='status ok';
      }else{
        var p=field('entreprisePays'); if(p)p.value='Monaco';
        msg('NIS inconnu : complétez les coordonnées de l’entreprise. Elle sera créée avec le statut « À valider ».',false);
        var raison=field('entrepriseRaisonSociale'); if(raison)raison.focus();
      }
    }).withFailureHandler(function(e){search.disabled=false;msg('Erreur de recherche NIS : '+(e&&e.message||e),true);}).EUC_V161_rechercherEntrepriseMonaco(nis);
  },true);
  var save=document.getElementById('save'); if(save)save.addEventListener('click',function(){if(isMonaco()){var p=field('entreprisePays');if(p)p.value='Monaco';input.removeAttribute('pattern');input.removeAttribute('maxlength');}},true);
  syncCountry();
})();
</script>
"""
    s=s.replace('</body>',block+'\n</body>',1)
p.write_text(s,encoding='utf-8')
print('OK 4/5 : parcours QR Monaco complet.')

# 5) PDF V95 : le texte est dans le PDF maître, donc surcharge graphique à l’exécution
p=Path('apps-script/Convention_PFMP_PdfV95.html'); s=p.read_text(encoding='utf-8')
if 'SIRET_LABEL_V161' not in s:
    target="REFERENCE_LIGNE:{p:1,x:405,y:43,w:165,h:13}};"
    repl="REFERENCE_LIGNE:{p:1,x:405,y:43,w:165,h:13},SIRET_LABEL_V161:{p:0,x:35,y:548,w:175,h:18}};"
    if target not in s: raise SystemExit('ERREUR : objet Z PDF V95 introuvable.')
    s=s.replace(target,repl,1)
    build=s.find('async function buildOne')
    if build<0: raise SystemExit('ERREUR : buildOne introuvable dans PDF V95.')
    helper="""function drawSiretNisLabel(page,font,bold){const r=Z.SIRET_LABEL_V161;page.drawRectangle({x:r.x,y:r.y,width:r.w,height:r.h,color:rgb(1,1,1)});page.drawText('N° SIRET (France) / NIS (Monaco) :',{x:r.x+2,y:r.y+5,size:7.5,font:bold,color:COLORS.NOIR});}\n   """
    s=s[:build]+helper+s[build:]
    call="drawQR(pages[0],data.formUrl);return await pdf.save"
    if call not in s: raise SystemExit('ERREUR : appel drawQR introuvable dans buildOne.')
    s=s.replace(call,"drawSiretNisLabel(pages[0],font,bold);"+call,1)
p.write_text(s,encoding='utf-8')
print('OK 5/5 : PDF maître surchargé avec SIRET/NIS.')
PY

python3 <<'PY'
from pathlib import Path
p=Path('apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs'); s=p.read_text(encoding='utf-8')
old="['Entreprise_siret','SIRET entreprise','Text']"
new="['Entreprise_siret','SIRET entreprise','Text'],['Entreprise_nis','NIS Monaco','Text'],['Entreprise_identifiant_type','Type identifiant entreprise','Text'],['Entreprise_validation_statut','Statut validation entreprise','Text']"
if old in s and 'Entreprise_nis' not in s:s=s.replace(old,new,1)
needle="var pays=txt(d.entreprisePays,100)||'France',siret=txt(d.entrepriseSiret,30),raison=txt(d.entrepriseRaisonSociale,250),adresse=txt(d.entrepriseAdresse,300),commune=txt(d.entrepriseCommune,150),respNom=txt(d.responsableNom,150),tuteurEst=d.tuteurEstResponsable===true||String(d.tuteurEstResponsable)==='true';"
if needle not in s: raise SystemExit('ERREUR : bloc pays/siret sauvegarde QR introuvable.')
if 'var estMonaco=' not in s:s=s.replace(needle,needle+"var estMonaco=pays.toLowerCase()==='monaco';var nis=estMonaco?siret:'';",1)
oldf="var fields={Entreprise_siret:siret,Entreprise_raison_sociale:raison,"
newf="var fields={Entreprise_siret:estMonaco?'':siret,Entreprise_nis:nis,Entreprise_identifiant_type:estMonaco?'NIS':'SIRET',Entreprise_validation_statut:estMonaco?'A_VALIDER':'VALIDE',Entreprise_raison_sociale:raison,"
if oldf in s:s=s.replace(oldf,newf,1)
patch="EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:fields}]});var notif={};"
repl="EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:fields}]});if(estMonaco){try{EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d);}catch(monacoErr){console.log('MONACO_REF_WARNING '+String(monacoErr&&monacoErr.message||monacoErr));}}var notif={};"
if patch in s:s=s.replace(patch,repl,1)
elif 'EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_' not in s: raise SystemExit('ERREUR : point insertion Monaco après PATCH introuvable.')
p.write_text(s,encoding='utf-8')
print('OK : sauvegarde QR Monaco adaptée.')
PY

echo "============================================================"
echo " DEV.161 FIX8 — CONTROLES AVANT PUSH"
echo "============================================================"

check(){ local label="$1"; shift; if "$@"; then echo "✓ $label"; else echo "✗ ECHEC : $label"; exit 1; fi; }
check "route ENT classes dédiée" grep -q "suivi-pfmp-ent'" "$ROUTER"
check "route ENT détail dédiée" grep -q "suivi-pfmp-ent-classe" "$ROUTER"
check "renderer ENT lecture seule" grep -q "EUC_SUIVI_ENT_afficherClassesV161" apps-script/EUC_SUIVI_PFMP_ENT_V161.gs
check "QR choix France / Monaco" grep -q "entreprisePaysSelectV161" "$QR_PAGE"
check "QR recherche NIS" grep -q "EUC_V161_rechercherEntrepriseMonaco" "$QR_PAGE"
check "backend QR stocke Entreprise_nis" grep -q "Entreprise_nis" "$QR_SERVICE"
check "référentiel Monaco réel" grep -q "EUC_ENT_TABLE_ENTREPRISES" apps-script/EUC_PFMP_Monaco_V161Fix8.gs
check "PDF surcharge SIRET/NIS" grep -q "drawSiretNisLabel" "$PDF_HTML"

echo "=== CONTROLES DE SYNTAXE ==="
for f in apps-script/EUC_SUIVI_PFMP_ENT_V161.gs apps-script/EUC_PFMP_Monaco_V161Fix8.gs "$ROUTER" "$QR_SERVICE"; do
  cp "$f" "/tmp/$(basename "$f").js"
  node --check "/tmp/$(basename "$f").js"
done

python3 <<'PY'
from pathlib import Path
import re
for src,dst in [('apps-script/PFMP_Acces_QR_V116.html','/tmp/PFMP_QR_FIX8.js'),('apps-script/Convention_PFMP_PdfV95.html','/tmp/PDF_V95_FIX8.js')]:
    s=Path(src).read_text(encoding='utf-8')
    scripts=re.findall(r'<script(?:\s+[^>]*)?>(.*?)</script>',s,re.S)
    js='\n'.join(scripts)
    js=re.sub(r'<\?!=.*?\?>','{}',js)
    Path(dst).write_text(js,encoding='utf-8')
PY
node --check /tmp/PFMP_QR_FIX8.js
node --check /tmp/PDF_V95_FIX8.js

echo "✓ syntaxe serveur valide"
echo "✓ JavaScript QR valide"
echo "✓ JavaScript PDF V95 valide"

echo "=== PUSH ==="
clasp push -f

echo "=== VERSION ==="
clasp version "$LABEL"

echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.161 FIX8 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Lien ENT :"
echo "https://script.google.com/macros/s/$DEPLOYMENT_ID/exec?page=suivi-pfmp-ent&mode=ent"
echo "✓ ENT lecture seule sans rôle administrateur"
echo "✓ PDF maître surchargé avec SIRET France / NIS Monaco"
echo "✓ QR France = SIRET 14 chiffres"
echo "✓ QR Monaco = NIS référentiel interne"
echo "✓ NIS inconnu = saisie manuelle + création A_VALIDER"
echo "============================================================"
