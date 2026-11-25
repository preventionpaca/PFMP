'use strict';
/* DEV725 — stockage des propriétés du script : budget des caches régénérables, libération, écritures jamais en erreur. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };

/* Faux PropertiesService à quota (octets UTF-8 clé + valeur). */
function contexte(initial, quota) {
  const store = Object.assign({}, initial || {}), journal = [];
  const taille = () => Object.keys(store).reduce((t, k) => t + Buffer.byteLength(k) + Buffer.byteLength(String(store[k])), 0);
  const props = {
    getProperties: () => Object.assign({}, store),
    getProperty: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setProperty(k, v) { const av = store[k]; store[k] = String(v); if (taille() > quota) { if (av === undefined) delete store[k]; else store[k] = av; throw new Error('Vous avez dépassé le quota de stockage des propriétés'); } journal.push(['set', k]); },
    setProperties(o) { const av = Object.assign({}, store); Object.assign(store, o); if (taille() > quota) { Object.keys(store).forEach(k => delete store[k]); Object.assign(store, av); throw new Error('quota'); } journal.push(['setAll', Object.keys(o).length]); },
    deleteProperty(k) { delete store[k]; journal.push(['del', k]); },
    getKeys: () => Object.keys(store)
  };
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, __store: store, __journal: journal, __taille: taille,
    PropertiesService: { getScriptProperties: () => props }, EUC_DEV549_PUBLIC_BOOK_CACHE_PROP_: 'EUC_DEV549_PUBLIC_BOOK_INDEX_V1' };
  vm.createContext(k);
  vm.runInContext(read('apps-script/EUC_DEV725_StockageProprietes.js'), k, { filename: 'dev725' });
  return k;
}
const bloc = (c, n) => c.repeat(n);
function plein() {
  const s = { EUC_PFMP_ADMIN_EMAILS: 'a@ex.test', DEV457_TABLE_REV_ALL: '1' };
  for (let i = 0; i < 30; i++) s['EUC_DEV549_PUBLIC_BOOK_INDEX_V1_' + i] = bloc('b', 7000);
  s.EUC_DEV549_PUBLIC_BOOK_INDEX_V1_COUNT = '30'; s.EUC_DEV549_PUBLIC_BOOK_INDEX_V1_REV = 'r';
  for (let i = 0; i < 30; i++) s['DEV456R13_FAMILY_2026-2027_BACPRO_P' + i] = bloc('f', 7000);
  s['DEV456R13_FAMILY_2026-2027_BACPRO_PN'] = '30';
  for (let i = 0; i < 9; i++) s['DEV456R13_FAMILY_2026-2027_BTS_P' + i] = bloc('t', 7000);
  s['DEV456R13_FAMILY_2026-2027_BTS_PN'] = '9';
  s['DEV398_ACCESS_ROWS_2026-2027'] = bloc('a', 8000);
  return s;
}

test('groupes : seuls les caches régénérables (book, accès, familles) sont libérables ; réglages et révisions jamais', () => {
  const k = contexte({}, 1e9);
  assert.strictEqual(k.EUC_DEV725_groupe_('EUC_DEV549_PUBLIC_BOOK_INDEX_V1_12').rang, 0);
  assert.strictEqual(k.EUC_DEV725_groupe_('EUC_DEV549_PUBLIC_BOOK_INDEX_V1_COUNT').groupe, 'EUC_DEV549_PUBLIC_BOOK_INDEX_V1_');
  assert.strictEqual(k.EUC_DEV725_groupe_('DEV398_ACCESS_ROWS_2026-2027').rang, 1);
  assert.strictEqual(k.EUC_DEV725_groupe_('DEV456R13_FAMILY_2026-2027_BTS_PN').groupe, 'DEV456R13_FAMILY_2026-2027_BTS_P');
  assert.strictEqual(k.EUC_DEV725_groupe_('DEV456R13_FAMILY_2026-2027_BTS_P3').rang, 2);
  ['DEV457_TABLE_REV_ALL', 'EUC_PFMP_ADMIN_EMAILS', 'EUC_DEV545_COMPANY_ALIASES_V1', 'DEV456R13_FAMILY_2026-2027_BTS_N'].forEach(c => assert.strictEqual(k.EUC_DEV725_groupe_(c), null, c));
  assert.strictEqual(k.EUC_DEV725_octets_('é'), 2);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(k.EUC_DEV725_groupe_('DEV418_ACCESS_ROWS_2026-2027_28_13'))), { groupe: 'DEV418_ACCESS_ROWS_', rang: 0 });
  ['DEV517_GEO_INDEX_2026-2027_12', 'DEV517_GEO_INDEX_2026-2027_COUNT', 'DEV517_GEO_INDEX_2026-2027_AT'].forEach(c => assert.strictEqual(k.EUC_DEV725_groupe_(c).groupe, 'DEV517_GEO_INDEX_2026-2027_', c));
});

