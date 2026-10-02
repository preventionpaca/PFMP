
/**
 * PFMP — DEV387
 * Finalisation suivi conventions :
 * - synthèse classe fiable avec effectif total
 * - P.dif. autoritaire
 * - contrôle rapide nominatif ADMIN + PUBLIC
 */
function EUC_DEV387_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV387_nom_(x){
  return (
    EUC_DEV387_txt_(x&&x.nom)+' '+
    EUC_DEV387_txt_(x&&x.prenom)
  ).trim();
}

function EUC_DEV387_isPdifPeriod_(p){
  p=p||{};
  var s=EUC_DEV387_txt_(p.libelle||p.nom||p.code)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase();

  return !!(
    p.isPdif===true ||
    p.pdif===true ||
    p.parcoursDifferencie===true ||
    Object.prototype.hasOwnProperty.call(p,'parcoursDifferencies') ||
    s.indexOf('P.DIF')>=0 ||
    s.indexOf('PDIF')>=0 ||
    s.indexOf('DIFFERENC')>=0
  );
}

function EUC_DEV387_family(payload){
  payload=payload||{};

  var annee=EUC_DEV387_txt_(payload.annee);
  var famille=EUC_DEV387_txt_(payload.famille||'BACPRO').toUpperCase();

  if(!annee)throw new Error('Année scolaire manquante.');

  var key='DEV387_FAMILY_'+annee+'_'+famille;
  var cache=CacheService.getScriptCache();
  var raw=null;

  try{raw=cache.get(key);}catch(e){}

  if(raw){
    try{return JSON.parse(raw);}catch(e2){}
  }

  /*
   * DEV291 est la couche qui consolide actuellement conventions,
   * apprentis et parcours différencié.
   */
  var r=
    typeof EUC_DEV291_family==='function'
      ? EUC_DEV291_family({annee:annee,famille:famille})
      : EUC_DEV190G1_chargerFamille({annee:annee,famille:famille});

  r=r||{classes:[]};

  (r.classes||[]).forEach(function(c){
    var effectif=Number(c.effectif)||0;

    if(!effectif){
      var normal=(c.periodes||[]).filter(function(p){
        return !EUC_DEV387_isPdifPeriod_(p);
      })[0];
      effectif=Number(normal&&(
        normal.effectifTotal||
        normal.total
      ))||0;
    }

    c.effectif=effectif;

    (c.periodes||[]).forEach(function(p){
      p.effectifTotal=effectif;

      if(!EUC_DEV387_isPdifPeriod_(p)){
        var conv=Number(p.conventions)||0;
        var app=
          p.apprentis!==undefined && p.apprentis!==null
            ? Number(p.apprentis)||0
            : Number(c.apprentis)||0;

        p.apprentis=app;
        p.couverts=Math.min(effectif,conv+app);
        p.total=effectif;
        p.manquantes=Math.max(0,effectif-p.couverts);
        p.pourcentage=effectif
          ? Math.round(100*p.couverts/effectif)
          : 0;
      }
    });
  });

  try{cache.put(key,JSON.stringify(r),120);}catch(e3){}

  return r;
}

function EUC_DEV387_quick(payload){
  payload=payload||{};

  var annee=EUC_DEV387_txt_(payload.annee);
  var famille=EUC_DEV387_txt_(payload.famille||'BACPRO').toUpperCase();
  var classe=Number(payload.classe)||0;
  var periode=Number(payload.periode)||0;

  if(!annee||!classe||!periode){
    throw new Error('Année, classe et période obligatoires.');
  }

  var key=[
    'DEV387_QUICK',
    annee,
    famille,
    classe,
    periode
  ].join('_');

  var cache=CacheService.getScriptCache();
  var raw=null;

  try{raw=cache.get(key);}catch(e){}

  if(raw){
    try{return JSON.parse(raw);}catch(e2){}
  }

  var detail=EUC_DEV356_detail_(
    annee,
    famille,
    classe,
    periode
  );

  if(!detail){
    throw new Error('Détail de classe indisponible.');
  }

  var p=detail.periode||{};
  var isPdif=EUC_DEV387_isPdifPeriod_(p);
  var out={
    ok:true,
    annee:annee,
    famille:famille,
    classeId:classe,
    classe:
      EUC_DEV387_txt_(
        detail.classe&&detail.classe.nom
      ),
    periodeId:periode,
    periode:EUC_DEV387_txt_(p.libelle||p.nom||'Période'),
    isPdif:isPdif,
    total:(detail.lignes||[]).length,
    avec:[],
    sans:[],
    apprentis:[],
    lycee:[],
    entreprise:[],
    indefini:[]
  };

  (detail.lignes||[]).forEach(function(x){
    var nom=EUC_DEV387_nom_(x);
    if(!nom)return;

    if(isPdif){
      var mode=EUC_DEV387_txt_(x.modeFinTerminale).toUpperCase();

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

    var code=EUC_DEV387_txt_(x.statutCode||x.statut).toUpperCase();

    var active=
      Number(x.conventionId)>0 &&
      code.indexOf('ANNULEE')<0 &&
      code.indexOf('INTERROMP')<0;

    if(active)out.avec.push(nom);
    else out.sans.push(nom);
  });

  [
    'avec','sans','apprentis',
    'lycee','entreprise','indefini'
  ].forEach(function(k){
    out[k].sort(function(a,b){
      return a.localeCompare(b,'fr');
    });
  });

  out.couverts=
    out.avec.length+
    out.apprentis.length;

  try{cache.put(key,JSON.stringify(out),120);}catch(e3){}

  return out;
}
