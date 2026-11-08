'use strict';
/* DEV646 — Génération de classe sans doublon, Monaco sans NIS, renvoi du QR vers le formulaire en ligne. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const J = x => JSON.parse(JSON.stringify(x));

/* ---------- Génération de classe ---------- */
function contexteGeneration(acces) {
  const posts = [], cache = {};
  const c = { console, JSON, Math, Date, Object, Array, String, Number, Error, posts,
    EUC_IMPORT_exigerAdminTexte_: () => ({ email: 'admin@lycee.test' }),
    EUC_CONVENTION_norm_: v => String(v || '').trim().toUpperCase(),
    EUC_CONVENTION_lireElevesAdmin: () => [{ id: 1, nom: 'ALPHA', prenom: 'Ana', classe: '1TEST' }, { id: 2, nom: 'BETA', prenom: 'Bob', classe: '1TEST' }, { id: 3, nom: 'GAMMA', prenom: 'Gus', classe: '1TEST' }],
    EUC_CONVENTION_lireClassesEtPeriodesAdmin: () => ({ classes: [{ id: 10, nom: '1TEST' }], periodes: [{ id: 100, debut: '2026-11-23', fin: '2026-12-18', type: 'PFMP' }] }),
    Utilities: { getUuid: () => 'u1' }, ScriptApp: { getService: () => ({ getUrl: () => 'https://base' }) },
    EUC_CONVENTION_assurerTableAcces_: () => {}, EUC_CONVENTION_ACCES_TABLE_: 'EUC_ACCES_FORMULAIRES_PFMP',
    EUC_IMPORT_lireRecords_: () => acces, EUC_PFMP_ref_: v => Array.isArray(v) ? Number(v[1]) : Number(v) || 0,
    EUC_IMPORT_dateExistanteISO_: v => String(v || '').slice(0, 10),
    EUC_CONVENTION_preparerRecordAcces_: (ctx, e, cl, p, annee, opt) => ({ token: 'T' + e.id, reference: 'REF' + e.id, dateFin: p.fin, record: { fields: { Eleve: e.id, Lot_generation: opt.lot } } }),
    EUC_ENT_grist: (m, url, body) => { posts.push({ m, url, body }); return {}; },
    EUC_CONVENTION_debutRafraichissementV511_: () => 'R', CacheService: { getScriptCache: () => ({ put: (k, v) => { cache[k] = v; } }) } };
  vm.createContext(c); vm.runInContext(read('apps-script/EUC_CONVENTION_PFMP_GroupesClasses.gs'), c);
  return c;
}
const A = (id, f) => Object.assign({ id, Eleve: 1, Periode: 100, Annee_scolaire: '2026-2027', Statut: 'CONVENTION_GENEREE', Date_creation: '2026-09-08T08:00:00.000Z' }, f);
const payload = { classeElevesNom: '1TEST', classeConventionId: 10, periodeId: 100, anneeConvention: '2026-2027' };

test('relancer une classe garde la convention existante de chaque élève et n’en crée que pour les autres', () => {
  const c = contexteGeneration([A(500, { Reference_convention: 'R500' }), A(501, { Eleve: 2, Revoked: true })]);
  const r = J(c.EUC_CONVENTION_preparerAccesClasseNom(payload));
  assert.equal(r.total, 3); assert.equal(r.creees, 2); assert.equal(r.reprises, 1);
  assert.equal(c.posts.length, 1); assert.deepEqual(c.posts[0].body.records.map(x => x.fields.Eleve), [2, 3]);
  const ana = r.items.find(i => i.eleveId === 1);
  assert.equal(ana.reprise, true); assert.equal(ana.accessId, 500); assert.equal(ana.token, ''); assert.equal(ana.reference, 'R500');
  assert.equal(ana.urlFormulaire, 'https://base?page=pfmp&rid=500');
});

test('une classe dont tous les élèves ont déjà une convention ne crée rien', () => {
  const c = contexteGeneration([A(500), A(501, { Eleve: 2 }), A(502, { Eleve: 3 })]);
  const r = J(c.EUC_CONVENTION_preparerAccesClasseNom(payload));
  assert.equal(r.creees, 0); assert.equal(r.reprises, 3); assert.equal(c.posts.length, 0);
});

