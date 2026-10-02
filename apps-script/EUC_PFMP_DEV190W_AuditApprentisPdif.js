function EUC_DEV190W_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV190W_norm_(v){
  return EUC_DEV190W_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[\s\-_.]/g,'');
}

function EUC_DEV190W_refIds_(v){
  var out=[];
  function add(x){
    var n=Number(x);
    if(isFinite(n) && String(x).trim()!=='') out.push(n);
  }
  if(Array.isArray(v)) v.forEach(add); else add(v);
  return out;
}

function EUC_DEV190W_findTable_(target){
  var tables=EUC_DEV190_api_('get','/tables',null).tables||[];
  var n=EUC_DEV190W_norm_(target);

  for(var i=0;i<tables.length;i++){
    if(EUC_DEV190W_norm_(tables[i].id)===n) return tables[i].id;
  }

  return '';
}

function EUC_DEV190W_columns_(table){
  return EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent(table)+'/columns',
    null
  ).columns||[];
}

function EUC_DEV190W_records_(table){
  return EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent(table)+'/records',
    null
  ).records||[];
}

function EUC_DEV190W_structure(annee){
  var r =
    typeof EUC_DEV190R_getPageStructure==='function'
      ? EUC_DEV190R_getPageStructure(annee,false)
      : (
          typeof EUC_DEV190Q_getStructure==='function'
            ? {
                classes:(((EUC_DEV190Q_getStructure(annee)||{}).payload||{}).classes||[])
              }
            : {classes:[]}
        );

  return {
    ok:true,
    annee:annee,
    classes:r.classes||[]
  };
}

function EUC_DEV190W_probeClass(annee,classeId,classeNom){
  var table=EUC_DEV190W_findTable_('EUC_ELEVES_PFMP');

  if(!table){
    throw new Error('EUC_ELEVES_PFMP introuvable');
  }

  var cols=EUC_DEV190W_columns_(table);
  var rows=EUC_DEV190W_records_(table);

  var candidates=cols
    .map(function(c){return c.id;})
    .filter(function(id){
      var n=EUC_DEV190W_norm_(id);
      return (
        n.indexOf('CLASSE')>=0 ||
        n.indexOf('CODE')>=0 ||
        n.indexOf('ANNEE')>=0 ||
        n.indexOf('NIVEAU')>=0
      );
    });

  var targetName=EUC_DEV190W_norm_(classeNom);
  var targetId=Number(classeId)||0;

  var byColumn={};

  candidates.forEach(function(col){
    var exactText=0;
    var compactText=0;
    var refId=0;
    var distinct={};

    rows.forEach(function(r){
      var v=(r.fields||{})[col];

      if(v!=null && String(v).trim()!==''){
        distinct[JSON.stringify(v)]=true;
      }

      if(EUC_DEV190W_norm_(v)===targetName){
        exactText++;
      }

      if(
        EUC_DEV190W_norm_(v).replace(/[\s\-_.]/g,'')===
        targetName.replace(/[\s\-_.]/g,'')
      ){
        compactText++;
      }

      if(
        targetId &&
        EUC_DEV190W_refIds_(v).indexOf(targetId)>=0
      ){
        refId++;
      }
    });

    byColumn[col]={
      exactText:exactText,
      compactText:compactText,
      refId:refId,
      sampleDistinct:Object.keys(distinct).slice(0,20).map(function(x){
        try{return JSON.parse(x);}catch(e){return x;}
      })
    };
  });

  var nameCols=cols.map(function(c){return c.id;}).filter(function(id){
    var n=EUC_DEV190W_norm_(id);
    return n==='NOM'||n==='NOMELEVE'||n==='ELEVELNOM';
  });

  var prenomCols=cols.map(function(c){return c.id;}).filter(function(id){
    var n=EUC_DEV190W_norm_(id);
    return n==='PRENOM'||n==='PRENOMELEVE'||n==='ELEVEPRENOM';
  });

  var samples=rows.slice(0,20).map(function(r){
    var f=r.fields||{};
    var out={id:r.id};

    candidates.forEach(function(c){
      if(f[c]!=null && String(f[c]).trim()!=='') out[c]=f[c];
    });

    nameCols.forEach(function(c){ if(f[c]!=null) out[c]=f[c]; });
    prenomCols.forEach(function(c){ if(f[c]!=null) out[c]=f[c]; });

    return out;
  });

  return {
    ok:true,
    table:table,
    totalRows:rows.length,
    columns:cols.map(function(c){
      return {
        id:c.id,
        type:c.type||'',
        label:c.label||''
      };
    }),
    candidates:candidates,
    classRequested:{
      annee:annee,
      id:classeId,
      nom:classeNom
    },
    matchesByColumn:byColumn,
    samples:samples,
    existingLoaders:{
      DEV190U_loadApprentis:typeof EUC_DEV190U_loadApprentis==='function',
      DEV190V1_loadApprentis:typeof EUC_DEV190V1_loadApprentis==='function',
      DEV190U_loadPdif:typeof EUC_DEV190U_loadPdif==='function',
      DEV190V1_loadPdif:typeof EUC_DEV190V1_loadPdif==='function'
    }
  };
}

function EUC_DEV190W_probeExistingLoader(annee,classeId,classeNom){
  var out={};

  try{
    if(typeof EUC_DEV190V1_loadApprentis==='function'){
      out.apprentis=EUC_DEV190V1_loadApprentis(annee,classeId,classeNom);
    }
  }catch(e){
    out.apprentisError=String(e&&e.message||e);
  }

  try{
    if(typeof EUC_DEV190V1_loadPdif==='function'){
      out.pdif=EUC_DEV190V1_loadPdif(annee,classeId,classeNom);
    }
  }catch(e2){
    out.pdifError=String(e2&&e2.message||e2);
  }

  return out;
}

function EUC_DEV190W_afficherAudit(e){
  var ctx=
    typeof EUC_PFMP_contexteAnneeLectureV155_==='function'
      ? EUC_PFMP_contexteAnneeLectureV155_()
      : {active:''};

  var t=HtmlService.createTemplateFromFile('Audit_Apprentis_Pdif_V190W');
  t.bootJson=JSON.stringify({
    annee:(ctx&&ctx.active)||''
  });

  return t.evaluate()
    .setTitle('Audit Apprentis / P.dif')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
