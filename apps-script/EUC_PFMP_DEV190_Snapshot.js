/**
 * Eucalyptus PFMP — DEV.190
 *
 * Objectif :
 *   ne plus recalculer tout le moteur PFMP à chaque consultation.
 *
 * Table matérialisée Grist :
 *   EUC_SUIVI_PFMP_SNAPSHOT
 *
 * Une ligne = 1 élève × 1 période.
 *
 * Lecture :
 *   rapide, filtrée sur Annee_scolaire + Classe_id + Periode_id.
 *
 * Actualisation :
 *   - le snapshot existant est affiché immédiatement ;
 *   - la page peut demander ensuite une vérification en arrière-plan ;
 *   - si le snapshot est absent, il est construit à partir du moteur historique.
 *
 * IMPORTANT :
 *   ce n'est PAS un cache mémoire éphémère.
 *   C'est une vue matérialisée persistante dans Grist.
 */

var EUC_DEV190_TABLE_ = 'EUC_SUIVI_PFMP_SNAPSHOT';
var EUC_DEV190_VERSION_ = '1.0.0-dev.190';
var EUC_DEV190_STALE_MS_ = 6 * 60 * 60 * 1000; // 6 h

function EUC_DEV190_txt_(v) {
  return String(v == null ? '' : v).trim();
}

function EUC_DEV190_num_(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function EUC_DEV190_isoNow_() {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------
 * ADAPTATEUR GRIST
 * ------------------------------------------------------------------
 *
 * DEV190 cherche d'abord des fonctions génériques existantes du projet.
 * Si aucune n'est disponible, il utilise directement l'API REST Grist
 * à partir des propriétés de script les plus courantes.
 */

function EUC_DEV190_getGlobal_(name) {
  try {
    return globalThis && globalThis[name] != null ? globalThis[name] : null;
  } catch (e) {
    return null;
  }
}


function EUC_DEV190_gristConfig_() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties() || {};
  var sourceKeys = ["EUC_ENT_GRIST_API_KEY", "EUC_GRIST_BASE_URL", "EUC_GRIST_DOC_ID", "EUC_GRIST_TOKEN", "EUC_PFMP_TURNSTILE_SECRET_KEY", "EUC_PFMP_TURNSTILE_SITE_KEY", "GRIST_API_KEY", "GRIST_API_TOKEN", "GRIST_BASE_URL", "GRIST_DOCUMENT_ID", "GRIST_DOC_ID", "GRIST_TOKEN"];

  function firstValue(keys) {
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = all[k];
      if (v != null && String(v).trim() !== '') {
        return { key: k, value: String(v).trim() };
      }
    }
    return null;
  }

  function byPattern(fn) {
    var keys = Object.keys(all);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = all[k];
      if (fn(String(k).toUpperCase()) && v != null && String(v).trim() !== '') {
        return { key: k, value: String(v).trim() };
      }
    }
    return null;
  }

  var doc = firstValue([
    'GRIST_DOC_ID','GRIST_DOCUMENT_ID','EUC_GRIST_DOC_ID',
    'DOC_ID_GRIST','GRIST_DOC','DOCUMENT_GRIST','GRIST_DOCUMENT','GRIST_ID_DOC'
  ]);

  var token = firstValue([
    'GRIST_API_KEY','GRIST_API_TOKEN','GRIST_TOKEN','EUC_GRIST_TOKEN',
    'API_KEY_GRIST','TOKEN_GRIST','GRIST_KEY','GRIST_KEY_API'
  ]);

  var base = firstValue([
    'GRIST_BASE_URL','EUC_GRIST_BASE_URL','GRIST_URL','GRIST_HOST','URL_GRIST'
  ]);

  if (!doc) {
    doc = firstValue(sourceKeys.filter(function(k) {
      var u = String(k).toUpperCase();
      return u.indexOf('GRIST') >= 0 &&
        (u.indexOf('DOC') >= 0 || u.indexOf('DOCUMENT') >= 0) &&
        u.indexOf('TOKEN') < 0 && u.indexOf('KEY') < 0;
    }));
  }

  if (!token) {
    token = firstValue(sourceKeys.filter(function(k) {
      var u = String(k).toUpperCase();
      return u.indexOf('GRIST') >= 0 &&
        (u.indexOf('TOKEN') >= 0 || u.indexOf('API') >= 0 || u.indexOf('KEY') >= 0);
    }));
  }

  if (!base) {
    base = firstValue(sourceKeys.filter(function(k) {
      var u = String(k).toUpperCase();
      return u.indexOf('GRIST') >= 0 &&
        (u.indexOf('URL') >= 0 || u.indexOf('HOST') >= 0 || u.indexOf('BASE') >= 0);
    }));
  }

  if (!doc) {
    doc = byPattern(function(u) {
      return u.indexOf('GRIST') >= 0 &&
        (u.indexOf('DOC') >= 0 || u.indexOf('DOCUMENT') >= 0) &&
        u.indexOf('TOKEN') < 0 && u.indexOf('KEY') < 0;
    });
  }

  if (!token) {
    token = byPattern(function(u) {
      return u.indexOf('GRIST') >= 0 &&
        (u.indexOf('TOKEN') >= 0 || u.indexOf('API_KEY') >= 0 || u.indexOf('API') >= 0 || u.indexOf('KEY') >= 0);
    });
  }

  if (!base) {
    base = byPattern(function(u) {
      return u.indexOf('GRIST') >= 0 &&
        (u.indexOf('URL') >= 0 || u.indexOf('HOST') >= 0 || u.indexOf('BASE') >= 0);
    });
  }

  function globalValue(names) {
    for (var i = 0; i < names.length; i++) {
      try {
        var v = EUC_DEV190_getGlobal_(names[i]);
        if (v != null && String(v).trim() !== '') {
          return { key: names[i] + ' (global)', value: String(v).trim() };
        }
      } catch (e) {}
    }
    return null;
  }

  if (!doc) {
    doc = globalValue(['GRIST_DOC_ID','GRIST_DOCUMENT_ID','EUC_GRIST_DOC_ID','GRIST_DOC']);
  }
  if (!token) {
    token = globalValue(['GRIST_API_KEY','GRIST_API_TOKEN','GRIST_TOKEN','EUC_GRIST_TOKEN']);
  }
  if (!base) {
    base = globalValue(['GRIST_BASE_URL','EUC_GRIST_BASE_URL','GRIST_URL']);
  }

  if (!doc || !token) {
    var visibleKeys = Object.keys(all).filter(function(k) {
      var u = String(k).toUpperCase();
      return u.indexOf('GRIST') >= 0 || u.indexOf('DOC') >= 0 ||
             u.indexOf('TOKEN') >= 0 || u.indexOf('API') >= 0;
    }).sort();

    throw new Error(
      'DEV190B : configuration Grist non détectée automatiquement. ' +
      'Clés candidates visibles : ' +
      (visibleKeys.length ? visibleKeys.join(', ') : '(aucune)') +
      '. Aucune valeur sensible n’est affichée.'
    );
  }

  return {
    base: String(base && base.value ? base.value : 'https://docs.getgrist.com').replace(/\/+$/, ''),
    docId: doc.value,
    token: token.value,
    detected: {
      docKey: doc.key,
      tokenKey: token.key,
      baseKey: base ? base.key : '(défaut docs.getgrist.com)'
    }
  };
}


function EUC_DEV398_BASE_EUC_DEV190_api_(method, path, body) {
  var c = EUC_DEV190_gristConfig_();

  var opt = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + c.token
    }
  };

  if (body != null) {
    opt.contentType = 'application/json';
    opt.payload = JSON.stringify(body);
  }

  var url =
    c.base +
    '/api/docs/' +
    encodeURIComponent(c.docId) +
    path;

  var res = UrlFetchApp.fetch(url, opt);
  var code = res.getResponseCode();
  var txt = res.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error(
      'DEV190 Grist API ' + code + ' : ' + txt.slice(0, 500)
    );
  }

  if (!txt) return {};

  try {
    return JSON.parse(txt);
  } catch (e) {
    return {};
  }
}

function EUC_DEV190_tableExists_() {
  var t = EUC_DEV190_api_('get', '/tables', null);
  return (t.tables || []).some(function(x) {
    return x.id === EUC_DEV190_TABLE_;
  });
}

function EUC_DEV190_ensureTable() {
  if (EUC_DEV190_tableExists_()) {
    return { ok: true, created: false, table: EUC_DEV190_TABLE_ };
  }

  var columns = [
    { id: 'Annee_scolaire', type: 'Text' },
    { id: 'Classe_id', type: 'Int' },
    { id: 'Classe_nom', type: 'Text' },
    { id: 'Periode_id', type: 'Int' },
    { id: 'Periode_libelle', type: 'Text' },
    { id: 'Periode_debut', type: 'Text' },
    { id: 'Periode_fin', type: 'Text' },

    { id: 'Eleve_id', type: 'Int' },
    { id: 'Nom', type: 'Text' },
    { id: 'Prenom', type: 'Text' },

    { id: 'Statut', type: 'Text' },
    { id: 'Convention_active', type: 'Bool' },
    { id: 'Entreprise', type: 'Text' },
    { id: 'Adresse_entreprise', type: 'Text' },
    { id: 'Contact_entreprise', type: 'Text' },
    { id: 'Tuteur', type: 'Text' },

    { id: 'Prof_principal', type: 'Text' },
    { id: 'Prof_suivi', type: 'Text' },
    { id: 'Prof_visiteur', type: 'Text' },

    { id: 'Apprenti', type: 'Bool' },
    { id: 'Parcours_differencie', type: 'Bool' },
    { id: 'Statut_mixte', type: 'Bool' },
    { id: 'Annulee_interrompue', type: 'Bool' },

    { id: 'Updated_at', type: 'Text' },
    { id: 'Snapshot_version', type: 'Text' }
  ];

  EUC_DEV190_api_(
    'post',
    '/tables',
    {
      tables: [
        {
          id: EUC_DEV190_TABLE_,
          columns: columns
        }
      ]
    }
  );

  return { ok: true, created: true, table: EUC_DEV190_TABLE_ };
}

