const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'pfmp-release.sh'), 'utf8');
const verifier = fs.readFileSync(path.join(root, 'scripts', 'verify-pfmp-release.js'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'scripts', 'build-pfmp-apps-script-package.sh'), 'utf8');
const channel = fs.readFileSync(path.join(root, 'apps-script', 'EUC_PFMP_ReleaseChannel.js'), 'utf8');
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

test('le bleu est un projet séparé et les deux URL vertes restent connues', () => {
  assert.notEqual(config.channels.development.projectId, config.projectId);
  assert.equal(config.channels.development.projectId, '1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo');
  assert.equal(config.channels.development.deploymentId, 'AKfycbxZ24Op4PNUx6_SfDhA_3vOYTv4vUVRHTVrtjg1bYQ');
  assert.equal(config.channels.development.endpoint, 'dev');
  assert.equal(config.channels.stableAdmin.projectId, config.projectId);
  assert.equal(config.channels.stablePublic.projectId, config.projectId);
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
  assert.match(prepare, /clasp push --force/);
  assert.match(prepare, /write_clasp_project "\$package_dir" "\$development_project_id"/);
  assert.doesNotMatch(prepare, /deploy_version|clasp deploy/);
  assert.match(prepare, /--channel development/);
  assert.match(prepare, /write_pending "\$commit" "\$package_hash"/);
  assert.match(prepare, /approve-development \$commit 25-ROUTES-VALIDEES/);
});

test('l homologation manuelle exige le commit exact et relit le distant bleu', () => {
  const start = script.indexOf('approve_development()');
  const end = script.indexOf('\npromote()', start);
  const approve = script.slice(start, end);
  assert.match(approve, /25-ROUTES-VALIDEES/);
  assert.match(approve, /approved_commit.*pending_commit.*current/s);
  assert.match(approve, /package_hash.*pending_hash/s);
  assert.match(approve, /remote_hash.*pending_hash/s);
  assert.match(approve, /manual-browser-25-routes/);
  assert.doesNotMatch(approve, /clasp deploy|deploy_version/);
});

test('promote relit le bleu puis copie le même paquet vers le projet stable', () => {
  const start = script.indexOf('promote()');
  const end = script.indexOf('\nrollback()', start);
  const promote = script.slice(start, end);
  const blue = promote.indexOf('write_clasp_project "$package_dir" "$development_project_id"');
  const green = promote.indexOf('write_clasp_project "$package_dir" "$stable_project_id"');
  assert.ok(blue >= 0 && green > blue);
  assert.match(promote, /clasp push --force/);
  assert.match(promote, /Copie exacte du candidat valide vers le projet stable/);
});

test('le paquet publie un point d entrée commun avec repère bleu ou vert', () => {
  assert.match(builder, /function EUC_RELEASE_doGetCore_\(e\)/);
  assert.match(builder, /function doGet\(e\).*EUC_RELEASE_doGet_\(e\)/s);
  assert.match(builder, /Routeur doGet inattendu/);
  assert.match(channel, /MODE DÉVELOPPEMENT — SITE BLEU — RECETTE SÉPARÉE/);
  assert.match(channel, /ENVIRONNEMENT VERT — VERSION EN LIGNE/);
  assert.match(channel, /data-pfmp-release-channel/);
});

test('la configuration bleue reste en recette et désactive les mutations', () => {
  assert.match(channel, /EUC_RELEASE_RECIPE_HOST_ = 'https:\/\/camin\.getgrist\.com'/);
  assert.match(channel, /EUC_RELEASE_RECIPE_DOC_ID_ = 'kB8bvDag8x7D'/);
  assert.doesNotMatch(channel, /3pnVrygfNn7c/);
  assert.match(channel, /EUC_PFMP_SUBMISSION_MODE: 'DRY_RUN'/);
  assert.match(channel, /EUC_PFMP_EMAIL_MODE: 'DISABLED'/);
  assert.match(channel, /EUC_PFMP_PRONOTE_IMPORT_MODE: 'DRY_RUN'/);
  assert.match(channel, /EUC_PFMP_ADMIN_MUTATION_MODE: 'DRY_RUN'/);
  assert.doesNotMatch(channel, /EUC_ENT_GRIST_API_KEY\s*:/);
  assert.match(channel, /function EUC_RELEASE_ensureBlueSafety_/);
  assert.match(channel, /EUC_RELEASE_ensureBlueSafety_\(\);\s*return EUC_RELEASE_decorateOutput_/s);
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
