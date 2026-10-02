/**
 * AUDIT GLOBAL 2026-2027 — STRICTEMENT LECTURE SEULE
 *
 * Lit seulement :
 * - Annees_Scolaires
 * - Classes
 * - EUC_ELEVES_PFMP
 *
 * Ne lance PAS les chargeurs apprentissage.
 * Ne reconstruit aucun snapshot.
 */

function EUC_AUDIT_GLOBAL_afficher(e){
  return HtmlService
    .createTemplateFromFile('Audit_Global_Classes_2026_2027')
    .evaluate()
    .setTitle('Audit global classes 2026-2027')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_AUDIT_GLOBAL_norm_(v){
  return String(v==null?'':v)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/\s+/g,'')
    .replace(/[^A-Z0-9]/g,'');
}

function EUC_AUDIT_GLOBAL_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_AUDIT_GLOBAL_refIds_(v){
  var out=[];

  if(typeof v==='number'){
    out.push(v);
    return out;
  }

  if(Array.isArray(v)){
    v.forEach(function(x){
      if(typeof x==='number'){
        out.push(x);
      }else if(x && typeof x==='object'){
        if(typeof x.id==='number'){
          out.push(x.id);
        }else if(typeof x[0]==='number'){
          out.push(x[0]);
        }
      }
    });
    return out;
  }

  if(v && typeof v==='object'){
    if(typeof v.id==='number'){
      out.push(v.id);
      return out;
    }
  }

  var n=Number(v);
  if(isFinite(n) && n){
    out.push(n);
  }

  return out;
}

function EUC_AUDIT_GLOBAL_tables_(){
  return (EUC_DEV190_api_('get','/tables',null).tables||[]);
}

function EUC_AUDIT_GLOBAL_cols_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/columns',
      null
    ).columns||[]
  );
}

function EUC_AUDIT_GLOBAL_records_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/records',
      null
    ).records||[]
  );
}

function EUC_AUDIT_GLOBAL_col_(cols,names){
  var wanted=names.map(EUC_AUDIT_GLOBAL_norm_);

  for(var i=0;i<cols.length;i++){
    if(
      wanted.indexOf(
        EUC_AUDIT_GLOBAL_norm_(cols[i].id)
      )>=0
    ){
      return cols[i].id;
    }
  }

  return '';
}

function EUC_AUDIT_GLOBAL_bool_(v){
  if(v===true||v===false)return v;

  var s=String(v==null?'':v)
    .trim()
    .toLowerCase();

  return (
    s==='true' ||
    s==='1' ||
    s==='oui' ||
    s==='yes' ||
    s==='x'
  );
}

function EUC_AUDIT_GLOBAL_aliases_(classeNom){
  var raw=EUC_AUDIT_GLOBAL_norm_(classeNom);
  var aliases={};

  function add(v){
    var n=EUC_AUDIT_GLOBAL_norm_(v);
    if(n)aliases[n]=true;
  }

  add(raw);

  /*
   * Reproduction de la mécanique d'alias qui a été introduite
   * pour les BTS.
   */
  add(raw.replace('BTS',''));

  var m=raw.match(/^BTS([12])(.*)$/);
  if(m){
    add(m[1]+m[2]);
  }

  add(raw.replace(/^([12])BTS/,'$1'));

  return Object.keys(aliases);
}

function EUC_AUDIT_GLOBAL_yearId_(code){
  var table='Annees_Scolaires';
  var cols=EUC_AUDIT_GLOBAL_cols_(table);
  var rows=EUC_AUDIT_GLOBAL_records_(table);

  var cCode=EUC_AUDIT_GLOBAL_col_(cols,[
    'Code',
    'Annee',
    'Année',
    'Annee_scolaire',
    'Année_scolaire'
  ]);

  var target=String(code||'').trim();

  for(var i=0;i<rows.length;i++){
    var f=rows[i].fields||{};
    if(
      cCode &&
      String(f[cCode]||'').trim()===target
    ){
      return Number(rows[i].id)||0;
    }
  }

  return 0;
}

