/**
 * DEV256 — correction ciblée 1BTS MV / 1BTS ELEC
 *
 * Constat audit :
 * - ID 45 = 1BTS MV
 * - ID 47 = 1BTS ELEC
 * - 1TSELT doit rester en 47
 * - 1TSMV a été rattaché à 47
 * - certains 1TSMV sont présents en doublon strict
 *
 * La fonction d'application :
 * 1) travaille uniquement sur 2026-2027 / Annee_scolaire ref=1
 * 2) sélectionne uniquement les 1TSMV actuellement en classe 47
 * 3) groupe par NOM+PRENOM+CODE
 * 4) conserve un seul exemplaire par élève
 * 5) rattache l'exemplaire conservé à la classe 45
 * 6) désactive les doublons surnuméraires (Actif=false,
 *    Present_dernier_import=false si colonnes présentes)
 * 7) invalide les snapshots DEV208 des classes 45 et 47
 */

function EUC_DEV256_norm_(v){
  return String(v==null?'':v)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/\s+/g,' ');
}

function EUC_DEV256_refId_(v){
  if(typeof v==='number')return Number(v)||0;

  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++){
      if(typeof v[i]==='number')return Number(v[i])||0;
      if(v[i] && typeof v[i]==='object' && v[i].id!==undefined){
        return Number(v[i].id)||0;
      }
    }
  }

  if(v && typeof v==='object' && v.id!==undefined){
    return Number(v.id)||0;
  }

  return Number(v)||0;
}

function EUC_DEV256_cols_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/columns',
      null
    ).columns||[]
  );
}

function EUC_DEV256_records_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/records',
      null
    ).records||[]
  );
}

function EUC_DEV256_col_(cols,names){
  var wanted=names.map(function(v){
    return EUC_DEV256_norm_(v).replace(/[^A-Z0-9]/g,'');
  });

  for(var i=0;i<cols.length;i++){
    var n=EUC_DEV256_norm_(cols[i].id).replace(/[^A-Z0-9]/g,'');
    if(wanted.indexOf(n)>=0)return cols[i].id;
  }

  return '';
}

function EUC_DEV256_scan(){
  var table='EUC_ELEVES_PFMP';
  var cols=EUC_DEV256_cols_(table);
  var rows=EUC_DEV256_records_(table);

  var cCode=EUC_DEV256_col_(cols,[
    'Code_classe_importe',
    'Code_classe',
    'Classe_Pronote',
    'ClassePronote'
  ]);

  var cClasse=EUC_DEV256_col_(cols,[
    'Classe',
    'Classe_id',
    'ClasseRef'
  ]);

  var cNom=EUC_DEV256_col_(cols,['Nom']);
  var cPrenom=EUC_DEV256_col_(cols,['Prenom','Prénom']);
  var cAnnee=EUC_DEV256_col_(cols,[
    'Annee_scolaire',
    'Année_scolaire'
  ]);
  var cActif=EUC_DEV256_col_(cols,['Actif']);
  var cPresent=EUC_DEV256_col_(cols,[
    'Present_dernier_import',
    'Présent_dernier_import'
  ]);

  if(!cCode || !cClasse){
    throw new Error(
      'Colonnes Code_classe_importe / Classe introuvables.'
    );
  }

  var candidates=[];

  rows.forEach(function(r){
    var f=r.fields||{};

    var code=EUC_DEV256_norm_(f[cCode]).replace(/\s+/g,'');
    var classe=EUC_DEV256_refId_(f[cClasse]);
    var annee=cAnnee ? EUC_DEV256_refId_(f[cAnnee]) : 0;

    if(code!=='1TSMV')return;
    if(classe!==47)return;

    /* Audit 2026-2027 : Annee_scolaire = ref 1 */
    if(cAnnee && annee!==1)return;

    candidates.push({
      id:Number(r.id),
      nom:cNom?String(f[cNom]||''):'',
      prenom:cPrenom?String(f[cPrenom]||''):'',
      code:code,
      actif:cActif ? f[cActif]!==false : true,
      present:cPresent ? f[cPresent]!==false : true
    });
  });

  var groups={};

  candidates.forEach(function(x){
    var key=
      EUC_DEV256_norm_(x.nom)+'|'+
      EUC_DEV256_norm_(x.prenom)+'|'+
      x.code;

    if(!groups[key])groups[key]=[];
    groups[key].push(x);
  });

  var keep=[];
  var duplicates=[];

  Object.keys(groups).forEach(function(k){
    var arr=groups[k];

    /*
     * On garde le plus petit ID :
     * c'est l'enregistrement historique le plus ancien.
     * Les doublons observés par l'audit ont des IDs plus récents.
     */
    arr.sort(function(a,b){
      return a.id-b.id;
    });

    keep.push(arr[0]);

    for(var i=1;i<arr.length;i++){
      duplicates.push(arr[i]);
    }
  });

  return {
    ok:true,
    totalCandidates:candidates.length,
    uniqueStudents:keep.length,
    duplicateRows:duplicates.length,
    keep:keep,
    duplicates:duplicates,
    columns:{
      classe:cClasse,
      actif:cActif,
      present:cPresent
    }
  };
}

