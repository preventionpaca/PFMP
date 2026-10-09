const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const code=fs.readFileSync('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js','utf8');
let reads=0,writes=[];
const detail={famille:'BACPRO',classe:{id:28,nom:'TMP3D'},periode:{id:65,libelle:'PFMP n°1'},lignes:[
  {entreprise:'ACME',adresseEntreprise:'14 RUE DES ETOILES, 06000 NICE',siretEntreprise:'12345678901234'},
  {entreprise:'ACME',adresseEntreprise:'14 RUE DES ETOILES, 06000 NICE',siretEntreprise:'12345678901234'},
  {entreprise:'BETA',adresseEntreprise:'1 AVENUE DE FRANCE, 06100 NICE',siretEntreprise:'99999999999999'}
]};
const indexRows=[{id:10,fields:{Annee_scolaire:'2026-2027',Famille:'__DEV427_DETAIL__BACPRO_28_65',Payload_JSON:JSON.stringify(detail),Updated_at:'2026-10-05T08:00:00Z',Actif:true}}];
const geoRows=[{id:5,Cle_adresse:'oldkey',SIRET:'12345678901234',Entreprise:'ACME',Adresse_source:'14 RUE DES ETOILES, 6000 NICE',Pays:'FRANCE',Code_postal:'6000',Latitude:43.7,Longitude:7.2,Statut:'GEOCODE_AUTOMATIQUE'}];
const ctx={console,encodeURIComponent,isFinite,Date,Math,JSON,String,Number,Object,Array,RegExp,
  EUC_DEV190E_INDEX_TABLE_:'IDX',EUC_DEV190I_TABLE_:'DETAIL',
  EUC_DEV368_year:v=>String(v||'2026-2027'),EUC_DEV368_admin:()=>({email:'admin@example.test'}),
  EUC_DEV190G_fastRecords_:(table,filter)=>{reads++;return table==='IDX'?indexRows:[]},
  EUC_IMPORT_lireRecords_:table=>{reads++;return table==='EUC_GEO_ENTREPRISES_PFMP'?geoRows:[]},
  EUC_ENT_grist:(method,path,body)=>{writes.push({method,path,body});return{records:(body&&body.records)||[]}},
  UrlFetchApp:{fetch:()=>({getContentText:()=>JSON.stringify({features:[{geometry:{coordinates:[7.25,43.71]},properties:{score:.9,label:'14 Rue des Étoiles 06000 Nice',postcode:'06000',city:'Nice',type:'housenumber'}}]})})},
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},base64EncodeWebSafe:v=>'digest-value',computeDigest:()=>[1],sleep:()=>{},getUuid:()=> 'uuid',formatDate:()=>'',parseDate:()=>new Date()},
  MailApp:{},LockService:{},PropertiesService:{},CacheService:{},ScriptApp:{},HtmlService:{},Session:{},Logger:{log:()=>{}}
};
vm.createContext(ctx);vm.runInContext(code,ctx);
let candidates=ctx.EUC_DEV441_geoCandidates_({annee:'2026-2027',famille:'BACPRO'});
assert.equal(reads,2,'candidate build must use one snapshot read and one geo read');
assert.equal(candidates.length,2,'same SIRET must be deduplicated');
assert.equal(candidates[0].codePostal,'06000','postal code must keep leading zero');
assert.equal(candidates[0]._recordId,5,'saved row id must be reused');
reads=0;writes=[];
let result=ctx.EUC_DEV441_geocodeFrance({annee:'2026-2027',famille:'BACPRO',keys:[candidates[1].key]});
assert.equal(reads,2,'geocode batch must not rebuild candidates after writes');
assert.equal(writes.length,1,'one Grist write for one homogeneous batch');
assert.equal(writes[0].method,'post');
assert.equal(result.candidats.length,2);

