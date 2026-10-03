function EUC_DEV190V1_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV190V1_norm_(v){
  return EUC_DEV190V1_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/\s+/g,' ')
    .trim();
}
function EUC_DEV190V1_table_(){
  var tables=EUC_DEV190_api_('get','/tables',null).tables||[];
  for(var i=0;i<tables.length;i++){
    if(EUC_DEV190V1_norm_(tables[i].id)===EUC_DEV190V1_norm_('EUC_ELEVES_PFMP')){
      return tables[i].id;
    }
  }
  throw new Error('DEV190V1 : table EUC_ELEVES_PFMP introuvable.');
}
function EUC_DEV190V1_columns_(table){
  return EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent(table)+'/columns',
    null
  ).columns||[];
}
function EUC_DEV190V1_records_(table){
  return EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent(table)+'/records',
    null
  ).records||[];
}
function EUC_DEV190V1_col_(cols,names){
  var wanted=names.map(EUC_DEV190V1_norm_);
  for(var i=0;i<cols.length;i++){
    if(wanted.indexOf(EUC_DEV190V1_norm_(cols[i].id))>=0){
      return cols[i].id;
    }
  }
  return '';
}
function EUC_DEV190V1_refIds_(v){
  var out=[];
  function add(x){
    var n=Number(x);
    if(isFinite(n)&&String(x).trim()!=='')out.push(n);
  }
  if(Array.isArray(v)){v.forEach(add);}else{add(v);}
  return out;
}
function EUC_DEV190V1_findStudents(annee,classeId,classeNom){
  var table=EUC_DEV190V1_table_();
  var cols=EUC_DEV190V1_columns_(table);
  var rows=EUC_DEV190V1_records_(table);

  var cCode=EUC_DEV190V1_col_(cols,[
    'Code_classe_importe',
    'Code classe importe',
    'Code_classe',
    'Classe_Pronote',
    'ClassePronote'
  ]);

  var cClasse=EUC_DEV190V1_col_(cols,[
    'Classe','Classe_id','ClasseRef'
  ]);

  var cNom=EUC_DEV190V1_col_(cols,[
    'Nom','Nom_eleve','Eleve_nom'
  ]);

  var cPrenom=EUC_DEV190V1_col_(cols,[
    'Prenom','Prénom','Prenom_eleve','Eleve_prenom'
  ]);

  var cAnnee=EUC_DEV190V1_col_(cols,[
    'Annee_scolaire','Année_scolaire','Annee','Année'
  ]);

  var target=EUC_DEV190V1_norm_(classeNom);

  var matched=rows.filter(function(r){
    var f=r.fields||{};
    var ok=false;

    if(cCode){
      ok=EUC_DEV190V1_norm_(f[cCode])===target;
    }

    if(!ok&&cClasse){
      ok=EUC_DEV190V1_refIds_(f[cClasse]).indexOf(Number(classeId))>=0;
    }

    if(!ok)return false;

    if(
      cAnnee &&
      EUC_DEV190V1_txt_(f[cAnnee]) &&
      EUC_DEV190V1_txt_(f[cAnnee])!==EUC_DEV190V1_txt_(annee)
    ){
      return false;
    }

    return true;
  });

  if(!matched.length&&cCode){
    var compact=target.replace(/[\s\-_.]/g,'');
    matched=rows.filter(function(r){
      var f=r.fields||{};
      return EUC_DEV190V1_norm_(f[cCode]).replace(/[\s\-_.]/g,'')===compact;
    });
  }

  var students=matched.map(function(r){
    var f=r.fields||{};
    return {
      id:r.id,
      nom:cNom?EUC_DEV190V1_txt_(f[cNom]):'',
      prenom:cPrenom?EUC_DEV190V1_txt_(f[cPrenom]):''
    };
  });

  students.sort(function(a,b){
    return (a.nom+' '+a.prenom).localeCompare(b.nom+' '+b.prenom,'fr');
  });

  return {
    ok:true,
    students:students,
    debug:{
      table:table,
      codeClasseColumn:cCode||'',
      classeId:Number(classeId),
      classeNom:classeNom||'',
      totalRows:rows.length,
      matchedRows:students.length
    }
  };
}

function EUC_DEV190V1_loadApprentis(annee,classeId,classeNom){
  var base=EUC_DEV190V1_findStudents(annee,classeId,classeNom);
  var app=typeof EUC_DEV190U_mapApprentissage_==='function'
    ? EUC_DEV190U_mapApprentissage_()
    : {map:{}};

  base.students=base.students.map(function(s){
    var r=app.map[s.id];
    var f=r?r.fields:{};

    function pick(names){
      return typeof EUC_DEV190U_pickField_==='function'
        ? EUC_DEV190U_pickField_(f,names)
        : '';
    }
    function pickBool(names){
      return typeof EUC_DEV190U_pickBool_==='function'
        ? EUC_DEV190U_pickBool_(f,names)
        : false;
    }

    return {
      id:s.id,
      nom:s.nom,
      prenom:s.prenom,
      apprenti:pickBool(['Actif','Apprenti']),
      debut:pick(['Date_debut','Debut']),
      fin:pick(['Date_fin','Fin']),
      siret:pick(['SIRET']),
      entreprise:pick(['Entreprise']),
      adresse:pick(['Adresse_entreprise','Adresse']),
      cp:pick(['Code_postal','CodePostal','CP']),
      ville:pick(['Ville']),
      telEntreprise:pick(['Entreprise_telephone','Telephone_entreprise']),
      mailEntreprise:pick(['Entreprise_courriel','Courriel_entreprise']),
      responsableEntreprise:pick(['Responsable_nom','Responsable']),
      tuteur:pick(['Tuteur_nom','Tuteur']),
      telTuteur:pick(['Tuteur_telephone','Telephone_tuteur']),
      mailTuteur:pick(['Tuteur_courriel','Courriel_tuteur'])
    };
  });

  return base;
}

function EUC_DEV190V1_loadPdif(annee,classeId,classeNom){
  var base=EUC_DEV190V1_findStudents(annee,classeId,classeNom);
  var pd=typeof EUC_DEV190U_mapPdif_==='function'
    ? EUC_DEV190U_mapPdif_(annee)
    : {map:{}};

  base.students=base.students.map(function(s){
    var r=pd.map[s.id];
    var f=r?r.fields:{};

    return {
      id:s.id,
      nom:s.nom,
      prenom:s.prenom,
      selected:typeof EUC_DEV190U_pickBool_==='function'
        ? EUC_DEV190U_pickBool_(f,['Parcours_differencie','Parcours_différencié','Actif'])
        : false,
      remarque:typeof EUC_DEV190U_pickField_==='function'
        ? EUC_DEV190U_pickField_(f,['Remarque','Commentaire'])
        : ''
    };
  });

  return base;
}
