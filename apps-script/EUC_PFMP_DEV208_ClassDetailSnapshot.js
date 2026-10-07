var EUC_DEV208_CLASS_SNAPSHOT_TABLE_='EUC_PFMP_ELEVES_CLASSE_DETAIL_SNAPSHOT';
var EUC_DEV208_APP_TABLE_='EUC_APPRENTISSAGE_PFMP';

function EUC_DEV208_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV208_norm_(v){
  return EUC_DEV208_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}
function EUC_DEV208_refId_(v){
  if(typeof v==='number')return v;
  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++){
      if(typeof v[i]==='number')return v[i];
    }
  }
  return Number(v)||0;
}
function EUC_DEV208_tables_(){
  return (EUC_DEV190_api_('get','/tables',null).tables||[]);
}
function EUC_DEV208_cols_(table){
  return (EUC_DEV190_api_('get','/tables/'+encodeURIComponent(table)+'/columns',null).columns||[]);
}
function EUC_DEV208_records_(table){
  return (EUC_DEV190_api_('get','/tables/'+encodeURIComponent(table)+'/records',null).records||[]);
}
function EUC_DEV208_col_(cols,names){
  var wanted=names.map(EUC_DEV208_norm_);
  for(var i=0;i<cols.length;i++){
    if(wanted.indexOf(EUC_DEV208_norm_(cols[i].id))>=0)return cols[i].id;
  }
  return '';
}
function EUC_DEV208_aliases_(classeNom){
  var n=EUC_DEV208_norm_(classeNom);
  var out={};
  function add(v){v=EUC_DEV208_norm_(v);if(v)out[v]=true;}
  add(n);
  add(n.replace('BTS',''));
  var m=n.match(/^BTS([12])(.*)$/);
  if(m)add(m[1]+m[2]);
  add(n.replace(/^([12])BTS/,'$1'));
  return Object.keys(out);
}
function EUC_DEV208_ensureTable_(){
  var exists=EUC_DEV208_tables_().some(function(t){
    return t.id===EUC_DEV208_CLASS_SNAPSHOT_TABLE_;
  });
  if(!exists){
    EUC_DEV190_api_('post','/tables',{
      tables:[{
        id:EUC_DEV208_CLASS_SNAPSHOT_TABLE_,
        columns:[
          {id:'Annee_scolaire',type:'Text'},
          {id:'Classe_id',type:'Int'},
          {id:'Classe_nom',type:'Text'},
          {id:'Payload_JSON',type:'Text'},
          {id:'Updated_at',type:'Text'},
          {id:'Actif',type:'Bool'}
        ]
      }]
    });
  }
}

