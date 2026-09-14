/** Eucalyptus PFMP — v1.0.0-dev.156-fix4 */
var EUC_V156_TABLE_='EUC_AFFECTATIONS_SUIVI_PFMP';

function EUC_V156_txt_(v){return String(v==null?'':v).trim();}

function EUC_V156_contexteAdmin_(){
  try{
    var ctx=EUC_PFMP_contexteAdmin_();
    return ctx&&ctx.autorise?ctx:null;
  }catch(e){return null;}
}

function EUC_V156_col_(id,label,type){
  return {id:id,fields:{label:label,type:type||'Text'}};
}

function EUC_V156_assurerTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tables.some(function(t){return t.id===EUC_V156_TABLE_;});
  var c=EUC_V156_col_;
  var cols=[
    c('Annee_scolaire','Année scolaire'),
    c('Classe','Classe','Ref:Classes'),
    c('Periode','Période','Ref:Planning_Periodes'),
    c('Eleve','Élève','Ref:EUC_ELEVES_PFMP'),
    c('Type_suivi','Type suivi'),
    c('Professeur','Professeur','Ref:EUC_PROFESSEURS_PFMP'),
    c('Nom_professeur_snapshot','Nom professeur'),
    c('Email_professeur_snapshot','Email professeur'),
    c('Date_affectation','Date affectation','DateTime'),
    c('Affecte_par','Affecté par'),
    c('Actif','Actif','Bool'),
    c('Date_modification','Date modification','DateTime')
  ];

  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V156_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V156_TABLE_+'/columns').columns||[];
    var have={};
    current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length){
      EUC_ENT_grist('post','/tables/'+EUC_V156_TABLE_+'/columns',{columns:missing});
    }
  }
  return true;
}

function INSTALLER_DEV156_AFFECTATIONS(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V156_assurerTable_();
  return {ok:true,table:EUC_V156_TABLE_};
}

function EUC_V156_professeurs_(){
  return EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP')
    .filter(function(p){return p.Actif!==false;})
    .map(function(p){
      return {
        id:Number(p.id),
        nom:[p.Civilite,p.Prenom,p.Nom].filter(Boolean).join(' '),
        email:EUC_V156_txt_(p.Email),
        discipline:EUC_V156_txt_(p.Discipline)
      };
    })
    .filter(function(p){return p.id&&p.nom;})
    .sort(function(a,b){return a.nom.localeCompare(b.nom,'fr');});
}

function EUC_V156_affectations_(annee,classeId,periodeId){
  try{EUC_V156_assurerTable_();}catch(e){return [];}
  return EUC_IMPORT_lireRecords_(EUC_V156_TABLE_).filter(function(r){
    return r.Actif!==false &&
      EUC_V156_txt_(r.Annee_scolaire)===EUC_V156_txt_(annee) &&
      Number(EUC_PFMP_ref_(r.Classe))===Number(classeId) &&
      Number(EUC_PFMP_ref_(r.Periode))===Number(periodeId);
  });
}

function EUC_SUIVI_CLASSE_detailV156(codeAnnee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV155(codeAnnee,classeId,periodeId);
  var profs=EUC_V156_professeurs_();
  var affect=EUC_V156_affectations_(d.annee,d.classe.id,d.periode?d.periode.id:0);
  var by={};

  affect.forEach(function(a){
    var eid=Number(EUC_PFMP_ref_(a.Eleve));
    var type=EUC_V156_txt_(a.Type_suivi).toUpperCase();
    if(eid>0&&type)by[eid+'|'+type]=a;
  });

  d.lignes=(d.lignes||[]).map(function(x){
    var tel=by[x.eleveId+'|TELEPHONE'];
    var vis=by[x.eleveId+'|VISITE'];
    x.professeurTelephone=tel?EUC_V156_txt_(tel.Nom_professeur_snapshot):'';
    x.professeurTelephoneId=tel?Number(EUC_PFMP_ref_(tel.Professeur)):0;
    x.professeurVisiteur=vis?EUC_V156_txt_(vis.Nom_professeur_snapshot):'';
    x.professeurVisiteurId=vis?Number(EUC_PFMP_ref_(vis.Professeur)):0;
    return x;
  });

  d.professeursDisponibles=profs;
  d.peutModifier=!!EUC_V156_contexteAdmin_();
  return d;
}

function EUC_SUIVI_AFFECTER_V156(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  var annee=EUC_V156_txt_(payload.annee);
  var classeId=Number(payload.classeId);
  var periodeId=Number(payload.periodeId);
  var type=EUC_V156_txt_(payload.type).toUpperCase();
  var profId=Number(payload.profId);
  var eleveIds=(payload.eleveIds||[]).map(Number).filter(function(x){return x>0;});

  if(!annee)throw new Error('Année scolaire absente.');
  if(!(classeId>0))throw new Error('Classe invalide.');
  if(!(periodeId>0))throw new Error('Période invalide.');
  if(['TELEPHONE','VISITE'].indexOf(type)<0)throw new Error('Type de suivi invalide.');
  if(!(profId>0))throw new Error('Professeur invalide.');
  if(!eleveIds.length)throw new Error('Aucun élève sélectionné.');

  EUC_V156_assurerTable_();

  var prof=EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP').filter(function(p){
    return Number(p.id)===profId&&p.Actif!==false;
  })[0];
  if(!prof)throw new Error('Professeur introuvable.');

  var profNom=[prof.Civilite,prof.Prenom,prof.Nom].filter(Boolean).join(' ');
  var profMail=EUC_V156_txt_(prof.Email);
  var now=new Date().toISOString();
  var existing=EUC_IMPORT_lireRecords_(EUC_V156_TABLE_);

  eleveIds.forEach(function(eid){
    var ex=existing.filter(function(r){
      return r.Actif!==false &&
        EUC_V156_txt_(r.Annee_scolaire)===annee &&
        Number(EUC_PFMP_ref_(r.Classe))===classeId &&
        Number(EUC_PFMP_ref_(r.Periode))===periodeId &&
        Number(EUC_PFMP_ref_(r.Eleve))===eid &&
        EUC_V156_txt_(r.Type_suivi).toUpperCase()===type;
    })[0];

    var fields={
      Annee_scolaire:annee,
      Classe:classeId,
      Periode:periodeId,
      Eleve:eid,
      Type_suivi:type,
      Professeur:profId,
      Nom_professeur_snapshot:profNom,
      Email_professeur_snapshot:profMail,
      Date_affectation:now,
      Affecte_par:ctx.email||'',
      Actif:true,
      Date_modification:now
    };

    if(ex){
      EUC_ENT_grist('patch','/tables/'+EUC_V156_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});
    }else{
      EUC_ENT_grist('post','/tables/'+EUC_V156_TABLE_+'/records',{records:[{fields:fields}]});
    }
  });

  return EUC_SUIVI_CLASSE_detailV156(annee,classeId,periodeId);
}
