/**
 * PFMP — DEV424
 * Snapshot enrichi partagé, construit hors du chemin de consultation.
 * Cible strictement bornée à la base PFMP active autorisée b2CyeMEdVEMS.
 */
var EUC_DEV424_ALLOWED_DOC_='b2CyeMEdVEMS';
var EUC_DEV424_HANDLER_='EUC_DEV424_refreshScheduled';
var EUC_DEV424_INTERVAL_MINUTES_=15;
var EUC_DEV424_STATUS_PROP_='EUC_DEV424_SNAPSHOT_STATUS_V1';
var EUC_DEV424_DETAIL_VERSION_='1.0.0-dev.424';

function EUC_DEV424_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV424_clone_(v){return JSON.parse(JSON.stringify(v||{}));}
function EUC_DEV424_chunks_(rows,size){
  var out=[];for(var i=0;i<(rows||[]).length;i+=size)out.push(rows.slice(i,i+size));return out;
}

function EUC_DEV424_assertTarget_(){
  if(typeof EUC_ENT_controlerCibleRecette_==='function')EUC_ENT_controlerCibleRecette_();
  var cfg=typeof EUC_ENT_lireConfiguration==='function'?EUC_ENT_lireConfiguration():{};
  var doc=EUC_DEV424_txt_(cfg&&cfg.EUC_ENT_GRIST_DOC_ID);
  if(doc!==EUC_DEV424_ALLOWED_DOC_)throw new Error('DEV424 : cible Grist refusée.');
  return doc;
}

function EUC_DEV424_statusWrite_(value){
  var safe={
    ok:value&&value.ok===true,
    running:value&&value.running===true,
    startedAt:EUC_DEV424_txt_(value&&value.startedAt),
    finishedAt:EUC_DEV424_txt_(value&&value.finishedAt),
    durationMs:Number(value&&value.durationMs)||0,
    year:EUC_DEV424_txt_(value&&value.year),
    families:Number(value&&value.families)||0,
    details:Number(value&&value.details)||0,
    changedDetails:Number(value&&value.changedDetails)||0,
    error:EUC_DEV424_txt_(value&&value.error).slice(0,300)
  };
  try{PropertiesService.getScriptProperties().setProperty(EUC_DEV424_STATUS_PROP_,JSON.stringify(safe));}catch(e){}
  return safe;
}

function EUC_DEV424_status(){
  EUC_DEV424_assertTarget_();
  var state={};
  try{state=JSON.parse(PropertiesService.getScriptProperties().getProperty(EUC_DEV424_STATUS_PROP_)||'{}');}catch(e){}
  var triggers=[];
  try{
    triggers=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()===EUC_DEV424_HANDLER_;});
  }catch(e2){}
  return {ok:true,target:EUC_DEV424_ALLOWED_DOC_,intervalMinutes:EUC_DEV424_INTERVAL_MINUTES_,triggerCount:triggers.length,lastRun:state};
}

function EUC_DEV424_installSnapshotTrigger(){
  EUC_DEV424_assertTarget_();
  var removed=0;
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()===EUC_DEV424_HANDLER_){ScriptApp.deleteTrigger(t);removed++;}
  });
  ScriptApp.newTrigger(EUC_DEV424_HANDLER_).timeBased().everyMinutes(EUC_DEV424_INTERVAL_MINUTES_).create();
  var status=EUC_DEV424_status();status.replaced=removed;return status;
}

function EUC_DEV424_detailKey_(famille,classe,periode){
  return [Number(classe)||0,Number(periode)||0].join('|');
}

function EUC_DEV424_newestActiveDetails_(rows){
  var out={};
  (rows||[]).forEach(function(r){
    var f=r.fields||{};if(f.Actif===false)return;
    var key=EUC_DEV424_detailKey_(f.Famille,f.Classe_id,f.Periode_id);
    var at=Date.parse(f.Updated_at||'')||0;
    if(!out[key]||at>out[key].at)out[key]={at:at,row:r};
  });
  return out;
}

