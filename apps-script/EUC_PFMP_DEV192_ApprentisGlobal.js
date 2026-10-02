/**
 * DEV.192
 * - Réutilise EUC_ENT_rechercherSiret (moteur historique qui fonctionne)
 * - Normalise sa réponse vers le tableau Apprentis
 * - Rattache / crée l'entreprise dans la base Entreprises globale
 * - Conserve un historique des contrats dans EUC_APPRENTISSAGE_PFMP
 * - Ajoute le workflow dossier/CFA/contrat/rupture/nouveau contrat
 * - Snapshot dashboard global + par classe
 */

var EUC_DEV192_APP_TABLE_ = 'EUC_APPRENTISSAGE_PFMP';
var EUC_DEV192_DASH_TABLE_ = 'EUC_APPRENTISSAGE_DASHBOARD_SNAPSHOT';

function EUC_DEV192_txt_(v) {
  return String(v == null ? '' : v).trim();
}

function EUC_DEV192_norm_(v) {
  return EUC_DEV192_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function EUC_DEV192_siret_(v) {
  return EUC_DEV192_txt_(v).replace(/\D/g, '').slice(0, 14);
}

function EUC_DEV192_refId_(v) {
  if (typeof v === 'number') return v;

  if (Array.isArray(v)) {
    for (var i = 0; i < v.length; i++) {
      if (typeof v[i] === 'number') return v[i];
    }
  }

  return Number(v) || 0;
}

function EUC_DEV192_tables_() {
  return (EUC_DEV190_api_('get', '/tables', null).tables || []);
}

function EUC_DEV192_cols_(table) {
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/' + encodeURIComponent(table) + '/columns',
      null
    ).columns || []
  );
}

function EUC_DEV192_records_(table) {
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/' + encodeURIComponent(table) + '/records',
      null
    ).records || []
  );
}

function EUC_DEV192_col_(cols, names) {
  var wanted = names.map(EUC_DEV192_norm_);

  for (var i = 0; i < cols.length; i++) {
    if (wanted.indexOf(EUC_DEV192_norm_(cols[i].id)) >= 0) {
      return cols[i].id;
    }
  }

  return '';
}

function EUC_DEV192_deepPick_(obj, names, depth) {
  if (obj == null || depth > 7) return '';

  var wanted = names.map(EUC_DEV192_norm_);

  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        var ar = EUC_DEV192_deepPick_(obj[i], names, depth + 1);
        if (ar) return ar;
      }
    } else {
      var keys = Object.keys(obj);

      for (var k = 0; k < keys.length; k++) {
        if (wanted.indexOf(EUC_DEV192_norm_(keys[k])) >= 0) {
          var v = obj[keys[k]];

          if (
            v != null &&
            typeof v !== 'object' &&
            String(v).trim() !== ''
          ) {
            return String(v).trim();
          }
        }
      }

      for (var j = 0; j < keys.length; j++) {
        var r = EUC_DEV192_deepPick_(obj[keys[j]], names, depth + 1);
        if (r) return r;
      }
    }
  }

  return '';
}

