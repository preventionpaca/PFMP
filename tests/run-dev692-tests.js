/* DEV692 — Contrôles étendus aux soumissions (JotForm, « Déclarer mon entreprise »), élève refusé comme son propre responsable, exports PDF / Excel. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
function ctx(convs, jot) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV688_ControleNoms.js'), k);
  Object.assign(k, { EUC_ADMIN_WORKFLOW_ctxV144_: () => ({}),
    EUC_IMPORT_lireRecords_: t => t === 'EUC_ELEVES_PFMP' ? [{ id: 1, Nom: 'ELEVETEST', Prenom: 'Camille', Classe: 10, Code_classe_importe: '1MELEC' }, { id: 2, Nom: 'MARTIN', Prenom: 'Zoé', Classe: 10, Code_classe_importe: '1MELEC' }]
      : t === 'EUC_MIGRATION_JOTFORM_PFMP' ? jot : [],
    EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v, EUC_DEV368_catalog: () => ({ classes: [{ classeId: 10, classe: '1MELEC', famille: 'BACPRO' }] }),
    EUC_DEV371_levelOf_: () => 'PREMIERE', EUC_DEV371_levelLabel_: () => 'Première',
    EUC_CONVENTION_lireAccesFraisV108_: () => convs, EUC_ADMIN_WORKFLOW_estDossierVisibleV522_: a => !!a.Entreprise_raison_sociale,
    EUC_PFMP_anneeDossierV148_: a => a.Annee_scolaire, EUC_ADMIN_WORKFLOW_numeroV144_: a => 'N' + a.id,
    EUC_ADMIN_WORKFLOW_identiteEleveV521_: (a, by) => { const e = by[a.Eleve] || {}; return { id: a.Eleve, nom: e.Nom, prenom: e.Prenom, jeune: e.Prenom + ' ' + e.Nom }; } });
  return k;
}
const JOT = () => [
  { id: 53, Submission_ID: 'SECOURS-PFMP-2026-S0053', Eleve_match_id: 1, Decision: 'VALIDEE', SIRET_normalise: '11122233300044', Periode_numero: 1, Raison_sociale_officielle: 'HOTEL EXEMPLE', Responsable_prenom: 'Camille', Responsable_nom: 'ELEVETEST', Tuteur_prenom: 'Camille', Tuteur_nom: 'ELEVETEST', Ville_officielle: 'NICE' },
  { id: 54, Submission_ID: 'J-77', Annee_scolaire: '2026-2027', Eleve_match_id: 2, Decision: 'IGNOREE', Responsable_nom: '0612' },
  { id: 55, Submission_ID: 'SECOURS-PFMP-2025-S0001', Eleve_match_id: 2, Decision: 'VALIDEE', Responsable_nom: '0612' },
  { id: 56, Submission_ID: 'J-78', Annee_scolaire: '2026-2027', Eleve_match_id: 2, SIRET_normalise: '99999999900011', Raison_sociale_officielle: 'GARAGE', Responsable_prenom: 'Luc', Responsable_nom: 'Bernard', Tuteur_prenom: 'Ana', Tuteur_nom: 'Lopez' } ];
test('contrôle des noms : une soumission (n° S…) dont le responsable est l’élève apparaît ; ignorées et autres années exclues ; statut et source indiqués', () => {
  const r = J(ctx([], JOT()).EUC_DEV688_controleNoms({ annee: '2026-2027' }));
  assert.deepEqual(r.conventions.map(x => x.id), ['S53', 'S56']);
  const d = r.conventions[0]; assert.equal(d.source, 'SOUMISSION'); assert.equal(d.numero, 'PFMP-2026-S0053'); assert.equal(d.statut, 'Soumission validée'); assert.equal(d.classe, '1MELEC'); assert.equal(d.periode, 'PFMP n°1');
  assert.deepEqual(d.anomalies.map(a => a.champ + ':' + a.code), ['Responsable:NOM_ELEVE', 'Tuteur:NOM_ELEVE']);
  assert.equal(r.conventions[1].statut, 'Soumission en attente'); assert.deepEqual(r.conventions[1].anomalies, []);
});
test('pas de double compte : une soumission déjà devenue convention (même élève, même SIRET) n’est lue qu’une fois ; comptage par entreprise inclut les soumissions', () => {
  const convs = [{ id: 7, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention: 10, Classe_convention_nom: '1MELEC', Entreprise_raison_sociale: 'HOTEL EXEMPLE', Entreprise_siret: '11122233300044', Responsable_nom: 'Durand', Responsable_prenom: 'Anne', Tuteur_nom: 'Durand', Tuteur_prenom: 'Anne' }];
  const r = J(ctx(convs, JOT()).EUC_DEV688_controleNoms({ annee: '2026-2027' })); assert.deepEqual(r.conventions.map(x => x.id), [7, 'S56']);
  const l = J(ctx([], JOT()).EUC_DEV689_lieuxStage({ annee: '2026-2027' })); assert.deepEqual(l.conventions.map(x => x.cle), ['S11122233300044', 'S99999999900011']);
});
test('formulaires : l’élève ne peut pas s’inscrire comme responsable ou tuteur (même nom de famille accepté)', () => {
  const k = { String, Error }; vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV602_Identites.js'), k);
  const el = { prenom: 'Camille', nom: 'ELEVETEST' };
  assert.throws(() => k.EUC_DEV692_pasLEleve_('Responsable de l’entreprise', 'Camille', 'Elevetest', el), /pas le tien/);
  assert.throws(() => k.EUC_DEV692_pasLEleve_('Tuteur', 'Elevetest', 'Camille', el), /pas le tien/);
  assert.throws(() => k.EUC_DEV692_pasLEleve_('Tuteur', '', 'Camille Elevetest', el), /pas le tien/);
  assert.equal(k.EUC_DEV692_pasLEleve_('Tuteur', 'Morgan', 'ELEVETEST', el), true);
  assert.match(read('apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs'), /EUC_DEV692_pasLEleve_\('Responsable de l’entreprise',respPrenom,respNom,idQr\)/);
  assert.match(read('apps-script/EUC_DEV603_Declaration.js'), /EUC_DEV692_pasLEleve_\('Responsable de l’entreprise', resp\.prenom, resp\.nom, eleve\)/);
});
test('page : exports PDF et Excel de la liste filtrée (désactivés avant chargement, indicateur), lien vers les soumissions reçues', () => {
  const h = read('apps-script/Admin_Conventions_PFMP.html');
  ['cnPdf', 'cnXlsx', 'lsPdf', 'lsXlsx'].forEach(id => assert.match(h, new RegExp('id="' + id + '" class="secondary" type="button" disabled')));
  assert.match(h, /function exporter\(btn,format,def\)\{if\(btn\.disabled\)return;const old=btn\.innerHTML;btn\.disabled=true;btn\.innerHTML='<span class="spinner"><\/span>Export…'/);
  assert.match(h, /function cnExport\(\)\{const l=cnFiltrees\(\)/); assert.match(h, /function lsExport\(\)\{const g=lsGroupes\(\)/);
  assert.match(h, /jspdf@2\.5\.1/); assert.match(h, /xlsx@0\.18\.5/); assert.match(h, /page=migration-jotform-pfmp/);
});
console.log(n + ' tests DEV692 réussis.');
