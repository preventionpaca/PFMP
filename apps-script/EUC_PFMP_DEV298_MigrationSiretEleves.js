/**
 * Eucalyptus PFMP — v1.0.0-dev.298
 *
 * Migration JotForm :
 * - réutilise EXACTEMENT le moteur SIRET PFMP DEV202
 *   (apprentis + formulaire QR) ;
 * - complète raison sociale / enseigne / adresse / CP / ville ;
 * - propose un rapprochement manuel de l'élève parmi sa classe ;
 * - conserve le nom saisi JotForm comme trace source.
 */

var EUC_DEV298_TABLE_='EUC_MIGRATION_JOTFORM_PFMP';
var EUC_DEV298_YEAR_='2026-2027';

function EUC_DEV298_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV298_digits_(v){
  return EUC_DEV298_txt_(v).replace(/\D+/g,'');
}

function EUC_DEV298_norm_(v){
  return EUC_DEV298_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function EUC_DEV298_col_(id,label,type){
  return {
    id:id,
    fields:{
      label:label,
      type:type||'Text'
    }
  };
}

function EUC_DEV298_ensureCols_(){
  var path=
    '/tables/'+
    encodeURIComponent(EUC_DEV298_TABLE_)+
    '/columns';

  var cols=(
    EUC_ENT_grist(
      'get',
      path
    ).columns||
    []
  );

  var have={};

  cols.forEach(function(c){
    have[String(c.id||'')]=true;
  });

  var c=EUC_DEV298_col_;

  var wanted=[
    c('Importer','Importer','Bool'),
    c('SIRET_statut','État SIRET'),
    c('SIRET_source','Source SIRET'),
    c('Raison_sociale_officielle','Raison sociale officielle'),
    c('Nom_commercial','Nom commercial / enseigne'),
    c('Adresse_officielle','Adresse officielle'),
    c('CP_officiel','CP officiel'),
    c('Ville_officielle','Ville officielle'),
    c('SIRET_erreur','Erreur SIRET'),
    c('Date_verification_SIRET','Vérifié le','Text')
  ];

  wanted
    .filter(function(x){
      return !have[x.id];
    })
    .forEach(function(col){
      EUC_ENT_grist(
        'post',
        path,
        {
          columns:[
            col
          ]
        }
      );
    });

  return true;
}

function EUC_DEV298_rows_(){
  EUC_DEV298_ensureCols_();

  return (
    EUC_IMPORT_lireRecords_(
      EUC_DEV298_TABLE_
    )||
    []
  ).filter(function(r){
    return (
      EUC_DEV298_txt_(
        r.Annee_scolaire
      )===
      EUC_DEV298_YEAR_
    );
  });
}

function EUC_DEV298_students_(){
  var rows=[];

  try{
    rows=EUC_IMPORT_lireRecords_(
      'EUC_ELEVES_PFMP'
    )||[];
  }catch(e){
    return [];
  }

  function get(r,names){
    for(var i=0;i<names.length;i++){
      var v=r[names[i]];

      if(
        v!==undefined &&
        v!==null &&
        String(v).trim()!==''
      ){
        return v;
      }
    }

    return '';
  }

  return rows.map(function(r){
    var nom=get(
      r,
      [
        'Nom',
        'NOM',
        'Nom_eleve'
      ]
    );

    var prenom=get(
      r,
      [
        'Prenom',
        'Prénom',
        'PRENOM',
        'Prenom_eleve',
        'Prenom_usage'
      ]
    );

    var classe=get(
      r,
      [
        'Classe_libelle',
        'Classe_nom',
        'Classe',
        'CLASSE'
      ]
    );

    return {
      id:Number(r.id)||0,
      nom:EUC_DEV298_txt_(nom),
      prenom:EUC_DEV298_txt_(prenom),
      classe:EUC_DEV298_txt_(classe),
      classeKey:EUC_DEV298_norm_(classe),
      label:(
        EUC_DEV298_txt_(nom)+
        ' '+
        EUC_DEV298_txt_(prenom)
      ).trim()
    };
  }).filter(function(x){
    return !!(
      x.id &&
      x.nom
    );
  });
}

function EUC_DEV298_studentsByClass_(){
  var out={};

  EUC_DEV298_students_()
    .forEach(function(s){
      var k=s.classeKey;

      if(!out[k]){
        out[k]=[];
      }

      out[k].push({
        id:s.id,
        label:s.label
      });
    });

  Object.keys(out).forEach(function(k){
    out[k].sort(function(a,b){
      return a.label.localeCompare(
        b.label,
        'fr'
      );
    });
  });

  return out;
}

function EUC_DEV298_safePatch_(records){
  records=records||[];

  if(!records.length){
    return 0;
  }

  var path=
    '/tables/'+
    encodeURIComponent(
      EUC_DEV298_TABLE_
    )+
    '/records';

  var done=0;

  for(
    var i=0;
    i<records.length;
    i+=20
  ){
    var chunk=records.slice(
      i,
      i+20
    );

    try{
      EUC_ENT_grist(
        'patch',
        path,
        {
          records:chunk
        }
      );

      done+=chunk.length;

    }catch(batchErr){
      for(
        var j=0;
        j<chunk.length;
        j++
      ){
        try{
          EUC_ENT_grist(
            'patch',
            path,
            {
              records:[
                chunk[j]
              ]
            }
          );

          done++;

        }catch(rowErr){
          throw new Error(
            'Écriture tampon Grist impossible pour la ligne '+
            chunk[j].id+
            ' : '+
            String(
              rowErr&&
              rowErr.message||
              rowErr
            )
          );
        }
      }
    }
  }

  return done;
}

function EUC_DEV298_cleanAlerts_(
  alerts,
  options
){
  options=options||{};

  var parts=String(alerts||'')
    .split('·')
    .map(function(x){
      return x.trim();
    })
    .filter(Boolean);

  parts=parts.filter(function(x){
    var n=EUC_DEV298_norm_(x);

    if(
      options.eleve &&
      (
        n.indexOf('ELEVE INTROUVABLE')>=0 ||
        n.indexOf('ELEVE A VERIFIER')>=0
      )
    ){
      return false;
    }

    if(
      options.entreprise &&
      (
        n.indexOf('ENTREPRISE A RAPPROCHER')>=0 ||
        n.indexOf('SIRET ABSENT')>=0 ||
        n.indexOf('SIRET INVALIDE')>=0 ||
        n.indexOf('SIREN 9 CHIFFRES')>=0
      )
    ){
      return false;
    }

    return true;
  });

  return parts.join(' · ');
}

function EUC_DEV298_prepareVerification(){
  var ctx=EUC_V156_contexteAdmin_();

  if(!ctx){
    throw new Error(
      'Accès administrateur requis.'
    );
  }

  if(
    typeof EUC_DEV202_lookupSiret!=='function'
  ){
    throw new Error(
      'Le moteur SIRET PFMP DEV202 est indisponible.'
    );
  }

  var rows=EUC_DEV298_rows_();
  var unique={};
  var invalid=[];

  rows.forEach(function(r){
    var s=EUC_DEV298_digits_(
      r.SIRET_normalise||
      r.SIRET_brut
    );

    if(s.length===14){
      unique[s]=true;
    }else{
      invalid.push({
        id:Number(r.id)||0,
        fields:{
          Importer:false,
          SIRET_statut:
            s.length===9
              ? 'MANUEL_SIREN_9_CHIFFRES'
              : 'MANUEL_SIRET_INVALIDE',
          SIRET_source:'',
          SIRET_erreur:
            s.length
              ? 'SIRET/SIREN incomplet : '+
                s.length+
                ' chiffre(s).'
              : 'SIRET absent.',
          Date_verification_SIRET:
            new Date().toISOString()
        }
      });
    }
  });

  EUC_DEV298_safePatch_(
    invalid
  );

  return {
    ok:true,
    totalLignes:rows.length,
    sirets:Object.keys(unique),
    invalides:invalid.length
  };
}

function EUC_DEV300_isTransientSiretError_(hit){
  var msg=String(
    hit&&hit.error||
    ''
  );

  return /HTTP\s*(429|500|502|503|504)|timeout|tempor|indispon/i.test(msg);
}

function EUC_DEV300_lookupSiretRetry_(siret){
  var delays=[
    0,
    5000,
    8000,
    10000
  ];

  var last={
    found:false,
    error:'Aucun résultat'
  };

  for(
    var i=0;
    i<delays.length;
    i++
  ){
    if(delays[i]){
      Utilities.sleep(
        delays[i]
      );
    }

    try{
      last=
        EUC_DEV202_lookupSiret(
          siret
        )||
        {
          found:false,
          error:'Aucun résultat'
        };
    }catch(e){
      last={
        found:false,
        error:String(
          e&&e.message||
          e
        )
      };
    }

    last.attempts=i+1;

    if(last.found){
      return last;
    }

    if(
      !EUC_DEV300_isTransientSiretError_(
        last
      )
    ){
      return last;
    }
  }

  return last;
}

function EUC_DEV300_cleanAlerts_(alerts,opts){
  opts=opts||{};

  var parts=String(alerts||'')
    .split('·')
    .map(function(x){
      return x.trim();
    })
    .filter(Boolean);

  return parts.filter(function(x){
    var n=EUC_DEV298_norm_(x);

    if(
      opts.eleve &&
      (
        n.indexOf('ELEVE INTROUVABLE')>=0 ||
        n.indexOf('ELEVE A VERIFIER')>=0 ||
        n.indexOf('ELEVE AMBIGU')>=0
      )
    ){
      return false;
    }

    if(
      opts.classe &&
      (
        n.indexOf('CLASSE INTROUVABLE')>=0 ||
        n.indexOf('CLASSE A VERIFIER')>=0
      )
    ){
      return false;
    }

    if(
      opts.entreprise &&
      (
        n.indexOf('ENTREPRISE A RAPPROCHER')>=0 ||
        n.indexOf('SIRET ABSENT')>=0 ||
        n.indexOf('SIRET INVALIDE')>=0 ||
        n.indexOf('SIREN 9 CHIFFRES')>=0
      )
    ){
      return false;
    }

    return true;
  }).join(' · ');
}

function EUC_DEV298_verifyChunk(sirets){
  var ctx=
    EUC_V156_contexteAdmin_();

  if(!ctx){
    throw new Error(
      'Accès administrateur requis.'
    );
  }

  sirets=(
    sirets||
    []
  ).map(
    EUC_DEV298_digits_
  ).filter(function(x){
    return x.length===14;
  });

  if(!sirets.length){
    return {
      ok:true,
      traites:0,
      trouves:0,
      erreurs:0
    };
  }

  var wanted={};

  sirets.forEach(function(s){
    wanted[s]=true;
  });

  var rows=
    EUC_DEV298_rows_();

  var bySiret={};

  rows.forEach(function(r){
    var s=
      EUC_DEV298_digits_(
        r.SIRET_normalise||
        r.SIRET_brut
      );

    if(!wanted[s]){
      return;
    }

    if(!bySiret[s]){
      bySiret[s]=[];
    }

    bySiret[s].push(r);
  });

  var patches=[];
  var foundCount=0;
  var errorCount=0;
  var now=new Date().toISOString();

  sirets.forEach(function(siret){
    var hit=
      EUC_DEV300_lookupSiretRetry_(
        siret
      );

    var found=!!(
      hit&&
      hit.found
    );

    if(found){
      foundCount++;
    }else{
      errorCount++;
    }

    (
      bySiret[siret]||
      []
    ).forEach(function(r){
      if(found){
        var global=
          hit.globalEntreprise||
          {};

        var alerts=
          EUC_DEV300_cleanAlerts_(
            r.Alertes,
            {
              entreprise:true
            }
          );

        var fields={
          SIRET_statut:'VERIFIE',
          SIRET_source:
            hit.source||
            'Moteur PFMP DEV202',
          Raison_sociale_officielle:
            EUC_DEV298_txt_(
              hit.nomEntreprise
            ),
          Nom_commercial:
            EUC_DEV298_txt_(
              hit.nomCommercial||
              r.Nom_commercial||
              r.Entreprise_saisie
            ),
          Adresse_officielle:
            EUC_DEV298_txt_(
              hit.adresse
            ),
          CP_officiel:
            EUC_DEV298_txt_(
              hit.codePostal
            ),
          Ville_officielle:
            EUC_DEV298_txt_(
              hit.ville
            ),
          SIRET_erreur:'',
          Date_verification_SIRET:
            now,
          Entreprise_match_libelle:
            EUC_DEV298_txt_(
              hit.nomEntreprise||
              hit.nomCommercial
            ),
          Entreprise_score:100,
          Alertes:alerts
        };

        if(
          global &&
          Number(global.id)
        ){
          fields.Entreprise_match_id=
            Number(global.id);
        }

        var studentOk=
          Number(
            r.Eleve_match_id
          )||0;

        var classOk=
          Number(
            r.Classe_match_id
          )||0;

        fields.Importer=
          !!(
            studentOk&&
            classOk
          );

        fields.Niveau_controle=
          alerts
            ? 'ORANGE'
            : (
                studentOk&&classOk
                  ? 'VERT'
                  : 'ROUGE'
              );

        patches.push({
          id:Number(r.id),
          fields:fields
        });

      }else{
        patches.push({
          id:Number(r.id),
          fields:{
            Importer:false,
            SIRET_statut:
              'A_CONTROLER',
            SIRET_source:'',
            SIRET_erreur:
              (
                EUC_DEV298_txt_(
                  hit&&hit.error
                )||
                'Entreprise non retrouvée par le moteur PFMP.'
              )+
              (
                hit&&hit.attempts>1
                  ? ' · '+hit.attempts+' tentative(s)'
                  : ''
              ),
            Date_verification_SIRET:
              now
          }
        });
      }
    });
  });

  EUC_DEV298_safePatch_(
    patches
  );

  return {
    ok:true,
    traites:sirets.length,
    trouves:foundCount,
    erreurs:errorCount
  };
}

function EUC_DEV299_classesMap_(){
  var out={byId:{},byNorm:{}};

  var classes=[];

  try{
    if(typeof EUC_V160_classes_==='function'){
      classes=EUC_V160_classes_()||[];
    }
  }catch(e){}

  classes.forEach(function(c){
    var id=Number(c.id)||0;
    var label=EUC_DEV298_txt_(c.label);

    if(!id||!label)return;

    out.byId[id]={
      id:id,
      label:label
    };

    out.byNorm[
      EUC_DEV298_norm_(label)
    ]=id;
  });

  return out;
}

function EUC_DEV299_studentsByClassId_(){
  var rows=[];

  try{
    rows=
      EUC_IMPORT_lireRecords_(
        'EUC_ELEVES_PFMP'
      )||
      [];
  }catch(e){
    return {};
  }

  var cm=EUC_DEV299_classesMap_();
  var out={};

  function first(r,names){
    for(var i=0;i<names.length;i++){
      var v=r[names[i]];

      if(
        v!==undefined &&
        v!==null &&
        String(v).trim()!==''
      ){
        return v;
      }
    }

    return '';
  }

  rows.forEach(function(r){
    var nom=EUC_DEV298_txt_(
      first(
        r,
        [
          'Nom',
          'NOM',
          'Nom_eleve'
        ]
      )
    );

    var prenom=EUC_DEV298_txt_(
      first(
        r,
        [
          'Prenom',
          'Prénom',
          'PRENOM',
          'Prenom_eleve',
          'Prenom_usage'
        ]
      )
    );

    if(!nom){
      return;
    }

    var rawClass=
      first(
        r,
        [
          'Classe',
          'Classe_id',
          'Classe_ref',
          'Classe_libelle',
          'Classe_nom',
          'CLASSE'
        ]
      );

    var cid=0;

    try{
      if(
        typeof EUC_PFMP_ref_==='function'
      ){
        cid=Number(
          EUC_PFMP_ref_(rawClass)
        )||0;
      }
    }catch(e){}

    if(!cid){
      if(Array.isArray(rawClass)){
        cid=
          Number(
            rawClass[1]||
            rawClass[0]
          )||0;
      }else{
        cid=
          Number(rawClass)||0;
      }
    }

    if(!cid){
      cid=
        cm.byNorm[
          EUC_DEV298_norm_(rawClass)
        ]||
        0;
    }

    if(!cid){
      return;
    }

    if(!out[cid]){
      out[cid]=[];
    }

    out[cid].push({
      id:Number(r.id)||0,
      label:(
        nom+
        ' '+
        prenom
      ).trim()
    });
  });

  Object.keys(out).forEach(function(k){
    out[k].sort(function(a,b){
      return a.label.localeCompare(
        b.label,
        'fr'
      );
    });
  });

  return out;
}

function EUC_DEV299_clearOfficial_(fields){
  fields.Raison_sociale_officielle='';
  fields.Adresse_officielle='';
  fields.CP_officiel='';
  fields.Ville_officielle='';
  fields.SIRET_source='';
  fields.Entreprise_match_id=0;
  fields.Entreprise_match_libelle='';
  fields.Entreprise_score=0;

  return fields;
}

function EUC_DEV299_applySiretResult_(
  row,
  siret,
  hit
){
  var now=new Date().toISOString();

  var fields={
    SIRET_brut:siret,
    SIRET_normalise:siret,
    Date_verification_SIRET:now
  };

  if(
    hit &&
    hit.found
  ){
    var global=
      hit.globalEntreprise||
      {};

    var alerts=
      EUC_DEV298_cleanAlerts_(
        row.Alertes,
        {
          entreprise:true
        }
      );

    fields.SIRET_statut='VERIFIE';
    fields.SIRET_source=
      hit.source||
      'Moteur PFMP DEV202';

    fields.SIRET_erreur='';

    fields.Raison_sociale_officielle=
      EUC_DEV298_txt_(
        hit.nomEntreprise
      );

    fields.Nom_commercial=
      EUC_DEV298_txt_(
        hit.nomCommercial||
        row.Nom_commercial||
        row.Entreprise_saisie
      );

    fields.Adresse_officielle=
      EUC_DEV298_txt_(
        hit.adresse
      );

    fields.CP_officiel=
      EUC_DEV298_txt_(
        hit.codePostal
      );

    fields.Ville_officielle=
      EUC_DEV298_txt_(
        hit.ville
      );

    fields.Entreprise_match_libelle=
      EUC_DEV298_txt_(
        hit.nomEntreprise||
        hit.nomCommercial
      );

    fields.Entreprise_score=100;

    if(
      global &&
      Number(global.id)
    ){
      fields.Entreprise_match_id=
        Number(global.id);
    }

    fields.Alertes=alerts;

    var studentOk=
      Number(row.Eleve_match_id)||0;

    var classOk=
      Number(row.Classe_match_id)||0;

    fields.Importer=
      !!(
        studentOk &&
        classOk
      );

    fields.Niveau_controle=
      alerts
        ? 'ORANGE'
        : (
            studentOk&&classOk
              ? 'VERT'
              : 'ROUGE'
          );

  }else{
    EUC_DEV299_clearOfficial_(
      fields
    );

    fields.Importer=false;
    fields.SIRET_statut='A_CONTROLER';
    fields.SIRET_erreur=
      EUC_DEV298_txt_(
        hit&&hit.error
      )||
      'Entreprise non retrouvée par le moteur PFMP.';
  }

  return fields;
}

function EUC_DEV299_verifierLigneSiret(payload){
  var ctx=
    EUC_V156_contexteAdmin_();

  if(!ctx){
    throw new Error(
      'Accès administrateur requis.'
    );
  }

  payload=payload||{};

  var id=
    Number(
      payload.id
    )||0;

  if(!id){
    throw new Error(
      'Ligne invalide.'
    );
  }

  var siret=
    EUC_DEV298_digits_(
      payload.siret
    );

  var row=
    EUC_DEV298_rows_()
      .filter(function(r){
        return Number(r.id)===id;
      })[0];

  if(!row){
    throw new Error(
      'Ligne tampon introuvable.'
    );
  }

  if(siret.length!==14){
    var invalid={
      SIRET_brut:
        EUC_DEV298_txt_(
          payload.siret
        ),
      SIRET_normalise:
        siret,
      Importer:false,
      SIRET_statut:
        siret.length===9
          ? 'MANUEL_SIREN_9_CHIFFRES'
          : 'MANUEL_SIRET_INVALIDE',
      SIRET_source:'',
      SIRET_erreur:
        siret.length
          ? 'Le numéro corrigé contient '+
            siret.length+
            ' chiffre(s). 14 chiffres attendus.'
          : 'SIRET absent.',
      Date_verification_SIRET:
        new Date().toISOString()
    };

    EUC_DEV299_clearOfficial_(
      invalid
    );

    EUC_DEV298_safePatch_([
      {
        id:id,
        fields:invalid
      }
    ]);

    return {
      ok:false,
      found:false,
      error:
        invalid.SIRET_erreur
    };
  }

  var hit=
    EUC_DEV300_lookupSiretRetry_(
      siret
    );

  var fields=
    EUC_DEV299_applySiretResult_(
      row,
      siret,
      hit
    );

  if(
    !hit.found &&
    hit.attempts>1
  ){
    fields.SIRET_erreur=
      (
        fields.SIRET_erreur||
        'Entreprise non retrouvée.'
      )+
      ' · '+
      hit.attempts+
      ' tentative(s)';
  }

  EUC_DEV298_safePatch_([
    {
      id:id,
      fields:fields
    }
  ]);

  return {
    ok:true,
    found:!!(
      hit&&
      hit.found
    ),
    siret:siret,
    attempts:
      hit&&
      hit.attempts||
      1,
    result:
      hit||{}
  };
}

function EUC_DEV298_lister(){
  var ctx=
    EUC_V156_contexteAdmin_();

  if(!ctx){
    throw new Error(
      'Accès administrateur requis.'
    );
  }

  var rows=
    EUC_DEV298_rows_();

  var classesMap=
    EUC_DEV299_classesMap_();

  var classes=
    Object.keys(
      classesMap.byId
    ).map(function(k){
      return classesMap.byId[k];
    }).sort(function(a,b){
      return a.label.localeCompare(
        b.label,
        'fr'
      );
    });

  var lines=
    rows.map(function(r){
      return {
        id:Number(r.id)||0,

        submission:
          EUC_DEV298_txt_(
            r.Submission_ID
          ),

        eleve:
          (
            EUC_DEV298_txt_(
              r.Nom_eleve
            )+
            ' '+
            EUC_DEV298_txt_(
              r.Prenom_eleve
            )
          ).trim(),

        classe:
          EUC_DEV298_txt_(
            r.Classe_saisie
          ),

        classeId:
          Number(
            r.Classe_match_id
          )||0,

        classeRetenue:
          EUC_DEV298_txt_(
            r.Classe_match_libelle
          ),

        siret:
          EUC_DEV298_txt_(
            r.SIRET_normalise||
            r.SIRET_brut
          ),

        entrepriseSaisie:
          EUC_DEV298_txt_(
            r.Entreprise_saisie
          ),

        adresseSaisie:
          EUC_DEV298_txt_(
            r.Adresse_entreprise
          ),

        complementAdresseSaisie:
          EUC_DEV298_txt_(
            r.Complement_adresse_entreprise
          ),

        cpSaisi:
          EUC_DEV298_txt_(
            r.CP_entreprise
          ),

        villeSaisie:
          EUC_DEV298_txt_(
            r.Ville_entreprise
          ),

        raisonOfficielle:
          EUC_DEV298_txt_(
            r.Raison_sociale_officielle
          ),

        nomCommercial:
          EUC_DEV298_txt_(
            r.Nom_commercial
          ),

        adresseOfficielle:
          EUC_DEV298_txt_(
            r.Adresse_officielle
          ),

        cpOfficiel:
          EUC_DEV298_txt_(
            r.CP_officiel
          ),

        villeOfficielle:
          EUC_DEV298_txt_(
            r.Ville_officielle
          ),

        siretStatut:
          EUC_DEV298_txt_(
            r.SIRET_statut
          ),

        siretErreur:
          EUC_DEV298_txt_(
            r.SIRET_erreur
          ),

        importer:
          r.Importer===true,

        matchEleveId:
          Number(
            r.Eleve_match_id
          )||0,

        matchEleve:
          EUC_DEV298_txt_(
            r.Eleve_match_libelle
          ),

        alertes:
          EUC_DEV298_txt_(
            r.Alertes
          ),

        decision:
          EUC_DEV298_txt_(
            r.Decision
          )
      };
    });

  var counts={
    total:lines.length,
    verifies:0,
    manuel:0,
    importer:0,
    elevesNonReconnus:0
  };

  lines.forEach(function(r){
    if(
      r.siretStatut==='VERIFIE'
    ){
      counts.verifies++;
    }else{
      counts.manuel++;
    }

    if(r.importer){
      counts.importer++;
    }

    if(!r.matchEleveId){
      counts.elevesNonReconnus++;
    }
  });

  return {
    annee:EUC_DEV298_YEAR_,
    counts:counts,
    lignes:lines,
    classes:classes,
    elevesParClasseId:
      EUC_DEV299_studentsByClassId_()
  };
}

function EUC_DEV298_saveLine(payload){
  var ctx=
    EUC_V156_contexteAdmin_();

  if(!ctx){
    throw new Error(
      'Accès administrateur requis.'
    );
  }

  payload=payload||{};

  var id=
    Number(
      payload.id
    )||0;

  if(!id){
    throw new Error(
      'Ligne invalide.'
    );
  }

  var rows=
    EUC_DEV298_rows_();

  var row=
    rows.filter(function(r){
      return Number(r.id)===id;
    })[0];

  if(!row){
    throw new Error(
      'Ligne tampon introuvable.'
    );
  }

  var oldSiret=
    EUC_DEV298_digits_(
      row.SIRET_normalise||
      row.SIRET_brut
    );

  var newSiret=
    EUC_DEV298_digits_(
      payload.siret
    );

  var fields={
    Importer:
      payload.importer===true,

    Nom_commercial:
      EUC_DEV298_txt_(
        payload.nomCommercial
      ),

    SIRET_brut:
      EUC_DEV298_txt_(
        payload.siret
      ),

    SIRET_normalise:
      newSiret
  };

  if(newSiret!==oldSiret){
    EUC_DEV299_clearOfficial_(
      fields
    );

    fields.Importer=false;

    if(newSiret.length===14){
      fields.SIRET_statut=
        'A_VERIFIER';

      fields.SIRET_erreur=
        'SIRET modifié : cliquez sur Vérifier.';
    }else{
      fields.SIRET_statut=
        newSiret.length===9
          ? 'MANUEL_SIREN_9_CHIFFRES'
          : 'MANUEL_SIRET_INVALIDE';

      fields.SIRET_erreur=
        newSiret.length
          ? 'SIRET corrigé incomplet : '+
            newSiret.length+
            ' chiffre(s).'
          : 'SIRET absent.';
    }
  }

  var classId=
    Number(
      payload.classeId
    )||0;

  var classesMap=
    EUC_DEV299_classesMap_();

  if(!classId){
    classId=
      Number(
        row.Classe_match_id
      )||0;
  }

  var classObj=
    classesMap.byId[
      classId
    ];

  if(classId&&!classObj){
    throw new Error(
      'Classe choisie introuvable.'
    );
  }

  var oldClassId=
    Number(
      row.Classe_match_id
    )||0;

  if(classObj){
    fields.Classe_match_id=
      classObj.id;

    fields.Classe_match_libelle=
      classObj.label;
  }

  var alerts=
    EUC_DEV300_cleanAlerts_(
      row.Alertes,
      {
        classe:!!classObj
      }
    );

  var eleveId=
    Number(
      payload.eleveId
    )||0;

  /*
   * Si on change de classe, un ancien élève rapproché ne doit jamais
   * rester attaché à la nouvelle classe.
   */
  if(
    classId &&
    oldClassId &&
    classId!==oldClassId &&
    !eleveId
  ){
    fields.Eleve_match_id=0;
    fields.Eleve_match_libelle='';
  }

  if(eleveId){
    var studentsByClass=
      EUC_DEV299_studentsByClassId_();

    var student=
      (
        studentsByClass[classId]||
        []
      ).filter(function(s){
        return s.id===eleveId;
      })[0];

    if(!student){
      throw new Error(
        'Élève choisi absent de la classe retenue.'
      );
    }

    fields.Eleve_match_id=
      student.id;

    fields.Eleve_match_libelle=
      student.label;

    alerts=
      EUC_DEV300_cleanAlerts_(
        alerts,
        {
          eleve:true
        }
      );
  }

  fields.Alertes=
    alerts;

  var effectiveStudent=
    eleveId||
    (
      classId===oldClassId
        ? Number(
            row.Eleve_match_id
          )||0
        : 0
    );

  var companyOk=
    EUC_DEV298_txt_(
      row.SIRET_statut
    )==='VERIFIE' &&
    newSiret===oldSiret;

  var classOk=
    !!classId;

  var studentOk=
    !!effectiveStudent;

  fields.Niveau_controle=
    alerts
      ? 'ORANGE'
      : (
          companyOk&&
          classOk&&
          studentOk
            ? 'VERT'
            : 'ORANGE'
        );

  if(
    companyOk&&
    classOk&&
    studentOk
  ){
    fields.Importer=true;
  }

  EUC_DEV298_safePatch_([
    {
      id:id,
      fields:fields
    }
  ]);

  return {
    ok:true
  };
}

function EUC_DEV298_validateSelection(){
  var ctx=EUC_V156_contexteAdmin_();

  if(!ctx){
    throw new Error(
      'Accès administrateur requis.'
    );
  }

  var rows=EUC_DEV298_rows_();
  var now=new Date().toISOString();

  var patches=rows.map(function(r){
    var selected=
      r.Importer===true;

    return {
      id:Number(r.id),
      fields:{
        Decision:
          selected
            ? 'VALIDEE'
            : 'IGNOREE',
        Date_validation:
          selected
            ? now
            : null,
        Valide_par:
          selected
            ? (
                ctx.email||
                ''
              )
            : ''
      }
    };
  });

  EUC_DEV298_safePatch_(
    patches
  );

  return EUC_DEV298_lister();
}
