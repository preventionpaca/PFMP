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

function EUC_DEV190X_afficherApprentis(e){
  var y=EUC_DEV190X_years_();
  var t=HtmlService.createTemplateFromFile('Apprentissage_PFMP_V190X');

  t.bootJson=JSON.stringify({
    currentYear:y.current,
    years:y.years,
    classes:EUC_DEV190X_classes_(y.current,false),
    webappUrl:ScriptApp.getService().getUrl()
  });

  return t.evaluate()
    .setTitle('Gestion des apprentis')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190X_afficherPdif(e){
  EUC_DEV285B_ensureSchema_();
  EUC_DEV285B_migrateLegacy_();

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
