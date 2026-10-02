/**
 * PFMP — Performance P2.1
 * Route : suivi-pfmp-classe
 *
 * Principe :
 * - on conserve intégralement la logique métier F18 existante ;
 * - on intercepte uniquement EUC_IMPORT_lireRecords_ pendant la requête ;
 * - les petites tables de référence sont mises en cache 5 minutes ;
 * - les tables dynamiques restent toujours lues en direct.
 *
 * Tables dynamiques NON cachées :
 * - EUC_ELEVES_PFMP
 * - EUC_AFFECTATIONS_SUIVI_PFMP
 * - données conventions / entreprises
 */

var EUC_PERF_P2_VERSION_='p2.1';
var EUC_PERF_P2_TTL_=300;

var EUC_PERF_P2_STATIC_TABLES_={
  'Annees_Scolaires':true,
  'Classes':true,
  'Planning_Periodes':true,
  'EUC_PROFESSEURS_PFMP':true,
  'EUC_CLASSES_PROFESSEURS_PFMP':true
};

function EUC_PERF_P2_key_(table){
  return [
    'EUC','PFMP','P2',
    EUC_PERF_P2_VERSION_,
    String(table||'')
  ].join('_');
}

function EUC_PERF_P2_log_(operation,t0,extra){
  var p={
    diagnostic:'PFMP_PERF',
    phase:'P2.1',
    operation:operation,
    dureeMs:Date.now()-t0
  };
  extra=extra||{};
  Object.keys(extra).forEach(function(k){p[k]=extra[k];});
  console.log(JSON.stringify(p));
}

