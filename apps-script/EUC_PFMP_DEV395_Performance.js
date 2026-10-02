/**
 * PFMP — DEV395
 * Helpers cache performance.
 */
var EUC_DEV395_CTX_CACHE_KEY_='DEV395_CTX_ANNEE_V1';
var EUC_DEV395_CTX_PROP_KEY_='DEV395_CTX_ANNEE_PERSIST_V1';
var EUC_DEV395_CTX_TTL_SEC_=300;
var EUC_DEV395_CTX_PROP_MAX_AGE_MS_=0; // DEV398 durable jusqu'à invalidation

function EUC_DEV395_getCachedContext_(){
  var cache=CacheService.getScriptCache();
  var raw=null;

  try{raw=cache.get(EUC_DEV395_CTX_CACHE_KEY_);}catch(e){}

  if(raw){
    try{return JSON.parse(raw);}catch(e2){}
  }

  try{
    var prop=PropertiesService.getScriptProperties()
      .getProperty(EUC_DEV395_CTX_PROP_KEY_);

    if(prop){
      var o=JSON.parse(prop);
      if(
        o &&
        o.savedAt &&
        (
          EUC_DEV395_CTX_PROP_MAX_AGE_MS_<=0 ||
          (Date.now()-Number(o.savedAt)) < EUC_DEV395_CTX_PROP_MAX_AGE_MS_
        ) &&
        o.value
      ){
        try{
          cache.put(
            EUC_DEV395_CTX_CACHE_KEY_,
            JSON.stringify(o.value),
            EUC_DEV395_CTX_TTL_SEC_
          );
        }catch(e3){}
        return o.value;
      }
    }
  }catch(e4){}

  return null;
}

function EUC_DEV395_putCachedContext_(ctx){
  if(!ctx)return ctx;

  var raw=JSON.stringify(ctx);

  try{
    CacheService.getScriptCache().put(
      EUC_DEV395_CTX_CACHE_KEY_,
      raw,
      EUC_DEV395_CTX_TTL_SEC_
    );
  }catch(e){}

  try{
    PropertiesService.getScriptProperties().setProperty(
      EUC_DEV395_CTX_PROP_KEY_,
      JSON.stringify({
        savedAt:Date.now(),
        value:ctx
      })
    );
  }catch(e2){}

  return ctx;
}

function EUC_DEV395_clearPerfCaches(){
  try{
    CacheService.getScriptCache().remove(
      EUC_DEV395_CTX_CACHE_KEY_
    );
  }catch(e){}

  try{
    PropertiesService.getScriptProperties().deleteProperty(
      EUC_DEV395_CTX_PROP_KEY_
    );
  }catch(e2){}

  return {ok:true};
}