test('stockage plein : une révision (écriture indispensable) libère le book puis réussit, sans toucher aux réglages', () => {
  const s = plein(), k = contexte(s, Object.keys(s).reduce((t, c) => t + Buffer.byteLength(c) + Buffer.byteLength(s[c]), 0) + 10);
  assert.throws(() => k.PropertiesService.getScriptProperties().setProperty('X', bloc('x', 20000)));
  assert.strictEqual(k.EUC_DEV725_ecrire_(k.PropertiesService.getScriptProperties(), 'DEV457_TABLE_REV_EUC_AFFECTATIONS_SUIVI_PFMP', '17_abc'), true);
  assert.strictEqual(k.__store.DEV457_TABLE_REV_EUC_AFFECTATIONS_SUIVI_PFMP, '17_abc');
  assert.strictEqual(k.__store.EUC_PFMP_ADMIN_EMAILS, 'a@ex.test');
  assert.ok(!Object.keys(k.__store).some(c => c.indexOf('EUC_DEV549_PUBLIC_BOOK_INDEX_V1_') === 0), 'book libéré en entier');
  assert.ok(k.__taille() <= k.EUC_DEV725_BUDGET_);
  assert.strictEqual(k.__store['DEV456R13_FAMILY_2026-2027_BACPRO_PN'], '30', 'les familles restent si le book suffit');
});

test('écriture indispensable impossible même après libération : false, jamais d’exception', () => {
  const s = { REGLAGE: bloc('r', 3000) }, k = contexte(s, 3100);
  assert.strictEqual(k.EUC_DEV725_ecrire_(k.PropertiesService.getScriptProperties(), 'REV', bloc('v', 500)), false);
  assert.strictEqual(k.__store.REGLAGE.length, 3000);
});

test('budget : un snapshot de famille libère le book (rang inférieur) mais jamais une autre famille ; anciens blocs du groupe retirés', () => {
  const s = plein(), k = contexte(s, Object.keys(s).reduce((t, c) => t + Buffer.byteLength(c) + Buffer.byteLength(s[c]), 0) + 10), items = {};
  for (let i = 0; i < 20; i++) items['DEV456R13_FAMILY_2026-2027_BTS_P' + i] = bloc('u', 7000);
  items['DEV456R13_FAMILY_2026-2027_BTS_PN'] = '20';
  assert.strictEqual(k.EUC_DEV725_reserver_(items, 'DEV456R13_FAMILY_2026-2027_BTS_P'), true);
  assert.ok(!Object.keys(k.__store).some(c => c.indexOf('EUC_DEV549_PUBLIC_BOOK_INDEX_V1_') === 0));
  assert.strictEqual(k.__store['DEV456R13_FAMILY_2026-2027_BACPRO_PN'], '30');
  /* écriture effective : reste sous le budget */
  k.PropertiesService.getScriptProperties().setProperties(items, false);
  assert.ok(k.__taille() <= k.EUC_DEV725_BUDGET_);
  /* un snapshot plus court retire les blocs en trop */
  const court = { 'DEV456R13_FAMILY_2026-2027_BTS_PN': '2', 'DEV456R13_FAMILY_2026-2027_BTS_P0': 'x', 'DEV456R13_FAMILY_2026-2027_BTS_P1': 'y' };
  assert.strictEqual(k.EUC_DEV725_reserver_(court, 'DEV456R13_FAMILY_2026-2027_BTS_P'), true);
  assert.ok(!('DEV456R13_FAMILY_2026-2027_BTS_P5' in k.__store));
});

test('budget : un book trop gros n’évince aucune famille et n’est pas écrit', () => {
  const s = plein(); Object.keys(s).filter(c => c.indexOf('EUC_DEV549') === 0).forEach(c => delete s[c]);
  const k = contexte(s, 500 * 1024), items = { EUC_DEV549_PUBLIC_BOOK_INDEX_V1_REV: 'r2', EUC_DEV549_PUBLIC_BOOK_INDEX_V1_COUNT: '40' };
  for (let i = 0; i < 40; i++) items['EUC_DEV549_PUBLIC_BOOK_INDEX_V1_' + i] = bloc('b', 7000);
  assert.strictEqual(k.EUC_DEV725_reserver_(items, 'EUC_DEV549_PUBLIC_BOOK_INDEX_V1_'), false);
  assert.strictEqual(k.__store['DEV456R13_FAMILY_2026-2027_BACPRO_PN'], '30');
  assert.strictEqual(k.__store['DEV398_ACCESS_ROWS_2026-2027'].length, 8000);
});

