/**
 * DEV632 — Page d'accès des apprentis et des professeurs (sans passer par l'administration).
 *
 * Une seule adresse à donner (et à mettre derrière un sous-domaine) :
 *   - l'apprenti tape son code personnel (imprimé sous son QR code) et arrive dans son livret ;
 *   - le professeur tape son adresse du lycée et reçoit le lien de son espace référent.
 * Les tuteurs n'ont rien à saisir : ils valident par le QR code ou le lien que leur présente l'apprenti.
 */
function EUC_DEV632_afficher(e) {
  return HtmlService.createTemplateFromFile('Acces_Alternance_DEV632').evaluate().setTitle('Accès apprentis et professeurs').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
