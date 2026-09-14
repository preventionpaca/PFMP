function EUC_V161_verifierSiretFrance(siret){
  siret=String(siret||'').replace(/\D/g,'');
  if(!/^\d{14}$/.test(siret)) throw new Error('Le SIRET doit comporter exactement 14 chiffres.');
  var r=EUC_ENT_rechercherSiret(siret);
  if(!r || r.ok===false || r.found===false) return {found:false};
  var d=r.entreprise||r.data||r;
  function p(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;}return '';}
  return {
    found:true,
    entrepriseSiret:siret,
    entrepriseRaisonSociale:p(d.raisonSociale,d.raison_sociale,d.nom,d.nom_complet,d.denomination),
    entrepriseEnseigne:p(d.enseigne,d.nomCommercial,d.nom_commercial),
    entrepriseAdresse:p(d.adresse,d.adresse_complete,d.adresseComplete),
    entrepriseComplement:p(d.complement,d.complement_adresse,d.complementAdresse),
    entrepriseCodePostal:p(d.codePostal,d.code_postal,d.cp),
    entrepriseCommune:p(d.commune,d.ville,d.localite),
    entreprisePays:'France'
  };
}

function EUC_V161_normaliserNIS_(nis){
  return String(nis||'').trim().toUpperCase().replace(/[\s-]+/g,'');
}

function EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_(nis){
  nis=EUC_V161_normaliserNIS_(nis);
  if(!nis) throw new Error('Le NIS est obligatoire pour une entreprise monégasque.');
  var r=EUC_V161_rechercherEntrepriseMonaco(nis);
  return r&&r.found ? r : null;
}
