/**
 * AUDIT STRICT BTS
 * Lecture seule uniquement.
 * Analyse :
 * - table Classes
 * - EUC_ELEVES_PFMP
 * - correspondances classe / code importé
 * - alias BTS
 * - résultat du chargeur actuel DEV208/DEV211/DEV235
 */

function EUC_AUDIT_BTS_afficher(e){
  return HtmlService
    .createTemplateFromFile('Audit_BTS_Strict_Readonly')
    .evaluate()
    .setTitle('Audit BTS — lecture seule')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_AUDIT_BTS_norm_(v){
  return String(v==null?'':v)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/\s+/g,'')
    .replace(/[^A-Z0-9]/g,'');
}

function EUC_AUDIT_BTS_refIds_(v){
  var out=[];

  if(typeof v==='number'){
    out.push(v);
    return out;
  }

  if(Array.isArray(v)){
    v.forEach(function(x){
      if(typeof x==='number'){
        out.push(x);
      }else if(
        x &&
        typeof x==='object' &&
        typeof x.id==='number'
      ){
        out.push(x.id);
      }
    });
    return out;
  }

  if(v && typeof v==='object' && typeof v.id==='number'){
    out.push(v.id);
    return out;
  }

  var n=Number(v);
  if(isFinite(n) && n){
    out.push(n);
  }

  return out;
}

function EUC_AUDIT_BTS_aliases_(classeNom){
  var raw=EUC_AUDIT_BTS_norm_(classeNom);
  var a={};

  function add(v){
    var n=EUC_AUDIT_BTS_norm_(v);
    if(n)a[n]=true;
  }

  add(raw);

  /* comportement historique DEV195 / DEV211 */
  add(raw.replace('BTS',''));

  var m=raw.match(/^BTS([12])(.*)$/);
  if(m){
    add(m[1]+m[2]);
  }

  add(raw.replace(/^([12])BTS/,'$1'));

  return Object.keys(a);
}

function EUC_AUDIT_BTS_tables_(){
  return (EUC_DEV190_api_('get','/tables',null).tables||[]);
}

function EUC_AUDIT_BTS_cols_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/columns',
      null
    ).columns||[]
  );
}

function EUC_AUDIT_BTS_records_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/records',
      null
    ).records||[]
  );
}

function EUC_AUDIT_BTS_col_(cols,names){
  var wanted=names.map(EUC_AUDIT_BTS_norm_);

  for(var i=0;i<cols.length;i++){
    if(
      wanted.indexOf(
        EUC_AUDIT_BTS_norm_(cols[i].id)
      )>=0
    ){
      return cols[i].id;
    }
  }

  return '';
}

function EUC_AUDIT_BTS_findClass_(classeNom){
  var table='Classes';
  var cols=EUC_AUDIT_BTS_cols_(table);
  var rows=EUC_AUDIT_BTS_records_(table);

  var cNom=EUC_AUDIT_BTS_col_(cols,[
    'Nom',
    'Code',
    'Code_classe',
    'Libelle',
    'Libellé',
    'Classe'
  ]);

  var cEtab=EUC_AUDIT_BTS_col_(cols,[
    'Etab',
    'Etablissement',
    'Établissement',
    'Etablissement_Pronote'
  ]);

  var target=EUC_AUDIT_BTS_norm_(classeNom);

  var found=rows.filter(function(r){
    var f=r.fields||{};
    return EUC_AUDIT_BTS_norm_(f[cNom])===target;
  });

  return found.map(function(r){
    var f=r.fields||{};
    return {
      id:Number(r.id)||0,
      nom:String(f[cNom]||''),
      etablissement:cEtab?String(f[cEtab]||''):''
    };
  });
}

function EUC_AUDIT_BTS_studentRows_(){
  var table='EUC_ELEVES_PFMP';
  var cols=EUC_AUDIT_BTS_cols_(table);
  var rows=EUC_AUDIT_BTS_records_(table);

  var cCode=EUC_AUDIT_BTS_col_(cols,[
    'Code_classe_importe',
    'Code_classe',
    'Classe_Pronote',
    'ClassePronote'
  ]);

  var cClasse=EUC_AUDIT_BTS_col_(cols,[
    'Classe',
    'Classe_id',
    'ClasseRef'
  ]);

  var cNom=EUC_AUDIT_BTS_col_(cols,[
    'Nom',
    'Nom_eleve',
    'Eleve_nom'
  ]);

  var cPrenom=EUC_AUDIT_BTS_col_(cols,[
    'Prenom',
    'Prénom',
    'Prenom_eleve',
    'Eleve_prenom'
  ]);

  var cAnnee=EUC_AUDIT_BTS_col_(cols,[
    'Annee_scolaire',
    'Année_scolaire',
    'Annee',
    'Année'
  ]);

  var cActif=EUC_AUDIT_BTS_col_(cols,[
    'Actif',
    'Present_dernier_import',
    'Présent_dernier_import'
  ]);

  return {
    table:table,
    columns:{
      code:cCode,
      classe:cClasse,
      nom:cNom,
      prenom:cPrenom,
      annee:cAnnee,
      actif:cActif
    },
    rows:rows
  };
}