function EUC_DEV192_normalizeEntreprise_(raw, siret) {
  if (raw == null) {
    return { ok: true, found: false, siret: siret };
  }

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch (e) {}
  }

  /*
   * Les noms ci-dessous couvrent les réponses historiques EUC_ENT_*
   * et les structures usuelles API Entreprises.
   */
  var out = {
    ok: true,
    found: true,
    source: 'EUC_ENT_rechercherSiret',
    siret: siret,

    nomEntreprise: EUC_DEV192_deepPick_(raw, [
      'nom_raison_sociale',
      'raison_sociale',
      'raisonSociale',
      'denomination',
      'dénomination',
      'nomEntreprise',
      'nom_entreprise',
      'nom_complet',
      'nom'
    ], 0),

    nomCommercial: EUC_DEV192_deepPick_(raw, [
      'nom_commercial',
      'nomCommercial',
      'enseigne',
      'appellation',
      'entreprise'
    ], 0),

    adresse: EUC_DEV192_deepPick_(raw, [
      'adresse',
      'adresse_complete',
      'adresseComplete',
      'adresse_entreprise',
      'adresse_postale',
      'adresse1',
      'libelle_voie'
    ], 0),

    codePostal: EUC_DEV192_deepPick_(raw, [
      'code_postal',
      'codePostal',
      'cp'
    ], 0),

    ville: EUC_DEV192_deepPick_(raw, [
      'ville',
      'commune',
      'libelle_commune'
    ], 0),

    telephoneEntreprise: EUC_DEV192_deepPick_(raw, [
      'telephone_entreprise',
      'telephoneEntreprise',
      'telephone',
      'tel'
    ], 0),

    courrielEntreprise: EUC_DEV192_deepPick_(raw, [
      'courriel_entreprise',
      'courrielEntreprise',
      'courriel',
      'email',
      'mail'
    ], 0),

    tuteur: EUC_DEV192_deepPick_(raw, [
      'tuteur_nom',
      'nom_tuteur',
      'tuteur'
    ], 0),

    telephoneTuteur: EUC_DEV192_deepPick_(raw, [
      'tuteur_telephone',
      'telephone_tuteur',
      'telephoneTuteur'
    ], 0),

    courrielTuteur: EUC_DEV192_deepPick_(raw, [
      'tuteur_courriel',
      'courriel_tuteur',
      'courrielTuteur',
      'email_tuteur'
    ], 0)
  };

  /*
   * Si le moteur a répondu mais sans aucune donnée métier, on ne prétend
   * pas avoir trouvé l'entreprise.
   */
  if (
    !out.nomEntreprise &&
    !out.nomCommercial &&
    !out.adresse &&
    !out.codePostal &&
    !out.ville
  ) {
    out.found = false;
  }

  return out;
}

function EUC_DEV192_findGlobalEntrepriseTable_() {
  var tables = EUC_DEV192_tables_();

  var preferred = [
    'Entreprises',
    'ENTREPRISES',
    'EUC_ENTREPRISES',
    'EUC_ENTREPRISE'
  ];

  for (var p = 0; p < preferred.length; p++) {
    for (var i = 0; i < tables.length; i++) {
      if (
        EUC_DEV192_norm_(tables[i].id) ===
        EUC_DEV192_norm_(preferred[p])
      ) {
        return tables[i].id;
      }
    }
  }

  /*
   * Fallback : table contenant une colonne SIRET et dont le nom évoque
   * l'entreprise.
   */
  var scored = [];

  tables.forEach(function(t) {
    if (/SNAPSHOT|AUDIT|LOG/i.test(t.id)) return;

    try {
      var cols = EUC_DEV192_cols_(t.id);
      var hasSiret = !!EUC_DEV192_col_(cols, [
        'SIRET',
        'Numero_SIRET',
        'NumeroSIRET'
      ]);

      if (!hasSiret) return;

      var score = 0;
      var n = EUC_DEV192_norm_(t.id);

      if (n.indexOf('ENTREPRISE') >= 0) score += 20;
      if (n.indexOf('ENT') >= 0) score += 5;

      scored.push({ id: t.id, score: score });
    } catch (e) {}
  });

  scored.sort(function(a, b) {
    return b.score - a.score;
  });

  return scored.length ? scored[0].id : '';
}

