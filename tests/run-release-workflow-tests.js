const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'pfmp-release.sh'), 'utf8');
const verifier = fs.readFileSync(path.join(root, 'scripts', 'verify-pfmp-release.js'), 'utf8');
const config = JSON.parse(fs.readFileSync(
  path.join(root, 'scripts', 'pfmp-release-config.json'), 'utf8'
));
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

test('les canaux bleu et verts réutilisent uniquement les déploiements connus', () => {
  assert.equal(config.channels.development.deploymentId, 'AKfycbw0B6PpxJeuuMI0ymLnWFiGwPbyoaP0sUS4nLlwQBf4');
  assert.equal(config.channels.development.endpoint, 'dev');
  assert.equal(config.channels.stableAdmin.deploymentId, 'AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg');
  assert.equal(config.channels.stablePublic.deploymentId, 'AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA');
});

test('la matrice contrôle toutes les routes de l’accueil et le public', () => {
  assert.ok(config.routes.length >= 25);
  for (const page of [
    'admin-pfmp', 'import-pronote-pfmp', 'parametres-convention-pfmp',
    'sans-convention-pfmp', 'ordres-mission-pfmp', 'snapshot-pfmp-admin',
    'geocodage-pfmp-admin', 'suivi-conventions-public'
  ]) {
    assert.ok(config.routes.some(route => route.page === page), `${page} absente`);
  }
});

test('prepare ne modifie aucun déploiement stable', () => {
  const start = script.indexOf('prepare()');
  const end = script.indexOf('\npromote()', start);
  const prepare = script.slice(start, end);
  assert.match(prepare, /clasp push/);
  assert.doesNotMatch(prepare, /deploy_version|clasp deploy/);
  assert.match(prepare, /--channel development/);
});

test('la copie propre reste lisible par le navigateur de test', () => {
  assert.doesNotMatch(script, /mktemp -d \/tmp\/pfmp-release/);
  assert.match(script, /dirname \"\$repo_root\"/);
});

test('la relecture distante normalise uniquement l extension serveur clasp', () => {
  assert.match(script, /file\.replace\(\/\\\.gs\$\/, '\.js'\)/);
  assert.match(script, /Nom Apps Script dupliqué/);
  assert.match(script, /fs\.readFileSync\(path\.join\(dir, file\)\)/);
});

test('promote exige le même commit et le même contenu distant', () => {
  assert.match(script, /commit.*candidate_commit/s);
  assert.match(script, /remote_hash.*candidate_hash/s);
  assert.match(script, /Le HEAD distant a changé depuis la recette bleue/);
});

test('une recette verte en échec déclenche le retour automatique', () => {
  assert.match(script, /Recette verte en échec : retour automatique/);
  assert.match(script, /admin_previous/);
  assert.match(script, /public_previous/);
});

test('le vérificateur refuse erreurs runtime, login et contenu inattendu', () => {
  for (const marker of [
    'ReferenceError', 'TypeError:', 'SyntaxError:', 'Exception:',
    'Impossible de trouver le fichier HTML'
  ]) assert.ok(verifier.includes(marker));
  assert.match(verifier, /accounts\.google\.com/);
  assert.match(verifier, /Page Apps Script en erreur/);
  assert.match(verifier, /\^\(\?:Erreur\|Error\)\$/);
  assert.match(verifier, /body\.includes\(route\.expected\)/);
});

if (!process.exitCode) {
  console.log(`\n${passed} tests du workflow de release réussis.`);
}
