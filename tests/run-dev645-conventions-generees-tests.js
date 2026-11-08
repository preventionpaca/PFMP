'use strict';
/* DEV645 — Page « Conventions générées » : structure par niveau, classe et période, listes à la demande. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const c = { console, JSON, Math, Date, Object, Array, String, Number, Error };
vm.createContext(c);
vm.runInContext(['apps-script/EUC_SUIVI2_Moteur.js', 'apps-script/EUC_DEV643_Saisies.js', 'apps-script/EUC_DEV645_ConventionsGenerees.js'].map(read).join('\n'), c);
const page = read('apps-script/Conventions_Generees_DEV645.html');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const R = (id, fields) => ({ id, fields });
const J = x => JSON.parse(JSON.stringify(x));

function sources(dossiers) {
  return { annees: [R(1, { Code: '2026-2027' }), R(2, { Code: '2025-2026' })],
    classes: [R(10, { Nom: '2MVA1' }), R(11, { Nom: 'TMVA1' }), R(12, { Nom: '1BTS MV' }), R(13, { Nom: '1MVA2' })], diplomes: [],
    periodes: [R(100, { Annee_scolaire: 1, Classes_concernees: ['L', 10, 13], Date_debut: '2026-11-23', Date_fin: '2026-12-18', Libelle: 'PFMP 1' }),
      R(101, { Annee_scolaire: 1, Classes_concernees: ['L', 10], Date_debut: '2027-03-01', Date_fin: '2027-03-26', Libelle: 'PFMP 2' }),
      R(102, { Annee_scolaire: 1, Classes_concernees: ['L', 11, 12], Date_debut: '2027-01-04', Date_fin: '2027-02-05', Libelle: 'Stage' })],
    eleves: [R(1, { Nom: 'ALPHA', Prenom: 'Ana', Classe: 10, Annee_scolaire: 1 }), R(2, { Nom: 'BETA', Prenom: 'Bob', Classe: 10, Annee_scolaire: 1 }),
      R(3, { Nom: 'GAMMA', Prenom: 'Gus', Classe: 11, Annee_scolaire: 1 }), R(4, { Nom: 'DELTA', Prenom: 'Dan', Classe: 12, Annee_scolaire: 1 }), R(5, { Nom: 'EPSI', Prenom: 'Eva', Classe: 13, Annee_scolaire: 1 })],
    dossiers: dossiers, jotform: [], entreprises: [], apprentissage: [], pdif: [], types: [], affectations: [], professeurs: [], classesProfs: [] };
}
const D = (id, f) => R(id, Object.assign({ Annee_scolaire: '2026-2027', Statut: 'CONVENTION_GENEREE', Date_creation: '2026-10-01T08:00:00.000Z', Lot_generation: 'LOT-1' }, f));
const base = [
  D(500, { Eleve: 1, Periode: 100, Reference_convention: 'PFMP-2026-000001' }),
  D(501, { Eleve: 1, Periode: 101 }),
  D(502, { Eleve: 2, Periode: 100, Type_sequence: 'RATTRAPAGE', Date_debut: '2027-01-11', Date_fin: '2027-01-22' }),
  D(503, { Eleve: 3, Periode: 102, Statut_administratif: 'ANNULEE' }),
  D(504, { Eleve: 4, Periode: 102, Date_saisie_entreprise: '2026-10-05', Entreprise_raison_sociale: 'GARAGE TEST' }),
  D(505, { Eleve: 2, Periode: 100, Annee_scolaire: '2025-2026' }),
  D(506, { Eleve: 5, Periode: 100, Supprimee_admin: true })
];
const index = d => c.EUC_DEV645_index_(c.EUC_SUIVI2_calculer_(sources(d || base), '2026-2027', '2026-11-08'), sources(d || base));

test('la structure range les niveaux dans l’ordre Seconde, Première, Terminale, puis BTS', () => {
  const s = J(c.EUC_DEV645_structure_(index()));
  assert.deepEqual(s.niveaux.map(x => x.libelle), ['BAC PRO — Seconde', 'BAC PRO — Première', 'BAC PRO — Terminale', 'BTS — 1re année']);
  assert.equal(s.total, 5, 'les dossiers d’une autre année et les dossiers supprimés sont exclus');
});

test('la structure ne contient aucun nom d’élève, seulement des effectifs', () => {
  const s = JSON.stringify(c.EUC_DEV645_structure_(index()));
  ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'EPSI', 'GARAGE'].forEach(nom => assert.ok(s.indexOf(nom) < 0, nom));
});

test('comptes par période et élèves sans convention ; une convention annulée ne compte pas comme faite', () => {
  const s = J(c.EUC_DEV645_structure_(index()));
  const seconde = s.niveaux[0].classes[0];
  assert.equal(seconde.nom, '2MVA1'); assert.equal(seconde.total, 3);
  assert.deepEqual(seconde.periodes.map(p => [p.libelle, p.total, p.sans]), [['PFMP n°1', 2, 0], ['PFMP n°2', 1, 1]]);
  const term = s.niveaux[2].classes[0];
  assert.deepEqual(term.periodes.map(p => [p.total, p.sans]), [[1, 1]]);
  assert.equal(s.niveaux[1].classes[0].periodes[0].sans, 1, 'une convention supprimée laisse l’élève sans convention');
  assert.deepEqual(s.periodes, ['PFMP n°1', 'PFMP n°2', 'Stage n°1']);
});

test('lister une classe, une période, un niveau ou toute l’année', () => {
  const ix = index();
  assert.equal(c.EUC_DEV645_lister_(ix, {}).conventions, 5);
  assert.deepEqual(J(c.EUC_DEV645_lister_(ix, { classeId: 10 }).lignes.map(l => l.id)), [500, 502, 501]);
  assert.deepEqual(J(c.EUC_DEV645_lister_(ix, { classeId: 10, periode: 'PFMP n°2' }).lignes.map(l => l.id)), [501]);
  assert.deepEqual(J(c.EUC_DEV645_lister_(ix, { niveau: 'BTS|1re année' }).lignes.map(l => l.id)), [504]);
  assert.deepEqual(J(c.EUC_DEV645_lister_(ix, {}).lignes.map(l => l.classe)), ['2MVA1', '2MVA1', '2MVA1', 'TMVA1', '1BTS MV']);
});

test('une ligne donne numéro, statut, rattrapage, génération et saisie de l’entreprise', () => {
  const l = J(c.EUC_DEV645_lister_(index(), {}).lignes);
  const a = l.find(x => x.id === 500), r = l.find(x => x.id === 502), x = l.find(x => x.id === 503), b = l.find(x => x.id === 504);
  assert.equal(a.numero, 'PFMP-2026-000001'); assert.equal(a.statut, 'Générée'); assert.equal(a.generee, '2026-10-01'); assert.equal(a.lot, 'LOT-1'); assert.equal(a.niveauLibelle, 'BAC PRO — Seconde');
  assert.equal(r.rattrapage, true); assert.equal(r.debut, '2027-01-11'); assert.equal(r.periode, 'PFMP n°1');
  assert.equal(x.annulee, true); assert.equal(x.statut, 'Annulée');
  assert.equal(b.saisieEntreprise, '2026-10-05'); assert.equal(b.entreprise, 'GARAGE TEST');
});

test('les élèves sans convention générée apparaissent seulement sur demande', () => {
  const ix = index();
  assert.equal(c.EUC_DEV645_lister_(ix, { classeId: 10 }).sansConvention, 0);
  const r = J(c.EUC_DEV645_lister_(ix, { classeId: 10, sansConvention: true }));
  assert.equal(r.sansConvention, 1);
  assert.deepEqual(r.lignes.filter(l => l.sansConvention).map(l => [l.eleve, l.periode]), [['BETA Bob', 'PFMP n°2']]);
  const t = J(c.EUC_DEV645_lister_(ix, { niveau: 'BACPRO|Terminale', sansConvention: true }));
  assert.deepEqual(t.lignes.map(l => [l.id, !!l.sansConvention]), [[503, false], [0, true]]);
});

test('une convention sans lien de période est rattachée par ses dates, sinon « Hors période »', () => {
  const ix = index([D(600, { Eleve: 1, Periode: 999, Date_debut: '2027-03-02', Date_fin: '2027-03-20' }), D(601, { Eleve: 1, Date_debut: '2027-06-01', Date_fin: '2027-06-20' })]);
  const l = J(c.EUC_DEV645_lister_(ix, {}).lignes);
  assert.equal(l.find(x => x.id === 600).periode, 'PFMP n°2'); assert.equal(l.find(x => x.id === 601).periode, 'Hors période');
  assert.equal(J(c.EUC_DEV645_structure_(ix)).niveaux[0].classes[0].horsPeriode, 1);
});

test('les réimpressions comptent pour une seule convention : celle remplie par l’entreprise, sinon la plus récente', () => {
  const g = [D(700, { Eleve: 1, Periode: 100, Date_creation: '2026-09-08T08:00:00.000Z' }), D(701, { Eleve: 1, Periode: 100, Date_creation: '2026-09-14T08:00:00.000Z', Date_saisie_entreprise: '2026-10-01', Entreprise_raison_sociale: 'GARAGE' }),
    D(702, { Eleve: 1, Periode: 100, Date_creation: '2026-11-02T08:00:00.000Z' }), D(703, { Eleve: 2, Periode: 100, Date_creation: '2026-09-08T08:00:00.000Z' }), D(704, { Eleve: 2, Periode: 100, Date_creation: '2026-10-08T08:00:00.000Z' }),
    D(705, { Eleve: 2, Periode: 100, Type_sequence: 'RATTRAPAGE', Numero_sequence: 2 })];
  const ix = index(g), s = J(c.EUC_DEV645_structure_(ix)), cl = s.niveaux[0].classes[0];
  assert.equal(s.total, 3); assert.equal(s.generations, 6); assert.equal(cl.periodes[0].total, 3); assert.equal(cl.generations, 6);
  const l = J(c.EUC_DEV645_lister_(ix, { classeId: 10 }));
  assert.deepEqual(l.lignes.map(x => [x.id, x.generations]), [[701, 3], [704, 2], [705, 1]]);
  assert.equal(l.conventions, 3); assert.equal(l.anterieures, 0);
  const t = J(c.EUC_DEV645_lister_(ix, { classeId: 10, toutes: true }));
  assert.deepEqual(t.lignes.map(x => [x.id, x.anterieure]), [[701, false], [702, true], [700, true], [704, false], [703, true], [705, false]]);
  assert.equal(t.conventions, 3); assert.equal(t.anterieures, 3);
});

test('chaque convention donne l’historique de ses générations : date, auteur, classe entière ou élève seul', () => {
  const g = [D(700, { Eleve: 1, Periode: 100, Date_creation: '2026-09-08T08:00:00.000Z', Auteur: 'Sabine.Exemple@lycee.test' }),
    D(701, { Eleve: 1, Periode: 100, Date_creation: '2026-11-02T08:00:00.000Z', Lot_generation: '', Auteur: '' })];
  const l = J(c.EUC_DEV645_lister_(index(g), { classeId: 10 })).lignes;
  assert.equal(l.length, 1);
  assert.deepEqual(l[0].historique.map(h => [h.id, h.date, h.auteur, h.mode, h.retenue]),
    [[700, '2026-09-08', 'sabine.exemple', 'Classe entière', false], [701, '2026-11-02', '', 'Élève seul', true]]);
  assert.match(page, /auteur non enregistré/); assert.match(page, /<details><summary>/);
});

test('page : réservée à l’administration, appels en lecture seule, jamais un fichier entier d’un coup', () => {
  const srv = read('apps-script/EUC_DEV645_ConventionsGenerees.js');
  ['EUC_DEV645_afficher', 'EUC_DEV645_structure', 'EUC_DEV645_lister'].forEach(f => assert.match(srv, new RegExp('function ' + f + '\\([^)]*\\) \\{\\n  EUC_SUIVI2_exigerAdmin_\\(\\);')));
  assert.doesNotMatch(srv, /'(post|patch|put|delete)'/i, 'aucune écriture Grist');
  assert.match(page, /appel\('EUC_DEV645_structure'/); assert.match(page, /appel\('EUC_DEV645_lister'/);
  assert.match(page, /Afficher le niveau/); assert.match(page, /Toute la classe/); assert.match(page, /Tout afficher/);
});

test('boutons : désactivés et spinner pendant la lecture, rendus en succès, erreur et dépassement de délai', () => {
  assert.match(page, /b\.disabled=!!btn;b\.classList\.toggle\('busy',b===btn\)/);
  assert.match(page, /t\.textContent=b===btn\?'Chargement…':b\.dataset\.libelle/);
  assert.match(page, /DELAI=120000/);
  assert.match(page, /withSuccessHandler\(function\(r\)\{if\(fini\)return;fini=true;clearTimeout\(timer\);ok\(r\);\}\)\.withFailureHandler/);
  const appelsListe = page.match(/appel\('EUC_DEV645_lister'.*\n/)[0];
  assert.equal((appelsListe.match(/occupe\(null\)/g) || []).length, 2, 'succès et échec rendent la main');
  assert.match(page, /Aucune convention à afficher/); assert.match(page, /Aucune période de stage au planning/); assert.match(page, /Comment lire ce tableau/); assert.match(page, /Aucune classe pour cette année/);
});

test('branchement : route, lien d’administration et contrôle de release', () => {
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'conventions-generees-pfmp':\n      return EUC_DEV645_afficher\(e\);/);
  assert.match(read('apps-script/Admin_PFMP.html'), /\?page=conventions-generees-pfmp">Conventions générées/);
  assert.match(read('scripts/pfmp-release-config.json'), /"page": "conventions-generees-pfmp", "scope": "admin", "expected": "Conventions générées"/);
});

console.log(n + ' tests DEV645 conventions générées réussis');
