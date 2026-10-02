/** Eucalyptus PFMP — v1.0.0-dev.174 */

var EUC_DEV174_PDIF_TABLE_='EUC_PARCOURS_DIFFERENCIE_PFMP';

function EUC_DEV174_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV174_norm_(v){return EUC_DEV174_txt_(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function EUC_DEV174_date_(v){return EUC_IMPORT_dateExistanteISO_(v)||'';}
function EUC_DEV174_col_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}

function EUC_DEV174_assurerPdif_(){
  var tabs=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tabs.some(function(t){return t.id===EUC_DEV174_PDIF_TABLE_;});
  var c=EUC_DEV174_col_;
  var cols=[
    c('Eleve','Élève','Ref:EUC_ELEVES_PFMP'),
    c('Annee_scolaire','Année scolaire'),
    c('Parcours_differencie','Parcours différencié','Bool'),
    c('Date_decision','Date décision','Date'),
    c('Remarque','Remarque'),
    c('Actif','Actif','Bool'),
    c('Date_creation','Créé le','DateTime'),
    c('Date_modification','Modifié le','DateTime'),
    c('Auteur','Auteur')
  ];
  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_DEV174_PDIF_TABLE_,columns:cols}]});
    return true;
  }
  var have={};
  (EUC_ENT_grist('get','/tables/'+EUC_DEV174_PDIF_TABLE_+'/columns').columns||[]).forEach(function(x){have[x.id]=1;});
  var miss=cols.filter(function(x){return !have[x.id];});
  if(miss.length)EUC_ENT_grist('post','/tables/'+EUC_DEV174_PDIF_TABLE_+'/columns',{columns:miss});
  return true;
}

function EUC_DEV174_pdifRows_(){
  try{return EUC_IMPORT_lireRecords_(EUC_DEV174_PDIF_TABLE_).filter(function(r){return EUC_DEV281_active_(r.Actif);});}
  catch(e){EUC_DEV174_assurerPdif_();return [];}
}

function EUC_DEV174_estPdif_(rows,eid,annee){
  return (rows||[]).some(function(r){
    return Number(EUC_PFMP_ref_(r.Eleve))===Number(eid) &&
      EUC_DEV174_txt_(r.Annee_scolaire)===EUC_DEV174_txt_(annee) &&
      EUC_DEV281_bool_(r.Parcours_differencie) && EUC_DEV281_active_(r.Actif);
  });
}

function EUC_DEV174_estTerminale_(classeNom){
  var n=EUC_DEV174_norm_(classeNom);
  return /^T/.test(n) || /TERMINALE/.test(n);
}

