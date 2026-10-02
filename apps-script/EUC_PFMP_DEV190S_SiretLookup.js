/**
 * DEV.190S
 * Recherche SIRET robuste : détecte automatiquement les tables Grist
 * contenant une colonne SIRET, au lieu de supposer le nom de la table.
 */

function EUC_DEV190S_txt_(v) {
  return String(v == null ? '' : v).trim();
}

function EUC_DEV190S_norm_(v) {
  return EUC_DEV190S_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function EUC_DEV190S_siret_(v) {
  return EUC_DEV190S_txt_(v).replace(/\D/g, '').slice(0, 14);
}

function EUC_DEV190S_pickByNorm_(fields, wanted) {
  fields = fields || {};
  var keys = Object.keys(fields);

  for (var wi = 0; wi < wanted.length; wi++) {
    var target = EUC_DEV190S_norm_(wanted[wi]);

    for (var ki = 0; ki < keys.length; ki++) {
      var k = keys[ki];

      if (
        EUC_DEV190S_norm_(k) === target &&
        fields[k] != null &&
        String(fields[k]).trim() !== ''
      ) {
        return String(fields[k]).trim();
      }
    }
  }

  return '';
}

function EUC_DEV190S_rechercherSiret(siret) {
  siret = EUC_DEV190S_siret_(siret);

  if (siret.length !== 14) {
    return {
      ok: false,
      found: false,
      error: 'SIRET incomplet'
    };
  }

  var tablesResponse = EUC_DEV190_api_('get', '/tables', null);
  var tables = tablesResponse.tables || [];

  for (var ti = 0; ti < tables.length; ti++) {
    var tableId = tables[ti].id;

    /*
     * Évite les snapshots et tables techniques qui pourraient contenir
     * le mot SIRET dans un JSON sans être le référentiel Entreprises.
     */
    if (/SNAPSHOT|AUDIT|LOG/i.test(tableId)) {
      continue;
    }

    var columns;

    try {
      columns = EUC_DEV190_api_(
        'get',
        '/tables/' + encodeURIComponent(tableId) + '/columns',
        null
      ).columns || [];
    } catch (e) {
      continue;
    }

    var siretColumns = columns
      .map(function(c) { return c.id; })
      .filter(function(id) {
        var n = EUC_DEV190S_norm_(id);

        return (
          n === 'SIRET' ||
          n === 'NUMEROSIRET' ||
          n === 'NOSIRET'
        );
      });

    if (!siretColumns.length) {
      continue;
    }

    var records;

    try {
      records = EUC_DEV190_api_(
        'get',
        '/tables/' + encodeURIComponent(tableId) + '/records',
        null
      ).records || [];
    } catch (e2) {
      continue;
    }

    for (var ri = 0; ri < records.length; ri++) {
      var f = records[ri].fields || {};
      var matched = false;

      for (var si = 0; si < siretColumns.length; si++) {
        if (
          EUC_DEV190S_siret_(f[siretColumns[si]]) === siret
        ) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        continue;
      }

      return {
        ok: true,
        found: true,
        table: tableId,
        recordId: records[ri].id,
        siret: siret,

        entreprise: EUC_DEV190S_pickByNorm_(f, [
          'Entreprise',
          'Nom entreprise',
          'Nom_entreprise',
          'Raison sociale',
          'Raison_sociale',
          'RaisonSociale',
          'Appellation',
          'Nom'
        ]),

        adresse: EUC_DEV190S_pickByNorm_(f, [
          'Adresse entreprise',
          'Adresse_entreprise',
          'Adresse postale',
          'Adresse_postale',
          'Adresse',
          'Adresse1'
        ]),

        codePostal: EUC_DEV190S_pickByNorm_(f, [
          'Code postal',
          'Code_postal',
          'CodePostal',
          'CP'
        ]),

        ville: EUC_DEV190S_pickByNorm_(f, [
          'Ville',
          'Commune'
        ]),

        telephoneEntreprise: EUC_DEV190S_pickByNorm_(f, [
          'Téléphone entreprise',
          'Telephone entreprise',
          'Telephone_entreprise',
          'Téléphone',
          'Telephone',
          'Tel',
          'TEL'
        ]),

        courrielEntreprise: EUC_DEV190S_pickByNorm_(f, [
          'Courriel entreprise',
          'Courriel_entreprise',
          'Email entreprise',
          'Email_entreprise',
          'Courriel',
          'Email',
          'Mail'
        ]),

        tuteur: EUC_DEV190S_pickByNorm_(f, [
          'Tuteur',
          'Tuteur nom',
          'Tuteur_nom',
          'Nom tuteur',
          'Nom_tuteur',
          'Maitre apprentissage',
          'Maitre_apprentissage',
          'Maitre d apprentissage'
        ]),

        telephoneTuteur: EUC_DEV190S_pickByNorm_(f, [
          'Téléphone tuteur',
          'Telephone tuteur',
          'Telephone_tuteur',
          'Tuteur téléphone',
          'Tuteur_telephone',
          'Tel tuteur',
          'Tel_tuteur'
        ]),

        courrielTuteur: EUC_DEV190S_pickByNorm_(f, [
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
