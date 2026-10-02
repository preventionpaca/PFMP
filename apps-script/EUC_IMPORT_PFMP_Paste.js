/** Eucalyptus PFMP — v1.0.0-dev.34 — import Pronote par copier-coller, DRY_RUN. */
function EUC_IMPORT_previsualiserTexte(payload){
  var ctx=EUC_SUIVI_contexteCourant_();
  if(!ctx.autorise||['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role)<0) throw new Error('Accès non autorisé.');
  payload=payload||{};
  var texte=String(payload.texte||'');
  if(!texte.trim()) throw new Error('Aucune donnée Pronote collée.');
  if(texte.length>2000000) throw new Error('Copier-coller trop volumineux.');
  var parsed=EUC_IMPORT_analyserTexte_(texte,{annee:payload.annee});
  parsed.encoding='COPIER_COLLER';
  parsed.empreinte=EUC_SUIVI_octetsHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,Utilities.newBlob(texte,'text/plain').getBytes()));
  var existing=[];
  try{
    existing=EUC_SUIVI_fields_(EUC_SUIVI_sqlLecture_("SELECT e.*,a.Code AS Annee_code FROM EUC_ELEVES_PFMP e JOIN Annees_Scolaires a ON a.id=e.Annee_scolaire WHERE a.Code=?",[parsed.annee]));
  }catch(e){ existing=[]; }
  var offers=[];
  try{ offers=EUC_SUIVI_fields_(EUC_ENT_grist('get','/tables/EUC_OFFRES_FORMATION/records')); }catch(e2){ offers=[]; }
  var imports=[];
  try{ imports=EUC_SUIVI_fields_(EUC_ENT_grist('get','/tables/EUC_IMPORTS_PRONOTE_PFMP/records')); }catch(e3){ imports=[]; }
  return EUC_IMPORT_previsualiser_(parsed,existing,offers,imports);
}

function EUC_IMPORT_confirmerSimulationTexte(payload){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)) throw new Error('Un autre import est déjà en cours.');
  try{
    if(!payload||payload.confirmation!=='CONFIRMER_IMPORT') throw new Error('Validation humaine explicite obligatoire.');
    var mode=PropertiesService.getScriptProperties().getProperty('EUC_PFMP_PRONOTE_IMPORT_MODE')||'DRY_RUN';
    if(mode!=='DRY_RUN') throw new Error('Import réel non autorisé dans cette version.');
    var preview=EUC_IMPORT_previsualiserTexte(payload);
    if(!preview.pretAValider) throw new Error(preview.dejaImporte?'Copier-coller identique déjà importé.':'Prévisualisation bloquée par des anomalies.');
    return {statut:'SIMULATION',mode:'DRY_RUN',ecriture:false,empreinte:preview.empreinte,compteurs:preview.compteurs};
  } finally { lock.releaseLock(); }
}
