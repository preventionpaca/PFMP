'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
assert.match(publicExact, /window\\\.top\\\.location/,
  'PUBLIC doit neutraliser les navigations qui sortent du wrapper');
assert.match(publicExact, /EUC_DEV417_publicFastDetail/,
  'PUBLIC doit disposer d’une navigation rapide strictement en lecture seule');

const publicFamily = read('apps-script/Suivi_Conventions_Public_FamilleClone_V353.html');
assert.match(publicFamily, /target="_self"/,
  'famille PUBLIC: les liens doivent rester dans le wrapper');
assert.doesNotMatch(publicFamily, /window\.top\.location/,
  'famille PUBLIC: un clic classe sort encore du sous-domaine');

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

console.log('✓ DEV417 : chargeur apprentis, bulles et compteurs protégés');
