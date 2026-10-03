'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const triggerSource = fs.readFileSync(path.join(root, 'apps-script/EUC_PFMP_DEV424_SnapshotPlanifie.js'), 'utf8');
const familySource = fs.readFileSync(path.join(root, 'apps-script/EUC_PFMP_DEV339_FamilleUX.js'), 'utf8');
const detailSource = fs.readFileSync(path.join(root, 'apps-script/EUC_PFMP_DEV416_Performance.js'), 'utf8');

assert.match(triggerSource, /EUC_DEV424_ALLOWED_DOC_='b2CyeMEdVEMS'/, 'la cible active doit être explicite');
assert.doesNotMatch(triggerSource, /3pnVrygfNn7c/, 'la production ne doit jamais apparaître dans le lot');
assert.match(triggerSource, /everyMinutes\(EUC_DEV424_INTERVAL_MINUTES_\)/, 'le déclencheur doit être périodique');
assert.match(triggerSource, /tryLock\(1000\)/, 'les exécutions concurrentes doivent être évitées');
assert.match(detailSource, /EUC_DEV424_readEnrichedDetail_/, 'le détail froid doit lire le snapshot enrichi');

const familyContext = {
  console,
  CacheService: {getScriptCache: () => ({get: () => null, put: () => {}, remove: () => {}})},
  EUC_DEV190E_INDEX_TABLE_: 'EUC_SUIVI_PFMP_INDEX',
  EUC_DEV190G_fastRecords_: () => [{fields: {
    Updated_at: '2026-10-03T10:00:00.000Z',
    Actif: true,
    Payload_JSON: JSON.stringify({__dev424Enriched: true, classes: [{classe: 'TMVA2'}]})
  }}]
};
vm.createContext(familyContext);
vm.runInContext(familySource, familyContext);
familyContext.EUC_DEV422_hydrateFamily_ = () => { throw new Error('hydratation interdite sur un snapshot DEV424'); };
const fast = familyContext.EUC_DEV421_fastFamilySnapshot_({annee: '2026-2027', famille: 'BACPRO'});
assert.equal(fast.source, 'SNAPSHOT_ENRICHI');
assert.equal(fast.payload.classes[0].classe, 'TMVA2');

const calls = [];
const existingTrigger = {getHandlerFunction: () => 'EUC_DEV424_refreshScheduled'};
const otherTrigger = {getHandlerFunction: () => 'AUTRE_TRAITEMENT'};
const triggerContext = {
  console,
  EUC_ENT_controlerCibleRecette_: () => true,
  EUC_ENT_lireConfiguration: () => ({EUC_ENT_GRIST_DOC_ID: 'b2CyeMEdVEMS'}),
  PropertiesService: {getScriptProperties: () => ({getProperty: () => '', setProperty: () => {}})},
  ScriptApp: {
    getProjectTriggers: () => [existingTrigger, otherTrigger],
    deleteTrigger: t => calls.push(['delete', t]),
    newTrigger: handler => ({timeBased(){calls.push(['new', handler]); return this;}, everyMinutes(n){calls.push(['minutes', n]); return this;}, create(){calls.push(['create']); return this;}})
  }
};
vm.createContext(triggerContext);
vm.runInContext(triggerSource, triggerContext);
const installed = triggerContext.EUC_DEV424_installSnapshotTrigger();
assert.equal(installed.triggerCount, 1);
assert.equal(installed.replaced, 1);
assert.equal(calls.filter(x => x[0] === 'delete').length, 1, 'seul le doublon DEV424 doit être supprimé');
assert.deepEqual(calls.find(x => x[0] === 'minutes'), ['minutes', 15]);

const writeCalls = [];
triggerContext.EUC_DEV190E_INDEX_TABLE_ = 'EUC_SUIVI_PFMP_INDEX';
triggerContext.EUC_DEV190G_fastRecords_ = () => [{id: 7, fields: {Actif: true, Updated_at: '2026-10-03T09:00:00Z', Payload_JSON: '{"old":true}'}}];
triggerContext.EUC_DEV190_api_ = (method, url) => { writeCalls.push([method, url]); return {}; };
triggerContext.EUC_DEV421_familyCacheInvalidate_ = () => {};
assert.equal(triggerContext.EUC_DEV424_writeFamily_('2026-2027', 'BACPRO', {__dev424Enriched: true}), true);
assert.equal(writeCalls[0][0], 'post', 'le nouveau snapshot doit être créé avant de désactiver le précédent');
assert.equal(writeCalls[1][0], 'patch', 'le précédent snapshot est désactivé seulement après création');

assert.throws(() => {
  triggerContext.EUC_ENT_lireConfiguration = () => ({EUC_ENT_GRIST_DOC_ID: 'mauvaise-cible'});
  triggerContext.EUC_DEV424_assertTarget_();
}, /cible Grist refusée/);

console.log('✓ DEV424 : snapshot enrichi durable et déclencheur borné');
