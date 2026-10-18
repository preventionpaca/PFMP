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
 * les mêmes nom, prénom et date de naissance, ou les mêmes nom et prénom dans la
 * même classe (une fiche avec INE et l'autre sans sont ainsi réunies). Dans chaque groupe,
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
  /* Une fiche peut avoir l'INE et pas l'autre (Pronote / copier-coller / Yparéo) : les clés INE,
   * identité (nom + prénom + naissance) et classe + nom + prénom sont réunies (union). */
  var parent = {}, cleFiche = {};
  function racine(k) { while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; } return k; }
  function lier(a, b) { parent[a] = parent[a] || a; parent[b] = parent[b] || b; var ra = racine(a), rb = racine(b); if (ra !== rb) parent[rb] = ra; }
  var actifs = eleves.filter(function(e) { return e.Actif !== false; });
  actifs.forEach(function(e) {
    var ine = norm(e.Numero_national || e.Numero_National || e.Identifiant_national);
    var naissance = typeof EUC_SUIVI2_date_ === 'function' ? EUC_SUIVI2_date_(e.Date_naissance) : '';
    var np = norm(e.Nom) + '|' + norm(e.Prenom_usage || e.Prenom), classe = EUC_DEV578_refEleve_(e.Classe) || norm(e.Code_classe_importe);
    var f = 'F|' + e.id, cles = [];
    if (ine) cles.push('INE|' + ine);
    if (naissance) cles.push('ID|' + np + '|' + naissance);
    if (classe && np !== '|') cles.push('CL|' + classe + '|' + np);
    parent[f] = parent[f] || f; cleFiche[e.id] = f;
    cles.forEach(function(k) { lier(f, k); });
  });
  var groupes = {};
  actifs.forEach(function(e) { var r = racine(cleFiche[e.id]); (groupes[r] = groupes[r] || []).push(e); });
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
    /* Deux INE différents : homonymes probables, jamais désactivés automatiquement. */
    var ines = {}; groupes[k].forEach(function(e) { var i = norm(e.Numero_national || e.Numero_National || e.Identifiant_national); if (i) ines[i] = true; });
    var inesDifferents = Object.keys(ines).length > 1;
    var aDesactiver = l.slice(1), arbitrer = inesDifferents || aDesactiver.some(function(x) { return x.poids > 0; });
    var ineGroupe = Object.keys(ines)[0], e0 = groupes[k][0];
    var cle = ineGroupe ? 'INE|' + ineGroupe : 'ID|' + norm(e0.Nom) + '|' + norm(e0.Prenom_usage || e0.Prenom);
    return { cle: cle, garde: l[0], autres: aDesactiver, arbitrer: arbitrer, inesDifferents: inesDifferents };
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
