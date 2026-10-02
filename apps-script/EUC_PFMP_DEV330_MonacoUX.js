/**
 * PFMP — v1.0.0-dev.330
 * Monaco/NIS + résolution rapide.
 */

function EUC_DEV330_ref_(v){
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

function EUC_DEV330_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV330_nis_(v){
  return String(v==null?'':v)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'')
    .slice(0,30);
}

function EUC_DEV330_ensureBufferCols_(){
  var table=EUC_DEV316_detectBufferTable_();
  var cols=EUC_ENT_grist(
    'get',
    '/tables/'+encodeURIComponent(table)+'/columns'
  ).columns||[];

  var have={};
  cols.forEach(function(c){have[String(c.id||'')]=true;});

  var defs=[
    ['Entreprise_identifiant_type','Type identifiant entreprise','Text'],
    ['NIS_normalise','NIS Monaco','Text'],
    ['NIS_statut','Statut NIS','Text'],
    ['Pays_officiel','Pays entreprise','Text']
  ];

  var miss=defs
    .filter(function(d){return !have[d[0]];})
    .map(function(d){
      return {
        id:d[0],
        fields:{
          label:d[1],
          type:d[2]
        }
      };
    });

  if(miss.length){
    EUC_ENT_grist(
      'post',
      '/tables/'+encodeURIComponent(table)+'/columns',
      {columns:miss}
    );
  }

  return table;
}

function EUC_DEV330_isMonacoRow_(row){
  row=row||{};

  var type=EUC_DEV330_txt_(
    row.Entreprise_identifiant_type
  ).toUpperCase();

  var nis=EUC_DEV330_nis_(
    row.NIS_normalise
  );

  return type==='NIS'&&!!nis;
}

function EUC_DEV330_monacoCompany_(row){
  row=row||{};

  var c=
    typeof EUC_DEV323_companyInput_==='function'
      ? EUC_DEV323_companyInput_(row)
      : {
          nom:'',
          adresse:'',
          cp:'',
          ville:''
        };

  return {
    nis:EUC_DEV330_nis_(
      row.NIS_normalise||
      row.SIRET_normalise||
      row.SIRET_brut||
      ''
    ),
    nom:EUC_DEV330_txt_(
      row.Raison_sociale_officielle||
      c.nom||
      row.Entreprise_saisie||
      ''
    ),
    enseigne:EUC_DEV330_txt_(
      row.Nom_commercial||
      ''
    ),
    adresse:EUC_DEV330_txt_(
      row.Adresse_officielle||
      c.adresse||
      ''
    ),
    cp:EUC_DEV330_txt_(
      row.CP_officiel||
      c.cp||
      '98000'
    ),
    ville:EUC_DEV330_txt_(
      row.Ville_officielle||
      c.ville||
      'MONACO'
    ),
    pays:'MONACO'
  };
}

function EUC_DEV330_monacoReady_(row){
  var c=EUC_DEV330_monacoCompany_(row);

  /*
   * On ne prétend pas connaître ici le format juridique officiel du NIS.
   * On exige seulement un identifiant saisi manuellement + les coordonnées
   * de l'entreprise. La validation officielle reste A_VALIDER côté accès.
   */
  return !!(
    c.nis.length>=4 &&
    c.nom &&
    c.adresse &&
    c.ville
  );
}

