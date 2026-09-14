/**
 * Eucalyptus PFMP — v1.0.0-dev.161-fix24
 * Désaffectation robuste sans dépendre des IDs techniques côté navigateur.
 */
function EUC_SUIVI_DESAFFECTER_F24(payload){
  var ctx=EUC_V156_admin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};

  var annee=String(payload.annee||'').trim();
  var classeId=Number(payload.classeId)||0;
  var periodeId=Number(payload.periodeId)||0;
  var type=String(payload.type||'').trim().toUpperCase();
  var eleveIds=(payload.eleveIds||[])
    .map(Number)
    .filter(function(x){return x>0;});

  if(!annee||!classeId||!periodeId||!eleveIds.length){
    throw new Error('Désaffectation incomplète.');
  }
  if(['TELEPHONE','VISITE'].indexOf(type)<0){
    throw new Error('Type de suivi invalide.');
  }

  var wanted={};
  eleveIds.forEach(function(id){wanted[id]=true;});

  var rows=EUC_IMPORT_lireRecords_('EUC_AFFECTATIONS_SUIVI_PFMP');

  var matches=rows.filter(function(r){
    return r.Actif!==false &&
      String(r.Annee_scolaire||'').trim()===annee &&
      Number(EUC_PFMP_ref_(r.Classe))===classeId &&
      Number(EUC_PFMP_ref_(r.Periode))===periodeId &&
      wanted[Number(EUC_PFMP_ref_(r.Eleve))]===true &&
      String(r.Type_suivi||'').trim().toUpperCase()===type;
  });

  if(!matches.length){
    return {
      ok:true,
      count:0,
      message:'Aucune affectation active trouvée pour la sélection.'
    };
  }

  var now=new Date().toISOString();

  // PATCH unitaire, forme déjà éprouvée dans le module d'affectation.
  matches.forEach(function(r){
    EUC_ENT_grist(
      'patch',
      '/tables/EUC_AFFECTATIONS_SUIVI_PFMP/records',
      {records:[{
        id:Number(r.id),
        fields:{
          Actif:false,
          Date_modification:now
        }
      }]}
    );
  });

  return {
    ok:true,
    count:matches.length,
    message:matches.length+' affectation(s) retirée(s).'
  };
}
