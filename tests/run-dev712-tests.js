'use strict';
/* DEV712 — Suivi des enseignants (page utilisée) : sous le tableau et dans l'export PDF, élèves en stage dans une même entreprise et professeurs affectés. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const h = fs.readFileSync(path.join(__dirname, '..', 'apps-script/Suivi_Enseignants_DEV576.html'), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const bloc = h.slice(h.indexOf('  function memeEntreprise(c,p){'), h.indexOf('  function classe(s){'));
const esc = "function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[x];});}";
function ctx(fiches) { const k = { D: { fiches } }; vm.createContext(k); vm.runInContext(esc + '\n' + bloc + '\nthis.m=memeEntreprise;this.b=blocMemeEntreprise;', k); return k; }
const F = [
  { entreprise: 'Garage Azur SARL', adresse: '1 rue du Port, 06300 NICE' },
  { entreprise: 'GARAGE AZUR', adresse: '1 rue du Port 06300 Nice' },
  { entreprise: 'Garage Azur', adresse: '9 av. X 06400 CANNES' },
  { entreprise: 'CH CANNES', adresse: '06400 CANNES' },
  { entreprise: 'CH Cannes', adresse: '06400 Cannes' }
];
const C = { eleves: [[1, 'DUPONT Jean'], [2, 'MARTIN Paul'], [3, 'ALBERT Léa'], [4, 'BEN Ali'], [5, 'ZOE Eva'], [6, 'SANS Stage'], [7, 'ANNUL Ée']] };
const P = { lignes: { 1: ['AVEC', 0, 'Mme Y', 'M. X'], 2: ['AVEC', 1, 'Mme Y', 'M. X'], 3: ['AVEC', 2, 'Mme Y', ''], 4: ['AVEC', 3, 'Mme Y', 'M. X'], 5: ['AVEC', 4, '', 'M. W'], 6: ['SANS', -1, '', ''], 7: ['ANNULEE', 0, '', ''] } };

test('regroupement : même entreprise et même code postal ; élèves sans convention ou annulés exclus', () => {
  const g = JSON.parse(JSON.stringify(ctx(F).m(C, P)));
  assert.equal(g.length, 2);
  const az = g.find(x => /azur/i.test(x.entreprise)), ch = g.find(x => /ch/i.test(x.entreprise));
  assert.deepEqual(az.eleves, ['DUPONT Jean', 'MARTIN Paul']); assert.deepEqual(az.aVerifier, []);
  assert.deepEqual(ch.eleves, ['BEN Ali', 'ZOE Eva']); assert.deepEqual(ch.aVerifier, ['Téléphone : plusieurs professeurs', 'Visite : plusieurs professeurs']);
});

test('lieu du stage prioritaire sur l’adresse de l’entreprise', () => {
  const f = [{ entreprise: 'X', adresse: '06000 NICE', lieu: '06200 NICE' }, { entreprise: 'X', adresse: '06000 NICE' }];
  assert.equal(ctx(f).m({ eleves: [[1, 'A'], [2, 'B']] }, { lignes: { 1: ['AVEC', 0, '', ''], 2: ['AVEC', 1, '', ''] } }).length, 0);
});

test('encadré : liste, professeurs, alerte ; message sans entreprise partagée ; rien pour une classe d’apprentis ; noms échappés', () => {
  const k = ctx(F), html = k.b(C, P);
  assert.match(html, /Élèves en stage dans une même entreprise/);
  assert.match(html, /2 élèves :\nDUPONT Jean\nMARTIN Paul/);
  assert.match(html, /✓ un seul professeur/); assert.match(html, /<td>Non affecté \(1\)\nMme Y \(1\)<\/td><td>M\. W \(1\)\nM\. X \(1\)<\/td>/);
  assert.match(html, /1 à vérifier/);
  assert.match(k.b({ eleves: [[1, 'A']] }, { lignes: { 1: ['AVEC', 0, '', ''] } }), /Aucune entreprise n’accueille plusieurs élèves/);
  assert.equal(k.b(Object.assign({ ce: true }, C), P), '');
  assert.match(ctx([{ entreprise: '<b>E</b>' }, { entreprise: '<b>E</b>' }]).b({ eleves: [[1, '<i>A'], [2, 'B']] }, { lignes: { 1: ['AVEC', 0, '', ''], 2: ['AVEC', 1, '', ''] } }), /&lt;b&gt;E&lt;\/b&gt;[\s\S]*&lt;i&gt;A/);
});

test('page et PDF : encadré sous le tableau (imprimé aussi) ; second tableau dans l’export PDF ; aucune écriture', () => {
  assert.match(h, /'<\/tbody><\/table><\/div>'\+blocMemeEntreprise\(c,p\);/);
  assert.doesNotMatch(h.match(/\.meme-ent\{[^}]*\}/)[0], /display:none/); assert.match(h, /@media print\{\.meme-ent\{break-inside:avoid/);
  assert.match(h, /var mg=c\.ce\?\[\]:memeEntreprise\(c,p\);/);
  assert.match(h, /doc\.autoTable\(\{startY:y\+3,head:\[\['Entreprise','Élèves','Suivi téléphonique','Professeur visiteur','À vérifier'\]\]/);
  assert.ok(h.indexOf('var mg=c.ce') < h.indexOf("doc.save(((c.ce?'Suivi apprentis '"));
  assert.doesNotMatch(bloc, /google\.script\.run/);
});

console.log(n + ' tests DEV712 réussis.');
