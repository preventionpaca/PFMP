const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'apps-script');
const manifestPath = path.join(root, 'Documentation', 'snapshots', 'apps-script-v722.sha256');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const expected = new Map(
  read('Documentation/snapshots/apps-script-v722.sha256')
    .trim()
    .split('\n')
    .map((line) => {
      const match = line.match(/^([a-f0-9]{64})  (.+)$/);
      assert.ok(match, `Ligne d'empreinte invalide : ${line}`);
      return [match[2], match[1]];
    })
);

const actualFiles = fs.readdirSync(sourceDir)
  .filter((name) => fs.statSync(path.join(sourceDir, name)).isFile())
  .sort();

assert.strictEqual(expected.size, 343, 'Le manifeste v722 doit contenir exactement 343 fichiers.');
assert.deepStrictEqual(actualFiles, [...expected.keys()].sort(), 'La liste locale diffère du snapshot Apps Script v722.');

for (const [name, digest] of expected) {
  assert.strictEqual(sha256(path.join(sourceDir, name)), digest, `Contenu différent pour ${name}`);
}

const clasp = JSON.parse(read('.clasp.json'));
assert.strictEqual(clasp.scriptId, '1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c');
assert.strictEqual(clasp.rootDir, 'apps-script');

const appManifest = JSON.parse(read('apps-script/appsscript.json'));
assert.strictEqual(appManifest.webapp.executeAs, 'USER_DEPLOYING');
assert.strictEqual(appManifest.webapp.access, 'ANYONE_ANONYMOUS');

assert.match(read('apps-script/EUC_PFMP_DEV401_DetailRepair.js'), /EUC_DEV401_/);
assert.match(read('apps-script/EUC_PFMP_DEV415_PublicAdminExact.js'), /EUC_DEV415_/);
assert.match(read('apps-script/EUC_PFMP_DEV416_Performance.js'), /EUC_DEV416_/);
assert.match(read('apps-script/EUC_PFMP_DEV416_Performance.js'), /cache final du détail enrichi \+ préchauffage/);
assert.ok(fs.existsSync(path.join(sourceDir, 'EUC_PFMP_DEV275_ApprentisSuivi.js')));
assert.ok(fs.existsSync(path.join(sourceDir, 'Suivi_PFMP_Classe_PublicClone_V353.html')));

const config = read('apps-script/EUC_PFMP_Config.js');
assert.match(config, /EUC_PFMP_SUBMISSION_MODE/);
assert.match(config, /DRY_RUN/);
assert.match(config, /EUC_PFMP_EMAIL_MODE/);
assert.match(config, /DISABLED/);
assert.match(config, /EUC_PFMP_PRONOTE_IMPORT_MODE/);
assert.match(config, /EUC_PFMP_ADMIN_MUTATION_MODE/);

const allSource = actualFiles.map((name) => read(`apps-script/${name}`)).join('\n');
assert.doesNotMatch(allSource, /AIza[0-9A-Za-z_-]{30,}/, 'Clé API Google potentielle détectée.');
assert.doesNotMatch(allSource, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'Clé privée détectée.');

console.log('✓ snapshot Apps Script v722 : 343 fichiers et empreintes conformes');
console.log('✓ configuration clasp locale limitée à apps-script/');
console.log('✓ composants DEV401, DEV415 et DEV416 présents');
console.log('✓ modes de sécurité référencés et aucun secret évident détecté');
