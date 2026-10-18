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
  assert.deepEqual(ids(r.avec), [1, 4, 5], 'SIRET valide, NIS après une interruption, PFMP autorisée (dernière étape du circuit)');
  assert.deepEqual(ids(r.sans), [2, 3], 'sans SIRET, annulée');
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
    R(801, { Eleve_match_id: 20, Decision: 'A_CONTROLER', Importer: true, SIRET_normalise: '12345678901234', Date_debut_brut: '2026-11-09', Date_fin_brut: '2026-11-27' }),
    R(802, { Eleve_match_id: 4, Decision: 'A_CONTROLER', SIRET_normalise: '1234', Date_debut: '2027-03-01', Date_fin: '2027-03-26' }),
    R(803, { Eleve_match_id: 3, Decision: 'VALIDEE', SIRET_normalise: '12345678901234', Date_debut: '2026-11-02', Date_fin: '2026-11-27' })
  ];
  const m = c.EUC_SUIVI2_calculer_(src, '2026-2027', AUJ);
  const t = m.classes.find(x => x.nom === 'TMVA1');
  const p1 = t.periodes.find(p => p.libelle === 'PFMP n°1').resume, p2 = t.periodes.find(p => p.libelle === 'PFMP n°2').resume;
  assert.equal(p1.sources[2], 'JOTFORM', 'saisie JotForm validée, même sans SIRET dans le dossier');
  assert.equal(m.classes.find(x => x.nom === '1MVA1').periodes[0].resume.sources[20], 'JOTFORM', 'ligne déjà importée');
  assert.equal(p1.sources[1], 'QR');
  assert.equal(p1.sans.includes(3), true, 'une convention annulée ne redevient pas active par JotForm');
  assert.equal(p2.motifs[4] && p2.motifs[4].jotformNonValide, true);
});

test('JotForm : SIRET vérifié vaut validation ; dates « Nov. 2, 2026 », JJ-MM-AAAA ou réponse brute ; ligne ignorée exclue', () => {
  const src = sources();
  src.jotform = [
    R(810, { Eleve_match_id: 2, Decision: 'A_CONTROLER', SIRET_statut: 'VERIFIE', SIRET_normalise: '93510938900012', Date_debut_brut: 'Nov. 2, 2026', Date_fin_brut: 'Nov. 27, 2026' }),
    R(811, { Eleve_match_id: 20, Decision: 'A_CONTROLER', SIRET_statut: 'VERIFIE', SIRET_normalise: '93510938900012', Raw_JSON: JSON.stringify({ q5: { text: 'Date de début', answer: { day: '9', month: '11', year: '2026' } }, q6: { text: 'Date de fin', answer: '2026-11-27' } }) }),
    R(812, { Eleve_match_id: 21, Decision: 'IGNOREE', SIRET_statut: 'VERIFIE', SIRET_normalise: '93510938900012', Date_debut_brut: '2026-11-02', Date_fin_brut: '2026-11-27' })
  ];
  src.eleves.push(R(21, { Nom: 'MU', Prenom: 'Max', Classe: 11, Annee_scolaire: 1 }));
  const m = c.EUC_SUIVI2_calculer_(src, '2026-2027', AUJ);
  const p1 = m.classes.find(x => x.nom === 'TMVA1').periodes.find(p => p.libelle === 'PFMP n°1').resume;
  assert.equal(p1.sources[2], 'JOTFORM', 'SIRET vérifié, dates au format JotForm');
  assert.equal(m.classes.find(x => x.nom === '1MVA1').periodes[0].resume.sources[20], 'JOTFORM', 'dates lues dans la réponse brute');
  const k = m.classes.find(x => x.nom === '1MVA1').periodes[0].resume;
  assert.equal(k.sans.includes(21), true, 'ligne ignorée');
  assert.equal(c.EUC_SUIVI2_date_('28.09.2026'), '2026-09-28');
  assert.equal(c.EUC_SUIVI2_date_('02-11-2026'), '2026-11-02');
  assert.equal(c.EUC_SUIVI2_date_('Sept. 28, 2026'), '2026-09-28');
  assert.equal(c.EUC_SUIVI2_date_('June 5, 2008'), '2008-06-05');
  assert.equal(c.EUC_SUIVI2_date_('28 juil. 2026'), '2026-07-28');
  assert.equal(c.EUC_SUIVI2_date_('Mai 4, 2027'), '2027-05-04');
});

