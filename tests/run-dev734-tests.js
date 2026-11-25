/* DEV734 — Organisme de formation inscrit à la place de l'employeur : non compté comme entreprise ; un apprenti sans employeur identifié = une entreprise non renseignée. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const J = x => JSON.parse(JSON.stringify(x));
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const k = { String, Number, Array, Object, JSON }; vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV592_Effectifs.js'), k);
test('organismes de formation reconnus (AFPI, CFAI, GRETA, CFA…), vraies entreprises non', () => {
  ['AFPI PROVENCE', 'Afpi Provence', 'CFAI Provence', 'GRETA CFA', 'CFA RAN', 'UIMM Alpes-Maritimes', 'Pôle Formation UIMM'].forEach(x => assert.equal(k.EUC_DEV592_organismeFormation_(x), true, x));
  ['SOCIETE ASCENSEURS EXEMPLE', 'ENEDIS', 'GARAGE CFAIX', 'Ateliers du Sud', ''].forEach(x => assert.equal(k.EUC_DEV592_organismeFormation_(x), false, x));
});
test('CQPM : 12 apprentis tous « AFPI PROVENCE » → 0 entreprise identifiée, 12 non renseignées ; liste explicite', () => {
  const ap = ent => ({ code: 'APPRENTI', entreprise: ent, siret: '11111111111111', tuteur: '', debut: '2026-03-16', fin: '2027-03-15' });
  const eleves = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, libelle: 'JEUNE ' + (i + 1), apprentissage: ap('AFPI PROVENCE') }));
  const m = { classes: [
    { id: 1, nom: 'CQPM ASC', modeApprentissage: 'CLASSE_ENTIERE', opco: 'CFAI', eleves, periodes: [] },
    { id: 2, nom: '2BTS ELEC Alt', modeApprentissage: 'CLASSE_ENTIERE', opco: 'CFAI', periodes: [], eleves: [{ id: 20, apprentissage: ap('ENEDIS') }, { id: 21, apprentissage: ap('') }, { id: 22, apprentissage: { code: 'FUTUR_APPRENTI' } }] },
    { id: 3, nom: 'TCAR', etab: 'LP', modeApprentissage: 'MIXITE', eleves: [{ id: 30, apprentissage: ap('') }], periodes: [{ id: 1, resume: { statuts: { 30: 'APPRENTI' }, fiches: { 30: { entreprise: 'AFPI PROVENCE' } } } }] }] };
  const r = J(k.EUC_DEV592_calcul_(m)), cfai = r.groupes.find(g => g.nom === 'CFAI'), cq = cfai.classes.find(c => c.nom === 'CQPM ASC'), bts = cfai.classes.find(c => c.nom === '2BTS ELEC Alt');
  assert.deepEqual([cq.entreprises, cq.entreprisesNonRenseignees, cq.apprentis], [0, 12, 12]);
  assert.deepEqual([bts.entreprises, bts.entreprisesNonRenseignees], [1, 1], 'sans nom = non renseignée ; futur apprenti non compté');
  assert.deepEqual([cfai.totaux.entreprises, cfai.totaux.entreprisesNonRenseignees], [1, 13]);
  assert.deepEqual([cq.liste[0].entreprise, cq.liste[0].organismeFormation], ['', 'AFPI PROVENCE']);
  const lp = r.groupes.find(g => g.nom === 'LP').classes[0]; assert.deepEqual([lp.entreprises, lp.entreprisesNonRenseignees], [0, 0], 'fiche de période : organisme ignoré ; mixité sans décompte « non renseignée »');
  const w = { String, Object, Array }; w.window = w; vm.createContext(w); const h = read('apps-script/Apprentis_Classes_DEV635_Rendu.html');
  vm.runInContext(h.slice(h.indexOf('<script>') + 8, h.lastIndexOf('</script>')), w);
  const html = w.EUC635.tableau(cq, w.EUC635.entreprises([cq])); assert.match(html, /Entreprise non renseignée \(Yparéo indique l’organisme de formation AFPI PROVENCE\)/);
  assert.equal(w.EUC635.entreprises([cq]).multiples.length, 0, 'pas de fausse entreprise commune');
});
test('accueil : bulle « non rens. » et tuile « + N non renseignée(s) »', () => {
  const a = (() => { const a = read('apps-script/Admin_PFMP.html'); assert.ok(a.includes("EUC_PFMP_inclure_('Effectifs_Rendu_DEV736')"), 'rendu partagé DEV736 inclus'); return a + read('apps-script/Effectifs_Rendu_DEV736.html'); })();
  assert.match(a, /'<small>non rens\.<\/small><\/span>'/); assert.match(a, /nr=t\.entreprisesNonRenseignees\|\|0/); assert.match(a, /\(nr\?' \+ '\+nr\+' non renseignée\(s\)':''\)/); assert.match(a, /\.b-nr\{/);
});
console.log(n + ' tests DEV734 réussis.');