function EUC_DEV330_analyze_(){
  var base=EUC_DEV325_analyze_();

  (base.items||[]).forEach(function(item){
    var row=item.row||{};

    if(!EUC_DEV330_isMonacoRow_(row)){
      return;
    }

    item.isMonaco=true;
    item.nis=EUC_DEV330_nis_(row.NIS_normalise);
    item.monacoCompany=EUC_DEV330_monacoCompany_(row);

    /*
     * Les anomalies élève / classe / année / période gardent la priorité.
     */
    if([
      'ELEVE_A_RAPPROCHER',
      'ELEVE_INTROUVABLE',
      'CLASSE_A_CONTROLER',
      'ANNEE_A_CONTROLER',
      'PERIODE_A_CONTROLER',
      'PERIODE_HISTORIQUE_A_CONTROLER',
      'CONFLIT_CSV',
      'DOUBLON_CSV'
    ].indexOf(item.statut)>=0){
      return;
    }

    if(item.existing){
      var enis=EUC_DEV330_nis_(
        item.existing.Entreprise_nis
      );

      var filled=false;

      try{
        filled=
          typeof EUC_V50_estRemontee_==='function'
            ? !!EUC_V50_estRemontee_(item.existing)
            : !!EUC_DEV330_txt_(
                item.existing.Entreprise_raison_sociale
              );
      }catch(e){
        filled=!!EUC_DEV330_txt_(
          item.existing.Entreprise_raison_sociale
        );
      }

      if(filled){
        item.statut='DEJA_PRESENTE';
        item.detail=
          enis&&enis===item.nis
            ? 'Convention Monaco/NIS déjà présente : aucune réimportation.'
            : 'Convention déjà présente : l’identifiant existant est conservé.';
        return;
      }

      item.statut='EXISTANTE_A_COMPLETER';
      item.detail=
        'Un accès existe déjà pour cet élève/période. Il sera complété avec les données Monaco/NIS, sans créer un deuxième accès.';
      return;
    }

    if(EUC_DEV330_monacoReady_(row)){
      item.statut='NOUVELLE_PRETE_NIS';
      item.detail=
        'Entreprise Monaco prête : la convention sera créée avec Entreprise_nis et non avec un faux SIRET.';
    }else{
      item.statut='NIS_A_COMPLETER';
      item.detail=
        'NIS Monaco enregistré mais raison sociale/adresse à compléter avant import.';
    }
  });

  var counts={};

  (base.items||[]).forEach(function(item){
    counts[item.statut]=(counts[item.statut]||0)+1;
  });

  base.counts=counts;
  base.version='DEV330';

  return base;
}

function EUC_DEV330_fr_(v){
  var s=EUC_DEV315_dateISO_(v);
  return s
    ? s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4)
    : '';
}

function EUC_DEV330_className_(id){
  var c=EUC_DEV325_flat_('Classes')
    .filter(function(x){
      return Number(x.id)===Number(id);
    })[0]||{};

  return EUC_DEV330_txt_(
    c.Code||
    c.Code_classe||
    c.Nom||
    c.Libelle||
    c.Classe||
    ('Classe '+id)
  );
}

function EUC_DEV330_historical_(item){
  var rows=
    EUC_DEV325_flat_(
      'EUC_ACCES_FORMULAIRES_PFMP'
    );

  var targetClass=Number(item.classId)||0;
  var targetYear=EUC_DEV330_txt_(item.year);

  return rows
    .filter(function(a){
      if(
        EUC_DEV330_ref_(a.Eleve)!==
        Number(item.studentId)
      ){
        return false;
      }

      var an=EUC_DEV330_txt_(a.Annee_scolaire);

      if(
        targetYear &&
        an &&
        an!==targetYear
      ){
        return false;
      }

      return (
        EUC_DEV330_ref_(a.Periode)!==
        Number(item.periodId)
      );
    })
    .map(function(a){
      var cid=EUC_DEV330_ref_(a.Classe_convention);

      return {
        accessId:Number(a.id)||0,
        periodId:EUC_DEV330_ref_(a.Periode),
        classId:cid,
        className:EUC_DEV330_txt_(
          a.Classe_convention_nom||
          EUC_DEV330_className_(cid)
        ),
        sameClass:cid===targetClass,
        libelle:EUC_DEV330_txt_(
          a.Periode_libelle||
          'Ancienne période'
        ),
        debut:EUC_DEV315_dateISO_(a.Date_debut),
        fin:EUC_DEV315_dateISO_(a.Date_fin),
        debutFr:EUC_DEV330_fr_(a.Date_debut),
        finFr:EUC_DEV330_fr_(a.Date_fin),
        entreprise:EUC_DEV330_txt_(
          a.Entreprise_raison_sociale
        ),
        identifiant:EUC_DEV330_txt_(
          a.Entreprise_nis||
          a.Entreprise_siret
        ),
        identifiantType:EUC_DEV330_txt_(
          a.Entreprise_identifiant_type||
          (
            a.Entreprise_nis
              ? 'NIS'
              : 'SIRET'
          )
        )
      };
    })
    .sort(function(a,b){
      if(a.sameClass!==b.sameClass){
        return a.sameClass?-1:1;
      }

      return Number(b.accessId)-Number(a.accessId);
    });
}

