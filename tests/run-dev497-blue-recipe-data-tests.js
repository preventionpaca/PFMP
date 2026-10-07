const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'apps-script', 'EUC_PFMP_DEV497_BlueRecipeData.js'), 'utf8');
const preview = fs.readFileSync(path.join(root, 'apps-script', 'EUC_IMPORT_PFMP_RichPreview.gs'), 'utf8');
const rich = fs.readFileSync(path.join(root, 'apps-script', 'EUC_IMPORT_PFMP_RichData.gs'), 'utf8');
const client = fs.readFileSync(path.join(root, 'apps-script', 'Import_Pronote_PFMP_Scripts.html'), 'utf8');
let passed = 0;

function test(name, fn) {
  try { fn(); console.log('✓', name); passed++; }
  catch (error) { console.error('✗', name, error.message); process.exitCode = 1; }
}

function context(channel, mode) {
  const writes = [];
  const tables = { Annees_Scolaires: [], Classes: [], EUC_ELEVES_PFMP: [] };
  const columns = {
    Annees_Scolaires: ['Code', 'Libelle', 'Code_import', 'Active', 'Commentaire'],
    Classes: ['Nom', 'Libelle', 'Code_import', 'Formation', 'Niveau', 'Etab', 'Actif', 'Commentaire']
  };
  const ctx = {
    console, String, Object, Array, RegExp, encodeURIComponent,
    EUC_RELEASE_channel_: () => channel,
    EUC_IMPORT_exigerAdminTexte_: () => ({ autorise: true }),
    EUC_ENT_controlerCibleRecette_: () => true,
    EUC_IMPORT_lireRecordsBruts_: table => tables[table] || [],
    EUC_IMPORT_assurerSchemaRich_: () => { writes.push({ schema: true }); },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => mode }) },
    EUC_ENT_grist: (method, url, body) => {
      if (method === 'get' && /\/columns$/.test(url)) {
        const table = decodeURIComponent(url.match(/tables\/([^/]+)/)[1]);
        return { columns: (columns[table] || []).map(id => ({ id })) };
      }
      writes.push({ method, url, body });
      return {};
    }
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return { ctx, writes };
}

test('la préparation est impossible hors du canal bleu', () => {
  const { ctx } = context('GREEN', 'RECIPE_DATA');
  assert.throws(() => ctx.EUC_DEV497_prepareBlueRecipePronote({annee:'2026-2027',classes:['TMVA1'],confirmation:'PREPARER_RECETTE_BLEUE'}), /site bleu/);
});

test('le mode et la cible recette sont contrôlés côté serveur', () => {
  assert.throws(() => context('BLUE', 'DRY_RUN').ctx.EUC_DEV497_requirePronoteImportTarget_(), /desactive/);
  assert.match(code, /EUC_ENT_controlerCibleRecette_\(\)/);
  assert.doesNotMatch(code, /3pnVrygfNn7c/);
});

test('la préparation crée seulement année, classes et schéma sans élève', () => {
  const { ctx, writes } = context('BLUE', 'RECIPE_DATA');
  const result = ctx.EUC_DEV497_prepareBlueRecipePronote({annee:'2026-2027',classes:['TMVA1','TMVA2','TRMO'],confirmation:'PREPARER_RECETTE_BLEUE'});
  assert.equal(result.canal, 'BLUE');
  assert.equal(result.aucuneDonneeNominativeEcrite, true);
  assert.equal(writes.filter(x => /Annees_Scolaires\/records/.test(x.url || '')).length, 1);
  assert.equal(writes.filter(x => /Classes\/records/.test(x.url || '')).length, 3);
  assert.equal(writes.filter(x => /EUC_ELEVES_PFMP\/records/.test(x.url || '')).length, 0);
  assert.equal(writes.filter(x => x.schema).length, 1);
});

test('les deux chemins d’import réel appellent la garde DEV497', () => {
  assert.match(preview, /EUC_IMPORT_exigerAdminTexte_\(\);EUC_DEV497_requirePronoteImportTarget_\(\)/);
  assert.match(rich, /EUC_IMPORT_exigerAdminTexte_\(\);EUC_DEV497_requirePronoteImportTarget_\(\)/);
});

test('l’écran bleu prépare les trois classes et conserve le retour admin', () => {
  assert.match(client, /IMPORT_CONFIG\.channel==='BLUE'/);
  assert.match(client, /IMPORT_CONFIG\.mode==='RECIPE_DATA'/);
  assert.match(client, /\['TMVA1','TMVA2','TRMO'\]/);
  assert.match(client, /setBusy\(true,'Préparation de la recette bleue/);
  assert.match(client, /\?page=admin-pfmp/);
});

console.log(`\n${passed} tests DEV497 recette bleue réussis.`);
