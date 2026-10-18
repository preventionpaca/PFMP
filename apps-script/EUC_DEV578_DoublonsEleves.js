/**
 * DEV578 — Doublons d'élèves de l'année (administration PFMP).
 *
 * Cause connue : l'import Pronote ne cherchait les élèves existants que dans la
 * même « source » (LP / LGT / AUTO) ; un élève importé une première fois par
 * copier-coller puis par fichier sous une autre source était recréé. L'import
 * reconnaît désormais l'INE quelle que soit la source ; cet outil répare
 * l'existant.
 *
 * Deux fiches actives de la même année sont un doublon si elles ont le même INE,
 * ou, sans INE, les mêmes nom, prénom et date de naissance. Dans chaque groupe,
 * on garde la fiche qui porte le plus de liens (dossiers de convention,
 * apprentissage, affectations de professeurs, parcours différencié), puis la
 * plus ancienne. Les autres sont désactivées (Actif = faux), jamais supprimées,
 * et seulement si elles ne portent AUCUN lien : sinon le groupe est signalé
 * « à arbitrer » et rien n'est modifié.
 */
var EUC_DEV578_LIENS_ELEVE_ = [
  ['EUC_ACCES_FORMULAIRES_PFMP', 'conventions'],
  ['EUC_APPRENTISSAGE_PFMP', 'apprentissage'],
  ['EUC_AFFECTATIONS_SUIVI_PFMP', 'affectations'],
  ['EUC_PARCOURS_DIFFERENCIE_PFMP', 'parcours']
];

function EUC_DEV578_refEleve_(v) {
  if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) if (typeof v[i] === 'number') return v[i]; return 0; }
  var n = Number(v); return isFinite(n) ? n : 0;
}

function EUC_DEV578_doublonsCalcul_(annee) {
  var y = EUC_DEV368_year(annee || '');
  var eleves = EUC_SUIVI_fields_(EUC_SUIVI_sqlLecture_('SELECT e.*,a.Code AS Annee_code FROM EUC_ELEVES_PFMP e JOIN Annees_Scolaires a ON a.id=e.Annee_scolaire WHERE a.Code=?', [y])) || [];
  var norm = function(v) { return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ''); };
  var groupes = {};
  eleves.forEach(function(e) {
    if (e.Actif === false) return;
    var ine = norm(e.Numero_national || e.Numero_National || e.Identifiant_national);
    var naissance = typeof EUC_SUIVI2_date_ === 'function' ? EUC_SUIVI2_date_(e.Date_naissance) : '';
    var cle = ine ? 'INE|' + ine : 'ID|' + norm(e.Nom) + '|' + norm(e.Prenom_usage || e.Prenom) + '|' + naissance;
    if (!ine && !naissance) return; /* sans INE ni date, une homonymie n'est pas une preuve */
    (groupes[cle] = groupes[cle] || []).push(e);
  });
  var cles = Object.keys(groupes).filter(function(k) { return groupes[k].length > 1; });
  if (!cles.length) return { annee: y, groupes: [] };
  var ids = {}; cles.forEach(function(k) { groupes[k].forEach(function(e) { ids[Number(e.id)] = { conventions: 0, apprentissage: 0, affectations: 0, parcours: 0 }; }); });
  EUC_DEV578_LIENS_ELEVE_.forEach(function(t) {
    var rows = []; try { rows = EUC_DEV538_records_(t[0], {}) || []; } catch (e) { rows = []; }
    rows.forEach(function(r) {
      var f = EUC_DEV538_fields_(r); if (f.Actif === false) return;
      var id = EUC_DEV578_refEleve_(f.Eleve || f.Eleve_id || f.Eleve_match_id);
      if (ids[id]) ids[id][t[1]]++;
    });
  });
  var total = function(l) { return l.conventions + l.apprentissage + l.affectations + l.parcours; };
  return { annee: y, groupes: cles.map(function(k) {
    var l = groupes[k].map(function(e) { var li = ids[Number(e.id)]; return { id: Number(e.id), nom: String(e.Nom || '') + ' ' + String(e.Prenom_usage || e.Prenom || ''), classe: String(e.Code_classe_importe || ''), source: String(e.Source_Pronote || e.Source_import || ''), lot: String(e.Identifiant_lot_import || ''), entree: typeof EUC_SUIVI2_date_ === 'function' ? EUC_SUIVI2_date_(e.Date_entree) : '', liens: li, poids: total(li) }; });
    l.sort(function(a, b) { return b.poids - a.poids || a.id - b.id; });
    var aDesactiver = l.slice(1), arbitrer = aDesactiver.some(function(x) { return x.poids > 0; });
    return { cle: k, garde: l[0], autres: aDesactiver, arbitrer: arbitrer };
  }) };
}

/* Aperçu (aucune écriture) ; avec confirmation 'DESACTIVER', désactive les fiches sans lien. */
function EUC_DEV578_doublonsEleves(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var d = EUC_DEV578_doublonsCalcul_(q.annee), cibles = [];
  d.groupes.forEach(function(g) { if (!g.arbitrer) g.autres.forEach(function(x) { cibles.push(x.id); }); });
  var res = { ok: true, annee: d.annee, groupes: d.groupes, aDesactiver: cibles.length, aArbitrer: d.groupes.filter(function(g) { return g.arbitrer; }).length, apercu: q.confirmation !== 'DESACTIVER' };
  if (res.apercu || !cibles.length) return res;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  try {
    for (var i = 0; i < cibles.length; i += 100) EUC_ENT_grist('patch', '/tables/EUC_ELEVES_PFMP/records', { records: cibles.slice(i, i + 100).map(function(id) { return { id: id, fields: { Actif: false } }; }) });
  } finally { lock.releaseLock(); }
  res.desactives = cibles.length;
  return res;
}
