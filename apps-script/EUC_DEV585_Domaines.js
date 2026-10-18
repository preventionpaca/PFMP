/**
 * DEV585 — Domaines d'activité des entreprises (Book des entreprises).
 *
 * Deux tables Grist gérées par l'administration, sans toucher au code :
 * - EUC_DOMAINES_PFMP : la liste des domaines (Nom, Ordre, Actif) ;
 * - EUC_DIPLOMES_DOMAINES_PFMP : chaque diplôme (libellé tel qu'affiché dans le
 *   Book) et son ou ses domaines (référence multiple : la microtechnique relève
 *   du numérique et de la fabrication mécanique).
 * Une entreprise appartient à un domaine dès qu'elle a accueilli un élève d'un
 * diplôme de ce domaine ; le filtre « Domaine » du Book est ensuite affiné par
 * le filtre « Diplôme ». Le bouton de préparation crée les tables et propose un
 * classement de départ ; il ne modifie jamais une ligne déjà saisie.
 */
var EUC_DEV585_DOMAINES_ = 'EUC_DOMAINES_PFMP';
var EUC_DEV585_DIPLOMES_ = 'EUC_DIPLOMES_DOMAINES_PFMP';
var EUC_DEV585_DEFAUT_ = ['Automobile', 'Fabrication mécanique', 'Conception industrielle', 'Numérique', 'Électrotechnique', 'Électricité'];

function EUC_DEV585_norm_(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }

/* Classement de départ d'un diplôme (proposition, modifiable ensuite dans Grist). */
function EUC_DEV585_proposition_(diplome) {
  var n = ' ' + EUC_DEV585_norm_(diplome) + ' ';
  if (/ TPEEB /.test(n)) return ['Électricité'];
  if (/ MICROTECHNIQUE| MT /.test(n)) return ['Numérique', 'Fabrication mécanique'];
  if (/ CARROSS| CAR | MAINTENANCE DES VEHICULES| MVA | MV | TPMMA | MECANICIEN/.test(n)) return ['Automobile'];
  if (/ RSP | RMO | TRPM | CPRP | REALISATION ET (MAINTENANCE|SUIVI)/.test(n)) return ['Fabrication mécanique'];
  if (/ CPI | MP3D | MODELISATION| CONCEPTION/.test(n)) return ['Conception industrielle'];
  if (/ CQPM | ASC | ASCENSOR/.test(n)) return ['Électrotechnique'];
  if (/ MELEC | ELEC | ELECTROTECHNIQUE| METIERS DE L ELECTRICITE/.test(n)) return ['Électrotechnique'];
  if (/ CIEL | CYBERSECURITE| NUMERIQUE/.test(n)) return ['Numérique'];
  return [];
}

