/** DEV.190U — modules propres, sans auto-chargement historique */

function EUC_DEV190U_txt_(v){ return String(v==null?'':v).trim(); }
function EUC_DEV190U_norm_(v){
  return EUC_DEV190U_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}
function EUC_DEV190U_refId_(v){
  if (typeof v === 'number') return v;
  if (Array.isArray(v)) {
    for (var i=0;i<v.length;i++) {
      if (typeof v[i] === 'number') return v[i];
    }
  }
  var n=Number(v);
  return isFinite(n)?n:0;
}
function EUC_DEV190U_currentYear_(){
  var d=new Date(), y=d.getFullYear();
  return d.getMonth()>=8 ? y+'-'+(y+1) : (y-1)+'-'+y;
}
function EUC_DEV190U_tables_(){
  return (EUC_DEV190_api_('get','/tables',null).tables||[]);
}
function EUC_DEV190U_findTable_(names){
  var want=names.map(EUC_DEV190U_norm_);
  var tables=EUC_DEV190U_tables_();

  for(var i=0;i<tables.length;i++){
    if(want.indexOf(EUC_DEV190U_norm_(tables[i].id))>=0){
      return tables[i].id;
    }
  }
  return '';
}
function EUC_DEV190U_columns_(table){
  return (EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent(table)+'/columns',
    null
  ).columns||[]);
}
function EUC_DEV190U_col_(cols,names){
  var want=names.map(EUC_DEV190U_norm_);
  for(var i=0;i<cols.length;i++){
    if(want.indexOf(EUC_DEV190U_norm_(cols[i].id))>=0){
      return cols[i].id;
    }
  }
  return '';
}
function EUC_DEV190U_records_(table){
  return (EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent(table)+'/records',
    null
  ).records||[]);
}
function EUC_DEV190U_ensureCols_(table,wanted){
  var cols=EUC_DEV190U_columns_(table);
  var have={};
  cols.forEach(function(c){have[c.id]=true;});

  var missing=wanted.filter(function(c){return !have[c.id];});

  if(missing.length){
    EUC_DEV190_api_(
      'post',
      '/tables/'+encodeURIComponent(table)+'/columns',
      {columns:missing}
    );
  }
}
function EUC_DEV190U_years_(){
  if(typeof EUC_DEV190R_getYears==='function'){
    var r=EUC_DEV190R_getYears();
    var years=r.annees||[];
    var cur=EUC_DEV190U_currentYear_();
    if(years.indexOf(cur)<0) years.unshift(cur);
    return {current:cur, years:years};
  }
  return {current:EUC_DEV190U_currentYear_(), years:[EUC_DEV190U_currentYear_()]};
}
function EUC_DEV190U_structure_(annee,terminalOnly){
  var r;
  if(typeof EUC_DEV190R_getPageStructure==='function'){
    r=EUC_DEV190R_getPageStructure(annee,!!terminalOnly);
    return r.classes||[];
  }
  if(typeof EUC_DEV190Q_getStructure==='function'){
    r=EUC_DEV190Q_getStructure(annee);
    return terminalOnly
      ? (((r||{}).payload||{}).terminales||[])
      : (((r||{}).payload||{}).classes||[]);
  }
  throw new Error('DEV190U : snapshot structure indisponible.');
}

