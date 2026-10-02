var EUC_DEV396_APP_PROP_PREFIX_='DEV396_APP_SNAPSHOT_';
var EUC_DEV396_APP_PROP_MAX_AGE_MS_=0; // DEV397 : durable jusqu\'à invalidation métier
var EUC_DEV396_APP_MEMORY_TTL_SEC_=300;

function EUC_DEV396_appPropKey_(annee){
  return EUC_DEV396_APP_PROP_PREFIX_+String(annee||'');
}

function EUC_DEV396_getPersistentAppSnapshot_(annee){
  try{
    var raw=PropertiesService.getScriptProperties()
      .getProperty(EUC_DEV396_appPropKey_(annee));
    if(!raw)return null;

    var o=JSON.parse(raw);
    if(
      !o ||
      !o.savedAt ||
      !o.value ||
      (
        EUC_DEV396_APP_PROP_MAX_AGE_MS_>0 &&
        (Date.now()-Number(o.savedAt))>=EUC_DEV396_APP_PROP_MAX_AGE_MS_
      )
    ){
      return null;
    }

    try{
      CacheService.getScriptCache().put(
        'EUC_APP172_SNAP_'+String(annee||''),
        JSON.stringify(o.value),
        EUC_DEV396_APP_MEMORY_TTL_SEC_
      );
    }catch(e2){}

    return o.value;
  }catch(e){
    return null;
  }
}

function EUC_DEV396_putPersistentAppSnapshot_(annee,value){
  if(!value)return value;

  try{
    PropertiesService.getScriptProperties().setProperty(
      EUC_DEV396_appPropKey_(annee),
      JSON.stringify({
        savedAt:Date.now(),
        value:value
      })
    );
  }catch(e){}

  return value;
}

function EUC_DEV396_invalidateAppSnapshots_(annee){
  var y=String(annee||'').trim();

  try{
    if(y){
      CacheService.getScriptCache().remove(
        'EUC_APP172_SNAP_'+y
      );
    }
  }catch(e){}

  try{
    var props=PropertiesService.getScriptProperties();

    if(y){
      props.deleteProperty(
        EUC_DEV396_appPropKey_(y)
      );
    }else{
      var all=props.getProperties();
      Object.keys(all).forEach(function(k){
        if(k.indexOf(EUC_DEV396_APP_PROP_PREFIX_)===0){
          props.deleteProperty(k);
        }
      });
    }
  }catch(e2){}

  return true;
}

function EUC_DEV396_clearApprenticeCache(){
  EUC_DEV396_invalidateAppSnapshots_('');
  return {ok:true};
}
