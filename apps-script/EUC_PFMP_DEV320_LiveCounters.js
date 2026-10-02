/**
 * PFMP — v1.0.0-dev.320
 * Décomptes stricts et cohérents sur toutes les couches du suivi.
 */

function EUC_DEV320_periodKey_(p){
  p=p||{};

  if(p.key){
    return String(p.key);
  }

  try{
    if(typeof EUC_SUIVI_PUBLIC_periodeKey_==='function'){
      return String(EUC_SUIVI_PUBLIC_periodeKey_(p)||'');
    }
  }catch(e){}

  return (
    String(p.debut||p.Date_debut||'')+
    '|'+
    String(p.fin||p.Date_fin||'')
  );
}

function EUC_DEV320_isPdif_(p){
  p=p||{};

  if(
    Object.prototype.hasOwnProperty.call(p,'parcoursDifferencies') ||
    Object.prototype.hasOwnProperty.call(p,'poursuitePfmp2') ||
    Object.prototype.hasOwnProperty.call(p,'aDefinirFinTerminale')
  ){
    return true;
  }

  var s=String(p.libelle||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase();

  return (
    s.indexOf('P.DIF')>=0 ||
    s.indexOf('PDIF')>=0 ||
    s.indexOf('DIFFERENC')>=0
  );
}

function EUC_DEV320_resumeFamilleLive(payload){
  payload=payload||{};

  var base=EUC_DEV292_resumeFamille(payload);

  var live=EUC_DEV319_liveFamilyIndex({
    annee:String(payload.annee||base.annee||''),
    famille:String(payload.famille||base.famille||'')
  });

  if(!(live&&live.ready&&live.payload)){
    return base;
  }

  var byKey={};
  var byDates={};

  (live.payload.classes||[]).forEach(function(c){
    (c.periodes||[]).forEach(function(p){
      if(EUC_DEV320_isPdif_(p))return;

      var key=EUC_DEV320_periodKey_(p);
      var dates=
        String(p.debut||p.Date_debut||'')+
        '|'+
        String(p.fin||p.Date_fin||'');

      var total=Number(p.total)||Number(c.effectif)||0;
      var conv=Number(p.conventions)||0;

      if(!byKey[key]){
        byKey[key]={conventions:0,total:0};
      }

      byKey[key].conventions+=conv;
      byKey[key].total+=total;

      if(!byDates[dates]){
        byDates[dates]={conventions:0,total:0};
      }

      byDates[dates].conventions+=conv;
      byDates[dates].total+=total;
    });
  });

  (base.periodes||[]).forEach(function(p){
    if(EUC_DEV320_isPdif_(p))return;

    var key=EUC_DEV320_periodKey_(p);
    var dates=
      String(p.debut||p.Date_debut||'')+
      '|'+
      String(p.fin||p.Date_fin||'');

    var hit=byKey[key]||byDates[dates]||null;
    if(!hit)return;

    p.conventions=Number(hit.conventions)||0;

    if(!(Number(p.total)>0)){
      p.total=Number(hit.total)||0;
    }

    p.manquantes=Math.max(
      0,
      Number(p.total||0)-Number(p.conventions||0)
    );

    p.pourcentage=Number(p.total||0)
      ? Math.round(
          Number(p.conventions||0)/
          Number(p.total||0)*
          100
        )
      : 0;
  });

  base.sourceConventions='DEV320_LIVE_STRICT';
  base.builtAtLive=new Date().toISOString();

  return base;
}