function EUC_DEV192_upsertGlobalEntreprise_(data) {
  var table = EUC_DEV192_findGlobalEntrepriseTable_();

  if (!table) {
    return {
      ok: false,
      linked: false,
      warning: 'Base Entreprises globale introuvable'
    };
  }

  var cols = EUC_DEV192_cols_(table);

  var cSiret = EUC_DEV192_col_(cols, [
    'SIRET',
    'Numero_SIRET',
    'NumeroSIRET'
  ]);

  if (!cSiret) {
    return {
      ok: false,
      linked: false,
      table: table,
      warning: 'Colonne SIRET introuvable dans la base Entreprises globale'
    };
  }

  function c(names) {
    return EUC_DEV192_col_(cols, names);
  }

  var cNomEnt = c([
    'Nom_entreprise',
    'Raison_sociale',
    'RaisonSociale',
    'Nom',
    'Entreprise'
  ]);

  var cNomCom = c([
    'Nom_commercial',
    'Enseigne',
    'Appellation'
  ]);

  var cAdresse = c([
    'Adresse',
    'Adresse_entreprise',
    'Adresse_postale'
  ]);

  var cCp = c([
    'Code_postal',
    'CodePostal',
    'CP'
  ]);

  var cVille = c([
    'Ville',
    'Commune'
  ]);

  var cTel = c([
    'Telephone',
    'Téléphone',
    'Telephone_entreprise',
    'Entreprise_telephone',
    'Tel'
  ]);

  var cMail = c([
    'Courriel',
    'Email',
    'Mail',
    'Entreprise_courriel',
    'Courriel_entreprise'
  ]);

  var rows = EUC_DEV192_records_(table);
  var siret = EUC_DEV192_siret_(data.siret);

  var existing = null;

  for (var i = 0; i < rows.length; i++) {
    if (EUC_DEV192_siret_((rows[i].fields || {})[cSiret]) === siret) {
      existing = rows[i];
      break;
    }
  }

  var fields = {};
  fields[cSiret] = siret;

  if (cNomEnt) fields[cNomEnt] = data.nomEntreprise || '';
  if (cNomCom) fields[cNomCom] = data.nomCommercial || '';
  if (cAdresse) fields[cAdresse] = data.adresse || '';
  if (cCp) fields[cCp] = data.codePostal || '';
  if (cVille) fields[cVille] = data.ville || '';
  if (cTel) fields[cTel] = data.telephoneEntreprise || '';
  if (cMail) fields[cMail] = data.courrielEntreprise || '';

  if (existing) {
    EUC_DEV190_api_(
      'patch',
      '/tables/' + encodeURIComponent(table) + '/records',
      {
        records: [{
          id: existing.id,
          fields: fields
        }]
      }
    );

    return {
      ok: true,
      linked: true,
      created: false,
      table: table,
      recordId: existing.id
    };
  }

  var created = EUC_DEV190_api_(
    'post',
    '/tables/' + encodeURIComponent(table) + '/records',
    {
      records: [{
        fields: fields
      }]
    }
  );

  var id =
    created &&
    created.records &&
    created.records[0]
      ? created.records[0].id
      : 0;

  return {
    ok: true,
    linked: true,
    created: true,
    table: table,
    recordId: id
  };
}

function EUC_DEV192_lookupSiret(siret) {
  siret = EUC_DEV192_siret_(siret);

  if (siret.length !== 14) {
    return {
      ok: false,
      found: false,
      error: 'SIRET invalide : 14 chiffres attendus.'
    };
  }

  if (typeof EUC_ENT_rechercherSiret !== 'function') {
    return {
      ok: false,
      found: false,
      error: 'EUC_ENT_rechercherSiret est indisponible.'
    };
  }

  var raw = EUC_ENT_rechercherSiret(siret);
  var data = EUC_DEV192_normalizeEntreprise_(raw, siret);

  if (!data.found) {
    data.rawKeys =
      raw && typeof raw === 'object'
        ? Object.keys(raw)
        : [];

    return data;
  }

  /*
   * L'entreprise trouvée par SIRET est immédiatement rapprochée de la
   * base Entreprises globale PFMP.
   */
  data.globalEntreprise = EUC_DEV192_upsertGlobalEntreprise_(data);

  return data;
}

/* ------------------------------------------------------------------
 * APPRENTISSAGE : structure et historique
 * ------------------------------------------------------------------ */

function EUC_DEV192_ensureAppCols_() {
  var cols = EUC_DEV192_cols_(EUC_DEV192_APP_TABLE_);
  var have = {};

  cols.forEach(function(c) {
    have[c.id] = true;
  });

  var wanted = [
    { id: 'Nom_entreprise', type: 'Text' },
    { id: 'Nom_commercial', type: 'Text' },
    { id: 'SIRET', type: 'Text' },
    { id: 'Adresse_entreprise', type: 'Text' },
    { id: 'Code_postal', type: 'Text' },
    { id: 'Ville', type: 'Text' },
    { id: 'Entreprise_telephone', type: 'Text' },
    { id: 'Entreprise_courriel', type: 'Text' },

    { id: 'Dossier_distribue', type: 'Bool' },
    { id: 'Date_distribution_dossier', type: 'Date' },
    { id: 'Dossier_transmis_CFA', type: 'Bool' },
    { id: 'Date_transmission_CFA', type: 'Date' },

    { id: 'Date_contrat_officielle', type: 'Date' },
    { id: 'Date_rupture_contrat', type: 'Date' },
    { id: 'Nouveau_contrat', type: 'Bool' },
    { id: 'Statut_dossier', type: 'Text' },

    { id: 'Entreprise_globale_table', type: 'Text' },
    { id: 'Entreprise_globale_record_id', type: 'Int' }
  ];

  var missing = wanted.filter(function(c) {
    return !have[c.id];
  });

  if (missing.length) {
    EUC_DEV190_api_(
      'post',
      '/tables/' +
        encodeURIComponent(EUC_DEV192_APP_TABLE_) +
        '/columns',
      { columns: missing }
    );
  }

  return {
    ok: true,
    added: missing.map(function(c) {
      return c.id;
    })
  };
}

