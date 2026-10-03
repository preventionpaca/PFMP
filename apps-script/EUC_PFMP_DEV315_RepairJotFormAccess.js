/**
 * PFMP — v1.0.0-dev.315
 * Réparation directe des accès convention issus du tampon JotForm.
 */

function EUC_DEV315_flat_(table){
  var r=EUC_ENT_grist(
    'get',
    '/tables/'+encodeURIComponent(table)+'/records'
  );

  return (r.records||[]).map(function(x){
    var o={id:Number(x.id)||0};
    var f=x.fields||{};

    Object.keys(f).forEach(function(k){
      o[k]=f[k];
    });

    return o;
  });
}

function EUC_DEV315_columns_(table){
  var r=EUC_ENT_grist(
    'get',
    '/tables/'+encodeURIComponent(table)+'/columns'
  );

  var out={};

  (r.columns||[]).forEach(function(c){
    var id=String(c.id||'');
    if(!id)return;

    out[id]=String(
      c.fields&&c.fields.type||
      c.type||
      ''
    );
  });

  return out;
}

function EUC_DEV315_ref_(v){
  if(typeof EUC_PFMP_ref_==='function'){
    return Number(EUC_PFMP_ref_(v))||0;
  }

  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++){
      if(Number(v[i])>0)return Number(v[i]);
    }
  }

  return Number(v)||0;
}

function EUC_DEV315_norm_(v){
  return String(v==null?'':v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,'');
}

function EUC_DEV315_pick_(o,names){
  o=o||{};

  for(var i=0;i<names.length;i++){
    var k=names[i];

    if(
      Object.prototype.hasOwnProperty.call(o,k) &&
      o[k]!==null &&
      o[k]!==undefined &&
      String(o[k]).trim()!==''
    ){
      return o[k];
    }
  }

  var map={};

  Object.keys(o).forEach(function(k){
    map[EUC_DEV315_norm_(k)]=k;
  });

  for(var j=0;j<names.length;j++){
    var real=map[EUC_DEV315_norm_(names[j])];

    if(
      real &&
      o[real]!==null &&
      o[real]!==undefined &&
      String(o[real]).trim()!==''
    ){
      return o[real];
    }
  }

  return '';
}

function EUC_DEV315_dateISO_(v){
  /* EUC_DEV317_DATE_PARSER */
  try{
    if(typeof EUC_DEV307_dateISO_==='function'){
      var d307=EUC_DEV307_dateISO_(v);
      if(d307)return d307;
    }
  }catch(e307){}

  try{
    if(typeof EUC_IMPORT_dateExistanteISO_==='function'){
      var di=EUC_IMPORT_dateExistanteISO_(v);
      if(di)return di;
    }
  }catch(ei){}


  if(v===null||v===undefined||v==='')return '';

  if(typeof v==='number'&&isFinite(v)){
    var ms=Math.abs(v)>100000000000?v:v*1000;
    var d=new Date(ms);

    return isNaN(d.getTime())
      ? ''
      : d.toISOString().slice(0,10);
  }

  var s=String(v).trim();

  var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return m[1]+'-'+m[2]+'-'+m[3];

  m=s.match(/(?:^|\D)(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\D|$)/);

  if(m){
    return (
      m[3]+'-'+
      ('0'+m[2]).slice(-2)+'-'+
      ('0'+m[1]).slice(-2)
    );
  }

  return '';
}

function EUC_DEV315_addDays_(iso,days){
  var m=String(iso||'').match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if(!m)return '';

  var d=new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2])-1,
      Number(m[3])
    )
  );

  d.setUTCDate(
    d.getUTCDate()+Number(days||0)
  );

  return d.toISOString().slice(0,10);
}

function EUC_DEV315_dayDiff_(a,b){
  var ma=String(a||'').match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  var mb=String(b||'').match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if(!ma||!mb)return 99999;

  var ta=Date.UTC(
    Number(ma[1]),
    Number(ma[2])-1,
    Number(ma[3])
  );

  var tb=Date.UTC(
    Number(mb[1]),
    Number(mb[2])-1,
    Number(mb[3])
  );

  return Math.abs(
    Math.round((ta-tb)/86400000)
  );
}

