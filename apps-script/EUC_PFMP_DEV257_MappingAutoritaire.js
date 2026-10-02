/**
 * DEV257 — installation définitive des correspondances Pronote.
 *
 * Fonction à exécuter UNE fois :
 *   EUC_DEV257_appliquerDefinitif
 *
 * Elle :
 * - construit/complète EUC_CORRESPONDANCE_CLASSES_PRONOTE pour 2026-2027 ;
 * - déduit les mappings non ambigus à partir des élèves actifs ;
 * - applique des overrides autoritaires pour les BTS ;
 * - corrige les 1TSMV mal rattachés à 1BTS ELEC ;
 * - neutralise leurs doublons stricts ;
 * - ne supprime aucun historique.
 */

function EUC_DEV257_norm_(v){
  return String(v==null?'':v)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/\s+/g,' ');
}

function EUC_DEV257_key_(v){
  return EUC_DEV257_norm_(v).replace(/[^A-Z0-9]/g,'');
}

function EUC_DEV257_refId_(v){
  if(typeof v==='number')return Number(v)||0;
  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++){
      if(typeof v[i]==='number')return Number(v[i])||0;
      if(v[i]&&typeof v[i]==='object'&&v[i].id!==undefined){
        return Number(v[i].id)||0;
      }
    }
  }
  if(v&&typeof v==='object'&&v.id!==undefined){
    return Number(v.id)||0;
  }
  return Number(v)||0;
}

function EUC_DEV257_cols_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/columns',
      null
    ).columns||[]
  );
}

function EUC_DEV257_records_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/records',
      null
    ).records||[]
  );
}

function EUC_DEV257_col_(cols,names){
  var wanted=names.map(EUC_DEV257_key_);
  for(var i=0;i<cols.length;i++){
    if(wanted.indexOf(EUC_DEV257_key_(cols[i].id))>=0){
      return cols[i].id;
    }
  }
  return '';
}

function EUC_DEV257_sourceFromEtab_(v){
  var n=EUC_DEV257_norm_(v);
  if(
    n.indexOf('LGT')>=0 ||
    n.indexOf('GENERAL')>=0 ||
    n.indexOf('TECHNOLOG')>=0
  )return 'LGT';
  return 'LP';
}

function EUC_DEV257_getClasses_(){
  var rows=EUC_DEV257_records_('Classes');
  var cols=EUC_DEV257_cols_('Classes');
  var cNom=EUC_DEV257_col_(cols,['Nom','Libelle','Libellé']);
  var cEtab=EUC_DEV257_col_(cols,['Etab','Etablissement','Établissement']);
  var cActif=EUC_DEV257_col_(cols,['Actif']);

  var out={};

  rows.forEach(function(r){
    var f=r.fields||{};
    if(cActif && f[cActif]===false)return;

    out[Number(r.id)]={
      id:Number(r.id),
      nom:cNom?String(f[cNom]||''):'',
      etab:cEtab?String(f[cEtab]||''):'',
      source:EUC_DEV257_sourceFromEtab_(cEtab?f[cEtab]:'')
    };
  });

  return out;
}

function EUC_DEV257_ensureMappingTable_(){
  if(typeof EUC_CORRESPONDANCE_assurerTable_==='function'){
    return EUC_CORRESPONDANCE_assurerTable_();
  }

  /* La table existe déjà normalement. */
  var tables=(EUC_DEV190_api_('get','/tables',null).tables||[]);
  var ok=tables.some(function(t){
    return t.id==='EUC_CORRESPONDANCE_CLASSES_PRONOTE';
  });

  if(!ok){
    throw new Error(
      'Table EUC_CORRESPONDANCE_CLASSES_PRONOTE absente.'
    );
  }
}

