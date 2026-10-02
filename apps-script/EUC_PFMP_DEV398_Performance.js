var EUC_DEV398_ACCESS_PROP_PREFIX_='DEV418_ACCESS_ROWS_';
var EUC_DEV398_ACCESS_YEARS_PROP_='DEV418_ACCESS_KEYS_V1';
var EUC_DEV398_ACCESS_MEMORY_TTL_SEC_=300;

function EUC_DEV398_accessSignature_(annee,classe,periode){
  return String(annee||'').trim()+'_'+Number(classe||0)+'_'+Number(periode||0);
}
function EUC_DEV398_accessPropKey_(annee,classe,periode){
  return EUC_DEV398_ACCESS_PROP_PREFIX_+EUC_DEV398_accessSignature_(annee,classe,periode);
}
function EUC_DEV398_accessYears_(){
  try{
    var raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV398_ACCESS_YEARS_PROP_)||'[]';
    var arr=JSON.parse(raw)||[];
    return Array.isArray(arr)?arr:[];
  }catch(e){return [];}
}
function EUC_DEV398_rememberAccessYear_(annee,classe,periode){
  var signature=EUC_DEV398_accessSignature_(annee,classe,periode);
  if(!String(annee||'').trim()||!Number(classe)||!Number(periode))return;
  try{
    var p=PropertiesService.getScriptProperties();
    var arr=EUC_DEV398_accessYears_();
    if(arr.indexOf(signature)<0){
      arr.push(signature);
      p.setProperty(EUC_DEV398_ACCESS_YEARS_PROP_,JSON.stringify(arr.slice(-10)));
    }
  }catch(e){}
}
function EUC_DEV398_getPersistentAccess_(annee,classe,periode){
  var y=String(annee||'').trim();
  var c=Number(classe)||0,p=Number(periode)||0;
  if(!y||!c||!p)return null;
  try{
    var raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV398_accessPropKey_(y,c,p));
    if(!raw)return null;
    var rows=JSON.parse(raw);
    if(!Array.isArray(rows))return null;
    EUC_DEV398_rememberAccessYear_(y,c,p);
    try{
      var key=typeof EUC_DEV340_accessKey_==='function'?EUC_DEV340_accessKey_(y,c,p):'';
      if(key)CacheService.getScriptCache().put(key,JSON.stringify(rows),EUC_DEV398_ACCESS_MEMORY_TTL_SEC_);
    }catch(e2){}
    return rows;
  }catch(e){return null;}
}
function EUC_DEV398_putPersistentAccess_(annee,classe,periode,rows){
  var y=String(annee||'').trim();
  var c=Number(classe)||0,p=Number(periode)||0;
  if(!y||!c||!p||!Array.isArray(rows))return rows;
  try{
    PropertiesService.getScriptProperties().setProperty(EUC_DEV398_accessPropKey_(y,c,p),JSON.stringify(rows));
    EUC_DEV398_rememberAccessYear_(y,c,p);
  }catch(e){}
  return rows;
}
function EUC_DEV398_invalidateAccessCaches_(){
  var signatures=EUC_DEV398_accessYears_();
  try{
    var cache=CacheService.getScriptCache();
    signatures.forEach(function(signature){
      try{
        var parts=String(signature).split('_');
        var periode=Number(parts.pop())||0,classe=Number(parts.pop())||0,annee=parts.join('_');
        if(typeof EUC_DEV340_accessKey_==='function')cache.remove(EUC_DEV340_accessKey_(annee,classe,periode));
      }catch(e){}
    });
  }catch(e2){}
  try{
    var props=PropertiesService.getScriptProperties();
    signatures.forEach(function(signature){props.deleteProperty(EUC_DEV398_ACCESS_PROP_PREFIX_+signature);});
    props.deleteProperty(EUC_DEV398_ACCESS_YEARS_PROP_);
  }catch(e3){}
  return true;
}
function EUC_DEV398_isAccessWrite_(method,url){
  var m=String(method||'').toLowerCase(),u=String(url||'');
  return m!=='get'&&m!=='head'&&u.indexOf('EUC_ACCES_FORMULAIRES_PFMP')>=0;
}
function EUC_DEV398_clearPerformanceCaches(){
  try{EUC_DEV398_invalidateAccessCaches_();}catch(e){}
  try{EUC_DEV395_clearPerfCaches();}catch(e2){}
  try{EUC_DEV396_clearApprenticeCache();}catch(e3){}
  return {ok:true};
}
