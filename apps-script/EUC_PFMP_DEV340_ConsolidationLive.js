/** PFMP — v1.0.0-dev.340 */
var EUC_DEV340_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';

function EUC_DEV340_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV340_ref_(v){
  if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++)if(Number(v[i])>0)return Number(v[i]);}
  return Number(v)||0;
}
function EUC_DEV340_year_(e){
  var y=EUC_DEV340_txt_(e&&e.parameter&&e.parameter.annee);
  if(y)return y;
  var c=EUC_PFMP_contexteAnneeLectureV155_();
  return EUC_DEV340_txt_(c&&c.active);
}
function EUC_DEV340_accessKey_(annee,classe,periode){
  return 'EUC_DEV340_ACC_'+EUC_DEV340_txt_(annee)+'_'+Number(classe||0)+'_'+Number(periode||0);
}
function EUC_DEV340_compactAccess_(a){
  return {
    id:Number(a.id)||0,Eleve:a.Eleve,Annee_scolaire:EUC_DEV340_txt_(a.Annee_scolaire),
    Classe_convention:a.Classe_convention,Periode:a.Periode,
    Statut:a.Statut,Statut_administratif:a.Statut_administratif,
    Revoked:a.Revoked===true,Supprimee_admin:a.Supprimee_admin===true,
    Reference_convention:EUC_DEV340_txt_(a.Reference_convention),
    Numero_enregistrement:EUC_DEV340_txt_(a.Numero_enregistrement),
    Entreprise_raison_sociale:EUC_DEV340_txt_(a.Entreprise_raison_sociale),
    Entreprise_enseigne:EUC_DEV340_txt_(a.Entreprise_enseigne),
    Entreprise_adresse:EUC_DEV340_txt_(a.Entreprise_adresse),
    Entreprise_complement:EUC_DEV340_txt_(a.Entreprise_complement),
    Entreprise_code_postal:EUC_DEV340_txt_(a.Entreprise_code_postal),
    Entreprise_commune:EUC_DEV340_txt_(a.Entreprise_commune),
    Entreprise_pays:EUC_DEV340_txt_(a.Entreprise_pays),
    Entreprise_telephone:EUC_DEV340_txt_(a.Entreprise_telephone),
    Entreprise_courriel:EUC_DEV340_txt_(a.Entreprise_courriel),
    Responsable_nom:EUC_DEV340_txt_(a.Responsable_nom),
    Responsable_prenom:EUC_DEV340_txt_(a.Responsable_prenom),
    Responsable_telephone:EUC_DEV340_txt_(a.Responsable_telephone),
    Responsable_courriel:EUC_DEV340_txt_(a.Responsable_courriel),
    Tuteur_nom:EUC_DEV340_txt_(a.Tuteur_nom),
    Tuteur_prenom:EUC_DEV340_txt_(a.Tuteur_prenom),
    Tuteur_telephone:EUC_DEV340_txt_(a.Tuteur_telephone),
    Tuteur_courriel:EUC_DEV340_txt_(a.Tuteur_courriel)
  };
}
function EUC_DEV394_BASE_EUC_DEV340_accessRows_(annee,classe,periode){
  var cache=CacheService.getScriptCache(),key=EUC_DEV340_accessKey_(annee,classe,periode),got=cache.get(key);
  if(got){try{return JSON.parse(got);}catch(e){}}
  var rows=(EUC_CONVENTION_lireAccesFraisV108_()||[]).filter(function(a){
    if(EUC_DEV340_ref_(a.Classe_convention)!==Number(classe))return false;
    if(Number(periode)>0&&EUC_DEV340_ref_(a.Periode)!==Number(periode))return false;
    var y=EUC_DEV340_txt_(a.Annee_scolaire);
    return !annee||!y||y===annee;
  }).map(EUC_DEV340_compactAccess_);
  try{cache.put(key,JSON.stringify(rows),45);}catch(e){}
  return rows;
}
function EUC_DEV394_BASE_EUC_DEV340_primeAccessIndex_(annee,data){
  var classes=(data&&data.classes)||[],wanted={};
  classes.forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    (c.periodes||[]).forEach(function(p){
      var pid=Number(p.id)||0;
      if(cid>0&&pid>0)wanted[cid+'|'+pid]=[];
    });
  });
  if(!Object.keys(wanted).length)return {ok:true,keys:0};
  (EUC_CONVENTION_lireAccesFraisV108_()||[]).forEach(function(a){
    var y=EUC_DEV340_txt_(a.Annee_scolaire);
    if(annee&&y&&y!==annee)return;
    var k=EUC_DEV340_ref_(a.Classe_convention)+'|'+EUC_DEV340_ref_(a.Periode);
    if(wanted[k])wanted[k].push(EUC_DEV340_compactAccess_(a));
  });
  var cache=CacheService.getScriptCache(),n=0;
  Object.keys(wanted).forEach(function(k){
    var p=k.split('|');
    try{
      cache.put(EUC_DEV340_accessKey_(annee,Number(p[0]),Number(p[1])),JSON.stringify(wanted[k]),45);
      n++;
    }catch(e){}
  });
  return {ok:true,keys:n};
}
function EUC_DEV340_status_(a){
  if(typeof EUC_V50_statutDetail_==='function'){
    try{return EUC_V50_statutDetail_(a);}catch(e){}
  }
  if(!a)return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false};
  if(a.Revoked===true||a.Supprimee_admin===true)return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false};
  var s=EUC_DEV340_txt_(a.Statut_administratif||a.Statut).toUpperCase();
  if(s.indexOf('ANNULEE')>=0)return {code:'ANNULEE',libelle:'Annulée',active:false};
  if(s.indexOf('INTERROMP')>=0)return {code:'INTERROMPUE',libelle:'Interrompue',active:false};
  return {code:'AVEC_CONVENTION',libelle:'Avec convention',active:true};
}
function EUC_DEV340_address_(a){
  if(!a)return '';
  if(typeof EUC_V155_adresseEntreprise_==='function'){
    try{return EUC_V155_adresseEntreprise_(a)||'';}catch(e){}
  }
  return [
    EUC_DEV340_txt_(a.Entreprise_adresse),
    EUC_DEV340_txt_(a.Entreprise_complement),
    [EUC_DEV340_txt_(a.Entreprise_code_postal),EUC_DEV340_txt_(a.Entreprise_commune)].filter(Boolean).join(' '),
    EUC_DEV340_txt_(a.Entreprise_pays)
  ].filter(Boolean).join(' · ');
}
function EUC_DEV340_contact_(a){
  if(!a)return '';
  if(typeof EUC_V155_contactEntreprise_==='function'){
    try{return EUC_V155_contactEntreprise_(a)||'';}catch(e){}
  }
  var r=[EUC_DEV340_txt_(a.Responsable_prenom),EUC_DEV340_txt_(a.Responsable_nom)].filter(Boolean).join(' ').trim();
  var t=[EUC_DEV340_txt_(a.Tuteur_prenom),EUC_DEV340_txt_(a.Tuteur_nom)].filter(Boolean).join(' ').trim();
  return [r||t,EUC_DEV340_txt_(a.Responsable_telephone)||EUC_DEV340_txt_(a.Tuteur_telephone),EUC_DEV340_txt_(a.Responsable_courriel)||EUC_DEV340_txt_(a.Tuteur_courriel)].filter(Boolean).join(' · ');
}
function EUC_DEV340_tuteur_(a){
  if(!a)return '';
  if(typeof EUC_V50_tuteur_==='function'){try{return EUC_V50_tuteur_(a)||'';}catch(e){}}
  var n=[EUC_DEV340_txt_(a.Tuteur_prenom),EUC_DEV340_txt_(a.Tuteur_nom)].filter(Boolean).join(' ').trim();
  return [n,EUC_DEV340_txt_(a.Tuteur_telephone),EUC_DEV340_txt_(a.Tuteur_courriel)].filter(Boolean).join(' · ');
}
function EUC_DEV394_BASE_EUC_DEV340_enrichConventions_(detail,annee,classe,periode){
  detail=detail||{};
  if(!Array.isArray(detail.lignes))return detail;
  var rows=EUC_DEV340_accessRows_(annee,classe,periode),by={};
  rows.forEach(function(a){var eid=EUC_DEV340_ref_(a.Eleve);if(eid)(by[eid]||(by[eid]=[])).push(a);});
  var avec=0,ann=0,intp=0;
  detail.lignes.forEach(function(x){
    var list=(by[Number(x.eleveId)]||[]).slice().sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});
    var actif=null;
    for(var i=0;i<list.length;i++){if(EUC_DEV340_status_(list[i]).active){actif=list[i];break;}}
    var dernier=actif||list[0]||null,st=EUC_DEV340_status_(dernier);
    x.historiqueConventions=list;
    x.conventionId=actif?Number(actif.id)||0:0;
    x.convention=!!actif;
    x.numero=actif?(typeof EUC_ADMIN_WORKFLOW_numeroV144_==='function'?EUC_ADMIN_WORKFLOW_numeroV144_(actif):EUC_DEV340_txt_(actif.Numero_enregistrement||actif.Reference_convention)):'';
    x.statutCode=st.code;x.statut=st.libelle;
    if(dernier){
      x.entreprise=EUC_DEV340_txt_(dernier.Entreprise_raison_sociale)||EUC_DEV340_txt_(dernier.Entreprise_enseigne);
      x.adresseEntreprise=EUC_DEV340_address_(dernier);
      x.contactEntreprise=EUC_DEV340_contact_(dernier);
      x.tuteurEntreprise=EUC_DEV340_tuteur_(dernier);
      x.telephoneEntreprise=EUC_DEV340_txt_(dernier.Entreprise_telephone)||EUC_DEV340_txt_(dernier.Responsable_telephone)||EUC_DEV340_txt_(dernier.Tuteur_telephone);
      x.courrielEntreprise=EUC_DEV340_txt_(dernier.Entreprise_courriel)||EUC_DEV340_txt_(dernier.Responsable_courriel)||EUC_DEV340_txt_(dernier.Tuteur_courriel);
      x.telephoneTuteur=EUC_DEV340_txt_(dernier.Tuteur_telephone);
      x.courrielTuteur=EUC_DEV340_txt_(dernier.Tuteur_courriel);
    }else{
      x.entreprise='';x.adresseEntreprise='';x.contactEntreprise='';x.tuteurEntreprise='';
      x.telephoneEntreprise='';x.courrielEntreprise='';x.telephoneTuteur='';x.courrielTuteur='';
    }
    if(st.active)avec++;
    if(st.code==='ANNULEE')ann++;
    if(st.code==='INTERROMPUE')intp++;
  });
  detail.stats=detail.stats||{};
  detail.stats.total=detail.lignes.length;
  detail.stats.avecConvention=avec;
  detail.stats.annulees=ann;
  detail.stats.interrompues=intp;
  detail.stats.sansConvention=Math.max(0,detail.lignes.length-avec-ann-intp);
  return detail;
}
function EUC_DEV340_appRows_(){
  var cache=CacheService.getScriptCache(),key='EUC_DEV340_APP_ROWS',got=cache.get(key);
  if(got){try{return JSON.parse(got);}catch(e){}}
  var rows=[];
  try{rows=EUC_IMPORT_lireRecords_('EUC_APPRENTISSAGE_PFMP')||[];}catch(e){rows=[];}
  try{cache.put(key,JSON.stringify(rows),90);}catch(e){}
  return rows;
}
function EUC_DEV394_BASE_EUC_DEV340_enrichApprentis_(detail){
  detail=detail||{};
  var rows=EUC_DEV340_appRows_();
  var debut=detail.periode&&(detail.periode.debut||detail.periode.Date_debut);
  var fin=detail.periode&&(detail.periode.fin||detail.periode.Date_fin);
  var ap=0,mx=0,avec=0,sans=0,ann=0,intp=0;
  (detail.lignes||[]).forEach(function(x){
    var st={code:'SCOLAIRE'};
    try{st=EUC_APP172_eval(rows,x.eleveId,debut,fin)||st;}catch(e){}
    x.statutApprentissage=st.code;x.apprenti=st.code==='APPRENTI';x.statutMixte=st.code==='MIXTE';
    if(x.apprenti){
      ap++;x.statutCode='APPRENTI';x.statut='APPRENTI';x.convention=false;x.conventionId=0;
      if(st.record){
        if(!EUC_DEV340_txt_(x.entreprise))x.entreprise=EUC_DEV340_txt_(st.record.entreprise);
        if(!EUC_DEV340_txt_(x.tuteurEntreprise))x.tuteurEntreprise=[st.record.tuteur,st.record.tel,st.record.mail].filter(Boolean).join(' · ');
      }
      return;
    }
    if(x.statutMixte)mx++;
    var c=EUC_DEV340_txt_(x.statutCode||x.statut).toUpperCase();
    if(c.indexOf('ANNULEE')>=0)ann++;
    else if(c.indexOf('INTERROMP')>=0)intp++;
    else if(Number(x.conventionId)>0)avec++;
    else sans++;
  });
  detail.stats=detail.stats||{};
  detail.stats.total=(detail.lignes||[]).length;detail.stats.apprentis=ap;detail.stats.mixtes=mx;
  detail.stats.avecConvention=avec;detail.stats.sansConvention=sans;
  detail.stats.annulees=ann;detail.stats.interrompues=intp;
  detail.stats.scolairesAttendus=Math.max(0,detail.stats.total-ap-mx);
  return detail;
}
function EUC_DEV340_isPdif_(detail){
  var p=detail&&detail.periode||{},s=EUC_DEV340_txt_(p.libelle||p.code).toUpperCase();
  return p.isPdif===true||p.pdif===true||s.indexOf('P.DIF')>=0||s.indexOf('PDIF')>=0||s.indexOf('DIFF')>=0;
}
function EUC_DEV394_BASE_EUC_DEV340_familyData_(annee,famille){
  var d=null;
  if(typeof EUC_DEV339_familyData_==='function'){
    try{d=EUC_DEV339_familyData_(annee,famille);if(d&&Array.isArray(d.classes)&&d.classes.length){d.ready=true;return d;}}catch(e){}
  }
  if(typeof EUC_APP172_chargerFamille==='function'){
    try{d=EUC_APP172_chargerFamille({annee:annee,famille:famille});if(d&&Array.isArray(d.classes)&&d.classes.length){d.ready=true;d.source='APP172';return d;}}catch(e2){}
  }
  if(typeof EUC_DEV190G1_fastFamilyIndex==='function'){
    try{var f=EUC_DEV190G1_fastFamilyIndex({annee:annee,famille:famille});if(f&&f.ready&&f.payload){d=f.payload;d.ready=true;d.source='FAST_INDEX';return d;}}catch(e3){}
  }
  return {ok:true,ready:false,annee:annee,famille:famille,classes:[],source:'NONE'};
}
function EUC_DEV394_BASE_EUC_DEV340_afficherFamille(e){
  var annee=EUC_DEV340_year_(e),famille=EUC_DEV340_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO';
  var data=EUC_DEV340_familyData_(annee,famille);
  try{EUC_DEV340_primeAccessIndex_(annee,data);}catch(err){console.log(String(err));}
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
  t.paramsJson=JSON.stringify({annee:annee,famille:famille});t.dataJson=JSON.stringify(data||{});t.baseUrl=EUC_DEV340_ADMIN_URL_;
  return t.evaluate().setTitle('Suivi des conventions — '+(famille==='BACPRO'?'BAC PRO':famille)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV340_afficherAdminClasse(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var annee=EUC_DEV340_year_(e),famille=EUC_DEV340_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO';
  var classe=Number(e&&e.parameter&&e.parameter.classe)||0,periode=Number(e&&e.parameter&&e.parameter.periode)||0;
  if(!classe||!periode)throw new Error('Classe ou période manquante.');
  var r=EUC_DEV190I_readOne({annee:annee,famille:famille,classe:classe,periode:periode});
  var detail=(r&&r.ready&&r.detail)?r.detail:EUC_SUIVI_CLASSE_detailF18_(annee,classe,periode);
  detail=EUC_DEV340_enrichConventions_(detail,annee,classe,periode);
  detail=EUC_DEV340_enrichApprentis_(detail);
  if(EUC_DEV340_isPdif_(detail)&&typeof EUC_DEV291_enrichDetail_==='function'){
    try{detail=EUC_DEV291_enrichDetail_(detail,annee,famille,classe)||detail;}catch(e){}
  }
  if(typeof EUC_V51_numeroPeriodes_==='function'){try{detail=EUC_V51_numeroPeriodes_(detail)||detail;}catch(e2){}}
  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  t.config=JSON.stringify({baseUrl:EUC_DEV340_ADMIN_URL_});t.anneeContextJson=JSON.stringify(ctx);t.detailJson=JSON.stringify(detail);
  if(typeof EUC_DEV186_breadcrumbHtml_==='function'){try{t.dev186BreadcrumbHtml=EUC_DEV186_breadcrumbHtml_(detail,annee);}catch(e3){t.dev186BreadcrumbHtml='';}}else t.dev186BreadcrumbHtml='';
  return t.evaluate().setTitle('Suivi PFMP — '+((detail.classe&&detail.classe.nom)||'Classe')).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function EUC_DEV340_familyData_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV340_familyData_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV340_familyData_',Date.now()-__t);
  }
}


function EUC_DEV340_primeAccessIndex_(){
  // EUC_DEV395_CACHE_AWARE_ACCESS_BEGIN
  var __t=Date.now();
  try{
    return EUC_DEV340_accessRows_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_(
      'EUC_DEV340_primeAccessIndex_',
      Date.now()-__t
    );
  }
  // EUC_DEV395_CACHE_AWARE_ACCESS_END
}


function EUC_DEV398_BASE_EUC_DEV340_accessRows_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV340_accessRows_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV340_accessRows_',Date.now()-__t);
  }
}


function EUC_DEV340_enrichConventions_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV340_enrichConventions_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV340_enrichConventions_',Date.now()-__t);
  }
}


function EUC_DEV340_enrichApprentis_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV340_enrichApprentis_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV340_enrichApprentis_',Date.now()-__t);
  }
}


function EUC_DEV340_afficherFamille(){
  EUC_DEV394_begin_('suivi-conventions-famille');
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV340_afficherFamille.apply(this,arguments);
  } finally {
    EUC_DEV394_finish_('EUC_DEV340_afficherFamille',Date.now()-__t);
  }
}

function EUC_DEV340_accessRows_(annee){
  var __t=Date.now();
  try{
    var y=String(annee||'').trim();
    if(y){
      var persisted=EUC_DEV398_getPersistentAccess_(y);
      if(persisted)return persisted;
    }
    var rows=EUC_DEV398_BASE_EUC_DEV340_accessRows_.apply(this,arguments);
    if(y&&Array.isArray(rows))EUC_DEV398_putPersistentAccess_(y,rows);
    return rows;
  } finally {
    EUC_DEV394_mark_('EUC_DEV340_accessRows_',Date.now()-__t);
  }
}
