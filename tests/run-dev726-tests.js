'use strict';
/* DEV726 — affectation des professeurs : tri par nom de famille puis prénom, recherche par premières lettres. Données fictives. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const PROFS = [
  { id: 1, fields: { Civilite: 'Mme', Prenom: 'Alice', Nom: 'ZOLA', Actif: true, Discipline: 'LETTRES' } },
  { id: 2, fields: { Civilite: 'M.', Prenom: 'Bruno', Nom: 'ÉLIE', Actif: true } },
  { id: 3, fields: { Civilite: 'Mme', Prenom: 'Zoé', Nom: 'BOUCHER', Actif: true } },
  { id: 4, fields: { Civilite: 'M.', Prenom: 'Adam', Nom: 'BOUCHER', Actif: true } },
  { id: 5, fields: { Civilite: 'M.', Prenom: 'Paul', Nom: 'ABOU', Actif: false } }
];

test('serveur : liste triée par nom de famille puis prénom (et non par civilité), inactifs exclus, champs nom/prénom fournis', () => {
  const store = {};
  const k = { JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, encodeURIComponent,
    CacheService: { getScriptCache: () => ({ get: key => store[key] || null, put: (key, v) => { store[key] = v; } }) },
    EUC_ENT_grist: () => ({ records: PROFS }) };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_PFMP_DEV448_AffectationsRapides.js'), k);
  const l = k.EUC_DEV448_professeurs_();
  assert.deepStrictEqual(l.map(p => p.id), [4, 3, 2, 1]);
  assert.strictEqual(l[0].nom, 'M. Adam BOUCHER', 'le libellé enregistré dans les affectations ne change pas');
  assert.strictEqual(l[0].nomFamille, 'BOUCHER'); assert.strictEqual(l[0].prenom, 'Adam');
  assert.ok(Object.keys(store).some(x => /PROFESSEURS_V2/.test(x)), 'nouvelle clé de cache (l’ancien ordre n’est pas resservi)');
});

const html = read('apps-script/Suivi_Enseignants_DEV576.html');
function aides() {
  const noms = ['normProf', 'cleProf', 'ordreProf', 'libelleProf', 'correspondProf'], src = noms.map(f => (html.match(new RegExp('function ' + f + '\\(.*')) || [])[0]).join('\n');
  const k = {}; vm.createContext(k); vm.runInContext(src, k); return k;
}
const P = [{ id: 1, nom: 'Mme Alice ZOLA', nomFamille: 'ZOLA', prenom: 'Alice', civilite: 'Mme', discipline: 'LETTRES' }, { id: 2, nom: 'M. Bruno ÉLIE', nomFamille: 'ÉLIE', prenom: 'Bruno', civilite: 'M.' },
  { id: 3, nom: 'Mme Zoé BOUCHER', nomFamille: 'BOUCHER', prenom: 'Zoé', civilite: 'Mme' }, { id: 4, nom: 'M. Adam BOUCHER', nomFamille: 'BOUCHER', prenom: 'Adam', civilite: 'M.' }];

test('page : ordre nom puis prénom, libellé « NOM Prénom (civilité) — discipline »', () => {
  const k = aides();
  assert.deepStrictEqual(P.slice().sort(k.ordreProf).map(p => p.id), [4, 3, 2, 1]);
  assert.strictEqual(k.libelleProf(P[0]), 'ZOLA Alice (Mme) — LETTRES');
  assert.strictEqual(k.libelleProf({ id: 9, nom: 'Mme Ancienne LISTE' }), 'Mme Ancienne LISTE', 'repli sans champs détaillés');
});

test('page : recherche par premières lettres du nom ou du prénom, sans accents ni majuscules', () => {
  const k = aides(), f = q => P.filter(x => k.correspondProf(x, k.normProf(q))).map(x => x.id);
  assert.deepStrictEqual(f('bou'), [3, 4]);
  assert.deepStrictEqual(f('eli'), [2]);
  assert.deepStrictEqual(f('Zo'), [1, 3]);
  assert.deepStrictEqual(f('bou ad'), [4]);
  assert.deepStrictEqual(f('uch'), [], 'début de mot seulement');
  assert.deepStrictEqual(f(''), [1, 2, 3, 4]);
});

test('page : champ de recherche, liste remplie par le tri, professeur obligatoire avant l’affectation', () => {
  assert.ok(/id="ppProfCherche"[^>]*placeholder="Tapez 3 lettres du nom…"/.test(html));
  assert.ok(/profsPP=\(d\.professeurs\|\|\[\]\)\.slice\(\)\.sort\(ordreProf\);remplirProfs\(\)/.test(html));
  assert.ok(/oninput=remplirProfs/.test(html));
  assert.ok(/Choisissez un professeur\./.test(html));
  assert.ok(/Aucun professeur ne correspond/.test(html));
});

console.log(n + ' tests DEV726 réussis');
