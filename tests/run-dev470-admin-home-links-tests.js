const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps-script');
const homeUrl = 'https://alternance.loucodi.fr/';
let passed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
    passed++;
  } catch (error) {
    console.error('✗', name, error.message);
    process.exitCode = 1;
  }
}

function read(file) {
  return fs.readFileSync(path.join(appDir, file), 'utf8');
}

const labelledFiles = [
  'Apprentissage_PFMP_V190X.html',
  'EUC_PFMP_DEV459_CanonicalViews.js',
  'Geocodage_PFMP_DEV441.html',
  'Migration_JotForm_PFMP_V160.html',
  'Suivi_Conventions_Admin_Summary_V348.html',
  'Suivi_Conventions_Famille_DEV459.html',
  'Suivi_PFMP_Classe_Detail_V156.html'
];

test('tous les fichiers affichant Accueil PFMP connaissent le sous-domaine canonique', () => {
  for (const file of labelledFiles) {
    assert.ok(read(file).includes(homeUrl), file + ' ne contient pas la destination canonique');
  }
});

test('le détail de classe envoie Accueil PFMP vers le sous-domaine', () => {
  assert.match(read('Suivi_PFMP_Classe_Detail_V156.html'), /var accueil='https:\/\/alternance\.loucodi\.fr\/'/);
  assert.doesNotMatch(read('Suivi_PFMP_Classe_Detail_V156.html'), /var accueil=make\('admin-pfmp'/);
});

test('les vues canoniques de synthèse et de famille utilisent le sous-domaine', () => {
  for (const file of [
    'Suivi_Conventions_Admin_Summary_V348.html',
    'Suivi_Conventions_Famille_DEV459.html',
    'EUC_PFMP_DEV459_CanonicalViews.js'
  ]) {
    assert.ok(read(file).includes(homeUrl), file);
  }
});

test('les modules administratifs secondaires utilisent le sous-domaine', () => {
  for (const file of [
    'Apprentissage_PFMP_V190X.html',
    'Geocodage_PFMP_DEV441.html',
    'Migration_JotForm_PFMP_V160.html'
  ]) {
    assert.ok(read(file).includes(homeUrl), file);
  }
});

test('la consultation publique des apprentis conserve sa route publique', () => {
  const source = read('Apprentissage_PFMP_V190X.html');
  assert.match(source, /ro\?PUBLIC\+'\?page=suivi-conventions-public':'https:\/\/alternance\.loucodi\.fr\/'/);
});

test('les anciens wrappers de mesure restent appelables sans écriture', () => {
  const source = read('EUC_PFMP_DEV470_ProfilerCompat.js');
  for (const name of ['EUC_DEV394_begin_', 'EUC_DEV394_mark_', 'EUC_DEV394_finish_']) {
    assert.match(source, new RegExp('function ' + name.replace('_', '\\_') + '\\('));
  }
  assert.doesNotMatch(source, /PropertiesService|UrlFetchApp|EUC_ENT_grist/);
});

if (!process.exitCode) console.log(`\n${passed} tests DEV470 navigation Accueil réussis.`);
