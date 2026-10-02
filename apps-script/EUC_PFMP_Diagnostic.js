/** Eucalyptus PFMP — v1.0.0-dev.32 — diagnostic lecture seule du référentiel courant. */
function EUC_PFMP_diagnostiquerReferentielCourant_() {
  EUC_ENT_controlerAccesUtilisateur_();
  EUC_ENT_controlerCibleRecette_();
  var cfg=EUC_ENT_lireConfiguration();
  var tables=(EUC_ENT_grist('get','/tables').tables||[]), ids={};
  tables.forEach(function(t){ids[t.id]=true;});
  var attendues=['Annees_Scolaires','Classes','Planning_Periodes','EUC_DIPLOMES','EUC_OFFRES_FORMATION','EUC_OFFRES_PERIODES','EUC_ELEVES_PFMP'];
  var details=attendues.map(function(id){
    var out={table:id,presente:!!ids[id],lignes:null,colonnes:[]};
    if(!out.presente)return out;
    try{out.lignes=(EUC_ENT_grist('get','/tables/'+encodeURIComponent(id)+'/records').records||[]).length;}catch(e){out.erreurLignes=String(e.message||e);}
    try{out.colonnes=(EUC_ENT_grist('get','/tables/'+encodeURIComponent(id)+'/columns').columns||[]).map(function(c){return c.id;});}catch(e){out.erreurColonnes=String(e.message||e);}
    return out;
  });
  return {version:'Eucalyptus PFMP — v1.0.0-dev.32',environment:cfg.EUC_ENT_ENVIRONMENT||'',gristUrl:cfg.EUC_ENT_GRIST_API_URL||'',docId:cfg.EUC_ENT_GRIST_DOC_ID||'',tables:details};
}

function EUC_PFMP_afficherDiagnosticReferentiel() {
  var d=EUC_PFMP_diagnostiquerReferentielCourant_();
  var rows=d.tables.map(function(t){return '<tr><td>'+EUC_PFMP_diagEsc_(t.table)+'</td><td>'+(t.presente?'✅ Oui':'❌ Non')+'</td><td>'+(t.lignes===null?'—':t.lignes)+'</td><td>'+EUC_PFMP_diagEsc_((t.colonnes||[]).join(', '))+'</td></tr>';}).join('');
  var html='<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:32px;color:#153b34}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd9d4;padding:8px;vertical-align:top}th{background:#eef6f2}code{background:#f5f5f5;padding:2px 4px}</style></head><body><h1>Diagnostic référentiel PFMP</h1><p>Version : <code>'+EUC_PFMP_diagEsc_(d.version)+'</code></p><p>Environnement : <code>'+EUC_PFMP_diagEsc_(d.environment)+'</code> — Document Grist : <code>'+EUC_PFMP_diagEsc_(d.docId)+'</code></p><table><thead><tr><th>Table</th><th>Présente</th><th>Lignes</th><th>Colonnes</th></tr></thead><tbody>'+rows+'</tbody></table></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Diagnostic PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_PFMP_diagEsc_(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