function EUC_DEV315_yearCode_(student,years){
  var direct=String(
    student.Annee_scolaire_code||
    ''
  ).trim();

  if(/^20\d{2}-20\d{2}$/.test(direct)){
    return direct;
  }

  var raw=String(
    student.Annee_scolaire||
    ''
  ).trim();

  if(/^20\d{2}-20\d{2}$/.test(raw)){
    return raw;
  }

  var ref=EUC_DEV315_ref_(
    student.Annee_scolaire
  );

  var y=(years||[]).filter(function(x){
    return Number(x.id)===Number(ref);
  })[0]||{};

  return String(y.Code||'').trim();
}

function EUC_DEV315_toGrist_(value,type){
  if(value===undefined||value===null){
    return null;
  }

  type=String(type||'');

  if(type.indexOf('DateTime')===0){
    if(typeof value==='number')return value;

    var ms=Date.parse(String(value));

    return isNaN(ms)
      ? null
      : ms/1000;
  }

  if(type.indexOf('Date')===0){
    if(typeof value==='number')return value;

    var iso=EUC_DEV315_dateISO_(value);

    return iso
      ? Date.parse(iso+'T00:00:00Z')/1000
      : null;
  }

  if(type.indexOf('Bool')===0){
    return !!value;
  }

  if(type.indexOf('Int')===0||
     type.indexOf('Numeric')===0){
    var n=Number(value);

    return isFinite(n)
      ? n
      : null;
  }

  if(type.indexOf('Ref:')===0){
    var r=EUC_DEV315_ref_(value);

    return r||null;
  }

  return value;
}

function EUC_DEV315_filter_(fields,cols){
  var out={};

  Object.keys(fields||{}).forEach(function(k){
    if(!Object.prototype.hasOwnProperty.call(cols,k)){
      return;
    }

    out[k]=EUC_DEV315_toGrist_(
      fields[k],
      cols[k]
    );
  });

  return out;
}

function EUC_DEV315_companyFields_(row,ctx,cols){
  var siret=String(
    row.SIRET_normalise||
    row.SIRET_brut||
    ''
  ).replace(/\D/g,'');

  var fields={
    Statut:'ENTREPRISE_SAISIE',
    Statut_administratif:'INFORMATIONS_ENREGISTREES',
    Date_saisie_entreprise:new Date().toISOString(),

    Entreprise_siret:siret,
    Entreprise_identifiant_type:'SIRET',
    Entreprise_validation_statut:'VALIDE',

    Entreprise_raison_sociale:String(
      row.Raison_sociale_officielle||
      row.Entreprise_saisie||
      ''
    ),

    Entreprise_enseigne:String(
      row.Nom_commercial||
      row.Entreprise_saisie||
      ''
    ),

    Entreprise_adresse:String(
      row.Adresse_officielle||
      EUC_DEV315_pick_(row,[
        'Adresse_entreprise',
        'Adresse entreprise',
        'Adresse'
      ])||
      ''
    ),

    Entreprise_code_postal:String(
      row.CP_officiel||
      EUC_DEV315_pick_(row,[
        'Code_postal_entreprise',
        'Code postal entreprise',
        'CP'
      ])||
      ''
    ),

    Entreprise_commune:String(
      row.Ville_officielle||
      EUC_DEV315_pick_(row,[
        'Ville_entreprise',
        'Ville entreprise',
        'Commune'
      ])||
      ''
    ),

    Responsable_nom:String(
      EUC_DEV315_pick_(row,[
        'Nom du responsable','Responsable_nom','Nom responsable','Responsable entreprise'
      ])||''
    ),

    Responsable_telephone:String(
      EUC_DEV315_pick_(row,[
        'Téléphone entreprise','Telephone entreprise','Responsable_telephone','Téléphone responsable','Telephone responsable'
      ])||''
    ),

    Responsable_courriel:String(
      EUC_DEV315_pick_(row,[
        "Adresse e-mail de l'entreprise",'Adresse email de l entreprise','Responsable_courriel','Responsable_email','Email responsable','Courriel responsable'
      ])||''
    ),

    Tuteur_nom:String(
      EUC_DEV315_pick_(row,[
        'Nom_tuteur',
        'Tuteur_nom',
        'Nom tuteur'
      ])||
      ''
    ),

    Tuteur_fonction:String(
      EUC_DEV315_pick_(row,[
        'Fonction_tuteur',
        'Tuteur_fonction',
        'Fonction tuteur'
      ])||
      ''
    ),

    Tuteur_telephone:String(
      EUC_DEV315_pick_(row,[
        'Telephone_tuteur',
        'Téléphone_tuteur',
        'Tuteur_telephone',
        'Telephone tuteur'
      ])||
      ''
    ),

    Tuteur_courriel:String(
      EUC_DEV315_pick_(row,[
        'Email_tuteur',
        'Tuteur_courriel',
        'Courriel tuteur'
      ])||
      ''
    ),

    Valide_par:String(ctx&&ctx.email||''),
    Date_validation:new Date().toISOString(),
    Auteur_enregistrement:String(ctx&&ctx.email||'')
  };

  return EUC_DEV315_filter_(fields,cols);
}

