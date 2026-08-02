'use strict';
const fs=require('fs');
const DOC_ID='j1jDArBkzi7P',TABLE='EUC_OFFRES_FORMATION',TOKEN='/tmp/euc_grist_recipe_token';
const AUTH='AUTORISER_STATUT_CALENDRIER_PFMP_DEV26';
const NONE=new Set(['1MP3D','2BTS CPI','2BTS CPRP','2BTS ELEC','2BTS CIEL']);
const REASON='Aucune période officielle prévue dans le calendrier 2026-2027 — décision métier validée le 02/08/2026.';
function stop(message){throw new Error(message)}
if(process.env.EUC_PFMP_CALENDAR_AUTHORIZATION!==AUTH)stop('Autorisation explicite absente.');
if(!fs.existsSync(TOKEN))stop('Jeton temporaire absent.');
const real=fs.realpathSync(TOKEN),stat=fs.statSync(real);
if(real!==TOKEN||!stat.isFile()||(stat.mode&0o077)!==0)stop('Jeton temporaire non privé ou chemin invalide.');
const token=fs.readFileSync(real,'utf8').trim();if(!token)stop('Jeton vide.');
const base=`https://docs.getgrist.com/api/docs/${DOC_ID}`;
async function api(method,path,body){const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),text=await r.text();if(!r.ok)stop(`${method} ${path} refusé (${r.status}).`);return text?JSON.parse(text):{}}
(async()=>{
  const beforeColumns=(await api('GET',`/tables/${TABLE}/columns`)).columns||[];
  const required=[
    {id:'Statut_calendrier_PFMP',fields:{label:'Statut calendrier PFMP',type:'Text'}},
    {id:'Motif_statut_calendrier',fields:{label:'Motif du statut calendrier',type:'Text'}}
  ];
  const byId=new Map(beforeColumns.map(c=>[c.id,c.fields.type]));
  const conflicts=required.filter(c=>byId.has(c.id)&&byId.get(c.id)!==c.fields.type);
  if(conflicts.length)stop(`Type incompatible pour ${conflicts.map(c=>c.id).join(', ')}.`);
  const missing=required.filter(c=>!byId.has(c.id));
  if(missing.length)await api('POST',`/tables/${TABLE}/columns`,{columns:missing});
  const [offersResponse,linksResponse]=await Promise.all([api('GET',`/tables/${TABLE}/records`),api('GET','/tables/EUC_OFFRES_PERIODES/records')]);
  const offers=(offersResponse.records||[]).filter(o=>o.fields.Actif!==false&&o.fields.Afficher_formulaire_PFMP===true);
  if(offers.length!==38)stop(`Nombre d'offres autorisées inattendu (${offers.length}).`);
  const linked=new Set((linksResponse.records||[]).filter(l=>l.fields.Active!==false).map(l=>l.fields.Offre_formation));
  const unknown=offers.filter(o=>!NONE.has(o.fields.Code_classe)&&!linked.has(o.id));
  const updates=offers.map(o=>{const status=NONE.has(o.fields.Code_classe)?'AUCUNE_PERIODE_PREVUE':linked.has(o.id)?'PERIODES_DEFINIES':'A_VERIFIER';return {id:o.id,fields:{Statut_calendrier_PFMP:status,Motif_statut_calendrier:status==='AUCUNE_PERIODE_PREVUE'?REASON:''}}});
  if(updates.length)await api('PATCH',`/tables/${TABLE}/records`,{records:updates});
  const after=(await api('GET',`/tables/${TABLE}/records`)).records||[],selected=after.filter(o=>NONE.has(o.fields.Code_classe));
  const valid=selected.length===5&&selected.every(o=>o.fields.Statut_calendrier_PFMP==='AUCUNE_PERIODE_PREVUE'&&o.fields.Motif_statut_calendrier===REASON);
  if(!valid)stop('Contrôle final des cinq décisions métier échoué.');
  const counts={PERIODES_DEFINIES:0,AUCUNE_PERIODE_PREVUE:0,A_VERIFIER:0};
  after.filter(o=>offers.some(x=>x.id===o.id)).forEach(o=>{if(Object.hasOwn(counts,o.fields.Statut_calendrier_PFMP))counts[o.fields.Statut_calendrier_PFMP]++});
  console.log(JSON.stringify({success:true,docId:DOC_ID,columnsAdded:missing.map(c=>c.id),authorizedOffers:offers.length,updatedOffers:updates.length,validatedWithoutPeriod:selected.map(o=>o.fields.Code_classe).sort(),statusCounts:counts,offersToVerify:unknown.map(o=>o.fields.Code_classe).sort(),relationsCreated:0,productionAccess:false},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>{try{fs.unlinkSync(real)}catch(e){console.error('Suppression du jeton impossible.');process.exitCode=1}});