const fallbackCtx={console,encodeURIComponent,isFinite,Date,Math,JSON,String,Number,Object,Array,RegExp,
  EUC_DEV190E_INDEX_TABLE_:'IDX',EUC_DEV190I_TABLE_:'DETAIL',EUC_CONVENTION_ACCES_TABLE_:'EUC_ACCES_FORMULAIRES_PFMP',
  EUC_DEV368_year:v=>String(v||'2026-2027'),EUC_DEV368_admin:()=>({email:'admin@example.test'}),
  EUC_DEV368_catalog:()=>({classes:[{famille:'BACPRO',classeId:28,classe:'TMP3D',periodes:[{id:65,libelle:'PFMP n°1'}]}]}),
  EUC_DEV190G_fastRecords_:(table)=>table==='EUC_ACCES_FORMULAIRES_PFMP'?[{id:99,fields:{Annee_scolaire:'2026-2027',Classe_convention:28,Classe_convention_nom:'TMP3D',Periode:65,Periode_libelle:'PFMP n°1',Entreprise_raison_sociale:'GARAGE TEST',Entreprise_adresse:'2 AVENUE DU TEST',Entreprise_code_postal:'06000',Entreprise_commune:'NICE',Entreprise_siret:'12345678901234',Statut_administratif:'INFORMATIONS_ENREGISTREES'}}]:[],
  EUC_IMPORT_lireRecords_:()=>[],
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},base64EncodeWebSafe:v=>'digest-value',computeDigest:()=>[1],sleep:()=>{},getUuid:()=> 'uuid',formatDate:()=>'',parseDate:()=>new Date()},
  MailApp:{},LockService:{},PropertiesService:{},CacheService:{},ScriptApp:{},HtmlService:{},Session:{},Logger:{log:()=>{}}
};
vm.createContext(fallbackCtx);vm.runInContext(code,fallbackCtx);
const fallbackCandidates=fallbackCtx.EUC_DEV441_geoCandidates_({annee:'2026-2027',famille:'BACPRO'});
assert.equal(fallbackCandidates.length,1,'geocoding must fall back to active convention records when detail snapshots are absent');
assert.equal(fallbackCandidates[0].entreprise,'GARAGE TEST');

const familyCode=fs.readFileSync('apps-script/EUC_PFMP_DEV339_FamilleUX.js','utf8');
let heavyCalls=0;
const familyCtx={console,Date,Math,JSON,String,Number,Object,Array,
  CacheService:{getScriptCache:()=>({get:()=>null,getAll:()=>({}),put:()=>{},remove:()=>{},removeAll:()=>{}})},
  EUC_DEV190E_INDEX_TABLE_:'IDX',
  EUC_DEV190G_fastRecords_:()=>[{id:1,fields:{Actif:true,Updated_at:'2026-10-05',Payload_JSON:JSON.stringify({__dev424Enriched:true,classes:[{classeId:28,periodes:[{id:65,quick:{ok:true}}]}]})}}],
  EUC_DEV425_payloadFresh_:()=>false,
  EUC_DEV190E_heavyFamily_:()=>{heavyCalls++;return{}},
  EUC_DEV190I_activeRows_:()=>[]
};
vm.createContext(familyCtx);vm.runInContext(familyCode,familyCtx);
const staleFamily=familyCtx.EUC_DEV421_fastFamilySnapshot_({annee:'2026-2027',famille:'BACPRO'});
assert.equal(staleFamily.ready,true,'last enriched family snapshot must stay readable while rebuilding');
assert.equal(staleFamily.source,'SNAPSHOT_EN_COURS_DE_RECALCUL');
assert.equal(heavyCalls,0,'a stale enriched snapshot must not trigger live reconstruction');