function EUC_AUDIT_GLOBAL_classData_(){
  var table='Classes';
  var cols=EUC_AUDIT_GLOBAL_cols_(table);
  var rows=EUC_AUDIT_GLOBAL_records_(table);

  var cNom=EUC_AUDIT_GLOBAL_col_(cols,[
    'Nom',
    'Code',
    'Code_classe',
    'Libelle',
    'Libellé',
    'Classe'
  ]);

  var cEtab=EUC_AUDIT_GLOBAL_col_(cols,[
    'Etab',
    'Etablissement',
    'Établissement',
    'Etablissement_Pronote'
  ]);

  var cActif=EUC_AUDIT_GLOBAL_col_(cols,[
    'Actif',
    'Active'
  ]);

  return rows
    .map(function(r){
      var f=r.fields||{};
      var nom=cNom?String(f[cNom]||'').trim():'';
      var etab=cEtab?String(f[cEtab]||'').trim():'';

      var active=true;
      if(cActif && f[cActif]===false){
        active=false;
      }

      var en=EUC_AUDIT_GLOBAL_norm_(etab);
      var type=
        (
          en.indexOf('LGT')>=0 ||
          en.indexOf('GENERAL')>=0 ||
          en.indexOf('TECHNOLOG')>=0
        )
          ? 'LGT'
          : 'LP';

      return {
        id:Number(r.id)||0,
        nom:nom,
        etablissement:etab,
        typeEtab:type,
        actif:active
      };
    })
    .filter(function(x){
      return x.id && x.nom && x.actif;
    })
    .sort(function(a,b){
      return a.nom.localeCompare(b.nom,'fr');
    });
}

function EUC_AUDIT_GLOBAL_students_(anneeCode,anneeId){
  var table='EUC_ELEVES_PFMP';
  var cols=EUC_AUDIT_GLOBAL_cols_(table);
  var rows=EUC_AUDIT_GLOBAL_records_(table);

  var cCode=EUC_AUDIT_GLOBAL_col_(cols,[
    'Code_classe_importe',
    'Code_classe',
    'Classe_Pronote',
    'ClassePronote'
  ]);

  var cClasse=EUC_AUDIT_GLOBAL_col_(cols,[
    'Classe',
    'Classe_id',
    'ClasseRef'
  ]);

  var cNom=EUC_AUDIT_GLOBAL_col_(cols,[
    'Nom',
    'Nom_eleve',
    'Eleve_nom'
  ]);

  var cPrenom=EUC_AUDIT_GLOBAL_col_(cols,[
    'Prenom',
    'Prénom',
    'Prenom_eleve',
    'Eleve_prenom'
  ]);

  var cAnnee=EUC_AUDIT_GLOBAL_col_(cols,[
    'Annee_scolaire',
    'Année_scolaire',
    'Annee',
    'Année'
  ]);

  var cActif=EUC_AUDIT_GLOBAL_col_(cols,[
    'Actif'
  ]);

  var cPresent=EUC_AUDIT_GLOBAL_col_(cols,[
    'Present_dernier_import',
    'Présent_dernier_import'
  ]);

  var filtered=[];

  rows.forEach(function(r){
    var f=r.fields||{};

    var active=true;

    if(cActif && f[cActif]===false){
      active=false;
    }

    if(cPresent && f[cPresent]===false){
      active=false;
    }

    if(!active){
      return;
    }

    var yearOk=true;

    if(cAnnee){
      var raw=f[cAnnee];

      var refs=EUC_AUDIT_GLOBAL_refIds_(raw);

      if(refs.length && anneeId){
        yearOk=refs.indexOf(Number(anneeId))>=0;
      }else{
        var rawTxt=String(raw==null?'':raw).trim();

        if(rawTxt){
          yearOk=(
            rawTxt===String(anneeCode) ||
            rawTxt===String(anneeId)
          );
        }
      }
    }

    if(!yearOk){
      return;
    }

    filtered.push({
      id:Number(r.id)||0,
      nom:cNom?String(f[cNom]||''):'',
      prenom:cPrenom?String(f[cPrenom]||''):'',
      codeClasse:cCode?String(f[cCode]||''):'',
      codeNorm:cCode
        ? EUC_AUDIT_GLOBAL_norm_(f[cCode])
        : '',
      classeRefs:cClasse
        ? EUC_AUDIT_GLOBAL_refIds_(f[cClasse])
        : []
    });
  });

  return {
    rows:filtered,
    columns:{
      codeClasse:cCode,
      classeRef:cClasse,
      nom:cNom,
      prenom:cPrenom,
      annee:cAnnee,
      actif:cActif,
      present:cPresent
    }
  };
}

