'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const moteur = read('apps-script/EUC_SUIVI2_Moteur.js'), controle = read('apps-script/EUC_SUIVI2_Controle.js'),
  page = read('apps-script/Controle_Chiffres_DEV575.html'), routes = read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), admin = read('apps-script/Admin_PFMP.html');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }

const c = { console, JSON, Math, Date, Object, Array, String, Number, Error };
vm.createContext(c); vm.runInContext(moteur + '\n' + controle, c);
const R = (id, fields) => ({ id, fields });
const AUJ = '2026-10-16';

/* Jeu de données : TMVA1 (Terminale BAC PRO, P.dif), 1MVA1 (Première), 2MVA (Seconde),
 * 1BTS MV, une période d'une autre année, une période sans classe. */
function sources() {
  return {
    annees: [R(1, { Code: '2026-2027' }), R(2, { Code: '2025-2026' })],
    classes: [R(10, { Nom: 'TMVA1' }), R(11, { Nom: '1MVA1' }), R(12, { Nom: '2MVA' }), R(13, { Nom: '1BTS MV', Formation: 'BTS Maintenance' }), R(14, { Nom: 'TPMMA' })],
    diplomes: [],
    periodes: [
      R(100, { Annee_scolaire: 1, Classes_concernees: ['L', 10, 11], Date_debut: '2026-11-02', Date_fin: '2026-11-27', Libelle: 'PFMP TMVA1' }),
      R(101, { Annee_scolaire: 1, Classes_concernees: ['L', 10], Date_debut: '2027-03-01', Date_fin: '2027-03-26', Libelle: 'PFMP 2' }),
      R(102, { Annee_scolaire: 1, Classes_concernees: ['L', 10, 11], Date_debut: '2027-05-03', Date_fin: '2027-05-21', Type: 'P.dif' }),
      R(103, { Annee_scolaire: 2, Classes_concernees: ['L', 10], Date_debut: '2025-11-03', Date_fin: '2025-11-28', Libelle: 'ancienne' }),
      R(104, { Annee_scolaire: 1, Classes_concernees: null, Date_debut: '2026-12-01', Date_fin: '2026-12-12', Libelle: 'PFMP orpheline' }),
      R(105, { Annee_scolaire: 1, Classes_concernees: ['L', 13], Date_debut: '2027-01-04', Date_fin: '2027-02-05', Libelle: 'Stage BTS' }),
      R(106, { Annee_scolaire: 1, Classes_concernees: ['L', 12], Date_debut: '2027-06-01', Date_fin: '2027-06-20', Actif: false })
    ],
    eleves: [
      R(1, { Nom: 'ALPHA', Prenom: 'Ana', Classe: 10, Annee_scolaire: 1 }),
      R(2, { Nom: 'BETA', Prenom: 'Bob', Classe: 10, Annee_scolaire: 1 }),
      R(3, { Nom: 'GAMMA', Prenom: 'Gil', Classe: 10, Annee_scolaire: 1 }),
      R(4, { Nom: 'DELTA', Prenom: 'Dan', Classe: 10, Annee_scolaire: 1 }),
      R(5, { Nom: 'EPSI', Prenom: 'Eva', Classe: 10, Annee_scolaire: 1 }),
      R(6, { Nom: 'ZETA', Prenom: 'Zoé', Classe: 10, Annee_scolaire: 1, Statut_scolarite: 'SORTI' }),
      R(7, { Nom: 'ETA', Prenom: 'Eli', Classe: 10, Annee_scolaire: 2 }),
      R(8, { Nom: 'THETA', Prenom: 'Téo', Classe: 10, Annee_scolaire: 1, Present_dernier_import: false }),
      R(9, { Nom: 'IOTA', Prenom: 'Ivo', Classe: 10, Annee_scolaire: 1 }),
      R(20, { Nom: 'KAPPA', Prenom: 'Kim', Classe: 11, Annee_scolaire: 1 }),
      R(30, { Nom: 'LAMBDA', Prenom: 'Léa', Classe: 12, Annee_scolaire: 1 })
    ],
    dossiers: [
      R(500, { Eleve: 1, Periode: 100, Statut_administratif: 'CONVENTION_FINALISEE', Entreprise_siret: '12345678901234' }),
      R(501, { Eleve: 2, Periode: 100, Statut_administratif: 'CONVENTION_ENREGISTREE', Entreprise_siret: '' }),
      R(502, { Eleve: 3, Periode: 100, Statut_administratif: 'ANNULEE', Entreprise_siret: '12345678901234' }),
      R(503, { Eleve: 4, Periode: 100, Statut_administratif: 'INTERROMPUE', Entreprise_siret: '12345678901234' }),
      R(504, { Eleve: 4, Periode: 100, Statut_administratif: 'CONVENTION_ENREGISTREE', Entreprise_nis: '9999A00001' }),
      R(505, { Eleve: 5, Periode: 100, Statut_administratif: 'PFMP_AUTORISEE', Entreprise_siret: '12345678901234' }),
      R(506, { Eleve: 9, Periode: 101, Statut_administratif: 'A_COMPLETER_ENTREPRISE', Entreprise_siret: '12345678901234' })
    ],
    apprentissage: [
      R(900, { Eleve: 9, Annee_scolaire: '2026-2027', Date_contrat_officielle: '2026-09-01', Date_debut: '2026-09-01', Date_fin: '2028-08-31' }),
      R(901, { Eleve: 5, Annee_scolaire: '2026-2027', Date_contrat_officielle: '2026-09-01', Date_debut: '2026-09-01', Date_fin: '2028-08-31', Date_rupture_contrat: '2026-10-01' }),
      R(902, { Eleve: 2, Annee_scolaire: '2026-2027', Dossier_transmis_CFA: true })
    ],
    pdif: [
      R(1, { Eleve: 1, Annee_scolaire: '2026-2027', Mode_fin_terminale: 'PARCOURS_DIFF_LYCEE' }),
      R(2, { Eleve: 1, Annee_scolaire: '2026-2027', Mode_fin_terminale: 'POURSUITE_PFMP2_ENTREPRISE' }),
      R(3, { Eleve: 3, Annee_scolaire: '2026-2027', Parcours_differencie: true }),
      R(4, { Eleve: 9, Annee_scolaire: '2026-2027', Mode_fin_terminale: 'PARCOURS_DIFF_LYCEE' })
    ]
  };
}
const M = c.EUC_SUIVI2_calculer_(sources(), '2026-2027', AUJ);
const classe = nom => M.classes.find(x => x.nom === nom);
const periode = (nom, lib) => classe(nom).periodes.find(p => p.libelle === lib);
const ids = a => [...a].sort((x, y) => x - y);