test('parmi plusieurs générations, la convention remplie par l’entreprise est reprise, sinon la plus récente', () => {
  const c = contexteGeneration([]);
  const rows = [A(500), A(501, { Date_creation: '2026-11-02T08:00:00.000Z' }), A(502, { Date_saisie_entreprise: '2026-10-01', Entreprise_siret: '93510938900012' })];
  assert.equal(c.EUC_DEV646_conventionExistante_(rows, 1, 100, '2026-2027').id, 502);
  assert.equal(c.EUC_DEV646_conventionExistante_(rows.slice(0, 2), 1, 100, '2026-2027').id, 501);
  assert.equal(c.EUC_DEV646_conventionExistante_([A(503, { Type_sequence: 'RATTRAPAGE' }), A(504, { Statut_administratif: 'INTERROMPUE' }), A(505, { Annee_scolaire: '2025-2026' })], 1, 100, '2026-2027'), null);
});

test('période déplacée au planning depuis la génération : l’ancienne convention n’est pas reprise', () => {
  const c = contexteGeneration([A(500, { Date_officielle_debut: '2026-11-16' }), A(501, { Eleve: 2, Date_officielle_debut: '2026-11-23' })]);
  const r = J(c.EUC_CONVENTION_preparerAccesClasseNom(payload));
  assert.equal(r.reprises, 1); assert.equal(r.items.find(i => i.eleveId === 2).accessId, 501);
  assert.deepEqual(c.posts[0].body.records.map(x => x.fields.Eleve), [1, 3]);
});

test('impression du lot : convention reprise imprimée par son identifiant, nouvelle par son jeton ; Word refusé pour une reprise', () => {
  const pdf = read('apps-script/EUC_CONVENTION_PFMP_PdfV95.gs'), web = read('apps-script/EUC_CONVENTION_PFMP_WebApp.gs'), ui = read('apps-script/Convention_PFMP_Generateur.html');
  assert.match(pdf, /i\.token\?EUC_CONVENTION_donneesImpressionV80\(i\.token\):EUC_CONVENTION_donneesImpressionParIdV525\(Number\(i\.accessId\)\)/);
  assert.match(web, /réédition Word exige le lien d’origine/);
  assert.match(ui, /déjà existante\(s\) réimprimée\(s\) avec leur QR code d’origine/);
});

/* ---------- Monaco sans NIS ---------- */
const m = { console, JSON, Math, Date, Object, Array, String, Number, Error };
vm.createContext(m); vm.runInContext(read('apps-script/EUC_DEV646_MonacoSansNis.js'), m);
const ENT = [
  { id: 1, Raison_sociale: 'SAM HOTEL FAIRMONT MONTE-CARLO', Enseigne: 'Fairmont Monte Carlo', Adresse: '12 avenue des Spélugues', Commune: 'Monaco', Pays: 'Monaco', NIS: 'EUC-MC-0001' },
  { id: 2, Raison_sociale: 'GARAGE DU PORT', Pays: 'Monaco', NIS: '4520A 01234' },
  { id: 3, Raison_sociale: 'BOULANGERIE SANS NUMERO', Pays: 'Monaco', NIS: '' },
  { id: 4, Raison_sociale: 'FAIRMONT FRANCE', Pays: 'France', SIRET: '12345678901234' }
];

test('recherche par nom : entreprises de Monaco avec un numéro, sans accent ni casse, sans les entreprises françaises', () => {
  assert.deepEqual(J(m.EUC_DEV646_filtrerParNom_(ENT, 'fairmont')).map(x => x.nis), ['EUC-MC-0001']);
  assert.deepEqual(J(m.EUC_DEV646_filtrerParNom_(ENT, 'spelugues')), [], 'on cherche sur le nom, pas l’adresse');
  assert.deepEqual(J(m.EUC_DEV646_filtrerParNom_(ENT, 'Monte Carlo')).map(x => x.nom), ['SAM HOTEL FAIRMONT MONTE-CARLO']);
  assert.deepEqual(J(m.EUC_DEV646_filtrerParNom_(ENT, 'boulangerie')), [], 'sans numéro, introuvable : bureau G205');
  assert.deepEqual(Object.keys(J(m.EUC_DEV646_filtrerParNom_(ENT, 'garage'))[0]).sort(), ['adresse', 'enseigne', 'nis', 'nom', 'ville']);
  assert.throws(() => m.EUC_DEV646_filtrerParNom_(ENT, 'ab'), /3 lettres/);
});

test('numéro interne : EUC-MC-0001, puis le suivant, reconnu comme interne', () => {
  assert.equal(m.EUC_DEV646_numeroSuivant_([]), 'EUC-MC-0001');
  assert.equal(m.EUC_DEV646_numeroSuivant_(ENT.concat([{ NIS: 'EUCMC0007' }])), 'EUC-MC-0008');
  assert.equal(m.EUC_DEV646_interne_('EUCMC0001'), true); assert.equal(m.EUC_DEV646_interne_('4520A 01234'), false);
});

