const fs=require('fs'),path=require('path');
const DOC_ID='j1jDArBkzi7P',TABLE_ID='EUC_ELEVES_PFMP',AUTH='CREER_EUC_ELEVES_PFMP_COPIE_RECETTE';
const root=path.resolve(__dirname,'..'),schema=JSON.parse(fs.readFileSync(path.join(root,'proposals','euc-eleves-pfmp-schema-v1.json'),'utf8'));
function stop(m){throw new Error(m)}
if(process.env.EUC_PFMP_CREATE_AUTHORIZATION!==AUTH)stop('Autorisation de création absente.');
if(schema.docId!==DOC_ID||schema.table.id!==TABLE_ID)stop('Cible du schéma invalide.');
const tokenFile=process.env.EUC_PFMP_GRIST_TOKEN_FILE;if(!tokenFile||!fs.existsSync(tokenFile))stop('Fichier temporaire du jeton absent.');
const tokenStat=fs.statSync(tokenFile);if((tokenStat.mode&0o077)!==0)stop('Le fichier temporaire du jeton doit être privé (chmod 600).');
const token=fs.readFileSync(tokenFile,'utf8').trim();if(!token)stop('Jeton temporaire vide.');
const host='https://docs.getgrist.com',base=`${host}/api/docs/${encodeURIComponent(DOC_ID)}`;
async function api(method,route,body){const r=await fetch(base+route,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const text=await r.text();if(!r.ok)stop(`Grist ${method} ${route} refusé (${r.status}).`);return text?JSON.parse(text):{};}
async function columns(id){return (await api('GET',`/tables/${encodeURIComponent(id)}/columns`)).columns||[]}
(async()=>{
  const before=await api('GET','/tables'),ids=(before.tables||[]).map(t=>t.id);
  for(const required of ['Classes','Annees_Scolaires','EUC_OFFRES_FORMATION','EUC_SOUMISSIONS_PFMP'])if(!ids.includes(required))stop(`Table référencée absente : ${required}.`);
  const [classes,annees,offres,soumissions,elevesHist]=await Promise.all([columns('Classes'),columns('Annees_Scolaires'),columns('EUC_OFFRES_FORMATION'),columns('EUC_SOUMISSIONS_PFMP'),ids.includes('Eleves')?columns('Eleves'):Promise.resolve([])]);
  if(!classes.length||!annees.length||!offres.some(c=>c.id==='Code_classe')||!soumissions.some(c=>c.id==='Reference'))stop('Schéma référencé incompatible.');
  if(ids.includes(TABLE_ID))stop(`${TABLE_ID} existe déjà : aucune modification effectuée.`);
  await api('POST','/tables',{tables:[schema.table]});
  const afterTables=await api('GET','/tables'),afterCols=await columns(TABLE_ID),records=await api('GET',`/tables/${TABLE_ID}/records`);
  const expected=new Map(schema.table.columns.map(c=>[c.id,c.fields.type])),actual=new Map(afterCols.map(c=>[c.id,c.fields.type]));
  const mismatches=[...expected].filter(([id,type])=>actual.get(id)!==type).map(([id,type])=>({id,expected:type,actual:actual.get(id)||null}));
  if(!(afterTables.tables||[]).some(t=>t.id===TABLE_ID)||mismatches.length||((records.records||[]).length!==0))stop('Vérification après création échouée.');
  process.stdout.write(JSON.stringify({success:true,docId:DOC_ID,table:TABLE_ID,columnCount:afterCols.length,recordCount:0,references:{Classe:'Classes',Offre_formation:'EUC_OFFRES_FORMATION',Annee_scolaire:'Annees_Scolaires',Soumission_PFMP:'EUC_SOUMISSIONS_PFMP'},historicalEleves:{present:ids.includes('Eleves'),columns:elevesHist.map(c=>c.id),modified:false},otherTablesModified:false},null,2)+'\n');
})().catch(e=>{console.error(e.message);process.exit(1)});