function EUC_DEV208_buildClassSnapshot_(annee,classeId,classeNom){
  EUC_DEV208_ensureTable_();

  var t0=Date.now();
  var rows=EUC_DEV208_records_('EUC_ELEVES_PFMP');
  var cols=EUC_DEV208_cols_('EUC_ELEVES_PFMP');

  var cClasse=EUC_DEV208_col_(cols,['Classe','Classe_id','ClasseRef']);
  var cCode=EUC_DEV208_col_(cols,['Code_classe_importe','Code_classe','Classe_Pronote']);
  var cNom=EUC_DEV208_col_(cols,['Nom','Nom_eleve','Eleve_nom']);
  var cPrenom=EUC_DEV208_col_(cols,['Prenom','Prénom','Prenom_eleve','Eleve_prenom']);
  var cActif=EUC_DEV208_col_(cols,['Actif']);
  var cPresent=EUC_DEV208_col_(cols,['Present_dernier_import']);

  var aliases=EUC_DEV208_aliases_(classeNom);
  var students=[];

  rows.forEach(function(r){
    var f=r.fields||{};
    var ok=false;
    var idNum=Number(classeId)||0;

    /*
     * DEV255 — référence Classe prioritaire.
     *
     * Si classeId correspond à une vraie classe, on interdit
     * tout élargissement par alias.
     *
     * Les alias restent disponibles seulement pour les classes
     * synthétiques sans identifiant numérique.
     */
    if(idNum && cClasse){
      ok=(
        EUC_DEV208_refId_(f[cClasse])===idNum
      );
    }else if(cCode){
      var code=EUC_DEV208_norm_(f[cCode]);
      if(aliases.indexOf(code)>=0)ok=true;
    }

    if(!ok)return;
    if(cActif && f[cActif]===false)return;
    if(cPresent && f[cPresent]===false)return;

    students.push({
      id:r.id,
      nom:cNom?EUC_DEV208_txt_(f[cNom]):'',
      prenom:cPrenom?EUC_DEV208_txt_(f[cPrenom]):''
    });
  });

  students.sort(function(a,b){
    return (a.nom+' '+a.prenom).localeCompare(b.nom+' '+b.prenom,'fr');
  });

  var now=new Date().toISOString();
  var snapshotRows=EUC_DEV208_records_(EUC_DEV208_CLASS_SNAPSHOT_TABLE_);

  var old=snapshotRows.filter(function(r){
    var f=r.fields||{};
    return (
      f.Actif!==false &&
      EUC_DEV208_txt_(f.Annee_scolaire)===annee &&
      Number(f.Classe_id)===Number(classeId)
    );
  });

  if(old.length){
    EUC_DEV190_api_('patch','/tables/'+encodeURIComponent(EUC_DEV208_CLASS_SNAPSHOT_TABLE_)+'/records',{
      records:old.map(function(r){
        return {id:r.id,fields:{Actif:false,Updated_at:now}};
      })
    });
  }

  EUC_DEV190_api_('post','/tables/'+encodeURIComponent(EUC_DEV208_CLASS_SNAPSHOT_TABLE_)+'/records',{
    records:[{fields:{
      Annee_scolaire:annee,
      Classe_id:Number(classeId),
      Classe_nom:classeNom,
      Payload_JSON:JSON.stringify({filterVersion:'REF_PRIORITY_255',students:students}),
      Updated_at:now,
      Actif:true
    }}]
  });

  return {
    ok:true,
    source:'rebuilt-class-ref255',
    updatedAt:now,
    students:students,
    durationMs:Date.now()-t0
  };
}

function EUC_DEV208_getClassSnapshot_(annee,classeId,classeNom){
  EUC_DEV208_ensureTable_();

  var rows=EUC_DEV208_records_(EUC_DEV208_CLASS_SNAPSHOT_TABLE_)
    .filter(function(r){
      var f=r.fields||{};
      return (
        f.Actif!==false &&
        EUC_DEV208_txt_(f.Annee_scolaire)===annee &&
        Number(f.Classe_id)===Number(classeId)
      );
    })
    .sort(function(a,b){
      return (Date.parse((b.fields||{}).Updated_at||'')||0)-
             (Date.parse((a.fields||{}).Updated_at||'')||0);
    });

  if(rows.length){
    try{
      var p=JSON.parse((rows[0].fields||{}).Payload_JSON||'{}');

      /*
       * DEV255
       * Les snapshots antérieurs ont pu être construits avec des alias
       * trop larges (ex. 1BTS CIEL + 1CIEL).
       * On les reconstruit une seule fois avec le filtre prioritaire.
       */
      if(p.filterVersion==='REF_PRIORITY_255'){
        return {
          ok:true,
          source:'snapshot-class-ref255',
          updatedAt:(rows[0].fields||{}).Updated_at||'',
          students:p.students||[]
        };
      }
    }catch(e){}
  }

  return EUC_DEV208_buildClassSnapshot_(annee,classeId,classeNom);
}

function EUC_DEV208_latestAppMap_(){
  var tables=EUC_DEV208_tables_();
  var exists=tables.some(function(t){return t.id===EUC_DEV208_APP_TABLE_;});
  if(!exists)return {map:{},cols:[]};

  var cols=EUC_DEV208_cols_(EUC_DEV208_APP_TABLE_);
  var rows=EUC_DEV208_records_(EUC_DEV208_APP_TABLE_);
  var cEleve=EUC_DEV208_col_(cols,['Eleve','Élève','Eleve_id']);
  var cActif=EUC_DEV208_col_(cols,['Actif']);
  var map={};

  rows.forEach(function(r){
    var id=EUC_DEV208_refId_((r.fields||{})[cEleve]);
    if(!id)return;

    if(!map[id]){
      map[id]=r;
      return;
    }

    var a=r.fields||{};
    var b=map[id].fields||{};
    var aa=cActif && a[cActif]!==false ? 1 : 0;
    var bb=cActif && b[cActif]!==false ? 1 : 0;

    if(aa>bb || (aa===bb && r.id>map[id].id)){
      map[id]=r;
    }
  });

  return {map:map,cols:cols};
}

