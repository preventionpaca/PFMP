const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const crypto=require('crypto');
const code=fs.readFileSync('apps-script/EUC_PFMP_DEV532_StorageCleanup.js','utf8');
let passed=0;
function test(name,fn){try{fn();passed++;console.log('✓',name);}catch(e){console.error('✗',name,e.message);process.exitCode=1;}}
function fixture(){
  const tables={
    EUC_SUIVI_PFMP_INDEX:[
      {id:1,Annee_scolaire:'2026-2027',Famille:'BACPRO',Updated_at:'2026-10-08T10:00:00Z',Actif:true,Payload_bytes:100},
      {id:2,Annee_scolaire:'2026-2027',Famille:'BACPRO',Updated_at:'2026-10-09T10:00:00Z',Actif:true,Payload_bytes:110},
      {id:3,Annee_scolaire:'2026-2027',Famille:'BACPRO',Updated_at:'2026-10-07T10:00:00Z',Actif:false,Payload_bytes:90},
      {id:4,Annee_scolaire:'2026-2027',Famille:'BTS',Updated_at:'2026-10-09T09:00:00Z',Actif:'True',Payload_bytes:80}
    ],
    EUC_SUIVI_PFMP_DETAIL_SNAPSHOT:[
      {id:10,Annee_scolaire:'2026-2027',Famille:'BACPRO',Classe_id:24,Periode_id:62,Updated_at:'2026-10-08T10:00:00Z',Actif:'False',Payload_bytes:50},
      {id:11,Annee_scolaire:'2026-2027',Famille:'BACPRO',Classe_id:24,Periode_id:62,Updated_at:'2026-10-09T10:00:00Z',Actif:'True',Payload_bytes:60}
    ]
  },deleted=[],props={};
  const ctx={console,Date,JSON,String,Number,Array,Object,Math,isFinite,encodeURIComponent,
    Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},computeDigest:(_,s)=>Array.from(crypto.createHash('sha256').update(s).digest()).map(x=>x>127?x-256:x)},
    EUC_ENT_controlerCibleRecette_:()=>true,EUC_ENT_canalProjet_:()=> 'GREEN',EUC_ENT_lireConfiguration:()=>({EUC_ENT_GRIST_DOC_ID:'production-configuree'}),
    EUC_SUIVI_fields_:rows=>rows,EUC_SUIVI_sqlLecture_:sql=>{const name=sql.includes('DETAIL_SNAPSHOT')?'EUC_SUIVI_PFMP_DETAIL_SNAPSHOT':'EUC_SUIVI_PFMP_INDEX';return tables[name].map(x=>Object.assign({},x));},
    EUC_ENT_grist:(method,url,ids)=>{assert.equal(method,'post');const name=url.includes('DETAIL_SNAPSHOT')?'EUC_SUIVI_PFMP_DETAIL_SNAPSHOT':'EUC_SUIVI_PFMP_INDEX';ids.forEach(id=>{deleted.push(id);tables[name]=tables[name].filter(x=>x.id!==id);});return{};},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||'',setProperty:(k,v)=>{props[k]=v;},deleteProperty:k=>{delete props[k];}})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})}
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);return{ctx,tables,deleted,props};
}

test('le plan conserve la ligne active la plus récente par clé',()=>{
  const f=fixture(),p=f.ctx.EUC_DEV532_plan_();
  assert.equal(p.totalRows,6);assert.equal(p.totalKeepers,3);assert.equal(p.totalCandidates,3);assert.equal(p.candidateBytes,240);assert.equal(p.blockedKeys,0);
  assert.deepEqual(Array.from(p.tables[0].keepers),[2,4]);assert.deepEqual(Array.from(p.tables[0].candidates),[1,3]);
});

test('le nettoyage exige un audit identique puis supprime seulement les doublons',()=>{
  const f=fixture(),audit=f.ctx.EUC_DEV532_auditStorageCleanup();assert.equal(audit.totalCandidates,3);
  const result=f.ctx.EUC_DEV532_cleanupObsoleteSnapshots();
  assert.equal(result.deleted,3);assert.equal(result.remainingRows,3);assert.deepEqual(f.deleted.sort((a,b)=>a-b),[1,3,10]);
  assert.deepEqual(f.tables.EUC_SUIVI_PFMP_INDEX.map(x=>x.id).sort((a,b)=>a-b),[2,4]);
  assert.deepEqual(f.tables.EUC_SUIVI_PFMP_DETAIL_SNAPSHOT.map(x=>x.id),[11]);
});

test('une clé sans ligne active bloque avant toute suppression',()=>{
  const f=fixture();f.tables.EUC_SUIVI_PFMP_INDEX.push({id:5,Annee_scolaire:'2025-2026',Famille:'CAP',Updated_at:'',Actif:false,Payload_bytes:1});
  assert.throws(()=>f.ctx.EUC_DEV532_auditStorageCleanup(),/clé\(s\) sans ligne active/);assert.equal(f.deleted.length,0);
});

test('un changement après audit invalide le plan armé',()=>{
  const f=fixture();f.ctx.EUC_DEV532_auditStorageCleanup();f.tables.EUC_SUIVI_PFMP_INDEX.push({id:6,Annee_scolaire:'2026-2027',Famille:'BTS',Updated_at:'2026-10-10T00:00:00Z',Actif:true,Payload_bytes:81});
  assert.throws(()=>f.ctx.EUC_DEV532_cleanupObsoleteSnapshots(),/contenu a changé/);assert.equal(f.deleted.length,0);
});

if(!process.exitCode)console.log(`\n${passed} tests DEV532 nettoyage stockage réussis.`);
