/**
 * PFMP — Performance P1.1
 * Liste des classes : cache serveur + instrumentation.
 *
 * IMPORTANT :
 * - ne modifie pas la logique métier de EUC_V154_accueil_ ;
 * - ne modifie pas les filtres de classes / périodes ;
 * - conserve notamment le filtrage VFMP/VEMP déjà en place ;
 * - cache 5 minutes par année scolaire.
 */

var EUC_PERF_P1_VERSION_='p1.1';
var EUC_PERF_P1_TTL_=300;
var EUC_PERF_P1_CTX_KEY_='EUC_PFMP_P1_CONTEXTE_ANNEES';

function EUC_PERF_P1_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_PERF_P1_cacheKey_(annee){
  return [
    'EUC',
    'PFMP',
    'P1',
    EUC_PERF_P1_VERSION_,
    'LISTE_CLASSES',
    EUC_PERF_P1_txt_(annee)
  ].join('_');
}

function EUC_PERF_P1_log_(operation,t0,extra){
  var payload={
    diagnostic:'PFMP_PERF',
    phase:'P1.1',
    operation:operation,
    dureeMs:Date.now()-t0
  };
  extra=extra||{};
  Object.keys(extra).forEach(function(k){payload[k]=extra[k];});
  console.log(JSON.stringify(payload));
  return payload;
}

function EUC_SUIVI_CLASSES_invaliderCacheP1(annee){
  var cache=CacheService.getScriptCache();
  if(annee){
    cache.remove(EUC_PERF_P1_cacheKey_(annee));
    return {ok:true,annee:EUC_PERF_P1_txt_(annee)};
  }

  return {ok:true,global:true,version:EUC_PERF_P1_VERSION_};
}

function EUC_SUIVI_CLASSES_accueilP1(codeAnnee,force){
  var t0=Date.now();
  var annee=EUC_PERF_P1_txt_(codeAnnee);
  if(!annee)throw new Error('Année scolaire manquante.');

  var cache=CacheService.getScriptCache();
  var key=EUC_PERF_P1_cacheKey_(annee);

  if(!force){
    var cached=cache.get(key);
    if(cached){
      var parsed=JSON.parse(cached);
      EUC_PERF_P1_log_('liste_classes_cache_hit',t0,{
        annee:annee,
        cartes:(parsed.cartes||[]).length
      });
      return parsed;
    }
  }

  var tCalc=Date.now();
  var out=EUC_SUIVI_CLASSES_accueilP13_(annee);
  var calcMs=Date.now()-tCalc;

  try{
    cache.put(key,JSON.stringify(out),EUC_PERF_P1_TTL_);
  }catch(e){
    console.log(JSON.stringify({
      diagnostic:'PFMP_PERF',
      phase:'P1.1',
      operation:'cache_put_error',
      annee:annee,
      erreur:String(e&&e.message||e)
    }));
  }

  EUC_PERF_P1_log_('liste_classes_cache_miss',t0,{
    annee:annee,
    calculMs:calcMs,
    cartes:(out.cartes||[]).length
  });

  return out;
}


function EUC_SUIVI_CLASSES_contexteP12_(force){
  var t0=Date.now();
  var cache=CacheService.getScriptCache();

  if(!force){
    var cached=cache.get(EUC_PERF_P1_CTX_KEY_);
    if(cached){
      var ctx=JSON.parse(cached);
      EUC_PERF_P1_log_('contexte_cache_hit',t0,{
        annees:(ctx.annees||[]).length,
        active:ctx.active||''
      });
      return ctx;
    }
  }

  var ctx=EUC_SUIVI_CLASSES_contexteP12_(false);

  try{
    cache.put(EUC_PERF_P1_CTX_KEY_,JSON.stringify(ctx),EUC_PERF_P1_TTL_);
  }catch(e){}

  EUC_PERF_P1_log_('contexte_cache_miss',t0,{
    annees:(ctx.annees||[]).length,
    active:ctx.active||''
  });

  return ctx;
}

function EUC_SUIVI_CLASSES_afficherP1(e){
  var t0=Date.now();

  var ctx=EUC_PFMP_contexteAnneeV148();
  var requested=String(
    e&&e.parameter&&e.parameter.annee||''
  ).trim();

  if(
    requested &&
    ctx.annees &&
    ctx.annees.some(function(a){return a.code===requested;})
  ){
    ctx.active=requested;
    try{
      PropertiesService
        .getUserProperties()
        .setProperty('EUC_PFMP_ANNEE_ACTIVE_V148',requested);
    }catch(err){}
  }

  var tData=Date.now();
  var accueil=EUC_SUIVI_CLASSES_accueilP1(ctx.active,false);
  var dataMs=Date.now()-tData;

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classes');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.accueilJson=JSON.stringify(accueil);

  var html=tpl.evaluate()
    .setTitle('Suivi PFMP par classe')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  EUC_PERF_P1_log_('route_suivi_pfmp_classes',t0,{
    annee:ctx.active,
    dataMs:dataMs,
    cartes:(accueil.cartes||[]).length
  });

  return html;
}

