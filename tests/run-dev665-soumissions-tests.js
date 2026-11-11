/* DEV665 — « Soumissions à traiter (bureau G205) » : SIRET ou NIS corrigé par le bureau, validation par l'import
 * éprouvé (Monaco compris), classement sans suite sans suppression, liens de l'administration. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const SRC = read('apps-script/EUC_DEV665_DemandesAide.js');

/* Ligne d'attente telle que le formulaire en ligne l'écrit (demande d'aide Monaco de Joan, NIS mal recopié). */
function ligneJoan(id, numero, extra) {
  return { id, fields: Object.assign({ Submission_ID: 'SECOURS-' + numero, Eleve_match_id: 7, Eleve_match_libelle: 'Joan DUVAL', Classe_match_libelle: '1MP3D', Periode_numero: 'PFMP n°1',
    Date_debut_brut: '2026-11-23', Date_fin_brut: '2026-12-18', Date_import: '2026-11-11T17:00:00Z', Email_eleve: 'eleve@ex.test', Entreprise_saisie: 'TITAN ENGINEERING MONACO',
    Adresse_entreprise: '2 RUE DU GABIAN', Ville_entreprise: 'Monaco', SIRET_statut: 'A_CONTROLER', Pays_officiel: 'MC', Entreprise_identifiant_type: 'NIS', NIS_normalise: '7112Y19343',
    Niveau_controle: 'ROUGE', Decision: 'A_CONTROLER', Nom_responsable: 'RENAULT GUILLAUME', Telephone_entreprise: '+377 99 92 60 50', Email_entreprise: 'c@ex.test',
    Alertes: 'Entreprise non vérifiée (Monaco) — élève envoyé au bureau G205' }, extra || {}) };
}
function contexte(lignes, opts) {
  opts = opts || {};
  const cols = new Set(Object.keys(ligneJoan(0, 'x').fields).concat(['SIRET_brut', 'SIRET_normalise', 'SIRET_source', 'Raison_sociale_officielle', 'Nom_commercial', 'Adresse_officielle',
    'Complement_adresse_officielle', 'CP_officiel', 'Ville_officielle', 'Valide_par', 'Date_validation']).filter(c => !(opts.sansNis || []).includes(c)));
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, __appels: [], __lignes: lignes,
    EUC_V160_TABLE_: 'EUC_MIGRATION_JOTFORM_PFMP',
    EUC_IMPORT_exigerAdminTexte_: () => ({ email: 'bureau@ex.test' }),
    Utilities: { formatDate: () => '11/11/2026 18:30' },
    EUC_ENT_validerSiret: s => /^\d{14}$/.test(s) ? { valide: true } : { valide: false, message: 'SIRET : 14 chiffres attendus.' },
    EUC_ENT_rechercherSiret: s => opts.navigateur ? { source: 'api_navigateur', url: 'https://annuaire.test/?q=' + s } : { source: 'grist', entreprise: { raisonSociale: 'GARAGE TEST', enseigne: 'Garage', adresseComplete: '3 RUE DU PORT', codePostal: '06300', commune: 'NICE', etat: opts.ferme ? 'Fermé' : 'Actif' } },
    EUC_ENT_traiterReponseApiNavigateur: (json, s) => ({ entreprise: json && json.ok ? { raisonSociale: 'API SARL', adresseComplete: '1 AV', codePostal: '06100', commune: 'NICE', etat: 'Actif' } : null }),
    EUC_DEV466_importSelection: p => { k.__appels.push(['import', J(p)]); return { validationBilan: { creees: 1, completees: 0, dejaExistantes: 0, erreurs: [] } }; },
    EUC_CONVENTION_assurerColonnesEntrepriseV117_: () => k.__appels.push(['colonnesAcces']),
    EUC_DEV646_table_: () => 'EUC_ENTREPRISES', EUC_IMPORT_lireRecords_: () => opts.base || [],
    EUC_DEV646_creerMonaco: d => { k.__appels.push(['creerMonaco', J(d)]); return { ok: true }; },
    EUC_DEV646_rechercherMonacoParNom: q => ({ resultats: [{ nis: '7112B19343', nom: 'TITAN ENGINEERING MONACO', adresse: '2 rue du Gabian', ville: 'Monaco', q }] }),
    EUC_ENT_grist(method, p, body) {
      k.__appels.push([method, p, body && J(body)]);
      if (/\/columns$/.test(p)) { if (method === 'post') body.columns.forEach(c => cols.add(c.id)); return { columns: [...cols].map(id => ({ id })) }; }
      const m = /\/records(?:\?filter=(.*))?$/.exec(p);
      if (method === 'get') { if (!m[1]) return { records: lignes }; const ids = JSON.parse(decodeURIComponent(m[1])).id; return { records: lignes.filter(r => ids.includes(r.id)) }; }
      if (method === 'patch') body.records.forEach(r => Object.keys(r.fields).forEach(c => { assert.ok(cols.has(c), 'colonne existante : ' + c); lignes.find(x => x.id === r.id).fields[c] = r.fields[c]; }));
      return {};
    }
  };
  vm.createContext(k); vm.runInContext(SRC, k);
  return k;
}