function EUC_DEV424_writeDetails_(items){
  var changed=[],now=new Date().toISOString();
  (items||[]).forEach(function(item){
    var source=item.sourceRow&&item.sourceRow.row?item.sourceRow.row:null;
    if(!source||!source.id||!item.detail)return;
    var next=EUC_DEV424_clone_(item.detail);next.__dev424Enriched=true;
    var json=JSON.stringify(next),old=EUC_DEV424_txt_((source.fields||{}).Payload_JSON);
    if(json===old)return;
    changed.push({source:source,json:json,item:item});
  });
  EUC_DEV424_chunks_(changed,10).forEach(function(chunk){
    EUC_DEV190_api_('post','/tables/'+encodeURIComponent(EUC_DEV190I_TABLE_)+'/records',{records:chunk.map(function(x){
      var f=x.source.fields||{};
      return {fields:{
        Annee_scolaire:f.Annee_scolaire,Famille:f.Famille,
        Classe_id:Number(f.Classe_id)||0,Classe_nom:f.Classe_nom||'',
        Periode_id:Number(f.Periode_id)||0,Periode_libelle:f.Periode_libelle||'',
        Payload_JSON:x.json,Fingerprint:typeof EUC_DEV190I_hash_==='function'?EUC_DEV190I_hash_(x.item.detail):'',
        Updated_at:now,Valid_from:now,Valid_to:'',Actif:true,Snapshot_version:EUC_DEV424_DETAIL_VERSION_
      }};
    })});
    EUC_DEV190_api_('patch','/tables/'+encodeURIComponent(EUC_DEV190I_TABLE_)+'/records',{records:chunk.map(function(x){
      return {id:Number(x.source.id),fields:{Actif:false,Valid_to:now,Updated_at:now}};
    })});
  });
  return changed.length;
}

function EUC_DEV424_writeFamily_(annee,famille,payload){
  var old=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{Annee_scolaire:[annee],Famille:[famille]})
    .filter(function(r){return (r.fields||{}).Actif!==false;}).sort(function(a,b){
      var d=(Date.parse((b.fields||{}).Updated_at||'')||0)-(Date.parse((a.fields||{}).Updated_at||'')||0);
      return d||((Number(b.id)||0)-(Number(a.id)||0));
    });
  var json=JSON.stringify(payload);
  if(old.length&&EUC_DEV424_txt_((old[0].fields||{}).Payload_JSON)===json){
    /* Une interruption ancienne peut avoir laissé plusieurs lignes actives
     * avec le même horodatage. Conserver uniquement l'identifiant le plus
     * récent évite qu'une lecture ultérieure reprenne l'enveloppe vide. */
    if(old.length>1){
      var sameNow=new Date().toISOString();
      EUC_DEV424_chunks_(old.slice(1),20).forEach(function(chunk){
        EUC_DEV190_api_('patch','/tables/'+encodeURIComponent(EUC_DEV190E_INDEX_TABLE_)+'/records',{records:chunk.map(function(r){
          return {id:Number(r.id),fields:{Actif:false,Updated_at:sameNow}};
        })});
      });
    }
    if(typeof EUC_DEV421_familyCacheInvalidate_==='function')EUC_DEV421_familyCacheInvalidate_(annee,famille);
    return false;
  }
  var now=new Date().toISOString();
  EUC_DEV190_api_('post','/tables/'+encodeURIComponent(EUC_DEV190E_INDEX_TABLE_)+'/records',{records:[{fields:{
    Annee_scolaire:annee,Famille:famille,Payload_JSON:json,Updated_at:now,Actif:true
  }}]});
  if(old.length)EUC_DEV190_api_('patch','/tables/'+encodeURIComponent(EUC_DEV190E_INDEX_TABLE_)+'/records',{records:old.map(function(r){
    return {id:Number(r.id),fields:{Actif:false,Updated_at:now}};
  })});
  if(typeof EUC_DEV421_familyCacheInvalidate_==='function')EUC_DEV421_familyCacheInvalidate_(annee,famille);
  return true;
}

