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
  assert.match(mission,/BP=B\.params\|\|\{\}/);
  assert.match(mission,/PREF=\{annee:/);
  assert.match(mission,/PREF\.classe/);
  assert.match(mission,/PREF\.periode/);
  assert.match(mission,/maybeAutoLoad\(\)/);
  assert.match(server,/b\.params=\{annee:/);
});
test('une classe sans période l indique explicitement',()=>assert.match(mission,/Aucune période affichée/));
test('la liste des modèles propose radio par défaut et suppression',()=>{
  assert.match(mission,/type="radio" name="missionDefault"/);
  assert.match(mission,/data-delete-model/);
  assert.match(mission,/Le document Google Docs ne sera pas supprimé/);
});
test('le catalogue global réutilise les caches familiaux et conserve les classes sans période',()=>{
  const calls=[],ctx={console,Date,JSON};vm.createContext(ctx);vm.runInContext(server,ctx);
  ctx.EUC_DEV368_admin=()=>true;ctx.EUC_DEV368_year=x=>x;
  ctx.EUC_DEV456_familyCacheGet_=(year,family)=>{calls.push(family);return family==='BACPRO'?{classes:[{classeId:24,classe:'TCAR',periodes:[{id:62,libelle:'PFMP n°1'}]}]}:family==='BTS'?{classes:[{classeId:31,classe:'1BTSMV',periodes:[]}]}:{classes:[]}};
  ctx.EUC_DEV456_familyPersistentGet_=()=>{throw new Error('ne doit pas être appelé')};ctx.EUC_DEV456_familyData_=()=>{throw new Error('ne doit pas être appelé')};
  const result=ctx.EUC_DEV368_catalog('2026-2027');assert.deepEqual(calls,['BACPRO','BTS','CAP']);assert.equal(result.classes.length,2);assert.equal(result.classes[0].classe,'1BTSMV');assert.equal(result.classes[0].periodes.length,0);assert.equal(result.classes[1].periodes[0].id,62);
});
test('le chargement ciblé des missions réutilise le même catalogue normalisé',()=>{
  assert.doesNotMatch(server,/EUC_DEV190G1_fastFamilyIndex\(\{annee:y,famille:family\}\)/);
  assert.match(server,/function EUC_DEV440_missionTargets_\(q\)\{\s*return EUC_DEV368_targets\(q\|\|\{\}\);/);
});
test('un seul modèle est marqué par défaut et le standard est protégé',()=>{
  const store={EUC_DEV436_MISSION_MODELS:JSON.stringify([{id:'modele-test',label:'Mon modèle',famille:'TOUS',documentId:'doc',defaut:true}])};
  const props={getProperty:k=>store[k]||'',setProperty:(k,v)=>{store[k]=v}};
  const ctx={console,Date,JSON,PropertiesService:{getScriptProperties:()=>props}};vm.createContext(ctx);vm.runInContext(server,ctx);ctx.EUC_DEV368_admin=()=>true;
  let models=ctx.EUC_DEV436_listMissionModels().models;assert.equal(models.filter(x=>x.defaut).length,1);assert.equal(models.find(x=>x.defaut).id,'modele-test');assert.equal(models[0].protege,true);
  ctx.EUC_DEV472_setDefaultMissionModel({id:'eucalyptus-standard'});models=ctx.EUC_DEV436_listMissionModels().models;assert.equal(models.filter(x=>x.defaut).length,1);assert.equal(models.find(x=>x.defaut).id,'eucalyptus-standard');
  assert.throws(()=>ctx.EUC_DEV472_deleteMissionModel({id:'eucalyptus-standard'}),/protégé/);
});
test('la page propose une gestion complète des modèles de courriel',()=>{
  assert.match(mission,/Gérer les modèles de courriel/);
  for(const id of ['emailKind','emailSubject','emailBody','saveEmailTemplates','resetEmailTemplates','emailPreview','emailFrom','emailReplyTo'])assert.match(mission,new RegExp('id="'+id+'"'));
  assert.match(mission,/EUC_DEV476_listMissionEmailTemplates/);
  assert.match(mission,/EUC_DEV476_saveMissionEmailTemplates/);
  assert.match(mission,/EUC_DEV476_resetMissionEmailTemplates/);
});
test('les modèles prévisionnel et définitif sont persistants, validés et fusionnés',()=>{
  const store={},props={getProperty:k=>store[k]||'',setProperty:(k,v)=>{store[k]=v},deleteProperty:k=>{delete store[k]}};
  const ctx={console,Date,JSON,PropertiesService:{getScriptProperties:()=>props},Session:{getEffectiveUser:()=>({getEmail:()=> 'deploiement@example.fr'})}};
  vm.createContext(ctx);vm.runInContext(server,ctx);ctx.EUC_DEV368_t=v=>String(v==null?'':v).trim();ctx.EUC_DEV368_admin=()=>({email:'reponse@example.fr'});
  let result=ctx.EUC_DEV476_listMissionEmailTemplates();assert.ok(result.templates.PREVISIONNEL.body.includes('véhicule personnel'));assert.ok(result.templates.DEFINITIF.body.includes('modalités définitives'));assert.equal(result.sender.from,'deploiement@example.fr');
  result=ctx.EUC_DEV476_saveMissionEmailTemplates({PREVISIONNEL:{subject:'Prévision {{CLASSE}}',body:'Bonjour {{PROFESSEUR}}'},DEFINITIF:{subject:'Définitif {{PERIODE}}',body:'Du {{DEBUT}} au {{FIN}}'}});assert.equal(result.templates.PREVISIONNEL.subject,'Prévision {{CLASSE}}');assert.ok(store.EUC_DEV476_MISSION_EMAIL_TEMPLATES);
  assert.equal(ctx.EUC_DEV476_renderMissionEmail_('Bonjour {{PROFESSEUR}}',{PROFESSEUR:'Mme MARTIN'}),'Bonjour Mme MARTIN');
  assert.throws(()=>ctx.EUC_DEV476_saveMissionEmailTemplates({PREVISIONNEL:{subject:'{{INCONNUE}}',body:'x'},DEFINITIF:{subject:'x',body:'x'}}),/Variable\(s\) inconnue/);
  ctx.EUC_DEV476_resetMissionEmailTemplates();assert.equal(store.EUC_DEV476_MISSION_EMAIL_TEMPLATES,undefined);
});
test('une erreur PDF interrompt le traitement avant tout envoi',()=>{
  const send=server.indexOf('MailApp.sendEmail(options)'),pdf=server.indexOf('var mission=EUC_DEV436_pdfMission(q)');
  assert.ok(pdf>=0&&send>pdf);
  assert.match(server,/sentAt:new Date\(\)\.toISOString\(\)/);
});

console.log(`${n} tests DEV472 workflow missions réussis.`);
