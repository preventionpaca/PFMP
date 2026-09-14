/** EDT V1.6 - API Grist. Fonctions préfixées EDT_. */

function EDT_gristGet_(path) {
  var res = UrlFetchApp.fetch(EDT_CONFIG.GRIST_HOST + path, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + EDT_CONFIG.GRIST_API_KEY },
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var txt = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('Grist GET ' + code + '\n' + txt);
  return JSON.parse(txt);
}

function EDT_applyActions_(actions) {
  if (!actions || !actions.length) return null;
  var res = UrlFetchApp.fetch(EDT_CONFIG.GRIST_HOST + '/api/docs/' + EDT_CONFIG.DOC_ID + '/apply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + EDT_CONFIG.GRIST_API_KEY },
    payload: JSON.stringify(actions),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var txt = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('Grist APPLY ' + code + '\n' + txt);
  return txt ? JSON.parse(txt) : null;
}

function EDT_getRecords_(tableId) {
  var data = EDT_gristGet_('/api/docs/' + EDT_CONFIG.DOC_ID + '/tables/' + tableId + '/records');
  return data.records || [];
}

function EDT_getExistingTables_() {
  var data = EDT_gristGet_('/api/docs/' + EDT_CONFIG.DOC_ID + '/tables/_grist_Tables/records');
  return (data.records || []).map(function(r) { return r.fields.tableId; }).filter(Boolean);
}

function EDT_getExistingColumns_(tableId) {
  var tables = EDT_gristGet_('/api/docs/' + EDT_CONFIG.DOC_ID + '/tables/_grist_Tables/records');
  var table = (tables.records || []).find(function(r) { return r.fields.tableId === tableId; });
  if (!table) return [];
  var cols = EDT_gristGet_('/api/docs/' + EDT_CONFIG.DOC_ID + '/tables/_grist_Tables_column/records');
  return (cols.records || [])
    .filter(function(r) { return String(r.fields.parentId) === String(table.id); })
    .map(function(r) { return r.fields.colId; })
    .filter(Boolean);
}

function EDT_chunk_(arr, size) {
  var out = [];
  for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function EDT_clearTable_(tableId) {
  var recs = EDT_getRecords_(tableId);
  var ids = recs.map(function(r) { return r.id; });
  EDT_chunk_(ids, 200).forEach(function(batch) {
    if (batch.length) EDT_applyActions_([['BulkRemoveRecord', tableId, batch]]);
  });
}

function EDT_markUpdate_() {
  var recs = EDT_getRecords_('Parametres_EDT');
  var found = recs.find(function(r) { return r.fields.Cle === 'LastUpdate'; });
  var now = new Date().toISOString();
  if (found) {
    EDT_applyActions_([['UpdateRecord', 'Parametres_EDT', found.id, { Valeur: now }]]);
  } else {
    EDT_applyActions_([['AddRecord', 'Parametres_EDT', null, { Cle: 'LastUpdate', Valeur: now, Commentaire: 'Créé automatiquement.' }]]);
  }
}

function EDT_journaliser_(action, tableCible, detail) {
  EDT_applyActions_([['AddRecord', 'Journal_EDT', null, {
    Date_action: Utilities.formatDate(new Date(), EDT_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
    Utilisateur: Session.getActiveUser().getEmail() || 'inconnu',
    Action: action,
    Table_cible: tableCible,
    Detail: detail
  }]]);
}

function EDT_ref_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (Array.isArray(v)) return Number(v[1] || v[0] || 0) || null;
  return Number(v) || null;
}

function EDT_bool_(v) {
  return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'oui';
}
