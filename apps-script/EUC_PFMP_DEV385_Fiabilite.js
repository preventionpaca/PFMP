/**
 * PFMP — DEV385
 * Cache court du décompte global, sans changer la source métier.
 */
function EUC_DEV385_resumeAccueil(payload){
  payload=payload||{};
  var annee=String(payload.annee||'').trim();
  var key='DEV385_RESUME_'+annee;
  var cache=CacheService.getScriptCache();
  var raw=null;
  try{raw=cache.get(key);}catch(e){}
  if(raw){try{return JSON.parse(raw);}catch(e2){}}
  var r=EUC_DEV348_resumeAccueil(payload);
  try{cache.put(key,JSON.stringify(r),120);}catch(e3){}
  return r;
}