function EUC_DEV315_pickPeriod_(
  row,
  classId,
  yearCode,
  snapshot,
  meta
){
  var card=(snapshot.cartes||[]).filter(function(c){
    return Number(c.classeId)===Number(classId);
  })[0]||null;

  if(!card){
    return {
      ok:false,
      error:
        'Classe réelle absente du suivi '+yearCode+'.'
    };
  }

  var rawStart=EUC_DEV315_dateISO_(
    EUC_DEV315_pick_(row,[
      'Date_debut_brut',
      'Date_debut',
      'Date début',
      'Date debut'
    ])
  );

  var rawEnd=EUC_DEV315_dateISO_(
    EUC_DEV315_pick_(row,[
      'Date_fin_brut',
      'Date_fin',
      'Date fin'
    ])
  );

  if(!rawStart||!rawEnd){
    return {
      ok:false,
      error:
        'Dates PFMP absentes ou illisibles.'
    };
  }

  var variants=[
    {
      start:rawStart,
      end:rawEnd,
      mode:'BRUT'
    },
    {
      start:EUC_DEV315_addDays_(rawStart,1),
      end:EUC_DEV315_addDays_(rawEnd,1),
      mode:'PLUS_1_JOUR'
    }
  ];

  var scored=[];

  (card.periodes||[]).forEach(function(p){
    var pid=Number(p.id)||0;
    if(!pid)return;

    var label=EUC_DEV315_norm_(
      p.libelle||
      p.originalLibelle||
      ''
    );

    if(
      label.indexOf('PDIF')>=0 ||
      label.indexOf('PARCOURSDIFFERENCIE')>=0
    ){
      return;
    }

    var start=EUC_DEV315_dateISO_(
      p.debut||
      p.Date_debut
    );

    var end=EUC_DEV315_dateISO_(
      p.fin||
      p.Date_fin
    );

    if(!start||!end)return;

    variants.forEach(function(v){
      var ds=EUC_DEV315_dayDiff_(
        v.start,
        start
      );

      var de=EUC_DEV315_dayDiff_(
        v.end,
        end
      );

      if(ds<=3&&de<=14){
        scored.push({
          id:pid,
          p:p,
          ds:ds,
          de:de,
          score:(ds*100)+de,
          variant:v
        });
      }
    });
  });

  if(!scored.length){
    return {
      ok:false,
      error:
        'Aucune période visible du suivi suffisamment proche de '+
        rawStart+' → '+rawEnd+'.'
    };
  }

  scored.sort(function(a,b){
    return (
      a.score-b.score ||
      a.id-b.id
    );
  });

  var best=scored[0];

  var metaPeriod=(meta.periodes||[]).filter(function(p){
    return Number(p.id)===Number(best.id);
  })[0]||null;

  if(!metaPeriod){
    return {
      ok:false,
      error:
        'Période '+best.id+
        ' visible dans le suivi mais absente du générateur.'
    };
  }

  return {
    ok:true,
    periodId:Number(best.id),
    period:metaPeriod,
    start:EUC_DEV315_dateISO_(
      best.p.debut||
      best.p.Date_debut
    ),
    end:EUC_DEV315_dateISO_(
      best.p.fin||
      best.p.Date_fin
    ),
    mode:best.variant.mode,
    ecartDebut:best.ds,
    ecartFin:best.de
  };
}

