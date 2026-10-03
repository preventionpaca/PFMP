
/**
 * PFMP — DEV382
 * Navigation rapide du détail ADMIN.
 * Ne modifie aucune donnée métier.
 */
function EUC_DEV382_fastDetail(payload){
  payload=payload||{};

  var ctx=
    typeof EUC_V156_contexteAdmin_==='function'
      ? EUC_V156_contexteAdmin_()
      : null;

  if(!ctx){
    throw new Error('Accès administrateur requis.');
  }

  var annee=String(
    payload.annee||
    (
      typeof EUC_PFMP_contexteAnneeLectureV155_==='function'
        ? EUC_PFMP_contexteAnneeLectureV155_().active
        : ''
    )||
    ''
  ).trim();

  var famille=String(payload.famille||'BACPRO').trim().toUpperCase();
  var classe=Number(payload.classe)||0;
  var periode=Number(payload.periode)||0;

  if(!annee||!classe||!periode){
    throw new Error('Année, classe et période obligatoires.');
  }

  var t0=Date.now();

  var detail=EUC_DEV416_finalDetail_(
    annee,
    famille,
    classe,
    periode
  );

  if(!detail||!detail.classe||!detail.periode){
    throw new Error('Détail PFMP incomplet.');
  }

  return {
    ok:true,
    detail:detail,
    serverMs:Date.now()-t0
  };
}
