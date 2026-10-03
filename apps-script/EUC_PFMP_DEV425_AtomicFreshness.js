/**
 * PFMP — DEV425
 * Publication atomique des snapshots et reconstruction après mutation.
 *
 * L'état de fraîcheur est conservé dans EUC_SUIVI_PFMP_INDEX, sous une
 * famille technique. Une révision DIRTY interdit toute lecture de l'ancien
 * payload. La révision READY n'est publiée qu'après les détails et l'index.
 */
var EUC_DEV425_VERSION_='1.2.0-dev.427';
var EUC_DEV425_STATE_PREFIX_='__DEV425_STATE__';
var EUC_DEV427_DETAIL_PREFIX_='__DEV427_DETAIL__';
var EUC_DEV425_STATE_TTL_=21600;
var EUC_DEV425_FAMILIES_=['BACPRO','BTS','CAP'];
var EUC_DEV426_STATE_PROP_PREFIX_='EUC_DEV426_STATE_';

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
function EUC_DEV427_detailFamily_(famille,classe,periode){
  return EUC_DEV427_DETAIL_PREFIX_+EUC_DEV425_family_(famille)+'_'+(Number(classe)||0)+'_'+(Number(periode)||0);
}
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
    reason:EUC_DEV425_txt_(state.reason).slice(0,120),updatedAt:now,
    targets:(state.targets||[]).map(function(t){return {
      classe:Number(t.classe)||0,periode:Number(t.periode)||0,famille:EUC_DEV425_family_(t.famille||famille)
    };}).filter(function(t){return t.classe>0;}).slice(0,100)
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
    EUC_DEV425_writeState_(token.annee,fam,{revision:revision,status:'DIRTY',reason:token.reason,
      targets:(token.targets||[]).filter(function(t){return !t.famille||t.famille===fam;})});
    EUC_DEV425_invalidateFamily_(token.annee,fam,current&&current.payload);
  });
  return token;
}

function EUC_DEV426_rawFamilySnapshot_(annee,famille){
  var rows=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{
    Annee_scolaire:[annee],Famille:[famille]
  }).filter(function(r){return (r.fields||{}).Actif!==false;}).sort(function(a,b){
    return (Date.parse((b.fields||{}).Updated_at||'')||0)-(Date.parse((a.fields||{}).Updated_at||'')||0);
  });
  if(!rows.length)return null;
  try{return JSON.parse((rows[0].fields||{}).Payload_JSON||'{}');}catch(e){return null;}
}

/* DEV427 — le détail enrichi est conservé dans la table d'index fiable.
 * La table historique EUC_SUIVI_PFMP_DETAIL_SNAPSHOT peut être absente selon
 * la base ; elle ne doit donc plus forcer un recalcul métier à chaque clic. */
function EUC_DEV427_readDetail_(annee,famille,classe,periode){
  annee=EUC_DEV425_txt_(annee);famille=EUC_DEV425_family_(famille);
  classe=Number(classe)||0;periode=Number(periode)||0;
  if(!annee||!famille||!classe||!periode)return null;
  var rows=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{
    Annee_scolaire:[annee],Famille:[EUC_DEV427_detailFamily_(famille,classe,periode)]
  }).filter(function(r){return (r.fields||{}).Actif!==false;}).sort(function(a,b){
    return (Date.parse((b.fields||{}).Updated_at||'')||0)-(Date.parse((a.fields||{}).Updated_at||'')||0);
  });
  if(!rows.length)return null;
  var detail=null;try{detail=JSON.parse((rows[0].fields||{}).Payload_JSON||'{}');}catch(e){return null;}
  return EUC_DEV425_payloadFresh_(annee,famille,detail)?detail:null;
}

