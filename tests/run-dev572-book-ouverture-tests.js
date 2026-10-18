'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const server = read('apps-script/EUC_PFMP_DEV538_BookQuotas.js'), staff = read('apps-script/Book_Entreprises_DEV538.html'), eleves = read('apps-script/Book_Entreprises_Eleves_DEV546.html');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }

function contexte(cache) {
  cache = cache || new Map();
  const c = { console, JSON, Math, Date, Object, Array, String, Number,
    CacheService: { getScriptCache: () => ({
      get: k => (cache.has(k) ? cache.get(k) : null),
      getAll: ks => { const o = {}; ks.forEach(k => { if (cache.has(k)) o[k] = cache.get(k); }); return o; },
      putAll: o => Object.keys(o).forEach(k => cache.set(k, String(o[k]))),
      put: (k, v) => cache.set(k, String(v))
    }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, getProperties: () => ({}) }) }
  };
  vm.createContext(c);
  vm.runInContext(server, c);
  c.calculs = [];
  c.revision = 'R1';
  c.EUC_DEV538_yearsForScope_ = () => ['2026-2027'];
  c.EUC_DEV549_publicBookRevision_ = () => c.revision;
  const h = (eleve, classe, niveau, apprenti, date) => ({ annee: '2026-2027', famille: 'BACPRO', eleve, classe, niveau, diplome: 'Bac pro ' + classe, periode: 'PFMP n°1', professeurVisiteur: 'M. PROF', apprenti: !!apprenti, dateSaisie: date });
  c.EUC_DEV538_history_ = q => { c.calculs.push(JSON.stringify(q)); return [
    { entreprise: 'GALBAUTO', adresse: '128 AVENUE DE LA LIBERTE 06220 VALLAURIS', ville: 'VALLAURIS', elevesAccueillis: 2, scolairesAccueillis: 2, apprentisAccueillis: 0, derniereSaisie: '2026-10-02', historique: [h('ALPHA Ana', 'TCAR', 'Terminale', false, '2026-10-02'), h('BETA Bob', '1MVA1', 'Première', false, '2026-09-01')] },
    { entreprise: 'GARAGE NICE', adresse: '1 RUE 06000 NICE', ville: 'NICE', elevesAccueillis: 1, scolairesAccueillis: 0, apprentisAccueillis: 1, derniereSaisie: '2026-10-05', historique: [h('GAMMA Gil', 'TMVA1', 'Terminale', true, '2026-10-05')] }
  ]; };
  c.EUC_DEV538_staffAllowed_ = () => true;
  return { c, cache };
}

test('la liste complète de l’année est calculée une fois et partagée par toutes les recherches', () => {
  const { cache } = contexte();
  const a = contexte(cache).c, b = contexte(cache).c;
  a.EUC_DEV538_staffBookData({ annee: '2026-2027', fenetre: 3, classe: 'TCAR', page: 1, pageSize: 10, mode: 'STAFF' });
  assert.equal(a.calculs.length, 1);
  assert.equal(JSON.parse(a.calculs[0]).classe, undefined, 'le calcul porte sur toute l’année, sans filtre');
  b.EUC_DEV538_staffBookData({ annee: '2026-2027', fenetre: 3, ville: 'NICE', mode: 'STAFF' });
  assert.equal(b.calculs.length, 0, 'une autre combinaison de filtres réutilise la même liste');
});

test('une modification des données ou une autre année recalcule la liste', () => {
  const { c } = contexte();
  c.EUC_DEV538_staffBookData({ annee: '2026-2027', classe: 'TCAR' });
  c.revision = 'R2';
  c.EUC_DEV538_staffBookData({ annee: '2026-2027', classe: 'TCAR' });
  c.EUC_DEV538_staffBookData({ annee: 'ALL', fenetre: 3 });
  assert.equal(c.calculs.length, 3);
});

test('le filtrage en mémoire garde les seuls accueils retenus et recompte les élèves', () => {
  const { c } = contexte();
  const r = c.EUC_DEV538_staffBookData({ annee: '2026-2027', classe: 'TCAR' });
  assert.equal(r.total, 1);
  const g = r.entreprises[0];
  assert.equal(g.entreprise, 'GALBAUTO');
  assert.equal(g.historique.length, 1);
  assert.equal(g.elevesAccueillis, 1);
  assert.equal(g.scolairesAccueillis, 1);
  assert.equal(c.EUC_DEV538_staffBookData({ annee: '2026-2027', ville: 'nice' }).entreprises[0].entreprise, 'GARAGE NICE');
  assert.equal(c.EUC_DEV538_staffBookData({ annee: '2026-2027', eleve: 'gamma' }).entreprises[0].apprentisAccueillis, 1);
  assert.equal(c.EUC_DEV538_staffBookData({ annee: '2026-2027', entreprise: 'vallauris' }).total, 1);
  assert.equal(c.EUC_DEV538_staffBookData({ annee: '2026-2027', tri: 'RECENT' }).entreprises[0].entreprise, 'GARAGE NICE');
});

