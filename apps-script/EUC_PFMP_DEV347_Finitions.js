var EUC_DEV347_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';
var EUC_DEV347_PUBLIC_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec';
function EUC_DEV347_t(v){return String(v==null?'':v).trim();}
function EUC_DEV347_r(v){if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;if(Array.isArray(v)){for(var i=0;i<v.length;i++)if(Number(v[i])>0)return Number(v[i]);}return Number(v)||0;}
function EUC_DEV347_y(e){var y=EUC_DEV347_t(e&&e.parameter&&e.parameter.annee);if(y)return y;var c=EUC_PFMP_contexteAnneeLectureV155_();return EUC_DEV347_t(c&&c.active);}
function EUC_DEV347_summary_(annee){
  var raw=EUC_DEV335_resumeAccueil({annee:annee})||{},src=raw.familles||{},spec={BACPRO:[['Terminale',2,true],['Première',2,true],['Seconde',1,false]],BTS:[['1re année',1,true],['2e année',1,true]],CAP:[['TCAP',2,false],['1CAP',1,false]]},out={ok:true,annee:annee,familles:{}};
  Object.keys(spec).forEach(function(f){var by={};((src[f]&&src[f].niveaux)||[]).forEach(function(l){by[EUC_DEV347_t(l.niveau)]=l||{};});out.familles[f]={niveaux:spec[f].map(function(r){var n=r[0],cnt=r[1],apps=r[2],s=by[n]||{},ps=s.periodes||[],p=[];for(var i=0;i<cnt;i++){var x=ps[i]||{};p.push({libelle:f==='BTS'?'Stage n°'+(i+1):'PFMP n°'+(i+1),conventions:Number(x.conventions)||0,eleves:Number(x.eleves||x.total)||0,apprentis:apps?(Number(x.apprentis)||0):0});}return {niveau:n,periodes:p,pdif:(f==='BACPRO'&&n==='Terminale')?(s.pdif||null):null};})};});return out;
}
function EUC_DEV347_resumeAccueil(p){p=p||{};return EUC_DEV347_summary_(EUC_DEV347_t(p.annee));}
function EUC_DEV347_family_(a,f){
  var d=null;
  if(typeof EUC_DEV340_familyData_==='function'){try{d=EUC_DEV340_familyData_(a,f);if(d&&d.classes&&d.classes.length)return d;}catch(e){}}
  if(typeof EUC_DEV190G1_fastFamilyIndex==='function'){try{var q=EUC_DEV190G1_fastFamilyIndex({annee:a,famille:f});if(q&&q.ready&&q.payload)return q.payload;}catch(e2){}}
  if(typeof EUC_APP172_chargerFamille==='function'){try{d=EUC_APP172_chargerFamille({annee:a,famille:f});if(d&&d.classes&&d.classes.length)return d;}catch(e3){}}
  if(f==='BACPRO'&&typeof EUC_DEV291_family==='function'){try{d=EUC_DEV291_family({annee:a,famille:f});if(d&&d.classes&&d.classes.length)return d;}catch(e4){}}
  if(typeof EUC_SUIVI_PUBLIC_chargerFamilleV50==='function'){try{d=EUC_SUIVI_PUBLIC_chargerFamilleV50({annee:a,famille:f});if(d&&d.classes&&d.classes.length)return d;}catch(e5){}}
  return {ok:true,ready:false,annee:a,famille:f,classes:[]};
}
function EUC_DEV347_pick(o,n){o=o||{};for(var i=0;i<n.length;i++){var v=o[n[i]];if(v!=null&&String(v).trim())return String(v).trim();}return '';}
function EUC_DEV347_app(eid){var r=[];try{r=EUC_IMPORT_lireRecords_('EUC_APPRENTISSAGE_PFMP')||[];}catch(e){}r=r.filter(function(x){return EUC_DEV347_r(x.Eleve)===Number(eid);}).sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});return r[0]||null;}
function EUC_DEV347_appsByEleve_(){var rows=[];try{rows=EUC_DEV340_appRows_();}catch(e){try{rows=EUC_IMPORT_lireRecords_('EUC_APPRENTISSAGE_PFMP')||[];}catch(e2){rows=[];}}var by={};rows.forEach(function(r){var id=EUC_DEV347_r(r.Eleve);if(id&&(!by[id]||Number(r.id||0)>Number(by[id].id||0)))by[id]=r;});return by;}
function EUC_DEV347_enrichA(x,appsByEleve){
  if(!x||!x.apprenti)return x;var r=(appsByEleve&&appsByEleve[Number(x.eleveId)])||EUC_DEV347_app(x.eleveId)||{},c=null,s=String(EUC_DEV347_pick(r,['SIRET','Entreprise_siret'])||'').replace(/\D/g,'');
  var needsCompany=!EUC_DEV347_pick(r,['Nom_entreprise','Nom_commercial','Entreprise'])||!EUC_DEV347_pick(r,['Adresse_entreprise','Adresse']);
  if(needsCompany&&s.length===14&&typeof EUC_DEV190Y_findGristCompany_==='function'){try{c=EUC_DEV190Y_findGristCompany_(s);}catch(e){}}c=c||{};
  var ent=EUC_DEV347_pick(r,['Nom_entreprise','Nom_commercial','Entreprise'])||EUC_DEV347_pick(c,['nomEntreprise','nomCommercial','entreprise']);
  var adr=EUC_DEV347_pick(r,['Adresse_entreprise','Adresse'])||EUC_DEV347_pick(c,['adresse']),cp=EUC_DEV347_pick(r,['Code_postal','CodePostal','CP'])||EUC_DEV347_pick(c,['codePostal']),ville=EUC_DEV347_pick(r,['Ville','Commune'])||EUC_DEV347_pick(c,['ville']);
  var te=EUC_DEV347_pick(r,['Entreprise_telephone','Telephone_entreprise'])||EUC_DEV347_pick(c,['telephoneEntreprise']),me=EUC_DEV347_pick(r,['Entreprise_courriel','Courriel_entreprise'])||EUC_DEV347_pick(c,['courrielEntreprise']);
  var rn=EUC_DEV347_pick(r,['Responsable_nom','Responsable']),rp=EUC_DEV347_pick(r,['Responsable_prenom']),rt=EUC_DEV347_pick(r,['Responsable_telephone'])||te,rm=EUC_DEV347_pick(r,['Responsable_courriel'])||me;
  var tn=EUC_DEV347_pick(r,['Tuteur_nom','Tuteur'])||EUC_DEV347_pick(c,['tuteur']),tp=EUC_DEV347_pick(r,['Tuteur_prenom']),tt=EUC_DEV347_pick(r,['Tuteur_telephone'])||EUC_DEV347_pick(c,['telephoneTuteur']),tm=EUC_DEV347_pick(r,['Tuteur_courriel'])||EUC_DEV347_pick(c,['courrielTuteur']);
  x.entreprise=ent||x.entreprise||'';x.adresseEntreprise=[adr,[cp,ville].filter(Boolean).join(' ')].filter(Boolean).join(' · ');x.contactEntreprise=[[rp,rn].filter(Boolean).join(' ').trim(),rt,rm].filter(Boolean).join(' · ');x.tuteurEntreprise=[[tp,tn].filter(Boolean).join(' ').trim(),tt,tm].filter(Boolean).join(' · ');return x;
}
function EUC_DEV394_BASE_EUC_DEV347_detail(a,f,c,p){
  var q=EUC_DEV190I_readOne({annee:a,famille:f,classe:c,periode:p}),d=(q&&q.ready&&q.detail)?q.detail:EUC_SUIVI_CLASSE_detailF18_(a,c,p);
  if(typeof EUC_DEV340_enrichConventions_==='function')d=EUC_DEV340_enrichConventions_(d,a,c,p);else if(typeof EUC_V50_enrichirDetail_==='function')d=EUC_V50_enrichirDetail_(d,a,c,p);
  if(typeof EUC_DEV340_enrichApprentis_==='function')d=EUC_DEV340_enrichApprentis_(d);else if(typeof EUC_APP172_enrichirDetail==='function')d=EUC_APP172_enrichirDetail(d);
  var appsByEleve=(d.lignes||[]).some(function(x){return !!x.apprenti;})?EUC_DEV347_appsByEleve_():null;
  (d.lignes||[]).forEach(function(x){if(x.apprenti)EUC_DEV347_enrichA(x,appsByEleve);x.historiqueConventions=[];});
  if(typeof EUC_V51_numeroPeriodes_==='function'){try{d=EUC_V51_numeroPeriodes_(d)||d;}catch(e){}}
  return d;
}
function EUC_DEV347_adminSummary(e){var a=EUC_DEV347_y(e),t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_Summary_V342');t.paramsJson=JSON.stringify({annee:a});t.baseUrl=EUC_DEV347_ADMIN_URL_;return t.evaluate().setTitle('Suivi des conventions PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV347_publicSummary(e){var a=EUC_DEV347_y(e),t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_Summary_V342');t.paramsJson=JSON.stringify({annee:a});t.baseUrl=EUC_DEV347_PUBLIC_URL_;return t.evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV347_publicFamily(e){var a=EUC_DEV347_y(e),f=EUC_DEV347_t(e&&e.parameter&&e.parameter.famille)||'BACPRO',t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_Famille_V342');t.paramsJson=JSON.stringify({annee:a,famille:f});t.dataJson=JSON.stringify(EUC_DEV347_family_(a,f));t.baseUrl=EUC_DEV347_PUBLIC_URL_;return t.evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV347_publicDetail(e){var a=EUC_DEV347_y(e),f=EUC_DEV347_t(e&&e.parameter&&e.parameter.famille)||'BACPRO',c=Number(e&&e.parameter&&e.parameter.classe)||0,p=Number(e&&e.parameter&&e.parameter.periode)||0,t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Public_V342');t.paramsJson=JSON.stringify({annee:a,famille:f,classe:c,periode:p});t.detailJson=JSON.stringify(EUC_DEV347_detail(a,f,c,p));t.baseUrl=EUC_DEV347_PUBLIC_URL_;return t.evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV394_BASE_EUC_DEV347_adminDetail(e){var ctx=EUC_PFMP_contexteAnneeLectureV155_(),a=EUC_DEV347_y(e),f=EUC_DEV347_t(e&&e.parameter&&e.parameter.famille)||'BACPRO',c=Number(e&&e.parameter&&e.parameter.classe)||0,p=Number(e&&e.parameter&&e.parameter.periode)||0,d=EUC_DEV347_detail(a,f,c,p),t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');t.config=JSON.stringify({baseUrl:EUC_DEV347_ADMIN_URL_});t.anneeContextJson=JSON.stringify(ctx);t.detailJson=JSON.stringify(d);t.dev186BreadcrumbHtml='';return t.evaluate().setTitle('Suivi PFMP — '+((d.classe&&d.classe.nom)||'Classe')).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}


function EUC_DEV347_detail(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV347_detail.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV347_detail',Date.now()-__t);
  }
}


function EUC_DEV347_adminDetail(){
  EUC_DEV394_begin_('suivi-pfmp-classe');
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV347_adminDetail.apply(this,arguments);
  } finally {
    EUC_DEV394_finish_('EUC_DEV347_adminDetail',Date.now()-__t);
  }
}
