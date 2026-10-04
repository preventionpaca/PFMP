var EUC_DEV348_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';
var EUC_DEV348_PUBLIC_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec';
function EUC_DEV348_t(v){return String(v==null?'':v).trim();}
function EUC_DEV394_BASE_EUC_DEV348_y(e){var y=EUC_DEV348_t(e&&e.parameter&&e.parameter.annee);if(y)return y;try{return EUC_DEV348_t(EUC_PFMP_contexteAnneeLectureV155_().active);}catch(err){return '';}}
function EUC_DEV348_summary_(annee){if(typeof EUC_DEV347_summary_==='function')return EUC_DEV347_summary_(annee);return EUC_DEV335_resumeAccueil({annee:annee})||{};}
function EUC_DEV348_resumeAccueil(p){
  p=p||{};
  var annee=EUC_DEV348_t(p.annee);
  /* DEV445 : la consultation publique utilise elle aussi les trois snapshots
   * familiaux déjà calculés. Le repli historique reste disponible si l'index
   * durable n'est pas encore initialisé. */
  return (typeof EUC_DEV445_fastResumeAccueil_==='function'&&EUC_DEV445_fastResumeAccueil_(annee))||EUC_DEV348_summary_(annee);
}
function EUC_DEV348_dashboard(annee){if(typeof EUC_DEV251_dashboardDetails!=='function')throw new Error('Dashboard apprentis indisponible.');return EUC_DEV251_dashboardDetails(annee)||{lists:{}};}
function EUC_DEV348_publicApprentisData(annee,classeId,classeNom){annee=EUC_DEV348_t(annee);classeId=Number(classeId)||0;classeNom=EUC_DEV348_t(classeNom);if(!classeId)return {ok:true,students:[]};var r;if(typeof EUC_DEV190Y_loadApprentis==='function')r=EUC_DEV190Y_loadApprentis(annee,classeId,classeNom);else if(typeof EUC_DEV190V_loadApprentis==='function')r=EUC_DEV190V_loadApprentis(annee,classeId,classeNom);else throw new Error('Chargeur apprentis indisponible.');return {ok:true,students:((r&&r.students)||[]).filter(function(x){return x.apprenti===true;})};}
function EUC_DEV348_getClasses(year){return {classes:EUC_DEV190X_classes_(EUC_DEV348_t(year),false)||[]};}
function EUC_DEV348_family_(a,f){if(typeof EUC_DEV347_family_==='function')return EUC_DEV347_family_(a,f);var q=EUC_DEV190G1_fastFamilyIndex({annee:a,famille:f});return (q&&q.ready&&q.payload)?q.payload:{ok:true,ready:false,annee:a,famille:f,classes:[]};}
function EUC_DEV348_detail_(a,f,c,p){if(typeof EUC_DEV347_detail==='function')return EUC_DEV347_detail(a,f,c,p);var q=EUC_DEV190I_readOne({annee:a,famille:f,classe:c,periode:p});return (q&&q.ready&&q.detail)?q.detail:EUC_SUIVI_CLASSE_detailF18_(a,c,p);}
function EUC_DEV394_BASE_EUC_DEV348_adminSummary(e){var y=EUC_DEV348_y(e),t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_Summary_V348');t.paramsJson=JSON.stringify({annee:y});t.summaryJson=JSON.stringify(typeof EUC_DEV445_cachedResumeAccueil_==='function'?EUC_DEV445_cachedResumeAccueil_(y):null);t.baseUrl=EUC_DEV348_ADMIN_URL_;return t.evaluate().setTitle('Suivi des conventions PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV394_BASE_EUC_DEV348_publicSummary(e){var y=EUC_DEV348_y(e),t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_Summary_V348');t.paramsJson=JSON.stringify({annee:y});t.summaryJson=JSON.stringify(typeof EUC_DEV445_cachedResumeAccueil_==='function'?EUC_DEV445_cachedResumeAccueil_(y):null);t.baseUrl=EUC_DEV348_PUBLIC_URL_;return t.evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV348_publicApprentis(e){var y=EUC_DEV190X_years_(),cur=EUC_DEV348_t(e&&e.parameter&&e.parameter.annee)||EUC_DEV348_t(y.current),years=(y.years||[]).slice();if(cur&&years.indexOf(cur)<0)years.unshift(cur);var t=HtmlService.createTemplateFromFile('Apprentissage_Public_PFMP_V348');t.bootJson=JSON.stringify({currentYear:cur,years:years,classes:EUC_DEV190X_classes_(cur,false)||[]});return t.evaluate().setTitle('Apprentis — consultation').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV394_BASE_EUC_DEV348_publicFamily(e){var a=EUC_DEV348_y(e),f=EUC_DEV348_t(e&&e.parameter&&e.parameter.famille)||'BACPRO',t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_Famille_V348');t.paramsJson=JSON.stringify({annee:a,famille:f});t.dataJson=JSON.stringify(EUC_DEV348_family_(a,f));t.baseUrl=EUC_DEV348_PUBLIC_URL_;return t.evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV394_BASE_EUC_DEV348_publicDetail(e){var a=EUC_DEV348_y(e),f=EUC_DEV348_t(e&&e.parameter&&e.parameter.famille)||'BACPRO',c=Number(e&&e.parameter&&e.parameter.classe)||0,p=Number(e&&e.parameter&&e.parameter.periode)||0,t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Public_V348');t.paramsJson=JSON.stringify({annee:a,famille:f,classe:c,periode:p});t.detailJson=JSON.stringify(EUC_DEV348_detail_(a,f,c,p));t.baseUrl=EUC_DEV348_PUBLIC_URL_;return t.evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}


function EUC_DEV348_y(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV348_y.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV348_y',Date.now()-__t);
  }
}


function EUC_DEV348_adminSummary(){
  EUC_DEV394_begin_('suivi-conventions');
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV348_adminSummary.apply(this,arguments);
  } finally {
    EUC_DEV394_finish_('EUC_DEV348_adminSummary',Date.now()-__t);
  }
}


function EUC_DEV348_publicSummary(){
  EUC_DEV394_begin_('suivi-conventions-public');
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV348_publicSummary.apply(this,arguments);
  } finally {
    EUC_DEV394_finish_('EUC_DEV348_publicSummary',Date.now()-__t);
  }
}


function EUC_DEV348_publicFamily(){
  EUC_DEV394_begin_('suivi-conventions-public-famille');
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV348_publicFamily.apply(this,arguments);
  } finally {
    EUC_DEV394_finish_('EUC_DEV348_publicFamily',Date.now()-__t);
  }
}


function EUC_DEV348_publicDetail(){
  EUC_DEV394_begin_('suivi-pfmp-classe-public');
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV348_publicDetail.apply(this,arguments);
  } finally {
    EUC_DEV394_finish_('EUC_DEV348_publicDetail',Date.now()-__t);
  }
}
