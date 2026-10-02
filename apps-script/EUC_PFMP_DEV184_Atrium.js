/** Eucalyptus PFMP — v1.0.0-dev.184 */

function EUC_DEV184_txt_(v){return String(v==null?'':v).trim();}

function EUC_DEV184_afficherHome(e){
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_PublicV184');
  t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  t.requestedYear=JSON.stringify(EUC_DEV184_txt_(e&&e.parameter&&e.parameter.annee));
  return t.evaluate().setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV184_afficherFamille(e){
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_FamilleV184');
  t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  t.paramsJson=JSON.stringify({
    annee:EUC_DEV184_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_DEV184_txt_(e&&e.parameter&&e.parameter.famille)
  });
  return t.evaluate().setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV184_afficherClasse(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_DEV184_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  var famille=EUC_DEV184_txt_(e&&e.parameter&&e.parameter.famille);

  if(!classeId||!periodeId)throw new Error('Classe ou période manquante.');

  var cache=CacheService.getScriptCache();
  var key='DEV184_PUBLIC_DETAIL_'+annee+'_'+classeId+'_'+periodeId;
  var d=null;
  var got=cache.get(key);

  if(got){
    try{d=JSON.parse(got);}catch(e){}
  }

  if(!d){
    d=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);

    if(typeof EUC_V50_enrichirDetail_==='function'){
      d=EUC_V50_enrichirDetail_(d,annee,classeId,periodeId);
    }
    if(typeof EUC_V51_numeroPeriodes_==='function'){
      d=EUC_V51_numeroPeriodes_(d);
    }
    if(typeof EUC_APP172_enrichirDetail==='function'){
      d=EUC_APP172_enrichirDetail(d);
    }
    if(typeof EUC_DEV174_enrichirDetail_==='function'){
      d=EUC_DEV174_enrichirDetail_(d,annee);
    }

    try{cache.put(key,JSON.stringify(d),120);}catch(e){}
  }

  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_PublicV184');
  t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  t.detailJson=JSON.stringify(d);
  t.famille=JSON.stringify(famille);

  return t.evaluate().setTitle('Point sur les stages — '+(d.classe&&d.classe.nom||'Classe'))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV184_resumeFamilles(payload){
  payload=payload||{};
  if(typeof EUC_DEV176_resumeFamilles==='function'){
    return EUC_DEV176_resumeFamilles(payload);
  }
  if(typeof EUC_DEV175C_resumePublic==='function'){
    return EUC_DEV175C_resumePublic(payload);
  }
  return [];
}

function EUC_DEV184_chargerFamille(payload){
  payload=payload||{};
  var annee=EUC_DEV184_txt_(payload.annee);
  var famille=EUC_DEV184_txt_(payload.famille);

  var cache=CacheService.getScriptCache();
  var key='DEV184_PUBLIC_FAMILY_'+annee+'_'+famille;
  var got=cache.get(key);
  if(got){
    try{return JSON.parse(got);}catch(e){}
  }

  var r=null;

  if(typeof EUC_DEV176_chargerFamille==='function'){
    try{r=EUC_DEV176_chargerFamille({annee:annee,famille:famille});}catch(e){}
  }
  if(!r && typeof EUC_APP172_chargerFamille==='function'){
    try{r=EUC_APP172_chargerFamille({annee:annee,famille:famille});}catch(e){}
  }
  if(!r && typeof EUC_SUIVI_PUBLIC_chargerFamilleV51==='function'){
    r=EUC_SUIVI_PUBLIC_chargerFamilleV51({annee:annee,famille:famille});
  }

  if(!r){
    r={
      ok:true,annee:annee,famille:famille,
      familleLibelle:famille==='BACPRO'?'BAC PRO':famille,
      classes:[]
    };
  }

  try{cache.put(key,JSON.stringify(r),180);}catch(e){}
  return r;
}
