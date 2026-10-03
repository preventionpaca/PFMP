/**
 * PFMP — v1.0.0-dev.322
 * Import différentiel JotForm :
 * - priorité absolue à l'existence de la convention métier ;
 * - le SIRET CSV ne peut jamais écraser une convention déjà présente ;
 * - seuls les nouveaux dossiers sûrs sont créés.
 */

function EUC_DEV322_ref_(v){
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

function EUC_DEV322_norm_(v){
  return String(v==null?'':v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,'');
}

function EUC_DEV322_verifiedSiret_(row){
  row=row||{};

  var status=EUC_DEV322_norm_(
    row.SIRET_statut||
    row.Statut_SIRET||
    row.Siret_statut||
    ''
  );

  if(
    status.indexOf('ACONTROLER')>=0 ||
    status.indexOf('NONVALIDE')>=0 ||
    status.indexOf('NONTROUVE')>=0 ||
    status.indexOf('ERREUR')>=0
  ){
    return false;
  }

  if(
    status==='OK' ||
    status.indexOf('VERIF')>=0 ||
    status.indexOf('VALIDE')>=0
  ){
    return true;
  }

  /*
   * Les quatre champs *_officiel sont écrits par le flux de
   * vérification navigateur. Ils constituent aussi une preuve
   * exploitable si le champ de statut varie entre versions.
   */
  return !!(
    String(row.Raison_sociale_officielle||'').trim() &&
    String(row.Adresse_officielle||'').trim() &&
    String(row.CP_officiel||'').trim() &&
    String(row.Ville_officielle||'').trim()
  );
}

function EUC_DEV322_flat_(table){
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

function EUC_DEV322_makeContext_(){
  var rows=EUC_DEV316_rawBuffer_();

  var accesses=
    EUC_DEV322_flat_(
      'EUC_ACCES_FORMULAIRES_PFMP'
    );

  var students=
    EUC_DEV322_flat_(
      'EUC_ELEVES_PFMP'
    );

  var years=
    EUC_DEV322_flat_(
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
      EUC_DEV322_ref_(a.Eleve),
      EUC_DEV322_ref_(a.Classe_convention),
      EUC_DEV322_ref_(a.Periode),
      String(a.Annee_scolaire||'').trim()
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

  return {
    rows:rows,
    accesses:accesses,
    students:students,
    studentBy:studentBy,
    years:years,
    genBy:genBy,
    meta:meta,
    classBy:classBy,
    snapshotFor:snapshotFor,
    existingByKey:existingByKey
  };
}

function EUC_DEV322_analyze_(){
  var c=EUC_DEV322_makeContext_();
  var items=[];
  var newCandidates=[];

  (c.rows||[]).forEach(function(row){
    var label=String(
      row.Eleve_match_libelle||
      row.Eleve_saisi||
      row.Eleve_brut||
      ('ligne '+row.id)
    );

    var csvSiret=String(
      row.SIRET_normalise||
      row.SIRET_brut||
      ''
    ).replace(/\D/g,'');

    var item={
      ligne:Number(row.id)||0,
      eleve:label,
      decisionAncienne:String(row.Decision||''),
      ancienneIgnoree:
        String(row.Decision||'')
          .toUpperCase()
          .trim()==='IGNOREE',
      statut:'',
      detail:'',
      row:row,
      studentId:Number(row.Eleve_match_id)||0,
      classId:0,
      periodId:0,
      year:'',
      key:'',
      csvSiret:csvSiret,
      pfmpSiret:'',
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
      existing:null,
      period:null
    };

    /*
     * DEV.322 ne considère plus une ancienne décision IGNOREE
     * comme une raison suffisante pour écarter la ligne.
     */

    if(!(item.studentId>0)){
      item.statut='ELEVE_A_RAPPROCHER';
      item.detail='Élève non rapproché.';
      items.push(item);
      return;
    }

    var student=c.studentBy[item.studentId];
    var genStudent=c.genBy[item.studentId];

    if(!student||!genStudent){
      item.statut='ELEVE_INTROUVABLE';
      item.detail='Élève rapproché absent de la base.';
      items.push(item);
      return;
    }

    item.classId=
      EUC_DEV322_ref_(student.Classe);

    if(
      !(item.classId>0) ||
      !c.classBy[item.classId]
    ){
      item.statut='CLASSE_A_CONTROLER';
      item.detail='Classe réelle de l’élève introuvable.';
      items.push(item);
      return;
    }

    item.year=
      EUC_DEV315_yearCode_(
        student,
        c.years
      );

    if(!/^20\d{2}-20\d{2}$/.test(item.year)){
      item.statut='ANNEE_A_CONTROLER';
      item.detail='Année scolaire réelle introuvable.';
      items.push(item);
      return;
    }

    /*
     * Il faut connaître la période pour reconnaître la convention
     * existante. Le rapprochement de période utilise les vraies
     * périodes visibles dans le suivi.
     */
    var p=
      EUC_DEV315_pickPeriod_(
        row,
        item.classId,
        item.year,
        c.snapshotFor(item.year),
        c.meta
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
      (c.existingByKey[item.key]||[])[0]||
      null;

    item.existing=existing;

    /*
     * RÈGLE CENTRALE DEV.322 :
     * la présence de la convention métier gagne sur le SIRET du CSV.
     * Un ancien SIRET erroné dans JotForm ne peut donc jamais écraser
     * la correction faite ensuite dans PFMP.
     */
    if(existing){
      var currentSiret=String(
        existing.Entreprise_siret||
        ''
      ).replace(/\D/g,'');

      var currentCompany=String(
        existing.Entreprise_raison_sociale||
        ''
      ).trim();

      item.pfmpSiret=currentSiret;

      var remontee=
        typeof EUC_V50_estRemontee_==='function'
          ? EUC_V50_estRemontee_(existing)
          : !!currentCompany;

      if(remontee){
        item.statut='DEJA_PRESENTE';

        if(
          csvSiret &&
          currentSiret &&
          csvSiret!==currentSiret
        ){
          item.detail=
            'Déjà présente. SIRET CSV '+
            csvSiret+
            ' différent du SIRET PFMP '+
            currentSiret+
            ' : valeur PFMP conservée.';
        }else{
          item.detail=
            'Déjà présente : aucune réimportation.';
        }

        items.push(item);
        return;
      }

      item.statut='EXISTANTE_A_COMPLETER';
      item.detail=
        'Un accès existe déjà pour cet élève/période mais la convention est incomplète. Aucune modification automatique.';

      items.push(item);
      return;
    }

    /*
     * A partir d'ici, la convention n'existe pas : c'est une
     * candidate réellement nouvelle.
     */
    if(!csvSiret){
      item.statut='SIRET_ABSENT';
      item.detail='Aucun SIRET dans le CSV.';
      items.push(item);
      return;
    }

    if(csvSiret.length===9){
      item.statut='SIREN_9_CHIFFRES';
      item.detail=
        '9 chiffres détectés : il s’agit probablement d’un SIREN. Retrouver le SIRET établissement avant import.';
      items.push(item);
      return;
    }

    if(csvSiret.length!==14){
      item.statut='SIRET_INVALIDE';
      item.detail=
        'Identifiant entreprise de '+
        csvSiret.length+
        ' chiffres : SIRET attendu = 14 chiffres.';
      items.push(item);
      return;
    }

    if(!EUC_DEV322_verifiedSiret_(row)){
      item.statut='SIRET_A_VERIFIER';
      item.detail=
        'SIRET à vérifier avec le bouton de vérification avant import.';
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
        'Données officielles entreprise incomplètes : raison sociale, adresse, CP ou ville.';
      items.push(item);
      return;
    }

    item.statut='NOUVELLE_PRETE';
    item.detail='Nouvelle convention prête à importer.';

    newCandidates.push(item);
    items.push(item);
  });

  /*
   * Détection des doublons uniquement parmi les NOUVEAUX.
   */
  var groups={};

  newCandidates.forEach(function(item){
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
      sirets[item.csvSiret]=true;
    });

    var distinct=Object.keys(sirets);

    if(distinct.length>1){
      g.forEach(function(item){
        item.statut='CONFLIT_CSV';
        item.detail=
          'Plusieurs lignes nouvelles pour le même élève/période avec des SIRET différents.';
      });

      return;
    }

    /*
     * Même convention + même SIRET :
     * on garde la ligne la plus récente du tampon.
     */
    g.sort(function(a,b){
      return Number(b.ligne)-Number(a.ligne);
    });

    g.slice(1).forEach(function(item){
      item.statut='DOUBLON_CSV';
      item.detail=
        'Doublon du même élève, de la même période et du même SIRET.';
    });
  });

  var counts={};
  var legacyIgnored=0;

  items.forEach(function(item){
    counts[item.statut]=
      (counts[item.statut]||0)+1;

    if(item.ancienneIgnoree){
      legacyIgnored++;
    }
  });

  return {
    ok:true,
    total:items.length,
    anciennesIgnorees:legacyIgnored,
    counts:counts,
    items:items
  };
}

function EUC_DEV322_auditerDifferentiel(){
  EUC_IMPORT_exigerAdminTexte_();

  var r=EUC_DEV322_analyze_();

  return {
    ok:true,
    total:r.total,
    anciennesIgnorees:r.anciennesIgnorees,
    counts:r.counts,
    lignes:r.items.map(function(x){
      return {
        ligne:x.ligne,
        eleve:x.eleve,
        statut:x.statut,
        detail:x.detail,
        ancienneIgnoree:x.ancienneIgnoree,
        csvSiret:x.csvSiret,
        pfmpSiret:x.pfmpSiret,
        raison:x.raison,
        classe:x.classId,
        periode:x.periodId,
        annee:x.year
      };
    })
  };
}

function EUC_DEV322_patchBufferValidated_(ids,ctx){
  if(!ids.length){
    return;
  }

  try{
    var table=
      EUC_DEV316_detectBufferTable_();

    var cols=
      EUC_ENT_grist(
        'get',
        '/tables/'+
          encodeURIComponent(table)+
          '/columns'
      ).columns||[];

    var have={};

    cols.forEach(function(c){
      have[String(c.id||'')]=true;
    });

    var patches=
      ids.map(function(id){
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
        return Object.keys(x.fields).length>0;
      });

    if(patches.length){
      EUC_ENT_grist(
        'patch',
        '/tables/'+
          encodeURIComponent(table)+
          '/records',
        {records:patches}
      );
    }

  }catch(e){}
}

function EUC_DEV322_importerNouveaux(){
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
      EUC_DEV322_analyze_();

    var ready=
      pre.items.filter(function(x){
        return x.statut==='NOUVELLE_PRETE';
      });
    var freshTokens=EUC_DEV425_beginImportItems_(ready,'import-jotform-differentiel');

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
    var skippedRace=0;
    var errors=[];
    var targets={};
    var touchedYears={};
    var validatedIds=[];

    ready.forEach(function(item){
      try{
        /*
         * Relecture juste avant écriture pour rendre l'opération
         * idempotente même si un autre traitement a créé le dossier
         * après le préflight.
         */
        var now=
          EUC_DEV322_flat_(
            'EUC_ACCES_FORMULAIRES_PFMP'
          );

        var existsNow=
          now.some(function(a){
            return (
              EUC_DEV322_ref_(a.Eleve)===
                item.studentId &&
              EUC_DEV322_ref_(a.Classe_convention)===
                item.classId &&
              EUC_DEV322_ref_(a.Periode)===
                item.periodId &&
              String(a.Annee_scolaire||'').trim()===
                item.year
            );
          });

        if(existsNow){
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
              lot:'MIGRATION_JOTFORM_DEV322'
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

        created++;
        validatedIds.push(item.ligne);

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

        touchedYears[item.year]=true;

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

    EUC_DEV322_patchBufferValidated_(
      validatedIds,
      ctx
    );

    try{
      EUC_DEV315_clearCaches_(
        targets,
        touchedYears
      );
    }catch(eCache){}
    var freshSnapshots=EUC_DEV425_finishMany_(freshTokens);

    /*
     * Contrôle final : le même analyseur doit maintenant classer
     * les créations comme DEJA_PRESENTE.
     */
    var after=
      EUC_DEV322_analyze_();

    var stillReady=
      after.items.filter(function(x){
        return x.statut==='NOUVELLE_PRETE';
      }).length;

    return {
      ok:errors.length===0,
      total:after.total,
      creees:created,
      dejaCreeesPendantImport:skippedRace,
      erreurs:errors,
      snapshots:freshSnapshots,
      restantesPretes:stillReady,
      anciennesIgnorees:after.anciennesIgnorees,
      counts:after.counts,
      lignes:after.items.map(function(x){
        return {
          ligne:x.ligne,
          eleve:x.eleve,
          statut:x.statut,
          detail:x.detail,
          csvSiret:x.csvSiret,
          pfmpSiret:x.pfmpSiret
        };
      })
    };

  }finally{
    lock.releaseLock();
  }
}