test('les listes des filtres restent complètes quelle que soit la recherche', () => {
  const { c } = contexte();
  const r = c.EUC_DEV538_staffBookData({ annee: '2026-2027', fenetre: 3, classe: 'TCAR' });
  assert.deepEqual([...r.facets.ville], ['VALLAURIS']);
  assert.deepEqual([...r.facettesGlobales.ville].sort(), ['NICE', 'VALLAURIS']);
  assert.deepEqual([...r.facettesGlobales.niveau].sort(), ['Première', 'Terminale']);
  assert.deepEqual([...c.EUC_DEV572_facettesBoot_('P', '2026-2027', 3).classe].sort(), ['1MVA1', 'TCAR', 'TMVA1']);
});

test('la carte d’une classe et d’une période garde son calcul ciblé', () => {
  const { c } = contexte();
  c.EUC_DEV538_staffBookData({ annee: '2026-2027', classeId: 30, periodeId: 63 });
  assert.equal(JSON.parse(c.calculs[0]).classeId, 30);
});

test('la carte du book personnels réutilise la même liste en cache', () => {
  const { c } = contexte();
  c.EUC_DEV538_staffBookData({ annee: '2026-2027', fenetre: 3 });
  c.EUC_DEV441_geoClassify_ = () => ({ pays: 'FR' });
  try { c.EUC_DEV547_bookMapData({ annee: '2026-2027', fenetre: 3, classe: 'TCAR', mode: 'STAFF' }); } catch (e) {}
  assert.equal(c.calculs.length, 1, 'la carte ne relance pas le calcul complet');
});

test('pages et filtres utilisent les listes globales', () => {
  for (const html of [staff, eleves]) {
    assert.match(html, /facets\(r\.facettesGlobales\|\|r\.facets\)/);
    assert.match(html, /facets\(r&&\(r\.facettesGlobales\|\|r\.facets\)\)/);
  }
  assert.match(server, /facettesGlobales:globales/);
});

test('les trois books reçoivent les filtres mémorisés à l’ouverture', () => {
  assert.match(server, /b\.mode='ADMIN';b\.params=e&&e\.parameter\|\|\{\};[^;]*b\.current=[^;]*;b\.facettes=EUC_DEV572_facettesBoot_\('P'/);
  assert.match(server, /b\.mode='STAFF';b\.current='ALL';b\.facettes=EUC_DEV572_facettesBoot_\('P'/);
  assert.match(server, /b\.facettes=typeof EUC_DEV572_facettesBoot_==='function'\?EUC_DEV572_facettesBoot_\('E','ALL',3\):null/);
  assert.match(server, /EUC_DEV572_ecrire_\(EUC_DEV572_cleFacettes_\('E','ALL',3\),globales\)/);
});

test('à l’ouverture, aucun book ne charge la liste des entreprises', () => {
  for (const [nom, html] of [['personnels', staff], ['familles', eleves]]) {
    assert.match(html, /function ouvrir\(\)/, nom);
    assert.match(html, /if\(B\.facettes\)\{facets\(B\.facettes\);pret\(\);return\}/, nom);
    assert.match(html, /pageSize:1/, nom);
    assert.match(html, /if\(SEQ!==s\)return/, nom);
    assert.match(html, /SEQ\+\+/, nom);
  }
  assert.match(staff, /syncWindow\(\);ouvrir\(\);let requestedTool/);
  assert.doesNotMatch(staff, /syncWindow\(\);load\(true\);let requestedTool/);
  assert.match(eleves, /\$\('detailMap'\)\.onclick=focusCurrent;ouvrir\(\);\n<\/script>/);
});

test('les filtres restent utilisables pendant la préparation en arrière-plan', () => {
  for (const html of [staff, eleves]) {
    const f = html.match(/function ouvrir\(\)\{[^\n]*\}/)[0];
    assert.doesNotMatch(f, /busy|busyButton|disabled/);
  }
});

console.log(`\n${n} tests DEV572 ouverture des books réussis.`);
