/** DEV497 — jeu de donnees Pronote strictement reserve a la recette bleue. */
function EUC_DEV497_requirePronoteImportTarget_() {
  var channel = typeof EUC_RELEASE_channel_ === 'function'
    ? EUC_RELEASE_channel_()
    : 'UNKNOWN';
  if (channel === 'GREEN') return true;
  if (channel !== 'BLUE') {
    throw new Error('Import Pronote refuse : projet Apps Script inconnu.');
  }
  var props = PropertiesService.getScriptProperties();
  if (String(props.getProperty('EUC_PFMP_PRONOTE_IMPORT_MODE') || '') !== 'RECIPE_DATA') {
    throw new Error('Import Pronote bleu desactive par la configuration.');
  }
  EUC_ENT_controlerCibleRecette_();
  return true;
}

function EUC_DEV497_recipeFields_(table, wanted) {
  var columns = EUC_ENT_grist('get', '/tables/' + encodeURIComponent(table) + '/columns').columns || [];
  var present = {};
  columns.forEach(function(column) { present[column.id] = true; });
  var fields = {};
  Object.keys(wanted || {}).forEach(function(key) {
    if (present[key]) fields[key] = wanted[key];
  });
  return fields;
}

function EUC_DEV497_prepareBlueRecipePronote(payload) {
  EUC_IMPORT_exigerAdminTexte_();
  payload = payload || {};
  if (payload.confirmation !== 'PREPARER_RECETTE_BLEUE') {
    throw new Error('Confirmation explicite requise pour preparer la recette bleue.');
  }
  if (typeof EUC_RELEASE_channel_ !== 'function' || EUC_RELEASE_channel_() !== 'BLUE') {
    throw new Error('Preparation refusee : fonction reservee au site bleu.');
  }
  EUC_DEV497_requirePronoteImportTarget_();

  var annee = String(payload.annee || '').trim();
  if (!/^20\d{2}-20\d{2}$/.test(annee)) throw new Error('Annee scolaire invalide.');
  var seen = {};
  var classes = (payload.classes || []).map(function(value) {
    return String(value || '').trim().toUpperCase();
  }).filter(function(value) {
    if (!/^[A-Z0-9][A-Z0-9 ._-]{0,29}$/.test(value) || seen[value]) return false;
    seen[value] = true;
    return true;
  });
  if (!classes.length || classes.length > 10) {
    throw new Error('Entre une et dix classes de recette sont requises.');
  }

  var yearExists = EUC_IMPORT_lireRecordsBruts_('Annees_Scolaires').some(function(row) {
    var fields = row.fields || {};
    return String(fields.Code || fields.Libelle || '') === annee;
  });
  if (!yearExists) {
    var yearFields = EUC_DEV497_recipeFields_('Annees_Scolaires', {
      Code: annee, Libelle: annee, Code_import: annee, Active: true,
      Commentaire: 'Reference reservee aux essais du site bleu'
    });
    if (!Object.keys(yearFields).length) throw new Error('Schema Annees_Scolaires incompatible avec la recette bleue.');
    EUC_ENT_grist('post', '/tables/Annees_Scolaires/records', { records: [{ fields: yearFields }] });
  }

  var byName = {};
  EUC_IMPORT_lireRecordsBruts_('Classes').forEach(function(row) {
    var fields = row.fields || {};
    var name = String(fields.Nom || fields.Libelle || '').trim().toUpperCase();
    if (name) byName[name] = row;
  });
  var created = [];
  classes.forEach(function(name) {
    if (byName[name]) return;
    var classFields = EUC_DEV497_recipeFields_('Classes', {
      Nom: name, Libelle: name, Code_import: name, Formation: 'BAC PRO',
      Niveau: 'TERMINALE', Etab: 'LP', Actif: true,
      Commentaire: 'Classe reservee aux essais du site bleu'
    });
    if (!classFields.Nom && !classFields.Libelle) throw new Error('Schema Classes incompatible avec la recette bleue.');
    EUC_ENT_grist('post', '/tables/Classes/records', { records: [{ fields: classFields }] });
    created.push(name);
  });

  EUC_IMPORT_assurerSchemaRich_();
  return {ok:true,canal:'BLUE',annee:annee,classes:classes,classesCreees:created,cibleRecetteVerifiee:true,aucuneDonneeNominativeEcrite:true};
}
