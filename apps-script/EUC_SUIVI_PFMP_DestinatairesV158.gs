/** Eucalyptus PFMP — v1.0.0-dev.159
 * Destinataires + périmètres établissement/filière.
 */

var EUC_V158_TABLE_='EUC_DESTINATAIRES_ENVOIS_PFMP';
var EUC_V159_CLASSES_TABLE_='EUC_PERIMETRES_CLASSES_PFMP';

var EUC_V158_SEED_=[
  {code:'PROVISEUR',fonction:'Proviseur',legacy:'SUIVI_PFMP_CC_PROVISEUR',etab:'TOUS'},
  {code:'PROVISEUR_ADJOINT_LGT',fonction:'Proviseur adjoint — lycée général et technologique',legacy:'SUIVI_PFMP_CC_PROVISEUR_ADJOINT_LGT',etab:'LGT'},
  {code:'RESPONSABLE_LP',fonction:'Proviseur / responsable — lycée professionnel',legacy:'SUIVI_PFMP_CC_PROVISEUR_LP',etab:'LP'},
  {code:'RESTAURATION',fonction:'Responsable du service de restauration',legacy:'SUIVI_PFMP_CC_RESTAURATION',etab:'TOUS'},
  {code:'SECRETAIRE_GENERAL',fonction:'Secrétaire général',legacy:'SUIVI_PFMP_CC_SECRETAIRE_GENERAL',etab:'TOUS'},
  {code:'BUREAU_ENTREPRISES',fonction:'Responsable du bureau des entreprises',legacy:'SUIVI_PFMP_CC_BUREAU_ENTREPRISES',etab:'TOUS'},
  {code:'CPE_LP',fonction:'CPE vie scolaire — lycée professionnel',legacy:'SUIVI_PFMP_CC_CPE_LP',etab:'LP'},
  {code:'CPE_LGT_1',fonction:'CPE vie scolaire — lycée général et technologique 1',legacy:'SUIVI_PFMP_CC_CPE_LGT_1',etab:'LGT'},
  {code:'CPE_LGT_2',fonction:'CPE vie scolaire — lycée général et technologique 2',legacy:'SUIVI_PFMP_CC_CPE_LGT_2',etab:'LGT'},
  {code:'DDFPT_NUMERIQUE',fonction:'DDFPT — filières du numérique',legacy:'SUIVI_PFMP_CC_DDFPT_NUMERIQUE',etab:'TOUS'},
  {code:'DDFPT_MECANIQUE',fonction:'DDFPT — filières mécaniques',legacy:'SUIVI_PFMP_CC_DDFPT_MECANIQUE',etab:'TOUS'},
  {code:'ASSISTANTE_DDFPT',fonction:'Assistante DDFPT',legacy:'SUIVI_PFMP_CC_ASSISTANTE_DDFPT',etab:'TOUS'}
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
    c('Perimetre_etablissement','Périmètre établissement'),
    c('Filieres_JSON','Filières concernées'),
    c('Ordre','Ordre','Int')
  ];

  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V158_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V158_TABLE_+'/columns').columns||[];
    var have={}; current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_V158_TABLE_+'/columns',{columns:missing});
  }
  return true;
}

function EUC_V159_assurerTableClasses_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tables.some(function(t){return t.id===EUC_V159_CLASSES_TABLE_;});
  var c=EUC_V158_col_;
  var cols=[
    c('Classe','Classe','Ref:Classes'),
    c('Libelle_classe','Libellé classe'),
    c('Etablissement','Établissement'),
    c('Filiere','Filière'),
    c('Actif','Actif','Bool'),
    c('Ordre','Ordre','Int')
  ];

  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V159_CLASSES_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V159_CLASSES_TABLE_+'/columns').columns||[];
    var have={}; current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_V159_CLASSES_TABLE_+'/columns',{columns:missing});
  }
  return true;
}

function EUC_V159_classeLabel_(r){
  return EUC_V158_txt_(r.Nom||r.Classe||r.Libelle||r.Code||r.Label||('Classe '+r.id));
}

function EUC_V159_guessEtab_(r){
  var raw=EUC_V158_txt_(r.Etablissement||r.Type_etablissement||r.Structure||r.Site).toUpperCase();
  if(raw.indexOf('PROF')>=0||raw==='LP')return 'LP';
  if(raw.indexOf('GENERAL')>=0||raw.indexOf('GÉNÉRAL')>=0||raw.indexOf('TECHNO')>=0||raw==='LGT')return 'LGT';
  return '';
}

