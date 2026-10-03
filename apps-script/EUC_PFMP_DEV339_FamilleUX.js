/** PFMP — v1.0.0-dev.339 */
function EUC_DEV339_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV339_year_(e){var y=EUC_DEV339_txt_(e&&e.parameter&&e.parameter.annee);if(y)return y;var c=EUC_PFMP_contexteAnneeLectureV155_();return EUC_DEV339_txt_(c&&c.active);}

/* DEV421 — lecture réellement "snapshot first".
 * G1 enrichit le snapshot avec plusieurs tables métier à chaque affichage.
 * Pour la grille des classes, le payload persistant contient déjà toutes les
 * données nécessaires ; on le lit donc sans recalcul et on le garde 5 minutes
 * en cache Apps Script. Les écritures de snapshot et de situation invalident
 * explicitement cette entrée. */
var EUC_DEV421_FAMILY_TTL_=300;
function EUC_DEV421_familyKey_(annee,famille){
  return 'DEV421_FAMILY_'+EUC_DEV339_txt_(annee)+'_'+EUC_DEV339_txt_(famille).toUpperCase();
}
function EUC_DEV421_familyCacheGet_(annee,famille){
  var raw=null;
  try{raw=CacheService.getScriptCache().get(EUC_DEV421_familyKey_(annee,famille));}catch(e){}
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e2){return null;}
}
function EUC_DEV421_familyCachePut_(annee,famille,data){
  try{
    CacheService.getScriptCache().put(
      EUC_DEV421_familyKey_(annee,famille),JSON.stringify(data),EUC_DEV421_FAMILY_TTL_
    );
  }catch(e){}
  return data;
}
function EUC_DEV421_familyCacheInvalidate_(annee,famille){
  try{CacheService.getScriptCache().remove(EUC_DEV421_familyKey_(annee,famille));}catch(e){}
}
function EUC_DEV421_fastFamilySnapshot_(payload){
  payload=payload||{};
  var annee=EUC_DEV339_txt_(payload.annee),famille=EUC_DEV339_txt_(payload.famille).toUpperCase();
  if(!annee||!famille)throw new Error('DEV421 : année et famille obligatoires.');
  var cached=EUC_DEV421_familyCacheGet_(annee,famille);
  if(cached)return {ok:true,ready:true,payload:cached,source:'CACHE'};
  var rows=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{Annee_scolaire:[annee],Famille:[famille]})||[];
  rows=rows.filter(function(r){return (r.fields||{}).Actif!==false;}).sort(function(a,b){
    return (Date.parse((b.fields||{}).Updated_at||'')||0)-(Date.parse((a.fields||{}).Updated_at||'')||0);
  });
  if(!rows.length)return {ok:true,ready:false,payload:null,source:'SNAPSHOT_ABSENT'};
  var data=null;
  try{data=JSON.parse((rows[0].fields||{}).Payload_JSON||'{}');}catch(e){return {ok:false,ready:false,payload:null,source:'SNAPSHOT_INVALIDE'};}
  EUC_DEV421_familyCachePut_(annee,famille,data);
  return {ok:true,ready:!!data,payload:data,source:'SNAPSHOT'};
}
function EUC_DEV394_BASE_EUC_DEV339_familyData_(annee,famille){
  var data=null;
  /* Le snapshot indexé est précisément la vue de lecture destinée à cette
   * page. Le recalcul APP172 reste le repli de sécurité si le snapshot manque. */
  try{var fast=EUC_DEV421_fastFamilySnapshot_({annee:annee,famille:famille});if(fast&&fast.ready&&fast.payload){data=fast.payload;data.ready=true;data.source='FAST_INDEX';return data;}}catch(e1){}
  try{data=EUC_APP172_chargerFamille({annee:annee,famille:famille})||null;if(data&&Array.isArray(data.classes)&&data.classes.length){data.ready=true;data.source='APP172';return data;}}catch(e2){}
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