function EUC_DEV190U_findStudents_(annee,classeId){
  var table=EUC_DEV190U_findTable_(['EUC_ELEVES_PFMP']);
  if(!table) throw new Error('DEV190U : table EUC_ELEVES_PFMP introuvable.');

  var cols=EUC_DEV190U_columns_(table);

  var cNom=EUC_DEV190U_col_(cols,['Nom','Nom_eleve','Eleve_nom']);
  var cPrenom=EUC_DEV190U_col_(cols,['Prenom','Prénom','Prenom_eleve','Eleve_prenom']);
  var cClasse=EUC_DEV190U_col_(cols,['Classe','Classe_id','ClasseRef']);
  var cYear=EUC_DEV190U_col_(cols,['Annee_scolaire','Année_scolaire','Annee','Année']);

  if(!cClasse) throw new Error('DEV190U : colonne Classe introuvable dans EUC_ELEVES_PFMP.');

  return EUC_DEV190U_records_(table)
    .filter(function(r){
      var f=r.fields||{};
      if(EUC_DEV190U_refId_(f[cClasse])!==Number(classeId)) return false;
      if(cYear && EUC_DEV190U_txt_(f[cYear]) && EUC_DEV190U_txt_(f[cYear])!==annee) return false;
      return true;
    })
    .map(function(r){
      var f=r.fields||{};
      return {
        id:r.id,
        nom:cNom?EUC_DEV190U_txt_(f[cNom]):'',
        prenom:cPrenom?EUC_DEV190U_txt_(f[cPrenom]):''
      };
    })
    .sort(function(a,b){
      return (a.nom+' '+a.prenom).localeCompare(b.nom+' '+b.prenom,'fr');
    });
}

function EUC_DEV190U_mapApprentissage_(){
  var table=EUC_DEV190U_findTable_(['EUC_APPRENTISSAGE_PFMP']);
  if(!table) return {table:'', map:{}};

  var cols=EUC_DEV190U_columns_(table);
  var cEleve=EUC_DEV190U_col_(cols,['Eleve','Élève','Eleve_id']);
  var cUpdated=EUC_DEV190U_col_(cols,['Updated_at','Date_modification','Modifie_le']);

  var rows=EUC_DEV190U_records_(table)
    .sort(function(a,b){
      var fa=a.fields||{}, fb=b.fields||{};
      return (Date.parse(fb[cUpdated]||'')||0)-(Date.parse(fa[cUpdated]||'')||0);
    });

  var map={};

  rows.forEach(function(r){
    var f=r.fields||{};
    var id=EUC_DEV190U_refId_(f[cEleve]);
    if(id && !map[id]) map[id]={id:r.id,fields:f};
  });

  return {table:table, cols:cols, map:map};
}

function EUC_DEV190U_mapPdif_(annee){
  var table=EUC_DEV190U_findTable_(['EUC_PARCOURS_DIFFERENCIE_PFMP']);
  if(!table) return {table:'', map:{}};

  var cols=EUC_DEV190U_columns_(table);
  var cEleve=EUC_DEV190U_col_(cols,['Eleve','Élève','Eleve_id']);
  var cYear=EUC_DEV190U_col_(cols,['Annee_scolaire','Année_scolaire','Annee','Année']);

  var map={};

  EUC_DEV190U_records_(table).forEach(function(r){
    var f=r.fields||{};
    if(cYear && EUC_DEV190U_txt_(f[cYear])!==annee) return;
    var id=EUC_DEV190U_refId_(f[cEleve]);
    if(id) map[id]={id:r.id,fields:f};
  });

  return {table:table, cols:cols, map:map};
}

function EUC_DEV190U_pickField_(f,names){
  var keys=Object.keys(f||{});
  var wanted=names.map(EUC_DEV190U_norm_);

  for(var i=0;i<keys.length;i++){
    if(wanted.indexOf(EUC_DEV190U_norm_(keys[i]))>=0){
      var v=f[keys[i]];
      if(v!=null && String(v).trim()!=='') return String(v).trim();
    }
  }
  return '';
}
function EUC_DEV190U_pickBool_(f,names){
  var keys=Object.keys(f||{});
  var wanted=names.map(EUC_DEV190U_norm_);

  for(var i=0;i<keys.length;i++){
    if(wanted.indexOf(EUC_DEV190U_norm_(keys[i]))>=0){
      return !!f[keys[i]];
    }
  }
  return false;
}

