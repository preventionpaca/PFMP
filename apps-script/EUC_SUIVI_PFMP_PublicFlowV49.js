/** Eucalyptus PFMP — v1.0.0-dev.169 — shell immédiat + synthèses paresseuses. */

function EUC_V49_txt_(v){return String(v==null?'':v).trim();}

function EUC_SUIVI_PUBLIC_afficherFamillesV49(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_FamillesV49');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.requestedYear=JSON.stringify(EUC_V49_txt_(e&&e.parameter&&e.parameter.annee));
  return tpl.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_PUBLIC_resumeFamilleV49(payload){
  payload=payload||{};
  var annee=EUC_V49_txt_(payload.annee);
  var famille=EUC_V49_txt_(payload.famille);
  if(!annee||!famille)throw new Error('Année ou famille manquante.');

  var cache=CacheService.getScriptCache();
  var key='EUC_V49_FAM_'+annee+'_'+famille;
  var cached=cache.get(key);
  if(cached){
    try{return JSON.parse(cached);}catch(e){}
  }

  var all=EUC_V47_familySummary_(annee)||[];
  var f=all.filter(function(x){return x.code===famille;})[0]||{
    code:famille,
    libelle:EUC_V47_familyLabel_(famille),
    classes:0,
    effectif:0,
    periodes:[]
  };

  try{cache.put(key,JSON.stringify(f),300);}catch(e){}
  return f;
}

function EUC_SUIVI_PUBLIC_afficherFamilleV49(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_FamilleV49');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.paramsJson=JSON.stringify({
    annee:EUC_V49_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_V49_txt_(e&&e.parameter&&e.parameter.famille)
  });
  return tpl.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_PUBLIC_chargerFamilleV49(payload){
  payload=payload||{};
  var annee=EUC_V49_txt_(payload.annee);
  var famille=EUC_V49_txt_(payload.famille);
  if(!annee||!famille)throw new Error('Année ou famille manquante.');

  var cache=CacheService.getScriptCache();
  var key='EUC_V49_CLASSES_'+annee+'_'+famille;
  var cached=cache.get(key);
  if(cached){
    try{return JSON.parse(cached);}catch(e){}
  }

  var out={
    ok:true,
    annee:annee,
    famille:famille,
    familleLibelle:EUC_V47_familyLabel_(famille),
    classes:EUC_V47_familyClasses_(annee,famille)
  };

  try{cache.put(key,JSON.stringify(out),180);}catch(e){}
  return out;
}