function EUC_DEV208_loadApprentis(annee,classeId,classeNom){
  var t0=Date.now();

  var snap=EUC_DEV208_getClassSnapshot_(annee,classeId,classeNom);
  var app=EUC_DEV208_latestAppMap_();
  var cols=app.cols||[];

  function c(names){return EUC_DEV208_col_(cols,names);}
  function val(f,names){
    var cc=c(names);
    return cc?EUC_DEV208_txt_(f[cc]):'';
  }
  function dateVal(f,names){
    var cc=c(names);
    if(!cc)return '';
    var raw=f[cc];
    if(typeof EUC_IMPORT_dateExistanteISO_==='function'){
      return EUC_IMPORT_dateExistanteISO_(raw)||'';
    }
    if(raw===null||raw===undefined||raw==='')return '';
    if(typeof raw==='number'&&isFinite(raw)){
      return new Date(raw*1000).toISOString().slice(0,10);
    }
    var text=String(raw).trim();
    if(/^\d{10}(?:\.\d+)?$/.test(text)){
      return new Date(Number(text)*1000).toISOString().slice(0,10);
    }
    if(/^\d{13}$/.test(text)){
      return new Date(Number(text)).toISOString().slice(0,10);
    }
    var match=text.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?match[1]:'';
  }
  function bool(f,names){
    var cc=c(names);
    return cc?!!f[cc]:false;
  }

  var students=(snap.students||[]).map(function(s){
    var row=(app.map||{})[s.id];
    var f=row ? (row.fields||{}) : {};

    return {
      id:s.id,
      nom:s.nom,
      prenom:s.prenom,
      apprenti:bool(f,['Actif','Apprenti']),
      debut:dateVal(f,['Date_debut','Date_contrat_officielle']),
      fin:dateVal(f,['Date_fin']),
      siret:val(f,['SIRET']),
      nomEntreprise:val(f,['Nom_entreprise']),
      nomCommercial:val(f,['Nom_commercial','Entreprise']),
      adresse:val(f,['Adresse_entreprise','Adresse']),
      cp:val(f,['Code_postal','CodePostal','CP']),
      ville:val(f,['Ville']),
      telEntreprise:val(f,['Entreprise_telephone','Telephone_entreprise']),
      mailEntreprise:val(f,['Entreprise_courriel','Courriel_entreprise']),
      responsableEntreprise:val(f,['Responsable_nom','Responsable','Nom_responsable_entreprise']),
      tuteur:val(f,['Tuteur_nom','Tuteur']),
      telTuteur:val(f,['Tuteur_telephone','Telephone_tuteur']),
      mailTuteur:val(f,['Tuteur_courriel','Courriel_tuteur']),
      dossierDistribue:bool(f,['Dossier_distribue']),
      dateDistribution:dateVal(f,['Date_distribution_dossier']),
      dossierRemis:bool(f,['Dossier_remis']),
      dateRemise:dateVal(f,['Date_remise_dossier','Date_dossier']),
      dateDossier:dateVal(f,['Date_remise_dossier','Date_dossier']),
      transmisCfa:bool(f,['Dossier_transmis_CFA']),
      dateCfa:dateVal(f,['Date_transmission_CFA']),
      dateTransmissionCfa:dateVal(f,['Date_transmission_CFA']),
      dateContrat:dateVal(f,['Date_contrat_officielle','Date_debut']),
      dateRupture:dateVal(f,['Date_rupture_contrat']),
      nouveauContrat:bool(f,['Nouveau_contrat'])
    };
  });

  return {
    ok:true,
    source:snap.source,
    snapshotUpdatedAt:snap.updatedAt||'',
    durationMs:Date.now()-t0,
    students:students
  };
}

function EUC_DEV208_rebuildSelectedClass(annee,classeId,classeNom){
  return EUC_DEV208_buildClassSnapshot_(annee,classeId,classeNom);
}
