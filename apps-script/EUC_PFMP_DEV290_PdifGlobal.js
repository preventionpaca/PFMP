
function EUC_DEV290_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV290_norm_(v){
  return EUC_DEV290_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function EUC_DEV290_date_(v){
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
    return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
  }

  return '';
}

function EUC_DEV290_isPdif_(p){
  if(typeof EUC_DEV285B_isPdif_==='function'){
    try{
      return !!EUC_DEV285B_isPdif_(p);
    }catch(e){}
  }

  var t=EUC_DEV290_norm_([
    p&&p.type,
    p&&p.libelle,
    p&&p.nom,
    p&&p.v50Slot,
    p&&p.v51Slot
  ].filter(Boolean).join(' '));

  return /P[.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(t);
}

function EUC_DEV290_modeFor_(eleveId,annee){
  if(typeof EUC_DEV285B_modeFor_==='function'){
    return EUC_DEV285B_modeFor_(eleveId,annee);
  }

  if(typeof EUC_DEV285_modeFor_==='function'){
    return EUC_DEV285_modeFor_(eleveId,annee);
  }

  return '';
}

function EUC_DEV290_familyRaw_(annee,famille){
  return EUC_DEV190G1_chargerFamille({
    annee:annee,
    famille:famille||'BACPRO'
  });
}

function EUC_DEV290_findClassFamily_(annee,famille,classeId){
  var fam=EUC_DEV290_familyRaw_(annee,famille);

  return (fam&&fam.classes||[]).filter(function(c){
    return Number(c.classeId||c.id)===Number(classeId);
  })[0]||null;
}

function EUC_DEV290_findPdifPeriod_(classeFamily){
  return (classeFamily&&classeFamily.periodes||[]).filter(function(p){
    return EUC_DEV290_isPdif_(p);
  })[0]||null;
}

function EUC_DEV290_findPfmp2Period_(classeFamily,pdif){
  if(!classeFamily||!pdif){
    return null;
  }

  var pdifDebut=EUC_DEV290_date_(
    pdif.debut||pdif.Date_debut||pdif.debutFr
  );

  return (classeFamily.periodes||[])
    .filter(function(p){
      if(EUC_DEV290_isPdif_(p)){
        return false;
      }

      var fin=EUC_DEV290_date_(
        p.fin||p.Date_fin||p.finFr
      );

      return (
        !!fin &&
        !!pdifDebut &&
        fin<=pdifDebut
      );
    })
    .sort(function(a,b){
      return EUC_DEV290_date_(
        b.fin||b.Date_fin||b.finFr
      ).localeCompare(
        EUC_DEV290_date_(
          a.fin||a.Date_fin||a.finFr
        )
      );
    })[0]||null;
}

function EUC_DEV290_rawDetail_(annee,famille,classeId,periodeId){
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
    return JSON.parse(f.Payload_JSON||'{}');
  }catch(e){
    return null;
  }
}

function EUC_DEV290_copyEntreprise_(target,source){
  source=source||{};

  [
    'entreprise',
    'adresseEntreprise',
    'contactEntreprise',
    'telephoneEntreprise',
    'courrielEntreprise',
    'tuteurEntreprise',
    'telephoneTuteur',
    'courrielTuteur'
  ].forEach(function(k){
    if(source[k]){
      target[k]=source[k];
    }
  });

  target.conventionPfmp2=!!source.convention;
  target.statutPfmp2=source.statut||source.statutCode||'';

  return target;
}

