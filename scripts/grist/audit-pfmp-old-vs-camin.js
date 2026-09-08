#!/usr/bin/env node
'use strict';

/**
 * Eucalyptus PFMP — audit comparatif lecture seule dev.34
 * Compare l'ancien document de recette et le document Camin.
 * GARANTIE : ce script n'émet que des requêtes HTTP GET.
 */

const fs = require('fs');
const path = require('path');

const OLD = {
  name: 'ancien-recette',
  base: (process.env.EUC_PFMP_OLD_GRIST_URL || 'https://docs.getgrist.com').replace(/\/$/, ''),
  docId: process.env.EUC_PFMP_OLD_DOC_ID || 'j1jDArBkzi7P',
  tokenFile: process.env.EUC_PFMP_OLD_TOKEN_FILE || process.env.EUC_PFMP_GRIST_TOKEN_FILE || '/tmp/euc_grist_recipe_token'
};
const NEW = {
  name: 'camin',
  base: (process.env.EUC_PFMP_NEW_GRIST_URL || 'https://camin.getgrist.com').replace(/\/$/, ''),
  docId: process.env.EUC_PFMP_NEW_DOC_ID || 'b2CyeMEdVEMS',
  tokenFile: process.env.EUC_PFMP_NEW_TOKEN_FILE || process.env.EUC_PFMP_GRIST_TOKEN_FILE || '/tmp/euc_grist_recipe_token'
};
const OUT = process.env.EUC_PFMP_AUDIT_OUT || path.join(process.cwd(), 'pfmp-audit-old-vs-camin.json');

const PFMP_TABLES_KNOWN = new Set([
  'Annees_Scolaires','Classes','Planning_Periodes','Calendrier_Scolaire','Eleves','Enseignants',
  'Quotas_PFMP_Enseignants','Repartition_PFMP',
  'EUC_DIPLOMES','EUC_OFFRES_FORMATION','EUC_OFFRES_PERIODES','EUC_ELEVES_PFMP',
  'EUC_SOUMISSIONS_PFMP','EUC_SYNTHESE_SUIVI_PFMP','EUC_UTILISATEURS_PFMP',
  'EUC_IMPORTS_PRONOTE_PFMP','EUC_HISTORIQUE_SOUMISSIONS_PFMP','EUC_PERSONNELS_PFMP','EUC_AFFECTATIONS_PFMP',
  'EUC_ENTREPRISES','EUC_CONTACTS_ENTREPRISES'
]);

function readToken(file) {
  const token = fs.readFileSync(file, 'utf8').trim();
  if (!token) throw new Error(`Jeton vide : ${file}`);
  return token;
}

