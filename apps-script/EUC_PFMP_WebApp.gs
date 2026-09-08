/** Eucalyptus PFMP — v1.0.0-dev.71 */
function EUC_PFMP_afficherApplication(e) {
  EUC_ENT_controlerAccesUtilisateur_();
  var tpl=HtmlService.createTemplateFromFile('PFMP');
  tpl.turnstileSiteKey=EUC_PFMP_lireConfiguration_().EUC_PFMP_TURNSTILE_SITE_KEY||'';
  tpl.pfmpModes=EUC_PFMP_modesSecurite_();
  tpl.conventionToken=String(e&&e.parameter&&e.parameter.token||'').trim();
  return tpl.evaluate()
    .setTitle('Enregistrement de convention de PFMP')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_PFMP_inclure_(nom) { return HtmlService.createHtmlOutputFromFile(nom).getContent(); }
