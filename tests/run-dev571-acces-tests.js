'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto'), os = require('os');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const verrou = read('apps-script/ZZ_EUC_ACCES_Verrou.js'), page = read('apps-script/Liens_Acces_DEV571.html'),
  release = read('apps-script/EUC_PFMP_ReleaseChannel.js'), routes = read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'),
  admin = read('apps-script/Admin_PFMP.html'), build = read('scripts/build-pfmp-apps-script-package.sh');
const generateur = require(path.join(root, 'scripts/generate-acces-liste.js'));
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }

const bytes = buf => [...buf].map(b => (b > 127 ? b - 256 : b));
/* Petit projet : une fonction publique, une utilisée par une page enseignant,
 * une utilisée par aucune page, et un déclencheur. */
function contexte(opts) {
  opts = opts || {};
  const props = opts.props || {}, cache = opts.cache || new Map(), appels = [];
  const c = {
    console, Reflect, JSON, Date, Math, Object, Array, String, Number, Error, Proxy,
    Session: {
      getActiveUser: () => ({ getEmail: () => opts.email || '' }),
      getEffectiveUser: () => ({ getEmail: () => 'proprietaire@lycee.test' }),
      getTemporaryActiveUserKey: () => (opts.cleTemp === undefined ? 'temp-1' : opts.cleTemp)
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
      computeDigest: (a, v) => bytes(crypto.createHash('sha256').update(String(v)).digest()),
      computeHmacSha256Signature: (v, k) => bytes(crypto.createHmac('sha256', String(k)).update(String(v)).digest()),
      getUuid: () => crypto.randomUUID(), formatDate: d => d.toISOString()
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null), getProperties: () => Object.assign({}, props),
      setProperty: (k, v) => { props[k] = String(v); }, setProperties: o => Object.assign(props, o)
    }) },
    CacheService: { getScriptCache: () => ({ get: k => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, String(v)), remove: k => cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: html => ({ html, getContent() { return this.html; }, setContent(v) { this.html = v; }, setTitle() { return this; }, addMetaTag() { return this; }, setXFrameOptionsMode(m) { this.xfo = m; return this; } }), XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' } },
    EUC_PFMP_contexteAdmin_: () => (opts.email === 'admin@lycee.test' ? { autorise: true, role: 'ADMIN_PFMP', email: opts.email } : null),
    EUC_DEV270B_lookupUser_: email => (email === 'admin@lycee.test' ? { autorise: true } : null)
  };
  vm.createContext(c);
  vm.runInContext(`
    function EUC_PUBLIC_book(q){ return 'book'; }
    function EUC_ENS_liste(q, opt){ return {q:q, opt:opt}; }
    function EUC_INTERNE_purge(){ return 'purge'; }
    function EUC_INTERNE_lireRole(){ return EUC_ENS_liste('interne'); }
    function EUC_DEV538_staffAllowed_(){ return false; }
    function doGet(e){ return EUC_ENS_liste('doGet'); }
    var EUC_ACCES_REFERENCEES_ = ['EUC_PUBLIC_book','EUC_ENS_liste'];
    var EUC_ACCES_PUBLIQUES_ = ['EUC_PUBLIC_book'];
  `, c);
  vm.runInContext(verrou, c);
  return { c, props, cache, appels };
}
const appel = (c, fn, args) => { try { return { ok: true, v: c[fn].apply(null, args || []) }; } catch (e) { return { ok: false, m: e.message }; } };

test('le verrou enveloppe les fonctions appelables et laisse les fonctions internes', () => {
  const { c } = contexte();
  assert.equal(c.__EUC_ACCES_INSTALLE__, true);
  assert.ok(c.EUC_ENS_liste.__eucAccesOriginal);
  assert.ok(c.doGet.__eucAccesOriginal);
  assert.equal(c.EUC_DEV538_staffAllowed_.__eucAccesOriginal, undefined);
});

test('un anonyme ne peut pas appeler une fonction qu’aucune page n’utilise', () => {
  const { c, cache } = contexte();
  assert.deepEqual(appel(c, 'EUC_INTERNE_purge'), { ok: false, m: 'Accès refusé.' });
  assert.ok(JSON.parse(cache.get('EUC_ACCES_JOURNAL'))['refus-fonction|EUC_INTERNE_purge']);
});

