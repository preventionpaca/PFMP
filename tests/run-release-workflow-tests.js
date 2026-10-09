const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'pfmp-release.sh'), 'utf8');
const verifier = fs.readFileSync(path.join(root, 'scripts', 'verify-pfmp-release.js'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'scripts', 'build-pfmp-apps-script-package.sh'), 'utf8');
const channel = fs.readFileSync(path.join(root, 'apps-script', 'EUC_PFMP_ReleaseChannel.js'), 'utf8');
const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
const qualityContract = fs.readFileSync(
  path.join(root, 'Documentation', 'CONTRAT_QUALITE_UI.md'), 'utf8'
);
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

test('release-stable publie directement le commit exact sur le vert', () => {
  const start = script.indexOf('release_stable()');
  const end = script.indexOf('\nrollback()', start);
  const release = script.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(release, /node tests\/run-tests\.js/);
  assert.match(release, /write_clasp_project "\$package_dir" "\$stable_project_id"/);
  assert.match(release, /clasp push --force/);
  assert.match(release, /pull_remote "\$package_dir" "\$remote_dir"/);
  assert.match(release, /package_hash.*remote_hash/s);
  assert.match(release, /clasp version/);
  assert.match(release, /deploy_version "\$package_dir" "\$admin_id"/);
  assert.match(release, /deploy_version "\$package_dir" "\$public_id"/);
  assert.match(release, /--channel stable/);
  assert.doesNotMatch(release, /development_project_id|--channel development/);
});

test('le script de publication ne propose plus aucune commande bleue', () => {
  const commandSwitch = script.slice(script.indexOf('case "$command" in'));
  assert.doesNotMatch(commandSwitch, /prepare\)|approve-development\)|check-development\)|promote\)/);
  assert.doesNotMatch(script.slice(0, script.indexOf('tree_hash()')), /development_project_id|development_id/);
  assert.match(commandSwitch, /release-stable\) release_stable/);
});

test('le paquet publie un point d entrée commun avec repère bleu ou vert', () => {
  assert.match(builder, /function EUC_RELEASE_doGetCore_\(e\)/);
  assert.match(builder, /function doGet\(e\).*EUC_RELEASE_doGet_\(e\)/s);
  assert.match(builder, /Routeur doGet inattendu/);
  assert.match(channel, /MODE DÉVELOPPEMENT — SITE BLEU — RECETTE SÉPARÉE/);
  assert.match(channel, /ENVIRONNEMENT VERT — VERSION EN LIGNE/);
  assert.match(channel, /data-pfmp-release-channel/);
});

test('la configuration bleue reste en recette et n’autorise que l’import Pronote de test', () => {
  assert.match(channel, /EUC_RELEASE_RECIPE_HOST_ = 'https:\/\/camin\.getgrist\.com'/);
  assert.match(channel, /EUC_RELEASE_RECIPE_DOC_ID_ = 'kB8bvDag8x7D'/);
  assert.doesNotMatch(channel, /3pnVrygfNn7c/);
  assert.match(channel, /EUC_PFMP_SUBMISSION_MODE: 'DRY_RUN'/);
  assert.match(channel, /EUC_PFMP_EMAIL_MODE: 'DISABLED'/);
  assert.match(channel, /EUC_PFMP_PRONOTE_IMPORT_MODE: 'RECIPE_DATA'/);
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

test('le vérificateur rejoue une seule fois les démarrages à froid', () => {
  assert.match(verifier, /const firstFailures = results\.filter\(result => !result\.ok\)/);
  assert.match(verifier, /Promise\.all\(firstFailures\.map\(result => verify\(result\.route\)\)\)/);
  assert.match(verifier, /OK \(2e tentative\)/);
  assert.doesNotMatch(verifier, /while\s*\(/);
});

test('le contrat permanent retire le bleu du workflow courant', () => {
  assert.match(agents, /Toute évolution applicative commence sur une branche Git/);
  assert.match(agents, /Le canal bleu est retiré du workflow courant/);
  assert.match(agents, /scripts\/pfmp-release\.sh release-stable/);
  assert.match(agents, /25 routes vertes/);
  assert.match(qualityContract, /Publication directe sur le vert/);
  assert.match(qualityContract, /scripts\/pfmp-release\.sh release-stable/);
  assert.match(qualityContract, /25\/25.*routes vertes/);
});

test('le contrat permanent autorise la publication verte sans nouvelle confirmation', () => {
  assert.match(agents, /autorisation permanente de publier automatiquement/);
  assert.match(agents, /sans lui redemander une autorisation de déploiement/);
  assert.match(qualityContract, /L'autorisation de publication sur le vert est permanente/);
  for (const contents of [agents, qualityContract]) {
    assert.match(contents, /n'autorise aucun(?:e)? (?:action métier réelle|import)/i);
  }
});

test('le contrat permanent protège accueil, navigation et boutons asynchrones', () => {
  for (const contents of [agents, qualityContract]) {
    assert.ok(contents.includes('https://alternance.loucodi.fr/'));
    assert.match(contents, /liens et boutons|liens, carte ou bouton/i);
    assert.match(contents, /spinner/i);
    assert.match(contents, /double clic/i);
    assert.match(contents, /succès, erreur/);
  }
  assert.match(agents, /bleu.*sans une demande explicite/i);
  assert.match(qualityContract, /bleu.*sans demande explicite/i);
});

if (!process.exitCode) {
  console.log(`\n${passed} tests du workflow de release réussis.`);
}
