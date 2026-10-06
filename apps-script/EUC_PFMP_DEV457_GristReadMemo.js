/** PFMP DEV457 — déduplication des lectures Grist identiques.
 *
 * Une consultation pouvait relire plusieurs fois la même table pendant une
 * seule exécution puis à chaque navigation. Les réponses GET communes sont
 * désormais mémorisées brièvement hors de Grist. Toute écriture change la
 * version de la table et rend immédiatement les anciennes lectures
 * inaccessibles, sans balayage ni appel Grist supplémentaire.
 */
var EUC_DEV457_VERSION_='1.0.0-dev.457';
var EUC_DEV457_MEMO_={};
var EUC_DEV457_PROP_PREFIX_='DEV457_TABLE_REV_';
var EUC_DEV457_CACHE_TTL_=120;

function EUC_DEV457_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV457_table_(path){
  var m=EUC_DEV457_t_(path).match(/^\/tables\/([^/?]+)(?:\/|\?|$)/);
  if(!m)return'';try{return decodeURIComponent(m[1]);}catch(e){return m[1];}
}
function EUC_DEV457_cacheable_(method,path){
  if(EUC_DEV457_t_(method).toLowerCase()!=='get')return false;
  return /^\/tables(?:\?|$)/.test(path)||/^\/tables\/[^/?]+\/(?:records|columns)(?:\?|$)/.test(path);
}
function EUC_DEV457_revision_(table){
  var p=PropertiesService.getScriptProperties(),all=p.getProperty(EUC_DEV457_PROP_PREFIX_+'ALL')||'0',one=table?(p.getProperty(EUC_DEV457_PROP_PREFIX_+table)||'0'):'0';
  return all+'_'+one;
}
function EUC_DEV457_bump_(path){
  var table=EUC_DEV457_table_(path),p=PropertiesService.getScriptProperties(),v=String(Date.now())+'_'+String(Math.random()).slice(2,8);
  p.setProperty(EUC_DEV457_PROP_PREFIX_+(table||'ALL'),v);EUC_DEV457_MEMO_={};
}
function EUC_DEV457_key_(path){
  var table=EUC_DEV457_table_(path),raw=EUC_DEV457_revision_(table)+'|'+path,digest='';
  try{digest=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,raw)).replace(/=+$/,'');}
  catch(e){digest=raw.replace(/[^A-Za-z0-9]/g,'_').slice(-180);}
  return'DEV457_GET_'+digest;
}
function EUC_DEV457_cacheGet_(key){
  var c=CacheService.getScriptCache(),n=Number(c.get(key+'_N'))||0,raw='';if(!n||n>6)return null;
  for(var i=0;i<n;i++){var part=c.get(key+'_'+i);if(part==null)return null;raw+=part;}
  try{return JSON.parse(raw);}catch(e){return null;}
}
function EUC_DEV457_cachePut_(key,value){
  var raw='';try{raw=JSON.stringify(value);}catch(e){return value;}var size=70000,n=Math.ceil(raw.length/size);if(!n||n>6)return value;
  var c=CacheService.getScriptCache();for(var i=0;i<n;i++)c.put(key+'_'+i,raw.slice(i*size,(i+1)*size),EUC_DEV457_CACHE_TTL_);c.put(key+'_N',String(n),EUC_DEV457_CACHE_TTL_);return value;
}
function EUC_DEV457_clone_(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
function EUC_DEV457_call_(base,context,args){
  var method=EUC_DEV457_t_(args[0]).toLowerCase(),path=EUC_DEV457_t_(args[1]),cacheable=EUC_DEV457_cacheable_(method,path),key='';
  if(cacheable){
    key=EUC_DEV457_key_(path);
    if(Object.prototype.hasOwnProperty.call(EUC_DEV457_MEMO_,key))return EUC_DEV457_clone_(EUC_DEV457_MEMO_[key]);
    var cached=EUC_DEV457_cacheGet_(key);if(cached!=null){EUC_DEV457_MEMO_[key]=cached;return EUC_DEV457_clone_(cached);}
  }
  var result=base.apply(context,args);
  if(cacheable){EUC_DEV457_MEMO_[key]=result;EUC_DEV457_cachePut_(key,result);return EUC_DEV457_clone_(result);}
  if(method!=='get'&&method!=='head')EUC_DEV457_bump_(path);
  return result;
}

/* Surcharges finales des deux passerelles historiques. Le compteur DEV447
 * reste dans les fonctions BASE : il compte donc uniquement les requêtes
 * réellement envoyées, jamais une réponse servie par le mémo. */
function EUC_DEV190_api_(method,path,body){
  var r=EUC_DEV457_call_(EUC_DEV398_BASE_EUC_DEV190_api_,this,arguments);
  try{if(EUC_DEV398_isAccessWrite_(method,path))EUC_DEV398_invalidateAccessCaches_();}catch(e){}
  return r;
}
function EUC_ENT_grist(method,path,body){
  var r=EUC_DEV457_call_(EUC_DEV398_BASE_EUC_ENT_grist,this,arguments);
  try{if(EUC_DEV398_isAccessWrite_(method,path))EUC_DEV398_invalidateAccessCaches_();}catch(e){}
  return r;
}
