const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const release = fs.readFileSync('apps-script/EUC_PFMP_ReleaseChannel.js', 'utf8');
const adminAuth = fs.readFileSync('apps-script/EUC_PFMP_AdminAuth.gs', 'utf8');
const suivi = fs.readFileSync('apps-script/EUC_SUIVI_PFMP_WebApp.gs', 'utf8');
const tools = fs.readFileSync('apps-script/EUC_PFMP_DEV370_AdminTools.js', 'utf8');
const adminConventions = fs.readFileSync('apps-script/Admin_Conventions_PFMP.html', 'utf8');
const accesQr = fs.readFileSync('apps-script/PFMP_Acces_QR_V116.html', 'utf8');
const packageBuilder = fs.readFileSync('scripts/build-pfmp-apps-script-package.sh', 'utf8');
let n = 0;

function test(name, fn) {
  try {
    fn();
    n++;
    console.log('✓', name);
  } catch (error) {
    console.error('✗', name, error.message);
    process.exitCode = 1;
  }
}

function releaseContext(projectId, serviceUrl) {
  const ctx = {
    ScriptApp: {
      getScriptId: () => projectId,
      getService: () => ({
        getUrl: () => serviceUrl || 'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/BLUE/dev'
      })
    },
    Session: {getActiveUser: () => ({getEmail: () => 'editor@example.test'})}
  };
  vm.createContext(ctx);
  vm.runInContext(release, ctx);
  return ctx;
}

function output(content) {
  return {
    content,
    getContent() { return this.content; },
    setContent(value) { this.content = value; return this; }
  };
}

test('le bandeau bleu occupe toute la largeur sur chaque sortie HTML', () => {
  const ctx = releaseContext('1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo');
  const out = output('<html><head></head><body><main>Page</main></body></html>');
  ctx.EUC_RELEASE_decorateOutput_(out);
  assert.match(out.content, /MODE DÉVELOPPEMENT — SITE BLEU — RECETTE SÉPARÉE/);
  assert.match(out.content, /top:0;left:0;right:0/);
  assert.match(out.content, /body\{padding-top:42px!important\}/);
  assert.ok(out.content.indexOf('data-pfmp-release-channel="blue"') > out.content.indexOf('<main>Page</main>'));
});

test('les liens verts sont réécrits vers le même /dev dans le bleu', () => {
  const ctx = releaseContext('1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo');
  const stable = 'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec?page=dossier-apprentissage-pfmp';
  const html = ctx.EUC_RELEASE_blueNavigation_('<a href="https://alternance.loucodi.fr/">Accueil</a><a href="' + stable + '">Dossier</a>');
  assert.match(html, /BLUE\/dev\?page=admin-pfmp/);
  assert.match(html, /BLUE\/dev\?page=dossier-apprentissage-pfmp/);
  assert.doesNotMatch(html, /alternance\.loucodi|AKfycbwQoKZOD/);
});

