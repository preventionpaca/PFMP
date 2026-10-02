
/* DEV250 — tableau de bord live + ventilation apprentis */
function EUC_DEV250_dashboardLive(annee){
  annee=String(annee||'').trim();

  /* Force d'abord la reconstruction du dashboard historique. */
  var base=EUC_DEV192_rebuildDashboard(annee)||{};
  base.global=base.global||{};
  base.classes=base.classes||{};

  var appTable='EUC_APPRENTISSAGE_PFMP';
  var rows=EUC_DEV192_records_(appTable)||[];
  var cols=EUC_DEV192_cols_(appTable)||[];

  function col(names){
    return EUC_DEV192_col_(cols,names);
  }
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

  var future=0;
  var activeIds=[];

  Object.keys(latest).forEach(function(k){
    var f=(latest[k].fields||{});

    var rupture=txt(f,['Date_rupture_contrat','Date_rupture']);
    var contrat=txt(f,['Date_contrat_officielle','Date_contrat']);
    var debut=txt(f,['Date_debut','Debut']);
    var fin=txt(f,['Date_fin','Fin']);

    var actif=
      !rupture &&
      (
        boo(f,['Actif','Apprenti']) ||
        (!!contrat && !!debut && !!fin)
      );

    var futur=
      !rupture &&
      !actif &&
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

    if(actif)activeIds.push(Number(k));
    if(futur)future++;
  });

  base.global.futursApprentis=future;
  base.global.totalApprentis=activeIds.length;
  base.global.apprentisActifs=activeIds.length;

  /*
   * Ventilation "classe entière / mixité".
   * On la calcule à partir de l'effectif courant des classes :
   * - si tous les élèves de la classe sont apprentis => classe entière
   * - sinon les apprentis de cette classe => mixité.
   */
  var eTable='';
  var tables=EUC_DEV192_tables_();

  for(var i=0;i<tables.length;i++){
    if(
      EUC_DEV192_norm_(tables[i].id)===
      EUC_DEV192_norm_('EUC_ELEVES_PFMP')
    ){
      eTable=tables[i].id;
      break;
    }
  }

  var totalByClass={};
  var classByStudent={};

  if(eTable){
    var eCols=EUC_DEV192_cols_(eTable);
    var cCode=EUC_DEV192_col_(eCols,[
      'Code_classe_importe',
      'Code_classe',
      'Classe_Pronote'
    ]);

    EUC_DEV192_records_(eTable).forEach(function(r){
      if(!cCode)return;

      var code=EUC_DEV192_txt_((r.fields||{})[cCode]);
      if(!code)return;

      classByStudent[Number(r.id)]=code;
      totalByClass[code]=(totalByClass[code]||0)+1;
    });
  }

  var appByClass={};

  activeIds.forEach(function(eid){
    var code=classByStudent[eid]||'';
    if(!code)return;
    appByClass[code]=(appByClass[code]||0)+1;
  });

  var entiere=0;
  var mixite=0;

  Object.keys(appByClass).forEach(function(code){
    var n=appByClass[code]||0;
    var total=totalByClass[code]||0;

    if(total>0 && n>=total){
      entiere+=n;
    }else{
      mixite+=n;
    }
  });

  base.global.apprentisClasseEntiere=entiere;
  base.global.apprentisMixite=mixite;

  return base;
}
