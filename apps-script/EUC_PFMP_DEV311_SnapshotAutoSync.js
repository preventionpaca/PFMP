/**
 * PFMP — v1.0.0-dev.311
 * Synchronisation automatique du suivi après migration JotForm.
 */

function EUC_DEV311_syncTargets_(targets){
  var out={
    ok:true,
    demandes:0,
    synchronisees:0,
    erreurs:[],
    details:[]
  };

  var seen={};

  Object.keys(targets||{}).forEach(function(k){
    var t=targets[k]||{};

    var annee=String(
      t.year||
      t.annee||
      ''
    );

    var classe=Number(
      t.classId||
      t.classeId||
      t.classe||
      0
    );

    var periode=Number(
      t.periodId||
      t.periodeId||
      t.periode||
      0
    );

    if(!annee||!classe||!periode)return;

    var key=annee+'|'+classe+'|'+periode;
    if(seen[key])return;
    seen[key]=true;

    out.demandes++;

    try{
      var payload={
        annee:annee,
        anneeScolaire:annee,
        codeAnnee:annee,
        classe:classe,
        classeId:classe,
        periode:periode,
        periodeId:periode
      };

      var r=EUC_DEV190J_syncOne(payload);

      out.synchronisees++;

      out.details.push({
        ok:true,
        annee:annee,
        classe:classe,
        periode:periode,
        resultat:r||null
      });

      try{
        CacheService.getScriptCache().remove(
          'DEV185_DETAIL_'+annee+'_'+classe+'_'+periode
        );
      }catch(eCache){}

      try{
        if(typeof EUC_SUIVI_invaliderCacheSynthese_==='function'){
          EUC_SUIVI_invaliderCacheSynthese_(annee);
        }
      }catch(eSynth){}

    }catch(e){
      out.ok=false;

      out.erreurs.push({
        annee:annee,
        classe:classe,
        periode:periode,
        erreur:String(e&&e.message||e)
      });
    }
  });

  if(typeof EUC_DEV190G1_fastFamilyIndex==='function'){
    var years={};

    Object.keys(targets||{}).forEach(function(k){
      var y=String(
        (targets[k]||{}).year||
        (targets[k]||{}).annee||
        ''
      );
      if(y)years[y]=true;
    });

    Object.keys(years).forEach(function(annee){
      ['BACPRO','BTS','CAP'].forEach(function(famille){
        try{
          EUC_DEV190G1_fastFamilyIndex({
            annee:annee,
            famille:famille,
            force:true,
            refresh:true
          });
        }catch(eWarm){}
      });
    });
  }

  return out;
}