function EUC_DEV192_currentContractRows_(eleveId) {
  var cols = EUC_DEV192_cols_(EUC_DEV192_APP_TABLE_);
  var cEleve = EUC_DEV192_col_(cols, [
    'Eleve',
    'Élève',
    'Eleve_id'
  ]);

  var cActif = EUC_DEV192_col_(cols, [
    'Actif'
  ]);

  var cCreated = EUC_DEV192_col_(cols, [
    'Date_creation',
    'Created_at'
  ]);

  var rows = EUC_DEV192_records_(EUC_DEV192_APP_TABLE_)
    .filter(function(r) {
      return (
        EUC_DEV192_refId_((r.fields || {})[cEleve]) ===
        Number(eleveId)
      );
    });

  rows.sort(function(a, b) {
    var fa = a.fields || {};
    var fb = b.fields || {};

    if (cActif) {
      var aa = fa[cActif] !== false ? 1 : 0;
      var bb = fb[cActif] !== false ? 1 : 0;

      if (aa !== bb) return bb - aa;
    }

    if (cCreated) {
      return (
        (Date.parse(fb[cCreated] || '') || 0) -
        (Date.parse(fa[cCreated] || '') || 0)
      );
    }

    return b.id - a.id;
  });

  return rows;
}

function EUC_DEV192_statusLabel_(p) {
  if (p.dateRupture) return 'CONTRAT_ROMPU';
  if (p.dateContrat) return 'CONTRAT_VALIDE';
  if (p.transmisCfa) return 'TRANSMIS_CFA';
  if (p.dossierRemis) return 'DOSSIER_REMIS';
  return 'A_INITIER';
}

