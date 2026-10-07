function EUC_DEV190X_currentYear_(){
  var d=new Date(), y=d.getFullYear();
  return d.getMonth()>=8 ? y+'-'+(y+1) : (y-1)+'-'+y;
}

function EUC_DEV190X_years_(){
  var current=EUC_DEV190X_currentYear_();
  var years=[current];

  if(typeof EUC_DEV190R_getYears==='function'){
    try{
      var r=EUC_DEV190R_getYears();
      (r.annees||[]).forEach(function(v){
        if(years.indexOf(v)<0) years.push(v);
      });
    }catch(e){}
  }

  years.sort(function(a,b){
    return String(b).localeCompare(String(a),'fr');
  });

  return {current:current,years:years};
}

function EUC_DEV190X_classes_(annee,terminalOnly){
  if(typeof EUC_DEV190R_getPageStructure==='function'){
    var r=EUC_DEV190R_getPageStructure(annee,!!terminalOnly);
    return r.classes||[];
  }

  if(typeof EUC_DEV190Q_getStructure==='function'){
    var s=EUC_DEV190Q_getStructure(annee);
    var p=(s||{}).payload||{};
    return terminalOnly ? (p.terminales||[]) : (p.classes||[]);
  }

  return [];
}

function EUC_DEV446_isGristQuotaError_(err){
  var message=String(err&&err.message||err||'');
  return /(?:Grist API 429|Exceeded daily limit)/i.test(message);
}

function EUC_DEV446_apprentisUnavailable_(err){
  var quota=EUC_DEV446_isGristQuotaError_(err);
  var message=quota
    ? 'Le quota quotidien Grist est atteint. La page Apprentis reste accessible, mais les données ne peuvent pas être chargées pour le moment. Réessayez après le renouvellement du quota.'
    : 'Les données de la page Apprentis sont momentanément indisponibles. Réessayez dans quelques instants.';
  var home=ScriptApp.getService().getUrl()+'?page=admin-pfmp';
  var html='<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Gestion des apprentis</title><style>'+
    'body{margin:0;background:#f4faf7;color:#17312b;font-family:Arial,sans-serif}'+
    'header{background:#087762;color:#fff;padding:28px max(24px,calc((100% - 1180px)/2))}'+
    'main{max-width:1180px;margin:28px auto;padding:0 24px}'+
    '.card{background:#fff;border:1px solid #bddfd5;border-radius:14px;padding:24px;box-shadow:0 6px 22px rgba(14,92,75,.08)}'+
    'h1{margin:0;font-size:28px}.state{font-size:18px;font-weight:800;margin:0 0 10px}'+
    'p{line-height:1.55}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}'+
    'a,button{border:1px solid #0b8f72;border-radius:8px;padding:10px 14px;font-weight:800;cursor:pointer;text-decoration:none}'+
    'button{background:#0b8f72;color:#fff}a{background:#fff;color:#087762}</style></head><body>'+
    '<header><h1>Gestion des apprentis</h1></header><main><section class="card" role="status">'+
    '<p class="state">Données temporairement indisponibles</p><p>'+message+'</p>'+
    '<p>Aucune modification n\'a été effectuée et aucun nouvel appel automatique ne sera lancé depuis cette page.</p>'+
    '<div class="actions"><button type="button" onclick="location.reload()">Réessayer</button>'+
    '<a href="'+home+'" target="_top">Retour à l\'administration PFMP</a></div>'+
    '</section></main></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('Gestion des apprentis — temporairement indisponible')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190X_afficherApprentis(e){
  var y=EUC_DEV190X_years_();
  var t=HtmlService.createTemplateFromFile('Apprentissage_PFMP_V190X');
  var classes;

  try{
    classes=EUC_DEV190X_classes_(y.current,false);
  }catch(err){
    return EUC_DEV446_apprentisUnavailable_(err);
  }

  t.bootJson=JSON.stringify({
    currentYear:y.current,
    years:y.years,
    classes:classes,
    webappUrl:ScriptApp.getService().getUrl()
  });

  return t.evaluate()
    .setTitle('Gestion des apprentis')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190X_afficherPdif(e){
  var y=EUC_DEV190X_years_();
  var t=HtmlService.createTemplateFromFile('Parcours_Differencie_PFMP_V190X');

  t.bootJson=JSON.stringify({
    currentYear:y.current,
    years:y.years,
    classes:EUC_DEV190X_classes_(y.current,true),
    webappUrl:ScriptApp.getService().getUrl()
  });

  return t.evaluate()
    .setTitle('Fin de Terminale')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190X_getClasses(annee,terminalOnly){
  return {
    ok:true,
    classes:EUC_DEV190X_classes_(annee,!!terminalOnly)
  };
}
