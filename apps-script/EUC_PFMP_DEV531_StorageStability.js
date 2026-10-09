/**
 * PFMP — DEV531 — stabilité des vues matérialisées Grist.
 *
 * Les snapshots sont des caches remplaçables. Ils ne constituent pas
 * l'historique métier des conventions et ne doivent donc pas conserver une
 * copie JSON complète à chaque recalcul.
 */
var EUC_DEV531_VERSION_='1.0.0-dev.531';

function EUC_DEV531_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV531_chunks_(rows,size){
  var out=[];for(var i=0;i<(rows||[]).length;i+=size)out.push(rows.slice(i,i+size));return out;
}
function EUC_DEV531_bytes_(text){
  text=String(text==null?'':text);
  try{return Utilities.newBlob(text).getBytes().length;}catch(e){return text.length;}
}
function EUC_DEV531_log_(writer,mode,payloadBytes,durationMs,counts){
  try{
    var entry={diagnostic:'DEV531_SNAPSHOT_WRITE',writer:writer,mode:mode,
      payloadBytes:Number(payloadBytes)||0,durationMs:Number(durationMs)||0,version:EUC_DEV531_VERSION_};
    counts=counts||{};
    ['attempted','changed','created','patched','avoided'].forEach(function(k){
      if(counts[k]!=null)entry[k]=Number(counts[k])||0;
    });
    console.log(JSON.stringify(entry));
  }catch(e){}
}

/* Point d'entrée utilisé par l'ancien index DEV190E. Le moteur récent porte
 * déjà l'upsert borné et l'invalidation des caches de lecture. */
function EUC_DEV531_upsertFamilyIndex_(annee,famille,payload){
  var changed=EUC_DEV424_writeFamily_(annee,famille,payload||{});
  return {ok:true,changed:!!changed,mode:changed?'PATCH_OR_CREATE':'UNCHANGED'};
}

/* Compatibilité des anciens imports/écrans de maintenance DEV190I/J.
 * Une seule ligne active est conservée par année, classe et période. Le JSON
 * est remplacé sur place ; une création n'a lieu que si le cache n'existe pas.
 */
function EUC_DEV531_syncLegacyDetail_(payload,enrichContacts){
  payload=payload||{};
  var annee=EUC_DEV190_txt_(payload.annee),classe=EUC_DEV190_num_(payload.classe),periode=EUC_DEV190_num_(payload.periode);
  if(!annee||!classe||!periode)throw new Error('DEV531 : année, classe et période obligatoires.');
  if(typeof EUC_DEV424_assertTarget_==='function')EUC_DEV424_assertTarget_();
  EUC_DEV190I_ensureTable_();
  var t0=Date.now(),detail=EUC_DEV190_buildHistoricalDetail_(annee,classe,periode);
  if(enrichContacts===true)detail=EUC_DEV190J_enrichContacts_(detail);
  if(!detail)throw new Error('DEV531 : détail historique vide.');
  var fingerprint=EUC_DEV190I_hash_(detail),json=JSON.stringify(detail),lock=LockService.getScriptLock(),got=false;
  try{got=lock.tryLock(5000);}catch(eLock){}
  if(!got)throw new Error('DEV531 : une synchronisation snapshot est déjà en cours.');
  try{
    var active=EUC_DEV190G_fastRecords_(EUC_DEV190I_TABLE_,{
      Annee_scolaire:[annee],Classe_id:[classe],Periode_id:[periode],Actif:[true]
    }).filter(function(r){return (r.fields||{}).Actif!==false;}).sort(function(a,b){
      var d=(Date.parse((b.fields||{}).Updated_at||'')||0)-(Date.parse((a.fields||{}).Updated_at||'')||0);
      return d||((Number(b.id)||0)-(Number(a.id)||0));
    });
    var keeper=active[0]||null,now=new Date().toISOString(),duplicates=active.slice(1),mode='UNCHANGED';
    if(keeper&&EUC_DEV531_t_((keeper.fields||{}).Fingerprint)===fingerprint){
      if(duplicates.length){
        EUC_DEV531_chunks_(duplicates,20).forEach(function(chunk){
          EUC_DEV190_api_('patch','/tables/'+encodeURIComponent(EUC_DEV190I_TABLE_)+'/records',{records:chunk.map(function(r){
            return {id:Number(r.id),fields:{Actif:false,Valid_to:now,Updated_at:now}};
          })});
        });
        mode='UNCHANGED_DEDUPED';
      }
      EUC_DEV531_log_('EUC_SUIVI_PFMP_DETAIL_SNAPSHOT',mode,EUC_DEV531_bytes_(json),Date.now()-t0);
      return {ok:true,changed:false,eleves:(detail.lignes||[]).length,durationMs:Date.now()-t0,mode:mode};
    }
    var famille=EUC_DEV190_txt_(payload.famille)||EUC_DEV190I_familyCode_(detail),version=enrichContacts===true?'1.0.0-dev.531j':'1.0.0-dev.531i';
    var fields={Annee_scolaire:annee,Famille:famille,Classe_id:classe,
      Classe_nom:EUC_DEV190_txt_(detail.classe&&detail.classe.nom),Periode_id:periode,
      Periode_libelle:EUC_DEV190_txt_(detail.periode&&detail.periode.libelle),Payload_JSON:json,
      Fingerprint:fingerprint,Updated_at:now,Valid_to:'',Actif:true,Snapshot_version:version};
    if(keeper){
      var patches=[{id:Number(keeper.id),fields:fields}];
      duplicates.forEach(function(r){patches.push({id:Number(r.id),fields:{Actif:false,Valid_to:now,Updated_at:now}});});
      EUC_DEV531_chunks_(patches,20).forEach(function(chunk){
        EUC_DEV190_api_('patch','/tables/'+encodeURIComponent(EUC_DEV190I_TABLE_)+'/records',{records:chunk});
      });
      mode='PATCH';
    }else{
      fields.Valid_from=now;
      EUC_DEV190_api_('post','/tables/'+encodeURIComponent(EUC_DEV190I_TABLE_)+'/records',{records:[{fields:fields}]});
      mode='CREATE_MISSING';
    }
    EUC_DEV531_log_('EUC_SUIVI_PFMP_DETAIL_SNAPSHOT',mode,EUC_DEV531_bytes_(json),Date.now()-t0);
    return {ok:true,changed:true,eleves:(detail.lignes||[]).length,durationMs:Date.now()-t0,mode:mode};
  }finally{try{lock.releaseLock();}catch(eRelease){}}
}
