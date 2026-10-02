/**
 * PFMP — v1.0.0-dev.304
 *
 * Vérification individuelle d'un SIRET JotForm
 * depuis une réponse obtenue par le navigateur.
 *
 * Aucun UrlFetchApp vers l'Annuaire ici.
 */

function EUC_DEV304_verifierLigneSiretNavigateur(
  payload,
  raw
){

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

  if(siret.length!==14){
    throw new Error(
      'SIRET invalide : 14 chiffres attendus.'
    );
  }

  var row=
    EUC_DEV298_rows_()
      .filter(function(r){
        return Number(r.id)===id;
      })[0];

  if(!row){
    throw new Error(
      'Ligne de migration introuvable.'
    );
  }

  /*
   * Même moteur de lecture de réponse que le parcours
   * PFMP qui fonctionne déjà.
   */
  var pfmp=
    EUC_ENT_traiterReponseApiNavigateur(
      raw||{},
      siret
    );

  var hit=
    EUC_DEV203_finalizeBrowserResult(
      pfmp,
      siret
    );

  var fields=
    EUC_DEV299_applySiretResult_(
      row,
      siret,
      hit
    );

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

    raisonSociale:
      hit&&
      hit.nomEntreprise||
      '',

    nomCommercial:
      hit&&
      hit.nomCommercial||
      '',

    source:
      hit&&
      hit.source||
      ''
  };
}
