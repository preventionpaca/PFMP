'use strict';
/* DEV641 — recherche SIRET sans compte du lycée ; DEV642 — convention de rattrapage. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'apps-script', f), 'utf8');
const VERT = '1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c';
const BLEU = '1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo';

let n = 0;
function test(name, fn) { fn(); n++; }

function ctxSiret(projet, email) {
  const props = { EUC_ENT_ALLOWED_DOMAIN: 'lycee-les-eucalyptus.org', EUC_ENT_GRIST_API_URL: 'https://grist.invalid' };
  const c = { console,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || '' }) },
    Session: { getActiveUser: () => ({ getEmail: () => email }) },
    ScriptApp: { getScriptId: () => projet } };
  vm.createContext(c);
  vm.runInContext(read('EUC_ENT_Config.gs') + '\n' + read('EUC_ENT_ApiEntreprise.gs'), c);
  c.EUC_ENT_validerSiret = v => ({ valide: true, siret: v });
  c.EUC_ENT_verifierDoublonGrist = () => null;
  return c;
}
const SIRET = '73282932000074';

test('un élève sans compte du lycée peut rechercher un SIRET sur le vert', () => {
  const c = ctxSiret(VERT, '');
  const r = c.EUC_ENT_rechercherSiret(SIRET);
  assert.equal(r.source, 'api_navigateur');
  assert.equal(c.EUC_ENT_traiterReponseApiNavigateur({ results: [] }, SIRET).introuvable, true);
});

test('hors vert, la recherche SIRET garde le contrôle d’accès', () => {
  assert.throws(() => ctxSiret('AUTRE_PROJET', '').EUC_ENT_rechercherSiret(SIRET), /non autorisé/);
  assert.throws(() => ctxSiret(BLEU, '').EUC_ENT_rechercherSiret(SIRET), /recette refusé/);
});

test('l’écriture d’une entreprise reste réservée au domaine', () => {
  const src = read('EUC_ENT_Grist.gs');
  const corps = src.slice(src.indexOf('function EUC_ENT_enregistrerEntreprise('));
  assert.match(corps, /^function EUC_ENT_enregistrerEntreprise\(donnees\) \{\n  EUC_ENT_controlerAccesUtilisateur_\(\);/);
});

function ctxConvention(actifs) {
  const posts = [];
  const c = { console, Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, encodeURIComponent,
    Utilities: { getUuid: () => 'uuid', base64EncodeWebSafe: () => 'hash', computeDigest: () => [], DigestAlgorithm: { SHA_256: 'sha' }, Charset: { UTF_8: 'utf8' } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://exemple.invalid/exec' }) } };
  vm.createContext(c);
  vm.runInContext(read('EUC_CONVENTION_PFMP_Service.gs'), c);
  Object.assign(c, {
    EUC_IMPORT_exigerAdminTexte_: () => ({ email: 'admin@exemple.test' }),
    EUC_CONVENTION_lireElevesAdmin: () => [{ id: 7, nom: 'TEST', prenom: 'Élève' }],
    EUC_CONVENTION_lireClassesEtPeriodesAdmin: () => ({ classes: [{ id: 3, nom: 'TCAR' }], periodes: [{ id: 9, type: 'PFMP n°1', debut: '2026-09-28', fin: '2026-10-16' }] }),
    EUC_CONVENTION_verifierPeriodeAutorisee_: () => true,
    EUC_CONVENTION_assurerTableAcces_: () => null,
    EUC_CONVENTION_accesParRequestIdV513_: () => null,
    EUC_CONVENTION_accesActifsV525_: () => actifs,
    EUC_CONVENTION_requestIdV513_: v => String(v || ''),
    EUC_CONVENTION_token_: () => 'secret',
    EUC_CONVENTION_hash_: () => 'digest',
    EUC_CONVENTION_debutRafraichissementV511_: () => null,
    EUC_IMPORT_dateExistanteISO_: v => String(v || ''),
    EUC_ENT_grist: (m, u, b) => { posts.push(b.records[0].fields); return { records: [{ id: 500 }] }; }
  });
  return { c, posts };
}
const demande = extra => Object.assign({ eleveId: 7, classeConventionId: 3, periodeId: 9, anneeConvention: '2026-2027',
  scenarioDates: 'DATES_INDIVIDUELLES', dateDeclareeDebut: '2026-12-21', dateDeclareeFin: '2026-12-24', motifEcartDates: 'Rattrapage' }, extra);
const initiale = id => ({ id, Date_debut: '2026-09-28', Date_fin: '2026-10-16', Type_sequence: 'INITIALE', Numero_sequence: 1, Reference_convention: 'R' + id });

test('sans la case, deux conventions actives bloquent et le message indique le rattrapage', () => {
  const { c, posts } = ctxConvention([initiale(11), initiale(12)]);
  assert.throws(() => c.EUC_CONVENTION_preparerAcces(demande()), /Plusieurs conventions actives[\s\S]*rattrapage/);
  assert.equal(posts.length, 0);
});

test('sans la case, une convention active aux autres dates reste protégée', () => {
  const { c, posts } = ctxConvention([initiale(11)]);
  assert.throws(() => c.EUC_CONVENTION_preparerAcces(demande()), /aucune nouvelle convention/);
  assert.equal(posts.length, 0);
});

test('le rattrapage crée une convention distincte liée à la première, sans toucher aux autres', () => {
  const { c, posts } = ctxConvention([initiale(11), initiale(12)]);
  const r = c.EUC_CONVENTION_preparerAcces(demande({ conventionRattrapage: true }));
  assert.equal(posts.length, 1);
  assert.equal(r.accessId, 500);
  assert.equal(r.idempotent, false);
  const f = posts[0];
  assert.equal(f.Type_sequence, 'RATTRAPAGE');
  assert.equal(f.Numero_sequence, 2);
  assert.equal(f.Convention_origine, 11);
  assert.equal(f.Date_debut, '2026-12-21');
  assert.equal(f.Date_fin, '2026-12-24');
  assert.equal(f.Date_officielle_debut, '2026-09-28');
});

test('le même rattrapage relancé ne crée pas de doublon', () => {
  const deja = { id: 13, Date_debut: '2026-12-21', Date_fin: '2026-12-24', Type_sequence: 'RATTRAPAGE', Numero_sequence: 2, Reference_convention: 'R13' };
  const { c, posts } = ctxConvention([initiale(11), deja]);
  const r = c.EUC_CONVENTION_preparerAcces(demande({ conventionRattrapage: true }));
  assert.equal(posts.length, 0);
  assert.equal(r.accessId, 13);
  assert.equal(r.idempotent, true);
});

test('le rattrapage exige les dates individuelles', () => {
  const { c, posts } = ctxConvention([initiale(11)]);
  assert.throws(() => c.EUC_CONVENTION_preparerAcces(demande({ scenarioDates: 'DEBUT_RETARDE', conventionRattrapage: true })), /Dates individuelles/);
  assert.equal(posts.length, 0);
});

test('le générateur propose la case seulement pour les dates individuelles et l’envoie', () => {
  const h = read('Convention_PFMP_Generateur.html');
  assert.ok(h.includes('id="conventionRattrapage"'));
  assert.ok(h.includes("return individualDates.checked&&scenarioDates.value==='DATES_INDIVIDUELLES';"));
  assert.ok(h.includes('conventionRattrapage:rattrapagePossible()&&conventionRattrapage.checked'));
});

console.log(n + ' tests DEV641 SIRET et rattrapage réussis');
