const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV455_FastVerifiedViews.js'),'utf8');
let passed=0;
function test(name,fn){try{fn();passed++;console.log('OK',name);}catch(e){console.error('KO',name,e);process.exitCode=1;}}
function ctx(overrides={}){
  const store={};
  const c={
    console,encodeURIComponent,Date,Error,
    CacheService:{getScriptCache:()=>({
      get:k=>store[k]??null,
      put:(k,v)=>{store[k]=v;},
      remove:k=>{delete store[k];}
    })},
    EUC_DEV190G_fastRecords_:()=>[
      {id:1,fields:{Nom:'ELEVE',Prenom:'Un',Classe:1,Actif:true,Present_dernier_import:true}}
    ],
    ...overrides
  };
  vm.createContext(c);vm.runInContext(code,c);c.__store=store;return c;
}
function ordinary(){return{__dev425Revision:'r1',periode:{id:1,libelle:'PFMP n°1'},lignes:[{eleveId:1,parcoursDifferencie:true,modeFinTerminale:'PARCOURS_DIFF_LYCEE'}],stats:{parcoursDifferencies:1}};}

test('le cache frais répond sans lecture persistante',()=>{
  let reads=0;const c=ctx({EUC_DEV416_key_:()=> 'k',EUC_DEV416_cacheGet_:()=>ordinary(),EUC_DEV416_cachePut_:()=>true,EUC_DEV416_cacheDrop_:()=>{},EUC_DEV425_payloadFresh_:()=>true,EUC_DEV427_readDetail_:()=>{reads++;return null;}});
  const d=c.EUC_DEV455_fastDetail_('2026-2027','BACPRO',1,1);assert.equal(reads,0);assert.equal(d.__dev455Source,'CACHE_VERIFIE');
});
test('un cache périmé est refusé puis remplacé par une lecture ciblée',()=>{
  let reads=0,drops=0,puts=0;const c=ctx({EUC_DEV416_key_:()=> 'k',EUC_DEV416_cacheGet_:()=>ordinary(),EUC_DEV416_cacheDrop_:()=>{drops++;},EUC_DEV416_cachePut_:()=>{puts++;},EUC_DEV425_payloadFresh_:(a,f,d)=>d.__dev425Revision==='r2',EUC_DEV427_readDetail_:()=>{reads++;const d=ordinary();d.__dev425Revision='r2';return d;}});
  const d=c.EUC_DEV455_fastDetail_('2026-2027','BACPRO',1,1);assert.equal(drops,1);assert.equal(reads,1);assert.equal(puts,1);assert.equal(d.__dev455Source,'SNAPSHOT_CIBLE_VERIFIE');
});
test('une PFMP ordinaire ne présente jamais le choix de fin année comme statut',()=>{
  const c=ctx(),d=c.EUC_DEV455_sanitizePeriod_(ordinary());assert.equal(d.lignes[0].parcoursDifferencie,false);assert.equal(d.lignes[0].modeFinTerminale,'PARCOURS_DIFF_LYCEE');assert.equal(d.stats.parcoursDifferencies,0);
});
test('la période P.dif conserve son information dédiée',()=>{
  const c=ctx(),d=ordinary();d.periode.libelle='P.dif.';c.EUC_DEV455_sanitizePeriod_(d);assert.equal(d.lignes[0].parcoursDifferencie,true);assert.equal(d.stats.parcoursDifferencies,1);
});
test('la période P.dif est enrichie une seule fois par les choix de fin année',()=>{
  let calls=0;
  const c=ctx({EUC_DEV285B_enrichDetail_:(d,annee)=>{calls++;assert.equal(annee,'2026-2027');d.lignes=d.lignes.slice(0,1);d.stats.parcoursDifferencies=1;return d;}});
  const d=ordinary();d.annee='2026-2027';d.periode.libelle='P.dif.';
  c.EUC_DEV455_sanitizePeriod_(d);c.EUC_DEV455_sanitizePeriod_(d);
  assert.equal(calls,1);assert.equal(d.__dev456PdifDetail,true);assert.equal(d.lignes.length,1);
});
test('une révision non prête ne sert aucune ancienne liste',()=>{
  const c=ctx({EUC_DEV416_key_:()=> 'k',EUC_DEV416_cacheGet_:()=>null,EUC_DEV427_readDetail_:()=>null});assert.throws(()=>c.EUC_DEV455_fastDetail_('2026-2027','BACPRO',1,1),e=>e&&e.code==='DEV455_REFRESHING');
});
test('les routes explicites séparent administration et consultation publique',()=>{
  const c=ctx({ScriptApp:{getService:()=>({getUrl:()=> 'https://script.google.com/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec'})}});c.EUC_DEV459_detail_=(e,isPublic)=>isPublic?'PUBLIC':'ADMIN';assert.equal(c.EUC_DEV455_routeDetail_({parameter:{page:'suivi-pfmp-classe'}}),'ADMIN');assert.equal(c.EUC_DEV455_routeDetail_({parameter:{page:'suivi-pfmp-classe-public'}}),'PUBLIC');
});
test('la nouvelle vue ne relit jamais toute la table historique',()=>{assert.doesNotMatch(code,/EUC_DEV190I_readOne/);});
test('enrichissement historique P.dif limité à sa propre période',()=>{const old=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV174.js'),'utf8');assert.match(old,/x\.parcoursDifferencie=isPdif&&EUC_DEV174_estPdif_/);});
test('la liste courante réinjecte un élève absent du snapshot et retire un ancien élève',()=>{
  const c=ctx({EUC_DEV190G_fastRecords_:()=>[
    {id:1,fields:{Nom:'PRESENT',Prenom:'Un',Classe:1,Actif:true,Present_dernier_import:true}},
    {id:2,fields:{Nom:'NOUVEAU',Prenom:'Deux',Classe:1,Actif:true,Present_dernier_import:true}}
  ]});
  const d={classe:{id:1,nom:'TEST'},periode:{id:1,libelle:'PFMP n°1'},lignes:[
    {eleveId:1,nom:'PRESENT',prenom:'Un',statut:'Convention enregistrée'},
    {eleveId:3,nom:'ANCIEN',prenom:'Trois',statut:'Convention enregistrée'}
  ],stats:{total:2}};
  c.EUC_DEV455_mergeRoster_(d,'2026-2027',1);
  assert.deepEqual(Array.from(d.lignes,x=>x.eleveId),[2,1]);
  assert.equal(d.lignes[0].statut,'Sans convention');
  assert.equal(d.__dev455RosterVerified,true);
});
test('sans snapshot persistant la classe seule est reconstruite et mise en cache',()=>{
  let builds=0,puts=0;
  const c=ctx({
    EUC_DEV416_key_:()=> 'k',EUC_DEV416_cacheGet_:()=>null,EUC_DEV416_cachePut_:()=>{puts++;},
    EUC_DEV427_readDetail_:()=>null
  });
  c.EUC_DEV455_buildTargeted_=()=>{builds++;return ordinary();};
  c.EUC_DEV455_readLegacyTargeted_=()=>null;
  const d=c.EUC_DEV455_fastDetail_('2026-2027','BACPRO',1,1);
  assert.equal(builds,1);assert.equal(puts,1);assert.equal(d.__dev455Source,'SNAPSHOT_CIBLE_VERIFIE');
});
test('le snapshot historique est lu avec un filtre classe période et non en table entière',()=>{
  let payload=null;
  const c=ctx({EUC_DEV190G_snapshotDetail:p=>{payload=p;return{exists:true,detail:ordinary()};}});
  const d=c.EUC_DEV455_readLegacyTargeted_('2026-2027',24,62);
  assert.deepEqual(JSON.parse(JSON.stringify(payload)),{annee:'2026-2027',classe:24,periode:62});
  assert.equal(d.__dev455Targeted,true);
});
test('la vue administrateur renseigne les variables obligatoires du template',()=>{
  assert.match(code,/t\.jumpClassesJson=JSON\.stringify\(jump\)/);
  assert.match(code,/detail\.professeursDisponiblesCharges=false/);
});
test('la navigation administrateur réutilise le cache de famille vérifié',()=>{
  assert.match(code,/typeof EUC_DEV456_jump_==='function'/);
  assert.match(code,/jump=EUC_DEV456_jump_\(detail,p\)\|\|\[\]/);
});
test('la reconstruction ciblée préfère l index brut rapide sans hydrater toute la famille',()=>{
  assert.match(code,/typeof EUC_DEV456_familyData_==='function'/);
});
test('le professeur principal est lu par classe puis réutilisé depuis le cache',()=>{
  let linkReads=0,profReads=0;
  const c=ctx({
    EUC_DEV190G_fastRecords_:(table,filter)=>{
      if(table==='EUC_ELEVES_PFMP')return[{id:1,fields:{Nom:'ELEVE',Prenom:'Un',Classe:24,Actif:true,Present_dernier_import:true}}];
      if(table==='EUC_CLASSES_PROFESSEURS_PFMP'){linkReads++;assert.deepEqual(JSON.parse(JSON.stringify(filter)),{Classe:[24]});return[{fields:{Classe:24,Professeur:7,Role:'PROFESSEUR_PRINCIPAL',Actif:true}}];}
      return[];
    },
    EUC_DEV448_professeurs_:()=>{profReads++;return[{id:7,nom:'Mme PP TCAR',email:'pp@example.test'}];}
  });
  assert.equal(c.EUC_DEV455_principaux_(24)[0].nom,'Mme PP TCAR');
  assert.equal(c.EUC_DEV455_principaux_(24)[0].nom,'Mme PP TCAR');
  assert.equal(linkReads,1);assert.equal(profReads,1);
});
test('une vue existante sans PP est complétée dans son en-tête et ses lignes',()=>{
  const c=ctx({
    EUC_DEV190G_fastRecords_:(table)=>table==='EUC_ELEVES_PFMP'?[{id:1,fields:{Nom:'ELEVE',Prenom:'Un',Classe:24,Actif:true,Present_dernier_import:true}}]:[{fields:{Classe:24,Professeur:7,Role:'PROFESSEUR_PRINCIPAL',Actif:true}}],
    EUC_DEV448_professeurs_:()=>[{id:7,nom:'Mme PP TCAR',email:''}]
  });
  const d={classe:{id:24,nom:'TCAR'},periode:{id:62,libelle:'PFMP n°1'},lignes:[{eleveId:1,nom:'ELEVE',prenom:'Un',professeurPrincipal:''}],stats:{total:1}};
  c.EUC_DEV455_mergeRoster_(d,'2026-2027',24);
  assert.equal(d.professeursPrincipaux[0].nom,'Mme PP TCAR');assert.equal(d.lignes[0].professeurPrincipal,'Mme PP TCAR');
});
test('une nouvelle révision affectations remplace immédiatement le cache de classe',()=>{
  let rev='0_r2',reads=0,puts=0;
  const cached=ordinary();cached.__dev455AssignmentRevision='0_r1';
  cached.lignes[0].professeurTelephone='Ancien professeur';
  const c=ctx({
    EUC_DEV416_key_:()=> 'k',EUC_DEV416_cacheGet_:()=>cached,EUC_DEV416_cachePut_:()=>{puts++;},EUC_DEV416_cacheDrop_:()=>{},
    EUC_DEV425_payloadFresh_:()=>true,EUC_DEV457_revision_:()=>rev,
    EUC_DEV448_rows_:(table,filter)=>{reads++;assert.equal(table,'EUC_AFFECTATIONS_SUIVI_PFMP');assert.deepEqual(JSON.parse(JSON.stringify(filter)),{Annee_scolaire:['2026-2027'],Classe:[1],Periode:[1],Actif:[true]});return[{id:91,Annee_scolaire:'2026-2027',Classe:1,Periode:1,Eleve:1,Type_suivi:'TELEPHONE',Professeur:7,Nom_professeur_snapshot:'Mme Nouvelle',Actif:true}];}
  });
  const d=c.EUC_DEV455_fastDetail_('2026-2027','BACPRO',1,1);
  assert.equal(d.lignes[0].professeurTelephone,'Mme Nouvelle');assert.equal(d.lignes[0].affectationTelephoneId,91);
  assert.equal(d.__dev455AssignmentRevision,'0_r2');assert.equal(reads,1);assert.equal(puts,1);
});
test('une révision affectations inchangée ne consomme aucune lecture Grist',()=>{
  let reads=0;const d=ordinary();d.__dev455AssignmentRevision='0_r2';d.lignes[0].professeurVisiteur='M. Stable';
  const c=ctx({EUC_DEV457_revision_:()=> '0_r2',EUC_DEV448_rows_:()=>{reads++;return[];}});
  c.EUC_DEV455_refreshAssignments_(d,'2026-2027',1,1);
  assert.equal(reads,0);assert.equal(d.lignes[0].professeurVisiteur,'M. Stable');
});
test('un détail dont l effectif est vérifié ne relit pas la table des élèves',()=>{
  let studentReads=0;const d=ordinary();d.__dev455RosterVerified=true;d.__dev455AssignmentRevision='0_r2';
  const c=ctx({
    EUC_DEV416_key_:()=> 'k',EUC_DEV416_cacheGet_:()=>d,EUC_DEV416_cachePut_:()=>{},EUC_DEV416_cacheDrop_:()=>{},
    EUC_DEV425_payloadFresh_:()=>true,EUC_DEV457_revision_:()=> '0_r2',
    EUC_DEV190G_fastRecords_:(table)=>{if(table==='EUC_ELEVES_PFMP')studentReads++;return[];}
  });
  const out=c.EUC_DEV455_fastDetail_('2026-2027','BACPRO',1,1);
  assert.equal(out.__dev455Source,'CACHE_VERIFIE');assert.equal(studentReads,0);
});
test('un retrait durable efface les deux anciennes valeurs du cache',()=>{
  const d=ordinary();d.__dev455AssignmentRevision='0_r1';Object.assign(d.lignes[0],{professeurTelephone:'Mme Ancienne',professeurTelephoneId:7,affectationTelephoneId:81,professeurVisiteur:'M. Ancien',professeurVisiteurId:8,affectationVisiteId:82});
  const c=ctx({EUC_DEV457_revision_:()=> '0_r3',EUC_DEV448_rows_:()=>[]});
  c.EUC_DEV455_refreshAssignments_(d,'2026-2027',1,1);
  assert.equal(d.lignes[0].professeurTelephone,'');assert.equal(d.lignes[0].affectationTelephoneId,0);
  assert.equal(d.lignes[0].professeurVisiteur,'');assert.equal(d.lignes[0].affectationVisiteId,0);
});
process.on('exit',()=>{if(!process.exitCode)console.log(passed+' tests DEV455 vues rapides vérifiées réussis.');});