function EUC_DEV174_periodeEstPdif_(p){
  var t=EUC_DEV174_norm_([p&&p.type,p&&p.libelle,p&&p.groupe,p&&p.niveau].filter(Boolean).join(' '));
  return /P[\.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(t);
}

function EUC_DEV174_evaluerEligibilite_(eleve,classe,periode,annee){
  var eid=Number(eleve&&eleve.id)||0;
  var debut=EUC_DEV174_date_(periode&&periode.debut);
  var fin=EUC_DEV174_date_(periode&&periode.fin);

  var app={code:'SCOLAIRE'};
  if(typeof EUC_APP172_eval==='function'){
    app=EUC_APP172_eval(EUC_APP172_rows(),eid,debut,fin);
  }

  if(app.code==='APPRENTI'){
    return {code:'APPRENTI_SANS_CONVENTION',convention:false,apprenti:true,pdif:false,mixte:false};
  }
  if(app.code==='MIXTE'){
    return {code:'STATUT_MIXTE_A_VERIFIER',convention:false,apprenti:false,pdif:false,mixte:true};
  }

  var pdif=EUC_DEV174_estPdif_(EUC_DEV174_pdifRows_(),eid,annee);
  if(EUC_DEV174_periodeEstPdif_(periode) && pdif){
    return {code:'PARCOURS_DIFFERENCIE_SANS_CONVENTION',convention:false,apprenti:false,pdif:true,mixte:false};
  }

  return {code:'SCOLAIRE_CONVENTION_REQUISE',convention:true,apprenti:false,pdif:pdif,mixte:false};
}

/* ---------- saisie P.dif ---------- */

function EUC_DEV174_afficherPdif(e){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  EUC_DEV174_assurerPdif_();
  var t=HtmlService.createTemplateFromFile('Parcours_Differencie_PFMP_V174');
  t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  return t.evaluate().setTitle('Parcours différencié PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV174_pdifData(p){
  EUC_ADMIN_WORKFLOW_ctxV144_();EUC_DEV174_assurerPdif_();p=p||{};
  var ctx=EUC_PFMP_contexteAnneeLectureV155_(),annee=EUC_DEV174_txt_(p.annee)||ctx.active,classeId=Number(p.classe)||0,map=EUC_V154_anneesMap_();
  var classes=EUC_IMPORT_lireRecords_('Classes').filter(function(c){
    return c.Actif!==false && EUC_DEV174_estTerminale_(EUC_V154_classeNom_(c));
  }).map(function(c){return {id:Number(c.id),nom:EUC_V154_classeNom_(c)};}).sort(function(a,b){return a.nom.localeCompare(b.nom,'fr');});
  if(!classeId&&classes.length)classeId=classes[0].id;

  var pdif=EUC_DEV174_pdifRows_();
  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(e){
    if(e.Actif===false||e.Present_dernier_import===false)return false;
    if(Number(EUC_PFMP_ref_(e.Classe))!==classeId)return false;
    var a=EUC_V154_anneeCode_(e.Annee_scolaire,map);
    return !annee||!a||a===annee;
  }).map(function(e){
    var row=pdif.filter(function(r){
      return Number(EUC_PFMP_ref_(r.Eleve))===Number(e.id) &&
        EUC_DEV174_txt_(r.Annee_scolaire)===annee && r.Actif!==false;
    })[0]||null;
    return {
      id:Number(e.id),nom:EUC_DEV174_txt_(e.Nom),prenom:EUC_DEV174_txt_(e.Prenom_usage||e.Prenom),
      pdif:!!(row&&row.Parcours_differencie===true),recordId:row?Number(row.id):0,
      date:EUC_DEV174_date_(row&&row.Date_decision),remarque:EUC_DEV174_txt_(row&&row.Remarque)
    };
  }).sort(function(a,b){return a.nom.localeCompare(b.nom,'fr')||a.prenom.localeCompare(b.prenom,'fr');});

  return {annee:annee,annees:ctx.annees||[],classes:classes,classeId:classeId,eleves:eleves};
}

function EUC_DEV174_pdifSave(p){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();EUC_DEV174_assurerPdif_();p=p||{};
  var eid=Number(p.eleve)||0,annee=EUC_DEV174_txt_(p.annee),rid=Number(p.recordId)||0,now=new Date().toISOString();
  if(!eid||!annee)throw new Error('Élève ou année manquant.');
  var fields={
    Eleve:eid,Annee_scolaire:annee,Parcours_differencie:!!p.pdif,
    Date_decision:EUC_DEV174_date_(p.date)||null,Remarque:EUC_DEV174_txt_(p.remarque),
    Actif:true,Date_modification:now,Auteur:ctx.email||''
  };
  if(rid)EUC_ENT_grist('patch','/tables/'+EUC_DEV174_PDIF_TABLE_+'/records',{records:[{id:rid,fields:fields}]});
  else{fields.Date_creation=now;EUC_ENT_grist('post','/tables/'+EUC_DEV174_PDIF_TABLE_+'/records',{records:[{fields:fields}]});}
  return {ok:true};
}

/* ---------- générateur : éligibilité centralisée ---------- */

function EUC_DEV174_preparerAcces(payload){
  var t0=Date.now(),ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};
  var eleveId=Number(payload.eleveId||0),classeId=Number(payload.classeConventionId||0),periodeId=Number(payload.periodeId||0),pdifId=Number(payload.pdifPeriodeId||0),annee=EUC_DEV174_txt_(payload.anneeConvention);
  if(!eleveId||!classeId||!periodeId||!/^20\d{2}-20\d{2}$/.test(annee))throw new Error('Élève, classe, période et année obligatoires.');

  var eleve=EUC_CONVENTION_lireElevesAdmin().filter(function(e){return Number(e.id)===eleveId;})[0];
  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();
  var cl=meta.classes.filter(function(c){return Number(c.id)===classeId;})[0];
  var p=meta.periodes.filter(function(x){return Number(x.id)===periodeId;})[0];
  var pdif=pdifId?meta.periodes.filter(function(x){return Number(x.id)===pdifId;})[0]:null;
  if(!eleve||!cl||!p)throw new Error('Élève, classe ou période introuvable.');

  var elig=EUC_DEV174_evaluerEligibilite_(eleve,cl,p,annee);
  if(!elig.convention)throw new Error('Convention non requise : '+elig.code.replace(/_/g,' ')+'.');

  EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeId,annee,periodeId,'Période officielle');
  if(pdif)EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeId,annee,pdifId,'Période PDIF');

  var pdifMode='';
  if(pdif){
    var ep=EUC_DEV174_evaluerEligibilite_(eleve,cl,pdif,annee);
    if(ep.convention)pdifMode='ENTREPRISE';
  }

  EUC_CONVENTION_assurerTableAcces_();
  var a=EUC_CONVENTION_preparerRecordAcces_(ctx,eleve,cl,p,annee,{pdif:pdif,pdifMode:pdifMode});
  EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[a.record]});
  var base=ScriptApp.getService().getUrl();
  console.log(JSON.stringify({diagnostic:'DEV174_PERF',op:'generation_simple',dureeMs:Date.now()-t0}));
  return {ok:true,reference:a.reference,token:a.token,urlFormulaire:base+'?page=pfmp&token='+encodeURIComponent(a.token),urlImpression:base+'?page=convention-pfmp-print&token='+encodeURIComponent(a.token),eleve:eleve,classeConvention:cl,periode:p,anneeConvention:annee,pdifMode:pdifMode};
}

