'use strict';
/* DEV640 — Table unique des adresses publiques : aucun lien en dur ailleurs. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const appDir = path.join(root, 'apps-script');
const read = f => fs.readFileSync(path.join(appDir, f), 'utf8');
const liens = read('EUC_DEV640_Liens.js');
const fichiers = fs.readdirSync(appDir).filter(f => /\.(?:html|js|gs)$/.test(f)).sort();

let n = 0;
function test(name, fn) { fn(); n++; }

function ctxLiens() { const c = {}; vm.createContext(c); vm.runInContext(liens, c); return c; }

/* Sous-domaines publics de l'application, anciens comme nouveaux. Les adresses
 * électroniques et script.google.com/a/macros/lycee-les-eucalyptus.org restent permises. */
const EN_DUR = /\b(?:alternance|pfmp|apprentis|book-entreprise|livretek|livret|suiviek|apprenti|enregistrer-pfmp)\.(?:loucodi\.fr|lycee-les-eucalyptus\.org)|\bloucodi\.fr/;

test('aucun fichier de l’application n’écrit une adresse publique en dur hors de la table', () => {
  const fautifs = [];
  for (const f of fichiers) {
    if (f === 'EUC_DEV640_Liens.js') continue;
    read(f).split('\n').forEach((l, i) => { if (EN_DUR.test(l)) fautifs.push(f + ':' + (i + 1)); });
  }
  assert.deepEqual(fautifs, [], 'utiliser __LIEN_<CLE>__ (pages) ou EUC_LIEN_(cle) (serveur) : ' + fautifs.join(', '));
});

test('les jetons des pages désignent tous une clé de la table', () => {
  const t = ctxLiens().EUC_LIENS_table_();
  const inconnus = [];
  for (const f of fichiers) {
    (read(f).match(/__(?:LIEN|HOTE)_[A-Z]+__/g) || []).forEach(j => {
      const k = j.replace(/^__(?:LIEN|HOTE)_/, '').replace(/__$/, '').toLowerCase();
      if (!t[k]) inconnus.push(f + ' ' + j);
    });
  }
  assert.deepEqual(inconnus, []);
});

test('la table vise les domaines du lycée et garde les anciennes adresses reconnues', () => {
  const c = ctxLiens();
  assert.equal(c.EUC_LIEN_('accueil'), 'https://alternance.lycee-les-eucalyptus.org/');
  const t = c.EUC_LIENS_table_();
  assert.equal(t.livretek, 'https://livret.lycee-les-eucalyptus.org/');
  assert.equal(t.enregistrer, 'https://enregistrer-pfmp.lycee-les-eucalyptus.org/');
  for (const k of Object.keys(t)) assert.match(t[k], /^https:\/\/[a-z-]+\.lycee-les-eucalyptus\.org\/$/);
  assert.deepEqual(Object.keys(c.EUC_LIENS_anciens_()).sort(), Object.keys(c.EUC_LIENS_table_()).sort());
  assert.deepEqual(Array.from(c.EUC_LIENS_hotes_(['pfmp', 'apprentis'])),
    ['pfmp.lycee-les-eucalyptus.org', 'pfmp.loucodi.fr', 'apprentis.lycee-les-eucalyptus.org', 'apprentis.loucodi.fr']);
  assert.throws(() => c.EUC_LIEN_('inconnu'), /Lien inconnu/);
});

test('les jetons sont remplacés et un jeton inconnu reste visible', () => {
  const c = ctxLiens();
  assert.equal(c.EUC_LIENS_appliquer_('<a href="__LIEN_ACCUEIL__">Accueil PFMP</a> __HOTE_SUIVIEK__ __LIEN_ZZ__'),
    '<a href="https://alternance.lycee-les-eucalyptus.org/">Accueil PFMP</a> suiviek.lycee-les-eucalyptus.org __LIEN_ZZ__');
});

test('la décoration verte de chaque page remplace les jetons', () => {
  const c = { PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
    ScriptApp: { getScriptId: () => 'PROJET_VERT', getService: () => ({ getUrl: () => '' }) } };
  vm.createContext(c);
  vm.runInContext(liens + '\n' + read('EUC_PFMP_ReleaseChannel.js'), c);
  const out = { html: '<html><head></head><body><a id="home" href="__LIEN_ACCUEIL__" target="_top">Accueil PFMP</a> __HOTE_PFMP__</body></html>',
    getContent() { return this.html; }, setContent(v) { this.html = v; } };
  c.EUC_RELEASE_decorateOutput_(out);
  assert.ok(out.html.includes('href="https://alternance.lycee-les-eucalyptus.org/" target="_top">Accueil PFMP'));
  assert.ok(out.html.includes(' pfmp.lycee-les-eucalyptus.org'));
  assert.doesNotMatch(out.html, /__(?:LIEN|HOTE)_/);
});

test('les pages enseignants reconnaissent les coquilles anciennes et nouvelles', () => {
  const v = read('ZZ_EUC_ACCES_Verrou.js');
  assert.ok(v.includes("JSON.stringify(EUC_LIENS_hotes_(['pfmp', 'apprentis']))"));
});

console.log(n + ' tests DEV640 table des liens réussis');
