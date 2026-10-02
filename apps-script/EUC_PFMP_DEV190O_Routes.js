function EUC_DEV190O_txt_(v) {
  return String(v == null ? '' : v).trim();
}

function EUC_DEV190O_baseUrl_() {
  return ScriptApp.getService().getUrl();
}

function EUC_DEV190O_afficherAccueil_(e) {
  var ctx = EUC_PFMP_contexteAnneeLectureV155_();

  var annee =
    EUC_DEV190O_txt_(e && e.parameter && e.parameter.annee) ||
    ctx.active;

  var t = HtmlService.createTemplateFromFile(
    'Suivi_Conventions_Admin_LazyV190K4'
  );

  t.paramsJson = JSON.stringify({ annee: annee });
  t.baseUrl = EUC_DEV190O_baseUrl_();

  return t.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190O_afficherFamille_(e) {
  var ctx = EUC_PFMP_contexteAnneeLectureV155_();

  var annee =
    EUC_DEV190O_txt_(e && e.parameter && e.parameter.annee) ||
    ctx.active;

  var famille =
    EUC_DEV190O_txt_(e && e.parameter && e.parameter.famille) ||
    'BACPRO';

  var fast = EUC_DEV319_liveFamilyIndex({
    annee: annee,
    famille: famille
  });

  var data =
    fast && fast.ready && fast.payload
      ? fast.payload
      : {
          ok: true,
          ready: false,
          annee: annee,
          famille: famille,
          classes: []
        };

  data.ready = !!(fast && fast.ready && fast.payload);

  var t = HtmlService.createTemplateFromFile(
    'Suivi_Conventions_Admin_FamilleV190L'
  );

  t.paramsJson = JSON.stringify({
    annee: annee,
    famille: famille
  });

  t.dataJson = JSON.stringify(data);
  t.baseUrl = EUC_DEV190O_baseUrl_();

  return t.evaluate()
    .setTitle(
      'Suivi des conventions - ' +
      (famille === 'BACPRO' ? 'BAC PRO' : famille)
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190O_afficherMaintenance_(e) {
  var t = HtmlService.createTemplateFromFile(
    'Snapshot_PFMP_Admin_V190'
  );

  t.baseUrl = EUC_DEV190O_baseUrl_();

  return t.evaluate()
    .setTitle('Maintenance Snapshot PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190O_route_(e) {
  var page =
    e && e.parameter && e.parameter.page
      ? String(e.parameter.page)
      : '';

  if (
    page === 'suivi-conventions' ||
    page === 'suivi-pfmp-classes'
  ) {
    return EUC_DEV190O_afficherAccueil_(e);
  }

  if (page === 'suivi-conventions-famille') {
    return EUC_DEV190O_afficherFamille_(e);
  }

  if (page === 'snapshot-pfmp-admin') {
    return EUC_DEV190O_afficherMaintenance_(e);
  }

  if (page === 'suivi-pfmp-classe') {
    return EUC_DEV319_afficherAdminClasseLive(e);
  }

  return null;
}