function EUC_DEV192_saveApprenti(p) {
  p = p || {};

  EUC_DEV192_ensureAppCols_();

  var cols = EUC_DEV192_cols_(EUC_DEV192_APP_TABLE_);

  function c(names) {
    return EUC_DEV192_col_(cols, names);
  }

  var cEleve = c([
    'Eleve',
    'Élève',
    'Eleve_id'
  ]);

  if (!cEleve) {
    throw new Error('DEV192 : colonne Eleve introuvable.');
  }

  var global = null;

  if (EUC_DEV192_siret_(p.siret).length === 14) {
    try {
      global = EUC_DEV192_lookupSiret(p.siret);
    } catch (e) {}
  }

  var fields = {};
  fields[cEleve] = Number(p.eleveId);

  function set(names, value) {
    var col = c(names);
    if (col) fields[col] = value;
  }

  set(['Annee_scolaire'], p.annee || '');
  set(['SIRET'], EUC_DEV192_siret_(p.siret));
  set(['Nom_entreprise'], p.nomEntreprise || '');
  set(['Nom_commercial'], p.nomCommercial || '');
  set(['Entreprise'], p.nomCommercial || p.nomEntreprise || '');

  set(['Adresse_entreprise', 'Adresse'], p.adresse || '');
  set(['Code_postal', 'CodePostal', 'CP'], p.cp || '');
  set(['Ville'], p.ville || '');
  set(['Entreprise_telephone', 'Telephone_entreprise'], p.telEntreprise || '');
  set(['Entreprise_courriel', 'Courriel_entreprise'], p.mailEntreprise || '');

  set(['Tuteur_nom', 'Tuteur'], p.tuteur || '');
  set(['Tuteur_telephone', 'Telephone_tuteur'], p.telTuteur || '');
  set(['Tuteur_courriel', 'Courriel_tuteur'], p.mailTuteur || '');

  set(['Dossier_distribue'], !!p.dossierRemis);
  set(['Date_distribution_dossier'], p.dateDossier || '');
  set(['Dossier_transmis_CFA'], !!p.transmisCfa);
  set(['Date_transmission_CFA'], p.dateCfa || '');

  set(['Date_contrat_officielle'], p.dateContrat || '');
  set(['Date_debut'], p.dateContrat || p.debut || '');
  set(['Date_fin'], p.fin || '');
  set(['Date_rupture_contrat'], p.dateRupture || '');

  set(['Nouveau_contrat'], !!p.nouveauContrat);
  set(['Statut_dossier'], EUC_DEV192_statusLabel_(p));

  /*
   * Contrat actif uniquement si apprenti, contrat non rompu.
   */
  set(
    ['Actif'],
    !!p.apprenti && !EUC_DEV192_txt_(p.dateRupture)
  );

  if (global && global.globalEntreprise) {
    set(
      ['Entreprise_globale_table'],
      global.globalEntreprise.table || ''
    );

    set(
      ['Entreprise_globale_record_id'],
      Number(global.globalEntreprise.recordId) || 0
    );
  }

  var existing = EUC_DEV192_currentContractRows_(p.eleveId);

  /*
   * Nouveau contrat = nouvelle ligne historique.
   * Sinon on met à jour l'épisode courant.
   */
  if (p.nouveauContrat || !existing.length) {
    EUC_DEV190_api_(
      'post',
      '/tables/' +
        encodeURIComponent(EUC_DEV192_APP_TABLE_) +
        '/records',
      {
        records: [{
          fields: fields
        }]
      }
    );
  } else {
    EUC_DEV190_api_(
      'patch',
      '/tables/' +
        encodeURIComponent(EUC_DEV192_APP_TABLE_) +
        '/records',
      {
        records: [{
          id: existing[0].id,
          fields: fields
        }]
      }
    );
  }

  /*
   * Une rupture ferme explicitement l'épisode courant.
   */
  if (
    existing.length &&
    EUC_DEV192_txt_(p.dateRupture) &&
    !p.nouveauContrat
  ) {
    var closing = {};

    var cActif = c(['Actif']);
    var cFin = c(['Date_fin']);
    var cMotif = c(['Motif_fin']);

    if (cActif) closing[cActif] = false;
    if (cFin && !p.fin) closing[cFin] = p.dateRupture;
    if (cMotif) closing[cMotif] = 'Rupture';

    if (Object.keys(closing).length) {
      EUC_DEV190_api_(
        'patch',
        '/tables/' +
          encodeURIComponent(EUC_DEV192_APP_TABLE_) +
          '/records',
        {
          records: [{
            id: existing[0].id,
            fields: closing
          }]
        }
      );
    }
  }

  EUC_DEV192_rebuildDashboard(p.annee || '');

  return {
    ok: true
  };
}

/* ------------------------------------------------------------------
 * CHARGEMENT DETAIL : reprend les élèves validés par DEV190V1
 * et enrichit avec l'épisode d'apprentissage courant.
 * ------------------------------------------------------------------ */

