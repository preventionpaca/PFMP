/**
 * Eucalyptus PFMP — v1.0.0-dev.292
 *
 * 1) Le détail P.dif. doit laisser DEV291 reconstruire toute la classe.
 * 2) Le récap global BAC PRO agrège :
 *    - parcours différencié lycée
 *    - poursuite PFMP2 entreprise
 *    - choix à définir
 */

function EUC_DEV292_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV292_norm_(v){
  return EUC_DEV292_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function EUC_DEV292_isPdif_(p){
  if(typeof EUC_DEV291_isPdif_==='function'){
    try{
      return !!EUC_DEV291_isPdif_(p);
    }catch(e){}
  }

  var t=EUC_DEV292_norm_([
    p&&p.libelle,
    p&&p.nom,
    p&&p.type,
    p&&p.v50Slot,
    p&&p.v51Slot
  ].filter(Boolean).join(' '));

  return /P[.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(t);
}

function EUC_DEV292_resumeFamille(payload){
  payload=payload||{};

  var famille=EUC_DEV292_txt_(payload.famille);

  var r=
    typeof EUC_DEV291_family==='function'
      ? EUC_DEV291_family(payload)
      : EUC_DEV190G1_chargerFamille(payload);

  var effectif=0;
  var apprentis=0;
  var periods={};

  (r.classes||[]).forEach(function(c){
    effectif+=Number(c.effectif||c.total||0);
    apprentis+=Number(c.apprentis||0);

    (c.periodes||[]).forEach(function(p){
      var isPdif=EUC_DEV292_isPdif_(p);

      var k=isPdif
        ? '__PDIF__'
        : String(
            p.v50Slot||
            p.v51Slot||
            p.libelle||
            p.nom||
            p.id||
            ''
          );

      if(!periods[k]){
        periods[k]={
          libelle:isPdif
            ? 'P.dif.'
            : (
                p.v50Slot||
                p.v51Slot||
                p.libelle||
                p.nom||
                k
              ),
          isPdif:isPdif,
          conventions:0,
          total:0,
          apprentis:0,
          parcoursDifferencies:0,
          poursuitePfmp2:0,
          aDefinirFinTerminale:0
        };
      }

      if(isPdif){
        periods[k].parcoursDifferencies+=
          Number(p.parcoursDifferencies)||0;

        periods[k].poursuitePfmp2+=
          Number(p.poursuitePfmp2)||0;

        periods[k].aDefinirFinTerminale+=
          Number(p.aDefinirFinTerminale)||0;

        periods[k].total=
          periods[k].parcoursDifferencies+
          periods[k].poursuitePfmp2+
          periods[k].aDefinirFinTerminale;
      }else{
        periods[k].conventions+=
          Number(p.conventions)||0;

        periods[k].total+=
          Number(p.total)||0;

        periods[k].apprentis+=
          Number(p.apprentis)||0;
      }
    });
  });

  return {
    code:famille,
    libelle:
      famille==='BACPRO'
        ? 'BAC PRO'
        : famille,
    classes:(r.classes||[]).length,
    effectif:effectif,
    apprentis:apprentis,
    periodes:Object.keys(periods).map(function(k){
      return periods[k];
    }),
    __source:'dev292',
    __durationMs:r.__durationMs||0
  };
}
