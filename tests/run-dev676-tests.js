/* DEV676 — Codes par lot : proviseur adjoint et direction déléguée facultatifs. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const P = { id: 11, libelle: 'PFMP n°1', debutFr: '23/11/2026', finFr: '18/12/2026' };
function ctx(signs, pps) {
  const appels = [];
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, __appels: appels,
    Utilities: { formatDate: () => '18/12/2026' }, EUC_DEV368_year: y => y || '2026-2027', EUC_DEV368_admin: () => ({ email: 'admin' }), EUC_DEV368_catalog: () => ({ classes: [] }),
    EUC_DEV456_familyCacheGet_: (y, f) => f === 'BACPRO' ? { classes: [{ classeId: 1, classe: '1CAR', periodes: [P] }, { classeId: 2, classe: '1MELEC2', periodes: [P] }] } : { classes: [] },
    EUC_V155_professeursPrincipaux_: id => (pps || {})[id] || [], EUC_LIEN_: () => 'https://pfmp.example.test/',
    EUC_IMPORT_lireRecords_: t => t === 'EUC_RESPONSABLES_CAMPAGNES_PP_PFMP' ? (signs || []) : [],
    EUC_ENT_grist: (m, u, b) => { appels.push({ m, u, b }); return m === 'get' ? (u === '/tables' ? { tables: [{ id: 'EUC_RESPONSABLES_CAMPAGNES_PP_PFMP' }] } : { columns: [] }) : {}; } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js'), k); vm.runInContext(read('apps-script/EUC_DEV674_CampagneNiveau.js'), k);
  return k;
}
const Q = { annee: '2026-2027', famille: 'BACPRO', niveau: 'Première', periodeCle: 'PFMP N°1|2026-11-23|2026-12-18' };
test('lot sans signataires : plus bloquant ; seul un professeur principal ou un courriel manquant bloque', () => {
  const ok = J(ctx([], { 1: [{ id: 7, nom: 'M. A', email: 'a@ac-nice.fr' }], 2: [{ id: 8, nom: 'M. B', email: 'b@ac-nice.fr' }] }).EUC_DEV444_campaignPreview(Q));
  assert.deepEqual(ok.blocking, []); assert.equal(ok.recipients, 2);
  const ko = J(ctx([], { 1: [{ id: 7, nom: 'M. A', email: 'a@ac-nice.fr' }] }).EUC_DEV444_campaignPreview(Q));
  assert.deepEqual(ko.blocking, ['1MELEC2 : aucun professeur principal']);
});
test('signature du courriel : signataires renseignés, sinon « L’équipe PFMP »', () => {
  const k = ctx();
  assert.deepEqual(J(k.EUC_DEV676_signature_({})), ['L’équipe PFMP', 'Lycée Les Eucalyptus']);
  assert.deepEqual(J(k.EUC_DEV676_signature_({ adjointNom: 'Mme X' })), ['Mme X', 'Proviseur adjoint']);
  const corps = k.EUC_DEV444_ppMailBody_({ classe: '1CAR', periode: 'PFMP n°1', debut: '23/11/2026', fin: '18/12/2026', adjointNom: '', ddfNom: '' }, { nom: 'M. A' }, { code: 'C', expiration: '2026-12-18T22:59:59Z' });
  assert.match(corps, /Cordialement,\n\nL’équipe PFMP\nLycée Les Eucalyptus$/); assert.doesNotMatch(corps, /\nProviseur adjoint/);
});
test('enregistrement des signataires : lignes vides ignorées, plus d’erreur', () => {
  const k = ctx([]); k.EUC_DEV444_saveCampaignSignatures(Object.assign({}, Q, { classes: [{ annee: '2026-2027', classeId: 1, classe: '1CAR', adjointNom: '', adjointEmail: '', ddfNom: '', ddfEmail: '' }, { annee: '2026-2027', classeId: 2, classe: '1MELEC2', adjointNom: 'Mme X', adjointEmail: '', ddfNom: '', ddfEmail: '' }] }));
  const posts = k.__appels.filter(a => a.m === 'post' && /records/.test(a.u)); assert.equal(posts.length, 1); assert.equal(posts[0].b.records[0].fields.Classe_id, 2);
});
test('page : signature masquée par défaut, bouton pour la personnaliser', () => {
  const h = read('apps-script/Acces_PP_Admin_DEV441.html');
  assert.match(h, /\.sans-sign \.sign\{display:none\}/);
  const df = new Function('return ' + h.match(/function dateFr\(v\)\{[^\n]*?toLocaleDateString\('fr-FR'\)\}/)[0])(); assert.equal(df('1792187999'), new Date(1792187999000).toLocaleDateString('fr-FR')); assert.equal(df(''), ''); assert.match(h, /Personnaliser la signature \(facultatif\)/); assert.match(h, /signé « L’équipe PFMP — Lycée Les Eucalyptus »/);
});
console.log(n + ' tests DEV676 réussis.');
