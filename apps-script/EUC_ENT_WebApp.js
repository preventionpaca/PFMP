/** Eucalyptus Entreprises SIRET — v1.0.0-dev.8 */
function EUC_ENT_afficherApplication() {
  EUC_ENT_controlerAccesUtilisateur_();
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Eucalyptus — Recherche SIRET')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function EUC_ENT_inclure(nom) {
  return HtmlService.createHtmlOutputFromFile(nom).getContent();
}
