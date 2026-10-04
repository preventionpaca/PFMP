// PFMP DEV.416 — cache final du détail enrichi + préchauffage.
/* Aligné sur le cache famille : tant que la grille est réutilisable, les
 * détails qu'elle vient de préparer doivent l'être aussi. */
var EUC_DEV416_TTL_=21600;
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

function EUC_DEV416_cacheDrop_(key){
  var cache=CacheService.getScriptCache(),n=0,keys=[key+'_M'];
  try{n=Number(cache.get(key+'_M'))||0;}catch(e){}
  for(var i=0;i<n&&i<20;i++)keys.push(key+'_C'+i);
  try{cache.removeAll(keys);}catch(e2){keys.forEach(function(k){try{cache.remove(k);}catch(e3){}});}
}

function EUC_DEV428_withContext_(detail,annee,famille){
  detail=detail||{};
  /* Les vues persistantes DEV427 sont construites hors requête HTTP. Elles
   * n'avaient donc pas toujours l'année au niveau racine. Or la navigation
   * rapide construit les URL du sélecteur depuis detail.annee : une valeur
   * vide forçait son repli vers un rechargement Apps Script complet. */
  detail.annee=String(annee||detail.annee||'').trim();
  detail.famille=String(famille||detail.famille||'BACPRO').trim().toUpperCase();
  /* DEV434 : les anciens détails mis en cache peuvent précéder l'ajout du
   * marqueur P.dif. La table métier de fin de Terminale reste autoritaire :
   * une PFMP ordinaire ne doit jamais rendre ces élèves, même si le payload
   * historique ne porte plus le drapeau. */
  var period=detail.periode||{},isPdif=false;
  try{
    isPdif=typeof EUC_DEV387_isPdifPeriod_==='function'
      ?EUC_DEV387_isPdifPeriod_(period)
      :String(period.libelle||period.nom||'').toUpperCase().indexOf('P.DIF')>=0;
  }catch(ePdif){}
  if(!isPdif&&Array.isArray(detail.lignes)&&detail.__dev434PdifFiltered!==true){
    var modes={},authoritative=false;
    try{modes=(EUC_DEV285B_state_(detail.annee)||{}).modes||{};authoritative=true;}catch(eModes){}
    detail.lignes=detail.lignes.filter(function(x){
      var mode=String(modes[Number(x&&x.eleveId)||0]||(x&&x.modeFinTerminale)||'').toUpperCase();
      if(mode.indexOf('POURSUITE_PFMP2')>=0)return true;
      return mode.indexOf('PARCOURS_DIFF_LYCEE')<0&&!(x&&x.parcoursDifferencie===true);
    });
    try{
      if(typeof EUC_DEV422_quickFromDetail_==='function'){
        var q=EUC_DEV422_quickFromDetail_(detail);detail.stats=detail.stats||{};
        detail.stats.total=q.total;detail.stats.apprentis=q.apprentis.length;
        detail.stats.avecConvention=q.avec.length;detail.stats.sansConvention=q.sans.length;
        detail.stats.annulees=q.annuleesInterrompues.length;detail.stats.interrompues=0;
      }
    }catch(eStats){}
    if(authoritative)detail.__dev434PdifFiltered=true;
  }
  return detail;
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
  if(hit&&(
    typeof EUC_DEV425_payloadFresh_!=='function'||
    EUC_DEV425_payloadFresh_(annee,famille,hit)
  )){
    hit=EUC_DEV428_withContext_(hit,annee,famille);
    hit.__dev416Cache=true;
    return typeof EUC_DEV420_enrichDetail_==='function'
      ?EUC_DEV420_enrichDetail_(hit,annee,famille,classe,periode)
      :hit;
  }

  /* DEV427 : détail enrichi durable, partagé par tous les appareils et lié à
   * la même révision atomique que la synthèse familiale. */
  try{
    if(typeof EUC_DEV427_readDetail_==='function'){
      hit=EUC_DEV427_readDetail_(annee,famille,classe,periode);
      if(hit){
        hit=EUC_DEV428_withContext_(hit,annee,famille);
        hit.__dev416Cache=false;hit.__dev427Persistent=true;
        EUC_DEV416_cachePut_(key,hit);
        return typeof EUC_DEV420_enrichDetail_==='function'
          ?EUC_DEV420_enrichDetail_(hit,annee,famille,classe,periode)
          :hit;
      }
    }
  }catch(eDev427){}

  /* DEV424 : le déclencheur a déjà effectué les jointures conventions,
   * apprentissage, situations et affectations. Le premier visiteur ne les
   * rejoue plus : une seule lecture ciblée du snapshot suffit. */
  try{
    if(typeof EUC_DEV424_readEnrichedDetail_==='function'){
      hit=EUC_DEV424_readEnrichedDetail_(annee,famille,classe,periode);
      if(hit){
        hit=EUC_DEV428_withContext_(hit,annee,famille);
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
    if(hit&&(
      typeof EUC_DEV425_payloadFresh_!=='function'||
      EUC_DEV425_payloadFresh_(annee,famille,hit)
    )){
      hit=EUC_DEV428_withContext_(hit,annee,famille);
      hit.__dev416Cache=true;
      return typeof EUC_DEV420_enrichDetail_==='function'
        ?EUC_DEV420_enrichDetail_(hit,annee,famille,classe,periode)
        :hit;
    }
  }

  try{
    var d=EUC_DEV428_withContext_(EUC_DEV416_buildFinal_(annee,famille,classe,periode),annee,famille);
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
