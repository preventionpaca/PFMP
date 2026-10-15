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

test('le retrait n’enlève que le code que rien ne peut appeler, chaînes comprises', () => {
  const cp = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev574b-'));
  fs.writeFileSync(path.join(dir, 'A.js'), [
    'function EUC_page(){return EUC_aide_()}',
    'function EUC_aide_(){return 1}',
    'function EUC_mort(){return EUC_mortAide_()}',
    'function EUC_mortAide_(){return 2}',
    'function EUC_refreshScheduled(){return 3}',
    'function EUC_double(){return 4}',
    'function doGet(e){return HtmlService.createTemplateFromFile("Utilisee").evaluate()}',
    'function EUC_dyn(){return this["EUC_parTexte"]()}',
    'function EUC_parTexte(){return 5}',
    'var EUC_GARDE_ = EUC_dyn;'
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'B.js'), 'function EUC_double(){return 6}');
  fs.writeFileSync(path.join(dir, 'Utilisee.html'), '<script>google.script.run.EUC_page()</script>');
  fs.writeFileSync(path.join(dir, 'Oubliee.html'), '<p>jamais servie</p>');
  fs.writeFileSync(path.join(dir, 'Vide.js'), 'function EUC_seul(){return 7}');
  const out = cp.execFileSync(process.execPath, ['--expose-internals', path.join(root, 'scripts/strip-dead-code.js'), dir, path.join(dir, 'rapport.json')], { encoding: 'utf8' });
  const r = JSON.parse(fs.readFileSync(path.join(dir, 'rapport.json'), 'utf8'));
  assert.deepEqual(r.fonctions.sort(), ['EUC_mort', 'EUC_mortAide_', 'EUC_seul'].sort());
  assert.deepEqual(r.modeles, ['Oubliee.html']);
  assert.deepEqual(r.fichiersVides, ['Vide.js']);
  const a = fs.readFileSync(path.join(dir, 'A.js'), 'utf8');
  for (const garde of ['EUC_page', 'EUC_aide_', 'EUC_refreshScheduled', 'EUC_double', 'doGet', 'EUC_dyn', 'EUC_parTexte']) assert.match(a, new RegExp('function ' + garde + '\\('), garde);
  assert.ok(fs.existsSync(path.join(dir, 'Utilisee.html')) && !fs.existsSync(path.join(dir, 'Oubliee.html')) && !fs.existsSync(path.join(dir, 'Vide.js')));
  const c = { HtmlService: { createTemplateFromFile: () => ({ evaluate: () => 'ok' }) } }; vm.createContext(c);
  vm.runInContext(a + '\n' + fs.readFileSync(path.join(dir, 'B.js'), 'utf8'), c);
  assert.equal(c.EUC_page(), 1); assert.equal(c.EUC_dyn(), 5); assert.equal(c.doGet(), 'ok');
  assert.match(out, /Code inatteignable retiré : 3 fonctions, 1 modèles HTML, 1 fichiers vidés/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('la construction retire le code inatteignable après la minification', () => {
  const iMin = build.indexOf('minify-apps-script.js'), iStrip = build.indexOf('strip-dead-code.js');
  assert.ok(iStrip > iMin, 'les commentaires ne doivent plus retenir de code mort');
  assert.match(build, /node --expose-internals "\$script_dir\/strip-dead-code\.js"/);
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); console.error(e); process.exit(1); }
  }
  console.log(`\n${n} tests DEV574 allègement du script réussis.`);
})();
