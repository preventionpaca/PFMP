const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'apps-script', 'EUC_MIGRATION_JOTFORM_V160.gs'), 'utf8');
const generator = fs.readFileSync(path.join(root, 'apps-script', 'Convention_PFMP_Generateur.html'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'scripts', 'build-pfmp-apps-script-package.sh'), 'utf8');
let passed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log('✓', name); }
  catch (error) { console.error('✗', name, error.message); process.exitCode = 1; }
}

test('la fonction historique JotForm conserve le point d origine attendu par DEV331', () => {
  assert.match(migration, /function EUC_V160_importCsv__DEV331_ORIG\s*\(/);
  assert.doesNotMatch(migration, /function EUC_V160_importCsv\s*\(/);
});

test('le constructeur refuse tout symbole ORIG appelé mais absent du paquet final', () => {
  assert.match(builder, /Points d’origine absents du paquet Apps Script/);
  assert.match(builder, /source\.match\(\/\\b\[A-Za-z_\$\]/);
  assert.match(builder, /ORIG\\b\/g/);
});

test('le générateur expose un fil d Ariane administratif complet', () => {
  assert.match(generator, /aria-label="Fil d’Ariane"/);
  assert.match(generator, />Accueil PFMP<\/a>[\s\S]*>Administration PFMP<\/a>[\s\S]*<strong>Générer les conventions<\/strong>/);
});

test('le générateur propose un bouton explicite de retour à l accueil', () => {
  assert.match(generator, /id="homeButton"[\s\S]*← Retour à l’accueil PFMP/);
  assert.match(generator, /href="https:\/\/alternance\.loucodi\.fr\/"/);
  assert.match(generator, /target="_top"/);
});

if (!process.exitCode) console.log(`\n${passed} tests DEV491 régressions production réussis.`);
