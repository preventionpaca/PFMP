function EUC_DEV209_now_(){ return new Date().getTime(); }
function EUC_DEV209_txt_(v){ return String(v==null?'':v).trim(); }

function EUC_DEV209_stageStructure(annee){
  var t=EUC_DEV209_now_();
  var r=EUC_DEV206B_getStructureSnapshot(annee);
  return {
    ok:true,
    ms:EUC_DEV209_now_()-t,
    source:r.source||'',
    count:(r.classes||[]).length,
    updatedAt:r.updatedAt||''
  };
}

function EUC_DEV209_stageClassSnapshotRead(annee,classeId,classeNom){
  var t=EUC_DEV209_now_();
  EUC_DEV208_ensureTable_();
  var rows=EUC_DEV208_records_(EUC_DEV208_CLASS_SNAPSHOT_TABLE_);
  var hits=rows.filter(function(r){
    var f=r.fields||{};
    return f.Actif!==false &&
      EUC_DEV208_txt_(f.Annee_scolaire)===annee &&
      Number(f.Classe_id)===Number(classeId);
  });
  return {
    ok:true,
    ms:EUC_DEV209_now_()-t,
    totalRows:rows.length,
    hits:hits.length,
    classeId:Number(classeId),
    classeNom:classeNom
  };
}

function EUC_DEV209_stageDirectStudents(annee,classeId,classeNom){
  var t=EUC_DEV209_now_();

  var rows=EUC_DEV208_records_('EUC_ELEVES_PFMP');
  var afterRead=EUC_DEV209_now_();

  var cols=EUC_DEV208_cols_('EUC_ELEVES_PFMP');
  var afterCols=EUC_DEV209_now_();

  var cClasse=EUC_DEV208_col_(cols,['Classe','Classe_id','ClasseRef']);
  var cCode=EUC_DEV208_col_(cols,['Code_classe_importe','Code_classe','Classe_Pronote']);
  var aliases=EUC_DEV208_aliases_(classeNom);

  var hits=0;

  rows.forEach(function(r){
    var f=r.fields||{};
    var ok=false;

    if(cClasse && EUC_DEV208_refId_(f[cClasse])===Number(classeId)){
      ok=true;
    }

    if(!ok && cCode){
      var code=EUC_DEV208_norm_(f[cCode]);
      if(aliases.indexOf(code)>=0)ok=true;
    }

    if(ok)hits++;
  });

  var end=EUC_DEV209_now_();

  return {
    ok:true,
    totalMs:end-t,
    readRowsMs:afterRead-t,
    readColsMs:afterCols-afterRead,
    filterMs:end-afterCols,
    totalRows:rows.length,
    hits:hits,
    classeId:Number(classeId),
    classeNom:classeNom
  };
}

function EUC_DEV209_stageApprentissage(){
  var t=EUC_DEV209_now_();

  var tables=EUC_DEV208_tables_();
  var afterTables=EUC_DEV209_now_();

  var exists=tables.some(function(x){
    return x.id==='EUC_APPRENTISSAGE_PFMP';
  });

  if(!exists){
    return {
      ok:true,
      totalMs:EUC_DEV209_now_()-t,
      tableExists:false,
      tableListMs:afterTables-t
    };
  }

  var rows=EUC_DEV208_records_('EUC_APPRENTISSAGE_PFMP');
  var afterRows=EUC_DEV209_now_();

  var cols=EUC_DEV208_cols_('EUC_APPRENTISSAGE_PFMP');
  var end=EUC_DEV209_now_();

  return {
    ok:true,
    totalMs:end-t,
    tableExists:true,
    tableListMs:afterTables-t,
    rowsMs:afterRows-afterTables,
    colsMs:end-afterRows,
    rows:rows.length,
    cols:cols.length
  };
}

function EUC_DEV209_stageBuildClassSnapshot(annee,classeId,classeNom){
  var t=EUC_DEV209_now_();
  var r=EUC_DEV208_buildClassSnapshot_(annee,classeId,classeNom);
  return {
    ok:true,
    ms:EUC_DEV209_now_()-t,
    source:r.source||'',
    count:(r.students||[]).length,
    internalMs:r.durationMs||null
  };
}

function EUC_DEV209_stageFinalLoader(annee,classeId,classeNom){
  var t=EUC_DEV209_now_();
  var r=EUC_DEV208_loadApprentis(annee,classeId,classeNom);
  return {
    ok:true,
    ms:EUC_DEV209_now_()-t,
    source:r.source||'',
    count:(r.students||[]).length,
    internalMs:r.durationMs||null
  };
}

function EUC_DEV209_afficherAudit(e){
  var t=HtmlService.createTemplateFromFile('Audit_Apprentis_Chargement_V209');
  return t.evaluate()
    .setTitle('Audit chargement apprentis')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}