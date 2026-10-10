/**
 * PFMP — DEV534
 * Vues de classe compactes et reprise bornée après le 413 Grist.
 *
 * Les snapshots de détail sont des caches techniques. Ils ne doivent pas
 * recopier les 368 périodes de l'année ni la totalité des colonnes de chaque
 * ancienne convention. L'interface n'utilise qu'un sous-ensemble précis pour
 * afficher l'historique rupture / remplacement.
 */
var EUC_DEV534_VERSION_='1.0.0-dev.534';
var EUC_DEV534_GRIST_BATCH_BYTES_=80000;
var EUC_DEV534_HISTORY_FIELDS_=[
  'id','Statut_administratif','Statut','Type_sequence','Numero_sequence',
  'Convention_origine','Convention_remplacement','Entreprise_raison_sociale',
  'Entreprise_enseigne','Date_debut','Date_fin_reelle','Date_fin','Motif_interruption'
];

function EUC_DEV534_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV534_bytes_(v){
  var s=typeof v==='string'?v:JSON.stringify(v==null?'':v);
  try{return Utilities.newBlob(s).getBytes().length;}catch(e){return unescape(encodeURIComponent(s)).length;}
}
function EUC_DEV534_recordChunks_(rows,maxBytes,maxRows){
  rows=rows||[];maxBytes=Number(maxBytes)||EUC_DEV534_GRIST_BATCH_BYTES_;maxRows=Number(maxRows)||10;
  var out=[],chunk=[];
  rows.forEach(function(row){
    var candidate=chunk.concat([row]),bytes=EUC_DEV534_bytes_({records:candidate});
    if(chunk.length&&(candidate.length>maxRows||bytes>maxBytes)){out.push(chunk);chunk=[row];}
    else chunk=candidate;
  });
  if(chunk.length)out.push(chunk);return out;
}
function EUC_DEV534_compactHistory_(rows){
  return (rows||[]).map(function(row){
    row=row||{};var out={};
    EUC_DEV534_HISTORY_FIELDS_.forEach(function(k){
      var v=row[k];if(v!==undefined&&v!==null&&v!==''&&v!==false&&v!==0)out[k]=v;
    });
    return out;
  });
}
function EUC_DEV534_compactDetail_(detail){
  detail=detail||{};
  (detail.lignes||[]).forEach(function(x){
    if(Array.isArray(x.historiqueConventions))x.historiqueConventions=EUC_DEV534_compactHistory_(x.historiqueConventions);
  });
  /* Ce dictionnaire de toutes les périodes sert pendant la construction,
   * jamais au rendu de la fiche. Le conserver ajoutait ~25 Ko par détail. */
  delete detail.periodeDatesById;
  /* La liste des professeurs est chargée à la demande par l'interface. */
  detail.professeursDisponibles=[];
  detail.professeursDisponiblesCharges=false;
  detail.__dev534Compact=true;
  return detail;
}

/**
 * Répare uniquement l'état technique laissé DIRTY par la réparation DEV533.
 * Les données métier ne sont pas modifiées. Le détail ciblé est reconstruit
 * depuis Grist, compacté, puis rattaché à la dernière révision familiale
 * durable avant de republier l'état READY.
 */
function EUC_DEV534_recoverCompletedReplacementSnapshot(){
  EUC_DEV532_assertGreen_();
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('DEV534 : une autre opération PFMP est en cours.');
  try{
    var annee=EUC_DEV534_t_(EUC_PFMP_contexteAnneeLectureV155_().active),famille='BACPRO';
    var state=EUC_DEV425_readState_(annee,famille);
    if(!state||state.status!=='DIRTY')return {ok:true,version:EUC_DEV534_VERSION_,skipped:'no-dirty-state',annee:annee};
    if(EUC_DEV534_t_(state.reason)!=='reparation-statut-remplacement'){
      throw new Error('DEV534 : état DIRTY étranger à la réparation DEV533 ('+EUC_DEV534_t_(state.reason)+').');
    }
    var family=EUC_DEV426_rawFamilySnapshot_(annee,famille),revision=EUC_DEV534_t_(family&&family.__dev425Revision);
    if(!family||!revision)throw new Error('DEV534 : dernier snapshot familial durable introuvable.');
    var rebuilt=[];
    (state.targets||[]).forEach(function(target){
      var classe=Number(target.classe)||0,periode=Number(target.periode)||0;
      if(!classe||!periode)return;
      var detail=EUC_DEV455_buildTargeted_(annee,famille,classe,periode);
      if(!detail||!Array.isArray(detail.lignes))throw new Error('DEV534 : détail ciblé indisponible pour '+classe+'/'+periode+'.');
      detail.__dev425Revision=revision;
      detail.__dev459CanonicalDetail=typeof EUC_DEV459_DETAIL_CANONICAL_==='string'?EUC_DEV459_DETAIL_CANONICAL_:'DEV534-D15';
      detail=EUC_DEV534_compactDetail_(detail);
      EUC_DEV427_writeDetails_(annee,famille,[{classe:classe,periode:periode,detail:detail}]);
      try{EUC_DEV416_cachePut_(EUC_DEV416_key_(annee,famille,classe,periode),detail);}catch(eCache){}
      rebuilt.push({classe:classe,periode:periode,lignes:detail.lignes.length});
    });
    EUC_DEV425_writeState_(annee,famille,{revision:revision,status:'READY',reason:'reprise-technique-dev534',targets:[]});
    try{EUC_DEV421_familyCachePut_(annee,famille,family);}catch(eFamily){}
    try{EUC_DEV456_familyPersistentPut_(annee,famille,family);EUC_DEV456_familyCachePut_(annee,famille,family);}catch(eStored){}
    return {ok:true,version:EUC_DEV534_VERSION_,annee:annee,famille:famille,revision:revision,rebuilt:rebuilt};
  }finally{try{lock.releaseLock();}catch(eRelease){}}
}
