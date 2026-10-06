/**
 * DEV470 — compatibilité avec les anciens wrappers DEV394.
 *
 * Le profiler DEV394 était temporaire et n'est plus livré. Plusieurs routes
 * conservaient toutefois ses appels d'instrumentation. Ces fonctions neutres
 * maintiennent les routes disponibles sans écrire de traces ni ajouter de
 * lectures réseau.
 */
function EUC_DEV394_begin_(){
  return null;
}

function EUC_DEV394_mark_(){
  return null;
}

function EUC_DEV394_finish_(){
  return null;
}
