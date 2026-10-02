/**
 * PFMP — v1.0.0-dev.328
 * Résolution fiable et vérifiée des anomalies.
 */

function EUC_DEV328_frDate_(v){
  var iso=EUC_DEV315_dateISO_(v);

  if(!iso){
    return '';
  }

  return (
    iso.slice(8,10)+'/'+
    iso.slice(5,7)+'/'+
    iso.slice(0,4)
  );
}

function EUC_DEV328_className_(classId,classes){
  var c=(classes||[]).filter(function(x){
    return Number(x.id)===Number(classId);
  })[0]||{};

  return String(
    c.Code||
    c.Nom||
    c.Libelle||
    c.Classe||
    c.Code_classe||
    ('Classe '+classId)
  ).trim();
}

function EUC_DEV328_periodDisplay_(p,className){
  p=p||{};

  var ord=Number(p.ordinal)||0;

  var source=String(
    p.libelle||
    ''
  );

  var isStage=
    source.toUpperCase().indexOf('STAGE')>=0;

  var generic=
    (isStage?'Stage':'PFMP')+
    (ord>0?' n°'+ord:'');

  var dates=[
    EUC_DEV328_frDate_(p.debut),
    EUC_DEV328_frDate_(p.fin)
  ];

  var datesText=
    dates[0]||dates[1]
      ? ' — du '+(dates[0]||'?')+
        ' au '+(dates[1]||'?')
      : '';

  return {
    id:Number(p.id)||0,
    ordinal:ord,
    source:source,
    libelle:generic,
    classe:String(className||''),
    debut:String(p.debut||''),
    fin:String(p.fin||''),
    debutFr:dates[0],
    finFr:dates[1],
    display:
      String(className||'')+
      ' — '+
      generic+
      datesText+
      (
        source &&
        EUC_DEV328_normLabel_(source)!==
          EUC_DEV328_normLabel_(generic)
          ? ' ('+source+')'
          : ''
      )
  };
}

function EUC_DEV328_normLabel_(v){
  return String(v||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,'');
}

function EUC_DEV328_findAnalysisItem_(lineId){
  return (
    EUC_DEV325_analyze_().items||
    []
  ).filter(function(x){
    return Number(x.ligne)===Number(lineId);
  })[0]||null;
}

function EUC_DEV328_rowMap_(){
  var out={};

  (EUC_DEV316_rawBuffer_()||[])
    .forEach(function(r){
      out[Number(r.id)||0]=r;
    });

  return out;
}

function EUC_DEV328_accessMap_(){
  var out={};

  EUC_DEV325_flat_(
    'EUC_ACCES_FORMULAIRES_PFMP'
  ).forEach(function(a){
    out[Number(a.id)||0]=a;
  });

  return out;
}