test('R16 bis : apprenti selon les dates du contrat, période par période ; contrat en cours de période = mixte', () => {
  const src = sources();
  src.apprentissage = [
    R(950, { Eleve: 2, Annee_scolaire: '2026-2027', Date_debut: '2026-12-01', Date_fin: '2028-08-31' }),
    R(951, { Eleve: 3, Annee_scolaire: '2026-2027', Date_debut: '2026-11-16', Date_fin: '' })
  ];
  const m = c.EUC_SUIVI2_calculer_(src, '2026-2027', AUJ), t = m.classes.find(x => x.nom === 'TMVA1');
  const p1 = t.periodes[0].resume, p2 = t.periodes[1].resume, pd = t.periodes[2].resume;
  assert.equal(p1.apprentis.includes(2), false, 'contrat pas encore commencé pendant la PFMP n°1 : scolaire');
  assert.equal(p2.apprentis.includes(2), true, 'contrat commencé avant la PFMP n°2 : apprenti');
  assert.equal(pd.entreprise.includes(2), true, 'apprenti d’office en entreprise au P.dif');
  assert.equal(p1.apprentis.includes(3), false);
  assert.equal(p1.mixtes[3].debut, '2026-11-16', 'devient apprenti pendant la période : mixte, compté scolaire');
  assert.equal(p1.sans.includes(3) || p1.avec.includes(3), true);
  assert.equal(c.EUC_SUIVI2_apprentiPeriode_([{ id: 1, debut: '2026-09-01', fin: '2028-08-31', rupture: '2026-11-10' }], { debut: '2027-03-01', fin: '2027-03-26' }).code, 'SCOLAIRE', 'rupture avant la période');
});

test('dossier posé sur une autre ligne du calendrier : rattaché par les dates, valide préféré aux brouillons ; Monaco', () => {
  const src = sources();
  src.periodes.push(R(113, { Annee_scolaire: 1, Classes_concernees: null, Date_debut: '2026-11-02', Date_fin: '2026-11-27', Libelle: 'ancienne ligne' }));
  src.entreprises = [R(70, { Raison_sociale: 'SACOME', Commune: 'MONACO', Code_postal: '98000' })];
  src.dossiers = src.dossiers.concat([
    R(600, { Eleve: 2, Periode: 113, Statut_administratif: 'CONVENTION_ENREGISTREE', Entreprise_siret: '12345678901234' }),
    R(601, { Eleve: 2, Periode: 100, Statut_administratif: 'CONVENTION_GENEREE' }),
    R(602, { Eleve: 3, Periode: 100, Statut_administratif: 'CONVENTION_ENREGISTREE', Entreprise: 70 }),
    R(603, { Eleve: 5, Periode: 999, Statut_administratif: 'CONVENTION_ENREGISTREE', Entreprise_raison_sociale: 'X', Date_debut: '2027-07-01', Date_fin: '2027-07-20' }),
    R(604, { Eleve: 5, Periode: 999, Statut: 'CONVENTION_GENEREE', Date_debut: '2027-07-01', Date_fin: '2027-07-20' })
  ]);
  const m = c.EUC_SUIVI2_calculer_(src, '2026-2027', AUJ), p1 = m.classes.find(x => x.nom === 'TMVA1').periodes[0].resume;
  assert.equal(p1.avec.includes(2), true, 'dossier enregistré de l’ancienne ligne, malgré un brouillon plus récent');
  assert.equal(p1.avec.includes(3), true, 'entreprise de Monaco validée par sa fiche');
  assert.equal(m.gardeFou.dossiersRattaches.some(x => x.dossier === 600 && x.periodeId === 100), true);
  assert.equal(m.gardeFou.dossiersOrphelins.some(x => x.dossier === 603), true, 'aucune période ne chevauche : signalé');
  assert.equal(m.gardeFou.dossiersOrphelins.some(x => x.dossier === 604), false, 'QR généré sans saisie : pas signalé');
});