function EUC_AUDIT_GLOBAL_analyseClasse_(classe,students){
  var exact=EUC_AUDIT_GLOBAL_norm_(classe.nom);
  var aliases=EUC_AUDIT_GLOBAL_aliases_(classe.nom);

  var refRows=[];
  var exactRows=[];
  var aliasRows=[];
  var union={};
  var codeBreakdown={};

  students.forEach(function(s){
    var byRef=s.classeRefs.indexOf(classe.id)>=0;
    var byExact=s.codeNorm===exact;
    var byAlias=aliases.indexOf(s.codeNorm)>=0;

    if(byRef){
      refRows.push(s);
    }

    if(byExact){
      exactRows.push(s);
    }

    if(byAlias){
      aliasRows.push(s);
    }

    if(byRef || byAlias){
      union[s.id]=s;

      var k=s.codeClasse||'(vide)';

      if(!codeBreakdown[k]){
        codeBreakdown[k]={
          total:0,
          parRef:0,
          parAlias:0
        };
      }

      codeBreakdown[k].total++;

      if(byRef){
        codeBreakdown[k].parRef++;
      }

      if(byAlias){
        codeBreakdown[k].parAlias++;
      }
    }
  });

  var aliasOnly=aliasRows.filter(function(s){
    return s.classeRefs.indexOf(classe.id)<0;
  });

  var refOnly=refRows.filter(function(s){
    return aliases.indexOf(s.codeNorm)<0;
  });

  var currentCount=Object.keys(union).length;
  var refCount=refRows.length;

  var severity='OK';
  var reasons=[];

  if(aliasOnly.length){
    severity='ALERTE';
    reasons.push(
      aliasOnly.length+
      ' élève(s) ajouté(s) uniquement par alias'
    );
  }

  if(refCount && currentCount!==refCount){
    severity='ALERTE';
    reasons.push(
      'effectif logique actuelle '+currentCount+
      ' ≠ référence classe '+refCount
    );
  }

  if(!refCount && currentCount){
    severity='A_VERIFIER';
    reasons.push(
      'aucune référence classe, résultat uniquement par code/alias'
    );
  }

  if(refCount && !exactRows.length){
    if(severity==='OK'){
      severity='A_VERIFIER';
    }
    reasons.push(
      'aucun code importé identique au libellé de classe'
    );
  }

  if(!refCount && !currentCount){
    severity='VIDE';
    reasons.push(
      'aucun élève trouvé par référence ni alias'
    );
  }

  return {
    id:classe.id,
    classe:classe.nom,
    etablissement:classe.etablissement,
    typeEtab:classe.typeEtab,
    aliases:aliases,
    effectifReference:refCount,
    effectifCodeExact:exactRows.length,
    effectifAlias:aliasRows.length,
    aliasSeulement:aliasOnly.length,
    referenceSeulement:refOnly.length,
    effectifLogiqueActuelle:currentCount,
    ecart:currentCount-refCount,
    severity:severity,
    reasons:reasons,
    ventilationCodes:codeBreakdown,
    elevesReference:refRows.map(function(s){
      return {
        id:s.id,
        nom:(s.nom+' '+s.prenom).trim(),
        code:s.codeClasse
      };
    }),
    elevesAliasSeulement:aliasOnly.map(function(s){
      return {
        id:s.id,
        nom:(s.nom+' '+s.prenom).trim(),
        code:s.codeClasse,
        refs:s.classeRefs
      };
    })
  };
}

function EUC_AUDIT_GLOBAL_run(){
  var annee='2026-2027';
  var anneeId=EUC_AUDIT_GLOBAL_yearId_(annee);
  var classes=EUC_AUDIT_GLOBAL_classData_();
  var studentData=EUC_AUDIT_GLOBAL_students_(
    annee,
    anneeId
  );

  var analyses=classes.map(function(c){
    return EUC_AUDIT_GLOBAL_analyseClasse_(
      c,
      studentData.rows
    );
  });

  var counts={
    totalClasses:analyses.length,
    ok:0,
    alerte:0,
    aVerifier:0,
    vide:0
  };

  analyses.forEach(function(a){
    if(a.severity==='OK')counts.ok++;
    else if(a.severity==='ALERTE')counts.alerte++;
    else if(a.severity==='A_VERIFIER')counts.aVerifier++;
    else if(a.severity==='VIDE')counts.vide++;
  });

  return {
    ok:true,
    readonly:true,
    annee:annee,
    anneeId:anneeId,
    generatedAt:new Date().toISOString(),
    studentCount:studentData.rows.length,
    columns:studentData.columns,
    counts:counts,
    classes:analyses
  };
}