test('R1–R3 : périodes de l’année, actives, rattachées par Classes_concernees ; orphelines signalées', () => {
  assert.deepEqual(classe('TMVA1').periodes.map(p => p.id), [100, 101, 102]);
  assert.deepEqual([...M.periodesSansClasse], [104]);
  assert.equal(classe('2MVA').periodes.length, 0, 'période inactive ignorée');
});

test('R6 / R26 : numérotation par rang, « Stage » en BTS, P.dif seulement en Terminale BAC PRO', () => {
  assert.deepEqual(classe('TMVA1').periodes.map(p => p.libelle), ['PFMP n°1', 'PFMP n°2', 'P.dif.']);
  assert.deepEqual(classe('1MVA1').periodes.map(p => p.libelle), ['PFMP n°1']);
  assert.deepEqual(classe('1BTS MV').periodes.map(p => p.libelle), ['Stage n°1']);
});

test('R9 / R10 / R23 : familles, niveaux et affichage des apprentis', () => {
  const t = classe('TMVA1'), s = classe('2MVA'), b = classe('1BTS MV'), a = classe('TPMMA');
  assert.deepEqual([t.famille, t.niveau, t.apprentisAffiches], ['BACPRO', 'Terminale', true]);
  assert.deepEqual([s.famille, s.niveau, s.apprentisAffiches], ['BACPRO', 'Seconde', false]);
  assert.deepEqual([b.famille, b.niveau, b.apprentisAffiches], ['BTS', '1re année', true]);
  assert.equal(a, undefined, 'une classe sans période ni élève n’est pas listée');
});

test('R13 : effectif = élèves de l’année, actifs, présents, non sortis', () => {
  assert.deepEqual(classe('TMVA1').eleves.map(e => e.id).sort((a, b) => a - b), [1, 2, 3, 4, 5, 9]);
});

test('R16 / R17 : apprenti = contrat commencé, non échu, sans rupture ; dossier CFA = futur apprenti', () => {
  const e = id => classe('TMVA1').eleves.find(x => x.id === id).apprentissage.code;
  assert.equal(e(9), 'APPRENTI');
  assert.equal(e(5), 'SCOLAIRE', 'rupture passée');
  assert.equal(e(2), 'FUTUR_APPRENTI');
});

