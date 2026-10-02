/**
 * Eucalyptus PFMP — v1.0.0-dev.283
 * Parcours différencié : source autoritaire = EUC_PARCOURS_DIFFERENCIE_PFMP.
 *
 * Règles métier :
 * - coché : au lycée pendant P.dif. => seul dans le suivi P.dif.
 * - non coché : reste en entreprise => PFMP2 prolongée jusqu'à fin P.dif.
 */
var EUC_DEV283_PDIF_MEMO_=null;

function EUC_DEV283_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV283_norm_(v){
  return EUC_DEV283_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function EUC_DEV283_bool_(v){
  if(typeof EUC_DEV281_bool_==='function'){
    return EUC_DEV281_bool_(v);
  }

  if(v===true)return true;
  if(v===false)return false;
  if(typeof v==='number')return v!==0;

  var s=String(v==null?'':v).trim().toLowerCase();

  return (
    s==='1'||
    s==='true'||
    s==='oui'||
    s==='yes'||
    s==='x'
  );
}

function EUC_DEV283_active_(v){
  if(v===undefined||v===null||v===''){
    return true;
  }

  if(typeof EUC_DEV281_active_==='function'){
    return EUC_DEV281_active_(v);
  }

  return EUC_DEV283_bool_(v);
}

function EUC_DEV283_ref_(v){
  try{
    if(typeof EUC_PFMP_ref_==='function'){
      return Number(EUC_PFMP_ref_(v))||0;
    }
  }catch(e){}

  if(Array.isArray(v)){
    return Number(v[1]||v[0])||0;
  }

  return Number(v)||0;
}

function EUC_DEV283_pdifRows_(){
  if(EUC_DEV283_PDIF_MEMO_){
    return EUC_DEV283_PDIF_MEMO_;
  }

  var rows=[];

  try{
    rows=EUC_IMPORT_lireRecords_(
      'EUC_PARCOURS_DIFFERENCIE_PFMP'
    )||[];
  }catch(e){
    rows=[];
  }

  EUC_DEV283_PDIF_MEMO_=rows.filter(function(r){
    return EUC_DEV283_active_(r.Actif);
  });

  return EUC_DEV283_PDIF_MEMO_;
}

function EUC_DEV283_selectedSet_(annee){
  var set={};

  EUC_DEV283_pdifRows_().forEach(function(r){
    if(
      String(r.Annee_scolaire||'').trim()!==
      String(annee||'').trim()
    ){
      return;
    }

    if(!EUC_DEV283_bool_(r.Parcours_differencie)){
      return;
    }

    var eid=EUC_DEV283_ref_(r.Eleve);

    if(eid){
      set[eid]=true;
    }
  });

  return set;
}

function EUC_DEV283_isPdif_(p){
  if(typeof EUC_DEV174_periodeEstPdif_==='function'){
    try{
      if(EUC_DEV174_periodeEstPdif_(p||{})){
        return true;
      }
    }catch(e){}
  }

  var t=EUC_DEV283_norm_([
    p&&p.type,
    p&&p.libelle,
    p&&p.nom,
    p&&p.v50Slot,
    p&&p.v51Slot,
    p&&p.groupe,
    p&&p.niveau
  ].filter(Boolean).join(' '));

  return /P[.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(t);
}

function EUC_DEV283_isPfmp2_(p){
  var t=EUC_DEV283_norm_([
    p&&p.type,
    p&&p.libelle,
    p&&p.nom,
    p&&p.v50Slot,
    p&&p.v51Slot
  ].filter(Boolean).join(' '));

  return /PFMP[^0-9]*N?[^0-9]*2|PFMP[^0-9]*2/.test(t);
}

function EUC_DEV283_studentsByClass_(annee){
  var rows=EUC_IMPORT_lireRecords_(
    'EUC_ELEVES_PFMP'
  )||[];

  var byClass={};

  var map=null;

  try{
    if(typeof EUC_V154_anneesMap_==='function'){
      map=EUC_V154_anneesMap_();
    }
  }catch(e){}

  rows.forEach(function(e){
    if(
      e.Actif===false ||
      e.Present_dernier_import===false
    ){
      return;
    }

    var codeAnnee='';

    try{
      if(
        typeof EUC_V154_anneeCode_==='function' &&
        map
      ){
        codeAnnee=EUC_V154_anneeCode_(
          e.Annee_scolaire,
          map
        );
      }
    }catch(err){}

    if(
      annee &&
      codeAnnee &&
      codeAnnee!==annee
    ){
      return;
    }

    var cid=EUC_DEV283_ref_(e.Classe);

    if(!cid)return;

    (byClass[cid]=byClass[cid]||[])
      .push(e);
  });

  return byClass;
}

/**
 * Famille ADMIN/Public : recalcule P.dif directement depuis la table métier.
 */
function EUC_DEV283_family(payload){
  payload=payload||{};

  var annee=EUC_DEV283_txt_(payload.annee);
  var r=EUC_DEV190G1_chargerFamille(payload);

  var selected=EUC_DEV283_selectedSet_(annee);
  var byClass=EUC_DEV283_studentsByClass_(annee);

  (r.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    var students=byClass[cid]||[];

    var selectedClass=students.filter(function(e){
      return !!selected[Number(e.id)||0];
    });

    c.parcoursDifferencies=selectedClass.length;

    (c.periodes||[]).forEach(function(p){
      if(EUC_DEV283_isPdif_(p)){
        p.isPdif=true;
        p.parcoursDifferencies=selectedClass.length;
        p.totalPdif=selectedClass.length;
      }
    });
  });

  r.__dev283=true;

  return r;
}

/**
 * Détail P.dif ADMIN/Public : uniquement les élèves cochés.
 */
function EUC_DEV283_readOne(payload){
  /*
   * DEV292 :
   * DEV291 reconstruit maintenant lui-même la vue P.dif.
   * Il ne faut SURTOUT plus refiltrer les lignes ici.
   */
  return EUC_DEV190I_readOne(payload||{});
}

function EUC_DEV283_findPdifPeriod_(meta,cl,annee){
  return ((meta&&meta.periodes)||[])
    .filter(function(p){
      if(!EUC_DEV283_isPdif_(p)){
        return false;
      }

      if(
        p.annee &&
        String(p.annee)!==String(annee)
      ){
        return false;
      }

      try{
        if(
          typeof EUC_CONVENTION_periodeCompatibleClasse_==='function' &&
          !EUC_CONVENTION_periodeCompatibleClasse_(p,cl)
        ){
          return false;
        }
      }catch(e){}

      return true;
    })[0]||null;
}

function EUC_DEV283_preparePayloadPdif_(payload){
  payload=Object.assign({},payload||{});

  var periodeId=Number(payload.periodeId)||0;
  var classeId=Number(
    payload.classeConventionId||
    payload.classeId
  )||0;

  var annee=EUC_DEV283_txt_(
    payload.anneeConvention||
    payload.annee
  );

  if(
    !periodeId ||
    !classeId ||
    !annee
  ){
    return payload;
  }

  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();

  var cl=(meta.classes||[]).filter(function(c){
    return Number(c.id)===classeId;
  })[0];

  var p=(meta.periodes||[]).filter(function(x){
    return Number(x.id)===periodeId;
  })[0];

  if(
    !cl ||
    !p ||
    !EUC_DEV283_isPfmp2_(p)
  ){
    return payload;
  }

  if(
    typeof EUC_DEV174_estTerminale_==='function' &&
    !EUC_DEV174_estTerminale_(
      cl.nom||
      cl.libelle||
      ''
    )
  ){
    return payload;
  }

  var pdif=EUC_DEV283_findPdifPeriod_(
    meta,
    cl,
    annee
  );

  if(pdif){
    payload.pdifPeriodeId=Number(pdif.id)||0;
  }

  return payload;
}

function EUC_DEV283_preparerAcces(payload){
  return EUC_DEV286_preparerAcces(payload);
}

function EUC_DEV283_preparerAcces(payload){
  return EUC_DEV174_preparerAcces(
    EUC_DEV283_preparePayloadPdif_(payload)
  );
}
