function EUC_DEV190Z_txt_(v){
  return String(v == null ? '' : v).trim();
}

function EUC_DEV190Z_siret_(v){
  return EUC_DEV190Z_txt_(v).replace(/\D/g,'').slice(0,14);
}

function EUC_DEV190Z_siren_(siret){
  siret=EUC_DEV190Z_siret_(siret);
  return siret.length>=9 ? siret.slice(0,9) : '';
}

function EUC_DEV190Z_safe_(obj,path,def){
  try{
    var x=obj;
    for(var i=0;i<path.length;i++){
      if(x==null)return def;
      x=x[path[i]];
    }
    return x==null ? def : x;
  }catch(e){
    return def;
  }
}

function EUC_DEV190Z_pickEstablishment_(result,siret){
  if(!result)return null;

  var candidates=[];

  if(result.siege){
    candidates.push(result.siege);
  }

  [
    result.matching_etablissements,
    result.etablissements,
    result.matching_siege,
    result.sieges
  ].forEach(function(arr){
    if(Array.isArray(arr)){
      arr.forEach(function(x){
        if(x)candidates.push(x);
      });
    }
  });

  for(var i=0;i<candidates.length;i++){
    if(EUC_DEV190Z_siret_(candidates[i].siret)===siret){
      return candidates[i];
    }
  }

  /*
   * Si la requête est un SIRET exact et que l'API renvoie un seul résultat,
   * le siège/matching établissement est retenu même si la structure JSON
   * ne reproduit pas le SIRET exactement au même niveau.
   */
  if(candidates.length===1){
    return candidates[0];
  }

  return null;
}

function EUC_DEV190Z_address_(e){
  if(!e)return {
    adresse:'',
    codePostal:'',
    ville:''
  };

  var adresse =
    e.adresse ||
    e.adresse_complete ||
    e.libelle_voie ||
    '';

  if(!adresse){
    var parts=[
      e.numero_voie,
      e.indice_repetition,
      e.type_voie,
      e.libelle_voie
    ].filter(Boolean);

    adresse=parts.join(' ');
  }

  return {
    adresse:EUC_DEV190Z_txt_(adresse),
    codePostal:EUC_DEV190Z_txt_(e.code_postal||''),
    ville:EUC_DEV190Z_txt_(
      e.libelle_commune ||
      e.commune ||
      ''
    )
  };
}

function EUC_DEV190Z_fromResult_(r,siret,source){
  var etab=EUC_DEV190Z_pickEstablishment_(r,siret);

  if(!etab){
    etab=r.siege||{};
  }

  var addr=EUC_DEV190Z_address_(etab);

  return {
    ok:true,
    found:true,
    source:source,
    siret:siret,

    nomEntreprise:EUC_DEV190Z_txt_(
      r.nom_raison_sociale ||
      r.nom_complet ||
      r.raison_sociale ||
      r.nom ||
      ''
    ),

    nomCommercial:EUC_DEV190Z_txt_(
      etab.nom_commercial ||
      etab.enseigne ||
      r.nom_commercial ||
      ''
    ),

    adresse:addr.adresse,
    codePostal:addr.codePostal,
    ville:addr.ville,

    telephoneEntreprise:'',
    courrielEntreprise:'',
    tuteur:'',
    telephoneTuteur:'',
    courrielTuteur:''
  };
}

function EUC_DEV190Z_searchPublic_(siret){
  var urls=[
    'https://recherche-entreprises.api.gouv.fr/search?q='+
      encodeURIComponent(siret)+
      '&per_page=25',

    'https://recherche-entreprises.api.gouv.fr/search?q='+
      encodeURIComponent(EUC_DEV190Z_siren_(siret))+
      '&per_page=25'
  ];

  for(var ui=0;ui<urls.length;ui++){
    try{
      var response=UrlFetchApp.fetch(
        urls[ui],
        {
          muteHttpExceptions:true,
          followRedirects:true,
          headers:{
            'Accept':'application/json'
          }
        }
      );

      var code=response.getResponseCode();

      if(code<200||code>=300){
        continue;
      }

      var data=JSON.parse(
        response.getContentText()||'{}'
      );

      var results=data.results||[];

      /*
       * 1) priorité à un établissement qui correspond exactement au SIRET
       */
      for(var i=0;i<results.length;i++){
        var etab=EUC_DEV190Z_pickEstablishment_(results[i],siret);

        if(etab){
          return EUC_DEV190Z_fromResult_(
            results[i],
            siret,
            'api.gouv.fr'
          );
        }
      }

      /*
       * 2) si recherche exacte SIRET et un seul résultat, on le retient
       */
      if(results.length===1){
        return EUC_DEV190Z_fromResult_(
          results[0],
          siret,
          'api.gouv.fr'
        );
      }
    }catch(e){}
  }

  return {
    ok:true,
    found:false,
    siret:siret
  };
}

function EUC_DEV190Z_lookupSiret(siret){
  siret=EUC_DEV190Z_siret_(siret);

  if(siret.length!==14){
    return {
      ok:false,
      found:false,
      error:'Le SIRET doit contenir exactement 14 chiffres.',
      siret:siret
    };
  }

  /*
   * 1) Essaye le moteur Grist existant.
   */
  try{
    if(typeof EUC_DEV190Y_findGristCompany_==='function'){
      var local=EUC_DEV190Y_findGristCompany_(siret);

      if(local&&local.found){
        local.ok=true;
        return local;
      }
    }
  }catch(e){}

  /*
   * 2) API publique robuste.
   */
  return EUC_DEV190Z_searchPublic_(siret);
}
