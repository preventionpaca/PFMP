const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),cp=require('child_process'),os=require('os');
const root=path.resolve(__dirname,'..');
const planned=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV424_SnapshotPlanifie.js'),'utf8');
const atomic=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV425_AtomicFreshness.js'),'utf8');
const storage=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV531_StorageStability.js'),'utf8');
let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e);process.exitCode=1;}}
function baseContext(rows){
  const calls=[],filters=[],props={},cache={};
  const c={console,Date,JSON,String,Number,Array,Object,Math,isFinite,encodeURIComponent,
    EUC_DEV190E_INDEX_TABLE_:'EUC_SUIVI_PFMP_INDEX',EUC_DEV190I_TABLE_:'EUC_SUIVI_PFMP_DETAIL_SNAPSHOT',
    EUC_DEV190G_fastRecords_:(table,filter)=>{filters.push({table,filter:JSON.parse(JSON.stringify(filter))});return(rows[table]||[]).map(r=>({id:r.id,fields:Object.assign({},r.fields)}));},
    EUC_DEV190_api_:(method,url,body)=>{calls.push({method,url,body});return{records:[]};},
    EUC_DEV421_familyCacheInvalidate_:()=>{},EUC_DEV424_assertTarget_:()=>true,
    CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v;},remove:()=>{},removeAll:()=>{}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||'',setProperty:(k,v)=>{props[k]=v;}})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})}
  };
  vm.createContext(c);vm.runInContext(planned,c);vm.runInContext(atomic,c);vm.runInContext(storage,c);
  c.EUC_DEV424_assertTarget_=()=>true;
  return{c,calls,filters};
}

test('la synthèse familiale remplace la ligne active sans POST',()=>{
  const f=baseContext({EUC_SUIVI_PFMP_INDEX:[{id:7,fields:{Annee_scolaire:'2026-2027',Famille:'BACPRO',Actif:true,Updated_at:'2026-10-09',Payload_JSON:'{}'}}]});
  assert.equal(f.c.EUC_DEV424_writeFamily_('2026-2027','BACPRO',{classes:[1]}),true);
  assert.equal(f.calls.some(x=>x.method==='post'),false);assert.equal(f.calls[0].method,'patch');assert.equal(f.calls[0].body.records[0].id,7);
  assert.deepEqual(f.filters[0].filter,{Annee_scolaire:['2026-2027'],Famille:['BACPRO'],Actif:[true]});
});

test('un état DIRTY puis READY réutilise la même ligne technique',()=>{
  const f=baseContext({EUC_SUIVI_PFMP_INDEX:[{id:8,fields:{Annee_scolaire:'2026-2027',Famille:'__DEV425_STATE__BACPRO',Actif:true,Updated_at:'2026-10-09',Payload_JSON:'{}'}}]});
  f.c.EUC_DEV425_writeState_('2026-2027','BACPRO',{revision:'r1',status:'DIRTY'});
  f.c.EUC_DEV425_writeState_('2026-2027','BACPRO',{revision:'r1',status:'READY'});
  assert.equal(f.calls.filter(x=>x.method==='post').length,0);assert.equal(f.calls.filter(x=>x.method==='patch').length,2);
  assert(f.filters.every(x=>x.filter.Actif&&x.filter.Actif[0]===true));
});

test('un détail DEV427 est patché sur place et ne lit que les actifs',()=>{
  const tech='__DEV427_DETAIL__BACPRO_24_62',f=baseContext({EUC_SUIVI_PFMP_INDEX:[{id:9,fields:{Annee_scolaire:'2026-2027',Famille:tech,Actif:true,Updated_at:'2026-10-09',Payload_JSON:'{}'}}]});
  const changed=f.c.EUC_DEV427_writeDetails_('2026-2027','BACPRO',[{classe:24,periode:62,detail:{lignes:[{eleveId:1}]}}]);
  assert.equal(changed,1);assert.equal(f.calls.some(x=>x.method==='post'),false);assert.equal(f.calls[0].body.records[0].id,9);
  assert.deepEqual(f.filters[0].filter,{Annee_scolaire:['2026-2027'],Actif:[true]});
});

test('le writer historique DETAIL_SNAPSHOT utilise un filtre ciblé et PATCH',()=>{
  const f=baseContext({EUC_SUIVI_PFMP_DETAIL_SNAPSHOT:[{id:10,fields:{Annee_scolaire:'2026-2027',Classe_id:24,Periode_id:62,Actif:true,Updated_at:'2026-10-09',Fingerprint:'ancien'}}]});
  Object.assign(f.c,{EUC_DEV190_txt_:v=>String(v||''),EUC_DEV190_num_:v=>Number(v)||0,EUC_DEV190I_ensureTable_:()=>true,
    EUC_DEV190_buildHistoricalDetail_:()=>({classe:{nom:'TCAR'},periode:{libelle:'PFMP 1'},lignes:[{eleveId:1}]}),
    EUC_DEV190J_enrichContacts_:d=>d,EUC_DEV190I_hash_:()=> 'nouveau',EUC_DEV190I_familyCode_:()=> 'BACPRO'});
  const r=f.c.EUC_DEV531_syncLegacyDetail_({annee:'2026-2027',classe:24,periode:62},true);
  assert.equal(r.mode,'PATCH');assert.equal(f.calls.some(x=>x.method==='post'),false);assert.equal(f.calls[0].body.records[0].id,10);
  assert.deepEqual(f.filters[0].filter,{Annee_scolaire:['2026-2027'],Classe_id:[24],Periode_id:[62],Actif:[true]});
});

test('le paquet redirige exactement les trois écrivains append-only historiques',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pfmp-dev531-')),file=path.join(tmp,'EUC_PFMP_DEV190_Snapshot.js');
  fs.writeFileSync(file,"function EUC_DEV190E_writeFamilyIndex_(a,b,c){return 'old';}\nfunction EUC_DEV190I_syncOne(p){return 'old';}\nfunction EUC_DEV190J_syncOne(p){return 'old';}\n");
  cp.execFileSync(process.execPath,[path.join(root,'scripts','patch-pfmp-storage-writers.js'),tmp]);
  const out=fs.readFileSync(file,'utf8');
  assert.match(out,/EUC_DEV531_upsertFamilyIndex_/);assert.equal((out.match(/EUC_DEV531_syncLegacyDetail_/g)||[]).length,2);assert.doesNotMatch(out,/return 'old'/);
});

if(!process.exitCode)console.log(`${n} tests DEV531 stabilité stockage réussis.`);
