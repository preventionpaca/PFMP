/**
 * Eucalyptus PFMP — v1.0.0-dev.276
 * Ajustements consolidés :
 * - apprentis par classe + par période PFMP
 * - parcours différencié lu depuis EUC_PARCOURS_DIFFERENCIE_PFMP
 * - statut période : Contrat apprentissage / Parcours différencié
 * - lecture dynamique par-dessus les snapshots
 */
function EUC_DEV276_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV276_norm_(v){
  return EUC_DEV276_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function EUC_DEV276_ref_(v){
  try{
    if(typeof EUC_PFMP_ref_==='function'){
      return Number(EUC_PFMP_ref_(v))||0;
    }
  }catch(e){}
  if(Array.isArray(v)) return Number(v[1]||v[0])||0;
  return Number(v)||0;
}

function EUC_DEV276_year_(e,map){
  try{
    if(typeof EUC_V154_anneeCode_==='function'){
      return EUC_V154_anneeCode_(e.Annee_scolaire,map);
    }
  }catch(err){}
  return EUC_DEV276_txt_(e.Annee_code||e.Annee_scolaire);
}

function EUC_DEV276_isPdifPeriod_(p){
  try{
    if(typeof EUC_DEV174_periodeEstPdif_==='function'){
      return !!EUC_DEV174_periodeEstPdif_(p||{});
    }
  }catch(e){}
  var t=EUC_DEV276_norm_([
    p&&p.type,
    p&&p.libelle,
    p&&p.nom,
    p&&p.groupe,
    p&&p.niveau,
    p&&p.v50Slot,
    p&&p.v51Slot
  ].filter(Boolean).join(' '));
  return /P[.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(t);
}

function EUC_DEV276_studentsByClass_(annee){
  var map=null;
  try{
    if(typeof EUC_V154_anneesMap_==='function'){
      map=EUC_V154_anneesMap_();
    }
  }catch(e){}

  var out={};

  (EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP')||[])
    .filter(function(e){
      if(e.Actif===false||e.Present_dernier_import===false)return false;
      var a=EUC_DEV276_year_(e,map);
      return !annee||!a||a===annee;
    })
    .forEach(function(e){
      var cid=EUC_DEV276_ref_(e.Classe);
      if(!cid)return;
      (out[cid]=out[cid]||[]).push(e);
    });

  return out;
}

function EUC_DEV276_pdifs_(annee){
  return EUC_DEV285B_selectedSet_(annee);
}

function EUC_DEV276_appRows_(){
  try{
    if(typeof EUC_DEV275B_rows_==='function'){
      return EUC_DEV275B_rows_()||[];
    }
    if(typeof EUC_APP172_rows==='function'){
      return EUC_APP172_rows()||[];
    }
  }catch(e){}
  try{
    return EUC_IMPORT_lireRecords_('EUC_APPRENTISSAGE_PFMP')||[];
  }catch(e2){
    return [];
  }
}

function EUC_DEV276_evalApp_(rows,eid,debut,fin){
  if(typeof EUC_DEV275B_evalRows_==='function'){
    return EUC_DEV275B_evalRows_(rows,eid,debut,fin);
  }
  if(typeof EUC_APP172_eval==='function'){
    return EUC_APP172_eval(rows,eid,debut,fin);
  }
  return {code:'SCOLAIRE',record:null};
}

/**
 * Enrichissement FAMILLE utilisé à la lecture.
 * Les snapshots restent la base rapide ; les statuts apprentissage / P.dif
 * sont recalculés avec les tables métier courantes.
 */
function EUC_DEV276_enrichFamilyPayload_(payload,annee,famille){
  payload=payload||{};

  var byClass=EUC_DEV276_studentsByClass_(annee);
  var appRows=EUC_DEV276_appRows_();
  var pdifSet=EUC_DEV276_pdifs_(annee);

  var familyApprenticeSet={};

  (payload.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    var students=byClass[cid]||[];
    var effectif=Number(c.effectif||c.total)||students.length;
    var classApps={};

    (c.periodes||[]).forEach(function(p){
      var isPdif=EUC_DEV276_isPdifPeriod_(p);
      var debut=EUC_DEV277B_iso_(
        p.debut||
        p.Date_debut||
        p.debutFr||
        ''
      );
      var fin=EUC_DEV277B_iso_(
        p.fin||
        p.Date_fin||
        p.finFr||
        ''
      );
      var apps=0;
      var mixes=0;
      var pdifs=0;

      students.forEach(function(e){
        var eid=Number(e.id)||0;

        if(pdifSet[eid])pdifs++;

        if(!isPdif){
          var st=EUC_DEV276_evalApp_(appRows,eid,debut,fin);
          if(st.code==='APPRENTI'){
            apps++;
            classApps[eid]=1;
            familyApprenticeSet[eid]=1;
          }else if(st.code==='MIXTE'){
            mixes++;
          }
        }
      });

      p.isPdif=isPdif;
      p.apprentis=apps;
      p.mixtes=mixes;
      p.parcoursDifferencies=pdifs;

      /*
       * DEV278_EFFECTIF_TOTAL
       * Le récap global conserve son total "scolaires attendus".
       * La vue de classe dispose en plus de l'effectif complet pour afficher :
       * conventions / effectif + apprentis.
       */
      p.effectifTotal=effectif;

      if(isPdif){
        /*
         * Pour P.dif, le "public concerné" vient de la table dédiée,
         * et non de l'effectif complet de la classe.
         */
        p.totalPdif=pdifs;
      }else{
        /*
         * Un apprenti dont le contrat couvre toute la période n'attend
         * aucune convention PFMP.
         */
        p.total=Math.max(0,effectif-apps);
        p.manquantes=Math.max(
          0,
          p.total-(Number(p.conventions)||0)
        );
        p.pourcentage=p.total
          ? Math.round((Number(p.conventions)||0)/p.total*100)
          : 100;
      }
    });

    c.apprentis=Object.keys(classApps).length;
    c.parcoursDifferencies=students.filter(function(e){
      return !!pdifSet[Number(e.id)||0];
    }).length;
  });

  payload.apprentis=Object.keys(familyApprenticeSet).length;
  payload.__dev276=true;
  return payload;
}

/**
 * Enrichissement DETAIL utilisé après lecture snapshot.
 */
function EUC_DEV276_enrichDetail_(detail,annee){
  if(!detail)return detail;

  if(typeof EUC_DEV275B_enrichDetail_==='function'){
    detail=EUC_DEV275B_enrichDetail_(detail);
  }else if(typeof EUC_APP172_enrichirDetail==='function'){
    detail=EUC_APP172_enrichirDetail(detail);
  }

  if(typeof EUC_DEV174_enrichirDetail_==='function'){
    detail=EUC_DEV174_enrichirDetail_(detail,annee);
  }

  var isPdif=EUC_DEV276_isPdifPeriod_(detail.periode||{});
  var pdifCount=0;

  if(isPdif){
    var avec=0,sans=0,incidents=0;

    (detail.lignes||[]).forEach(function(x){
      if(x.apprenti){
        /*
         * Apprentissage reste prioritaire s'il couvre effectivement
         * la période entière.
         */
        return;
      }

      if(x.parcoursDifferencie){
        pdifCount++;
        x.statutCode='PARCOURS_DIFFERENCIE';
        x.statut='Parcours différencié';
        x.numero='';
        x.convention=false;
      }else{
        x.statutCode='NON_CONCERNE_PDIF';
        x.statut='Non concerné';
        x.numero='';
        x.convention=false;
      }
    });

    detail.stats=detail.stats||{};
    detail.stats.parcoursDifferencies=pdifCount;

    /*
     * Une période P.dif n'est pas une campagne de conventions.
     */
    detail.stats.avecConvention=0;
    detail.stats.sansConvention=0;
  }

  detail.__dev276=true;
  return detail;
}

/**
 * Lecture live utilisée par les pages famille ADMIN et PUBLIC.
 */
function EUC_DEV276_familyLive(payload){
  payload=payload||{};
  var annee=EUC_DEV276_txt_(payload.annee);
  var famille=EUC_DEV276_txt_(payload.famille);

  if(!annee||!famille){
    throw new Error('Année et famille obligatoires.');
  }

  var fast=EUC_DEV190G1_fastFamilyIndex({
    annee:annee,
    famille:famille
  });

  if(!fast||!fast.ready||!fast.payload){
    return {
      ok:true,
      ready:false,
      annee:annee,
      famille:famille,
      classes:[]
    };
  }

  return {
    ok:true,
    ready:true,
    annee:annee,
    famille:famille,
    classes:fast.payload.classes||[],
    apprentis:Number(fast.payload.apprentis)||0
  };
}
