/**
 * DEV.235
 * Retourne uniquement une chaîne JSON sérialisable.
 */
function EUC_DEV235_loadStudentsJson(annee, classeId, classeNom) {
  var t0 = new Date().getTime();
  var r;

  if (typeof EUC_DEV208_loadApprentis === 'function') {
    r = EUC_DEV208_loadApprentis(
      annee,
      classeId,
      classeNom
    ) || {};
  } else if (typeof EUC_DEV211_loadApprentis === 'function') {
    r = EUC_DEV211_loadApprentis(
      annee,
      classeId,
      classeNom
    ) || {};
  } else {
    throw new Error(
      'Chargeur élèves introuvable : DEV208 / DEV211.'
    );
  }

  var students = Array.isArray(r.students)
    ? r.students
    : [];

  function txt(v) {
    if (v === null || v === undefined) return '';

    if (
      Object.prototype.toString.call(v) ===
      '[object Date]'
    ) {
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
      for (var i = 0; i < v.length; i++) {
        if (
          typeof v[i] === 'string' ||
          typeof v[i] === 'number'
        ) {
          return String(v[i]);
        }
      }
      return '';
    }

    if (typeof v === 'object') {
      if (v.id !== undefined) return String(v.id);
      if (v.value !== undefined) return String(v.value);
      return '';
    }

    return String(v);
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function bool(v) {
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

  var clean = students.map(function(s) {
    s = s || {};

    return {
      id: num(s.id),
      nom: txt(s.nom),
      prenom: txt(s.prenom),

      apprenti: bool(s.apprenti),

      debut: txt(s.debut),
      fin: txt(s.fin),

      siret: txt(s.siret),

      entreprise: txt(
        s.entreprise !== undefined
          ? s.entreprise
          : s.nomEntreprise
      ),

      nomEntreprise: txt(
        s.nomEntreprise !== undefined
          ? s.nomEntreprise
          : s.entreprise
      ),

      nomCommercial: txt(s.nomCommercial),

      adresse: txt(s.adresse),
      cp: txt(s.cp),
      ville: txt(s.ville),

      telEntreprise: txt(s.telEntreprise),
      mailEntreprise: txt(s.mailEntreprise),
      responsableEntreprise: txt(s.responsableEntreprise),

      tuteur: txt(s.tuteur),
      telTuteur: txt(s.telTuteur),
      mailTuteur: txt(s.mailTuteur),

      dossierDistribue: bool(s.dossierDistribue),
      dateDistribution: txt(s.dateDistribution),

      dossierRemis: bool(s.dossierRemis),
      dateRemise: txt(
        s.dateRemise !== undefined
          ? s.dateRemise
          : s.dateDossier
      ),
      dateDossier: txt(
        s.dateDossier !== undefined
          ? s.dateDossier
          : s.dateRemise
      ),

      transmisCfa: bool(s.transmisCfa),
      dateCfa: txt(
        s.dateCfa !== undefined
          ? s.dateCfa
          : s.dateTransmissionCfa
      ),
      dateTransmissionCfa: txt(
        s.dateTransmissionCfa !== undefined
          ? s.dateTransmissionCfa
          : s.dateCfa
      ),

      dateContrat: txt(s.dateContrat),
      dateRupture: txt(s.dateRupture),

      nouveauContrat: bool(s.nouveauContrat)
    };
  });

  return JSON.stringify({
    ok: true,
    source: 'DEV235/json',
    durationMs: new Date().getTime() - t0,
    students: clean
  });
}

function EUC_DEV235_ping() {
  return 'DEV235_OK';
}
