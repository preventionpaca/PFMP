/**
 * Eucalyptus PFMP — v1.0.0-dev.273k
 * Optimisation import réel Pronote.
 *
 * Objectif : éviter de réécrire entièrement tous les élèves déjà inchangés.
 * - nouveaux : création complète
 * - modifiés : patch complet
 * - inchangés : patch minimal de présence/import
 * - responsables : uniquement création ou vraie modification
 * - écritures découpées en lots
 */

function EUC_DEV273K_chunks_(records,size,cb){
  size=Math.max(1,Number(size)||100);
  for(var i=0;i<records.length;i+=size){
    cb(records.slice(i,i+size));
  }
}

function EUC_DEV273K_gristBatch_(method,table,records){
  if(!records||!records.length)return;
  EUC_DEV273K_chunks_(records,100,function(chunk){
    EUC_ENT_grist(
      method,
      '/tables/'+encodeURIComponent(table)+'/records',
      {records:chunk}
    );
  });
}

function EUC_DEV273K_diffKeys_(oldObj,newObj){
  try{
    if(typeof EUC_IMPORT_diffObjRich_==='function'){
      return EUC_IMPORT_diffObjRich_(oldObj||{},newObj||{})||[];
    }
  }catch(e){}

  var out=[];
  Object.keys(newObj||{}).forEach(function(k){
    var a=oldObj&&oldObj[k];
    var b=newObj[k];

    if(a instanceof Date)a=a.toISOString();
    if(b instanceof Date)b=b.toISOString();

    if(String(a==null?'':a)!==String(b==null?'':b)){
      out.push(k);
    }
  });

  return out;
}

function EUC_DEV273K_meaningfulStudentDiff_(oldObj,newObj){
  var ignore={
    Date_derniere_presence_import:true,
    Present_dernier_import:true,
    Date_modification:true,
    Identifiant_lot_import:true,
    Empreinte_import:true
  };

  return EUC_DEV273K_diffKeys_(oldObj,newObj)
    .filter(function(k){return !ignore[k];});
}

function EUC_DEV273K_presenceFields_(common){
  return {
    Date_derniere_presence_import:common.Date_derniere_presence_import,
    Present_dernier_import:true,
    Identifiant_lot_import:common.Identifiant_lot_import,
    Empreinte_import:common.Empreinte_import
  };
}

