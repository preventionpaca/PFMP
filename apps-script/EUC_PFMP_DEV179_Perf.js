/** Eucalyptus PFMP — v1.0.0-dev.179 — performance générateur */

function EUC_DEV179_prewarmElevesGenerateur(){
  var t0=Date.now();
  var rows=EUC_CONVENTION_lireElevesAdmin();
  var out={
    ok:true,
    lignes:(rows||[]).length,
    dureeMs:Date.now()-t0
  };
  console.log(JSON.stringify({
    diagnostic:'DEV179_PERF',
    op:'prewarm_eleves_generateur',
    dureeMs:out.dureeMs,
    lignes:out.lignes
  }));
  return out;
}

function EUC_DEV179_invaliderCacheElevesGenerateur(){
  CacheService.getScriptCache().remove('DEV179_ELEVES_GENERATEUR');
  return {ok:true};
}

function EUC_DEV179_mesurerElevesGenerateur(){
  var t0=Date.now();
  var rows=EUC_CONVENTION_lireElevesAdmin();
  return {
    ok:true,
    lignes:(rows||[]).length,
    dureeMs:Date.now()-t0
  };
}
