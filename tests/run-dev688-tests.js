/* DEV688 — Contrôle des noms du responsable et du tuteur saisis par les élèves. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
function ctx(convs, admin) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV688_ControleNoms.js'), k);
  Object.assign(k, {
    EUC_ADMIN_WORKFLOW_ctxV144_: () => { if (admin === false) throw new Error('Accès administrateur requis.'); return {}; },
    EUC_IMPORT_lireRecords_: t => t === 'EUC_ELEVES_PFMP' ? [{ id: 1, Nom: 'DUPONT', Prenom: 'Léo', Telephone_portable: '06 11 22 33 44' }, { id: 2, Nom: 'MARTIN', Prenom: 'Zoé' }]
      : t === 'EUC_RESPONSABLES_ELEVES_PFMP' ? [{ Eleve: 1, Nom: 'DURAND', Prenom: 'Sophie', Telephone_portable: '+33 6 99 88 77 66' }] : [],
    EUC_IMPORT_RESP_TABLE_: 'EUC_RESPONSABLES_ELEVES_PFMP', EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v,
    EUC_DEV368_catalog: () => ({ classes: [{ classeId: 10, classe: '1CAR', famille: 'BACPRO' }, { classeId: 20, classe: 'TCAR', famille: 'BACPRO' }] }),
    EUC_DEV371_levelOf_: c => c[0] === '1' ? 'PREMIERE' : 'TERMINALE', EUC_DEV371_levelLabel_: c => c === 'PREMIERE' ? 'Première' : 'Terminale',
    EUC_CONVENTION_lireAccesFraisV108_: () => convs, EUC_ADMIN_WORKFLOW_estDossierVisibleV522_: a => !!a.Entreprise_raison_sociale,
    EUC_PFMP_anneeDossierV148_: a => a.Annee_scolaire, EUC_ADMIN_WORKFLOW_numeroV144_: a => 'N' + a.id,
    EUC_ADMIN_WORKFLOW_identiteEleveV521_: (a, by) => { const e = by[a.Eleve] || {}; return { id: a.Eleve, nom: e.Nom, prenom: e.Prenom, jeune: e.Prenom + ' ' + e.Nom }; } });
  return k;
}
const codes = (k, p, e, par) => J(k.EUC_DEV688_analyser_('Tuteur', p, e, par)).map(x => x.code);
test('analyse : téléphone, courriel, vide, mot générique, nom de l’élève, parent, téléphones ; nom correct sans alerte', () => {
  const k = ctx([]), e = { nom: 'DUPONT', prenom: 'Léo', tels: ['0611223344'] }, par = [{ nom: 'Durand', prenom: 'Sophie', tels: ['0699887766'] }];
  assert.deepEqual(codes(k, { nom: '06 12 34 56 78' }, e, par), ['CHIFFRES']);
  assert.deepEqual(codes(k, { nom: 'leo@mail.fr' }, e, par), ['COURRIEL']);
  assert.deepEqual(codes(k, { nom: '' }, e, par), ['VIDE']);
  assert.deepEqual(codes(k, { nom: 'Papa' }, e, par), ['MOT_SUSPECT']);
  assert.deepEqual(codes(k, { nom: 'Dupont', prenom: 'Léo' }, e, par), ['NOM_ELEVE']);
  assert.deepEqual(codes(k, { nom: 'DUPONT', prenom: 'Marc' }, e, par), ['NOM_FAMILLE']);
  assert.deepEqual(codes(k, { nom: 'Durand', prenom: 'Sophie' }, e, par), ['PARENT']);
  assert.deepEqual(codes(k, { nom: 'Bernard', prenom: 'Luc', telephone: '06.11.22.33.44' }, e, par), ['TEL_ELEVE']);
  assert.deepEqual(codes(k, { nom: 'Bernard', prenom: 'Luc', telephone: '0699887766' }, e, par), ['TEL_PARENT']);
  assert.deepEqual(codes(k, { nom: 'Lefèvre-Rossi', prenom: 'Anne-Marie', telephone: '0493000000' }, e, par), []);
});
test('contrôle : année choisie, conventions supprimées ou révoquées exclues, niveau et tri par classe puis élève ; administration seulement', () => {
  const convs = [
    { id: 3, Eleve: 2, Annee_scolaire: '2026-2027', Classe_convention: 20, Classe_convention_nom: 'TCAR', Periode_libelle: 'PFMP n°1', Entreprise_raison_sociale: 'B', Responsable_nom: 'Garcia', Responsable_prenom: 'Ana', Tuteur_nom: 'Garcia', Tuteur_prenom: 'Ana' },
    { id: 1, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention: 10, Classe_convention_nom: '1CAR', Periode_libelle: 'PFMP n°1', Entreprise_raison_sociale: 'A', Responsable_nom: '0611223344', Tuteur_nom: 'Dupont', Tuteur_prenom: 'Léo' },
    { id: 2, Eleve: 1, Annee_scolaire: '2025-2026', Classe_convention_nom: '1CAR', Entreprise_raison_sociale: 'A', Responsable_nom: 'x' },
    { id: 4, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention_nom: '1CAR', Entreprise_raison_sociale: 'A', Responsable_nom: 'x', Supprimee_admin: true },
    { id: 5, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention_nom: '1CAR', Entreprise_raison_sociale: 'A', Responsable_nom: 'x', Revoked: true } ];
  const r = J(ctx(convs).EUC_DEV688_controleNoms({ annee: '2026-2027' }));
  assert.deepEqual(r.conventions.map(x => x.id), [1, 3]); assert.equal(r.total, 2); assert.equal(r.avecAnomalie, 1);
  assert.equal(r.conventions[0].niveauLibelle, 'Première'); assert.deepEqual(r.conventions[0].anomalies.map(a => a.champ + ':' + a.code), ['Responsable:CHIFFRES', 'Tuteur:NOM_ELEVE']);
  assert.deepEqual(r.conventions[1].anomalies, []);
  assert.throws(() => ctx(convs, false).EUC_DEV688_controleNoms({ annee: '2026-2027' }), /administrateur/);
});
test('page : rubrique dans l’administration des conventions, filtres, bouton avec indicateur, ouverture du dossier', () => {
  const h = read('apps-script/Admin_Conventions_PFMP.html');
  assert.match(h, /Contrôler les noms des responsables et des tuteurs/);
  ['cnNiveau', 'cnPeriode', 'cnClasse', 'cnType', 'cnTexte', 'cnTout'].forEach(id => assert.match(h, new RegExp('id="' + id + '"')));
  assert.match(h, /cnLancer\.disabled=true;cnLancer\.innerHTML='<span class="spinner"><\/span>Contrôle en cours…'/);
  assert.match(h, /\.EUC_DEV688_controleNoms\(\{annee:schoolYearSelect\.value\}\)/); assert.match(h, /openBtn\.onclick\(\);/); assert.match(h, /Ouvrir pour corriger/);
});
test('DEV689 : élèves par entreprise : une ligne par convention avec clé SIRET (sinon nom + commune), lieu distinct compté à part', () => {
  const convs = [
    { id: 1, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention: 10, Classe_convention_nom: '1CAR', Periode_libelle: 'PFMP n°1', Entreprise_raison_sociale: 'Garage A', Entreprise_siret: '123 456 789 00012', Entreprise_commune: 'Nice' },
    { id: 2, Eleve: 2, Annee_scolaire: '2026-2027', Classe_convention: 20, Classe_convention_nom: 'TCAR', Periode_libelle: 'PFMP n°1', Entreprise_raison_sociale: 'GARAGE A', Entreprise_siret: '12345678900012', Entreprise_commune: 'Nice' },
    { id: 3, Eleve: 2, Annee_scolaire: '2026-2027', Classe_convention: 20, Classe_convention_nom: 'TCAR', Entreprise_raison_sociale: 'Boulangerie', Entreprise_commune: 'Cagnes' },
    { id: 4, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention: 10, Classe_convention_nom: '1CAR', Entreprise_raison_sociale: 'Garage A', Entreprise_siret: '12345678900012', Lieu_stage_adresse: '5 rue X', Lieu_stage_commune: 'Antibes' },
    { id: 5, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention_nom: '1CAR', Entreprise_raison_sociale: 'Garage A', Entreprise_siret: '12345678900012', Revoked: true } ];
  const r = J(ctx(convs).EUC_DEV689_lieuxStage({ annee: '2026-2027' }));
  assert.equal(r.total, 4); const cle = id => r.conventions.find(x => x.id === id).cle;
  assert.equal(cle(1), cle(2), 'même SIRET = même entreprise'); assert.notEqual(cle(1), cle(4), 'lieu de stage distinct compté à part'); assert.match(cle(3), /^NBOULANGERIE\|CAGNES$/);
  assert.equal(r.conventions.find(x => x.id === 4).lieu, '5 rue X Antibes'); assert.equal(r.conventions[0].niveauLibelle, 'Première');
  assert.throws(() => ctx(convs, false).EUC_DEV689_lieuxStage({ annee: '2026-2027' }), /administrateur/);
  const h = read('apps-script/Admin_Conventions_PFMP.html');
  assert.match(h, /Élèves par entreprise \(lieux de stage\)/); ['lsNiveau', 'lsPeriode', 'lsClasse', 'lsMin', 'lsTexte'].forEach(id => assert.match(h, new RegExp('id="' + id + '"')));
  assert.match(h, /lsCharger\.disabled=true;lsCharger\.innerHTML='<span class="spinner"><\/span>Comptage en cours…'/); assert.match(h, /\.EUC_DEV689_lieuxStage\(\{annee:schoolYearSelect\.value\}\)/);
  assert.match(h, /b\.eleves\.size-a\.eleves\.size/, 'tri par nombre d’élèves décroissant');
});
test('DEV690 : un clic sur un filtre avant le chargement lance le contrôle / le comptage (listes remplies ensuite)', () => {
  const h = read('apps-script/Admin_Conventions_PFMP.html');
  assert.match(h, /\[cnNiveau,cnPeriode,cnClasse,cnType,cnTexte,cnTout\]\.forEach\(function\(s\)\{s\.addEventListener\('mousedown',function\(\)\{if\(!CN\)cnLancer\.click\(\)\}\)/);
  assert.match(h, /\[lsNiveau,lsPeriode,lsClasse,lsMin,lsTexte\]\.forEach\(function\(s\)\{s\.addEventListener\('mousedown',function\(\)\{if\(!LS\)lsCharger\.click\(\)\}\)/);
  assert.match(h, /if\(cnLancer\.disabled\)return;/); assert.match(h, /if\(lsCharger\.disabled\)return;/);
});
console.log(n + ' tests DEV688 réussis.');
