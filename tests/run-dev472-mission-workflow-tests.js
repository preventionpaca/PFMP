const fs=require('fs'),vm=require('vm'),assert=require('assert');
const server=fs.readFileSync('apps-script/EUC_PFMP_DEV370_AdminTools.js','utf8');
const mission=fs.readFileSync('apps-script/Ordres_Mission_PFMP_V368.html','utf8');
const detail=fs.readFileSync('apps-script/Suivi_PFMP_Classe_Detail_V156.html','utf8');
let n=0;function test(name,fn){fn();console.log('✓',name);n++}

test('un seul bouton Ordres de mission est ajouté à la fiche de classe',()=>{
  assert.equal((detail.match(/id="missionOrders"/g)||[]).length,1);
  assert.match(detail,/>Ordres de mission<\/a>/);
});
test('le lien transporte exactement le contexte de la fiche',()=>{
  for(const key of ['annee','famille','classe','classeNom','periode','periodeNom'])assert.match(detail,new RegExp("missionUrl\\.searchParams\\.set\\('"+key+"'"));
  assert.match(detail,/searchParams\.set\('page','ordres-mission-pfmp'\)/);
});
test('le tableau élèves et ses dix colonnes métier restent présents',()=>{
  for(const label of ['Élève','Convention / statut','Entreprise','Adresse entreprise','Contact entreprise','Tuteur entreprise','Professeur principal','Suivi téléphonique','Professeur visiteur'])assert.ok(detail.includes(label),label);
  assert.match(detail,/EUC_DEV448_affecterAdmin/);
});
test('la page missions préremplit année famille classe et période depuis l URL',()=>{
  assert.match(mission,/new URLSearchParams\(location\.search\)/);
  assert.match(mission,/PREF=\{annee:/);
  assert.match(mission,/PREF\.classe/);
  assert.match(mission,/PREF\.periode/);
  assert.match(mission,/maybeAutoLoad\(\)/);
});
test('une classe sans période l indique explicitement',()=>assert.match(mission,/Aucune période affichée/));
test('la liste des modèles propose radio par défaut et suppression',()=>{
  assert.match(mission,/type="radio" name="missionDefault"/);
  assert.match(mission,/data-delete-model/);
  assert.match(mission,/Le document Google Docs ne sera pas supprimé/);
});
test('le catalogue global effectue une seule lecture de l index chaud',()=>{
  const calls=[],ctx={console,Date,JSON};vm.createContext(ctx);vm.runInContext(server,ctx);
  ctx.EUC_DEV368_admin=()=>true;ctx.EUC_DEV368_year=x=>x;ctx.EUC_DEV190E_INDEX_TABLE_='INDEX';
  ctx.EUC_DEV190G_fastRecords_=(table,filter)=>{calls.push({table,filter});return[
    {fields:{Famille:'BACPRO',Actif:true,Updated_at:'2026-10-06T10:00:00Z',Payload_JSON:JSON.stringify({classes:[{classeId:24,classe:'TCAR',periodes:[{id:62,libelle:'PFMP n°1'}]}]})}},
    {fields:{Famille:'BTS',Actif:true,Updated_at:'2026-10-06T10:00:00Z',Payload_JSON:JSON.stringify({classes:[{classeId:31,classe:'1BTSMV',periodes:[]}]})}}
  ]};
  const result=ctx.EUC_DEV368_catalog('2026-2027');assert.equal(calls.length,1);assert.deepEqual(calls[0].filter,{Annee_scolaire:['2026-2027']});assert.equal(result.classes.length,2);assert.equal(result.classes[0].classe,'1BTSMV');assert.equal(result.classes[1].periodes[0].id,62);
});
test('un seul modèle est marqué par défaut et le standard est protégé',()=>{
  const store={EUC_DEV436_MISSION_MODELS:JSON.stringify([{id:'modele-test',label:'Mon modèle',famille:'TOUS',documentId:'doc',defaut:true}])};
  const props={getProperty:k=>store[k]||'',setProperty:(k,v)=>{store[k]=v}};
  const ctx={console,Date,JSON,PropertiesService:{getScriptProperties:()=>props}};vm.createContext(ctx);vm.runInContext(server,ctx);ctx.EUC_DEV368_admin=()=>true;
  let models=ctx.EUC_DEV436_listMissionModels().models;assert.equal(models.filter(x=>x.defaut).length,1);assert.equal(models.find(x=>x.defaut).id,'modele-test');assert.equal(models[0].protege,true);
  ctx.EUC_DEV472_setDefaultMissionModel({id:'eucalyptus-standard'});models=ctx.EUC_DEV436_listMissionModels().models;assert.equal(models.filter(x=>x.defaut).length,1);assert.equal(models.find(x=>x.defaut).id,'eucalyptus-standard');
  assert.throws(()=>ctx.EUC_DEV472_deleteMissionModel({id:'eucalyptus-standard'}),/protégé/);
});

console.log(`${n} tests DEV472 workflow missions réussis.`);
