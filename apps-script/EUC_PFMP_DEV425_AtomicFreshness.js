/**
 * PFMP — DEV425
 * Publication atomique des snapshots et reconstruction après mutation.
 *
 * L'état de fraîcheur est conservé dans EUC_SUIVI_PFMP_INDEX, sous une
 * famille technique. Une révision DIRTY interdit toute lecture de l'ancien
 * payload. La révision READY n'est publiée qu'après les détails et l'index.
 */
var EUC_DEV425_VERSION_='1.0.3-dev.426';
var EUC_DEV425_STATE_PREFIX_='__DEV425_STATE__';
var EUC_DEV425_STATE_TTL_=21600;
var EUC_DEV425_FAMILIES_=['BACPRO','BTS','CAP'];
var EUC_DEV426_STATE_PROP_PREFIX_='EUC_DEV426_STATE_';
var EUC_DEV426_RECOVERY_PROP_PREFIX_='EUC_DEV426_RECOVERY_';
var EUC_DEV426_RECOVERY_BATCH_SIZE_=6;

function EUC_DEV425_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV425_family_(v){
  var f=EUC_DEV425_txt_(v).toUpperCase().replace(/[^A-Z0-9]+/g,'');
  if(f==='BACPRO'||f==='BACPROFESSIONNEL')return 'BACPRO';
  if(f==='BTS')return 'BTS';
  if(f==='CAP')return 'CAP';
  return '';
}
function EUC_DEV425_stateFamily_(famille){return EUC_DEV425_STATE_PREFIX_+EUC_DEV425_family_(famille);}
function EUC_DEV425_stateKey_(annee,famille){return 'DEV425_STATE_'+EUC_DEV425_txt_(annee)+'_'+EUC_DEV425_family_(famille);}
function EUC_DEV426_statePropKey_(annee,famille){return EUC_DEV426_STATE_PROP_PREFIX_+EUC_DEV425_txt_(annee)+'_'+EUC_DEV425_family_(famille);}
function EUC_DEV426_recoveryPropKey_(annee,famille){return EUC_DEV426_RECOVERY_PROP_PREFIX_+EUC_DEV425_txt_(annee)+'_'+EUC_DEV425_family_(famille);}
function EUC_DEV425_revision_(){
  var suffix='';try{suffix=Utilities.getUuid().replace(/-/g,'').slice(0,12);}catch(e){suffix=String(Math.random()).slice(2,14);}
  return Date.now().toString(36)+'-'+suffix;
}
function EUC_DEV425_clone_(v){return JSON.parse(JSON.stringify(v||{}));}

function EUC_DEV425_readState_(annee,famille){
  annee=EUC_DEV425_txt_(annee);famille=EUC_DEV425_family_(famille);
  if(!annee||!famille)return null;
  var cache=CacheService.getScriptCache(),key=EUC_DEV425_stateKey_(annee,famille),raw=null;
  try{raw=cache.get(key);}catch(e){}
  if(raw){try{return JSON.parse(raw);}catch(e2){}}
  /* Un pointeur minuscule et partagé évite une lecture Grist supplémentaire
   * à chaque requête lorsque le cache Apps Script a expiré. Toutes les
   * écritures d'état passent par EUC_DEV425_writeState_, donc ce miroir ne
   * peut pas rester READY pendant qu'une mutation est DIRTY. */
  try{raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV426_statePropKey_(annee,famille));}catch(e3){raw=null;}
  if(raw){
    try{
      var mirrored=JSON.parse(raw);
      cache.put(key,raw,EUC_DEV425_STATE_TTL_);
      return mirrored;
    }catch(e4){}
  }
  var rows=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{
    Annee_scolaire:[annee],Famille:[EUC_DEV425_stateFamily_(famille)]
  }).filter(function(r){return (r.fields||{}).Actif!==false;}).sort(function(a,b){
    var d=(Date.parse((b.fields||{}).Updated_at||'')||0)-(Date.parse((a.fields||{}).Updated_at||'')||0);
    return d||((Number(b.id)||0)-(Number(a.id)||0));
  });
  var state=null;
  if(rows.length){try{state=JSON.parse((rows[0].fields||{}).Payload_JSON||'{}');}catch(e5){state=null;}}
  if(state){
    var encoded=JSON.stringify(state);
    try{cache.put(key,encoded,EUC_DEV425_STATE_TTL_);}catch(e6){}
    try{PropertiesService.getScriptProperties().setProperty(EUC_DEV426_statePropKey_(annee,famille),encoded);}catch(e7){}
  }
  return state;
}

