const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const childProcess = require('child_process');

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

test('la route Sans convention livre son modèle HTML', () => {
  const server = read('EUC_PFMP_DEV370_AdminTools.js');
  const file = 'Sans_Convention_PFMP_V368.html';
  assert.match(server, /createTemplateFromFile\('Sans_Convention_PFMP_V368'\)/);
  assert.ok(fs.existsSync(path.join(appDir, file)), file + ' absent du paquet');
  assert.match(read(file), /Élèves sans convention/);
});

test('la route Accès PP admin livre son modèle HTML', () => {
  const server = read('EUC_PFMP_DEV441_AccesPpGeocodage.js');
  const file = 'Acces_PP_Admin_DEV441.html';
  assert.match(server, /EUC_DEV441_render_\('Acces_PP_Admin_DEV441'/);
  assert.ok(fs.existsSync(path.join(appDir, file)), file + ' absent du paquet');
  assert.match(read(file), /Accès temporaires des professeurs principaux/);
});

test('les routes publiques PP et cartographie livrent aussi leurs modèles', () => {
  const server = read('EUC_PFMP_DEV441_AccesPpGeocodage.js');
  const expected = [
    ['Acces_PP_DEV441.html', /EUC_DEV441_render_\('Acces_PP_DEV441'/, /Affectations PFMP — professeur principal/],
    ['Cartographie_PFMP_DEV441.html', /EUC_DEV441_render_\('Cartographie_PFMP_DEV441'/, /Cartographie des entreprises PFMP/]
  ];
  for (const [file, routePattern, titlePattern] of expected) {
    assert.match(server, routePattern);
    assert.ok(fs.existsSync(path.join(appDir, file)), file + ' absent du paquet');
    assert.match(read(file), titlePattern);
  }
});

test('les deux écrans administratifs reviennent à l’accueil canonique', () => {
  for (const file of ['Sans_Convention_PFMP_V368.html', 'Acces_PP_Admin_DEV441.html']) {
    const source = read(file);
    assert.ok(source.includes(homeUrl), file + ' ne contient pas le sous-domaine canonique');
    assert.match(source, /href="https:\/\/alternance\.loucodi\.fr\/"[^>]*target="_top"/);
  }
});

test('le centre envoie chaque outil vers le déploiement correspondant à son rôle', () => {
  const home = read('Admin_PFMP.html');
  const server = read('EUC_CENTRE_ADMIN_PFMP_WebApp.gs');
  assert.match(home, /href="<\?= adminBase \?>\?page=admin-conventions-pfmp"/);
  assert.match(home, /href="<\?= adminBase \?>\?page=conventions-pfmp"/);
  assert.match(home, /href="<\?= publicBase \?>\?page=apprentissage-public-pfmp"/);
  assert.match(home, /href="<\?= publicBase \?>\?page=suivi-conventions-public"/);
  assert.doesNotMatch(home, /AKfycby6ykCxT|AKfycbwQoKZOD/);
  assert.match(server, /tpl\.adminBase=adminBase/);
  assert.match(server, /tpl\.publicBase=publicBase/);
  assert.ok(server.indexOf('tpl.adminBase=adminBase') < server.indexOf('tpl.evaluate()'));
});

test('les vues administratives n’embarquent plus l’URL du déploiement public', () => {
  const publicId = 'AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA';
  assert.doesNotMatch(read('EUC_PFMP_DEV340_ConsolidationLive.js').split('\n')[1], new RegExp(publicId));
  assert.doesNotMatch(read('EUC_PFMP_DEV464_DossierApprentissage.js').split('\n')[2], new RegExp(publicId));
  assert.match(read('Suivi_PFMP_Classe_Detail_V156.html'), /var BASE=String\(C&&C\.baseUrl\|\|''\)/);
});

test('le catalogue géocodage réutilise le catalogue autonome déjà publié', () => {
  const source = read('EUC_PFMP_DEV441_AccesPpGeocodage.js');
  assert.doesNotMatch(source, /EUC_DEV190G1_fastFamilyIndex\(\{annee:year,famille:f\}\)/);
  assert.match(source, /catalog=EUC_DEV368_catalog\(year\)/);
  const ctx = {
    console, Date, Math, JSON, String, Number, Object, Array, RegExp,
    EUC_DEV368_admin: () => ({email: 'admin@example.test'}),
    EUC_DEV368_year: value => String(value || '2026-2027'),
    EUC_DEV368_catalog: year => ({annee: year, classes: [
      {famille: 'BACPRO', classeId: 24, classe: 'TCAR', periodes: [{id: 62, libelle: 'PFMP n°1', debut: '28/09/2026', fin: '16/10/2026'}]}
    ]})
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  const result = ctx.EUC_DEV441_catalog_('2026-2027', true);
  assert.equal(result.classes.length, 1);
  assert.equal(result.classes[0].classe, 'TCAR');
  assert.equal(result.classes[0].periodes[0].id, 62);
});

test('toutes les destinations de l’accueil ont une route prioritaire', () => {
  const source = read('EUC_PFMP_DEV481_AdminRoutes.js');
  const expectedPages = [
    'admin-pfmp',
    'admin-conventions-pfmp',
    'apprentissage-pfmp',
    'apprentissage-public-pfmp',
    'conventions-pfmp',
    'destinataires-envois-pfmp',
    'diplomes-classes-pfmp',
    'dossier-apprentissage-pfmp',
    'gestion-pfmp',
    'import-prof-classes-pfmp',
    'import-pronote-pfmp',
    'migration-jotform-pfmp',
    'parametres-convention-pfmp',
    'parametres-envois-pfmp',
    'parcours-differencie-pfmp',
    'snapshot-pfmp-admin',
    'suivi-conventions',
    'suivi-pfmp',
    'suivi-pfmp-classes'
  ];
  for (const page of expectedPages) {
    assert.ok(source.includes(`case '${page}':`), `${page} n’est pas routée`);
  }
  const edt = read('EDT.js');
  assert.ok(
    edt.indexOf('EUC_DEV481_routeAccueil_') < edt.indexOf('EUC_DEV190O_route_'),
    'le routeur accueil doit précéder les routeurs historiques'
  );
});

test('les routeurs historiques optionnels ne peuvent plus bloquer les autres pages', () => {
  const edt = read('EDT.js');
  for (const name of [
    'EUC_DEV190O_route_',
    'EUC_DEV190L_route_',
    'EUC_DEV190K4_route_',
    'EUC_DEV190K3_route_',
    'EUC_DEV190K2_route_',
    'EUC_DEV190K_routePrioritaire_'
  ]) {
    assert.match(edt, new RegExp(`typeof ${name}===['"]function['"]`));
  }
});

test('la maintenance snapshot reçoit son URL de base avant évaluation', () => {
  const source = read('EUC_PFMP_DEV481_AdminRoutes.js');
  const start = source.indexOf('function EUC_DEV481_afficherSnapshot_');
  const end = source.indexOf('\nfunction ', start + 1);
  const fn = source.slice(start, end < 0 ? source.length : end);
  assert.match(fn, /template\.baseUrl\s*=\s*ScriptApp\.getService\(\)\.getUrl\(\)/);
  assert.ok(
    fn.indexOf('template.baseUrl') < fn.indexOf('template.evaluate()'),
    'baseUrl doit être défini avant evaluate()'
  );
});

test('le paquet versionné contient les modules et modèles des routes de l’accueil', () => {
  const required = [
    'EUC_PFMP_DEV481_AdminRoutes.js',
    'EUC_PFMP_DEV453_ImportNavigation.js',
    'EDT_WebApp.html',
    'Sans_Convention_PFMP_V368.html',
    'Acces_PP_Admin_DEV441.html',
    'Acces_PP_DEV441.html',
    'Cartographie_PFMP_DEV441.html',
    'Suivi_PFMP_Classe_Public_DEV455.html'
  ];
  const tracked = new Set(childProcess.execFileSync(
    'git', ['ls-files', '--cached', 'apps-script'], {cwd: root, encoding: 'utf8'}
  ).trim().split(/\n/).map(file => path.basename(file)));
  for (const file of required) {
    assert.ok(fs.existsSync(path.join(appDir, file)), `${file} absent du répertoire`);
    assert.ok(tracked.has(file), `${file} absent du paquet Git`);
  }
});

test('la récupération complète contient les moteurs historiques requis', () => {
  const base = '18addabe4882ab4c5381fb158e5ad98117621b02';
  const inherited = [
    'EUC_PFMP_DEV190O_Routes.js',
    'EUC_PFMP_DEV190_Snapshot.js',
    'EUC_PFMP_PerfAuditP7.js',
    'EUC_ADMIN_CONVENTIONS_PerfP3.js',
    'EUC_CONVENTION_PFMP_AdminWorkflowV144.js',
    'EUC_CONVENTION_PFMP_PerfP4.js',
    'EUC_CONVENTION_PFMP_PerfP5.js',
    'EUC_PFMP_PerfP6.js',
    'EUC_MIGRATION_JOTFORM_V160.js',
    'EUC_SUIVI_PFMP_DestinatairesV158.js',
    'EUC_SUIVI_PFMP_EnvoisV157.js',
    'EUC_PFMP_DEV252_PublicApprentis.js',
    'Suivi_Conventions_Admin_LazyV190K4.html',
    'Snapshot_PFMP_Admin_V190.html'
  ];
  for (const file of inherited) {
    childProcess.execFileSync(
      'git', ['cat-file', '-e', `${base}:apps-script/${file}`],
      {cwd: root, stdio: 'ignore'}
    );
  }
});

test('le constructeur de paquet part de la récupération complète et évite tous les noms en conflit', () => {
  const source = fs.readFileSync(
    path.join(root, 'scripts', 'build-pfmp-apps-script-package.sh'), 'utf8'
  );
  assert.match(source, /18addabe4882ab4c5381fb158e5ad98117621b02/);
  assert.match(source, /git archive "\$complete_base_ref" apps-script/);
  assert.match(source, /git show "HEAD:\$source_file"/);
  assert.match(source, /html_base.*_Code/s);
  assert.match(source, /js\|gs\|html/);
  assert.match(source, /uniq -d/);
});

test('le suivi et la maintenance réécrivent Accueil PFMP vers le domaine canonique', () => {
  const source = read('EUC_PFMP_DEV481_AdminRoutes.js');
  assert.match(source, /template\.baseUrl = ScriptApp\.getService\(\)\.getUrl\(\)/);
  assert.ok(source.includes("'https://alternance.loucodi.fr/'"));
  assert.match(source, /page=admin-pfmp\/g/);
});

test('les quatre routes fragiles s’ouvrent sans lecture Grist bloquante', () => {
  const routes = read('EUC_PFMP_DEV481_AdminRoutes.js');
  const clean = read('EUC_PFMP_DEV190X_CleanModules.js');
  const destinataires = read('EUC_SUIVI_PFMP_DestinatairesV158.gs');
  const destinatairesHtml = read('Destinataires_Envois_PFMP_V158.html');
  const params = read('EUC_SUIVI_PFMP_EnvoisV157.gs');
  const paramsHtml = read('Parametres_Envois_PFMP_V157.html');

  assert.match(routes, /case 'admin-conventions-pfmp':[\s\S]*EUC_DEV498_afficherAdminConventions_/);
  assert.match(routes, /EUC_DEV498_tableAbsente_/);
  assert.match(routes, /tpl\.dossiersJson='\[\]'/);
  assert.doesNotMatch(
    clean.slice(clean.indexOf('function EUC_DEV190X_afficherPdif'), clean.indexOf('function EUC_DEV190X_getClasses')),
    /EUC_DEV285B_(?:ensureSchema_|migrateLegacy_)/
  );
  assert.match(destinataires, /dataJson=JSON\.stringify\(\{lignes:\[\],classes:\[\],filieres:\[\]\}\)/);
  assert.match(destinatairesHtml, /Chargement des destinataires…/);
  assert.match(destinatairesHtml, /\.EUC_V158_lire\(\)/);
  assert.match(params, /function EUC_V157_assurerTable_/);
  assert.match(params, /paramsJson=JSON\.stringify\(\{objet:'',message:'',destinataires:\[\]\}\)/);
  assert.match(paramsHtml, /Chargement des paramètres…/);
  assert.match(paramsHtml, /\.EUC_V157_lireParametres\(\)/);
  assert.ok(
    params.indexOf('EUC_V157_assurerTable_();') < params.indexOf("EUC_IMPORT_lireRecords_(EUC_V157_PARAMS_TABLE_)"),
    'la table de paramètres doit être assurée avant sa première lecture'
  );
});

test('la page des destinataires protège chargement et sauvegarde par spinner', () => {
  const html = read('Destinataires_Envois_PFMP_V158.html');
  assert.match(html, /id="save"[^>]*disabled/);
  assert.match(html, /status\.innerHTML='<span class="spinner"><\/span>Chargement/);
  assert.match(html, /save\.innerHTML='<span class="spinner"><\/span>Enregistrement en cours/);
  assert.match(html, /withFailureHandler\(function\(e\)[\s\S]*show\('Erreur/);
});

if (!process.exitCode) console.log(`\n${passed} tests DEV481 paquet des outils admin réussis.`);
