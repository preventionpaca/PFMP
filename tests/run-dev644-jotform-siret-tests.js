'use strict';
/* DEV644 — Import JotForm : SIRET lu dans la colonne « N° SIRET (France) ». */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'EUC_MIGRATION_JOTFORM_V160.gs'), 'utf8');
const c = { console, JSON, Math, Date, Object, Array, String, Number, Error, RegExp };
vm.createContext(c); vm.runInContext(src, c);
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const ligne = extra => Object.assign({ 'Submission ID': '1', 'Année scolaire': '2026-2027', 'Nom': 'TEST', 'Prénom': 'Eva', 'Classe BAC PRO': '1TEST',
  'Date de début': 'nov. 23, 2026', 'Date de fin': 'déc. 18, 2026', 'Nom entreprise': 'Atelier' }, extra);

test('le nouveau formulaire « N° SIRET (France) » donne le SIRET, sans alerte « SIRET absent »', () => {
  const row = c.EUC_V160_mapCsv_(ligne({ 'N° SIRET (France)': '970 800 462 00024', "Pays de l'entreprise": 'France' }));
  assert.equal(row.SIRET_brut, '970 800 462 00024'); assert.equal(row.SIRET_normalise, '97080046200024');
  const a = c.EUC_V160_analyserRow_(row, [], [], []);
  assert.doesNotMatch(a.Alertes, /SIRET absent/);
});

test('l’ancien formulaire « N° SIRET » reste lu ; une entreprise de Monaco reste sans SIRET', () => {
  assert.equal(c.EUC_V160_mapCsv_(ligne({ 'N° SIRET': '93510938900012' })).SIRET_normalise, '93510938900012');
  const mc = c.EUC_V160_mapCsv_(ligne({ 'N° SIRET (France)': '', 'N° NIS (Monaco)': '295E00148' }));
  assert.equal(mc.SIRET_normalise, '');
});

test('les dates françaises de JotForm deviennent AAAA-MM-JJ, sans décalage d’un jour', () => {
  const d = c.EUC_V160_dateIso_;
  assert.equal(d('nov. 23, 2026'), '2026-11-23'); assert.equal(d('déc. 18, 2026'), '2026-12-18'); assert.equal(d('janv. 4, 2027'), '2027-01-04');
  assert.equal(d('févr. 19, 2027'), '2027-02-19'); assert.equal(d('juil. 7, 2027'), '2027-07-07'); assert.equal(d('août 30, 2027'), '2027-08-30');
  assert.equal(d('Nov. 2, 2026'), '2026-11-02'); assert.equal(d('23 novembre 2026'), '2026-11-23'); assert.equal(d('23/11/2026'), '2026-11-23');
  assert.equal(d('2026-11-23'), '2026-11-23'); assert.equal(d(''), ''); assert.equal(d('bientôt'), 'bientôt');
  const row = c.EUC_V160_mapCsv_(ligne({}));
  assert.equal(row.Date_debut_brut, '2026-11-23'); assert.equal(row.Date_fin_brut, '2026-12-18');
});

test('le mapping n’envoie que des colonnes déjà présentes dans le tampon', () => {
  const keys = Object.keys(c.EUC_V160_mapCsv_(ligne({}))).sort();
  assert.ok(!keys.some(k => /NIS|Pays/.test(k)), keys.join(','));
});

console.log(n + ' tests DEV644 SIRET JotForm réussis');
