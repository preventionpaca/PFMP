/* DEV708 — Tester un SIRET ou un NIS (administration) : mêmes recherches que l'élève, aucune écriture. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const tests = [];
const test = (nom, fn) => tests.push([nom, fn]);

const page = read('apps-script/Test_Siret_DEV708.html');
const code = page.match(/<script>\n\(function\(\)\{([\s\S]*?)\n\}\)\(\);\n<\/script>/)[0].replace(/^<script>|<\/script>$/g, '');
const LECTURES = ['EUC_ENT_rechercherSiret', 'EUC_DEV603_traiterApi', 'EUC_DEV668_verifierNis', 'EUC_DEV646_rechercherMonacoParNom', 'EUC_DEV667_rechercherRci', 'EUC_DEV667_ficheRci'];

/* Minuteries manuelles : le délai dépassé se teste sans attendre 60 s. */
function horloge() {
  let id = 0; const t = new Map();
  return { setTimeout(f, ms) { t.set(++id, { f, ms }); return id; }, clearTimeout(i) { t.delete(i); },
    avancer(ms) { [...t.entries()].filter(([, x]) => x.ms <= ms).forEach(([i, x]) => { t.delete(i); x.f(); }); } };
}
/* Mini document : éléments par id, contenu HTML gardé en texte. */
function charger(serveur, opt) {
  opt = opt || {};
  const els = {}, h = horloge(), appels = [], proposes = [];
  const el = id => els[id] || (els[id] = { id, value: '', innerHTML: '', textContent: '', disabled: false, listeners: {}, className: '',
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    dispatchEvent(e) { (this.listeners[e.type] || []).forEach(f => f.call(this, e)); },
    click() { if (!this.disabled && this.onclick) this.onclick(); }, focus() {}, querySelectorAll() { return []; } });
  const run = new Proxy({}, { get(_, nom) {
    if (nom === 'withSuccessHandler') return ok => ({ withFailureHandler: ko => new Proxy({}, { get(__, fn) { return arg => { appels.push(fn); serveur(fn, arg, ok, ko); }; } }) });
  } });
  const w = { document: { getElementById: el }, google: { script: { run } }, setTimeout: h.setTimeout, clearTimeout: h.clearTimeout,
    fetch: opt.fetch || (() => Promise.reject(new Error('pas d’annuaire'))), AbortController, Event: function (t) { this.type = t; }, Promise, JSON, String, Number, Object, Math, encodeURIComponent,
    EUC707: { proposer(o) { proposes.push(o); return true; } } };
  w.window = w; vm.createContext(w); vm.runInContext(code, w);
  return { w, el, h, appels, proposes };
}
const ENT = { siret: '73282932000074', siren: '732829320', raisonSociale: 'ENTREPRISE TEST', codePostal: '69680', commune: 'CHASSIEU', adresseComplete: '1 RUE DU TEST', estSiege: true, etat: 'Actif', codeApe: '28.41Z' };
const attendre = () => new Promise(r => setImmediate(r));

test('type de saisie : SIRET (espaces admis), NIS (minuscules, interne), nom, chiffres incomplets', () => {
  const { w } = charger(() => {});
  const n = w.EUC708.nature;
  assert.deepEqual(['732 829 320 00074', '73282932000074', '7112b19343', '7112 B 19343', 'EUC-MC-0001', 'Titan', '732829320', 'ab', ''].map(n),
    ['SIRET', 'SIRET', 'NIS', 'NIS', 'NIS', 'NOM', 'CHIFFRES', 'COURT', '']);
});

