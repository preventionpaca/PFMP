
function EUC_DEV287_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV287_norm_(v){
  return EUC_DEV287_txt_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
}
function EUC_DEV287_isPdif_(p){
  if(typeof EUC_DEV285B_isPdif_==='function'){try{return EUC_DEV285B_isPdif_(p);}catch(e){}}
  var t=EUC_DEV287_norm_([p&&p.type,p&&p.libelle,p&&p.nom,p&&p.v50Slot,p&&p.v51Slot].filter(Boolean).join(' '));
  return /P[.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(t);
}
function EUC_DEV287_isTerminale_(cl){
  try{
    if(typeof EUC_DEV174_estTerminale_==='function'){
      return !!EUC_DEV174_estTerminale_(cl&&(cl.nom||cl.libelle||cl.code||''));
    }
  }catch(e){}
  var n=EUC_DEV287_norm_(cl&&(cl.nom||cl.libelle||cl.code||''));
  return /^T[A-Z0-9]/.test(n)||n.indexOf('TERMINALE')>=0;
}
function EUC_DEV287_compatible_(p,cl){
  try{
    if(typeof EUC_CONVENTION_periodeCompatibleClasse_==='function'){
      return !!EUC_CONVENTION_periodeCompatibleClasse_(p,cl);
    }
  }catch(e){}
  return true;
}
function EUC_DEV287_findPdif_(meta,cl,annee){
  var candidates=(meta&&meta.periodes||[]).filter(function(p){
    if(!EUC_DEV287_isPdif_(p))return false;
    if(p.annee&&String(p.annee)!==String(annee))return false;
    return EUC_DEV287_compatible_(p,cl);
  }).sort(function(a,b){return String(a.debut||'').localeCompare(String(b.debut||''));});

  if(candidates.length)return candidates[0];

  try{
    if(typeof EUC_DEV190G1_chargerFamille==='function'){
      var fam=EUC_DEV190G1_chargerFamille({annee:annee,famille:'BACPRO'});
      var cid=Number(cl&&cl.id)||0;
      var c=(fam.classes||[]).filter(function(x){return Number(x.classeId||x.id)===cid;})[0];
      var pd=(c&&c.periodes||[]).filter(EUC_DEV287_isPdif_)[0];
      if(pd){
        var exact=(meta.periodes||[]).filter(function(x){return Number(x.id)===Number(pd.id);})[0];
        if(exact)return exact;
        return {
          id:Number(pd.id)||0,
          annee:annee,
          classe:cl.nom||cl.libelle||'',
          type:pd.type||pd.libelle||pd.v50Slot||pd.v51Slot||'P.dif.',
          debut:pd.debut||pd.Date_debut||pd.debutFr||'',
          fin:pd.fin||pd.Date_fin||pd.finFr||''
        };
      }
    }
  }catch(e2){}
  return null;
}
function EUC_DEV287_isPfmp2Terminale_(meta,cl,p,annee,pdif){
  if(!EUC_DEV287_isTerminale_(cl))return false;
  if(!p||!pdif||EUC_DEV287_isPdif_(p))return false;

  var pFin=String(p.fin||''),pdifDebut=String(pdif.debut||'');
  if(!pFin||!pdifDebut||pFin>pdifDebut)return false;

  var before=(meta&&meta.periodes||[]).filter(function(x){
    if(EUC_DEV287_isPdif_(x)||!EUC_DEV287_compatible_(x,cl))return false;
    if(x.annee&&String(x.annee)!==String(annee))return false;
    var fin=String(x.fin||'');
    return !!fin&&fin<=pdifDebut;
  }).sort(function(a,b){return String(b.fin||'').localeCompare(String(a.fin||''));});

  return before.length ? Number(before[0].id)===Number(p.id) : false;
}
function EUC_DEV287_modeFor_(eleveId,annee){
  if(typeof EUC_DEV285B_modeFor_==='function')return EUC_DEV285B_modeFor_(eleveId,annee);
  if(typeof EUC_DEV285_modeFor_==='function')return EUC_DEV285_modeFor_(eleveId,annee);
  return '';
}
function EUC_DEV287_decision_(eleve,meta,cl,p,annee){
  var pdif=EUC_DEV287_findPdif_(meta,cl,annee);
  if(!pdif||!EUC_DEV287_isPfmp2Terminale_(meta,cl,p,annee,pdif)){
    return {applicable:false,pdif:null,pdifMode:''};
  }

  var mode=EUC_DEV287_modeFor_(Number(eleve.id)||0,annee);

  if(!mode){
    return {
      applicable:true,pdif:pdif,pdifMode:'',
      error:'Fin de Terminale à définir pour '+[eleve.nom||'',eleve.prenom||''].filter(Boolean).join(' ')+'.'
    };
  }

  if(mode==='PARCOURS_DIFF_LYCEE'){
    return {applicable:true,pdif:pdif,pdifMode:'LYCEE',mode:mode};
  }

  if(mode==='POURSUITE_PFMP2_ENTREPRISE'){
    return {applicable:true,pdif:pdif,pdifMode:'ENTREPRISE',mode:mode};
  }

  return {applicable:true,pdif:pdif,pdifMode:'',error:'Mode fin Terminale invalide.'};
}
function EUC_DEV287_preparerAcces(payload){
  var ctx=EUC_IMPORT_exigerAdminTexte_();
  payload=payload||{};

  var eleveId=Number(payload.eleveId)||0;
  var classeId=Number(payload.classeConventionId)||0;
  var periodeId=Number(payload.periodeId)||0;
  var annee=EUC_DEV287_txt_(payload.anneeConvention);

  if(!eleveId||!classeId||!periodeId||!/^20\d{2}-20\d{2}$/.test(annee)){
    throw new Error('Élève, classe, période et année scolaire sont obligatoires.');
  }

  var eleves=EUC_CONVENTION_lireElevesAdmin();
  var eleve=eleves.filter(function(e){return Number(e.id)===eleveId;})[0];
  if(!eleve)throw new Error('Élève introuvable.');

  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();
  var cl=(meta.classes||[]).filter(function(c){return Number(c.id)===classeId;})[0];
  var p=(meta.periodes||[]).filter(function(x){return Number(x.id)===periodeId;})[0];
  if(!cl||!p)throw new Error('Classe ou période introuvable.');

  var elig=EUC_DEV174_evaluerEligibilite_(eleve,cl,p,annee);
  if(!elig.convention){
    throw new Error('Convention non requise : '+String(elig.code||'').replace(/_/g,' ')+'.');
  }

  EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeId,annee,periodeId,'Période officielle');

  var decision=EUC_DEV287_decision_(eleve,meta,cl,p,annee);
  if(decision.error)throw new Error(decision.error);

  var a=EUC_CONVENTION_preparerRecordAcces_(
    ctx,eleve,cl,p,annee,
    {pdif:decision.pdif||null,pdifMode:decision.pdifMode||''}
  );

  EUC_CONVENTION_assurerTableAcces_();
  EUC_ENT_grist(
    'post',
    '/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',
    {records:[a.record]}
  );

  var base=ScriptApp.getService().getUrl();

  console.log(JSON.stringify({
    diagnostic:'DEV287',
    eleveId:eleve.id,
    periodeType:p.type||'',
    pdifId:decision.pdif?decision.pdif.id:0,
    pdifMode:decision.pdifMode||'',
    dateFinOriginale:p.fin,
    dateFinGeneree:a.dateFin
  }));

  return {
    ok:true,
    reference:a.reference,
    token:a.token,
    urlFormulaire:base+'?page=pfmp&token='+encodeURIComponent(a.token),
    urlImpression:base+'?page=convention-pfmp-print&token='+encodeURIComponent(a.token),
    eleve:eleve,
    classeConvention:cl,
    periode:p,
    anneeConvention:annee,
    pdifMode:decision.pdifMode||'',
    pdif:decision.pdif||null,
    dateFin:a.dateFin
  };
}
function EUC_DEV287_preparerAccesClasseNom(payload){
  payload=payload||{};
  var classeNom=EUC_DEV174_txt_(payload.classeElevesNom);
  var annee=EUC_DEV174_txt_(payload.anneeConvention);
  var classeId=Number(payload.classeConventionId)||0;
  var periodeId=Number(payload.periodeId)||0;

  if(!classeNom||!annee||!classeId||!periodeId){
    throw new Error('Promotion, année, classe ou période manquante.');
  }

  var eleves=EUC_CONVENTION_lireElevesAdmin().filter(function(e){
    return EUC_DEV174_norm_(e.classe)===EUC_DEV174_norm_(classeNom);
  });

  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();
  var cl=(meta.classes||[]).filter(function(c){return Number(c.id)===classeId;})[0];
  var p=(meta.periodes||[]).filter(function(x){return Number(x.id)===periodeId;})[0];
  if(!cl||!p)throw new Error('Classe ou période introuvable.');

  var ctx=EUC_IMPORT_exigerAdminTexte_();
  var lot='LOT-'+annee.replace('-','')+'-'+Date.now();
  var records=[],prepared=[],skipped=[];

  eleves.forEach(function(e){
    var elig=EUC_DEV174_evaluerEligibilite_(e,cl,p,annee);
    var isApprenti=!!elig.apprenti;

    if(!elig.convention&&!isApprenti){
      skipped.push({id:e.id,nom:e.nom,prenom:e.prenom,raison:elig.code});
      return;
    }

    var decision={pdif:null,pdifMode:''};

    if(!isApprenti){
      decision=EUC_DEV287_decision_(e,meta,cl,p,annee);

      if(decision.error){
        skipped.push({id:e.id,nom:e.nom,prenom:e.prenom,raison:'FIN_TERMINALE_A_DEFINIR'});
        return;
      }
    }

    var a=EUC_CONVENTION_preparerRecordAcces_(
      ctx,e,cl,p,annee,
      {pdif:decision.pdif||null,pdifMode:decision.pdifMode||'',lot:lot}
    );

    records.push(a.record);
    prepared.push({a:a,e:e,apprenti:isApprenti});
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
      urlImpression:base+'?page=convention-pfmp-print&token='+encodeURIComponent(x.a.token),
      urlFormulaire:base+'?page=pfmp&token='+encodeURIComponent(x.a.token),
      annee:annee,
      classe:cl.nom||cl.libelle||classeNom,
      debut:p.debut,
      fin:x.a.dateFin||p.fin||'',
      pdifMode:(x.a.record&&x.a.record.fields&&x.a.record.fields.PDIF_mode)||'',
      apprenti:!!x.apprenti
    };
  });

  CacheService.getScriptCache().put(
    'EUC_CONV_LOT_'+lot,
    JSON.stringify({lot:lot,classe:cl.nom||cl.libelle||classeNom,annee:annee,periode:p,items:items}),
    21600
  );

  return {
    ok:true,
    total:items.length,
    lot:lot,
    classeElevesNom:classeNom,
    classeConvention:cl.nom||cl.libelle||classeNom,
    periode:p,
    anneeConvention:annee,
    items:items,
    skipped:skipped,
    urlImpressionLot:base+'?page=conventions-pfmp-batch-print&lot='+encodeURIComponent(lot)
  };
}
