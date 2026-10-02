/**
 * DEV.190S2
 * Backend SIRET + snapshots année / classe.
 */

function EUC_DEV190S2_currentYear_() {
  var d = new Date();
  var y = d.getFullYear();
  var m = d.getMonth(); // 0=janvier ; 8=septembre

  if (m >= 8) {
    return y + '-' + (y + 1);
  }

  return (y - 1) + '-' + y;
}

function EUC_DEV190S2_getYears() {
  var current = EUC_DEV190S2_currentYear_();

  if (typeof EUC_DEV190R_getYears === 'function') {
    var r = EUC_DEV190R_getYears();
    var years = r.annees || [];

    if (years.indexOf(current) < 0) {
      years.unshift(current);
    }

    return {
      ok: true,
      current: current,
      annees: years
    };
  }

  return {
    ok: true,
    current: current,
    annees: [current]
  };
}

function EUC_DEV190S2_getClasses(annee, terminalesOnly) {
  if (typeof EUC_DEV190R_getPageStructure === 'function') {
    return EUC_DEV190R_getPageStructure(
      annee,
      !!terminalesOnly
    );
  }

  if (typeof EUC_DEV190Q_getStructure === 'function') {
    var r = EUC_DEV190Q_getStructure(annee);

    return {
      ok: true,
      annee: annee,
      classes:
        terminalesOnly
          ? ((r.payload || {}).terminales || [])
          : ((r.payload || {}).classes || [])
    };
  }

  throw new Error(
    'DEV190S2 : snapshot structure indisponible.'
  );
}

function EUC_DEV190S2_lookupSiret(siret) {
  if (typeof EUC_DEV190S1_lookupSiret === 'function') {
    return EUC_DEV190S1_lookupSiret(siret);
  }

  if (typeof EUC_DEV190Q_lookupEntrepriseSiret === 'function') {
    return EUC_DEV190Q_lookupEntrepriseSiret(siret);
  }

  throw new Error(
    'DEV190S2 : moteur recherche SIRET indisponible.'
  );
}
