// PFMP DEV.416 — cache final du détail enrichi + préchauffage.
/* Aligné sur le cache famille : tant que la grille est réutilisable, les
 * détails qu'elle vient de préparer doivent l'être aussi. */
var EUC_DEV416_TTL_=21600;
var EUC_DEV416_CHUNK_=70000;

function EUC_DEV445_detailSituations_(detail,annee,famille,classe,periode){
  /* Les détails persistants DEV424/DEV427 sont déjà enrichis. Un nouvel
   * enrichissement à chaque lecture rechargeait inutilement motifs et
   * situations au premier visiteur après un démarrage à froid. */
  if(detail&&detail.__dev424Enriched===true)return detail;
  return typeof EUC_DEV420_enrichDetail_==='function'
    ?EUC_DEV420_enrichDetail_(detail,annee,famille,classe,periode)
    :detail;
}

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

/* DEV454 — cohérence entre la vignette (snapshot famille) et le détail.
 * Une ancienne ligne de détail pouvait être recopiée avec la nouvelle
 * révision, puis rester six heures en cache alors que l'effectif de la
 * classe avait changé. Le contrôle porte sur l'identité des élèves et pas
 * seulement sur le total : un remplacement à effectif constant est donc
 * également détecté. */
function EUC_DEV454_normName_(v){
  return String(v==null?'':v).normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').toUpperCase()
    .replace(/\s+[—–-]\s+.*$/,'').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function EUC_DEV454_detailName_(x){
  if(typeof EUC_DEV422_studentName_==='function'){
    try{return EUC_DEV454_normName_(EUC_DEV422_studentName_(x));}catch(e){}
  }
  return EUC_DEV454_normName_([x&&x.nom,x&&x.prenom].filter(Boolean).join(' '));
}

function EUC_DEV454_cardForDetail_(annee,famille,classe,periode){
  if(typeof EUC_DEV421_fastFamilySnapshot_!=='function')return null;
  var q=EUC_DEV421_fastFamilySnapshot_({annee:annee,famille:famille});
  var data=q&&q.payload;if(!data)return null;
  var card=null;
  (data.classes||[]).some(function(c){
    if(Number(c.classeId||c.id)!==Number(classe))return false;
    card=(c.periodes||[]).filter(function(p){
      return Number(p.id||p.periodeId)===Number(periode);
    })[0]||null;
    return true;
  });
  return card;
}

function EUC_DEV454_rosterFromCard_(card){
  var quick=card&&card.quick;if(!quick)return null;
  var names={};
  ['avec','sans','apprentis','annuleesInterrompues','situations'].forEach(function(k){
    (quick[k]||[]).forEach(function(v){var n=EUC_DEV454_normName_(v);if(n)names[n]=true;});
  });
  return Object.keys(names).sort();
}

function EUC_DEV454_detailMatchesCard_(detail,card){
  var period=card||{},isPdif=false;
  try{isPdif=typeof EUC_DEV387_isPdifPeriod_==='function'&&EUC_DEV387_isPdifPeriod_(period);}catch(ePdif){}
  if(isPdif)return true;

  /* Le snapshot interne peut encore contenir une liste `quick` ancienne alors
   * que ses compteurs ont déjà été recalculés. Le total autoritaire doit donc
   * être vérifié avant les identités ; sinon 17 anciens noms valident à tort
   * une classe désormais composée de 16 scolaires + 3 apprentis. */
  var scolaires=Number(period.total),apprentis=Number(period.apprentis),total=NaN;
  if(scolaires>=0&&apprentis>=0)total=scolaires+apprentis;
  if(!(total>=0)){
    var effectifTotal=Number(period.effectifTotal);
    if(effectifTotal>=0)total=effectifTotal;
  }
  var lignes=(detail&&detail.lignes||[]);
  if(total>=0&&Number(lignes.length)!==total)return false;

  var expected=EUC_DEV454_rosterFromCard_(card);
  if(!expected){
    return true;
  }
  /* Des compteurs à 19 avec une ancienne quick-list à 17 signifient que la
   * liste nominative du snapshot est obsolète. Le total récent prime alors ;
   * comparer les 17 anciens noms provoquerait une reconstruction en boucle. */
  if(total>=0&&expected.length!==total)return true;
  var actual={},duplicate=false;
  lignes.forEach(function(x){
    var n=EUC_DEV454_detailName_(x);if(!n)return;
    if(actual[n])duplicate=true;actual[n]=true;
  });
  var got=Object.keys(actual).sort();
  return !duplicate&&expected.length===got.length&&expected.every(function(n,i){return n===got[i];});
}

function EUC_DEV454_detailMatchesFamily_(detail,annee,famille,classe,periode){
  try{return EUC_DEV454_detailMatchesCard_(detail,EUC_DEV454_cardForDetail_(annee,famille,classe,periode));}
  catch(e){return true;}
}

function EUC_DEV454_isVerifiedCurrent_(detail){
  return !!(detail&&detail.__dev454RosterVerified===true&&detail.__dev454Repair&&
    detail.__dev454Repair.source==='eleves-courants');
}

function EUC_DEV454_buildCurrentDetail_(annee,famille,classe,periode,seedDetail){
  var seeded=!!seedDetail;
  var d=seeded?JSON.parse(JSON.stringify(seedDetail)):EUC_DEV190_buildHistoricalDetail_(annee,classe,periode);
  var rebuilt=false,repairDiag={source:'historique',lus:0,actifs:0,classe:0,annee:0,erreur:''};

  /* Le détail historique peut être précisément la vue devenue obsolète.
   * Lorsqu'une incohérence est détectée, repartir de la table courante des
   * élèves (une lecture groupée), conserver les lignes encore présentes puis
   * rejouer en lots conventions, apprentissage et affectations. */
  try{
    if(typeof EUC_IMPORT_lireRecords_==='function'&&
       typeof EUC_DEV422_batchSources_==='function'&&
       typeof EUC_DEV422_enrichDetailBatch_==='function'){
      var yearMap=typeof EUC_V154_anneesMap_==='function'?EUC_V154_anneesMap_():{};
      var hasYearMap=Object.keys(yearMap||{}).length>0;
      var ref=function(v){
        if(typeof EUC_DEV432_ref_==='function')return EUC_DEV432_ref_(v);
        if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
        if(Array.isArray(v))return Number(v[0])||0;
        return Number(v)||0;
      };
      var allCurrent=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP')||[];
      repairDiag.lus=allCurrent.length;
      var current=allCurrent.filter(function(e){
        if(e.Actif===false||e.Present_dernier_import===false)return false;
        if(String(e.Statut_scolarite||'').toUpperCase()==='SORTI')return false;
        repairDiag.actifs++;
        if(ref(e.Classe)!==Number(classe))return false;
        repairDiag.classe++;
        /* Si la petite table des années est momentanément indisponible, une
         * référence numérique (ex. 3) ne doit pas être comparée au libellé
         * 2026-2027 : Present_dernier_import reste alors le filtre sûr. */
        var y='';
        if(hasYearMap&&typeof EUC_V154_anneeCode_==='function'){
          y=EUC_V154_anneeCode_(e.Annee_scolaire,yearMap);
        }else if(e.Annee_code){
          y=String(e.Annee_code).trim();
        }else if(typeof e.Annee_scolaire==='string'&&/20\d{2}/.test(e.Annee_scolaire)){
          y=String(e.Annee_scolaire).trim();
        }
        var ok=!y||String(y)===String(annee);if(ok)repairDiag.annee++;return ok;
      });
      if(current.length){
        var oldById={},pp='';
        (d&&d.lignes||[]).forEach(function(x){
          var id=Number(x&&x.eleveId)||0;if(id)oldById[id]=x;
          if(!pp&&x&&x.professeurPrincipal)pp=String(x.professeurPrincipal);
        });
        var modes={};try{if(typeof EUC_DEV285B_state_==='function')modes=(EUC_DEV285B_state_(annee)||{}).modes||{};}catch(eModes){}
        d=d||{};
        d.lignes=current.map(function(e){
          var id=Number(e.id)||0,x=oldById[id]?JSON.parse(JSON.stringify(oldById[id])):{};
          x.eleveId=id;x.nom=String(e.Nom||'').trim();
          x.prenom=String(e.Prenom_usage||e.Prenom||'').trim();
          x.classe=String((d.classe&&d.classe.nom)||e.Code_classe_importe||'').trim();
          x.professeurPrincipal=x.professeurPrincipal||pp;
          x.professeurTelephone=x.professeurTelephone||'';x.professeurVisiteur=x.professeurVisiteur||'';
          x.modeFinTerminale=String(modes[id]||x.modeFinTerminale||'');
          x.parcoursDifferencie=x.modeFinTerminale==='PARCOURS_DIFF_LYCEE';
          return x;
        }).sort(function(a,b){return a.nom.localeCompare(b.nom,'fr')||a.prenom.localeCompare(b.prenom,'fr');});
        var classIds={};classIds[String(Number(classe))]=d.classe||{id:Number(classe)};
        var batch=EUC_DEV422_batchSources_(annee,classIds);
        var card=EUC_DEV454_cardForDetail_(annee,famille,classe,periode);
        d=EUC_DEV422_enrichDetailBatch_(d,annee,famille,Number(classe),Number(periode),batch,card)||d;
        rebuilt=true;repairDiag.source='eleves-courants';
      }
    }
  }catch(eCurrent){rebuilt=false;repairDiag.erreur=String(eCurrent&&eCurrent.message||eCurrent).slice(0,240);}
  if(!rebuilt){
    if(seeded)d=EUC_DEV190_buildHistoricalDetail_(annee,classe,periode);
    try{if(typeof EUC_DEV190J_enrichContacts_==='function')d=EUC_DEV190J_enrichContacts_(d)||d;}catch(eContacts){}
    try{if(typeof EUC_DEV401_enrichAffectations_==='function')d=EUC_DEV401_enrichAffectations_(d,annee,classe,periode)||d;}catch(eAffect){}
  }
  d=d||{};d.annee=annee;d.famille=famille;d.__dev454RosterVerified=true;d.__dev454Repair=repairDiag;
  return d;
}

function EUC_DEV428_withContext_(detail,annee,famille){
  detail=detail||{};
  /* Les vues persistantes DEV427 sont construites hors requête HTTP. Elles
   * n'avaient donc pas toujours l'année au niveau racine. Or la navigation
   * rapide construit les URL du sélecteur depuis detail.annee : une valeur
   * vide forçait son repli vers un rechargement Apps Script complet. */
  detail.annee=String(annee||detail.annee||'').trim();
  detail.famille=String(famille||detail.famille||'BACPRO').trim().toUpperCase();
  /* DEV454 : un choix de parcours différencié concerne la vue P.dif. Il ne
   * retire jamais l'élève des PFMP ordinaires déjà suivies. Les anciennes
   * versions filtraient ici ces élèves de PFMP n°1 et créaient des effectifs
   * incomplets (17 au lieu de 19 en TCAR). */
  var period=detail.periode||{},isPdif=false;
  try{
    isPdif=typeof EUC_DEV387_isPdifPeriod_==='function'
      ?EUC_DEV387_isPdifPeriod_(period)
      :String(period.libelle||period.nom||'').toUpperCase().indexOf('P.DIF')>=0;
  }catch(ePdif){}
  if(!isPdif&&Array.isArray(detail.lignes)&&detail.__dev454OrdinaryRosterKept!==true){
    detail.lignes.forEach(function(x){x.parcoursDifferencie=false;});
    detail.stats=detail.stats||{};detail.stats.parcoursDifferencies=0;
    try{
      if(typeof EUC_DEV422_quickFromDetail_==='function'){
        var q=EUC_DEV422_quickFromDetail_(detail);detail.stats=detail.stats||{};
        detail.stats.total=q.total;detail.stats.apprentis=q.apprentis.length;
        detail.stats.avecConvention=q.avec.length;detail.stats.sansConvention=q.sans.length;
        detail.stats.annulees=q.annuleesInterrompues.length;detail.stats.interrompues=0;
      }
    }catch(eStats){}
    detail.__dev454OrdinaryRosterKept=true;
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
    EUC_DEV454_isVerifiedCurrent_(hit)||
    typeof EUC_DEV425_payloadFresh_!=='function'||
    EUC_DEV425_payloadFresh_(annee,famille,hit)
  )){
    if(!EUC_DEV454_isVerifiedCurrent_(hit)&&
       !EUC_DEV454_detailMatchesFamily_(hit,annee,famille,classe,periode)){
      EUC_DEV416_cacheDrop_(key);
      hit=EUC_DEV428_withContext_(EUC_DEV454_buildCurrentDetail_(annee,famille,classe,periode,hit),annee,famille);
      EUC_DEV416_cachePut_(key,hit);
      return EUC_DEV445_detailSituations_(hit,annee,famille,classe,periode);
    }
    hit=EUC_DEV428_withContext_(hit,annee,famille);
    hit.__dev416Cache=true;
    return EUC_DEV445_detailSituations_(hit,annee,famille,classe,periode);
  }

  /* DEV427 : détail enrichi durable, partagé par tous les appareils et lié à
   * la même révision atomique que la synthèse familiale. */
  try{
    if(typeof EUC_DEV427_readDetail_==='function'){
      hit=EUC_DEV427_readDetail_(annee,famille,classe,periode,true);
      if(hit){
        if(!EUC_DEV454_detailMatchesFamily_(hit,annee,famille,classe,periode)){
          hit=EUC_DEV454_buildCurrentDetail_(annee,famille,classe,periode,hit);
        }
        hit=EUC_DEV428_withContext_(hit,annee,famille);
        hit.__dev416Cache=false;hit.__dev427Persistent=true;
        EUC_DEV416_cachePut_(key,hit);
        return EUC_DEV445_detailSituations_(hit,annee,famille,classe,periode);
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
        return EUC_DEV445_detailSituations_(hit,annee,famille,classe,periode);
      }
    }
  }catch(ePersistent){}

  var lock=LockService.getScriptLock(),got=false;
  try{got=lock.tryLock(1200);}catch(e){}
  if(!got){
    Utilities.sleep(350);
    hit=EUC_DEV416_cacheGet_(key);
    if(hit&&(
      EUC_DEV454_isVerifiedCurrent_(hit)||
      typeof EUC_DEV425_payloadFresh_!=='function'||
      EUC_DEV425_payloadFresh_(annee,famille,hit)
    )){
      hit=EUC_DEV428_withContext_(hit,annee,famille);
      hit.__dev416Cache=true;
      return EUC_DEV445_detailSituations_(hit,annee,famille,classe,periode);
    }
  }

  try{
    var d=EUC_DEV428_withContext_(EUC_DEV416_buildFinal_(annee,famille,classe,periode),annee,famille);
    d.__dev416Cache=false;
    EUC_DEV416_cachePut_(key,d);
    return EUC_DEV445_detailSituations_(d,annee,famille,classe,periode);
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