test('R18 / R19 : avec convention = enregistrée et entreprise validée (SIRET ou NIS)', () => {
  const r = periode('TMVA1', 'PFMP n°1').resume;
  assert.deepEqual(ids(r.avec), [1, 4], 'SIRET valide, et NIS après une interruption');
  assert.deepEqual(ids(r.sans), [2, 3, 5], 'sans SIRET, annulée, PFMP autorisée sans saisie');
  assert.deepEqual(ids(r.annulees), [3]);
  assert.deepEqual(ids(r.apprentis), [9]);
});

test('R20 / R21 : avec + sans + apprentis = effectif ; fraction sur les scolaires', () => {
  const r = periode('TMVA1', 'PFMP n°1').resume;
  assert.equal(r.avec.length + r.sans.length + r.apprentis.length, r.effectif);
  assert.equal(r.scolaires, r.effectif - r.apprentis.length);
  assert.equal(r.scolaires, 5);
});

test('R28 : P.dif = répartition selon le dernier choix ; un apprenti est d’office en entreprise', () => {
  const r = periode('TMVA1', 'P.dif.').resume;
  assert.deepEqual(ids(r.entreprise), [1, 9], 'le dernier choix l’emporte ; l’apprenti 9 est en entreprise malgré un choix « lycée »');
  assert.deepEqual(ids(r.apprentis), [9]);
  assert.deepEqual(ids(r.lycee), [3], 'Parcours_differencie coché vaut parcours au lycée');
  assert.deepEqual(ids(r.aDefinir), [2, 4, 5]);
  assert.equal([...r.lycee, ...r.aDefinir].includes(9), false);
});

test('entreprise validée par la fiche référencée ; saisie entreprise complète = enregistrée ; motifs', () => {
  const src = sources();
  src.entreprises = [R(700, { SIRET: '98765432109876' })];
  src.dossiers.push(R(510, { Eleve: 20, Periode: 100, Statut_administratif: 'CONVENTION_ENREGISTREE', Entreprise: 700 }));
  const complet = { Statut_administratif: 'A_COMPLETER_ENTREPRISE', Entreprise_siret: '12345678901234', Entreprise_raison_sociale: 'GARAGE', Entreprise_adresse: '1 rue', Entreprise_code_postal: '06000', Entreprise_commune: 'NICE',
    Responsable_nom: 'R', Responsable_prenom: 'R', Responsable_telephone: '0600000000', Responsable_courriel: 'r@x.fr', Tuteur_nom: 'T', Tuteur_prenom: 'T', Tuteur_telephone: '0600000000', Tuteur_courriel: 't@x.fr' };
  src.dossiers.push(R(511, Object.assign({ Eleve: 3, Periode: 101 }, complet)));
  src.dossiers.push(R(512, Object.assign({ Eleve: 2, Periode: 101 }, complet, { Tuteur_courriel: '' })));
  const m = c.EUC_SUIVI2_calculer_(src, '2026-2027', AUJ);
  const p1 = m.classes.find(x => x.nom === '1MVA1').periodes[0].resume;
  assert.deepEqual([...p1.avec], [20], 'SIRET porté par la fiche entreprise');
  const p2 = m.classes.find(x => x.nom === 'TMVA1').periodes.find(p => p.libelle === 'PFMP n°2').resume;
  assert.equal(p2.avec.includes(3), true, 'saisie entreprise complète');
  assert.equal(p2.sans.includes(2), true, 'saisie incomplète');
  assert.equal(p2.motifs[2].statut, 'A_COMPLETER_ENTREPRISE');
  assert.equal(p2.motifs[4].statut, 'AUCUN_DOSSIER');
  assert.deepEqual([...p2.motifs[4].autresPeriodes], [100]);
});

