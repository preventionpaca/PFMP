var EUC_DEV206B_STRUCTURE_TABLE_='EUC_PFMP_STRUCTURE_SNAPSHOT';

function EUC_DEV206B_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV206B_currentYear_(){
  var d=new Date(), y=d.getFullYear();
  return d.getMonth()>=8 ? y+'-'+(y+1) : (y-1)+'-'+y;
}

function EUC_DEV206B_tables_(){
  return (EUC_DEV190_api_('get','/tables',null).tables||[]);
}

function EUC_DEV206B_records_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/records',
      null
    ).records||[]
  );
}

function EUC_DEV206B_ensureTable_(){
  var exists=EUC_DEV206B_tables_().some(function(t){
    return t.id===EUC_DEV206B_STRUCTURE_TABLE_;
  });

  if(!exists){
    EUC_DEV190_api_(
      'post',
      '/tables',
      {
        tables:[{
          id:EUC_DEV206B_STRUCTURE_TABLE_,
          columns:[
            {id:'Annee_scolaire',type:'Text'},
            {id:'Payload_JSON',type:'Text'},
            {id:'Updated_at',type:'Text'},
            {id:'Actif',type:'Bool'}
          ]
        }]
      }
    );
  }
}

function EUC_DEV206B_liveClasses_(annee){
  if(typeof EUC_DEV190R_getPageStructure==='function'){
    var r=EUC_DEV190R_getPageStructure(annee,false);
    return r.classes||[];
  }

  if(typeof EUC_DEV190Q_getStructure==='function'){
    var q=EUC_DEV190Q_getStructure(annee);
    return (((q||{}).payload||{}).classes||[]);
  }

  throw new Error('DEV206B : service de structure PFMP introuvable.');
}

function EUC_DEV206B_rebuildStructureSnapshot(annee){
  annee=EUC_DEV206B_txt_(annee)||EUC_DEV206B_currentYear_();

  EUC_DEV206B_ensureTable_();

  var classes=EUC_DEV206B_liveClasses_(annee);
  var now=new Date().toISOString();

  var rows=EUC_DEV206B_records_(EUC_DEV206B_STRUCTURE_TABLE_);
  var active=rows.filter(function(r){
    var f=r.fields||{};
    return (
      f.Actif!==false &&
      EUC_DEV206B_txt_(f.Annee_scolaire)===annee
    );
  });

  if(active.length){
    EUC_DEV190_api_(
      'patch',
      '/tables/'+encodeURIComponent(EUC_DEV206B_STRUCTURE_TABLE_)+'/records',
      {
        records:active.map(function(r){
          return {
            id:r.id,
            fields:{
              Actif:false,
              Updated_at:now
            }
          };
        })
      }
    );
  }

  EUC_DEV190_api_(
    'post',
    '/tables/'+encodeURIComponent(EUC_DEV206B_STRUCTURE_TABLE_)+'/records',
    {
      records:[{
        fields:{
          Annee_scolaire:annee,
          Payload_JSON:JSON.stringify({
            annee:annee,
            classes:classes
          }),
          Updated_at:now,
          Actif:true
        }
      }]
    }
  );

  return {
    ok:true,
    source:'rebuilt',
    updatedAt:now,
    annee:annee,
    classes:classes
  };
}

function EUC_DEV206B_getStructureSnapshot(annee){
  annee=EUC_DEV206B_txt_(annee)||EUC_DEV206B_currentYear_();

  EUC_DEV206B_ensureTable_();

  var rows=EUC_DEV206B_records_(EUC_DEV206B_STRUCTURE_TABLE_)
    .filter(function(r){
      var f=r.fields||{};
      return (
        f.Actif!==false &&
        EUC_DEV206B_txt_(f.Annee_scolaire)===annee
      );
    })
    .sort(function(a,b){
      return (
        (Date.parse((b.fields||{}).Updated_at||'')||0) -
        (Date.parse((a.fields||{}).Updated_at||'')||0)
      );
    });

  if(rows.length){
    try{
      var payload=JSON.parse((rows[0].fields||{}).Payload_JSON||'{}');

      return {
        ok:true,
        source:'snapshot',
        updatedAt:(rows[0].fields||{}).Updated_at||'',
        annee:annee,
        classes:payload.classes||[]
      };
    }catch(e){}
  }

  return EUC_DEV206B_rebuildStructureSnapshot(annee);
}