function EUC_DEV190_records_(query) {
  query = query || {};

  var filters = [];

  Object.keys(query).forEach(function(k) {
    filters.push(
      encodeURIComponent(k) +
      '=' +
      encodeURIComponent(JSON.stringify([query[k]]))
    );
  });

  var path =
    '/tables/' +
    encodeURIComponent(EUC_DEV190_TABLE_) +
    '/records';

  if (filters.length) {
    path += '?filter=' + encodeURIComponent(
      JSON.stringify(
        Object.keys(query).reduce(function(o, k) {
          o[k] = [query[k]];
          return o;
        }, {})
      )
    );
  }

  var r = EUC_DEV190_api_('get', path, null);
  return r.records || [];
}

function EUC_DEV190_deleteRecords_(ids) {
  ids = (ids || []).filter(function(x) {
    return Number(x) > 0;
  });

  if (!ids.length) return;

  EUC_DEV190_api_(
    'post',
    '/tables/' +
      encodeURIComponent(EUC_DEV190_TABLE_) +
      '/data/delete',
    ids
  );
}

function EUC_DEV190_addRows_(rows) {
  if (!rows || !rows.length) return;

  var payload = {
    records: rows.map(function(fields) {
      return { fields: fields };
    })
  };

  EUC_DEV190_api_(
    'post',
    '/tables/' +
      encodeURIComponent(EUC_DEV190_TABLE_) +
      '/records',
    payload
  );
}

/* ------------------------------------------------------------------
 * CONVERSION DETAIL HISTORIQUE -> SNAPSHOT
 * ------------------------------------------------------------------ */

function EUC_DEV190_bool_(v) {
  return !!v;
}

function EUC_DEV190_rowFromDetail_(d, x, annee, classeId, periodeId) {
  return {
    Annee_scolaire: annee,
    Classe_id: classeId,
    Classe_nom: EUC_DEV190_txt_(d.classe && d.classe.nom),

    Periode_id: periodeId,
    Periode_libelle: EUC_DEV190_txt_(d.periode && d.periode.libelle),
    Periode_debut: EUC_DEV190_txt_(
      d.periode && (d.periode.debutFr || d.periode.debut)
    ),
    Periode_fin: EUC_DEV190_txt_(
      d.periode && (d.periode.finFr || d.periode.fin)
    ),

    Eleve_id: EUC_DEV190_num_(
      x.eleveId || x.eleve_id || x.id
    ),
    Nom: EUC_DEV190_txt_(x.nom),
    Prenom: EUC_DEV190_txt_(x.prenom),

    Statut: EUC_DEV190_txt_(x.statut),
    Convention_active:
      EUC_DEV190_txt_(x.statut).toLowerCase().indexOf('sans convention') < 0 &&
      !x.apprenti &&
      !x.parcoursDifferencie,

    Entreprise: EUC_DEV190_txt_(x.entreprise),
    Adresse_entreprise: EUC_DEV190_txt_(
      x.adresseEntreprise || x.adresse_entreprise
    ),
    Contact_entreprise: EUC_DEV190_txt_(x.contactEntreprise),
    Tuteur: EUC_DEV190_txt_(
      x.tuteurEntreprise || x.tuteur
    ),

    Prof_principal: EUC_DEV190_txt_(x.professeurPrincipal),
    Prof_suivi: EUC_DEV190_txt_(
      x.professeurTelephone || x.professeurSuivi
    ),
    Prof_visiteur: EUC_DEV190_txt_(x.professeurVisiteur),

    Apprenti: EUC_DEV190_bool_(x.apprenti),
    Parcours_differencie: EUC_DEV190_bool_(x.parcoursDifferencie),
    Statut_mixte: EUC_DEV190_bool_(x.statutMixte),
    Annulee_interrompue: EUC_DEV190_bool_(
      x.annulee || x.interrompue || x.annuleeInterrompue
    ),

    Updated_at: EUC_DEV190_isoNow_(),
    Snapshot_version: EUC_DEV190_VERSION_
  };
}

function EUC_DEV190_buildHistoricalDetail_(annee, classeId, periodeId) {
  if (typeof EUC_DEV185_buildDetail_ === 'function') {
    return EUC_DEV185_buildDetail_(annee, classeId, periodeId);
  }

  var d = EUC_SUIVI_CLASSE_detailF18_(
    annee,
    classeId,
    periodeId
  );

  if (typeof EUC_V50_enrichirDetail_ === 'function') {
    d = EUC_V50_enrichirDetail_(
      d,
      annee,
      classeId,
      periodeId
    );
  }

  if (typeof EUC_V51_numeroPeriodes_ === 'function') {
    d = EUC_V51_numeroPeriodes_(d);
  }

  if (typeof EUC_APP172_enrichirDetail === 'function') {
    d = EUC_APP172_enrichirDetail(d);
  }

  if (typeof EUC_DEV174_enrichirDetail_ === 'function') {
    d = EUC_DEV174_enrichirDetail_(d, annee);
  }

  return d;
}

function EUC_DEV190_refreshClassPeriod(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var classeId = EUC_DEV190_num_(payload.classe);
  var periodeId = EUC_DEV190_num_(payload.periode);

  if (!annee || !classeId || !periodeId) {
    throw new Error(
      'DEV190 : année, classe et période obligatoires.'
    );
  }

  EUC_DEV190_ensureTable();

  var t0 = Date.now();

  var d = EUC_DEV190_buildHistoricalDetail_(
    annee,
    classeId,
    periodeId
  );

  var old = EUC_DEV190_records_({
    Annee_scolaire: annee,
    Classe_id: classeId,
    Periode_id: periodeId
  });

  EUC_DEV190_deleteRecords_(
    old.map(function(x) { return x.id; })
  );

  var rows = (d.lignes || []).map(function(x) {
    return EUC_DEV190_rowFromDetail_(
      d,
      x,
      annee,
      classeId,
      periodeId
    );
  });

  EUC_DEV190_addRows_(rows);

  return {
    ok: true,
    rows: rows.length,
    deleted: old.length,
    durationMs: Date.now() - t0
  };
}

/* ------------------------------------------------------------------
 * LECTURE RAPIDE
 * ------------------------------------------------------------------ */

function EUC_DEV190_snapshotDetail(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var classeId = EUC_DEV190_num_(payload.classe);
  var periodeId = EUC_DEV190_num_(payload.periode);

  if (!annee || !classeId || !periodeId) {
    throw new Error(
      'DEV190 : année, classe et période obligatoires.'
    );
  }

  EUC_DEV190_ensureTable();

  var t0 = Date.now();

  var records = EUC_DEV190_records_({
    Annee_scolaire: annee,
    Classe_id: classeId,
    Periode_id: periodeId
  });

  if (!records.length) {
    return {
      ok: true,
      exists: false,
      durationMs: Date.now() - t0,
      detail: null
    };
  }

  var first = records[0].fields || {};

  var detail = {
    annee: annee,

    classe: {
      id: classeId,
      nom: first.Classe_nom || ''
    },

    periode: {
      id: periodeId,
      libelle: first.Periode_libelle || '',
      debutFr: first.Periode_debut || '',
      finFr: first.Periode_fin || ''
    },

    lignes: records.map(function(r) {
      var f = r.fields || {};

      return {
        eleveId: EUC_DEV190_num_(f.Eleve_id),
        nom: f.Nom || '',
        prenom: f.Prenom || '',

        statut: f.Statut || '',
        entreprise: f.Entreprise || '',
        adresseEntreprise: f.Adresse_entreprise || '',
        contactEntreprise: f.Contact_entreprise || '',
        tuteurEntreprise: f.Tuteur || '',

        professeurPrincipal: f.Prof_principal || '',
        professeurTelephone: f.Prof_suivi || '',
        professeurVisiteur: f.Prof_visiteur || '',

        apprenti: !!f.Apprenti,
        parcoursDifferencie: !!f.Parcours_differencie,
        statutMixte: !!f.Statut_mixte,
        annuleeInterrompue: !!f.Annulee_interrompue
      };
    })
  };

  var newest = 0;

  records.forEach(function(r) {
    var f = r.fields || {};
    var t = Date.parse(f.Updated_at || '');
    if (isFinite(t) && t > newest) newest = t;
  });

  return {
    ok: true,
    exists: true,
    stale:
      !newest ||
      (Date.now() - newest) > EUC_DEV190_STALE_MS_,
    updatedAt:
      newest ? new Date(newest).toISOString() : '',
    durationMs: Date.now() - t0,
    detail: detail
  };
}

/* ------------------------------------------------------------------
 * API UTILISEE PAR LE CLIENT
 * ------------------------------------------------------------------ */

function EUC_DEV190_getPublicDetail(payload) {
  var t0 = Date.now();

  var snap = EUC_DEV190_snapshotDetail(payload);

  if (snap.exists) {
    return {
      ok: true,
      source: 'snapshot',
      stale: !!snap.stale,
      snapshotMs: snap.durationMs,
      totalMs: Date.now() - t0,
      detail: snap.detail
    };
  }

  /*
   * Premier passage uniquement :
   * on construit le snapshot une fois, puis on le relit.
   */
  var build = EUC_DEV190_refreshClassPeriod(payload);
  var after = EUC_DEV190_snapshotDetail(payload);

  return {
    ok: true,
    source: 'snapshot-built',
    stale: false,
    buildMs: build.durationMs,
    snapshotMs: after.durationMs,
    totalMs: Date.now() - t0,
    detail: after.detail
  };
}

function EUC_DEV190_refreshIfStale(payload) {
  var snap = EUC_DEV190_snapshotDetail(payload);

  if (snap.exists && !snap.stale) {
    return {
      ok: true,
      refreshed: false,
      reason: 'fresh'
    };
  }

  var r = EUC_DEV190_refreshClassPeriod(payload);

  return {
    ok: true,
    refreshed: true,
    durationMs: r.durationMs
  };
}

/* ------------------------------------------------------------------
 * RECONSTRUCTION GENERALE
 * ------------------------------------------------------------------ */

