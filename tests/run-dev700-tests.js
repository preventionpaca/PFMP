/* DEV700 — Statistiques : organismes de formation, classe des dépôts, apprentis par établissement, même période, listes. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function ctx(convs, jot, app) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, Set, Map };
  vm.createContext(k);
  ['apps-script/EUC_DEV688_ControleNoms.js', 'apps-script/EUC_DEV698_Statistiques.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
  Object.assign(k, {
    EUC_ADMIN_WORKFLOW_ctxV144_: () => ({}),
    EUC_IMPORT_lireRecords_: t => t === 'EUC_ELEVES_PFMP' ? [{ id: 1, Nom: 'UN', Prenom: 'A', Classe: 20, Code_classe_importe: '2 BTS MV' }] : t === 'EUC_MIGRATION_JOTFORM_PFMP' ? (jot || []) : [],
    EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v,
    EUC_DEV368_catalog: () => ({ classes: [{ classeId: 20, classe: '2BTS MV', famille: 'BTS', periodes: [{ id: 200, libelle: 'Stage 2', debut: '2027-01-04', fin: '2027-02-05' }] }] }),
    EUC_DEV538_diplomas_: () => ({ 20: 'BTS MV' }), EUC_DEV564_diplomaForClass_: (c, d) => d,
    EUC_DEV371_levelOf_: () => 'BTS2', EUC_DEV371_levelLabel_: () => '2e année',
    EUC_CONVENTION_lireAccesFraisV108_: () => convs, EUC_ADMIN_WORKFLOW_estDossierVisibleV522_: a => !!a.Entreprise_raison_sociale,
    EUC_PFMP_anneeDossierV148_: a => a.Annee_scolaire, EUC_ADMIN_WORKFLOW_numeroV144_: a => 'N' + a.id,
    EUC_ADMIN_WORKFLOW_identiteEleveV521_: (a, by) => { const e = by[a.Eleve] || {}; return { id: a.Eleve, nom: e.Nom, prenom: e.Prenom, jeune: e.Prenom + ' ' + e.Nom }; },
    EUC_DEV577_modele_: () => app || { groupes: [], cartes: {} }, EUC_SUIVI2_temoin_: () => '',
    EUC_DEV579_classesCompletes_: () => [{ id: 30, classe: 'CQPM ASC', etablissement: 'LP' }, { id: 31, classe: '1BTS ELEC Alt', etablissement: 'LGT' }],
    EUC_DEV544_establishment_: c => c.etablissement
  });
  return k;
}

test('organisme de formation inscrit comme employeur (AFPI, CFA, GRETA…) : jamais une entreprise', () => {
  const k = ctx([]);
  ['AFPI PROVENCE', 'Afpi Provence', 'CFAI Provence', 'GRETA Côte d’Azur', 'CFA RAN'].forEach(x => assert.equal(k.EUC_DEV698_organisme_(x), true, x));
  ['ENEDIS DR CAZ', 'GRAFPIX', 'CAFE DU PORT'].forEach(x => assert.equal(k.EUC_DEV698_organisme_(x), false, x));
  const app = { groupes: [{ lignes: [{ classeId: 30, classe: 'CQPM ASC', famille: 'AUTRES_FORMATIONS', diplome: 'CQPM — ASC', mode: 'CLASSE_ENTIERE', gestionnaire: 'GRETA', donneur: 'CFAI' }, { classeId: 31, classe: '1BTS ELEC Alt', famille: 'BTS', diplome: 'BTS ELEC', mode: 'CLASSE_ENTIERE', gestionnaire: 'CFA RAN', donneur: 'CFAI' }] }],
    cartes: { 30: [{ eleve: 'X', statut: 'APPRENTI', dates: { debut: '2026-09-01', fin: '2028-08-31' }, fiche: { entreprise: 'AFPI PROVENCE', siret: '34408659000041' } }],
      31: [{ eleve: 'Y', statut: 'APPRENTI', dates: { debut: '2026-09-01', fin: '2028-08-31' }, fiche: { entreprise: 'ENEDIS DR CAZ', siret: '44460844202345' } }] } };
  const r = J(ctx([], [], app).EUC_DEV698_annee({ annee: '2026-2027' }));
  assert.equal(r.apprentis[0].k, '', 'AFPI : pas une entreprise'); assert.equal(r.apprentis[0].organisme, 'AFPI PROVENCE');
  assert.equal(r.apprentis[0].etablissement, 'LP'); assert.equal(r.apprentis[0].mode, 'CLASSE_ENTIERE'); assert.equal(r.apprentis[0].gestionnaire, 'GRETA'); assert.equal(r.apprentis[0].donneur, 'CFAI');
  assert.equal(r.apprentis[1].k, 'S44460844202345'); assert.equal(r.apprentis[1].etablissement, 'LGT'); assert.equal(r.apprentis[1].debut, '2026-09-01'); assert.equal(r.apprentis[1].eleve, 'Y');
});

test('dépôt en ligne : classe et diplôme repris de la classe de l’élève (plus de « Autre » ni de classe non renseignée)', () => {
  const jot = [{ id: 5, Eleve_match_id: 1, Submission_ID: 'SECOURS-PFMP-2026-S0005', Periode_numero: 'Stage 2', SIRET_normalise: '99999999900011', SIRET_statut: 'VERIFIE', Raison_sociale_officielle: 'Garage Z' }];
  const r = J(ctx([], jot).EUC_DEV698_annee({ annee: '2026-2027' })), x = r.conventions[0];
  assert.equal(x.classe, '2 BTS MV'); assert.equal(x.famille, 'BTS'); assert.equal(x.diplome, 'BTS MV'); assert.equal(x.niveau, '2e année'); assert.equal(x.eleve, 'A UN');
});

test('DEV701 : élève ou classe d’essai (TEST PFMP, Donnee_test) exclus des statistiques', () => {
  const k = ctx([{ id: 1, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention: 20, Classe_convention_nom: 'TEST PFMP', Entreprise_raison_sociale: 'Essai', Entreprise_siret: '12345678900012' },
    { id: 2, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention: 20, Classe_convention_nom: '2BTS MV', Entreprise_raison_sociale: 'Vrai', Entreprise_siret: '12345678900012' }]);
  assert.deepEqual(J(k.EUC_DEV698_annee({ annee: '2026-2027' })).conventions.map(c => c.id), ['2']);
  const lire = k.EUC_IMPORT_lireRecords_; k.EUC_IMPORT_lireRecords_ = t => t === 'EUC_ELEVES_PFMP' ? [{ id: 1, Nom: 'UN', Prenom: 'A', Classe: 20, Donnee_test: true }] : lire(t);
  assert.deepEqual(J(k.EUC_DEV698_annee({ annee: '2026-2027' })).conventions, []);
});
test('page : même période ou année, Nice par secteur dans la vue synthétique, listes du déroulement, données à corriger, apprentis par établissement, colonnes adaptées', () => {
  const h = read('apps-script/Statistiques_PFMP_DEV698.html');
  assert.match(h, /<select id="portee"[^>]*><option value="annee">Sur l’année scolaire<\/option><option value="periode">En même temps \(même période de stage\)<\/option>/);
  assert.match(h, /\[fPeriode,fFamille,fDiplome,fClasse,portee\]\.forEach\(function\(s\)\{s\.onchange=rendre\}\)/);
  assert.match(h, /return\(!a\.debut\|\|!d2\|\|a\.debut<=d2\)&&\(!a\.fin\|\|!d1\|\|a\.fin>=d1\)/, 'apprenti en contrat pendant la période');
  assert.match(h, /let e=g\.get\(a\.k\)\|\|parSiren\[siren\(a\.k\)\]\|\|parNom\[a\.nn\]/, 'même SIREN');
  assert.match(h, /synth\.push\(\{l:SECTEURS\[cp\]\?SECTEURS\[cp\]\+' \('\+cp\+'\)'/);
  ['dec', 'pro', 'rat', 'inter', 'ann'].forEach(c => assert.ok(h.includes("'" + c + "']"), c));
  assert.match(h, /tableau\('der',\['Élève','Classe','Période','Entreprise','Dates de la convention'/);
  assert.match(h, /<section id="qualite" hidden>/); assert.match(h, /'Classe non renseignée':!x\.famille\?'Classe inconnue/);
  assert.match(h, /<h3>Par établissement<\/h3>/); assert.match(h, /<h3>Par organisme gestionnaire<\/h3>/); assert.match(h, /tableau\('dApp',\['Établissement','Modalité','Organisme','Classe','Filière','Apprentis'\]/);
  assert.match(h, /LISTES\.apprentissage=\{titre:'Entreprises qui emploient des apprentis mais n’accueillent aucun stagiaire[^']*',entetes:\['Entreprise','SIRET \/ NIS','Commune','Code postal \/ secteur','Apprentis','Classes des apprentis'\]/);
});
console.log(n + ' tests DEV700 réussis.');
