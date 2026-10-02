/** PFMP — v1.0.0-dev.339 */
function EUC_DEV339_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV339_year_(e){var y=EUC_DEV339_txt_(e&&e.parameter&&e.parameter.annee);if(y)return y;var c=EUC_PFMP_contexteAnneeLectureV155_();return EUC_DEV339_txt_(c&&c.active);}
function EUC_DEV394_BASE_EUC_DEV339_familyData_(annee,famille){
  var data=null;
  try{data=EUC_APP172_chargerFamille({annee:annee,famille:famille})||null;if(data&&Array.isArray(data.classes)&&data.classes.length){data.ready=true;data.source='APP172';return data;}}catch(e1){}
  try{var fast=EUC_DEV190G1_fastFamilyIndex({annee:annee,famille:famille});if(fast&&fast.ready&&fast.payload){data=fast.payload;data.ready=true;data.source='FAST_INDEX';return data;}}catch(e2){}
  return {ok:true,ready:false,annee:annee,famille:famille,classes:[],source:'NONE'};
}
function EUC_DEV339_afficherFamille(e){
  var annee=EUC_DEV339_year_(e),famille=EUC_DEV339_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO',data=EUC_DEV339_familyData_(annee,famille);
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
  t.paramsJson=JSON.stringify({annee:annee,famille:famille});t.dataJson=JSON.stringify(data||{});t.baseUrl='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';
  return t.evaluate().setTitle('Suivi des conventions — '+(famille==='BACPRO'?'BAC PRO':famille)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function EUC_DEV339_familyData_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV339_familyData_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV339_familyData_',Date.now()-__t);
  }
}