function EUC_DEV425_writeState_(annee,famille,state){
  annee=EUC_DEV425_txt_(annee);famille=EUC_DEV425_family_(famille);state=state||{};
  if(!annee||!famille)throw new Error('DEV425 : année et famille obligatoires.');
  EUC_DEV424_assertTarget_();
  var tech=EUC_DEV425_stateFamily_(famille),old=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{
    Annee_scolaire:[annee],Famille:[tech]
  }).filter(function(r){return (r.fields||{}).Actif!==false;});
  var now=new Date().toISOString(),safe={
    version:EUC_DEV425_VERSION_,annee:annee,famille:famille,
    revision:EUC_DEV425_txt_(state.revision),status:state.status==='READY'?'READY':'DIRTY',
    reason:EUC_DEV425_txt_(state.reason).slice(0,120),updatedAt:now
  };
  /* DIRTY doit être visible avant la première écriture métier. Si Grist
   * échoue ensuite, le cache reste volontairement conservateur. */
  if(safe.status==='DIRTY'){
    var dirtyEncoded=JSON.stringify(safe);
    try{CacheService.getScriptCache().put(EUC_DEV425_stateKey_(annee,famille),dirtyEncoded,EUC_DEV425_STATE_TTL_);}catch(e0){}
    /* Une mutation ne démarre pas si le pointeur partagé ne peut pas devenir
     * DIRTY : mieux vaut refuser l'écriture que servir ensuite un ancien
     * pointeur READY. */
    PropertiesService.getScriptProperties().setProperty(EUC_DEV426_statePropKey_(annee,famille),dirtyEncoded);
  }
  EUC_DEV190_api_('post','/tables/'+encodeURIComponent(EUC_DEV190E_INDEX_TABLE_)+'/records',{records:[{fields:{
    Annee_scolaire:annee,Famille:tech,Payload_JSON:JSON.stringify(safe),Updated_at:now,Actif:true
  }}]});
  if(old.length)EUC_DEV190_api_('patch','/tables/'+encodeURIComponent(EUC_DEV190E_INDEX_TABLE_)+'/records',{records:old.map(function(r){
    return {id:Number(r.id),fields:{Actif:false,Updated_at:now}};
  })});
  var safeEncoded=JSON.stringify(safe);
  try{CacheService.getScriptCache().put(EUC_DEV425_stateKey_(annee,famille),safeEncoded,EUC_DEV425_STATE_TTL_);}catch(e){}
  try{PropertiesService.getScriptProperties().setProperty(EUC_DEV426_statePropKey_(annee,famille),safeEncoded);}catch(e2){}
  return safe;
}

function EUC_DEV425_payloadFresh_(annee,famille,payload){
  var state=EUC_DEV425_readState_(annee,famille);
  /* Compatibilité de déploiement : avant l'initialisation DEV425, DEV424
   * reste lisible. Dès qu'un état existe, la révision doit correspondre. */
  if(!state)return !!(payload&&payload.__dev424Enriched===true);
  return state.status==='READY'&&!!state.revision&&
    EUC_DEV425_txt_(payload&&payload.__dev425Revision)===EUC_DEV425_txt_(state.revision);
}

