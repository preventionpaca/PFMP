
/**
 * PFMP — DEV388
 * Corrige DEV387 :
 * - effectif total = vraie valeur structurelle (effectifTotal prioritaire)
 * - quick check = snapshot readOne direct
 */
function EUC_DEV388_effectifClasse_(c){
  c=c||{};

  var best=Number(c.effectifTotal)||0;

  (c.periodes||[]).forEach(function(p){
    best=Math.max(
      best,
      Number(p&&p.effectifTotal)||0
    );
  });

  if(best>0)return best;

  best=Number(c.effectif)||0;

  (c.periodes||[]).forEach(function(p){
    best=Math.max(
      best,
      Number(p&&p.total)||0
    );
  });

  return best;
}

function EUC_DEV388_family(payload){
  payload=payload||{};

  var annee=EUC_DEV387_txt_(payload.annee);
  var famille=EUC_DEV387_txt_(
    payload.famille||'BACPRO'
  ).toUpperCase();

  var r=
    typeof EUC_DEV291_family==='function'
      ? EUC_DEV291_family({
          annee:annee,
          famille:famille
        })
      : EUC_DEV190G1_chargerFamille({
          annee:annee,
          famille:famille
        });

  r=r||{classes:[]};

  (r.classes||[]).forEach(function(c){
    var effectif=EUC_DEV388_effectifClasse_(c);

    c.effectifTotal=effectif;

    (c.periodes||[]).forEach(function(p){
      p.effectifTotal=effectif;

      if(EUC_DEV387_isPdifPeriod_(p)){
        return;
      }

      var conv=Number(p.conventions)||0;
      var app=
        p.apprentis!==undefined &&
        p.apprentis!==null
          ? Number(p.apprentis)||0
          : Number(c.apprentis)||0;

      var scolairesAttendus=
        Math.max(0,effectif-app);

      var sansConvention=
        Math.max(0,scolairesAttendus-conv);

      p.total=effectif;
      p.scolairesAttendus=scolairesAttendus;
      p.apprentis=app;
      p.couverts=Math.min(
        effectif,
        conv+app
      );
      p.sansConvention=sansConvention;
      p.manquantes=sansConvention;
      p.pourcentage=effectif
        ? Math.round(
            100*p.couverts/effectif
          )
        : 0;
    });
  });

  return r;
}

function EUC_DEV394_BASE_EUC_DEV388_quick(payload){
  payload=payload||{};

  var annee=EUC_DEV387_txt_(payload.annee);
  var famille=EUC_DEV387_txt_(
    payload.famille||'BACPRO'
  ).toUpperCase();
  var classe=Number(payload.classe)||0;
  var periode=Number(payload.periode)||0;

  if(!annee||!classe||!periode){
    throw new Error(
      'Année, classe et période obligatoires.'
    );
  }

  var key=[
    'DEV392_QUICK',
    annee,
    famille,
    classe,
    periode
  ].join('_');

  var cache=CacheService.getScriptCache();
  var raw=null;

  try{raw=cache.get(key);}catch(e){}

  if(raw){
    try{return JSON.parse(raw);}
    catch(e2){}
  }

  var rr=null;
  var detail=null;
  var detailFinal=false;

  try{
    if(typeof EUC_DEV416_finalDetail_==='function'){
      detail=EUC_DEV416_finalDetail_(
        annee,
        famille,
        classe,
        periode
      );
      detailFinal=!!detail;
    }
  }catch(e0){}

  if(!detail){
    rr=EUC_DEV190I_readOne({
      annee:annee,
      famille:famille,
      classe:classe,
      periode:periode
    });

    detail=
      rr&&rr.ready&&rr.detail
        ? rr.detail
        : null;
  }

  if(!detail){
    throw new Error(
      'Détail de classe indisponible.'
    );
  }

  /*
   * DEV392 :
   * le snapshot donne la liste des élèves mais ne porte pas toujours
   * conventionId/convention. On enrichit donc uniquement cette classe
   * et cette période depuis la source réelle des accès.
   */
  if(!detailFinal&&typeof EUC_V50_enrichirDetail_==='function'){
    detail=EUC_V50_enrichirDetail_(
      detail,
      annee,
      classe,
      periode
    );
  }

  var p=detail.periode||{};

  var isPdif=
    EUC_DEV387_isPdifPeriod_(p);

  var total=
    Number(
      detail.stats&&detail.stats.total
    )||
    (detail.lignes||[]).length;

  var out={
    ok:true,
    source:
      rr&&rr.ready
        ? 'snapshot-readOne'
        : 'fallback-detail',
    durationMs:
      Number(rr&&rr.durationMs)||0,
    annee:annee,
    famille:famille,
    classeId:classe,
    classe:EUC_DEV387_txt_(
      detail.classe&&detail.classe.nom
    ),
    periodeId:periode,
    periode:EUC_DEV387_txt_(
      p.libelle||p.nom||'Période'
    ),
    isPdif:isPdif,
    total:total,
    avec:[],
    sans:[],
    apprentis:[],
    situations:[],
    situationsCouvertes:0,
    lycee:[],
    entreprise:[],
    indefini:[]
  };

  (detail.lignes||[]).forEach(function(x){
    var nom=EUC_DEV387_nom_(x);
    if(!nom)return;

    if(isPdif){
      var mode=EUC_DEV387_txt_(
        x.modeFinTerminale
      ).toUpperCase();

      if(
        mode==='PARCOURS_DIFF_LYCEE' ||
        mode==='PARCOURS_DIFFERENCIE_LYCEE'
      ){
        out.lycee.push(nom);
      }else if(
        mode==='POURSUITE_PFMP2_ENTREPRISE' ||
        mode==='POURSUITE_PFMP2'
      ){
        out.entreprise.push(nom);
      }else{
        out.indefini.push(nom);
      }

      return;
    }

    if(x.apprenti){
      out.apprentis.push(nom);
      return;
    }

    if(x.situationAdministrativeLibelle){
      out.situations.push(nom+' — '+x.situationAdministrativeLibelle);
      if(x.exclureSansConvention===true){out.situationsCouvertes++;return;}
    }

    var code=EUC_DEV387_txt_(
      x.statutCode||x.statut
    ).toUpperCase();

    /*
     * DEV391 :
     * les snapshots détaillés ne transportent pas toujours conventionId.
     * Le booléen x.convention est donc accepté comme seconde preuve.
     */
    var active=
      (
        Number(x.conventionId)>0 ||
        x.convention===true
      ) &&
      code.indexOf('ANNULEE')<0 &&
      code.indexOf('INTERROMP')<0 &&
      code.indexOf('SANS_CONVENTION')<0 &&
      code.indexOf('SANS CONVENTION')<0;

    if(active)out.avec.push(nom);
    else out.sans.push(nom);
  });

  [
    'avec','sans','apprentis','situations',
    'lycee','entreprise','indefini'
  ].forEach(function(k){
    out[k].sort(function(a,b){
      return a.localeCompare(b,'fr');
    });
  });

  out.couverts=
    out.avec.length+
    out.apprentis.length+
    out.situationsCouvertes;

  out.scolairesAttendus=
    Math.max(
      0,
      total-out.apprentis.length
    );

  out.sansConvention=
    out.sans.length;

  try{
    cache.put(
      key,
      JSON.stringify(out),
      180
    );
  }catch(e3){}

  return out;
}


function EUC_DEV388_quick(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV388_quick.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV388_quick',Date.now()-__t);
  }
}
