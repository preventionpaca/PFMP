const fs = require('fs');
const path = require('path');

const DOC_ID = 'j1jDArBkzi7P';
const TARGETS = new Set([6, 27, 37, 38]);
const tokenFile = process.env.EUC_PFMP_GRIST_TOKEN_FILE;
if (!tokenFile) throw new Error('EUC_PFMP_GRIST_TOKEN_FILE absent.');
const stat = fs.statSync(tokenFile);
if ((stat.mode & 0o077) !== 0) throw new Error('Le fichier du jeton doit être en mode 600.');
const token = fs.readFileSync(tokenFile, 'utf8').trim();
if (!token) throw new Error('Jeton vide.');

async function get(apiPath) {
  const response = await fetch(`https://docs.getgrist.com/api/docs/${DOC_ID}${apiPath}`, {
    method: 'GET', headers: {Authorization: `Bearer ${token}`, Accept: 'application/json'}
  });
  if (!response.ok) throw new Error(`Lecture refusée pour ${apiPath} (${response.status}).`);
  return response.json();
}

function containsTarget(value) {
  if (typeof value === 'number') return TARGETS.has(value);
  if (Array.isArray(value)) return value.some(containsTarget);
  return false;
}

const contextKeys = [
  'Code','Code_import','Nom','Libelle','Annee_scolaire','Version_EDT','Classe','Groupe',
  'Type','Type_creneau','Categorie_suivi','Date','Date_debut','Date_fin','Semaine_ISO',
  'Actif','Active','Statut','Commentaire'
];

(async () => {
  const tables = (await get('/tables')).tables || [];
  const result = {docId: DOC_ID, targets: [...TARGETS], referencingTables: [], usages: []};
  for (const table of tables) {
    const columns = (await get(`/tables/${encodeURIComponent(table.id)}/columns`)).columns || [];
    const classColumns = columns.filter((column) => /^(?:Ref|RefList):Classes$/.test(column.fields.type || ''));
    if (!classColumns.length) continue;
    result.referencingTables.push({table: table.id, columns: classColumns.map((column) => ({id: column.id, type: column.fields.type}))});
    const records = (await get(`/tables/${encodeURIComponent(table.id)}/records`)).records || [];
    for (const record of records) {
      for (const column of classColumns) {
        const value = record.fields && record.fields[column.id];
        if (!containsTarget(value)) continue;
        const context = {};
        for (const key of contextKeys) {
          if (record.fields && Object.prototype.hasOwnProperty.call(record.fields, key)) context[key] = record.fields[key];
        }
        result.usages.push({table: table.id, rowId: record.id, column: column.id, classValue: value, context});
      }
    }
  }
  const out = path.resolve(__dirname, '..', 'proposals', 'pfmp-class-reference-usage.json');
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, {mode: 0o600});
  console.log(JSON.stringify({tablesWithClassRefs: result.referencingTables.length, matchingUsages: result.usages.length, output: 'proposals/pfmp-class-reference-usage.json'}));
})().catch((error) => { console.error(error.message); process.exit(1); });