function EUC_DEV425_classInfo_(classeId,classRows){
  classeId=Number(classeId)||0;if(!classeId)return null;
  var rows=(classRows||EUC_DEV190G_fastRecords_('Classes',{})).filter(function(r){return Number(r.id)===classeId;});
  if(!rows.length)return null;
  var f=rows[0].fields||{},flat={id:Number(rows[0].id)||classeId};Object.keys(f).forEach(function(k){flat[k]=f[k];});
  var fam='';try{var x=EUC_SUIVI_PUBLIC_famille_(flat);fam=EUC_DEV425_family_(x&&x.code);}catch(e){}
  if(!fam){
    var n=EUC_DEV425_txt_(flat.Nom||flat.Libelle||flat.Code_import).toUpperCase();
    fam=n.indexOf('BTS')>=0?'BTS':(n.indexOf('CAP')>=0?'CAP':'BACPRO');
  }
  return {id:classeId,famille:fam};
}

function EUC_DEV425_scope_(payload){
  payload=payload||{};
  var annee=EUC_DEV425_txt_(payload.annee||payload.Annee_scolaire);
  if(!annee){try{annee=EUC_DEV425_txt_(EUC_PFMP_contexteAnneeLectureV155_().active);}catch(e){}}
  var classIds=[];
  (payload.classIds||[]).forEach(function(x){x=Number(x)||0;if(x&&classIds.indexOf(x)<0)classIds.push(x);});
  var one=Number(payload.classeId||payload.classe||payload.Classe_convention)||0;if(one&&classIds.indexOf(one)<0)classIds.push(one);
  if(!classIds.length&&Number(payload.eleveId||payload.eleve||payload.id)>0){
    var eid=Number(payload.eleveId||payload.eleve||payload.id);
    try{
      var er=EUC_DEV190G_fastRecords_('EUC_ELEVES_PFMP',{}).filter(function(r){return Number(r.id)===eid;})[0];
      var cid=er?Number((er.fields||{}).Classe)||0:0;if(cid)classIds.push(cid);
    }catch(e2){}
  }
  var fams=[];
  if(payload.allFamilies===true)fams=EUC_DEV425_FAMILIES_.slice();
  var asked=EUC_DEV425_family_(payload.famille);if(asked&&fams.indexOf(asked)<0)fams.push(asked);
  var targets=[],classRows=[];
  if(classIds.length){try{classRows=EUC_DEV190G_fastRecords_('Classes',{})||[];}catch(e3){}}
  classIds.forEach(function(cid){
    var info=EUC_DEV425_classInfo_(cid,classRows),fam=info&&info.famille;if(fam&&fams.indexOf(fam)<0)fams.push(fam);
    targets.push({classe:cid,periode:Number(payload.periodeId||payload.periode)||0,famille:fam||asked});
  });
  if(!fams.length)fams=EUC_DEV425_FAMILIES_.slice();
  return {annee:annee,families:fams,targets:targets};
}

function EUC_DEV425_removeDetailCache_(annee,famille,classe,periode){
  var cache=CacheService.getScriptCache(),keys=[
    typeof EUC_DEV416_key_==='function'?EUC_DEV416_key_(annee,famille,classe,periode)+'_M':'',
    typeof EUC_DEV383_cacheKey_==='function'?EUC_DEV383_cacheKey_(annee,famille,classe,periode):'',
    ['DEV392_QUICK',annee,famille,classe,periode].join('_'),
    ['DEV420_ROWS','EUC_SITUATIONS_ELEVES_PFMP'].join('_')
  ].filter(Boolean);
  try{cache.removeAll(keys);}catch(e){keys.forEach(function(k){try{cache.remove(k);}catch(e2){}});}
}
function EUC_DEV425_invalidateFamily_(annee,famille,payload){
  try{if(typeof EUC_DEV421_familyCacheInvalidate_==='function')EUC_DEV421_familyCacheInvalidate_(annee,famille);}catch(e){}
  try{if(typeof EUC_DEV396_invalidateAppSnapshots_==='function')EUC_DEV396_invalidateAppSnapshots_(annee);}catch(e2){}
  try{if(typeof EUC_SUIVI_invaliderCacheSynthese_==='function')EUC_SUIVI_invaliderCacheSynthese_(annee);}catch(e3){}
  (payload&&payload.classes||[]).forEach(function(c){(c.periodes||[]).forEach(function(p){
    EUC_DEV425_removeDetailCache_(annee,famille,Number(c.classeId||c.id)||0,Number(p.id||p.periodeId)||0);
  });});
}