function EUC_DEV315_clearCaches_(targets,years){
  var cache=CacheService.getScriptCache();

  Object.keys(years||{}).forEach(function(year){
    try{
      cache.remove('EUC_SUIVI_V45_'+year);
    }catch(e){}

    ['BACPRO','BTS','CAP'].forEach(function(f){
      try{
        cache.remove(
          'EUC_V50_CLASSES_'+year+'_'+f
        );
      }catch(e){}
    });

    try{
      if(
        typeof EUC_SUIVI_invaliderCacheSynthese_===
          'function'
      ){
        EUC_SUIVI_invaliderCacheSynthese_(
          year
        );
      }
    }catch(e2){}
  });

  Object.keys(targets||{}).forEach(function(k){
    var t=targets[k]||{};

    var year=String(t.year||'');
    var cid=Number(t.classId)||0;
    var pid=Number(t.periodId)||0;

    if(!year||!cid||!pid)return;

    [
      'EUC_V50_DETAIL_'+year+'_'+cid+'_'+pid,
      'DEV185_DETAIL_'+year+'_'+cid+'_'+pid
    ].forEach(function(key){
      try{
        cache.remove(key);
      }catch(e){}
    });

    try{
      if(
        typeof EUC_DEV190J_syncOne===
          'function'
      ){
        EUC_DEV190J_syncOne({
          annee:year,
          classe:cid,
          periode:pid
        });
      }
    }catch(e3){}
  });

  try{
    if(
      typeof EUC_CONVENTION_resetCacheV94_===
        'function'
    ){
      EUC_CONVENTION_resetCacheV94_();
    }
  }catch(e4){}
}

