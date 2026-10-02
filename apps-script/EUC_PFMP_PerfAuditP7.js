/**
 * PFMP — Audit P7
 * Instrumentation fine des temps serveur sans modifier la logique métier.
 *
 * Les wrappers ci-dessous journalisent :
 * - durée route globale ;
 * - temps cumulé EUC_IMPORT_lireRecords_ ;
 * - temps cumulé EUC_ENT_grist ;
 * - temps cumulé UrlFetchApp.fetch ;
 * - nombre d'appels ;
 * - détail par table / méthode / URL.
 *
 * Les fonctions métier existantes sont appelées telles quelles.
 */

function EUC_P7_now_(){ return Date.now(); }

function EUC_P7_inc_(obj,key,ms){
  if(!obj[key])obj[key]={count:0,ms:0};
  obj[key].count++;
  obj[key].ms+=ms;
}

function EUC_P7_wrapRoute_(name,fn,e){
  var t0=EUC_P7_now_();

  var originalRead =
    (typeof EUC_IMPORT_lireRecords_==='function')
      ? EUC_IMPORT_lireRecords_
      : null;

  var originalGrist =
    (typeof EUC_ENT_grist==='function')
      ? EUC_ENT_grist
      : null;

  var originalFetch = UrlFetchApp.fetch;

  var stats={
    route:name,
    startedAt:new Date().toISOString(),
    reads:{count:0,ms:0,detail:{}},
    grist:{count:0,ms:0,detail:{}},
    fetch:{count:0,ms:0,detail:{}}
  };

  try{
    if(originalRead){
      EUC_IMPORT_lireRecords_=function(table){
        var ts=EUC_P7_now_();
        try{
          return originalRead(table);
        } finally {
          var ms=EUC_P7_now_()-ts;
          stats.reads.count++;
          stats.reads.ms+=ms;
          EUC_P7_inc_(stats.reads.detail,String(table||''),ms);
        }
      };
    }

    if(originalGrist){
      EUC_ENT_grist=function(method,path,body){
        var ts=EUC_P7_now_();
        try{
          return originalGrist(method,path,body);
        } finally {
          var ms=EUC_P7_now_()-ts;
          stats.grist.count++;
          stats.grist.ms+=ms;
          EUC_P7_inc_(
            stats.grist.detail,
            String(method||'').toUpperCase()+' '+String(path||''),
            ms
          );
        }
      };
    }

    UrlFetchApp.fetch=function(url,params){
      var ts=EUC_P7_now_();
      try{
        return originalFetch(url,params);
      } finally {
        var ms=EUC_P7_now_()-ts;
        stats.fetch.count++;
        stats.fetch.ms+=ms;

        var key=String(url||'');
        if(key.length>180)key=key.slice(0,180)+'…';
        EUC_P7_inc_(stats.fetch.detail,key,ms);
      }
    };

    return fn(e);
  } finally {
    if(originalRead)EUC_IMPORT_lireRecords_=originalRead;
    if(originalGrist)EUC_ENT_grist=originalGrist;
    UrlFetchApp.fetch=originalFetch;

    stats.totalMs=EUC_P7_now_()-t0;
    stats.otherMs=
      stats.totalMs
      - stats.reads.ms
      - stats.grist.ms
      - stats.fetch.ms;

    console.log(
      'PFMP_P7 '+JSON.stringify(stats)
    );
  }
}

/* -------- wrappers des parcours principaux -------- */

function EUC_P7_suiviClasses(e){
  return EUC_P7_wrapRoute_(
    'suivi-pfmp-classes',
    EUC_SUIVI_CLASSES_afficherP1,
    e
  );
}

function EUC_P7_suiviClasse(e){
  return EUC_P7_wrapRoute_(
    'suivi-pfmp-classe',
    EUC_SUIVI_CLASSE_afficherP23,
    e
  );
}

function EUC_P7_adminConventions(e){
  return EUC_P7_wrapRoute_(
    'admin-conventions-pfmp',
    EUC_ADMIN_CONVENTIONS_afficherP32,
    e
  );
}

function EUC_P7_generateur(e){
  return EUC_P7_wrapRoute_(
    'conventions-pfmp',
    EUC_CONVENTION_afficherGenerateurP41,
    e
  );
}

function EUC_P7_print(e){
  return EUC_P7_wrapRoute_(
    'convention-pfmp-print',
    EUC_CONVENTION_afficherImpressionP51,
    e
  );
}

function EUC_P7_batchPrint(e){
  return EUC_P7_wrapRoute_(
    'conventions-pfmp-batch-print',
    EUC_CONVENTION_afficherImpressionLotP51,
    e
  );
}

function EUC_P7_suiviEnt(e){
  return EUC_P7_wrapRoute_(
    'suivi-pfmp-ent',
    EUC_SUIVI_ENT_afficherClassesP61,
    e
  );
}

function EUC_P7_suiviEntClasse(e){
  return EUC_P7_wrapRoute_(
    'suivi-pfmp-ent-classe',
    EUC_SUIVI_ENT_afficherClasseP61,
    e
  );
}

function EUC_P7_migration(e){
  return EUC_P7_wrapRoute_(
    'migration-jotform-pfmp',
    EUC_V160_afficherP61,
    e
  );
}

function EUC_P7_destinataires(e){
  return EUC_P7_wrapRoute_(
    'destinataires-envois-pfmp',
    EUC_V158_afficherP61,
    e
  );
}

function EUC_P7_parametresEnvois(e){
  return EUC_P7_wrapRoute_(
    'parametres-envois-pfmp',
    EUC_V157_afficherParametresP61,
    e
  );
}