function EUC_DEV192_loadApprentis(
  annee,
  classeId,
  classeNom
) {
  var base = EUC_DEV190V1_loadApprentis(
    annee,
    classeId,
    classeNom
  );

  EUC_DEV192_ensureAppCols_();

  var cols = EUC_DEV192_cols_(EUC_DEV192_APP_TABLE_);

  function c(names) {
    return EUC_DEV192_col_(cols, names);
  }

  var cEleve = c([
    'Eleve',
    'Élève',
    'Eleve_id'
  ]);

  var allRows = EUC_DEV192_records_(EUC_DEV192_APP_TABLE_);
  var latest = {};

  allRows.forEach(function(r) {
    var id = EUC_DEV192_refId_((r.fields || {})[cEleve]);

    if (!id) return;

    if (!latest[id]) {
      latest[id] = r;
      return;
    }

    /*
     * On préfère une ligne active, puis le RowId le plus récent.
     */
    var a = r.fields || {};
    var b = latest[id].fields || {};

    var cActif = c(['Actif']);

    var ar = cActif && a[cActif] !== false ? 1 : 0;
    var br = cActif && b[cActif] !== false ? 1 : 0;

    if (ar > br || (ar === br && r.id > latest[id].id)) {
      latest[id] = r;
    }
  });

  (base.students || []).forEach(function(s) {
    var r = latest[s.id];
    var f = r ? r.fields || {} : {};

    function val(names) {
      var col = c(names);
      return col ? EUC_DEV192_txt_(f[col]) : '';
    }

    function bool(names) {
      var col = c(names);
      return col ? !!f[col] : false;
    }

    s.nomEntreprise = val([
      'Nom_entreprise'
    ]);

    s.nomCommercial = val([
      'Nom_commercial'
    ]) || s.entreprise || '';

    s.siret = val(['SIRET']) || s.siret || '';
    s.adresse = val(['Adresse_entreprise', 'Adresse']) || s.adresse || '';
    s.cp = val(['Code_postal', 'CodePostal', 'CP']) || s.cp || '';
    s.ville = val(['Ville']) || s.ville || '';

    s.telEntreprise =
      val(['Entreprise_telephone', 'Telephone_entreprise']) ||
      s.telEntreprise ||
      '';

    s.mailEntreprise =
      val(['Entreprise_courriel', 'Courriel_entreprise']) ||
      s.mailEntreprise ||
      '';

    s.tuteur =
      val(['Tuteur_nom', 'Tuteur']) ||
      s.tuteur ||
      '';

    s.telTuteur =
      val(['Tuteur_telephone', 'Telephone_tuteur']) ||
      s.telTuteur ||
      '';

    s.mailTuteur =
      val(['Tuteur_courriel', 'Courriel_tuteur']) ||
      s.mailTuteur ||
      '';

    s.dossierRemis = bool(['Dossier_distribue']);
    s.dateDossier = val(['Date_distribution_dossier']);
    s.transmisCfa = bool(['Dossier_transmis_CFA']);
    s.dateCfa = val(['Date_transmission_CFA']);
    s.dateContrat = val(['Date_contrat_officielle', 'Date_debut']);
    s.dateRupture = val(['Date_rupture_contrat']);
    s.nouveauContrat = bool(['Nouveau_contrat']);
    s.statutDossier = val(['Statut_dossier']);
  });

  return base;
}

/* ------------------------------------------------------------------
 * DASHBOARD GLOBAL + PAR CLASSE
 * ------------------------------------------------------------------ */

function EUC_DEV192_ensureDash_() {
  var exists = EUC_DEV192_tables_().some(function(t) {
    return t.id === EUC_DEV192_DASH_TABLE_;
  });

  if (!exists) {
    EUC_DEV190_api_(
      'post',
      '/tables',
      {
        tables: [{
          id: EUC_DEV192_DASH_TABLE_,
          columns: [
            { id: 'Annee_scolaire', type: 'Text' },
            { id: 'Payload_JSON', type: 'Text' },
            { id: 'Updated_at', type: 'Text' },
            { id: 'Actif', type: 'Bool' }
          ]
        }]
      }
    );
  }
}

function EUC_DEV192_emptyStats_() {
  return {
    suivis: 0,
    dossierRemis: 0,
    transmisCFA: 0,
    contratsValides: 0,
    ruptures: 0,
    nouveauxContrats: 0,
    apprentisActifs: 0
  };
}

function EUC_DEV192_addStats_(stats, f, cols) {
  function col(names) {
    return EUC_DEV192_col_(cols, names);
  }

  function txt(names) {
    var c = col(names);
    return c ? EUC_DEV192_txt_(f[c]) : '';
  }

  function bool(names) {
    var c = col(names);
    return c ? !!f[c] : false;
  }

  stats.suivis++;

  if (bool(['Dossier_distribue'])) stats.dossierRemis++;
  if (bool(['Dossier_transmis_CFA'])) stats.transmisCFA++;

  if (
    txt(['Date_contrat_officielle', 'Date_debut']) &&
    !txt(['Date_rupture_contrat'])
  ) {
    stats.contratsValides++;
  }

  if (txt(['Date_rupture_contrat'])) stats.ruptures++;
  if (bool(['Nouveau_contrat'])) stats.nouveauxContrats++;

  if (
    bool(['Actif']) &&
    !txt(['Date_rupture_contrat'])
  ) {
    stats.apprentisActifs++;
  }
}

