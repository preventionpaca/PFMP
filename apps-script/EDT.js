/**
 * EDT V1 Option B - WebApp consultation iframe
 * A deployer comme application web Apps Script.
 * Acces conseille : utilisateurs de votre domaine / selon votre contexte.
 */

// CONFIG est defini dans Install_EDT.gs.

function doGet(e) {
  var page = String(e && e.parameter && e.parameter.page || '').toLowerCase();
  if (page === 'entreprises') return EUC_ENT_afficherApplication(e);
  if (page === 'pfmp') return EUC_PFMP_afficherApplication(e);
  if (page === 'suivi-pfmp') return EUC_SUIVI_afficherApplication(e);
  return EDT_afficherWebAppExistante_(e);
}

function EDT_afficherWebAppExistante_(e) {
  const tpl = HtmlService.createTemplateFromFile('WebApp_EDT');
  tpl.params = JSON.stringify({
    mode: (e && e.parameter && e.parameter.mode) || 'lecture',
    vue: (e && e.parameter && e.parameter.vue) || 'prof',
    semaine: (e && e.parameter && e.parameter.semaine) || '',
    ressource: (e && e.parameter && e.parameter.ressource) || ''
  });
  return tpl.evaluate()
    .setTitle('Consultation EDT')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function webappGetInitialData() {
  return {
    enseignants: stripFields_(getRecords_('Enseignants')),
    salles: stripFields_(getRecords_('Salles')),
    groupes: stripFields_(getRecords_('Groupes')),
    creneaux: stripFields_(getRecords_('Creneaux_EDT')),
    seances: safeStrip_('Seances_Generees'),
    synthHebdo: safeStrip_('Synthese_Hebdo_Enseignants'),
    synthAnnuelle: safeStrip_('Synthese_Annuelle_Enseignants'),
    params: paramsAsObject_()
  };
}

function webappGetLastUpdate() {
  return paramsAsObject_().LastUpdate || '';
}

function paramsAsObject_() {
  const rows = getRecords_('Parametres_EDT');
  const out = {};
  rows.forEach(r => out[r.fields.Cle] = r.fields.Valeur);
  return out;
}

function stripFields_(records) {
  return records.map(r => Object.assign({ id: r.id }, r.fields));
}

function safeStrip_(tableId) {
  try {
    return stripFields_(getRecords_(tableId));
  } catch (e) {
    return [];
  }
}