const resumeCode=fs.readFileSync('apps-script/EUC_PFMP_DEV385_Fiabilite.js','utf8');
let summaryReads=0;
const summaryRows=[
  {id:1,fields:{Famille:'BACPRO',Actif:true,Updated_at:'2026-10-05T08:00:00Z',Payload_JSON:JSON.stringify({classes:[{nom:'TMP3D',periodes:[{libelle:'PFMP n°1',debut:'2026-09-28',conventions:10,total:12,apprentis:1},{libelle:'P.dif.',debut:'2027-02-08',parcoursDifferencies:2,poursuitePfmp2:1,aDefinirFinTerminale:3}]}]})}},
  {id:2,fields:{Famille:'BTS',Actif:true,Updated_at:'2026-10-05T08:00:00Z',Payload_JSON:JSON.stringify({classes:[{nom:'1CIEL',periodes:[{libelle:'Stage n°1',debut:'2026-11-01',conventions:7,total:8,apprentis:2}]}]})}},
  {id:3,fields:{Famille:'CAP',Actif:true,Updated_at:'2026-10-05T08:00:00Z',Payload_JSON:JSON.stringify({classes:[{nom:'1CAP',periodes:[{libelle:'PFMP n°1',debut:'2026-11-01',conventions:5,total:6}]}]})}}
];
const durableProperties={};
const durableCache={};
const resumeCtx={console,Date,Math,JSON,String,Number,Object,Array,
  CacheService:{getScriptCache:()=>({get:key=>durableCache[key]||null,put:(key,value)=>{durableCache[key]=value}})},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>durableProperties[key]||null,setProperties:values=>Object.assign(durableProperties,values)})},
  EUC_DEV190E_INDEX_TABLE_:'IDX',
  EUC_DEV190G_fastRecords_:()=>{summaryReads++;return summaryRows},
  EUC_DEV335_className_:c=>c.nom,
  EUC_DEV335_level_:(name,fam)=>fam==='BACPRO'?'Terminale':(fam==='BTS'?'1re année':'1CAP'),
  EUC_DEV335_isPdif_:p=>String(p.libelle||'').indexOf('P.dif')>=0,
  EUC_DEV348_resumeAccueil:()=>{throw new Error('legacy summary must not be called')}
};
vm.createContext(resumeCtx);vm.runInContext(resumeCode,resumeCtx);
const summary=resumeCtx.EUC_DEV385_resumeAccueil({annee:'2026-2027'});
assert.equal(summaryReads,1,'global counts must read the annual snapshot index only once');
assert.equal(summary.familles.BACPRO.niveaux[0].periodes[0].conventions,10);
assert.equal(summary.familles.BACPRO.niveaux[0].pdif.aDefinir,3);
assert.equal(summary.familles.BTS.niveaux[0].periodes[0].apprentis,2);
Object.keys(durableCache).forEach(key=>delete durableCache[key]);
resumeCtx.EUC_DEV445_fastResumeAccueil_('2026-2027');
assert.equal(summaryReads,1,'the durable compact summary must suppress later Grist reads');
const scheduledCode=fs.readFileSync('apps-script/EUC_PFMP_DEV424_SnapshotPlanifie.js','utf8');
assert.match(scheduledCode,/EUC_DEV445_storeResumeAccueil_\(annee,base\)/,'scheduled rebuild must refresh the durable compact summary');
const publicSummaryHtml=fs.readFileSync('apps-script/Suivi_Conventions_Public_Summary_V348.html','utf8');
const adminSummaryHtml=fs.readFileSync('apps-script/Suivi_Conventions_Admin_Summary_V348.html','utf8');
assert.match(publicSummaryHtml,/BOOT=<\?!= summaryJson/,'public summary must embed precomputed counts');
assert.match(adminSummaryHtml,/BOOT=<\?!= summaryJson/,'admin summary must embed precomputed counts');
assert.match(publicSummaryHtml,/if\(BOOT&&BOOT\.familles\)/,'public counts must avoid the normal RPC round-trip');

assert.match(code,/function EUC_DEV441_afficherCarte\(e\)\{[\s\S]*EUC_RELEASE_decorateOutput_\(output\)/,'the map route must receive the blue or green release marker before its early return');

console.log('18 tests DEV445 géocodage/performance réussis.');
