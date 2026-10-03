/**
 * DEV.190V
 * Corrige le chargement vide des élèves.
 * On ne suppose plus que la classe est stockée sous forme d'un Ref identique.
 * On accepte :
 * - Ref / RowId,
 * - texte de classe,
 * - nom de classe,
 * - colonnes candidates multiples.
 */

function EUC_DEV190V_txt_(v) {
  return String(v == null ? '' : v).trim();
}

function EUC_DEV190V_norm_(v) {
  return EUC_DEV190V_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function EUC_DEV190V_refIds_(v) {
  var out = [];

  function add(x) {
    if (typeof x === 'number' && isFinite(x)) {
      out.push(x);
      return;
    }

    var n = Number(x);
    if (isFinite(n) && String(x).trim() !== '') {
      out.push(n);
    }
  }

  if (Array.isArray(v)) {
    v.forEach(add);
  } else {
    add(v);
  }

  return out;
}

function EUC_DEV190V_findTable_(names) {
  var wanted = names.map(EUC_DEV190V_norm_);
  var tables = EUC_DEV190_api_('get', '/tables', null).tables || [];

  for (var i = 0; i < tables.length; i++) {
    if (wanted.indexOf(EUC_DEV190V_norm_(tables[i].id)) >= 0) {
      return tables[i].id;
    }
  }

  return '';
}

function EUC_DEV190V_columns_(table) {
  return EUC_DEV190_api_(
    'get',
    '/tables/' + encodeURIComponent(table) + '/columns',
    null
  ).columns || [];
}

function EUC_DEV190V_records_(table) {
  return EUC_DEV190_api_(
    'get',
    '/tables/' + encodeURIComponent(table) + '/records',
    null
  ).records || [];
}

function EUC_DEV190V_findCols_(cols, names) {
  var wanted = names.map(EUC_DEV190V_norm_);

  return cols
    .map(function(c) { return c.id; })
    .filter(function(id) {
      return wanted.indexOf(EUC_DEV190V_norm_(id)) >= 0;
    });
}

function EUC_DEV190V_classValueMatches_(v, classeId, classeNom) {
  var ids = EUC_DEV190V_refIds_(v);

  if (
    Number(classeId) &&
    ids.indexOf(Number(classeId)) >= 0
  ) {
    return true;
  }

  var txt = EUC_DEV190V_norm_(v);
  var target = EUC_DEV190V_norm_(classeNom);

  if (target && txt === target) {
    return true;
  }

  /*
   * Certains RefList Grist peuvent être sérialisés en tableau contenant
   * du texte. On compare aussi les éléments.
   */
  if (Array.isArray(v)) {
    for (var i = 0; i < v.length; i++) {
      if (EUC_DEV190V_norm_(v[i]) === target) {
        return true;
      }
    }
  }

  return false;
}

function EUC_DEV190V_findStudents(annee, classeId, classeNom) {
  var table = EUC_DEV190V_findTable_([
    'EUC_ELEVES_PFMP'
  ]);

  if (!table) {
    throw new Error(
      'DEV190V : table EUC_ELEVES_PFMP introuvable.'
    );
  }

  var cols = EUC_DEV190V_columns_(table);

  var nomCols = EUC_DEV190V_findCols_(cols, [
    'Nom',
    'Nom_eleve',
    'Eleve_nom'
  ]);

  var prenomCols = EUC_DEV190V_findCols_(cols, [
    'Prenom',
    'Prénom',
    'Prenom_eleve',
    'Eleve_prenom'
  ]);

  var classCols = EUC_DEV190V_findCols_(cols, [
    'Classe',
    'Classe_id',
    'ClasseRef',
    'Classe_nom',
    'Nom_classe',
    'Libelle_classe',
    'Libellé_classe'
  ]);

  var yearCols = EUC_DEV190V_findCols_(cols, [
    'Annee_scolaire',
    'Année_scolaire',
    'Annee',
    'Année'
  ]);

  if (!classCols.length) {
    throw new Error(
      'DEV190V : aucune colonne de classe détectée dans EUC_ELEVES_PFMP.'
    );
  }

  var rows = EUC_DEV190V_records_(table);

  var matched = rows.filter(function(r) {
    var f = r.fields || {};

    var classOk = classCols.some(function(c) {
      return EUC_DEV190V_classValueMatches_(
        f[c],
        classeId,
        classeNom
      );
    });

    if (!classOk) {
      return false;
    }

    /*
     * Le filtre année n'est appliqué que si la colonne contient
     * effectivement une valeur. Une ligne sans année reste admissible.
     */
    if (yearCols.length) {
      var yearValues = yearCols
        .map(function(c) {
          return EUC_DEV190V_txt_(f[c]);
        })
        .filter(Boolean);

      if (
        yearValues.length &&
        yearValues.indexOf(EUC_DEV190V_txt_(annee)) < 0
      ) {
        return false;
      }
    }

    return true;
  });

  /*
   * Fallback de sécurité :
   * si aucun résultat n'a été trouvé avec les colonnes candidates,
   * on cherche la valeur exacte du nom de classe dans toutes les colonnes.
   */
  if (!matched.length && classeNom) {
    var target = EUC_DEV190V_norm_(classeNom);

    matched = rows.filter(function(r) {
      var f = r.fields || {};
      return Object.keys(f).some(function(k) {
        return EUC_DEV190V_norm_(f[k]) === target;
      });
    });
  }

  return matched
    .map(function(r) {
      var f = r.fields || {};

      var nom = '';
      var prenom = '';

      for (var i = 0; i < nomCols.length; i++) {
        if (EUC_DEV190V_txt_(f[nomCols[i]])) {
          nom = EUC_DEV190V_txt_(f[nomCols[i]]);
          break;
        }
      }

      for (var j = 0; j < prenomCols.length; j++) {
        if (EUC_DEV190V_txt_(f[prenomCols[j]])) {
          prenom = EUC_DEV190V_txt_(f[prenomCols[j]]);
          break;
        }
      }

      return {
        id: r.id,
        nom: nom,
        prenom: prenom
      };
    })
    .sort(function(a, b) {
      return (
        (a.nom + ' ' + a.prenom)
        .localeCompare(
          b.nom + ' ' + b.prenom,
          'fr'
        )
      );
    });
}

function EUC_DEV190V_loadApprentis(
  annee,
  classeId,
  classeNom
) {
  var students = EUC_DEV190V_findStudents(
    annee,
    classeId,
    classeNom
  );

  var app =
    typeof EUC_DEV190U_mapApprentissage_ === 'function'
      ? EUC_DEV190U_mapApprentissage_()
      : { map: {} };

  return {
    ok: true,
    students: students.map(function(s) {
      var r = app.map[s.id];
      var f = r ? r.fields : {};

      function pick(names) {
        if (
          typeof EUC_DEV190U_pickField_ === 'function'
        ) {
          return EUC_DEV190U_pickField_(f, names);
        }

        return '';
      }

      function pickBool(names) {
        if (
          typeof EUC_DEV190U_pickBool_ === 'function'
        ) {
          return EUC_DEV190U_pickBool_(f, names);
        }

        return false;
      }

      return {
        id: s.id,
        nom: s.nom,
        prenom: s.prenom,
        apprenti: pickBool(['Actif', 'Apprenti']),
        debut: pick(['Date_debut', 'Debut']),
        fin: pick(['Date_fin', 'Fin']),
        siret: pick(['SIRET']),
        entreprise: pick(['Entreprise']),
        adresse: pick([
          'Adresse_entreprise',
          'Adresse'
        ]),
        cp: pick([
          'Code_postal',
          'CodePostal',
          'CP'
        ]),
        ville: pick(['Ville']),
        telEntreprise: pick([
          'Entreprise_telephone',
          'Telephone_entreprise'
        ]),
        mailEntreprise: pick([
          'Entreprise_courriel',
          'Courriel_entreprise'
        ]),
        responsableEntreprise: pick([
          'Responsable_nom',
          'Responsable'
        ]),
        tuteur: pick([
          'Tuteur_nom',
          'Tuteur'
        ]),
        telTuteur: pick([
          'Tuteur_telephone',
          'Telephone_tuteur'
        ]),
        mailTuteur: pick([
          'Tuteur_courriel',
          'Courriel_tuteur'
        ])
      };
    })
  };
}

function EUC_DEV190V_loadPdif(
  annee,
  classeId,
  classeNom
) {
  var students = EUC_DEV190V_findStudents(
    annee,
    classeId,
    classeNom
  );

  var pd =
    typeof EUC_DEV190U_mapPdif_ === 'function'
      ? EUC_DEV190U_mapPdif_(annee)
      : { map: {} };

  return {
    ok: true,
    students: students.map(function(s) {
      var r = pd.map[s.id];
      var f = r ? r.fields : {};

      var selected =
        typeof EUC_DEV190U_pickBool_ === 'function'
          ? EUC_DEV190U_pickBool_(
              f,
              [
                'Parcours_differencie',
                'Parcours_différencié',
                'Actif'
              ]
            )
          : false;

      var remarque =
        typeof EUC_DEV190U_pickField_ === 'function'
          ? EUC_DEV190U_pickField_(
              f,
              [
                'Remarque',
                'Commentaire'
              ]
            )
          : '';

      return {
        id: s.id,
        nom: s.nom,
        prenom: s.prenom,
        selected: selected,
        remarque: remarque
      };
    })
  };
}
