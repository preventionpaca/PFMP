const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const compact=fs.readFileSync('apps-script/EUC_PFMP_DEV534_CompactDetails.js','utf8');
const atomic=fs.readFileSync('apps-script/EUC_PFMP_DEV425_AtomicFreshness.js','utf8');
const targeted=fs.readFileSync('apps-script/EUC_PFMP_DEV455_FastVerifiedViews.js','utf8');
const canonical=fs.readFileSync('apps-script/EUC_PFMP_DEV459_CanonicalViews.js','utf8');
const repair=fs.readFileSync('apps-script/EUC_PFMP_DEV533_ConsistencyRepair.js','utf8');
const ctx={console,JSON,Date,String,Number,Object,Array,Math};vm.createContext(ctx);vm.runInContext(compact,ctx);
let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e.message);process.exitCode=1;}}

function bloatedDetail(){
  const periods=Object.fromEntries(Array.from({length:368},(_,i)=>[String(i+1),{id:i+1,libelle:'Période '+i,debut:'2026-09-01',fin:'2027-07-01',classes:Array(20).fill(i)}]));
  const history=Array.from({length:15},(_,i)=>({id:i+1,Statut_administratif:'INTERROMPUE',Statut:'INTERROMPUE',Type_sequence:'REMPLACEMENT_APRES_RUPTURE',Numero_sequence:i+1,Convention_origine:1,Convention_remplacement:2,Entreprise_raison_sociale:'ENTREPRISE '+i,Entreprise_enseigne:'ENSEIGNE',Date_debut:'2026-09-01',Date_fin_reelle:'2026-10-01',Date_fin:'2026-10-15',Motif_interruption:'Motif',Raw_JSON:'x'.repeat(1600),Responsable_courriel:'secret@example.test',Champ_inutile:'x'.repeat(800)}));
  return{periodeDatesById:periods,professeursDisponibles:Array.from({length:80},(_,i)=>({id:i,nom:'Professeur '+i,email:'p'+i+'@example.test'})),lignes:Array.from({length:12},(_,i)=>({eleveId:i+1,nom:'ELEVE',prenom:String(i),historiqueConventions:history.map(x=>Object.assign({},x))}))};
}

test('le détail compact ne conserve ni calendrier annuel ni catalogue des professeurs',()=>{
  const d=ctx.EUC_DEV534_compactDetail_(bloatedDetail());
  assert.equal(d.periodeDatesById,undefined);assert.deepEqual(Array.from(d.professeursDisponibles),[]);assert.equal(d.professeursDisponiblesCharges,false);
});
test('l’historique ne garde que les champs rendus et aucune donnée brute',()=>{
  const d=ctx.EUC_DEV534_compactDetail_(bloatedDetail()),h=d.lignes[0].historiqueConventions[0];
  assert.equal(h.Entreprise_raison_sociale,'ENTREPRISE 0');assert.equal(h.Motif_interruption,'Motif');assert.equal(h.Raw_JSON,undefined);assert.equal(h.Responsable_courriel,undefined);assert.equal(h.Champ_inutile,undefined);
});
test('un détail représentatif reste très inférieur à la limite Grist',()=>{
  const d=bloatedDetail(),before=Buffer.byteLength(JSON.stringify(d)),after=Buffer.byteLength(JSON.stringify(ctx.EUC_DEV534_compactDetail_(d)));
  assert(before>300000,'jeu de données insuffisamment représentatif');assert(after<80000,'détail encore trop volumineux: '+after);assert(after/before<0.15,'réduction insuffisante');
});
test('les lots Grist sont bornés à 80 Ko même avec plusieurs détails',()=>{
  const rows=Array.from({length:7},(_,i)=>({id:i+1,fields:{Payload_JSON:'x'.repeat(27000)}}));
  const chunks=ctx.EUC_DEV534_recordChunks_(rows,80000,20);
  assert(chunks.length>=3,'lot non découpé');chunks.forEach(c=>assert(ctx.EUC_DEV534_bytes_({records:c})<=80000,'lot trop volumineux'));
});
test('toutes les écritures et reconstructions de détail passent par la compaction',()=>{
  assert.match(atomic,/function EUC_DEV427_writeDetails_[\s\S]*EUC_DEV534_compactDetail_\(item\.detail\)/);
  assert.match(atomic,/EUC_DEV534_recordChunks_\(records/);assert.match(atomic,/EUC_DEV534_recordChunks_\(patches/);
  assert.match(targeted,/EUC_DEV534_compactDetail_\(detail\)/);
  assert.match(canonical,/detail=EUC_DEV534_compactDetail_\(detail\)/);
});
test('la navigation de classe ne peut pas déclencher le recalcul familial',()=>{
  const body=canonical.slice(canonical.indexOf('function EUC_DEV459_navigationFamily_'),canonical.indexOf('function EUC_DEV459_family_'));
  assert.doesNotMatch(body,/EUC_DEV459_familyData_/);assert.match(body,/EUC_DEV456_familyPersistentGet_/);
});
test('la reprise est bornée au DIRTY exact de DEV533 et ne réécrit pas le métier',()=>{
  assert.match(compact,/state\.reason\)!=='reparation-statut-remplacement'/);
  assert.match(compact,/EUC_DEV532_assertGreen_\(\)/);
  assert.doesNotMatch(compact,/EUC_ENT_grist\(|EUC_CONVENTION_debutRafraichissementV511_/);
  assert.doesNotMatch(repair,/EUC_CONVENTION_debutRafraichissementV511_|EUC_CONVENTION_finRafraichissementV511_/);
});

if(!process.exitCode)console.log(`\n${n} tests DEV534 détails compacts réussis.`);
