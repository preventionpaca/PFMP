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

const entConfig = read('apps-script/EUC_ENT_Config.js');
assert.match(entConfig, /EUC_ENT_DOC_ID_RECETTE_AUTORISE\s*=\s*'j1jDArBkzi7P'/,
  'la garde Grist doit viser exclusivement la recette autorisée');
assert.doesNotMatch(entConfig, /b2CyeMEdVEMS|3pnVrygfNn7c/,
  'une cible Grist non autorisée subsiste dans la configuration active');

const auth = read('apps-script/EUC_PFMP_DEV270B_MultiDomainAuth.js');
assert.match(auth, /EUC_DEV270B_HMAC_SECRET/,
  'le secret HMAC doit provenir des propriétés privées Apps Script');
assert.doesNotMatch(auth, /var\s+EUC_DEV270B_SECRET_\s*=\s*['"][0-9a-f]{32,}/i,
  'un secret HMAC est encore codé en dur');

console.log('✓ DEV417 : chargeur apprentis, bulles et compteurs protégés');
