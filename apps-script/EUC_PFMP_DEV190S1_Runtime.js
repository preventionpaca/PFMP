/**
 * DEV.190S1
 * Backend minimal et robuste.
 */

function EUC_DEV190S1_txt_(v) {
  return String(v == null ? '' : v).trim();
}

function EUC_DEV190S1_norm_(v) {
  return EUC_DEV190S1_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function EUC_DEV190S1_siret_(v) {
  return EUC_DEV190S1_txt_(v)
    .replace(/\D/g, '')
    .slice(0, 14);
}

function EUC_DEV190S1_currentYear_() {
  try {
    var ctx = EUC_PFMP_contexteAnneeLectureV155_();
    return ctx && ctx.active ? String(ctx.active) : '';
  } catch (e) {
    return '';
  }
}

function EUC_DEV190S1_getYears() {
  if (typeof EUC_DEV190R_getYears === 'function') {
    var r = EUC_DEV190R_getYears();
    return {
      ok: true,
      current: EUC_DEV190S1_currentYear_(),
      annees: r.annees || []
    };
  }

  return {
    ok: true,
    current: EUC_DEV190S1_currentYear_(),
    annees: [EUC_DEV190S1_currentYear_()].filter(Boolean)
  };
}

function EUC_DEV190S1_getClasses(annee, terminalesOnly) {
  if (typeof EUC_DEV190R_getPageStructure === 'function') {
    return EUC_DEV190R_getPageStructure(annee, !!terminalesOnly);
  }

  if (typeof EUC_DEV190Q_getStructure === 'function') {
    var r = EUC_DEV190Q_getStructure(annee);
    var all = r && r.payload && r.payload.classes ? r.payload.classes : [];
    var term = r && r.payload && r.payload.terminales ? r.payload.terminales : [];

    return {
      ok: true,
      annee: annee,
      classes: terminalesOnly ? term : all
    };
  }

  throw new Error('DEV190S1 : snapshot structure indisponible.');
}

function EUC_DEV190S1_pick_(fields, wanted) {
  fields = fields || {};
  var keys = Object.keys(fields);

  for (var wi = 0; wi < wanted.length; wi++) {
    var target = EUC_DEV190S1_norm_(wanted[wi]);

    for (var ki = 0; ki < keys.length; ki++) {
      var k = keys[ki];

      if (
        EUC_DEV190S1_norm_(k) === target &&
        fields[k] != null &&
        String(fields[k]).trim() !== ''
      ) {
        return String(fields[k]).trim();
      }
    }
  }

  return '';
}

function EUC_DEV190S1_lookupSiret(siret) {
  siret = EUC_DEV190S1_siret_(siret);

  if (siret.length !== 14) {
    return {
      ok: false,
      found: false,
      error: 'SIRET incomplet'
    };
  }

  var tables = EUC_DEV190_api_('get', '/tables', null).tables || [];

  for (var ti = 0; ti < tables.length; ti++) {
    var tableId = tables[ti].id;

    if (/SNAPSHOT|AUDIT|LOG/i.test(tableId)) {
      continue;
    }

    var cols;

    try {
      cols = EUC_DEV190_api_(
        'get',
        '/tables/' + encodeURIComponent(tableId) + '/columns',
        null
      ).columns || [];
    } catch (e) {
      continue;
    }

    var siretCols = cols
      .map(function(c) { return c.id; })
      .filter(function(id) {
        var n = EUC_DEV190S1_norm_(id);
        return n === 'SIRET' || n === 'NUMEROSIRET' || n === 'NOSIRET';
      });

    if (!siretCols.length) {
      continue;
    }

    var rows;

    try {
      rows = EUC_DEV190_api_(
        'get',
        '/tables/' + encodeURIComponent(tableId) + '/records',
        null
      ).records || [];
    } catch (e2) {
      continue;
    }

    for (var ri = 0; ri < rows.length; ri++) {
      var f = rows[ri].fields || {};
      var match = false;

      for (var si = 0; si < siretCols.length; si++) {
        if (EUC_DEV190S1_siret_(f[siretCols[si]]) === siret) {
          match = true;
          break;
        }
      }

      if (!match) {
        continue;
      }

      return {
        ok: true,
        found: true,
        table: tableId,
        recordId: rows[ri].id,
        siret: siret,

        entreprise: EUC_DEV190S1_pick_(f, [
          'Entreprise',
          'Nom entreprise',
          'Nom_entreprise',
          'Raison sociale',
          'Raison_sociale',
          'RaisonSociale',
          'Appellation',
          'Nom'
        ]),

        adresse: EUC_DEV190S1_pick_(f, [
          'Adresse entreprise',
          'Adresse_entreprise',
          'Adresse postale',
          'Adresse_postale',
          'Adresse',
          'Adresse1'
        ]),

        codePostal: EUC_DEV190S1_pick_(f, [
          'Code postal',
          'Code_postal',
          'CodePostal',
          'CP'
        ]),

        ville: EUC_DEV190S1_pick_(f, [
          'Ville',
          'Commune'
        ]),

        telephoneEntreprise: EUC_DEV190S1_pick_(f, [
          'Téléphone entreprise',
          'Telephone entreprise',
          'Telephone_entreprise',
          'Téléphone',
          'Telephone',
          'Tel'
        ]),

        courrielEntreprise: EUC_DEV190S1_pick_(f, [
          'Courriel entreprise',
          'Courriel_entreprise',
          'Email entreprise',
          'Email_entreprise',
          'Courriel',
          'Email',
          'Mail'
        ]),

        tuteur: EUC_DEV190S1_pick_(f, [
          'Tuteur',
          'Tuteur nom',
          'Tuteur_nom',
          'Nom tuteur',
          'Nom_tuteur',
          'Maitre apprentissage',
          'Maitre_apprentissage'
        ]),

        telephoneTuteur: EUC_DEV190S1_pick_(f, [
          'Téléphone tuteur',
          'Telephone tuteur',
          'Telephone_tuteur',
          'Tuteur téléphone',
          'Tuteur_telephone',
          'Tel tuteur',
          'Tel_tuteur'
        ]),

        courrielTuteur: EUC_DEV190S1_pick_(f, [
          'Courriel tuteur',
          'Courriel_tuteur',
          'Tuteur courriel',
          'Tuteur_courriel',
          'Email tuteur',
          'Email_tuteur'
        ])
      };
    }
  }

  return {
    ok: true,
    found: false,
    siret: siret
  };
}
