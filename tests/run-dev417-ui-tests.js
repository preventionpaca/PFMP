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
  assert.match(html, /responsable-ent/,
    `${file}: le nom du responsable d'entreprise n'est pas affiché`);
}

const apprenticeLoader = read('apps-script/EUC_PFMP_DEV208_ClassDetailSnapshot.js');
const apprenticeBridge = read('apps-script/EUC_PFMP_DEV235_JsonBridge.js');
const apprenticeSave = read('apps-script/EUC_PFMP_DEV192_ApprentisGlobal.js');
assert.match(apprenticeLoader, /responsableEntreprise:val\(f,\['Responsable_nom','Responsable'\]\)/,
  'apprentis: le responsable entreprise n’est pas relu depuis Grist');
assert.match(apprenticeBridge, /responsableEntreprise:\s*txt\(s\.responsableEntreprise\)/,
  'apprentis: le responsable entreprise est perdu dans le pont JSON');
assert.match(apprenticeSave, /set\(\['Responsable_nom', 'Responsable'\], p\.responsableEntreprise \|\| ''\)/,
  'apprentis: le responsable entreprise n’est pas enregistré');

const detail = read('apps-script/Suivi_PFMP_Classe_Detail_V156.html');
assert.match(detail, /EUC_DEV417_DETAIL_KPI_LISTS/,
  'détail classe: listes des compteurs absentes');
assert.match(detail, /data-dev417-list="apprentis"/,
  'détail classe: compteur apprentis non interactif');
assert.match(detail, /data-dev417-list="avec"/,
  'détail classe: compteur avec convention non interactif');
assert.match(detail, /data-dev417-list="sans"/,
  'détail classe: compteur sans convention non interactif');
assert.match(detail, /data-dev417-list="incidents"/,
  'détail classe: compteur annulées/interrompues non interactif');
assert.match(detail, /if\(key==='incidents'\)return incident\(x\)/,
  'détail classe: la liste annulées/interrompues ne filtre pas les incidents');

const header = detail.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/);
assert.ok(header, 'détail classe: en-tête du tableau introuvable');
assert.strictEqual((header[1].match(/<th\b/g) || []).length, 10,
  'détail classe: le tableau doit conserver exactement 10 colonnes');
assert.match(detail,
  /return '<tr><td class="select-cell">'\+check\+'<\/td><td><div class="student">/,
  'détail classe: la cellule Élève doit suivre immédiatement la sélection');
assert.match(detail, /class="select-cell"/,
  'détail classe: les cellules de sélection ne sont pas identifiables');
assert.match(detail, /\.detail-readonly \.select-cell/,
  'détail classe: la sélection vide n’est pas masquée en lecture seule');
assert.match(detail, /min-width:1680px/,
  'détail classe: le tableau reste trop étroit pour les coordonnées entreprise');
assert.match(detail, /function contactVal\(v\)/,
  'détail classe: les coordonnées ne sont pas structurées sur plusieurs lignes');
assert.doesNotMatch(detail, /EUC_DEV340_SNAPSHOT_DETAIL|EUC_DEV190E_SNAPSHOT_TILE|snapshot-pfmp-admin/,
  'détail classe: la maintenance Snapshot ne doit jamais être injectée dans la liste des élèves');
assert.match(detail, /const incidents=\(detail\.lignes\|\|\[\]\)\.filter/,
  'détail classe: le compteur annulées/interrompues doit être recalculé depuis les lignes visibles');
assert.match(detail, /window\.EUC_DEV419_beginNavigation/,
  'détail classe: l’indicateur commun de navigation est absent');
assert.match(detail, /beginNavigation\(back,'Retour aux classes…'\)/,
  'détail classe: le retour aux classes ne matérialise pas le chargement');
assert.match(detail, /beginNavigation\(tab,'Chargement de la période…'\)/,
  'détail classe: le changement de période ne matérialise pas le chargement');
assert.match(detail, /beginNavigation\(el,'Chargement de la classe…'\)/,
  'détail classe: la liste déroulante ne matérialise pas le chargement');
assert.match(detail, /\.euc419-nav-busy[\s\S]*removeAttribute\('aria-busy'\)[\s\S]*disabled=false/,
  'détail classe: la navigation rapide ne réactive pas le contrôle après chargement');
