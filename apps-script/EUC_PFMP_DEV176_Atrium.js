/** Eucalyptus PFMP — v1.0.0-dev.176 — parcours Atrium lecture seule complet */

function EUC_DEV176_txt_(v){return String(v==null?'':v).trim();}

function EUC_DEV176_afficherHome(e){
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_PublicV176');
  t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  t.requestedYear=JSON.stringify(EUC_DEV176_txt_(e&&e.parameter&&e.parameter.annee));
  return t.evaluate()
    .setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV176_afficherFamille(e){
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_FamilleV176');
  t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  t.paramsJson=JSON.stringify({
    annee:EUC_DEV176_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_DEV176_txt_(e&&e.parameter&&e.parameter.famille)
  });
  return t.evaluate()
    .setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV176_afficherClasse(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_DEV176_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  var famille=EUC_DEV176_txt_(e&&e.parameter&&e.parameter.famille);

  if(!classeId||!periodeId)throw new Error('Classe ou période manquante.');

  var d=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);

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

  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_PublicV176');
  t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  t.detailJson=JSON.stringify(d);
  t.famille=JSON.stringify(famille);

  return t.evaluate()
    .setTitle('Point sur les stages — '+(d.classe&&d.classe.nom||'Classe'))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV176_resumeFamilles(payload){
  payload=payload||{};
  var annee=EUC_DEV176_txt_(payload.annee);

  return ['BACPRO','BTS','CAP'].map(function(f){
    var r=null;
    if(typeof EUC_APP172_resumeFamille==='function'){
      try{r=EUC_APP172_resumeFamille({annee:annee,famille:f});}catch(e){}
    }
    if(!r && typeof EUC_SUIVI_PUBLIC_resumeFamilleV51==='function'){
      try{r=EUC_SUIVI_PUBLIC_resumeFamilleV51({annee:annee,famille:f});}catch(e){}
    }
    if(!r)r={code:f,libelle:f==='BACPRO'?'BAC PRO':f,classes:0,effectif:0,apprentis:0,periodes:[]};
    r.code=f;
    r.libelle=f==='BACPRO'?'BAC PRO':f;
    if(r.apprentis==null)r.apprentis=0;
    return r;
  });
}

function EUC_DEV176_chargerFamille(payload){
  payload=payload||{};
  var annee=EUC_DEV176_txt_(payload.annee);
  var famille=EUC_DEV176_txt_(payload.famille);

  var r=null;
  if(typeof EUC_APP172_chargerFamille==='function'){
    try{r=EUC_APP172_chargerFamille({annee:annee,famille:famille});}catch(e){}
  }
  if(!r && typeof EUC_SUIVI_PUBLIC_chargerFamilleV51==='function'){
    r=EUC_SUIVI_PUBLIC_chargerFamilleV51({annee:annee,famille:famille});
  }
  return r||{ok:true,annee:annee,famille:famille,familleLibelle:famille==='BACPRO'?'BAC PRO':famille,classes:[]};
}
