/**
 * PFMP — v1.0.0-dev.325
 * Garde anti-doublons quand les IDs de Planning_Periodes ont évolué.
 */

function EUC_DEV325_ref_(v){
  if(typeof EUC_PFMP_ref_==='function'){
    return Number(EUC_PFMP_ref_(v))||0;
  }

  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++){
      if(Number(v[i])>0){
        return Number(v[i]);
      }
    }
  }

  return Number(v)||0;
}

function EUC_DEV325_norm_(v){
  return String(v==null?'':v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,'');
}

function EUC_DEV325_flat_(table){
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

function EUC_DEV325_isPdif_(p){
  var n=EUC_DEV325_norm_(
    p&&(
      p.libelle||
      p.Periode_libelle||
      p.Libelle||
      ''
    )||
    ''
  );

  return (
    n.indexOf('PDIF')>=0 ||
    n.indexOf('DIFFERENC')>=0
  );
}

function EUC_DEV325_ordinalFromLabel_(v){
  var s=String(v||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase();

  var m=s.match(
    /(?:PFMP|STAGE|PERIODE|P)\s*(?:N[°O]?)?\s*([1-9])\b/
  );

  return m
    ? Number(m[1])||0
    : 0;
}

function EUC_DEV325_currentPeriods_(snapshot,classId){
  var card=(snapshot&&snapshot.cartes||[])
    .filter(function(c){
      return Number(c.classeId)===Number(classId);
    })[0]||null;

  if(!card){
    return [];
  }

  var out=(card.periodes||[])
    .filter(function(p){
      return (
        Number(p.id)>0 &&
        !EUC_DEV325_isPdif_(p)
      );
    })
    .slice();

  out.sort(function(a,b){
    var da=EUC_DEV315_dateISO_(
      a.debut||a.Date_debut
    )||'9999-99-99';

    var db=EUC_DEV315_dateISO_(
      b.debut||b.Date_debut
    )||'9999-99-99';

    if(da!==db){
      return da.localeCompare(db);
    }

    return Number(a.id)-Number(b.id);
  });

  return out;
}

function EUC_DEV325_ordinalOf_(periods,periodId){
  for(var i=0;i<(periods||[]).length;i++){
    if(
      Number(periods[i].id)===
      Number(periodId)
    ){
      return i+1;
    }
  }

  return 0;
}

function EUC_DEV325_datesOfAccess_(a,periodBy){
  a=a||{};

  var start=EUC_DEV315_dateISO_(
    a.Date_debut
  );

  var end=EUC_DEV315_dateISO_(
    a.Date_fin
  );

  if(start&&end){
    return {
      start:start,
      end:end,
      source:'ACCES'
    };
  }

  var pid=EUC_DEV325_ref_(a.Periode);
  var p=periodBy[pid]||{};

  start=EUC_DEV315_dateISO_(
    p.Date_debut||p.debut
  );

  end=EUC_DEV315_dateISO_(
    p.Date_fin||p.fin
  );

  return {
    start:start,
    end:end,
    source:'PLANNING'
  };
}

function EUC_DEV325_bestCurrentPeriod_(
  access,
  periods,
  periodBy
){
  var oldId=EUC_DEV325_ref_(access.Periode);

  /*
   * Si l'ancien ID existe encore dans la structure courante,
   * la correspondance est certaine.
   */
  var exactOrdinal=
    EUC_DEV325_ordinalOf_(
      periods,
      oldId
    );

  if(exactOrdinal){
    return {
      ok:true,
      ordinal:exactOrdinal,
      periodId:oldId,
      confidence:'EXACT_ID',
      score:0
    };
  }

  var d=
    EUC_DEV325_datesOfAccess_(
      access,
      periodBy
    );

  var scored=[];

  if(d.start&&d.end){
    (periods||[]).forEach(function(p,i){
      var ps=EUC_DEV315_dateISO_(
        p.debut||p.Date_debut
      );

      var pe=EUC_DEV315_dateISO_(
        p.fin||p.Date_fin
      );

      if(!ps||!pe){
        return;
      }

      var ds=
        EUC_DEV315_dayDiff_(
          d.start,
          ps
        );

      var de=
        EUC_DEV315_dayDiff_(
          d.end,
          pe
        );

      scored.push({
        ordinal:i+1,
        periodId:Number(p.id)||0,
        ds:ds,
        de:de,
        score:(ds*100)+de
      });
    });

    scored.sort(function(a,b){
      return a.score-b.score;
    });

    var first=scored[0]||null;
    var second=scored[1]||null;

    if(
      first &&
      first.ds<=7 &&
      first.de<=21 &&
      (
        !second ||
        second.score-first.score>=150
      )
    ){
      return {
        ok:true,
        ordinal:first.ordinal,
        periodId:first.periodId,
        confidence:'DATES',
        score:first.score
      };
    }
  }

  /*
   * Dernier recours : numéro métier présent dans le libellé
   * historique de l'accès.
   */
  var labelOrdinal=
    EUC_DEV325_ordinalFromLabel_(
      access.Periode_libelle||
      ''
    );

  if(
    labelOrdinal>0 &&
    labelOrdinal<=(periods||[]).length
  ){
    return {
      ok:true,
      ordinal:labelOrdinal,
      periodId:Number(
        periods[labelOrdinal-1]&&
        periods[labelOrdinal-1].id
      )||0,
      confidence:'LIBELLE',
      score:999
    };
  }

  return {
    ok:false,
    ordinal:0,
    periodId:0,
    confidence:'AMBIGU'
  };
}

function EUC_DEV325_isConvention_(a){
  if(!a){
    return false;
  }

  try{
    if(typeof EUC_V50_estRemontee_==='function'){
      if(EUC_V50_estRemontee_(a)){
        return true;
      }
    }
  }catch(e){}

  /*
   * Un accès incomplet compte aussi comme obstacle potentiel :
   * on ne veut jamais créer silencieusement un doublon.
   */
  return !!(
    EUC_DEV325_ref_(a.Eleve) &&
    EUC_DEV325_ref_(a.Classe_convention) &&
    EUC_DEV325_ref_(a.Periode)
  );
}

function EUC_DEV325_analyze_(){
  var base=EUC_DEV322_analyze_();

  var accesses=
    EUC_DEV325_flat_(
      'EUC_ACCES_FORMULAIRES_PFMP'
    );

  var periodsRaw=
    EUC_DEV325_flat_(
      'Planning_Periodes'
    );

  var periodBy={};

  periodsRaw.forEach(function(p){
    periodBy[Number(p.id)]=p;
  });

  var snapshots={};

  function snapshotFor(year){
    if(!snapshots[year]){
      snapshots[year]=
        EUC_SUIVI_V45_snapshot_(year);
    }

    return snapshots[year];
  }

  var byStudentClassYear={};

  accesses.forEach(function(a){
    if(!EUC_DEV325_isConvention_(a)){
      return;
    }

    var eid=EUC_DEV325_ref_(a.Eleve);
    var cid=EUC_DEV325_ref_(a.Classe_convention);
    var year=String(
      a.Annee_scolaire||
      ''
    ).trim();

    if(!(eid>0&&cid>0&&year)){
      return;
    }

    var key=[
      eid,
      cid,
      year
    ].join('|');

    if(!byStudentClassYear[key]){
      byStudentClassYear[key]=[];
    }

    byStudentClassYear[key].push(a);
  });

  (base.items||[]).forEach(function(item){
    if(item.statut!=='NOUVELLE_PRETE'){
      return;
    }

    var periods=
      EUC_DEV325_currentPeriods_(
        snapshotFor(item.year),
        item.classId
      );

    var currentOrdinal=
      EUC_DEV325_ordinalOf_(
        periods,
        item.periodId
      );

    if(!currentOrdinal){
      item.statut='PERIODE_HISTORIQUE_A_CONTROLER';
      item.detail=
        'La période actuelle n’a pas de rang déterminable dans le suivi.';
      return;
    }

    var key=[
      item.studentId,
      item.classId,
      item.year
    ].join('|');

    var candidates=
      (byStudentClassYear[key]||[])
      .filter(function(a){
        return (
          EUC_DEV325_ref_(a.Periode)!==
          Number(item.periodId)
        );
      });

    if(!candidates.length){
      return;
    }

    var strongDuplicate=null;
    var ambiguous=[];
    var distinctStrong=0;

    candidates.forEach(function(a){
      var mapped=
        EUC_DEV325_bestCurrentPeriod_(
          a,
          periods,
          periodBy
        );

      if(mapped.ok){
        if(mapped.ordinal===currentOrdinal){
          if(!strongDuplicate){
            strongDuplicate={
              access:a,
              mapped:mapped
            };
          }
        }else{
          distinctStrong++;
        }

        return;
      }

      ambiguous.push(a);
    });

    if(strongDuplicate){
      var oldAccess=strongDuplicate.access;
      var mapped=strongDuplicate.mapped;

      item.statut=
        'DEJA_PRESENTE_PERIODE_HISTORIQUE';

      item.historicalAccessId=
        Number(oldAccess.id)||0;

      item.historicalPeriodId=
        EUC_DEV325_ref_(
          oldAccess.Periode
        );

      item.currentPeriodId=
        Number(item.periodId)||0;

      item.periodOrdinal=
        currentOrdinal;

      item.periodMatchConfidence=
        mapped.confidence;

      item.detail=
        'Même PFMP métier déjà présente sur un ancien ID de période ('+
        item.historicalPeriodId+
        ' → '+
        item.currentPeriodId+
        ', rang '+
        currentOrdinal+
        ', preuve '+
        mapped.confidence+
        '). Aucune nouvelle convention créée.';

      return;
    }

    /*
     * Si toutes les conventions existantes sont clairement rattachées
     * à d'autres rangs PFMP, la nouvelle période reste autorisée.
     */
    if(
      candidates.length===distinctStrong &&
      !ambiguous.length
    ){
      return;
    }

    /*
     * Sinon on bloque : mieux vaut une ligne à contrôler qu'un doublon.
     */
    item.statut=
      'PERIODE_HISTORIQUE_A_CONTROLER';

    item.historicalAccessIds=
      candidates.map(function(a){
        return Number(a.id)||0;
      });

    item.currentPeriodId=
      Number(item.periodId)||0;

    item.periodOrdinal=
      currentOrdinal;

    item.detail=
      'Une ou plusieurs conventions existent déjà pour cet élève, cette classe et cette année, mais leur ancien rattachement de période est ambigu. Import bloqué pour éviter un doublon.';
  });

  var counts={};

  (base.items||[]).forEach(function(item){
    counts[item.statut]=
      (counts[item.statut]||0)+1;
  });

  base.counts=counts;
  base.version='DEV325';
  return base;
}

function EUC_DEV325_auditer(){
  EUC_IMPORT_exigerAdminTexte_();

  var r=EUC_DEV325_analyze_();

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
        csvSiret:x.csvSiret,
        pfmpSiret:x.pfmpSiret,
        classe:x.classId,
        periode:x.periodId,
        annee:x.year,
        historicalAccessId:
          Number(x.historicalAccessId)||0,
        historicalPeriodId:
          Number(x.historicalPeriodId)||0,
        currentPeriodId:
          Number(x.currentPeriodId)||0,
        periodOrdinal:
          Number(x.periodOrdinal)||0,
        confidence:
          String(x.periodMatchConfidence||'')
      };
    })
  };
}