function EUC_DEV190U_loadApprentis(annee,classeId){
  var students=EUC_DEV190U_findStudents_(annee,classeId);
  var app=EUC_DEV190U_mapApprentissage_();

  return {
    ok:true,
    students:students.map(function(s){
      var r=app.map[s.id];
      var f=r?r.fields:{};

      return {
        id:s.id,
        nom:s.nom,
        prenom:s.prenom,
        apprenti:EUC_DEV190U_pickBool_(f,['Actif','Apprenti']),
        debut:EUC_DEV190U_pickField_(f,['Date_debut','Debut']),
        fin:EUC_DEV190U_pickField_(f,['Date_fin','Fin']),
        siret:EUC_DEV190U_pickField_(f,['SIRET']),
        entreprise:EUC_DEV190U_pickField_(f,['Entreprise']),
        adresse:EUC_DEV190U_pickField_(f,['Adresse_entreprise','Adresse']),
        cp:EUC_DEV190U_pickField_(f,['Code_postal','CodePostal','CP']),
        ville:EUC_DEV190U_pickField_(f,['Ville']),
        telEntreprise:EUC_DEV190U_pickField_(f,['Entreprise_telephone','Telephone_entreprise']),
        mailEntreprise:EUC_DEV190U_pickField_(f,['Entreprise_courriel','Courriel_entreprise']),
        tuteur:EUC_DEV190U_pickField_(f,['Tuteur_nom','Tuteur']),
        telTuteur:EUC_DEV190U_pickField_(f,['Tuteur_telephone','Telephone_tuteur']),
        mailTuteur:EUC_DEV190U_pickField_(f,['Tuteur_courriel','Courriel_tuteur'])
      };
    })
  };
}

function EUC_DEV190U_loadPdif(annee,classeId){
  var students=EUC_DEV190U_findStudents_(annee,classeId);
  var pd=EUC_DEV190U_mapPdif_(annee);

  return {
    ok:true,
    students:students.map(function(s){
      var r=pd.map[s.id];
      var f=r?r.fields:{};

      return {
        id:s.id,
        nom:s.nom,
        prenom:s.prenom,
        selected:EUC_DEV190U_pickBool_(f,['Parcours_differencie','Parcours_différencié','Actif']),
        remarque:EUC_DEV190U_pickField_(f,['Remarque','Commentaire'])
      };
    })
  };
}

function EUC_DEV190U_ensureApprTable_(){
  var table=EUC_DEV190U_findTable_(['EUC_APPRENTISSAGE_PFMP']);
  if(!table) throw new Error('DEV190U : table EUC_APPRENTISSAGE_PFMP introuvable.');

  EUC_DEV190U_ensureCols_(table,[
    {id:'SIRET',type:'Text'},
    {id:'Adresse_entreprise',type:'Text'},
    {id:'Code_postal',type:'Text'},
    {id:'Ville',type:'Text'},
    {id:'Entreprise_telephone',type:'Text'},
    {id:'Entreprise_courriel',type:'Text'}
  ]);

  return table;
}

function EUC_DEV190U_saveApprenti(p){
  p=p||{};
  var table=EUC_DEV190U_ensureApprTable_();
  var cols=EUC_DEV190U_columns_(table);

  var cEleve=EUC_DEV190U_col_(cols,['Eleve','Élève','Eleve_id']);
  if(!cEleve) throw new Error('DEV190U : colonne Eleve introuvable.');

  function col(names){ return EUC_DEV190U_col_(cols,names); }

  var fields={};
  fields[cEleve]=Number(p.eleveId);

  var map=[
    [col(['Date_debut','Debut']),p.debut],
    [col(['Date_fin','Fin']),p.fin],
    [col(['SIRET']),p.siret],
    [col(['Entreprise']),p.entreprise],
    [col(['Adresse_entreprise','Adresse']),p.adresse],
    [col(['Code_postal','CodePostal','CP']),p.cp],
    [col(['Ville']),p.ville],
    [col(['Entreprise_telephone','Telephone_entreprise']),p.telEntreprise],
    [col(['Entreprise_courriel','Courriel_entreprise']),p.mailEntreprise],
    [col(['Tuteur_nom','Tuteur']),p.tuteur],
    [col(['Tuteur_telephone','Telephone_tuteur']),p.telTuteur],
    [col(['Tuteur_courriel','Courriel_tuteur']),p.mailTuteur],
    [col(['Actif','Apprenti']),!!p.apprenti]
  ];

  map.forEach(function(x){
    if(x[0]) fields[x[0]]=x[1];
  });

  var existing=EUC_DEV190U_records_(table).filter(function(r){
    return EUC_DEV190U_refId_((r.fields||{})[cEleve])===Number(p.eleveId);
  });

  if(existing.length){
    EUC_DEV190_api_(
      'patch',
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:[{id:existing[0].id,fields:fields}]}
    );
  }else{
    EUC_DEV190_api_(
      'post',
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:[{fields:fields}]}
    );
  }

  return {ok:true};
}

