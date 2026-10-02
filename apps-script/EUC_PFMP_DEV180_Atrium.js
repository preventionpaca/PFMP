/** Eucalyptus PFMP — v1.0.0-dev.180 — Atrium cliquable */

function EUC_DEV180_txt_(v){return String(v==null?'':v).trim();}

function EUC_DEV180_afficherHome(e){
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_PublicV180');
  t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  t.requestedYear=JSON.stringify(EUC_DEV180_txt_(e&&e.parameter&&e.parameter.annee));
  return t.evaluate().setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV180_afficherFamille(e){
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_FamilleV180');
  t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  t.paramsJson=JSON.stringify({
    annee:EUC_DEV180_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_DEV180_txt_(e&&e.parameter&&e.parameter.famille)
  });
  return t.evaluate().setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV180_resumeFamilles(payload){
  payload=payload||{};
  var annee=EUC_DEV180_txt_(payload.annee);

  if(typeof EUC_DEV176_resumeFamilles==='function'){
    return EUC_DEV176_resumeFamilles({annee:annee});
  }
  if(typeof EUC_DEV175C_resumePublic==='function'){
    return EUC_DEV175C_resumePublic({annee:annee});
  }

  return ['BACPRO','BTS','CAP'].map(function(f){
    return {
      code:f,
      libelle:f==='BACPRO'?'BAC PRO':f,
      classes:0,effectif:0,apprentis:0,periodes:[]
    };
  });
}

function EUC_DEV180_chargerFamille(payload){
  payload=payload||{};
  var annee=EUC_DEV180_txt_(payload.annee);
  var famille=EUC_DEV180_txt_(payload.famille);

  if(typeof EUC_DEV176_chargerFamille==='function'){
    return EUC_DEV176_chargerFamille({annee:annee,famille:famille});
  }
  if(typeof EUC_APP172_chargerFamille==='function'){
    return EUC_APP172_chargerFamille({annee:annee,famille:famille});
  }
  if(typeof EUC_SUIVI_PUBLIC_chargerFamilleV51==='function'){
    return EUC_SUIVI_PUBLIC_chargerFamilleV51({annee:annee,famille:famille});
  }

  return {
    ok:true,
    annee:annee,
    famille:famille,
    familleLibelle:famille==='BACPRO'?'BAC PRO':famille,
    classes:[]
  };
}

function EUC_DEV180_afficherClasse(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_DEV180_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  var famille=EUC_DEV180_txt_(e&&e.parameter&&e.parameter.famille);

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

  return t.evaluate().setTitle('Point sur les stages — '+(d.classe&&d.classe.nom||'Classe'))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
