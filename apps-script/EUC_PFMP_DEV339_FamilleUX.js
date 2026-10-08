/** PFMP — v1.0.0-dev.339 */
function EUC_DEV339_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV339_year_(e){var y=EUC_DEV339_txt_(e&&e.parameter&&e.parameter.annee);if(y)return y;var c=EUC_PFMP_contexteAnneeLectureV155_();return EUC_DEV339_txt_(c&&c.active);}

/* DEV421 — lecture réellement "snapshot first".
 * G1 enrichit le snapshot avec plusieurs tables métier à chaque affichage.
 * Pour la grille des classes, le payload persistant contient déjà toutes les
 * données nécessaires ; on le lit donc sans recalcul et on le garde 5 minutes
 * en cache Apps Script. Les écritures de snapshot et de situation invalident
 * explicitement cette entrée. */
var EUC_DEV421_FAMILY_TTL_=21600;
var EUC_DEV421_FAMILY_CHUNK_=70000;
function EUC_DEV421_familyKey_(annee,famille){
  return 'DEV423R1_FAMILY_'+EUC_DEV339_txt_(annee)+'_'+EUC_DEV339_txt_(famille).toUpperCase();
}
function EUC_DEV421_familyCacheGet_(annee,famille){
  var cache=CacheService.getScriptCache(),key=EUC_DEV421_familyKey_(annee,famille),raw=null,meta=null;
  try{meta=cache.get(key+'_M');}catch(e){}
  if(meta){
    var n=Number(meta)||0,parts=[],chunkKeys=[];
    if(n<=0||n>20)return null;
    for(var k=0;k<n;k++)chunkKeys.push(key+'_C'+k);
    try{parts=cache.getAll(chunkKeys);}catch(e2){return null;}
    raw='';for(var i=0;i<n;i++){var part=parts[key+'_C'+i];if(part==null)return null;raw+=part;}
  }else{
    try{raw=cache.get(key);}catch(e3){}
  }
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e2){return null;}
}
function EUC_DEV421_familyCachePut_(annee,famille,data){
  var raw='',cache=CacheService.getScriptCache(),key=EUC_DEV421_familyKey_(annee,famille);
  try{raw=JSON.stringify(data);}catch(e){return data;}
  var n=Math.ceil(raw.length/EUC_DEV421_FAMILY_CHUNK_);if(n<=0||n>20)return data;
  try{
    for(var i=0;i<n;i++)cache.put(key+'_C'+i,raw.slice(i*EUC_DEV421_FAMILY_CHUNK_,(i+1)*EUC_DEV421_FAMILY_CHUNK_),EUC_DEV421_FAMILY_TTL_);
    cache.put(key+'_M',String(n),EUC_DEV421_FAMILY_TTL_);
    cache.remove(key);
  }catch(e2){}
  return data;
}
function EUC_DEV421_familyCacheInvalidate_(annee,famille){
  var cache=CacheService.getScriptCache(),key=EUC_DEV421_familyKey_(annee,famille),meta=null,keys=[key,key+'_M'];
  try{meta=cache.get(key+'_M');}catch(e){}
  for(var i=0;i<(Number(meta)||20);i++)keys.push(key+'_C'+i);
  try{cache.removeAll(keys);}catch(e2){keys.forEach(function(k){try{cache.remove(k);}catch(e3){}});}
}

/* DEV422 — une seule lecture groupée des snapshots détaillés alimente les
 * compteurs des cartes et le contrôle rapide. Carte et infobulle comptent
 * ainsi exactement les mêmes élèves, sans nouvel appel Grist au survol. */
