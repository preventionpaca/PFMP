/**
 * Eucalyptus PFMP — v1.0.0-dev.291
 *
 * Correctif après DEV290 :
 * le snapshot P.dif. était déjà filtré à 2 élèves.
 * Un simple map() ne pouvait donc jamais réinjecter les 17 autres.
 *
 * DEV291 reconstruit la vue P.dif. à partir du snapshot PFMP2
 * de la même classe, puis applique le mode Fin de Terminale.
 */

function EUC_DEV291_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV291_norm_(v){
  return EUC_DEV291_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function EUC_DEV291_date_(v){
  if(!v)return '';

  if(typeof EUC_DEV277B_iso_==='function'){
    try{
      var d=EUC_DEV277B_iso_(v);
      if(d)return d;
    }catch(e){}
  }

  var s=String(v).trim();

  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
    return s;
  }

  var m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);

  if(m){
    return m[3]+'-'+
      String(m[2]).padStart(2,'0')+'-'+
      String(m[1]).padStart(2,'0');
  }

  return '';
}

function EUC_DEV291_isPdif_(p){
  if(typeof EUC_DEV285B_isPdif_==='function'){
    try{
      return !!EUC_DEV285B_isPdif_(p);
    }catch(e){}
  }

  var t=EUC_DEV291_norm_([
    p&&p.type,
    p&&p.libelle,
    p&&p.nom,
    p&&p.v50Slot,
    p&&p.v51Slot
  ].filter(Boolean).join(' '));

  return /P[.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(t);
}

function EUC_DEV291_modeFor_(eleveId,annee){
  if(typeof EUC_DEV285B_modeFor_==='function'){
    return EUC_DEV285B_modeFor_(eleveId,annee);
  }

  if(typeof EUC_DEV285_modeFor_==='function'){
    return EUC_DEV285_modeFor_(eleveId,annee);
  }

  return '';
}

function EUC_DEV291_familyRaw_(annee,famille){
  if(typeof EUC_DEV421_fastFamilySnapshot_==='function'){
    var fast=EUC_DEV421_fastFamilySnapshot_({annee:annee,famille:famille||'BACPRO'});
    if(fast&&fast.ready&&fast.payload)return fast.payload;
  }
  return EUC_DEV190G1_chargerFamille({annee:annee,famille:famille||'BACPRO'});
}

function EUC_DEV291_classFamily_(annee,famille,classeId){
  var fam=EUC_DEV291_familyRaw_(
    annee,
    famille
  );

  return (fam&&fam.classes||[])
    .filter(function(c){
      return Number(c.classeId||c.id)===Number(classeId);
    })[0]||null;
}

function EUC_DEV291_pdifPeriod_(classeFamily){
  return (classeFamily&&classeFamily.periodes||[])
    .filter(function(p){
      return EUC_DEV291_isPdif_(p);
    })[0]||null;
}

function EUC_DEV291_pfmp2Period_(classeFamily,pdif){
  if(!classeFamily||!pdif){
    return null;
  }

  var pdifDebut=EUC_DEV291_date_(
    pdif.debut||
    pdif.Date_debut||
    pdif.debutFr
  );

  return (classeFamily.periodes||[])
    .filter(function(p){
      if(EUC_DEV291_isPdif_(p)){
        return false;
      }

      var fin=EUC_DEV291_date_(
        p.fin||
        p.Date_fin||
        p.finFr
      );

      return (
        !!fin &&
        !!pdifDebut &&
        fin<=pdifDebut
      );
    })
    .sort(function(a,b){
      return EUC_DEV291_date_(
        b.fin||
        b.Date_fin||
        b.finFr
      ).localeCompare(
        EUC_DEV291_date_(
          a.fin||
          a.Date_fin||
          a.finFr
        )
      );
    })[0]||null;
}

function EUC_DEV291_rawSnapshot_(annee,famille,classeId,periodeId){
  if(
    typeof EUC_DEV190I_activeRows_!=='function' ||
    !periodeId
  ){
    return null;
  }

  var rows=EUC_DEV190I_activeRows_({
    annee:annee,
    famille:famille||'BACPRO',
    classe:Number(classeId)||0,
    periode:Number(periodeId)||0
  });

  if(!rows||!rows.length){
    return null;
  }

  var f=rows[0].fields||{};

  try{
    return JSON.parse(
      f.Payload_JSON||'{}'
    );
  }catch(e){
    return null;
  }
}

function EUC_DEV291_clearEntreprise_(x){
  x.entreprise='';
  x.adresseEntreprise='';
  x.contactEntreprise='';
  x.telephoneEntreprise='';
  x.courrielEntreprise='';
  x.tuteurEntreprise='';
  x.telephoneTuteur='';
  x.courrielTuteur='';
}

function EUC_DEV291_enrichDetail_(detail,annee,famille,classeId){
  if(!detail){
    return detail;
  }

  if(!EUC_DEV291_isPdif_(detail.periode||{})){
    if(typeof EUC_DEV285B_enrichDetail_==='function'){
      return EUC_DEV285B_enrichDetail_(
        detail,
        annee
      );
    }

    return detail;
  }

  var cid=Number(
    classeId||
    (detail.classe&&detail.classe.id)||
    detail.classeId||
    0
  )||0;

  var cf=EUC_DEV291_classFamily_(
    annee,
    famille||'BACPRO',
    cid
  );

  var pdif=EUC_DEV291_pdifPeriod_(cf);
  var pfmp2=EUC_DEV291_pfmp2Period_(cf,pdif);

  /*
   * Point crucial DEV291 :
   * la vue P.dif. actuelle contient déjà seulement les élèves lycée.
   * On repart donc du snapshot PFMP2, qui contient la classe complète.
   */
  var base=pfmp2
    ? EUC_DEV291_rawSnapshot_(
        annee,
        famille||'BACPRO',
        cid,
        Number(pfmp2.id)||0
      )
    : null;

  if(
    base &&
    typeof EUC_DEV275B_enrichDetail_==='function'
  ){
    try{
      base=EUC_DEV275B_enrichDetail_(base);
    }catch(e){}
  }

  var sourceLines=
    base&&base.lignes&&base.lignes.length
      ? base.lignes
      : (detail.lignes||[]);

  var counts={
    lycee:0,
    entreprise:0,
    attente:0
  };

  var lignes=sourceLines.map(function(src){
    var x=Object.assign({},src);
    var eid=Number(x.eleveId)||0;
    var mode=EUC_DEV291_modeFor_(
      eid,
      annee
    );

    x.modeFinTerminale=mode;

    if(mode==='PARCOURS_DIFF_LYCEE'){
      counts.lycee++;

      x.parcoursDifferencie=true;
      x.statutCode='PARCOURS_DIFFERENCIE_LYCEE';
      x.statut='Parcours différencié — lycée';
      x.convention=false;
      x.numero='';

      EUC_DEV291_clearEntreprise_(x);

      return x;
    }

    if(mode==='POURSUITE_PFMP2_ENTREPRISE'){
      counts.entreprise++;

      x.parcoursDifferencie=false;
      x.statutCode='POURSUITE_PFMP2_ENTREPRISE';
      x.statut='Poursuite PFMP2 — entreprise';

      /*
       * Ici on conserve volontairement les données entreprise / tuteur
       * venant de PFMP2.
       */
      return x;
    }

    counts.attente++;

    x.parcoursDifferencie=false;
    x.statutCode='FIN_TERMINALE_A_DEFINIR';
    x.statut='En attente de décision';
    x.convention=false;
    x.numero='';

    EUC_DEV291_clearEntreprise_(x);

    return x;
  });

  detail.lignes=lignes;

  detail.stats=detail.stats||{};
  detail.stats.total=lignes.length;
  detail.stats.parcoursDifferencies=counts.lycee;
  detail.stats.poursuitePfmp2=counts.entreprise;
  detail.stats.aDefinirFinTerminale=counts.attente;
  detail.stats.avecConvention=0;
  detail.stats.sansConvention=0;
  detail.stats.annulees=0;
  detail.stats.interrompues=0;

  detail.__dev291=true;

  return detail;
}

function EUC_DEV291_family(payload){
  payload=payload||{};

  var annee=EUC_DEV291_txt_(payload.annee);
  var famille=EUC_DEV291_txt_(payload.famille)||'BACPRO';

  var fam=EUC_DEV291_familyRaw_(
    annee,
    famille
  );

  var byClass=
    typeof EUC_DEV276_studentsByClass_==='function'
      ? EUC_DEV276_studentsByClass_(annee)
      : {};

  var state=
    typeof EUC_DEV285B_state_==='function'
      ? EUC_DEV285B_state_(annee)
      : (
          typeof EUC_DEV285_state_==='function'
            ? EUC_DEV285_state_(annee)
            : {modes:{}}
        );

  (fam.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    var students=byClass[cid]||[];

    var lycee=0;
    var entreprise=0;
    var attente=0;

    students.forEach(function(e){
      var mode=
        state.modes[
          Number(e.id)||0
        ]||
        '';

      if(mode==='PARCOURS_DIFF_LYCEE'){
        lycee++;
      }else if(mode==='POURSUITE_PFMP2_ENTREPRISE'){
        entreprise++;
      }else{
        attente++;
      }
    });

    c.parcoursDifferencies=lycee;
    c.poursuitePfmp2=entreprise;
    c.aDefinirFinTerminale=attente;

    (c.periodes||[]).forEach(function(p){
      if(EUC_DEV291_isPdif_(p)){
        p.isPdif=true;
        p.parcoursDifferencies=lycee;
        p.poursuitePfmp2=entreprise;
        p.aDefinirFinTerminale=attente;
      }
    });
  });

  fam.__dev291=true;

  return fam;
}
