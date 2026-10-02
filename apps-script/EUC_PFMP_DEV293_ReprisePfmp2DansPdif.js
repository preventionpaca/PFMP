/**
 * Eucalyptus PFMP — v1.0.0-dev.293
 *
 * Pour un élève en POURSUITE_PFMP2_ENTREPRISE dans la vue P.dif. :
 * reprendre les données de sa PFMP2 :
 * - entreprise
 * - adresse
 * - contact entreprise
 * - tuteur
 * - suivi téléphonique
 * - professeur visiteur
 *
 * Source prioritaire :
 * EUC_SUIVI_CLASSE_detailV156() => détail "live" enrichi,
 * notamment avec les affectations téléphone / visite.
 *
 * Fallback :
 * snapshot PFMP2.
 */
function EUC_DEV293_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV293_pfmp2Detail_(annee,famille,classeId){
  var cf=null;
  var pdif=null;
  var pfmp2=null;

  if(
    typeof EUC_DEV291_classFamily_==='function' &&
    typeof EUC_DEV291_pdifPeriod_==='function' &&
    typeof EUC_DEV291_pfmp2Period_==='function'
  ){
    cf=EUC_DEV291_classFamily_(
      annee,
      famille||'BACPRO',
      classeId
    );

    pdif=EUC_DEV291_pdifPeriod_(cf);

    pfmp2=EUC_DEV291_pfmp2Period_(
      cf,
      pdif
    );
  }

  if(!pfmp2){
    return null;
  }

  var pid=Number(pfmp2.id)||0;

  if(!pid){
    return null;
  }

  /*
   * Source prioritaire :
   * détail dynamique avec entreprise + affectations professeurs.
   */
  try{
    if(typeof EUC_SUIVI_CLASSE_detailV156==='function'){
      var live=EUC_SUIVI_CLASSE_detailV156(
        annee,
        Number(classeId)||0,
        pid
      );

      if(
        live &&
        Array.isArray(live.lignes) &&
        live.lignes.length
      ){
        live.__dev293Source='detailV156';
        return live;
      }
    }
  }catch(e){
    console.log(
      'DEV293 detailV156 fallback : '+
      String(e&&e.message||e)
    );
  }

  /*
   * Fallback snapshot.
   */
  try{
    if(typeof EUC_DEV291_rawSnapshot_==='function'){
      var snap=EUC_DEV291_rawSnapshot_(
        annee,
        famille||'BACPRO',
        Number(classeId)||0,
        pid
      );

      if(snap){
        /*
         * Réinjecter les affectations prof si le snapshot est ancien.
         */
        try{
          if(
            typeof EUC_V156_affectations_==='function' &&
            Array.isArray(snap.lignes)
          ){
            var aff=EUC_V156_affectations_(
              annee,
              Number(classeId)||0,
              pid
            )||[];

            var by={};

            aff.forEach(function(a){
              var eid=Number(EUC_PFMP_ref_(a.Eleve))||0;
              var typ=String(a.Type_suivi||'')
                .trim()
                .toUpperCase();

              if(eid&&typ){
                by[eid+'|'+typ]=a;
              }
            });

            snap.lignes.forEach(function(x){
              var eid=Number(x.eleveId)||0;
              var tel=by[eid+'|TELEPHONE'];
              var vis=by[eid+'|VISITE'];

              if(tel){
                x.professeurTelephone=
                  String(tel.Nom_professeur_snapshot||'').trim();

                x.professeurTelephoneId=
                  Number(EUC_PFMP_ref_(tel.Professeur))||0;
              }

              if(vis){
                x.professeurVisiteur=
                  String(vis.Nom_professeur_snapshot||'').trim();

                x.professeurVisiteurId=
                  Number(EUC_PFMP_ref_(vis.Professeur))||0;
              }
            });
          }
        }catch(e2){}

        snap.__dev293Source='snapshot';
        return snap;
      }
    }
  }catch(e3){}

  return null;
}

function EUC_DEV293_copyIf_(target,source,key){
  if(
    source &&
    source[key]!==undefined &&
    source[key]!==null &&
    String(source[key]).trim()!==''
  ){
    target[key]=source[key];
  }
}

function EUC_DEV293_enrichPoursuite_(detail,annee,famille,classeId){
  if(
    !detail ||
    !Array.isArray(detail.lignes)
  ){
    return detail;
  }

  /*
   * Ne travaille que sur la période P.dif.
   */
  var isPdif=false;

  try{
    if(typeof EUC_DEV291_isPdif_==='function'){
      isPdif=!!EUC_DEV291_isPdif_(
        detail.periode||{}
      );
    }
  }catch(e){}

  if(!isPdif){
    return detail;
  }

  var cid=
    Number(classeId)||(
      detail.classe
        ? Number(detail.classe.id)||0
        : 0
    );

  if(!cid){
    return detail;
  }

  var p2=EUC_DEV293_pfmp2Detail_(
    annee,
    famille||'BACPRO',
    cid
  );

  if(!p2||!Array.isArray(p2.lignes)){
    return detail;
  }

  var by={};

  p2.lignes.forEach(function(x){
    by[Number(x.eleveId)||0]=x;
  });

  detail.lignes.forEach(function(x){
    if(
      String(x.modeFinTerminale||'')!==
      'POURSUITE_PFMP2_ENTREPRISE'
    ){
      return;
    }

    var src=by[Number(x.eleveId)||0];

    if(!src){
      return;
    }

    [
      'entreprise',
      'adresseEntreprise',
      'contactEntreprise',
      'telephoneEntreprise',
      'courrielEntreprise',
      'tuteurEntreprise',
      'telephoneTuteur',
      'courrielTuteur',
      'professeurTelephone',
      'professeurTelephoneId',
      'professeurVisiteur',
      'professeurVisiteurId',
      'affectationTelephoneId',
      'affectationVisiteId'
    ].forEach(function(k){
      EUC_DEV293_copyIf_(
        x,
        src,
        k
      );
    });

    x.__dev293Pfmp2Source=
      p2.__dev293Source||'';
  });

  detail.__dev293=true;

  return detail;
}
