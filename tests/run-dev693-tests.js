/* DEV693 — Téléphones monégasques (fixes en 9, portables en 4 et en 6) acceptés dans tous les formulaires du site. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const pick = (src, re) => { const m = src.match(re); assert.ok(m, 'fonction introuvable ' + re); return m[0]; };
function dev603() { const d = read('apps-script/EUC_DEV603_Declaration.js'), k = { String, Math, Number }; vm.createContext(k);
  vm.runInContext(pick(d, /function EUC_DEV603_t_[^\n]*\n/) + pick(d, /function EUC_DEV603_telephone_[\s\S]*?\n}\n/), k); return k.EUC_DEV603_telephone_; }
test('QR code et « Déclarer mon entreprise » (serveur) : portables en 4, fixes en 9, portables en 6, français, international', () => {
  const T = dev603();
  assert.deepEqual([T('+377 44 12 34 56', 'MC').format, T('44 12 34 56', 'MC').format, T('0037745123456', 'MC').format], ['+377 44 12 34 56', '+377 44 12 34 56', '+377 45 12 34 56']);
  assert.equal(T('+377 93 15 00 00', 'MC').format, '+377 93 15 00 00'); assert.equal(T('+377 6 12 34 56 78', 'MC').format, '+377 6 12 34 56 78'); assert.equal(T('06 12 34 56 78', 'MC').format, '06 12 34 56 78');
  assert.equal(T('+377 44 12 34 56', 'FR').ok, true, 'entreprise française, contact monégasque'); assert.equal(T('+39 0184 123456', 'AUTRE').ok, true);
  assert.equal(T('+377 4412', 'MC').ok, false); assert.equal(T('44 12 34', 'MC').ok, false); assert.match(T('12', 'MC').erreur, /\+377 44 12 34 56/);
});
test('« Déclarer mon entreprise » (navigateur) : même règle que le serveur', () => {
  const h = read('apps-script/Declaration_Entreprise_DEV603.html'), k = { String }; vm.createContext(k); vm.runInContext(pick(h, /function tel\(v,pays\)\{[\s\S]*?\n  return fr\(\)[^\n]*\n/), k);
  assert.equal(k.tel('44 12 34 56', 'MC'), '+377 44 12 34 56'); assert.equal(k.tel('+377 44 12 34 56', 'FR'), '+377 44 12 34 56'); assert.equal(k.tel('+377 93 15 00 00', 'MC'), '+377 93 15 00 00'); assert.equal(k.tel('4412', 'MC'), null);
});
test('ancien formulaire direct (serveur et navigateur) : indicatif +377 / +33 accepté, portables en 4 et 6, mise en forme +377', () => {
  const s = read('apps-script/EUC_PFMP_Service.gs'), k = { String, RegExp }; vm.createContext(k);
  vm.runInContext(pick(s, /function EUC_PFMP_nettoyer_[^\n]*\n/) + pick(s, /function EUC_PFMP_normaliserPays_[^\n]*\n/) + pick(s, /function EUC_PFMP_formaterTelephone_[^\n]*\n/) + pick(s, /function EUC_PFMP_validerTelephone_[\s\S]*?\n}\n/), k);
  const V = (v, p) => k.EUC_PFMP_validerTelephone_(v, p, true);
  assert.equal(V('44 12 34 56', 'Monaco').normalise, '+377 44 12 34 56'); assert.equal(V('+377 44 12 34 56', 'France').normalise, '+377 44 12 34 56'); assert.equal(V('+377 6 12 34 56 78', 'Monaco').normalise, '+377 6 12 34 56 78');
  assert.equal(V('93 15 00 00', 'Monaco').normalise, '+377 93 15 00 00'); assert.equal(V('+33 6 12 34 56 78', 'Monaco').normalise, '06 12 34 56 78'); assert.equal(V('06 12 34 56 78', 'France').valide, true);
  assert.equal(V('44 12', 'Monaco').valide, false); assert.equal(V('06 12 ab', 'France').valide, false);
  const c = read('apps-script/PFMP_Scripts.html'), b = { String }; vm.createContext(b);
  vm.runInContext(pick(c, /function normalizeCountry[^\n]*?\}(?=\n|function)/) + '\n' + pick(c, /function formatPhone\(digits\)\{[^\n]*?\}(?=\n|function)/) + '\n' + pick(c, /function phoneResult[^\n]*?return \{valid:true,normalized:formatPhone\(digits\)\}\}/), b);
  assert.equal(b.phoneResult('44 12 34 56', 'Monaco', true).normalized, '+377 44 12 34 56'); assert.equal(b.phoneResult('+377 93 15 00 00', 'France', true).normalized, '+377 93 15 00 00'); assert.equal(b.phoneResult('44 12', 'Monaco', true).valid, false);
});
test('validation du bilan de visite et du livret par le tuteur : numéros monégasques à 8 chiffres acceptés', () => {
  const T = dev603(), b = read('apps-script/EUC_DEV598_BilanVisite.js'), k = { String, EUC_DEV603_telephone_: T }; vm.createContext(k); vm.runInContext(pick(b, /function EUC_DEV693_telValide_[\s\S]*?\n}\n/), k);
  ['44 12 34 56', '+377 44 12 34 56', '93 15 00 00', '06 12 34 56 78', '+39 0184 123456'].forEach(v => assert.equal(k.EUC_DEV693_telValide_(v), true, v));
  ['12 34', 'abc'].forEach(v => assert.equal(k.EUC_DEV693_telValide_(v), false, v));
  assert.match(b, /!EUC_DEV693_telValide_\(sig\.telephone\)/); assert.match(read('apps-script/EUC_DEV599_Livret.js'), /!EUC_DEV693_telValide_\(sig\.telephone\)/);
});
console.log(n + ' tests DEV693 réussis.');