assert.match(detail, /page!==['"]suivi-pfmp-classe['"]&&page!==['"]suivi-pfmp-classe-public['"]/,
  'détail classe: la navigation rapide ne prend pas en charge la route publique');
assert.match(detail, /window\.detail=detail;[\s\S]*window\.render=function\(\)\{detail=window\.detail\|\|detail;render\(\)\}/,
  'détail classe: la navigation rapide ne peut pas remplacer l’état détenu par le rendu initial');
assert.doesNotMatch(detail, /history\.pushState/,
  'détail PUBLIC: l’iframe ne doit pas pousser une URL Apps Script d’une autre origine');
assert.match(detail, /\.euc186-crumb,#EUC_DEV175C_CRUMB\{display:none!important\}/,
  'détail classe: les anciens fils d’Ariane dupliqués doivent être masqués');
assert.match(detail, /function initNavigationContext\(\)\{updateBreadcrumb\(\);updateBackToFamily\(\);\}/,
  'détail classe: le fil d’Ariane unique doit être initialisé avant toute navigation rapide');
assert.match(detail, /typeof window\.EUC_DEV418_publicNavigate===['"]function['"][\s\S]*EUC_DEV418_publicNavigate\(url,null,['"]Chargement…['"]\)/,
  'détail PUBLIC: le repli rapide peut encore sortir du sous-domaine');

const publicExact = read('apps-script/EUC_PFMP_DEV415_PublicAdminExact.js');
assert.match(publicExact, /createTemplateFromFile\(\s*'Suivi_PFMP_Classe_Detail_V156'\s*\)/,
  'PUBLIC doit utiliser le même tableau que ADMIN');
assert.match(publicExact, /#selectHead/,
  'PUBLIC doit masquer l’en-tête de sélection sans décaler les données');
assert.match(publicExact, /#tbody tr>td:first-child/,
  'PUBLIC doit masquer aussi la cellule de sélection de chaque ligne');
assert.match(publicExact, /EUC_PFMP_WRAPPER_NAVIGATE/,
  'PUBLIC doit demander au wrapper de changer sa propre iframe');
assert.match(publicExact, /wrapperMode[\s\S]*searchParams\.set\("wrapper","1"\)/,
  'PUBLIC doit conserver le marqueur du wrapper dans le détail classe');
assert.doesNotMatch(publicExact, /replace\(\/window\\\.top\\\.location/,
  'PUBLIC ne doit plus convertir une navigation en iframe Apps Script imbriquée');
assert.match(publicExact, /EUC_DEV417_publicFastDetail/,
  'PUBLIC doit disposer d’une navigation rapide strictement en lecture seule');
assert.match(publicExact, /EUC_DEV418_detailFastNavigate/,
  'PUBLIC doit conserver la coque de détail lors d’un changement de classe ou de période');
assert.match(publicExact, /\.euc190e-snapshot-tile/,
  'PUBLIC doit masquer par défense en profondeur toute ancienne tuile Snapshot');

const publicApprentices = read('apps-script/Apprentissage_PFMP_PublicClone_V353.html');
assert.doesNotMatch(publicApprentices, /snapshot-pfmp-admin|Maintenance Snapshot PFMP/,
  'apprentis PUBLIC: aucun accès à la maintenance Snapshot ne doit être rendu');

const publicFamily = read('apps-script/Suivi_Conventions_Public_FamilleClone_V353.html');
assert.match(publicFamily, /target="_self"/,
  'famille PUBLIC: les liens doivent rester dans le wrapper');
assert.match(publicFamily, /EUC_DEV418_publicNavigate/,
  'famille PUBLIC: le clic classe ne dialogue pas avec le wrapper');
assert.match(publicFamily, /EUC_PFMP_WRAPPER_NAVIGATE/,
  'famille PUBLIC: le message de navigation vers le wrapper manque');
assert.match(publicFamily, /searchParams\.set\('wrapper','1'\)/,
  'famille PUBLIC: le marqueur du wrapper doit être conservé');
assert.match(publicFamily, /panel\.addEventListener\('pointerenter'/,
  'famille PUBLIC: la bulle de contrôle rapide doit rester ouverte au survol');
assert.match(publicFamily, /cache=window\.EUC_DEV422_QUICK\|\|\{\}/,
  'famille PUBLIC: le survol doit réutiliser les listes pré-calculées');
assert.doesNotMatch(publicFamily, /id=['"]euc339Loading['"]/,
  'famille PUBLIC: le voile plein écran de navigation doit être supprimé');

const adminFamily = read('apps-script/Suivi_Conventions_Admin_FamilleV190L.html');
assert.match(adminFamily, /panel\.addEventListener\('pointerenter'/,
  'famille ADMIN: la bulle de contrôle rapide doit rester ouverte au survol');
assert.match(adminFamily, /cache=window\.EUC_DEV422_QUICK\|\|\{\}/,
  'famille ADMIN: le survol doit réutiliser les listes pré-calculées');
assert.doesNotMatch(adminFamily, /id=['"]euc339Loading['"]/,
  'famille ADMIN: le voile plein écran de navigation doit être supprimé');

const publicSummary = read('apps-script/Suivi_Conventions_Public_Clone_V353.html');
assert.match(publicSummary, /EUC_DEV418_publicNavigate/,
  'accueil PUBLIC: le clic famille ne dialogue pas avec le wrapper');

const publicWrapper = read('Atri/suivi-stages-atrium.html');
assert.match(publicWrapper, /id="pfmpApp"/,
  'wrapper public: iframe PFMP identifiable absente');
assert.match(publicWrapper, /page=suivi-conventions-public&amp;wrapper=1/,
  'wrapper public: le mode wrapper doit être annoncé à Apps Script');
assert.match(publicWrapper, /EUC_PFMP_WRAPPER_NAVIGATE/,
  'wrapper public: réception de navigation absente');
assert.match(publicWrapper, /target\.searchParams\.set\('wrapper','1'\)/,
  'wrapper public: chaque navigation interne doit rester explicitement encapsulée');
assert.match(publicWrapper, /u\.hostname===host&&u\.pathname===path/,
  'wrapper public: les destinations Apps Script ne sont pas strictement filtrées');
assert.match(publicWrapper, /ev\.origin!==['"]null['"]/,
  'wrapper public: les messages du bac à sable Apps Script doivent être acceptés');
assert.match(publicWrapper, /\+\-\)\?script\\\.googleusercontent/,
  'wrapper public: l’origine réelle *-script.googleusercontent.com doit être autorisée');

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
  assert.match(html, /window\.EUC_DEV348_KPIS_ACTIVE=true/,
    `${file}: le dashboard détaillé doit être l’unique source des KPI`);
  assert.match(html, /if\(window\.EUC_DEV348_KPIS_ACTIVE\)return/,
    `${file}: un ancien chargement peut encore remettre les KPI à zéro`);
}

const entConfig = read('apps-script/EUC_ENT_Config.js');
assert.match(entConfig, /EUC_ENT_DOC_ID_RECETTE_AUTORISE\s*=\s*'b2CyeMEdVEMS'/,
  'la garde Grist doit viser exclusivement la base PFMP active autorisée');
assert.doesNotMatch(entConfig, /3pnVrygfNn7c/,
  'la cible Grist de production interdite subsiste dans la configuration active');

const auth = read('apps-script/EUC_PFMP_DEV270B_MultiDomainAuth.js');
assert.match(auth, /EUC_DEV270B_HMAC_SECRET/,
  'le secret HMAC doit provenir des propriétés privées Apps Script');
assert.match(auth, /EUC_PFMP_QR_HMAC_SECRET/,
  'l’authentification doit pouvoir dériver un secret depuis la propriété privée PFMP existante');
assert.match(auth, /EUC_DEV270B_AUTH_V1/,
  'la dérivation de secours doit être séparée du domaine cryptographique QR');
assert.match(auth, /computeHmacSha256Signature\(\s*EUC_DEV270B_SECRET_DERIVATION_/,
  'le secret de secours ne doit pas être réutilisé directement pour l’authentification');
assert.doesNotMatch(auth, /var\s+EUC_DEV270B_SECRET_\s*=\s*['"][0-9a-f]{32,}/i,
  'un secret HMAC est encore codé en dur');
assert.match(auth, /function EUC_DEV270B_failureCode_\(err\)/,
  'authentification: le diagnostic non sensible des échecs manque');
assert.match(auth, /\^AUTH_\[A-Z\]\+\$/,
  'authentification: le code affiché doit être limité à une liste lexicale sûre');
assert.match(auth, /id="authDiag"/,
  'authentification: le diagnostic sûr n’est pas exposé dans la page de connexion');
assert.doesNotMatch(auth, /non autorisé dans PFMP\s*:\s*['"]?\s*\+/,
  'authentification: le courriel ne doit pas être concaténé dans une erreur');

const adminWebApp = read('apps-script/EUC_CENTRE_ADMIN_PFMP_WebApp.js');
assert.match(adminWebApp, /authFailure=EUC_DEV270B_failureCode_\(__expired\)/,
  'centre admin: l’échec de passerelle n’est pas converti en diagnostic sûr');
assert.match(adminWebApp, /EUC_DEV270B_loginPage_\(authFailure\)/,
  'centre admin: le diagnostic sûr n’est pas transmis à la page de connexion');

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
const classFastNav = read('apps-script/EUC_PFMP_DEV382_Performance.js');
const quickCheck = read('apps-script/EUC_PFMP_DEV388_Fix.js');
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
assert.match(finalCache, /return 'D423_'/,
  'détail classe: le cache final DEV423 n’est pas isolé');
const buildFinal = finalCache.slice(finalCache.indexOf('function EUC_DEV416_buildFinal_'), finalCache.indexOf('function EUC_DEV416_finalDetail_'));
assert.doesNotMatch(buildFinal, /EUC_V50_enrichirDetail_|EUC_APP172_enrichirDetail/,
  'détail classe: les enrichissements conventions/apprentis sont encore rejoués deux fois');
assert.match(baseDetailCache, /return 'DEV423_DETAIL_'/,
  'détail classe: le cache de base DEV423 n’est pas isolé');
assert.match(classFastNav, /EUC_DEV416_finalDetail_/,
  'navigation rapide: le détail final en cache doit être réutilisé');
assert.match(quickCheck, /EUC_DEV422_readDetailSnapshot_/,
  'contrôle rapide: la lecture directe du snapshot détaillé doit être utilisée');
assert.doesNotMatch(quickCheck, /EUC_DEV416_finalDetail_/,
  'contrôle rapide: le survol ne doit pas reconstruire le détail final enrichi');

const familyLive = read('apps-script/EUC_PFMP_DEV340_ConsolidationLive.js');
const familyUx = read('apps-script/EUC_PFMP_DEV339_FamilleUX.js');
const globalCorrection = read('apps-script/EUC_PFMP_DEV333_CorrectifGlobal.js');
const primeAccess = familyLive.slice(
  familyLive.indexOf('function EUC_DEV340_primeAccessIndex_'),
  familyLive.indexOf('function EUC_DEV398_BASE_EUC_DEV340_accessRows_')
);
assert.match(primeAccess, /EUC_DEV394_BASE_EUC_DEV340_primeAccessIndex_/,
  'liste des classes: le préchauffage doit remplir les caches classe/période');
assert.doesNotMatch(primeAccess, /return EUC_DEV340_accessRows_\.apply/,
  'liste des classes: le préchauffage ne doit pas appeler une lecture de classe 0');
assert.ok(
  familyUx.indexOf('EUC_DEV421_fastFamilySnapshot_') < familyUx.indexOf('EUC_APP172_chargerFamille'),
  'liste des classes: le snapshot indexé doit être essayé avant le recalcul métier complet'
);
assert.match(familyUx, /EUC_DEV421_FAMILY_TTL_=21600/,
  'liste des classes: le snapshot partagé doit rester réutilisable pendant la demi-journée');
assert.match(familyUx, /EUC_DEV421_FAMILY_CHUNK_=70000/,
  'liste des classes: un gros snapshot ne doit pas dépasser la limite d’une entrée de cache');
assert.match(familyUx, /Payload_JSON/,
  'liste des classes: le chemin rapide doit lire directement le payload persistant');
assert.match(familyUx, /EUC_DEV422_hydrateFamily_/,
  'liste des classes: les compteurs doivent être réconciliés avec les snapshots détaillés');
assert.match(familyUx, /EUC_DEV190I_TABLE_/,
  'liste des classes: la réconciliation doit lire les détails en une requête groupée');
assert.match(familyUx, /p\.quick=quick/,
  'liste des classes: le contrôle rapide doit être pré-calculé avec les cartes');
assert.doesNotMatch(
  familyUx.slice(familyUx.indexOf('function EUC_DEV421_fastFamilySnapshot_'), familyUx.indexOf('function EUC_DEV394_BASE_EUC_DEV339_familyData_')),
  /EUC_DEV276_enrichFamilyPayload_/,
  'liste des classes: le chemin snapshot ne doit pas relancer les enrichissements métier lourds'
);
assert.match(globalCorrection, /EUC_DEV421_fastFamilySnapshot_/,
  'navigation entre classes: la liste doit réutiliser le snapshot mis en cache');
assert.doesNotMatch(
  familyLive.slice(familyLive.indexOf('function EUC_DEV394_BASE_EUC_DEV340_afficherFamille'), familyLive.indexOf('function EUC_DEV340_afficherAdminClasse')),
  /EUC_DEV340_primeAccessIndex_\(/,
  'liste des classes: le préchauffage global ne doit plus bloquer le rendu HTML'
);

const snapshotSource = read('apps-script/EUC_PFMP_DEV190_Snapshot.js');
const activeRows = snapshotSource.slice(snapshotSource.indexOf('function EUC_DEV190I_activeRows_'), snapshotSource.indexOf('function EUC_DEV190I_familyCode_'));
assert.match(activeRows, /EUC_DEV190G_fastRecords_/,
  'détail classe: le snapshot doit être lu avec un filtre REST ciblé');
assert.doesNotMatch(activeRows, /EUC_DEV190I_allRows_/,
  'détail classe: le chemin de consultation relit encore toute la table de snapshots');

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
