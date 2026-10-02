'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const apprenticeTemplates = [
  'apps-script/Apprentissage_PFMP_V190X.html',
  'apps-script/Apprentissage_PFMP_PublicClone_V353.html'
];

for (const file of apprenticeTemplates) {
  const html = read(file);
  assert.match(html, /EUC_DEV417_APPRENTICE_LOAD_GUARD/,
    `${file}: garde de chargement DEV417 absente`);
  assert.match(html, /requestId\s*!==\s*loadSequence/,
    `${file}: les réponses obsolètes ne sont pas rejetées`);
  assert.match(html, /data-dev417-loading/,
    `${file}: l'état de chargement n'est pas matérialisé`);
  assert.match(html, /overscroll-behavior\s*:\s*contain/,
    `${file}: la bulle ne confine pas son défilement`);
  assert.match(html, /scrollbar-gutter\s*:\s*stable/,
    `${file}: la place de la barre de défilement n'est pas stabilisée`);
  assert.match(html, /pointerenter/,
    `${file}: la bulle n'est pas maintenue au pointeur`);
  assert.match(html, /focusin/,
    `${file}: la bulle n'est pas utilisable au clavier`);
}

const detail = read('apps-script/Suivi_PFMP_Classe_Detail_V156.html');
assert.match(detail, /EUC_DEV417_DETAIL_KPI_LISTS/,
  'détail classe: listes des compteurs absentes');
assert.match(detail, /data-dev417-list="apprentis"/,
  'détail classe: compteur apprentis non interactif');
assert.match(detail, /data-dev417-list="avec"/,
  'détail classe: compteur avec convention non interactif');
assert.match(detail, /data-dev417-list="sans"/,
  'détail classe: compteur sans convention non interactif');

const header = detail.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/);
assert.ok(header, 'détail classe: en-tête du tableau introuvable');
assert.strictEqual((header[1].match(/<th\b/g) || []).length, 10,
  'détail classe: le tableau doit conserver exactement 10 colonnes');
assert.match(detail,
  /return '<tr><td>'\+check\+'<\/td><td><div class="student">/,
  'détail classe: la cellule Élève doit suivre immédiatement la sélection');

const publicExact = read('apps-script/EUC_PFMP_DEV415_PublicAdminExact.js');
assert.match(publicExact, /createTemplateFromFile\(\s*'Suivi_PFMP_Classe_Detail_V156'\s*\)/,
  'PUBLIC doit utiliser le même tableau que ADMIN');
assert.match(publicExact, /#selectHead/,
  'PUBLIC doit masquer l’en-tête de sélection sans décaler les données');
assert.match(publicExact, /#tbody tr>td:first-child/,
  'PUBLIC doit masquer aussi la cellule de sélection de chaque ligne');
assert.match(publicExact, /EUC_PFMP_WRAPPER_NAVIGATE/,
  'PUBLIC doit demander au wrapper de changer sa propre iframe');