function EUC_V159_guessFiliere_(r){
  return EUC_V158_txt_(r.Filiere||r['Filière']||r.Formation||r.Diplome||r['Diplôme']||r.Libelle_diplome||r.Diplome_libelle);
}

function EUC_V159_assurerClasses_(){
  EUC_V159_assurerTableClasses_();

  var mapRows=EUC_IMPORT_lireRecords_(EUC_V159_CLASSES_TABLE_);
  var byClasse={};
  mapRows.forEach(function(r){
    var cid=Number(EUC_PFMP_ref_(r.Classe));
    if(cid)byClasse[cid]=r;
  });

  var classes=EUC_IMPORT_lireRecords_('Classes');
  classes.forEach(function(r,i){
    var id=Number(r.id);
    if(!id||byClasse[id])return;

    EUC_ENT_grist('post','/tables/'+EUC_V159_CLASSES_TABLE_+'/records',{
      records:[{fields:{
        Classe:id,
        Libelle_classe:EUC_V159_classeLabel_(r),
        Etablissement:EUC_V159_guessEtab_(r),
        Filiere:EUC_V159_guessFiliere_(r),
        Actif:true,
        Ordre:i+1
      }}]
    });
  });

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
  var byCode={}; rows.forEach(function(r){byCode[EUC_V158_txt_(r.Code)]=r;});
  var legacy=EUC_V158_legacyMap_();

  EUC_V158_SEED_.forEach(function(seed,i){
    if(byCode[seed.code]){
      if(!EUC_V158_txt_(byCode[seed.code].Perimetre_etablissement)){
        EUC_ENT_grist('patch','/tables/'+EUC_V158_TABLE_+'/records',{
          records:[{id:byCode[seed.code].id,fields:{Perimetre_etablissement:seed.etab||'TOUS'}}]
        });
      }
      return;
    }

    var email='',actif=false;
    try{
      email=EUC_V158_txt_(legacy[seed.legacy+'_EMAIL']&&legacy[seed.legacy+'_EMAIL'].Valeur);
      actif=EUC_V158_bool_(legacy[seed.legacy+'_ACTIF']&&legacy[seed.legacy+'_ACTIF'].Valeur);
    }catch(e){}

    EUC_ENT_grist('post','/tables/'+EUC_V158_TABLE_+'/records',{
      records:[{fields:{
        Code:seed.code,Fonction:seed.fonction,Nom:'',Email:email,
        Actif:true,TABLEAUX_SUIVI:actif,
        Perimetre_etablissement:seed.etab||'TOUS',
        Filieres_JSON:'[]',
        Ordre:i+1
      }}]
    });
  });

  return true;
}

function EUC_V159_parseFilieres_(raw){
  raw=EUC_V158_txt_(raw);
  if(!raw)return [];
  try{
    var a=JSON.parse(raw);
    return Array.isArray(a)?a.map(EUC_V158_txt_).filter(Boolean):[];
  }catch(e){
    return raw.split(',').map(EUC_V158_txt_).filter(Boolean);
  }
}

function EUC_V159_catalogueClasses_(){
  EUC_V159_assurerClasses_();
  return EUC_IMPORT_lireRecords_(EUC_V159_CLASSES_TABLE_)
    .map(function(r){
      return {
        id:Number(r.id),
        classeId:Number(EUC_PFMP_ref_(r.Classe)),
        classe:EUC_V158_txt_(r.Libelle_classe),
        etablissement:EUC_V158_txt_(r.Etablissement).toUpperCase(),
        filiere:EUC_V158_txt_(r.Filiere),
        actif:r.Actif!==false,
        ordre:Number(r.Ordre)||999
      };
    })
    .sort(function(a,b){return a.ordre-b.ordre||a.classe.localeCompare(b.classe,'fr');});
}

function EUC_V159_filieresCatalogue_(){
  var set={};
  EUC_V159_catalogueClasses_().forEach(function(x){
    if(x.actif&&x.filiere)set[x.filiere]=true;
  });
  return Object.keys(set).sort(function(a,b){return a.localeCompare(b,'fr');});
}

function INSTALLER_DEV159_PERIMETRES(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V158_assurerLignes_();
  EUC_V159_assurerClasses_();
  return {ok:true};
}