function EUC_DEV315_reparerImporter(){
  var ctx=
    typeof EUC_V156_contexteAdmin_==='function'
      ? EUC_V156_contexteAdmin_()
      : null;

  if(!ctx){
    throw new Error(
      'Accès administrateur requis.'
    );
  }

  if(
    typeof EUC_CONVENTION_preparerRecordAcces_!==
      'function'
  ){
    throw new Error(
      'Générateur de conventions introuvable.'
    );
  }

  /* EUC_DEV316_RAW_BUFFER */
  var buffer=EUC_DEV316_rawBuffer_();

  var rows=buffer.filter(function(r){
    return (
      Number(r.Eleve_match_id)>0 &&
      (
        r.Importer===true ||
        String(r.Decision||'').toUpperCase()==='VALIDEE'
      )
    );
  });

  if(!rows.length){
    return {
      ok:false,
      message:'Aucune ligne JotForm exploitable dans le tampon.'
    };
  }

  var accesses=EUC_DEV315_flat_(
    'EUC_ACCES_FORMULAIRES_PFMP'
  );

  var accessCols=EUC_DEV315_columns_(
    'EUC_ACCES_FORMULAIRES_PFMP'
  );

  var students=EUC_DEV315_flat_(
    'EUC_ELEVES_PFMP'
  );

  var years=EUC_DEV315_flat_(
    'Annees_Scolaires'
  );

  var studentBy={};

  students.forEach(function(s){
    studentBy[Number(s.id)]=s;
  });

  var generatorStudents=
    EUC_CONVENTION_lireElevesAdmin();

  var genBy={};

  (generatorStudents||[]).forEach(function(e){
    genBy[Number(e.id)]=e;
  });

  var meta=
    EUC_CONVENTION_lireClassesEtPeriodesAdmin();

  var classBy={};

  (meta.classes||[]).forEach(function(c){
    classBy[Number(c.id)]=c;
  });

  var snapshots={};

  function snapshotFor(year){
    if(!snapshots[year]){
      try{
        CacheService.getScriptCache().remove(
          'EUC_SUIVI_V45_'+year
        );
      }catch(e){}

      snapshots[year]=
        EUC_SUIVI_V45_snapshot_(year);
    }

    return snapshots[year];
  }

  var existingByKey={};

  accesses.forEach(function(a){
    var key=[
      EUC_DEV315_ref_(a.Eleve),
      EUC_DEV315_ref_(a.Classe_convention),
      EUC_DEV315_ref_(a.Periode),
      String(a.Annee_scolaire||'')
    ].join('|');

    if(!existingByKey[key]){
      existingByKey[key]=[];
    }

    existingByKey[key].push(a);
  });

  Object.keys(existingByKey).forEach(function(k){
    existingByKey[k].sort(function(a,b){
      return Number(b.id||0)-Number(a.id||0);
    });
  });

  rows.sort(function(a,b){
    return Number(a.id||0)-Number(b.id||0);
  });

  var seen={};
  var targets={};
  var touchedYears={};
  var freshTokens={};

  var out={
    ok:true,
    lignesTampon:rows.length,
    elevesDistincts:0,
    creees:0,
    misesAJour:0,
    dejaCorrectes:0,
    doublonsTamponIgnores:0,
    rejetees:0,
    visiblesApresControle:0,
    erreurs:[],
    details:[]
  };

  var ctxGenerator=
    typeof EUC_IMPORT_exigerAdminTexte_==='function'
      ? EUC_IMPORT_exigerAdminTexte_()
      : ctx;

  rows.forEach(function(row){
    var studentId=
      Number(row.Eleve_match_id)||0;

    var student=
      studentBy[studentId];

    var genStudent=
      genBy[studentId];

    var label=String(
      row.Eleve_match_libelle||
      row.Eleve_saisi||
      row.Eleve_brut||
      ('ligne '+row.id)
    );

    try{
      if(!student||!genStudent){
        throw new Error(
          'Élève réel introuvable.'
        );
      }

      var classId=
        EUC_DEV315_ref_(student.Classe);

      if(!classId){
        throw new Error(
          'Classe réelle de l’élève absente.'
        );
      }

      var cl=classBy[classId];

      if(!cl){
        throw new Error(
          'Classe '+classId+
          ' absente du générateur.'
        );
      }

      var yearCode=
        EUC_DEV315_yearCode_(
          student,
          years
        );

      if(!/^20\d{2}-20\d{2}$/.test(yearCode)){
        throw new Error(
          'Année scolaire réelle introuvable.'
        );
      }

      var siret=String(
        row.SIRET_normalise||
        row.SIRET_brut||
        ''
      ).replace(/\D/g,'');

      if(siret.length!==14){
        throw new Error(
          'SIRET non valide : '+
          (siret||'absent')+'.'
        );
      }

      var periodResult=
        EUC_DEV315_pickPeriod_(
          row,
          classId,
          yearCode,
          snapshotFor(yearCode),
          meta
        );

      if(!periodResult.ok){
        throw new Error(
          periodResult.error
        );
      }

      var periodId=
        Number(periodResult.periodId);

      var period=
        periodResult.period;

      var uniqueKey=
        studentId+'|'+
        classId+'|'+
        periodId+'|'+
        yearCode;

      if(seen[uniqueKey]){
        out.doublonsTamponIgnores++;

        out.details.push({
          eleve:label,
          statut:'DOUBLON_TAMPON_IGNORE',
          cle:uniqueKey
        });

        return;
      }

      seen[uniqueKey]=true;
      if(!freshTokens[yearCode]){
        freshTokens[yearCode]=EUC_DEV425_beginMutation_({annee:yearCode,allFamilies:true,reason:'reparation-import-jotform'});
      }
      freshTokens[yearCode].targets.push({classe:classId,periode:periodId,famille:''});

      var companyFields=
        EUC_DEV315_companyFields_(
          row,
          ctx,
          accessCols
        );

      var existing=
        (existingByKey[uniqueKey]||[])[0]||
        null;

      var accessId=0;

      if(existing){
        accessId=Number(existing.id)||0;

        var oldSiret=String(
          existing.Entreprise_siret||
          ''
        ).replace(/\D/g,'');

        var oldCompany=String(
          existing.Entreprise_raison_sociale||
          ''
        ).trim();

        var same=
          oldSiret===siret &&
          !!oldCompany;

        if(same){
          out.dejaCorrectes++;
        }else{
          EUC_ENT_grist(
            'patch',
            '/tables/'+
              encodeURIComponent(
                'EUC_ACCES_FORMULAIRES_PFMP'
              )+
              '/records',
            {
              records:[
                {
                  id:accessId,
                  fields:companyFields
                }
              ]
            }
          );

          out.misesAJour++;
        }

      }else{
        var prepared=
          EUC_CONVENTION_preparerRecordAcces_(
            ctxGenerator,
            genStudent,
            cl,
            period,
            yearCode,
            {
              lot:'MIGRATION_JOTFORM_DEV315'
            }
          );

        var fields=Object.assign(
          {},
          prepared.record&&
          prepared.record.fields||
          {},
          companyFields
        );

        fields=EUC_DEV315_filter_(
          fields,
          accessCols
        );

        var resp=EUC_ENT_grist(
          'post',
          '/tables/'+
            encodeURIComponent(
              'EUC_ACCES_FORMULAIRES_PFMP'
            )+
            '/records',
          {
            records:[
              {
                fields:fields
              }
            ]
          }
        );

        accessId=Number(
          resp&&
          resp.records&&
          resp.records[0]&&
          resp.records[0].id
        )||0;

        if(!accessId){
          var reread=
            EUC_DEV315_flat_(
              'EUC_ACCES_FORMULAIRES_PFMP'
            )
            .filter(function(a){
              return (
                EUC_DEV315_ref_(a.Eleve)===studentId &&
                EUC_DEV315_ref_(a.Classe_convention)===classId &&
                EUC_DEV315_ref_(a.Periode)===periodId &&
                String(a.Annee_scolaire||'')===yearCode
              );
            })
            .sort(function(a,b){
              return Number(b.id||0)-Number(a.id||0);
            });

          accessId=
            Number(
              reread[0]&&
              reread[0].id
            )||0;
        }

        if(!accessId){
          throw new Error(
            'Création envoyée à Grist mais ID non retrouvé.'
          );
        }

        out.creees++;
      }

      targets[
        yearCode+'|'+classId+'|'+periodId
      ]={
        year:yearCode,
        classId:classId,
        periodId:periodId
      };

      touchedYears[yearCode]=true;

      out.details.push({
        eleve:label,
        statut:
          existing
            ? 'ACCES_COMPLETE_OU_DEJA_CORRECT'
            : 'ACCES_CREE',
        accesId:accessId,
        classeId:classId,
        periodeId:periodId,
        annee:yearCode,
        siret:siret,
        entreprise:String(
          row.Raison_sociale_officielle||
          row.Entreprise_saisie||
          ''
        )
      });

    }catch(e){
      out.rejetees++;

      out.erreurs.push({
        ligne:Number(row.id)||0,
        eleve:label,
        erreur:String(
          e&&e.message||
          e
        )
      });
    }
  });

  out.elevesDistincts=
    Object.keys(seen).length;

  EUC_DEV315_clearCaches_(
    targets,
    touchedYears
  );
  out.snapshots=[];
  Object.keys(freshTokens).forEach(function(year){out.snapshots.push(EUC_DEV425_finishMutation_(freshTokens[year]));});

  var after=EUC_DEV315_flat_(
    'EUC_ACCES_FORMULAIRES_PFMP'
  );

  var visibleKeys={};

  after.forEach(function(a){
    if(
      typeof EUC_SUIVI_V45_estActive_==='function' &&
      !EUC_SUIVI_V45_estActive_(a)
    ){
      return;
    }

    var eid=EUC_DEV315_ref_(a.Eleve);
    var cid=EUC_DEV315_ref_(a.Classe_convention);
    var pid=EUC_DEV315_ref_(a.Periode);
    var year=String(a.Annee_scolaire||'');

    if(eid&&cid&&pid&&year){
      visibleKeys[
        eid+'|'+cid+'|'+pid+'|'+year
      ]=true;
    }
  });

  Object.keys(seen).forEach(function(k){
    if(visibleKeys[k]){
      out.visiblesApresControle++;
    }
  });

  out.ok=
    out.visiblesApresControle>0 &&
    out.visiblesApresControle===
      out.elevesDistincts;

  return out;
}
