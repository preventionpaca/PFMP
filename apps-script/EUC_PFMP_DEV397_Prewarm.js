/**
 * PFMP — DEV397
 * Pré-chauffage explicite des caches de suivi.
 */
function EUC_DEV397_prewarm(payload){
  payload=payload||{};
  var annee=String(payload.annee||'2026-2027').trim();
  var t0=Date.now();
  var out={ok:true,annee:annee,steps:[]};

  function step(name,fn){
    var t=Date.now();
    try{
      var r=fn();
      out.steps.push({name:name,ok:true,ms:Date.now()-t});
      return r;
    }catch(e){
      out.steps.push({name:name,ok:false,ms:Date.now()-t,error:String(e&&e.message||e)});
      return null;
    }
  }

  step('contexte',function(){ return EUC_PFMP_contexteAnneeLectureV155_(); });
  step('accessRows',function(){ return EUC_DEV340_accessRows_(annee); });
  step('apprentissage',function(){ return EUC_APP172_snapshot(annee); });

  ['BACPRO','BTS','CAP'].forEach(function(famille){
    step('famille-'+famille,function(){
      return EUC_DEV340_familyData_(annee,famille);
    });
  });

  out.totalMs=Date.now()-t0;
  return out;
}

function EUC_DEV397_afficherPrewarm(e){
  var annee=String(e&&e.parameter&&e.parameter.annee ? e.parameter.annee : '2026-2027').trim();
  var r=EUC_DEV397_prewarm({annee:annee});
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><pre style="font:14px monospace;white-space:pre-wrap">'+
    String(JSON.stringify(r,null,2))
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+
    '</pre>'
  ).setTitle('PFMP DEV397 prewarm');
}
