/* DEV677 — Courriel des codes PP : message et signature saisis, aperçu exact et confirmation avant envoi. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const P = { id: 11, libelle: 'PFMP n°1', debutFr: '23/11/2026', finFr: '18/12/2026' };
function ctx(pps) {
  const mails = [];
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, __mails: mails,
    Utilities: { formatDate: () => '18/12/2026 à 23:59', getUuid: () => 'abcdef12-0000', parseDate: () => new Date('2099-12-18T22:59:59Z'), computeDigest: () => [1], base64EncodeWebSafe: () => 'h', DigestAlgorithm: {} },
    EUC_DEV368_year: y => y || '2026-2027', EUC_DEV368_admin: () => ({ email: 'admin' }), EUC_DEV368_catalog: () => ({ classes: [] }), EUC_LIEN_: () => 'https://pfmp.example.test/',
    EUC_DEV456_familyCacheGet_: (y, f) => f === 'BACPRO' ? { classes: [{ classeId: 1, classe: '1CAR', periodes: [P] }] } : { classes: [] },
    EUC_V155_professeursPrincipaux_: id => (pps || {})[id] || [], EUC_IMPORT_lireRecords_: () => [],
    Session: { getEffectiveUser: () => ({ getEmail: () => 'compte.pfmp@example.test' }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: m => mails.push(m) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    EUC_ENT_grist: (m, u, b) => m === 'get' ? (u === '/tables' ? { tables: [{ id: 'EUC_ACCES_PP_PFMP' }] } : { columns: [] }) : (m === 'post' && b.records ? { records: b.records.map((r, i) => ({ id: i + 1 })) } : {}) };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js'), k); vm.runInContext(read('apps-script/EUC_DEV674_CampagneNiveau.js'), k);
  return k;
}
const Q = { annee: '2026-2027', famille: 'BACPRO', niveau: 'Première', periodeCle: 'PFMP N°1|2026-11-23|2026-12-18' };
const PP = { 1: [{ id: 7, nom: 'M. A', email: 'a@ac-nice.fr' }] };
test('message et signature nettoyés et bornés', () => {
  const k = ctx(), r = J(k.EUC_DEV677_perso_({ message: '  Bonjour\r\n\n\n\nà tous\u0007 ', signature: 'x'.repeat(400) }));
  assert.equal(r.message, 'Bonjour\n\nà tous'); assert.equal(r.signature.length, 300); assert.deepEqual(J(k.EUC_DEV677_perso_(null)), { message: '', signature: '' });
});
test('aperçu : objet, compte expéditeur, nombre de destinataires, message placé après « Bonjour », signature saisie, code masqué', () => {
  const a = J(ctx(PP).EUC_DEV677_apercu(Object.assign({ message: 'Merci avant vendredi.', signature: 'R. Dupont\nDDFPT' }, Q)));
  assert.equal(a.expediteur, 'compte.pfmp@example.test'); assert.equal(a.destinataires, 1); assert.equal(a.objet, '[PFMP] Affectations à compléter — 1CAR — PFMP n°1');
  assert.match(a.corps, /^Merci avant vendredi\.\n\nDans le cadre/); assert.match(a.corps, /Code temporaire : XXXXX-XXXXX-XXXXX-XXXXX/); assert.match(a.corps, /Cordialement,\n\nR\. Dupont\nDDFPT$/);
});
test('aperçu refusé si le lot est bloqué (aucun courriel préparé)', () => {
  const k = ctx({}); assert.throws(() => k.EUC_DEV677_apercu(Q), /Campagne incomplète/); assert.equal(k.__mails.length, 0);
});
test('envoi : le courriel envoyé contient le message et la signature confirmés, avec le vrai code', () => {
  const k = ctx(PP); k.EUC_DEV444_sendCampaign(Object.assign({ message: 'Merci avant vendredi.', signature: 'R. Dupont' }, Q));
  assert.equal(k.__mails.length, 1); assert.match(k.__mails[0].body, /Merci avant vendredi\./); assert.match(k.__mails[0].body, /R\. Dupont$/); assert.doesNotMatch(k.__mails[0].body, /XXXXX/); assert.equal(k.__mails[0].replyTo, undefined);
});
test('DEV682 : envoi rejoué avec le même identifiant : aucun nouveau code ni courriel ; classe envoyée il y a moins de 10 minutes refusée', () => {
  const k = ctx(PP), store = {}; k.CacheService = { getScriptCache: () => ({ get: c => store[c] || null, put: (c, v) => { store[c] = v; } }) };
  const lot = Object.assign({ envoiId: 'abc123', message: 'Cher collègue,' }, Q);
  const r1 = J(k.EUC_DEV444_sendCampaign(lot)); assert.equal(k.__mails.length, 1); assert.ok(!r1.deja);
  const r2 = J(k.EUC_DEV444_sendCampaign(lot)); assert.equal(k.__mails.length, 1, 'pas de second courriel'); assert.equal(r2.deja, true); assert.equal(r2.campaignId, r1.campaignId);
  const recent = [{ id: 5, Actif: true, Annee_scolaire: '2026-2027', Classe_id: 1, Periode_id: 11, Campagne_id: 'PP-x', Date_creation: new Date(Date.now() - 2 * 60000).toISOString() }];
  assert.deepEqual(J(k.EUC_DEV682_recents_([{ annee: '2026-2027', classeId: 1, periodeId: 11, classe: '1CAR' }], recent, Date.now())), ['1CAR']);
  recent[0].Date_creation = new Date(Date.now() - 11 * 60000).toISOString();
  assert.deepEqual(J(k.EUC_DEV682_recents_([{ annee: '2026-2027', classeId: 1, periodeId: 11, classe: '1CAR' }], recent, Date.now())), []);
  const h = read('apps-script/Acces_PP_Admin_DEV441.html'); assert.match(h, /envoiId:Date\.now\(\)\.toString\(36\)/); assert.match(h, /r\.deja\?'Envoi déjà effectué/);
});
test('page : zone de message, signature, fenêtre d’aperçu avec confirmation et annulation', () => {
  const h = read('apps-script/Acces_PP_Admin_DEV441.html');
  assert.match(h, /id="msgPerso"/); assert.match(h, /id="signPerso"/); assert.match(h, /role="dialog" aria-modal="true"/);
  assert.match(h, /'EUC_DEV677_apercu',lot,/); assert.match(h, /\$\('confirmEnvoi'\)\.onclick=\(\)=>envoyer\(lot\)/, 'le lot envoyé est celui de l’aperçu');
  assert.match(h, /appel\(\$\('confirmEnvoi'\),'Envoi en cours…','EUC_DEV444_sendCampaign',lot,/); assert.match(h, /Envoyé depuis :/);
  assert.doesNotMatch(h, /if\(!confirm\('Générer /, 'plus de simple boîte confirm');
  assert.match(h, /localStorage/); assert.match(h, /try\{localStorage/);
});
console.log(n + ' tests DEV677 réussis.');