test('seuls les types de période en entreprise comptent (VFMP, examens… ignorés), référence ou texte', () => {
  const src = sources();
  src.types = [R(21, { Type: 'VFMP', Libelle: 'Validation PFMP' }), R(3, { Type: 'PFMP Tbac' }), R(13, { Type: 'MINI_STAGE' })];
  src.periodes.push(R(120, { Annee_scolaire: 1, Classes_concernees: ['L', 10], Date_debut: '2026-09-23', Date_fin: '2026-09-25', Type: 21 }));
  src.periodes.push(R(121, { Annee_scolaire: 1, Classes_concernees: ['L', 10], Date_debut: '2026-10-01', Date_fin: '2026-10-02', Type: 'MINI_STAGE' }));
  src.periodes[0].fields.Type = 3;
  const m = c.EUC_SUIVI2_calculer_(src, '2026-2027', AUJ);
  const t = m.classes.find(x => x.nom === 'TMVA1');
  assert.deepEqual(t.periodes.map(p => p.id), [100, 101, 102]);
  assert.deepEqual(t.periodes.map(p => p.libelle), ['PFMP n°1', 'PFMP n°2', 'P.dif.']);
  assert.equal(t.periodes[0].type, 'PFMP Tbac');
  assert.equal(c.EUC_SUIVI2_typeFormation_('BTS_STAGE'), true);
  assert.equal(c.EUC_SUIVI2_typeFormation_('P.dif.'), true);
  assert.equal(c.EUC_SUIVI2_typeFormation_('EXAMENS'), false);
});

test('transition JotForm : une saisie validée ou importée compte, une saisie non validée est signalée', () => {
  const src = sources();
  src.jotform = [
    R(800, { Eleve_match_id: 2, Decision: 'VALIDEE', SIRET_normalise: '12345678901234', Date_debut: '2026-11-02', Date_fin: '2026-11-27' }),
    R(801, { Eleve_match_id: 5, Decision: 'A_CONTROLER', Importer: true, SIRET_normalise: '12345678901234', Date_debut_brut: '2026-11-09', Date_fin_brut: '2026-11-27' }),
    R(802, { Eleve_match_id: 4, Decision: 'A_CONTROLER', SIRET_normalise: '1234', Date_debut: '2027-03-01', Date_fin: '2027-03-26' }),
    R(803, { Eleve_match_id: 3, Decision: 'VALIDEE', SIRET_normalise: '12345678901234', Date_debut: '2026-11-02', Date_fin: '2026-11-27' })
  ];
  const m = c.EUC_SUIVI2_calculer_(src, '2026-2027', AUJ);
  const t = m.classes.find(x => x.nom === 'TMVA1');
  const p1 = t.periodes.find(p => p.libelle === 'PFMP n°1').resume, p2 = t.periodes.find(p => p.libelle === 'PFMP n°2').resume;
  assert.equal(p1.sources[2], 'JOTFORM', 'saisie JotForm validée, même sans SIRET dans le dossier');
  assert.equal(p1.sources[5], 'JOTFORM', 'ligne déjà importée');
  assert.equal(p1.sources[1], 'QR');
  assert.equal(p1.sans.includes(3), true, 'une convention annulée ne redevient pas active par JotForm');
  assert.equal(p2.motifs[4] && p2.motifs[4].jotformNonValide, true);
});

test('le contrôle compare élève par élève avec les cartes actuelles', () => {
  const noms = { 1: 'ALPHA Ana', 2: 'BETA Bob' };
  assert.deepEqual([...c.EUC_SUIVI2_diff_(['A', 'B'], ['B', 'C'])], ['A']);
  assert.deepEqual([...c.EUC_SUIVI2_noms_(['Alpha Ana — situation', 'Béta Bob'])], ['ALPHA ANA', 'BETA BOB']);
  assert.equal(c.EUC_SUIVI2_n_(['x', 'y']), 2); assert.equal(c.EUC_SUIVI2_n_(3), 3);
  assert.ok(noms);
});

test('le modèle se met en cache par témoin de modification et par jour', () => {
  assert.match(moteur, /'\/states'/);
  assert.match(moteur, /var cle = 'EUC_SUIVI2_' \+ annee\.replace\(\/\\D\/g, ''\) \+ '_' \+ temoin/);
  assert.match(moteur, /UrlFetchApp\.fetchAll/);
});

test('l’écran de contrôle est réservé à l’administration et branché dans l’accueil', () => {
  assert.match(controle, /function EUC_SUIVI2_controle\(annee\) \{\s*EUC_SUIVI2_exigerAdmin_\(\);/);
  assert.match(routes, /case 'controle-chiffres-pfmp':\s*return EUC_SUIVI2_afficherControle\(e\);/);
  assert.match(admin, /page=controle-chiffres-pfmp/);
  for (const t of ['EUC_SUIVI2_controle', 'aria-busy', 'setTimeout', 'Seulement les écarts']) assert.ok(page.includes(t), t);
});

console.log(`\n${n} tests DEV575 moteur du suivi réussis.`);