function EUC_DEV190_rebuildYear(annee) {
  annee = EUC_DEV190_txt_(annee);

  if (!annee) {
    annee = EUC_PFMP_contexteAnneeLectureV155_().active;
  }

  EUC_DEV190_ensureTable();

  var meta = EUC_CONVENTION_lireClassesEtPeriodesAdmin();
  var classes = meta.classes || [];
  var periodes = meta.periodes || [];

  var done = 0;
  var errors = [];

  classes.forEach(function(c) {
    var classeId = EUC_DEV190_num_(c.id);

    periodes.forEach(function(p) {
      var periodeId = EUC_DEV190_num_(p.id);

      try {
        /*
         * Le moteur historique ignore/retourne vide si la période
         * ne concerne pas la classe.
         */
        var r = EUC_DEV190_refreshClassPeriod({
          annee: annee,
          classe: classeId,
          periode: periodeId
        });

        if (r.rows > 0) done++;
      } catch (e) {
        errors.push({
          classe: classeId,
          periode: periodeId,
          error: String(e && e.message || e)
        });
      }
    });
  });

  return {
    ok: true,
    annee: annee,
    snapshots: done,
    errors: errors.slice(0, 50)
  };
}

function EUC_DEV190_diagnostic() {
  var cfg;

  try {
    cfg = EUC_DEV190_gristConfig_();
  } catch (e) {
    return {
      ok: false,
      stage: 'config',
      error: String(e && e.message || e)
    };
  }

  try {
    var table = EUC_DEV190_ensureTable();

    return {
      ok: true,
      table: table,
      gristBase: cfg.base,
      docIdPresent: !!cfg.docId,
      tokenPresent: !!cfg.token,
      detected: cfg.detected || {}
    };
  } catch (e) {
    return {
      ok: false,
      stage: 'table',
      error: String(e && e.message || e)
    };
  }
}

/* ==================================================================
 * DEV.190C — SNAPSHOT INCREMENTAL
 * ==================================================================
 *
 * Principe :
 * - aucune suppression d'historique ;
 * - une ligne active représente l'état courant d'un élève/période ;
 * - lorsqu'un état change :
 *      ancienne version => Actif=false + Valid_to
 *      nouvelle version => Actif=true + Valid_from
 * - consultation = lecture des seules lignes Actif=true ;
 * - amorçage seulement de la classe/période demandée si absente ;
 * - vérification complète de sécurité au plus tard tous les 30 jours.
 */

var EUC_DEV190C_VERSION_ = '1.0.0-dev.190c';
var EUC_DEV190C_FULL_CHECK_MS_ = 30 * 24 * 60 * 60 * 1000;

function EUC_DEV190C_ensureColumns_() {
  EUC_DEV190_ensureTable();

  var tableInfo = EUC_DEV190_api_(
    'get',
    '/tables/' + encodeURIComponent(EUC_DEV190_TABLE_) + '/columns',
    null
  );

  var existing = {};
  (tableInfo.columns || []).forEach(function(c) {
    existing[c.id] = true;
  });

  var wanted = [
    { id: 'Actif', type: 'Bool' },
    { id: 'Valid_from', type: 'Text' },
    { id: 'Valid_to', type: 'Text' },
    { id: 'Fingerprint', type: 'Text' }
  ];

  var missing = wanted.filter(function(c) {
    return !existing[c.id];
  });

  if (missing.length) {
    EUC_DEV190_api_(
      'post',
      '/tables/' + encodeURIComponent(EUC_DEV190_TABLE_) + '/columns',
      { columns: missing }
    );
  }

  return {
    ok: true,
    added: missing.map(function(x) { return x.id; })
  };
}

function EUC_DEV190C_updateRecords_(records) {
  records = records || [];
  if (!records.length) return;

  EUC_DEV190_api_(
    'patch',
    '/tables/' + encodeURIComponent(EUC_DEV190_TABLE_) + '/records',
    { records: records }
  );
}

