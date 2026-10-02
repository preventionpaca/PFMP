/**
 * Eucalyptus PFMP — v1.0.0-dev.161-fix17
 * Route canonique du détail classe + désaffectation + enrichissement périodes.
 */

function EUC_V161F17_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_V161F17_records_(table){
  return EUC_IMPORT_lireRecords_(table);
}

function EUC_SUIVI_CLASSE_detailF17_(annee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId);

  // 1) Enrichir les périodes avec leurs dates réelles.
  try{
    var planning=EUC_V161F17_records_('Planning_Periodes');
    var byP={};
    planning.forEach(function(p){
      byP[Number(p.id)]=p;
    });

    var ps=d.periodes||d.periodesDisponibles||d.periods||[];
    if(Array.isArray(ps)){
      ps.forEach(function(p){
        var id=Number(p.id||p.periodeId||p.Periode)||0;
        var src=byP[id];
        if(!src)return;
        p.debut=EUC_IMPORT_dateExistanteISO_(src.Date_debut);
        p.fin=EUC_IMPORT_dateExistanteISO_(src.Date_fin);
        p.dateDebut=p.debut;
        p.dateFin=p.fin;
      });

      // Uniformiser la propriété utilisée par le frontend.
      d.periodes=ps;
    }
  }catch(e){
    console.log('FIX17 périodes : '+String(e&&e.message||e));
  }

  // 2) Enrichir CHAQUE ligne avec l'ID exact des affectations actives.
  try{
    var pid=Number(d&&d.periode&&d.periode.id)||Number(periodeId)||0;
    var affs=EUC_V161F17_records_('EUC_AFFECTATIONS_SUIVI_PFMP').filter(function(a){
      return a.Actif!==false &&
        EUC_V161F17_txt_(a.Annee_scolaire)===EUC_V161F17_txt_(annee) &&
        Number(EUC_PFMP_ref_(a.Classe))===Number(classeId) &&
        (!pid || Number(EUC_PFMP_ref_(a.Periode))===pid);
    });

    var byA={};
    affs.forEach(function(a){
      var eid=Number(EUC_PFMP_ref_(a.Eleve));
      var typ=EUC_V161F17_txt_(a.Type_suivi).toUpperCase();
      if(eid&&typ)byA[eid+'|'+typ]=Number(a.id)||0;
    });

    (d.lignes||[]).forEach(function(x){
      var eid=Number(x.eleveId)||0;
      x.affectationTelephoneId=byA[eid+'|TELEPHONE']||0;
      x.affectationVisiteId=byA[eid+'|VISITE']||0;
    });
  }catch(e){
    console.log('FIX17 affectations : '+String(e&&e.message||e));
  }

  return d;
}

function EUC_SUIVI_CLASSE_afficherF17(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V161F17_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;

  if(classeId<=0)throw new Error('Classe manquante.');

  var detail=EUC_SUIVI_CLASSE_detailF17_(annee,classeId,periodeId);

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);

  return tpl.evaluate()
    .setTitle('Suivi PFMP — '+detail.classe.nom)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_DESAFFECTER_F17(payload){
  var ctx=EUC_V156_admin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  var ids=(payload.affectationIds||[])
    .map(Number)
    .filter(function(x){return x>0;});

  if(!ids.length){
    throw new Error('Aucun identifiant d’affectation valide reçu.');
  }

  var now=new Date().toISOString();

  // Même forme de PATCH que la fonction d'affectation V156 déjà éprouvée :
  // un seul record par requête.
  ids.forEach(function(id){
    EUC_ENT_grist(
      'patch',
      '/tables/EUC_AFFECTATIONS_SUIVI_PFMP/records',
      {records:[{
        id:id,
        fields:{
          Actif:false,
          Date_modification:now
        }
      }]}
    );
  });

  return {
    ok:true,
    count:ids.length,
    message:ids.length+' affectation(s) retirée(s).'
  };
}
