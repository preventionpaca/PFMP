/**
 * PFMP — v1.0.0-dev.319
 * Couche live du suivi : détail classe + compteurs famille.
 */

function EUC_DEV319_ref_(v){
  if(typeof EUC_PFMP_ref_==='function'){
    return Number(EUC_PFMP_ref_(v))||0;
  }

  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++){
      if(Number(v[i])>0)return Number(v[i]);
    }
  }

  return Number(v)||0;
}

function EUC_DEV319_liveCounts_(annee){
  var rows=EUC_CONVENTION_lireAccesFraisV108_();
  var unique={};

  (rows||[]).forEach(function(a){
    /* EUC_DEV320_STRICT_LIVE_COUNT
     * Un QR généré mais non rempli ne doit jamais compter.
     */
    if(typeof EUC_V50_estRemontee_==='function'){
      if(!EUC_V50_estRemontee_(a))return;
    }else if(
      typeof EUC_SUIVI_V45_estActive_==='function' &&
      !EUC_SUIVI_V45_estActive_(a)
    ){
      return;
    }

    var an=String(a.Annee_scolaire||'').trim();

    /* Année stricte : aucun ancien accès sans année ne fuit. */
    if(annee&&an!==annee)return;

    var cid=EUC_DEV319_ref_(a.Classe_convention);
    var pid=EUC_DEV319_ref_(a.Periode);
    var eid=EUC_DEV319_ref_(a.Eleve);

    if(!(cid>0&&pid>0&&eid>0))return;

    unique[cid+'|'+pid+'|'+eid]=true;
  });

  var counts={};

  Object.keys(unique).forEach(function(k){
    var p=k.split('|');
    var kp=p[0]+'|'+p[1];
    counts[kp]=(counts[kp]||0)+1;
  });

  return counts;
}

function EUC_DEV319_liveFamilyIndex(payload){
  payload=payload||{};

  var base=EUC_DEV190G1_fastFamilyIndex(payload);
  if(!(base&&base.ready&&base.payload)){
    return base;
  }

  var out=JSON.parse(JSON.stringify(base));
  var data=out.payload||{};
  var annee=String(payload.annee||data.annee||'');
  var counts=EUC_DEV319_liveCounts_(annee);

  (data.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;

    (c.periodes||[]).forEach(function(p){
      var pid=Number(p.id||p.periodeId)||0;
      if(!(cid>0&&pid>0))return;

      var n=Number(counts[cid+'|'+pid]||0);

      p.conventions=n;

      if(Object.prototype.hasOwnProperty.call(p,'avecConvention')){
        p.avecConvention=n;
      }

      var total=Number(p.total)||Number(c.effectif)||0;

      if(Object.prototype.hasOwnProperty.call(p,'manquantes')){
        p.manquantes=Math.max(0,total-n);
      }

      if(Object.prototype.hasOwnProperty.call(p,'pourcentage')){
        p.pourcentage=total?Math.round((n/total)*100):0;
      }

      if(Object.prototype.hasOwnProperty.call(p,'ratio')){
        p.ratio=total?n/total:0;
      }
    });
  });

  data.builtAtLive=new Date().toISOString();
  data.sourceConventions='DEV319_LIVE_ACCES';

  return out;
}

function EUC_DEV319_afficherAdminClasseLive(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();

  var classeId=Number(
    e&&e.parameter&&e.parameter.classe
  )||0;

  var periodeId=Number(
    e&&e.parameter&&e.parameter.periode
  )||0;

  var annee=String(
    e&&e.parameter&&e.parameter.annee||
    ctx.active||
    ''
  );

  if(!(classeId>0)){
    throw new Error('Classe manquante.');
  }

  var cache=CacheService.getScriptCache();

  if(annee&&classeId&&periodeId){
    try{
      cache.remove(
        'DEV185_DETAIL_'+annee+'_'+classeId+'_'+periodeId
      );
    }catch(e1){}

    try{
      cache.remove(
        'EUC_V50_DETAIL_'+annee+'_'+classeId+'_'+periodeId
      );
    }catch(e2){}
  }

  /*
   * V50 reconstruit le détail depuis EUC_ACCES_FORMULAIRES_PFMP
   * et applique EUC_V50_enrichirDetail_ : c'est exactement le calcul
   * validé par DEV.318.
   */
  var baseDetail=
    EUC_SUIVI_CLASSE_detailF18_(
      annee,
      classeId,
      periodeId
    );

  var pid=
    Number(
      baseDetail&&
      baseDetail.periode&&
      baseDetail.periode.id
    )||
    periodeId||
    0;

  var detail=
    EUC_V50_enrichirDetail_(
      baseDetail,
      annee,
      classeId,
      pid
    );

  var tpl=
    HtmlService.createTemplateFromFile(
      'Suivi_PFMP_Classe_Detail_V156'
    );

  tpl.config=
    JSON.stringify({
      baseUrl:ScriptApp.getService().getUrl()
    });

  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);

  tpl.dev186BreadcrumbHtml=
    typeof EUC_DEV186_breadcrumbHtml_==='function'
      ? EUC_DEV186_breadcrumbHtml_(detail,annee)
      : '';

  return tpl.evaluate()
    .setTitle(
      'Suivi PFMP — '+
      (
        detail&&
        detail.classe&&
        detail.classe.nom||
        'Classe'
      )
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}
