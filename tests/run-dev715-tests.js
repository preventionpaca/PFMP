'use strict';
/* DEV715 — Statistiques : dates des dépôts en ligne (élèves accueillis ensemble) ; noms des apprentis et des stagiaires. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
function ctx(convs, jot) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, Set, Map };
  vm.createContext(k);
  ['apps-script/EUC_DEV688_ControleNoms.js', 'apps-script/EUC_DEV698_Statistiques.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
  Object.assign(k, {
    EUC_ADMIN_WORKFLOW_ctxV144_: () => ({}),
    EUC_IMPORT_lireRecords_: t => t === 'EUC_ELEVES_PFMP' ? [{ id: 1, Nom: 'UN', Prenom: 'A', Classe: 10 }, { id: 2, Nom: 'DEUX', Prenom: 'B', Classe: 10 }, { id: 3, Nom: 'TROIS', Prenom: 'C', Classe: 10 }]
      : t === 'EUC_MIGRATION_JOTFORM_PFMP' ? (jot || []) : [],
    EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v,
    EUC_DEV368_catalog: () => ({ classes: [{ classeId: 10, classe: '1MELEC', famille: 'BACPRO', periodes: [
      { id: 101, libelle: 'PFMP 1ère 2026-11-23 → 2026-12-18', debut: '23/11/2026', fin: '18/12/2026' }, { id: 102, libelle: 'PFMP 1ère 2027-03-01 → 2027-03-26', debut: '01/03/2027', fin: '26/03/2027' }] }] }),
    EUC_DEV371_levelOf_: () => 'PREMIERE', EUC_DEV371_levelLabel_: () => 'Première',
    EUC_CONVENTION_lireAccesFraisV108_: () => convs, EUC_ADMIN_WORKFLOW_estDossierVisibleV522_: a => !!a.Entreprise_raison_sociale,
    EUC_PFMP_anneeDossierV148_: a => a.Annee_scolaire, EUC_ADMIN_WORKFLOW_numeroV144_: a => 'N' + a.id,
    EUC_ADMIN_WORKFLOW_identiteEleveV521_: (a, by) => { const e = by[a.Eleve] || {}; return { id: a.Eleve, nom: e.Nom, prenom: e.Prenom, jeune: e.Prenom + ' ' + e.Nom }; },
    EUC_DEV577_modele_: () => ({ groupes: [], cartes: { 10: [{ statut: 'APPRENTI', fiche: { entreprise: '', siret: '' } }] } }), EUC_SUIVI2_temoin_: () => ''
  });
  return k;
}

const iso = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 1000;

test('dépôt en ligne : dates du dépôt (sinon de la période) ; regroupé avec une convention de la même entreprise', () => {
  const convs = [{ id: 1, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention: 10, Classe_convention_nom: '1MELEC', Entreprise_raison_sociale: 'Garage A', Entreprise_siret: '12345678200010', Periode: 101, Date_debut: iso('2026-11-23'), Date_fin: iso('2026-12-18') }];
  const jot = [{ id: 7, Submission_ID: 'SECOURS-PFMP-2026-S9007', Eleve_match_id: 2, Annee_scolaire: '2026-2027', Decision: 'A_VALIDER', SIRET_statut: 'VERIFIE', SIRET_normalise: '12345678200010', Raison_sociale_officielle: 'Garage A', Periode_numero: 1, Date_debut: '2026-11-23', Date_fin: '2026-12-18' },
    { id: 8, Submission_ID: 'SECOURS-PFMP-2026-S9008', Eleve_match_id: 3, Annee_scolaire: '2026-2027', Decision: 'A_VALIDER', SIRET_statut: 'VERIFIE', SIRET_normalise: '12345678200028', Raison_sociale_officielle: 'Garage B', Periode_numero: 1 }];
  const m = JSON.parse(JSON.stringify(ctx(convs, jot).EUC_DEV698_calcul_('2026-2027')));
  const d1 = m.conventions.find(x => x.src === 'S' && x.e === 2), d2 = m.conventions.find(x => x.src === 'S' && x.e === 3), c = m.conventions.find(x => x.src === 'C');
  assert.equal(d1.debut, '2026-11-23'); assert.equal(d1.fin, '2026-12-18');
  assert.equal(d2.debut, '2026-11-23', 'dépôt sans dates : début de la période'); assert.equal(d2.fin, '2026-12-18'); assert.equal(d2.finOfficiel, '2026-12-18');
  assert.equal(c.debut, '2026-11-23'); assert.equal(d1.k, c.k, 'même entreprise');
  /* Regroupement « accueillis ensemble » de la page sur ces lignes. */
  const h = read('apps-script/Statistiques_PFMP_DEV698.html'), b = h.slice(h.indexOf('  function ensembleGroupes('), h.indexOf('  function rendre(){'));
  const j = h.slice(h.indexOf('  const jj='), h.indexOf('\n', h.indexOf('  const jj=')));
  const p = vm.createContext({}); vm.runInContext(j + '\n' + b + '\nthis.g=ensembleGroupes;', p);
  const gs = p.g({ liste: [{ nom: 'Garage A', stages: [c, d1], apps: [] }] }, false);
  assert.equal(gs.length, 1); assert.equal(gs[0].l.length, 2);
});

test('détails : liste nominative des apprentis ; noms des stagiaires et des apprentis des entreprises mixtes', () => {
  const h = read('apps-script/Statistiques_PFMP_DEV698.html');
  assert.match(h, /<h3>Liste des apprentis<\/h3>'\+tableau\('dAppNoms',\['Apprenti','Classe','Employeur','Commune','Organisme','Début du contrat','Fin du contrat'\],E\.app\.map\(/);
  assert.match(h, /tableau\('dMix',\['Entreprise','Commune','Stagiaires','Classes en stage','Noms des stagiaires','Apprentis','Classes en apprentissage','Noms des apprentis'\]/);
  assert.match(h, /\.noms-mix td\{white-space:pre-line\}/);
  assert.match(read('apps-script/EUC_DEV698_Statistiques.js'), /eleve: T\(c\.eleve\)/, 'nom de l’apprenti fourni par le serveur');
});

console.log(n + ' tests DEV715 réussis.');