test('en transition, les fonctions des pages restent ouvertes et sont notées au journal', () => {
  const { c, cache } = contexte();
  assert.equal(appel(c, 'EUC_PUBLIC_book').v, 'book');
  assert.equal(appel(c, 'EUC_ENS_liste', ['a']).ok, true);
  assert.ok(JSON.parse(cache.get('EUC_ACCES_JOURNAL'))['appel-sans-cle|EUC_ENS_liste']);
});

test('le propriétaire (déclencheurs) et un administrateur passent partout', () => {
  assert.equal(appel(contexte({ email: 'proprietaire@lycee.test' }).c, 'EUC_INTERNE_purge').v, 'purge');
  assert.equal(appel(contexte({ email: 'admin@lycee.test' }).c, 'EUC_INTERNE_purge').v, 'purge');
  assert.equal(appel(contexte({ email: 'eleve@lycee.test' }).c, 'EUC_INTERNE_purge').ok, false);
});

test('les appels internes d’une fonction autorisée ne sont pas recontrôlés', () => {
  const { c } = contexte({ props: { EUC_ACCES_ENS_MODE: 'EXIGEE' } });
  assert.equal(appel(c, 'doGet', [{}]).ok, true);
});

function cleGeneree() {
  const a = contexte({ email: 'admin@lycee.test' });
  const res = a.c.EUC_ACCES_genererCle();
  const cle = new URL(res.liens[0].url).searchParams.get('acces');
  a.c.EUC_ACCES_changerMode('EXIGEE');
  return { props: a.props, cle, liens: res.liens };
}

test('la clé générée n’est conservée que sous forme d’empreinte et donne quatre liens', () => {
  const { props, cle, liens } = cleGeneree();
  assert.equal(cle.length, 64);
  assert.equal(JSON.stringify(props).includes(cle), false);
  assert.equal(props.EUC_ACCES_ENS_CLE_SHA256, crypto.createHash('sha256').update(cle).digest('hex'));
  assert.deepEqual(liens.map(l => new URL(l.url).hostname), ['pfmp.loucodi.fr', 'pfmp.loucodi.fr', 'apprentis.loucodi.fr', 'book-entreprise.loucodi.fr']);
  assert.equal(new URL(liens[3].url).searchParams.has('acces'), false);
});

test('clé exigée : un anonyme garde les pages publiques mais pas les fonctions enseignants', () => {
  const { props } = cleGeneree();
  const { c } = contexte({ props });
  assert.equal(appel(c, 'EUC_PUBLIC_book').ok, true);
  assert.deepEqual(appel(c, 'EUC_ENS_liste'), { ok: false, m: 'Accès refusé.' });
});

test('clé exigée : la page enseignant est refusée sans clé et ouverte avec la clé', () => {
  const { props, cle } = cleGeneree();
  const sans = contexte({ props, cache: new Map() }).c;
  assert.match(sans.EUC_ACCES_controlerRoute_({ parameter: { page: 'suivi-conventions-public' } }).getContent(), /data-euc-acces-requis="1"/);
  assert.notEqual(sans.EUC_ACCES_controlerRoute_({ parameter: { page: 'suivi-conventions-public', acces: 'x'.repeat(64) } }), null);
  const avec = contexte({ props, cache: new Map() }).c;
  assert.equal(avec.EUC_ACCES_controlerRoute_({ parameter: { page: 'suivi-conventions-public', acces: cle } }), null);
  assert.equal(avec.EUC_ACCES_controlerRoute_({ parameter: { page: 'book-entreprises-eleves-pfmp' } }), null);
  assert.notEqual(sans.EUC_ACCES_controlerRoute_({ parameter: { page: 'audit-dev235-1mp3d' } }), null);
});

test('la session ouverte par la clé sert aux pages et appels suivants du même navigateur', () => {
  const { props, cle } = cleGeneree();
  const cache = new Map();
  contexte({ props, cache }).c.EUC_ACCES_controlerRoute_({ parameter: { page: 'suivi-conventions-public', acces: cle } });
  const suite = contexte({ props, cache }).c;
  assert.equal(suite.EUC_ACCES_controlerRoute_({ parameter: { page: 'suivi-pfmp-classe-public' } }), null);
  assert.equal(appel(suite, 'EUC_ENS_liste').ok, true);
  const autre = contexte({ props, cache, cleTemp: 'temp-2' }).c;
  assert.equal(appel(autre, 'EUC_ENS_liste').ok, false);
});