function EUC_DEV330_list(){
  EUC_IMPORT_exigerAdminTexte_();
  EUC_DEV330_ensureBufferCols_();

  var base=EUC_DEV328_list();
  var analysis=EUC_DEV330_analyze_();

  var byLine={};

  (analysis.items||[]).forEach(function(x){
    byLine[Number(x.ligne)||0]=x;
  });

  var hidden={
    DEJA_PRESENTE:true,
    DEJA_PRESENTE_PERIODE_HISTORIQUE:true,
    NOUVELLE_PRETE:true,
    NOUVELLE_PRETE_NIS:true,
    DOUBLON_CSV:true
  };

  var out=[];

  (base.anomalies||[]).forEach(function(x){
    var item=byLine[Number(x.ligne)]||null;

    if(!item||hidden[item.statut]){
      return;
    }

    x.statut=String(item.statut||x.statut||'');
    x.detail=String(item.detail||x.detail||'');
    x.classeNom=
      x.classeNom||
      EUC_DEV330_className_(item.classId);

    if(x.statut==='PERIODE_HISTORIQUE_A_CONTROLER'){
      x.historical=EUC_DEV330_historical_(item);

      if(x.targetPeriod){
        x.targetPeriod.technicalLabel=
          String(
            x.targetPeriod.source||
            ''
          );

        x.targetPeriod.level=
          /^T/i.test(String(x.classeNom||''))
            ? 'Terminale'
            : '';
      }
    }

    if(item.isMonaco){
      x.isMonaco=true;
      x.monaco=EUC_DEV330_monacoCompany_(item.row||{});
    }else{
      var row=item.row||{};
      var c=EUC_DEV323_companyInput_(row);
      var raw=EUC_DEV330_txt_(
        row.SIRET_normalise||
        row.SIRET_brut||
        ''
      );

      x.monacoPrefill={
        nis:raw,
        nom:EUC_DEV330_txt_(
          row.Raison_sociale_officielle||
          c.nom
        ),
        adresse:EUC_DEV330_txt_(
          row.Adresse_officielle||
          c.adresse
        ),
        cp:EUC_DEV330_txt_(
          row.CP_officiel||
          c.cp
        ),
        ville:EUC_DEV330_txt_(
          row.Ville_officielle||
          c.ville
        )
      };

      x.looksMonaco=!!(
        /^98/.test(x.monacoPrefill.cp) ||
        /MONACO/i.test(x.monacoPrefill.ville) ||
        /MONACO/i.test(x.monacoPrefill.adresse)
      );
    }

    out.push(x);
  });

  /*
   * DEV.328 peut avoir exclu une ligne dont le statut a changé en DEV.330.
   * On ajoute les éventuels cas NIS_A_COMPLETER qui manqueraient.
   */
  (analysis.items||[]).forEach(function(item){
    if(
      item.statut!=='NIS_A_COMPLETER' ||
      out.some(function(x){
        return Number(x.ligne)===Number(item.ligne);
      })
    ){
      return;
    }

    out.push({
      ligne:Number(item.ligne)||0,
      eleve:String(item.eleve||''),
      statut:item.statut,
      detail:item.detail,
      classeNom:EUC_DEV330_className_(item.classId),
      annee:String(item.year||''),
      isMonaco:true,
      monaco:EUC_DEV330_monacoCompany_(item.row||{})
    });
  });

  return {
    ok:true,
    total:analysis.total,
    counts:analysis.counts,
    anomalies:out
  };
}

function EUC_DEV330_bufferPatch_(line,fields){
  var table=EUC_DEV330_ensureBufferCols_();

  var cols=
    EUC_ENT_grist(
      'get',
      '/tables/'+encodeURIComponent(table)+'/columns'
    ).columns||[];

  var have={};

  cols.forEach(function(c){
    have[String(c.id||'')]=true;
  });

  var f={};

  Object.keys(fields||{}).forEach(function(k){
    if(have[k]){
      f[k]=fields[k];
    }
  });

  if(!Object.keys(f).length){
    throw new Error(
      'Aucune colonne du tampon ne peut être mise à jour.'
    );
  }

  EUC_ENT_grist(
    'patch',
    '/tables/'+encodeURIComponent(table)+'/records',
    {
      records:[
        {
          id:Number(line),
          fields:f
        }
      ]
    }
  );

  return f;
}

