const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('apps-script/EUC_ENT_Config.gs', 'utf8');
const BLUE = '1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo';
const GREEN = '1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c';
const RECIPE_HOST = 'https://camin.getgrist.com';
const RECIPE = 'kB8bvDag8x7D';
let passed = 0;

function context(projectId, values, email) {
  const ctx = {
    ScriptApp: {getScriptId: () => projectId},
    PropertiesService: {getScriptProperties: () => ({getProperty: key => values[key] || ''})},
    Session: {getActiveUser: () => ({getEmail: () => email || ''})}
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return ctx;
}

function test(name, fn) {
  try { fn(); passed++; console.log('✓', name); }
  catch (error) { console.error('✗', name, error.message); process.exitCode = 1; }
}

test('le projet bleu accepte uniquement la copie de recette', () => {
  const ok = context(BLUE, {EUC_ENT_ENVIRONMENT:'recette', EUC_ENT_GRIST_API_URL:RECIPE_HOST, EUC_ENT_GRIST_DOC_ID:RECIPE});
  assert.equal(ok.EUC_ENT_controlerCibleRecette_(), true);
  const refused = context(BLUE, {EUC_ENT_ENVIRONMENT:'recette', EUC_ENT_GRIST_API_URL:RECIPE_HOST, EUC_ENT_GRIST_DOC_ID:'document-non-recette'});
  assert.throws(() => refused.EUC_ENT_controlerCibleRecette_(), /recette invalide/);
  const wrongHost = context(BLUE, {EUC_ENT_ENVIRONMENT:'recette', EUC_ENT_GRIST_API_URL:'https://docs.getgrist.com', EUC_ENT_GRIST_DOC_ID:RECIPE});
  assert.throws(() => wrongHost.EUC_ENT_controlerCibleRecette_(), /recette invalide/);
});

test('le projet vert accepte sa cible configurée sans connaître son identifiant dans Git', () => {
  const ctx = context(GREEN, {EUC_ENT_ENVIRONMENT:'production', EUC_ENT_GRIST_DOC_ID:'document-production'});
  assert.equal(ctx.EUC_ENT_controlerCibleRecette_(), true);
  assert.doesNotMatch(source, /3pnVrygfNn7c/);
});

test('le projet vert refuse une cible vide ou la copie de recette', () => {
  assert.throws(() => context(GREEN, {}).EUC_ENT_controlerCibleRecette_(), /site vert/);
  assert.throws(() => context(GREEN, {EUC_ENT_GRIST_DOC_ID:RECIPE}).EUC_ENT_controlerCibleRecette_(), /site vert/);
});

test('un projet inconnu ne peut accéder à aucune cible Grist', () => {
  const ctx = context('PROJET_INCONNU', {EUC_ENT_GRIST_DOC_ID:'document-production'});
  assert.throws(() => ctx.EUC_ENT_controlerCibleRecette_(), /Projet Apps Script non autorisé/);
});

test('le vert conserve le contrôle du domaine même avec une ancienne propriété recette', () => {
  const values = {
    EUC_ENT_ENVIRONMENT:'recette',
    EUC_ENT_GRIST_DOC_ID:'document-production',
    EUC_ENT_ALLOWED_DOMAIN:'lycee-les-eucalyptus.org'
  };
  assert.equal(context(GREEN, values, 'agent@lycee-les-eucalyptus.org').EUC_ENT_controlerAccesUtilisateur_(), true);
  assert.throws(() => context(GREEN, values, 'intrus@example.test').EUC_ENT_controlerAccesUtilisateur_(), /non autorisé/);
});

if (!process.exitCode) console.log(`\n${passed} tests DEV489 cible Grist verte réussis.`);
