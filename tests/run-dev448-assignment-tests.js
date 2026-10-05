const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV448_AffectationsRapides.js'),'utf8');

function fixture(){
  const students=Array.from({length:12},(_,i)=>({eleveId:i+1,nom:'ELEVE'+(i+1),prenom:'Test',statut:'Convention enregistrée',professeurTelephone:'',professeurVisiteur:''}));
  const detail={annee:'2026-2027',famille:'BACPRO',classe:{id:28,nom:'TMP3D'},periode:{id:65,libelle:'PFMP n°1'},lignes:students};
  const tables={
    EUC_PROFESSEURS_PFMP:[{id:7,fields:{Actif:true,Civilite:'M.',Prenom:'Alex',Nom:'MARTIN',Email:'alex@example.test',Discipline:'Test'}}],
    EUC_AFFECTATIONS_SUIVI_PFMP:[],
    EUC_SUIVI_PFMP_INDEX:[{id:91,fields:{Annee_scolaire:'2026-2027',Famille:'__DEV427_DETAIL__BACPRO_28_65',Actif:true,Updated_at:'2026-10-05T06:00:00.000Z',Payload_JSON:JSON.stringify(detail)}}],
    EUC_ACCES_PP_PFMP:[{id:31,fields:{Actif:true,Annee_scolaire:'2026-2027',Famille:'BACPRO',Classe_id:28,Classe_nom:'TMP3D',Periode_id:65,Periode_libelle:'PFMP n°1',Professeur_id:4,Professeur_nom:'Mme PP',Expiration:'2026-10-16T23:59:59.000Z',Code_salt:'salt',Code_hash:'VALIDCODE1234567890'}}]
  };
  const calls=[],cache={};let nextId=200;
  function value(v){return Array.isArray(v)?Number(v[1]||v[0])||v[1]||v[0]:v;}
  function matches(fields,filter){return Object.keys(filter||{}).every(k=>(filter[k]||[]).some(v=>String(value(fields[k]))===String(v)));}
  const ctx={console,Date,JSON,Math,isFinite,encodeURIComponent,decodeURIComponent,
    CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v;}})},
    Session:{getActiveUser:()=>({getEmail:()=> 'admin@example.test'})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='EUC_PFMP_ADMIN_EMAILS'?'admin@example.test':cache[k]||null,setProperty:(k,v)=>{cache[k]=v;},deleteProperty:k=>{delete cache[k];}})},
    ScriptApp:{getProjectTriggers:()=>[],deleteTrigger:()=>{},newTrigger:()=>({timeBased:()=>({everyMinutes:()=>({create:()=>{}})})})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    EUC_DEV424_assertTarget_:()=>true,EUC_DEV427_DETAIL_PREFIX_:'__DEV427_DETAIL__',EUC_DEV190E_INDEX_TABLE_:'EUC_SUIVI_PFMP_INDEX',
    EUC_DEV416_key_:(a,f,c,p)=>[a,f,c,p].join('|'),EUC_DEV416_cachePut_:(k,v)=>{cache[k]=JSON.stringify(v)},
    EUC_V156_contexteAdmin_:()=>({autorise:true,email:'admin@example.test'}),
    EUC_DEV441_PP_TABLE_:'EUC_ACCES_PP_PFMP',EUC_DEV441_codeCanon_:v=>String(v||'').replace(/[^A-Z0-9]/gi,'').toUpperCase(),
    EUC_DEV441_codeHash_:(code,salt)=>code,
    EUC_ENT_grist:(method,url,body)=>{
      calls.push({method,url,body});
      const m=url.match(/\/tables\/([^/?]+)\/records/);if(!m)throw new Error('URL inattendue '+url);
      const table=decodeURIComponent(m[1]),rows=tables[table];if(!rows)throw new Error('Table inconnue '+table);
      if(method==='get'){
        const fm=url.match(/[?&]filter=([^&]+)/),filter=fm?JSON.parse(decodeURIComponent(fm[1])):{};
        return{records:rows.filter(r=>matches(r.fields,filter)).map(r=>({id:r.id,fields:Object.assign({},r.fields)}))};
      }
      if(method==='patch'){
        (body.records||[]).forEach(p=>{const row=rows.find(r=>r.id===Number(p.id));if(!row)throw new Error('Ligne absente');Object.assign(row.fields,p.fields);});return{records:body.records};
      }
      if(method==='post'){
        const created=(body.records||[]).map(p=>{const row={id:nextId++,fields:Object.assign({},p.fields)};rows.push(row);return{id:row.id,fields:Object.assign({},row.fields)}});return{records:created};
      }
      throw new Error('Méthode inattendue');
    }
  };
  vm.createContext(ctx);vm.runInContext(code,ctx,{filename:'EUC_PFMP_DEV448_AffectationsRapides.js'});
  return{ctx,tables,calls,cache};
}

let n=0;function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e);process.exitCode=1;}}
const ids=Array.from({length:10},(_,i)=>i+1);

