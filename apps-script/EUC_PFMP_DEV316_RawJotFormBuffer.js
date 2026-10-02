/**
 * PFMP — v1.0.0-dev.316
 * Détection et lecture directe du tampon JotForm brut.
 */

function EUC_DEV316_detectBufferTable_(){
  var tables=
    EUC_ENT_grist('get','/tables').tables||[];

  var required=[
    'Date_debut_brut',
    'Date_fin_brut',
    'Eleve_match_id',
    'Classe_match_id',
    'SIRET_normalise',
    'Importer'
  ];

  var found=[];

  tables.forEach(function(t){
    var id=String(t.id||'');
    if(!id)return;

    var cols;

    try{
      cols=
        EUC_ENT_grist(
          'get',
          '/tables/'+encodeURIComponent(id)+'/columns'
        ).columns||[];
    }catch(e){
      return;
    }

    var have={};

    cols.forEach(function(c){
      have[String(c.id||'')]=true;
    });

    var ok=required.every(function(k){
      return !!have[k];
    });

    if(ok){
      found.push(id);
    }
  });

  if(found.length!==1){
    throw new Error(
      'DEV.316 : table tampon JotForm non déterminée de façon unique. '+
      'Candidats : '+found.join(', ')
    );
  }

  return found[0];
}

function EUC_DEV316_rawBuffer_(){
  var table=EUC_DEV316_detectBufferTable_();

  var raw=
    EUC_ENT_grist(
      'get',
      '/tables/'+encodeURIComponent(table)+'/records'
    );

  return (raw.records||[]).map(function(r){
    var o={id:Number(r.id)||0};
    var f=r.fields||{};

    Object.keys(f).forEach(function(k){
      o[k]=f[k];
    });

    return o;
  });
}