test('garde-fou : saisies JotForm sans élève reconnu ou sans période', () => {
  const src = sources();
  src.jotform = [
    R(820, { Eleve_match_id: null, Decision: 'A_CONTROLER', Raw_JSON: JSON.stringify({ q1: { text: 'Nom', answer: 'INCONNU' } }) }),
    R(821, { Eleve_match_id: 2, Decision: 'VALIDEE', SIRET_normalise: '12345678901234', Date_debut_brut: 'Aug. 1, 2027', Date_fin_brut: 'Aug. 20, 2027' }),
    R(822, { Eleve_match_id: null, Decision: 'IGNOREE' }),
    R(823, { Eleve_match_id: 2, Decision: 'A_CONTROLER', SIRET_statut: 'NIS_MONACO', NIS_normalise: '2026A00042', Date_debut_brut: 'Nov. 2, 2026', Date_fin_brut: 'Nov. 27, 2026' }),
    R(824, { Eleve_match_id: 4, Decision: 'VALIDEE', SIRET_normalise: '12345678901234', Date_debut_brut: 'Nov. 2, 1926', Date_fin_brut: 'Nov. 27, 1926', Periode_numero: '1' })
  ];
  const m = c.EUC_SUIVI2_calculer_(src, '2026-2027', AUJ);
  assert.deepEqual(m.gardeFou.jotformSansEleve.map(x => x.ligne), [820]);
  assert.equal(m.gardeFou.jotformSansEleve[0].nom.trim(), 'INCONNU');
  assert.deepEqual(m.gardeFou.jotformSansPeriode.map(x => x.ligne), [821]);
  const p1 = m.classes.find(x => x.nom === 'TMVA1').periodes[0].resume;
  assert.equal(p1.sources[2], 'JOTFORM', 'Monaco : NIS validé par le bureau');
  assert.equal(p1.avec.includes(4), true, 'année mal saisie : rattachée par le numéro de période');
});