function EUC_DEV427_rawDetailMap_(annee,famille){
  var prefix=EUC_DEV427_DETAIL_PREFIX_+EUC_DEV425_family_(famille)+'_',out={};
  var rows=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{Annee_scolaire:[annee]})||[];
  rows.filter(function(r){var f=r.fields||{};return f.Actif!==false&&EUC_DEV425_txt_(f.Famille).indexOf(prefix)===0;})
    .sort(function(a,b){return (Date.parse((b.fields||{}).Updated_at||'')||0)-(Date.parse((a.fields||{}).Updated_at||'')||0);})
    .forEach(function(r){
      var f=r.fields||{},tail=EUC_DEV425_txt_(f.Famille).slice(prefix.length).split('_'),key=(Number(tail[0])||0)+'|'+(Number(tail[1])||0);
      if(out[key])return;try{out[key]=JSON.parse(f.Payload_JSON||'{}');}catch(e){}
    });
  return out;
}

function EUC_DEV427_writeDetails_(annee,famille,items){
  items=items||[];if(!items.length)return 0;
  EUC_DEV424_assertTarget_();
  var all=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{Annee_scolaire:[annee]})||[],oldByFamily={};
  all.forEach(function(r){var f=r.fields||{};if(f.Actif!==false)oldByFamily[EUC_DEV425_txt_(f.Famille)]=(oldByFamily[EUC_DEV425_txt_(f.Famille)]||[]).concat([r]);});
  var now=new Date().toISOString(),records=[],old=[];
  items.forEach(function(item){
    var tech=EUC_DEV427_detailFamily_(famille,item.classe,item.periode);
    records.push({fields:{Annee_scolaire:annee,Famille:tech,Payload_JSON:JSON.stringify(item.detail),Updated_at:now,Actif:true}});
    (oldByFamily[tech]||[]).forEach(function(r){old.push({id:Number(r.id),fields:{Actif:false,Updated_at:now}});});
  });
  EUC_DEV424_chunks_(records,10).forEach(function(chunk){
    EUC_DEV190_api_('post','/tables/'+encodeURIComponent(EUC_DEV190E_INDEX_TABLE_)+'/records',{records:chunk});
  });
  EUC_DEV424_chunks_(old,20).forEach(function(chunk){
    EUC_DEV190_api_('patch','/tables/'+encodeURIComponent(EUC_DEV190E_INDEX_TABLE_)+'/records',{records:chunk});
  });
  return records.length;
}

function EUC_DEV426_periodMap_(data){
  var out={};
  (data&&data.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    (c.periodes||[]).forEach(function(p){var pid=Number(p.id||p.periodeId)||0;if(cid&&pid)out[cid+'|'+pid]=p;});
  });
  return out;
}

function EUC_DEV426_applyQuick_(p,quick){
  if(!p||!quick)return;
  p.quick=quick;p.__detailSnapshotVerified=true;
  if(quick.isPdif)return;
  var apps=quick.apprentis||[];
  p.effectifTotal=Number(quick.total)||0;p.apprentis=apps.length;
  p.total=Math.max(0,p.effectifTotal-apps.length);p.conventions=(quick.avec||[]).length;
  p.situationsAdministratives=Number(quick.situationsCouvertes)||0;
  p.annuleesInterrompues=(quick.annuleesInterrompues||[]).length;
  p.manquantes=(quick.sans||[]).length;p.sansConvention=p.manquantes;
  p.couverts=Number(quick.couverts)||0;
}

function EUC_DEV426_targetsForBuild_(token,famille,base){
  var asked=(token.targets||[]).filter(function(t){return !t.famille||t.famille===famille;}),out=[],seen={};
  (base.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    (c.periodes||[]).forEach(function(p){
      var pid=Number(p.id||p.periodeId)||0,key=cid+'|'+pid;
      var wanted=token.syncAll===true||asked.some(function(t){return Number(t.classe)===cid&&(!Number(t.periode)||Number(t.periode)===pid);});
      if(cid&&pid&&wanted&&!seen[key]){seen[key]=1;out.push({classe:cid,periode:pid,p:p});}
    });
  });
  return out;
}