function EUC_DEV425_beginMutation_(payload){
  EUC_DEV424_assertTarget_();
  var scope=EUC_DEV425_scope_(payload),revision=EUC_DEV425_revision_(),token={
    annee:scope.annee,families:scope.families,targets:scope.targets,revision:revision,
    reason:EUC_DEV425_txt_(payload&&payload.reason)||'mutation'
  };
  if(!token.annee)throw new Error('DEV425 : année scolaire introuvable.');
  token.families.forEach(function(fam){
    var current=null;try{current=EUC_DEV421_fastFamilySnapshot_({annee:token.annee,famille:fam});}catch(e){}
    EUC_DEV425_writeState_(token.annee,fam,{revision:revision,status:'DIRTY',reason:token.reason});
    EUC_DEV425_invalidateFamily_(token.annee,fam,current&&current.payload);
  });
  return token;
}

function EUC_DEV425_syncTargets_(token,famille,base){
  var selected=(token.targets||[]).filter(function(t){return !t.famille||t.famille===famille;}),seen={};
  if(!selected.length&&token.syncAll!==true)return 0;
  (base.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    var matches=token.syncAll===true||selected.some(function(t){return Number(t.classe)===cid;});
    if(!matches)return;
    (c.periodes||[]).forEach(function(p){
      var pid=Number(p.id||p.periodeId)||0;
      var exact=token.syncAll===true||selected.some(function(t){return Number(t.classe)===cid&&(!Number(t.periode)||Number(t.periode)===pid);});
      var key=cid+'|'+pid;if(!cid||!pid||!exact||seen[key])return;seen[key]=1;
      EUC_DEV190J_syncOne({annee:token.annee,famille:famille,classe:cid,periode:pid});
    });
  });
  return Object.keys(seen).length;
}

function EUC_DEV425_buildFamily_(token,famille){
  var annee=token.annee,base=EUC_DEV424_clone_(EUC_DEV190E_heavyFamily_({annee:annee,famille:famille})||{classes:[]});
  var synced=EUC_DEV425_syncTargets_(token,famille,base);
  var classIds={};(base.classes||[]).forEach(function(c){var id=Number(c.classeId||c.id)||0;if(id)classIds[String(id)]=c;});
  /* En maintenance, la lecture filtrée sur la seule année peut être vidée par
   * la couche de compatibilité Grist alors que les lectures classe+période
   * fonctionnent. Une lecture unique de la table, filtrée ensuite par
   * hydrateFamily_, est plus fiable et reste hors du chemin utilisateur. */
  var rows=typeof EUC_DEV190I_allRows_==='function'?EUC_DEV190I_allRows_():
    (EUC_DEV190G_fastRecords_(EUC_DEV190I_TABLE_,{Annee_scolaire:[annee]})||[]);
  var newest=EUC_DEV424_newestActiveDetails_(rows),batch=EUC_DEV422_batchSources_(annee,classIds),details=[];
  var hydrated=EUC_DEV422_hydrateFamily_(base,annee,famille,{batch:batch,rows:rows,onDetail:function(x){
    x.sourceRow=newest[EUC_DEV424_detailKey_(famille,x.classe,x.periode)]||x.sourceRow;
    x.detail.__dev425Revision=token.revision;x.detail.__dev425FreshAt=new Date().toISOString();details.push(x);
  }});
  var expected=0,enriched=0;(hydrated.classes||[]).forEach(function(c){(c.periodes||[]).forEach(function(p){
    if(Number(p.id||p.periodeId)){expected++;if(p.quick)enriched++;}
  });});
  if(expected&&enriched!==expected)throw new Error('DEV425 : snapshot '+famille+' incomplet ('+enriched+'/'+expected+').');
  hydrated.__dev424Enriched=true;hydrated.__dev424Version=EUC_DEV424_DETAIL_VERSION_;
  hydrated.__dev425Revision=token.revision;hydrated.__dev425FreshAt=new Date().toISOString();hydrated.__source='snapshot-atomique-immediat';
  var changed=EUC_DEV424_writeDetails_(details);EUC_DEV424_writeFamily_(annee,famille,hydrated);
  EUC_DEV425_invalidateFamily_(annee,famille,hydrated);
  return {famille:famille,details:details.length,changedDetails:changed,syncedTargets:synced};
}

