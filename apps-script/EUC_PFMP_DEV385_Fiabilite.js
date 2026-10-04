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
  /* DEV445 : l'ancien résumé repartait de EUC_APP172_snapshot(), qui relit et
   * recroise les tables apprentissage / périodes / élèves. Les trois vues
   * familiales enrichies contiennent déjà exactement les compteurs affichés.
   * On les récupère en une seule lecture annuelle de l'index durable, puis on
   * agrège entièrement en mémoire. */
  var r=EUC_DEV445_fastResumeAccueil_(annee)||EUC_DEV348_resumeAccueil(payload);
  try{cache.put(key,JSON.stringify(r),120);}catch(e3){}
  return r;
}

function EUC_DEV445_latestFamilySnapshots_(annee){
  var rows=[],latest={};
  try{rows=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{Annee_scolaire:[annee]})||[];}catch(e){return null;}
  rows.forEach(function(r){
    var f=r.fields||r,fam=String(f.Famille||'').trim().toUpperCase();
    if(['BACPRO','BTS','CAP'].indexOf(fam)<0||f.Actif===false)return;
    var at=Date.parse(f.Updated_at||'')||0,id=Number(r.id)||0,old=latest[fam];
    if(old&&(old.at>at||(old.at===at&&old.id>id)))return;
    try{latest[fam]={at:at,id:id,payload:JSON.parse(f.Payload_JSON||'{}')};}catch(eJson){}
  });
  return latest;
}

function EUC_DEV445_resumeKey_(annee){return 'DEV445_RESUME_DURABLE_'+String(annee||'').replace(/[^0-9A-Za-z_-]/g,'_');}

function EUC_DEV445_resumeFromPayloads_(annee,payloads){
  if(!payloads||!payloads.BACPRO||!payloads.BTS||!payloads.CAP)return null;
  var spec={BACPRO:[['Terminale',2,true],['Première',2,true],['Seconde',1,false]],BTS:[['1re année',1,true],['2e année',1,true]],CAP:[['TCAP',2,false],['1CAP',1,false]]};
  var out={ok:true,version:'DEV.445',annee:annee,familles:{}};
  Object.keys(spec).forEach(function(fam){
    var levels={},ordered=spec[fam];
    ordered.forEach(function(s){
      var periods=[];for(var i=0;i<s[1];i++)periods.push({ordinal:i+1,libelle:fam==='BTS'?'Stage n°'+(i+1):'PFMP n°'+(i+1),conventions:0,eleves:0,apprentis:0});
      levels[s[0]]={niveau:s[0],periodes:periods,pdif:(fam==='BACPRO'&&s[0]==='Terminale')?{lycee:0,entreprise:0,aDefinir:0}:null,apps:s[2]};
    });
    ((payloads[fam]||{}).classes||[]).forEach(function(c){
      var name=typeof EUC_DEV335_className_==='function'?EUC_DEV335_className_(c):String(c.classe||c.nom||''),levelName=typeof EUC_DEV335_level_==='function'?EUC_DEV335_level_(name,fam):'',level=levels[levelName];
      if(!level)return;
      var normal=[];
      (c.periodes||[]).forEach(function(p){
        var isPdif=typeof EUC_DEV335_isPdif_==='function'?EUC_DEV335_isPdif_(p):String(p.libelle||p.nom||'').toUpperCase().indexOf('P.DIF')>=0;
        if(isPdif){
          if(level.pdif){
            var q=p.quick||{};
            level.pdif.lycee+=Number(p.parcoursDifferencies!==undefined?p.parcoursDifferencies:(q.lycee||[]).length)||0;
            level.pdif.entreprise+=Number(p.poursuitePfmp2!==undefined?p.poursuitePfmp2:(q.entreprise||[]).length)||0;
            level.pdif.aDefinir+=Number(p.aDefinirFinTerminale!==undefined?p.aDefinirFinTerminale:(q.indefini||[]).length)||0;
          }
          return;
        }
        normal.push(p);
      });
      normal.sort(function(a,b){return String(a.debut||'').localeCompare(String(b.debut||''));}).slice(0,level.periodes.length).forEach(function(p,i){
        level.periodes[i].conventions+=Number(p.conventions)||0;
        level.periodes[i].eleves+=Number(p.total)||0;
        if(level.apps)level.periodes[i].apprentis+=Number(p.apprentis)||0;
      });
    });
    out.familles[fam]={niveaux:ordered.map(function(s){var l=levels[s[0]];delete l.apps;return l;})};
  });
  return out;
}

function EUC_DEV445_storeResumeAccueil_(annee,payloads){
  var out=EUC_DEV445_resumeFromPayloads_(annee,payloads);if(!out)return null;
  var raw=JSON.stringify(out),key=EUC_DEV445_resumeKey_(annee);
  /* Une propriété Apps Script est limitée à 9 Ko. Le résumé réel peut
   * dépasser ce seuil avec les libellés accentués : on le fragmente. */
  try{
    var props=PropertiesService.getScriptProperties(),parts={},size=7000,count=Math.ceil(raw.length/size)||1;
    parts[key+'_COUNT']=String(count);
    for(var i=0;i<count;i++)parts[key+'_'+i]=raw.slice(i*size,(i+1)*size);
    props.setProperties(parts,false);
  }catch(e){}
  try{CacheService.getScriptCache().put('DEV385_RESUME_'+annee,raw,21600);}catch(e2){}
  return out;
}

function EUC_DEV445_cachedResumeAccueil_(annee){
  var key=EUC_DEV445_resumeKey_(annee),raw=null;
  try{raw=CacheService.getScriptCache().get('DEV385_RESUME_'+annee);}catch(eCache){}
  try{
    if(!raw){
      var props=PropertiesService.getScriptProperties(),count=Number(props.getProperty(key+'_COUNT'))||0,parts=[];
      for(var i=0;i<count;i++)parts.push(props.getProperty(key+'_'+i)||'');
      raw=parts.join('');
    }
  }catch(e){}
  if(raw){try{return JSON.parse(raw);}catch(e2){}}
  return null;
}

function EUC_DEV445_fastResumeAccueil_(annee){
  var cached=EUC_DEV445_cachedResumeAccueil_(annee);
  if(cached)return cached;
  var latest=EUC_DEV445_latestFamilySnapshots_(annee);
  if(!latest||!latest.BACPRO||!latest.BTS||!latest.CAP)return null;
  return EUC_DEV445_storeResumeAccueil_(annee,{BACPRO:latest.BACPRO.payload,BTS:latest.BTS.payload,CAP:latest.CAP.payload});
}