test('liste : dépôts du formulaire en attente seulement, plus récents d’abord, doublon repéré, statut et pays', () => {
  const l = [ligneJoan(10, 'PFMP-2026-S0017'), ligneJoan(11, 'PFMP-2026-S0018', { Adresse_entreprise: '2rue du Gabian' }),
    ligneJoan(12, 'PFMP-2026-S0019', { Decision: 'VALIDEE' }), ligneJoan(13, 'X', { Submission_ID: 'JOTFORM-55' }), ligneJoan(14, 'ESSAI-1', { Decision: 'ESSAI' }),
    ligneJoan(15, 'PFMP-2026-S0020', { Eleve_match_id: 9, Eleve_match_libelle: 'Léa B', Pays_officiel: 'FR', Entreprise_identifiant_type: '', NIS_normalise: '', SIRET_normalise: '41384608000039', SIRET_statut: 'VERIFIE', Niveau_controle: 'VERT', Decision: 'A_VALIDER' })];
  const k = contexte(l), r = J(k.EUC_DEV665_lister().soumissions);
  assert.deepEqual(r.map(x => x.numero), ['PFMP-2026-S0020', 'PFMP-2026-S0018', 'PFMP-2026-S0017']);
  assert.equal(r[1].doublonDe, ''); assert.equal(r[2].doublonDe, 'PFMP-2026-S0018', 'le plus ancien est le doublon');
  assert.equal(r[1].pays, 'MC'); assert.equal(r[1].aide, true); assert.equal(r[1].pret, false); assert.equal(r[1].numeroSaisi, '7112Y19343');
  assert.equal(r[0].pays, 'FR'); assert.equal(r[0].pret, true, 'SIRET vérifié : prête');
  assert.equal(r[1].eleve, 'Joan DUVAL'); assert.equal(r[1].contact.tel, '+377 99 92 60 50');
});