function EUC_DEV425_finishMutation_(token){
  if(!token||!token.annee||!token.revision)throw new Error('DEV425 : jeton de reconstruction invalide.');
  var out=[];
  token.families.forEach(function(fam){
    out.push(EUC_DEV425_buildFamily_(token,fam));
  });
  token.families.forEach(function(fam){
    var state=EUC_DEV425_readState_(token.annee,fam);
    if(!state||state.status!=='DIRTY'||state.revision!==token.revision)return;
    EUC_DEV425_writeState_(token.annee,fam,{revision:token.revision,status:'READY',reason:token.reason});
  });
  return {ok:true,annee:token.annee,revision:token.revision,families:out};
}
function EUC_DEV425_finishResult_(token,result){
  var refresh=EUC_DEV425_finishMutation_(token);result=result||{ok:true};result.snapshot=refresh;return result;
}

function EUC_DEV425_beginImportItems_(items,reason){
  var grouped={};(items||[]).forEach(function(x){
    var year=EUC_DEV425_txt_(x.year||x.annee),cid=Number(x.classId||x.classeId||x.classe)||0,pid=Number(x.periodId||x.periodeId||x.periode)||0;
    if(!year||!cid)return;
    var g=grouped[year]||(grouped[year]={classIds:[],targets:[]});
    if(g.classIds.indexOf(cid)<0)g.classIds.push(cid);
    if(!g.targets.some(function(t){return t.classe===cid&&t.periode===pid;}))g.targets.push({classe:cid,periode:pid,famille:''});
  });
  return Object.keys(grouped).map(function(year){
    var g=grouped[year],token=EUC_DEV425_beginMutation_({annee:year,classIds:g.classIds,reason:reason||'import'});
    token.targets=g.targets;return token;
  });
}
function EUC_DEV425_finishMany_(tokens){return (tokens||[]).map(function(token){return EUC_DEV425_finishMutation_(token);});}

function EUC_DEV425_initialize(){
  var annee=EUC_DEV425_txt_(EUC_PFMP_contexteAnneeLectureV155_().active);
  var token=EUC_DEV425_beginMutation_({annee:annee,allFamilies:true,reason:'initialisation-dev425'});
  token.syncAll=false;return EUC_DEV425_finishMutation_(token);
}

function EUC_DEV426_recoveryTargets_(base){
  var out=[],seen={};
  (base&&base.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    (c.periodes||[]).forEach(function(p){
      var pid=Number(p.id||p.periodeId)||0,key=cid+'|'+pid;
      if(cid&&pid&&!seen[key]){seen[key]=1;out.push({classe:cid,periode:pid});}
    });
  });
  return out;
}

function EUC_DEV426_recoverBatch_(annee,famille,revision,reason){
  var props=PropertiesService.getScriptProperties();
  var key=EUC_DEV426_recoveryPropKey_(annee,famille),progress=null;
  try{progress=JSON.parse(props.getProperty(key)||'null');}catch(e){progress=null;}
  if(!progress||EUC_DEV425_txt_(progress.revision)!==revision){progress={revision:revision,next:0};}
  var base=EUC_DEV424_clone_(EUC_DEV190E_heavyFamily_({annee:annee,famille:famille})||{classes:[]});
  var targets=EUC_DEV426_recoveryTargets_(base),start=Math.max(0,Number(progress.next)||0);
  if(start>targets.length)start=0;
  var end=Math.min(targets.length,start+EUC_DEV426_RECOVERY_BATCH_SIZE_);
  for(var i=start;i<end;i++){
    EUC_DEV190J_syncOne({annee:annee,famille:famille,classe:targets[i].classe,periode:targets[i].periode});
  }
  progress.next=end;progress.total=targets.length;progress.updatedAt=new Date().toISOString();
  props.setProperty(key,JSON.stringify(progress));
  if(end<targets.length)return {ok:true,famille:famille,status:'DIRTY',synced:end-start,next:end,total:targets.length};
  /* Tous les détails ont été resynchronisés au fil des lots. La publication
   * finale reste atomique : hydratation complète, index, puis seulement READY. */
  var result=EUC_DEV425_finishMutation_({
    annee:annee,families:[famille],targets:[],revision:revision,
    reason:reason,syncAll:false
  });
  props.deleteProperty(key);
  return {ok:true,famille:famille,status:'READY',synced:end-start,next:end,total:targets.length,result:result};
}

