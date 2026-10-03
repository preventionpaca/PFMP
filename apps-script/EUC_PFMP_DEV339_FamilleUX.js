/** PFMP — v1.0.0-dev.339 */
function EUC_DEV339_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV339_year_(e){var y=EUC_DEV339_txt_(e&&e.parameter&&e.parameter.annee);if(y)return y;var c=EUC_PFMP_contexteAnneeLectureV155_();return EUC_DEV339_txt_(c&&c.active);}

/* DEV421 — lecture réellement "snapshot first".
 * G1 enrichit le snapshot avec plusieurs tables métier à chaque affichage.
 * Pour la grille des classes, le payload persistant contient déjà toutes les
 * données nécessaires ; on le lit donc sans recalcul et on le garde 5 minutes
 * en cache Apps Script. Les écritures de snapshot et de situation invalident
 * explicitement cette entrée. */
var EUC_DEV421_FAMILY_TTL_=300;
function EUC_DEV421_familyKey_(annee,famille){
  return 'DEV422_FAMILY_'+EUC_DEV339_txt_(annee)+'_'+EUC_DEV339_txt_(famille).toUpperCase();
}
function EUC_DEV421_familyCacheGet_(annee,famille){
  var raw=null;
  try{raw=CacheService.getScriptCache().get(EUC_DEV421_familyKey_(annee,famille));}catch(e){}
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e2){return null;}
}
function EUC_DEV421_familyCachePut_(annee,famille,data){
  try{
    CacheService.getScriptCache().put(
      EUC_DEV421_familyKey_(annee,famille),JSON.stringify(data),EUC_DEV421_FAMILY_TTL_
    );
  }catch(e){}
  return data;
}
function EUC_DEV421_familyCacheInvalidate_(annee,famille){
  try{CacheService.getScriptCache().remove(EUC_DEV421_familyKey_(annee,famille));}catch(e){}
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
  return out;
}
function EUC_DEV422_readDetailSnapshot_(payload){
  var t0=Date.now(),rows=EUC_DEV190I_activeRows_(payload||{});
  if(!rows.length)return {ok:true,exists:false,durationMs:Date.now()-t0,detail:null};
  try{
    return {ok:true,exists:true,durationMs:Date.now()-t0,detail:JSON.parse((rows[0].fields||{}).Payload_JSON||'{}')};
  }catch(e){
    return {ok:false,exists:false,durationMs:Date.now()-t0,detail:null,error:String(e&&e.message||e)};
  }
}
function EUC_DEV422_batchSources_(annee,classIds){
  var out={access:{},accessAvailable:false,apps:[],appsAvailable:false};
  try{
    var rows=EUC_CONVENTION_lireAccesFraisV108_()||[];
    out.accessAvailable=true;
    rows.forEach(function(a){
      var y=EUC_DEV339_txt_(a.Annee_scolaire);
      var cid=typeof EUC_DEV340_ref_==='function'?EUC_DEV340_ref_(a.Classe_convention):Number(a.Classe_convention)||0;
      var pid=typeof EUC_DEV340_ref_==='function'?EUC_DEV340_ref_(a.Periode):Number(a.Periode)||0;
      var eid=typeof EUC_DEV340_ref_==='function'?EUC_DEV340_ref_(a.Eleve):Number(a.Eleve)||0;
      if((y&&y!==annee)||!classIds[String(cid)]||!pid||!eid)return;
      var k=cid+'|'+pid+'|'+eid;
      (out.access[k]=out.access[k]||[]).push(a);
    });
    Object.keys(out.access).forEach(function(k){out.access[k].sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});});
  }catch(eAccess){}
  try{
    out.apps=typeof EUC_DEV340_appRows_==='function'?EUC_DEV340_appRows_():(typeof EUC_DEV275B_rows_==='function'?EUC_DEV275B_rows_():[]);
    out.appsAvailable=true;
  }catch(eApps){}
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
      x.conventionId=actif?Number(actif.id)||0:0;x.convention=!!actif;x.statutCode=st.code;x.statut=st.libelle;
    }
    if(batch.appsAvailable&&typeof EUC_APP172_eval==='function'){
      var app=EUC_APP172_eval(batch.apps,eid,debut,fin)||{code:'SCOLAIRE'};
      x.statutApprentissage=app.code;x.apprenti=app.code==='APPRENTI';x.statutMixte=app.code==='MIXTE';
      if(x.apprenti){x.conventionId=0;x.convention=false;x.statutCode='APPRENTI';x.statut='APPRENTI';}
    }
  });
  if(typeof EUC_DEV420_enrichDetail_==='function'){
    try{detail=EUC_DEV420_enrichDetail_(detail,annee,famille,cid,pid)||detail;}catch(eSituations){}
  }
  return detail;
}
function EUC_DEV422_hydrateFamily_(data,annee,famille){
  data=data||{};
  var classIds={};
  (data.classes||[]).forEach(function(c){classIds[String(Number(c.classeId||c.id)||0)]=c;});
  if(!Object.keys(classIds).length)return data;
  var batch=EUC_DEV422_batchSources_(annee,classIds);
  var rows=[];
  try{rows=EUC_DEV190G_fastRecords_(EUC_DEV190I_TABLE_,{Annee_scolaire:[annee]})||[];}catch(e){return data;}
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
    (detail.lignes||[]).forEach(function(x){if(x.apprenti===true)appByClass[String(cid)][String(Number(x.eleveId)||EUC_DEV422_studentName_(x))]=1;});
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
  if(cached)return {ok:true,ready:true,payload:cached,source:'CACHE'};
  var rows=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{Annee_scolaire:[annee],Famille:[famille]})||[];
  rows=rows.filter(function(r){return (r.fields||{}).Actif!==false;}).sort(function(a,b){
    return (Date.parse((b.fields||{}).Updated_at||'')||0)-(Date.parse((a.fields||{}).Updated_at||'')||0);
  });
  if(!rows.length)return {ok:true,ready:false,payload:null,source:'SNAPSHOT_ABSENT'};
  var data=null;
  try{data=JSON.parse((rows[0].fields||{}).Payload_JSON||'{}');}catch(e){return {ok:false,ready:false,payload:null,source:'SNAPSHOT_INVALIDE'};}
  data=EUC_DEV422_hydrateFamily_(data,annee,famille);
  EUC_DEV421_familyCachePut_(annee,famille,data);
  return {ok:true,ready:!!data,payload:data,source:'SNAPSHOT'};
}
function EUC_DEV394_BASE_EUC_DEV339_familyData_(annee,famille){
  var data=null;
  /* Le snapshot indexé est précisément la vue de lecture destinée à cette
   * page. Le recalcul APP172 reste le repli de sécurité si le snapshot manque. */
  try{var fast=EUC_DEV421_fastFamilySnapshot_({annee:annee,famille:famille});if(fast&&fast.ready&&fast.payload){data=fast.payload;data.ready=true;data.source='FAST_INDEX';return data;}}catch(e1){}
  try{data=EUC_APP172_chargerFamille({annee:annee,famille:famille})||null;if(data&&Array.isArray(data.classes)&&data.classes.length){data.ready=true;data.source='APP172';return data;}}catch(e2){}
  return {ok:true,ready:false,annee:annee,famille:famille,classes:[],source:'NONE'};
}
function EUC_DEV339_afficherFamille(e){
  var annee=EUC_DEV339_year_(e),famille=EUC_DEV339_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO',data=EUC_DEV339_familyData_(annee,famille);
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
  t.paramsJson=JSON.stringify({annee:annee,famille:famille});t.dataJson=JSON.stringify(data||{});t.baseUrl='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';
  return t.evaluate().setTitle('Suivi des conventions — '+(famille==='BACPRO'?'BAC PRO':famille)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function EUC_DEV339_familyData_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV339_familyData_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV339_familyData_',Date.now()-__t);
  }
}