function EUC_DEV422_normStatus_(v){
  return EUC_DEV339_txt_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_');
}
function EUC_DEV422_studentName_(x){
  return [EUC_DEV339_txt_(x&&x.nom),EUC_DEV339_txt_(x&&x.prenom)].filter(Boolean).join(' ');
}
function EUC_DEV422_quickFromDetail_(detail){
  detail=detail||{};
  var period=detail.periode||{},lines=detail.lignes||[];
  var isPdif=typeof EUC_DEV387_isPdifPeriod_==='function'
    ?EUC_DEV387_isPdifPeriod_(period)
    :EUC_DEV422_normStatus_(period.libelle||period.nom).indexOf('P_DIF')>=0;
  var out={
    ok:true,source:'detail-snapshot-batch',
    classe:EUC_DEV339_txt_(detail.classe&&detail.classe.nom),
    periode:EUC_DEV339_txt_(period.libelle||period.nom||'Période'),
    isPdif:isPdif,total:lines.length,avec:[],sans:[],apprentis:[],situations:[],
    situationsCouvertes:0,annuleesInterrompues:[],lycee:[],entreprise:[],indefini:[]
  };
  lines.forEach(function(x){
    var nom=EUC_DEV422_studentName_(x);if(!nom)return;
    if(isPdif){
      var mode=EUC_DEV422_normStatus_(x.modeFinTerminale||x.statutCode||x.statut);
      if(mode.indexOf('PARCOURS_DIFF')>=0)out.lycee.push(nom);
      else if(mode.indexOf('POURSUITE_PFMP2')>=0)out.entreprise.push(nom);
      else out.indefini.push(nom);
      return;
    }
    if(x.apprenti===true){out.apprentis.push(nom);return;}
    if(x.situationAdministrativeLibelle){
      out.situations.push(nom+' — '+x.situationAdministrativeLibelle);
      if(x.exclureSansConvention===true){out.situationsCouvertes++;return;}
    }
    var code=EUC_DEV422_normStatus_(x.statutCode||x.statut);
    var incident=code.indexOf('ANNULE')>=0||code.indexOf('INTERROMP')>=0;
    var missing=code.indexOf('SANS_CONVENTION')>=0;
    var active=(Number(x.conventionId)>0||x.convention===true||code.indexOf('CONVENTION_ENREGISTREE')>=0||code.indexOf('CONVENTION_SIGNEE')>=0||code==='CONVENTION')&&!incident&&!missing;
    if(incident){out.annuleesInterrompues.push(nom);return;}
    if(active)out.avec.push(nom);else out.sans.push(nom);
  });
  ['avec','sans','apprentis','situations','annuleesInterrompues','lycee','entreprise','indefini'].forEach(function(k){
    out[k].sort(function(a,b){return a.localeCompare(b,'fr');});
  });
  out.couverts=out.avec.length+out.apprentis.length+out.situationsCouvertes;
  out.scolairesAttendus=Math.max(0,out.total-out.apprentis.length);
  out.sansConvention=out.sans.length;
  if(detail.__dev425Revision)out.__dev425Revision=detail.__dev425Revision;
  return out;
}
function EUC_DEV422_readDetailSnapshot_(payload){
  var t0=Date.now(),rows=EUC_DEV190I_activeRows_(payload||{});
  if(!rows.length){
    /* DEV445 : les reconstructions atomiques publient d'abord le détail
     * durable DEV427. Le vieux snapshot de détail peut rester absent jusqu'au
     * passage planifié ; l'infobulle ne doit pas afficher une erreur pendant
     * cette fenêtre. */
    try{
      if(typeof EUC_DEV427_readDetail_==='function'){
        var d=EUC_DEV427_readDetail_(payload&&payload.annee,payload&&payload.famille,payload&&payload.classe,payload&&payload.periode,true);
        if(d)return {ok:true,exists:true,durationMs:Date.now()-t0,detail:d,recalculating:d.__snapshotRecalculating===true};
      }
    }catch(eFallback){}
    return {ok:true,exists:false,durationMs:Date.now()-t0,detail:null};
  }
  try{
    return {ok:true,exists:true,durationMs:Date.now()-t0,detail:JSON.parse((rows[0].fields||{}).Payload_JSON||'{}')};
  }catch(e){
    return {ok:false,exists:false,durationMs:Date.now()-t0,detail:null,error:String(e&&e.message||e)};
  }
}
function EUC_DEV422_batchSources_(annee,classIds){
  var selectedClassIds=Object.keys(classIds||{}).map(function(x){return Number(x)||0;}).filter(Boolean);
  var out={
    access:{},accessAvailable:false,
    apps:[],appsByEleve:{},appsAvailable:false,
    affectations:{},affectationsAvailable:false
  },byPeriod={};
  try{
    var rows=[];
    if(typeof EUC_DEV190G_fastRecords_==='function'&&typeof EUC_CONVENTION_ACCES_TABLE_!=='undefined'){
      rows=(EUC_DEV190G_fastRecords_(EUC_CONVENTION_ACCES_TABLE_,{
        Annee_scolaire:[annee],Classe_convention:selectedClassIds
      })||[]).map(function(r){
        var x={id:Number(r.id)||0},f=r.fields||{};Object.keys(f).forEach(function(k){x[k]=f[k];});return x;
      });
    }else{
      rows=EUC_CONVENTION_lireAccesFraisV108_()||[];
    }
    out.accessAvailable=true;
    rows.forEach(function(a){
      var y=EUC_DEV339_txt_(a.Annee_scolaire);
      var cid=typeof EUC_DEV340_ref_==='function'?EUC_DEV340_ref_(a.Classe_convention):Number(a.Classe_convention)||0;
      var pid=typeof EUC_DEV340_ref_==='function'?EUC_DEV340_ref_(a.Periode):Number(a.Periode)||0;
      var eid=typeof EUC_DEV340_ref_==='function'?EUC_DEV340_ref_(a.Eleve):Number(a.Eleve)||0;
      if((y&&y!==annee)||!classIds[String(cid)]||!pid||!eid)return;
      var k=cid+'|'+pid+'|'+eid;
      (out.access[k]=out.access[k]||[]).push(a);
      (byPeriod[cid+'|'+pid]=byPeriod[cid+'|'+pid]||[]).push(typeof EUC_DEV340_compactAccess_==='function'?EUC_DEV340_compactAccess_(a):a);
    });
    Object.keys(out.access).forEach(function(k){out.access[k].sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});});
    if(typeof EUC_DEV340_accessKey_==='function'){
      var cache=CacheService.getScriptCache();
      Object.keys(byPeriod).forEach(function(k){
        var p=k.split('|');
        try{cache.put(EUC_DEV340_accessKey_(annee,Number(p[0]),Number(p[1])),JSON.stringify(byPeriod[k]),180);}catch(ePrime){}
      });
    }
  }catch(eAccess){}
  try{
    out.apps=typeof EUC_DEV340_appRows_==='function'?EUC_DEV340_appRows_():(typeof EUC_DEV275B_rows_==='function'?EUC_DEV275B_rows_():[]);
    out.apps.forEach(function(a){
      var eid=typeof EUC_DEV340_ref_==='function'?EUC_DEV340_ref_(a.Eleve):Number(a.Eleve)||0;
      if(eid&&(!out.appsByEleve[eid]||Number(a.id||0)>Number(out.appsByEleve[eid].id||0)))out.appsByEleve[eid]=a;
    });
    out.appsAvailable=true;
  }catch(eApps){}
  try{
    var affectRows=[];
    if(typeof EUC_DEV190G_fastRecords_==='function'&&typeof EUC_V156_TABLE_!=='undefined'){
      affectRows=(EUC_DEV190G_fastRecords_(EUC_V156_TABLE_,{
        Annee_scolaire:[annee],Classe:selectedClassIds
      })||[]).map(function(r){
        var x={id:Number(r.id)||0},f=r.fields||{};Object.keys(f).forEach(function(k){x[k]=f[k];});return x;
      });
    }else if(typeof EUC_IMPORT_lireRecords_==='function'&&typeof EUC_V156_TABLE_!=='undefined'){
      affectRows=EUC_IMPORT_lireRecords_(EUC_V156_TABLE_)||[];
    }
    out.affectationsAvailable=true;
    affectRows.forEach(function(a){
      if(a.Actif===false||EUC_DEV339_txt_(a.Annee_scolaire)!==annee)return;
      var cid=typeof EUC_DEV340_ref_==='function'?EUC_DEV340_ref_(a.Classe):Number(a.Classe)||0;
      var pid=typeof EUC_DEV340_ref_==='function'?EUC_DEV340_ref_(a.Periode):Number(a.Periode)||0;
      var eid=typeof EUC_DEV340_ref_==='function'?EUC_DEV340_ref_(a.Eleve):Number(a.Eleve)||0;
      var type=EUC_DEV422_normStatus_(a.Type_suivi);
      if(!classIds[String(cid)]||!pid||!eid||(type!=='TELEPHONE'&&type!=='VISITE'))return;
      var key=cid+'|'+pid+'|'+eid+'|'+type,old=out.affectations[key];
      if(!old||Number(a.id||0)>Number(old.id||0))out.affectations[key]=a;
    });
  }catch(eAffectations){}
  return out;
}
function EUC_DEV422_enrichDetailBatch_(detail,annee,famille,cid,pid,batch,periodCard){
  detail=detail||{};batch=batch||{};
  var period=detail.periode||{},debut=period.debut||period.Date_debut||period.debutFr||(periodCard&&periodCard.debutFr)||'';
  var fin=period.fin||period.Date_fin||period.finFr||(periodCard&&periodCard.finFr)||'';
  (detail.lignes||[]).forEach(function(x){
    var eid=Number(x.eleveId)||0;
    if(batch.accessAvailable){
      var list=(batch.access[cid+'|'+pid+'|'+eid]||[]),actif=null;
      for(var i=0;i<list.length;i++){
        var candidate=typeof EUC_DEV340_status_==='function'?EUC_DEV340_status_(list[i]):null;
        if(candidate&&candidate.active){actif=list[i];break;}
      }
      var dernier=actif||list[0]||null;
      var st=typeof EUC_DEV340_status_==='function'?EUC_DEV340_status_(dernier):(dernier?{code:'AVEC_CONVENTION',libelle:'Avec convention',active:true}:{code:'SANS_CONVENTION',libelle:'Sans convention',active:false});
      x.historiqueConventions=[];
      x.conventionId=actif?Number(actif.id)||0:0;x.convention=!!actif;x.statutCode=st.code;x.statut=st.libelle;
      x.numero=actif?(typeof EUC_ADMIN_WORKFLOW_numeroV144_==='function'?EUC_ADMIN_WORKFLOW_numeroV144_(actif):EUC_DEV339_txt_(actif.Numero_enregistrement||actif.Reference_convention)):'';
      if(dernier){
        x.entreprise=EUC_DEV339_txt_(dernier.Entreprise_raison_sociale)||EUC_DEV339_txt_(dernier.Entreprise_enseigne);
        x.adresseEntreprise=typeof EUC_DEV340_address_==='function'?EUC_DEV340_address_(dernier):EUC_DEV339_txt_(dernier.Entreprise_adresse);
        x.contactEntreprise=typeof EUC_DEV340_contact_==='function'?EUC_DEV340_contact_(dernier):'';
        x.tuteurEntreprise=typeof EUC_DEV340_tuteur_==='function'?EUC_DEV340_tuteur_(dernier):'';
        x.telephoneEntreprise=EUC_DEV339_txt_(dernier.Entreprise_telephone)||EUC_DEV339_txt_(dernier.Responsable_telephone)||EUC_DEV339_txt_(dernier.Tuteur_telephone);
        x.courrielEntreprise=EUC_DEV339_txt_(dernier.Entreprise_courriel)||EUC_DEV339_txt_(dernier.Responsable_courriel)||EUC_DEV339_txt_(dernier.Tuteur_courriel);
        x.telephoneTuteur=EUC_DEV339_txt_(dernier.Tuteur_telephone);
        x.courrielTuteur=EUC_DEV339_txt_(dernier.Tuteur_courriel);
      }else{
        x.entreprise='';x.adresseEntreprise='';x.contactEntreprise='';x.tuteurEntreprise='';
        x.telephoneEntreprise='';x.courrielEntreprise='';x.telephoneTuteur='';x.courrielTuteur='';
      }
    }
    if(batch.appsAvailable&&typeof EUC_APP172_eval==='function'){
      var app=EUC_APP172_eval(batch.apps,eid,debut,fin)||{code:'SCOLAIRE'};
      x.statutApprentissage=app.code;x.apprenti=app.code==='APPRENTI';x.statutMixte=app.code==='MIXTE';
      if(x.apprenti){
        x.conventionId=0;x.convention=false;x.statutCode='APPRENTI';x.statut='APPRENTI';
        /* La vue matérialisée doit embarquer la date : la page publique ne
         * doit jamais relire Grist au moment de l'affichage. */
        x.dateContrat=EUC_DEV339_txt_(app.record&&app.record.debut)||x.dateContrat||'';
      }
      if(x.apprenti&&typeof EUC_DEV347_enrichA==='function'){
        try{EUC_DEV347_enrichA(x,batch.appsByEleve);}catch(eAppCompany){}
      }
    }
    if(batch.affectationsAvailable){
      var tel=batch.affectations[cid+'|'+pid+'|'+eid+'|TELEPHONE'];
      var vis=batch.affectations[cid+'|'+pid+'|'+eid+'|VISITE'];
      if(tel){
        x.professeurTelephone=EUC_DEV339_txt_(tel.Nom_professeur_snapshot)||EUC_DEV339_txt_(x.professeurTelephone);
        x.affectationTelephoneId=Number(tel.id)||Number(x.affectationTelephoneId)||0;
      }
      if(vis){
        x.professeurVisiteur=EUC_DEV339_txt_(vis.Nom_professeur_snapshot)||EUC_DEV339_txt_(x.professeurVisiteur);
        x.affectationVisiteId=Number(vis.id)||Number(x.affectationVisiteId)||0;
      }
    }
  });
  if(typeof EUC_DEV420_enrichDetail_==='function'){
    try{detail=EUC_DEV420_enrichDetail_(detail,annee,famille,cid,pid)||detail;}catch(eSituations){}
  }
  /* DEV432 — un élève affecté au parcours différencié appartient à la vue
   * P.dif. uniquement. Les anciens enrichissements DEV174 conservaient le
   * drapeau sur toutes les PFMP de la classe ; il ne doit ni être rendu ni
   * entrer dans leurs compteurs. La période P.dif. reste inchangée. */
  var isPdif=typeof EUC_DEV387_isPdifPeriod_==='function'
    ?EUC_DEV387_isPdifPeriod_(period)
    :EUC_DEV422_normStatus_(period.libelle||period.nom).indexOf('P_DIF')>=0;
  if(!isPdif){
    detail.lignes=(detail.lignes||[]).filter(function(x){
      var authoritativeMode='';
      try{
        authoritativeMode=typeof EUC_DEV285B_modeFor_==='function'
          ?EUC_DEV285B_modeFor_(Number(x&&x.eleveId)||0,annee)
          :'';
      }catch(eMode){}
      var mode=EUC_DEV422_normStatus_(authoritativeMode||(x&&(
        x.modeFinTerminale||x.statutCode||x.statut
      )));
      if(mode.indexOf('POURSUITE_PFMP2')>=0)return true;
      return mode.indexOf('PARCOURS_DIFF_LYCEE')<0&&!(x&&x.parcoursDifferencie===true);
    });
    detail.__dev434PdifFiltered=true;
  }
  var quick=EUC_DEV422_quickFromDetail_(detail);
  detail.stats=detail.stats||{};
  detail.stats.total=quick.total;
  detail.stats.apprentis=quick.apprentis.length;
  detail.stats.avecConvention=quick.avec.length;
  detail.stats.sansConvention=quick.sans.length;
  detail.stats.annulees=quick.annuleesInterrompues.length;
  detail.stats.interrompues=0;
  detail.stats.scolairesAttendus=Math.max(0,quick.total-quick.apprentis.length);
  return detail;
}
function EUC_DEV422_hydrateFamily_(data,annee,famille,prepared){
  data=data||{};
  prepared=prepared||{};
  var classIds={};
  (data.classes||[]).forEach(function(c){classIds[String(Number(c.classeId||c.id)||0)]=c;});
  if(!Object.keys(classIds).length)return data;
  var batch=prepared.batch||EUC_DEV422_batchSources_(annee,classIds);
  var rows=prepared.rows||[];
  if(!prepared.rows){
    try{rows=EUC_DEV190G_fastRecords_(EUC_DEV190I_TABLE_,{Annee_scolaire:[annee]})||[];}catch(e){return data;}
  }
  var newest={};
  rows.forEach(function(r){
    var f=r.fields||{},cid=Number(f.Classe_id)||0,pid=Number(f.Periode_id)||0;
    if(f.Actif===false||!classIds[String(cid)]||!pid)return;
    var key=cid+'|'+pid,at=Date.parse(f.Updated_at||'')||0;
    if(!newest[key]||at>newest[key].at)newest[key]={at:at,fields:f};
  });
  var appByClass={};
  Object.keys(newest).forEach(function(key){
    var f=newest[key].fields||{},detail=null;
    try{detail=JSON.parse(f.Payload_JSON||'{}');}catch(e){return;}
    var cid=Number(f.Classe_id)||0,pid=Number(f.Periode_id)||0,c=classIds[String(cid)];
    if(!c)return;
    var p=(c.periodes||[]).filter(function(x){return Number(x.id||x.periodeId)===pid;})[0];
    if(!p)return;
    detail=EUC_DEV422_enrichDetailBatch_(detail,annee,famille,cid,pid,batch,p);
    if(typeof prepared.onDetail==='function')prepared.onDetail({
      annee:annee,famille:famille,classe:cid,periode:pid,
      detail:detail,sourceRow:newest[key]
    });
    /* La grille vient de construire exactement le détail que la route de
     * classe redemanderait. Le conserver dans les deux caches serveur évite
     * une seconde série de lectures Grist au clic. CacheService est partagé
     * entre les appareils : il ne s'agit pas du cache du navigateur. */
    try{
      if(typeof EUC_DEV383_cacheKey_==='function'){
        CacheService.getScriptCache().put(
          EUC_DEV383_cacheKey_(annee,famille,cid,pid),JSON.stringify(detail),
          typeof EUC_DEV416_TTL_!=='undefined'?EUC_DEV416_TTL_:180
        );
      }
    }catch(eBaseCache){}
    try{
      if(typeof EUC_DEV416_key_==='function'&&typeof EUC_DEV416_cachePut_==='function'){
        EUC_DEV416_cachePut_(EUC_DEV416_key_(annee,famille,cid,pid),detail);
      }
    }catch(eFinalCache){}
    var quick=EUC_DEV422_quickFromDetail_(detail),apps=quick.apprentis||[];
    p.quick=quick;p.__detailSnapshotVerified=true;
    if(!quick.isPdif){
      p.effectifTotal=quick.total;
      p.apprentis=apps.length;
      p.total=Math.max(0,quick.total-apps.length);
      p.conventions=quick.avec.length;
      p.situationsAdministratives=quick.situationsCouvertes;
      p.annuleesInterrompues=quick.annuleesInterrompues.length;
      p.manquantes=quick.sans.length;
      p.sansConvention=quick.sans.length;
      p.couverts=quick.couverts;
    }
    appByClass[String(cid)]=appByClass[String(cid)]||{};
    /* quick est la source commune des cartes et des infobulles. Utiliser sa
     * liste évite qu'un ancien booléen apprenti du détail mette le badge à 0
     * alors que le décompte de période est déjà correct. */
    (quick.apprentis||[]).forEach(function(nom){appByClass[String(cid)][EUC_DEV339_txt_(nom)]=1;});
  });
  (data.classes||[]).forEach(function(c){c.apprentis=Object.keys(appByClass[String(Number(c.classeId||c.id)||0)]||{}).length;});
  data.__dev422=true;data.__source='detail-snapshot-batch';
  return data;
}
function EUC_DEV421_fastFamilySnapshot_(payload){
  payload=payload||{};
  var annee=EUC_DEV339_txt_(payload.annee),famille=EUC_DEV339_txt_(payload.famille).toUpperCase();
  if(!annee||!famille)throw new Error('DEV421 : année et famille obligatoires.');
  var cached=EUC_DEV421_familyCacheGet_(annee,famille);
  if(cached&&(
    typeof EUC_DEV425_payloadFresh_!=='function'||
    EUC_DEV425_payloadFresh_(annee,famille,cached)
  ))return {ok:true,ready:true,payload:cached,source:'CACHE'};
  var rows=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{Annee_scolaire:[annee],Famille:[famille]})||[];
  rows=rows.filter(function(r){return (r.fields||{}).Actif!==false;}).sort(function(a,b){
    var d=(Date.parse((b.fields||{}).Updated_at||'')||0)-(Date.parse((a.fields||{}).Updated_at||'')||0);
    return d||((Number(b.id)||0)-(Number(a.id)||0));
  });
  if(!rows.length)return {ok:true,ready:false,payload:null,source:'SNAPSHOT_ABSENT'};
  var data=null;
  try{data=JSON.parse((rows[0].fields||{}).Payload_JSON||'{}');}catch(e){return {ok:false,ready:false,payload:null,source:'SNAPSHOT_INVALIDE'};}
  if(data&&data.__dev424Enriched===true){
    var fresh=typeof EUC_DEV425_payloadFresh_!=='function'||EUC_DEV425_payloadFresh_(annee,famille,data);
    /* DEV445 : pendant les quelques minutes séparant une mutation de la
     * reconstruction planifiée, conserver le dernier snapshot complet. La
     * grille et ses infobulles restent disponibles immédiatement, avec un
     * marqueur explicite de recalcul, au lieu de relancer toutes les jointures
     * Grist sur le chemin du visiteur. */
    if(!fresh)data.__snapshotRecalculating=true;
    EUC_DEV421_familyCachePut_(annee,famille,data);
    return {ok:true,ready:true,payload:data,source:fresh?'SNAPSHOT_ENRICHI':'SNAPSHOT_EN_COURS_DE_RECALCUL'};
  }
  if(typeof EUC_DEV425_payloadFresh_==='function'&&!EUC_DEV425_payloadFresh_(annee,famille,data)){
    try{data=EUC_DEV190E_heavyFamily_({annee:annee,famille:famille})||data;}catch(eLive){}
  }
  data=EUC_DEV422_hydrateFamily_(data,annee,famille);
  EUC_DEV421_familyCachePut_(annee,famille,data);
  return {ok:true,ready:!!data,payload:data,source:'SNAPSHOT'};
}
function EUC_DEV394_BASE_EUC_DEV339_familyData_(annee,famille){
  var data=null;
  /* DEV504 : le rendu initial ne doit pas attendre un recalcul métier ni une
   * lecture Grist. La dernière synthèse complète est déjà dupliquée dans les
   * propriétés Apps Script par DEV456. Elle est servie immédiatement, même
   * pendant la reconstruction ciblée, avec un indicateur explicite. */
  try{
    if(typeof EUC_DEV456_familyCacheGet_==='function')data=EUC_DEV456_familyCacheGet_(annee,famille);
    if(!data&&typeof EUC_DEV456_familyPersistentGet_==='function')data=EUC_DEV456_familyPersistentGet_(annee,famille);
    if(data&&Array.isArray(data.classes)&&data.classes.length){
      var storedFresh=typeof EUC_DEV425_payloadFresh_!=='function'||EUC_DEV425_payloadFresh_(annee,famille,data);
      if(!storedFresh)data.__snapshotRecalculating=true;
      data.ready=true;data.source=storedFresh?'PERSISTENT_IMMEDIAT':'PERSISTENT_RECALCUL';
      return data;
    }
  }catch(eStored){}
  /* Le snapshot indexé est précisément la vue de lecture destinée à cette
   * page. Le recalcul APP172 reste le repli de sécurité si le snapshot manque. */
  try{var fast=EUC_DEV421_fastFamilySnapshot_({annee:annee,famille:famille});if(fast&&fast.ready&&fast.payload){data=fast.payload;data.ready=true;data.source='FAST_INDEX';return data;}}catch(e1){}
  try{data=EUC_APP172_chargerFamille({annee:annee,famille:famille})||null;if(data&&Array.isArray(data.classes)&&data.classes.length){data.ready=true;data.source='APP172';return data;}}catch(e2){}
  return {ok:true,ready:false,annee:annee,famille:famille,classes:[],source:'NONE'};
}
function EUC_DEV339_afficherFamille(e){
  var annee=EUC_DEV339_year_(e),famille=EUC_DEV339_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO';
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
  /* DEV504 : rendre la coque avant toute lecture Grist. Le chargement métier
   * est effectué ensuite par google.script.run ; une recette incomplète ne
   * peut donc plus produire une page blanche ou une erreur Apps Script. */
  t.paramsJson=JSON.stringify({annee:annee,famille:famille});t.dataJson=JSON.stringify({ok:true,ready:false,loading:true,classes:[]});t.baseUrl='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';
  return t.evaluate().setTitle('Suivi des conventions — '+(famille==='BACPRO'?'BAC PRO':famille)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV508_afficherFamillePublique_(e){
  var annee=EUC_DEV339_year_(e),famille=EUC_DEV339_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO';
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
  /* Même coque non bloquante que l'administration, mais navigation et
   * commandes strictement publiques. La donnée métier arrive ensuite via le
   * chargeur commun en lecture seule. */
  t.paramsJson=JSON.stringify({annee:annee,famille:famille,publicMode:true});
  t.dataJson=JSON.stringify({ok:true,ready:false,loading:true,classes:[]});
  t.baseUrl=typeof EUC_DEV455_PUBLIC_URL_!=='undefined'
    ?EUC_DEV455_PUBLIC_URL_
    :'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';
  return t.evaluate().setTitle('Point sur les stages — '+(famille==='BACPRO'?'BAC PRO':famille)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV504_chargerFamille(payload){
  payload=payload||{};var started=Date.now(),annee=EUC_DEV339_txt_(payload.annee),famille=EUC_DEV339_txt_(payload.famille)||'BACPRO';
  if(!annee)throw new Error('Année scolaire obligatoire.');
  try{
    var data=EUC_DEV339_familyData_(annee,famille)||{};
    data.durationMs=Date.now()-started;return data;
  }catch(e){
    console.error('[DEV504 famille] '+String(e&&e.message||e));
    return {ok:false,ready:false,annee:annee,famille:famille,classes:[],durationMs:Date.now()-started,error:'Aucune synthèse n’est disponible pour cette famille.'};
  }
}


function EUC_DEV339_familyData_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV339_familyData_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV339_familyData_',Date.now()-__t);
  }
}