test('NIS de Monaco : format contrôlé, enregistré sur la seule ligne, colonnes NIS créées au besoin, trace gardée', () => {
  assert.ok(contexte([]).EUC_DEV665_nisValide_('7112B 19343')); assert.ok(contexte([]).EUC_DEV665_nisValide_('EUC-MC-0003'));
  assert.ok(!contexte([]).EUC_DEV665_nisValide_('711219343'), 'NIS sans lettre refusé');
  const l = [ligneJoan(11, 'PFMP-2026-S0018')], k = contexte(l, { sansNis: ['NIS_brut', 'NIS_statut'] });
  assert.throws(() => k.EUC_DEV665_enregistrerMonaco({ id: 11, nis: '711219343', nom: 'T', adresse: 'A' }), /NIS invalide/);
  assert.throws(() => k.EUC_DEV665_enregistrerMonaco({ id: 11, nis: '7112B19343', nom: '', adresse: 'A' }), /nom et l’adresse/);
  const r = k.EUC_DEV665_enregistrerMonaco({ id: 11, nis: '7112b 19343', nom: 'TITAN ENGINEERING MONACO', adresse: '2 RUE DU GABIAN', cp: '', ville: '' });
  assert.equal(r.soumission.pret, true); assert.equal(r.soumission.numeroSaisi, '7112B19343');
  const f = l[0].fields;
  assert.equal(f.NIS_normalise, '7112B19343'); assert.equal(f.NIS_brut, '7112B19343'); assert.equal(f.SIRET_statut, 'NIS_MONACO'); assert.equal(f.CP_officiel, '98000'); assert.equal(f.Ville_officielle, 'Monaco');
  assert.equal(f.Decision, 'A_VALIDER'); assert.match(f.Alertes, /élève envoyé au bureau G205 — NIS saisi par le bureau : 7112B19343 \(11\/11\/2026 18:30\)$/);
  const post = k.__appels.find(a => a[0] === 'post'); assert.deepEqual(post[2].columns.map(c => c.id), ['NIS_brut', 'NIS_statut']);
  assert.equal(k.__appels.filter(a => a[0] === 'patch').length, 1); assert.deepEqual(k.__appels.find(a => a[0] === 'patch')[2].records.map(x => x.id), [11]);
  assert.ok(!k.__appels.some(a => a[0] === 'delete'), 'aucune suppression');
});

test('SIRET corrigé par le bureau : vérifié (base ou annuaire relu côté navigateur), coordonnées officielles reprises', () => {
  const l = [ligneJoan(20, 'PFMP-2026-S0030', { Pays_officiel: 'FR', Entreprise_identifiant_type: '', NIS_normalise: '', SIRET_brut: '4138460800003' })], k = contexte(l);
  assert.throws(() => k.EUC_DEV665_verifierSiret({ id: 20, siret: '123' }), /14 chiffres/);
  const r = k.EUC_DEV665_verifierSiret({ id: 20, siret: '413 846 080 00039' });
  assert.equal(r.soumission.pret, true); assert.equal(r.soumission.officiel.nom, 'GARAGE TEST');
  assert.equal(l[0].fields.SIRET_normalise, '41384608000039'); assert.equal(l[0].fields.SIRET_statut, 'VERIFIE'); assert.equal(l[0].fields.Pays_officiel, 'FR'); assert.equal(l[0].fields.NIS_normalise, '');
  assert.match(l[0].fields.Alertes, /SIRET corrigé par le bureau : 41384608000039/);
  const kf = contexte([ligneJoan(21, 'S', { Pays_officiel: 'FR' })], { ferme: true }), rf = kf.EUC_DEV665_verifierSiret({ id: 21, siret: '41384608000039' });
  assert.equal(rf.ferme, true); assert.equal(rf.soumission.decision, 'A_CONTROLER');
  const kn = contexte([ligneJoan(22, 'S', { Pays_officiel: 'FR' })], { navigateur: true });
  assert.deepEqual(J(kn.EUC_DEV665_verifierSiret({ id: 22, siret: '41384608000039' })), { aVerifierNavigateur: true, url: 'https://annuaire.test/?q=41384608000039' });
  assert.equal(kn.EUC_DEV665_verifierSiret({ id: 22, siret: '41384608000039', reponseApi: { ok: true } }).soumission.officiel.nom, 'API SARL');
});

