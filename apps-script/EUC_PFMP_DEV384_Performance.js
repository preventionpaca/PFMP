function EUC_DEV384_afficherFamille(e){
  var t0=Date.now();
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var annee=String(e&&e.parameter&&e.parameter.annee?e.parameter.annee:(ctx&&ctx.active||'')).trim();
  var famille=String(e&&e.parameter&&e.parameter.famille?e.parameter.famille:'BACPRO').trim().toUpperCase();
  var key='DEV384_FAMILY_'+annee+'_'+famille;
  var cache=CacheService.getScriptCache(), data=null, raw=null;
  try{raw=cache.get(key);}catch(e1){}
  if(raw){try{data=JSON.parse(raw);}catch(e2){}}
  if(!data){
    var fast=EUC_DEV190G1_fastFamilyIndex({annee:annee,famille:famille});
    data=(fast&&fast.ready&&fast.payload)?fast.payload:{ok:true,ready:false,annee:annee,famille:famille,classes:[]};
    data.ready=!!(fast&&fast.ready&&fast.payload);
    try{cache.put(key,JSON.stringify(data),60);}catch(e3){}
  }
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
  tpl.paramsJson=JSON.stringify({annee:annee,famille:famille});
  tpl.dataJson=JSON.stringify(data||{});
  tpl.baseUrl=ScriptApp.getService().getUrl();
  console.log('[DEV384] famille '+famille+' servie en '+(Date.now()-t0)+' ms');
  return tpl.evaluate()
    .setTitle('Suivi des conventions — '+(famille==='BACPRO'?'BAC PRO':famille))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
