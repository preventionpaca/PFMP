var EUC_PERF_P5_TTL_=300;
var EUC_PERF_P51_HTML_TTL_=20;

var EUC_PERF_P5_STATIC_={
  'Annees_Scolaires':true,
  'Classes':true,
  'Planning_Periodes':true,
  'EUC_PROFESSEURS_PFMP':true,
  'EUC_CLASSES_PROFESSEURS_PFMP':true,
  'EUC_CLASSES_DIPLOMES_PFMP':true
};

function EUC_PERF_P5_key_(table){
  return 'EUC_PFMP_P5_'+String(table||'');
}

function EUC_PERF_P5_params_(e){
  var src=(e&&e.parameter)||{},out={};
  Object.keys(src).sort().forEach(function(k){
    var v=src[k];
    if(v!==undefined&&v!==null&&String(v)!=='')out[k]=String(v);
  });
  return out;
}

function EUC_PERF_P5_hash_(obj){
  var bytes=Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(obj||{}),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b){
    var n=b<0?b+256:b;
    return ('0'+n.toString(16)).slice(-2);
  }).join('');
}

function EUC_PERF_P5_htmlKey_(kind,params){
  return 'EUC_PFMP_P51_HTML_'+kind+'_'+EUC_PERF_P5_hash_(params);
}

function EUC_PERF_P5_wrap_(fn,e){
  var original=EUC_IMPORT_lireRecords_;
  var cache=CacheService.getScriptCache();
  var memo={};

  try{
    EUC_IMPORT_lireRecords_=function(table){
      table=String(table||'').trim();

      if(Object.prototype.hasOwnProperty.call(memo,table)){
        return memo[table];
      }

      if(EUC_PERF_P5_STATIC_[table]){
        var key=EUC_PERF_P5_key_(table);
        var cached=cache.get(key);

        if(cached){
          memo[table]=JSON.parse(cached);
          return memo[table];
        }

        memo[table]=original(table);
        try{
          cache.put(key,JSON.stringify(memo[table]),EUC_PERF_P5_TTL_);
        }catch(err){}
        return memo[table];
      }

      memo[table]=original(table);
      return memo[table];
    };

    return fn(e);
  } finally {
    EUC_IMPORT_lireRecords_=original;
  }
}

function EUC_CONVENTION_afficherImpressionP51_core_(e){
  return EUC_PERF_P5_wrap_(EUC_CONVENTION_afficherImpression,e);
}

function EUC_CONVENTION_afficherImpressionLotP51_core_(e){
  return EUC_PERF_P5_wrap_(EUC_CONVENTION_afficherImpressionLot,e);
}

function EUC_CONVENTION_afficherImpressionP51(e){
  var params=EUC_PERF_P5_params_(e);
  var key=EUC_PERF_P5_htmlKey_('print',params);
  var cache=CacheService.getScriptCache();
  var cached=cache.get(key);

  if(cached){
    cache.remove(key);
    return HtmlService.createHtmlOutput(cached)
      .setTitle('Convention PFMP')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return EUC_CONVENTION_afficherImpressionP51_core_(e);
}

function EUC_CONVENTION_afficherImpressionLotP51(e){
  var params=EUC_PERF_P5_params_(e);
  var key=EUC_PERF_P5_htmlKey_('batch',params);
  var cache=CacheService.getScriptCache();
  var cached=cache.get(key);

  if(cached){
    cache.remove(key);
    return HtmlService.createHtmlOutput(cached)
      .setTitle('Conventions PFMP — lot')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return EUC_CONVENTION_afficherImpressionLotP51_core_(e);
}

function EUC_CONVENTION_prewarmPrintP51(payload){
  payload=payload||{};
  var fake={parameter:payload.params||{}};
  var html=EUC_CONVENTION_afficherImpressionP51_core_(fake);

  if(!html||typeof html.getContent!=='function'){
    throw new Error('Préchargement impression impossible.');
  }

  var params=EUC_PERF_P5_params_(fake);
  CacheService.getScriptCache().put(
    EUC_PERF_P5_htmlKey_('print',params),
    html.getContent(),
    EUC_PERF_P51_HTML_TTL_
  );

  return {ok:true};
}

function EUC_CONVENTION_prewarmBatchPrintP51(payload){
  payload=payload||{};
  var fake={parameter:payload.params||{}};
  var html=EUC_CONVENTION_afficherImpressionLotP51_core_(fake);

  if(!html||typeof html.getContent!=='function'){
    throw new Error('Préchargement impression lot impossible.');
  }

  var params=EUC_PERF_P5_params_(fake);
  CacheService.getScriptCache().put(
    EUC_PERF_P5_htmlKey_('batch',params),
    html.getContent(),
    EUC_PERF_P51_HTML_TTL_
  );

  return {ok:true};
}
