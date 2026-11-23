'use strict';
/* DEV716 — « Même période » : dates officielles des périodes ; un élève en retard ou en prolongation reste dans sa période. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const k = {}; vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV714_MemeEntreprise.js'), k);
const ligne = (f, tel) => ['AVEC', f, tel || '', '', 0, '', 0];
/* Noms fictifs. Classe A : période 23/11 → 18/12 ; classe B : période 04/01 → 29/01 (périodes qui ne se recouvrent pas). */
const F = [
  { entreprise: 'GARAGE X', adresse: '06000 NICE', debut: '2026-11-23', fin: '2027-01-08' }, // A1 : prolongé jusqu'au 08/01
  { entreprise: 'GARAGE X', adresse: '06000 NICE', debut: '2027-01-04', fin: '2027-01-29' }, // B1 : période suivante
  { entreprise: 'GARAGE X', adresse: '06000 NICE', debut: '2026-12-07', fin: '2026-12-18' }, // C1 : départ en retard, même période que A
  { entreprise: 'GARAGE X', adresse: '06000 NICE', debut: '2026-12-01', fin: '2026-12-18' }  // A2 : même classe, départ en retard
];
const D = { fiches: F, classes: [
  { id: 1, nom: 'CLASSE A', eleves: [[1, 'UN A'], [4, 'DEUX A']], periodes: [{ id: 11, debut: '2026-11-23', fin: '2026-12-18', lignes: { 1: ligne(0), 4: ligne(3) } }] },
  { id: 2, nom: 'CLASSE B', eleves: [[2, 'UN B']], periodes: [{ id: 21, debut: '2027-01-04', fin: '2027-01-29', lignes: { 2: ligne(1) } }] },
  { id: 3, nom: 'CLASSE C', eleves: [[3, 'UN C']], periodes: [{ id: 31, debut: '2026-11-23', fin: '2026-12-18', lignes: { 3: ligne(2) } }] }
] };

test('suivi et PDF : la prolongation n’amène pas la période suivante ; le retard reste dans la même période', () => {
  const g = J(k.EUC_DEV714_memeEntreprise_(D, 1, 11));
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].eleves, ['DEUX A', 'UN A'], 'élève en retard de la même classe compris');
  assert.deepEqual(g[0].autres, [{ nom: 'UN C', classe: 'CLASSE C' }], 'classe C (même période, départ décalé) ; jamais la classe B');
  assert.equal(J(k.EUC_DEV714_memeEntreprise_(D, 2, 21)).length, 0, 'classe B : personne sur sa période');
});

test('statistiques : regroupement sur les périodes officielles (accueillis ensemble et classes en même temps)', () => {
  const h = read('apps-script/Statistiques_PFMP_DEV698.html');
  const b = h.slice(h.indexOf('  function ensembleGroupes('), h.indexOf('  function rendre(){'));
  const j = h.slice(h.indexOf('  const jj='), h.indexOf('\n', h.indexOf('  const jj=')));
  const g = h.slice(h.indexOf('  function grappes(e){'), h.indexOf('  function rendre(){'));
  const p = vm.createContext({}); vm.runInContext(j + '\n' + b + '\nthis.g=ensembleGroupes;', p);
  const st = (e, classe, debut, fin, d0, f0) => ({ e, eleve: 'E' + e, classe, debut, fin, debutOfficiel: d0, finOfficiel: f0 });
  const stages = [st(1, 'A', '2026-11-23', '2027-01-08', '2026-11-23', '2026-12-18'), st(2, 'B', '2027-01-04', '2027-01-29', '2027-01-04', '2027-01-29'), st(3, 'C', '2026-12-07', '2026-12-18', '2026-11-23', '2026-12-18')];
  const gs = p.g({ liste: [{ nom: 'GARAGE X', stages, apps: [] }] }, true);
  assert.equal(gs.length, 2);
  assert.deepEqual(gs.map(x => x.l.map(y => y.classe).sort().join('+')).sort(), ['A+C', 'B']);
  assert.match(g, /const pd=function\(x\)\{return x\.debutOfficiel\|\|x\.debut\|\|''\},pf=function\(x\)\{return x\.finOfficiel\|\|x\.fin\|\|''\}/, 'classes en même temps : même règle');
});

console.log(n + ' tests DEV716 réussis.');