test('situation du 25/11 (445 Ko : index géographique, reliquat DEV418) : un snapshot de famille libère ces caches et tient sous le budget', () => {
  const s = { REGLAGES: bloc('r', 60000) };
  for (let i = 0; i < 28; i++) s['DEV418_ACCESS_ROWS_2026-2027_28_' + i] = bloc('a', 7000);
  for (let i = 0; i < 20; i++) s['DEV517_GEO_INDEX_2026-2027_' + i] = bloc('g', 7000);
  s['DEV517_GEO_INDEX_2026-2027_COUNT'] = '20';
  const k = contexte(s, 500 * 1024), items = { 'DEV456R13_FAMILY_2026-2027_BACPRO_PN': '30' };
  for (let i = 0; i < 30; i++) items['DEV456R13_FAMILY_2026-2027_BACPRO_P' + i] = bloc('f', 7000);
  assert.strictEqual(k.EUC_DEV725_reserver_(items, 'DEV456R13_FAMILY_2026-2027_BACPRO_P'), true);
  assert.ok(!Object.keys(k.__store).some(c => /^DEV418_/.test(c)), 'reliquat libéré d’abord');
  assert.strictEqual(k.__store.REGLAGES.length, 60000);
  k.PropertiesService.getScriptProperties().setProperties(items, false);
  assert.ok(k.__taille() <= k.EUC_DEV725_BUDGET_);
});

test('diagnostic : tailles et noms seulement, jamais de valeur', () => {
  const k = contexte(plein(), 1e9), e = k.EUC_DEV725_etat_(), txt = JSON.stringify(e);
  assert.strictEqual(e.ok, true); assert.ok(e.octets > 400000); assert.strictEqual(e.lourds[0].nom, 'DEV456R13_FAMILY_2026-2027_BACPRO_P');
  assert.ok(e.lourds.some(x => x.nom === 'EUC_DEV549_PUBLIC_BOOK_INDEX_V1' && x.cache));
  assert.ok(!/a@ex\.test|fffff|bbbbb/.test(txt));
});

test('câblage : révision DEV457, snapshot famille DEV456, book DEV549, compteur DEV447 passent par le garde DEV725', () => {
  assert.ok(/EUC_DEV725_ecrire_\(p,EUC_DEV457_PROP_PREFIX_/.test(read('apps-script/EUC_PFMP_DEV457_GristReadMemo.js')));
  assert.ok(!/\n  p\.setProperty\(EUC_DEV457_PROP_PREFIX_/.test(read('apps-script/EUC_PFMP_DEV457_GristReadMemo.js')), 'plus d’écriture de révision qui lève');
  assert.ok(/EUC_DEV725_reserver_\(items,k\+'_P'\)/.test(read('apps-script/EUC_PFMP_DEV456_RestaurationExacte.js')));
  assert.ok(/EUC_DEV725_reserver_\(values,key\+'_'\)/.test(read('apps-script/EUC_PFMP_DEV538_BookQuotas.js')));
  assert.ok(/EUC_DEV725_reserver_\(values,key\+'_'\)\)props\.setProperties/.test(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js')), 'index géographique');
  const u = read('apps-script/EUC_PFMP_DEV447_GristUsage.js');
  assert.ok(/EUC_DEV725_ecrire_\(props,key/.test(u) && /stockage:stockage/.test(u));
  assert.ok(/id="stockage725"/.test(read('apps-script/Consommation_API_Grist_DEV447.html')));
});

test('révision DEV457 : stockage plein après une écriture Grist réussie → aucune exception, mémo vidé', () => {
  const k = contexte({ BLOC: bloc('z', 999) }, 1000);
  vm.runInContext(read('apps-script/EUC_PFMP_DEV457_GristReadMemo.js').split('/* Surcharges finales')[0], k, { filename: 'dev457' });
  k.EUC_DEV457_MEMO_ = { a: 1 };
  k.EUC_DEV457_bump_('/tables/EUC_AFFECTATIONS_SUIVI_PFMP/records');
  assert.deepStrictEqual(Object.keys(vm.runInContext('EUC_DEV457_MEMO_', k)), []);
});

console.log(n + ' tests DEV725 réussis');