test('validation : seulement une ligne prête, par l’import de « Soumissions reçues » ; Monaco ajoutée à la base si son NIS n’y est pas', () => {
  const l = [ligneJoan(11, 'PFMP-2026-S0018')], k = contexte(l);
  assert.throws(() => k.EUC_DEV665_valider({ id: 11 }), /Enregistrez d’abord le NIS/);
  k.EUC_DEV665_enregistrerMonaco({ id: 11, nis: '7112B19343', nom: 'TITAN ENGINEERING MONACO', adresse: '2 RUE DU GABIAN' });
  const r = J(k.EUC_DEV665_valider({ id: 11 }));
  assert.deepEqual(k.__appels.find(a => a[0] === 'import')[1], { ids: [11], manualSelection: true });
  assert.ok(k.__appels.findIndex(a => a[0] === 'colonnesAcces') < k.__appels.findIndex(a => a[0] === 'import'));
  assert.equal(r.numero, 'PFMP-2026-S0018'); assert.equal(r.creees, 1); assert.equal(r.baseMonaco, 'ajoutée à la base des entreprises');
  assert.equal(k.__appels.find(a => a[0] === 'creerMonaco')[1].nis, '7112B19343');
  const k2 = contexte([ligneJoan(11, 'S', { SIRET_statut: 'NIS_MONACO', NIS_normalise: '7112B19343', Raison_sociale_officielle: 'T', Adresse_officielle: 'A' })], { base: [{ NIS: '7112B 19343' }] });
  assert.equal(k2.EUC_DEV665_valider({ id: 11 }).baseMonaco, 'déjà dans la base des entreprises'); assert.ok(!k2.__appels.some(a => a[0] === 'creerMonaco'));
  const k3 = contexte([ligneJoan(12, 'S', { Decision: 'VALIDEE' })]);
  assert.throws(() => k3.EUC_DEV665_valider({ id: 12 }), /déjà traité/);
  assert.throws(() => contexte([ligneJoan(13, 'X', { Submission_ID: 'JOTFORM-1' })]).EUC_DEV665_valider({ id: 13 }), /introuvable/);
});

test('sans suite : ligne marquée REJETEE avec motif, jamais supprimée', () => {
  const l = [ligneJoan(10, 'PFMP-2026-S0017')], k = contexte(l);
  k.EUC_DEV665_sansSuite({ id: 10, motif: 'doublon de PFMP-2026-S0018' });
  assert.equal(l.length, 1); assert.equal(l[0].fields.Decision, 'REJETEE'); assert.equal(l[0].fields.Valide_par, 'bureau@ex.test');
  assert.match(l[0].fields.Alertes, /Classé sans suite par le bureau : doublon de PFMP-2026-S0018/);
  assert.ok(!k.__appels.some(a => a[0] === 'delete'));
  assert.equal(J(k.EUC_DEV665_lister().soumissions).length, 0, 'disparaît de la liste');
  assert.equal(k.EUC_DEV665_chercherMonaco({ nom: 'titan' }).resultats[0].nis, '7112B19343');
});

