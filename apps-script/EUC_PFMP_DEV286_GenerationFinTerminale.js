/**
 * Eucalyptus PFMP — v1.0.0-dev.286
 *
 * Génération des conventions PFMP2 selon le choix "Fin de Terminale".
 *
 * - PARCOURS_DIFF_LYCEE:
 *     convention = PFMP2 uniquement.
 *
 * - POURSUITE_PFMP2_ENTREPRISE:
 *     même convention, même entreprise,
 *     Date_fin = fin de la période P.dif.
 *
 * - À définir:
 *     génération individuelle bloquée ;
 *     en lot, élève écarté avec motif explicite.
 */
function EUC_DEV286_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV286_norm_(v){
  return EUC_DEV286_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function EUC_DEV286_isPfmp2_(p){
  if(
    typeof EUC_DEV285B_isPfmp2_==='function'
  ){
    return EUC_DEV285B_isPfmp2_(p);
  }

  var t=EUC_DEV286_norm_([
    p&&p.type,
    p&&p.libelle,
    p&&p.nom,
    p&&p.v50Slot,
    p&&p.v51Slot
  ].filter(Boolean).join(' '));

  return /PFMP[^0-9]*N?[^0-9]*2|PFMP[^0-9]*2/.test(t);
}

function EUC_DEV286_isPdif_(p){
  if(
    typeof EUC_DEV285B_isPdif_==='function'
  ){
    return EUC_DEV285B_isPdif_(p);
  }

  var t=EUC_DEV286_norm_([
    p&&p.type,
    p&&p.libelle,
    p&&p.nom,
    p&&p.v50Slot,
    p&&p.v51Slot
  ].filter(Boolean).join(' '));

  return /P[.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(t);
}

function EUC_DEV286_modeFor_(eleveId,annee){
  if(
    typeof EUC_DEV285B_modeFor_==='function'
  ){
    return EUC_DEV285B_modeFor_(
      eleveId,
      annee
    );
  }

  if(
    typeof EUC_DEV285_modeFor_==='function'
  ){
    return EUC_DEV285_modeFor_(
      eleveId,
      annee
    );
  }

  return '';
}

function EUC_DEV286_findPdif_(meta,cl,annee){
  var cid=Number(cl&&cl.id)||0;
  var periods=(meta&&meta.periodes)||[];

  var candidates=periods.filter(function(p){
    if(!EUC_DEV286_isPdif_(p)){
      return false;
    }

    if(
      p.annee &&
      String(p.annee)!==String(annee)
    ){
      return false;
    }

    return true;
  });

  /*
   * 1) Période directement compatible avec la classe.
   */
  var direct=candidates.filter(function(p){
    try{
      return (
        typeof EUC_CONVENTION_periodeCompatibleClasse_==='function' &&
        EUC_CONVENTION_periodeCompatibleClasse_(
          p,
          cl
        )
      );
    }catch(e){
      return false;
    }
  })[0];

  if(direct){
    return direct;
  }

  /*
   * 2) Fallback : l'index de suivi connaît déjà le bon couple
   * classe / période.
   */
  try{
    if(
      typeof EUC_DEV190G1_chargerFamille==='function'
    ){
      var fam=EUC_DEV190G1_chargerFamille({
        annee:annee,
        famille:'BACPRO'
      });

      var c=(fam.classes||[]).filter(function(x){
        return (
          Number(x.classeId||x.id)===cid
        );
      })[0];

      var pd=(c&&c.periodes||[])
        .filter(EUC_DEV286_isPdif_)[0];

      if(pd){
        var exact=candidates.filter(function(x){
          return Number(x.id)===Number(pd.id);
        })[0];

        if(exact){
          return exact;
        }
      }
    }
  }catch(e2){}

  return null;
}

function EUC_DEV286_decision_(eleve,meta,cl,p,annee){
  if(!EUC_DEV286_isPfmp2_(p)){
    return {
      applicable:false,
      pdif:null,
      pdifMode:''
    };
  }

  var pdif=EUC_DEV286_findPdif_(
    meta,
    cl,
    annee
  );

  if(!pdif){
    /*
     * Si aucune période P.dif n'existe pour cette classe,
     * PFMP2 garde son comportement normal.
     */
    return {
      applicable:false,
      pdif:null,
      pdifMode:''
    };
  }

  var mode=EUC_DEV286_modeFor_(
    Number(eleve.id)||0,
    annee
  );

  if(!mode){
    return {
      applicable:true,
      error:
        'Fin de Terminale à définir pour '+
        [eleve.nom||'',eleve.prenom||'']
          .filter(Boolean)
          .join(' ')+
        '.',
      pdif:pdif,
      pdifMode:''
    };
  }

  if(
    mode==='PARCOURS_DIFF_LYCEE'
  ){
    return {
      applicable:true,
      pdif:pdif,
      pdifMode:'LYCEE',
      mode:mode
    };
  }

  if(
    mode==='POURSUITE_PFMP2_ENTREPRISE'
  ){
    return {
      applicable:true,
      pdif:pdif,
      pdifMode:'ENTREPRISE',
      mode:mode
    };
  }

  return {
    applicable:true,
    error:
      'Mode fin Terminale invalide pour '+
      [eleve.nom||'',eleve.prenom||'']
        .filter(Boolean)
        .join(' ')+
      '.',
    pdif:pdif,
    pdifMode:''
  };
}

function EUC_DEV286_preparerAcces(payload){
  var t0=Date.now();
  var ctx=EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var eleveId=Number(payload.eleveId)||0;
  var classeId=Number(
    payload.classeConventionId
  )||0;
  var periodeId=Number(
    payload.periodeId
  )||0;
  var annee=EUC_DEV286_txt_(
    payload.anneeConvention
  );

  if(
    !eleveId ||
    !classeId ||
    !periodeId ||
    !/^20\d{2}-20\d{2}$/.test(annee)
  ){
    throw new Error(
      'Élève, classe, période et année scolaire sont obligatoires.'
    );
  }

  var eleves=
    EUC_CONVENTION_lireElevesAdmin();

  var eleve=eleves.filter(function(e){
    return Number(e.id)===eleveId;
  })[0];

  if(!eleve){
    throw new Error(
      'Élève introuvable.'
    );
  }

  var meta=
    EUC_CONVENTION_lireClassesEtPeriodesAdmin();

  var cl=(meta.classes||[]).filter(function(c){
    return Number(c.id)===classeId;
  })[0];

  var p=(meta.periodes||[]).filter(function(x){
    return Number(x.id)===periodeId;
  })[0];

  if(!cl||!p){
    throw new Error(
      'Classe ou période introuvable.'
    );
  }

  var elig=
    EUC_DEV174_evaluerEligibilite_(
      eleve,
      cl,
      p,
      annee
    );

  if(!elig.convention){
    throw new Error(
      'Convention non requise : '+
      String(elig.code||'')
        .replace(/_/g,' ')+
      '.'
    );
  }

  EUC_CONVENTION_verifierPeriodeAutorisee_(
    meta,
    classeId,
    annee,
    periodeId,
    'Période officielle'
  );

  var decision=
    EUC_DEV286_decision_(
      eleve,
      meta,
      cl,
      p,
      annee
    );

  if(decision.error){
    throw new Error(
      decision.error
    );
  }

  var pdif=decision.pdif||null;
  var pdifMode=decision.pdifMode||'';

  if(pdif){
    EUC_CONVENTION_verifierPeriodeAutorisee_(
      meta,
      classeId,
      annee,
      Number(pdif.id)||0,
      'Période P.dif.'
    );
  }

  EUC_CONVENTION_assurerTableAcces_();

  var a=
    EUC_CONVENTION_preparerRecordAcces_(
      ctx,
      eleve,
      cl,
      p,
      annee,
      {
        pdif:pdif,
        pdifMode:pdifMode
      }
    );

  EUC_ENT_grist(
    'post',
    '/tables/'+
      encodeURIComponent(
        EUC_CONVENTION_ACCES_TABLE_
      )+
      '/records',
    {
      records:[
        a.record
      ]
    }
  );

  var base=ScriptApp.getService().getUrl();

  console.log(
    JSON.stringify({
      diagnostic:'DEV286',
      op:'generation_simple',
      eleveId:eleve.id,
      periode:p.type||p.libelle||'',
      pdifMode:pdifMode,
      dateDebut:p.debut,
      dateFin:a.dateFin,
      dureeMs:Date.now()-t0
    })
  );

  return {
    ok:true,
    reference:a.reference,
    token:a.token,
    urlFormulaire:
      base+
      '?page=pfmp&token='+
      encodeURIComponent(a.token),
    urlImpression:
      base+
      '?page=convention-pfmp-print&token='+
      encodeURIComponent(a.token),
    eleve:eleve,
    classeConvention:cl,
    periode:p,
    anneeConvention:annee,
    pdifMode:pdifMode,
    pdif:pdif,
    dateFin:a.dateFin
  };
}

function EUC_DEV286_preparerAccesClasseNom(payload){
  var t0=Date.now();
  var ctx=EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var classeNom=EUC_DEV174_txt_(
    payload.classeElevesNom
  );

  var annee=EUC_DEV174_txt_(
    payload.anneeConvention
  );

  var classeId=Number(
    payload.classeConventionId
  )||0;

  var periodeId=Number(
    payload.periodeId
  )||0;

  if(
    !classeNom ||
    !annee ||
    !classeId ||
    !periodeId
  ){
    throw new Error(
      'Promotion, année, classe ou période manquante.'
    );
  }

  var eleves=
    EUC_CONVENTION_lireElevesAdmin()
      .filter(function(e){
        return (
          EUC_DEV174_norm_(e.classe)===
          EUC_DEV174_norm_(classeNom)
        );
      });

  var meta=
    EUC_CONVENTION_lireClassesEtPeriodesAdmin();

  var cl=(meta.classes||[]).filter(function(c){
    return Number(c.id)===classeId;
  })[0];

  var p=(meta.periodes||[]).filter(function(x){
    return Number(x.id)===periodeId;
  })[0];

  if(!cl||!p){
    throw new Error(
      'Classe ou période introuvable.'
    );
  }

  EUC_CONVENTION_verifierPeriodeAutorisee_(
    meta,
    classeId,
    annee,
    periodeId,
    'Période officielle'
  );

  var lot=
    'LOT-'+
    annee.replace('-','')+
    '-'+
    Date.now();

  var records=[];
  var prepared=[];
  var skipped=[];

  eleves.forEach(function(e){
    var elig=
      EUC_DEV174_evaluerEligibilite_(
        e,
        cl,
        p,
        annee
      );

    var isApprenti=!!elig.apprenti;

    /*
     * Conservation du comportement historique :
     * les apprentis peuvent rester dans l'impression en lot.
     */
    if(
      !elig.convention &&
      !isApprenti
    ){
      skipped.push({
        id:e.id,
        nom:e.nom,
        prenom:e.prenom,
        raison:elig.code
      });

      return;
    }

    var decision={
      applicable:false,
      pdif:null,
      pdifMode:''
    };

    if(!isApprenti){
      decision=
        EUC_DEV286_decision_(
          e,
          meta,
          cl,
          p,
          annee
        );

      if(decision.error){
        skipped.push({
          id:e.id,
          nom:e.nom,
          prenom:e.prenom,
          raison:'FIN_TERMINALE_A_DEFINIR'
        });

        return;
      }
    }

    var pdif=decision.pdif||null;
    var pdifMode=decision.pdifMode||'';

    var a=
      EUC_CONVENTION_preparerRecordAcces_(
        ctx,
        e,
        cl,
        p,
        annee,
        {
          pdif:pdif,
          pdifMode:pdifMode,
          lot:lot
        }
      );

    records.push(
      a.record
    );

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
      '/tables/'+
        encodeURIComponent(
          EUC_CONVENTION_ACCES_TABLE_
        )+
        '/records',
      {
        records:records
      }
    );
  }

  var base=
    ScriptApp.getService().getUrl();

  var items=prepared.map(function(x){
    return {
      id:x.e.id,
      eleveId:x.e.id,
      nom:x.e.nom,
      prenom:x.e.prenom,
      reference:x.a.reference,
      token:x.a.token,
      urlImpression:
        base+
        '?page=convention-pfmp-print&token='+
        encodeURIComponent(x.a.token),
      urlFormulaire:
        base+
        '?page=pfmp&token='+
        encodeURIComponent(x.a.token),
      annee:annee,
      classe:
        cl.nom||
        cl.libelle||
        classeNom,
      debut:p.debut,
      fin:
        x.a.dateFin||
        p.fin||
        '',
      pdifMode:
        (
          x.a.record&&
          x.a.record.fields&&
          x.a.record.fields.PDIF_mode
        )||
        '',
      apprenti:!!x.apprenti
    };
  });

  /*
   * Le lot est conservé pour l'impression PDF.
   */
  CacheService
    .getScriptCache()
    .put(
      'EUC_CONV_LOT_'+lot,
      JSON.stringify({
        lot:lot,
        classe:
          cl.nom||
          cl.libelle||
          classeNom,
        annee:annee,
        periode:p,
        items:items
      }),
      21600
    );

  console.log(
    JSON.stringify({
      diagnostic:'DEV286',
      op:'generation_lot',
      total:items.length,
      exclus:skipped.length,
      dureeMs:Date.now()-t0
    })
  );

  return {
    ok:true,
    total:items.length,
    lot:lot,
    classeElevesNom:classeNom,
    classeConvention:
      cl.nom||
      cl.libelle||
      classeNom,
    periode:p,
    anneeConvention:annee,
    items:items,
    skipped:skipped,
    urlImpressionLot:
      base+
      '?page=conventions-pfmp-batch-print&lot='+
      encodeURIComponent(lot)
  };
}