function EUC_V158_lire(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  EUC_V158_assurerLignes_();
  EUC_V159_assurerClasses_();

  var lignes=EUC_IMPORT_lireRecords_(EUC_V158_TABLE_).map(function(r){
    return {
      id:Number(r.id),
      code:EUC_V158_txt_(r.Code),
      fonction:EUC_V158_txt_(r.Fonction),
      nom:EUC_V158_txt_(r.Nom),
      email:EUC_V158_txt_(r.Email),
      actif:r.Actif!==false,
      tableauxSuivi:EUC_V158_bool_(r.TABLEAUX_SUIVI),
      etablissement:EUC_V158_txt_(r.Perimetre_etablissement).toUpperCase()||'TOUS',
      filieres:EUC_V159_parseFilieres_(r.Filieres_JSON),
      ordre:Number(r.Ordre)||999
    };
  }).sort(function(a,b){return a.ordre-b.ordre||a.fonction.localeCompare(b.fonction,'fr');});

  return {
    lignes:lignes,
    classes:EUC_V159_catalogueClasses_(),
    filieres:EUC_V159_filieresCatalogue_()
  };
}

function EUC_V158_sauver(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  EUC_V158_assurerLignes_();
  EUC_V159_assurerClasses_();

  var current=EUC_IMPORT_lireRecords_(EUC_V158_TABLE_);
  var byId={}; current.forEach(function(r){byId[Number(r.id)]=r;});

  (payload.lignes||[]).forEach(function(x){
    var id=Number(x.id);
    if(!id||!byId[id])return;

    var etab=EUC_V158_txt_(x.etablissement).toUpperCase();
    if(['TOUS','LP','LGT'].indexOf(etab)<0)etab='TOUS';

    EUC_ENT_grist('patch','/tables/'+EUC_V158_TABLE_+'/records',{
      records:[{id:id,fields:{
        Nom:EUC_V158_txt_(x.nom),
        Email:EUC_V158_txt_(x.email),
        Actif:x.actif!==false,
        TABLEAUX_SUIVI:x.tableauxSuivi===true,
        Perimetre_etablissement:etab,
        Filieres_JSON:JSON.stringify((x.filieres||[]).map(EUC_V158_txt_).filter(Boolean))
      }}]
    });
  });

  var classRows=EUC_IMPORT_lireRecords_(EUC_V159_CLASSES_TABLE_);
  var byClassRow={}; classRows.forEach(function(r){byClassRow[Number(r.id)]=r;});

  (payload.classes||[]).forEach(function(x){
    var id=Number(x.id);
    if(!id||!byClassRow[id])return;

    var etab=EUC_V158_txt_(x.etablissement).toUpperCase();
    if(['','LP','LGT'].indexOf(etab)<0)etab='';

    EUC_ENT_grist('patch','/tables/'+EUC_V159_CLASSES_TABLE_+'/records',{
      records:[{id:id,fields:{
        Etablissement:etab,
        Filiere:EUC_V158_txt_(x.filiere),
        Actif:x.actif!==false
      }}]
    });
  });

  return EUC_V158_lire();
}

function EUC_V159_scopeClasse_(detail){
  EUC_V159_assurerClasses_();
  var cid=Number(detail&&detail.classe&&detail.classe.id);
  var row=EUC_IMPORT_lireRecords_(EUC_V159_CLASSES_TABLE_).filter(function(r){
    return Number(EUC_PFMP_ref_(r.Classe))===cid;
  })[0];

  return {
    etablissement:row?EUC_V158_txt_(row.Etablissement).toUpperCase():'',
    filiere:row?EUC_V158_txt_(row.Filiere):''
  };
}

function EUC_V158_ccMails_(detail){
  try{
    EUC_V158_assurerLignes_();
    EUC_V159_assurerClasses_();
  }catch(e){return [];}

  var scope=EUC_V159_scopeClasse_(detail);
  var set={};

  EUC_IMPORT_lireRecords_(EUC_V158_TABLE_).forEach(function(r){
    if(r.Actif===false)return;
    if(!EUC_V158_bool_(r.TABLEAUX_SUIVI))return;

    var etab=EUC_V158_txt_(r.Perimetre_etablissement).toUpperCase()||'TOUS';
    if(etab!=='TOUS' && etab!==scope.etablissement)return;

    var filieres=EUC_V159_parseFilieres_(r.Filieres_JSON);
    if(filieres.length && filieres.indexOf(scope.filiere)<0)return;

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

  return tpl.evaluate()
    .setTitle('Destinataires & envois PFMP')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
