// PFMP DEV.416 — cache final du détail enrichi + préchauffage.
/* Aligné sur le cache famille : tant que la grille est réutilisable, les
 * détails qu'elle vient de préparer doivent l'être aussi. */
var EUC_DEV416_TTL_=300;
var EUC_DEV416_CHUNK_=70000;

function EUC_DEV416_key_(a,f,c,p){
  return 'D423_'+String(a)+'_'+String(f||'BACPRO')+'_'+Number(c||0)+'_'+Number(p||0);
}

function EUC_DEV416_cacheGet_(key){
  var cache=CacheService.getScriptCache(),meta=null;
  try{meta=cache.get(key+'_M');}catch(e){}
  if(!meta)return null;
  var n=Number(meta)||0;
  if(n<=0||n>20)return null;
  var s='';
  for(var i=0;i<n;i++){
    var part=null;
    try{part=cache.get(key+'_C'+i);}catch(e2){}
    if(part===null||part===undefined)return null;
    s+=part;
  }
  try{return JSON.parse(s);}catch(e3){return null;}
}

function EUC_DEV416_cachePut_(key,obj){
  var s;
  try{s=JSON.stringify(obj);}catch(e){return false;}
  var cache=CacheService.getScriptCache();
  var n=Math.ceil(s.length/EUC_DEV416_CHUNK_);
  if(n<=0||n>20)return false;
  try{
    for(var i=0;i<n;i++){
      cache.put(key+'_C'+i,s.slice(i*EUC_DEV416_CHUNK_,(i+1)*EUC_DEV416_CHUNK_),EUC_DEV416_TTL_);
    }
    cache.put(key+'_M',String(n),EUC_DEV416_TTL_);
    return true;
  }catch(e2){return false;}
}

function EUC_DEV416_buildFinal_(annee,famille,classe,periode){
  var d=
    typeof EUC_DEV356_detail_==='function'
      ? EUC_DEV356_detail_(annee,famille,classe,periode)
      : EUC_DEV347_detail(annee,famille,classe,periode);

  /* EUC_DEV356_detail_ renvoie déjà le détail conventions + apprentis enrichi.
   * Rejouer ces deux enrichissements doublait les lectures Grist à froid. */
  try{if(typeof EUC_DEV401_enrichAffectations_==='function')d=EUC_DEV401_enrichAffectations_(d,annee,classe,periode)||d;}catch(e3){}
  d=d||{}; d.annee=annee;
  return d;
}

function EUC_DEV416_finalDetail_(annee,famille,classe,periode){
  var key=EUC_DEV416_key_(annee,famille,classe,periode);
  var hit=EUC_DEV416_cacheGet_(key);
  if(hit){
    hit.__dev416Cache=true;
    return typeof EUC_DEV420_enrichDetail_==='function'
      ?EUC_DEV420_enrichDetail_(hit,annee,famille,classe,periode)
      :hit;
  }

  /* DEV424 : le déclencheur a déjà effectué les jointures conventions,
   * apprentissage, situations et affectations. Le premier visiteur ne les
   * rejoue plus : une seule lecture ciblée du snapshot suffit. */
  try{
    if(typeof EUC_DEV424_readEnrichedDetail_==='function'){
      hit=EUC_DEV424_readEnrichedDetail_(annee,famille,classe,periode);
      if(hit){
        hit.__dev416Cache=false;hit.__dev424Persistent=true;
        EUC_DEV416_cachePut_(key,hit);
        return typeof EUC_DEV420_enrichDetail_==='function'
          ?EUC_DEV420_enrichDetail_(hit,annee,famille,classe,periode)
          :hit;
      }
    }
  }catch(ePersistent){}

  var lock=LockService.getScriptLock(),got=false;
  try{got=lock.tryLock(1200);}catch(e){}
  if(!got){
    Utilities.sleep(350);
    hit=EUC_DEV416_cacheGet_(key);
    if(hit){
      hit.__dev416Cache=true;
      return typeof EUC_DEV420_enrichDetail_==='function'
        ?EUC_DEV420_enrichDetail_(hit,annee,famille,classe,periode)
        :hit;
    }
  }

  try{
    var d=EUC_DEV416_buildFinal_(annee,famille,classe,periode);
    d.__dev416Cache=false;
    EUC_DEV416_cachePut_(key,d);
    return typeof EUC_DEV420_enrichDetail_==='function'
      ?EUC_DEV420_enrichDetail_(d,annee,famille,classe,periode)
      :d;
  } finally {
    if(got){try{lock.releaseLock();}catch(e2){}}
  }
}

function EUC_DEV416_prewarm(payload){
  payload=payload||{};
  var annee=String(payload.annee||'').trim();
  var famille=String(payload.famille||'BACPRO').trim()||'BACPRO';
  var classe=Number(payload.classe)||0;
  var periode=Number(payload.periode)||0;
  if(!annee||!classe||!periode)return {ok:false};
  var t0=Date.now();
  var d=EUC_DEV416_finalDetail_(annee,famille,classe,periode);
  return {ok:true,ms:Date.now()-t0,cached:!!(d&&d.__dev416Cache)};
}
