/**
 * Eucalyptus PFMP — v1.0.0-dev.185 COMPLETE
 *
 * Stratégie performance :
 * - aucun téléchargement massif au premier écran ;
 * - résumé des 3 familles chargé progressivement ;
 * - une famille calculée seulement lorsqu'elle est ouverte ;
 * - un détail classe/période calculé seulement lorsqu'il est demandé ;
 * - caches serveur partagés 10 min ;
 * - cache navigateur sur les vues publiques ;
 * - audit détaillé classe/période.
 */

var EUC_DEV185_TTL_=1800;

function EUC_DEV185_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV185_cacheGet_(key){
  var got=CacheService.getScriptCache().get(key);
  if(!got)return null;
  try{return JSON.parse(got);}catch(e){return null;}
}

function EUC_DEV185_cachePut_(key,value){
  try{
    CacheService.getScriptCache().put(
      key,
      JSON.stringify(value),
      EUC_DEV185_TTL_
    );
  }catch(e){}
}

/* -------------------- DONNEES PUBLIQUES PROGRESSIVES -------------------- */

function EUC_DEV185_resumeFamille(payload){
  payload=payload||{};
  var annee=EUC_DEV185_txt_(payload.annee);
  var famille=EUC_DEV185_txt_(payload.famille);
  var key='DEV185_RESUME_'+annee+'_'+famille;
  var t0=Date.now();

  var cached=EUC_DEV185_cacheGet_(key);
  if(cached){
    cached.__perf={source:'cache',dureeMs:Date.now()-t0};
    return cached;
  }

  var r=null;

  if(typeof EUC_APP172_resumeFamille==='function'){
    try{
      r=EUC_APP172_resumeFamille({
        annee:annee,
        famille:famille
      });
    }catch(e){}
  }

  if(!r && typeof EUC_SUIVI_PUBLIC_resumeFamilleV51==='function'){
    try{
      r=EUC_SUIVI_PUBLIC_resumeFamilleV51({
        annee:annee,
        famille:famille
      });
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

  EUC_DEV185_cachePut_(key,r);

  r.__perf={
    source:'calcul',
    dureeMs:Date.now()-t0
  };

  return r;
}

function EUC_DEV185_chargerFamille(payload){
  payload=payload||{};
  var annee=EUC_DEV185_txt_(payload.annee);
  var famille=EUC_DEV185_txt_(payload.famille);
  var key='DEV185_FAMILY_'+annee+'_'+famille;
  var t0=Date.now();

  var cached=EUC_DEV185_cacheGet_(key);
  if(cached){
    cached.__perf={source:'cache',dureeMs:Date.now()-t0};
    return cached;
  }

  var r=null;

  if(typeof EUC_APP172_chargerFamille==='function'){
    try{
      r=EUC_APP172_chargerFamille({
        annee:annee,
        famille:famille
      });
    }catch(e){}
  }

  if(!r && typeof EUC_SUIVI_PUBLIC_chargerFamilleV51==='function'){
    r=EUC_SUIVI_PUBLIC_chargerFamilleV51({
      annee:annee,
      famille:famille
    });
  }

  if(!r){
    r={
      ok:true,
      annee:annee,
      famille:famille,
      familleLibelle:famille==='BACPRO'?'BAC PRO':famille,
      classes:[]
    };
  }

  EUC_DEV185_cachePut_(key,r);

  r.__perf={
    source:'calcul',
    dureeMs:Date.now()-t0
  };

  return r;
}

function EUC_DEV185_buildDetail_(annee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);

  if(typeof EUC_V50_enrichirDetail_==='function'){
    d=EUC_V50_enrichirDetail_(d,annee,classeId,periodeId);
  }

  if(typeof EUC_V51_numeroPeriodes_==='function'){
    d=EUC_V51_numeroPeriodes_(d);
  }

  if(typeof EUC_APP172_enrichirDetail==='function'){
    d=EUC_APP172_enrichirDetail(d);
  }

  if(typeof EUC_DEV174_enrichirDetail_==='function'){
    d=EUC_DEV174_enrichirDetail_(d,annee);
  }

  return d;
}

function EUC_DEV185_detail_(annee,classeId,periodeId){
  var key='DEV185_DETAIL_'+annee+'_'+classeId+'_'+periodeId;
  var cached=EUC_DEV185_cacheGet_(key);

  if(cached){
    cached.__cacheHit=true;
    return cached;
  }

  var d=EUC_DEV185_buildDetail_(annee,classeId,periodeId);
  d.__cacheHit=false;
  EUC_DEV185_cachePut_(key,d);
  return d;
}

/* -------------------- ROUTES PUBLIQUES ATRIUM -------------------- */

function EUC_DEV185_afficherPublicHome(e){
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_PublicV185');
  t.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });
  t.requestedYear=JSON.stringify(
    EUC_DEV185_txt_(e&&e.parameter&&e.parameter.annee)
  );

  return t.evaluate()
    .setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV185_afficherPublicFamille(e){
  var t=HtmlService.createTemplateFromFile(
    'Suivi_Conventions_Public_FamilleV185'
  );

  t.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });

  t.paramsJson=JSON.stringify({
    annee:EUC_DEV185_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_DEV185_txt_(e&&e.parameter&&e.parameter.famille)
  });

  return t.evaluate()
    .setTitle('Point sur les stages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV185_afficherPublicClasse(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();

  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_DEV185_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  var famille=EUC_DEV185_txt_(e&&e.parameter&&e.parameter.famille);

  if(!classeId||!periodeId){
    throw new Error('Classe ou période manquante.');
  }

  var d=EUC_DEV185_detail_(annee,classeId,periodeId);

  var t=HtmlService.createTemplateFromFile(
    'Suivi_PFMP_Classe_PublicV185'
  );

  t.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });

  t.detailJson=JSON.stringify(d);
  t.famille=JSON.stringify(famille);

  return t.evaluate()
    .setTitle(
      'Point sur les stages — '+
      (d.classe&&d.classe.nom||'Classe')
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* -------------------- ROUTE ADMIN DETAIL -------------------- */

function EUC_DEV185_afficherAdminClasse(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();

  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_DEV185_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;

  if(!classeId){
    throw new Error('Classe manquante.');
  }

  var d=EUC_DEV185_detail_(annee,classeId,periodeId);

  var t=HtmlService.createTemplateFromFile(
    'Suivi_PFMP_Classe_Detail_V156'
  );

  t.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });

  t.anneeContextJson=JSON.stringify(ctx);
  t.detailJson=JSON.stringify(d);

  return t.evaluate()
    .setTitle('Suivi PFMP — '+(d.classe&&d.classe.nom||'Classe'))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* -------------------- AUDIT DETAILLE -------------------- */

