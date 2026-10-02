/**
 * PFMP — Performance P3.1
 * Route : admin-conventions-pfmp
 *
 * Conserve le moteur métier existant EUC_ADMIN_CONVENTIONS_afficherV146.
 * Cache 5 minutes les référentiels stables.
 * Les élèves et données de convention restent en lecture directe.
 */

var EUC_PERF_P3_VERSION_='p3.1';
var EUC_PERF_P3_TTL_=300;

var EUC_PERF_P3_STATIC_TABLES_={
  'Annees_Scolaires':true,
  'Classes':true,
  'Planning_Periodes':true,
  'EUC_PROFESSEURS_PFMP':true,
  'EUC_CLASSES_PROFESSEURS_PFMP':true
};

function EUC_PERF_P3_key_(table){
  return ['EUC','PFMP','P3',EUC_PERF_P3_VERSION_,String(table||'')].join('_');
}

function EUC_PERF_P3_log_(operation,t0,extra){
  var p={
    diagnostic:'PFMP_PERF',
    phase:'P3.1',
    operation:operation,
    dureeMs:Date.now()-t0
  };
  extra=extra||{};
  Object.keys(extra).forEach(function(k){p[k]=extra[k];});
  console.log(JSON.stringify(p));
}

function EUC_ADMIN_CONVENTIONS_afficherP31(e){
  var t0=Date.now();
  var original=EUC_IMPORT_lireRecords_;
  var cache=CacheService.getScriptCache();
  var memo={};

  var stats={
    appels:0,
    cacheHits:0,
    cacheMiss:0,
    memoHits:0,
    directReads:0,
    tables:{}
  };

  try{
    EUC_IMPORT_lireRecords_=function(table){
      table=String(table||'').trim();
      stats.appels++;

      if(Object.prototype.hasOwnProperty.call(memo,table)){
        stats.memoHits++;
        return memo[table];
      }

      var st=stats.tables[table]||(stats.tables[table]={
        cacheHit:0,
        cacheMiss:0,
        direct:0,
        lignes:0,
        ms:0
      });

      if(EUC_PERF_P3_STATIC_TABLES_[table]){
        var key=EUC_PERF_P3_key_(table);
        var tc=Date.now();
        var cached=cache.get(key);

        if(cached){
          var rows=JSON.parse(cached);
          memo[table]=rows;
          stats.cacheHits++;
          st.cacheHit++;
          st.lignes=(rows||[]).length;
          st.ms+=Date.now()-tc;
          return rows;
        }

        var tr=Date.now();
        var rows2=original(table);
        st.ms+=Date.now()-tr;
        st.lignes=(rows2||[]).length;
        st.cacheMiss++;
        stats.cacheMiss++;

        try{
          cache.put(key,JSON.stringify(rows2),EUC_PERF_P3_TTL_);
        }catch(err){}

        memo[table]=rows2;
        return rows2;
      }

      var td=Date.now();
      var rows3=original(table);
      st.ms+=Date.now()-td;
      st.lignes=(rows3||[]).length;
      st.direct++;
      stats.directReads++;
      memo[table]=rows3;

      return rows3;
    };

    var html=EUC_ADMIN_CONVENTIONS_afficherV146(e);

    EUC_PERF_P3_log_('admin_conventions_route',t0,{
      appelsLecture:stats.appels,
      cacheHits:stats.cacheHits,
      cacheMiss:stats.cacheMiss,
      memoHits:stats.memoHits,
      lecturesDynamiques:stats.directReads,
      detail:stats.tables
    });

    return html;
  } finally {
    EUC_IMPORT_lireRecords_=original;
  }
}

function DIAGNOSTIC_PERF_P3_CACHES(){
  var cache=CacheService.getScriptCache();
  var out={phase:'P3.1',tables:{}};

  Object.keys(EUC_PERF_P3_STATIC_TABLES_).forEach(function(table){
    var v=cache.get(EUC_PERF_P3_key_(table));
    out.tables[table]=v?{
      cache:true,
      lignes:(JSON.parse(v)||[]).length
    }:{
      cache:false
    };
  });

  console.log(JSON.stringify(out));
  return out;
}

/**
 * PFMP — Performance P3.2
 * Prépare la page exacte admin-conventions-pfmp avant clic.
 * Cache one-shot 20 secondes.
 */
var EUC_PERF_P32_TTL_=20;

function EUC_PERF_P32_params_(e){
  var src=(e&&e.parameter)||{};
  var out={};
  Object.keys(src).sort().forEach(function(k){
    var v=src[k];
    if(v!==undefined && v!==null && String(v)!==''){
      out[k]=String(v);
    }
  });
  return out;
}

function EUC_PERF_P32_hash_(obj){
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

function EUC_PERF_P32_key_(params){
  return 'EUC_PFMP_P32_'+EUC_PERF_P32_hash_(params);
}

function EUC_ADMIN_CONVENTIONS_afficherP32(e){
  var t0=Date.now();
  var params=EUC_PERF_P32_params_(e);
  var key=EUC_PERF_P32_key_(params);
  var cache=CacheService.getScriptCache();

  var cached=cache.get(key);
  if(cached){
    cache.remove(key);
    EUC_PERF_P3_log_('admin_conventions_prefetch_hit',t0,{params:params});
    return HtmlService
      .createHtmlOutput(cached)
      .setTitle('Administration conventions PFMP')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  var html=EUC_ADMIN_CONVENTIONS_afficherP31(e);
  EUC_PERF_P3_log_('admin_conventions_prefetch_miss',t0,{params:params});
  return html;
}

function EUC_ADMIN_CONVENTIONS_prewarmP32(payload){
  payload=payload||{};
  var t0=Date.now();
  var params=payload.params||{};
  var fakeEvent={parameter:params};

  var html=EUC_ADMIN_CONVENTIONS_afficherP31(fakeEvent);
  if(!html || typeof html.getContent!=='function'){
    throw new Error('Préchargement P3.2 impossible : HTML indisponible.');
  }

  var content=html.getContent();
  var key=EUC_PERF_P32_key_(EUC_PERF_P32_params_(fakeEvent));

  CacheService.getScriptCache().put(key,content,EUC_PERF_P32_TTL_);

  EUC_PERF_P3_log_('admin_conventions_prefetch_build',t0,{
    params:params,
    octets:content.length
  });

  return {ok:true,dureeMs:Date.now()-t0,octets:content.length};
}
