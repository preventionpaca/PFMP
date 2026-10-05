const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV416_Performance.js'),'utf8');
let n=0;
function test(name,fn){try{fn();n++;console.log('OK',name);}catch(e){console.error('KO',name,e);process.exitCode=1;}}

function context(overrides={}){
  const store={};
  const ctx={
    CacheService:{getScriptCache:()=>({
      get:k=>store[k]??null,
      put:(k,v)=>{store[k]=v;},
      removeAll:ks=>ks.forEach(k=>delete store[k]),
      remove:k=>delete store[k]
    })},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    Utilities:{sleep:()=>{}},
    console,
    ...overrides
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);
  ctx.__store=store;return ctx;
}

const card={quick:{
  avec:['ALPHA Alice'],
  sans:['NOUVEAU Deux','NOUVEAU Trois'],
  apprentis:['OMEGA Omar'],
  situations:[],annuleesInterrompues:[]
}};

test('détecte deux élèves absents malgré une révision fraîche',()=>{
  const ctx=context();
  const detail={lignes:[
    {nom:'ALPHA',prenom:'Alice'},
    {nom:'OMEGA',prenom:'Omar'}
  ]};
  assert.equal(ctx.EUC_DEV454_detailMatchesCard_(detail,card),false);
});

test('détecte un remplacement à effectif constant',()=>{
  const ctx=context();
  const detail={lignes:[
    {nom:'ALPHA',prenom:'Alice'},
    {nom:'NOUVEAU',prenom:'Deux'},
    {nom:'INTRUS',prenom:'Iris'},
    {nom:'OMEGA',prenom:'Omar'}
  ]};
  assert.equal(ctx.EUC_DEV454_detailMatchesCard_(detail,card),false);
});

test('la synthèse allégée détecte 17 lignes au lieu de 16 plus 3 apprentis',()=>{
  const ctx=context();
  const lightCard={total:16,apprentis:3};
  const detail={lignes:Array.from({length:17},(_,i)=>({nom:'ELEVE'+i,prenom:'Test'}))};
  assert.equal(ctx.EUC_DEV454_detailMatchesCard_(detail,lightCard),false);
  detail.lignes.push({nom:'ELEVE17',prenom:'Test'},{nom:'ELEVE18',prenom:'Test'});
  assert.equal(ctx.EUC_DEV454_detailMatchesCard_(detail,lightCard),true);
});

test('les compteurs récents priment sur une liste quick ancienne de 17 noms',()=>{
  const ctx=context();
  const staleQuick={
    total:16,apprentis:3,
    quick:{avec:Array.from({length:14},(_,i)=>`AVEC ${i}`),sans:[],apprentis:['APP 1','APP 2','APP 3']}
  };
  const detail={lignes:[
    ...Array.from({length:14},(_,i)=>({nom:'AVEC',prenom:String(i)})),
    {nom:'APP',prenom:'1'},{nom:'APP',prenom:'2'},{nom:'APP',prenom:'3'}
  ]};
  assert.equal(ctx.EUC_DEV454_detailMatchesCard_(detail,staleQuick),false);
});

test('une quick-list ancienne ne relance pas en boucle après réparation à 19',()=>{
  const ctx=context();
  const staleQuick={
    total:16,apprentis:3,
    quick:{avec:Array.from({length:14},(_,i)=>`AVEC ${i}`),sans:[],apprentis:['APP 1','APP 2','APP 3']}
  };
  const repaired={lignes:Array.from({length:19},(_,i)=>({nom:'ELEVE',prenom:String(i)}))};
  assert.equal(ctx.EUC_DEV454_detailMatchesCard_(repaired,staleQuick),true);
});

test('accepte le même effectif avec accents et tiret typographique',()=>{
  const ctx=context();
  const detail={lignes:[
    {nom:'ALPHA',prenom:'Alice'},
    {nom:'NOUVEAU',prenom:'Deux'},
    {nom:'NOM-COMPOSE',prenom:'Prenöm'},
    {nom:'OMEGA',prenom:'Omar'}
  ]};
  const variant={quick:{avec:['ALPHA Alice'],sans:['NOUVEAU Deux','NOM COMPOSE Prenom — Sans convention'],apprentis:['OMEGA Omar']}};
  assert.equal(ctx.EUC_DEV454_detailMatchesCard_(detail,variant),true);
});

