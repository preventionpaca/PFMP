/**
 * DEV728 — Accueil d'administration : rubrique « Cartographie » du bandeau « À faire ».
 *
 * Les entreprises reconnues mais impossibles à placer sur la carte (adresse sans numéro, à contrôler, coordonnées
 * à renseigner, à regéocoder) apparaissent sur la carte des professeurs comme des trous. Le bandeau de l'accueil
 * les signale, par classe, avec un lien vers « Entreprises et cartographie » où elles se traitent.
 * Lecture seule : index géographique de l'année (DEV517, déjà mis en cache), aucune écriture, aucun géocodage.
 */
var EUC_DEV728_PLACEES_ = ['GEOCODE_AUTOMATIQUE', 'VALIDE_MANUELLEMENT'];

/* Comptage (calcul pur) : entreprises non placées, et classes concernées (nombre d'entreprises par classe). */
function EUC_DEV728_compter_(candidats) {
  var total = 0, parClasse = {};
  (candidats || []).forEach(function(x) {
    if (!x || EUC_DEV728_PLACEES_.indexOf(String(x.statut || '')) >= 0) return;
    total++;
    var vues = {};
    (x.perimetres || String(x.classe || '').split(' / ')).forEach(function(p) {
      var cl = String(p || '').split(' · ')[0].trim(); if (!cl || vues[cl]) return; vues[cl] = true;
      parClasse[cl] = (parClasse[cl] || 0) + 1;
    });
  });
  var classes = Object.keys(parClasse).map(function(c) { return { classe: c, nombre: parClasse[c] }; })
    .sort(function(a, b) { return b.nombre - a.nombre || a.classe.localeCompare(b.classe, 'fr'); });
  return { total: total, classes: classes };
}

function EUC_DEV728_aFaireCartographie() {
  EUC_IMPORT_exigerAdminTexte_();
  var annee = EUC_DEV368_year(''), c = EUC_DEV728_compter_(EUC_DEV517_geoCandidatesAll_(annee));
  return { ok: true, annee: annee, total: c.total, classes: c.classes.slice(0, 8), autresClasses: Math.max(0, c.classes.length - 8), page: 'geocodage-pfmp-admin' };
}
