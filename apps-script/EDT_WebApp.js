/** EDT V1.6 - WebApp consultation. Fonction Apps Script préfixée EDT_.
 * Note : Apps Script exige doGet(e) pour une WebApp. Pour éviter conflit avec ton projet,
 * ce fichier NE définit PAS doGet. Si tu veux l'activer, ajoute toi-même dans ton Code.gs :
 * function doGet(e){ return EDT_doGet(e); }
 */
function EDT_doGet(e) {
  return HtmlService.createTemplateFromFile('EDT_WebApp')
    .evaluate()
    .setTitle('EDT consultation')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
