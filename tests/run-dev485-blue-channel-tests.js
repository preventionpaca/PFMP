const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const release = fs.readFileSync('apps-script/EUC_PFMP_ReleaseChannel.js', 'utf8');
const adminAuth = fs.readFileSync('apps-script/EUC_PFMP_AdminAuth.gs', 'utf8');
const suivi = fs.readFileSync('apps-script/EUC_SUIVI_PFMP_WebApp.gs', 'utf8');
const tools = fs.readFileSync('apps-script/EUC_PFMP_DEV370_AdminTools.js', 'utf8');
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

if (!process.exitCode) console.log(`\n${n} tests DEV485 canal bleu réussis.`);
