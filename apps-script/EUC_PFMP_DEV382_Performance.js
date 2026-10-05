/**
 * PFMP — DEV464
 * Navigation rapide du détail de classe, publique comme administrative.
 * La réponse réutilise strictement le même détail canonique que la route
 * complète afin qu'un changement par liste déroulante ne perde aucun élève.
 */
function EUC_DEV382_fastDetail(payload){
  payload=payload||{};

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
  var publicMode=payload.publicMode===true;

  if(!annee||!classe||!periode){
    throw new Error('Année, classe et période obligatoires.');
  }

  if(!publicMode){
    var ctx=typeof EUC_V156_contexteAdmin_==='function'
      ? EUC_V156_contexteAdmin_()
      : null;
    if(!ctx)throw new Error('Accès administrateur requis.');
  }

  var t0=Date.now();
  var detail;
  if(typeof EUC_DEV455_fastDetail_==='function'){
    detail=EUC_DEV455_fastDetail_(annee,famille,classe,periode);
  }else{
    detail=EUC_DEV416_finalDetail_(annee,famille,classe,periode);
  }
  if(typeof EUC_DEV459_sanitizeDetail_==='function'){
    detail=EUC_DEV459_sanitizeDetail_(detail);
  }

  if(!detail||!detail.classe||!detail.periode){
    throw new Error('Détail PFMP incomplet.');
  }

  detail.peutModifier=!publicMode;
  if(!publicMode){
    try{detail.peutModifier=!!EUC_V156_contexteAdmin_();}
    catch(eAdmin){detail.peutModifier=false;}
  }
  detail.professeursDisponibles=[];
  detail.professeursDisponiblesCharges=false;

  return {ok:true,detail:detail,serverMs:Date.now()-t0};
}
