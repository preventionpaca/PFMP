/** Eucalyptus PFMP — v1.0.0-dev.57 — extension copier-coller Pronote. */
function EUC_IMPORT_exigerAdminTexte_(){
  var ctx=EUC_PFMP_contexteAdmin_();
  if(!ctx||!ctx.autorise||['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role)<0) throw new Error('Accès non autorisé.');
  return ctx;
}
function EUC_IMPORT_chargerDonneesPreviewTexte_(annee){
  var existing=[],offers=[],imports=[];
  try{existing=EUC_SUIVI_fields_(EUC_SUIVI_sqlLecture_("SELECT e.*,a.Code AS Annee_code FROM EUC_ELEVES_PFMP e JOIN Annees_Scolaires a ON a.id=e.Annee_scolaire WHERE a.Code=?",[annee]));}catch(e){}
  try{offers=EUC_SUIVI_fields_(EUC_ENT_grist('get','/tables/EUC_OFFRES_FORMATION/records'));}catch(e){}
  try{imports=EUC_SUIVI_fields_(EUC_ENT_grist('get','/tables/EUC_IMPORTS_PRONOTE_PFMP/records'));}catch(e){}
  return {existing:existing,offers:offers,imports:imports};
}
function EUC_IMPORT_previsualiserTexte(payload){
  EUC_IMPORT_exigerAdminTexte_();
  payload=payload||{};
  var texte=String(payload.texte||'');
  if(!texte.trim()) throw new Error('Aucune donnée Pronote collée.');
  var parsed=EUC_IMPORT_analyserTexte_(texte,{annee:payload.annee});
  parsed.encoding='COPIER_COLLER';
  parsed.empreinte=EUC_IMPORT_empreinte_(Utilities.newBlob(texte,'text/plain').getBytes());
  var d=EUC_IMPORT_chargerDonneesPreviewTexte_(parsed.annee);
  return EUC_IMPORT_previsualiser_(parsed,d.existing,d.offers,d.imports);
}
function EUC_IMPORT_confirmerSimulationTexte(payload){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)) throw new Error('Un autre import est déjà en cours.');
  try{
    EUC_IMPORT_exigerAdminTexte_();
    if(!payload||payload.confirmation!=='CONFIRMER_IMPORT') throw new Error('Validation humaine explicite obligatoire.');
    var mode=PropertiesService.getScriptProperties().getProperty('EUC_PFMP_PRONOTE_IMPORT_MODE')||'DRY_RUN';
    if(mode!=='DRY_RUN') throw new Error('Import réel non autorisé dans cette version.');
    var preview=EUC_IMPORT_previsualiserTexte(payload);
    if(!preview.pretAValider) throw new Error(preview.dejaImporte?'Fichier identique déjà importé.':'Prévisualisation bloquée par des anomalies.');
    return {statut:'SIMULATION',mode:'DRY_RUN',ecriture:false,empreinte:preview.empreinte,compteurs:preview.compteurs};
  } finally {
    lock.releaseLock();
  }
}