function DIAGNOSTIC_PERF_P1_LISTE_CLASSES(){
  var ctx=EUC_PFMP_contexteAnneeV148();
  var annee=ctx.active;

  var t1=Date.now();
  var froid=EUC_SUIVI_CLASSES_accueilP1(annee,true);
  var froidMs=Date.now()-t1;

  var t2=Date.now();
  var chaud=EUC_SUIVI_CLASSES_accueilP1(annee,false);
  var chaudMs=Date.now()-t2;

  var out={
    phase:'P1.1',
    annee:annee,
    froidMs:froidMs,
    chaudMs:chaudMs,
    cartesFroid:(froid.cartes||[]).length,
    cartesChaud:(chaud.cartes||[]).length,
    gainMs:froidMs-chaudMs
  };

  console.log(JSON.stringify(out));
  return out;
}

function DIAGNOSTIC_PERF_P1_2_LISTE_CLASSES(){
  var cache=CacheService.getScriptCache();
  cache.remove(EUC_PERF_P1_CTX_KEY_);

  var t1=Date.now();
  var ctxFroid=EUC_SUIVI_CLASSES_contexteP12_(true);
  var ctxFroidMs=Date.now()-t1;

  var t2=Date.now();
  var ctxChaud=EUC_SUIVI_CLASSES_contexteP12_(false);
  var ctxChaudMs=Date.now()-t2;

  var t3=Date.now();
  var listeFroid=EUC_SUIVI_CLASSES_accueilP1(ctxFroid.active,true);
  var listeFroidMs=Date.now()-t3;

  var t4=Date.now();
  var listeChaud=EUC_SUIVI_CLASSES_accueilP1(ctxChaud.active,false);
  var listeChaudMs=Date.now()-t4;

  var out={
    phase:'P1.2',
    contexteFroidMs:ctxFroidMs,
    contexteChaudMs:ctxChaudMs,
    listeFroidMs:listeFroidMs,
    listeChaudMs:listeChaudMs
  };

  console.log(JSON.stringify(out));
  return out;
}

/**
 * PFMP — Performance P1.3
 * Mémoïsation des lectures EUC_IMPORT_lireRecords_ pendant
 * UNE construction de la page "Suivi PFMP par classe".
 *
 * L'original est restauré dans finally.
 * Aucun cache persistant de données métier n'est créé ici.
 */
function EUC_SUIVI_CLASSES_accueilP13_(annee){
  var t0=Date.now();
  var original=EUC_IMPORT_lireRecords_;
  var memo={};
  var totalCalls=0;
  var physicalReads=0;
  var hits=0;
  var stats={};

  try{
    EUC_IMPORT_lireRecords_=function(table){
      table=String(table||'').trim();
      totalCalls++;

      if(Object.prototype.hasOwnProperty.call(memo,table)){
        hits++;
        if(!stats[table])stats[table]={calls:0,reads:0,hits:0,rows:0,ms:0};
        stats[table].calls++;
        stats[table].hits++;
        return memo[table];
      }

      var tr=Date.now();
      var rows=original(table);
      var ms=Date.now()-tr;

      physicalReads++;
      memo[table]=rows;

      if(!stats[table])stats[table]={calls:0,reads:0,hits:0,rows:0,ms:0};
      stats[table].calls++;
      stats[table].reads++;
      stats[table].rows=(rows||[]).length;
      stats[table].ms+=ms;

      return rows;
    };

    var out=EUC_V154_accueil_(annee);

    console.log(JSON.stringify({
      diagnostic:'PFMP_PERF',
      phase:'P1.3',
      operation:'accueil_v154_memoise',
      annee:String(annee||''),
      dureeMs:Date.now()-t0,
      appelsLecture:totalCalls,
      lecturesPhysiques:physicalReads,
      lecturesEvitees:hits,
      tables:Object.keys(stats).length,
      detail:stats
    }));

    return out;
  } finally {
    EUC_IMPORT_lireRecords_=original;
  }
}

function DIAGNOSTIC_PERF_P1_3_LISTE_CLASSES(){
  var ctx=EUC_SUIVI_CLASSES_contexteP12_(false);
  var annee=ctx.active;

  var t0=Date.now();
  var out=EUC_SUIVI_CLASSES_accueilP13_(annee);

  var res={
    phase:'P1.3',
    annee:annee,
    dureeMs:Date.now()-t0,
    cartes:(out.cartes||[]).length
  };

  console.log(JSON.stringify(res));
  return res;
}
