
/* DEV252 — route publique lecture seule */
function EUC_DEV252_afficherApprentisPublic(e){
  var y=EUC_DEV190X_years_();
  var t=HtmlService.createTemplateFromFile('Apprentissage_PFMP_V190X');

  t.bootJson=JSON.stringify({
    currentYear:y.current,
    years:y.years,
    classes:EUC_DEV190X_classes_(y.current,false),
    webappUrl:ScriptApp.getService().getUrl(),
    readonly:true,
    publicMode:true
  });

  return t.evaluate()
    .setTitle('Gestion des apprentis — lecture seule')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