function EUC_DEV185_auditOptions(payload){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  payload=payload||{};

  var annee=EUC_DEV185_txt_(payload.annee);
  if(!annee){
    annee=EUC_PFMP_contexteAnneeLectureV155_().active;
  }

  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();

  return {
    annee:annee,
    classes:(meta.classes||[]).map(function(c){
      return {
        id:Number(c.id)||0,
        label:c.nom||c.libelle||('Classe '+c.id)
      };
    }),
    periodes:(meta.periodes||[]).map(function(p){
      return {
        id:Number(p.id)||0,
        label:(p.libelle||p.nom||('Période '+p.id))+
          (p.debut?' · '+p.debut:'')+
          (p.fin?' → '+p.fin:'')
      };
    })
  };
}

function EUC_DEV185_auditClasse(payload){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  payload=payload||{};

  var annee=EUC_DEV185_txt_(payload.annee);
  var classeId=Number(payload.classe)||0;
  var periodeId=Number(payload.periode)||0;

  if(!annee||!classeId||!periodeId){
    throw new Error('Année, classe et période obligatoires.');
  }

  var out={
    diagnostic:'DEV185_AUDIT_CLASSE',
    annee:annee,
    classe:classeId,
    periode:periodeId,
    mesures:{}
  };

  var t, d, copy;

  /* 1. cache */
  t=Date.now();
  var cacheKey='DEV185_DETAIL_'+annee+'_'+classeId+'_'+periodeId;
  var cacheHit=!!CacheService.getScriptCache().get(cacheKey);
  out.mesures.cacheCheckMs=Date.now()-t;
  out.cacheHit=cacheHit;

  /* 2. lecture élèves générateur */
  if(typeof EUC_CONVENTION_lireElevesAdmin==='function'){
    t=Date.now();
    EUC_CONVENTION_lireElevesAdmin();
    out.mesures.elevesMs=Date.now()-t;
  }

  /* 3. lecture conventions / accès */
  if(typeof EUC_CONVENTION_lireAccesFraisV108_==='function'){
    t=Date.now();
    EUC_CONVENTION_lireAccesFraisV108_();
    out.mesures.conventionsMs=Date.now()-t;
  }

  /* 4. apprentissage */
  if(typeof EUC_APP172_rows==='function'){
    t=Date.now();
    EUC_APP172_rows();
    out.mesures.apprentissageMs=Date.now()-t;
  }

  /* 5. parcours différencié */
  if(typeof EUC_DEV174_pdifRows_==='function'){
    t=Date.now();
    EUC_DEV174_pdifRows_();
    out.mesures.pdifMs=Date.now()-t;
  }

  /*
   * 6. coeur historique du détail.
   * Cette mesure inclut les lectures / croisements professeurs,
   * affectations et données de suivi encore encapsulés dans detailF18_.
   */
  t=Date.now();
  d=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);
  out.mesures.detailF18InclProfAffectationsMs=Date.now()-t;

  /* 7. enrichissement conventions */
  if(typeof EUC_V50_enrichirDetail_==='function'){
    copy=JSON.parse(JSON.stringify(d));
    t=Date.now();
    EUC_V50_enrichirDetail_(copy,annee,classeId,periodeId);
    out.mesures.enrichissementConventionsMs=Date.now()-t;
  }

  /* 8. numérotation périodes */
  if(typeof EUC_V51_numeroPeriodes_==='function'){
    copy=JSON.parse(JSON.stringify(d));
    t=Date.now();
    EUC_V51_numeroPeriodes_(copy);
    out.mesures.numerotationPeriodesMs=Date.now()-t;
  }

  /* 9. enrichissement apprentissage détail */
  if(typeof EUC_APP172_enrichirDetail==='function'){
    copy=JSON.parse(JSON.stringify(d));
    t=Date.now();
    EUC_APP172_enrichirDetail(copy);
    out.mesures.enrichissementApprentissageMs=Date.now()-t;
  }

  /* 10. enrichissement P.dif détail */
  if(typeof EUC_DEV174_enrichirDetail_==='function'){
    copy=JSON.parse(JSON.stringify(d));
    t=Date.now();
    EUC_DEV174_enrichirDetail_(copy,annee);
    out.mesures.enrichissementPdifMs=Date.now()-t;
  }

  /* 11. chaîne complète sans cache */
  t=Date.now();
  var complete=EUC_DEV185_buildDetail_(annee,classeId,periodeId);
  out.mesures.pipelineCompletSansCacheMs=Date.now()-t;

  /* 12. sérialisation / préparation HTML */
  t=Date.now();
  var serialized=JSON.stringify(complete);
  var tpl=HtmlService.createTemplateFromFile(
    'Suivi_PFMP_Classe_Detail_V156'
  );
  tpl.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });
  tpl.anneeContextJson=JSON.stringify(
    EUC_PFMP_contexteAnneeLectureV155_()
  );
  tpl.detailJson=serialized;
  tpl.evaluate();
  out.mesures.templateHtmlMs=Date.now()-t;

  out.totalMesureMs=Object.keys(out.mesures).reduce(function(sum,k){
    return sum+Number(out.mesures[k]||0);
  },0);

  console.log(JSON.stringify(out));
  return out;
}

function EUC_DEV185_afficherAudit(e){
  EUC_ADMIN_WORKFLOW_ctxV144_();

  var t=HtmlService.createTemplateFromFile(
    'Audit_Performance_PFMP_V185'
  );

  t.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });

  return t.evaluate()
    .setTitle('Audit performance PFMP — DEV185')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