test('la réparation repart des élèves courants et non du détail historique',()=>{
  let enriched=0;
  const ctx=context({
    EUC_DEV190_buildHistoricalDetail_:()=>({
      classe:{id:24,nom:'TCAR'},periode:{id:62,libelle:'PFMP n°1'},
      lignes:[{eleveId:1,nom:'ANCIEN',prenom:'Un'}]
    }),
    EUC_IMPORT_lireRecords_:table=>table==='EUC_ELEVES_PFMP'?[
      {id:1,Nom:'ANCIEN',Prenom:'Un',Classe:24,Actif:true,Present_dernier_import:true},
      {id:2,Nom:'NOUVEAU',Prenom:'Deux',Classe:24,Actif:true,Present_dernier_import:true}
    ]:[],
    EUC_DEV422_batchSources_:()=>({}),
    EUC_DEV422_enrichDetailBatch_:d=>{enriched++;d.stats={total:d.lignes.length};return d;},
    EUC_DEV421_fastFamilySnapshot_:()=>({payload:{classes:[{id:24,periodes:[{id:62,total:2,apprentis:0}]}]}})
  });
  const out=ctx.EUC_DEV454_buildCurrentDetail_('2026-2027','BACPRO',24,62);
  assert.equal(out.lignes.length,2);
  assert.equal(out.lignes[1].nom,'NOUVEAU');
  assert.equal(enriched,1);
  const seeded=ctx.EUC_DEV454_buildCurrentDetail_(
    '2026-2027','BACPRO',24,62,
    {__dev425Revision:'rev-19',classe:{id:24,nom:'TCAR'},periode:{id:62},lignes:[]}
  );
  assert.equal(seeded.__dev425Revision,'rev-19');
});

test('une table années indisponible ne rejette pas les références numériques courantes',()=>{
  const ctx=context({
    EUC_DEV190_buildHistoricalDetail_:()=>({classe:{id:24,nom:'TCAR'},periode:{id:62},lignes:[]}),
    EUC_V154_anneesMap_:()=>({}),
    EUC_V154_anneeCode_:v=>String(v),
    EUC_IMPORT_lireRecords_:()=>[
      {id:2,Nom:'NOUVEAU',Prenom:'Deux',Classe:24,Annee_scolaire:3,Actif:true,Present_dernier_import:true}
    ],
    EUC_DEV422_batchSources_:()=>({}),
    EUC_DEV422_enrichDetailBatch_:d=>d
  });
  const out=ctx.EUC_DEV454_buildCurrentDetail_('2026-2027','BACPRO',24,62);
  assert.equal(out.lignes.length,1);
  assert.equal(out.lignes[0].nom,'NOUVEAU');
});

test('un cache final incohérent est reconstruit une seule fois',()=>{
  let builds=0;
  const family={classes:[{id:24,periodes:[{id:62,...card}]}]};
  const fresh={lignes:[
    {nom:'ALPHA',prenom:'Alice'},
    {nom:'NOUVEAU',prenom:'Deux'},
    {nom:'NOUVEAU',prenom:'Trois'},
    {nom:'OMEGA',prenom:'Omar'}
  ],stats:{total:4}};
  const ctx=context({
    EUC_DEV421_fastFamilySnapshot_:()=>({payload:family}),
    EUC_DEV425_payloadFresh_:()=>true,
    EUC_DEV190_buildHistoricalDetail_:()=>{builds++;return JSON.parse(JSON.stringify(fresh));},
    EUC_DEV445_detailSituations_:d=>d,
    EUC_DEV428_withContext_:d=>d
  });
  const key=ctx.EUC_DEV416_key_('2026-2027','BACPRO',24,62);
  ctx.EUC_DEV416_cachePut_(key,{lignes:[{nom:'ALPHA',prenom:'Alice'},{nom:'OMEGA',prenom:'Omar'}]});
  const out=ctx.EUC_DEV416_finalDetail_('2026-2027','BACPRO',24,62);
  assert.equal(out.lignes.length,4);
  assert.equal(builds,1);
  const out2=ctx.EUC_DEV416_finalDetail_('2026-2027','BACPRO',24,62);
  assert.equal(out2.lignes.length,4);
  assert.equal(builds,1);
});

test('un cache réparé depuis les élèves courants reste utilisable malgré une ancienne révision famille',()=>{
  let persistentReads=0;
  const ctx=context({
    EUC_DEV425_payloadFresh_:()=>false,
    EUC_DEV427_readDetail_:()=>{persistentReads++;return null;},
    EUC_DEV445_detailSituations_:d=>d,
    EUC_DEV428_withContext_:d=>d
  });
  const key=ctx.EUC_DEV416_key_('2026-2027','BACPRO',24,62);
  ctx.EUC_DEV416_cachePut_(key,{
    lignes:Array.from({length:19},(_,i)=>({nom:'ELEVE',prenom:String(i)})),
    __dev454RosterVerified:true,__dev454Repair:{source:'eleves-courants'}
  });
  const out=ctx.EUC_DEV416_finalDetail_('2026-2027','BACPRO',24,62);
  assert.equal(out.lignes.length,19);
  assert.equal(out.__dev416Cache,true);
  assert.equal(persistentReads,0);
});

if(!process.exitCode)console.log(`${n} tests DEV454 cohérence effectifs réussis.`);