function EUC_AUDIT_BTS_analyserClasse_(annee,classeNom){
  var classes=EUC_AUDIT_BTS_findClass_(classeNom);
  var classIds=classes.map(function(x){return x.id;});
  var aliases=EUC_AUDIT_BTS_aliases_(classeNom);

  var src=EUC_AUDIT_BTS_studentRows_();
  var cols=src.columns;

  var all=[];

  src.rows.forEach(function(r){
    var f=r.fields||{};

    var rowAnnee=cols.annee ? String(f[cols.annee]||'') : '';

    /*
     * On ne jette pas la ligne si Annee_scolaire est une Ref numérique,
     * car l'audit doit justement montrer ce qui existe réellement.
     */
    var code=cols.code ? String(f[cols.code]||'') : '';
    var codeNorm=EUC_AUDIT_BTS_norm_(code);

    var refs=cols.classe
      ? EUC_AUDIT_BTS_refIds_(f[cols.classe])
      : [];

    var byCode=aliases.indexOf(codeNorm)>=0;

    var byRef=refs.some(function(id){
      return classIds.indexOf(Number(id))>=0;
    });

    var active=true;

    if(cols.actif){
      var av=f[cols.actif];

      if(av===false){
        active=false;
      }
    }

    if(byCode || byRef){
      all.push({
        id:Number(r.id)||0,
        nom:cols.nom?String(f[cols.nom]||''):'',
        prenom:cols.prenom?String(f[cols.prenom]||''):'',
        codeClasse:code,
        codeNormalise:codeNorm,
        classeRefs:refs,
        anneeRaw:rowAnnee,
        actif:active,
        matchCode:byCode,
        matchRef:byRef
      });
    }
  });

  var exactTarget=EUC_AUDIT_BTS_norm_(classeNom);

  var exactCode=all.filter(function(x){
    return x.codeNormalise===exactTarget;
  });

  var aliasOnly=all.filter(function(x){
    return (
      x.matchCode &&
      x.codeNormalise!==exactTarget
    );
  });

  var refOnly=all.filter(function(x){
    return (
      x.matchRef &&
      !x.matchCode
    );
  });

  var both=all.filter(function(x){
    return x.matchRef && x.matchCode;
  });

  var unique={};
  all.forEach(function(x){
    unique[x.id]=x;
  });

  var loader={};

  function runLoader(name,fn){
    try{
      var r=fn();
      loader[name]={
        ok:true,
        count:
          r && Array.isArray(r.students)
            ? r.students.length
            : null,
        source:r&&r.source||'',
        durationMs:
          r&&(
            r.durationMs!==undefined
              ? r.durationMs
              : r.ms
          )
      };
    }catch(e){
      loader[name]={
        ok:false,
        error:String(e&&e.message||e)
      };
    }
  }

  var classId=classIds.length ? classIds[0] : 0;

  if(typeof EUC_DEV208_loadApprentis==='function'){
    runLoader(
      'DEV208',
      function(){
        return EUC_DEV208_loadApprentis(
          annee,
          classId,
          classeNom
        );
      }
    );
  }

  if(typeof EUC_DEV211_loadApprentis==='function'){
    runLoader(
      'DEV211',
      function(){
        return EUC_DEV211_loadApprentis(
          annee,
          classId,
          classeNom
        );
      }
    );
  }

  if(typeof EUC_DEV235_loadStudentsJson==='function'){
    try{
      var raw=EUC_DEV235_loadStudentsJson(
        annee,
        classId,
        classeNom
      );

      var obj=JSON.parse(raw);

      loader.DEV235={
        ok:true,
        count:
          obj && Array.isArray(obj.students)
            ? obj.students.length
            : null,
        source:obj&&obj.source||''
      };
    }catch(e2){
      loader.DEV235={
        ok:false,
        error:String(e2&&e2.message||e2)
      };
    }
  }

  var byCodeBreakdown={};

  all.forEach(function(x){
    var k=x.codeClasse||'(vide)';

    if(!byCodeBreakdown[k]){
      byCodeBreakdown[k]={
        total:0,
        actifs:0,
        matchRef:0
      };
    }

    byCodeBreakdown[k].total++;

    if(x.actif){
      byCodeBreakdown[k].actifs++;
    }

    if(x.matchRef){
      byCodeBreakdown[k].matchRef++;
    }
  });

  return {
    classeDemandee:classeNom,
    annee:annee,
    classeTable:classes,
    classeIds:classIds,
    aliases:aliases,
    colonnes:src.columns,
    compteurs:{
      lignesCandidates:all.length,
      uniques:Object.keys(unique).length,
      exactCode:exactCode.length,
      aliasOnly:aliasOnly.length,
      refOnly:refOnly.length,
      both:both.length
    },
    ventilationCodes:byCodeBreakdown,
    loaders:loader,
    lignes:all
  };
}

function EUC_AUDIT_BTS_run(){
  var annee='2026-2027';

  return {
    ok:true,
    readonly:true,
    generatedAt:new Date().toISOString(),
    classes:[
      EUC_AUDIT_BTS_analyserClasse_(
        annee,
        '1BTS CIEL'
      ),
      EUC_AUDIT_BTS_analyserClasse_(
        annee,
        '1BTS MV'
      ),
      EUC_AUDIT_BTS_analyserClasse_(
        annee,
        '2BTS ELEC'
      )
    ]
  };
}