test('PFMP autorisée par le bureau = convention ; JotForm contradictoire signalé, le dossier prime', () => {
  const src = sources();
  src.jotform = [R(830, { Eleve_match_id: 5, Decision: 'VALIDEE', SIRET_normalise: '99999999900011', Date_debut_brut: 'Nov. 2, 2026', Date_fin_brut: 'Nov. 27, 2026' })];
  const m = c.EUC_SUIVI2_calculer_(src, '2026-2027', AUJ), p1 = m.classes.find(x => x.nom === 'TMVA1').periodes[0].resume;
  assert.equal(p1.avec.includes(5), true, 'dossier PFMP_AUTORISEE avec SIRET');
  assert.equal(p1.sources[5], 'QR');
  assert.deepEqual(m.gardeFou.conflits.map(x => [x.ligne, x.siretDossier]), [[830, '12345678901234']]);
  const src2 = sources();
  src2.dossiers.push(R(610, { Eleve: 2, Periode: 100, Statut_administratif: 'INFORMATIONS_ENREGISTREES', Entreprise_raison_sociale: 'SACOME CONTI', Entreprise_commune: 'MONACO' }));
  const m2 = c.EUC_SUIVI2_calculer_(src2, '2026-2027', AUJ);
  assert.equal(m2.classes.find(x => x.nom === 'TMVA1').periodes[0].resume.avec.includes(2), true, 'Monaco sans NIS : compté');
  assert.deepEqual(m2.gardeFou.monacoSansNis.map(x => x.dossier), [610], 'et signalé');
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
test('DEV580 : classe entière d’apprentis — appel et visites du calendrier (rattachés par Formation + Niveau), apprentis en entreprise', () => {
  const k = { console, JSON, Math, Date, Object, Array, String, Number, Error };
  vm.createContext(k); vm.runInContext(moteur + '\n' + read('apps-script/EUC_DEV579_Profils.js'), k);
  k.PropertiesService = { getScriptProperties: () => ({ getProperty: () => '' }) };
  const src = { annees: [R(1, { Code: '2026-2027' })], classes: [R(20, { Nom: '1CAPP', Etab: 'CFA' }), R(21, { Nom: '1CAR' })], diplomes: [],
    periodes: [
      R(200, { Annee_scolaire: 1, Formation: 'CAP', Niveau: 'CP', Type: 'APPEL TEL', Date_debut: '2026-10-08', Date_fin: '2026-10-09' }),
      R(201, { Annee_scolaire: 1, Formation: 'CAP', Niveau: 'CP', Type: 'VISITE', Date_debut: '2026-12-16', Date_fin: '2026-12-18' }),
      R(202, { Annee_scolaire: 1, Formation: 'CAP', Niveau: 'CP', Type: 'Visite', Date_debut: '2027-05-12', Date_fin: '2027-05-21' }),
      R(203, { Annee_scolaire: 1, Formation: 'CAP', Niveau: 'CP', Type: 'EXAMENS', Date_debut: '2026-12-07', Date_fin: '2026-12-08' }),
      R(204, { Annee_scolaire: 1, Classes_concernees: ['L', 21], Type: 'VISITE', Date_debut: '2026-12-16', Date_fin: '2026-12-18' })],
    eleves: [R(1, { Annee_scolaire: 1, Classe: 20, Nom: 'A', Prenom: 'B' }), R(2, { Annee_scolaire: 1, Classe: 20, Nom: 'C', Prenom: 'D' }), R(3, { Annee_scolaire: 1, Classe: 20, Nom: 'E', Prenom: 'F' })],
    apprentissage: [R(9, { Eleve: 1, Annee_scolaire: 1, Date_contrat: '2026-09-01', Date_debut: '2026-09-01', Date_fin: '2028-06-30', Nom_entreprise: 'GARAGE' }),
      R(10, { Eleve: 2, Annee_scolaire: 1, Date_debut: '2026-10-02' }),
      R(11, { Eleve: 3, Annee_scolaire: 1, Date_contrat: '2026-09-01', Date_debut: '2026-09-01', Date_fin: '2028-06-30', Date_rupture_contrat: '2026-10-01', Nom_entreprise: 'X' })],
    dossiers: [], pdif: [], entreprises: [], types: [], jotform: [], affectations: [], professeurs: [], classesProfs: [] };
  const m = JSON.parse(JSON.stringify(k.EUC_SUIVI2_calculer_(src, '2026-2027', '2026-10-16')));
  const capp = m.classes.find(c => c.nom === '1CAPP'), car = m.classes.find(c => c.nom === '1CAR');
  assert.deepEqual(capp.periodes.map(p => p.libelle), ['Appel téléphonique', 'Visite n°1', 'Visite n°2'], 'examens ignorés, visites numérotées');
  assert.equal(capp.apprentisAffiches, true); assert.equal(capp.periodes[1].resume.apprentis.length, 3, 'tous les élèves de la classe entière sont apprentis');
  /* DEV581 : contrats, pas conventions — fiche Yparéo sans entreprise = sans contrat ; rupture = contrat rompu. */
  const r = capp.periodes[1].resume;
  assert.deepEqual([r.avec, r.sans, r.annulees, r.scolaires], [[1], [2, 3], [3], 3]);
  assert.deepEqual([r.statuts[1], r.statuts[2], r.statuts[3]], ['CONTRAT', 'SANS_CONTRAT', 'RUPTURE']);
  assert.equal(r.fiches[1].entreprise, 'GARAGE');
  assert.equal(capp.famille, 'CAP', '1CAPP est un CAP, pas un BAC PRO');
  k.EUC_SUIVI2_VERSION_ = 'x'; vm.runInContext(read('apps-script/EUC_SUIVI2_Enseignants.js'), k);
  const v = JSON.parse(JSON.stringify(k.EUC_SUIVI2_vueEnseignants_(m))), vc = v.classes.find(c => c.nom === '1CAPP');
  assert.deepEqual([vc.famille, vc.familleBase, vc.ce, vc.niveau], ['APPRENTIS', 'CAP', true, 'CFA RAN']);
  const vide = JSON.parse(JSON.stringify(k.EUC_SUIVI2_vueEnseignants_({ classes: [Object.assign({}, capp, { eleves: [] })] })));
  assert.equal(vide.classes.length, 1, 'classe entière sans apprenti (ex. TSEC terminé) : affichée à 0');
  const fc = JSON.parse(JSON.stringify(k.EUC_SUIVI2_vueEnseignants_({ classes: [Object.assign({}, capp, { nom: 'TPMMA', modeApprentissage: 'FORMATION_CONTINUE', gestionnaire: 'GRETA', periodes: [] })] }))).classes[0];
  assert.deepEqual([fc.famille, fc.fc, fc.niveau], ['APPRENTIS', true, 'Formation continue — GRETA']);
  const page = read('apps-script/Suivi_Enseignants_DEV576.html');
  for (const t of ['Avec contrat', 'Sans contrat', 'Contrats annulés / interrompus', "'Contrat':'Convention'", 'Classes entières : apprentis et formation continue', 'c.familleBase||c.famille']) assert.ok(page.includes(t), t);
  assert.equal(!car || !car.periodes.some(p => p.suivi), true, 'une visite ne s’ajoute jamais à une classe scolaire');
});
test('DEV583 : carte tirée du modèle du suivi — contrats et conventions, position par SIRET ou adresse, sans position listée', () => {
  const k = { console, JSON, Math, Date, Object, Array, String, Number, Error, isFinite,
    Utilities: { base64EncodeWebSafe: b => Buffer.from(b).toString('base64'), computeDigest: (a, v) => Array.from(require('crypto').createHash('sha256').update(String(v)).digest()), DigestAlgorithm: { SHA_256: 1 } } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js') + '\n' + read('apps-script/EUC_DEV583_CarteSuivi.js'), k);
  const fiche = (ent, adr, siret) => ({ entreprise: ent, adresse: adr, siret: siret || '', contact: { nom: 'R', tel: '01', mail: '' }, tuteur: { nom: 'T', tel: '', mail: '' } });
  const m = { annee: '2026-2027', classes: [
    { id: 20, nom: '1CAPP', famille: 'CAP', eleves: [{ id: 1, libelle: 'A B' }, { id: 2, libelle: 'C D' }, { id: 3, libelle: 'E F' }],
      periodes: [{ id: 200, libelle: 'Visite n°1', debut: '2026-12-16', resume: { statuts: { 1: 'CONTRAT', 2: 'CONTRAT', 3: 'SANS_CONTRAT' }, fiches: { 1: fiche('GARAGE', '1 rue A, 06000 NICE', '12345678901234'), 2: fiche('AUTRE', '2 rue B, 06100 NICE') }, suivis: { 1: { visite: 'M. X' } } } },
                 { id: 201, libelle: 'Visite n°2', debut: '2027-05-12', resume: { statuts: { 1: 'CONTRAT' }, fiches: { 1: fiche('GARAGE', '1 rue A, 06000 NICE', '12345678901234') } } }] },
    { id: 21, nom: 'TCAR', famille: 'BACPRO', eleves: [{ id: 4, libelle: 'G H' }], periodes: [{ id: 300, libelle: 'PFMP n°1', debut: '2026-11-16', resume: { statuts: { 4: 'AVEC' }, fiches: { 4: fiche('Garage', '1 rue A, 06000 Nice', '12345678901234') } } }] }] };
  const ent = k.EUC_DEV583_entreprises_(m, { famille: '' }, true);
  assert.equal(ent.length, 2, 'même SIRET = une seule entreprise, quelle que soit la casse');
  const garage = ent.find(x => x.siret === '12345678901234');
  assert.equal(Object.keys(garage.eleves).length, 2, 'un apprenti compte une fois sur toutes ses périodes, plus le scolaire');
  assert.equal(garage.historique.find(h => h.eleve === 'A B').professeurVisiteur, 'M. X');
  const ix = k.EUC_DEV583_indexGeo_([{ id: 1, fields: { SIRET: '12345678901234', Latitude: 43.7, Longitude: 7.26, Statut: 'GEOCODE_AUTOMATIQUE', Pays: 'FRANCE' } }, { id: 2, fields: { Entreprise: 'AUTRE', Adresse_source: '2 rue B, 06100 NICE', Latitude: 43.71, Longitude: 7.25, Statut: 'A_VALIDER_MANUELLEMENT' } }]);
  const r = JSON.parse(JSON.stringify(k.EUC_DEV583_points_(ent, ix, true)));
  assert.equal(r.points.length, 1); assert.equal(r.points[0].elevesAccueillis, 2); assert.equal(r.points[0].classe, '1CAPP / TCAR'); assert.equal(r.points[0].historyLoaded, true);
  assert.deepEqual(r.sansPosition.map(x => [x.entreprise, x.statut]), [['AUTRE', 'A_VALIDER_MANUELLEMENT']], 'un point à valider n’est jamais affiché');
  assert.equal(k.EUC_DEV583_entreprises_(m, { classeId: 21 }, false)[0].historique.length, 0, 'sans droit : aucun nom');
  assert.equal(k.EUC_DEV583_entreprises_(m, { famille: 'BACPRO' }, false).length, 1);
  assert.equal(k.EUC_DEV583_carte({ annee: 'ALL' }), null, 'toutes années : ancien chemin'); assert.equal(k.EUC_DEV583_carte({ annee: '2026-2027', mode: 'PARENTS' }), null);
  assert.match(read('apps-script/EUC_PFMP_DEV538_BookQuotas.js'), /if\(dev583\)return dev583;/);
  const book = read('apps-script/EUC_PFMP_DEV538_BookQuotas.js');
  assert.match(book, /if\(f\.Actif===false\)\{students\[id\]=\{inactif:true\};return;\}/, 'book : fiche élève désactivée ignorée');
  assert.match(book, /if\(raw\.Actif===false\|\|meta\.inactif\)return;/, 'book : contrat désactivé ou d’un doublon ignoré');
  assert.match(read('apps-script/EUC_DEV578_GeoApprentis.js'), /EUC_DEV579_classesCompletes_\(annee\)/, 'géocodage : entreprises des apprentis de toutes les classes');
  assert.match(read('apps-script/Cartographie_PFMP_DEV441.html'), /x\.source==='SUIVI2'/);
});
test('DEV585 : domaines d’activité — proposition de départ, index Grist, filtre du Book affiné par le diplôme', () => {
  const k = { String, Number, Array, Object, JSON, CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    EUC_DEV538_optionalRecords_: t => t === 'EUC_DOMAINES_PFMP' ? [{ id: 1, fields: { Nom: 'Automobile', Ordre: 1 } }, { id: 2, fields: { Nom: 'Numérique', Ordre: 4 } }, { id: 3, fields: { Nom: 'Fabrication mécanique', Ordre: 2 } }]
      : [{ id: 9, fields: { Diplome: 'BAC PRO Microtechniques', Domaines: ['L', 2, 3] } }, { id: 10, fields: { Diplome: 'BAC PRO Carrossier Peintre Automobile', Domaines: ['L', 1] } }],
    EUC_DEV538_fields_: r => r.fields };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV585_Domaines.js'), k);
  const p = d => JSON.parse(JSON.stringify(k.EUC_DEV585_proposition_(d)));
  assert.deepEqual(p('BAC PRO Microtechniques'), ['Numérique', 'Fabrication mécanique']);
  assert.deepEqual(p('BAC PRO TRPM option Réalisation et Suivi de Production'), ['Fabrication mécanique']);
  assert.deepEqual(p('BTS — CPRP'), ['Fabrication mécanique']); assert.deepEqual(p('BTS — CPI'), ['Conception industrielle']); assert.deepEqual(p('BAC PRO Modélisation et Prototypage 3D'), ['Conception industrielle']);
  assert.deepEqual(p('Titre professionnel — TPMMA'), ['Automobile']); assert.deepEqual(p('Titre professionnel — TPEEB'), ['Électricité']);
  assert.deepEqual(p("BAC PRO Métiers de l'Électricité et de ses Environnements Connectés"), ['Électrotechnique']); assert.deepEqual(p('CQPM — ASC'), ['Électrotechnique']);
  assert.deepEqual(p('BAC PRO Maintenance des Véhicules'), ['Automobile']); assert.deepEqual(p('Bachelor — IP'), [], 'non classé : laissé à l’administration');
  const idx = JSON.parse(JSON.stringify(k.EUC_DEV585_index_()));
  assert.deepEqual(idx.domaines, ['Automobile', 'Fabrication mécanique', 'Numérique']);
  assert.deepEqual(k.EUC_DEV585_domainesDe_('BAC PRO MICROTECHNIQUES', idx), ['Numérique', 'Fabrication mécanique']);
  const book = read('apps-script/EUC_PFMP_DEV538_BookQuotas.js'), page = read('apps-script/Book_Entreprises_DEV538.html');
  assert.match(book, /\(!dom\|\|EUC_DEV585_domainesDe_\(x\.diplome,idx\)\.indexOf\(dom\)>=0\)/); assert.match(book, /'famille','domaine','diplome'/);
  assert.match(page, /<select id="domain">/); assert.match(page, /domaine:\$\('domain'\)\.value/); assert.match(page, /EUC_DEV585_preparer/);
});
test('DEV592 : effectifs — LP / LGT pour les scolaires et la mixité, organismes pour les classes entières (co-gestion comptée une fois au total)', () => {
  const k = { String, Number, Array, Object, JSON };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV592_Effectifs.js'), k);
  const per = (statuts, fiches) => [{ id: 1, resume: { statuts, fiches } }];
  const m = { annee: '2026-2027', classes: [
    { id: 1, nom: 'TCAR', etab: 'LP', modeApprentissage: 'MIXITE', eleves: [{ id: 1, apprentissage: { code: 'APPRENTI' } }, { id: 2, apprentissage: { code: 'SCOLAIRE' } }, { id: 3 }],
      periodes: per({ 1: 'APPRENTI', 2: 'AVEC', 3: 'SANS' }, { 1: { entreprise: 'GARAGE', siret: '1' }, 2: { entreprise: 'GARAGE', siret: '1' } }) },
    { id: 2, nom: '1BTS MV', etab: 'LGT', modeApprentissage: 'MIXITE', eleves: [{ id: 4 }], periodes: [] },
    { id: 3, nom: '2BTS ELEC Alt', etab: 'CFA', modeApprentissage: 'CLASSE_ENTIERE', gestionnaire: 'CFA RAN', donneur: 'CFAI', eleves: [{ id: 5 }, { id: 6 }],
      periodes: per({ 5: 'CONTRAT', 6: 'SANS_CONTRAT' }, { 5: { entreprise: 'ENEDIS' } }) },
    { id: 4, nom: 'TPMMA', etab: 'GRETA', modeApprentissage: 'FORMATION_CONTINUE', gestionnaire: 'GRETA', donneur: 'GRETA', eleves: [{ id: 7 }], periodes: [] }] };
  const r = JSON.parse(JSON.stringify(k.EUC_DEV592_calcul_(m)));
  assert.deepEqual(r.groupes.map(g => g.nom), ['LP', 'LGT', 'CFA RAN', 'CFAI', 'GRETA']);
  const lp = r.groupes[0].classes[0];
  assert.deepEqual([lp.effectif, lp.scolaires, lp.apprentis, lp.entreprises], [3, 2, 1, 1], 'même SIRET = une entreprise');
  assert.deepEqual([r.groupes[2].totaux.apprentis, r.groupes[3].totaux.apprentis, r.groupes[2].totaux.entreprises], [2, 2, 1]);
  assert.deepEqual([r.total.classes, r.total.effectif, r.total.apprentis, r.total.stagiaires], [4, 7, 3, 1], 'classe co-gérée comptée une fois ; FC à part');
  const m2 = { classes: [{ id: 9, nom: '1BTS ELEC Alt', modeApprentissage: 'CLASSE_ENTIERE', gestionnaire: 'CFA RAN', eleves: [{ id: 1, apprentissage: { code: 'APPRENTI', entreprise: 'ENEDIS' } }, { id: 2, apprentissage: { code: 'APPRENTI', entreprise: 'Enedis' } }], periodes: [] }] };
  assert.equal(k.EUC_DEV592_calcul_(m2).groupes[0].classes[0].entreprises, 1, 'entreprise du contrat, sans période au calendrier');
  const admin = read('apps-script/Admin_PFMP.html');
  assert.match(admin, /id="effectifs"/); assert.match(admin, /\.EUC_DEV592_effectifs\(''\)/);
  assert.match(read('apps-script/EUC_SUIVI2_Moteur.js'), /etab: EUC_SUIVI2_etab_\(c\.Etab \|\| c\.Etablissement_Pronote\)/);
});
test('DEV594 : établissement abrégé (copier-coller Pronote) — LP, LGT, CFA, CFAI, CFA RAN, GRETA', () => {
  const k = { String, Number, Array, Object, JSON, Date, Math }; vm.createContext(k); vm.runInContext(moteur, k);
  const e = v => k.EUC_SUIVI2_etab_(v);
  assert.deepEqual([e('LP LYCEE DES METIERS LES EUCALYPTUS'), e('LGT LYCEE LES EUCALYPTUS'), e('LP'), e('LGT'), e('CFA'), e('CFAI'), e('CFA RAN'), e('GRETA')], ['LP', 'LGT', 'LP', 'LGT', 'CFA', 'CFAI', 'CFA RAN', 'GRETA']);
});
test('DEV595 : professeurs principaux datés par année — historique conservé, retiré en cours d’année exclu, ancien lien sans année toujours lu', () => {
  const k = { console, JSON, Math, Date, Object, Array, String, Number, Error }; vm.createContext(k); vm.runInContext(moteur, k);
  const src = an => ({ annees: [R(1, { Code: '2025-2026' }), R(2, { Code: '2026-2027' })], classes: [R(20, { Nom: 'TCAR' }), R(21, { Nom: '1CAR' })], diplomes: [], types: [], dossiers: [], pdif: [], entreprises: [], jotform: [], affectations: [], apprentissage: [],
    periodes: [R(300, { Annee_scolaire: an, Classes_concernees: ['L', 20, 21], Type: 'PFMP Tbac', Date_debut: an === 1 ? '2025-11-10' : '2026-11-10', Date_fin: an === 1 ? '2025-12-05' : '2026-12-04' })],
    eleves: [R(1, { Annee_scolaire: an, Classe: 20, Nom: 'A', Prenom: 'B' }), R(2, { Annee_scolaire: an, Classe: 21, Nom: 'C', Prenom: 'D' })],
    professeurs: [R(7, { Nom: 'ANCIEN', Prenom: 'Pp' }), R(8, { Nom: 'NOUVEAU', Prenom: 'Pp' }), R(9, { Nom: 'PARTI', Prenom: 'Pp' }), R(10, { Nom: 'LEGACY', Prenom: 'Pp' })],
    classesProfs: [R(1, { Classe: 20, Professeur: 7, Role: 'PROFESSEUR_PRINCIPAL', Annee_scolaire: '2025-2026', Actif: false }), R(2, { Classe: 20, Professeur: 8, Role: 'PROFESSEUR_PRINCIPAL', Annee_scolaire: '2026-2027', Actif: true }),
      R(3, { Classe: 20, Professeur: 9, Role: 'PROFESSEUR_PRINCIPAL', Annee_scolaire: '2026-2027', Actif: false, Retire_le: 1790000000 }), R(4, { Classe: 21, Professeur: 10, Role: 'PROFESSEUR_PRINCIPAL', Actif: true })] });
  const pp = (an, code, nom) => JSON.parse(JSON.stringify(k.EUC_SUIVI2_calculer_(src(an), code, code === '2025-2026' ? '2025-10-01' : '2026-10-01'))).classes.find(c => c.nom === nom).pp;
  assert.deepEqual(pp(1, '2025-2026', 'TCAR'), ['Pp ANCIEN'], 'année passée : le PP de cette année-là');
  assert.deepEqual(pp(2, '2026-2027', 'TCAR'), ['Pp NOUVEAU'], 'année en cours : sans l’ancien ni celui retiré en cours d’année');
  assert.deepEqual(pp(2, '2026-2027', '1CAR'), ['Pp LEGACY'], 'lien sans année (avant DEV595) : lu s’il est actif');
  const imp = read('apps-script/EUC_IMPORT_PFMP_ProfClasses.gs');
  assert.match(imp, /c\('Annee_scolaire','Année scolaire'\),c\('Retire_le','Retiré le','DateTime'\)/); assert.match(imp, /if\(an&&an<annee\)\{linkPatches\.push\(\{id:r\.id,fields:\{Actif:false/);
});
test('DEV596 : nettoyage de la table Classes — aperçu, colonne citée par une formule protégée, archive puis suppression', () => {
  const appels = [];
  const col = (id, type, formula) => ({ id, fields: { type: type || 'Text', formula: formula || '' } });
  const schema = {
    Classes: [col('Nom'), col('Etab'), col('Actif', 'Bool'), col('Classe_PFMP', 'Text', "import re\nreturn re.sub(r'[12]$', '', $Nom)"), col('PP_source'), col('Effectif', 'Int'), col('Libelle'), col('Perso')],
    Planning_Periodes: [col('Classe', 'Ref:Classes'), col('Niveau'), col('Libelle_classe', 'Text', '$Classe.Libelle')],
    Autre: [col('Effectif', 'Int', '$Effectif + 1')]
  };
  const k = { String, Number, Array, Object, JSON, Date, RegExp, encodeURIComponent,
    EUC_SUIVI2_exigerAdmin_: () => ({}), EUC_DEV441_col_: (id, label, type) => ({ id, fields: { label, type: type || 'Text' } }),
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) }, CacheService: { getScriptCache: () => ({ remove() {} }) },
    EUC_ENT_grist: (m, u, b) => { appels.push([m, u, b]); if (m === 'get' && u === '/tables') return { tables: Object.keys(schema).map(id => ({ id })) };
      const mc = u.match(/^\/tables\/([^/]+)\/columns$/); if (m === 'get' && mc) return { columns: schema[decodeURIComponent(mc[1])] };
      if (m === 'get' && u === '/tables/Classes/records') return { records: [{ id: 1, fields: { Nom: 'TCAR', PP_source: 'M. X', Effectif: 14, Libelle: 'TCAR' } }] }; return {}; } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV596_NettoyageClasses.js'), k);
  const ap = JSON.parse(JSON.stringify(k.EUC_DEV596_nettoyerClasses({})));
  assert.deepEqual(ap.aSupprimer, ['PP_source', 'Effectif'], 'Libelle protégée : citée par une formule d’une table qui pointe vers Classes');
  assert.deepEqual(ap.bloquees, [{ colonne: 'Libelle', formules: ['Planning_Periodes.Libelle_classe'] }]);
  assert.deepEqual(ap.inconnues, ['Perso'], 'colonne inconnue jamais touchée');
  assert.equal(appels.filter(a => a[0] !== 'get').length, 0, 'aperçu sans écriture');
  const r = JSON.parse(JSON.stringify(k.EUC_DEV596_nettoyerClasses({ confirmation: 'SUPPRIMER' })));
  assert.deepEqual(r.supprimees, ['PP_source', 'Effectif']); assert.equal(r.archivees, 2);
  const ecritures = appels.filter(a => a[0] !== 'get').map(a => a[0] + ' ' + a[1]);
  assert.deepEqual(ecritures, ['post /tables', 'post /tables/EUC_ARCHIVE_COLONNES_CLASSES/records', 'delete /tables/Classes/columns/PP_source', 'delete /tables/Classes/columns/Effectif'], 'archive avant suppression');
  assert.match(read('apps-script/Controle_Chiffres_DEV575.html'), /\.EUC_DEV596_nettoyerClasses\(\{confirmation:ok\?'SUPPRIMER':''\}\)/);
});