function EUC_DEV330_markMonaco(payload){
  EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var line=Number(payload.ligne)||0;
  var nis=EUC_DEV330_nis_(payload.nis);
  var nom=EUC_DEV330_txt_(payload.nom);
  var adresse=EUC_DEV330_txt_(payload.adresse);
  var cp=EUC_DEV330_txt_(payload.cp);
  var ville=EUC_DEV330_txt_(payload.ville||'MONACO');

  if(!(line>0)){
    throw new Error('Ligne manquante.');
  }

  if(nis.length<4){
    throw new Error(
      'NIS absent ou trop court. Saisissez le NIS fourni par l’entreprise.'
    );
  }

  if(!nom){
    throw new Error(
      'Raison sociale Monaco obligatoire.'
    );
  }

  if(!adresse){
    throw new Error(
      'Adresse Monaco obligatoire.'
    );
  }

  if(!ville){
    ville='MONACO';
  }

  EUC_DEV330_bufferPatch_(
    line,
    {
      Entreprise_identifiant_type:'NIS',
      NIS_normalise:nis,
      NIS_statut:'VALIDE_MANUEL',
      Pays_officiel:'MONACO',
      SIRET_normalise:'',
      SIRET_statut:'NIS_MONACO',
      Raison_sociale_officielle:nom,
      Adresse_officielle:adresse,
      CP_officiel:cp,
      Ville_officielle:ville
    }
  );

  return {
    ok:true,
    ligne:line,
    nis:nis,
    nom:nom,
    adresse:adresse,
    cp:cp,
    ville:ville,
    message:
      'NIS Monaco enregistré dans le tampon. Aucune convention n’a encore été créée.'
  };
}

function EUC_DEV330_findItem_(line){
  return (EUC_DEV330_analyze_().items||[])
    .filter(function(x){
      return Number(x.ligne)===Number(line);
    })[0]||null;
}

function EUC_DEV330_confirmPeriod(payload){
  EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var line=Number(payload.ligne)||0;
  var pid=Number(payload.periodeId)||0;
  var item=EUC_DEV330_findItem_(line);

  if(
    !item ||
    item.statut!=='PERIODE_A_CONTROLER'
  ){
    throw new Error(
      'Cette ligne n’est plus en contrôle de période. Cliquez Actualiser.'
    );
  }

  var p=
    EUC_DEV327_periodOptions_(item)
    .filter(function(x){
      return Number(x.id)===pid;
    })[0]||null;

  if(!p){
    throw new Error(
      'Période non autorisée pour la classe réelle.'
    );
  }

  EUC_DEV330_bufferPatch_(
    line,
    {
      Date_debut_brut:p.debut,
      Date_fin_brut:p.fin,
      Date_debut:p.debut,
      Date_fin:p.fin
    }
  );

  return {
    ok:true,
    ligne:line,
    eleve:item.eleve,
    message:
      'Période enregistrée dans le tampon. Aucune convention n’a encore été créée. Cliquez Actualiser quand vous souhaitez recalculer la liste.'
  };
}

