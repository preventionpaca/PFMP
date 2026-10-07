const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..');
const loader=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV208_ClassDetailSnapshot.js'),'utf8');
const bridge=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV235_JsonBridge.js'),'utf8');
let passed=0;
function test(name,fn){try{fn();console.log('✓',name);passed++;}catch(error){console.error('✗',name,error.message);process.exitCode=1;}}

function fixture(){
  const fields={
    Actif:true,
    Date_debut:1798761600,
    Date_fin:'1830297600000',
    Date_distribution_dossier:'2026-09-03T00:00:00.000Z',
    Date_remise_dossier:1799107200,
    Date_transmission_CFA:'1799193600',
    Date_contrat_officielle:1798761600,
    Date_rupture_contrat:''
  };
  const cols=Object.keys(fields).map(id=>({id}));
  const ctx={console,Date,String,Number,Array,Object,JSON,Math,isFinite,Utilities:{formatDate:(d,z,f)=>d.toISOString().slice(0,10)},Session:{getScriptTimeZone:()=> 'Europe/Paris'}};
  vm.createContext(ctx);
  vm.runInContext(loader,ctx);
  ctx.EUC_DEV208_getClassSnapshot_=()=>({source:'fixture',students:[{id:7,nom:'TEST',prenom:'Élève'}]});
  ctx.EUC_DEV208_latestAppMap_=()=>({cols,map:{7:{id:11,fields}}});
  vm.runInContext(bridge,ctx);
  return ctx;
}

test('le chargeur convertit toutes les dates Grist en ISO pour les champs HTML',()=>{
  const student=fixture().EUC_DEV208_loadApprentis('2026-2027',1,'CLASSE').students[0];
  assert.equal(student.debut,'2027-01-01');
  assert.equal(student.fin,'2028-01-01');
  assert.equal(student.dateDistribution,'2026-09-03');
  assert.equal(student.dateDossier,'2027-01-05');
  assert.equal(student.dateTransmissionCfa,'2027-01-06');
  assert.equal(student.dateContrat,'2027-01-01');
});

test('le pont JSON commun à l admin et au public conserve les dates ISO',()=>{
  const data=JSON.parse(fixture().EUC_DEV235_loadStudentsJson('2026-2027',1,'CLASSE'));
  assert.equal(data.students[0].debut,'2027-01-01');
  assert.equal(data.students[0].fin,'2028-01-01');
  assert.equal(data.students[0].dateCfa,'2027-01-06');
});

test('aucune date Grist numérique brute ne peut atteindre un input date',()=>{
  const source=loader.slice(loader.indexOf('function EUC_DEV208_loadApprentis'),loader.indexOf('function EUC_DEV208_rebuildSelectedClass'));
  for(const key of ['debut','fin','dateDistribution','dateRemise','dateDossier','dateCfa','dateTransmissionCfa','dateContrat','dateRupture']){
    assert.match(source,new RegExp(key+':dateVal\\('),key+' ne passe pas par dateVal');
  }
});

if(!process.exitCode)console.log(`\n${passed} tests DEV494 dates apprentis réussis.`);
