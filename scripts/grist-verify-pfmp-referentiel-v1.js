const fs = require('fs');
const path = require('path');
const DOC_ID = 'j1jDArBkzi7P';
const tokenFile = process.env.EUC_PFMP_GRIST_TOKEN_FILE;
if (!tokenFile) throw new Error('Jeton absent.');
const stat = fs.statSync(tokenFile);
if ((stat.mode & 0o077) !== 0) throw new Error('Jeton non privé.');
const token = fs.readFileSync(tokenFile,'utf8').trim();
const root = path.resolve(__dirname,'..');
async function get(endpoint) {
  const response = await fetch(`https://docs.getgrist.com/api/docs/${DOC_ID}${endpoint}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}});
  if (!response.ok) throw new Error(`Lecture refusée ${endpoint} (${response.status}).`);
  return response.json();
}
async function records(table){return (await get(`/tables/${encodeURIComponent(table)}/records`)).records||[];}
async function columns(table){return (await get(`/tables/${encodeURIComponent(table)}/columns`)).columns||[];}
function latestBackup() {
  return fs.readdirSync(path.join(root,'proposals')).filter((name)=>name.startsWith('pfmp-recette-backup-before-v1-')).sort().at(-1);
}
(async()=>{
  const [diplomas,offers,relations,periods,submissions,companies,contacts,offerCols,relationCols] = await Promise.all([
    records('EUC_DIPLOMES'),records('EUC_OFFRES_FORMATION'),records('EUC_OFFRES_PERIODES'),records('Planning_Periodes'),
    records('EUC_SOUMISSIONS_PFMP'),records('EUC_ENTREPRISES'),records('EUC_CONTACTS_ENTREPRISES'),
    columns('EUC_OFFRES_FORMATION'),columns('EUC_OFFRES_PERIODES')
  ]);
  const backupName=latestBackup();
  if(!backupName) throw new Error('Sauvegarde préalable introuvable.');
  const backup=JSON.parse(fs.readFileSync(path.join(root,'proposals',backupName),'utf8'));
  const beforePeriods=new Map(backup.tables.Planning_Periodes.records.map((row)=>[row.id,row.fields]));
  const relationCounts=new Map();
  for(const relation of relations) relationCounts.set(relation.fields.Periode,(relationCounts.get(relation.fields.Periode)||0)+1);
  const expectedDirect=new Map(relations.filter((relation)=>relationCounts.get(relation.fields.Periode)===1).map((relation)=>[relation.fields.Periode,relation.fields.Offre_formation]));
  let unexpectedHistoricalChanges=0, directMismatch=0;
  for(const row of periods){
    const before=beforePeriods.get(row.id)||{};
    const afterOther={...row.fields}; delete afterOther.Offre_formation;
    const beforeOther={...before}; delete beforeOther.Offre_formation;
    if(JSON.stringify(afterOther)!==JSON.stringify(beforeOther)) unexpectedHistoricalChanges++;
    const expected=expectedDirect.get(row.id)??before.Offre_formation??0;
    const actual=row.fields.Offre_formation??0;
    if(actual!==expected) directMismatch++;
  }
  const type=(cols,id)=>cols.find((col)=>col.id===id)?.fields.type;
  const offerIds=new Set(offers.map((row)=>row.id)), periodIds=new Set(periods.map((row)=>row.id)), diplomaIds=new Set(diplomas.map((row)=>row.id));
  const visible=offers.filter((row)=>row.fields.Afficher_formulaire_PFMP===true);
  const checks={
    schema:{
      Code_classe:type(offerCols,'Code_classe'),Afficher_formulaire_PFMP:type(offerCols,'Afficher_formulaire_PFMP'),
      Offre_formation:type(relationCols,'Offre_formation'),Periode:type(relationCols,'Periode'),Active:type(relationCols,'Active'),Code_liaison:type(relationCols,'Code_liaison'),Commentaire:type(relationCols,'Commentaire')
    },
    diplomas:diplomas.length,offers:offers.length,visibleOffers:visible.length,
    btsWithoutClass:visible.filter((row)=>/^\dBTS (?:CPI|CPRP|MV|CIEL)$/.test(row.fields.Code_classe)&&!row.fields.Classe).length,
    excludedVisible:visible.filter((row)=>['1CAPP','TMELEC G'].includes(row.fields.Code_classe)).length,
    relations:relations.length,duplicateCodes:relations.length-new Set(relations.map((row)=>row.fields.Code_liaison)).size,
    invalidRelationReferences:relations.filter((row)=>!offerIds.has(row.fields.Offre_formation)||!periodIds.has(row.fields.Periode)).length,
    invalidDiplomaReferences:offers.filter((row)=>row.fields.Diplome&&!diplomaIds.has(row.fields.Diplome)).length,
    directPlanningLinks:expectedDirect.size,directPlanningMismatch:directMismatch,unexpectedPlanningChanges:unexpectedHistoricalChanges,
    submissions:submissions.length,companies:companies.length,contacts:contacts.length,
    productionAccess:false
  };
  const expectedSchema={Code_classe:'Text',Afficher_formulaire_PFMP:'Bool',Offre_formation:'Ref:EUC_OFFRES_FORMATION',Periode:'Ref:Planning_Periodes',Active:'Bool',Code_liaison:'Text',Commentaire:'Text'};
  const success=JSON.stringify(checks.schema)===JSON.stringify(expectedSchema)&&checks.diplomas===14&&checks.offers===38&&checks.visibleOffers===38&&checks.btsWithoutClass===8&&checks.excludedVisible===0&&checks.relations===43&&checks.duplicateCodes===0&&checks.invalidRelationReferences===0&&checks.invalidDiplomaReferences===0&&checks.directPlanningLinks===29&&checks.directPlanningMismatch===0&&checks.unexpectedPlanningChanges===0&&checks.submissions===0;
  const output={docId:DOC_ID,verifiedAt:new Date().toISOString(),backup:backupName,checks,success};
  fs.writeFileSync(path.join(root,'proposals','pfmp-recette-verification-v1.json'),`${JSON.stringify(output,null,2)}\n`);
  console.log(JSON.stringify(output,null,2));
  if(!success)process.exitCode=1;
})().catch((error)=>{console.error(error.message);process.exit(1);});
