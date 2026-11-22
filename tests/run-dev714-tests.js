'use strict';
/* DEV714 — Même entreprise : élèves de la classe et d'autres classes aux mêmes dates ; suivi, export PDF et PDF du courriel de dépôt. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp }; vm.createContext(k);
['apps-script/EUC_DEV714_MemeEntreprise.js', 'apps-script/EUC_DEV663_TableauDepot.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));

/* Vue du suivi (forme de EUC_SUIVI2_vueEnseignants_), noms fictifs. */
const F = [
  { entreprise: 'GARAGE AZUR SARL', adresse: '1 rue du Port, 06300 NICE' },                                   // 0
  { entreprise: 'Garage Azur', adresse: '1 rue du Port 06300 Nice', debut: '2026-11-30', fin: '2026-12-18' }, // 1 autre classe, chevauche
  { entreprise: 'GARAGE AZUR', adresse: '06300 NICE', debut: '2027-03-01', fin: '2027-03-26' },               // 2 autre classe, autres dates
  { entreprise: 'ÉLEC SUD', adresse: '06000 NICE' },                                                          // 3 seul dans la classe
  { entreprise: 'Elec Sud', adresse: '06000 NICE' }                                                           // 4 autre classe, même période
];
const ligne = (st, f, tel, vis) => [st, f, tel || '', vis || '', 0, '', 0];
const D = { annee: '2026-2027', fiches: F, classes: [
  { id: 20, nom: '1MVA2', eleves: [[1, 'DUPONT Léo'], [2, 'MARTIN Paul'], [3, 'BEN Ali']], pp: ['M. PP'],
    periodes: [{ id: 501, libelle: 'PFMP n°1', debut: '2026-11-23', fin: '2026-12-18', lignes: { 1: ligne('AVEC', 0, 'M. A', 'M. V'), 2: ligne('SANS', -1), 3: ligne('AVEC', 3, 'M. A', 'M. V') } }] },
  { id: 30, nom: 'TMVA1', eleves: [[4, 'ZOE Eva'], [5, 'LUC Tom']],
    periodes: [{ id: 601, libelle: 'PFMP n°2', debut: '2026-11-23', fin: '2026-12-18', lignes: { 4: ligne('AVEC', 1, 'M. B', 'M. V'), 5: ligne('AVEC', 4, 'M. A', 'M. V') } },
      { id: 602, libelle: 'PFMP n°3', debut: '2027-03-01', fin: '2027-03-26', lignes: { 4: ligne('AVEC', 2, 'M. C', 'M. W') } }] },
  { id: 40, nom: 'Apprentis', ce: true, eleves: [[6, 'APP Rémi']], periodes: [{ id: 701, debut: '2026-09-01', fin: '2027-06-30', lignes: { 6: ligne('AVEC', 0) } }] }
] };

test('autres classes : même entreprise aux mêmes dates ajoutée ; autres dates, classe d’apprentis et élèves sans convention exclus', () => {
  const g = J(k.EUC_DEV714_memeEntreprise_(D, 20, 501));
  assert.equal(g.length, 2);
  const az = g.find(x => /azur/i.test(x.entreprise)), el = g.find(x => /sud/i.test(x.entreprise));
  assert.deepEqual(az.eleves, ['DUPONT Léo']); assert.deepEqual(az.autres, [{ nom: 'ZOE Eva', classe: 'TMVA1' }]); assert.deepEqual(az.autresClasses, ['TMVA1']);
  assert.deepEqual(az.aVerifier, ['Téléphone : plusieurs professeurs']);
  assert.deepEqual(el.eleves, ['BEN Ali']); assert.deepEqual(el.autres, [{ nom: 'LUC Tom', classe: 'TMVA1' }]); assert.deepEqual(el.aVerifier, []);
});

test('affiché dans chacune des deux classes concernées ; rien pour une classe d’apprentis', () => {
  const g = J(k.EUC_DEV714_memeEntreprise_(D, 30, 601));
  const az = g.find(x => /azur/i.test(x.entreprise));
  assert.deepEqual(az.eleves, ['ZOE Eva']); assert.deepEqual(az.autres, [{ nom: 'DUPONT Léo', classe: '1MVA2' }]);
  assert.equal(J(k.EUC_DEV714_memeEntreprise_(D, 30, 602)).length, 0, 'mars : personne d’autre aux mêmes dates');
  assert.equal(J(k.EUC_DEV714_memeEntreprise_(D, 40, 701)).length, 0);
  assert.equal(J(k.EUC_DEV714_memeEntreprise_(D, 99, 1)).length, 0);
});

test('lignes du tableau : élèves de la classe, autres classes, professeurs, à vérifier', () => {
  const l = J(k.EUC_DEV714_lignes_(k.EUC_DEV714_memeEntreprise_(D, 20, 501)));
  const az = l.find(x => /AZUR/i.test(x[0]));
  assert.deepEqual(az, ['GARAGE AZUR SARL\n1 rue du Port, 06300 NICE', '1 élève :\nDUPONT Léo', 'ZOE Eva (TMVA1)', 'M. A (1)\nM. B (1)', 'M. V', 'Téléphone : plusieurs professeurs']);
  assert.equal(J(k.EUC_DEV714_ENTETES_).length, az.length);
});

test('PDF joint au courriel de dépôt (DEV663) : second tableau sous celui de la classe', () => {
  const d = J(k.EUC_DEV663_donnees_(D, 20, 501, 0, null, '23/11/2026 10:00'));
  assert.equal(d.memeEntreprise.length, 2); assert.equal(d.memeEntreprise[0].autres.length, 1);
  const src = read('apps-script/EUC_DEV663_TableauDepot.js');
  assert.match(src, /var t2 = b\.appendTable\(\[EUC_DEV714_ENTETES_\]\.concat\(EUC_DEV714_lignes_\(d\.memeEntreprise\)\)\);/);
  assert.ok(src.indexOf('var t2 = b.appendTable') < src.indexOf("style(doc.addFooter()"), 'avant le pied de page');
});

test('page du suivi : calcul injecté depuis le serveur, « </ » neutralisé ; repli sans le fichier', () => {
  const src = k.EUC_DEV714_source_();
  assert.doesNotMatch(src, /<\//);
  const s2 = {}; vm.createContext(s2); vm.runInContext(src, s2);
  assert.equal(J(s2.EUC_DEV714_memeEntreprise_(D, 20, 501)).length, 2);
  assert.match(read('apps-script/Suivi_Enseignants_DEV576.html'), /<script>\n\/\* DEV714 [^\n]*\n<\?!= dev714 \?>\nvar D=<\?!= donnees \?>/);
  const e = read('apps-script/EUC_SUIVI2_Enseignants.js');
  assert.match(e, /t\.dev714 = typeof EUC_DEV714_source_ === 'function' \? EUC_DEV714_source_\(\) : /);
  assert.ok(e.indexOf('t.dev714 =') < e.indexOf('return t.evaluate()'));
  const h = read('apps-script/Suivi_Enseignants_DEV576.html');
  assert.match(h, /<th>Élèves d’autres classes \(mêmes dates\)<\/th>/);
  assert.match(h, /function memeEntreprise\(c,p\)\{return EUC_DEV714_memeEntreprise_\(D,c\.id,p\.id\);\}/);
});

console.log(n + ' tests DEV714 réussis.');
