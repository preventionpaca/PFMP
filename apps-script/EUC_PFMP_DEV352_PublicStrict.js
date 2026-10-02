var EUC_DEV352_PUBLIC_URL_=
  'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec';

function EUC_DEV352_t_(v){return String(v==null?'':v).trim();}

function EUC_DEV352_y_(e){
  var y=EUC_DEV352_t_(e&&e.parameter&&e.parameter.annee);
  if(y)return y;
  try{return EUC_DEV352_t_(EUC_PFMP_contexteAnneeLectureV155_().active);}
  catch(err){return '';}
}

function EUC_DEV352_summaryData_(annee){
  if(typeof EUC_DEV347_summary_==='function'){
    try{return EUC_DEV347_summary_(annee);}catch(e){}
  }
  if(typeof EUC_DEV342_summary_==='function'){
    try{return EUC_DEV342_summary_(annee);}catch(e2){}
  }
  return EUC_DEV335_resumeAccueil({annee:annee})||{};
}

function EUC_DEV352_familyData_(annee,famille){
  if(typeof EUC_DEV340_familyData_==='function'){
    try{
      var d=EUC_DEV340_familyData_(annee,famille);
      if(d&&d.classes&&d.classes.length)return d;
    }catch(e){}
  }
  if(typeof EUC_DEV190G1_fastFamilyIndex==='function'){
    try{
      var f=EUC_DEV190G1_fastFamilyIndex({annee:annee,famille:famille});
      if(f&&f.ready&&f.payload)return f.payload;
    }catch(e2){}
  }
  return {ok:true,ready:false,annee:annee,famille:famille,classes:[]};
}

function EUC_DEV352_detail_(annee,famille,classe,periode){
  if(typeof EUC_DEV347_buildDetail_==='function'){
    try{return EUC_DEV347_buildDetail_(annee,famille,classe,periode);}catch(e){}
  }
  var r=EUC_DEV190I_readOne({
    annee:annee,famille:famille,classe:classe,periode:periode
  });
  var d=(r&&r.ready&&r.detail)
    ?r.detail
    :EUC_SUIVI_CLASSE_detailF18_(annee,classe,periode);
  if(typeof EUC_DEV340_enrichConventions_==='function'){
    d=EUC_DEV340_enrichConventions_(d,annee,classe,periode);
  }
  if(typeof EUC_DEV340_enrichApprentis_==='function'){
    d=EUC_DEV340_enrichApprentis_(d);
  }
  (d.lignes||[]).forEach(function(x){x.historiqueConventions=[];});
  return d;
}

function EUC_DEV352_dashboard_(annee){
  if(typeof EUC_DEV251_dashboardDetails==='function'){
    return EUC_DEV251_dashboardDetails(annee)||{lists:{}};
  }
  return {lists:{}};
}

function EUC_DEV352_publicAppRows_(annee,classeId,classeNom){
  var r=null;
  if(typeof EUC_DEV190Y_loadApprentis==='function'){
    r=EUC_DEV190Y_loadApprentis(annee,classeId,classeNom);
  }else if(typeof EUC_DEV190V_loadApprentis==='function'){
    r=EUC_DEV190V_loadApprentis(annee,classeId,classeNom);
  }
  return {students:((r&&r.students)||[]).filter(function(x){return x.apprenti===true;})};
}

function EUC_DEV352_bootApp_(){
  var y=EUC_DEV190X_years_();
  var current=EUC_DEV352_t_(y&&y.current);
  return {
    currentYear:current,
    years:(y&&y.years)||[],
    classes:EUC_DEV190X_classes_(current,false)||[]
  };
}

function EUC_DEV352_getClasses_(year){
  return {classes:EUC_DEV190X_classes_(EUC_DEV352_t_(year),false)||[]};
}

function EUC_DEV352_publicSummary(e){
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_Summary_V352');
  t.paramsJson=JSON.stringify({annee:EUC_DEV352_y_(e)});
  t.baseUrl=EUC_DEV352_PUBLIC_URL_;
  return t.evaluate().setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV352_publicFamily(e){
  var annee=EUC_DEV352_y_(e);
  var famille=EUC_DEV352_t_(e&&e.parameter&&e.parameter.famille)||'BACPRO';
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_Famille_V352');
  t.paramsJson=JSON.stringify({annee:annee,famille:famille});
  t.dataJson=JSON.stringify(EUC_DEV352_familyData_(annee,famille));
  t.baseUrl=EUC_DEV352_PUBLIC_URL_;
  return t.evaluate().setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV352_publicDetail(e){
  var annee=EUC_DEV352_y_(e);
  var famille=EUC_DEV352_t_(e&&e.parameter&&e.parameter.famille)||'BACPRO';
  var classe=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periode=Number(e&&e.parameter&&e.parameter.periode)||0;
  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Public_V352');
  t.paramsJson=JSON.stringify({
    annee:annee,famille:famille,classe:classe,periode:periode
  });
  t.detailJson=JSON.stringify(EUC_DEV352_detail_(annee,famille,classe,periode));
  t.baseUrl=EUC_DEV352_PUBLIC_URL_;
  return t.evaluate().setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV352_publicApprentis(e){
  var t=HtmlService.createTemplateFromFile('Apprentissage_Public_PFMP_V352');
  t.bootJson=JSON.stringify(EUC_DEV352_bootApp_());
  t.baseUrl=EUC_DEV352_PUBLIC_URL_;
  return t.evaluate().setTitle('Apprentis — consultation')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
