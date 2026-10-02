/**
 * PFMP — Audit P7.1B ciblé conventions.
 *
 * Préfixe logs : PFMP_P71
 */
function EUC_P71_inc_(obj,key,ms,rows){
  if(!obj[key])obj[key]={count:0,ms:0,rows:0};
  obj[key].count++;
  obj[key].ms+=ms;
  if(rows!=null)obj[key].rows+=Number(rows)||0;
}

function EUC_P71_slimUrl_(url){
  var s=String(url||'');
  return s.length>180?s.slice(0,180)+'…':s;
}

function EUC_P71_wrap_(name,orig,args){
  var t0=Date.now();

  var read0=(typeof EUC_IMPORT_lireRecords_==='function')
    ? EUC_IMPORT_lireRecords_
    : null;

  var grist0=(typeof EUC_ENT_grist==='function')
    ? EUC_ENT_grist
    : null;

  var fetch0=UrlFetchApp.fetch;

  var stats={
    diagnostic:'PFMP_P71',
    fonction:name,
    startedAt:new Date().toISOString(),
    reads:{count:0,ms:0,detail:{}},
    grist:{count:0,ms:0,detail:{}},
    fetch:{count:0,ms:0,detail:{}}
  };

  try{
    if(read0){
      EUC_IMPORT_lireRecords_=function(table){
        var ts=Date.now(),out;
        try{
          out=read0(table);
          return out;
        } finally {
          var ms=Date.now()-ts;
          var rows=(out&&out.length!=null)?out.length:null;

          stats.reads.count++;
          stats.reads.ms+=ms;

          EUC_P71_inc_(
            stats.reads.detail,
            String(table||''),
            ms,
            rows
          );
        }
      };
    }

    if(grist0){
      EUC_ENT_grist=function(method,path,body){
        var ts=Date.now();

        try{
          return grist0(method,path,body);
        } finally {
          var ms=Date.now()-ts;
          var key=
            String(method||'').toUpperCase()+
            ' '+
            String(path||'');

          stats.grist.count++;
          stats.grist.ms+=ms;

          EUC_P71_inc_(
            stats.grist.detail,
            key,
            ms,
            null
          );
        }
      };
    }

    UrlFetchApp.fetch=function(url,params){
      var ts=Date.now();

      try{
        return fetch0(url,params);
      } finally {
        var ms=Date.now()-ts;
        var key=EUC_P71_slimUrl_(url);

        stats.fetch.count++;
        stats.fetch.ms+=ms;

        EUC_P71_inc_(
          stats.fetch.detail,
          key,
          ms,
          null
        );
      }
    };

    return orig.apply(this,args||[]);
  } catch(err){
    stats.erreur=String(err&&err.message||err);
    throw err;
  } finally {
    if(read0)EUC_IMPORT_lireRecords_=read0;
    if(grist0)EUC_ENT_grist=grist0;
    UrlFetchApp.fetch=fetch0;

    stats.totalMs=Date.now()-t0;
    stats.otherMs=Math.max(
      0,
      stats.totalMs
      - stats.reads.ms
      - stats.grist.ms
      - stats.fetch.ms
    );

    console.log(
      'PFMP_P71 '+JSON.stringify(stats)
    );
  }
}

function EUC_CONVENTION_preparerAcces(){
  return EUC_P71_wrap_(
    'EUC_CONVENTION_preparerAcces',
    EUC_CONVENTION_preparerAcces__P71_ORIG,
    arguments
  );
}

function EUC_CONVENTION_preparerAccesClasseNom(){
  return EUC_P71_wrap_(
    'EUC_CONVENTION_preparerAccesClasseNom',
    EUC_CONVENTION_preparerAccesClasseNom__P71_ORIG,
    arguments
  );
}

function EUC_PARAM_CONV_lister(){
  return EUC_P71_wrap_(
    'EUC_PARAM_CONV_lister',
    EUC_PARAM_CONV_lister__P71_ORIG,
    arguments
  );
}

function EUC_CONVENTION_listerModelesLignesV110(){
  return EUC_P71_wrap_(
    'EUC_CONVENTION_listerModelesLignesV110',
    EUC_CONVENTION_listerModelesLignesV110__P71_ORIG,
    arguments
  );
}

function EUC_CONVENTION_lireClassesEtPeriodesAdmin(){
  /* DEV177B_CACHE */
  var __cache=CacheService.getScriptCache();
  var __key='DEV177B_CLASSES_PERIODES';
  var __got=__cache.get(__key);
  if(__got){
    try{return JSON.parse(__got);}catch(__e){}
  }
  var __value=(function(){

  return EUC_P71_wrap_(
    'EUC_CONVENTION_lireClassesEtPeriodesAdmin',
    EUC_CONVENTION_lireClassesEtPeriodesAdmin__P71_ORIG,
    arguments
  );

  })();
  try{__cache.put(__key,JSON.stringify(__value),300);}catch(__e){}
  return __value;
}

function EUC_CONVENTION_lireElevesAdmin(){
  /* DEV179_CACHE_ELEVES */
  var __c=CacheService.getScriptCache();
  var __k='DEV179_ELEVES_GENERATEUR';
  var __g=__c.get(__k);
  if(__g){try{return JSON.parse(__g);}catch(__e){}}
  var __v=(function(){

  /* DEV177B_CACHE */
  var __cache=CacheService.getScriptCache();
  var __key='DEV177B_ELEVES_GENERATEUR';
  var __got=__cache.get(__key);
  if(__got){
    try{return JSON.parse(__got);}catch(__e){}
  }
  var __value=(function(){

  return EUC_P71_wrap_(
    'EUC_CONVENTION_lireElevesAdmin',
    EUC_CONVENTION_lireElevesAdmin__P71_ORIG,
    arguments
  );

  })();
  try{__cache.put(__key,JSON.stringify(__value),300);}catch(__e){}
  return __value;

  })();
  try{__c.put(__k,JSON.stringify(__v),600);}catch(__e){}
  return __v;
}

function DIAGNOSTIC_P71_ETAT(){
  return {
    ok:true,
    audit:'P7.1B',
    fonctions:[
      'EUC_CONVENTION_preparerAcces',
      'EUC_CONVENTION_preparerAccesClasseNom',
      'EUC_PARAM_CONV_lister',
      'EUC_CONVENTION_listerModelesLignesV110',
      'EUC_CONVENTION_lireClassesEtPeriodesAdmin',
      'EUC_CONVENTION_lireElevesAdmin'
    ]
  };
}