function EUC_DEV256_apply(){
  var scan=EUC_DEV256_scan();

  var table='EUC_ELEVES_PFMP';
  var cClasse=scan.columns.classe;
  var cActif=scan.columns.actif;
  var cPresent=scan.columns.present;

  var keepPatches=[];
  var duplicatePatches=[];

  scan.keep.forEach(function(x){
    var fields={};
    fields[cClasse]=45;

    if(cActif)fields[cActif]=true;
    if(cPresent)fields[cPresent]=true;

    keepPatches.push({
      id:x.id,
      fields:fields
    });
  });

  scan.duplicates.forEach(function(x){
    var fields={};

    /*
     * On laisse la référence historique telle quelle
     * et on neutralise uniquement la ligne surnuméraire.
     */
    if(cActif)fields[cActif]=false;
    if(cPresent)fields[cPresent]=false;

    duplicatePatches.push({
      id:x.id,
      fields:fields
    });
  });

  /*
   * DEV256C
   * Grist impose que tous les records d'un même PATCH
   * contiennent exactement le même jeu de champs.
   * On sépare donc les élèves conservés et les doublons.
   */
  if(keepPatches.length){
    EUC_DEV190_api_(
      'patch',
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:keepPatches}
    );
  }

  if(duplicatePatches.length){
    EUC_DEV190_api_(
      'patch',
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:duplicatePatches}
    );
  }

  /*
   * Invalidation des snapshots DEV208 pour 1BTS MV / 1BTS ELEC.
   * Le prochain chargement les reconstruira avec DEV255.
   */
  try{
    var snapTable='EUC_APPRENTISSAGE_CLASS_SNAPSHOT';
    var rows=EUC_DEV256_records_(snapTable);

    var sCols=EUC_DEV256_cols_(snapTable);
    var cClasseSnap=EUC_DEV256_col_(sCols,[
      'Classe_id',
      'Classe',
      'ClasseId'
    ]);
    var cAnneeSnap=EUC_DEV256_col_(sCols,[
      'Annee_scolaire',
      'Année_scolaire'
    ]);
    var cActifSnap=EUC_DEV256_col_(sCols,['Actif']);

    var snapPatches=[];

    rows.forEach(function(r){
      var f=r.fields||{};
      var cid=cClasseSnap
        ? Number(f[cClasseSnap]||0)
        : 0;
      var yr=cAnneeSnap
        ? String(f[cAnneeSnap]||'')
        : '';

      if(
        (cid===45 || cid===47) &&
        (!yr || yr==='2026-2027')
      ){
        var sf={};

        if(cActifSnap)sf[cActifSnap]=false;

        /*
         * Si pas de colonne Actif, on corrompt seulement la version
         * pour forcer DEV255 à rebâtir.
         */
        var cPayload=EUC_DEV256_col_(sCols,['Payload_JSON']);
        if(cPayload){
          sf[cPayload]=JSON.stringify({
            filterVersion:'INVALIDATED_BY_DEV256',
            students:[]
          });
        }

        if(Object.keys(sf).length){
          snapPatches.push({
            id:r.id,
            fields:sf
          });
        }
      }
    });

    if(snapPatches.length){
      EUC_DEV190_api_(
        'patch',
        '/tables/'+encodeURIComponent(snapTable)+'/records',
        {records:snapPatches}
      );
    }
  }catch(e){
    /* Pas bloquant : DEV255 sait invalider les anciens payloads. */
  }

  return {
    ok:true,
    movedTo1BTSMV:scan.keep.length,
    duplicatesDisabled:scan.duplicates.length,
    expected1BTSELEC:25,
    expected1BTSMV:scan.keep.length,
    patchMode:'DEV256C_HOMOGENEOUS_BATCHES'
  };
}


function EUC_DEV256_scan_log() {
  var r = EUC_DEV256_scan();

  var resume = {
    totalCandidates: r.totalCandidates,
    uniqueStudents: r.uniqueStudents,
    duplicateRows: r.duplicateRows,
    keep: r.keep,
    duplicates: r.duplicates
  };

  console.log(JSON.stringify(resume, null, 2));
  Logger.log(JSON.stringify(resume, null, 2));

  return resume;
}