test('import « Soumissions reçues » : une ligne NIS de Monaco prête crée la convention avec son NIS, jamais un faux SIRET', () => {
  const src = read('apps-script/EUC_PFMP_DEV466_JotFormReliable.js');
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp };
  vm.createContext(k); vm.runInContext(src + '\n' + SRC, k);
  const ACCES = [];
  Object.assign(k, {
    EUC_DEV307_STUDENTS_TABLE_: 'EUC_ELEVES_PFMP', EUC_DEV307_ACCESS_TABLE_: 'EUC_ACCES_FORMULAIRES_PFMP',
    EUC_DEV307_flatRecords_: t => t === 'EUC_ELEVES_PFMP' ? [{ id: 7, Classe: 3, Annee_scolaire: '2026-2027' }] : t === 'EUC_ACCES_FORMULAIRES_PFMP' ? ACCES : [],
    EUC_CONVENTION_lireElevesAdmin: () => [{ id: 7 }], EUC_CONVENTION_lireClassesEtPeriodesAdmin: () => ({ classes: [{ id: 3, Nom: '1MP3D' }], periodes: [{ id: 40, libelle: 'PFMP n°1' }] }),
    EUC_DEV307_columns_: () => ({}), EUC_DEV468_periodFor_: () => ({ ok: true, period: { id: 40 }, start: '2026-11-23', end: '2026-12-18' }),
    EUC_CONVENTION_preparerRecordAcces_: () => ({ record: { fields: { Eleve: 7, Periode: 40 } } }),
    EUC_DEV528_companyFields_: row => ({ Entreprise_raison_sociale: row.Entreprise_saisie, Entreprise_siret: '' }),
    EUC_DEV307_filterFields_: f => Object.assign({}, f)
  });
  const row = Object.assign({ id: 11, Classe_match_id: 3 }, ligneJoan(11, 'PFMP-2026-S0018', { SIRET_statut: 'NIS_MONACO', NIS_normalise: '7112B19343', NIS_brut: '7112B19343', Raison_sociale_officielle: 'TITAN ENGINEERING MONACO', Adresse_officielle: '2 RUE DU GABIAN', CP_officiel: '98000', Ville_officielle: 'Monaco', Nom_commercial: 'TITAN ENGINEERING MONACO' }).fields);
  const plan = k.EUC_DEV466_prepare_([row], {}, {}), it = plan.items[0];
  assert.equal(it.mode, 'CREATE'); assert.equal(it.siret, '');
  assert.equal(it.fields.Entreprise_nis, '7112B19343'); assert.equal(it.fields.Entreprise_identifiant_type, 'NIS'); assert.equal(it.fields.Entreprise_siret, '');
  assert.equal(it.fields.Entreprise_raison_sociale, 'TITAN ENGINEERING MONACO'); assert.equal(it.fields.Entreprise_pays, 'MONACO'); assert.equal(it.fields.Entreprise_code_postal, '98000');
  assert.throws(() => k.EUC_DEV466_prepare_([Object.assign({}, row, { NIS_normalise: '7112Y1934' })], {}, {}), /SIRET non vérifié/, 'NIS mal formé : pas d’import');
  ACCES.push({ id: 90, Eleve: 7, Classe_convention: 3, Periode: 40, Annee_scolaire: '2026-2027', Entreprise_siret: '41384608000039', Entreprise_raison_sociale: 'AUTRE', Statut_administratif: 'ENTREPRISE_SAISIE' });
  assert.throws(() => k.EUC_DEV466_prepare_([row], {}, {}), /Conflit : une convention existe déjà/);
  const fr = Object.assign({}, row, { SIRET_statut: 'VERIFIE', NIS_normalise: '', SIRET_normalise: '41384608000039', Entreprise_identifiant_type: '' });
  ACCES.length = 0; assert.equal(k.EUC_DEV466_prepare_([fr], {}, {}).items[0].siret, '41384608000039', 'France : inchangé');
});

