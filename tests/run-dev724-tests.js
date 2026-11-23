'use strict';
/* DEV724 — Book des entreprises (administration) : corriger l'adresse d'une entreprise (profil, position, base). Données fictives. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function contexte(o) {
  o = o || {};
  const appels = [], profils = o.profils || [], fiche = o.fiche || null;
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, encodeURIComponent, __appels: appels, __profils: profils,
    EUC_DEV538_admin_: () => { if (o.refus) throw new Error('Accès réservé'); return { email: 'admin@ex.test' }; },
    EUC_DEV538_t_: v => String(v == null ? '' : v).trim(), EUC_DEV538_fields_: r => (r && r.fields) || r || {}, EUC_DEV538_n_: v => Number(v) || 0,
    EUC_DEV562_PROFILE_TABLE_: 'EUC_ENTREPRISES_PROFILS',
    EUC_DEV562_companyKey_: q => String((q || {}).identity || ''), EUC_DEV562_trim_: (v, m) => String(v == null ? '' : v).trim().slice(0, m || 500),
    EUC_DEV562_ensureProfileTable_: () => appels.push(['ensureProfil']), EUC_DEV562_ensureTable_: (t, cols) => appels.push(['ensureCols', t, cols.map(c => c[0])]),
    EUC_DEV562_profileRow_: q => profils.filter(r => r.fields.Cle_entreprise === q.identity).sort((a, b) => b.id - a.id)[0] || null,
    EUC_DEV538_optionalRecords_: () => profils,
    EUC_DEV547_city_: a => (String(a).match(/\d{5}\s+(.+)$/) || [])[1] || '',
    EUC_DEV441_GEO_URL_: 'https://geo.test/search',
    EUC_DEV540_geoCandidate_: (features) => features[0] ? { feature: features[0], specific: features[0].properties.type !== 'municipality' } : null,
    UrlFetchApp: { fetch: url => { appels.push(['fetch', url]); return { getContentText: () => JSON.stringify(o.geo || { features: [] }) }; } },
    EUC_ENT_verifierDoublonGrist: s => fiche && fiche.SIRET === s ? Object.assign({ id: 501 }, fiche) : null,
    EUC_DEV646_table_: () => 'EUC_ENTREPRISES',
    EUC_ENT_grist(method, p, body) {
      appels.push([method, p, body && J(body)]);
      if (/EUC_ENTREPRISES_PROFILS/.test(p)) { if (method === 'post') body.records.forEach(r => profils.push({ id: 100 + profils.length, fields: r.fields })); else body.records.forEach(r => Object.assign(profils.find(x => x.id === r.id).fields, r.fields)); }
      else if (/EUC_ENTREPRISES/.test(p) && method === 'patch') body.records.forEach(r => Object.assign(fiche, r.fields));
      return {};
    } };
  vm.createContext(k);
  ['apps-script/EUC_DEV723_EntrepriseRetenue.js', 'apps-script/EUC_DEV724_AdresseBook.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
  k.EUC_DEV665_t_ = v => v == null ? '' : String(v).trim().replace(/\s+/g, ' ');
  return k;
}
const REF = { identity: 'SIRET|45100930200014', siret: '45100930200014', entreprise: 'BYMYCAR COTE D AZUR', adresse: 'AVENUE DES BAUMETTES 06270 VILLENEUVE-LOUBET' };
const GEO = { features: [{ geometry: { coordinates: [7.12, 43.64] }, properties: { type: 'housenumber', label: '62 Avenue des Baumettes 06270 Villeneuve-Loubet' } }] };

test('correction : profil de l’entreprise (adresse corrigée, adresse d’avant, position, auteur), fiche de la base du même SIRET', () => {
  const fiche = { SIRET: '45100930200014', Numero_voie: 'AVENUE DES BAUMETTES', Adresse_complete: 'AVENUE DES BAUMETTES', Code_postal: '06270', Commune: 'VILLENEUVE-LOUBET', Telephone: '04' };
  const k = contexte({ fiche, geo: GEO });
  const r = J(k.EUC_DEV724_corrigerAdresse(Object.assign({}, REF, { voie: '62 avenue des Baumettes', cp: '06 270', ville: 'Villeneuve-Loubet', base: true })));
  assert.equal(r.adresse, '62 avenue des Baumettes, 06270 VILLENEUVE-LOUBET');
  assert.deepEqual(r.position, { latitude: 43.64, longitude: 7.12, libelle: '62 Avenue des Baumettes 06270 Villeneuve-Loubet', numero: true });
  const p = k.__profils[0].fields;
  assert.equal(p.Cle_entreprise, 'SIRET|45100930200014'); assert.equal(p.Adresse_corrigee, r.adresse); assert.equal(p.Adresse_avant_correction, REF.adresse);
  assert.equal(p.Latitude_corrigee, 43.64); assert.equal(p.Adresse_corrigee_par, 'admin@ex.test');
  assert.deepEqual(k.__appels.find(a => a[0] === 'ensureCols')[2], ['Adresse_corrigee', 'Adresse_avant_correction', 'Latitude_corrigee', 'Longitude_corrigee', 'Adresse_corrigee_le', 'Adresse_corrigee_par']);
  assert.match(k.__appels.find(a => a[0] === 'fetch')[1], /^https:\/\/geo\.test\/search\?q=62%20avenue%20des%20Baumettes%2C%2006270%20VILLENEUVE-LOUBET&limit=5&postcode=06270$/);
  assert.equal(fiche.Numero_voie, '62 avenue des Baumettes'); assert.equal(fiche.Telephone, '04'); assert.equal(r.base.misAJour, true);
  assert.ok(!k.__appels.some(a => a[0] === 'delete'));
});

test('nouvelle correction : même ligne de profil, adresse d’avant conservée ; sans demande, base intacte ; position absente si seule la commune est trouvée', () => {
  const fiche = { SIRET: '45100930200014', Numero_voie: 'AV' };
  const k = contexte({ fiche, geo: { features: [{ geometry: { coordinates: [7, 43] }, properties: { type: 'municipality' } }] } });
  k.EUC_DEV724_corrigerAdresse(Object.assign({}, REF, { voie: '60 av', cp: '06270', ville: 'V' }));
  const r = J(k.EUC_DEV724_corrigerAdresse(Object.assign({}, REF, { adresse: '60 av, 06270 V', voie: '62 av', cp: '06270', ville: 'V' })));
  assert.equal(k.__profils.length, 1, 'une seule ligne de profil');
  assert.equal(k.__profils[0].fields.Adresse_avant_correction, REF.adresse, 'l’adresse d’origine reste celle d’avant la première correction');
  assert.equal(r.position, null); assert.equal(k.__profils[0].fields.Latitude_corrigee, null);
  assert.equal(r.base.demande, false); assert.equal(fiche.Numero_voie, 'AV');
});

test('contrôles : administration seulement, voie, code postal et ville obligatoires ; Monaco non géocodé', () => {
  assert.throws(() => contexte({ refus: true }).EUC_DEV724_corrigerAdresse(Object.assign({}, REF, { voie: '1', cp: '06270', ville: 'V' })), /Accès réservé/);
  const k = contexte();
  assert.throws(() => k.EUC_DEV724_corrigerAdresse(Object.assign({}, REF, { voie: '', cp: '06270', ville: 'V' })), /numéro et la voie/);
  assert.throws(() => k.EUC_DEV724_corrigerAdresse(Object.assign({}, REF, { voie: '1', cp: '627', ville: 'V' })), /5 chiffres/);
  assert.throws(() => k.EUC_DEV724_corrigerAdresse(Object.assign({}, REF, { voie: '1', cp: '06270', ville: '' })), /ville/);
  assert.equal(k.__profils.length, 0, 'rien écrit');
  const r = J(k.EUC_DEV724_corrigerAdresse(Object.assign({}, REF, { voie: '2 bd', cp: '98000', ville: 'Monaco', base: true, siret: '' })));
  assert.equal(r.position, null); assert.ok(!k.__appels.some(a => a[0] === 'fetch')); assert.match(r.base.message, /pas de SIRET/);
});

test('book : adresse et position corrigées appliquées par clé ou SIRET, adresse d’avant gardée, ville recalculée ; profil sans correction ignoré', () => {
  const k = contexte();
  const lignes = [{ id: 1, fields: { Cle_entreprise: 'SIRET|45100930200014', SIRET: '45100930200014', Adresse_corrigee: '62 av, 06270 VILLENEUVE-LOUBET', Latitude_corrigee: 43.6, Longitude_corrigee: 7.1, Adresse_corrigee_le: '2026-11-23T10:00:00Z', Adresse_corrigee_par: 'a@ex.test' } },
    { id: 2, fields: { Cle_entreprise: 'X|AUTRE', Site_internet: 'https://x.test' } },
    { id: 3, fields: { Cle_entreprise: 'NOM|GARAGE', Adresse_corrigee: '5 rue A, 06000 NICE', Latitude_corrigee: null, Longitude_corrigee: null } }];
  const list = [{ identity: 'SIRET|45100930200014', siret: '45100930200014', adresse: 'AVENUE 06270 VILLENEUVE-LOUBET', latitude: 43, longitude: 7 },
    { identity: 'X|AUTRE', siret: '', adresse: '1 rue B 06000 NICE', latitude: 1, longitude: 2 }, { identity: 'NOM|GARAGE', siret: '', adresse: 'rue A 06000 NICE', latitude: 5, longitude: 6 }];
  const out = J(k.EUC_DEV724_appliquer_(list, lignes));
  assert.deepEqual([out[0].adresse, out[0].adresseSource, out[0].latitude, out[0].ville, out[0].adresseCorrigeeLe], ['62 av, 06270 VILLENEUVE-LOUBET', 'AVENUE 06270 VILLENEUVE-LOUBET', 43.6, 'VILLENEUVE-LOUBET', '2026-11-23']);
  assert.equal(out[1].adresse, '1 rue B 06000 NICE'); assert.equal(out[1].adresseCorrigee, undefined);
  assert.equal(out[2].adresse, '5 rue A, 06000 NICE'); assert.equal(out[2].latitude, 5, 'sans position corrigée, la position connue reste');
  const k2 = contexte(); const par = J(k2.EUC_DEV724_appliquer_([{ identity: 'AUTRE-CLE', siret: '45100930200014', adresse: 'a' }], lignes));
  assert.equal(par[0].adresse, '62 av, 06270 VILLENEUVE-LOUBET', 'retrouvée par SIRET');
});

test('branchements : réponse du book et fiche de l’administration (bouton protégé, préremplissage, case base selon SIRET)', () => {
  const src = read('apps-script/EUC_PFMP_DEV538_BookQuotas.js'), h = read('apps-script/Book_Entreprises_DEV538.html');
  assert.match(src, /function EUC_DEV547_bookResponse_\(q,list\)\{\/\* DEV724 [^*]*\*\/if\(typeof EUC_DEV724_appliquer_==='function'\)list=EUC_DEV724_appliquer_\(list\);var page=/);
  const admin = h.slice(h.indexOf('<div id="profileAdmin">'), h.indexOf('<div id="profileStatus"'));
  ['id="adrVoie"', 'id="adrCp"', 'id="adrVille"', 'id="adrBase" type="checkbox" checked', 'id="adrSave" type="button">Enregistrer l’adresse</button>'].forEach(x => assert.ok(admin.includes(x), x));
  assert.match(h, /\$\('siteSave'\)\.onclick=saveSite;\$\('adrSave'\)\.onclick=saveAdresse;/);
  assert.match(h, /call\('EUC_DEV724_corrigerAdresse',[^]*?\$\('adrSave'\),'Enregistrement…',r=>\{/, 'bouton bloqué avec spinner et délai (call)');
  assert.match(h, /m=>\{if\(CURRENT!==c\)return;\$\('adrStatus'\)\.className='error';\$\('adrStatus'\)\.textContent=m\}\)/, 'erreur affichée');
  assert.match(h, /loadProfile\(c\);adrRemplir\(c\)\}/); assert.match(h, /\$\('adrBaseLabel'\)\.style\.display=c\.siret\?'':'none'/);
  /* Découpage de l'adresse pour le préremplissage. */
  const m = h.match(/function adrDecouper\(a\)\{[^\n]*\}/)[0], ctx = {}; vm.createContext(ctx); vm.runInContext(m, ctx);
  assert.deepEqual(J(ctx.adrDecouper('AVENUE DES BAUMETTES 06270 VILLENEUVE-LOUBET')), { voie: 'AVENUE DES BAUMETTES', cp: '06270', ville: 'VILLENEUVE-LOUBET' });
  assert.deepEqual(J(ctx.adrDecouper('62 av, 06270 VILLENEUVE')), { voie: '62 av', cp: '06270', ville: 'VILLENEUVE' });
});

console.log(n + ' tests DEV724 réussis.');