function EUC_DEV325_importerNouveaux(){
  var lock=LockService.getScriptLock();

  if(!lock.tryLock(10000)){
    throw new Error(
      'Un autre import PFMP est déjà en cours.'
    );
  }

  try{
    var ctx=
      EUC_IMPORT_exigerAdminTexte_();

    var pre=
      EUC_DEV325_analyze_();

    var ready=
      pre.items.filter(function(x){
        return x.statut==='NOUVELLE_PRETE';
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

    var current=
      EUC_DEV325_flat_(
        'EUC_ACCES_FORMULAIRES_PFMP'
      );

    var exactKeys={};

    current.forEach(function(a){
      var k=[
        EUC_DEV325_ref_(a.Eleve),
        EUC_DEV325_ref_(a.Classe_convention),
        EUC_DEV325_ref_(a.Periode),
        String(a.Annee_scolaire||'').trim()
      ].join('|');

      exactKeys[k]=true;
    });

    var created=0;
    var skippedRace=0;
    var errors=[];
    var targets={};
    var years={};
    var validated=[];

    ready.forEach(function(item){
      try{
        /*
         * Refaire le garde historique juste avant chaque écriture.
         * Le préflight complet est peu coûteux au regard du risque
         * de créer un doublon irréversible.
         */
        var fresh=
          EUC_DEV325_analyze_();

        var freshItem=
          (fresh.items||[])
          .filter(function(x){
            return Number(x.ligne)===Number(item.ligne);
          })[0]||null;

        if(
          !freshItem ||
          freshItem.statut!=='NOUVELLE_PRETE'
        ){
          skippedRace++;
          return;
        }

        var exactKey=[
          item.studentId,
          item.classId,
          item.periodId,
          item.year
        ].join('|');

        if(exactKeys[exactKey]){
          skippedRace++;
          return;
        }

        var genStudent=
          genBy[item.studentId];

        var cl=
          classBy[item.classId];

        if(!genStudent||!cl||!item.period){
          throw new Error(
            'Référentiel incomplet au moment de l’écriture.'
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
              lot:'MIGRATION_JOTFORM_DEV325'
            }
          );

        var companyFields=
          EUC_DEV315_companyFields_(
            item.row,
            ctx,
            accessCols
          );

        var fields=
          Object.assign(
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

        exactKeys[exactKey]=true;
        created++;
        validated.push(item.ligne);

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

      }catch(e){
        errors.push({
          ligne:item.ligne,
          eleve:item.eleve,
          erreur:String(
            e&&e.message||
            e
          )
        });
      }
    });

    try{
      EUC_DEV322_patchBufferValidated_(
        validated,
        ctx
      );
    }catch(eBuffer){}

    try{
      EUC_DEV315_clearCaches_(
        targets,
        years
      );
    }catch(eCache){}

    var after=
      EUC_DEV325_analyze_();

    return {
      ok:errors.length===0,
      total:after.total,
      creees:created,
      sauteesParVerrou:
        skippedRace,
      erreurs:errors,
      counts:after.counts,
      lignes:after.items.map(function(x){
        return {
          ligne:x.ligne,
          eleve:x.eleve,
          statut:x.statut,
          detail:x.detail,
          historicalPeriodId:
            Number(x.historicalPeriodId)||0,
          currentPeriodId:
            Number(x.currentPeriodId)||0
        };
      })
    };

  }finally{
    lock.releaseLock();
  }
}
