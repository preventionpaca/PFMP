'use strict';

const fs=require('fs'),path=require('path'),crypto=require('crypto');
const pronote=require('./lib/pronote-pfmp');
const DOC_ID='j1jDArBkzi7P',TABLE='EUC_ELEVES_PFMP',AUTH='IMPORT_PRONOTE_PFMP_COPIE_RECETTE';
const root=path.resolve(__dirname,'..'),source=path.join(root,'imports','pronote','EXP_ELEVE.txt');
const schema=JSON.parse(fs.readFileSync(path.join(root,'proposals','euc-eleves-pfmp-schema-v1.json'),'utf8'));
function stop(message){throw new Error(message)}
if(process.env.EUC_PFMP_IMPORT_AUTHORIZATION!==AUTH)stop('Autorisation explicite d’import absente.');
if(schema.docId!==DOC_ID||schema.table.id!==TABLE)stop('Cible Grist interdite.');
if(!fs.existsSync(source))stop('Export Pronote absent.');
const tokenFile=process.env.EUC_PFMP_GRIST_TOKEN_FILE;
if(!tokenFile||!fs.existsSync(tokenFile))stop('Fichier temporaire du jeton absent.');
const realToken=fs.realpathSync(tokenFile),stat=fs.statSync(realToken);
if(!realToken.startsWith('/tmp/')||!stat.isFile()||(stat.mode&0o077)!==0)stop('Le jeton doit être un fichier privé situé dans /tmp.');
const token=fs.readFileSync(realToken,'utf8').trim();if(!token)stop('Jeton temporaire vide.');
const base=`https://docs.getgrist.com/api/docs/${DOC_ID}`;
async function api(method,route,body){const response=await fetch(base+route,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const text=await response.text();if(!response.ok)stop(`Grist a refusé ${method} ${route} (${response.status}).`);return text?JSON.parse(text):{};}
async function records(table){return (await api('GET',`/tables/${encodeURIComponent(table)}/records`)).records||[]}
async function columns(table){return (await api('GET',`/tables/${encodeURIComponent(table)}/columns`)).columns||[]}
async function chunks(items,size,callback){for(let i=0;i<items.length;i+=size)await callback(items.slice(i,i+size));}
function dateValue(iso){return iso?Date.parse(`${iso}T00:00:00Z`)/1000:null}
function recordFields(item,now,batch){return {
  Identifiant_Pronote:item.Identifiant_Pronote,Numero_Pronote:item.Numero_Pronote,Identifiant_import:item.technicalId,Nom:item.Nom,Prenom:item.Prenom,Prenom_usage:item.Prenom_usage,Date_naissance:dateValue(item.Date_naissance),Classe:item.Classe||0,Offre_formation:item.Offre_formation,Code_classe_importe:item.Code_classe_importe,Groupes_importes:item.Groupes_importes,Annee_scolaire:item.Annee_scolaire,Cle_rapprochement:item.technicalId,Statut_rapprochement:'A_RAPPROCHER',Soumission_PFMP:0,Commentaire_controle:'',Statut_scolarite:item.Statut_scolarite,Date_entree:dateValue(item.Date_entree),Date_sortie:dateValue(item.Date_sortie),Motif_sortie:item.Motif_sortie,Commentaire_sortie:'',Sortie_confirmee:item.Sortie_confirmee,Date_confirmation_sortie:item.Sortie_confirmee?now:null,Confirmee_par:item.Sortie_confirmee?'PRONOTE_IMPORT_OFFICIEL':'',Present_dernier_import:true,Date_derniere_presence_import:now,Exclure_attente_stage:item.Exclure_attente_stage,Motif_exclusion_attente_stage:item.Exclure_attente_stage?'SORTIE_PRONOTE_OFFICIELLE':'',Date_reintegration:null,Historique_scolarite_JSON:'[]',Actif:item.Actif,Source_import:item.Source_import,Identifiant_lot_import:batch,Empreinte_import:item.Empreinte_import,Donnee_test:false,Mode_donnee:'RECETTE_COURANTE',Cohorte_import:batch,Utilisable_production:false,Cle_inscription_annuelle:(item.Identifiant_Pronote?`I:${item.Identifiant_Pronote}`:item.Numero_Pronote?`N:${item.Numero_Pronote}`:`H:${item.Empreinte_import}`)+`|A:${item.Annee_scolaire}`,Date_creation:now,Date_modification:now,Numero_version:1
};}
function key(fields){if(fields.Cle_inscription_annuelle)return String(fields.Cle_inscription_annuelle);var annee=String(fields.Annee_scolaire||'');return String(fields.Identifiant_Pronote||'').trim()?`I:${fields.Identifiant_Pronote}|A:${annee}`:String(fields.Numero_Pronote||'').trim()?`N:${fields.Numero_Pronote}|A:${annee}`:`H:${fields.Empreinte_import}|A:${annee}`;}
const IMPORT_KEYS=['Identifiant_Pronote','Numero_Pronote','Identifiant_import','Nom','Prenom','Prenom_usage','Date_naissance','Classe','Offre_formation','Code_classe_importe','Groupes_importes','Annee_scolaire','Cle_rapprochement','Statut_scolarite','Date_entree','Date_sortie','Motif_sortie','Sortie_confirmee','Present_dernier_import','Exclure_attente_stage','Motif_exclusion_attente_stage','Actif','Source_import','Identifiant_lot_import','Empreinte_import','Donnee_test','Mode_donnee','Cohorte_import','Utilisable_production','Cle_inscription_annuelle'];
function sameImportedFields(current,next){return IMPORT_KEYS.every(name=>(current[name]??null)===(next[name]??null));}
function updateFields(current,next,now){const changed={};IMPORT_KEYS.forEach(name=>changed[name]=next[name]);changed.Date_creation=current.Date_creation||now;changed.Date_derniere_presence_import=now;if(next.Sortie_confirmee&&!current.Date_confirmation_sortie){changed.Date_confirmation_sortie=now;changed.Confirmee_par='PRONOTE_IMPORT_OFFICIEL';}changed.Date_modification=now;changed.Numero_version=Number(current.Numero_version||0)+1;return changed;}
(async()=>{
  const beforeTables=await api('GET','/tables'),tableIds=(beforeTables.tables||[]).map(x=>x.id);
  for(const required of ['Classes','Annees_Scolaires','EUC_OFFRES_FORMATION','EUC_OFFRES_PERIODES','Planning_Periodes','EUC_SOUMISSIONS_PFMP'])if(!tableIds.includes(required))stop(`Table nécessaire absente : ${required}.`);
  const [offersRaw,yearsRaw,classesRaw,submissions]=await Promise.all([records('EUC_OFFRES_FORMATION'),records('Annees_Scolaires'),records('Classes'),records('EUC_SOUMISSIONS_PFMP')]);
  const offers=offersRaw.map(r=>({id:r.id,...r.fields})),activeOffers=offers.filter(o=>o.Actif===true&&o.Afficher_formulaire_PFMP===true&&o.Code_classe);
  if(activeOffers.length!==38)stop(`Référentiel dynamique incompatible : ${activeOffers.length} offres PFMP actives au lieu de 38.`);
  const years=yearsRaw.filter(r=>r.fields.Active===true);if(years.length!==1)stop(`Année scolaire active ambiguë (${years.length}).`);
  const parsed=pronote.parse(fs.readFileSync(source));
  const batch=`PRONOTE-${crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex').slice(0,16)}`;
  const preview=pronote.preview(parsed,activeOffers,{schoolYearId:years[0].id,batchId:batch});
  if(preview.stats.duplicateIdentValues||preview.stats.duplicateNumeroValues||preview.stats.ambiguousIdentities||preview.stats.invalidDates)stop('Prévisualisation bloquante : doublon, identité ambiguë ou date invalide.');
  if(!tableIds.includes(TABLE))await api('POST','/tables',{tables:[schema.table]});
  const actualColumns=await columns(TABLE),actualById=new Map(actualColumns.map(c=>[c.id,c.fields.type]));
  const missing=schema.table.columns.filter(c=>!actualById.has(c.id));if(missing.length)await api('POST',`/tables/${TABLE}/columns`,{columns:missing});
  const conflicts=schema.table.columns.filter(c=>actualById.has(c.id)&&actualById.get(c.id)!==c.fields.type);if(conflicts.length)stop(`Types incompatibles dans ${TABLE} (${conflicts.length}).`);
  const existing=await records(TABLE),existingByKey=new Map(existing.map(r=>[key(r.fields),r]));
  const now=Math.floor(Date.now()/1000),incomingKeys=new Set(),creates=[],updates=[];
  for(const item of preview.accepted){const fields=recordFields(item,now,batch),k=key(fields);incomingKeys.add(k);const old=existingByKey.get(k);if(old){if(!sameImportedFields(old.fields,fields))updates.push({id:old.id,fields:updateFields(old.fields,fields,now)});}else creates.push({fields});}
  const absent=existing.filter(r=>!incomingKeys.has(key(r.fields))&&r.fields.Present_dernier_import!==false).map(r=>({id:r.id,fields:{Present_dernier_import:false,Statut_scolarite:r.fields.Statut_scolarite==='SORTI'?'SORTI':'SORTIE_A_CONFIRMER',Date_modification:now,Numero_version:Number(r.fields.Numero_version||0)+1}}));
  await chunks(creates,200,c=>api('POST',`/tables/${TABLE}/records`,{records:c}));
  await chunks(updates.concat(absent),200,c=>api('PATCH',`/tables/${TABLE}/records`,{records:c}));
  const after=await records(TABLE),afterKeys=after.map(r=>key(r.fields)),unique=new Set(afterKeys);
  if(after.length!==unique.size)stop('Contrôle d’idempotence échoué : clés techniques dupliquées.');
  const secondByKey=new Map(after.map(r=>[key(r.fields),r])),secondCreates=[],secondUpdates=[];
  for(const item of preview.accepted){const fields=recordFields(item,now,batch),old=secondByKey.get(key(fields));if(!old)secondCreates.push(key(fields));else if(!sameImportedFields(old.fields,fields))secondUpdates.push(old.id);}
  const secondAbsent=after.filter(r=>!incomingKeys.has(key(r.fields))&&r.fields.Present_dernier_import!==false);
  if(secondCreates.length||secondUpdates.length||secondAbsent.length)stop('Second passage idempotent échoué : des écritures resteraient nécessaires.');
  const byClass={};after.forEach(r=>{const f=r.fields,code=f.Code_classe_importe||'(sans classe)';if(!byClass[code])byClass[code]={total:0,presents:0,sortis:0};byClass[code].total++;if(f.Statut_scolarite==='SORTI')byClass[code].sortis++;else if(f.Present_dernier_import!==false)byClass[code].presents++;});
  const result={success:true,docId:DOC_ID,source:{recognized:true,...preview.stats},schema:{table:TABLE,columnCount:(await columns(TABLE)).length,references:{Classe:'Classes',Offre_formation:'EUC_OFFRES_FORMATION',Annee_scolaire:'Annees_Scolaires',Soumission_PFMP:'EUC_SOUMISSIONS_PFMP'}},write:{created:creates.length,updated:updates.length,markedForReview:absent.length,totalAfter:after.length,idempotent:true,secondPass:{createsRequired:0,updatesRequired:0,reviewChangesRequired:0}},matching:{submissionsRead:submissions.length,dryRunSubmissionsNeverCounted:true},countersByClass:byClass,historicalElevesModified:false,otherTablesModified:false,productionAccess:false};
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>{try{fs.unlinkSync(realToken);}catch(error){console.error('Suppression du jeton temporaire impossible.');process.exitCode=1;}});