test('création : numéro interne si NIS vide, refus des doublons de nom ou de NIS', () => {
  const f = J(m.EUC_DEV646_preparer_(ENT, { nom: 'Café de Paris', adresse: 'Place du Casino' }, 'EUC-MC-0002'));
  assert.equal(f.NIS, 'EUC-MC-0002'); assert.equal(f.Pays, 'Monaco'); assert.equal(f.Code_postal, '98000'); assert.equal(f.Source_creation, 'ADMIN_DEV646_NUMERO_INTERNE');
  assert.equal(J(m.EUC_DEV646_preparer_(ENT, { nom: 'X', adresse: 'Y', nis: '9999B 00001' }, 'EUC-MC-0002')).NIS, '9999B 00001');
  assert.throws(() => m.EUC_DEV646_preparer_(ENT, { nom: 'Garage du port', adresse: 'Y' }, 'Z'), /porte déjà ce nom/);
  assert.throws(() => m.EUC_DEV646_preparer_(ENT, { nom: 'Autre', adresse: 'Y', nis: '4520A01234' }, 'Z'), /NIS existe déjà/);
  assert.throws(() => m.EUC_DEV646_preparer_(ENT, { nom: '', adresse: 'Y' }, 'Z'), /nom/);
  assert.throws(() => m.EUC_DEV646_preparer_(ENT, { nom: 'Autre', adresse: 'Y', nis: 'EUC-MC-0042' }, 'Z'), /Laissez le NIS vide/);
});

test('administration réservée ; page publique limitée à la recherche par nom', () => {
  const s = read('apps-script/EUC_DEV646_MonacoSansNis.js');
  ['EUC_DEV646_afficher', 'EUC_DEV646_listerMonaco', 'EUC_DEV646_creerMonaco', 'EUC_DEV646_attribuerNumero'].forEach(f => assert.match(s, new RegExp('function ' + f + '\\([^)]*\\) \\{\\n(?:  [^\\n]*\\n)?  EUC_IMPORT_exigerAdminTexte_\\(\\);')));
  const qr = read('apps-script/PFMP_Acces_QR_V116.html');
  assert.match(qr, /\.EUC_DEV646_rechercherMonacoParNom\(texte\)/);
  assert.doesNotMatch(qr, /EUC_DEV646_(creerMonaco|attribuerNumero|listerMonaco)/);
});

test('QR : recherche par nom pour Monaco, entreprise absente → bureau G205, bouton bloqué avec délai', () => {
  const qr = read('apps-script/PFMP_Acces_QR_V116.html');
  assert.match(qr, /Tu n’as pas le NIS \?/);
  assert.match(qr, /n’est pas encore dans notre base.*bureau G205/);
  assert.match(qr, /busy\(go,true,'Recherche…'\)/); assert.match(qr, /30000\);/);
  assert.equal((qr.match(/busy\(go,false\)/g) || []).length, 3, 'succès, erreur et délai rendent la main');
});

test('QR : un échec d’enregistrement renvoie d’abord vers le formulaire en ligne, puis le bureau G205', () => {
  const qr = read('apps-script/PFMP_Acces_QR_V116.html'), web = read('apps-script/EUC_PFMP_WebApp.gs'), dep = read('apps-script/Declaration_Entreprise_DEV603.html');
  assert.match(web, /qr\.secoursUrl=ScriptApp\.getService\(\)\.getUrl\(\)\+'\?page=declaration-entreprise';/);
  assert.match(qr, /Déclare ton entreprise avec le formulaire en ligne.*Si ce formulaire ne fonctionne pas non plus, passe au bureau G205/);
  assert.match(qr, /Avant de passer au bureau G205, essaie le formulaire en ligne/);
  assert.match(qr, /typeof secoursUrl !== 'undefined'/);
  assert.match(dep, /Si tu restes bloqué, passe au bureau G205/);
});

test('branchement : route, lien d’administration, contrôle de release', () => {
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'entreprises-monaco-pfmp':\n      return EUC_DEV646_afficher\(e\);/);
  assert.match(read('apps-script/Admin_PFMP.html'), /\?page=entreprises-monaco-pfmp">Entreprises de Monaco/);
  assert.match(read('scripts/pfmp-release-config.json'), /"page": "entreprises-monaco-pfmp", "scope": "admin", "expected": "Entreprises de Monaco"/);
  const page = read('apps-script/Entreprises_Monaco_DEV646.html');
  assert.match(page, /b\.disabled=on;b\.classList\.toggle\('busy',on\)/); assert.match(page, /DELAI=60000/);
  assert.match(page, /Aucune entreprise de Monaco à afficher/);
});

console.log(n + ' tests DEV646 génération et Monaco réussis');