function EUC_DEV425_buildFamily_(token,famille){
  var annee=token.annee,base=EUC_DEV424_clone_(EUC_DEV190E_heavyFamily_({annee:annee,famille:famille})||{classes:[]});
  var classIds={};(base.classes||[]).forEach(function(c){var id=Number(c.classeId||c.id)||0;if(id)classIds[String(id)]=c;});
  var previous=EUC_DEV426_rawFamilySnapshot_(annee,famille),previousPeriods=EUC_DEV426_periodMap_(previous);
  var previousDetails=EUC_DEV427_rawDetailMap_(annee,famille);
  var hydrated=base,batch=EUC_DEV422_batchSources_(annee,classIds),built=0,details=[];
  (hydrated.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    (c.periodes||[]).forEach(function(p){
      var pid=Number(p.id||p.periodeId)||0,old=previousPeriods[cid+'|'+pid];
      if(old&&old.quick)EUC_DEV426_applyQuick_(p,EUC_DEV425_clone_(old.quick));
    });
  });
  var wanted=EUC_DEV426_targetsForBuild_(token,famille,hydrated);
  /* Si un ancien snapshot n'est pas encore enrichi, seules ses périodes
   * manquantes sont reconstruites. Le cas normal d'une mutation ne recalcule
   * que les cibles enregistrées dans l'état DIRTY. */
  (hydrated.classes||[]).forEach(function(c){var cid=Number(c.classeId||c.id)||0;(c.periodes||[]).forEach(function(p){
    var pid=Number(p.id||p.periodeId)||0;if(cid&&pid&&!p.quick&&!wanted.some(function(t){return t.classe===cid&&t.periode===pid;}))wanted.push({classe:cid,periode:pid,p:p});
  });});
  /* Une nouvelle révision familiale couvre toutes ses périodes. Les détails
   * inchangés sont recopiés avec cette révision ; s'ils n'existent pas encore,
   * ils sont construits une seule fois. */
  (hydrated.classes||[]).forEach(function(c){var cid=Number(c.classeId||c.id)||0;(c.periodes||[]).forEach(function(p){
    var pid=Number(p.id||p.periodeId)||0,key=cid+'|'+pid;
    if(!cid||!pid||wanted.some(function(t){return t.classe===cid&&t.periode===pid;}))return;
    var oldDetail=previousDetails[key];
    if(!oldDetail){wanted.push({classe:cid,periode:pid,p:p});return;}
    var copy=EUC_DEV425_clone_(oldDetail);copy.__dev425Revision=token.revision;copy.__dev425FreshAt=new Date().toISOString();
    details.push({classe:cid,periode:pid,detail:copy});
    try{if(typeof EUC_DEV416_key_==='function'&&typeof EUC_DEV416_cachePut_==='function')EUC_DEV416_cachePut_(EUC_DEV416_key_(annee,famille,cid,pid),copy);}catch(eCopyCache){}
  });});
  wanted.forEach(function(t){
    var detail=EUC_DEV190_buildHistoricalDetail_(annee,t.classe,t.periode);
    detail=EUC_DEV190J_enrichContacts_(detail);
    detail=EUC_DEV422_enrichDetailBatch_(detail,annee,famille,t.classe,t.periode,batch,t.p);
    detail.__dev425Revision=token.revision;detail.__dev425FreshAt=new Date().toISOString();
    EUC_DEV426_applyQuick_(t.p,EUC_DEV422_quickFromDetail_(detail));built++;
    details.push({classe:t.classe,periode:t.periode,detail:detail});
    try{if(typeof EUC_DEV416_key_==='function'&&typeof EUC_DEV416_cachePut_==='function')EUC_DEV416_cachePut_(EUC_DEV416_key_(annee,famille,t.classe,t.periode),detail);}catch(eCache){}
  });
  var expected=0,enriched=0;(hydrated.classes||[]).forEach(function(c){
    var appNames={};
    (c.periodes||[]).forEach(function(p){
      if(Number(p.id||p.periodeId)){expected++;if(p.quick)enriched++;}
      ((p.quick&&p.quick.apprentis)||[]).forEach(function(n){if(EUC_DEV425_txt_(n))appNames[EUC_DEV425_txt_(n)]=1;});
    });
    c.apprentis=Object.keys(appNames).length;
  });
  if(expected&&enriched!==expected)throw new Error('DEV425 : snapshot '+famille+' incomplet ('+enriched+'/'+expected+').');
  hydrated.__dev424Enriched=true;hydrated.__dev424Version=EUC_DEV424_DETAIL_VERSION_;
  hydrated.__dev425Revision=token.revision;hydrated.__dev425FreshAt=new Date().toISOString();hydrated.__source='snapshot-atomique-immediat';
  /* Les détails et la synthèse portent la même révision. Tant que l'état est
   * DIRTY aucun lecteur ne peut les présenter comme à jour. */
  EUC_DEV427_writeDetails_(annee,famille,details);
  EUC_DEV424_writeFamily_(annee,famille,hydrated);
  return {famille:famille,detailsRecalcules:built,periodes:expected,_payload:hydrated};
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
  out.forEach(function(x){
    try{if(x&&x._payload&&typeof EUC_DEV421_familyCachePut_==='function')EUC_DEV421_familyCachePut_(token.annee,x.famille,x._payload);}catch(e){}
    if(x)delete x._payload;
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

/* Initialisation ponctuelle de la famille la plus consultée. Elle ne modifie
 * que les vues matérialisées autorisées, jamais les élèves ni conventions. */
function EUC_DEV427_initializeBacproDetails(){
  EUC_DEV424_assertTarget_();
  var annee=EUC_DEV425_txt_(EUC_PFMP_contexteAnneeLectureV155_().active);
  var token=EUC_DEV425_beginMutation_({annee:annee,famille:'BACPRO',reason:'initialisation-details-dev427'});
  token.syncAll=true;return EUC_DEV425_finishMutation_(token);
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
    /* Les cibles touchées sont conservées dans l'état DIRTY. La reprise
     * reconstruit uniquement ces périodes à partir du moteur métier et réutilise
     * les détails vérifiés du snapshot familial pour le reste. */
    var item=pending[0],state=item.state;
    var revision=EUC_DEV425_txt_(state&&state.revision)||EUC_DEV425_revision_();
    if(!state)EUC_DEV425_writeState_(annee,item.famille,{revision:revision,status:'DIRTY',reason:'filet-securite-15-min'});
    var result=EUC_DEV425_finishMutation_({
      annee:annee,families:[item.famille],targets:(state&&state.targets)||[],revision:revision,
      reason:'filet-securite-15-min',syncAll:false
    });
    return {ok:true,annee:annee,repaired:[result],remaining:Math.max(0,pending.length-1),durationMs:Date.now()-t0};
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
  /* Cette finalisation recalcule seulement les cibles conservées dans l'état
   * DIRTY, puis publie détails, index et READY dans cet ordre. */
  return EUC_DEV425_finishMutation_({
    annee:annee,families:[item.famille],targets:item.state.targets||[],revision:item.state.revision,
    reason:'finalisation-reprise',syncAll:false
  });
}

function EUC_DEV425_status(){
  EUC_DEV424_assertTarget_();var annee=EUC_DEV425_txt_(EUC_PFMP_contexteAnneeLectureV155_().active),states={};
  EUC_DEV425_FAMILIES_.forEach(function(f){states[f]=EUC_DEV425_readState_(annee,f);});
  return {ok:true,target:EUC_DEV424_ALLOWED_DOC_,annee:annee,states:states,triggerHandler:EUC_DEV424_HANDLER_,intervalMinutes:EUC_DEV424_INTERVAL_MINUTES_};
}