test('le jeton signé ajouté aux appels est vérifié puis retiré des arguments', () => {
  const { props } = cleGeneree();
  const jeton = contexte({ props }).c.EUC_ACCES_creerJeton_();
  const c = contexte({ props, cache: new Map(), cleTemp: '' }).c;
  const r = appel(c, 'EUC_ENS_liste', ['q', { __eucAcces: jeton }]);
  assert.equal(r.ok, true);
  assert.equal(r.v.opt, undefined, 'la fonction ne doit jamais recevoir le jeton');
  const faux = contexte({ props, cache: new Map(), cleTemp: '' }).c;
  assert.equal(appel(faux, 'EUC_ENS_liste', ['q', { __eucAcces: jeton.replace(/.$/, x => x === '0' ? '1' : '0') }]).ok, false);
});

test('une fonction publique appelée avec le jeton reconnaît l’enseignant (carte du book professeurs)', () => {
  const { props } = cleGeneree();
  const jeton = contexte({ props }).c.EUC_ACCES_creerJeton_();
  const c = contexte({ props, cache: new Map(), cleTemp: '' }).c;
  vm.runInContext('function EUC_PUBLIC_carte(q){ return EUC_DEV538_staffAllowed_() ? "detail" : "familles"; }', c);
  c.EUC_ACCES_PUBLIQUES_.push('EUC_PUBLIC_carte'); c.EUC_ACCES_cacheEnsembles_ = null;
  c.EUC_PUBLIC_carte = c.EUC_ACCES_envelopper_('EUC_PUBLIC_carte', c.EUC_PUBLIC_carte);
  assert.equal(appel(c, 'EUC_PUBLIC_carte', [{}, { __eucAcces: jeton }]).v, 'detail');
  const anonyme = contexte({ props, cache: new Map(), cleTemp: '' }).c;
  vm.runInContext('function EUC_PUBLIC_carte(q){ return EUC_DEV538_staffAllowed_() ? "detail" : "familles"; }', anonyme);
  assert.equal(anonyme.EUC_PUBLIC_carte({}), 'familles');
});

test('une nouvelle clé invalide aussitôt l’ancienne et ses jetons', () => {
  const premiere = cleGeneree();
  const ancienJeton = contexte({ props: premiere.props }).c.EUC_ACCES_creerJeton_();
  const a = contexte({ email: 'admin@lycee.test', props: premiere.props });
  a.c.EUC_ACCES_genererCle();
  const c = contexte({ props: premiere.props, cache: new Map(), cleTemp: '' }).c;
  assert.notEqual(c.EUC_ACCES_controlerRoute_({ parameter: { page: 'suivi-conventions-public', acces: premiere.cle } }), null);
  assert.equal(appel(c, 'EUC_ENS_liste', ['q', { __eucAcces: ancienJeton }]).ok, false);
});

test('le book « personnels » reconnaît la session d’un lien enseignant', () => {
  const { props, cle } = cleGeneree();
  const c = contexte({ props, cache: new Map() }).c;
  assert.equal(c.EUC_DEV538_staffAllowed_(), false);
  c.EUC_ACCES_controlerRoute_({ parameter: { page: 'book-entreprises-public-pfmp', acces: cle } });
  assert.equal(c.EUC_DEV538_staffAllowed_(), true);
});

test('l’écran Liens d’accès est réservé à l’administration et ne passe en clé exigée qu’avec une clé', () => {
  const anonyme = contexte().c;
  assert.throws(() => anonyme.EUC_ACCES_genererCle(), /réservé/);
  assert.throws(() => anonyme.EUC_ACCES_etatLiens(), /réservé/);
  const a = contexte({ email: 'admin@lycee.test' }).c;
  assert.throws(() => a.EUC_ACCES_changerMode('EXIGEE'), /Générez d’abord la clé/);
});

