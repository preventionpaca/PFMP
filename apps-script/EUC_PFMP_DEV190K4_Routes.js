/**
 * DEV.190K4
 * - route directe Maintenance Snapshot PFMP
 * - accueil admin du suivi des conventions très léger
 * - décomptes chargés uniquement à la demande
 */

function EUC_DEV190K4_txt_(v) {
  return String(v == null ? '' : v).trim();
}

function EUC_DEV190K4_afficherMaintenance_(e) {
  return HtmlService
    .createTemplateFromFile('Snapshot_PFMP_Admin_V190')
    .evaluate()
    .setTitle('Maintenance Snapshot PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190K4_afficherSuiviAdmin_(e) {
  var ctx = EUC_PFMP_contexteAnneeLectureV155_();

  var annee =
    EUC_DEV190K4_txt_(
      e &&
      e.parameter &&
      e.parameter.annee
    ) || ctx.active;

  var t = HtmlService.createTemplateFromFile(
    'Suivi_Conventions_Admin_LazyV190K4'
  );

  t.paramsJson = JSON.stringify({
    annee: annee
  });

  return t.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190K4_resumeFamille(payload) {
  payload = payload || {};

  if (typeof EUC_DEV190G1_resumeFamille === 'function') {
    return EUC_DEV190G1_resumeFamille(payload);
  }

  if (typeof EUC_DEV190E_resumeFamille === 'function') {
    return EUC_DEV190E_resumeFamille(payload);
  }

  if (typeof EUC_DEV189_resumeFamille === 'function') {
    return EUC_DEV189_resumeFamille(payload);
  }

  throw new Error(
    'DEV190K4 : aucun moteur résumé famille disponible.'
  );
}

function EUC_DEV190K4_route_(e) {
  var page =
    e &&
    e.parameter &&
    e.parameter.page
      ? String(e.parameter.page)
      : '';

  if (page === 'snapshot-pfmp-admin') {
    return EUC_DEV190K4_afficherMaintenance_(e);
  }

  if (
    page === 'suivi-conventions' ||
    page === 'suivi-pfmp-classes'
  ) {
    return EUC_DEV190K4_afficherSuiviAdmin_(e);
  }

  return null;
}