function EUC_DEV192_rebuildDashboard(annee) {
  EUC_DEV192_ensureAppCols_();
  EUC_DEV192_ensureDash_();

  var cols = EUC_DEV192_cols_(EUC_DEV192_APP_TABLE_);
  var rows = EUC_DEV192_records_(EUC_DEV192_APP_TABLE_);

  var cEleve = EUC_DEV192_col_(cols, [
    'Eleve',
    'Élève',
    'Eleve_id'
  ]);

  var latest = {};

  rows.forEach(function(r) {
    var id = EUC_DEV192_refId_((r.fields || {})[cEleve]);

    if (!id) return;

    if (!latest[id] || r.id > latest[id].id) {
      latest[id] = r;
    }
  });

  var global = EUC_DEV192_emptyStats_();
  var classes = {};

  /*
   * Résout la classe courante de chaque élève depuis EUC_ELEVES_PFMP.
   */
  var elevesTable = '';
  var tables = EUC_DEV192_tables_();

  for (var ti = 0; ti < tables.length; ti++) {
    if (
      EUC_DEV192_norm_(tables[ti].id) ===
      EUC_DEV192_norm_('EUC_ELEVES_PFMP')
    ) {
      elevesTable = tables[ti].id;
      break;
    }
  }

  var studentClass = {};

  if (elevesTable) {
    var eCols = EUC_DEV192_cols_(elevesTable);
    var cCode = EUC_DEV192_col_(eCols, [
      'Code_classe_importe',
      'Code_classe',
      'Classe_Pronote'
    ]);

    EUC_DEV192_records_(elevesTable).forEach(function(r) {
      if (cCode) {
        studentClass[r.id] = EUC_DEV192_txt_((r.fields || {})[cCode]);
      }
    });
  }

  Object.keys(latest).forEach(function(k) {
    var f = latest[k].fields || {};

    EUC_DEV192_addStats_(global, f, cols);

    var classCode = studentClass[Number(k)] || 'Sans classe';

    if (!classes[classCode]) {
      classes[classCode] = EUC_DEV192_emptyStats_();
    }

    EUC_DEV192_addStats_(classes[classCode], f, cols);
  });

  var payload = {
    annee: annee,
    global: global,
    classes: classes
  };

  var now = new Date().toISOString();
  var dashRows = EUC_DEV192_records_(EUC_DEV192_DASH_TABLE_);

  var active = dashRows.filter(function(r) {
    var f = r.fields || {};

    return (
      f.Actif !== false &&
      EUC_DEV192_txt_(f.Annee_scolaire) === annee
    );
  });

  if (active.length) {
    EUC_DEV190_api_(
      'patch',
      '/tables/' +
        encodeURIComponent(EUC_DEV192_DASH_TABLE_) +
        '/records',
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
    '/tables/' +
      encodeURIComponent(EUC_DEV192_DASH_TABLE_) +
      '/records',
    {
      records: [{
        fields: {
          Annee_scolaire: annee,
          Payload_JSON: JSON.stringify(payload),
          Updated_at: now,
          Actif: true
        }
      }]
    }
  );

  return payload;
}

function EUC_DEV192_getDashboard(annee) {
  EUC_DEV192_ensureDash_();

  var rows = EUC_DEV192_records_(EUC_DEV192_DASH_TABLE_)
    .filter(function(r) {
      var f = r.fields || {};

      return (
        f.Actif !== false &&
        EUC_DEV192_txt_(f.Annee_scolaire) === annee
      );
    })
    .sort(function(a, b) {
      return (
        (Date.parse((b.fields || {}).Updated_at || '') || 0) -
        (Date.parse((a.fields || {}).Updated_at || '') || 0)
      );
    });

  if (!rows.length) {
    return EUC_DEV192_rebuildDashboard(annee);
  }

  try {
    return JSON.parse((rows[0].fields || {}).Payload_JSON || '{}');
  } catch (e) {
    return EUC_DEV192_rebuildDashboard(annee);
  }
}

function EUC_DEV192_init() {
  return {
    columns: EUC_DEV192_ensureAppCols_(),
    dashboard: EUC_DEV192_ensureDash_()
  };
}
