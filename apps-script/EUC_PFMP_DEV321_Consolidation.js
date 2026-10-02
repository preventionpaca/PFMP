/**
 * PFMP — v1.0.0-dev.321
 * Consolidation import JotForm + suivi.
 */

function EUC_DEV321_ref_(v){
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

function EUC_DEV321_norm_(v){
  return String(v==null?'':v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,'');
}

function EUC_DEV321_isPdif_(p){
  p=p||{};

  if(
    Object.prototype.hasOwnProperty.call(
      p,
      'parcoursDifferencies'
    )||
    Object.prototype.hasOwnProperty.call(
      p,
      'poursuitePfmp2'
    )||
    Object.prototype.hasOwnProperty.call(
      p,
      'aDefinirFinTerminale'
    )
  ){
    return true;
  }

  var s=EUC_DEV321_norm_(p.libelle||'');

  return (
    s.indexOf('PDIF')>=0 ||
    s.indexOf('DIFFERENC')>=0
  );
}

function EUC_DEV321_resumeFamilleGlobal(payload){
  payload=payload||{};

  var base=EUC_DEV320_resumeFamilleLive(payload);

  var live=
    EUC_DEV319_liveFamilyIndex({
      annee:String(payload.annee||base.annee||''),
      famille:String(payload.famille||base.famille||'')
    });

  if(!(live&&live.ready&&live.payload)){
    return base;
  }

  var seq=[];

  (live.payload.classes||[]).forEach(function(c){
    var normal=(c.periodes||[])
      .filter(function(p){
        return !EUC_DEV321_isPdif_(p);
      })
      .slice();

    normal.sort(function(a,b){
      var da=String(a.debut||a.Date_debut||'9999');
      var db=String(b.debut||b.Date_debut||'9999');

      if(da!==db){
        return da.localeCompare(db);
      }

      return (
        Number(a.id||a.periodeId||0)-
        Number(b.id||b.periodeId||0)
      );
    });

    normal.forEach(function(p,i){
      if(!seq[i]){
        seq[i]=0;
      }

      seq[i]+=Number(p.conventions)||0;
    });
  });

  var index=0;

  (base.periodes||[]).forEach(function(p){
    if(EUC_DEV321_isPdif_(p)){
      return;
    }

    p.conventions=Number(seq[index]||0);

    p.manquantes=Math.max(
      0,
      Number(p.total||0)-
      Number(p.conventions||0)
    );

    p.pourcentage=Number(p.total||0)
      ? Math.round(
          Number(p.conventions||0)/
          Number(p.total||0)*
          100
        )
      : 0;

    index++;
  });

  base.sourceConventions='DEV321_LIVE_STRICT';
  base.builtAtLive=new Date().toISOString();

  return base;
}

function EUC_DEV321_flat_(table){
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

function EUC_DEV321_preflight_(){
  var rows=EUC_DEV316_rawBuffer_();

  var accesses=
    EUC_DEV321_flat_(
      'EUC_ACCES_FORMULAIRES_PFMP'
    );

  var students=
    EUC_DEV321_flat_(
      'EUC_ELEVES_PFMP'
    );

  var years=
    EUC_DEV321_flat_(
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
      EUC_DEV321_ref_(a.Eleve),
      EUC_DEV321_ref_(a.Classe_convention),
      EUC_DEV321_ref_(a.Periode),
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

  var items=[];
  var provisional=[];

  (rows||[]).forEach(function(row){
    var label=String(
      row.Eleve_match_libelle||
      row.Eleve_saisi||
      row.Eleve_brut||
      ('ligne '+row.id)
    );

    var item={
      ligne:Number(row.id)||0,
      eleve:label,
      statut:'',
      detail:'',
      studentId:Number(row.Eleve_match_id)||0,
      classId:0,
      periodId:0,
      year:'',
      siret:String(
        row.SIRET_normalise||
        row.SIRET_brut||
        ''
      ).replace(/\D/g,''),
      raison:String(
        row.Raison_sociale_officielle||
        ''
      ).trim(),
      adresse:String(
        row.Adresse_officielle||
        ''
      ).trim(),
      cp:String(
        row.CP_officiel||
        ''
      ).trim(),
      ville:String(
        row.Ville_officielle||
        ''
      ).trim(),
      siretStatut:String(
        row.SIRET_statut||
        ''
      ).toUpperCase().trim(),
      row:row
    };

    if(
      String(row.Decision||'')
        .toUpperCase()
        .trim()==='IGNOREE'
    ){
      item.statut='IGNOREE';
      item.detail='Ligne volontairement ignorée.';
      items.push(item);
      return;
    }

    if(!(item.studentId>0)){
      item.statut='ELEVE_A_RAPPROCHER';
      item.detail='Élève non rapproché.';
      items.push(item);
      return;
    }

    var student=studentBy[item.studentId];
    var genStudent=genBy[item.studentId];

    if(!student||!genStudent){
      item.statut='ELEVE_INTROUVABLE';
      item.detail='Élève rapproché absent de la base.';
      items.push(item);
      return;
    }

    item.classId=
      EUC_DEV321_ref_(student.Classe);

    if(!(item.classId>0)||!classBy[item.classId]){
      item.statut='CLASSE_A_CONTROLER';
      item.detail='Classe réelle introuvable.';
      items.push(item);
      return;
    }

    item.year=
      EUC_DEV315_yearCode_(
        student,
        years
      );

    if(!/^20\d{2}-20\d{2}$/.test(item.year)){
      item.statut='ANNEE_A_CONTROLER';
      item.detail='Année scolaire réelle introuvable.';
      items.push(item);
      return;
    }

    if(item.siret.length!==14){
      item.statut='SIRET_INVALIDE';
      item.detail='SIRET absent ou différent de 14 chiffres.';
      items.push(item);
      return;
    }

    var p=
      EUC_DEV315_pickPeriod_(
        row,
        item.classId,
        item.year,
        snapshotFor(item.year),
        meta
      );

    if(!p.ok){
      item.statut='PERIODE_A_CONTROLER';
      item.detail=String(
        p.error||
        'Période officielle introuvable.'
      );
      items.push(item);
      return;
    }

    item.periodId=Number(p.periodId)||0;
    item.period=p.period;

    item.key=[
      item.studentId,
      item.classId,
      item.periodId,
      item.year
    ].join('|');

    var existing=
      (existingByKey[item.key]||[])[0]||
      null;

    item.existing=existing;

    if(existing){
      var es=String(
        existing.Entreprise_siret||
        ''
      ).replace(/\D/g,'');

      var er=String(
        existing.Entreprise_raison_sociale||
        ''
      ).trim();

      if(es&&es!==item.siret&&er){
        item.statut='CONFLIT_EXISTANT';
        item.detail=
          'Convention existante avec un autre SIRET ('+
          es+
          ').';
        items.push(item);
        return;
      }

      if(
        es===item.siret &&
        er &&
        (
          typeof EUC_V50_estRemontee_!=='function' ||
          EUC_V50_estRemontee_(existing)
        )
      ){
        item.statut='DEJA_IMPORTEE';
        item.detail='Convention déjà présente et remontée.';
        items.push(item);
        return;
      }
    }

    if(item.siretStatut!=='VERIFIE'){
      item.statut='SIRET_A_VERIFIER';
      item.detail='SIRET non marqué VERIFIE dans le tampon.';
      items.push(item);
      return;
    }

    if(
      !item.raison ||
      !item.adresse ||
      !item.cp ||
      !item.ville
    ){
      item.statut='ENTREPRISE_INCOMPLETE';
      item.detail=
        'Raison sociale / adresse / CP / ville officiels incomplets.';
      items.push(item);
      return;
    }

    item.statut=
      existing
        ? 'PRETE_MAJ'
        : 'PRETE_CREATION';

    item.detail=
      existing
        ? 'Accès existant incomplet à enrichir.'
        : 'Prête à créer.';

    provisional.push(item);
    items.push(item);
  });

  var groups={};

  provisional.forEach(function(item){
    if(!groups[item.key]){
      groups[item.key]=[];
    }

    groups[item.key].push(item);
  });

  Object.keys(groups).forEach(function(k){
    var g=groups[k];

    if(g.length<=1){
      return;
    }

    var sirets={};

    g.forEach(function(item){
      sirets[item.siret]=true;
    });

    var distinct=Object.keys(sirets);

    if(distinct.length>1){
      g.forEach(function(item){
        item.statut='DOUBLON_CONFLIT';
        item.detail=
          'Même élève/période avec des SIRET différents.';
      });

      return;
    }

    g.sort(function(a,b){
      return Number(b.ligne)-Number(a.ligne);
    });

    g.slice(1).forEach(function(item){
      item.statut='DOUBLON';
      item.detail=
        'Doublon même élève / période / SIRET.';
    });
  });

  var counts={};

  items.forEach(function(item){
    counts[item.statut]=
      (counts[item.statut]||0)+1;
  });

  return {
    ok:true,
    total:items.length,
    counts:counts,
    items:items
  };
}

function EUC_DEV321_auditerLot(){
  EUC_IMPORT_exigerAdminTexte_();

  var r=EUC_DEV321_preflight_();

  return {
    ok:true,
    total:r.total,
    counts:r.counts,
    lignes:r.items.map(function(x){
      return {
        ligne:x.ligne,
        eleve:x.eleve,
        statut:x.statut,
        detail:x.detail,
        siret:x.siret,
        raison:x.raison,
        classe:x.classId,
        periode:x.periodId,
        annee:x.year
      };
    })
  };
}

function EUC_DEV321_importerLotSecurise(){
  var lock=LockService.getScriptLock();

  if(!lock.tryLock(10000)){
    throw new Error(
      'Un autre import PFMP est déjà en cours.'
    );
  }

  try{
    var ctx=EUC_IMPORT_exigerAdminTexte_();
    var pre=EUC_DEV321_preflight_();

    var ready=pre.items.filter(function(x){
      return (
        x.statut==='PRETE_CREATION' ||
        x.statut==='PRETE_MAJ'
      );
    });

    var accessCols=
      EUC_DEV315_columns_(
        'EUC_ACCES_FORMULAIRES_PFMP'
      );

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

    var created=0;
    var updated=0;
    var targets={};
    var years={};
    var validatedBuffer=[];

    ready.forEach(function(item){
      var companyFields=
        EUC_DEV315_companyFields_(
          item.row,
          ctx,
          accessCols
        );

      if(item.existing){
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
                id:Number(item.existing.id),
                fields:companyFields
              }
            ]
          }
        );

        updated++;

      }else{
        var genStudent=
          genBy[item.studentId];

        var cl=
          classBy[item.classId];

        if(!genStudent||!cl||!item.period){
          throw new Error(
            'Préflight incohérent pour '+
            item.eleve+
            '.'
          );
        }

        var prepared=
          EUC_CONVENTION_preparerRecordAcces_(
            ctx,
            genStudent,
            cl,
            item.period,
            item.year,
            {
              lot:'MIGRATION_JOTFORM_DEV321'
            }
          );

        var fields=Object.assign(
          {},
          prepared.record&&
          prepared.record.fields||
          {},
          companyFields
        );

        fields=
          EUC_DEV315_filter_(
            fields,
            accessCols
          );

        EUC_ENT_grist(
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

        created++;
      }

      targets[
        item.year+
        '|'+
        item.classId+
        '|'+
        item.periodId
      ]={
        year:item.year,
        classId:item.classId,
        periodId:item.periodId
      };

      years[item.year]=true;
      validatedBuffer.push(item.ligne);
    });

    if(validatedBuffer.length){
      try{
        var table=EUC_DEV316_detectBufferTable_();

        var cols=
          EUC_ENT_grist(
            'get',
            '/tables/'+encodeURIComponent(table)+'/columns'
          ).columns||[];

        var have={};

        cols.forEach(function(c){
          have[String(c.id||'')]=true;
        });

        var patches=
          validatedBuffer.map(function(id){
            var f={};

            if(have.Decision){
              f.Decision='VALIDEE';
            }

            if(have.Date_validation){
              f.Date_validation=
                new Date().toISOString();
            }

            if(have.Valide_par){
              f.Valide_par=
                String(ctx.email||'');
            }

            return {
              id:Number(id),
              fields:f
            };
          })
          .filter(function(x){
            return Object.keys(x.fields).length;
          });

        if(patches.length){
          EUC_ENT_grist(
            'patch',
            '/tables/'+encodeURIComponent(table)+'/records',
            {records:patches}
          );
        }
      }catch(eBuffer){}
    }

    try{
      EUC_DEV315_clearCaches_(
        targets,
        years
      );
    }catch(eCache){}

    var after=EUC_DEV321_preflight_();

    return {
      ok:true,
      creees:created,
      misesAJour:updated,
      preflight:pre.counts,
      finalCounts:after.counts,
      total:after.total,
      lignes:after.items.map(function(x){
        return {
          ligne:x.ligne,
          eleve:x.eleve,
          statut:x.statut,
          detail:x.detail,
          siret:x.siret,
          raison:x.raison
        };
      })
    };

  }finally{
    lock.releaseLock();
  }
}