function EUC_DEV174_preparerAccesClasseNom(payload){
  var t0=Date.now(),ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};
  var classeNom=EUC_DEV174_txt_(payload.classeElevesNom),
      annee=EUC_DEV174_txt_(payload.anneeConvention),
      classeId=Number(payload.classeConventionId)||0,
      periodeId=Number(payload.periodeId)||0,
      pdifId=Number(payload.pdifPeriodeId)||0;

  if(!classeNom||!annee||!classeId||!periodeId){
    throw new Error('Promotion, année, classe ou période manquante.');
  }

  var eleves=EUC_CONVENTION_lireElevesAdmin().filter(function(e){
    return EUC_DEV174_norm_(e.classe)===EUC_DEV174_norm_(classeNom);
  });

  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();
  var cl=meta.classes.filter(function(c){return Number(c.id)===classeId;})[0];
  var p=meta.periodes.filter(function(x){return Number(x.id)===periodeId;})[0];
  var pdif=pdifId
    ? meta.periodes.filter(function(x){return Number(x.id)===pdifId;})[0]
    : null;

  if(!cl||!p)throw new Error('Classe ou période introuvable.');

  EUC_CONVENTION_verifierPeriodeAutorisee_(
    meta,classeId,annee,periodeId,'Période officielle'
  );
  if(pdif){
    EUC_CONVENTION_verifierPeriodeAutorisee_(
      meta,classeId,annee,pdifId,'Période PDIF'
    );
  }

  var lot='LOT-'+annee.replace('-','')+'-'+Date.now();
  var records=[],prepared=[],skipped=[];

  eleves.forEach(function(e){
    var elig=EUC_DEV174_evaluerEligibilite_(e,cl,p,annee);
    var isApprenti=!!elig.apprenti;

    /* DEV272 :
       les apprentis sont conservés dans l'impression en lot.
       Les autres exclusions historiques restent inchangées. */
    if(!elig.convention && !isApprenti){
      skipped.push({
        id:e.id,
        nom:e.nom,
        prenom:e.prenom,
        raison:elig.code
      });
      return;
    }

    var mode='';
    if(pdif){
      var ep=EUC_DEV174_evaluerEligibilite_(e,cl,pdif,annee);
      if(ep.convention)mode='ENTREPRISE';
    }

    var a=EUC_CONVENTION_preparerRecordAcces_(
      ctx,e,cl,p,annee,
      {pdif:pdif,pdifMode:mode,lot:lot}
    );

    records.push(a.record);
    prepared.push({
      a:a,
      e:e,
      apprenti:isApprenti
    });
  });

  if(records.length){
    EUC_CONVENTION_assurerTableAcces_();
    EUC_ENT_grist(
      'post',
      '/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',
      {records:records}
    );
  }

  var base=ScriptApp.getService().getUrl();

  var items=prepared.map(function(x){
    return {
      id:x.e.id,
      eleveId:x.e.id,
      nom:x.e.nom,
      prenom:x.e.prenom,
      reference:x.a.reference,
      token:x.a.token,
      apprenti:!!x.apprenti,
      urlImpression:
        base+'?page=convention-pfmp-print&token='+
        encodeURIComponent(x.a.token),
      urlFormulaire:
        base+'?page=pfmp&token='+
        encodeURIComponent(x.a.token),
      annee:annee,
      classe:cl.nom||cl.libelle||classeNom,
      debut:p.debut,
      fin:x.a.dateFin||p.fin||'',
      pdifMode:
        (x.a.record&&x.a.record.fields&&x.a.record.fields.PDIF_mode)||''
    };
  });

  /* Conservation du correctif impression lot DEV271B. */
  CacheService.getScriptCache().put(
    'EUC_CONV_LOT_'+lot,
    JSON.stringify({
      lot:lot,
      classe:cl.nom||cl.libelle||classeNom,
      annee:annee,
      periode:p,
      items:items
    }),
    21600
  );

  var nbApprentis=items.filter(function(i){return i.apprenti;}).length;

  console.log(JSON.stringify({
    diagnostic:'DEV272_LOT',
    dureeMs:Date.now()-t0,
    total:items.length,
    apprentis:nbApprentis,
    exclus:skipped.length
  }));

  return {
    ok:true,
    total:items.length,
    apprentis:nbApprentis,
    exclus:skipped.length,
    exclusDetails:skipped,
    classeElevesNom:classeNom,
    classeConvention:cl.nom||cl.libelle||'',
    lot:lot,
    urlImpressionLot:
      base+'?page=conventions-pfmp-batch-print&lot='+
      encodeURIComponent(lot),
    items:items
  };
}

