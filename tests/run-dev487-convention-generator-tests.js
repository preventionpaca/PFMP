const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const assert = require('assert');

let count = 0;
function test(name, fn) {
  try {
    fn();
    count++;
    console.log('✓', name);
  } catch (error) {
    console.error('✗', name, error.message);
    process.exitCode = 1;
  }
}

test("le paquet n'embarque plus l'ancien audit P7.1B", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pfmp-dev487-'));
  try {
    execFileSync('bash', ['scripts/build-pfmp-apps-script-package.sh', temp], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    const app = path.join(temp, 'apps-script');
    assert.equal(fs.existsSync(path.join(app, 'EUC_PFMP_PerfAuditP71.js')), false);
    assert.equal(fs.existsSync(path.join(app, 'EUC_PFMP_PerfAuditP71.gs')), false);

    const servicePath = [
      path.join(app, 'EUC_CONVENTION_PFMP_Service.gs'),
      path.join(app, 'EUC_CONVENTION_PFMP_Service.js')
    ].find(fs.existsSync);
    assert.ok(servicePath, 'service du générateur absent du paquet');
    const service = fs.readFileSync(servicePath, 'utf8');
    assert.match(service, /function EUC_CONVENTION_lireElevesAdmin\(\)/);
    assert.match(service, /function EUC_CONVENTION_lireClassesEtPeriodesAdmin\(\)/);
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
});

test('aucun wrapper publié ne référence les anciens symboles P7.1B', () => {
  const build = fs.readFileSync('scripts/build-pfmp-apps-script-package.sh', 'utf8');
  assert.match(build, /rm -f[\s\S]*EUC_PFMP_PerfAuditP71\.js/);
});

if (!process.exitCode) console.log(`\n${count} tests DEV487 générateur de conventions réussis.`);