function EUC_DEV290_enrichDetail_(detail,annee,famille,classeId){
  if(!detail){
    return detail;
  }

  if(!EUC_DEV290_isPdif_(detail.periode||{})){
    if(typeof EUC_DEV285B_enrichDetail_==='function'){
      return EUC_DEV285B_enrichDetail_(detail,annee);
    }

    return detail;
  }

  var cid=Number(
    classeId||
    (detail.classe&&detail.classe.id)||
    detail.classeId||
    0
  )||0;

  var classeFamily=EUC_DEV290_findClassFamily_(
    annee,
    famille||'BACPRO',
    cid
  );

  var pdif=EUC_DEV290_findPdifPeriod_(classeFamily);
  var pfmp2=EUC_DEV290_findPfmp2Period_(classeFamily,pdif);

  var pfmp2Detail=pfmp2
    ? EUC_DEV290_rawDetail_(
        annee,
        famille||'BACPRO',
        cid,
        Number(pfmp2.id)||0
      )
    : null;

  if(
    pfmp2Detail &&
    typeof EUC_DEV275B_enrichDetail_==='function'
  ){
    try{
      pfmp2Detail=EUC_DEV275B_enrichDetail_(pfmp2Detail);
    }catch(e){}
  }

  var p2ByEleve={};

  (pfmp2Detail&&pfmp2Detail.lignes||[]).forEach(function(x){
    p2ByEleve[Number(x.eleveId)||0]=x;
  });

  var counts={
    lycee:0,
    entreprise:0,
    attente:0
  };

  detail.lignes=(detail.lignes||[]).map(function(x){
    var eid=Number(x.eleveId)||0;
    var mode=EUC_DEV290_modeFor_(eid,annee);

    x.modeFinTerminale=mode;

    if(mode==='PARCOURS_DIFF_LYCEE'){
      counts.lycee++;

      x.parcoursDifferencie=true;
      x.statutCode='PARCOURS_DIFFERENCIE_LYCEE';
      x.statut='Parcours différencié — lycée';
      x.convention=false;
      x.numero='';

      x.entreprise='';
      x.adresseEntreprise='';
      x.contactEntreprise='';
      x.telephoneEntreprise='';
      x.courrielEntreprise='';
      x.tuteurEntreprise='';
      x.telephoneTuteur='';
      x.courrielTuteur='';

      return x;
    }

    if(mode==='POURSUITE_PFMP2_ENTREPRISE'){
      counts.entreprise++;

      x.parcoursDifferencie=false;
      x.statutCode='POURSUITE_PFMP2_ENTREPRISE';
      x.statut='Poursuite PFMP2 — entreprise';

      EUC_DEV290_copyEntreprise_(
        x,
        p2ByEleve[eid]
      );

      return x;
    }

    counts.attente++;

    x.parcoursDifferencie=false;
    x.statutCode='FIN_TERMINALE_A_DEFINIR';
    x.statut='En attente de décision';
    x.convention=false;
    x.numero='';

    x.entreprise='';
    x.adresseEntreprise='';
    x.contactEntreprise='';
    x.telephoneEntreprise='';
    x.courrielEntreprise='';
    x.tuteurEntreprise='';
    x.telephoneTuteur='';
    x.courrielTuteur='';

    return x;
  });

  detail.stats=detail.stats||{};
  detail.stats.total=detail.lignes.length;
  detail.stats.parcoursDifferencies=counts.lycee;
  detail.stats.poursuitePfmp2=counts.entreprise;
  detail.stats.aDefinirFinTerminale=counts.attente;
  detail.stats.avecConvention=0;
  detail.stats.sansConvention=0;

  detail.__dev290=true;

  return detail;
}

function EUC_DEV290_familyState(payload){
  payload=payload||{};

  var annee=EUC_DEV290_txt_(payload.annee);
  var famille=EUC_DEV290_txt_(payload.famille)||'BACPRO';

  var fam=EUC_DEV290_familyRaw_(annee,famille);

  var state=
    typeof EUC_DEV285B_state_==='function'
      ? EUC_DEV285B_state_(annee)
      : (
          typeof EUC_DEV285_state_==='function'
            ? EUC_DEV285_state_(annee)
            : {modes:{}}
        );

  var byClass=
    typeof EUC_DEV276_studentsByClass_==='function'
      ? EUC_DEV276_studentsByClass_(annee)
      : {};

  var classes=(fam&&fam.classes||[]).map(function(c){
    var cid=Number(c.classeId||c.id)||0;
    var students=byClass[cid]||[];

    var lycee=0;
    var entreprise=0;
    var attente=0;

    students.forEach(function(e){
      var mode=state.modes[Number(e.id)||0]||'';

      if(mode==='PARCOURS_DIFF_LYCEE'){
        lycee++;
      }else if(mode==='POURSUITE_PFMP2_ENTREPRISE'){
        entreprise++;
      }else{
        attente++;
      }
    });

    return {
      classeId:cid,
      classe:c.classe||c.nom||c.classeNom||'',
      parcoursDifferencies:lycee,
      poursuitePfmp2:entreprise,
      aDefinirFinTerminale:attente
    };
  });

  return {
    ok:true,
    annee:annee,
    famille:famille,
    classes:classes
  };
}
