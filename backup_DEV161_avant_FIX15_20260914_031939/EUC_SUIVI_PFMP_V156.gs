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

function EUC_SUIVI_CLASSE_detailV161(codeAnnee,classeId,periodeId){
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
  var detail=EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId);
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);
  return tpl.evaluate().setTitle('Suivi PFMP — '+detail.classe.nom).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