function EUC_DEV424_buildAll_(annee){
  var families=['BACPRO','BTS','CAP'],base={},classIds={},periods=0;
  families.forEach(function(famille){
    var value=EUC_DEV190E_heavyFamily_({annee:annee,famille:famille})||{classes:[]};
    base[famille]=EUC_DEV424_clone_(value);
    (value.classes||[]).forEach(function(c){
      var cid=Number(c.classeId||c.id)||0;if(cid)classIds[String(cid)]=c;
      (c.periodes||[]).forEach(function(p){if(Number(p.id||p.periodeId))periods++;});
    });
  });
  var rows=EUC_DEV190G_fastRecords_(EUC_DEV190I_TABLE_,{Annee_scolaire:[annee]})||[];
  var newest=EUC_DEV424_newestActiveDetails_(rows);
  var batch=EUC_DEV422_batchSources_(annee,classIds),details=[];
  families.forEach(function(famille){
    var hydrated=EUC_DEV422_hydrateFamily_(base[famille],annee,famille,{batch:batch,rows:rows,onDetail:function(x){
      x.sourceRow=newest[EUC_DEV424_detailKey_(famille,x.classe,x.periode)]||x.sourceRow;
      details.push(x);
    }});
    var enriched=0;(hydrated.classes||[]).forEach(function(c){(c.periodes||[]).forEach(function(p){if(p.quick)enriched++;});});
    var expected=0;(hydrated.classes||[]).forEach(function(c){(c.periodes||[]).forEach(function(p){if(Number(p.id||p.periodeId))expected++;});});
    if(expected&&enriched!==expected)throw new Error('DEV424 : snapshot '+famille+' incomplet ('+enriched+'/'+expected+').');
    hydrated.__dev424Enriched=true;
    hydrated.__dev424Version=EUC_DEV424_DETAIL_VERSION_;
    hydrated.__source='snapshot-enrichi-planifie';
    base[famille]=hydrated;
  });
  var changed=EUC_DEV424_writeDetails_(details);
  var changedFamilies=0;
  families.forEach(function(famille){if(EUC_DEV424_writeFamily_(annee,famille,base[famille]))changedFamilies++;});
  /* DEV445 : publier en même temps le résumé compact utilisé par les pages
   * d'accueil. Les consultations suivantes n'ont ainsi aucun appel Grist à
   * effectuer, même après expiration du cache court Apps Script. */
  if(typeof EUC_DEV445_storeResumeAccueil_==='function')EUC_DEV445_storeResumeAccueil_(annee,base);
  return {families:families.length,changedFamilies:changedFamilies,details:details.length,changedDetails:changed,periods:periods};
}

function EUC_DEV424_refreshScheduled(){
  if(typeof EUC_DEV425_refreshScheduled==='function')return EUC_DEV425_refreshScheduled();
  var started=new Date().toISOString(),t0=Date.now(),lock=LockService.getScriptLock(),got=false,annee='';
  try{got=lock.tryLock(1000);}catch(e){}
  if(!got)return {ok:true,skipped:'overlap'};
  try{
    EUC_DEV424_assertTarget_();
    annee=EUC_DEV424_txt_(EUC_PFMP_contexteAnneeLectureV155_().active);
    if(!annee)throw new Error('DEV424 : année active introuvable.');
    EUC_DEV424_statusWrite_({running:true,startedAt:started,year:annee});
    var result=EUC_DEV424_buildAll_(annee);
    var state=EUC_DEV424_statusWrite_({ok:true,startedAt:started,finishedAt:new Date().toISOString(),durationMs:Date.now()-t0,
      year:annee,families:result.families,details:result.details,changedDetails:result.changedDetails});
    return {ok:true,target:EUC_DEV424_ALLOWED_DOC_,year:annee,durationMs:state.durationMs,
      families:result.families,details:result.details,changedDetails:result.changedDetails};
  }catch(err){
    EUC_DEV424_statusWrite_({ok:false,startedAt:started,finishedAt:new Date().toISOString(),durationMs:Date.now()-t0,year:annee,error:String(err&&err.message||err)});
    throw err;
  }finally{try{lock.releaseLock();}catch(e2){}}
}

function EUC_DEV424_readEnrichedDetail_(annee,famille,classe,periode){
  EUC_DEV424_assertTarget_();
  var rows=EUC_DEV190G_fastRecords_(EUC_DEV190I_TABLE_,{
    Annee_scolaire:[EUC_DEV424_txt_(annee)],Classe_id:[Number(classe)||0],Periode_id:[Number(periode)||0]
  }).filter(function(r){return (r.fields||{}).Actif!==false;}).sort(function(a,b){
    return (Date.parse((b.fields||{}).Updated_at||'')||0)-(Date.parse((a.fields||{}).Updated_at||'')||0);
  });
  for(var i=0;i<rows.length;i++){
    try{
      var d=JSON.parse((rows[i].fields||{}).Payload_JSON||'{}');
      if(d&&d.__dev424Enriched===true&&(
        typeof EUC_DEV425_payloadFresh_!=='function'||
        EUC_DEV425_payloadFresh_(annee,famille,d)
      ))return d;
    }catch(e){}
  }
  return null;
}
