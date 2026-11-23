'use strict';
/* DEV718 — Statistiques par public (filles, pensionnaires…) : profil des élèves (sexe, régime, collège, département), import Pronote du sexe et du régime. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
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

test('profil : sexe, régime et département lus dans la fiche élève (valeurs Pronote variées)', () => {
  const k = ctx([]);
  ['F', 'Féminin', 'Mme', '2'].forEach(v => assert.equal(k.EUC_DEV698_sexe_({ Sexe: v }), 'F', v));
  ['M', 'Masculin', 'M.', '1'].forEach(v => assert.equal(k.EUC_DEV698_sexe_({ Sexe: v }), 'M', v));
  assert.equal(k.EUC_DEV698_sexe_({}), '');
  assert.equal(k.EUC_DEV698_regime_({ Regime: 'INTERNE' }), 'INTERNE'); assert.equal(k.EUC_DEV698_regime_({ Regime: 'Pensionnaire' }), 'INTERNE');
  assert.equal(k.EUC_DEV698_regime_({ Regime: 'DEMI-PENSIONNAIRE' }), 'DEMI_PENSIONNAIRE'); assert.equal(k.EUC_DEV698_regime_({ Regime: 'Externe libre' }), 'EXTERNE'); assert.equal(k.EUC_DEV698_regime_({}), '');
  assert.equal(k.EUC_DEV698_departement_({ Code_postal: '06200' }), '06'); assert.equal(k.EUC_DEV698_departement_({ Code_postal: '98000' }), 'Monaco'); assert.equal(k.EUC_DEV698_departement_({ Code_postal: '83000' }), '83');
});

test('modèle de l’année : élèves inscrits avec leur profil ; apprentis rattachés à l’élève', () => {
  const k = ctx([]);
  k.EUC_IMPORT_lireRecords_ = t => t === 'EUC_ELEVES_PFMP' ? [{ id: 1, Nom: 'UN', Prenom: 'A', Classe: 10, Sexe: 'F', Regime: 'Interne', Dernier_etablissement: 'COLLEGE X', Code_postal: '04100' },
    { id: 2, Nom: 'DEUX', Prenom: 'B', Classe: 10, Statut_scolarite: 'SORTI' }, { id: 3, Nom: 'TROIS', Prenom: 'C', Classe: 99 }] : [];
  const m = J(k.EUC_DEV698_calcul_('2026-2027'));
  assert.equal(m.eleves.length, 1);
  assert.deepEqual([m.eleves[0].e, m.eleves[0].sexe, m.eleves[0].regime, m.eleves[0].college, m.eleves[0].departement, m.eleves[0].classe], [1, 'F', 'INTERNE', 'COLLEGE X', '04', '1MELEC']); assert.equal(m.eleves[0].debutPfmp, '2026-11-23', 'première période de la classe');
  assert.match(read('apps-script/EUC_DEV577_Apprentis.js'), /push\(\{ id: e\.id, eleve: e\.nom, statut:/);
  assert.match(read('apps-script/EUC_DEV698_Statistiques.js'), /e: Number\(c\.id\) \|\| 0, eleve: T\(c\.eleve\)/);
});

test('import Pronote complet : colonnes SEXE et RÉGIME lues et enregistrées (colonnes Sexe et Regime créées)', () => {
  const g = read('apps-script/EUC_IMPORT_PFMP_RichData.gs');
  assert.match(g, /sexe:EUC_IMPORT_idxRich_\(headers,\['SEXE','GENRE'\]\),regime:EUC_IMPORT_idxRich_\(headers,\['REGIME','REGIME SCOLAIRE','REGIME ELEVE','REG'\]\)/);
  assert.match(g, /r\.sexe=EUC_IMPORT_vRich_\(c,ix\.sexe\);r\.regime=EUC_IMPORT_vRich_\(c,ix\.regime\);/);
  assert.match(g, /c\('Sexe','Sexe'\),c\('Regime','Régime'\)\]/);
  const k = {}; vm.createContext(k); vm.runInContext(g.slice(g.indexOf('function EUC_IMPORT_champsEleveRich_'), g.indexOf('\n', g.indexOf('function EUC_IMPORT_champsEleveRich_'))), k);
  const c = k.EUC_IMPORT_champsEleveRich_({ sexe: 'F', regime: 'INTERNE' });
  assert.equal(c.Sexe, 'F'); assert.equal(c.Regime, 'INTERNE');
});

test('page : indicateurs par public (apprentis, sans convention, retard, prolongation, rattrapage, distance, près du domicile ou à Nice)', () => {
  const h = read('apps-script/Statistiques_PFMP_DEV698.html'), b = h.slice(h.indexOf('  const PUBLICS='), h.indexOf('  function publics(E,m){'));
  const c = vm.createContext({ fFamille: { value: '' }, fDiplome: { value: '' }, fClasse: { value: '' }, Set, Math, Object, String, Number });
  vm.runInContext("const mediane=function(v){if(!v.length)return 0;const s=v.slice().sort(function(a,b){return a-b}),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};\n" + b + '\nthis.ind=indicateursPublic;this.P=PUBLICS;', c);
  const el = [{ e: 1, sexe: 'F', regime: 'INTERNE', debutPfmp: '2026-11-23' }, { e: 2, sexe: 'F', regime: 'EXTERNE', debutPfmp: '2026-11-23' }, { e: 3, sexe: 'F', regime: 'INTERNE', debutPfmp: '2026-11-23' }, { e: 4, sexe: 'F', regime: 'EXTERNE', debutPfmp: '2099-01-04' }];
  const E = { app: [{ e: 3 }], conv: [
    { id: 'c1', e: 1, statut: 'EN_COURS', decalage: 7, prolongation: 0, sequence: 'INITIALE', commune: 'NICE', cp: '06200' },
    { id: 'c2', e: 1, statut: 'EN_COURS', decalage: 0, prolongation: 0, sequence: 'RATTRAPAGE', commune: 'NICE', cp: '06200' },
    { id: 'c3', e: 2, statut: 'ANNULEE', decalage: 0, prolongation: 5, sequence: 'INITIALE' }] };
  const k = J(c.ind(el, E, { parConvention: { c1: [42, 40], c2: [3, 6] } }));
  assert.deepEqual([k.eleves, k.apprentis, k.stagiaires, k.avec, k.sans, k.concernes, k.retard, k.prolong, k.rattrapage], [4, 1, 3, 1, 1, 2, 1, 0, 1], 'élève 4 : période pas commencée, jamais « sans convention »');
  assert.equal(k.nDist, 2); assert.equal(k.plus30, 1); assert.deepEqual(k.pres, { dom: 1, nice: 1, ail: 0 });
  assert.deepEqual(J(c.P.map(p => p[1])), ['Tous les élèves', 'Filles', 'Garçons', 'Pensionnaires', 'Filles pensionnaires', 'Demi-pensionnaires', 'Externes']);
  assert.match(h, /Relancez l’import Pronote complet avec les colonnes SEXE et RÉGIME/);
  assert.match(h, /distances\(E\.conv\);\n    publics\(E,m\);/);
  assert.match(h, /\$\('xPublics'\)\.onclick=function\(\)\{exporter\(\$\('xPublics'\)/);
});

console.log(n + ' tests DEV718 réussis.');
