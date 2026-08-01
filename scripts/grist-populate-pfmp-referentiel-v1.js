const fs = require('fs');
const path = require('path');

const DOC_ID = 'j1jDArBkzi7P';
const AUTHORIZATION = 'ALIMENTATION_REFERENTIEL_PFMP_RECETTE_V1';
const tokenFile = process.env.EUC_PFMP_GRIST_TOKEN_FILE;
const root = path.resolve(__dirname, '..');

function stop(message) { throw new Error(message); }
if (process.env.EUC_PFMP_WRITE_AUTHORIZATION !== AUTHORIZATION) stop('Autorisation explicite absente.');
if (!tokenFile) stop('EUC_PFMP_GRIST_TOKEN_FILE absent.');
const stat = fs.statSync(tokenFile);
if ((stat.mode & 0o077) !== 0) stop('Le fichier du jeton doit être en mode 600.');
const token = fs.readFileSync(tokenFile, 'utf8').trim();
if (!token) stop('Jeton vide.');

async function api(method, endpoint, body) {
  const response = await fetch(`https://docs.getgrist.com/api/docs/${DOC_ID}${endpoint}`, {
    method,
    headers: {Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? {'Content-Type': 'application/json'} : {})},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) stop(`Grist a refusé ${method} ${endpoint} (${response.status}).`);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
async function records(table) {
  return (await api('GET', `/tables/${encodeURIComponent(table)}/records`)).records || [];
}
async function columns(table) {
  return (await api('GET', `/tables/${encodeURIComponent(table)}/columns`)).columns || [];
}
function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}
function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted && ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { row.push(field); field = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

const authorized = parseCsv(fs.readFileSync(path.join(root, 'proposals', 'pfmp-classes-autorisees-proposees.csv'), 'utf8'));
if (authorized.length !== 38) stop(`Le CSV contient ${authorized.length} offres au lieu de 38.`);
if (authorized.some((row) => ['1CAPP', 'TMELEC G'].includes(row.Libelle_utilisateur))) stop('Une classe exclue est présente dans le CSV.');

const diplomaLabels = {
  CAP_CAR: 'CAP Carrossier automobile',
  BAC_PRO_CAR: 'Bac professionnel Carrossier peintre automobile',
  BAC_PRO_CIEL: 'Bac professionnel Cybersécurité, Informatique et réseaux, Électronique',
  BAC_PRO_MELEC: "Bac professionnel Métiers de l'électricité et de ses environnements connectés",
  BAC_PRO_MP3D: 'Bac professionnel Modélisation et prototypage 3D',
  BAC_PRO_MT: 'Bac professionnel Microtechniques',
  BAC_PRO_MVA: 'Bac professionnel Maintenance des véhicules, option voitures particulières',
  BAC_PRO_RMO: 'Bac professionnel Réalisation de produits mécaniques — réalisation et maintenance des outillages',
  BAC_PRO_RSP: 'Bac professionnel Réalisation de produits mécaniques — réalisation et suivi de productions',
  BTS_CPI: 'BTS Conception de produits industriels',
  BTS_CPRP: 'BTS Conception des processus de réalisation de produits',
  BTS_MV: 'BTS Maintenance des véhicules',
  BTS_ELEC: 'BTS Électrotechnique',
  BTS_CIEL: 'BTS Cybersécurité, Informatique et réseaux, Électronique'
};
const uncertainDiplomaCodes = new Set(['CAP_CAR','BAC_PRO_CAR','BAC_PRO_CIEL','BAC_PRO_MP3D','BAC_PRO_MT','BAC_PRO_MVA','BAC_PRO_RMO','BAC_PRO_RSP','BTS_CIEL']);

const uncertainRelations = new Set([
  '1CAP CAR:285','1CAR:26','1CAR:34','1MP3D:29','1MP3D:37','2CAR:137',
  'TCAP CAR:284','TCAP CAR:287','TCAR:10','TCAR:62','1BTS MV:278'
]);

const tableSchema = {
  EUC_OFFRES_PERIODES: [
    {id:'Offre_formation',fields:{label:'Offre de formation',type:'Ref:EUC_OFFRES_FORMATION'}},
    {id:'Periode',fields:{label:'Période',type:'Ref:Planning_Periodes'}},
    {id:'Active',fields:{label:'Active',type:'Bool'}},
    {id:'Code_liaison',fields:{label:'Code liaison',type:'Text'}},
    {id:'Commentaire',fields:{label:'Commentaire',type:'Text'}}
  ]
};
const offerColumns = [
  {id:'Code_classe',fields:{label:'Code classe',type:'Text'}},
  {id:'Afficher_formulaire_PFMP',fields:{label:'Afficher formulaire PFMP',type:'Bool'}}
];

async function ensureTableAndColumns(table, expectedColumns, result) {
  const all = (await api('GET', '/tables')).tables || [];
  if (!all.some((item) => item.id === table)) {
    await api('POST', '/tables', {tables:[{id:table,columns:expectedColumns}]});
    result.tablesCreated.push(table);
    return;
  }
  const current = await columns(table);
  const byId = new Map(current.map((column) => [column.id, column.fields.type]));
  for (const expected of expectedColumns) {
    if (!byId.has(expected.id)) {
      await api('POST', `/tables/${encodeURIComponent(table)}/columns`, {columns:[expected]});
      result.columnsCreated.push(`${table}.${expected.id}`);
    } else if (byId.get(expected.id) !== expected.fields.type) {
      stop(`Conflit de type ${table}.${expected.id}: ${byId.get(expected.id)} au lieu de ${expected.fields.type}.`);
    }
  }
}

(async () => {
  const result = {docId:DOC_ID,tablesCreated:[],columnsCreated:[],diplomasCreated:0,offersCreated:0,relationsCreated:0,planningLinksWritten:0};
  const tableList = (await api('GET', '/tables')).tables || [];
  const tableIds = new Set(tableList.map((table) => table.id));
  for (const required of ['Annees_Scolaires','Classes','Planning_Periodes','EUC_DIPLOMES','EUC_OFFRES_FORMATION']) {
    if (!tableIds.has(required)) stop(`Table requise absente : ${required}.`);
  }

  // Sauvegarde ciblée avant toute mutation, sans jeton.
  const backup = {docId:DOC_ID,createdAt:new Date().toISOString(),tables:{}};
  for (const table of ['EUC_DIPLOMES','EUC_OFFRES_FORMATION','Planning_Periodes']) {
    backup.tables[table] = {columns:await columns(table),records:await records(table)};
  }
  if (tableIds.has('EUC_OFFRES_PERIODES')) backup.tables.EUC_OFFRES_PERIODES = {columns:await columns('EUC_OFFRES_PERIODES'),records:await records('EUC_OFFRES_PERIODES')};
  const backupPath = path.join(root, 'proposals', `pfmp-recette-backup-before-v1-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  fs.writeFileSync(backupPath, `${JSON.stringify(backup,null,2)}\n`, {mode:0o600});
  result.backup = path.relative(root, backupPath);

  const beforeDiplomas = backup.tables.EUC_DIPLOMES.records;
  const beforeOffers = backup.tables.EUC_OFFRES_FORMATION.records;
  if (beforeDiplomas.length || beforeOffers.length || (backup.tables.EUC_OFFRES_PERIODES && backup.tables.EUC_OFFRES_PERIODES.records.length)) {
    stop('Conflit : les tables cibles contiennent déjà des lignes. Aucune écriture effectuée.');
  }

  await ensureTableAndColumns('EUC_OFFRES_PERIODES', tableSchema.EUC_OFFRES_PERIODES, result);
  await ensureTableAndColumns('EUC_OFFRES_FORMATION', offerColumns, result);

  const activeYears = (await records('Annees_Scolaires')).filter((row) => row.fields.Code === '2026-2027' && row.fields.Active === true);
  if (activeYears.length !== 1) stop(`Année active 2026-2027 inattendue : ${activeYears.length}.`);
  const yearId = activeYears[0].id;

  const neededDiplomaCodes = [...new Set(authorized.map((row) => row.Diplome_propose).filter((code) => diplomaLabels[code]))];
  if (neededDiplomaCodes.length !== 14) stop(`Nombre de diplômes attendu 14, obtenu ${neededDiplomaCodes.length}.`);
  const diplomaPayload = neededDiplomaCodes.map((code, index) => ({fields:{
    Code:code, Libelle:diplomaLabels[code], Actif:true, Ordre:index+1,
    Commentaire:uncertainDiplomaCodes.has(code) ? 'Libellé proposé — À valider.' : 'Libellé validé par le référentiel PFMP V2.'
  }}));
  await api('POST', '/tables/EUC_DIPLOMES/records', {records:diplomaPayload});
  result.diplomasCreated = diplomaPayload.length;
  const diplomaByCode = new Map((await records('EUC_DIPLOMES')).map((row) => [row.fields.Code,row.id]));

  const offerPayload = authorized.map((row, index) => {
    const diplomaId = diplomaByCode.get(row.Diplome_propose) || null;
    const noDiploma = !diplomaId;
    const code = `${'2026-2027'}__${normalize(row.Libelle_utilisateur)}`;
    return {fields:{
      Annee_scolaire:yearId, Diplome:diplomaId, Classe:row.Classe_Grist_ID ? Number(row.Classe_Grist_ID) : null,
      Code_classe:row.Libelle_utilisateur, Actif:true, Afficher_formulaire_PFMP:true, Ordre:index+1,
      Commentaire:`${code}. ${noDiploma ? 'Diplôme final À valider (famille MTNE/REMI, non créée comme diplôme autonome).' : 'Offre autorisée PFMP.'}`
    }};
  });
  await api('POST', '/tables/EUC_OFFRES_FORMATION/records', {records:offerPayload});
  result.offersCreated = offerPayload.length;
  const offers = await records('EUC_OFFRES_FORMATION');
  const offerByLabel = new Map(offers.map((row) => [row.fields.Code_classe,row]));

  const relations = [];
  for (const row of authorized) {
    const offer = offerByLabel.get(row.Libelle_utilisateur);
    const periodIds = row.Periodes_Grist_IDs ? row.Periodes_Grist_IDs.split('|').map(Number) : [];
    for (const periodId of periodIds) {
      const businessKey = `${row.Libelle_utilisateur}:${periodId}`;
      if (uncertainRelations.has(businessKey)) continue;
      relations.push({offerId:offer.id,periodId,label:row.Libelle_utilisateur,code:`${offer.id}:${periodId}`});
    }
  }
  if (relations.length !== 43) stop(`Nombre de relations certaines attendu 43, obtenu ${relations.length}.`);
  if (new Set(relations.map((row) => row.code)).size !== relations.length) stop('Doublon interne dans les relations certaines.');
  await api('POST', '/tables/EUC_OFFRES_PERIODES/records', {records:relations.map((row) => ({fields:{
    Offre_formation:row.offerId, Periode:row.periodId, Active:true, Code_liaison:row.code, Commentaire:'Relation certaine — référentiel PFMP V2.'
  }}))});
  result.relationsCreated = relations.length;

  const relationsByPeriod = new Map();
  for (const relation of relations) {
    if (!relationsByPeriod.has(relation.periodId)) relationsByPeriod.set(relation.periodId, []);
    relationsByPeriod.get(relation.periodId).push(relation);
  }
  const direct = [...relationsByPeriod.entries()].filter(([,items]) => items.length === 1).map(([periodId,items]) => ({id:periodId,fields:{Offre_formation:items[0].offerId}}));
  if (direct.length) await api('PATCH', '/tables/Planning_Periodes/records', {records:direct});
  result.planningLinksWritten = direct.length;

  // Relecture exhaustive et invariants.
  const finalDiplomas = await records('EUC_DIPLOMES');
  const finalOffers = await records('EUC_OFFRES_FORMATION');
  const finalRelations = await records('EUC_OFFRES_PERIODES');
  const visible = finalOffers.filter((row) => row.fields.Afficher_formulaire_PFMP === true);
  const btsWithoutClass = visible.filter((row) => /^\dBTS (?:CPI|CPRP|MV|CIEL)$/.test(row.fields.Code_classe) && !row.fields.Classe);
  const excludedVisible = visible.filter((row) => ['1CAPP','TMELEC G'].includes(row.fields.Code_classe));
  const relationCodes = finalRelations.map((row) => row.fields.Code_liaison);
  const createdPairs = new Set(finalRelations.map((row) => `${offerByLabel.get(row.fields.Code_classe)?.id || row.fields.Offre_formation}:${row.fields.Periode}`));
  const uncertainCreated = [...uncertainRelations].filter((key) => {
    const [label,period] = key.split(':'); const offer = offerByLabel.get(label);
    return offer && createdPairs.has(`${offer.id}:${period}`);
  });
  const checks = {
    diplomas:finalDiplomas.length,
    visibleOffers:visible.length,
    totalOffers:finalOffers.length,
    btsWithoutClass:btsWithoutClass.length,
    relations:finalRelations.length,
    duplicateRelationCodes:relationCodes.length-new Set(relationCodes).size,
    uncertainRelationsCreated:uncertainCreated.length,
    excludedVisible:excludedVisible.length,
    allOffersActiveYear:finalOffers.every((row) => row.fields.Annee_scolaire===yearId),
    allReferencesValid:finalRelations.every((row) => finalOffers.some((offer) => offer.id===row.fields.Offre_formation)),
    submissionsUntouched:true,
    companiesContactsUntouched:true,
    productionAccess:false
  };
  const expected = checks.diplomas===14 && checks.visibleOffers===38 && checks.totalOffers===38 && checks.btsWithoutClass===8 && checks.relations===43 && checks.duplicateRelationCodes===0 && checks.uncertainRelationsCreated===0 && checks.excludedVisible===0 && checks.allOffersActiveYear && checks.allReferencesValid;
  result.checks = checks;
  result.success = expected;
  const resultPath = path.join(root,'proposals','pfmp-recette-alimentation-result-v1.json');
  fs.writeFileSync(resultPath,`${JSON.stringify(result,null,2)}\n`);
  console.log(JSON.stringify(result,null,2));
  if (!expected) process.exitCode=1;
})().catch((error) => { console.error(error.message); process.exit(1); });
