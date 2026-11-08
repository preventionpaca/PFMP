/* DEV651 — entreprises non diffusibles : nom et adresse lus au registre national des entreprises (API RNE de l'INPI). */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function contexte(props, reponses) {
  const appels = [], cache = {};
  const k = { console: { warn() {}, log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp,
    PropertiesService: { getScriptProperties: () => ({ getProperty: c => props[c] == null ? null : props[c], setProperty: (c, v) => { props[c] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: c => cache[c] || null, put: (c, v) => { cache[c] = v; }, remove: c => { delete cache[c]; } }) },
    UrlFetchApp: { fetch: (url, o) => { appels.push({ url, o }); const r = reponses.shift() || { code: 500, body: '' }; return { getResponseCode: () => r.code, getContentText: () => typeof r.body === 'string' ? r.body : JSON.stringify(r.body) }; } } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV651_InpiRne.js'), k);
  return { k, appels, cache };
}
/* Fiche RNE fictive (structure de l'API, valeurs inventées). */
const RNE_PP = { formality: { content: { personnePhysique: {
  identite: { entrepreneur: { descriptionPersonne: { nom: 'TESTEUR', prenoms: ['Alex'] } } },
  adresseEntreprise: { adresse: { numVoie: '7', typeVoie: 'RUE', voie: 'des Essais', codePostal: '06510', commune: 'Carros', pays: 'FRANCE' } },
  etablissementPrincipal: { descriptionEtablissement: { siret: '12345678900017', nomCommercial: 'Garage Essai' }, adresse: { numVoie: '9', typeVoie: 'AV', voie: 'du Atelier', codePostal: '06510', commune: 'Carros' } } } } } };
const RNE_PM = { formality: { content: { personneMorale: { identite: { entreprise: { denomination: 'SOCIETE ESSAI' } },
  adresseEntreprise: { adresse: { numVoie: '1', voie: 'place Test', codePostal: '06000', commune: 'Nice' } },
  etablissementPrincipal: { descriptionEtablissement: { siret: '98765432100011' } }, autresEtablissements: [] } } } };
const ND = { siret: '12345678900017', raisonSociale: '', numeroVoie: '', codePostal: '06510', commune: 'CARROS', etat: 'Actif', nonDiffusible: true };
const OK = { INPI_RNE_IDENTIFIANT: 'compte@ex.test', INPI_RNE_MOT_DE_PASSE: 'x', INPI_RNE_ACTIF: 'OUI' };

test('lecture RNE : entrepreneur individuel, établissement du SIRET, nom commercial', () => {
  const { k } = contexte({}, []);
  const x = J(k.EUC_DEV651_mapper_(RNE_PP, '12345678900017'));
  assert.deepEqual(x, { nom: 'TESTEUR Alex', enseigne: 'Garage Essai', siretTrouve: true, adresse: '9 AV du Atelier', complement: '', codePostal: '06510', commune: 'Carros', pays: '' });
  const m = J(k.EUC_DEV651_mapper_(RNE_PM, '98765432100011'));
  assert.equal(m.nom, 'SOCIETE ESSAI'); assert.equal(m.adresse, '1 place Test'); assert.equal(m.commune, 'Nice');
  const autre = J(k.EUC_DEV651_mapper_(RNE_PP, '12345678900025'));
  assert.equal(autre.siretTrouve, false); assert.equal(autre.adresse, '7 RUE des Essais', 'SIRET absent : adresse de l’entreprise');
  assert.equal(k.EUC_DEV651_mapper_({}, '1'), null);
});

test('non diffusible : nom et adresse remplis depuis l’INPI, plus de saisie par l’élève', () => {
  const { k, appels } = contexte(Object.assign({}, OK), [{ code: 200, body: { token: 'T' } }, { code: 200, body: RNE_PP }]);
  const r = J(k.EUC_DEV651_completerNonDiffusible_(ND, '12345678900017'));
  assert.equal(r.raisonSociale, 'TESTEUR Alex'); assert.equal(r.numeroVoie, '9 AV du Atelier'); assert.equal(r.codePostal, '06510'); assert.equal(r.sourceIdentite, 'INPI_RNE');
  assert.equal(r.nonDiffusible, undefined, 'entreprise vérifiée : traitée comme une entreprise ordinaire');
  assert.equal(appels[0].url, 'https://registre-national-entreprises.inpi.fr/api/sso/login');
  assert.equal(appels[1].url, 'https://registre-national-entreprises.inpi.fr/api/companies/123456789');
  assert.equal(appels[1].o.headers.Authorization, 'Bearer T');
});

test('secours : saisie par l’élève si non activé, sans identifiants, INPI en erreur ou fiche incomplète', () => {
  const sansActif = contexte(Object.assign({}, OK, { INPI_RNE_ACTIF: 'NON' }), []);
  assert.deepEqual(J(sansActif.k.EUC_DEV651_completerNonDiffusible_(ND, '12345678900017')), ND); assert.equal(sansActif.appels.length, 0);
  const sansId = contexte({ INPI_RNE_ACTIF: 'OUI' }, []);
  assert.deepEqual(J(sansId.k.EUC_DEV651_completerNonDiffusible_(ND, '12345678900017')), ND); assert.equal(sansId.appels.length, 0);
  assert.deepEqual(J(contexte(Object.assign({}, OK), [{ code: 401, body: '' }]).k.EUC_DEV651_completerNonDiffusible_(ND, '12345678900017')), ND);
  assert.deepEqual(J(contexte(Object.assign({}, OK), [{ code: 200, body: { token: 'T' } }, { code: 503, body: '' }]).k.EUC_DEV651_completerNonDiffusible_(ND, '12345678900017')), ND);
  const incomplet = { formality: { content: { personnePhysique: { identite: { entrepreneur: { descriptionPersonne: { nom: 'X' } } } } } } };
  assert.deepEqual(J(contexte(Object.assign({}, OK), [{ code: 200, body: { token: 'T' } }, { code: 200, body: incomplet }]).k.EUC_DEV651_completerNonDiffusible_(ND, '12345678900017')), ND);
  const diffusible = { siret: '1', raisonSociale: 'A' }, c = contexte(Object.assign({}, OK), []);
  assert.equal(c.k.EUC_DEV651_completerNonDiffusible_(diffusible, '1'), diffusible); assert.equal(c.appels.length, 0, 'entreprise diffusible : pas d’appel à l’INPI');
});

test('jeton : réutilisé depuis le cache, renouvelé une fois si refusé', () => {
  const { k, appels, cache } = contexte(Object.assign({}, OK), [{ code: 401, body: '' }, { code: 200, body: { token: 'N' } }, { code: 200, body: RNE_PP }]);
  cache.EUC_DEV651_JETON = 'ANCIEN';
  assert.equal(J(k.EUC_DEV651_completerNonDiffusible_(ND, '12345678900017')).raisonSociale, 'TESTEUR Alex');
  assert.equal(appels[0].o.headers.Authorization, 'Bearer ANCIEN'); assert.match(appels[1].url, /sso\/login$/); assert.equal(appels[2].o.headers.Authorization, 'Bearer N');
  assert.equal(cache.EUC_DEV651_JETON, 'N');
});

test('branchement : annuaire data.gouv puis INPI pour les deux entrées ; page d’administration et route', () => {
  const a = read('apps-script/EUC_ENT_ApiEntreprise.gs');
  assert.match(a, /if\(ent&&ent\.nonDiffusible===true&&typeof EUC_DEV651_completerNonDiffusible_==='function'\)ent=EUC_DEV651_completerNonDiffusible_\(ent,v\.siret\);/);
  assert.match(read('apps-script/EUC_SIRET_NIS_StrictV161.gs'), /var r=EUC_ENT_traiterReponseApiNavigateur\(json,siret\);/, 'page QR : même traitement');
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'acces-inpi-pfmp':\n      return EUC_DEV651_afficher\(e\);/);
  assert.match(read('apps-script/Admin_PFMP.html'), /\?page=acces-inpi-pfmp">Accès INPI/);
  assert.match(read('scripts/pfmp-release-config.json'), /"page": "acces-inpi-pfmp", "scope": "admin", "expected": "Accès INPI"/);
  const s = read('apps-script/EUC_DEV651_InpiRne.js');
  ['EUC_DEV651_enregistrer', 'EUC_DEV651_tester', 'EUC_DEV651_activer'].forEach(f => assert.match(s, new RegExp('function ' + f + '\\([^)]*\\) \\{\\n  EUC_DEV651_exigerGestion_\\(\\);'), f + ' réservé à l’administration'));
  assert.ok(!/console\.\w+\([^)]*(motDePasse|mdp|jeton)/.test(s), 'aucun secret dans les journaux');
  const h = read('apps-script/Acces_INPI_DEV651.html');
  assert.match(h, /<input id="motDePasse" type="password"/); assert.match(h, /\$\('motDePasse'\)\.value='';/);
  ['bEnregistrer', 'bTester', 'bActiver', 'bDesactiver'].forEach(b => assert.match(h, new RegExp('id="' + b + '"( class="leger")?><span class="spin"></span>')));
  assert.match(h, /DELAI=60000/); assert.match(h, /b\.disabled=on;b\.classList\.toggle\('busy',on\)/);
});
test('fiches de la base masquées : ignorées à la recherche et au suivi, corrigées depuis l’INPI', () => {
  const c = { console, JSON, Object, String, Array, RegExp }; vm.createContext(c);
  vm.runInContext(read('apps-script/EUC_ENT_ApiEntreprise.gs'), c);
  assert.equal(c.EUC_ENT_identiteEntrepriseComplete_({ raisonSociale: '[NON-DIFFUSIBLE]', numeroVoie: '1 rue X', codePostal: '06000', commune: 'Nice' }), false, 'fiche masquée : data.gouv puis INPI');
  assert.equal(c.EUC_ENT_identiteEntrepriseComplete_({ raisonSociale: 'A', numeroVoie: '1 rue X', codePostal: '06000', commune: 'Nice' }), true);
  const m = read('apps-script/EUC_SUIVI2_Moteur.js');
  assert.match(m, /function EUC_SUIVI2_premier_\(\) \{ for \(var i = 0; i < arguments\.length; i\+\+\) \{ var v = EUC_SUIVI2_t_\(arguments\[i\]\); if \(v && !\/NON\[\\s_-\]\*DIFFUSIBLE\/i\.test\(v\)\) return v; \} return ''; \}/);
  assert.match(m, /var EUC_SUIVI2_VERSION_ = '1\.0\.0-dev\.651';/, 'modèle du suivi recalculé (cache par version)');
  const { k } = contexte({}, []);
  const x = J(k.EUC_DEV651_mapper_(RNE_PP, '12345678900017'));
  assert.deepEqual(J(k.EUC_DEV651_correctionFiche_({ Raison_sociale: '[NON-DIFFUSIBLE]', Enseigne: 'Garage Maison', Numero_voie: '[NON-DIFFUSIBLE]', Adresse_complete: '', Code_postal: '06510', Commune: 'CARROS' }, x)),
    { Raison_sociale: 'TESTEUR Alex', Numero_voie: '9 AV du Atelier', Adresse_complete: '9 AV du Atelier, 06510 Carros' }, 'seuls les champs masqués ou vides sont remplacés');
  const src = read('apps-script/EUC_DEV651_InpiRne.js');
  assert.match(src, /function EUC_DEV651_corrigerFiche\(id\) \{\n  EUC_DEV651_exigerGestion_\(\);/);
  const h = read('apps-script/Acces_INPI_DEV651.html');
  assert.match(h, /id="bFiches" class="leger"><span class="spin"><\/span>/); assert.match(h, /occupe\(bc,true,'Correction…'\)/);
});
console.log(n + ' tests DEV651 réussis.');