assert.doesNotMatch(publicExact, /replace\(\/window\\\.top\\\.location/,
  'PUBLIC ne doit plus convertir une navigation en iframe Apps Script imbriquée');
assert.match(publicExact, /EUC_DEV417_publicFastDetail/,
  'PUBLIC doit disposer d’une navigation rapide strictement en lecture seule');

const publicFamily = read('apps-script/Suivi_Conventions_Public_FamilleClone_V353.html');
assert.match(publicFamily, /target="_self"/,
  'famille PUBLIC: les liens doivent rester dans le wrapper');
assert.match(publicFamily, /EUC_DEV418_publicNavigate/,
  'famille PUBLIC: le clic classe ne dialogue pas avec le wrapper');
assert.match(publicFamily, /EUC_PFMP_WRAPPER_NAVIGATE/,
  'famille PUBLIC: le message de navigation vers le wrapper manque');

const publicSummary = read('apps-script/Suivi_Conventions_Public_Clone_V353.html');
assert.match(publicSummary, /EUC_DEV418_publicNavigate/,
  'accueil PUBLIC: le clic famille ne dialogue pas avec le wrapper');

const publicWrapper = read('Atri/suivi-stages-atrium.html');
assert.match(publicWrapper, /id="pfmpApp"/,
  'wrapper public: iframe PFMP identifiable absente');
assert.match(publicWrapper, /EUC_PFMP_WRAPPER_NAVIGATE/,
  'wrapper public: réception de navigation absente');
assert.match(publicWrapper, /u\.hostname===host&&u\.pathname===path/,
  'wrapper public: les destinations Apps Script ne sont pas strictement filtrées');

const detailService = read('apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.js');
assert.match(detailService, /function EUC_V155_resoudreClasse_/,
  'détail classe: la compatibilité avec les anciens identifiants d’offre manque');
assert.match(detailService, /EUC_OFFRES_FORMATION/,
  'détail classe: l’identifiant d’offre ne peut pas être ramené à Classes');

for (const file of apprenticeTemplates) {
  const html = read(file);
  assert.match(html, /\.EUC_DEV251_dashboardDetails\(y\)/,
    `${file}: compteur et infobulle apprentis n’utilisent pas la même source`);
  assert.doesNotMatch(html, /\.EUC_DEV277_dashboardDetails\(y\)/,
    `${file}: l’ancien calcul incohérent est encore appelé par l’infobulle`);
}

const entConfig = read('apps-script/EUC_ENT_Config.js');
assert.match(entConfig, /EUC_ENT_DOC_ID_RECETTE_AUTORISE\s*=\s*'b2CyeMEdVEMS'/,
  'la garde Grist doit viser exclusivement la base PFMP active autorisée');
assert.doesNotMatch(entConfig, /3pnVrygfNn7c/,
  'la cible Grist de production interdite subsiste dans la configuration active');

const auth = read('apps-script/EUC_PFMP_DEV270B_MultiDomainAuth.js');
assert.match(auth, /EUC_DEV270B_HMAC_SECRET/,
  'le secret HMAC doit provenir des propriétés privées Apps Script');
assert.doesNotMatch(auth, /var\s+EUC_DEV270B_SECRET_\s*=\s*['"][0-9a-f]{32,}/i,
  'un secret HMAC est encore codé en dur');

const admin = read('apps-script/Admin_PFMP.html');
assert.match(admin, /id="euc-dev417-pronote-classes"/,
  'centre admin: accès visible aux classes Pronote absent');
assert.match(admin, /Correspondances et exclusions des classes/,
  'centre admin: le rôle du lien Pronote n’est pas explicite');
assert.match(admin, /page=import-pronote-pfmp/,
  'centre admin: le lien des exclusions ne rejoint pas l’import Pronote');

const importScripts = read('apps-script/Import_Pronote_PFMP_Scripts.html');
const mappingsService = read('apps-script/EUC_PFMP_CorrespondanceClasses.js');
assert.match(importScripts, /Correspondances de classes mémorisées/,
  'import Pronote: consultation directe des correspondances absente');
assert.match(importScripts, /EUC_CORRESPONDANCE_listerChoix/,
  'import Pronote: chargement des correspondances mémorisées absent');
assert.match(mappingsService, /function EUC_CORRESPONDANCE_listerChoix/,
  'correspondances: service de consultation absent');
assert.match(mappingsService, /return \{ecriture:false/,
  'correspondances: la consultation ne déclare pas explicitement la lecture seule');

const annual = read('apps-script/EUC_PFMP_DEV275B_ApprentissageHistorique.js');
assert.match(annual, /EUC_DEV275B_studentAliases_/,
  'apprentissage: continuité entre inscriptions annuelles absente');
assert.match(annual, /EUC_DEV275B_evalStudent_/,
  'apprentissage: les contrats ne suivent pas encore la personne entre deux années');

const accessCache = read('apps-script/EUC_PFMP_DEV398_Performance.js');
const liveDetail = read('apps-script/EUC_PFMP_DEV340_ConsolidationLive.js');
const finalCache = read('apps-script/EUC_PFMP_DEV416_Performance.js');
const baseDetailCache = read('apps-script/EUC_PFMP_DEV356_Finitions.js');
assert.match(accessCache, /DEV418_ACCESS_ROWS_/,
  'détail classe: le cache persistant DEV418 n’est pas isolé des anciennes valeurs');
assert.match(accessCache, /accessSignature_\(annee,classe,periode\)/,
  'détail classe: la clé persistante ne distingue pas classe et période');
assert.match(liveDetail, /getPersistentAccess_\(y,classe,periode\)/,
  'détail classe: une lecture persistante reste partagée entre toutes les classes');
assert.match(liveDetail, /putPersistentAccess_\(y,classe,periode,rows\)/,
  'détail classe: une écriture persistante reste partagée entre toutes les classes');
assert.match(liveDetail, /EUC_DEV418_ACC_/,
  'détail classe: le cache court peut encore réutiliser les zéros de DEV417');
assert.match(liveDetail, /EUC_DEV418_APP_ROWS/,
  'détail classe: le cache apprentis peut encore réutiliser les zéros de DEV417');
assert.match(finalCache, /return 'D418_'/,
  'détail classe: le cache final DEV418 n’est pas isolé');
assert.match(baseDetailCache, /return 'DEV418_DETAIL_'/,
  'détail classe: le cache de base DEV418 n’est pas isolé');

const scriptProps = new Map();
const memoryCache = new Map();
const cacheCtx = {
  JSON, String, Number, Array,
  PropertiesService: {getScriptProperties: () => ({
    getProperty: key => scriptProps.get(key) || null,
    setProperty: (key, value) => {scriptProps.set(key, value);},
    deleteProperty: key => {scriptProps.delete(key);}
  })},
  CacheService: {getScriptCache: () => ({
    put: (key, value) => {memoryCache.set(key, value);},
    remove: key => {memoryCache.delete(key);}
  })}
};
vm.createContext(cacheCtx);
vm.runInContext(accessCache, cacheCtx);
cacheCtx.EUC_DEV398_putPersistentAccess_('2026-2027', 24, 62, [{id: 1}]);
cacheCtx.EUC_DEV398_putPersistentAccess_('2026-2027', 28, 65, [{id: 2}]);
assert.strictEqual(cacheCtx.EUC_DEV398_getPersistentAccess_('2026-2027', 24, 62)[0].id, 1,
  'détail classe: TCAR relit les données d’une autre classe');
assert.strictEqual(cacheCtx.EUC_DEV398_getPersistentAccess_('2026-2027', 28, 65)[0].id, 2,
  'détail classe: TMP3D relit les données d’une autre classe');

console.log('✓ DEV418 : chargeur, navigation, bulles, compteurs et caches protégés');
