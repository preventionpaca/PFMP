/** Eucalyptus PFMP — DEV.161 FIX10 — SIRET France strict / NIS Monaco. */

function EUC_V161_mapperEntrepriseFrance_(rep,siret){
  if(!rep)return {found:false};

  var d=rep.entreprise||rep.data||rep;
  function p(){
    for(var i=0;i<arguments.length;i++){
      var v=arguments[i];
      if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;
    }
    return '';
  }

  var raison=p(
    d.raisonSociale,d.raison_sociale,d.nom,d.nom_complet,d.denomination,
    d.nomComplet,d.nom_commercial
  );

  var adresse=p(d.adresse,d.adresse_complete,d.adresseComplete);
  var cp=p(d.codePostal,d.code_postal,d.cp);
  var commune=p(d.commune,d.ville,d.localite);

  if(!raison && !adresse && !cp && !commune){
    return {found:false};
  }

  return {
    found:true,
    entrepriseSiret:String(siret||'').replace(/\D/g,''),
    entrepriseRaisonSociale:raison,
    entrepriseEnseigne:p(d.enseigne,d.nomCommercial,d.nom_commercial),
    entrepriseAdresse:adresse,
    entrepriseComplement:p(d.complement,d.complement_adresse,d.complementAdresse),
    entrepriseCodePostal:cp,
    entrepriseCommune:commune,
    entreprisePays:'France'
  };
}

function EUC_V161_verifierSiretFrance(siret){
  siret=String(siret||'').replace(/\D/g,'');

  if(!/^\d{14}$/.test(siret)){
    throw new Error('Le SIRET doit comporter exactement 14 chiffres.');
  }

  var r=EUC_ENT_rechercherSiret(siret);
  if(!r)return {found:false};

  if(String(r.source||'')==='api_navigateur'){
    return {
      found:false,
      navigateur:true,
      siret:r.siret||siret,
      url:r.url||''
    };
  }

  return EUC_V161_mapperEntrepriseFrance_(r,siret);
}

function EUC_V161_traiterSiretFranceNavigateur(json,siret){
  siret=String(siret||'').replace(/\D/g,'');

  if(!/^\d{14}$/.test(siret)){
    throw new Error('Le SIRET doit comporter exactement 14 chiffres.');
  }

  var r=EUC_ENT_traiterReponseApiNavigateur(json,siret);
  return EUC_V161_mapperEntrepriseFrance_(r,siret);
}

function EUC_V161_normaliserNIS_(nis){
  return String(nis||'').trim().toUpperCase().replace(/[\s-]+/g,'');
}

function EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_(nis){
  nis=EUC_V161_normaliserNIS_(nis);
  if(!nis)throw new Error('Le NIS est obligatoire pour une entreprise monégasque.');
  var r=EUC_V161_rechercherEntrepriseMonaco(nis);
  return r&&r.found?r:null;
}