async function getJson(target, token, suffix) {
  const url = `${target.base}/api/docs/${encodeURIComponent(target.docId)}${suffix}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`${target.name}: GET ${suffix} -> HTTP ${response.status}`);
  return response.json();
}

function normalizeType(type) {
  return String(type || '').replace(/\s+/g, '');
}
function refTarget(type) {
  const m = String(type || '').match(/^Ref(?::|List:)(.+)$/);
  return m ? m[1] : null;
}
function isPfmpTable(id) {
  return PFMP_TABLES_KNOWN.has(id) || /PFMP|PRONOTE|ENTREPRISE/i.test(id);
}
function isEdtTable(id) {
  return /(^|_)EDT(_|$)|Emploi|Planning_Journalier|Modeles_Horaires|Quotas_Annuels|Base_Planning/i.test(id);
}

async function inspect(target) {
  const token = readToken(target.tokenFile);
  const tableList = await getJson(target, token, '/tables');
  const ids = (tableList.tables || []).map(t => t.id).sort();
  const tables = {};

  for (const id of ids) {
    const columnsJson = await getJson(target, token, `/tables/${encodeURIComponent(id)}/columns`);
    const columns = (columnsJson.columns || []).map(c => ({
      id: c.id,
      type: normalizeType(c.fields && c.fields.type),
      refTarget: refTarget(c.fields && c.fields.type)
    }));
    let count = null;
    if (isPfmpTable(id)) {
      const recordsJson = await getJson(target, token, `/tables/${encodeURIComponent(id)}/records`);
      count = (recordsJson.records || []).length;
    }
    tables[id] = { columns, count, pfmp: isPfmpTable(id), edt: isEdtTable(id) };
  }
  return { name: target.name, base: target.base, docId: target.docId, tableCount: ids.length, tables };
}

function compare(oldDoc, newDoc) {
  const oldIds = Object.keys(oldDoc.tables);
  const newIds = new Set(Object.keys(newDoc.tables));
  const pfmpOld = oldIds.filter(id => oldDoc.tables[id].pfmp && !oldDoc.tables[id].edt);
  const missingTables = pfmpOld.filter(id => !newIds.has(id));
  const common = pfmpOld.filter(id => newIds.has(id));
  const missingColumns = {};
  const typeConflicts = {};
  const refConflicts = {};
  const counts = {};

  for (const id of common) {
    const a = oldDoc.tables[id];
    const b = newDoc.tables[id];
    const bMap = new Map(b.columns.map(c => [c.id, c]));
    const mc = [], tc = [], rc = [];
    for (const c of a.columns) {
      const d = bMap.get(c.id);
      if (!d) { mc.push(c); continue; }
      if (c.type !== d.type) tc.push({ column: c.id, oldType: c.type, newType: d.type });
      if ((c.refTarget || null) !== (d.refTarget || null)) rc.push({ column: c.id, oldRef: c.refTarget, newRef: d.refTarget });
    }
    if (mc.length) missingColumns[id] = mc;
    if (tc.length) typeConflicts[id] = tc;
    if (rc.length) refConflicts[id] = rc;
    counts[id] = { old: a.count, new: b.count, delta: Number.isInteger(a.count) && Number.isInteger(b.count) ? b.count - a.count : null };
  }

  const edtInNew = Object.entries(newDoc.tables).filter(([,t]) => t.edt).map(([id]) => id).sort();
  return {
    generatedAt: new Date().toISOString(),
    mode: 'READ_ONLY_GET_ONLY',
    source: { docId: oldDoc.docId, base: oldDoc.base, tableCount: oldDoc.tableCount },
    target: { docId: newDoc.docId, base: newDoc.base, tableCount: newDoc.tableCount },
    pfmpTablesInSource: pfmpOld,
    missingPfmpTablesInTarget: missingTables,
    missingColumnsInExistingPfmpTables: missingColumns,
    typeConflicts,
    referenceConflicts: refConflicts,
    recordCounts: counts,
    protectedEdtTablesInTarget: edtInNew,
    proposedWrites: {
      createTables: missingTables,
      addColumns: missingColumns,
      dataMigration: pfmpOld.filter(id => !oldDoc.tables[id].edt),
      forbidden: ['DELETE', 'DROP', 'PATCH/POST sur ancien document', 'modification des tables EDT Camin']
    }
  };
}

function markdown(report) {
  const lines = [];
  lines.push('# Audit PFMP ancien Grist → Camin');
  lines.push('');
  lines.push(`Mode : **${report.mode}**`);
  lines.push(`Source : \`${report.source.docId}\` — ${report.source.tableCount} tables`);
  lines.push(`Cible : \`${report.target.docId}\` — ${report.target.tableCount} tables`);
  lines.push('');
  lines.push('## Tables PFMP absentes de Camin');
  if (!report.missingPfmpTablesInTarget.length) lines.push('- Aucune.');
  else report.missingPfmpTablesInTarget.forEach(x => lines.push(`- \`${x}\``));
  lines.push('');
  lines.push('## Colonnes absentes dans les tables PFMP existantes');
  const entries = Object.entries(report.missingColumnsInExistingPfmpTables);
  if (!entries.length) lines.push('- Aucune.');
  else for (const [table, cols] of entries) lines.push(`- \`${table}\` : ${cols.map(c => `\`${c.id}\` (${c.type})`).join(', ')}`);
  lines.push('');
  lines.push('## Conflits de types / références');
  if (!Object.keys(report.typeConflicts).length && !Object.keys(report.referenceConflicts).length) lines.push('- Aucun conflit détecté.');
  for (const [table, rows] of Object.entries(report.typeConflicts)) rows.forEach(r => lines.push(`- TYPE \`${table}.${r.column}\` : ancien \`${r.oldType}\`, Camin \`${r.newType}\``));
  for (const [table, rows] of Object.entries(report.referenceConflicts)) rows.forEach(r => lines.push(`- REF \`${table}.${r.column}\` : ancien \`${r.oldRef}\`, Camin \`${r.newRef}\``));
  lines.push('');
  lines.push('## Compteurs');
  lines.push('| Table | Ancien | Camin | Delta Camin-ancien |');
  lines.push('|---|---:|---:|---:|');
  for (const [table, c] of Object.entries(report.recordCounts)) lines.push(`| ${table} | ${c.old ?? '—'} | ${c.new ?? '—'} | ${c.delta ?? '—'} |`);
  lines.push('');
  lines.push('## Tables EDT détectées dans Camin — protégées');
  report.protectedEdtTablesInTarget.forEach(x => lines.push(`- \`${x}\``));
  lines.push('');
  lines.push('Aucune écriture n’a été réalisée par cet audit.');
  return lines.join('\n') + '\n';
}

async function main() {
  const oldDoc = await inspect(OLD);
  const newDoc = await inspect(NEW);
  const report = compare(oldDoc, newDoc);
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  const md = OUT.replace(/\.json$/i, '') + '.md';
  fs.writeFileSync(md, markdown(report));
  process.stdout.write(JSON.stringify({ok:true, mode:report.mode, json:OUT, markdown:md, missingTables:report.missingPfmpTablesInTarget.length, protectedEdtTables:report.protectedEdtTablesInTarget.length}, null, 2) + '\n');
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
