var EUC_DEV398_ACCESS_PROP_PREFIX_='DEV398_ACCESS_ROWS_';
var EUC_DEV398_ACCESS_YEARS_PROP_='DEV398_ACCESS_YEARS_V1';
var EUC_DEV398_ACCESS_MEMORY_TTL_SEC_=300;

function EUC_DEV398_accessPropKey_(annee){
  return EUC_DEV398_ACCESS_PROP_PREFIX_+String(annee||'');
}
function EUC_DEV398_accessYears_(){
  try{
    var raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV398_ACCESS_YEARS_PROP_)||'[]';
    var arr=JSON.parse(raw)||[];
    return Array.isArray(arr)?arr:[];
  }catch(e){return [];}
}
function EUC_DEV398_rememberAccessYear_(annee){
  var y=String(annee||'').trim();
  if(!y)return;
  try{
    var p=PropertiesService.getScriptProperties();
    var arr=EUC_DEV398_accessYears_();
    if(arr.indexOf(y)<0){
      arr.push(y);
      p.setProperty(EUC_DEV398_ACCESS_YEARS_PROP_,JSON.stringify(arr.slice(-10)));
    }
  }catch(e){}
}
function EUC_DEV398_getPersistentAccess_(annee){
  var y=String(annee||'').trim();
  if(!y)return null;
  try{
    var raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV398_accessPropKey_(y));
    if(!raw)return null;
    var rows=JSON.parse(raw);
    if(!Array.isArray(rows))return null;
    EUC_DEV398_rememberAccessYear_(y);
    try{
      var key=typeof EUC_DEV340_accessKey_==='function'?EUC_DEV340_accessKey_(y):'';
      if(key)CacheService.getScriptCache().put(key,JSON.stringify(rows),EUC_DEV398_ACCESS_MEMORY_TTL_SEC_);
    }catch(e2){}
    return rows;
  }catch(e){return null;}
}
function EUC_DEV398_putPersistentAccess_(annee,rows){
  var y=String(annee||'').trim();
  if(!y||!Array.isArray(rows))return rows;
  try{
    PropertiesService.getScriptProperties().setProperty(EUC_DEV398_accessPropKey_(y),JSON.stringify(rows));
    EUC_DEV398_rememberAccessYear_(y);
  }catch(e){}
  return rows;
}
function EUC_DEV398_invalidateAccessCaches_(){
  var years=EUC_DEV398_accessYears_();
  try{
    var cache=CacheService.getScriptCache();
    years.forEach(function(y){
      try{
        if(typeof EUC_DEV340_accessKey_==='function'){
          var k=EUC_DEV340_accessKey_(y);
          if(k)cache.remove(k);
        }
      }catch(e){}
    });
  }catch(e2){}
  try{
    var props=PropertiesService.getScriptProperties();
    years.forEach(function(y){props.deleteProperty(EUC_DEV398_accessPropKey_(y));});
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
