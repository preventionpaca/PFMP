#!/usr/bin/env node
'use strict';

const fs = require('fs');
const DOC_ID = 'j1jDArBkzi7P';
const TOKEN_FILE = process.env.EUC_PFMP_GRIST_TOKEN_FILE || '/tmp/euc_grist_recipe_token';
const API = (process.env.EUC_GRIST_API_URL || 'https://docs.getgrist.com/api').replace(/\/$/, '');
if (process.env.EUC_PFMP_GRIST_STRUCTURE_AUTH !== 'CREER_STRUCTURE_PFMP_DEV27_COPIE_RECETTE') {
  throw new Error('Autorisation explicite de structure dev.27 requise.');
}
const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
if (!token) throw new Error('Jeton Grist local vide.');

const tables = [
  {id:'EUC_IMPORTS_PRONOTE_PFMP',columns:[
    ['Identifiant_import','Text'],['Date_import','DateTime'],['Annee_scolaire','Ref:Annees_Scolaires'],['Nom_fichier','Text'],['Empreinte_SHA256','Text'],['Nombre_lignes','Int'],['Nombre_admissibles','Int'],['Nombre_creations','Int'],['Nombre_mises_a_jour','Int'],['Nombre_sorties','Int'],['Nombre_ambiguites','Int'],['Nombre_rejets','Int'],['Statut_import','Choice'],['Auteur','Text'],['Date_validation','DateTime'],['Rapport_synthetique','Text']
  ]},
  {id:'EUC_HISTORIQUE_SOUMISSIONS_PFMP',columns:[
    ['Soumission','Ref:EUC_SOUMISSIONS_PFMP'],['Date_action','DateTime'],['Auteur_email','Text'],['Type_action','Choice'],['Version_avant','Int'],['Version_apres','Int'],['Statut_avant','Text'],['Statut_apres','Text'],['Champs_modifies','Text'],['Valeurs_avant_JSON','Text'],['Valeurs_apres_JSON','Text'],['Motif','Text'],['Soumission_remplacee','Ref:EUC_SOUMISSIONS_PFMP'],['Soumission_remplacement','Ref:EUC_SOUMISSIONS_PFMP']
  ]},
  {id:'EUC_PERSONNELS_PFMP',columns:[
    ['Identifiant_personnel','Text'],['Nom','Text'],['Prenom','Text'],['Email_institutionnel','Text'],['Actif','Bool'],['Peut_suivi_telephonique','Bool'],['Peut_visite_entreprise','Bool'],['Peut_recevoir_ordre_mission','Bool']
  ]},
  {id:'EUC_AFFECTATIONS_PFMP',columns:[
    ['Soumission_PFMP','Ref:EUC_SOUMISSIONS_PFMP'],['Professeur','Ref:EUC_PERSONNELS_PFMP'],['Type_suivi','Choice'],['Date_affectation','DateTime'],['Affecte_par','Text'],['Statut_affectation','Choice'],['Commentaire','Text'],['Date_previsionnelle','Date'],['Date_realisee','Date'],['Actif','Bool']
  ]}
].map(t=>({id:t.id,columns:t.columns.map(([id,type])=>({id,fields:{type}}))}));
const synthesisColumns = [
  ['Soumissions_recues','Int'],['Rapprochements_a_verifier','Int'],['Conventions_annulees','Int'],['Conventions_traitees_Pronote','Int']
].map(([id,type])=>({id,fields:{type}}));

async function request(method, path, body) {
  const response = await fetch(`${API}/docs/${DOC_ID}${path}`, {method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status}`);
  return response.status === 204 ? {} : response.json();
}
async function main() {
  const current = await request('GET','/tables');
  const ids = new Set((current.tables || []).map(t=>t.id));
  const created=[];
  for (const table of tables) if (!ids.has(table.id)) { await request('POST','/tables',{tables:[table]}); created.push(table.id); }
  const cols = await request('GET','/tables/EUC_SYNTHESE_SUIVI_PFMP/columns');
  const existing = new Set((cols.columns || []).map(c=>c.id));
  const missing = synthesisColumns.filter(c=>!existing.has(c.id));
  if (missing.length) await request('POST','/tables/EUC_SYNTHESE_SUIVI_PFMP/columns',{columns:missing});
  const verification={};
  for (const table of tables) {
    const actualColumns=(await request('GET',`/tables/${table.id}/columns`)).columns||[];
    const actualIds=new Set(actualColumns.map(c=>c.id));
    const absent=table.columns.map(c=>c.id).filter(id=>!actualIds.has(id));
    if(absent.length)throw new Error(`${table.id}: colonnes absentes après création (${absent.join(', ')})`);
    const records=(await request('GET',`/tables/${table.id}/records`)).records||[];
    verification[table.id]={columns:actualColumns.length,records:records.length};
  }
  const synthesisAfter=(await request('GET','/tables/EUC_SYNTHESE_SUIVI_PFMP/columns')).columns||[];
  const synthesisIds=new Set(synthesisAfter.map(c=>c.id));
  if(synthesisColumns.some(c=>!synthesisIds.has(c.id)))throw new Error('Colonnes de synthèse incomplètes après création.');
  const result={docId:DOC_ID,createdTables:created,existingTables:tables.map(t=>t.id).filter(id=>!created.includes(id)),createdSynthesisColumns:missing.map(c=>c.id),recordsWritten:0,idempotent:true,verification:verification,synthesisColumnsVerified:synthesisColumns.map(c=>c.id)};
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
main().finally(()=>{ try { fs.unlinkSync(TOKEN_FILE); } catch (_) {} });
