/**
 * PFMP — DEV448 — affectations professeur en lot.
 *
 * Le chemin historique effectuait une écriture Grist par élève puis
 * reconstruisait synchroniquement tous les snapshots de la famille. Ce
 * module limite une affectation à des lectures ciblées et deux écritures
 * métier au maximum (PATCH + POST), puis met à jour le seul détail concerné.
 */
var EUC_DEV448_VERSION_='1.2.0-dev.448';
var EUC_DEV448_ASSIGN_TABLE_='EUC_AFFECTATIONS_SUIVI_PFMP';
var EUC_DEV448_PROF_TABLE_='EUC_PROFESSEURS_PFMP';
var EUC_DEV448_PROF_CACHE_='EUC_DEV448_PROFESSEURS_V1';
var EUC_DEV448_SNAPSHOT_HANDLER_='EUC_DEV424_refreshScheduled';
var EUC_DEV448_SNAPSHOT_PAUSE_PROP_='EUC_DEV448_SNAPSHOT_PAUSE_V1';

function EUC_DEV448_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV448_n_(v){var n=Number(v);return isFinite(n)?n:0;}
function EUC_DEV448_assertEmergencyAdmin_(){
  var email='';
  try{email=EUC_DEV448_t_(Session.getActiveUser().getEmail()).toLowerCase();}catch(e){}
  var allow=[];
  try{allow=EUC_DEV448_t_(PropertiesService.getScriptProperties().getProperty('EUC_PFMP_ADMIN_EMAILS')).split(/[;,\n]/).map(function(x){return EUC_DEV448_t_(x).toLowerCase();}).filter(Boolean);}catch(e2){}
  if(!email||allow.indexOf(email)<0)throw new Error('Accès administrateur requis.');
  return email;
}
function EUC_DEV448_snapshotTriggerStatus(){
  var email=EUC_DEV448_assertEmergencyAdmin_(),items=[],pause={};
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()===EUC_DEV448_SNAPSHOT_HANDLER_)items.push({handler:t.getHandlerFunction(),source:String(t.getTriggerSource&&t.getTriggerSource()||''),eventType:String(t.getEventType&&t.getEventType()||'')});
  });
  try{pause=JSON.parse(PropertiesService.getScriptProperties().getProperty(EUC_DEV448_SNAPSHOT_PAUSE_PROP_)||'{}')||{};}catch(e){pause={};}
  return{ok:true,admin:email,handler:EUC_DEV448_SNAPSHOT_HANDLER_,triggerCount:items.length,triggers:items,pause:pause};
}
function EUC_DEV448_pauseSnapshotTrigger(reason){
  var email=EUC_DEV448_assertEmergencyAdmin_(),removed=0;
  ScriptApp.getProjectTriggers().forEach(function(t){if(t.getHandlerFunction()===EUC_DEV448_SNAPSHOT_HANDLER_){ScriptApp.deleteTrigger(t);removed++;}});
  var state={paused:true,pausedAt:new Date().toISOString(),pausedBy:email,reason:EUC_DEV448_t_(reason).slice(0,180),removed:removed};
  PropertiesService.getScriptProperties().setProperty(EUC_DEV448_SNAPSHOT_PAUSE_PROP_,JSON.stringify(state));
  return{ok:true,handler:EUC_DEV448_SNAPSHOT_HANDLER_,removed:removed,state:state};
}
function EUC_DEV448_restoreSnapshotTrigger(){
  EUC_DEV448_assertEmergencyAdmin_();
  ScriptApp.getProjectTriggers().forEach(function(t){if(t.getHandlerFunction()===EUC_DEV448_SNAPSHOT_HANDLER_)ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger(EUC_DEV448_SNAPSHOT_HANDLER_).timeBased().everyMinutes(15).create();
  PropertiesService.getScriptProperties().deleteProperty(EUC_DEV448_SNAPSHOT_PAUSE_PROP_);
  return EUC_DEV448_snapshotTriggerStatus();
}
function EUC_DEV448_autoPauseOnGristError_(err){
  var message=String(err&&err.message||err||'');
  if(!/(?:Grist API\s*429|Exceeded daily limit|Too many backlogged requests)/i.test(message))return false;
  var removed=0;
  try{ScriptApp.getProjectTriggers().forEach(function(t){if(t.getHandlerFunction()===EUC_DEV448_SNAPSHOT_HANDLER_){ScriptApp.deleteTrigger(t);removed++;}});}catch(e){}
  try{PropertiesService.getScriptProperties().setProperty(EUC_DEV448_SNAPSHOT_PAUSE_PROP_,JSON.stringify({paused:true,automatic:true,pausedAt:new Date().toISOString(),reason:message.slice(0,180),removed:removed}));}catch(e2){}
  return true;
}
function EUC_DEV448_ref_(v){
  if(Array.isArray(v))return EUC_DEV448_n_(v.length>1?v[1]:v[0]);
  return EUC_DEV448_n_(v);
}
function EUC_DEV448_rows_(table,filter){
  var path='/tables/'+encodeURIComponent(table)+'/records?filter='+encodeURIComponent(JSON.stringify(filter||{}));
  var result=EUC_ENT_grist('get',path)||{};
  return(result.records||[]).map(function(r){var f=r.fields||{};f.id=EUC_DEV448_n_(r.id);return f;});
}
function EUC_DEV448_family_(v){
  var f=EUC_DEV448_t_(v).toUpperCase().replace(/[^A-Z0-9]+/g,'');
  if(f==='BACPRO'||f==='BACPROFESSIONNEL')return'BACPRO';
  if(f==='BTS')return'BTS';
  if(f==='CAP')return'CAP';
  return'';
}
function EUC_DEV448_professeurs_(){
  var cache=CacheService.getScriptCache(),raw='';
  try{raw=cache.get(EUC_DEV448_PROF_CACHE_)||'';}catch(e){}
  if(raw){try{return JSON.parse(raw)||[];}catch(e2){}}
  var rows=EUC_DEV448_rows_(EUC_DEV448_PROF_TABLE_,{Actif:[true]}).filter(function(p){return p.Actif!==false;}).map(function(p){
    return{id:EUC_DEV448_n_(p.id),nom:[p.Civilite,p.Prenom,p.Nom].filter(Boolean).join(' ').trim(),email:EUC_DEV448_t_(p.Email),discipline:EUC_DEV448_t_(p.Discipline)};
  }).filter(function(p){return p.id&&p.nom;}).sort(function(a,b){return a.nom.localeCompare(b.nom,'fr');});
  try{cache.put(EUC_DEV448_PROF_CACHE_,JSON.stringify(rows),21600);}catch(e3){}
  return rows;
}
function EUC_DEV435_professeursDisponibles(){
  var ctx=typeof EUC_V156_contexteAdmin_==='function'?EUC_V156_contexteAdmin_():null;
  if(!ctx)throw new Error('Accès administrateur requis.');
  return{ok:true,version:EUC_DEV448_VERSION_,professeurs:EUC_DEV448_professeurs_()};
}
function EUC_DEV448_professeur_(id){
  id=EUC_DEV448_n_(id);
  var p=EUC_DEV448_professeurs_().filter(function(x){return x.id===id;})[0];
  if(!p)throw new Error('Professeur introuvable ou inactif.');
  return p;
}
function EUC_DEV448_detailRecord_(annee,famille,classeId,periodeId){
  annee=EUC_DEV448_t_(annee);famille=EUC_DEV448_family_(famille);classeId=EUC_DEV448_n_(classeId);periodeId=EUC_DEV448_n_(periodeId);
  if(!annee||!famille||!classeId||!periodeId)throw new Error('Contexte classe / période incomplet.');
  var prefix=typeof EUC_DEV427_DETAIL_PREFIX_==='string'?EUC_DEV427_DETAIL_PREFIX_:'__DEV427_DETAIL__';
  var table=typeof EUC_DEV190E_INDEX_TABLE_==='string'?EUC_DEV190E_INDEX_TABLE_:'EUC_SUIVI_PFMP_INDEX';
  var tech=prefix+famille+'_'+classeId+'_'+periodeId;
  var rows=EUC_DEV448_rows_(table,{Annee_scolaire:[annee],Famille:[tech],Actif:[true]}).filter(function(r){return r.Actif!==false;});
  rows.sort(function(a,b){return(Date.parse(b.Updated_at||'')||0)-(Date.parse(a.Updated_at||'')||0)||(EUC_DEV448_n_(b.id)-EUC_DEV448_n_(a.id));});
  /* Un snapshot peut manquer juste après une modification métier ou pendant
   * une pause de maintenance. L'affectation ne doit pas reconstruire toute
   * la famille : elle relit uniquement le détail demandé, déjà mis en cache
   * par l'ouverture de la page dans le cas courant. */
  if(!rows.length){
    var live=null;
    try{
      if(typeof EUC_DEV416_finalDetail_==='function')live=EUC_DEV416_finalDetail_(annee,famille,classeId,periodeId);
      else if(typeof EUC_DEV356_detail_==='function')live=EUC_DEV356_detail_(annee,famille,classeId,periodeId);
    }catch(eLive){}
    if(!live||!Array.isArray(live.lignes))throw new Error('Détail de classe momentanément indisponible. Rechargez la page puis réessayez.');
    return{table:'',row:null,detail:live,famille:famille,temporary:true};
  }
  var detail=null;try{detail=JSON.parse(rows[0].Payload_JSON||'{}');}catch(e){throw new Error('Détail de classe illisible.');}
  return{table:table,row:rows[0],detail:detail||{},famille:famille};
}
function EUC_DEV448_allowed_(record,ids){
  var allowed={};((record&&record.detail&&record.detail.lignes)||[]).forEach(function(x){allowed[EUC_DEV448_n_(x.eleveId)]=true;});
  if((ids||[]).some(function(id){return!allowed[EUC_DEV448_n_(id)];}))throw new Error('Un élève est hors de la classe ou de la période autorisée.');
  return true;
}
function EUC_DEV448_allowedIds_(allowedIds,ids){
  var allowed={};(allowedIds||[]).forEach(function(id){allowed[EUC_DEV448_n_(id)]=true;});
  if((ids||[]).some(function(id){return!allowed[EUC_DEV448_n_(id)];}))throw new Error('Un élève est hors de la classe ou de la période autorisée.');
  return true;
}
function EUC_DEV448_ppScopeCacheKey_(access){return'EUC_DEV448_PP_SCOPE_'+EUC_DEV448_n_(access&&access.id);}
function EUC_DEV448_cacheAllowed_(access,record){
  var ids=((record&&record.detail&&record.detail.lignes)||[]).map(function(x){return EUC_DEV448_n_(x.eleveId);}).filter(Boolean);
  try{CacheService.getScriptCache().put(EUC_DEV448_ppScopeCacheKey_(access),JSON.stringify(ids),21600);}catch(e){}
  return ids;
}
function EUC_DEV448_cachedAllowed_(access){
  var raw='';try{raw=CacheService.getScriptCache().get(EUC_DEV448_ppScopeCacheKey_(access))||'';}catch(e){}
  if(!raw)return null;try{return JSON.parse(raw)||[];}catch(e2){return null;}
}
function EUC_DEV448_existing_(annee,classeId,periodeId,type){
  return EUC_DEV448_rows_(EUC_DEV448_ASSIGN_TABLE_,{Annee_scolaire:[annee],Classe:[classeId],Periode:[periodeId],Type_suivi:[type],Actif:[true]}).filter(function(r){
    return r.Actif!==false&&EUC_DEV448_t_(r.Annee_scolaire)===annee&&EUC_DEV448_ref_(r.Classe)===classeId&&EUC_DEV448_ref_(r.Periode)===periodeId&&EUC_DEV448_t_(r.Type_suivi).toUpperCase()===type;
  });
}
function EUC_DEV448_applyDetail_(record,type,prof,ids,assignmentIds){
  var selected={};(ids||[]).forEach(function(id){selected[EUC_DEV448_n_(id)]=true;});
  ((record.detail&&record.detail.lignes)||[]).forEach(function(x){
    var id=EUC_DEV448_n_(x.eleveId);if(!selected[id])return;
    if(type==='TELEPHONE'){
      x.professeurTelephone=prof.nom;x.professeurTelephoneId=prof.id;
      if(assignmentIds[id])x.affectationTelephoneId=assignmentIds[id];
    }else{
      x.professeurVisiteur=prof.nom;x.professeurVisiteurId=prof.id;
      if(assignmentIds[id])x.affectationVisiteId=assignmentIds[id];
    }
  });
  var warning='';
  if(record.table&&record.row&&record.row.id){
    try{
      EUC_ENT_grist('patch','/tables/'+encodeURIComponent(record.table)+'/records',{records:[{id:EUC_DEV448_n_(record.row.id),fields:{Payload_JSON:JSON.stringify(record.detail),Updated_at:new Date().toISOString()}}]});
    }catch(e){warning='Affectation enregistrée ; le snapshot sera resynchronisé ultérieurement.';}
  }else{
    warning='Affectation enregistrée ; l’affichage sera actualisé au prochain chargement.';
  }
  try{
    if(typeof EUC_DEV416_key_==='function'&&typeof EUC_DEV416_cachePut_==='function')EUC_DEV416_cachePut_(EUC_DEV416_key_(EUC_DEV448_t_(record.detail.annee),record.famille,EUC_DEV448_n_(record.detail.classe&&record.detail.classe.id),EUC_DEV448_n_(record.detail.periode&&record.detail.periode.id)),record.detail);
  }catch(e2){}
  return warning;
}
function EUC_DEV448_core_(q,actor){
  q=q||{};var started=Date.now(),annee=EUC_DEV448_t_(q.annee),famille=EUC_DEV448_family_(q.famille),classeId=EUC_DEV448_n_(q.classeId),periodeId=EUC_DEV448_n_(q.periodeId),type=EUC_DEV448_t_(q.type).toUpperCase(),profId=EUC_DEV448_n_(q.profId),ids=(q.eleveIds||[]).map(EUC_DEV448_n_).filter(function(x,i,a){return x>0&&a.indexOf(x)===i;});
  if(!annee||!famille||!classeId||!periodeId)throw new Error('Contexte classe / période incomplet.');
  if(['TELEPHONE','VISITE'].indexOf(type)<0)throw new Error('Type de suivi invalide.');
  if(!profId)throw new Error('Professeur invalide.');
  if(!ids.length)throw new Error('Aucun élève sélectionné.');
  if(ids.length>100)throw new Error('Sélection trop importante : 100 élèves maximum.');
  if(typeof EUC_DEV424_assertTarget_==='function')EUC_DEV424_assertTarget_();
  var lock=LockService.getScriptLock();if(!lock.tryLock(3000))throw new Error('Une autre affectation est en cours. Réessayez dans quelques secondes.');
  try{
    var record=null;
    if(Array.isArray(q._allowedIds))EUC_DEV448_allowedIds_(q._allowedIds,ids);
    else{record=q._detailRecord||EUC_DEV448_detailRecord_(annee,famille,classeId,periodeId);EUC_DEV448_allowed_(record,ids);}
    var prof=q._professeur||EUC_DEV448_professeur_(profId),existing=EUC_DEV448_existing_(annee,classeId,periodeId,type),byStudent={};
    existing.forEach(function(r){byStudent[EUC_DEV448_ref_(r.Eleve)]=r;});
    var now=new Date().toISOString(),patches=[],posts=[],assignmentIds={};
    ids.forEach(function(eid){var ex=byStudent[eid],fields={Annee_scolaire:annee,Classe:classeId,Periode:periodeId,Eleve:eid,Type_suivi:type,Professeur:prof.id,Nom_professeur_snapshot:prof.nom,Email_professeur_snapshot:prof.email,Date_affectation:now,Affecte_par:EUC_DEV448_t_(actor),Actif:true,Date_modification:now};if(ex){patches.push({id:EUC_DEV448_n_(ex.id),fields:fields});assignmentIds[eid]=EUC_DEV448_n_(ex.id);}else posts.push({fields:fields,_eleveId:eid});});
    if(patches.length)EUC_ENT_grist('patch','/tables/'+EUC_DEV448_ASSIGN_TABLE_+'/records',{records:patches});
    if(posts.length){var created=EUC_ENT_grist('post','/tables/'+EUC_DEV448_ASSIGN_TABLE_+'/records',{records:posts.map(function(x){return{fields:x.fields};})}),createdRows=created&&created.records||[];posts.forEach(function(x,i){if(createdRows[i])assignmentIds[x._eleveId]=EUC_DEV448_n_(createdRows[i].id);});}
    var warning=record&&!q._skipDetailWrite?EUC_DEV448_applyDetail_(record,type,prof,ids,assignmentIds):'';
    return{ok:true,version:EUC_DEV448_VERSION_,type:type,professeur:prof,eleveIds:ids,modifies:patches.length,crees:posts.length,durationMs:Date.now()-started,warning:warning};
  }finally{lock.releaseLock();}
}
function EUC_DEV448_affecterAdmin(q){
  var ctx=EUC_V156_contexteAdmin_();if(!ctx)throw new Error('Accès administrateur requis.');
  q=q||{};
  return EUC_DEV448_core_({annee:q.annee,famille:q.famille,classeId:q.classeId,periodeId:q.periodeId,type:q.type,profId:q.profId,eleveIds:q.eleveIds,_allowedIds:q.scopeIds||[],_skipDetailWrite:true},EUC_DEV448_t_(ctx.email)||'ADMIN');
}
function EUC_DEV448_lookupPp_(code){
  var canonical=EUC_DEV441_codeCanon_(code);if(canonical.length<16)throw new Error('Code invalide.');
  var rows=EUC_DEV448_rows_(EUC_DEV441_PP_TABLE_,{Actif:[true]}),now=Date.now(),row=rows.filter(function(r){return r.Actif!==false&&EUC_DEV441_codeHash_(canonical,r.Code_salt)===EUC_DEV448_t_(r.Code_hash);})[0];
  if(!row)throw new Error('Code inconnu ou révoqué.');
  if((Date.parse(row.Expiration||'')||0)<now)throw new Error('Ce code a expiré.');
  return row;
}
function EUC_DEV448_assertPpScope_(access,q){
  q=q||{};if(q.annee&&EUC_DEV448_t_(access.Annee_scolaire)!==EUC_DEV448_t_(q.annee))throw new Error('Ce code appartient à une autre année.');
  if(q.classeId&&EUC_DEV448_n_(access.Classe_id)!==EUC_DEV448_n_(q.classeId))throw new Error('Ce code appartient à une autre classe.');
  if(q.periodeId&&EUC_DEV448_n_(access.Periode_id)!==EUC_DEV448_n_(q.periodeId))throw new Error('Ce code appartient à une autre période.');
}
function EUC_DEV448_scope_(access,record){
  var annee=EUC_DEV448_t_(access.Annee_scolaire),classeId=EUC_DEV448_n_(access.Classe_id),periodeId=EUC_DEV448_n_(access.Periode_id),assignments=EUC_DEV448_rows_(EUC_DEV448_ASSIGN_TABLE_,{Annee_scolaire:[annee],Classe:[classeId],Periode:[periodeId],Actif:[true]}),by={};
  assignments.forEach(function(a){if(a.Actif===false)return;var id=EUC_DEV448_ref_(a.Eleve),type=EUC_DEV448_t_(a.Type_suivi).toUpperCase();if(id&&type)by[id+'|'+type]=a;});
  var lignes=((record.detail&&record.detail.lignes)||[]).map(function(x){var id=EUC_DEV448_n_(x.eleveId),tel=by[id+'|TELEPHONE'],vis=by[id+'|VISITE'];return{eleveId:id,eleve:[x.nom,x.prenom].filter(Boolean).join(' '),statut:EUC_DEV448_t_(x.statut),telephone:tel?EUC_DEV448_t_(tel.Nom_professeur_snapshot):EUC_DEV448_t_(x.professeurTelephone),visite:vis?EUC_DEV448_t_(vis.Nom_professeur_snapshot):EUC_DEV448_t_(x.professeurVisiteur)};});
  return{ok:true,version:EUC_DEV448_VERSION_,scope:{annee:annee,famille:EUC_DEV448_family_(access.Famille),classeId:classeId,classe:EUC_DEV448_t_(access.Classe_nom),periodeId:periodeId,periode:EUC_DEV448_t_(access.Periode_libelle),expiration:EUC_DEV448_t_(access.Expiration),professeurPrincipal:EUC_DEV448_t_(access.Professeur_nom)},professeurs:EUC_DEV448_professeurs_(),lignes:lignes};
}
function EUC_DEV448_unlockPp(q){
  q=q||{};var started=Date.now(),access=EUC_DEV448_lookupPp_(q.code);EUC_DEV448_assertPpScope_(access,q);
  var record=EUC_DEV448_detailRecord_(access.Annee_scolaire,access.Famille,access.Classe_id,access.Periode_id);EUC_DEV448_cacheAllowed_(access,record);
  var result=EUC_DEV448_scope_(access,record);result.durationMs=Date.now()-started;return result;
}
function EUC_DEV448_affecterPp(q){
  q=q||{};var access=EUC_DEV448_lookupPp_(q.code);EUC_DEV448_assertPpScope_(access,q);
  var allowed=EUC_DEV448_cachedAllowed_(access);
  if(!allowed){var record=EUC_DEV448_detailRecord_(access.Annee_scolaire,access.Famille,access.Classe_id,access.Periode_id);allowed=EUC_DEV448_cacheAllowed_(access,record);}
  var scoped={annee:EUC_DEV448_t_(access.Annee_scolaire),famille:EUC_DEV448_family_(access.Famille),classeId:EUC_DEV448_n_(access.Classe_id),periodeId:EUC_DEV448_n_(access.Periode_id),type:q.type,profId:q.profId,eleveIds:q.eleveIds,_allowedIds:allowed,_skipDetailWrite:true};
  return EUC_DEV448_core_(scoped,'PP_TEMP:'+EUC_DEV448_n_(access.Professeur_id));
}
