/**
 * DEV592 — Bloc « Effectifs » de l'accueil administration.
 *
 * Tiré du modèle du suivi (EUC_SUIVI2, déjà en cache par témoin Grist) : pour chaque
 * classe, élèves, scolaires, apprentis et entreprises d'accueil distinctes. Les classes
 * Les entreprises comptées sont celles de l'année entière (toutes les périodes, conventions et contrats) :
 * le chiffre augmente au fil des PFMP. Les stagiaires de formation continue sont comptés à part.
 * scolaires et de mixité sont rangées par établissement (LP, LGT) ; les classes entières
 * d'apprentis et la formation continue par organisme (CFA RAN, CFAI, GRETA) : une classe
 * co-gérée (ex. BTS ELEC Alt : CFA RAN + CFAI) apparaît dans les deux organismes.
 */
var EUC_DEV592_ORDRE_ = ['LP', 'LGT', 'CFA RAN', 'CFAI', 'GRETA'];
var EUC_DEV592_STATUTS_ = { AVEC: 1, CONTRAT: 1, APPRENTI: 1, PDIF_ENTREPRISE: 1 };

/* Calcul pur (testé hors Apps Script). */
function EUC_DEV592_calcul_(m) {
  var groupes = {}, n = function(v) { return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); };
  function groupe(nom) { return groupes[nom] = groupes[nom] || { nom: nom, classes: [], entreprises: {} }; }
  (m.classes || []).forEach(function(c) {
    var ce = c.modeApprentissage === 'CLASSE_ENTIERE' || c.modeApprentissage === 'FORMATION_CONTINUE', ents = {};
    (c.periodes || []).forEach(function(p) {
      var r = p.resume || {};
      (c.eleves || []).forEach(function(e) { var st = (r.statuts || {})[e.id], f = (r.fiches || {})[e.id]; if (EUC_DEV592_STATUTS_[st] && f && f.entreprise) ents[n(f.entreprise)] = f.entreprise; });
    });
    /* Entreprise du contrat en cours (même sans période d'appel ou de visite au calendrier). */
    (c.eleves || []).forEach(function(e) { var a = e.apprentissage; if (a && a.code === 'APPRENTI' && a.entreprise) ents[n(a.entreprise)] = a.entreprise; });
    var effectif = (c.eleves || []).length, fc = c.modeApprentissage === 'FORMATION_CONTINUE';
    var apprentis = fc ? 0 : ce ? effectif : (c.eleves || []).filter(function(e) { return e.apprentissage && e.apprentissage.code === 'APPRENTI'; }).length;
    var x = { id: c.id, nom: c.nom, famille: c.famille, mode: c.modeApprentissage || 'MIXITE', effectif: effectif, scolaires: ce ? 0 : effectif - apprentis, apprentis: apprentis, stagiaires: fc ? effectif : 0, entreprises: Object.keys(ents).length,
      organismes: [c.gestionnaire, c.donneur].filter(function(v, i, a) { return v && a.indexOf(v) === i; }) };
    var noms = ce ? x.organismes.slice() : [c.etab === 'LGT' ? 'LGT' : c.etab === 'LP' ? 'LP' : (c.etab || 'Autres')];
    if (ce && !noms.length) noms = ['Organisme à renseigner'];
    noms.forEach(function(g) { var G = groupe(g); G.classes.push(x); Object.keys(ents).forEach(function(k) { G.entreprises[k] = true; }); });
  });
  var liste = Object.keys(groupes).map(function(k) {
    var g = groupes[k], t = { classes: g.classes.length, effectif: 0, scolaires: 0, apprentis: 0, stagiaires: 0, entreprises: Object.keys(g.entreprises).length };
    g.classes.forEach(function(c) { t.effectif += c.effectif; t.scolaires += c.scolaires; t.apprentis += c.apprentis; t.stagiaires += c.stagiaires; });
    g.classes.sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
    return { nom: g.nom, totaux: t, classes: g.classes };
  });
  liste.sort(function(a, b) { var i = EUC_DEV592_ORDRE_.indexOf(a.nom), j = EUC_DEV592_ORDRE_.indexOf(b.nom); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || a.nom.localeCompare(b.nom, 'fr'); });
  /* Total général : chaque classe une seule fois (une classe co-gérée n'est pas comptée deux fois). */
  var vues = {}, tot = { classes: 0, effectif: 0, scolaires: 0, apprentis: 0, stagiaires: 0 };
  liste.forEach(function(g) { g.classes.forEach(function(c) { if (vues[c.id]) return; vues[c.id] = true; tot.classes++; tot.effectif += c.effectif; tot.scolaires += c.scolaires; tot.apprentis += c.apprentis; tot.stagiaires += c.stagiaires; }); });
  return { annee: m.annee, total: tot, groupes: liste };
}

function EUC_DEV592_effectifs(annee) {
  EUC_SUIVI2_exigerAdmin_();
  var m = EUC_SUIVI2_modele_(String(annee || ''));
  var r = EUC_DEV592_calcul_(m); r.ok = true; r.calculeLe = m.calculeLe; return r;
}
