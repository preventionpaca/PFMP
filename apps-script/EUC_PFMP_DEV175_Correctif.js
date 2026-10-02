/** Eucalyptus PFMP — v1.0.0-dev.175 corrective */

function EUC_DEV175C_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV175C_afficherAudit(e){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var tpl=HtmlService.createTemplateFromFile('Audit_Performance_PFMP_V175');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  return tpl.evaluate()
    .setTitle('Audit performance PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV175C_audit(payload){
  payload=payload||{};
  var annee=EUC_DEV175C_txt_(payload.annee);
  if(!annee){
    try{annee=EUC_PFMP_contexteAnneeLectureV155_().active;}catch(e){}
  }

  var out={diagnostic:'DEV175C_AUDIT',annee:annee,mesures:{}};
  var t;

  if(typeof EUC_V50_snapshot_==='function'){
    t=Date.now();
    EUC_V50_snapshot_(annee);
    out.mesures.snapshotSuiviMs=Date.now()-t;
  }

  if(typeof EUC_APP172_snapshot==='function'){
    t=Date.now();
    EUC_APP172_snapshot(annee);
    out.mesures.apprentissageMs=Date.now()-t;
  }

  if(typeof EUC_DEV174_pdifRows_==='function'){
    t=Date.now();
    EUC_DEV174_pdifRows_();
    out.mesures.parcoursDifferencieMs=Date.now()-t;
  }

  if(typeof EUC_CONVENTION_lireElevesAdmin==='function'){
    t=Date.now();
    EUC_CONVENTION_lireElevesAdmin();
    out.mesures.elevesGenerateurMs=Date.now()-t;
  }

  if(typeof EUC_CONVENTION_lireClassesEtPeriodesAdmin==='function'){
    t=Date.now();
    EUC_CONVENTION_lireClassesEtPeriodesAdmin();
    out.mesures.classesPeriodesMs=Date.now()-t;
  }

  out.totalMs=Object.keys(out.mesures).reduce(function(s,k){
    return s+Number(out.mesures[k]||0);
  },0);

  console.log(JSON.stringify(out));
  return out;
}

function EUC_DEV175C_afficherPublic(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_PublicV175');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.requestedYear=JSON.stringify(EUC_DEV175C_txt_(e&&e.parameter&&e.parameter.annee));
  return tpl.evaluate()
    .setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV175C_resumePublic(payload){
  payload=payload||{};
  var annee=EUC_DEV175C_txt_(payload.annee);

  return ['BACPRO','BTS','CAP'].map(function(famille){
    var r=null;

    if(typeof EUC_APP172_resumeFamille==='function'){
      try{
        r=EUC_APP172_resumeFamille({annee:annee,famille:famille});
      }catch(e){}
    }

    if(!r && typeof EUC_SUIVI_PUBLIC_resumeFamilleV51==='function'){
      try{
        r=EUC_SUIVI_PUBLIC_resumeFamilleV51({annee:annee,famille:famille});
      }catch(e){}
    }

    if(!r){
      r={
        code:famille,
        libelle:famille==='BACPRO'?'BAC PRO':famille,
        classes:0,
        effectif:0,
        apprentis:0,
        periodes:[]
      };
    }

    r.code=famille;
    r.libelle=famille==='BACPRO'?'BAC PRO':famille;
    if(r.apprentis==null)r.apprentis=0;
    return r;
  });
}

/** DEV177B — purge manuelle des caches générateur. */
function EUC_DEV177B_invaliderCachesPerformance(){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var c=CacheService.getScriptCache();
  c.remove('DEV177B_ELEVES_GENERATEUR');
  c.remove('DEV177B_CLASSES_PERIODES');
  return {ok:true};
}
