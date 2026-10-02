/**
 * Eucalyptus PFMP — DEV.189
 * Architecture :
 * - le wrapper GitHub possède le titre, le sélecteur d'année et le fil d'Ariane ;
 * - les pages Apps Script ne peuvent donc plus cacher ces contrôles ;
 * - les pages internes postent leurs métadonnées au wrapper ;
 * - le détail reste progressif.
 */

function EUC_DEV189_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV189_afficherHome(e){
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_PublicV189');
  t.paramsJson=JSON.stringify({
    annee:EUC_DEV189_txt_(e&&e.parameter&&e.parameter.annee)
  });

  return t.evaluate()
    .setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV189_afficherFamille(e){
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_FamilleV189');

  t.paramsJson=JSON.stringify({
    annee:EUC_DEV189_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_DEV189_txt_(e&&e.parameter&&e.parameter.famille)
  });

  return t.evaluate()
    .setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV189_afficherClasse(e){
  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_PublicV189');

  t.paramsJson=JSON.stringify({
    annee:EUC_DEV189_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_DEV189_txt_(e&&e.parameter&&e.parameter.famille),
    classe:Number(e&&e.parameter&&e.parameter.classe)||0,
    periode:Number(e&&e.parameter&&e.parameter.periode)||0
  });

  return t.evaluate()
    .setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV189_resumeFamille(payload){
  if(typeof EUC_DEV186_resumeFamille==='function'){
    return EUC_DEV186_resumeFamille(payload||{});
  }
  if(typeof EUC_DEV185_resumeFamille==='function'){
    return EUC_DEV185_resumeFamille(payload||{});
  }
  return {
    code:EUC_DEV189_txt_(payload&&payload.famille),
    libelle:EUC_DEV189_txt_(payload&&payload.famille),
    classes:0,effectif:0,apprentis:0,periodes:[]
  };
}

function EUC_DEV189_chargerFamille(payload){
  if(typeof EUC_DEV186_chargerFamille==='function'){
    return EUC_DEV186_chargerFamille(payload||{});
  }
  if(typeof EUC_DEV185_chargerFamille==='function'){
    return EUC_DEV185_chargerFamille(payload||{});
  }
  return {
    ok:true,
    annee:EUC_DEV189_txt_(payload&&payload.annee),
    famille:EUC_DEV189_txt_(payload&&payload.famille),
    classes:[]
  };
}

function EUC_DEV189_getPublicDetail(payload){
  payload=payload||{};

  var annee=EUC_DEV189_txt_(payload.annee);
  var famille=EUC_DEV189_txt_(payload.famille);
  var classe=Number(payload.classe)||0;
  var periode=Number(payload.periode)||0;

  if(!annee||!classe||!periode){
    throw new Error('Année, classe ou période manquante.');
  }

  var t0=Date.now();
  var d;

  if(typeof EUC_DEV185_detail_==='function'){
    d=EUC_DEV185_detail_(annee,classe,periode);
  }else{
    d=EUC_SUIVI_CLASSE_detailF18_(annee,classe,periode);
  }

  var periods=[];
  try{
    var fam=EUC_DEV189_chargerFamille({
      annee:annee,
      famille:famille
    });

    var c=(fam.classes||[]).filter(function(x){
      return Number(x.classeId)===classe;
    })[0];

    periods=(c&&c.periodes)||[];
  }catch(e){}

  return {
    ok:true,
    detail:d,
    periodes:periods,
    totalMs:Date.now()-t0
  };
}