function EUC_DEV190U_savePdif(p){
  p=p||{};
  var table=EUC_DEV190U_findTable_(['EUC_PARCOURS_DIFFERENCIE_PFMP']);
  if(!table) throw new Error('DEV190U : table EUC_PARCOURS_DIFFERENCIE_PFMP introuvable.');

  var cols=EUC_DEV190U_columns_(table);

  var cEleve=EUC_DEV190U_col_(cols,['Eleve','Élève','Eleve_id']);
  var cYear=EUC_DEV190U_col_(cols,['Annee_scolaire','Année_scolaire']);
  var cFlag=EUC_DEV190U_col_(cols,['Parcours_differencie','Parcours_différencié','Actif']);
  var cRem=EUC_DEV190U_col_(cols,['Remarque','Commentaire']);

  var fields={};
  if(cEleve) fields[cEleve]=Number(p.eleveId);
  if(cYear) fields[cYear]=p.annee;
  if(cFlag) fields[cFlag]=!!p.selected;
  if(cRem) fields[cRem]=p.remarque||'';

  var existing=EUC_DEV190U_records_(table).filter(function(r){
    var f=r.fields||{};
    return (
      EUC_DEV190U_refId_(f[cEleve])===Number(p.eleveId) &&
      (!cYear || EUC_DEV190U_txt_(f[cYear])===p.annee)
    );
  });

  if(existing.length){
    EUC_DEV190_api_(
      'patch',
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:[{id:existing[0].id,fields:fields}]}
    );
  }else{
    EUC_DEV190_api_(
      'post',
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:[{fields:fields}]}
    );
  }

  return {ok:true};
}

function EUC_DEV190U_lookupSiret(siret){
  if(typeof EUC_DEV190S1_lookupSiret==='function'){
    return EUC_DEV190S1_lookupSiret(siret);
  }
  if(typeof EUC_DEV190Q_lookupEntrepriseSiret==='function'){
    return EUC_DEV190Q_lookupEntrepriseSiret(siret);
  }
  throw new Error('DEV190U : recherche SIRET indisponible.');
}

function EUC_DEV190U_afficherApprentis(e){
  var years=EUC_DEV190U_years_();
  var classes=EUC_DEV190U_structure_(years.current,false);

  var t=HtmlService.createTemplateFromFile('Apprentissage_PFMP_V190U');
  t.bootJson=JSON.stringify({
    currentYear:years.current,
    years:years.years,
    classes:classes
  });

  return t.evaluate()
    .setTitle('Gestion des apprentis')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV190U_afficherPdif(e){
  var years=EUC_DEV190U_years_();
  var classes=EUC_DEV190U_structure_(years.current,true);

  var t=HtmlService.createTemplateFromFile('Parcours_Differencie_PFMP_V190U');
  t.bootJson=JSON.stringify({
    currentYear:years.current,
    years:years.years,
    classes:classes
  });

  return t.evaluate()
    .setTitle('Parcours différencié')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
