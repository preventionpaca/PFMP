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
  c.calculs = 0;
  c.revision = 'R1';
  c.EUC_DEV538_yearsForScope_ = () => ['2026-2027'];
  c.EUC_DEV549_publicBookRevision_ = () => c.revision;
  c.EUC_DEV538_history_ = q => { c.calculs++; return [{ entreprise: 'GARAGE ' + (q.classe || 'TOUS'), adresse: '1 rue', historique: [], elevesAccueillis: 1, derniereSaisie: '2026-10-01' }]; };
  c.EUC_DEV547_bookResponse_ = (q, list) => ({ total: list.length, entreprises: list, facets: { classe: list.map(x => x.entreprise) } });
  c.EUC_DEV538_staffAllowed_ = () => true;
  return { c, cache };
}

test('une même recherche n’est calculée qu’une fois, pour tous les personnels', () => {
  const { cache } = contexte();
  const a = contexte(cache).c, b = contexte(cache).c;
  a.EUC_DEV538_staffBookData({ annee: '2026-2027', fenetre: 3, classe: 'TMVA1', page: 1, pageSize: 10, mode: 'STAFF' });
  assert.equal(a.calculs, 1);
  const r = b.EUC_DEV538_staffBookData({ annee: '2026-2027', fenetre: 3, classe: 'TMVA1', page: 2, pageSize: 50, mode: 'STAFF' });
  assert.equal(b.calculs, 0, 'la page et la taille ne changent pas la recherche mise en cache');
  assert.equal(r.entreprises[0].entreprise, 'GARAGE TMVA1');
});

test('une autre recherche ou une modification des données recalcule', () => {
  const { c } = contexte();
  c.EUC_DEV538_staffBookData({ annee: '2026-2027', classe: 'TMVA1' });
  c.EUC_DEV538_staffBookData({ annee: '2026-2027', classe: 'TMVA2' });
  assert.equal(c.calculs, 2);
  c.revision = 'R2';
  c.EUC_DEV538_staffBookData({ annee: '2026-2027', classe: 'TMVA1' });
  assert.equal(c.calculs, 3);
});

test('les filtres d’une ouverture sans filtre sont livrés avec la page suivante', () => {
  const { c } = contexte();
  assert.equal(c.EUC_DEV572_facettesBoot_('P', '2026-2027', 3), null);
  c.EUC_DEV538_staffBookData({ annee: '2026-2027', fenetre: 3, tri: 'RECENT', page: 1, pageSize: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(c.EUC_DEV572_facettesBoot_('P', '2026-2027', 3))), { classe: ['GARAGE TOUS'] });
  c.EUC_DEV538_staffBookData({ annee: '2026-2027', fenetre: 3, classe: 'TMVA1' });
  assert.deepEqual(JSON.parse(JSON.stringify(c.EUC_DEV572_facettesBoot_('P', '2026-2027', 3))), { classe: ['GARAGE TOUS'] }, 'une recherche filtrée ne remplace pas les listes complètes');
});

test('les trois books reçoivent les filtres mémorisés à l’ouverture', () => {
  assert.match(server, /b\.mode='ADMIN';b\.params=e&&e\.parameter\|\|\{\};b\.facettes=EUC_DEV572_facettesBoot_\('P'/);
  assert.match(server, /b\.mode='STAFF';b\.facettes=EUC_DEV572_facettesBoot_\('P'/);
  assert.match(server, /b\.facettes=typeof EUC_DEV572_facettesBoot_==='function'\?EUC_DEV572_facettesBoot_\('E','ALL',3\):null/);
  assert.match(server, /EUC_DEV572_ecrire_\(EUC_DEV572_cleFacettes_\('E','ALL',3\),facets\)/);
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
