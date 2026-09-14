/**
 * Eucalyptus PFMP — v1.0.0-dev.161-fix18
 * - détail classe canonique
 * - dates fiables pour tous les boutons de période
 * - désaffectation par IDs techniques
 */

function EUC_V161F18_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId);

  // Carte complète ID période -> dates.
  var mapDates={};
  try{
    EUC_IMPORT_lireRecords_('Planning_Periodes').forEach(function(p){
      if(p.Actif===false)return;
      var id=Number(p.id)||0;
      if(!id)return;
      mapDates[String(id)]={
        debut:EUC_IMPORT_dateExistanteISO_(p.Date_debut),
        fin:EUC_IMPORT_dateExistanteISO_(p.Date_fin),
        libelle:EUC_V161F18_txt_(p.Libelle||p.Nom||p.Periode||'')
      };
    });
  }catch(e){
    console.log('FIX18 map périodes : '+String(e&&e.message||e));
  }
  d.periodeDatesById=mapDates;

  // FIX19 : enrichir directement les objets réellement utilisés par renderTabs().
  if(Array.isArray(d.periodes)){
    d.periodes.forEach(function(p){
      var src=mapDates[String(Number(p.id||p.periodeId||p.Periode)||0)];
      if(!src)return;
      p.debut=src.debut||'';
      p.fin=src.fin||'';
      p.dateDebut=p.debut;
      p.dateFin=p.fin;
    });
  }

  // IDs exacts des affectations actives pour la période affichée.
  try{
    var pid=Number(d&&d.periode&&d.periode.id)||Number(periodeId)||0;
    var byA={};

    EUC_IMPORT_lireRecords_('EUC_AFFECTATIONS_SUIVI_PFMP')
      .filter(function(a){
        return a.Actif!==false &&
          EUC_V161F18_txt_(a.Annee_scolaire)===EUC_V161F18_txt_(annee) &&
          Number(EUC_PFMP_ref_(a.Classe))===Number(classeId) &&
          (!pid || Number(EUC_PFMP_ref_(a.Periode))===pid);
      })
      .forEach(function(a){
        var eid=Number(EUC_PFMP_ref_(a.Eleve));
        var typ=EUC_V161F18_txt_(a.Type_suivi).toUpperCase();
        if(eid&&typ)byA[eid+'|'+typ]=Number(a.id)||0;
      });

    (d.lignes||[]).forEach(function(x){
      var eid=Number(x.eleveId)||0;
      x.affectationTelephoneId=byA[eid+'|TELEPHONE']||0;
      x.affectationVisiteId=byA[eid+'|VISITE']||0;
    });
  }catch(e){
    console.log('FIX18 affectations : '+String(e&&e.message||e));
  }

  return d;
}

function EUC_SUIVI_CLASSE_afficherF18(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V161F18_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;

  if(classeId<=0)throw new Error('Classe manquante.');

  var detail=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);

  return tpl.evaluate()
    .setTitle('Suivi PFMP — '+detail.classe.nom)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_DESAFFECTER_F18(payload){
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

  // PATCH unitaire, même forme que l'affectation V156 déjà utilisée.
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
