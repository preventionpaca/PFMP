var EUC_DEV190R_YEARS_TABLE_ = 'EUC_PFMP_YEARS_SNAPSHOT';

function EUC_DEV190R_txt_(v) {
  return String(v == null ? '' : v).trim();
}

function EUC_DEV190R_ensureYearsTable_() {
  var t = EUC_DEV190_api_('get', '/tables', null);
  var exists = (t.tables || []).some(function(x) {
    return x.id === EUC_DEV190R_YEARS_TABLE_;
  });

  if (!exists) {
    EUC_DEV190_api_(
      'post',
      '/tables',
      {
        tables: [{
          id: EUC_DEV190R_YEARS_TABLE_,
          columns: [
            { id: 'Payload_JSON', type: 'Text' },
            { id: 'Updated_at', type: 'Text' },
            { id: 'Actif', type: 'Bool' },
            { id: 'Snapshot_version', type: 'Text' }
          ]
        }]
      }
    );
  }

  return { ok: true, created: !exists };
}

function EUC_DEV190R_collectYears_() {
  var map = {};

  function add(v) {
    v = EUC_DEV190R_txt_(v);
    if (/^20\d{2}-20\d{2}$/.test(v)) {
      map[v] = true;
    }
  }

  try {
    var ctx = EUC_PFMP_contexteAnneeLectureV155_();
    var raw = JSON.stringify(ctx || {});
    var matches = raw.match(/20\d{2}-20\d{2}/g) || [];
    matches.forEach(add);
    if (ctx && ctx.active) add(ctx.active);
  } catch (e) {}

  try {
    var r = EUC_DEV190_api_(
      'get',
      '/tables/' + encodeURIComponent('EUC_PFMP_STRUCTURE_SNAPSHOT') + '/records',
      null
    );

    (r.records || []).forEach(function(row) {
      add((row.fields || {}).Annee_scolaire);
    });
  } catch (e2) {}

  var years = Object.keys(map);

  years.sort(function(a, b) {
    return String(b).localeCompare(String(a), 'fr');
  });

  return years;
}

function EUC_DEV190R_syncYears() {
  EUC_DEV190R_ensureYearsTable_();

  var now = new Date().toISOString();
  var years = EUC_DEV190R_collectYears_();

  var all = EUC_DEV190_api_(
    'get',
    '/tables/' + encodeURIComponent(EUC_DEV190R_YEARS_TABLE_) + '/records',
    null
  ).records || [];

  var active = all.filter(function(r) {
    return (r.fields || {}).Actif !== false;
  });

  if (active.length) {
    EUC_DEV190_api_(
      'patch',
      '/tables/' + encodeURIComponent(EUC_DEV190R_YEARS_TABLE_) + '/records',
      {
        records: active.map(function(r) {
          return {
            id: r.id,
            fields: {
              Actif: false,
              Updated_at: now
            }
          };
        })
      }
    );
  }

  EUC_DEV190_api_(
    'post',
    '/tables/' + encodeURIComponent(EUC_DEV190R_YEARS_TABLE_) + '/records',
    {
      records: [{
        fields: {
          Payload_JSON: JSON.stringify({ annees: years }),
          Updated_at: now,
          Actif: true,
          Snapshot_version: '1.0.0-dev.190r'
        }
      }]
    }
  );

  return {
    ok: true,
    annees: years,
    updatedAt: now
  };
}

function EUC_DEV190R_getYears() {
  EUC_DEV190R_ensureYearsTable_();

  var rows = EUC_DEV190_api_(
    'get',
    '/tables/' + encodeURIComponent(EUC_DEV190R_YEARS_TABLE_) + '/records',
    null
  ).records || [];

  rows = rows
    .filter(function(r) {
      return (r.fields || {}).Actif !== false;
    })
    .sort(function(a, b) {
      return (
        Date.parse((b.fields || {}).Updated_at || '') -
        Date.parse((a.fields || {}).Updated_at || '')
      );
    });

  if (!rows.length) {
    EUC_DEV190R_syncYears();
    return EUC_DEV190R_getYears();
  }

  var payload = {};

  try {
    payload = JSON.parse((rows[0].fields || {}).Payload_JSON || '{}');
  } catch (e) {}

  return {
    ok: true,
    annees: payload.annees || [],
    updatedAt: (rows[0].fields || {}).Updated_at || ''
  };
}

function EUC_DEV190R_getPageStructure(annee, terminalesOnly) {
  var r = EUC_DEV190Q_getStructure(annee);

  var all =
    r && r.payload && r.payload.classes
      ? r.payload.classes
      : [];

  var terminales =
    r && r.payload && r.payload.terminales
      ? r.payload.terminales
      : [];

  return {
    ok: true,
    annee: r.annee || annee || '',
    classes: terminalesOnly ? terminales : all,
    updatedAt: r.updatedAt || ''
  };
}

function EUC_DEV190R_rechercherSiret(siret) {
  return EUC_DEV190Q_lookupEntrepriseSiret(siret);
}

function EUC_DEV190R_status() {
  var years = EUC_DEV190R_getYears();

  return {
    ok: true,
    annees: years.annees || [],
    yearsUpdatedAt: years.updatedAt || ''
  };
}