function EUC_DEV257_buildMappings_(){
  var year='2026-2027';
  var classes=EUC_DEV257_getClasses_();

  var rows=EUC_DEV257_records_('EUC_ELEVES_PFMP');
  var cols=EUC_DEV257_cols_('EUC_ELEVES_PFMP');

  var cCode=EUC_DEV257_col_(cols,[
    'Code_classe_importe',
    'Code_classe',
    'Classe_Pronote',
    'ClassePronote'
  ]);
  var cClasse=EUC_DEV257_col_(cols,['Classe','Classe_id','ClasseRef']);
  var cAnnee=EUC_DEV257_col_(cols,['Annee_scolaire','Année_scolaire']);
  var cActif=EUC_DEV257_col_(cols,['Actif']);
  var cPresent=EUC_DEV257_col_(cols,['Present_dernier_import','Présent_dernier_import']);

  if(!cCode||!cClasse){
    throw new Error('Colonnes classe/code Pronote introuvables.');
  }

  var byCode={};

  rows.forEach(function(r){
    var f=r.fields||{};

    if(cActif && f[cActif]===false)return;
    if(cPresent && f[cPresent]===false)return;

    if(cAnnee){
      var yr=EUC_DEV257_refId_(f[cAnnee]);
      if(yr && yr!==1)return; // 2026-2027 = ref 1 dans la base actuelle
    }

    var code=String(f[cCode]||'').trim();
    var cid=EUC_DEV257_refId_(f[cClasse]);

    if(!code||!cid||!classes[cid])return;

    var k=EUC_DEV257_key_(code);
    if(!byCode[k]){
      byCode[k]={
        pronote:code,
        ids:{}
      };
    }
    byCode[k].ids[cid]=true;
  });

  /*
   * Overrides métier autoritaires validés par l'audit global.
   * Ils gagnent toujours sur l'état historique des élèves.
   */
  var overrides={
    '1TSCIEL':49,
    '1TSCPI':41,
    '1TSCPRP':43,
    '1TSELT':47,
    '1TSMV':45,
    '2TSCIEL':50,
    '2TSCPI':42,
    '2TSCPRP':44,
    '2TSELT':48,
    '2TSMV':46
  };

  Object.keys(overrides).forEach(function(k){
    if(!byCode[k]){
      byCode[k]={pronote:k,ids:{}};
    }
    byCode[k].forcedId=overrides[k];
  });

  var mappings=[];
  var ambiguous=[];

  Object.keys(byCode).sort().forEach(function(k){
    var x=byCode[k];
    var ids=Object.keys(x.ids).map(Number);

    var cid=x.forcedId || (ids.length===1 ? ids[0] : 0);

    if(!cid || !classes[cid]){
      ambiguous.push({
        pronote:x.pronote,
        ids:ids
      });
      return;
    }

    mappings.push({
      annee:year,
      source:classes[cid].source,
      pronote:x.pronote,
      classeId:cid,
      classeNom:classes[cid].nom
    });
  });

  return {
    mappings:mappings,
    ambiguous:ambiguous
  };
}

function EUC_DEV257_upsertMappings_(){
  EUC_DEV257_ensureMappingTable_();

  var build=EUC_DEV257_buildMappings_();

  if(build.ambiguous.length){
    throw new Error(
      'Correspondances ambiguës restantes : '+
      JSON.stringify(build.ambiguous)
    );
  }

  var table='EUC_CORRESPONDANCE_CLASSES_PRONOTE';
  var existing=EUC_DEV257_records_(table);

  var index={};
  existing.forEach(function(r){
    var f=r.fields||{};
    var key=[
      String(f.Annee_scolaire||'').trim(),
      String(f.Source_Pronote||'').trim().toUpperCase(),
      EUC_DEV257_key_(f.Nom_classe_Pronote||'')
    ].join('|');

    index[key]=r;
  });

  var now=new Date().toISOString();
  var posts=[];
  var patches=[];

  build.mappings.forEach(function(m){
    var key=[
      m.annee,
      m.source,
      EUC_DEV257_key_(m.pronote)
    ].join('|');

    var fields={
      Annee_scolaire:m.annee,
      Source_Pronote:m.source,
      Nom_classe_Pronote:m.pronote,
      Classe_Grist:m.classeId,
      Classe_Grist_nom:m.classeNom,
      Exclure_import:false,
      Actif:true,
      Date_modification:now,
      Commentaire:'DEV257 - mapping autoritaire Pronote -> PFMP'
    };

    if(index[key]){
      patches.push({
        id:index[key].id,
        fields:fields
      });
    }else{
      fields.Date_creation=now;
      posts.push({fields:fields});
    }
  });

  /*
   * Grist PATCH : tous les enregistrements ont ici exactement
   * le même jeu de champs.
   */
  if(patches.length){
    EUC_DEV190_api_(
      'patch',
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:patches}
    );
  }

  if(posts.length){
    EUC_DEV190_api_(
      'post',
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:posts}
    );
  }

  return {
    ok:true,
    total:build.mappings.length,
    updated:patches.length,
    created:posts.length
  };
}