test('page, route, lien d’administration, contrôle de publication, aucune écriture', () => {
  assert.match(page, /<title>Tester un SIRET ou un NIS<\/title>/);
  assert.ok(page.includes('<?!= EUC_ENT_inclure(\'Etablissements_DEV707\') ?>'), 'même question DEV707 que l’élève');
  assert.ok(page.includes('href="__LIEN_ACCUEIL__"'), 'Accueil PFMP par le jeton de liens');
  assert.ok(!page.includes('Exception:'), 'le contrôle des routes lit « Exception: » comme une erreur Apps Script');
  const appelés = [...page.matchAll(/appel\('([A-Za-z0-9_]+)'/g)].map(m => m[1]);
  assert.deepEqual([...new Set(appelés)].sort(), LECTURES.slice().sort(), 'seulement des lectures');
  assert.match(read('apps-script/EUC_DEV708_TestSiret.js'), /function EUC_DEV708_afficher\(e\) \{\n  EUC_IMPORT_exigerAdminTexte_\(\);/);
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'test-siret-pfmp':\n      return EUC_DEV708_afficher\(e\);/);
  assert.ok(read('apps-script/Admin_PFMP.html').includes('href="<?= adminBase ?>?page=test-siret-pfmp">Tester un SIRET ou un NIS<small>'));
  assert.match(read('scripts/pfmp-release-config.json'), /"page": "test-siret-pfmp", "scope": "admin", "expected": "Tester un SIRET ou un NIS"/);
  ['EUC_DEV668_verifierNis', 'EUC_DEV646_rechercherMonacoParNom', 'EUC_DEV667_rechercherRci', 'EUC_DEV667_ficheRci', 'EUC_DEV603_traiterApi'].forEach(f =>
    assert.ok(fs.readdirSync(path.join(__dirname, '..', 'apps-script')).some(x => /\.(js|gs)$/.test(x) && read('apps-script/' + x).includes('function ' + f + '(')), f));
});

test('SIRET connu dans la base : bouton bloqué avec indicateur, puis fiche et question DEV707', () => {
  let rendre; const { el, appels, proposes } = charger((fn, arg, ok) => { rendre = () => ok({ source: 'grist', entreprise: ENT }); });
  el('q').value = '732 829 320 00074'; el('tester').innerHTML = 'Tester'; el('tester').click();
  assert.equal(el('tester').disabled, true); assert.match(el('tester').innerHTML, /spinner[\s\S]*Vérification du SIRET/);
  el('tester').click(); assert.deepEqual(appels, ['EUC_ENT_rechercherSiret'], 'double clic sans effet');
  rendre();
  assert.equal(el('tester').disabled, false); assert.equal(el('tester').innerHTML, 'Tester');
  assert.match(el('res').innerHTML, /ENTREPRISE TEST[\s\S]*siège de l’entreprise[\s\S]*fiche déjà connue dans notre base/);
  assert.match(el('res').innerHTML, /annuaire-entreprises\.data\.gouv\.fr\/entreprise\/732829320/);
  assert.equal(proposes.length, 1); assert.equal(proposes[0].cp, '69680'); assert.equal(proposes[0].siret, '73282932000074');
});

test('SIRET lu à l’annuaire officiel depuis le navigateur, puis fiche mise en forme par le serveur', async () => {
  let url = ''; const { el, appels } = charger((fn, arg, ok) => {
    if (fn === 'EUC_ENT_rechercherSiret') ok({ source: 'api_navigateur', url: 'https://recherche-entreprises.api.gouv.fr/search?q=' + arg });
    if (fn === 'EUC_DEV603_traiterApi') { assert.equal(arg.siret, '73282932000074'); assert.equal(arg.json.results.length, 1); ok({ entreprise: Object.assign({}, ENT, { estSiege: false }) }); }
  }, { fetch: u => { url = u; return Promise.resolve({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ results: [{}] }) }); } });
  el('q').value = '73282932000074'; el('tester').innerHTML = 'Tester'; el('tester').click();
  await attendre(); await attendre();
  assert.match(url, /^https:\/\/recherche-entreprises\.api\.gouv\.fr\/search/);
  assert.deepEqual(appels, ['EUC_ENT_rechercherSiret', 'EUC_DEV603_traiterApi']);
  assert.equal(el('tester').disabled, false);
  assert.match(el('res').innerHTML, /établissement secondaire[\s\S]*annuaire officiel/);
});

