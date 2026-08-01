'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const DOC_ID='j1jDArBkzi7P',TABLE='EUC_ELEVES_PFMP',YEAR='2025-2026',AUTH='REQUALIFIER_COHORTE_PRONOTE_2025_2026_DEV20';
const schema=JSON.parse(fs.readFileSync(path.join(__dirname,'..','proposals','euc-eleves-pfmp-schema-v1.json'),'utf8'));
function stop(message){throw new Error(message)}
if(process.env.EUC_PFMP_REQUALIFY_AUTHORIZATION!==AUTH)stop('Autorisation explicite absente.');
if(schema.docId!==DOC_ID)stop('Cible interdite.');
const tokenFile=process.env.EUC_PFMP_GRIST_TOKEN_FILE;if(!tokenFile||!fs.existsSync(tokenFile))stop('Jeton temporaire absent.');
const realToken=fs.realpathSync(tokenFile),stat=fs.statSync(realToken);if(!realToken.startsWith('/tmp/')||!stat.isFile()||(stat.mode&0o077)!==0)stop('Jeton temporaire non privé.');
const token=fs.readFileSync(realToken,'utf8').trim(),base=`https://docs.getgrist.com/api/docs/${DOC_ID}`;
async function api(method,route,body){const r=await fetch(base+route,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),text=await r.text();if(!r.ok)stop(`Grist a refusé ${method} ${route} (${r.status}).`);return text?JSON.parse(text):{};}
async function records(table){return (await api('GET',`/tables/${table}/records`)).records||[]}
async function columns(table){return (await api('GET',`/tables/${table}/columns`)).columns||[]}
async function chunks(items,size,fn){for(let i=0;i<items.length;i+=size)await fn(items.slice(i,i+size));}
function annualKey(f){const id=String(f.Identifiant_Pronote||'').trim(),numero=String(f.Numero_Pronote||'').trim(),fallback=String(f.Empreinte_import||'').trim();return id?`I:${id}|Y:${YEAR}`:numero?`N:${numero}|Y:${YEAR}`:`H:${fallback}|Y:${YEAR}`;}
(async()=>{
  const tables=(await api('GET','/tables')).tables||[],ids=tables.map(t=>t.id);for(const id of [TABLE,'Annees_Scolaires'])if(!ids.includes(id))stop(`Table absente : ${id}.`);
  const before=await records(TABLE);if(before.length!==628)stop(`Cohorte inattendue : ${before.length} lignes au lieu de 628.`);
  let years=await records('Annees_Scolaires'),year=years.find(r=>r.fields.Code===YEAR),yearCreated=false;
  if(!year){const out=await api('POST','/tables/Annees_Scolaires/records',{records:[{fields:{Code:YEAR,Date_debut:Date.parse('2025-09-01T00:00:00Z')/1000,Date_fin:Date.parse('2026-08-31T00:00:00Z')/1000,Zone:'B',Active:false,Commentaire:'Année historique de recette Pronote',Libelle:YEAR,Code_import:'PRONOTE_2025_2026_TEST',Previsionnelle:false}}]});year={id:out.records&&out.records[0]&&out.records[0].id};yearCreated=true;}
  if(!year||!year.id)stop('Référence 2025-2026 introuvable.');
  const cols=await columns(TABLE),byId=new Map(cols.map(c=>[c.id,c.fields.type])),missing=schema.table.columns.filter(c=>!byId.has(c.id));if(missing.length)await api('POST',`/tables/${TABLE}/columns`,{columns:missing});
  const conflicts=schema.table.columns.filter(c=>byId.has(c.id)&&byId.get(c.id)!==c.fields.type);if(conflicts.length)stop(`Conflits de types (${conflicts.length}).`);
  const now=Math.floor(Date.now()/1000),updates=[];
  before.forEach(r=>{const f=r.fields,k=annualKey(f),wanted={Annee_scolaire:year.id,Donnee_test:true,Mode_donnee:'RECETTE_HISTORIQUE',Cohorte_import:'PRONOTE_2025_2026_TEST',Utilisable_production:false,Cle_inscription_annuelle:k};if(Object.keys(wanted).some(name=>(f[name]??null)!==(wanted[name]??null)))updates.push({id:r.id,fields:{...wanted,Date_modification:now,Numero_version:Number(f.Numero_version||0)+1}});});
  await chunks(updates,200,c=>api('PATCH',`/tables/${TABLE}/records`,{records:c}));
  const after=await records(TABLE),keys=after.map(r=>r.fields.Cle_inscription_annuelle),valid=after.every(r=>r.fields.Annee_scolaire===year.id&&r.fields.Donnee_test===true&&r.fields.Mode_donnee==='RECETTE_HISTORIQUE'&&r.fields.Cohorte_import==='PRONOTE_2025_2026_TEST'&&r.fields.Utilisable_production===false&&r.fields.Cle_inscription_annuelle),second=after.filter(r=>r.fields.Annee_scolaire!==year.id||r.fields.Donnee_test!==true||r.fields.Mode_donnee!=='RECETTE_HISTORIQUE'||r.fields.Cohorte_import!=='PRONOTE_2025_2026_TEST'||r.fields.Utilisable_production!==false||r.fields.Cle_inscription_annuelle!==annualKey(r.fields));
  if(!valid||new Set(keys).size!==628||second.length)stop('Vérification de cohorte ou idempotence échouée.');
  console.log(JSON.stringify({success:true,docId:DOC_ID,year:{code:YEAR,id:year.id,created:yearCreated},table:TABLE,total:after.length,updated:updates.length,columns:(await columns(TABLE)).length,annualKeysUnique:new Set(keys).size,idempotent:true,secondPassUpdates:0,productionAccess:false,otherStudentYearsModified:false},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>{try{fs.unlinkSync(realToken);}catch(e){console.error('Suppression du jeton impossible.');process.exitCode=1;}});
