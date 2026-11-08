/* DEV648 — Import JotForm : liste complète des lignes bloquées, et proposition d'importer les autres. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const src = read('apps-script/EUC_PFMP_DEV466_JotFormReliable.js'), page = read('apps-script/Migration_JotForm_PFMP_V160.html');

test('message de blocage : toutes les lignes (pas seulement 5) et leurs identifiants', () => {
  const k = {}; vm.createContext(k); vm.runInContext(/function EUC_DEV648_messageBlocage_[^]*?\n\}/.exec(src)[0], k);
  const errs = Array.from({ length: 7 }, (_, i) => ({ id: 10 + i, eleve: 'Élève ' + i, erreur: 'Dates PFMP absentes ou illisibles.' }));
  const msg = k.EUC_DEV648_messageBlocage_(errs, 42);
  assert.match(msg, /^PRÉCONTRÔLE BLOQUÉ — aucune écriture effectuée\. 7 ligne\(s\) bloquée\(s\) sur 42 :/);
  assert.ok(msg.includes('• Élève 6 : Dates PFMP absentes'), 'la 7e ligne est listée');
  assert.match(msg, /\[\[BLOQUEES:10,11,12,13,14,15,16\]\]$/);
  assert.match(src, /throw new Error\(EUC_DEV648_messageBlocage_\(errors,selected\.length\)\);/);
});

test('l’import reste tout ou rien : le précontrôle bloque avant toute écriture', () => {
  const prep = /function EUC_DEV466_prepare_[^]*?\n\}/.exec(src)[0];
  assert.ok(!/EUC_ENT_grist\('(post|patch)'/.test(prep), 'aucune écriture pendant le précontrôle');
  const imp = /function EUC_DEV466_importSelection[^]*?\n\}/.exec(src)[0];
  assert.ok(imp.indexOf('EUC_DEV466_prepare_') < imp.indexOf("EUC_ENT_grist('post'"));
});

test('page : marqueur masqué, retrait des lignes bloquées après confirmation, nouveau précontrôle', () => {
  assert.match(page, /replace\(\/\\s\*\\\[\\\[BLOQUEES:\[\\d,\]\*\\\]\\\]\/,''\)/);
  assert.match(page, /Retirer ces '\+bloquees\.length\+' ligne\(s\) de la sélection et importer les '\+restantes\.length\+' autre\(s\) \?/);
  assert.match(page, /bloquees\.forEach\(function\(id\)\{chosen\.delete\(id\);chosen\.delete\(String\(id\)\);\}\);/);
  assert.match(page, /setTimeout\(function\(\)\{btn\.click\(\);\},30\);/);
  assert.match(page, /btn\.disabled=false;\s*btn\.innerHTML=previous;\s*var brut=/, 'le bouton retrouve son état avant la proposition');
});
console.log(n + ' tests DEV648 réussis.');