function EUC_SUIVI_CLASSE_afficherP2(e){
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

      if(EUC_PERF_P2_STATIC_TABLES_[table]){
        var key=EUC_PERF_P2_key_(table);
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
          cache.put(key,JSON.stringify(rows2),EUC_PERF_P2_TTL_);
        }catch(err){
          console.log(JSON.stringify({
            diagnostic:'PFMP_PERF',
            phase:'P2.1',
            operation:'cache_put_error',
            table:table,
            erreur:String(err&&err.message||err)
          }));
        }

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

    var html=EUC_SUIVI_CLASSE_afficherF18(e);

    EUC_PERF_P2_log_('route_detail_classe',t0,{
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

function DIAGNOSTIC_PERF_P2_CACHES(){
  var cache=CacheService.getScriptCache();
  var out={phase:'P2.1',tables:{}};

  Object.keys(EUC_PERF_P2_STATIC_TABLES_).forEach(function(table){
    var v=cache.get(EUC_PERF_P2_key_(table));
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
 * PFMP — Performance P2.2
 * Pré-chauffage des référentiels P2.1 depuis les vignettes.
 */
function EUC_SUIVI_CLASSE_prewarmP22(payload){
  payload=payload||{};
  var t0=Date.now();
  var annee=String(payload.annee||'').trim();
  var classeId=Number(payload.classeId)||0;

  if(!annee || !classeId){
    throw new Error('Pré-chauffage impossible : année/classe manquante.');
  }

  var original=EUC_IMPORT_lireRecords_;
  var cache=CacheService.getScriptCache();

  try{
    EUC_IMPORT_lireRecords_=function(table){
      table=String(table||'').trim();

      if(EUC_PERF_P2_STATIC_TABLES_[table]){
        var key=EUC_PERF_P2_key_(table);
        var cached=cache.get(key);
        if(cached)return JSON.parse(cached);

        var rows=original(table);
        try{
          cache.put(key,JSON.stringify(rows),EUC_PERF_P2_TTL_);
        }catch(e){}
        return rows;
      }

      return original(table);
    };

    [
      'Annees_Scolaires',
      'Classes',
      'Planning_Periodes',
      'EUC_PROFESSEURS_PFMP',
      'EUC_CLASSES_PROFESSEURS_PFMP'
    ].forEach(function(t){
      EUC_IMPORT_lireRecords_(t);
    });

    EUC_PERF_P2_log_('prewarm_vignette',t0,{
      annee:annee,
      classeId:classeId
    });

    return {
      ok:true,
      annee:annee,
      classeId:classeId,
      dureeMs:Date.now()-t0
    };
  } finally {
    EUC_IMPORT_lireRecords_=original;
  }
}

/**
 * PFMP — Performance P2.3
 *
 * Au survol d'une vignette :
 * - construit réellement la page détail demandée ;
 * - stocke son HTML 20 secondes dans CacheService ;
 * - au clic, la route consomme ce HTML UNE SEULE FOIS puis supprime le cache.
 *
 * Objectif : supprimer le temps d'attente entre clic vignette et affichage.
 * Le cache est one-shot afin d'éviter toute donnée métier périmée.
 */
var EUC_PERF_P23_TTL_=20;

function EUC_PERF_P23_params_(e){
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

function EUC_PERF_P23_hash_(obj){
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

function EUC_PERF_P23_key_(params){
  return 'EUC_PFMP_P23_'+EUC_PERF_P23_hash_(params);
}

function EUC_SUIVI_CLASSE_afficherP23(e){
  var t0=Date.now();
  var params=EUC_PERF_P23_params_(e);
  var key=EUC_PERF_P23_key_(params);
  var cache=CacheService.getScriptCache();

  var cached=cache.get(key);
  if(cached){
    cache.remove(key);

    EUC_PERF_P2_log_('detail_page_prefetch_hit',t0,{
      params:params
    });

    return HtmlService
      .createHtmlOutput(cached)
      .setTitle('Suivi PFMP par classe')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  var html=EUC_SUIVI_CLASSE_afficherP2(e);

  EUC_PERF_P2_log_('detail_page_prefetch_miss',t0,{
    params:params
  });

  return html;
}

function EUC_SUIVI_CLASSE_prewarmP23(payload){
  payload=payload||{};
  var t0=Date.now();
  var params=payload.params||{};

  if(!params || !Object.keys(params).length){
    throw new Error('Préchargement P2.3 : paramètres manquants.');
  }

  // Empêcher récursivité éventuelle : appel direct du wrapper P2.1.
  var fakeEvent={parameter:params};
  var html=EUC_SUIVI_CLASSE_afficherP2(fakeEvent);

  if(!html || typeof html.getContent!=='function'){
    throw new Error('Préchargement P2.3 : HTML indisponible.');
  }

  var content=html.getContent();
  var key=EUC_PERF_P23_key_(EUC_PERF_P23_params_(fakeEvent));

  CacheService
    .getScriptCache()
    .put(key,content,EUC_PERF_P23_TTL_);

  EUC_PERF_P2_log_('detail_page_prefetch_build',t0,{
    params:params,
    octets:content.length
  });

  return {
    ok:true,
    dureeMs:Date.now()-t0,
    octets:content.length
  };
}

/**
 * PFMP — Performance P2.3
 *
 * Au survol d'une vignette :
 * - construit réellement la page détail demandée ;
 * - stocke son HTML 20 secondes dans CacheService ;
 * - au clic, la route consomme ce HTML UNE SEULE FOIS puis supprime le cache.
 *
 * Objectif : supprimer le temps d'attente entre clic vignette et affichage.
 * Le cache est one-shot afin d'éviter toute donnée métier périmée.
 */
var EUC_PERF_P23_TTL_=20;

function EUC_PERF_P23_params_(e){
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

function EUC_PERF_P23_hash_(obj){
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

function EUC_PERF_P23_key_(params){
  return 'EUC_PFMP_P23_'+EUC_PERF_P23_hash_(params);
}

function EUC_SUIVI_CLASSE_afficherP23(e){
  var t0=Date.now();
  var params=EUC_PERF_P23_params_(e);
  var key=EUC_PERF_P23_key_(params);
  var cache=CacheService.getScriptCache();

  var cached=cache.get(key);
  if(cached){
    cache.remove(key);

    EUC_PERF_P2_log_('detail_page_prefetch_hit',t0,{
      params:params
    });

    return HtmlService
      .createHtmlOutput(cached)
      .setTitle('Suivi PFMP par classe')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  var html=EUC_SUIVI_CLASSE_afficherP2(e);

  EUC_PERF_P2_log_('detail_page_prefetch_miss',t0,{
    params:params
  });

  return html;
}

function EUC_SUIVI_CLASSE_prewarmP23(payload){
  payload=payload||{};
  var t0=Date.now();
  var params=payload.params||{};

  if(!params || !Object.keys(params).length){
    throw new Error('Préchargement P2.3 : paramètres manquants.');
  }

  // Empêcher récursivité éventuelle : appel direct du wrapper P2.1.
  var fakeEvent={parameter:params};
  var html=EUC_SUIVI_CLASSE_afficherP2(fakeEvent);

  if(!html || typeof html.getContent!=='function'){
    throw new Error('Préchargement P2.3 : HTML indisponible.');
  }

  var content=html.getContent();
  var key=EUC_PERF_P23_key_(EUC_PERF_P23_params_(fakeEvent));

  CacheService
    .getScriptCache()
    .put(key,content,EUC_PERF_P23_TTL_);

  EUC_PERF_P2_log_('detail_page_prefetch_build',t0,{
    params:params,
    octets:content.length
  });

  return {
    ok:true,
    dureeMs:Date.now()-t0,
    octets:content.length
  };
}
