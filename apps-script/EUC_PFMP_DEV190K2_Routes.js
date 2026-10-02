/** DEV.190K2 — routes critiques PFMP */

function EUC_DEV190K2_route_(e) {
  var page =
    e && e.parameter && e.parameter.page
      ? String(e.parameter.page)
      : '';

  if (page === 'snapshot-pfmp-admin') {
    return HtmlService
      .createTemplateFromFile('Snapshot_PFMP_Admin_V190')
      .evaluate()
      .setTitle('Maintenance Snapshot PFMP')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (page === 'suivi-pfmp-classes') {
    if (typeof EUC_SUIVI_PUBLIC_afficherFamillesV51 === 'function') {
      return EUC_SUIVI_PUBLIC_afficherFamillesV51(e);
    }

    if (typeof EUC_DEV189_afficherHome === 'function') {
      return EUC_DEV189_afficherHome(e);
    }

    throw new Error(
      'DEV190K2 : route suivi-pfmp-classes sans handler disponible.'
    );
  }

  return null;
}