function EUC_DEV425_refreshScheduled(){
  var lock=LockService.getScriptLock(),got=false,t0=Date.now();try{got=lock.tryLock(1000);}catch(e){}
  if(!got)return {ok:true,skipped:'overlap'};
  try{
    var annee=EUC_DEV425_txt_(EUC_PFMP_contexteAnneeLectureV155_().active),pending=[];
    EUC_DEV425_FAMILIES_.forEach(function(f){
      var s=EUC_DEV425_readState_(annee,f);
      if(!s||s.status==='DIRTY')pending.push({famille:f,state:s});
    });
    /* Le déclencheur est un filet de sécurité, pas une mutation. Un snapshot
     * READY reste donc disponible et n'est jamais invalidé périodiquement. */
    if(!pending.length)return {ok:true,skipped:'all-ready',annee:annee,durationMs:Date.now()-t0};
    /* Une reprise exhaustive est nécessaire après une mutation interrompue.
     * Elle est découpée en lots persistants afin de respecter la durée Apps
     * Script. La famille reste DIRTY jusqu'au dernier lot et à la publication
     * atomique finale. */
    var item=pending[0],state=item.state;
    var revision=EUC_DEV425_txt_(state&&state.revision)||EUC_DEV425_revision_();
    if(!state)EUC_DEV425_writeState_(annee,item.famille,{revision:revision,status:'DIRTY',reason:'filet-securite-15-min'});
    var result=EUC_DEV426_recoverBatch_(annee,item.famille,revision,'filet-securite-15-min');
    return {ok:true,annee:annee,repaired:[result],remaining:Math.max(0,pending.length-(result.status==='READY'?1:0)),durationMs:Date.now()-t0};
  }finally{try{lock.releaseLock();}catch(e2){}}
}

function EUC_DEV426_finalizeRecovery(){
  EUC_DEV424_assertTarget_();
  var annee=EUC_DEV425_txt_(EUC_PFMP_contexteAnneeLectureV155_().active),item=null;
  EUC_DEV425_FAMILIES_.some(function(f){
    var s=EUC_DEV425_readState_(annee,f);
    if(s&&s.status==='DIRTY'&&s.revision){item={famille:f,state:s};return true;}
    return false;
  });
  if(!item)return {ok:true,skipped:'no-dirty-family',annee:annee};
  /* Cette finalisation ne synchronise rien : elle ne peut réussir que si la
   * totalité des détails actifs existe déjà. buildFamily_ vérifie le compte
   * exact avant toute publication READY. */
  return EUC_DEV425_finishMutation_({
    annee:annee,families:[item.famille],targets:[],revision:item.state.revision,
    reason:'finalisation-reprise',syncAll:false
  });
}

function EUC_DEV425_status(){
  EUC_DEV424_assertTarget_();var annee=EUC_DEV425_txt_(EUC_PFMP_contexteAnneeLectureV155_().active),states={};
  EUC_DEV425_FAMILIES_.forEach(function(f){states[f]=EUC_DEV425_readState_(annee,f);});
  return {ok:true,target:EUC_DEV424_ALLOWED_DOC_,annee:annee,states:states,triggerHandler:EUC_DEV424_HANDLER_,intervalMinutes:EUC_DEV424_INTERVAL_MINUTES_};
}