function EUC_DEV190C_sha_(obj) {
  var raw = JSON.stringify(obj);

  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    raw,
    Utilities.Charset.UTF_8
  );

  return bytes.map(function(b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function EUC_DEV190C_businessFields_(row) {
  return {
    Annee_scolaire: row.Annee_scolaire || '',
    Classe_id: Number(row.Classe_id) || 0,
    Classe_nom: row.Classe_nom || '',
    Periode_id: Number(row.Periode_id) || 0,
    Periode_libelle: row.Periode_libelle || '',
    Periode_debut: row.Periode_debut || '',
    Periode_fin: row.Periode_fin || '',
    Eleve_id: Number(row.Eleve_id) || 0,
    Nom: row.Nom || '',
    Prenom: row.Prenom || '',
    Statut: row.Statut || '',
    Convention_active: !!row.Convention_active,
    Entreprise: row.Entreprise || '',
    Adresse_entreprise: row.Adresse_entreprise || '',
    Contact_entreprise: row.Contact_entreprise || '',
    Tuteur: row.Tuteur || '',
    Prof_principal: row.Prof_principal || '',
    Prof_suivi: row.Prof_suivi || '',
    Prof_visiteur: row.Prof_visiteur || '',
    Apprenti: !!row.Apprenti,
    Parcours_differencie: !!row.Parcours_differencie,
    Statut_mixte: !!row.Statut_mixte,
    Annulee_interrompue: !!row.Annulee_interrompue
  };
}

function EUC_DEV190C_prepareRow_(row, nowIso) {
  var business = EUC_DEV190C_businessFields_(row);

  Object.keys(business).forEach(function(k) {
    row[k] = business[k];
  });

  row.Actif = true;
  row.Valid_from = nowIso;
  row.Valid_to = '';
  row.Updated_at = nowIso;
  row.Snapshot_version = EUC_DEV190C_VERSION_;
  row.Fingerprint = EUC_DEV190C_sha_(business);

  return row;
}

function EUC_DEV190C_activeRecords_(annee, classeId, periodeId) {
  var records = EUC_DEV190_records_({
    Annee_scolaire: annee,
    Classe_id: classeId,
    Periode_id: periodeId
  });

  return records.filter(function(r) {
    var f = r.fields || {};

    /*
     * Compatibilité avec les lignes créées avant DEV190C :
     * si Actif n'existe pas encore, on les considère actives.
     */
    return f.Actif !== false;
  });
}

function EUC_DEV190C_syncClassPeriod(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var classeId = EUC_DEV190_num_(payload.classe);
  var periodeId = EUC_DEV190_num_(payload.periode);

  if (!annee || !classeId || !periodeId) {
    throw new Error(
      'DEV190C : année, classe et période obligatoires.'
    );
  }

  EUC_DEV190C_ensureColumns_();

  var t0 = Date.now();
  var nowIso = EUC_DEV190_isoNow_();

  /*
   * On calcule UNIQUEMENT la classe/période concernée.
   * Jamais les 38 classes.
   */
  var d = EUC_DEV190_buildHistoricalDetail_(
    annee,
    classeId,
    periodeId
  );

  var currentRows = (d.lignes || []).map(function(x) {
    var row = EUC_DEV190_rowFromDetail_(
      d,
      x,
      annee,
      classeId,
      periodeId
    );

    return EUC_DEV190C_prepareRow_(row, nowIso);
  });

  var oldActive = EUC_DEV190C_activeRecords_(
    annee,
    classeId,
    periodeId
  );

  var oldByStudent = {};
  oldActive.forEach(function(r) {
    var f = r.fields || {};
    oldByStudent[String(Number(f.Eleve_id) || 0)] = r;
  });

  var currentByStudent = {};
  currentRows.forEach(function(r) {
    currentByStudent[String(Number(r.Eleve_id) || 0)] = r;
  });

  var closeRecords = [];
  var addRows = [];
  var unchanged = 0;

  /*
   * Ajouts / modifications.
   */
  currentRows.forEach(function(row) {
    var key = String(Number(row.Eleve_id) || 0);
    var old = oldByStudent[key];

    if (!old) {
      addRows.push(row);
      return;
    }

    var of = old.fields || {};
    var oldFingerprint = of.Fingerprint || '';

    /*
     * Pour une ancienne ligne DEV190 sans fingerprint,
     * on reconstitue une empreinte depuis ses champs.
     */
    if (!oldFingerprint) {
      oldFingerprint = EUC_DEV190C_sha_(
        EUC_DEV190C_businessFields_(of)
      );
    }

    if (oldFingerprint === row.Fingerprint) {
      unchanged++;
      return;
    }

    closeRecords.push({
      id: old.id,
      fields: {
        Actif: false,
        Valid_to: nowIso,
        Updated_at: nowIso
      }
    });

    addRows.push(row);
  });

  /*
   * Élève qui n'est plus dans cette classe/période :
   * on clôture sa version active mais ON NE LA SUPPRIME PAS.
   */
  oldActive.forEach(function(old) {
    var f = old.fields || {};
    var key = String(Number(f.Eleve_id) || 0);

    if (!currentByStudent[key]) {
      closeRecords.push({
        id: old.id,
        fields: {
          Actif: false,
          Valid_to: nowIso,
          Updated_at: nowIso
        }
      });
    }
  });

  EUC_DEV190C_updateRecords_(closeRecords);
  EUC_DEV190_addRows_(addRows);

  return {
    ok: true,
    annee: annee,
    classe: classeId,
    periode: periodeId,
    addedOrChanged: addRows.length,
    closed: closeRecords.length,
    unchanged: unchanged,
    totalCurrent: currentRows.length,
    durationMs: Date.now() - t0
  };
}

function EUC_DEV190C_snapshotDetail(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var classeId = EUC_DEV190_num_(payload.classe);
  var periodeId = EUC_DEV190_num_(payload.periode);

  if (!annee || !classeId || !periodeId) {
    throw new Error(
      'DEV190C : année, classe et période obligatoires.'
    );
  }

  EUC_DEV190C_ensureColumns_();

  var t0 = Date.now();

  var records = EUC_DEV190C_activeRecords_(
    annee,
    classeId,
    periodeId
  );

  if (!records.length) {
    return {
      ok: true,
      exists: false,
      durationMs: Date.now() - t0,
      detail: null
    };
  }

  var first = records[0].fields || {};
  var newest = 0;

  records.forEach(function(r) {
    var f = r.fields || {};
    var t = Date.parse(f.Updated_at || f.Valid_from || '');
    if (isFinite(t) && t > newest) newest = t;
  });

  return {
    ok: true,
    exists: true,

    /*
     * Sécurité uniquement :
     * une vérification générale est due au bout de 30 jours.
     * Les événements métier peuvent appeler syncClassPeriod avant.
     */
    verificationDue:
      !newest ||
      (Date.now() - newest) > EUC_DEV190C_FULL_CHECK_MS_,

    updatedAt:
      newest
        ? new Date(newest).toISOString()
        : '',

    durationMs:
      Date.now() - t0,

    detail: {
      annee: annee,

      classe: {
        id: classeId,
        nom: first.Classe_nom || ''
      },

      periode: {
        id: periodeId,
        libelle: first.Periode_libelle || '',
        debutFr: first.Periode_debut || '',
        finFr: first.Periode_fin || ''
      },

      lignes: records.map(function(r) {
        var f = r.fields || {};

        return {
          eleveId: EUC_DEV190_num_(f.Eleve_id),
          nom: f.Nom || '',
          prenom: f.Prenom || '',
          statut: f.Statut || '',
          entreprise: f.Entreprise || '',
          adresseEntreprise: f.Adresse_entreprise || '',
          contactEntreprise: f.Contact_entreprise || '',
          tuteurEntreprise: f.Tuteur || '',
          professeurPrincipal: f.Prof_principal || '',
          professeurTelephone: f.Prof_suivi || '',
          professeurVisiteur: f.Prof_visiteur || '',
          apprenti: !!f.Apprenti,
          parcoursDifferencie: !!f.Parcours_differencie,
          statutMixte: !!f.Statut_mixte,
          annuleeInterrompue: !!f.Annulee_interrompue
        };
      })
    }
  };
}

function EUC_DEV190C_getPublicDetail(payload) {
  var t0 = Date.now();

  var snap = EUC_DEV190C_snapshotDetail(payload);

  /*
   * Cas normal :
   * lecture directe de la table matérialisée.
   */
  if (snap.exists) {
    return {
      ok: true,
      source: 'snapshot-incremental',
      verificationDue: !!snap.verificationDue,
      snapshotMs: snap.durationMs,
      totalMs: Date.now() - t0,
      detail: snap.detail
    };
  }

  /*
   * Amorçage ciblé :
   * uniquement cette classe/période.
   */
  var sync = EUC_DEV190C_syncClassPeriod(payload);
  var after = EUC_DEV190C_snapshotDetail(payload);

  return {
    ok: true,
    source: 'snapshot-initialized',
    verificationDue: false,
    syncMs: sync.durationMs,
    snapshotMs: after.durationMs,
    totalMs: Date.now() - t0,
    detail: after.detail
  };
}

/*
 * Hook générique à appeler après :
 * - création/modification/annulation d'une convention ;
 * - changement apprenti/P.dif. ;
 * - affectation professeur ;
 * - import Pronote/JotForm ciblé.
 *
 * Il ne reconstruit JAMAIS tout le lycée.
 */
function EUC_DEV190C_notifyChange(payload) {
  return EUC_DEV190C_syncClassPeriod(payload);
}

/*
 * Maintenance manuelle ciblée.
 */
function EUC_DEV190C_forceSync(payload) {
  return EUC_DEV190C_syncClassPeriod(payload);
}


/* ==================================================================
 * DEV.190D — CENTRE DE MAINTENANCE SNAPSHOT PFMP
 * ================================================================== */

function EUC_DEV190D_adminOptions(payload) {
  payload = payload || {};
  var annee = EUC_DEV190_txt_(payload.annee);
  if (!annee) annee = EUC_PFMP_contexteAnneeLectureV155_().active;

  var meta = EUC_CONVENTION_lireClassesEtPeriodesAdmin();

  return {
    ok: true,
    annee: annee,
    classes: (meta.classes || []).map(function(c) {
      return {
        id: Number(c.id) || 0,
        label: c.nom || c.libelle || ('Classe ' + c.id)
      };
    }),
    periodes: (meta.periodes || []).map(function(p) {
      return {
        id: Number(p.id) || 0,
        label: p.libelle || p.nom || ('Période ' + p.id)
      };
    })
  };
}

function EUC_DEV190D_snapshotStatus(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var classe = EUC_DEV190_num_(payload.classe);
  var periode = EUC_DEV190_num_(payload.periode);

  if (!annee || !classe || !periode) {
    throw new Error('DEV190D : année, classe et période obligatoires.');
  }

  EUC_DEV190C_ensureColumns_();

  var all = EUC_DEV190_records_({
    Annee_scolaire: annee,
    Classe_id: classe,
    Periode_id: periode
  });

  var actifs = all.filter(function(r) {
    return (r.fields || {}).Actif !== false;
  });

  var last = 0;
  all.forEach(function(r) {
    var f = r.fields || {};
    var t = Date.parse(f.Updated_at || f.Valid_from || '');
    if (isFinite(t) && t > last) last = t;
  });

  return {
    ok: true,
    actifs: actifs.length,
    historiques: Math.max(0, all.length - actifs.length),
    totalVersions: all.length,
    derniereMaj: last ? new Date(last).toISOString() : '',
    verification30jDue: !last || (Date.now() - last) > EUC_DEV190C_FULL_CHECK_MS_
  };
}

function EUC_DEV190D_syncTarget(payload) {
  return EUC_DEV190C_forceSync(payload || {});
}

function EUC_DEV190D_diagnostic() {
  var base = EUC_DEV190_diagnostic();
  if (!base || !base.ok) return base;

  var columns = EUC_DEV190C_ensureColumns_();

  return {
    ok: true,
    table: base.table,
    detected: base.detected || {},
    gristBase: base.gristBase || '',
    incrementalColumns: columns.added || [],
    mode: 'incremental',
    historique: 'conserve',
    verificationSecurite: '30 jours'
  };
}

/* ==================================================================
 * DEV.190E — INDEX PERSISTANT PAGES INTERMEDIAIRES
 * ================================================================== */

var EUC_DEV190E_INDEX_TABLE_ = 'EUC_SUIVI_PFMP_INDEX';

function EUC_DEV190E_ensureIndexTable_() {
  var t = EUC_DEV190_api_('get', '/tables', null);
  var exists = (t.tables || []).some(function(x) {
    return x.id === EUC_DEV190E_INDEX_TABLE_;
  });

  if (exists) return { ok: true, created: false };

  EUC_DEV190_api_(
    'post',
    '/tables',
    {
      tables: [{
        id: EUC_DEV190E_INDEX_TABLE_,
        columns: [
          { id: 'Annee_scolaire', type: 'Text' },
          { id: 'Famille', type: 'Text' },
          { id: 'Payload_JSON', type: 'Text' },
          { id: 'Updated_at', type: 'Text' },
          { id: 'Actif', type: 'Bool' }
        ]
      }]
    }
  );

  return { ok: true, created: true };
}

function EUC_DEV190E_indexRows_(annee, famille) {
  EUC_DEV190E_ensureIndexTable_();

  var path =
    '/tables/' + encodeURIComponent(EUC_DEV190E_INDEX_TABLE_) +
    '/records?filter=' +
    encodeURIComponent(JSON.stringify({
      Annee_scolaire: [annee],
      Famille: [famille]
    }));

  var r = EUC_DEV190_api_('get', path, null);

  return (r.records || []).filter(function(x) {
    return (x.fields || {}).Actif !== false;
  });
}

function EUC_DEV190E_readFamilyIndex_(annee, famille) {
  var rows = EUC_DEV190E_indexRows_(annee, famille);
  if (!rows.length) return null;

  rows.sort(function(a, b) {
    var ta = Date.parse((a.fields || {}).Updated_at || '') || 0;
    var tb = Date.parse((b.fields || {}).Updated_at || '') || 0;
    return tb - ta;
  });

  try {
    return JSON.parse((rows[0].fields || {}).Payload_JSON || '{}');
  } catch (e) {
    return null;
  }
}

function EUC_DEV190E_writeFamilyIndex_(annee, famille, payload) {
  var old = EUC_DEV190E_indexRows_(annee, famille);
  var now = EUC_DEV190_isoNow_();

  if (old.length) {
    EUC_DEV190_api_(
      'patch',
      '/tables/' + encodeURIComponent(EUC_DEV190E_INDEX_TABLE_) + '/records',
      {
        records: old.map(function(r) {
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
    '/tables/' + encodeURIComponent(EUC_DEV190E_INDEX_TABLE_) + '/records',
    {
      records: [{
        fields: {
          Annee_scolaire: annee,
          Famille: famille,
          Payload_JSON: JSON.stringify(payload),
          Updated_at: now,
          Actif: true
        }
      }]
    }
  );

  if (typeof EUC_DEV421_familyCacheInvalidate_ === 'function') {
    EUC_DEV421_familyCacheInvalidate_(annee, famille);
  }

  return { ok: true };
}

function EUC_DEV190E_heavyFamily_(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var famille = EUC_DEV190_txt_(payload.famille);
  var r = null;

  if (typeof EUC_APP172_chargerFamille === 'function') {
    try {
      r = EUC_APP172_chargerFamille({
        annee: annee,
        famille: famille
      });
    } catch (e) {}
  }

  if (!r && typeof EUC_SUIVI_PUBLIC_chargerFamilleV51 === 'function') {
    r = EUC_SUIVI_PUBLIC_chargerFamilleV51({
      annee: annee,
      famille: famille
    });
  }

  if (!r && typeof EUC_DEV176_chargerFamille === 'function') {
    r = EUC_DEV176_chargerFamille({
      annee: annee,
      famille: famille
    });
  }

  if (!r) {
    throw new Error('DEV190E : moteur famille historique introuvable.');
  }

  return r;
}

function EUC_DEV190E_syncFamilyIndex(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var famille = EUC_DEV190_txt_(payload.famille);

  if (!annee || !famille) {
    throw new Error('DEV190E : année et famille obligatoires.');
  }

  var t0 = Date.now();
  var r = EUC_DEV190E_heavyFamily_({
    annee: annee,
    famille: famille
  });

  EUC_DEV190E_writeFamilyIndex_(annee, famille, r);

  return {
    ok: true,
    annee: annee,
    famille: famille,
    classes: (r.classes || []).length,
    durationMs: Date.now() - t0
  };
}

function EUC_DEV190E_chargerFamille(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var famille = EUC_DEV190_txt_(payload.famille);

  var indexed = EUC_DEV190E_readFamilyIndex_(annee, famille);

  if (indexed) {
    indexed.__source = 'index-persistant';
    return indexed;
  }

  var r = EUC_DEV190E_heavyFamily_(payload);
  EUC_DEV190E_writeFamilyIndex_(annee, famille, r);

  r.__source = 'index-initialise';
  return r;
}

function EUC_DEV190E_resumeFamille(payload) {
  payload = payload || {};

  var famille = EUC_DEV190_txt_(payload.famille);
  var r = EUC_DEV190E_chargerFamille(payload);

  var effectif = 0;
  var apprentis = 0;
  var periods = {};

  (r.classes || []).forEach(function(c) {
    effectif += Number(c.effectif || c.total || 0);
    apprentis += Number(c.apprentis || 0);

    (c.periodes || []).forEach(function(p) {
      var k = String(p.libelle || p.nom || p.id || '');

      if (!periods[k]) {
        periods[k] = {
          libelle: p.libelle || p.nom || k,
          conventions: 0,
          total: 0
        };
      }

      periods[k].conventions += Number(p.conventions || 0);
      periods[k].total += Number(p.total || 0);
    });
  });

  return {
    code: famille,
    libelle: famille === 'BACPRO' ? 'BAC PRO' : famille,
    classes: (r.classes || []).length,
    effectif: effectif,
    apprentis: apprentis,
    periodes: Object.keys(periods).map(function(k) {
      return periods[k];
    })
  };
}

function EUC_DEV190E_getPublicDetail(payload) {
  try {
    return EUC_DEV190C_getPublicDetail(payload || {});
  } catch (snapshotError) {
    var t0 = Date.now();

    var d = EUC_DEV190_buildHistoricalDetail_(
      EUC_DEV190_txt_(payload && payload.annee),
      EUC_DEV190_num_(payload && payload.classe),
      EUC_DEV190_num_(payload && payload.periode)
    );

    return {
      ok: true,
      source: 'fallback-historique',
      totalMs: Date.now() - t0,
      snapshotError: String(
        snapshotError && snapshotError.message || snapshotError
      ),
      detail: d
    };
  }
}

function EUC_DEV190E_indexStatus(payload) {
  payload = payload || {};
  var annee = EUC_DEV190_txt_(payload.annee);
  var out = [];

  ['BACPRO','BTS','CAP'].forEach(function(famille) {
    var rows = EUC_DEV190E_indexRows_(annee, famille);
    var last = 0;

    rows.forEach(function(r) {
      var t = Date.parse((r.fields || {}).Updated_at || '') || 0;
      if (t > last) last = t;
    });

    out.push({
      famille: famille,
      present: rows.length > 0,
      updatedAt: last ? new Date(last).toISOString() : ''
    });
  });

  return {
    ok: true,
    annee: annee,
    familles: out
  };
}

/* ==================================================================
 * DEV.190F — AMORÇAGE PROGRESSIF DES SNAPSHOTS DETAIL
 * ==================================================================
 *
 * Objectif :
 * - ne pas synchroniser 38 classes à la main ;
 * - ne jamais lancer un énorme rebuild monolithique ;
 * - générer une file classe/période depuis l'index persistant famille ;
 * - traiter UNE combinaison par appel Apps Script ;
 * - progression côté navigateur, reprenable sans timeout global.
 */

function EUC_DEV190F_familyQueue(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var famille = EUC_DEV190_txt_(payload.famille);

  if (!annee || !famille) {
    throw new Error('DEV190F : année et famille obligatoires.');
  }

  var family = EUC_DEV190E_readFamilyIndex_(annee, famille);

  if (!family) {
    /*
     * Si l'index famille n'existe pas encore, on le crée une seule fois.
     * Ensuite la queue est construite à partir des données persistantes.
     */
    EUC_DEV190E_syncFamilyIndex({
      annee: annee,
      famille: famille
    });

    family = EUC_DEV190E_readFamilyIndex_(annee, famille);
  }

  if (!family) {
    throw new Error(
      'DEV190F : impossible de construire la file ' + famille + '.'
    );
  }

  var out = [];
  var seen = {};

  (family.classes || []).forEach(function(c) {
    var classeId = Number(c.classeId || c.id) || 0;
    var classeNom = c.classe || c.nom || ('Classe ' + classeId);

    (c.periodes || []).forEach(function(p) {
      var periodeId = Number(p.id || p.periodeId) || 0;

      if (!classeId || !periodeId) return;

      var key = classeId + '_' + periodeId;
      if (seen[key]) return;
      seen[key] = true;

      out.push({
        annee: annee,
        famille: famille,
        classe: classeId,
        classeNom: classeNom,
        periode: periodeId,
        periodeLibelle:
          p.libelle ||
          p.nom ||
          ('Période ' + periodeId)
      });
    });
  });

  return {
    ok: true,
    annee: annee,
    famille: famille,
    count: out.length,
    items: out
  };
}

function EUC_DEV190F_allQueue(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);

  if (!annee) {
    throw new Error('DEV190F : année obligatoire.');
  }

  var all = [];

  ['BACPRO','BTS','CAP'].forEach(function(famille) {
    var q = EUC_DEV190F_familyQueue({
      annee: annee,
      famille: famille
    });

    all = all.concat(q.items || []);
  });

  return {
    ok: true,
    annee: annee,
    count: all.length,
    items: all
  };
}

function EUC_DEV190F_syncOne(item) {
  item = item || {};

  var t0 = Date.now();

  var r = EUC_DEV190C_syncClassPeriod({
    annee: item.annee,
    classe: item.classe,
    periode: item.periode
  });

  return {
    ok: true,
    famille: item.famille || '',
    classe: item.classe,
    classeNom: item.classeNom || '',
    periode: item.periode,
    periodeLibelle: item.periodeLibelle || '',
    addedOrChanged: r.addedOrChanged || 0,
    closed: r.closed || 0,
    unchanged: r.unchanged || 0,
    totalCurrent: r.totalCurrent || 0,
    durationMs: Date.now() - t0
  };
}

function EUC_DEV190F_statusOne(item) {
  item = item || {};

  var snap = EUC_DEV190C_snapshotDetail({
    annee: item.annee,
    classe: item.classe,
    periode: item.periode
  });

  return {
    ok: true,
    exists: !!snap.exists,
    verificationDue: !!snap.verificationDue,
    updatedAt: snap.updatedAt || ''
  };
}

/* ==================================================================
 * DEV.190G — HOT READ
 * ==================================================================
 *
 * Le défaut des versions précédentes :
 * - chaque lecture snapshot appelait ensureTable / ensureColumns ;
 * - chaque lecture index appelait ensureIndexTable ;
 * - cela ajoutait des requêtes Grist inutiles AVANT la vraie lecture.
 *
 * DEV190G :
 * - lecture = UNE requête /records filtrée ;
 * - contrôles de structure uniquement dans le centre de maintenance ;
 * - aucune reconstruction automatique dans une consultation ;
 * - si snapshot absent, on le signale immédiatement.
 */

function EUC_DEV190G_fastRecords_(tableName, filterObj) {
  var path =
    '/tables/' +
    encodeURIComponent(tableName) +
    '/records?filter=' +
    encodeURIComponent(
      JSON.stringify(filterObj || {})
    );

  var r = EUC_DEV190_api_(
    'get',
    path,
    null
  );

  return r.records || [];
}

function EUC_DEV190G_snapshotDetail(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var classeId = EUC_DEV190_num_(payload.classe);
  var periodeId = EUC_DEV190_num_(payload.periode);

  if (!annee || !classeId || !periodeId) {
    throw new Error(
      'DEV190G : année, classe et période obligatoires.'
    );
  }

  var t0 = Date.now();

  /*
   * IMPORTANT :
   * pas de ensureTable(), pas de ensureColumns()
   * sur le chemin de consultation.
   */
  var records = EUC_DEV190G_fastRecords_(
    EUC_DEV190_TABLE_,
    {
      Annee_scolaire: [annee],
      Classe_id: [classeId],
      Periode_id: [periodeId],
      Actif: [true]
    }
  );

  /*
   * Compatibilité avec snapshots créés avant Actif :
   * si rien trouvé, seconde lecture ciblée sans Actif.
   */
  if (!records.length) {
    records = EUC_DEV190G_fastRecords_(
      EUC_DEV190_TABLE_,
      {
        Annee_scolaire: [annee],
        Classe_id: [classeId],
        Periode_id: [periodeId]
      }
    ).filter(function(r) {
      return (r.fields || {}).Actif !== false;
    });
  }

  if (!records.length) {
    return {
      ok: true,
      exists: false,
      durationMs: Date.now() - t0,
      detail: null
    };
  }

  var first = records[0].fields || {};
  var newest = 0;

  records.forEach(function(r) {
    var f = r.fields || {};
    var t = Date.parse(
      f.Updated_at ||
      f.Valid_from ||
      ''
    );

    if (isFinite(t) && t > newest) {
      newest = t;
    }
  });

  return {
    ok: true,
    exists: true,
    durationMs: Date.now() - t0,
    updatedAt:
      newest
        ? new Date(newest).toISOString()
        : '',
    detail: {
      annee: annee,

      classe: {
        id: classeId,
        nom: first.Classe_nom || ''
      },

      periode: {
        id: periodeId,
        libelle: first.Periode_libelle || '',
        debutFr: first.Periode_debut || '',
        finFr: first.Periode_fin || ''
      },

      lignes: records.map(function(r) {
        var f = r.fields || {};

        return {
          eleveId: EUC_DEV190_num_(f.Eleve_id),
          nom: f.Nom || '',
          prenom: f.Prenom || '',
          statut: f.Statut || '',
          entreprise: f.Entreprise || '',
          adresseEntreprise: f.Adresse_entreprise || '',
          contactEntreprise: f.Contact_entreprise || '',
          tuteurEntreprise: f.Tuteur || '',
          professeurPrincipal: f.Prof_principal || '',
          professeurTelephone: f.Prof_suivi || '',
          professeurVisiteur: f.Prof_visiteur || '',
          apprenti: !!f.Apprenti,
          parcoursDifferencie: !!f.Parcours_differencie,
          statutMixte: !!f.Statut_mixte,
          annuleeInterrompue: !!f.Annulee_interrompue
        };
      })
    }
  };
}

function EUC_DEV190G_getPublicDetail(payload) {
  var t0 = Date.now();
  var snap = EUC_DEV190G_snapshotDetail(payload);

  if (snap.exists) {
    return {
      ok: true,
      ready: true,
      source: 'snapshot-hot-read',
      snapshotMs: snap.durationMs,
      totalMs: Date.now() - t0,
      detail: snap.detail
    };
  }

  /*
   * On NE reconstruit PAS pendant la consultation.
   * La page répond immédiatement et indique que la combinaison
   * doit être amorcée par DEV190F / centre maintenance.
   */
  return {
    ok: true,
    ready: false,
    source: 'snapshot-absent',
    snapshotMs: snap.durationMs,
    totalMs: Date.now() - t0,
    detail: null
  };
}

function EUC_DEV190G_fastFamilyIndex(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var famille = EUC_DEV190_txt_(payload.famille);

  if (!annee || !famille) {
    throw new Error(
      'DEV190G : année et famille obligatoires.'
    );
  }

  var t0 = Date.now();

  /*
   * Là encore : aucun ensureIndexTable_() sur le chemin de lecture.
   */
  var rows = EUC_DEV190G_fastRecords_(
    EUC_DEV190E_INDEX_TABLE_,
    {
      Annee_scolaire: [annee],
      Famille: [famille],
      Actif: [true]
    }
  );

  if (!rows.length) {
    return {
      ok: true,
      ready: false,
      durationMs: Date.now() - t0,
      payload: null
    };
  }

  rows.sort(function(a, b) {
    var ta = Date.parse(
      (a.fields || {}).Updated_at || ''
    ) || 0;

    var tb = Date.parse(
      (b.fields || {}).Updated_at || ''
    ) || 0;

    return tb - ta;
  });

  var parsed = null;

  try {
    parsed = JSON.parse(
      (rows[0].fields || {}).Payload_JSON || '{}'
    );
  } catch (e) {}

  return {
    ok: true,
    ready: !!parsed,
    durationMs: Date.now() - t0,
    payload: parsed
  };
}

function EUC_DEV190G_chargerFamille(payload) {
  var fast = EUC_DEV190G_fastFamilyIndex(payload);

  if (fast.ready) {
    var r = fast.payload;
    r.__source = 'index-hot-read';
    r.__durationMs = fast.durationMs;
    return r;
  }

  /*
   * Fallback uniquement si index absent.
   * Après amorçage BACPRO/BTS/CAP, ce chemin ne doit plus être utilisé.
   */
  return EUC_DEV190E_chargerFamille(payload);
}

function EUC_DEV190G_resumeFamille(payload) {
  var famille = EUC_DEV190_txt_(payload && payload.famille);
  var r = EUC_DEV190G_chargerFamille(payload || {});

  var effectif = 0;
  var apprentis = 0;
  var periods = {};

  (r.classes || []).forEach(function(c) {
    effectif += Number(c.effectif || c.total || 0);
    apprentis += Number(c.apprentis || 0);

    (c.periodes || []).forEach(function(p) {
      var k = String(
        p.libelle ||
        p.nom ||
        p.id ||
        ''
      );

      if (!periods[k]) {
        periods[k] = {
          libelle: p.libelle || p.nom || k,
          conventions: 0,
          total: 0
        };
      }

      periods[k].conventions += Number(p.conventions || 0);
      periods[k].total += Number(p.total || 0);
    });
  });

  return {
    code: famille,
    libelle:
      famille === 'BACPRO'
        ? 'BAC PRO'
        : famille,
    classes: (r.classes || []).length,
    effectif: effectif,
    apprentis: apprentis,
    periodes: Object.keys(periods).map(function(k) {
      return periods[k];
    }),
    __source: r.__source || '',
    __durationMs: r.__durationMs || 0
  };
}

function EUC_DEV190G_diagnosticHotRead(payload) {
  payload = payload || {};

  var out = {
    ok: true
  };

  if (
    payload.annee &&
    payload.classe &&
    payload.periode
  ) {
    out.detail =
      EUC_DEV190G_snapshotDetail(payload);
  }

  if (
    payload.annee &&
    payload.famille
  ) {
    out.famille =
      EUC_DEV190G_fastFamilyIndex(payload);
  }

  return out;
}

/* ==================================================================
 * DEV.190G1 — HOT READ INDEX ROBUSTE
 * ==================================================================
 *
 * Correction :
 * ne plus filtrer Actif=true côté API Grist.
 * On lit uniquement année + famille, puis on filtre Actif côté Apps Script.
 *
 * Pourquoi :
 * certaines anciennes lignes / conversions Bool Grist peuvent ne pas
 * répondre au filtre REST Actif:[true] alors qu'elles sont bien présentes.
 */

function EUC_DEV394_BASE_EUC_DEV190G1_fastFamilyIndex(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var famille = EUC_DEV190_txt_(payload.famille);

  if (!annee || !famille) {
    throw new Error(
      'DEV190G1 : année et famille obligatoires.'
    );
  }

  var t0 = Date.now();

  var rows = EUC_DEV190G_fastRecords_(
    EUC_DEV190E_INDEX_TABLE_,
    {
      Annee_scolaire: [annee],
      Famille: [famille]
    }
  );

  var allCount = rows.length;

  rows = rows.filter(function(r) {
    return (r.fields || {}).Actif !== false;
  });

  if (!rows.length) {
    return {
      ok: true,
      ready: false,
      durationMs: Date.now() - t0,
      totalRows: allCount,
      activeRows: 0,
      payload: null
    };
  }

  rows.sort(function(a, b) {
    var ta = Date.parse(
      (a.fields || {}).Updated_at || ''
    ) || 0;

    var tb = Date.parse(
      (b.fields || {}).Updated_at || ''
    ) || 0;

    return tb - ta;
  });

  var parsed = null;

  try {
    parsed = JSON.parse(
      (rows[0].fields || {}).Payload_JSON || '{}'
    );
  } catch (e) {
    return {
      ok: false,
      ready: false,
      durationMs: Date.now() - t0,
      totalRows: allCount,
      activeRows: rows.length,
      parseError: String(e && e.message || e),
      payload: null
    };
  }

  return {
    ok: true,
    ready: !!parsed,
    durationMs: Date.now() - t0,
    totalRows: allCount,
    activeRows: rows.length,
    payload: EUC_DEV276_enrichFamilyPayload_(parsed,annee,famille) /* DEV276_FAMILY_RUNTIME */
  };
}

function EUC_DEV190G1_chargerFamille(payload) {
  var fast = EUC_DEV190G1_fastFamilyIndex(payload);

  if (fast.ready) {
    var r = fast.payload;
    r.__source = 'index-hot-read-g1';
    r.__durationMs = fast.durationMs;
    return r;
  }

  /*
   * Index réellement absent : fallback vers DEV190E.
   * Celui-ci peut initialiser l'index si nécessaire.
   */
  return EUC_DEV190E_chargerFamille(payload);
}

function EUC_DEV190G1_resumeFamille(payload) {
  payload=payload||{};
  var famille=EUC_DEV190_txt_(payload.famille);
  var r=EUC_DEV190G1_chargerFamille(payload);

  var effectif=0;
  var apprentis=0;
  var periods={};

  (r.classes||[]).forEach(function(c){
    effectif+=Number(c.effectif||c.total||0);
    apprentis+=Number(c.apprentis||0);

    (c.periodes||[]).forEach(function(p){
      var k=String(
        p.v50Slot||
        p.v51Slot||
        p.libelle||
        p.nom||
        p.id||
        ''
      );

      if(!periods[k]){
        periods[k]={
          libelle:
            p.v50Slot||
            p.v51Slot||
            p.libelle||
            p.nom||
            k,
          conventions:0,
          total:0,
          apprentis:0,
          parcoursDifferencies:0
        };
      }

      periods[k].conventions+=Number(p.conventions)||0;
      periods[k].total+=Number(p.total)||0;
      periods[k].apprentis+=Number(p.apprentis)||0;
      periods[k].parcoursDifferencies+=Number(p.parcoursDifferencies)||0;
    });
  });

  return {
    code:famille,
    libelle:famille==='BACPRO'?'BAC PRO':famille,
    classes:(r.classes||[]).length,
    effectif:effectif,
    apprentis:apprentis,
    periodes:Object.keys(periods).map(function(k){return periods[k];}),
    __source:r.__source||'',
    __durationMs:r.__durationMs||0
  };
}

function EUC_DEV190G1_diagnosticHotRead(payload) {
  payload = payload || {};

  var out = {
    ok: true
  };

  if (
    payload.annee &&
    payload.famille
  ) {
    out.famille =
      EUC_DEV190G1_fastFamilyIndex(payload);
  }

  if (
    payload.annee &&
    payload.classe &&
    payload.periode
  ) {
    out.detail =
      EUC_DEV190G_snapshotDetail(payload);
  }

  return out;
}

/* ==================================================================
 * DEV.190H3 — FONCTIONS SERVEUR AUDIT MATRICE
 * ================================================================== */

function EUC_DEV190H3_measureIndex(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var famille = EUC_DEV190_txt_(payload.famille);

  if (!annee || !famille) {
    throw new Error('DEV190H3 : année et famille obligatoires.');
  }

  var t0 = Date.now();

  var r = EUC_DEV190G1_fastFamilyIndex({
    annee: annee,
    famille: famille
  });

  return {
    ok: true,
    famille: famille,
    ready: !!r.ready,
    totalMs: Date.now() - t0,
    gristMs: r.durationMs || 0,
    totalRows: r.totalRows || 0,
    activeRows: r.activeRows || 0
  };
}

function EUC_DEV190H3_queue(annee) {
  annee = EUC_DEV190_txt_(annee);

  if (!annee) {
    annee = EUC_PFMP_contexteAnneeLectureV155_().active;
  }

  var out = [];
  var seen = {};

  ['BACPRO','BTS','CAP'].forEach(function(famille) {
    var fast = EUC_DEV190G1_fastFamilyIndex({
      annee: annee,
      famille: famille
    });

    if (!fast.ready || !fast.payload) {
      return;
    }

    (fast.payload.classes || []).forEach(function(c) {
      var classeId = Number(c.classeId || c.id) || 0;
      var classeNom = c.classe || c.nom || ('Classe ' + classeId);

      (c.periodes || []).forEach(function(p) {
        var periodeId = Number(p.id || p.periodeId) || 0;

        if (!classeId || !periodeId) {
          return;
        }

        var key = classeId + '_' + periodeId;

        if (seen[key]) {
          return;
        }

        seen[key] = true;

        out.push({
          annee: annee,
          famille: famille,
          classe: classeId,
          classeNom: classeNom,
          periode: periodeId,
          periodeLibelle:
            p.libelle ||
            p.nom ||
            ('Période ' + periodeId)
        });
      });
    });
  });

  return {
    ok: true,
    annee: annee,
    count: out.length,
    items: out
  };
}

function EUC_DEV190H3_measureOne(item) {
  item = item || {};

  var out = {
    ok: true,
    annee: item.annee || '',
    famille: item.famille || '',
    classe: Number(item.classe) || 0,
    classeNom: item.classeNom || '',
    periode: Number(item.periode) || 0,
    periodeLibelle: item.periodeLibelle || ''
  };

  var t;

  // 1) Lecture seule / snapshot direct.
  t = Date.now();

  try {
    var snap = EUC_DEV190G_snapshotDetail({
      annee: item.annee,
      classe: item.classe,
      periode: item.periode
    });

    out.visiteurMs = Date.now() - t;
    out.snapshotExiste = !!snap.exists;
    out.nbEleves =
      snap.exists &&
      snap.detail &&
      snap.detail.lignes
        ? snap.detail.lignes.length
        : 0;
  } catch (e) {
    out.visiteurMs = Date.now() - t;
    out.snapshotExiste = false;
    out.visiteurErreur =
      String(e && e.message || e);
  }

  // 2) Admin / moteur utilisé par la fiche admin actuelle.
  t = Date.now();

  try {
    if (typeof EUC_DEV185_detail_ === 'function') {
      var d = EUC_DEV185_detail_(
        item.annee,
        Number(item.classe),
        Number(item.periode)
      );

      out.adminMs = Date.now() - t;
      out.adminEleves =
        d && d.lignes
          ? d.lignes.length
          : 0;
    } else {
      out.adminMs = null;
      out.adminErreur =
        'EUC_DEV185_detail_ indisponible';
    }
  } catch (e2) {
    out.adminMs = Date.now() - t;
    out.adminErreur =
      String(e2 && e2.message || e2);
  }

  // 3) Rendu HTML pur.
  t = Date.now();

  try {
    var html = '';

    if (out.snapshotExiste) {
      var snap2 = EUC_DEV190G_snapshotDetail({
        annee: item.annee,
        classe: item.classe,
        periode: item.periode
      });

      var d2 = snap2.detail || {};

      html = (d2.lignes || []).map(function(x) {
        return '<tr><td>' +
          EUC_DEV190_txt_(x.nom) + ' ' +
          EUC_DEV190_txt_(x.prenom) +
          '</td><td>' +
          EUC_DEV190_txt_(x.statut) +
          '</td></tr>';
      }).join('');
    }

    out.renduMs = Date.now() - t;
    out.renduOctets = html.length;
  } catch (e3) {
    out.renduMs = Date.now() - t;
    out.renduErreur =
      String(e3 && e3.message || e3);
  }

  return out;
}

/* ==================================================================
 * DEV.190H4 — DIAGNOSTIC AUDIT ROBUSTE
 * ================================================================== */

function EUC_DEV190H4_ping() {
  return {
    ok: true,
    now: new Date().toISOString()
  };
}

function EUC_DEV190H4_measureIndex(payload) {
  payload = payload || {};

  var t0 = Date.now();

  var r = EUC_DEV190G1_fastFamilyIndex({
    annee: EUC_DEV190_txt_(payload.annee),
    famille: EUC_DEV190_txt_(payload.famille)
  });

  return {
    ok: true,
    famille: EUC_DEV190_txt_(payload.famille),
    ready: !!r.ready,
    totalMs: Date.now() - t0,
    gristMs: Number(r.durationMs || 0),
    totalRows: Number(r.totalRows || 0),
    activeRows: Number(r.activeRows || 0)
  };
}

/* ==================================================================
 * DEV.190I — SNAPSHOT DETAIL V2
 * Une ligne JSON par année + classe + période.
 * ================================================================== */

var EUC_DEV190I_TABLE_ = 'EUC_SUIVI_PFMP_DETAIL_SNAPSHOT';
var EUC_DEV190I_VERSION_ = '1.0.0-dev.190i';

function EUC_DEV190I_ensureTable_() {
  var t = EUC_DEV190_api_('get', '/tables', null);
  var exists = (t.tables || []).some(function(x) {
    return x.id === EUC_DEV190I_TABLE_;
  });

  if (exists) {
    return { ok: true, created: false, table: EUC_DEV190I_TABLE_ };
  }

  EUC_DEV190_api_(
    'post',
    '/tables',
    {
      tables: [{
        id: EUC_DEV190I_TABLE_,
        columns: [
          { id: 'Annee_scolaire', type: 'Text' },
          { id: 'Famille', type: 'Text' },
          { id: 'Classe_id', type: 'Int' },
          { id: 'Classe_nom', type: 'Text' },
          { id: 'Periode_id', type: 'Int' },
          { id: 'Periode_libelle', type: 'Text' },
          { id: 'Payload_JSON', type: 'Text' },
          { id: 'Fingerprint', type: 'Text' },
          { id: 'Updated_at', type: 'Text' },
          { id: 'Valid_from', type: 'Text' },
          { id: 'Valid_to', type: 'Text' },
          { id: 'Actif', type: 'Bool' },
          { id: 'Snapshot_version', type: 'Text' }
        ]
      }]
    }
  );

  return { ok: true, created: true, table: EUC_DEV190I_TABLE_ };
}

function EUC_DEV190I_allRows_() {
  var r = EUC_DEV190_api_(
    'get',
    '/tables/' + encodeURIComponent(EUC_DEV190I_TABLE_) + '/records',
    null
  );
  return r.records || [];
}

function EUC_DEV190I_activeRows_(payload) {
  payload=payload||{};
  var rows=EUC_DEV190G_fastRecords_(
    EUC_DEV190I_TABLE_,
    {
      Annee_scolaire:[String(payload.annee||'')],
      Classe_id:[Number(payload.classe||0)],
      Periode_id:[Number(payload.periode||0)]
    }
  );
  return rows
    .filter(function(r) {
      var f = r.fields || {};
      return (
        String(f.Annee_scolaire || '') === String(payload.annee || '') &&
        Number(f.Classe_id || 0) === Number(payload.classe || 0) &&
        Number(f.Periode_id || 0) === Number(payload.periode || 0) &&
        f.Actif !== false
      );
    })
    .sort(function(a, b) {
      var ta = Date.parse((a.fields || {}).Updated_at || '') || 0;
      var tb = Date.parse((b.fields || {}).Updated_at || '') || 0;
      return tb - ta;
    });
}

function EUC_DEV190I_familyCode_(d) {
  var nom = String(d && d.classe && d.classe.nom || '').toUpperCase();
  var cat = String(d && d.classe && d.classe.categorie || '').toUpperCase();

  if (cat.indexOf('BTS') >= 0 || nom.indexOf('BTS') >= 0) return 'BTS';
  if (cat.indexOf('CAP') >= 0 || nom.indexOf('CAP') >= 0) return 'CAP';
  return 'BACPRO';
}

function EUC_DEV190I_hash_(detail) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(detail || {}),
    Utilities.Charset.UTF_8
  );

  return bytes.map(function(b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function EUC_DEV190I_syncOne(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var classe = EUC_DEV190_num_(payload.classe);
  var periode = EUC_DEV190_num_(payload.periode);

  if (!annee || !classe || !periode) {
    throw new Error('DEV190I : année, classe et période obligatoires.');
  }

  EUC_DEV190I_ensureTable_();

  var t0 = Date.now();
  var detail = EUC_DEV190_buildHistoricalDetail_(annee, classe, periode);

  if (!detail) {
    throw new Error('DEV190I : détail historique vide.');
  }

  var fingerprint = EUC_DEV190I_hash_(detail);
  var active = EUC_DEV190I_activeRows_({
    annee: annee,
    classe: classe,
    periode: periode
  });

  var now = EUC_DEV190_isoNow_();

  if (active.length) {
    var old = active[0].fields || {};

    if (String(old.Fingerprint || '') === String(fingerprint)) {
      return {
        ok: true,
        changed: false,
        eleves: detail.lignes ? detail.lignes.length : 0,
        durationMs: Date.now() - t0
      };
    }

    EUC_DEV190_api_(
      'patch',
      '/tables/' + encodeURIComponent(EUC_DEV190I_TABLE_) + '/records',
      {
        records: active.map(function(r) {
          return {
            id: r.id,
            fields: {
              Actif: false,
              Valid_to: now,
              Updated_at: now
            }
          };
        })
      }
    );
  }

  var famille = EUC_DEV190_txt_(payload.famille) || EUC_DEV190I_familyCode_(detail);

  EUC_DEV190_api_(
    'post',
    '/tables/' + encodeURIComponent(EUC_DEV190I_TABLE_) + '/records',
    {
      records: [{
        fields: {
          Annee_scolaire: annee,
          Famille: famille,
          Classe_id: classe,
          Classe_nom: EUC_DEV190_txt_(detail.classe && detail.classe.nom),
          Periode_id: periode,
          Periode_libelle: EUC_DEV190_txt_(detail.periode && detail.periode.libelle),
          Payload_JSON: JSON.stringify(detail),
          Fingerprint: fingerprint,
          Updated_at: now,
          Valid_from: now,
          Valid_to: '',
          Actif: true,
          Snapshot_version: EUC_DEV190I_VERSION_
        }
      }]
    }
  );

  if(typeof EUC_DEV421_familyCacheInvalidate_==='function'){
    EUC_DEV421_familyCacheInvalidate_(annee,famille);
  }
  try{CacheService.getScriptCache().remove(['DEV392_QUICK',annee,famille,classe,periode].join('_'));}catch(eCache){}

  return {
    ok: true,
    changed: true,
    eleves: detail.lignes ? detail.lignes.length : 0,
    durationMs: Date.now() - t0
  };
}

function EUC_DEV394_BASE_EUC_DEV190I_readOne(payload) {
  payload = payload || {};

  var t0 = Date.now();
  var rows = EUC_DEV190I_activeRows_(payload);

  if (!rows.length) {
    return {
      ok: true,
      ready: false,
      durationMs: Date.now() - t0,
      detail: null
    };
  }

  var f = rows[0].fields || {};

  try {
    var d = JSON.parse(
      f.Payload_JSON || '{}'
    );

    /*
     * 1. Restaure l'apprentissage sur les PFMP normales.
     */
    if(typeof EUC_DEV275B_enrichDetail_==='function'){
      d=EUC_DEV275B_enrichDetail_(d);
    }else if(typeof EUC_APP172_enrichirDetail==='function'){
      d=EUC_APP172_enrichirDetail(d);
    }

    /*
     * 2. DEV291 reconstruit la vue P.dif. depuis PFMP2 si nécessaire.
     */
    d = EUC_DEV291_enrichDetail_(
      d,
      String(payload.annee || ''),
      String(payload.famille || f.Famille || 'BACPRO'),
      Number(payload.classe || payload.classeId || 0)
    );

    /*
     * DEV293 :
     * Pour les poursuites PFMP2, reprend entreprise / tuteur /
     * suivi téléphonique / professeur visiteur de la PFMP2.
     */
    d = EUC_DEV293_enrichPoursuite_(
      d,
      String(payload.annee || ''),
      String(payload.famille || f.Famille || 'BACPRO'),
      Number(payload.classe || payload.classeId || 0)
    );


    return {
      ok: true,
      ready: true,
      source: 'detail-snapshot-v2+dev291a',
      durationMs: Date.now() - t0,
      updatedAt: f.Updated_at || '',
      famille: f.Famille || '',
      detail: d
    };

  } catch (e) {
    return {
      ok: false,
      ready: false,
      durationMs: Date.now() - t0,
      error: String(e && e.message || e),
      detail: null
    };
  }
}

function EUC_DEV190I_periodsForClass_(annee, famille, classeId) {
  try {
    var fast = EUC_DEV190G1_fastFamilyIndex({
      annee: annee,
      famille: famille
    });

    if (!fast.ready || !fast.payload) return [];

    var c = (fast.payload.classes || []).filter(function(x) {
      return Number(x.classeId || x.id) === Number(classeId);
    })[0];

    return c && c.periodes ? c.periodes : [];
  } catch (e) {
    return [];
  }
}

function EUC_DEV190I_afficherPublicClasse(e) {
  var ctx = EUC_PFMP_contexteAnneeLectureV155_();

  var annee = EUC_DEV190_txt_(e && e.parameter && e.parameter.annee) || ctx.active;
  var famille = EUC_DEV190_txt_(e && e.parameter && e.parameter.famille);
  var classe = Number(e && e.parameter && e.parameter.classe) || 0;
  var periode = Number(e && e.parameter && e.parameter.periode) || 0;

  var data = EUC_DEV283_readOne({
    annee: annee,
    classe: classe,
    periode: periode
  });

  var t = HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_PublicV190I');

  t.paramsJson = JSON.stringify({
    annee: annee,
    famille: famille,
    classe: classe,
    periode: periode
  });

  t.preloadJson = JSON.stringify(data);
  t.periodsJson = JSON.stringify(
    EUC_DEV190I_periodsForClass_(annee, famille, classe)
  );

  return t.evaluate()
    .setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190I_afficherAdminClasse(e) {
  var ctx = EUC_PFMP_contexteAnneeLectureV155_();

  var annee = EUC_DEV190_txt_(e && e.parameter && e.parameter.annee) || ctx.active;
  var classe = Number(e && e.parameter && e.parameter.classe) || 0;
  var periode = Number(e && e.parameter && e.parameter.periode) || 0;

  var r = EUC_DEV283_readOne({
    annee: annee,
    classe: classe,
    periode: periode
  });

  var detail = r.ready && r.detail
    ? r.detail
    : EUC_DEV190_buildHistoricalDetail_(annee, classe, periode);

  var t = HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');

  t.config = JSON.stringify({
    baseUrl: 'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec'
  });

  t.anneeContextJson = JSON.stringify(ctx);

  detail=EUC_DEV333_enrichDetail_(detail,annee,classe,periode);

  detail=EUC_DEV338_enrichDetail_(detail);

  t.detailJson = JSON.stringify(detail);

  if (typeof EUC_DEV186_breadcrumbHtml_ === 'function') {
    t.dev186BreadcrumbHtml = EUC_DEV186_breadcrumbHtml_(detail, annee);
  } else {
    t.dev186BreadcrumbHtml = '';
  }

  return t.evaluate()
    .setTitle('Suivi PFMP — ' + ((detail.classe && detail.classe.nom) || 'Classe'))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190I_status() {
  EUC_DEV190I_ensureTable_();

  var rows = EUC_DEV190I_allRows_();
  var active = rows.filter(function(r) {
    return (r.fields || {}).Actif !== false;
  });

  return {
    ok: true,
    table: EUC_DEV190I_TABLE_,
    totalVersions: rows.length,
    actifs: active.length,
    historiques: Math.max(0, rows.length - active.length)
  };
}

/* DEV.190J — normalisation coordonnées */
function EUC_DEV190J_pick_(obj, keys) {
  obj = obj || {};
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v != null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

function EUC_DEV190J_enrichContacts_(detail) {
  if (!detail || !detail.lignes) return detail;

  detail.lignes.forEach(function(x) {
    x.telephoneEntreprise = EUC_DEV190J_pick_(x, [
      'telephoneEntreprise','telEntreprise','telephone_entreprise',
      'tel_entreprise','entrepriseTelephone','entrepriseTel'
    ]);

    x.courrielEntreprise = EUC_DEV190J_pick_(x, [
      'courrielEntreprise','emailEntreprise','mailEntreprise',
      'courriel_entreprise','email_entreprise',
      'entrepriseCourriel','entrepriseEmail'
    ]);

    x.telephoneTuteur = EUC_DEV190J_pick_(x, [
      'telephoneTuteur','telTuteur','tuteurTelephone',
      'tuteurTel','telephone_tuteur','tel_tuteur'
    ]);

    x.courrielTuteur = EUC_DEV190J_pick_(x, [
      'courrielTuteur','emailTuteur','mailTuteur',
      'tuteurCourriel','tuteurEmail',
      'courriel_tuteur','email_tuteur'
    ]);

    if (!x.telephoneEntreprise && !x.courrielEntreprise && x.contactEntreprise) {
      x.coordonneesEntreprise = String(x.contactEntreprise);
    }

    if (!x.telephoneTuteur && !x.courrielTuteur && x.tuteurEntreprise) {
      x.coordonneesTuteur = String(x.tuteurEntreprise);
    }
  });

  return detail;
}

function EUC_DEV190J_syncOne(payload) {
  payload = payload || {};

  var annee = EUC_DEV190_txt_(payload.annee);
  var classe = EUC_DEV190_num_(payload.classe);
  var periode = EUC_DEV190_num_(payload.periode);

  if (!annee || !classe || !periode) {
    throw new Error('DEV190J : année, classe et période obligatoires.');
  }

  EUC_DEV190I_ensureTable_();

  var t0 = Date.now();
  var detail = EUC_DEV190_buildHistoricalDetail_(annee, classe, periode);
  detail = EUC_DEV190J_enrichContacts_(detail);

  var fingerprint = EUC_DEV190I_hash_(detail);
  var active = EUC_DEV190I_activeRows_({
    annee: annee,
    classe: classe,
    periode: periode
  });

  var now = EUC_DEV190_isoNow_();

  if (active.length) {
    var old = active[0].fields || {};

    if (String(old.Fingerprint || '') === String(fingerprint)) {
      return {
        ok: true,
        changed: false,
        eleves: detail.lignes ? detail.lignes.length : 0,
        durationMs: Date.now() - t0
      };
    }

    EUC_DEV190_api_(
      'patch',
      '/tables/' + encodeURIComponent(EUC_DEV190I_TABLE_) + '/records',
      {
        records: active.map(function(r) {
          return {
            id: r.id,
            fields: {
              Actif: false,
              Valid_to: now,
              Updated_at: now
            }
          };
        })
      }
    );
  }

  var famille = EUC_DEV190_txt_(payload.famille) || EUC_DEV190I_familyCode_(detail);

  EUC_DEV190_api_(
    'post',
    '/tables/' + encodeURIComponent(EUC_DEV190I_TABLE_) + '/records',
    {
      records: [{
        fields: {
          Annee_scolaire: annee,
          Famille: famille,
          Classe_id: classe,
          Classe_nom: EUC_DEV190_txt_(detail.classe && detail.classe.nom),
          Periode_id: periode,
          Periode_libelle: EUC_DEV190_txt_(detail.periode && detail.periode.libelle),
          Payload_JSON: JSON.stringify(detail),
          Fingerprint: fingerprint,
          Updated_at: now,
          Valid_from: now,
          Valid_to: '',
          Actif: true,
          Snapshot_version: '1.0.0-dev.190j'
        }
      }]
    }
  );

  if(typeof EUC_DEV421_familyCacheInvalidate_==='function'){
    EUC_DEV421_familyCacheInvalidate_(annee,famille);
  }
  try{CacheService.getScriptCache().remove(['DEV392_QUICK',annee,famille,classe,periode].join('_'));}catch(eCache){}

  return {
    ok: true,
    changed: true,
    eleves: detail.lignes ? detail.lignes.length : 0,
    durationMs: Date.now() - t0
  };
}


function EUC_DEV190G1_fastFamilyIndex(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV190G1_fastFamilyIndex.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV190G1_fastFamilyIndex',Date.now()-__t);
  }
}


function EUC_DEV190I_readOne(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV190I_readOne.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV190I_readOne',Date.now()-__t);
  }
}

function EUC_DEV190_api_(method,path,body){
  var r=EUC_DEV398_BASE_EUC_DEV190_api_.apply(this,arguments);
  try{if(EUC_DEV398_isAccessWrite_(method,path))EUC_DEV398_invalidateAccessCaches_();}catch(e){}
  return r;
}
