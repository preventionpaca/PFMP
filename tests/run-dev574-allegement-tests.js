'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const build = read('scripts/build-pfmp-apps-script-package.sh');
const { minifier } = require(path.join(root, 'scripts/minify-apps-script.js'));
let n = 0;
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('la construction du paquet allège le code serveur après la liste du verrou', () => {
  const iListe = build.indexOf('generate-acces-liste.js'), iMin = build.indexOf('minify-apps-script.js');
  assert.ok(iListe > 0 && iMin > iListe, 'la liste des fonctions est calculée sur le code lisible');
  assert.match(build, /PFMP_SANS_MINIFICATION/);
});

test('l’allègement garde les noms, le comportement et ne touche pas aux pages HTML', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev574-'));
  const source = '/** Commentaire long qui disparaît. */\nvar EUC_X_CONFIG_ = { seuil: 3 }; // réglage\n\nfunction EUC_X_calcul(a, b) {\n  /* somme */\n  return a + b + EUC_X_CONFIG_.seuil;\n}\nfunction doGet(e) { return EUC_X_calcul(1, 2); }\n';
  fs.writeFileSync(path.join(dir, 'A.js'), source);
  fs.writeFileSync(path.join(dir, 'B.gs'), 'function EUC_Y_() { return "texte // pas un commentaire"; }\n');
  fs.writeFileSync(path.join(dir, 'Page.html'), '<!-- garde --><script>google.script.run.EUC_X_calcul(1,2)</script>');
  const r = await minifier(dir);
  assert.equal(r.fichiers, 2);
  assert.ok(r.apres < r.avant);
  const a = fs.readFileSync(path.join(dir, 'A.js'), 'utf8'), b = fs.readFileSync(path.join(dir, 'B.gs'), 'utf8');
  assert.doesNotMatch(a, /Commentaire|réglage|somme/);
  assert.match(a, /function EUC_X_calcul\(a,b\)/);
  const c = {}; vm.createContext(c); vm.runInContext(a + b, c);
  assert.equal(c.doGet(), 6);
  assert.equal(c.EUC_Y_(), 'texte // pas un commentaire');
  assert.equal(fs.readFileSync(path.join(dir, 'Page.html'), 'utf8'), '<!-- garde --><script>google.script.run.EUC_X_calcul(1,2)</script>');
  fs.rmSync(dir, { recursive: true, force: true });
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); console.error(e); process.exit(1); }
  }
  console.log(`\n${n} tests DEV574 allègement du script réussis.`);
})();
