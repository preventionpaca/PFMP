/**
 * Eucalyptus PFMP — DEV.187
 * La page détail publique est servie immédiatement.
 * Les données lourdes sont chargées ensuite via google.script.run.
 */

function EUC_DEV187_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV187_afficherPublicClasse(e){
  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_PublicV187');

  t.paramsJson=JSON.stringify({
    annee:EUC_DEV187_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_DEV187_txt_(e&&e.parameter&&e.parameter.famille),
    classe:Number(e&&e.parameter&&e.parameter.classe)||0,
    periode:Number(e&&e.parameter&&e.parameter.periode)||0
  });

  return t.evaluate()
    .setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV187_getPublicDetail(payload){
  payload=payload||{};

  var annee=EUC_DEV187_txt_(payload.annee);
  var classe=Number(payload.classe)||0;
  var periode=Number(payload.periode)||0;

  if(!annee||!classe||!periode){
    throw new Error('Année, classe ou période manquante.');
  }

  var t0=Date.now();
  var d=EUC_DEV185_detail_(annee,classe,periode);

  return {
    ok:true,
    detail:d,
    totalMs:Date.now()-t0,
    cacheHit:!!(d&&d.__cacheHit===true)
  };
}
