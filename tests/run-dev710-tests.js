/* DEV710 — Statistiques : élèves accueillis ensemble, noms et professeurs (téléphone, visite) ; affectations lues côté serveur. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const h = read('apps-script/Statistiques_PFMP_DEV698.html');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const ligne = debut => { const i = h.indexOf(debut); assert.ok(i >= 0, debut); return h.slice(i, h.indexOf('\n', i)); };
const bloc = (debut, fin) => { const i = h.indexOf(debut), j = h.indexOf(fin, i); assert.ok(i >= 0 && j > i, debut); return h.slice(i, j); };
const k = vm.createContext({});
vm.runInContext([ligne('  const jj='), bloc('  function ensembleGroupes(', '  function rendre(){'),
  'this.ensembleGroupes=ensembleGroupes;this.ensembleLignes=ensembleLignes;this.aVerifier=aVerifier;this.E=ENTETES_ENSEMBLE;'].join('\n'), k);
const st = (e, eleve, classe, debut, fin, pt, pv) => ({ e, eleve, classe, periode: 'PFMP n°1', debut, fin, pt, pv });
const E = { liste: [
  { nom: 'GARAGE AZUR', commune: 'NICE', stages: [st(1, 'Jean DUPONT', '1MVA2', '2026-11-23', '2026-12-18', 'Mme Y', 'M. X'), st(2, 'Paul MARTIN', '1MVA2', '2026-11-23', '2026-12-18', 'Mme Y', 'M. W'), st(3, 'Léa ALBERT', 'TMVA1', '2027-03-01', '2027-03-26', '', '')], apps: [] },
  { nom: 'SEUL SARL', commune: 'CANNES', stages: [st(4, 'Ali BEN', '1MVA2', '2026-11-23', '2026-12-18', 'Mme Y', 'M. X')], apps: [] },
  { nom: 'APPRENTIS SEULS', commune: 'NICE', stages: [], apps: [{ classe: '2BTS MV' }] }
] };

test('plusieurs élèves en même temps : seuls les élèves dont les dates se chevauchent, noms et professeurs', () => {
  const gs = k.ensembleGroupes(E, false);
  assert.equal(gs.length, 1);
  const l = JSON.parse(JSON.stringify(k.ensembleLignes(gs)[0]));
  assert.deepEqual(l, ['GARAGE AZUR', 'NICE', '23/11/2026 → 18/12/2026', 2, 'Jean DUPONT (1MVA2)\nPaul MARTIN (1MVA2)', 'Mme Y', 'M. W (1)\nM. X (1)', 'Visite : plusieurs professeurs']);
});

test('toutes les entreprises : chaque accueil, y compris un élève seul ou à une autre période ; pas d’entreprise sans stagiaire', () => {
  const l = k.ensembleLignes(k.ensembleGroupes(E, true));
  assert.equal(l.length, 3);
  assert.deepEqual(l.map(x => x[0]), ['GARAGE AZUR', 'GARAGE AZUR', 'SEUL SARL']);
  assert.equal(l[1][5], 'Non affecté'); assert.equal(l[1][7], 'Téléphone non affecté\nVisite non affectée');
  assert.equal(l[2][7], '');
});

test('un élève avec deux conventions sur la même période n’est compté qu’une fois', () => {
  const gs = k.ensembleGroupes({ liste: [{ nom: 'X', stages: [st(1, 'A', 'C', '2026-11-23', '2026-12-18', 'P', 'Q'), st(1, 'A', 'C', '2026-11-30', '2026-12-18', 'P', 'Q')], apps: [] }] }, false);
  assert.equal(gs.length, 0);
});

test('page : sélecteur, export Excel, ascenseur vertical avec en-tête fixe, filtres appliqués', () => {
  assert.match(h, /<select id="ensembleMode"[^>]*><option value="plusieurs">[^<]+<\/option><option value="toutes">Toutes les entreprises d’accueil<\/option>/);
  assert.match(h, /#ensemble \.defile\{max-height:520px;overflow-y:auto/);
  assert.match(h, /#ensemble thead th\{position:sticky;top:0/);
  assert.match(h, /\$\('xEnsemble'\)\.onclick=function\(\)\{exporter\(\$\('xEnsemble'\)/);
  assert.match(h, /\$\('ensembleMode'\)\.onchange=rendre;/);
});

test('serveur : professeurs de la dernière affectation active par élève et période, en lecture seule', () => {
  const s = read('apps-script/EUC_DEV698_Statistiques.js');
  const c = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite };
  vm.createContext(c); vm.runInContext(s, c);
  c.EUC_PFMP_ref_ = v => Array.isArray(v) ? v[1] : v;
  c.EUC_IMPORT_lireRecords_ = t => t === 'EUC_AFFECTATIONS_SUIVI_PFMP' ? [
    { id: 1, Eleve: 10, Periode: 5, Type_suivi: 'VISITE', Annee_scolaire: '2026-2027', Actif: true, Nom_professeur_snapshot: 'Ancien' },
    { id: 2, Eleve: 10, Periode: 5, Type_suivi: 'VISITE', Annee_scolaire: '2026-2027', Actif: true, Nom_professeur_snapshot: 'Nouveau' },
    { id: 3, Eleve: 10, Periode: 5, Type_suivi: 'TELEPHONE', Annee_scolaire: '2026-2027', Actif: false, Nom_professeur_snapshot: 'Inactif' },
    { id: 4, Eleve: 10, Periode: 5, Type_suivi: 'SUIVI_TELEPHONIQUE', Annee_scolaire: '2025-2026', Actif: true, Nom_professeur_snapshot: 'Autre année' }
  ] : [];
  const a = JSON.parse(JSON.stringify(c.EUC_DEV698_affectations_('2026-2027')));
  assert.deepEqual(a, { '10|5|pv': 'Nouveau' });
  assert.ok(!/EUC_ENT_grist\(\s*'(POST|PATCH|PUT|DELETE)'/.test(s));
  assert.match(s, /EUC_DEV698_VERSION_ = '1\.0\.0-dev\.715'/, 'nouveau calcul : le cache des statistiques est renouvelé');
});

console.log(n + ' tests DEV710 réussis.');
