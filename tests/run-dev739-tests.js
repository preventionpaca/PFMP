/* DEV739 — Géocodage : siège officiel et lieu de stage distinct = deux lignes séparées (données fictives). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const J = x => JSON.parse(JSON.stringify(x));
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };

function ctx(detail, accesRows, geoRows) {
  const k = { console: { log() {} }, JSON, Math, Date, Object, Array, String, Number, Error, RegExp, isFinite, encodeURIComponent,
    EUC_DEV190E_INDEX_TABLE_: 'IDX', EUC_DEV190I_TABLE_: 'DETAIL', EUC_CONVENTION_ACCES_TABLE_: 'ACCES',
    EUC_DEV368_year: v => String(v || '2026-2027'),
    EUC_DEV368_catalog: () => ({ classes: [{ famille: 'BACPRO', classeId: 28, classe: '1MVA2', periodes: [{ id: 65, libelle: 'PFMP n°1' }] }] }),
    EUC_DEV190G_fastRecords_: t => t === 'IDX' ? [{ id: 10, fields: { Annee_scolaire: '2026-2027', Famille: '__DEV427_DETAIL__BACPRO_28_65', Payload_JSON: JSON.stringify(detail), Updated_at: '2026-10-05T08:00:00Z', Actif: true } }] : (t === 'ACCES' ? accesRows || [] : []),
    EUC_IMPORT_lireRecords_: () => geoRows || [],
    Utilities: { base64EncodeWebSafe: b => Buffer.from(b).toString('base64'), computeDigest: (a, v) => Array.from(crypto.createHash('sha256').update(String(v)).digest()), DigestAlgorithm: { SHA_256: 1 }, sleep() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperties() {} }) }, CacheService: { getScriptCache: () => ({ get: () => null }) },
    EUC_LIEN_: () => 'https://exemple.invalid/' };
  vm.createContext(k);
  ['apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js', 'apps-script/EUC_DEV731_GeocodageElargi.js', 'apps-script/EUC_DEV583_CarteSuivi.js', 'apps-script/EUC_DEV649_LieuStageRecap.js', 'apps-script/EUC_DEV705_LieuxStage.js']
    .forEach(f => vm.runInContext(read(f), k, { filename: f }));
  return k;
}
const SIEGE = '10 RUE DES ARTISANS, 06510 CARROS', LIEU = '997 AVENUE DES FLEURS, 06700 SAINT-LAURENT-DU-VAR';
const ligne = o => Object.assign({ eleveId: 1, entreprise: 'ARTISAN FICTIF', adresseEntreprise: SIEGE, siretEntreprise: '11111111100011', lieuStage: '' }, o);
const detail = lignes => ({ famille: 'BACPRO', classe: { id: 28, nom: '1MVA2' }, periode: { id: 65, libelle: 'PFMP n°1' }, lignes });

test('lieu distinct : deux lignes, le siège garde son SIRET, le lieu n’en a pas et rappelle le siège', () => {
  const k = ctx(detail([ligne({ lieuStage: LIEU })]));
  const c = J(k.EUC_DEV517_buildGeoCandidates_({ annee: '2026-2027' }));
  assert.equal(c.length, 2);
  const s = c.find(x => x.typeLieu === 'SIEGE'), l = c.find(x => x.typeLieu === 'LIEU_STAGE');
  assert.equal(s.siret, '11111111100011'); assert.match(s.adresse, /CARROS/);
  assert.equal(l.siret, ''); assert.match(l.adresse, /SAINT-LAURENT/); assert.equal(l.siegeAdresse, SIEGE); assert.equal(l.siegeSiret, '11111111100011');
  assert.notEqual(s.key, l.key, 'clés distinctes : valider le lieu ne déplace jamais le siège');
  assert.equal(l.key, k.EUC_DEV441_geoKey_('ARTISAN FICTIF', k.EUC_DEV443_normalizeAddress_(LIEU), ''), 'même identité que la carte du book (EUC_DEV705_position_)');
  assert.equal(l.elevesAccueillis, 1); assert.equal(s.elevesAccueillis, 1);
});

test('pas de ligne lieu : stage au siège, recopie du siège, siège numéroté (même code postal, même voie)', () => {
  [ '', SIEGE, '12 RUE DES ARTISANS, 06510 CARROS' ].forEach(lieu => {
    const c = J(ctx(detail([ligne({ lieuStage: lieu })])).EUC_DEV517_buildGeoCandidates_({ annee: '2026-2027' }));
    assert.equal(c.length, 1, lieu); assert.equal(c[0].typeLieu, 'SIEGE');
  });
});

test('convention en ligne (accès) : l’adresse du siège n’est plus remplacée par le lieu, le lieu est porté à part', () => {
  const acces = [{ id: 1, fields: { Annee_scolaire: '2026-2027', Classe_convention: 28, Periode: 65, Eleve: 7, Entreprise_raison_sociale: 'ARTISAN FICTIF', Entreprise_siret: '11111111100011', Entreprise_adresse: '10 RUE DES ARTISANS', Entreprise_code_postal: '06510', Entreprise_commune: 'CARROS', Lieu_stage_adresse: '997 AVENUE DES FLEURS', Lieu_stage_code_postal: '06700', Lieu_stage_commune: 'SAINT-LAURENT-DU-VAR' } }];
  const k = ctx(detail([]), acces);
  const d = J(k.EUC_DEV513_geoAccessDetails_({ annee: '2026-2027' }));
  const l = d[0].lignes[0];
  assert.match(l.adresseEntreprise, /CARROS/); assert.equal(l.siretEntreprise, '11111111100011'); assert.match(l.lieuStage, /SAINT-LAURENT/);
  const c = J(k.EUC_DEV517_buildGeoCandidates_({ annee: '2026-2027' }));
  assert.deepEqual(c.map(x => x.typeLieu).sort(), ['LIEU_STAGE', 'SIEGE']);
});

test('ancienne ligne enregistrée sous le SIRET avec l’adresse du lieu : le siège est à regéocoder, le lieu reprend sa ligne propre', () => {
  const k0 = ctx(detail([])), cleLieu = k0.EUC_DEV441_geoKey_('ARTISAN FICTIF', k0.EUC_DEV443_normalizeAddress_(LIEU), '');
  const geo = [{ id: 5, Cle_adresse: 'ancienne', SIRET: '11111111100011', Entreprise: 'ARTISAN FICTIF', Adresse_source: LIEU, Pays: 'FRANCE', Latitude: 43.66, Longitude: 7.18, Statut: 'VALIDE_MANUELLEMENT' },
    { id: 6, Cle_adresse: cleLieu, SIRET: '', Entreprise: 'ARTISAN FICTIF', Adresse_source: LIEU, Pays: 'FRANCE', Latitude: 43.66, Longitude: 7.18, Statut: 'GEOCODE_AUTOMATIQUE' }];
  const c = J(ctx(detail([ligne({ lieuStage: LIEU })]), [], geo).EUC_DEV517_buildGeoCandidates_({ annee: '2026-2027' }));
  const s = c.find(x => x.typeLieu === 'SIEGE'), l = c.find(x => x.typeLieu === 'LIEU_STAGE');
  assert.equal(s.statut, 'A_REGEOCODER'); assert.equal(s.latitude, null);
  assert.equal(l.statut, 'GEOCODE_AUTOMATIQUE'); assert.equal(l.latitude, 43.66);
});

test('carte du book : les lignes lieu de stage ne deviennent jamais des points d’entreprise ; page de géocodage étiquetée', () => {
  const book = read('apps-script/EUC_PFMP_DEV538_BookQuotas.js');
  assert.match(book, /return x\.typeLieu!=='LIEU_STAGE'&&EUC_DEV538_geoOk_/);
  const html = read('apps-script/Geocodage_PFMP_DEV441.html');
  assert.match(html, /function typeLieu739\(x\)/); assert.match(html, /Lieu de stage<\/span>/); assert.match(html, /Siège officiel : /);
  assert.match(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js'), /EUC_DEV517_GEO_INDEX_SCHEMA_='DEV739-GEO-7'/, 'index géographique renouvelé');
});

console.log('\n' + n + ' tests DEV739 réussis.');