test('erreurs : SIRET refusé par le serveur, annuaire indisponible, SIREN seul, délai dépassé', async () => {
  let c = charger((fn, arg, ok, ko) => ko(new Error('Le SIRET doit contenir 14 chiffres valides.')));
  c.el('q').value = '73282932000075'; c.el('tester').innerHTML = 'Tester'; c.el('tester').click();
  assert.equal(c.el('tester').disabled, false); assert.match(c.el('res').innerHTML, /erreur[\s\S]*14 chiffres valides/);

  c = charger((fn, arg, ok) => ok({ url: 'https://recherche-entreprises.api.gouv.fr/search?q=x' }), { fetch: () => Promise.resolve({ ok: false, status: 503, headers: { get: () => null } }) });
  c.el('q').value = '73282932000074'; c.el('tester').innerHTML = 'Tester'; c.el('tester').click();
  for (let i = 0; i < 3; i++) { await attendre(); await attendre(); c.h.avancer(5000); }
  assert.equal(c.el('tester').disabled, false); assert.match(c.el('res').innerHTML, /ne répond pas pour le moment \(erreur 503\)/);

  c = charger(() => { throw new Error('aucun appel attendu'); });
  c.el('q').value = '732829320'; c.el('tester').click(); assert.match(c.el('res').innerHTML, /SIRET compte 14 chiffres \(vous en avez saisi 9\)/);

  c = charger(() => {});
  c.el('q').value = '7112B19343'; c.el('tester').innerHTML = 'Tester'; c.el('tester').click();
  assert.equal(c.el('tester').disabled, true); c.h.avancer(60000);
  assert.equal(c.el('tester').disabled, false); assert.equal(c.el('tester').innerHTML, 'Tester'); assert.match(c.el('res').innerHTML, /Délai dépassé/);
});

test('NIS de Monaco : base puis registre ; nom : base puis registre quand la base ne connaît pas', () => {
  let c = charger((fn, arg, ok) => { assert.equal(fn, 'EUC_DEV668_verifierNis'); assert.equal(arg.nis, '7112Y19343'); ok({ trouve: true, source: 'RCI', nis: '7112Y19343', nisRegistre: '7112B19343', nom: 'TITAN', cp: '98000', ville: 'Monaco', rci: '17S07483' }); });
  c.el('q').value = '7112 y 19343'; c.el('tester').click();
  assert.match(c.el('res').innerHTML, /TITAN[\s\S]*même entreprise, lettre différente[\s\S]*registre de Monaco \(RCI\)/);
  c = charger((fn, arg, ok) => ok({ trouve: false }));
  c.el('q').value = '7112B19343'; c.el('tester').click(); assert.match(c.el('res').innerHTML, /introuvable/);

  c = charger((fn, arg, ok) => {
    if (fn === 'EUC_DEV646_rechercherMonacoParNom') ok({ resultats: [] });
    if (fn === 'EUC_DEV667_rechercherRci') ok({ resultats: [{ nom: 'TITAN MONACO', rci: '17S07483', forme: 'SARL', actif: true }] });
  });
  c.el('q').value = 'Titan'; c.el('tester').click();
  assert.deepEqual(c.appels, ['EUC_DEV646_rechercherMonacoParNom', 'EUC_DEV667_rechercherRci']);
  assert.equal(c.el('tester').disabled, false);
  assert.match(c.el('res').innerHTML, /Aucune entreprise de ce nom dans notre base[\s\S]*registre de Monaco[\s\S]*TITAN MONACO/);
});

(async () => {
  let n = 0;
  for (const [nom, fn] of tests) {
    try { await fn(); n++; console.log('✓ ' + nom); } catch (e) { console.error('✗ ' + nom + '\n  ' + (e && e.stack || e)); process.exitCode = 1; }
  }
  console.log(n + ' tests DEV708 réussis');
})();
