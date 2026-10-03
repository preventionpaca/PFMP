/**
 * PFMP — v1.0.0-dev.326
 * Import rapide, groupé et idempotent des lignes NOUVELLE_PRETE
 * après le garde anti-doublons DEV.325.
 */

function EUC_DEV326_key_(a){
  return [
    EUC_DEV325_ref_(a.Eleve),
    EUC_DEV325_ref_(a.Classe_convention),
    EUC_DEV325_ref_(a.Periode),
    String(a.Annee_scolaire||'').trim()
  ].join('|');
}

function EUC_DEV326_itemKey_(item){
  return [
    Number(item.studentId)||0,
    Number(item.classId)||0,
    Number(item.periodId)||0,
    String(item.year||'').trim()
  ].join('|');
}

function EUC_DEV326_importerNouveauxRapide(){
  var lock=LockService.getScriptLock();

  if(!lock.tryLock(10000)){
    throw new Error(
      'Un autre import PFMP est déjà en cours.'
    );
  }

  try{
    var started=Date.now();

    var ctx=
      EUC_IMPORT_exigerAdminTexte_();

    /*
     * UN SEUL préflight complet.
     * Il contient déjà le garde anti-doublons historiques.
     */
    var pre=
      EUC_DEV325_analyze_();

    var ready=
      (pre.items||[])
      .filter(function(x){
        return x.statut==='NOUVELLE_PRETE';
      });

    if(!ready.length){
      return {
        ok:true,
        total:pre.total,
        pretesAvant:0,
        creees:0,
        sautees:0,
        verifiees:0,
        dureeMs:Date.now()-started,
        counts:pre.counts,
        message:'Aucune nouvelle convention à créer.'
      };
    }
    var freshTokens=EUC_DEV425_beginImportItems_(ready,'import-jotform-rapide');

    var accessTable=
      'EUC_ACCES_FORMULAIRES_PFMP';

    var before=
      EUC_DEV325_flat_(accessTable);

    var beforeKeys={};

    before.forEach(function(a){
      beforeKeys[EUC_DEV326_key_(a)]=true;
    });

    var accessCols=
      EUC_DEV315_columns_(
        accessTable
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

    var posts=[];
    var candidates=[];
    var inBatch={};
    var skipped=0;
    var preparationErrors=[];

    ready.forEach(function(item){
      try{
        var key=
          EUC_DEV326_itemKey_(item);

        /*
         * Reprise après timeout : si DEV.325 a déjà créé le dossier
         * avant son expiration, il est ignoré ici.
         */
        if(beforeKeys[key]||inBatch[key]){
          skipped++;
          return;
        }

        var genStudent=
          genBy[Number(item.studentId)];

        var cl=
          classBy[Number(item.classId)];

        if(!genStudent||!cl||!item.period){
          throw new Error(
            'Référentiel incomplet au moment de la préparation.'
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
              lot:'MIGRATION_JOTFORM_DEV326'
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

        posts.push({
          fields:fields
        });

        candidates.push({
          key:key,
          ligne:Number(item.ligne)||0,
          eleve:String(item.eleve||''),
          year:String(item.year||''),
          classId:Number(item.classId)||0,
          periodId:Number(item.periodId)||0
        });

        inBatch[key]=true;

      }catch(e){
        preparationErrors.push({
          ligne:Number(item.ligne)||0,
          eleve:String(item.eleve||''),
          erreur:String(e&&e.message||e)
        });
      }
    });

    /*
     * UNE SEULE écriture Grist pour tous les nouveaux.
     */
    if(posts.length){
      EUC_ENT_grist(
        'post',
        '/tables/'+
          encodeURIComponent(accessTable)+
          '/records',
        {
          records:posts
        }
      );
    }

    /*
     * UNE SEULE relecture de contrôle.
     */
    var after=
      EUC_DEV325_flat_(accessTable);

    var afterKeys={};

    after.forEach(function(a){
      afterKeys[EUC_DEV326_key_(a)]=true;
    });

    var verified=[];
    var missing=[];

    candidates.forEach(function(c){
      if(afterKeys[c.key]){
        verified.push(c);
      }else{
        missing.push(c);
      }
    });

    /*
     * Marquer uniquement les lignes réellement retrouvées après écriture.
     */
    var validatedIds=
      verified.map(function(c){
        return c.ligne;
      });

    if(validatedIds.length){
      EUC_DEV322_patchBufferValidated_(
        validatedIds,
        ctx
      );
    }

    /*
     * Invalidation des caches UNE SEULE FOIS.
     */
    var targets={};
    var years={};

    verified.forEach(function(c){
      targets[
        c.year+
        '|'+
        c.classId+
        '|'+
        c.periodId
      ]={
        year:c.year,
        classId:c.classId,
        periodId:c.periodId
      };

      years[c.year]=true;
    });

    try{
      EUC_DEV315_clearCaches_(
        targets,
        years
      );
    }catch(eCache){}
    var freshSnapshots=EUC_DEV425_finishMany_(freshTokens);

    /*
     * UN SEUL audit final.
     */
    var finalAudit=
      EUC_DEV325_analyze_();

    return {
      ok:
        preparationErrors.length===0 &&
        missing.length===0,

      total:finalAudit.total,
      pretesAvant:ready.length,
      preparees:posts.length,
      creees:verified.length,
      sautees:skipped,
      verifiees:verified.length,
      manquantesApresEcriture:missing.length,
      erreursPreparation:preparationErrors,
      lignesManquantes:missing,
      dureeMs:Date.now()-started,
      counts:finalAudit.counts,
      snapshots:freshSnapshots,
      lignes:finalAudit.items.map(function(x){
        return {
          ligne:x.ligne,
          eleve:x.eleve,
          statut:x.statut,
          detail:x.detail
        };
      })
    };

  }finally{
    lock.releaseLock();
  }
}
