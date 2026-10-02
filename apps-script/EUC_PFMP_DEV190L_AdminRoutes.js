function EUC_DEV190L_txt_(v) {
  return String(v == null ? '' : v).trim();
}

function EUC_DEV190L_afficherAccueil_(e) {
  var ctx = EUC_PFMP_contexteAnneeLectureV155_();
  var annee =
    EUC_DEV190L_txt_(e && e.parameter && e.parameter.annee) ||
    ctx.active;

  var t = HtmlService.createTemplateFromFile(
    'Suivi_Conventions_Admin_LazyV190K4'
  );

  t.paramsJson = JSON.stringify({ annee: annee });

  return t.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190L_familyIndex_(annee, famille) {
  if (typeof EUC_DEV190G1_fastFamilyIndex !== 'function') {
    throw new Error('DEV190L : moteur index rapide indisponible.');
  }

  var fast = EUC_DEV319_liveFamilyIndex({
    annee: annee,
    famille: famille
  });

  if (!fast.ready || !fast.payload) {
    return {
      ok: true,
      ready: false,
      annee: annee,
      famille: famille,
      familleLibelle: famille === 'BACPRO' ? 'BAC PRO' : famille,
      classes: []
    };
  }

  var r = fast.payload;
  r.ready = true;
  r.__source = 'index-persistant';
  r.__durationMs = fast.durationMs || 0;

  return r;
}

function EUC_DEV190L_afficherFamille_(e) {
  var ctx = EUC_PFMP_contexteAnneeLectureV155_();

  var annee =
    EUC_DEV190L_txt_(e && e.parameter && e.parameter.annee) ||
    ctx.active;

  var famille =
    EUC_DEV190L_txt_(e && e.parameter && e.parameter.famille) ||
    'BACPRO';

  var data = EUC_DEV190L_familyIndex_(annee, famille);

  var t = HtmlService.createTemplateFromFile(
    'Suivi_Conventions_Admin_FamilleV190L'
  );

  t.paramsJson = JSON.stringify({
    annee: annee,
    famille: famille
  });

  t.dataJson = JSON.stringify(data);

  return t.evaluate()
    .setTitle(
      'Suivi des conventions — ' +
      (famille === 'BACPRO' ? 'BAC PRO' : famille)
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190L_afficherMaintenance_(e) {
  return HtmlService
    .createTemplateFromFile('Snapshot_PFMP_Admin_V190')
    .evaluate()
    .setTitle('Maintenance Snapshot PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190L_afficherDetailAdmin_(e) {
  if (typeof EUC_DEV190I_afficherAdminClasse === 'function') {
    return EUC_DEV319_afficherAdminClasseLive(e);
  }

  throw new Error('DEV190L : détail administrateur indisponible.');
}

function EUC_DEV190L_route_(e) {
  var page =
    e && e.parameter && e.parameter.page
      ? String(e.parameter.page)
      : '';

  if (page === 'suivi-conventions' || page === 'suivi-pfmp-classes') {
    return EUC_DEV190L_afficherAccueil_(e);
  }

  if (page === 'suivi-conventions-famille') {
    return EUC_DEV190L_afficherFamille_(e);
  }

  if (page === 'snapshot-pfmp-admin') {
    return EUC_DEV190L_afficherMaintenance_(e);
  }

  if (page === 'suivi-pfmp-classe') {
    return EUC_DEV190L_afficherDetailAdmin_(e);
  }

  return null;
}
