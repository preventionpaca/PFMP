/** Eucalyptus PFMP — v1.0.0-dev.58 — copier-coller Pronote + correspondance classes Camin. */
function EUC_IMPORT_exigerAdminTexte_(){
  var ctx=EUC_PFMP_contexteAdmin_();
  if(!ctx||!ctx.autorise||['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role)<0) throw new Error('Accès non autorisé.');
  return ctx;
}
function EUC_IMPORT_lireRecords_(table){
  try{return EUC_SUIVI_fields_(EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/records'));}catch(e){return [];}
}
function EUC_IMPORT_chargerClassesCamin_(){
  return EUC_IMPORT_lireRecords_('Classes').map(function(r){
    return {id:r.id||r.ID||'',nom:String(r.Nom||r.Libelle||'').trim(),libelle:String(r.Libelle||r.Nom||'').trim(),formation:String(r.Formation||'').trim(),niveau:String(r.Niveau||'').trim(),actif:r.Actif!==false};
  }).filter(function(r){return r.nom;});
}
function EUC_IMPORT_chargerCorrespondances_(annee){
  return EUC_IMPORT_lireRecords_('EUC_CORRESPONDANCE_CLASSES_PRONOTE').filter(function(r){
    return r.Actif!==false&&(!r.Annee_scolaire||String(r.Annee_scolaire)===String(annee));
  }).map(function(r){return {pronote:String(r.Nom_classe_Pronote||'').trim(),classeId:r.Classe_Grist||'',classeNom:String(r.Classe_Grist_nom||r.Classe_Grist_libelle||'').trim()};});
}
function EUC_IMPORT_indexerCorrespondances_(classes,mappingsPersistes,mappingsTemporaires){
  var byId={},byNom={},map={};
  (classes||[]).forEach(function(c){byId[String(c.id)]=c;byNom[String(c.nom).toUpperCase()]=c;byNom[String(c.libelle).toUpperCase()]=c;});
  function add(pronote,idOrNom){
    var key=String(pronote||'').trim().toUpperCase();if(!key)return;
    var c=byId[String(idOrNom)]||byNom[String(idOrNom||'').trim().toUpperCase()];if(c&&c.actif)map[key]=c;
  }
  (mappingsPersistes||[]).forEach(function(m){add(m.pronote,m.classeId||m.classeNom);});
  Object.keys(mappingsTemporaires||{}).forEach(function(k){add(k,mappingsTemporaires[k]);});
  (classes||[]).forEach(function(c){if(c.actif){var k=String(c.nom).toUpperCase();if(!map[k])map[k]=c;var l=String(c.libelle).toUpperCase();if(!map[l])map[l]=c;}});
  return map;
}
function EUC_IMPORT_preparerClasses_(parsed,classes,mappingsPersistes,mappingsTemporaires){
  var index=EUC_IMPORT_indexerCorrespondances_(classes,mappingsPersistes,mappingsTemporaires),stats={},inconnues={};
  parsed.rows.forEach(function(r){var original=String(r.classe||'').trim();r.classePronote=original;if(!original){return;}stats[original]=(stats[original]||0)+1;var c=index[original.toUpperCase()];if(c){r.classe=c.nom;r.classeGristId=c.id;}else{inconnues[original]=(inconnues[original]||0)+1;r.classe='__NON_CORRESPONDUE__'+original;}});
  return {classesPronote:Object.keys(stats).sort(function(a,b){return a.localeCompare(b,'fr');}).map(function(n){var c=index[n.toUpperCase()];return {pronote:n,effectif:stats[n],correspondue:!!c,classeGristId:c?c.id:'',classeGristNom:c?c.nom:''};}),inconnues:Object.keys(inconnues).sort(function(a,b){return a.localeCompare(b,'fr');}).map(function(n){return {pronote:n,effectif:inconnues[n]};})};
}
function EUC_IMPORT_chargerDonneesPreviewTexte_(annee){
  var existing=[],imports=[];
  try{existing=EUC_SUIVI_fields_(EUC_SUIVI_sqlLecture_("SELECT e.*,a.Code AS Annee_code FROM EUC_ELEVES_PFMP e JOIN Annees_Scolaires a ON a.id=e.Annee_scolaire WHERE a.Code=?",[annee]));}catch(e){}
  try{imports=EUC_SUIVI_fields_(EUC_ENT_grist('get','/tables/EUC_IMPORTS_PRONOTE_PFMP/records'));}catch(e){}
  return {existing:existing,imports:imports,classes:EUC_IMPORT_chargerClassesCamin_(),correspondances:EUC_IMPORT_chargerCorrespondances_(annee)};
}
function EUC_IMPORT_previsualiserTexte(payload){
  EUC_IMPORT_exigerAdminTexte_();payload=payload||{};
  var texte=String(payload.texte||'');if(!texte.trim()) throw new Error('Aucune donnée Pronote collée.');
  var parsed=EUC_IMPORT_analyserTexte_(texte,{annee:payload.annee});parsed.encoding='COPIER_COLLER';parsed.empreinte=EUC_IMPORT_empreinte_(Utilities.newBlob(texte,'text/plain').getBytes());
  var d=EUC_IMPORT_chargerDonneesPreviewTexte_(parsed.annee),corr=EUC_IMPORT_preparerClasses_(parsed,d.classes,d.correspondances,payload.correspondances||{}),offers=d.classes.filter(function(c){return c.actif;}).map(function(c){return {Code_classe:c.nom,Actif:true,Afficher_formulaire_PFMP:true};}),preview=EUC_IMPORT_previsualiser_(parsed,d.existing,offers,d.imports);
  preview.classesCamin=d.classes.filter(function(c){return c.actif;});preview.classesPronote=corr.classesPronote;preview.classesInconnues=corr.inconnues;preview.tableCorrespondancePresente=d.correspondances.length>0;preview.correspondancesTemporaires=true;preview.compteurs.classesInconnues=corr.inconnues.length;
  preview.pretAValider=preview.pretAValider&&corr.inconnues.length===0;
  return preview;
}
function EUC_IMPORT_confirmerSimulationTexte(payload){
  var lock=LockService.getScriptLock();if(!lock.tryLock(1000)) throw new Error('Un autre import est déjà en cours.');
  try{EUC_IMPORT_exigerAdminTexte_();if(!payload||payload.confirmation!=='CONFIRMER_IMPORT') throw new Error('Validation humaine explicite obligatoire.');var mode=PropertiesService.getScriptProperties().getProperty('EUC_PFMP_PRONOTE_IMPORT_MODE')||'DRY_RUN';if(mode!=='DRY_RUN') throw new Error('Import réel non autorisé dans cette version.');var preview=EUC_IMPORT_previsualiserTexte(payload);if(!preview.pretAValider) throw new Error(preview.dejaImporte?'Fichier identique déjà importé.':'Prévisualisation bloquée par des anomalies ou classes non correspondantes.');return {statut:'SIMULATION',mode:'DRY_RUN',ecriture:false,empreinte:preview.empreinte,compteurs:preview.compteurs};}finally{lock.releaseLock();}
}
