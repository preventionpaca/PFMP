function EUC_DEV226_now_(){ return new Date().getTime(); }

function EUC_DEV226_stage211(annee,classeId,classeNom){
  var t=EUC_DEV226_now_();
  var r=EUC_DEV211_loadApprentis(annee,classeId,classeNom);
  return {ok:true,ms:EUC_DEV226_now_()-t,count:(r.students||[]).length,source:r.source||''};
}

function EUC_DEV226_stage214Cols(){
  var t=EUC_DEV226_now_();
  var r=EUC_DEV214_ensureCols_();
  return {ok:true,ms:EUC_DEV226_now_()-t,result:r};
}

function EUC_DEV226_stage214Latest(){
  var t=EUC_DEV226_now_();
  var r=EUC_DEV214_latestRows_();
  return {ok:true,ms:EUC_DEV226_now_()-t,rows:Object.keys(r.map||{}).length,cols:(r.cols||[]).length};
}

function EUC_DEV226_stage214Loader(annee,classeId,classeNom){
  var t=EUC_DEV226_now_();
  var r=EUC_DEV214_loadApprentis(annee,classeId,classeNom);
  return {ok:true,ms:EUC_DEV226_now_()-t,count:(r.students||[]).length,source:r.source||''};
}

function EUC_DEV226_afficherAudit(e){
  return HtmlService.createHtmlOutputFromFile('Audit_Apprentis_Current_V226')
    .setTitle('Audit apprentis DEV226')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}