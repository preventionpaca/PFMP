/**
 * DEV592 — Bloc « Effectifs » de l'accueil administration.
 *
 * Tiré du modèle du suivi (EUC_SUIVI2, déjà en cache par témoin Grist) : pour chaque
 * classe, élèves, scolaires, apprentis et entreprises d'accueil distinctes. Les classes
 * Les entreprises comptées sont celles de l'année entière (toutes les périodes, conventions et contrats) :
 * le chiffre augmente au fil des PFMP. Les stagiaires de formation continue sont comptés à part.
 * scolaires et de mixité sont rangées par établissement (LP, LGT) ; les classes entières
 * d'apprentis et la formation continue par organisme (CFA RAN, CFAI, GRETA).
 * DEV732 : une classe entière n'est comptée que dans l'organisme qui a la relation avec l'OPCO (colonne
 * « Organisme relation OPCO » de la table Classes, DEV579) ; LP et LGT affichent aussi les apprentis
 * des classes entières qui leur sont rattachées (colonne Etab).
 */
var EUC_DEV592_ORDRE_ = ['LP', 'LGT', 'CFA RAN', 'CFAI', 'GRETA'];
var EUC_DEV592_STATUTS_ = { AVEC: 1, CONTRAT: 1, APPRENTI: 1, PDIF_ENTREPRISE: 1 };

/* DEV734 : un organisme de formation inscrit à la place de l'employeur (ex. export Yparéo du CQPM ascensoriste :
 * « AFPI PROVENCE » pour tous les apprentis) n'est pas une entreprise d'accueil. L'apprenti sous contrat sans
 * employeur identifié compte pour une entreprise « non renseignée » (hypothèse : un jeune = une entreprise). */
function EUC_DEV592_organismeFormation_(nom) {
  var n = String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  return /\b(AFPI|CFAI|GRETA|UIMM|POLE FORMATION)\b|^CFA\b/.test(n);
}

/* Calcul pur (testé hors Apps Script). */
function EUC_DEV592_calcul_(m) {
  var groupes = {}, n = function(v) { return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); };
  function groupe(nom) { return groupes[nom] = groupes[nom] || { nom: nom, classes: [], entreprises: {} }; }
  var rattaches = {};
  (m.classes || []).forEach(function(c) {
    if (c.test) return;
    var ce = c.modeApprentissage === 'CLASSE_ENTIERE' || c.modeApprentissage === 'FORMATION_CONTINUE', ents = {};
    (c.periodes || []).forEach(function(p) {
      var r = p.resume || {};
      (c.eleves || []).forEach(function(e) { var st = (r.statuts || {})[e.id], f = (r.fiches || {})[e.id]; if (EUC_DEV592_STATUTS_[st] && f && f.entreprise && !EUC_DEV592_organismeFormation_(f.entreprise)) ents[n(f.entreprise)] = f.entreprise; });
    });
    /* Entreprise du contrat en cours (même sans période d'appel ou de visite au calendrier). */
    var nonRenseignees = 0;
    (c.eleves || []).forEach(function(e) { var a = e.apprentissage; if (!a || a.code !== 'APPRENTI') return;
      if (a.entreprise && !EUC_DEV592_organismeFormation_(a.entreprise)) ents[n(a.entreprise)] = a.entreprise; else if (ce) nonRenseignees++; });
    var effectif = (c.eleves || []).length, fc = c.modeApprentissage === 'FORMATION_CONTINUE';
    var apprentis = fc ? 0 : ce ? effectif : (c.eleves || []).filter(function(e) { return e.apprentissage && e.apprentissage.code === 'APPRENTI'; }).length;
    var x = { id: c.id, nom: c.nom, famille: c.famille, mode: c.modeApprentissage || 'MIXITE', effectif: effectif, scolaires: ce ? 0 : effectif - apprentis, apprentis: apprentis, stagiaires: fc ? effectif : 0, entreprises: Object.keys(ents).length, entreprisesNonRenseignees: nonRenseignees,
      organismes: [c.gestionnaire, c.donneur].filter(function(v, i, a) { return v && a.indexOf(v) === i; }), etab: c.etab || '' };
    x.opco = c.opco || c.donneur || c.gestionnaire || '';
    /* DEV635 : classe entière / formation continue — liste des jeunes avec entreprise et tuteur du contrat en cours. */
    if (ce) x.liste = (c.eleves || []).map(function(e) { var a = e.apprentissage || {}, of = a.code === 'APPRENTI' && !!a.entreprise && EUC_DEV592_organismeFormation_(a.entreprise); return { nom: e.libelle || [e.nom, e.prenom].filter(Boolean).join(' '), statut: a.code || 'SCOLAIRE', entreprise: a.code === 'APPRENTI' && !of ? a.entreprise || '' : '', organismeFormation: of ? a.entreprise : '', siret: a.siret || '', tuteur: a.tuteur || '', debut: a.debut || '', fin: a.fin || '' }; })
      .sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
    var noms = ce ? [x.opco || 'Organisme à renseigner'] : [c.etab === 'LGT' ? 'LGT' : c.etab === 'LP' ? 'LP' : (c.etab || 'Autres')];
    /* DEV733 : établissement de rattachement réglé (LP / LGT / Aucun) ; à défaut, la colonne Etab. */
    var ratt = c.rattachement != null && c.rattachement !== '' ? c.rattachement : c.etab;
    x.rattachement = ratt === 'LP' || ratt === 'LGT' ? ratt : '';
    if (ce && !fc && x.rattachement) { var R = rattaches[x.rattachement] = rattaches[x.rattachement] || { apprentis: 0, classes: [] }; R.apprentis += apprentis; R.classes.push(c.nom); }
    noms.forEach(function(g) { var G = groupe(g); G.classes.push(x); Object.keys(ents).forEach(function(k) { G.entreprises[k] = true; }); });
  });
  var liste = Object.keys(groupes).map(function(k) {
    var g = groupes[k], t = { classes: g.classes.length, effectif: 0, scolaires: 0, apprentis: 0, stagiaires: 0, entreprises: Object.keys(g.entreprises).length, entreprisesNonRenseignees: 0 };
    g.classes.forEach(function(c) { t.entreprisesNonRenseignees += c.entreprisesNonRenseignees; t.effectif += c.effectif; t.scolaires += c.scolaires; t.apprentis += c.apprentis; t.stagiaires += c.stagiaires; });
    /* DEV732 : établissement → apprentis en mixité et apprentis des classes entières rattachées ; organisme → classes dédiées. */
    if (g.nom === 'LP' || g.nom === 'LGT') { t.etablissement = true; t.apprentisMixite = t.apprentis; t.apprentisClasseEntiere = rattaches[g.nom] ? rattaches[g.nom].apprentis : 0; t.classesRattachees = rattaches[g.nom] ? rattaches[g.nom].classes.sort() : []; }
    else if (EUC_DEV592_ORDRE_.indexOf(g.nom) >= 0) t.organisme = true;
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
  var r = EUC_DEV592_calcul_(m); r.ok = true; r.calculeLe = m.calculeLe;
  /* DEV597 : alertes de l'échéancier des contacts d'entrée, affichées sur l'accueil. */
  try { if (typeof EUC_DEV597_compteurs_ === 'function') r.echeancier = EUC_DEV597_compteurs_(annee); } catch (e) {}
  return r;
}

/* DEV635 — Page « Apprentis par classe entière » (mêmes données que le bloc Effectifs). */
function EUC_DEV635_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  return HtmlService.createTemplateFromFile('Apprentis_Classes_DEV635').evaluate().setTitle('Apprentis par classe entière').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