function EUC_DEV257_repairCurrent1BTS_(){
  var table='EUC_ELEVES_PFMP';
  var rows=EUC_DEV257_records_(table);
  var cols=EUC_DEV257_cols_(table);

  var cCode=EUC_DEV257_col_(cols,['Code_classe_importe']);
  var cClasse=EUC_DEV257_col_(cols,['Classe']);
  var cAnnee=EUC_DEV257_col_(cols,['Annee_scolaire']);
  var cNom=EUC_DEV257_col_(cols,['Nom']);
  var cPrenom=EUC_DEV257_col_(cols,['Prenom','Prénom']);
  var cActif=EUC_DEV257_col_(cols,['Actif']);
  var cPresent=EUC_DEV257_col_(cols,['Present_dernier_import']);

  var group={};

  rows.forEach(function(r){
    var f=r.fields||{};

    if(EUC_DEV257_key_(f[cCode])!=='1TSMV')return;
    if(EUC_DEV257_refId_(f[cAnnee])!==1)return;
    if(cActif && f[cActif]===false)return;

    var key=
      EUC_DEV257_norm_(f[cNom])+'|'+
      EUC_DEV257_norm_(f[cPrenom]);

    if(!group[key])group[key]=[];
    group[key].push(r);
  });

  var keep=[];
  var dup=[];

  Object.keys(group).forEach(function(k){
    var arr=group[k].slice().sort(function(a,b){
      return Number(a.id)-Number(b.id);
    });

    keep.push(arr[0]);
    for(var i=1;i<arr.length;i++)dup.push(arr[i]);
  });

  var move=keep.map(function(r){
    var fields={};
    fields[cClasse]=45;
    if(cActif)fields[cActif]=true;
    if(cPresent)fields[cPresent]=true;
    return {id:r.id,fields:fields};
  });

  var disable=dup.map(function(r){
    var fields={};
    if(cActif)fields[cActif]=false;
    if(cPresent)fields[cPresent]=false;
    return {id:r.id,fields:fields};
  });

  if(move.length){
    EUC_DEV190_api_(
      'patch',
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:move}
    );
  }

  if(disable.length){
    EUC_DEV190_api_(
      'patch',
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:disable}
    );
  }

  return {
    moved:move.length,
    duplicatesDisabled:disable.length
  };
}

function EUC_DEV257_appliquerDefinitif(){
  var repair=EUC_DEV257_repairCurrent1BTS_();
  var mappings=EUC_DEV257_upsertMappings_();

  /*
   * Invalidation simple des snapshots DEV208 :
   * DEV255 reconstruira à la prochaine ouverture.
   */
  try{
    var snapTable='EUC_APPRENTISSAGE_CLASS_SNAPSHOT';
    var rows=EUC_DEV257_records_(snapTable);
    var cols=EUC_DEV257_cols_(snapTable);

    var cClasse=EUC_DEV257_col_(cols,['Classe_id','Classe','ClasseId']);
    var cPayload=EUC_DEV257_col_(cols,['Payload_JSON']);

    var patches=[];

    rows.forEach(function(r){
      var f=r.fields||{};
      var cid=cClasse?Number(f[cClasse]||0):0;

      if(cid===45||cid===47||cid===49){
        var fields={};
        if(cPayload){
          fields[cPayload]=JSON.stringify({
            filterVersion:'INVALIDATED_BY_DEV257',
            students:[]
          });
        }

        if(Object.keys(fields).length){
          patches.push({
            id:r.id,
            fields:fields
          });
        }
      }
    });

    if(patches.length){
      EUC_DEV190_api_(
        'patch',
        '/tables/'+encodeURIComponent(snapTable)+'/records',
        {records:patches}
      );
    }
  }catch(e){}

  var result={
    ok:true,
    currentData:repair,
    mappings:mappings,
    rule:'EXPLICIT_MAPPING_ONLY'
  };

  console.log(JSON.stringify(result,null,2));
  Logger.log(JSON.stringify(result,null,2));

  return result;
}