/* Index diplôme normalisé → domaines, lu dans Grist (cache 5 min). */
function EUC_DEV585_index_() {
  var cache = null, cle = 'EUC_DEV585_INDEX';
  try { cache = CacheService.getScriptCache(); var c = cache.get(cle); if (c) return JSON.parse(c); } catch (e) {}
  var noms = {}, ordre = [], index = {};
  EUC_DEV538_optionalRecords_(EUC_DEV585_DOMAINES_, {}).forEach(function(r) {
    var f = EUC_DEV538_fields_(r); if (f.Actif === false || !String(f.Nom || '').trim()) return;
    noms[Number(r.id)] = String(f.Nom).trim(); ordre.push({ nom: String(f.Nom).trim(), ordre: Number(f.Ordre) || 999 });
  });
  ordre.sort(function(a, b) { return a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'); });
  EUC_DEV538_optionalRecords_(EUC_DEV585_DIPLOMES_, {}).forEach(function(r) {
    var f = EUC_DEV538_fields_(r), d = EUC_DEV585_norm_(f.Diplome); if (!d) return;
    var refs = Array.isArray(f.Domaines) ? f.Domaines.filter(function(x) { return typeof x === 'number'; }) : [];
    index[d] = refs.map(function(id) { return noms[id]; }).filter(Boolean);
  });
  var out = { domaines: ordre.map(function(x) { return x.nom; }), index: index };
  try { if (cache) cache.put(cle, JSON.stringify(out), 300); } catch (e) {}
  return out;
}
function EUC_DEV585_domainesDe_(diplome, idx) { return ((idx || {}).index || {})[EUC_DEV585_norm_(diplome)] || []; }

/* Libellés de diplômes connus du Book (facettes en cache, sinon calcul). */
function EUC_DEV585_diplomesBook_() {
  var f = typeof EUC_DEV572_facettesBoot_ === 'function' ? EUC_DEV572_facettesBoot_('P', 'ALL', 3) : null;
  if (!f || !f.diplome) f = EUC_DEV540_facets_(EUC_DEV572_base_({ annee: 'ALL', fenetre: 3 }));
  var l = (f.diplome || []).filter(Boolean), vus = {};
  l.forEach(function(d) { vus[EUC_DEV585_norm_(d)] = true; });
  /* Diplômes de toutes les classes de l'année (TSEC, TPMMA, TPEEB, CQPM…), même sans accueil dans le Book :
   * même libellé que celui que le Book affichera. */
  try {
    var dip = EUC_DEV538_diplomas_();
    EUC_DEV579_classesCompletes_(EUC_DEV368_year('')).forEach(function(c) {
      var d = EUC_DEV564_diplomaForClass_({ id: c.id, classe: c.classe, famille: c.famille }, dip[c.id]), k = EUC_DEV585_norm_(d);
      if (d && !vus[k]) { vus[k] = true; l.push(d); }
    });
  } catch (e) {}
  return l;
}

/* Aperçu, puis avec confirmation 'ECRIRE' : tables créées et complétées (jamais de modification). */
function EUC_DEV585_preparer(q) {
  EUC_DEV368_admin(); q = q || {};
  var tables = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; });
  var existeDom = tables.indexOf(EUC_DEV585_DOMAINES_) >= 0, existeDip = tables.indexOf(EUC_DEV585_DIPLOMES_) >= 0;
  var domaines = existeDom ? EUC_DEV538_optionalRecords_(EUC_DEV585_DOMAINES_, {}) : [], parNom = {};
  domaines.forEach(function(r) { var f = EUC_DEV538_fields_(r); parNom[EUC_DEV585_norm_(f.Nom)] = Number(r.id); });
  var deja = {}; (existeDip ? EUC_DEV538_optionalRecords_(EUC_DEV585_DIPLOMES_, {}) : []).forEach(function(r) { deja[EUC_DEV585_norm_(EUC_DEV538_fields_(r).Diplome)] = true; });
  var nouveauxDomaines = EUC_DEV585_DEFAUT_.filter(function(d) { return !parNom[EUC_DEV585_norm_(d)]; });
  var nouveauxDiplomes = EUC_DEV585_diplomesBook_().filter(function(d) { return !deja[EUC_DEV585_norm_(d)]; }).map(function(d) { return { diplome: d, domaines: EUC_DEV585_proposition_(d) }; });
  var res = { ok: true, apercu: q.confirmation !== 'ECRIRE', tablesACreer: [existeDom ? '' : EUC_DEV585_DOMAINES_, existeDip ? '' : EUC_DEV585_DIPLOMES_].filter(Boolean), domainesAAjouter: nouveauxDomaines, diplomesAAjouter: nouveauxDiplomes };
  if (res.apercu) return res;
  if (!existeDom) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV585_DOMAINES_, columns: [EUC_DEV441_col_('Nom', 'Domaine'), EUC_DEV441_col_('Ordre', 'Ordre', 'Int'), EUC_DEV441_col_('Actif', 'Actif', 'Bool')] }] });
  if (nouveauxDomaines.length) {
    var crees = EUC_ENT_grist('post', '/tables/' + EUC_DEV585_DOMAINES_ + '/records', { records: nouveauxDomaines.map(function(d) { return { fields: { Nom: d, Ordre: EUC_DEV585_DEFAUT_.indexOf(d) + 1, Actif: true } }; }) }).records || [];
    nouveauxDomaines.forEach(function(d, i) { if (crees[i]) parNom[EUC_DEV585_norm_(d)] = Number(crees[i].id); });
  }
  if (!existeDip) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV585_DIPLOMES_, columns: [EUC_DEV441_col_('Diplome', 'Diplôme (libellé du Book)'), EUC_DEV441_col_('Domaines', 'Domaines', 'RefList:' + EUC_DEV585_DOMAINES_)] }] });
  for (var i = 0; i < nouveauxDiplomes.length; i += 100) {
    EUC_ENT_grist('post', '/tables/' + EUC_DEV585_DIPLOMES_ + '/records', { records: nouveauxDiplomes.slice(i, i + 100).map(function(x) {
      var ids = x.domaines.map(function(d) { return parNom[EUC_DEV585_norm_(d)]; }).filter(Boolean);
      return { fields: { Diplome: x.diplome, Domaines: ids.length ? ['L'].concat(ids) : null } };
    }) });
  }
  try { CacheService.getScriptCache().remove('EUC_DEV585_INDEX'); } catch (e) {}
  res.ecrit = true; return res;
}