test('page et administration : route, contrôle de publication, liens déplacés dans « Entreprises », boutons protégés', () => {
  const h = read('apps-script/Soumissions_A_Traiter_DEV665.html'), adm = read('apps-script/Admin_PFMP.html');
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'soumissions-a-traiter-pfmp':\n      return EUC_DEV665_afficher\(e\);/);
  assert.match(read('scripts/pfmp-release-config.json'), /"page": "soumissions-a-traiter-pfmp", "scope": "admin", "expected": "Soumissions à traiter"/);
  const ent = adm.slice(adm.indexOf('<h2>Entreprises</h2>'), adm.indexOf('<h2>Apprentis</h2>'));
  ['?page=soumissions-a-traiter-pfmp">Soumissions à traiter (bureau G205)', '?page=entreprises-monaco-pfmp">Entreprises de Monaco', '?page=migration-jotform-pfmp">Soumissions reçues'].forEach(x => assert.ok(ent.includes(x), x));
  assert.equal((adm.match(/page=migration-jotform-pfmp/g) || []).length, 1, 'un seul lien Soumissions reçues'); assert.equal((adm.match(/page=entreprises-monaco-pfmp/g) || []).length, 1);
  ['EUC_DEV665_lister', 'EUC_DEV665_verifierSiret', 'EUC_DEV665_enregistrerMonaco', 'EUC_DEV665_valider', 'EUC_DEV665_sansSuite', 'EUC_DEV665_chercherMonaco'].forEach(f => assert.ok(h.includes("'" + f + "'"), f));
  assert.match(h, /function occupe\(b,on,texte\)\{[^}]*b\.disabled=on;b\.classList\.toggle\('busy',on\)/, 'bouton bloqué avec spinner');
  assert.match(h, /ko\(new Error\('Pas de réponse après '/, 'dépassement de délai');
  assert.match(h, /appel\('EUC_DEV665_valider',\{id:id\},300000,/); assert.match(h, /confirm\('Créer la convention de /); assert.match(h, /prompt\('Classer sans suite la soumission /);
  assert.ok(!/https?:\/\/[^"' ]*(lycee-les-eucalyptus|loucodi)/.test(h), 'aucune adresse de l’application en dur');
  assert.match(h, /href="<\?= adminBase \?>\?page=admin-pfmp">Administration PFMP<\/a>/);
});

test('Entreprises de Monaco : code postal 980xx écrit dans l’adresse reconnu (MES « 98000 MOACO »)', () => {
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp }; vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV646_MonacoSansNis.js'), k);
  assert.equal(k.EUC_DEV646_monaco_({ Adresse_complete: '416 avenue Albert III zone F 98000 MOACO', Commune: 'MOACO' }), true);
  assert.equal(k.EUC_DEV646_monaco_({ Adresse_complete: '9800 route de Nice', Code_postal: '06000', Commune: 'NICE' }), false);
  assert.equal(k.EUC_DEV646_monaco_({ Adresse_complete: '1 rue X', Code_postal: '06000', Commune: 'NICE', Numero_voie: '98000' }), true, '980xx isolé');
});
test('DEV666 : à traiter seulement ce qui demande une action ; SIRET vérifié = déjà dans le suivi ; doublon d’un dépôt enregistré', () => {
  const verif = (id, num, eleve, extra) => ligneJoan(id, num, Object.assign({ Eleve_match_id: eleve, Eleve_match_libelle: 'E' + eleve, Pays_officiel: 'FR', Entreprise_identifiant_type: '', NIS_normalise: '',
    SIRET_normalise: '41384608000039', SIRET_statut: 'VERIFIE', Niveau_controle: 'VERT', Decision: 'A_VALIDER', Raison_sociale_officielle: 'NICE FESTIVITES' }, extra || {}));
  const l = [verif(20, 'S0014', 20), verif(21, 'S0012', 21, { Niveau_controle: 'ORANGE', Decision: 'A_CONTROLER' }), ligneJoan(22, 'S0013', 22, {}),
    verif(23, 'S0030', 7, { NIS_normalise: '7112B19343', SIRET_normalise: '', SIRET_statut: 'NIS_MONACO', Pays_officiel: 'MC', Entreprise_identifiant_type: 'NIS', Raison_sociale_officielle: 'TITAN' }), ligneJoan(24, 'S0017')];
  l[2].fields.Eleve_match_id = 22;
  const r = J(contexte(l).EUC_DEV665_lister().soumissions), par = num => r.find(x => x.numero === num);
  assert.equal(par('S0014').aTraiter, false, 'SIRET vérifié : rien à faire'); assert.equal(par('S0014').dansSuivi, true);
  assert.equal(par('S0012').aTraiter, true, 'établissement fermé'); assert.match(par('S0012').raison, /fermé/);
  assert.equal(par('S0013').aTraiter, true); assert.match(par('S0013').raison, /Demande d’aide/);
  assert.equal(par('S0030').aTraiter, false, 'NIS validé : dans le suivi');
  assert.equal(par('S0017').doublonDe, 'S0030', 'demande plus ancienne = doublon du dépôt enregistré'); assert.match(par('S0017').raison, /Doublon/);
  const k = contexte(l.map(x => J(x))); assert.equal(k.EUC_DEV666_dansSuivi_({ SIRET_normalise: '41384608000039', SIRET_statut: 'VERIFIE', Decision: 'IGNOREE' }), false, 'ligne ignorée jamais comptée');
});

test('DEV666 : entreprise déjà connue proposée (SACOME Conti ↔ SAM SACOM CONTI au SIRET français), recherche dans toute la base', () => {
  const base = [{ id: 1, Raison_sociale: 'SAM SACOM CONTI', SIRET: '123 456 789 00012', Numero_voie: '1 AV ALBERT II', Code_postal: '98000', Commune: 'MONACO' },
    { id: 2, Raison_sociale: 'TITAN ENGINEERING MONACO', NIS: '7112B19343', Commune: 'Monaco' }, { id: 3, Raison_sociale: 'GARAGE DU PORT', SIRET: '11111111100011' }];
  const aide = ligneJoan(30, 'S0013', { Eleve_match_id: 30, Entreprise_saisie: 'SACOME Conti', NIS_normalise: '' });
  const depot = ligneJoan(31, 'S0040', { Eleve_match_id: 31, Eleve_match_libelle: 'Sandro M', Pays_officiel: 'FR', Entreprise_identifiant_type: '', NIS_normalise: '', SIRET_normalise: '99999999900099', SIRET_statut: 'VERIFIE', Niveau_controle: 'VERT', Decision: 'A_VALIDER', Raison_sociale_officielle: 'CONTI ESPRESSO' });
  const k = contexte([aide, depot], { base }), r = J(k.EUC_DEV665_lister().soumissions), x = r.find(s => s.numero === 'S0013');
  assert.equal(x.suggestions[0].siret, '12345678900012', 'SIRET français de la base proposé en premier'); assert.equal(x.suggestions[0].nom, 'SAM SACOM CONTI');
  assert.ok(x.suggestions.some(s => s.siret === '99999999900099' && /dépôt S0040/.test(s.source)), 'dépôt déjà vérifié proposé aussi');
  assert.ok(!x.suggestions.some(s => s.nom === 'GARAGE DU PORT'));
  assert.equal(r.find(s => s.numero === 'S0040').suggestions, undefined, 'rien proposé pour une soumission déjà dans le suivi');
  assert.equal(J(k.EUC_DEV666_chercherBase({ nom: 'titan' })).resultats[0].nis, '7112B19343', 'Monaco aussi');
  assert.throws(() => k.EUC_DEV666_chercherBase({ nom: 'sa' }), /3 lettres/);
});

test('DEV666 : NIS enregistré par le bureau : entreprise ajoutée à la base, soumission sortie de « à traiter »', () => {
  const k = contexte([ligneJoan(11, 'PFMP-2026-S0018')]);
  const r = J(k.EUC_DEV665_enregistrerMonaco({ id: 11, nis: '7112B19343', nom: 'TITAN ENGINEERING MONACO', adresse: '2 RUE DU GABIAN' }));
  assert.equal(r.soumission.dansSuivi, true); assert.equal(r.soumission.aTraiter, false); assert.equal(r.baseMonaco, 'ajoutée à la base des entreprises');
  assert.ok(k.__appels.some(a => a[0] === 'creerMonaco' && a[1].nis === '7112B19343'));
  const h = read('apps-script/Soumissions_A_Traiter_DEV665.html');
  assert.match(h, /FILTRE='atraiter'/, 'vue par défaut : à traiter'); assert.match(h, /appel\('EUC_DEV666_chercherBase',\{nom:q\},30000,/);
  assert.match(h, /x\.aTraiter&&x\.pret&&!x\.doublonDe\?bouton\('valider'/, 'pas de validation à faire pour un dépôt déjà dans le suivi');
});
console.log(n + ' tests DEV665 réussis.');
