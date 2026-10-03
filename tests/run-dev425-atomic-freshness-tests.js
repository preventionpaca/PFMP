'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const atomic=read('apps-script/EUC_PFMP_DEV425_AtomicFreshness.js');

assert.match(atomic,/__DEV425_STATE__/);
assert.match(atomic,/status==='DIRTY'/);
assert.match(atomic,/EUC_DEV425_writeState_\(token\.annee,fam,\{revision:revision,status:'DIRTY'/);
assert.match(atomic,/EUC_DEV425_writeState_\(token\.annee,fam,\{revision:token\.revision,status:'READY'/);
assert.match(atomic,/EUC_DEV190J_syncOne/,'les détails touchés doivent être resynchronisés');
assert.match(atomic,/EUC_DEV424_writeDetails_\(details\);EUC_DEV424_writeFamily_/,'les détails précèdent la publication de l’index');

const ctx={console,Date,JSON,Math,Utilities:{getUuid:()=> 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'}};
vm.createContext(ctx);vm.runInContext(atomic,ctx);
ctx.EUC_DEV425_readState_=()=>({status:'DIRTY',revision:'r2'});
assert.equal(ctx.EUC_DEV425_payloadFresh_('2026-2027','BACPRO',{__dev425Revision:'r2'}),false,'DIRTY ne peut jamais être servi comme à jour');
ctx.EUC_DEV425_readState_=()=>({status:'READY',revision:'r2'});
assert.equal(ctx.EUC_DEV425_payloadFresh_('2026-2027','BACPRO',{__dev425Revision:'r1'}),false,'une ancienne révision doit être refusée');
assert.equal(ctx.EUC_DEV425_payloadFresh_('2026-2027','BACPRO',{__dev425Revision:'r2'}),true,'seule la révision READY correspondante est fraîche');

const mutationFiles=[
  'apps-script/EUC_PFMP_DEV225_StatusAutoSave.js',
  'apps-script/EUC_APPRENTISSAGE_PFMP_V172.js',
  'apps-script/EUC_PFMP_DEV420_SituationsEleves.js',
  'apps-script/EUC_PFMP_DEV174.js',
  'apps-script/EUC_PFMP_DEV190U_CleanModules.js',
  'apps-script/EUC_PFMP_DEV285B_ModeFinTerminale.js',
  'apps-script/EUC_SUIVI_PFMP_AffectationsV156.js',
  'apps-script/EUC_SUIVI_PFMP_V156.js',
  'apps-script/EUC_SUIVI_PFMP_FixV161_24.js',
  'apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.js',
  'apps-script/EUC_CONVENTION_PFMP_QRPublicV85.js',
  'apps-script/EUC_IMPORT_PFMP_RealService.js',
  'apps-script/EUC_IMPORT_PFMP_ProfClasses.js',
  'apps-script/EUC_PFMP_DEV315_RepairJotFormAccess.js',
  'apps-script/EUC_PFMP_DEV321_Consolidation.js',
  'apps-script/EUC_PFMP_DEV322_DifferentialImport.js',
  'apps-script/EUC_PFMP_DEV326_FastSafeImport.js'
];
mutationFiles.forEach(file=>{
  const source=read(file);
  assert.match(source,/EUC_DEV425_begin(?:Mutation|ImportItems)_/,'début atomique absent de '+file);
  assert.match(source,/EUC_DEV425_finish(?:Mutation|Result|Many)_/,'publication atomique absente de '+file);
});

const trigger=read('apps-script/EUC_PFMP_DEV424_SnapshotPlanifie.js');
assert.match(trigger,/EUC_DEV425_refreshScheduled/);
assert.match(trigger,/EUC_DEV424_INTERVAL_MINUTES_=15/);
assert.doesNotMatch(atomic,/3pnVrygfNn7c/);

for(const file of ['apps-script/Suivi_Conventions_Public_FamilleClone_V353.html','apps-script/Suivi_Conventions_Admin_FamilleV190L.html']){
  const source=read(file);
  assert.match(source,/querySelectorAll\('\.period\[data-class\]\[data-period\]/);
  assert.match(source,/addEventListener\('pointerenter'/);
  assert.match(source,/if\(cache\[k\]\)\{render\(el,cache\[k\]\);return;\}/,'la bulle préchargée doit rester instantanée');
}
assert.match(read('apps-script/EUC_PFMP_DEV415_PublicAdminExact.js'),/#EUC_DEV183_BREADCRUMB\{display:none!important\}/);

console.log('✓ DEV425 : fraîcheur atomique, mutations, bulles et fil d’Ariane public');
