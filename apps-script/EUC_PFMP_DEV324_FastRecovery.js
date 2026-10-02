/**
 * PFMP — v1.0.0-dev.324
 * Application groupée des réponses API de récupération entreprise.
 */

function EUC_DEV324_applyBatch(payload){
  EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};
  var items=payload.items||[];

  if(!items.length){
    return {
      ok:true,
      traites:0,
      patches:0,
      results:[]
    };
  }

  var table=
    EUC_DEV316_detectBufferTable_();

  var rows=
    EUC_DEV316_rawBuffer_();

  var rowBy={};

  rows.forEach(function(r){
    rowBy[Number(r.id)||0]=r;
  });

  var have=
    EUC_DEV323_bufferColumns_(table);

  var patches=[];
  var results=[];

  items.forEach(function(item){
    var lineId=Number(item.ligne)||0;
    var row=rowBy[lineId]||null;

    if(!row){
      results.push({
        ok:false,
        ligne:lineId,
        eleve:'',
        reason:'Ligne tampon introuvable.'
      });
      return;
    }

    var eleve=String(
      row.Eleve_match_libelle||
      row.Eleve_saisi||
      row.Eleve_brut||
      ''
    );

    try{
      var choice=
        EUC_DEV323_choose_(
          row,
          item.reponse||{}
        );

      if(!choice.ok){
        results.push({
          ok:false,
          ligne:lineId,
          eleve:eleve,
          reason:choice.reason,
          suggestions:choice.suggestions||[]
        });
        return;
      }

      var c=choice.candidate;

      var fields={
        SIRET_normalise:c.siret,
        SIRET_statut:'VERIFIE',
        Raison_sociale_officielle:c.nom,
        Nom_commercial:c.enseigne,
        Adresse_officielle:c.adresse,
        CP_officiel:c.cp,
        Ville_officielle:c.ville
      };

      var filtered={};

      Object.keys(fields).forEach(function(k){
        if(have[k]){
          filtered[k]=fields[k];
        }
      });

      if(!Object.keys(filtered).length){
        results.push({
          ok:false,
          ligne:lineId,
          eleve:eleve,
          reason:'Aucune colonne cible disponible.'
        });
        return;
      }

      patches.push({
        id:lineId,
        fields:filtered
      });

      results.push({
        ok:true,
        ligne:lineId,
        eleve:eleve,
        siret:c.siret,
        nom:c.nom,
        adresse:c.adresse,
        cp:c.cp,
        ville:c.ville,
        confidence:choice.confidence
      });

    }catch(e){
      results.push({
        ok:false,
        ligne:lineId,
        eleve:eleve,
        reason:String(e&&e.message||e)
      });
    }
  });

  if(patches.length){
    EUC_ENT_grist(
      'patch',
      '/tables/'+
        encodeURIComponent(table)+
        '/records',
      {
        records:patches
      }
    );
  }

  return {
    ok:true,
    traites:items.length,
    patches:patches.length,
    results:results
  };
}
