'use strict';
/* DEV729 — tableau de suivi : colonnes choisies pour le PDF et l'export Excel (même données), envoi courriel inchangé. Données fictives. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const h = read('apps-script/Suivi_Enseignants_DEV576.html');
const bout = (debut, fin) => { const a = h.indexOf(debut); assert.ok(a >= 0, debut); const b = h.indexOf(fin, a); return h.slice(a, b + fin.length); };
function contexte(stock) {
  const store = Object.assign({}, stock || {}), tables = [];
  const src = bout('  var COLONNES=', "        return doc;\n  }") + '\n' + bout('  function feuilleSuivi(', "l*0.9)};})};}") + '\n' + bout('  function occuperExport(', 'btn.innerHTML=lib;};}');
  const k = { JSON, Array, Number, String, Math, Object,
    localStorage: { getItem: x => store[x] == null ? null : store[x], setItem: (x, v) => { store[x] = String(v); } }, __store: store, __tables: tables,
    D: { annee: '2026-2027', fiches: [{ entreprise: 'GARAGE TEST', adresse: '1 RUE A 06000 NICE', contact: { nom: 'M. Contact', tel: '0400000000' }, tuteur: { nom: 'Mme Tutrice' } }], temoin: 1 },
    LIB: { AVEC: 'Convention enregistrée', SANS: 'Sans convention' }, dfr: x => x, maintenant: () => '25/11/2026 à 10:00', texteCoord: o => o ? [o.nom, o.tel, o.mail].filter(Boolean).join('\n') : '',
    compteurs: () => [['Effectif', 2]], memeEntreprise: () => [],
    window: { jspdf: { jsPDF: function() { this.setFontSize = this.setTextColor = this.text = () => {}; this.internal = { pageSize: { getHeight: () => 210 }, getCurrentPageInfo: () => ({ pageNumber: 1 }) }; this.autoTable = o => tables.push(o); } } } };
  vm.createContext(k); vm.runInContext(src, k); return k;
}
const C = { nom: '1TEST', pp: ['M. PP'], eleves: [[1, 'ALPHA Anna'], [2, 'BETA Bob']], ce: false };
const P = { libelle: 'PFMP n°1', debut: '2026-11-23', fin: '2026-12-18', lignes: { 1: ['AVEC', 0, 'Mme TEL', 'M. VISITE', 0] } };

test('PDF : toutes les colonnes par défaut (largeurs d’origine, envoi courriel inchangé)', () => {
  const k = contexte(); k.construirePdf(C, P);
  const t = J(k.__tables[0]); t.didParseCell = k.__tables[0].didParseCell;
  assert.deepStrictEqual(t.head[0], ['Élève', 'Convention / statut', 'Entreprise', 'Adresse entreprise', 'Coordonnées entreprise', 'Coordonnées tuteur', 'Professeur principal', 'Suivi téléphonique', 'Professeur visiteur']);
  assert.deepStrictEqual(Object.keys(t.columnStyles).map(i => t.columnStyles[i].cellWidth), [30, 34, 32, 36, 38, 38, 24, 24, 25]);
  assert.strictEqual(t.body[0][2], 'GARAGE TEST'); assert.strictEqual(t.body[0][8], 'M. VISITE');
  assert.ok(/pdfEnvoi\(c,p,ok,ko\)\{chargerPdf\(function\(\)\{var x;try\{x=construirePdf\(c,p\)\.output/.test(h), 'la pièce jointe du courriel garde toutes les colonnes');
});

test('PDF : colonnes choisies seulement, dans l’ordre du tableau, page remplie, mise en forme suivant la colonne d’origine', () => {
  const k = contexte(); k.construirePdf(C, P, [8, 0, 2, 2, 42]);
  const t = J(k.__tables[0]); t.didParseCell = k.__tables[0].didParseCell;
  assert.deepStrictEqual(t.head[0], ['Élève', 'Entreprise', 'Professeur visiteur']);
  assert.deepStrictEqual(t.body[0], ['ALPHA Anna', 'GARAGE TEST', 'M. VISITE']);
  const w = Object.keys(t.columnStyles).map(i => t.columnStyles[i].cellWidth); assert.ok(Math.abs(w.reduce((a, b) => a + b) - 281) < 0.5);
  assert.strictEqual(t.columnStyles[0].fontStyle, 'bold');
  const cell = { styles: {} }; t.didParseCell({ section: 'body', row: { index: 0 }, column: { index: 1 }, cell }); assert.strictEqual(cell.styles.textColor, undefined, 'la couleur du statut ne s’applique plus à une autre colonne');
});

test('choix mémorisé dans le navigateur (identifiants de colonnes), illisible ou vide → toutes les colonnes', () => {
  const k = contexte({ eucColonnesSuivi: JSON.stringify(['visite', 'eleve', 'inconnue']) });
  assert.deepStrictEqual(Array.from(k.colonnesChoisies()), [0, 8]);
  k.memoriserColonnes([0, 2]); assert.strictEqual(k.__store.eucColonnesSuivi, '["eleve","entreprise"]');
  assert.strictEqual(contexte({ eucColonnesSuivi: '{casse' }).colonnesChoisies().length, 9);
  assert.strictEqual(contexte({ eucColonnesSuivi: '[]' }).colonnesChoisies().length, 9);
});

test('Excel : mêmes valeurs que le PDF, en-tête de la classe, colonnes choisies, largeurs', () => {
  const k = contexte(), f = J(k.feuilleSuivi(C, P, [0, 7]));
  assert.deepStrictEqual(f.lignes[0], ['1TEST — PFMP n°1']); assert.ok(/Professeur principal : M\. PP/.test(f.lignes[1][0]));
  assert.deepStrictEqual(f.lignes[4], ['Élève', 'Suivi téléphonique']);
  assert.deepStrictEqual(f.lignes[5], ['ALPHA Anna', 'Mme TEL']); assert.deepStrictEqual(f.lignes[6], ['BETA Bob', '']);
  assert.strictEqual(f.largeurs.length, 2);
});

test('boutons : spinner et double clic bloqué pendant la préparation, état rendu ; boutons présents (classe et accès PP), aucun appel serveur', () => {
  const k = contexte(), b = { innerHTML: 'Exporter Excel', disabled: false }, fin = k.occuperExport(b, 'Préparation…');
  assert.ok(b.disabled && /class="spin"/.test(b.innerHTML)); fin(); assert.ok(!b.disabled && b.innerHTML === 'Exporter Excel');
  ['id="excel">Exporter Excel', 'id="colonnes" aria-expanded="false"', 'id="ppExcel">Exporter Excel', 'id="ppColonnes"', 'id="colonnesChoix"', 'id="ppColonnesChoix"'].forEach(x => assert.ok(h.includes(x), x));
  const ex = bout('  function exporterExcel(', "alert('Le module Excel n’a pas pu être chargé.');});\n  }");
  assert.ok(!/google\.script\.run/.test(ex) && /30000/.test(ex) && /if\(btn\.disabled\)return;/.test(ex));
  assert.ok(/xlsx@0\.18\.5/.test(h)); assert.ok(/if\(!l\.length\)\{x\.checked=true;return;\}/.test(h), 'au moins une colonne');
});

console.log(n + ' tests DEV729 réussis');