function EUC_DEV328_list(){
  EUC_IMPORT_exigerAdminTexte_();

  var base=
    EUC_DEV327_listAnomalies();

  var analysis=
    EUC_DEV325_analyze_();

  var itemBy={};

  (analysis.items||[]).forEach(function(x){
    itemBy[Number(x.ligne)||0]=x;
  });

  var rows=EUC_DEV328_rowMap_();
  var accesses=EUC_DEV325_flat_(
    'EUC_ACCES_FORMULAIRES_PFMP'
  );

  var accessBy={};

  accesses.forEach(function(a){
    accessBy[Number(a.id)||0]=a;
  });

  var classes=
    EUC_DEV325_flat_('Classes');

  (base.anomalies||[]).forEach(function(x){
    var item=itemBy[Number(x.ligne)]||{};
    var className=
      EUC_DEV328_className_(
        item.classId,
        classes
      );

    x.classeNom=className;

    x.periodOptions=
      (EUC_DEV327_periodOptions_(item)||[])
      .map(function(p){
        return EUC_DEV328_periodDisplay_(
          p,
          className
        );
      });

    x.targetPeriod=
      x.periodOptions.filter(function(p){
        return Number(p.id)===
          Number(item.periodId);
      })[0]||null;

    /*
     * DEV.328 ne dépend plus de historicalAccessIds pour remplir
     * la liste : on repart directement des accès existants.
     */
    if(
      x.statut===
      'PERIODE_HISTORIQUE_A_CONTROLER'
    ){
      x.historical=
        accesses.filter(function(a){
          var year=String(
            a.Annee_scolaire||
            ''
          ).trim();

          return (
            EUC_DEV327_ref_(a.Eleve)===
              Number(item.studentId) &&
            EUC_DEV327_ref_(a.Classe_convention)===
              Number(item.classId) &&
            (
              !year ||
              year===String(item.year||'').trim()
            ) &&
            EUC_DEV327_ref_(a.Periode)!==
              Number(item.periodId)
          );
        })
        .sort(function(a,b){
          return Number(b.id||0)-Number(a.id||0);
        })
        .map(function(a){
          return {
            accessId:Number(a.id)||0,
            periodId:EUC_DEV327_ref_(a.Periode),
            libelle:String(
              a.Periode_libelle||
              'Ancienne période'
            ),
            debut:EUC_DEV315_dateISO_(
              a.Date_debut
            ),
            fin:EUC_DEV315_dateISO_(
              a.Date_fin
            ),
            debutFr:EUC_DEV328_frDate_(
              a.Date_debut
            ),
            finFr:EUC_DEV328_frDate_(
              a.Date_fin
            ),
            entreprise:String(
              a.Entreprise_raison_sociale||
              ''
            ),
            siret:String(
              a.Entreprise_siret||
              ''
            ).replace(/\D/g,'')
          };
        });
    }

    if(x.statut==='EXISTANTE_A_COMPLETER'){
      var existing=
        accessBy[Number(x.existingId)]||
        item.existing||
        {};

      var row=
        rows[Number(x.ligne)]||
        item.row||
        {};

      x.preview={
        existing:{
          accessId:Number(existing.id)||0,
          entreprise:String(
            existing.Entreprise_raison_sociale||
            ''
          ),
          siret:String(
            existing.Entreprise_siret||
            ''
          ).replace(/\D/g,''),
          adresse:String(
            existing.Entreprise_adresse||
            ''
          ),
          cp:String(
            existing.Entreprise_code_postal||
            ''
          ),
          ville:String(
            existing.Entreprise_commune||
            ''
          )
        },
        incoming:{
          entreprise:String(
            row.Raison_sociale_officielle||
            row.Entreprise_saisie||
            ''
          ),
          siret:String(
            row.SIRET_normalise||
            row.SIRET_brut||
            ''
          ).replace(/\D/g,''),
          adresse:String(
            row.Adresse_officielle||
            ''
          ),
          cp:String(
            row.CP_officiel||
            ''
          ),
          ville:String(
            row.Ville_officielle||
            ''
          )
        }
      };
    }
  });

  return base;
}

function EUC_DEV328_confirmPeriod(payload){
  EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var line=Number(payload.ligne)||0;
  var pid=Number(payload.periodeId)||0;

  var before=
    EUC_DEV328_findAnalysisItem_(line);

  if(
    !before ||
    before.statut!=='PERIODE_A_CONTROLER'
  ){
    throw new Error(
      'Cette ligne n’est plus en contrôle de période. Actualisez.'
    );
  }

  var p=
    EUC_DEV327_periodOptions_(before)
    .filter(function(x){
      return Number(x.id)===pid;
    })[0]||null;

  if(!p){
    throw new Error(
      'Période non autorisée pour la vraie classe.'
    );
  }

  EUC_DEV327_bufferPatch_(
    line,
    {
      Date_debut_brut:p.debut,
      Date_fin_brut:p.fin,
      Date_debut:p.debut,
      Date_fin:p.fin
    }
  );

  var after=
    EUC_DEV328_findAnalysisItem_(line);

  if(
    after &&
    after.statut==='PERIODE_A_CONTROLER'
  ){
    throw new Error(
      'La période a été écrite dans le tampon mais la ligne reste non résolue. Aucune convention n’a été créée.'
    );
  }

  return {
    ok:true,
    ligne:line,
    eleve:before.eleve,
    periode:EUC_DEV328_periodDisplay_(
      p,
      ''
    ),
    nouveauStatut:
      after
        ? String(after.statut||'')
        : 'RESOLUE'
  };
}