function EUC_DEV330_relinkHistorical(payload){
  EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var line=Number(payload.ligne)||0;
  var accessId=Number(payload.accessId)||0;
  var item=EUC_DEV330_findItem_(line);

  if(
    !item ||
    item.statut!=='PERIODE_HISTORIQUE_A_CONTROLER'
  ){
    throw new Error(
      'Cette ligne n’est plus en anomalie historique. Cliquez Actualiser.'
    );
  }

  var candidates=EUC_DEV330_historical_(item);

  var chosen=
    candidates.filter(function(h){
      return (
        Number(h.accessId)===accessId &&
        h.sameClass===true
      );
    })[0]||null;

  if(!chosen){
    throw new Error(
      'L’accès choisi n’est pas dans la même classe réelle. Rattachement automatique refusé.'
    );
  }

  var periods=
    EUC_DEV327_periodOptions_(item);

  var target=
    periods.filter(function(p){
      return Number(p.id)===Number(item.periodId);
    })[0]||null;

  if(!target){
    throw new Error(
      'Période officielle cible introuvable.'
    );
  }

  var accesses=
    EUC_DEV325_flat_(
      'EUC_ACCES_FORMULAIRES_PFMP'
    );

  var duplicate=
    accesses.some(function(a){
      return (
        Number(a.id)!==accessId &&
        EUC_DEV330_ref_(a.Eleve)===
          Number(item.studentId) &&
        EUC_DEV330_ref_(a.Classe_convention)===
          Number(item.classId) &&
        EUC_DEV330_ref_(a.Periode)===
          Number(item.periodId) &&
        EUC_DEV330_txt_(a.Annee_scolaire)===
          EUC_DEV330_txt_(item.year)
      );
    });

  if(duplicate){
    throw new Error(
      'Une convention existe déjà sur la période officielle cible. Aucun rattachement effectué.'
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

  return {
    ok:true,
    ligne:line,
    accessId:accessId,
    message:
      'Le même accès #'+
      accessId+
      ' a été rattaché à la période officielle actuelle. Aucune nouvelle convention n’a été créée.'
  };
}

function EUC_DEV330_companyFields_(item,ctx,cols){
  var row=item.row||{};

  var fields=
    EUC_DEV315_companyFields_(
      row,
      ctx,
      cols
    );

  if(!item.isMonaco){
    return fields;
  }

  var c=
    EUC_DEV330_monacoCompany_(row);

  fields.Entreprise_siret='';
  fields.Entreprise_nis=c.nis;
  fields.Entreprise_identifiant_type='NIS';
  fields.Entreprise_validation_statut='A_VALIDER';
  fields.Entreprise_raison_sociale=c.nom;
  fields.Entreprise_enseigne=c.enseigne||'';
  fields.Entreprise_adresse=c.adresse;
  fields.Entreprise_code_postal=c.cp;
  fields.Entreprise_commune=c.ville;
  fields.Entreprise_pays='MONACO';

  return fields;
}

function EUC_DEV330_completeExisting(payload){
  var ctx=
    EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var line=Number(payload.ligne)||0;
  var item=EUC_DEV330_findItem_(line);

  if(
    !item ||
    item.statut!=='EXISTANTE_A_COMPLETER'
  ){
    throw new Error(
      'Cette ligne n’est plus un accès existant à compléter. Cliquez Actualiser.'
    );
  }

  if(
    item.isMonaco &&
    !EUC_DEV330_monacoReady_(item.row||{})
  ){
    throw new Error(
      'Complétez d’abord le NIS et les coordonnées Monaco.'
    );
  }

  if(
    !item.isMonaco &&
    !EUC_DEV327_companyVerified_(item.row||{})
  ){
    throw new Error(
      'Vérifiez d’abord le SIRET et les données officielles.'
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

  try{
    if(
      typeof EUC_CONVENTION_assurerColonnesEntrepriseV117_===
      'function'
    ){
      EUC_CONVENTION_assurerColonnesEntrepriseV117_();
    }
  }catch(eSchema){}

  var cols=
    EUC_DEV315_columns_(
      'EUC_ACCES_FORMULAIRES_PFMP'
    );

  var fields=
    EUC_DEV330_companyFields_(
      item,
      ctx,
      cols
    );

  fields=
    EUC_DEV315_filter_(
      fields,
      cols
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

  return {
    ok:true,
    accessId:accessId,
    message:
      'Accès #'+
      accessId+
      ' complété. Aucune nouvelle convention n’a été créée.'
  };
}

function EUC_DEV330_keyAccess_(a){
  return [
    EUC_DEV330_ref_(a.Eleve),
    EUC_DEV330_ref_(a.Classe_convention),
    EUC_DEV330_ref_(a.Periode),
    EUC_DEV330_txt_(a.Annee_scolaire)
  ].join('|');
}

function EUC_DEV330_keyItem_(item){
  return [
    Number(item.studentId)||0,
    Number(item.classId)||0,
    Number(item.periodId)||0,
    EUC_DEV330_txt_(item.year)
  ].join('|');
}

function EUC_DEV330_importerNouveauxRapide(){
  var lock=LockService.getScriptLock();

  if(!lock.tryLock(10000)){
    throw new Error(
      'Un autre import PFMP est déjà en cours.'
    );
  }

  try{
    var started=Date.now();
    var ctx=EUC_IMPORT_exigerAdminTexte_();
    var pre=EUC_DEV330_analyze_();

    var ready=
      (pre.items||[])
      .filter(function(x){
        return (
          x.statut==='NOUVELLE_PRETE' ||
          x.statut==='NOUVELLE_PRETE_NIS'
        );
      });

    if(!ready.length){
      return {
        ok:true,
        creees:0,
        pretesAvant:0,
        counts:pre.counts,
        dureeMs:Date.now()-started,
        message:'Aucun nouveau dossier sûr à créer.'
      };
    }

    try{
      if(
        typeof EUC_CONVENTION_assurerColonnesEntrepriseV117_===
        'function'
      ){
        EUC_CONVENTION_assurerColonnesEntrepriseV117_();
      }
    }catch(eSchema){}

    var table='EUC_ACCES_FORMULAIRES_PFMP';
    var before=EUC_DEV325_flat_(table);
    var keys={};

    before.forEach(function(a){
      keys[EUC_DEV330_keyAccess_(a)]=true;
    });

    var cols=EUC_DEV315_columns_(table);
    var genStudents=EUC_CONVENTION_lireElevesAdmin();
    var genBy={};

    (genStudents||[]).forEach(function(e){
      genBy[Number(e.id)||0]=e;
    });

    var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();
    var classBy={};

    (meta.classes||[]).forEach(function(c){
      classBy[Number(c.id)||0]=c;
    });

    var posts=[];
    var candidates=[];
    var batchKeys={};
    var skipped=0;
    var errors=[];

    ready.forEach(function(item){
      try{
        var key=EUC_DEV330_keyItem_(item);

        if(keys[key]||batchKeys[key]){
          skipped++;
          return;
        }

        var student=genBy[Number(item.studentId)||0];
        var cl=classBy[Number(item.classId)||0];

        if(!student||!cl||!item.period){
          throw new Error(
            'Référentiel élève/classe/période incomplet.'
          );
        }

        var prepared=
          EUC_CONVENTION_preparerRecordAcces_(
            ctx,
            student,
            cl,
            item.period,
            item.year,
            {
              lot:'MIGRATION_JOTFORM_DEV330'
            }
          );

        var fields=
          Object.assign(
            {},
            prepared.record&&prepared.record.fields||{},
            EUC_DEV330_companyFields_(
              item,
              ctx,
              cols
            )
          );

        fields=EUC_DEV315_filter_(fields,cols);

        posts.push({fields:fields});

        candidates.push({
          key:key,
          ligne:Number(item.ligne)||0,
          year:item.year,
          classId:Number(item.classId)||0,
          periodId:Number(item.periodId)||0
        });

        batchKeys[key]=true;

      }catch(e){
        errors.push({
          ligne:Number(item.ligne)||0,
          eleve:String(item.eleve||''),
          erreur:String(e&&e.message||e)
        });
      }
    });

    if(posts.length){
      EUC_ENT_grist(
        'post',
        '/tables/'+encodeURIComponent(table)+'/records',
        {records:posts}
      );
    }

    var after=EUC_DEV325_flat_(table);
    var afterKeys={};

    after.forEach(function(a){
      afterKeys[EUC_DEV330_keyAccess_(a)]=true;
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

    if(verified.length){
      EUC_DEV322_patchBufferValidated_(
        verified.map(function(c){
          return c.ligne;
        }),
        ctx
      );
    }

    var targets={};
    var years={};

    verified.forEach(function(c){
      targets[
        c.year+'|'+c.classId+'|'+c.periodId
      ]={
        year:c.year,
        classId:c.classId,
        periodId:c.periodId
      };

      years[c.year]=true;
    });

    try{
      EUC_DEV315_clearCaches_(targets,years);
    }catch(eCache){}

    var finalAudit=EUC_DEV330_analyze_();

    return {
      ok:errors.length===0&&missing.length===0,
      total:finalAudit.total,
      pretesAvant:ready.length,
      creees:verified.length,
      sautees:skipped,
      manquantesApresEcriture:missing.length,
      erreurs:errors,
      counts:finalAudit.counts,
      dureeMs:Date.now()-started
    };

  }finally{
    lock.releaseLock();
  }
}
