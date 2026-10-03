'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const source=read('apps-script/EUC_PFMP_DEV420_SituationsEleves.js');
const detailCache=read('apps-script/EUC_PFMP_DEV416_Performance.js');
const familyService=read('apps-script/EUC_PFMP_DEV340_ConsolidationLive.js');
const quick=read('apps-script/EUC_PFMP_DEV388_Fix.js');
const adminTools=read('apps-script/EUC_PFMP_DEV370_AdminTools.js');
const noConventionUi=read('apps-script/Sans_Convention_PFMP_V368.html');
const detailUi=read('apps-script/Suivi_PFMP_Classe_Detail_V156.html');
const familyAdmin=read('apps-script/Suivi_Conventions_Admin_FamilleV190L.html');
const familyPublic=read('apps-script/Suivi_Conventions_Public_FamilleClone_V353.html');

let count=0;
function test(name,fn){try{fn();console.log('✓',name);count++;}catch(e){console.error('✗',name,e.stack||e);process.exitCode=1;}}

test('la production Grist est absente du lot DEV420',()=>assert.doesNotMatch(source,/3pnVrygfNn7c/));
test('l’installation exige l’autorisation explicite dédiée',()=>assert.match(source,/AUTORISATION_SITUATIONS_ELEVES_DEV420/));
test('les deux tables métier sont déclarées avec des références Grist',()=>{
  assert.match(source,/EUC_STATUTS_SUIVI_ELEVE_PFMP/);assert.match(source,/EUC_SITUATIONS_ELEVES_PFMP/);
  assert.match(source,/Ref:Classes/);assert.match(source,/Ref:Planning_Periodes/);assert.match(source,/Ref:EUC_ELEVES_PFMP/);assert.match(source,/Ref:EUC_STATUTS_SUIVI_ELEVE_PFMP/);
});
test('aucune suppression physique n’est possible',()=>assert.doesNotMatch(source,/EUC_ENT_grist\(\s*['"]delete/i));
test('les trois motifs initiaux sont présents',()=>{
  assert.match(source,/Dossier géré par avis scolaire/);assert.match(source,/Démissionnaire/);assert.match(source,/Absentéiste/);
});
test('toute écriture exige cible active et droit de modification',()=>{
  assert.match(source,/EUC_ENT_controlerCibleRecette_/);assert.match(source,/ctx\.peutModifier!==true/);assert.match(source,/ctx\.lectureSeule===true/);
});
test('le cache final est enrichi après lecture sans polluer sa base',()=>{
  assert.match(detailCache,/EUC_DEV420_enrichDetail_\(hit,annee,famille,classe,periode\)/);
  assert.ok(detailCache.indexOf('EUC_DEV416_cachePut_(key,d)')<detailCache.lastIndexOf('EUC_DEV420_enrichDetail_(d,annee,famille,classe,periode)'));
});
test('les vues de famille et le contrôle rapide intègrent les situations',()=>{
  assert.match(familyService,/EUC_DEV420_enrichFamily_/);assert.match(quick,/situationsCouvertes/);
  for(const html of [familyAdmin,familyPublic]){assert.match(html,/situationsAdministratives/);assert.match(html,/Situation administrative/);assert.match(html,/repeat\(4/);}
});
test('le compteur détail ne remet pas une situation excluante dans sans convention',()=>assert.match(detailUi,/x\.exclureSansConvention===true/));
test('la page administrative permet affectation ajout et désactivation logique',()=>{
  assert.match(noConventionUi,/EUC_DEV420_sauverSituation/);assert.match(noConventionUi,/EUC_DEV420_ajouterMotif/);assert.match(noConventionUi,/EUC_DEV420_definirMotifActif/);
  assert.match(noConventionUi,/EUC_DEV420_installer\('AUTORISATION_SITUATIONS_ELEVES_DEV420'\)/);
  assert.match(noConventionUi,/Aucune suppression physique/);assert.match(adminTools,/situationLibelle/);
});

function memoryContext(){
  const tables={};let next=1;const cache=new Map();const calls=[];
  const ctx={console,JSON,String,Number,Boolean,Array,Object,Math,Date,encodeURIComponent,
    EUC_ENT_controlerCibleRecette_:()=>true,
    EUC_V156_contexteAdmin_:()=>({autorise:true,peutModifier:true,lectureSeule:false,email:'admin@example.test'}),
    EUC_DEV368_admin:()=>({autorise:true}),
    EUC_PFMP_ref_:v=>Array.isArray(v)?Number(v[1]||v[0]):Number(v),
    EUC_DEV416_key_:(a,f,c,p)=>['D418',a,f,c,p].join('_'),
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    CacheService:{getScriptCache:()=>({
      get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k),removeAll:ks=>ks.forEach(k=>cache.delete(k))
    })},
    EUC_IMPORT_lireRecords_:table=>(tables[table]&&tables[table].rows||[]).map(r=>Object.assign({},r)),
    EUC_DEV371_detailCorrect_:()=>({lignes:[{eleveId:7,nom:'TEST',prenom:'Élève',conventionId:0,convention:false,apprenti:false,statutCode:'SANS_CONVENTION'}]})
  };
  ctx.EUC_ENT_grist=(method,url,body)=>{
    calls.push({method,url,body});
    if(method==='get'&&url==='/tables')return{tables:Object.keys(tables).map(id=>({id}))};
    let m=url.match(/^\/tables\/([^/]+)(?:\/(columns|records))?/),id=m&&decodeURIComponent(m[1]),part=m&&m[2];
    if(method==='get'&&part==='columns')return{columns:(tables[id]&&tables[id].columns||[]).map(x=>({id:x.id}))};
    if(method==='post'&&url==='/tables'){
      body.tables.forEach(t=>{tables[t.id]={columns:t.columns.slice(),rows:[]};});return{};
    }
    if(method==='post'&&part==='columns'){tables[id].columns.push(...body.columns);return{};}
    if(method==='post'&&part==='records'){
      body.records.forEach(r=>tables[id].rows.push(Object.assign({id:next++},r.fields)));return{};
    }
    if(method==='patch'&&part==='records'){
      body.records.forEach(r=>{let row=tables[id].rows.find(x=>x.id===Number(r.id));Object.assign(row,r.fields);});return{};
    }
    throw new Error('appel non simulé '+method+' '+url);
  };
  vm.createContext(ctx);vm.runInContext(source,ctx,{filename:'EUC_PFMP_DEV420_SituationsEleves.js'});
  return {ctx,tables,calls};
}

test('l’installateur est idempotent et crée exactement trois motifs initiaux',()=>{
  const {ctx,tables}=memoryContext();
  assert.throws(()=>ctx.EUC_DEV420_installer('NON'),/Autorisation explicite/);
  const first=ctx.EUC_DEV420_installer('AUTORISATION_SITUATIONS_ELEVES_DEV420');
  assert.equal(first.tables.length,2);assert.equal(first.motifsCrees,3);
  const second=ctx.EUC_DEV420_installer('AUTORISATION_SITUATIONS_ELEVES_DEV420');
  assert.equal(second.motifsCrees,0);assert.equal(tables.EUC_STATUTS_SUIVI_ELEVE_PFMP.rows.length,3);
});
test('l’enrichissement détail remplace sans convention et conserve l’égalité des compteurs',()=>{
  const {ctx,tables}=memoryContext();ctx.EUC_DEV420_installer('AUTORISATION_SITUATIONS_ELEVES_DEV420');
  tables.EUC_SITUATIONS_ELEVES_PFMP.rows.push({id:90,Cle_situation:'2026-2027|4|5|7',Annee_scolaire:'2026-2027',Classe:4,Periode:5,Eleve:7,Statut:1,Actif:true});
  const d={lignes:[
    {eleveId:7,nom:'A',conventionId:0,apprenti:false,statutCode:'SANS_CONVENTION'},
    {eleveId:8,nom:'B',conventionId:8,convention:true,apprenti:false,statutCode:'AVEC_CONVENTION'},
    {eleveId:9,nom:'C',conventionId:0,apprenti:true,statutCode:'APPRENTI'},
    {eleveId:10,nom:'D',conventionId:0,apprenti:false,statutCode:'SANS_CONVENTION'}
  ]};
  const out=ctx.EUC_DEV420_enrichDetail_(d,'2026-2027','BACPRO',4,5);
  assert.equal(out.stats.situationsAdministratives,1);assert.equal(out.stats.sansConvention,1);assert.equal(out.stats.avecConvention,1);assert.equal(out.stats.apprentis,1);
  assert.equal(out.lignes[0].exclureSansConvention,true);assert.match(out.lignes[0].statut,/avis scolaire/);
});
test('l’affectation refuse un élève couvert et la désactivation reste logique',()=>{
  const m=memoryContext(),{ctx,tables,calls}=m;ctx.EUC_DEV420_installer('AUTORISATION_SITUATIONS_ELEVES_DEV420');
  ctx.EUC_DEV371_detailCorrect_=()=>({lignes:[{eleveId:7,conventionId:2,convention:true,apprenti:false,statutCode:'AVEC_CONVENTION'}]});
  assert.throws(()=>ctx.EUC_DEV420_sauverSituation({annee:'2026-2027',famille:'BACPRO',classeId:4,periodeId:5,eleveId:7,statutId:1}),/actuellement sans convention/);
  ctx.EUC_DEV371_detailCorrect_=()=>({lignes:[{eleveId:7,conventionId:0,convention:false,apprenti:false,statutCode:'SANS_CONVENTION'}]});
  ctx.EUC_DEV420_sauverSituation({annee:'2026-2027',famille:'BACPRO',classeId:4,periodeId:5,eleveId:7,statutId:1});
  assert.equal(tables.EUC_SITUATIONS_ELEVES_PFMP.rows[0].Actif,true);
  ctx.EUC_DEV420_sauverSituation({annee:'2026-2027',famille:'BACPRO',classeId:4,periodeId:5,eleveId:7,statutId:0});
  assert.equal(tables.EUC_SITUATIONS_ELEVES_PFMP.rows[0].Actif,false);
  assert.equal(calls.some(x=>x.method==='delete'),false);
});
test('l’enrichissement famille décompte les situations excluantes sans valeur négative',()=>{
  const {ctx,tables}=memoryContext();ctx.EUC_DEV420_installer('AUTORISATION_SITUATIONS_ELEVES_DEV420');
  tables.EUC_SITUATIONS_ELEVES_PFMP.rows.push({id:91,Annee_scolaire:'2026-2027',Classe:4,Periode:5,Eleve:7,Statut:1,Actif:true});
  const out=ctx.EUC_DEV420_enrichFamily_({classes:[{id:4,periodes:[{id:5,total:12,conventions:10}]}]},'2026-2027','BACPRO');
  assert.equal(out.classes[0].periodes[0].situationsAdministratives,1);assert.equal(out.classes[0].periodes[0].sansConvention,1);
});

if(!process.exitCode)console.log(`\n${count} tests DEV420 situations réussis.`);
