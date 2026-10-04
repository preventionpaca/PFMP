
/* DEV251 — détails dashboard pour survol des KPI */
function EUC_DEV251_dashboardDetails(annee){
  annee=String(annee||'').trim();

  var appTable='EUC_APPRENTISSAGE_PFMP';
  var rows=EUC_DEV192_records_(appTable)||[];
  var cols=EUC_DEV192_cols_(appTable)||[];

  function col(names){ return EUC_DEV192_col_(cols,names); }
  function txt(f,names){
    var c=col(names);
    return c ? EUC_DEV192_txt_(f[c]) : '';
  }
  function boo(f,names){
    var c=col(names);
    if(!c)return false;
    var v=f[c];
    if(v===true||v===false)return v;
    var s=String(v==null?'':v).trim().toLowerCase();
    return s==='true'||s==='1'||s==='oui'||s==='yes'||s==='x';
  }

  var cEleve=col(['Eleve','Élève','Eleve_id']);
  var cAnnee=col(['Annee_scolaire','Année_scolaire','Annee']);
  var latest={};

  rows.forEach(function(r){
    var f=r.fields||{};

    if(cAnnee){
      var ra=EUC_DEV192_txt_(f[cAnnee]);
      if(ra && ra!==annee)return;
    }

    var eid=EUC_DEV192_refId_(cEleve ? f[cEleve] : 0);
    if(!eid)return;

    if(!latest[eid] || Number(r.id)>Number(latest[eid].id)){
      latest[eid]=r;
    }
  });

  /* Élèves : nom/prénom/classe */
  var elevesTable='';
  var tables=EUC_DEV192_tables_();

  for(var i=0;i<tables.length;i++){
    if(EUC_DEV192_norm_(tables[i].id)===EUC_DEV192_norm_('EUC_ELEVES_PFMP')){
      elevesTable=tables[i].id;
      break;
    }
  }

  var student={};
  if(elevesTable){
    var eCols=EUC_DEV192_cols_(elevesTable);
    var eNom=EUC_DEV192_col_(eCols,['Nom']);
    var ePre=EUC_DEV192_col_(eCols,['Prenom','Prénom']);
    var eCode=EUC_DEV192_col_(eCols,['Code_classe_importe','Code_classe','Classe_Pronote']);

    EUC_DEV192_records_(elevesTable).forEach(function(r){
      var f=r.fields||{};
      student[Number(r.id)]={
        id:Number(r.id),
        nom:eNom?EUC_DEV192_txt_(f[eNom]):'',
        prenom:ePre?EUC_DEV192_txt_(f[ePre]):'',
        classe:eCode?EUC_DEV192_txt_(f[eCode]):''
      };
    });
  }

  /* Classe -> LP/LGT à partir de la table Classes et de son établissement. */
  var etabByClass={};
  try{
    var classTable='';
    for(var ti=0;ti<tables.length;ti++){
      if(EUC_DEV192_norm_(tables[ti].id)===EUC_DEV192_norm_('Classes')){
        classTable=tables[ti].id;
        break;
      }
    }

    if(classTable){
      var cCols=EUC_DEV192_cols_(classTable);
      var cNom=EUC_DEV192_col_(cCols,['Nom','Code','Code_classe','Libelle','Libellé']);
      var cEtab=EUC_DEV192_col_(cCols,['Etab','Etablissement','Établissement','Etablissement_Pronote']);

      EUC_DEV192_records_(classTable).forEach(function(r){
        var f=r.fields||{};
        var code=cNom?EUC_DEV192_txt_(f[cNom]):'';
        var etab=cEtab?EUC_DEV192_txt_(f[cEtab]):'';
        if(!code)return;

        var n=String(etab||'').toUpperCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g,'');

        etabByClass[code]=
          (/(^|\W)LGT(\W|$)|GENERAL|TECHNOLOG/.test(n))
            ? 'LGT'
            : 'LP';
      });
    }
  }catch(e){}

  function classify(eid,f){
    var s=student[eid]||{id:eid,nom:'',prenom:'',classe:''};

    var rupture=txt(f,['Date_rupture_contrat','Date_rupture']);
    var contrat=txt(f,['Date_contrat_officielle','Date_contrat']);
    var debut=txt(f,['Date_debut','Debut']);
    var fin=txt(f,['Date_fin','Fin']);
    var pipeline=EUC_DEV437_pipeline_({
      dossierRemis:boo(f,['Dossier_remis']) || !!txt(f,['Date_remise_dossier','Date_dossier']),
      transmisCfa:boo(f,['Dossier_transmis_CFA']) || !!txt(f,['Date_transmission_CFA']),
      contrat:contrat,
      debut:debut,
      fin:fin,
      rupture:rupture,
      nouveauContrat:boo(f,['Nouveau_contrat'])
    });

    var apprenti=
      !rupture &&
      (
        boo(f,['Actif','Apprenti']) ||
        (!!contrat && !!debut && !!fin)
      );

    var futur=
      !rupture &&
      !apprenti &&
      (
        boo(f,['Dossier_distribue']) ||
        boo(f,['Dossier_remis']) ||
        boo(f,['Dossier_transmis_CFA']) ||
        !!txt(f,['Date_distribution_dossier']) ||
        !!txt(f,['Date_remise_dossier','Date_dossier']) ||
        !!txt(f,['Date_transmission_CFA']) ||
        !!contrat ||
        !!debut
      );

    var item={
      id:eid,
      nom:[s.nom,s.prenom].filter(Boolean).join(' '),
      classe:s.classe||'Sans classe',
      etab:etabByClass[s.classe]||'LP'
    };

    return {
      item:item,
      apprenti:apprenti,
      futur:futur,
      dossier:pipeline.dossier,
      cfa:pipeline.cfa,
      contrat:pipeline.contrat,
      rupture:pipeline.rupture
    };
  }

  var lists={
    total:[],
    future:[],
    dossier:[],
    cfa:[],
    contrats:[],
    ruptures:[]
  };

  Object.keys(latest).forEach(function(k){
    var x=classify(Number(k),(latest[k].fields||{}));

    if(x.apprenti)lists.total.push(x.item);
    if(x.futur)lists.future.push(x.item);
    if(x.dossier)lists.dossier.push(x.item);
    if(x.cfa)lists.cfa.push(x.item);
    if(x.contrat)lists.contrats.push(x.item);
    if(x.rupture)lists.ruptures.push(x.item);
  });

  /* Ventilation classe entière / mixité basée sur l'effectif de chaque classe. */
  var totalByClass={};
  Object.keys(student).forEach(function(k){
    var c=student[k].classe||'';
    if(c)totalByClass[c]=(totalByClass[c]||0)+1;
  });

  var appByClass={};
  lists.total.forEach(function(x){
    appByClass[x.classe]=(appByClass[x.classe]||0)+1;
  });

  lists.classeEntiere=[];
  lists.mixite=[];

  lists.total.forEach(function(x){
    var n=appByClass[x.classe]||0;
    var t=totalByClass[x.classe]||0;
    if(t>0 && n>=t)lists.classeEntiere.push(x);
    else lists.mixite.push(x);
  });

  return {
    ok:true,
    lists:lists
  };
}
