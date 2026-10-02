/**
 * Eucalyptus PFMP — v1.0.0-dev.289
 * Restauration fonctionnelle du détail PFMP.
 *
 * Ordre important :
 * 1. restauration du statut apprentissage sur la période ;
 * 2. enrichissement Fin de Terminale / P.dif.
 *
 * Aucun changement sur la génération des conventions.
 */
function EUC_DEV289_enrichDetail_(detail,annee,famille,classeId){
  if(!detail){
    return detail;
  }

  if(typeof EUC_DEV275B_enrichDetail_==='function'){
    detail=EUC_DEV275B_enrichDetail_(detail);
  }else if(typeof EUC_APP172_enrichirDetail==='function'){
    detail=EUC_APP172_enrichirDetail(detail);
  }else{
    throw new Error('DEV289 : moteur apprentissage historique introuvable.');
  }

  detail=EUC_DEV290_enrichDetail_(
    detail,
    String(annee||''),
    String(famille||'BACPRO'),
    Number(classeId)||0
  );

  detail.__dev289=true;
  detail.__dev290=true;

  return detail;
}
