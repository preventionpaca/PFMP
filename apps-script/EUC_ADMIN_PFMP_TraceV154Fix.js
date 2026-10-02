/** Eucalyptus PFMP — trace visuelle corrections/suppressions — v1.0.0-dev.155-fix1 */

function EUC_ADMIN_TRACE_listerV154Fix(){
  EUC_ADMIN_WORKFLOW_ctxV144_();

  var rows=EUC_CONVENTION_lireAccesFraisV108_();

  return rows.map(function(a){
    var hist=String(a.Historique_admin_JSON||'');
    return {
      id:Number(a.id),
      supprimee:
        a.Supprimee_admin===true ||
        String(a.Statut_administratif||'')==='SUPPRIMEE_ADMIN',
      corrigee:
        hist.indexOf('CORRECTION_ADMINISTRATIVE')>=0
    };
  });
}
