/**
 * DEV.234
 * Nettoyage strict de toutes les valeurs avant retour vers le navigateur.
 * Evite qu'une Date, une référence Grist, un objet imbriqué ou une valeur
 * non sérialisable bloque silencieusement google.script.run.
 */

function EUC_DEV234_str_(v) {
  if (v === null || v === undefined) return '';

  if (Object.prototype.toString.call(v) === '[object Date]') {
    try {
      return Utilities.formatDate(
        v,
        Session.getScriptTimeZone() || 'Europe/Paris',
        'yyyy-MM-dd'
      );
    } catch (e) {
      return '';
    }
  }

  if (Array.isArray(v)) {
    if (!v.length) return '';

    for (var i = 0; i < v.length; i++) {
      if (
        typeof v[i] === 'string' ||
        typeof v[i] === 'number'
      ) {
        return String(v[i]);
      }
    }

    try {
      return JSON.stringify(v);
    } catch (e2) {
      return '';
    }
  }

  if (typeof v === 'object') {
    try {
      if (v.id !== undefined) return String(v.id);
      if (v.value !== undefined) return String(v.value);
      return JSON.stringify(v);
    } catch (e3) {
      return '';
    }
  }

  return String(v);
}

function EUC_DEV234_num_(v) {
  if (typeof v === 'number' && isFinite(v)) return v;

  if (Array.isArray(v)) {
    for (var i = 0; i < v.length; i++) {
      var n = Number(v[i]);
      if (isFinite(n) && n !== 0) return n;
    }
  }

  var n2 = Number(v);
  return isFinite(n2) ? n2 : 0;
}

function EUC_DEV234_bool_(v) {
  if (v === true || v === false) return v;

  var s = String(v == null ? '' : v)
    .trim()
    .toLowerCase();

  return (
    s === 'true' ||
    s === '1' ||
    s === 'oui' ||
    s === 'yes' ||
    s === 'x'
  );
}

function EUC_DEV234_student_(s) {
  s = s || {};

  return {
    id: EUC_DEV234_num_(s.id),

    nom: EUC_DEV234_str_(s.nom),
    prenom: EUC_DEV234_str_(s.prenom),

    apprenti: EUC_DEV234_bool_(s.apprenti),

    debut: EUC_DEV277B_iso_(s.debut),
    fin: EUC_DEV277B_iso_(s.fin),

    siret: EUC_DEV234_str_(s.siret),

    entreprise: EUC_DEV234_str_(
      s.entreprise !== undefined
        ? s.entreprise
        : s.nomEntreprise
    ),

    nomEntreprise: EUC_DEV234_str_(
      s.nomEntreprise !== undefined
        ? s.nomEntreprise
        : s.entreprise
    ),

    nomCommercial: EUC_DEV234_str_(s.nomCommercial),

    adresse: EUC_DEV234_str_(s.adresse),
    cp: EUC_DEV234_str_(s.cp),
    ville: EUC_DEV234_str_(s.ville),

    telEntreprise: EUC_DEV234_str_(s.telEntreprise),
    mailEntreprise: EUC_DEV234_str_(s.mailEntreprise),
    responsableEntreprise: EUC_DEV234_str_(s.responsableEntreprise),

    tuteur: EUC_DEV234_str_(s.tuteur),
    telTuteur: EUC_DEV234_str_(s.telTuteur),
    mailTuteur: EUC_DEV234_str_(s.mailTuteur),

    dossierDistribue: EUC_DEV234_bool_(s.dossierDistribue),
    dateDistribution: EUC_DEV234_str_(s.dateDistribution),

    dossierRemis: EUC_DEV234_bool_(s.dossierRemis),
    dateRemise: EUC_DEV234_str_(
      s.dateRemise !== undefined
        ? s.dateRemise
        : s.dateDossier
    ),

    dateDossier: EUC_DEV234_str_(
      s.dateDossier !== undefined
        ? s.dateDossier
        : s.dateRemise
    ),

    transmisCfa: EUC_DEV234_bool_(s.transmisCfa),

    dateCfa: EUC_DEV234_str_(
      s.dateCfa !== undefined
        ? s.dateCfa
        : s.dateTransmissionCfa
    ),

    dateTransmissionCfa: EUC_DEV234_str_(
      s.dateTransmissionCfa !== undefined
        ? s.dateTransmissionCfa
        : s.dateCfa
    ),

    dateContrat: EUC_DEV277B_iso_(s.dateContrat),
    dateRupture: EUC_DEV277B_iso_(s.dateRupture),

    nouveauContrat: EUC_DEV234_bool_(s.nouveauContrat)
  };
}

function EUC_DEV234_cleanResponse_(r, source) {
  r = r || {};

  var input = Array.isArray(r.students)
    ? r.students
    : [];

  return {
    ok: true,
    source: source || EUC_DEV234_str_(r.source),
    durationMs: EUC_DEV234_num_(
      r.durationMs !== undefined ? r.durationMs : r.ms
    ),
    students: input.map(EUC_DEV234_student_)
  };
}

function EUC_DEV233_loadApprentisFast(
  annee,
  classeId,
  classeNom
) {
  var t0 = new Date().getTime();
  var r = null;
  var source = '';

  if (
    typeof EUC_DEV211_loadApprentis === 'function'
  ) {
    source = 'DEV211';
    r = EUC_DEV211_loadApprentis(
      annee,
      classeId,
      classeNom
    );
  } else if (
    typeof EUC_DEV208_loadApprentis === 'function'
  ) {
    source = 'DEV208';
    r = EUC_DEV208_loadApprentis(
      annee,
      classeId,
      classeNom
    );
  } else {
    throw new Error(
      'Aucun chargeur de base disponible : DEV211 / DEV208.'
    );
  }

  var clean = EUC_DEV234_cleanResponse_(
    r,
    'DEV234/' + source
  );

  clean.durationMs =
    new Date().getTime() - t0;

  return clean;
}

function EUC_DEV233_loadApprentisEnriched(
  annee,
  classeId,
  classeNom
) {
  var t0 = new Date().getTime();

  if (
    typeof EUC_DEV214_loadApprentis !== 'function'
  ) {
    return {
      ok: false,
      skipped: true,
      source: 'DEV234/no-DEV214',
      durationMs:
        new Date().getTime() - t0,
      students: []
    };
  }

  var r = EUC_DEV214_loadApprentis(
    annee,
    classeId,
    classeNom
  );

  var clean = EUC_DEV234_cleanResponse_(
    r,
    'DEV234/enriched'
  );

  clean.durationMs =
    new Date().getTime() - t0;

  return clean;
}

/**
 * Petit test explicite de transport vers le navigateur.
 * Permet de confirmer que la liste complète est sérialisable.
 */
function EUC_DEV234_testTransport(
  annee,
  classeId,
  classeNom
) {
  var r = EUC_DEV233_loadApprentisFast(
    annee,
    classeId,
    classeNom
  );

  return {
    ok: true,
    count: r.students.length,
    first:
      r.students.length
        ? r.students[0]
        : null,
    source: r.source,
    durationMs: r.durationMs
  };
}
