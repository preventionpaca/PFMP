#!/usr/bin/env node
'use strict';
const DOC='j1jDArBkzi7P',BASE=`https://docs.getgrist.com/api/docs/${DOC}`;
const expected={
  EUC_IMPORTS_PRONOTE_PFMP:['Identifiant_import','Empreinte_SHA256','Statut_import'],
  EUC_HISTORIQUE_SOUMISSIONS_PFMP:['Soumission','Version_avant','Version_apres','Motif'],
  EUC_PERSONNELS_PFMP:['Identifiant_personnel','Email_institutionnel','Actif'],
  EUC_AFFECTATIONS_PFMP:['Soumission_PFMP','Professeur','Type_suivi','Actif']
};
async function get(path){const r=await fetch(BASE+path,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`GET ${path}: HTTP ${r.status}`);return r.json();}
(async()=>{const tables=(await get('/tables')).tables||[],ids=new Set(tables.map(t=>t.id)),result={docId:DOC,tables:{},synthesisColumns:[],readOnly:true};for(const [table,required] of Object.entries(expected)){if(!ids.has(table))throw new Error(`Table absente: ${table}`);const cols=(await get(`/tables/${table}/columns`)).columns||[],colIds=cols.map(c=>c.id),missing=required.filter(c=>!colIds.includes(c)),records=(await get(`/tables/${table}/records`)).records||[];if(missing.length)throw new Error(`${table}: colonnes absentes ${missing.join(', ')}`);result.tables[table]={columns:colIds.length,records:records.length};}const syn=(await get('/tables/EUC_SYNTHESE_SUIVI_PFMP/columns')).columns||[],synIds=syn.map(c=>c.id);result.synthesisColumns=['Soumissions_recues','Rapprochements_a_verifier','Conventions_annulees','Conventions_traitees_Pronote'].filter(c=>synIds.includes(c));if(result.synthesisColumns.length!==4)throw new Error('Colonnes de synthèse incomplètes.');process.stdout.write(JSON.stringify(result,null,2)+'\n');})().catch(e=>{console.error(e.message);process.exit(1)});