/* ---------- détail + P.dif ---------- */

function EUC_DEV174_enrichirDetail_(d,annee){
  var rows=EUC_DEV174_pdifRows_();
  var isPdif=EUC_DEV174_periodeEstPdif_(d&&d.periode||{});
  var totalPdif=0;
  (d.lignes||[]).forEach(function(x){
    x.parcoursDifferencie=EUC_DEV174_estPdif_(rows,x.eleveId,annee);
    if(x.parcoursDifferencie)totalPdif++;
  });
  d.stats=d.stats||{};d.stats.parcoursDifferencies=totalPdif;
  return d;
}

/* ---------- audit performance ---------- */

function EUC_DEV174_auditPerformance(payload){
  EUC_ADMIN_WORKFLOW_ctxV144_();payload=payload||{};
  var annee=EUC_DEV174_txt_(payload.annee)||EUC_PFMP_contexteAnneeLectureV155_().active;
  var out={diagnostic:'DEV174_AUDIT',annee:annee,mesures:{}},t;

  t=Date.now();EUC_V50_snapshot_(annee);out.mesures.snapshotMs=Date.now()-t;
  t=Date.now();if(typeof EUC_APP172_snapshot==='function')EUC_APP172_snapshot(annee);out.mesures.apprentissageMs=Date.now()-t;
  t=Date.now();EUC_DEV174_pdifRows_();out.mesures.pdifMs=Date.now()-t;
  t=Date.now();EUC_CONVENTION_lireElevesAdmin();out.mesures.elevesGenerateurMs=Date.now()-t;
  t=Date.now();EUC_CONVENTION_lireClassesEtPeriodesAdmin();out.mesures.classesPeriodesMs=Date.now()-t;

  console.log(JSON.stringify(out));
  return out;
}
