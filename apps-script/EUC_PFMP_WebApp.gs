/** Eucalyptus PFMP — v1.0.0-dev.85 — accès formulaire standard ou QR sécurisé. */
function EUC_PFMP_afficherApplication(e) {
  var token=String(e&&e.parameter&&e.parameter.token||'').trim();
  if(token){
    var qr=HtmlService.createTemplateFromFile('PFMP_Acces_QR');
    qr.conventionToken=token;
    return qr.evaluate().setTitle('Accès sécurisé PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
  }
  EUC_ENT_controlerAccesUtilisateur_();
  var tpl=HtmlService.createTemplateFromFile('PFMP');
  tpl.turnstileSiteKey=EUC_PFMP_lireConfiguration_().EUC_PFMP_TURNSTILE_SITE_KEY||'';
  tpl.pfmpModes=EUC_PFMP_modesSecurite_();
  tpl.conventionToken='';
  return tpl.evaluate()
    .setTitle('Enregistrement de convention de PFMP')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_PFMP_inclure_(nom) { return HtmlService.createHtmlOutputFromFile(nom).getContent(); }