test('admin affecte dix élèves avec cinq appels et une écriture groupée',()=>{
  const f=fixture(),r=f.ctx.EUC_DEV448_affecterAdmin({annee:'2026-2027',famille:'BACPRO',classeId:28,periodeId:65,type:'VISITE',profId:7,eleveIds:ids});
  assert.equal(r.ok,true);assert.equal(r.crees,10);assert.equal(r.modifies,0);assert.equal(f.calls.length,5);
  const post=f.calls.find(x=>x.method==='post');assert.equal(post.body.records.length,10);
  assert.equal(f.tables.EUC_AFFECTATIONS_SUIVI_PFMP.length,10);
  assert.equal(JSON.parse(f.tables.EUC_SUIVI_PFMP_INDEX[0].fields.Payload_JSON).lignes[0].professeurVisiteur,'M. Alex MARTIN');
});

test('réaffectation admin des dix élèves tient en quatre appels sans reconstruction',()=>{
  const f=fixture(),q={annee:'2026-2027',famille:'BACPRO',classeId:28,periodeId:65,type:'TELEPHONE',profId:7,eleveIds:ids};
  f.ctx.EUC_DEV448_affecterAdmin(q);f.calls.length=0;
  const r=f.ctx.EUC_DEV448_affecterAdmin(q);assert.equal(r.modifies,10);assert.equal(r.crees,0);assert.equal(f.calls.length,4);
  const patch=f.calls.find(x=>x.method==='patch'&&x.url.includes('EUC_AFFECTATIONS'));assert.equal(patch.body.records.length,10);
});

test('accès PP se déverrouille en trois lectures après amorçage professeurs',()=>{
  const f=fixture();f.ctx.EUC_DEV448_professeurs_();f.calls.length=0;
  const r=f.ctx.EUC_DEV448_unlockPp({code:'VALIDCODE1234567890',annee:'2026-2027',classeId:28,periodeId:65});
  assert.equal(r.lignes.length,12);assert.equal(r.scope.classe,'TMP3D');assert.equal(f.calls.length,3);assert.ok(f.calls.every(x=>x.method==='get'));
});

test('PP affecte dix élèves en lot sans reconstruction familiale',()=>{
  const f=fixture();f.ctx.EUC_DEV448_professeurs_();f.calls.length=0;
  const r=f.ctx.EUC_DEV448_affecterPp({code:'VALIDCODE1234567890',annee:'2026-2027',classeId:28,periodeId:65,type:'VISITE',profId:7,eleveIds:ids});
  assert.equal(r.ok,true);assert.equal(r.crees,10);assert.ok(f.calls.length<=6);
  assert.equal(f.calls.filter(x=>x.method==='post')[0].body.records.length,10);
  assert.ok(f.tables.EUC_AFFECTATIONS_SUIVI_PFMP.every(x=>x.fields.Affecte_par==='PP_TEMP:4'));
});

test('un élève hors périmètre est refusé avant toute écriture métier',()=>{
  const f=fixture();assert.throws(()=>f.ctx.EUC_DEV448_affecterAdmin({annee:'2026-2027',famille:'BACPRO',classeId:28,periodeId:65,type:'VISITE',profId:7,eleveIds:[999]}),/hors de la classe/);
  assert.equal(f.calls.some(x=>x.method==='post'||x.method==='patch'),false);
});

test('le module ne lance jamais la reconstruction synchrone DEV425',()=>{
  assert.doesNotMatch(code,/EUC_DEV425_(?:begin|finish)Mutation_|EUC_DEV425_finishResult_/);
});

test('une erreur backlog suspend le déclencheur de reconstruction',()=>{
  const f=fixture();let removed=0;
  f.ctx.ScriptApp.getProjectTriggers=()=>[{getHandlerFunction:()=> 'EUC_DEV424_refreshScheduled'}];
  f.ctx.ScriptApp.deleteTrigger=()=>{removed++;};
  assert.equal(f.ctx.EUC_DEV448_autoPauseOnGristError_(new Error('DEV190 Grist API 429 : Too many backlogged requests')),true);
  assert.equal(removed,1);assert.match(f.cache.EUC_DEV448_SNAPSHOT_PAUSE_V1,/backlogged requests/);
});

test('la pause manuelle ne supprime que le déclencheur snapshot',()=>{
  const f=fixture(),deleted=[];
  f.ctx.ScriptApp.getProjectTriggers=()=>[
    {getHandlerFunction:()=> 'EUC_DEV424_refreshScheduled'},
    {getHandlerFunction:()=> 'AUTRE_TRAITEMENT'}
  ];
  f.ctx.ScriptApp.deleteTrigger=t=>deleted.push(t.getHandlerFunction());
  const r=f.ctx.EUC_DEV448_pauseSnapshotTrigger('urgence backlog');
  assert.equal(r.removed,1);assert.deepEqual(deleted,['EUC_DEV424_refreshScheduled']);
});

test('les deux interfaces appellent les points rapides',()=>{
  const admin=fs.readFileSync(path.join(root,'apps-script','Suivi_PFMP_Classe_Detail_V156.html'),'utf8');
  assert.match(admin,/EUC_DEV448_affecterAdmin/);
  assert.match(code,/function EUC_DEV448_unlockPp/);assert.match(code,/function EUC_DEV448_affecterPp/);
});

if(!process.exitCode)console.log(`\n${n} tests DEV448 affectations rapides réussis.`);
