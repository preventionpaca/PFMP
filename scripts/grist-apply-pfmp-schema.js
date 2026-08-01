const fs = require('fs');
const path = require('path');

const DOC_ID = 'j1jDArBkzi7P';
const AUTHORIZATION = 'SCHEMA_PFMP_VALIDE_AUTORISATION_COPIE_GRIST';
const fixturePath = path.resolve(__dirname, '..', 'tests', 'fixtures', 'pfmp-schema-v1.json');

function stop(message) {
  console.error(message);
  process.exit(1);
}

if (process.env.EUC_PFMP_SCHEMA_AUTHORIZATION !== AUTHORIZATION) {
  stop(`Installation bloquée : définir EUC_PFMP_SCHEMA_AUTHORIZATION=${AUTHORIZATION}`);
}

const tokenFile = process.env.EUC_PFMP_GRIST_TOKEN_FILE;
if (!tokenFile) stop('Installation bloquée : EUC_PFMP_GRIST_TOKEN_FILE est absent.');
const stat = fs.statSync(tokenFile);
if ((stat.mode & 0o077) !== 0) stop('Le fichier du jeton doit être privé (chmod 600).');
const token = fs.readFileSync(tokenFile, 'utf8').trim();
if (!token) stop('Le fichier du jeton est vide.');

const schema = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
if (schema.docId !== DOC_ID) stop('Doc ID du fixture non autorisé.');

async function grist(method, apiPath, body) {
  const response = await fetch(`https://docs.getgrist.com/api/docs/${DOC_ID}${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? {'Content-Type': 'application/json'} : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(`Grist a refusé ${method} ${apiPath} (${response.status}).`);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function ensureTable(table, result) {
  const all = await grist('GET', '/tables');
  const exists = (all.tables || []).some((item) => item.id === table.id);
  if (!exists) {
    await grist('POST', '/tables', {tables: [table]});
    result.tablesCreated.push(table.id);
    return;
  }
  const current = await grist('GET', `/tables/${encodeURIComponent(table.id)}/columns`);
  const byId = new Map((current.columns || []).map((column) => [column.id, column]));
  const missing = table.columns.filter((column) => !byId.has(column.id));
  if (missing.length) {
    await grist('POST', `/tables/${encodeURIComponent(table.id)}/columns`, {columns: missing});
    result.columnsCreated.push({table: table.id, columns: missing.map((column) => column.id)});
  }
  for (const expected of table.columns) {
    const actual = byId.get(expected.id);
    if (actual && actual.fields.type !== expected.fields.type) {
      result.typeConflicts.push({table: table.id, column: expected.id, expected: expected.fields.type, actual: actual.fields.type});
    }
  }
}

async function ensureColumns(change, result) {
  const current = await grist('GET', `/tables/${encodeURIComponent(change.table)}/columns`);
  const byId = new Map((current.columns || []).map((column) => [column.id, column]));
  const missing = change.columns.filter((column) => !byId.has(column.id));
  if (missing.length) {
    await grist('POST', `/tables/${encodeURIComponent(change.table)}/columns`, {columns: missing});
    result.columnsCreated.push({table: change.table, columns: missing.map((column) => column.id)});
  }
  for (const expected of change.columns) {
    const actual = byId.get(expected.id);
    if (actual && actual.fields.type !== expected.fields.type) {
      result.typeConflicts.push({table: change.table, column: expected.id, expected: expected.fields.type, actual: actual.fields.type});
    }
  }
}

async function verify() {
  const verified = {};
  for (const table of schema.tables) {
    const current = await grist('GET', `/tables/${encodeURIComponent(table.id)}/columns`);
    const byId = new Map((current.columns || []).map((column) => [column.id, column.fields.type]));
    verified[table.id] = table.columns.every((column) => byId.get(column.id) === column.fields.type);
  }
  for (const change of schema.alterTables) {
    const current = await grist('GET', `/tables/${encodeURIComponent(change.table)}/columns`);
    const byId = new Map((current.columns || []).map((column) => [column.id, column.fields.type]));
    verified[change.table] = change.columns.every((column) => byId.get(column.id) === column.fields.type);
  }
  return verified;
}

(async () => {
  const result = {docId: DOC_ID, tablesCreated: [], columnsCreated: [], typeConflicts: []};
  for (const table of schema.tables) await ensureTable(table, result);
  for (const change of schema.alterTables) await ensureColumns(change, result);
  result.verified = await verify();
  console.log(JSON.stringify(result, null, 2));
  if (result.typeConflicts.length || Object.values(result.verified).some((value) => !value)) process.exitCode = 1;
})().catch((error) => stop(error.message));
