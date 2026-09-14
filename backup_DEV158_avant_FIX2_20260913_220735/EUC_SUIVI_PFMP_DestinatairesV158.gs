/** Eucalyptus PFMP — v1.0.0-dev.158 */
var EUC_V158_TABLE_='EUC_DESTINATAIRES_ENVOIS_PFMP';

var EUC_V158_SEED_=[
  {code:'PROVISEUR',fonction:'Proviseur',legacy:'SUIVI_PFMP_CC_PROVISEUR'},
  {code:'PROVISEUR_ADJOINT_LGT',fonction:'Proviseur adjoint — lycée général et technologique',legacy:'SUIVI_PFMP_CC_PROVISEUR_ADJOINT_LGT'},
  {code:'RESPONSABLE_LP',fonction:'Proviseur / responsable — lycée professionnel',legacy:'SUIVI_PFMP_CC_PROVISEUR_LP'},
  {code:'RESTAURATION',fonction:'Responsable du service de restauration',legacy:'SUIVI_PFMP_CC_RESTAURATION'},
  {code:'SECRETAIRE_GENERAL',fonction:'Secrétaire général',legacy:'SUIVI_PFMP_CC_SECRETAIRE_GENERAL'},
  {code:'BUREAU_ENTREPRISES',fonction:'Responsable du bureau des entreprises',legacy:'SUIVI_PFMP_CC_BUREAU_ENTREPRISES'},
  {code:'CPE_LP',fonction:'CPE vie scolaire — lycée professionnel',legacy:'SUIVI_PFMP_CC_CPE_LP'},
  {code:'CPE_LGT_1',fonction:'CPE vie scolaire — lycée général et technologique 1',legacy:'SUIVI_PFMP_CC_CPE_LGT_1'},
  {code:'CPE_LGT_2',fonction:'CPE vie scolaire — lycée général et technologique 2',legacy:'SUIVI_PFMP_CC_CPE_LGT_2'},
  {code:'DDFPT_NUMERIQUE',fonction:'DDFPT — filières du numérique',legacy:'SUIVI_PFMP_CC_DDFPT_NUMERIQUE'},
  {code:'DDFPT_MECANIQUE',fonction:'DDFPT — filières mécaniques',legacy:'SUIVI_PFMP_CC_DDFPT_MECANIQUE'},
  {code:'ASSISTANTE_DDFPT',fonction:'Assistante DDFPT',legacy:'SUIVI_PFMP_CC_ASSISTANTE_DDFPT'}
];

function EUC_V158_txt_(v){return String(v==null?'':v).trim();}
function EUC_V158_bool_(v){
  if(v===true)return true;
  var s=EUC_V158_txt_(v).toLowerCase();
  return ['1','true','oui','yes','on'].indexOf(s)>=0;
}
function EUC_V158_col_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}

function EUC_V158_assurerTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tables.some(function(t){return t.id===EUC_V158_TABLE_;});
  var c=EUC_V158_col_;
  var cols=[
    c('Code','Code'),
    c('Fonction','Fonction'),
    c('Nom','Nom'),
    c('Email','Email'),
    c('Actif','Actif','Bool'),
    c('TABLEAUX_SUIVI','Tableaux de suivi PFMP','Bool'),
    c('Ordre','Ordre','Int')
  ];
  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V158_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V158_TABLE_+'/columns').columns||[];
    var have={};current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_V158_TABLE_+'/columns',{columns:missing});
  }
  return true;
}

function EUC_V158_legacyMap_(){
  try{
    if(typeof EUC_V157_paramMap_==='function')return EUC_V157_paramMap_()||{};
  }catch(e){}
  return {};
}

function EUC_V158_assurerLignes_(){
  EUC_V158_assurerTable_();
  var rows=EUC_IMPORT_lireRecords_(EUC_V158_TABLE_);
  var byCode={};rows.forEach(function(r){byCode[EUC_V158_txt_(r.Code)]=r;});
  var legacy=EUC_V158_legacyMap_();

  EUC_V158_SEED_.forEach(function(seed,i){
    if(byCode[seed.code])return;
    var email='',actif=false;
    try{
      email=EUC_V158_txt_(legacy[seed.legacy+'_EMAIL']&&legacy[seed.legacy+'_EMAIL'].Valeur);
      actif=EUC_V158_bool_(legacy[seed.legacy+'_ACTIF']&&legacy[seed.legacy+'_ACTIF'].Valeur);
    }catch(e){}
    EUC_ENT_grist('post','/tables/'+EUC_V158_TABLE_+'/records',{
      records:[{fields:{
        Code:seed.code,Fonction:seed.fonction,Nom:'',Email:email,
        Actif:true,TABLEAUX_SUIVI:actif,Ordre:i+1
      }}]
    });
  });
  return true;
}

function INSTALLER_DEV158_DESTINATAIRES(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V158_assurerLignes_();
  return {ok:true,table:EUC_V158_TABLE_};
}

function EUC_V158_lire(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V158_assurerLignes_();
  return EUC_IMPORT_lireRecords_(EUC_V158_TABLE_).map(function(r){
    return {
      id:Number(r.id),code:EUC_V158_txt_(r.Code),fonction:EUC_V158_txt_(r.Fonction),
      nom:EUC_V158_txt_(r.Nom),email:EUC_V158_txt_(r.Email),actif:r.Actif!==false,
      tableauxSuivi:EUC_V158_bool_(r.TABLEAUX_SUIVI),ordre:Number(r.Ordre)||999
    };
  }).sort(function(a,b){return a.ordre-b.ordre||a.fonction.localeCompare(b.fonction,'fr');});
}

function EUC_V158_sauver(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  payload=payload||{};
  EUC_V158_assurerLignes_();

  var current=EUC_IMPORT_lireRecords_(EUC_V158_TABLE_);
  var byId={};current.forEach(function(r){byId[Number(r.id)]=r;});

  (payload.lignes||[]).forEach(function(x){
    var id=Number(x.id);
    if(!id||!byId[id])return;
    EUC_ENT_grist('patch','/tables/'+EUC_V158_TABLE_+'/records',{
      records:[{id:id,fields:{
        Nom:EUC_V158_txt_(x.nom),
        Email:EUC_V158_txt_(x.email),
        Actif:x.actif!==false,
        TABLEAUX_SUIVI:x.tableauxSuivi===true
      }}]
    });
  });

  return EUC_V158_lire();
}

function EUC_V158_ccMails_(){
  try{EUC_V158_assurerLignes_();}catch(e){return [];}
  var set={};
  EUC_IMPORT_lireRecords_(EUC_V158_TABLE_).forEach(function(r){
    if(r.Actif===false)return;
    if(!EUC_V158_bool_(r.TABLEAUX_SUIVI))return;
    var email=EUC_V158_txt_(r.Email).toLowerCase();
    if(email&&email.indexOf('@')>0)set[email]=true;
  });
  return Object.keys(set);
}

function EUC_V158_afficher(e){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  var tpl=HtmlService.createTemplateFromFile('Destinataires_Envois_PFMP_V158');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.dataJson=JSON.stringify(EUC_V158_lire());
  return tpl.evaluate().setTitle('Destinataires & envois PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
