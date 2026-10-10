const assert=require('assert'),fs=require('fs'),vm=require('vm');
const live=fs.readFileSync('apps-script/EUC_PFMP_DEV340_ConsolidationLive.js','utf8');
const repair=fs.readFileSync('apps-script/EUC_PFMP_DEV533_ConsistencyRepair.js','utf8');
let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e);process.exitCode=1;}}
function complete(id=77){return{id,Type_sequence:'REMPLACEMENT_APRES_RUPTURE',Statut:'FORMULAIRE_OUVERT',Statut_administratif:'A_COMPLETER_ENTREPRISE',Date_derniere_utilisation:'2026-10-09T08:00:00Z',Entreprise_siret:'73282932000074',Entreprise_raison_sociale:'ENTREPRISE TEST',Entreprise_adresse:'12 RUE TEST',Entreprise_code_postal:'06300',Entreprise_commune:'NICE',Responsable_nom:'EXEMPLE',Responsable_prenom:'Rita',Responsable_fonction:'Direction',Responsable_telephone:'0102030405',Responsable_courriel:'resp@example.test',Tuteur_nom:'TEST',Tuteur_prenom:'Tom',Tuteur_fonction:'Tuteur',Tuteur_telephone:'0102030405',Tuteur_courriel:'tuteur@example.test'};}
function fixture(rows){
  const props={},calls=[],tokens=[];const c={console,Date,JSON,String,Number,Object,Array,Math,isFinite,encodeURIComponent,
    EUC_CONVENTION_ACCES_TABLE_:'EUC_ACCES_FORMULAIRES_PFMP',EUC_CONVENTION_lireAccesFraisV108_:()=>rows,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||'',setProperty:(k,v)=>props[k]=v,deleteProperty:k=>delete props[k]})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    EUC_CONVENTION_debutRafraichissementV511_:(a,reason)=>{tokens.push(reason);return{id:a.id};},
    EUC_CONVENTION_finRafraichissementV511_:()=>({ok:true}),
    EUC_ENT_grist:(method,url,body)=>{calls.push({method,url,body});const rec=body.records[0],row=rows.find(x=>Number(x.id)===Number(rec.id));Object.assign(row,rec.fields);return{records:[rec]};}
  };vm.createContext(c);vm.runInContext(live,c);vm.runInContext(repair,c);c.EUC_DEV532_assertGreen_=()=>true;return{c,props,calls,tokens,rows};
}
test('l’audit sélectionne uniquement un remplacement complet encore bloqué',()=>{
  const incomplete=complete(78);incomplete.Responsable_courriel='';
  const f=fixture([complete(),incomplete,{...complete(79),Type_sequence:'INITIALE'}]);
  const r=f.c.EUC_DEV533_auditCompletedReplacementRepair();assert.equal(r.candidates,1);assert.deepEqual(Array.from(r.ids),[77]);assert.equal(f.calls.length,0);
});
test('la réparation finalise le statut sans modifier les données entreprise',()=>{
  const row=complete(),f=fixture([row]);f.c.EUC_DEV533_auditCompletedReplacementRepair();const r=f.c.EUC_DEV533_repairCompletedReplacementStatus();
  assert.equal(r.repaired,1);assert.equal(r.remaining,0);assert.equal(row.Statut,'ENTREPRISE_SAISIE');assert.equal(row.Statut_administratif,'INFORMATIONS_ENREGISTREES');
  assert.equal(row.Date_saisie_entreprise,'2026-10-09T08:00:00Z');assert.equal(row.Entreprise_raison_sociale,'ENTREPRISE TEST');assert.equal(f.calls.length,1);assert.deepEqual(f.tokens,[]);
});
test('une modification entre audit et exécution bloque toute écriture',()=>{
  const row=complete(),f=fixture([row]);f.c.EUC_DEV533_auditCompletedReplacementRepair();row.Statut='AUTRE';assert.throws(()=>f.c.EUC_DEV533_repairCompletedReplacementStatus(),/changé/);assert.equal(f.calls.length,0);
});
test('la réparation est gardée sur le vert et ne journalise que des identifiants techniques',()=>{
  assert.match(repair,/EUC_DEV532_assertGreen_\(\)/);assert.doesNotMatch(repair,/Jeune_nom|Jeune_prenom|Responsable_courriel.*console/);
});
test('la réparation de statut ne reconstruit jamais toute la famille',()=>{
  assert.doesNotMatch(repair,/EUC_CONVENTION_debutRafraichissementV511_/);
  assert.doesNotMatch(repair,/EUC_CONVENTION_finRafraichissementV511_/);
  assert.match(repair,/EUC_DEV416_cacheDrop_/);
});
if(!process.exitCode)console.log(`\n${n} tests DEV533 cohérence des remplacements réussis.`);