function EUC_DEV273K_importerReelTexte(payload){
  var lock=LockService.getScriptLock();

  if(!lock.tryLock(1000)){
    throw new Error('Un autre import est déjà en cours.');
  }

  try{
    var ctx=EUC_IMPORT_exigerAdminTexte_();

    payload=payload||{};

    if(payload.confirmation!=='IMPORTER_REELLEMENT_DANS_GRIST'){
      throw new Error(
        'Confirmation explicite requise pour l’import réel.'
      );
    }

    var preview=EUC_IMPORT_previsualiserTexte(payload);

    if(!preview.pretAValider){
      throw new Error(
        'Import réel bloqué : anomalies ou classes inconnues.'
      );
    }

    var source=EUC_IMPORT_normaliserSourcePronote_(
      preview.sourcePronote||''
    );

    if(source!=='LP'&&source!=='LGT'){
      throw new Error(
        'Source Pronote LP/LGT non résolue.'
      );
    }

    EUC_IMPORT_assurerSchemaRich_();

    var annee=EUC_IMPORT_lireAnnee_(preview.annee);
    var anneeId=annee.id;

    var texte=String(payload.texte||'');

    var parsed=EUC_IMPORT_analyserTexteComplet_(
      texte,
      {annee:preview.annee}
    );

    EUC_IMPORT_extraireProfesseursPrincipaux_(
      texte,
      parsed
    );

    var classes=EUC_IMPORT_chargerClassesCamin_();

    var corrPersist=EUC_IMPORT_chargerCorrespondances_(
      preview.annee,
      source
    );

    EUC_IMPORT_preparerClasses_(
      parsed,
      classes,
      corrPersist,
      payload.correspondances||{},
      payload.classesExclues||[]
    );

    var classesById={};
    var classesByNom={};

    classes.forEach(function(c){
      classesById[String(c.id)]=c;
      classesByNom[
        EUC_IMPORT_normaliserCle_(c.nom)
      ]=c;
    });

    var existing=EUC_IMPORT_lireRecordsBruts_(
      EUC_IMPORT_ELEVES_TABLE_
    );

    var idx=EUC_IMPORT_indexExistantsReels_(
      existing,
      anneeId,
      source
    );

    var now=EUC_IMPORT_nowGrist_();

    var lot=
      'PRONOTE-FAST-'+
      source+'-'+
      preview.annee+'-'+
      now;

    var posts=[];
    var fullPatches=[];
    var presencePatches=[];
    var seen={};

    parsed.rows.forEach(function(r){
      if(
        r._exclueImport||
        !r.classe||
        String(r.classe)
          .indexOf('__NON_CORRESPONDUE__')===0
      ){
        return;
      }

      var c=
        classesById[String(r.classeGristId)]||
        classesByNom[
          EUC_IMPORT_normaliserCle_(r.classe)
        ];

      if(!c)return;

      var stable=EUC_IMPORT_cleStableLigne_(r);

      if(seen[stable]){
        throw new Error(
          'Doublon détecté : '+
          r.nom+' '+r.prenom
        );
      }

      seen[stable]=true;

      var cand=idx.stable[stable]||[];

      if(!cand.length){
        var ik=[
          EUC_SUIVI_normaliserIdentite_(r.nom),
          EUC_SUIVI_normaliserIdentite_(r.prenom),
          String(r.naissance||'')
        ].join('|');

        cand=idx.identite[ik]||[];
      }

      if(cand.length>1){
        throw new Error(
          'Rapprochement ambigu : '+
          r.nom+' '+r.prenom
        );
      }

      var common=EUC_IMPORT_recordFieldsRich_(
        r,
        c,
        anneeId,
        source,
        stable,
        preview,
        now,
        lot
      );

      if(!cand.length){
        posts.push({fields:common});
        return;
      }

      var old=cand[0].fields||cand[0];

      var changed=
        EUC_DEV273K_meaningfulStudentDiff_(
          old,
          common
        );

      if(changed.length){
        fullPatches.push({
          id:cand[0].id,
          fields:common
        });
      }else{
        presencePatches.push({
          id:cand[0].id,
          fields:EUC_DEV273K_presenceFields_(
            common
          )
        });
      }
    });

    /*
     * Élèves :
     *  - créations
     *  - vraies modifications
     *  - simple marque de présence pour les inchangés
     */
    EUC_DEV273K_gristBatch_(
      'post',
      EUC_IMPORT_ELEVES_TABLE_,
      posts
    );

    EUC_DEV273K_gristBatch_(
      'patch',
      EUC_IMPORT_ELEVES_TABLE_,
      fullPatches
    );

    EUC_DEV273K_gristBatch_(
      'patch',
      EUC_IMPORT_ELEVES_TABLE_,
      presencePatches
    );

    /*
     * Relecture des élèves uniquement si nécessaire pour récupérer
     * les IDs de nouvelles créations. Sinon on réutilise la lecture initiale.
     */
    var studentRows=posts.length
      ? EUC_IMPORT_lireRecordsBruts_(
          EUC_IMPORT_ELEVES_TABLE_
        )
      : existing;

    var studentIdx=
      EUC_IMPORT_indexExistantsReels_(
        studentRows,
        anneeId,
        source
      );

    var respExisting=
      EUC_IMPORT_lireRecordsBruts_(
        EUC_IMPORT_RESP_TABLE_
      );

    var respByStudentKey={};

    respExisting.forEach(function(rr){
      var f=rr.fields||rr;
      var sid=Number(f.Eleve)||0;
      var key=
        sid+
        '|'+
        String(f.Cle_responsable||'');

      if(
        sid&&
        f.Cle_responsable
      ){
        respByStudentKey[key]=rr;
      }
    });

    var respPosts=[];
    var respPatches=[];

    parsed.rows.forEach(function(r){
      if(
        r._exclueImport||
        !r.classe||
        String(r.classe)
          .indexOf('__NON_CORRESPONDUE__')===0
      ){
        return;
      }

      var stable=EUC_IMPORT_cleStableLigne_(r);

      var cand=
        studentIdx.stable[stable]||[];

      if(!cand.length){
        var ik=[
          EUC_SUIVI_normaliserIdentite_(r.nom),
          EUC_SUIVI_normaliserIdentite_(r.prenom),
          String(r.naissance||'')
        ].join('|');

        cand=studentIdx.identite[ik]||[];
      }

      if(cand.length!==1)return;

      var sid=cand[0].id;

      (r.responsables||[]).forEach(function(resp){
        var nf=EUC_IMPORT_respFieldsRich_(
          sid,
          r.ident||'',
          resp,
          source,
          now
        );

        var key=
          sid+
          '|'+
          nf.Cle_responsable;

        var old=respByStudentKey[key];

        if(!old){
          respPosts.push({fields:nf});
          return;
        }

        var changes=
          EUC_DEV273K_diffKeys_(
            old.fields||old,
            nf
          ).filter(function(k){
            return k!=='Date_derniere_synchro';
          });

        if(changes.length){
          respPatches.push({
            id:old.id,
            fields:nf
          });
        }
      });
    });

    EUC_DEV273K_gristBatch_(
      'post',
      EUC_IMPORT_RESP_TABLE_,
      respPosts
    );

    EUC_DEV273K_gristBatch_(
      'patch',
      EUC_IMPORT_RESP_TABLE_,
      respPatches
    );

    return {
      ok:true,
      sourcePronote:source,
      annee:preview.annee,
      crees:posts.length,
      misAJour:fullPatches.length,
      total:
        posts.length+
        fullPatches.length,
      inchanges:
        presencePatches.length,
      responsablesCrees:
        respPosts.length,
      responsablesMisAJour:
        respPatches.length,
      lot:lot,
      aucuneSuppression:true,
      auteur:ctx.email||'',
      mode:'FAST_DEV273K'
    };

  }finally{
    lock.releaseLock();
  }
}
