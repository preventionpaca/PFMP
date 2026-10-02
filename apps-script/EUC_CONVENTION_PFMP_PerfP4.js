/**
 * PFMP — Performance P4.1
 * Route conventions-pfmp.
 * Cache référentiels 5 min + préchargement HTML one-shot 20 s.
 */
var EUC_PERF_P4_VERSION_='p4.1';
var EUC_PERF_P4_TTL_=300;
var EUC_PERF_P41_HTML_TTL_=20;

var EUC_PERF_P4_STATIC_TABLES_={
  'Annees_Scolaires':true,
  'Classes':true,
  'Planning_Periodes':true,
  'EUC_PROFESSEURS_PFMP':true,
  'EUC_CLASSES_PROFESSEURS_PFMP':true,
  'EUC_CLASSES_DIPLOMES_PFMP':true
};

function EUC_PERF_P4_key_(table){
  return ['EUC','PFMP','P4',EUC_PERF_P4_VERSION_,String(table||'')].join('_');
}

function EUC_PERF_P4_log_(operation,t0,extra){
  var p={diagnostic:'PFMP_PERF',phase:'P4.1',operation:operation,dureeMs:Date.now()-t0};
  extra=extra||{};
  Object.keys(extra).forEach(function(k){p[k]=extra[k];});
  console.log(JSON.stringify(p));
}

function EUC_PERF_P4_params_(e){
  var src=(e&&e.parameter)||{};
  var out={};
  Object.keys(src).sort().forEach(function(k){
    var v=src[k];
    if(v!==undefined && v!==null && String(v)!=='')out[k]=String(v);
  });
  return out;
}

function EUC_PERF_P4_hash_(obj){
  var raw=JSON.stringify(obj||{});
  var bytes=Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    raw,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b){
    var n=(b<0)?b+256:b;
    return ('0'+n.toString(16)).slice(-2);
  }).join('');
}

function EUC_PERF_P4_htmlKey_(params){
  return 'EUC_PFMP_P41_HTML_'+EUC_PERF_P4_hash_(params);
}

function EUC_CONVENTION_afficherGenerateurP41_core_(e){
  var t0=Date.now();
  var original=EUC_IMPORT_lireRecords_;
  var cache=CacheService.getScriptCache();
  var memo={};
  var stats={appels:0,cacheHits:0,cacheMiss:0,memoHits:0,directReads:0};

  try{
    EUC_IMPORT_lireRecords_=function(table){
      table=String(table||'').trim();
      stats.appels++;

      if(Object.prototype.hasOwnProperty.call(memo,table)){
        stats.memoHits++;
        return memo[table];
      }

      if(EUC_PERF_P4_STATIC_TABLES_[table]){
        var key=EUC_PERF_P4_key_(table);
        var cached=cache.get(key);

        if(cached){
          stats.cacheHits++;
          memo[table]=JSON.parse(cached);
          return memo[table];
        }

        var rows=original(table);
        stats.cacheMiss++;

        try{
          cache.put(key,JSON.stringify(rows),EUC_PERF_P4_TTL_);
        }catch(err){}

        memo[table]=rows;
        return rows;
      }

      stats.directReads++;
      memo[table]=original(table);
      return memo[table];
    };

    var html=EUC_CONVENTION_afficherGenerateur(e);
    EUC_PERF_P4_log_('generateur_core',t0,stats);
    return html;
  } finally {
    EUC_IMPORT_lireRecords_=original;
  }
}

function EUC_CONVENTION_afficherGenerateurP41(e){
  var t0=Date.now();
  var params=EUC_PERF_P4_params_(e);
  var key=EUC_PERF_P4_htmlKey_(params);
  var cache=CacheService.getScriptCache();
  var cached=cache.get(key);

  if(cached){
    cache.remove(key);
    EUC_PERF_P4_log_('generateur_prefetch_hit',t0,{params:params});

    return HtmlService
      .createHtmlOutput(cached)
      .setTitle('Générateur de conventions PFMP')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  var html=EUC_CONVENTION_afficherGenerateurP41_core_(e);
  EUC_PERF_P4_log_('generateur_prefetch_miss',t0,{params:params});
  return html;
}

function EUC_CONVENTION_prewarmP41(payload){
  payload=payload||{};
  var t0=Date.now();
  var params=payload.params||{};
  var fakeEvent={parameter:params};

  var html=EUC_CONVENTION_afficherGenerateurP41_core_(fakeEvent);

  if(!html || typeof html.getContent!=='function'){
    throw new Error('Préchargement P4.1 impossible : HTML indisponible.');
  }

  var content=html.getContent();
  var key=EUC_PERF_P4_htmlKey_(EUC_PERF_P4_params_(fakeEvent));

  CacheService.getScriptCache().put(
    key,
    content,
    EUC_PERF_P41_HTML_TTL_
  );

  EUC_PERF_P4_log_('generateur_prefetch_build',t0,{
    params:params,
    octets:content.length
  });

  return {
    ok:true,
    dureeMs:Date.now()-t0,
    octets:content.length
  };
}