test("l'alias Apps Script refusé est normalisé vers l'URL Workspace partageable", () => {
  const ctx = releaseContext(
    '1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo',
    'https://script.google.com/a/lycee-les-eucalyptus.org/macros/s/BLUE/dev'
  );
  assert.equal(
    ctx.EUC_RELEASE_serviceBase_(),
    'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/BLUE/dev'
  );
  const html = ctx.EUC_RELEASE_blueNavigation_('<a href="https://alternance.loucodi.fr/">Accueil</a>');
  assert.match(html, /script\.google\.com\/a\/macros\/lycee-les-eucalyptus\.org\/s\/BLUE\/dev\?page=admin-pfmp/);
  assert.doesNotMatch(html, /\/a\/lycee-les-eucalyptus\.org\/macros\/s\//);
});

test('le projet vert conserve ses URL canoniques', () => {
  const ctx = releaseContext('PROJET_VERT');
  const html = '<a href="https://alternance.loucodi.fr/">Accueil</a>';
  assert.equal(ctx.EUC_RELEASE_blueNavigation_(html), html);
  assert.equal(ctx.EUC_RELEASE_blueEditorContext_(), null);
});

test('le projet vert ne montre plus de pastille environnement', () => {
  const ctx = releaseContext('PROJET_VERT');
  const out = output('<html><head></head><body><main>Page</main></body></html>');
  ctx.EUC_RELEASE_decorateOutput_(out);
  assert.doesNotMatch(out.content, /ENVIRONNEMENT VERT|data-pfmp-release-channel="green"/);
  assert.match(out.content, /data-pfmp-busy-style/);
  assert.match(out.content, /data-pfmp-busy-script/);
});

test('le /dev bleu fournit un contexte administrateur limité au projet bleu', () => {
  const ctx = releaseContext('1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo');
  const auth = ctx.EUC_RELEASE_blueEditorContext_();
  assert.equal(auth.autorise, true);
  assert.equal(auth.role, 'ADMIN_PFMP');
  assert.equal(auth.origineAutorisation, 'CANAL_BLEU_EDITEUR_DEV');
  assert.equal(auth.peutPurgerTests, false);
});

test('les deux contrôles administratifs réutilisent le contexte éditeur bleu', () => {
  assert.match(adminAuth, /EUC_RELEASE_blueEditorContext_\(\)/);
  assert.match(suivi, /EUC_RELEASE_blueEditorContext_\(\)/);
});

test('les outils administratifs construisent leurs liens depuis le déploiement courant', () => {
  assert.match(tools, /EUC_RELEASE_serviceBase_\(\)/);
  assert.doesNotMatch(tools, /function EUC_DEV368_boot\(\)[^\n]+AKfycby6ykCxT/);
});

test('toutes les sorties ajoutent le spinner transversal des boutons occupés', () => {
  assert.match(release, /data-pfmp-busy-style/);
  assert.match(release, /button\.pfmp-auto-busy::before/);
  assert.match(release, /data-pfmp-busy-script/);
  assert.match(release, /MutationObserver/);
  assert.match(release, /data-pfmp-auto-pending/);
  assert.match(release, /tracked&&b\.disabled/);
  assert.doesNotMatch(release, /active=b\.disabled\|\|/);
  assert.match(release, /b\.querySelector\("\.spinner,\.loader,\[role=progressbar\]"\)/);
  const ctx = releaseContext('1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo');
  const out = output('<html><head></head><body><button>Action</button></body></html>');
  ctx.EUC_RELEASE_decorateOutput_(out);
  const code = out.content.match(/<script data-pfmp-busy-script="1">([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(code));

  let observer;
  const attrs = {};
  const classes = new Set();
  const button = {
    disabled: true,
    getAttribute: key => attrs[key] || null,
    setAttribute: (key, value) => { attrs[key] = String(value); },
    removeAttribute: key => { delete attrs[key]; },
    querySelector: () => null,
    closest: selector => selector === 'button' ? button : null,
    classList: {
      contains: value => classes.has(value),
      toggle: (value, force) => force ? classes.add(value) : classes.delete(value)
    }
  };
  const document = {
    documentElement: {contains: value => value === button},
    addEventListener: () => {}
  };
  const sandbox = {
    document,
    setTimeout: fn => fn(),
    MutationObserver: function(callback) {
      observer = callback;
      this.observe = () => {};
    }
  };
  vm.runInNewContext(code, sandbox);
  observer([{target: button}]);
  assert.equal(classes.has('pfmp-auto-busy'), false, 'un bouton simplement indisponible ne doit pas tourner');
  attrs['data-pfmp-auto-pending'] = '1';
  observer([{target: button}]);
  assert.equal(classes.has('pfmp-auto-busy'), true, 'un bouton déclenché puis désactivé doit tourner');
  button.disabled = false;
  observer([{target: button}]);
  assert.equal(classes.has('pfmp-auto-busy'), false, 'le spinner doit disparaître à la fin');
  assert.equal(attrs['data-pfmp-auto-pending'], undefined, 'le marqueur temporaire doit être nettoyé');
});

test('les boutons inactifs des conventions et du QR restent immobiles', () => {
  assert.match(adminConventions, /<button id="openBtn" class="primary" disabled>/);
  assert.match(accesQr, /<button id="go" disabled>/);
  assert.match(packageBuilder, /return EUC_RELEASE_doGet_\(e\)/,
    'le paquet publié doit décorer toutes les routes, y compris conventions et QR');

  const ctx = releaseContext('PROJET_VERT');
  [
    '<button id="openBtn" class="primary" disabled>Ouvrir le dossier</button>',
    '<button id="go" disabled>Vérifier et continuer</button>'
  ].forEach(markup => {
    const out = output('<html><head></head><body>' + markup + '</body></html>');
    ctx.EUC_RELEASE_decorateOutput_(out);
    const code = out.content.match(/<script data-pfmp-busy-script="1">([\s\S]*?)<\/script>/)[1];
    let observer;
    const classes = new Set();
    const button = {
      disabled: true,
      getAttribute: () => null,
      removeAttribute: () => {},
      querySelector: () => null,
      closest: selector => selector === 'button' ? button : null,
      classList: {
        contains: value => classes.has(value),
        toggle: (value, force) => force ? classes.add(value) : classes.delete(value)
      }
    };
    const document = {
      documentElement: {contains: value => value === button},
      addEventListener: () => {}
    };
    vm.runInNewContext(code, {
      document,
      setTimeout: fn => fn(),
      MutationObserver: function(callback) {
        observer = callback;
        this.observe = () => {};
      }
    });
    observer([{target: button}]);
    assert.equal(classes.has('pfmp-auto-busy'), false,
      'un bouton indisponible au repos ne doit afficher aucun spinner');
  });
});

if (!process.exitCode) console.log(`\n${n} tests DEV485 canal bleu réussis.`);
