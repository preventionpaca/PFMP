/**
 * DEV.225 — statut apprenti calculé automatiquement.
 */
function EUC_DEV225_txt_(v){
  return String(v == null ? '' : v).trim();
}

function EUC_DEV225_derive_(p){
  p = p || {};

  var fullContract =
    !!EUC_DEV225_txt_(p.dateContrat) &&
    !!EUC_DEV225_txt_(p.debut) &&
    !!EUC_DEV225_txt_(p.fin);

  var rupture = !!EUC_DEV225_txt_(p.dateRupture);

  var newContractActive =
    !!p.nouveauContrat &&
    fullContract;

  var future =
    !!p.dossierRemis ||
    !!p.transmisCfa;

  var statut = 'SCOLAIRE';
  var apprenti = false;

  if (newContractActive) {
    statut = 'APPRENTI';
    apprenti = true;
  } else if (rupture) {
    statut = 'SCOLAIRE_RUPTURE';
    apprenti = false;
  } else if (fullContract) {
    statut = 'APPRENTI';
    apprenti = true;
  } else if (future) {
    statut = 'FUTUR_APPRENTI';
    apprenti = false;
  }

  return {
    statut: statut,
    apprenti: apprenti
  };
}

function EUC_DEV396_BASE_EUC_DEV225_saveApprenti(p){
  p = p || {};

  var derived = EUC_DEV225_derive_(p);

  // Le serveur est autoritaire : la case n'est plus une saisie utilisateur.
  p.apprenti = derived.apprenti;

  var result = EUC_DEV214_saveApprenti(p) || {ok:true};

  result.derivedStatus = derived.statut;
  result.apprenti = derived.apprenti;

  return result;
}

function EUC_DEV225_saveApprenti(payload){
  var token=EUC_DEV425_beginMutation_({
    annee:payload&&payload.annee,
    eleveId:payload&&(payload.eleveId||payload.eleve||payload.id),
    reason:'saisie-apprentissage'
  });
  var r=
    EUC_DEV396_BASE_EUC_DEV225_saveApprenti
      .apply(this,arguments);

  try{
    EUC_DEV396_invalidateAppSnapshots_(
      payload&&payload.annee
    );
  }catch(e){}

  return EUC_DEV425_finishResult_(token,r);
}
