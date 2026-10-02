/**
 * PFMP — Performance P6.1
 *
 * Ecrans secondaires ciblés :
 * - suivi-pfmp-ent
 * - suivi-pfmp-ent-classe
 * - migration-jotform-pfmp
 * - destinataires-envois-pfmp
 * - parametres-envois-pfmp
 *
 * Principe :
 * - moteurs métier existants conservés ;
 * - cache 5 min des référentiels stables ;
 * - mémoïsation intra-requête ;
 * - préchargement HTML one-shot 20 s avant clic.
 */

var EUC_PERF_P6_TTL_=300;
var EUC_PERF_P61_HTML_TTL_=20;

var EUC_PERF_P6_STATIC_={
  'Annees_Scolaires':true,
  'Classes':true,
  'Planning_Periodes':true,
  'EUC_PROFESSEURS_PFMP':true,
  'EUC_CLASSES_PROFESSEURS_PFMP':true,
  'EUC_CLASSES_DIPLOMES_PFMP':true
};

function EUC_PERF_P6_key_(table){
  return 'EUC_PFMP_P6_'+String(table||'');
}

function EUC_PERF_P6_params_(e){
  var src=(e&&e.parameter)||{},out={};
  Object.keys(src).sort().forEach(function(k){
    var v=src[k];
    if(v!==undefined&&v!==null&&String(v)!=='')out[k]=String(v);
  });
  return out;
}

function EUC_PERF_P6_hash_(obj){
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

function EUC_PERF_P6_htmlKey_(kind,params){
  return 'EUC_PFMP_P61_HTML_'+kind+'_'+EUC_PERF_P6_hash_(params);
}

function EUC_PERF_P6_wrap_(fn,e){
  var original=EUC_IMPORT_lireRecords_;
  var cache=CacheService.getScriptCache();
  var memo={};

  try{
    EUC_IMPORT_lireRecords_=function(table){
      table=String(table||'').trim();

      if(Object.prototype.hasOwnProperty.call(memo,table)){
        return memo[table];
      }

      if(EUC_PERF_P6_STATIC_[table]){
        var key=EUC_PERF_P6_key_(table);
        var cached=cache.get(key);

        if(cached){
          memo[table]=JSON.parse(cached);
          return memo[table];
        }

        memo[table]=original(table);

        try{
          cache.put(
            key,
            JSON.stringify(memo[table]),
            EUC_PERF_P6_TTL_
          );
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

function EUC_PERF_P6_render_(kind,fn,e,title){
  var params=EUC_PERF_P6_params_(e);
  var key=EUC_PERF_P6_htmlKey_(kind,params);
  var cache=CacheService.getScriptCache();
  var cached=cache.get(key);

  if(cached){
    cache.remove(key);

    return HtmlService
      .createHtmlOutput(cached)
      .setTitle(title)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return EUC_PERF_P6_wrap_(fn,e);
}

function EUC_PERF_P6_prewarm_(kind,fn,title,payload){
  payload=payload||{};
  var fake={parameter:payload.params||{}};

  var html=EUC_PERF_P6_wrap_(fn,fake);

  if(!html||typeof html.getContent!=='function'){
    throw new Error('Préchargement P6 impossible : '+kind);
  }

  var params=EUC_PERF_P6_params_(fake);

  CacheService.getScriptCache().put(
    EUC_PERF_P6_htmlKey_(kind,params),
    html.getContent(),
    EUC_PERF_P61_HTML_TTL_
  );

  return {ok:true,kind:kind,title:title};
}

/* ---------- Routes entreprise ---------- */

function EUC_SUIVI_ENT_afficherClassesP61(e){
  return EUC_PERF_P6_render_(
    'suivi_ent',
    EUC_SUIVI_ENT_afficherClassesV161,
    e,
    'Suivi PFMP entreprise'
  );
}

function EUC_SUIVI_ENT_afficherClasseP61(e){
  return EUC_PERF_P6_render_(
    'suivi_ent_classe',
    EUC_SUIVI_ENT_afficherClasseV161,
    e,
    'Suivi PFMP entreprise — classe'
  );
}

/* ---------- Migration ---------- */

function EUC_V160_afficherP61(e){
  return EUC_PERF_P6_render_(
    'migration_jotform',
    EUC_V160_afficher,
    e,
    'Migration Jotform PFMP'
  );
}

/* ---------- Destinataires / envois ---------- */

function EUC_V158_afficherP61(e){
  return EUC_PERF_P6_render_(
    'destinataires',
    EUC_V158_afficher,
    e,
    'Destinataires PFMP'
  );
}

function EUC_V157_afficherParametresP61(e){
  return EUC_PERF_P6_render_(
    'parametres_envois',
    EUC_V157_afficherParametres,
    e,
    'Paramètres envois PFMP'
  );
}

/* ---------- Préchargements ---------- */

function EUC_PERF_P6_prewarmSuiviEnt(payload){
  return EUC_PERF_P6_prewarm_(
    'suivi_ent',
    EUC_SUIVI_ENT_afficherClassesV161,
    'Suivi PFMP entreprise',
    payload
  );
}

function EUC_PERF_P6_prewarmSuiviEntClasse(payload){
  return EUC_PERF_P6_prewarm_(
    'suivi_ent_classe',
    EUC_SUIVI_ENT_afficherClasseV161,
    'Suivi PFMP entreprise — classe',
    payload
  );
}

function EUC_PERF_P6_prewarmMigration(payload){
  return EUC_PERF_P6_prewarm_(
    'migration_jotform',
    EUC_V160_afficher,
    'Migration Jotform PFMP',
    payload
  );
}

function EUC_PERF_P6_prewarmDestinataires(payload){
  return EUC_PERF_P6_prewarm_(
    'destinataires',
    EUC_V158_afficher,
    'Destinataires PFMP',
    payload
  );
}

function EUC_PERF_P6_prewarmParametresEnvois(payload){
  return EUC_PERF_P6_prewarm_(
    'parametres_envois',
    EUC_V157_afficherParametres,
    'Paramètres envois PFMP',
    payload
  );
}