test('les pages servies avec une session reçoivent le script du jeton', () => {
  const { props, cle } = cleGeneree();
  const c = contexte({ props, cache: new Map() }).c;
  c.EUC_ACCES_controlerRoute_({ parameter: { page: 'suivi-conventions-public', acces: cle } });
  const out = c.HtmlService.createHtmlOutput('<html><head><title>x</title></head><body></body></html>');
  const html = c.EUC_ACCES_decorer_(out).getContent();
  const script = html.match(/<script data-euc-acces="1">([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /__eucAcces/);
  const anonyme = contexte({ props, cache: new Map() }).c;
  const brut = anonyme.HtmlService.createHtmlOutput('<html><head></head></html>');
  assert.equal(anonyme.EUC_ACCES_decorer_(brut).getContent(), '<html><head></head></html>');
});

test('les liens vers pfmp.loucodi.fr et apprentis.loucodi.fr emportent le jeton de l’enseignant', () => {
  const { props, cle } = cleGeneree();
  const c = contexte({ props, cache: new Map() }).c;
  c.EUC_ACCES_controlerRoute_({ parameter: { page: 'suivi-conventions-public', acces: cle } });
  const html = c.EUC_ACCES_decorer_(c.HtmlService.createHtmlOutput('<html><head></head></html>')).getContent();
  const script = html.match(/<script data-euc-acces="1">([\s\S]*?)<\/script>/)[1];
  let clic = null;
  const lien = href => ({ href, getAttribute() { return this.href; }, setAttribute(k, v) { this.href = v; } });
  const page = { URL, location: { href: 'https://n-x-script.googleusercontent.com/userCodeAppPanel' },
    document: { addEventListener: (t, fn) => { clic = fn; } }, window: {} };
  vm.createContext(page); vm.runInContext(script, page);
  const cliquer = a => { clic({ target: { closest: () => a } }); return new URL(a.href); };
  assert.ok(cliquer(lien('https://pfmp.loucodi.fr/')).searchParams.get('jeton'));
  assert.ok(cliquer(lien('https://apprentis.loucodi.fr/?page=apprentissage-public-pfmp')).searchParams.get('jeton'));
  assert.ok(cliquer(lien('https://script.google.com/macros/s/X/exec?page=suivi-pfmp-classe-public')).searchParams.get('jeton'));
  assert.equal(cliquer(lien('https://www.google.com/maps/dir/?api=1')).searchParams.get('jeton'), null);
  assert.equal(cliquer(lien('https://book-entreprise.loucodi.fr/')).searchParams.get('jeton'), null);
});

test('le point d’entrée contrôle la route avant le rendu et décore ensuite la page', () => {
  assert.match(release, /EUC_ACCES_controlerRoute_\(e\)/);
  assert.match(release, /if \(refus\) return EUC_RELEASE_decorateOutput_\(refus\)/);
  assert.match(release, /output = EUC_ACCES_decorer_\(output\)/);
  assert.match(routes, /case 'liens-acces-pfmp':\s*return EUC_ACCES_afficherLiens\(e\);/);
  assert.match(admin, /page=liens-acces-pfmp/);
  for (const t of ['EUC_ACCES_genererCle', 'EUC_ACCES_changerMode', 'EUC_ACCES_viderJournal', 'setTimeout', 'aria-busy', 'Copier']) assert.ok(page.includes(t), t);
});

test('le paquet génère la liste des fonctions et garde le verrou en dernier fichier', () => {
  assert.match(build, /generate-acces-liste\.js/);
  assert.match(build, /ZZ_EUC_ACCES_Verrou\.js/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev571-'));
  fs.writeFileSync(path.join(dir, 'A.js'), 'function EUC_A(){}\nfunction EUC_B(){}\nfunction EUC_C(){}\nfunction EUC_D_(){}\nfunction EUC_E(){ ScriptApp.newTrigger("EUC_C"); }\n');
  fs.writeFileSync(path.join(dir, 'Admin.html'), '<script>google.script.run.EUC_A()</script>');
  for (const p of generateur.PAGES_PUBLIQUES) fs.writeFileSync(path.join(dir, p + '.html'), p === 'PFMP' ? '<script>google.script.run.EUC_B()</script>' : '');
  const liste = generateur.calculer(dir);
  assert.deepEqual(liste.referencees, ['EUC_A', 'EUC_B', 'EUC_C']);
  assert.deepEqual(liste.publiques, ['EUC_B']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('la sonde de performance ne renvoie que des durées et passe avant toute page', () => {
  assert.match(release, /=== 'sonde-performance'\) \{\s*return EUC_SONDE_reponse_\(e\);/);
  const c = contexte().c;
  c.ContentService = { createTextOutput: t => ({ t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } };
  const r = JSON.parse(c.EUC_SONDE_reponse_().t);
  assert.deepEqual(Object.keys(r).sort(), ['avantPageMs', 'chargementMs', 'verrouMs', 'version']);
  assert.ok(fs.readFileSync(path.join(root, 'apps-script/AAAA_EUC_SONDE_Debut.js'), 'utf8').includes('var EUC_SONDE_T0_ = Date.now();'));
});

test('lien de secours : seuls les professeurs autorisés reçoivent un lien personnel d’une semaine, valable puis annulé par une nouvelle clé', () => {
  const { c, props } = contexte();
  props[c.EUC_ACCES_P_SECRET_] = 'secret-1'; props[c.EUC_ACCES_P_MODE_] = 'EXIGEE';
  const envois = [];
  c.MailApp = { sendEmail: o => envois.push(o) };
  c.EUC_DEV538_records_ = () => [{ id: 7, fields: { Nom: 'MARTIN', Prenom: 'Léa', Email: 'Lea.Martin@lycee-les-eucalyptus.org', Actif: true } },
    { id: 8, fields: { Nom: 'ANCIEN', Email: 'ancien@lycee-les-eucalyptus.org', Actif: false } }];
  const generique = c.EUC_ACCES_demanderLienSecours('inconnu@lycee-les-eucalyptus.org', 'suivi-pfmp-enseignants');
  assert.equal(envois.length, 0);
  assert.equal(c.EUC_ACCES_demanderLienSecours('ancien@lycee-les-eucalyptus.org', 'x'), generique, 'même réponse : la liste ne fuit pas');
  assert.equal(c.EUC_ACCES_demanderLienSecours('lea.martin@gmail.com', 'x'), generique);
  c.EUC_DEV538_records_ = () => [{ id: 7, fields: { Nom: 'MARTIN', Prenom: 'Léa', Email: 'Lea.Martin@lycee-les-eucalyptus.org', Actif: true } },
    { id: 8, fields: { Nom: 'ANCIEN', Email: 'ancien@lycee-les-eucalyptus.org', Actif: false } }, { id: 9, fields: { Nom: 'ACAD', Email: 'p.acad@ac-nice.fr', Actif: true } }];
  assert.equal(c.EUC_ACCES_demanderLienSecours('autre.prof@ac-nice.fr', 'x'), generique, 'ac-nice.fr hors liste : rien');
  assert.equal(envois.length, 0);
  c.EUC_ACCES_demanderLienSecours('P.Acad@ac-nice.fr', 'x'); assert.equal(envois.length, 1); assert.equal(envois.pop().to, 'p.acad@ac-nice.fr');
  assert.equal(envois.length, 0);
  assert.equal(c.EUC_ACCES_demanderLienSecours(' LEA.MARTIN@lycee-les-eucalyptus.org ', 'suivi-apprentis-enseignants'), generique);
  assert.equal(envois.length, 1); assert.equal(envois[0].to, 'lea.martin@lycee-les-eucalyptus.org');
  const lien = envois[0].body.match(/https:\/\/\S+/)[0];
  assert.match(lien, /^https:\/\/apprentis\.loucodi\.fr\/\?page=suivi-apprentis-enseignants&jeton=/);
  const jeton = decodeURIComponent(lien.split('jeton=')[1]);
  assert.equal(jeton.split('.').length, 3); assert.equal(jeton.split('.')[1], '7');
  assert.equal(c.EUC_ACCES_jetonValide_(jeton), true);
  const duree = Number(jeton.split('.')[0]) - Date.now(); assert.ok(duree > 6.9 * 86400000 && duree <= 7 * 86400000, 'une semaine');
  assert.match(envois[0].body, /provisoire et valable une semaine, jusqu’au /);
  assert.equal(c.EUC_ACCES_jetonValide_(jeton.replace('.7.', '.9.')), false, 'professeur non modifiable');
  c.EUC_ACCES_etat_.ens = null; props[c.EUC_ACCES_P_SECRET_] = 'secret-2';
  assert.equal(c.EUC_ACCES_jetonValide_(jeton), false, 'nouvelle clé = liens de secours annulés');
  c.EUC_ACCES_demanderLienSecours('lea.martin@lycee-les-eucalyptus.org', ''); c.EUC_ACCES_demanderLienSecours('lea.martin@lycee-les-eucalyptus.org', '');
  assert.match(c.EUC_ACCES_demanderLienSecours('lea.martin@lycee-les-eucalyptus.org', ''), /Trop de demandes/);
  assert.equal(envois.length, 3);
  assert.equal(c.EUC_ACCES_ENTREES_.EUC_ACCES_demanderLienSecours, 1, 'appelable sans clé depuis la page de refus');
  const refus = c.EUC_ACCES_pageRefus_('suivi-pfmp-enseignants').getContent();
  assert.match(refus, /Seules les adresses autorisées/); assert.match(refus, /EUC_ACCES_demanderLienSecours\(/);
});

console.log(`\n${n} tests DEV571 verrou d’accès réussis.`);
