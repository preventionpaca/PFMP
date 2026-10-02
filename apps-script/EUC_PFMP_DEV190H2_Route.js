/** DEV.190H2 — route autonome Audit matrice PFMP */
function EUC_DEV190H2_afficherAuditMatrice() {
  return HtmlService
    .createTemplateFromFile('Audit_Matrice_PFMP_V190H')
    .evaluate()
    .setTitle('Audit matrice PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
