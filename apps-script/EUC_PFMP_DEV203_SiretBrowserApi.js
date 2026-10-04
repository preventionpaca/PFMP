/**
 * DEV.203
 *
 * Le vrai module PFMP fait :
 * EUC_ENT_rechercherSiret()
 * -> si données locales incomplètes :
 *    fetch() navigateur vers API Recherche d'entreprises
 * -> EUC_ENT_traiterReponseApiNavigateur(json, siret)
 * -> appliquerEntreprise()
 *
 * Cette DEV reproduit ce flux dans Gestion des apprentis.
 */

function EUC_DEV203_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV203_siret_(v){
  return EUC_DEV203_txt_(v).replace(/\D/g,'').slice(0,14);
}

function EUC_DEV203_findGlobalComplete(siret){
  siret=EUC_DEV203_siret_(siret);

  if(siret.length!==14){
    return {
      ok:false,
      found:false,
      error:'SIRET invalide'
    };
  }

  if(typeof EUC_DEV198_findGlobalDetailed_!=='function'){
    return {
      ok:true,
      found:false,
      siret:siret
    };
  }

  try{
    var r=EUC_DEV198_findGlobalDetailed_(siret);

    if(!r || !r.found){
      return {
        ok:true,
        found:false,
        siret:siret
      };
    }

    /*
     * Une fiche sans voie n'est pas exploitable pour le géocodage. Le
     * précédent seuil (trois champs quelconques) déclarait à tort une fiche
     * complète avec seulement nom + code postal + ville et empêchait alors
     * l'appel à l'Annuaire des Entreprises qui fournit la rue.
     */
    if(
      EUC_DEV203_txt_(r.adresse) &&
      (EUC_DEV203_txt_(r.nomEntreprise)||EUC_DEV203_txt_(r.nomCommercial)) &&
      (EUC_DEV203_txt_(r.codePostal)||EUC_DEV203_txt_(r.ville))
    ){
      return r;
    }

    return {
      ok:true,
      found:false,
      incomplete:true,
      siret:siret,
      existing:r
    };

  }catch(e){
    return {
      ok:true,
      found:false,
      siret:siret,
      error:String(e&&e.message||e)
    };
  }
}

function EUC_DEV203_normalizePfmpResult_(raw,siret){
  raw=raw||{};

  var e=
    raw.entreprise ||
    raw.etablissement ||
    raw.company ||
    raw;

  var out={
    ok:true,
    found:false,
    source:raw.source||'PFMP_API',
    siret:siret,

    nomEntreprise:
      EUC_DEV203_txt_(
        e.raisonSociale ||
        e.nomRaisonSociale ||
        e.denomination ||
        e.nomEntreprise ||
        e.nomComplet ||
        ''
      ),

    nomCommercial:
      EUC_DEV203_txt_(
        e.enseigne ||
        e.nomCommercial ||
        e.nom_commercial ||
        ''
      ),

    adresse:
      EUC_DEV203_txt_(
        e.adresseComplete ||
        e.adresse ||
        e.adresseEtablissement ||
        ''
      ),

    codePostal:
      EUC_DEV203_txt_(
        e.codePostal ||
        e.code_postal ||
        ''
      ),

    ville:
      EUC_DEV203_txt_(
        e.commune ||
        e.ville ||
        e.libelleCommune ||
        ''
      ),

    telephoneEntreprise:
      EUC_DEV203_txt_(
        e.telephone ||
        e.telephoneEntreprise ||
        ''
      ),

    courrielEntreprise:
      EUC_DEV203_txt_(
        e.courriel ||
        e.email ||
        e.courrielEntreprise ||
        ''
      ),

    responsableEntreprise:
      EUC_DEV203_txt_(
        e.responsableEntreprise ||
        e.responsable ||
        e.responsableNom ||
        e.responsable_nom ||
        ''
      ),

    tuteur:
      EUC_DEV203_txt_(
        e.tuteur ||
        e.nomTuteur ||
        ''
      ),

    telephoneTuteur:
      EUC_DEV203_txt_(
        e.telephoneTuteur ||
        ''
      ),

    courrielTuteur:
      EUC_DEV203_txt_(
        e.courrielTuteur ||
        e.emailTuteur ||
        ''
      )
  };

  out.found=!!(
    out.nomEntreprise ||
    out.nomCommercial ||
    out.adresse ||
    out.codePostal ||
    out.ville
  );

  return out;
}

function EUC_DEV203_finalizeBrowserResult(raw,siret){
  siret=EUC_DEV203_siret_(siret);

  var mapped=
    EUC_DEV203_normalizePfmpResult_(
      raw,
      siret
    );

  if(!mapped.found){
    return mapped;
  }

  if(typeof EUC_DEV192_upsertGlobalEntreprise_==='function'){
    try{
      mapped.globalEntreprise=
        EUC_DEV192_upsertGlobalEntreprise_(
          mapped
        );

      mapped.source=
        (mapped.source||'PFMP_API')+
        ' + base globale';

    }catch(e){
      mapped.globalEntreprise={
        ok:false,
        linked:false,
        warning:String(e&&e.message||e)
      };
    }
  }

  return mapped;
}
