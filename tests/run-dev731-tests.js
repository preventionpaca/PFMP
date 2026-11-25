'use strict';
/* DEV731 — géocodage élargi : nettoyage d'adresse, essais successifs (avec/sans CP, points d'intérêt), Monaco,
 * nouvelles tentatives, point validé conservé, décompte exact. Moteurs simulés, données fictives. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
function ctx() {
  const k = { console, encodeURIComponent, isFinite, Date, Math, JSON, String, Number, Object, Array, RegExp,
    Utilities: { DigestAlgorithm: {}, base64EncodeWebSafe: () => 'd', computeDigest: () => [1], sleep: () => {} }, EUC_DEV667_coordOk_: (la, lo) => la > 41 && la < 51 && lo > -5 && lo < 10 };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV640_Liens.js') + '\n' + read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js') + '\n' + read('apps-script/EUC_DEV731_GeocodageElargi.js'), k); return k;
}
const feat = (label, postcode, type, score, c, city) => ({ geometry: { coordinates: c || [7.2, 43.7] }, properties: { label, postcode, type, score, city: city || (label.match(/\d{5} (.+)$/) || [])[1] || 'Nice' } });
function moteur(reponses) { const urls = []; const get = url => { urls.push(decodeURIComponent(url)); for (const [motif, rep] of reponses) if (motif.test(decodeURIComponent(url))) return rep; return { features: [] }; }; get.urls = urls; return get; }

test('nettoyage : « 2rue », abréviations, BP/CEDEX retirés ; ville après le code postal', () => {
  const k = ctx();
  assert.strictEqual(k.EUC_DEV731_nettoyer_('2rue du Gabian 98000 Monaco'), '2 RUE DU GABIAN 98000 MONACO');
  assert.strictEqual(k.EUC_DEV731_nettoyer_('1 AV PRINCE HEREDITAIRE ALBERT 98000'), '1 AVENUE PRINCE HEREDITAIRE ALBERT 98000');
  assert.strictEqual(k.EUC_DEV731_nettoyer_('3 BD DE LA MER, BP 139, 06000 NICE CEDEX 1'), '3 BOULEVARD DE LA MER, 06000 NICE');
  assert.strictEqual(k.EUC_DEV731_nettoyer_('1180 route D6007 06270 VILLENEUVE LOUBET'), '1180 ROUTE DEPARTEMENTALE 6007 06270 VILLENEUVE LOUBET');
  assert.strictEqual(k.EUC_DEV731_nettoyer_('LE GABRE 06670 ST MARTIN DU VAR'), 'LE GABRE 06670 SAINT MARTIN DU VAR');
  assert.strictEqual(k.EUC_DEV731_ville_('7 CHEMIN DES ARBORAS 06000 NICE'), 'NICE');
});

test('France : le code postal saisi est faux → recherche sans CP dans le département, point proposé « à contrôler »', () => {
  const k = ctx(), get = moteur([[/postcode=06000/, { features: [feat('7 Chemin de la Costière 06000 Nice', '06000', 'housenumber', 0.46)] }],
    [/q=7 CHEMIN DES ARBORAS 06000 NICE&limit=5$/, { features: [feat('7 Chemin des Arboras 06200 Nice', '06200', 'housenumber', 0.8, [7.21, 43.68]), feat('7 Chemin des Arboras 13000 Marseille', '13000', 'housenumber', 0.9)] }]]);
  const f = J(k.EUC_DEV731_champsFrance_({ adresse: '7 CHEMIN DES ARBORAS 06000 NICE', codePostal: '06000', entreprise: 'GARAGE FICTIF' }, get));
  assert.strictEqual(f.Statut, 'A_VALIDER_MANUELLEMENT'); assert.strictEqual(f.Latitude, 43.68); assert.strictEqual(f.Code_postal, '06200');
  assert.ok(/département/.test(f.Commentaire) && /recherche élargie/.test(f.Commentaire));
});

test('France : adresse exacte → placée automatiquement dès le premier essai (un seul appel)', () => {
  const k = ctx(), get = moteur([[/postcode=06100/, { features: [feat('3 Boulevard de la Mer 06100 Nice', '06100', 'housenumber', 0.9)] }]]);
  const f = k.EUC_DEV731_champsFrance_({ adresse: '3 BD DE LA MER 06100 NICE', codePostal: '06100' }, get);
  assert.strictEqual(f.Statut, 'GEOCODE_AUTOMATIQUE'); assert.strictEqual(get.urls.length, 1); assert.ok(/3 BOULEVARD DE LA MER/.test(get.urls[0]));
});

test('France : lieu sans voie (aéroport) → point d’intérêt proposé ; rien trouvé → message clair avec la marque « recherche élargie »', () => {
  const k = ctx(), poi = { features: [{ geometry: { coordinates: [7.2159, 43.6593] }, properties: { name: ["Aéroport de Nice-Côte d'Azur"], city: ['Nice'], postcode: ['06000', '06200'], score: 0.55 } }] };
  const get = moteur([[/index=poi&limit=3&q=AEROPORT DE NICE$/, poi]]);
  const f = J(k.EUC_DEV731_champsFrance_({ adresse: 'Aéroport de Nice, 06200 Nice', codePostal: '06200', entreprise: 'LOUEUR FICTIF' }, get));
  assert.strictEqual(f.Statut, 'A_VALIDER_MANUELLEMENT'); assert.strictEqual(f.Precision, 'poi'); assert.ok(/Aéroport de Nice-Côte d'Azur/.test(f.Commentaire));
  const g = J(k.EUC_DEV731_champsFrance_({ adresse: 'ZI LIEU INCONNU 06510 CARROS', codePostal: '06510', entreprise: 'X' }, moteur([])));
  assert.strictEqual(g.Statut, 'COORDONNEES_A_RENSEIGNER'); assert.ok(/recherche élargie/.test(g.Commentaire) && /Coller GPS/.test(g.Commentaire));
  const h = J(k.EUC_DEV731_champsFrance_({ adresse: 'Aéroport, 06200 Nice', codePostal: '06200' }, moteur([[/index=poi/, { features: [{ geometry: { coordinates: [5.2, 43.4] }, properties: { name: ['Aéroport de Marseille'], postcode: ['13700'], score: 0.9 } }] }]])));
  assert.strictEqual(h.Statut, 'COORDONNEES_A_RENSEIGNER', 'un lieu d’un autre département est écarté');
});

test('pas de faux point : « Promenade des Arts » ≠ « 455 Promenade des Anglais », RD 6098 ≠ RD 6007, autre commune écartée', () => {
  const k = ctx();
  assert.strictEqual(k.EUC_DEV540_geoCandidate_([feat('Promenade des Arts 06000 Nice', '06000', 'street', 0.6)], 'AEROPOLE ZAC DE L ARENAS 455 PROMENADE DES ANGLAIS 06000 NICE', '06000'), null);
  assert.strictEqual(k.EUC_DEV540_geoCandidate_([feat('Route Départementale 6098 06270 Villeneuve-Loubet', '06270', 'street', 0.7)], '1180 ROUTE DEPARTEMENTALE 6007 06270 VILLENEUVE LOUBET', '06270'), null);
  assert.ok(k.EUC_DEV540_geoCandidate_([feat('Route Départementale 6007 06270 Villeneuve-Loubet', '06270', 'street', 0.7)], '1180 ROUTE D6007 06270 VILLENEUVE LOUBET', '06270'));
  const get = moteur([[/q=455 PROMENADE DES ANGLAIS 06000 NICE&limit=5&postcode=06000/, { features: [] }], [/q=455 PROMENADE DES ANGLAIS 06000 NICE&limit=5&postcode/, { features: [] }],
    [/q=AEROPOLE ZAC DE L ARENAS 455 PROMENADE DES ANGLAIS 06000 NICE&limit=5$/, { features: [feat('455 Promenade des Anglais 06200 Nice', '06200', 'housenumber', 0.7, [7.21, 43.667]), feat('455 Promenade des Anglais 06220 Vallauris', '06220', 'housenumber', 0.9, [7.05, 43.57])] }]]);
  const f = J(k.EUC_DEV731_champsFrance_({ adresse: 'AEROPOLE ZAC DE L ARENAS 455 PROMENADE DES ANGLAIS 06000 NICE', codePostal: '06000' }, get));
  assert.strictEqual(f.Latitude, 43.667, 'même commune (Nice), jamais Vallauris'); assert.ok(/[?]q=455 PROMENADE DES ANGLAIS 06000 NICE&/.test(get.urls[0]), 'numéro + voie essayés d’abord');
  assert.strictEqual(k.EUC_DEV731_memeVille_('Saint-Martin-du-Var', 'ST MARTIN DU VAR'), true);
});

test('nouvelles tentatives : lot général reprend les échecs d’avant DEV731 une fois ; « Réessayer » reprend toute adresse non validée', () => {
  const k = ctx(), x = (statut, c, pays) => ({ key: 'k', pays: pays || 'FRANCE', statut, commentaire: c || '' });
  assert.ok(k.EUC_DEV731_aRechercher_(x('COORDONNEES_A_RENSEIGNER', 'Aucun résultat cohérent'), [], 'FRANCE'));
  assert.ok(!k.EUC_DEV731_aRechercher_(x('COORDONNEES_A_RENSEIGNER', 'Introuvable (recherche élargie)'), [], 'FRANCE'), 'pas de boucle inutile');
  assert.ok(k.EUC_DEV731_aRechercher_(x('COORDONNEES_A_RENSEIGNER', 'Introuvable (recherche élargie)'), ['k'], 'FRANCE'), 'bouton Réessayer');
  assert.ok(k.EUC_DEV731_aRechercher_(x('A_VALIDER_MANUELLEMENT'), ['k'], 'FRANCE'));
  assert.ok(!k.EUC_DEV731_aRechercher_(x('VALIDE_MANUELLEMENT'), ['k'], 'FRANCE'));
  assert.ok(!k.EUC_DEV731_aRechercher_(x('A_GEOCODER', '', 'MONACO'), [], 'FRANCE'));
  assert.ok(/EUC_DEV731_aRechercher_\(x,keys,'FRANCE'\)/.test(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js')) && /EUC_DEV731_aRechercher_\(x,keys,'MONACO'\)/.test(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js')));
});

test('Monaco : adresse nettoyée, puis voie sans numéro, puis nom de l’entreprise', () => {
  const k = ctx();
  assert.deepStrictEqual(J(k.EUC_DEV731_requetesMonaco_({ adresse: '2rue du Gabian 98000 Monaco', entreprise: 'ENTREPRISE FICTIVE' })), ['2 RUE DU GABIAN, 98000 MONACO', 'RUE DU GABIAN, 98000 MONACO', 'ENTREPRISE FICTIVE, MONACO']);
  assert.deepStrictEqual(J(k.EUC_DEV731_requetesMonaco_({ adresse: '416 avenue Albert III zone F 98000 MOACO', entreprise: '' })), ['416 AVENUE ALBERT III, 98000 MONACO', 'AVENUE ALBERT III, 98000 MONACO']);
  assert.deepStrictEqual(J(k.EUC_DEV731_requetesMonaco_({ adresse: 'place du casino BP 139 98000 MONACO', entreprise: '' })), ['PLACE DU CASINO, 98000 MONACO']);
  const g = read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js');
  assert.ok(/for\(var r=0;r<req\.length&&\(!fields\|\|fields\.Latitude==null\);r\+\+\)\{if\(r\)Utilities\.sleep\(1100\);/.test(g), 'une requête par seconde au plus');
});

test('point déjà placé conservé quand une autre convention écrit la même adresse autrement ; vraie nouvelle adresse → à refaire', () => {
  const k = ctx();
  assert.strictEqual(k.EUC_DEV731_memeLieu_('1 AV PRINCE HEREDITAIRE ALBERT 98000 MONACO', '1 avenue Prince Héréditaire Albert, 98000 Monaco'), true);
  assert.strictEqual(k.EUC_DEV731_memeLieu_('14 RUE DES ETOILES, 06000 NICE', '14 rue des Étoiles 06000 Nice'), true);
  assert.strictEqual(k.EUC_DEV731_memeLieu_('14 RUE DES ETOILES, 06000 NICE', '16 RUE DES ETOILES, 06000 NICE'), false, 'autre numéro');
  assert.strictEqual(k.EUC_DEV731_memeLieu_('14 RUE DES ETOILES, 06000 NICE', '14 RUE DES ETOILES, 06100 NICE'), false, 'autre code postal');
  assert.strictEqual(k.EUC_DEV731_memeLieu_('14 RUE DES ETOILES, 06000 NICE', '3 AVENUE DES FLEURS, 06000 NICE'), false);
  const g = read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js');
  assert.ok((g.match(/EUC_DEV731_memeLieu_\(/g) || []).length === 2 && !/Adresse modifiée depuis le dernier géocodage/.test(g));
});

test('page : décompte de tout ce qui reste à traiter ; Réessayer sur une ligne donne son résultat ; lots plus petits', () => {
  const h = read('apps-script/Geocodage_PFMP_DEV441.html'), src = ['aTraiter', 'frRecherche', 'decompte'].map(f => h.match(new RegExp('function ' + f + '\\([\\s\\S]*?\\n(?=function )'))[0]).join('\n');
  const k = {}; vm.createContext(k); vm.runInContext(src, k);
  const rows = [{ pays: 'FRANCE', statut: 'GEOCODE_AUTOMATIQUE' }, { pays: 'FRANCE', statut: 'A_VALIDER_MANUELLEMENT' }, { pays: 'FRANCE', statut: 'COORDONNEES_A_RENSEIGNER', commentaire: 'Aucun résultat' },
    { pays: 'FRANCE', statut: 'COORDONNEES_A_RENSEIGNER', commentaire: '(recherche élargie)' }, { pays: 'MONACO', statut: 'COORDONNEES_A_RENSEIGNER' }];
  const t = k.decompte(rows);
  assert.ok(/5 adresse\(s\) unique\(s\), 4 à traiter : 1 à contrôler .*, 3 coordonnées à renseigner — dont 1 à Monaco\./.test(t), t);
  assert.ok(/relancera 1 recherche/.test(t));
  assert.ok(/toutes placées/.test(k.decompte([rows[0]])));
  assert.ok(/limit=isMonaco\?3:10,timeout=isMonaco\?60000:120000/.test(h) && /toujours introuvable automatiquement/.test(h) && /\$\('geocode'\)\.onclick=\(\)=>\{let keys=ROWS\.filter\(frRecherche\)/.test(h));
});

console.log(n + ' tests DEV731 réussis');