function EUC_DEV328_relinkHistorical(payload){
  EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var line=Number(payload.ligne)||0;
  var accessId=Number(payload.accessId)||0;

  var item=
    EUC_DEV328_findAnalysisItem_(line);

  if(
    !item ||
    item.statut!==
      'PERIODE_HISTORIQUE_A_CONTROLER'
  ){
    throw new Error(
      'Cette ligne n’est plus en anomalie historique. Actualisez.'
    );
  }

  var candidates=
    EUC_DEV328_list().anomalies
    .filter(function(x){
      return Number(x.ligne)===line;
    })[0]||null;

  var selected=
    candidates &&
    (candidates.historical||[])
      .filter(function(h){
        return Number(h.accessId)===accessId;
      })[0]||
    null;

  if(!selected){
    throw new Error(
      'L’accès sélectionné n’est pas une proposition valide pour cette ligne.'
    );
  }

  var target=
    EUC_DEV327_periodOptions_(item)
    .filter(function(p){
      return Number(p.id)===
        Number(item.periodId);
    })[0]||null;

  if(!target){
    throw new Error(
      'Période cible actuelle introuvable.'
    );
  }

  var accesses=
    EUC_DEV325_flat_(
      'EUC_ACCES_FORMULAIRES_PFMP'
    );

  var access=
    accesses.filter(function(a){
      return Number(a.id)===accessId;
    })[0]||null;

  if(!access){
    throw new Error(
      'Accès existant introuvable.'
    );
  }

  var duplicate=
    accesses.some(function(a){
      return (
        Number(a.id)!==accessId &&
        EUC_DEV327_ref_(a.Eleve)===
          Number(item.studentId) &&
        EUC_DEV327_ref_(a.Classe_convention)===
          Number(item.classId) &&
        EUC_DEV327_ref_(a.Periode)===
          Number(item.periodId) &&
        String(a.Annee_scolaire||'').trim()===
          String(item.year||'').trim()
      );
    });

  if(duplicate){
    throw new Error(
      'Une convention existe déjà sur la période cible. Aucun rattachement effectué.'
    );
  }

  var fields={
    Annee_scolaire:String(item.year||''),
    Classe_convention:Number(item.classId),
    Periode:Number(item.periodId),
    Periode_libelle:String(
      target.libelle||
      ''
    ),
    Date_debut:target.debut||null,
    Date_fin:target.fin||null
  };

  fields=
    EUC_DEV315_filter_(
      fields,
      EUC_DEV315_columns_(
        'EUC_ACCES_FORMULAIRES_PFMP'
      )
    );

  var oldPeriod=
    EUC_DEV327_ref_(access.Periode);

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
          fields:fields
        }
      ]
    }
  );

  try{
    var years={};
    years[item.year]=true;

    EUC_DEV315_clearCaches_(
      {
        x:{
          year:item.year,
          classId:item.classId,
          periodId:item.periodId
        }
      },
      years
    );
  }catch(e){}

  var after=
    EUC_DEV328_findAnalysisItem_(line);

  return {
    ok:true,
    ligne:line,
    eleve:item.eleve,
    accessId:accessId,
    anciennePeriode:oldPeriod,
    nouvellePeriode:Number(item.periodId),
    cible:EUC_DEV328_periodDisplay_(
      target,
      ''
    ),
    nouveauStatut:
      after
        ? String(after.statut||'')
        : 'RESOLUE'
  };
}

function EUC_DEV328_completeExisting(payload){
  var ctx=
    EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var line=Number(payload.ligne)||0;

  var item=
    EUC_DEV328_findAnalysisItem_(line);

  if(
    !item ||
    item.statut!=='EXISTANTE_A_COMPLETER'
  ){
    throw new Error(
      'Cette ligne n’est plus un accès à compléter. Actualisez.'
    );
  }

  if(!EUC_DEV327_companyVerified_(item.row||{})){
    throw new Error(
      'Les données entreprise du tampon ne sont pas encore suffisamment vérifiées.'
    );
  }

  var accessId=
    Number(
      item.existing&&
      item.existing.id
    )||0;

  if(!accessId){
    throw new Error(
      'Accès existant introuvable.'
    );
  }

  var fields=
    EUC_DEV315_companyFields_(
      item.row,
      ctx,
      EUC_DEV315_columns_(
        'EUC_ACCES_FORMULAIRES_PFMP'
      )
    );

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
          fields:fields
        }
      ]
    }
  );

  try{
    var years={};
    years[item.year]=true;

    EUC_DEV315_clearCaches_(
      {
        x:{
          year:item.year,
          classId:item.classId,
          periodId:item.periodId
        }
      },
      years
    );
  }catch(e){}

  var fresh=
    EUC_DEV325_flat_(
      'EUC_ACCES_FORMULAIRES_PFMP'
    ).filter(function(a){
      return Number(a.id)===accessId;
    })[0]||{};

  var visible=
    typeof EUC_V50_estRemontee_==='function'
      ? !!EUC_V50_estRemontee_(fresh)
      : !!String(
          fresh.Entreprise_raison_sociale||
          ''
        ).trim();

  var after=
    EUC_DEV328_findAnalysisItem_(line);

  return {
    ok:true,
    ligne:line,
    eleve:item.eleve,
    accessId:accessId,
    visible:visible,
    entreprise:String(
      fresh.Entreprise_raison_sociale||
      ''
    ),
    siret:String(
      fresh.Entreprise_siret||
      ''
    ).replace(/\D/g,''),
    nouveauStatut:
      after
        ? String(after.statut||'')
        : 'RESOLUE'
  };
}
