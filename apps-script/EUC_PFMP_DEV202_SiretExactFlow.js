/**
 * DEV.202
 *
 * L'audit a montré le vrai flux du formulaire PFMP :
 *
 * 1. EUC_ENT_rechercherSiret(siret)
 * 2. si la réponse demande une recherche navigateur :
 *      fetch(url)
 *      -> JSON
 *      -> EUC_ENT_traiterReponseApiNavigateur(json, siret)
 * 3. appliquerEntreprise(...)
 *
 * Ici on reproduit ce flux côté serveur pour le module Apprentis.
 */

function EUC_DEV202_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV202_siret_(v){
  return EUC_DEV202_txt_(v).replace(/\D/g,'').slice(0,14);
}

function EUC_DEV202_flat_(obj,path,out,depth){
  if(obj==null||depth>10)return;

  if(typeof obj==='string'){
    var s=obj.trim();

    if(
      (s.charAt(0)==='{'&&s.charAt(s.length-1)==='}') ||
      (s.charAt(0)==='['&&s.charAt(s.length-1)===']')
    ){
      try{
        EUC_DEV202_flat_(JSON.parse(s),path,out,depth+1);
        return;
      }catch(e){}
    }

    out.push({
      key:path.length?path[path.length-1]:'',
      path:path.join('.'),
      value:obj
    });

    return;
  }

  if(typeof obj!=='object'){
    out.push({
      key:path.length?path[path.length-1]:'',
      path:path.join('.'),
      value:String(obj)
    });
    return;
  }

  if(Array.isArray(obj)){
    for(var i=0;i<obj.length;i++){
      EUC_DEV202_flat_(
        obj[i],
        path.concat(String(i)),
        out,
        depth+1
      );
    }
    return;
  }

  Object.keys(obj).forEach(function(k){
    EUC_DEV202_flat_(
      obj[k],
      path.concat(k),
      out,
      depth+1
    );
  });
}

function EUC_DEV202_pick_(flat,names){
  var wanted=names.map(function(x){
    return String(x)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g,'');
  });

  for(var wi=0;wi<wanted.length;wi++){
    for(var i=0;i<flat.length;i++){
      var key=String(flat[i].key||'')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g,'');

      if(
        key===wanted[wi] &&
        EUC_DEV202_txt_(flat[i].value)
      ){
        return EUC_DEV202_txt_(flat[i].value);
      }
    }
  }

  return '';
}

function EUC_DEV202_map_(raw,siret,source){
  if(raw==null){
    return {
      ok:true,
      found:false,
      siret:siret,
      source:source||''
    };
  }

  var flat=[];
  EUC_DEV202_flat_(raw,[],flat,0);

  var out={
    ok:true,
    source:source||'',
    siret:siret,

    nomEntreprise:EUC_DEV202_pick_(flat,[
      'raisonSociale',
      'raison_sociale',
      'nomRaisonSociale',
      'nom_raison_sociale',
      'denomination',
      'denominationUniteLegale',
      'denomination_unite_legale',
      'nomEntreprise',
      'nom_entreprise',
      'nomComplet',
      'nom_complet'
    ]),

    nomCommercial:EUC_DEV202_pick_(flat,[
      'enseigne',
      'nomCommercial',
      'nom_commercial',
      'appellation',
      'entreprise'
    ]),

    adresse:EUC_DEV202_pick_(flat,[
      'adresseComplete',
      'adresse_complete',
      'adresse',
      'adresseEtablissement',
      'adresse_etablissement'
    ]),

    codePostal:EUC_DEV202_pick_(flat,[
      'codePostal',
      'code_postal',
      'cp'
    ]),

    ville:EUC_DEV202_pick_(flat,[
      'commune',
      'ville',
      'libelleCommune',
      'libelle_commune'
    ]),

    telephoneEntreprise:EUC_DEV202_pick_(flat,[
      'telephoneEntreprise',
      'telephone_entreprise',
      'telephone',
      'tel'
    ]),

    courrielEntreprise:EUC_DEV202_pick_(flat,[
      'courrielEntreprise',
      'courriel_entreprise',
      'courriel',
      'email',
      'mail'
    ]),

    tuteur:EUC_DEV202_pick_(flat,[
      'tuteur',
      'tuteurNom',
      'tuteur_nom',
      'nomTuteur',
      'nom_tuteur'
    ]),

    telephoneTuteur:EUC_DEV202_pick_(flat,[
      'telephoneTuteur',
      'telephone_tuteur',
      'tuteurTelephone',
      'tuteur_telephone'
    ]),

    courrielTuteur:EUC_DEV202_pick_(flat,[
      'courrielTuteur',
      'courriel_tuteur',
      'tuteurCourriel',
      'tuteur_courriel',
      'emailTuteur',
      'email_tuteur'
    ])
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

/**
 * Cherche récursivement une URL HTTPS dans la réponse du premier appel.
 * Le formulaire PFMP utilise visiblement cette URL dans son fetch navigateur.
 */
function EUC_DEV202_findHttpsUrl_(obj,depth){
  if(obj==null||depth>8)return '';

  if(typeof obj==='string'){
    var s=obj.trim();

    if(/^https:\/\//i.test(s)){
      return s;
    }

    return '';
  }

  if(Array.isArray(obj)){
    for(var i=0;i<obj.length;i++){
      var ar=EUC_DEV202_findHttpsUrl_(obj[i],depth+1);
      if(ar)return ar;
    }
    return '';
  }

  if(typeof obj==='object'){
    var keys=Object.keys(obj);

    /*
     * Priorité aux clés explicitement URL/API.
     */
    var priority=[
      'url',
      'apiUrl',
      'urlApi',
      'url_api',
      'rechercheUrl',
      'recherche_url'
    ];

    for(var p=0;p<priority.length;p++){
      for(var j=0;j<keys.length;j++){
        if(keys[j]===priority[p]){
          var v=EUC_DEV202_findHttpsUrl_(obj[keys[j]],depth+1);
          if(v)return v;
        }
      }
    }

    for(var k=0;k<keys.length;k++){
      var r=EUC_DEV202_findHttpsUrl_(obj[keys[k]],depth+1);
      if(r)return r;
    }
  }

  return '';
}

function EUC_DEV202_lookupSiret(siret){
  siret=EUC_DEV202_siret_(siret);

  if(siret.length!==14){
    return {
      ok:false,
      found:false,
      error:'SIRET invalide : 14 chiffres attendus.'
    };
  }

  if(typeof EUC_ENT_rechercherSiret!=='function'){
    return {
      ok:false,
      found:false,
      error:'EUC_ENT_rechercherSiret indisponible.'
    };
  }

  /*
   * Étape 1 : exactement comme le formulaire PFMP.
   */
  var first=EUC_ENT_rechercherSiret(siret);

  /*
   * Si la fiche locale est déjà complète, on peut l'utiliser directement.
   */
  var direct=EUC_DEV202_map_(
    first,
    siret,
    'EUC_ENT_rechercherSiret'
  );

  if(direct.found){
    return EUC_DEV202_finish_(direct);
  }

  /*
   * Étape 2 : le formulaire PFMP effectue ensuite un fetch navigateur.
   * On récupère l'URL fournie par EUC_ENT_rechercherSiret.
   */
  var url=EUC_DEV202_findHttpsUrl_(first,0);

  if(!url){
    return {
      ok:true,
      found:false,
      siret:siret,
      error:
        'EUC_ENT_rechercherSiret a retourné une fiche locale incomplète, mais aucune URL API n’a été fournie pour poursuivre la recherche.',
      first:first
    };
  }

  /*
   * Par sécurité, uniquement HTTPS.
   */
  if(!/^https:\/\//i.test(url)){
    return {
      ok:false,
      found:false,
      siret:siret,
      error:'URL API SIRET non HTTPS refusée.'
    };
  }

  var response=UrlFetchApp.fetch(
    url,
    {
      method:'get',
      followRedirects:true,
      muteHttpExceptions:true,
      headers:{
        'Accept':'application/json'
      }
    }
  );

  var code=response.getResponseCode();

  if(code<200||code>=300){
    return {
      ok:false,
      found:false,
      siret:siret,
      error:'Recherche SIRET distante : HTTP '+code
    };
  }

  var json;

  try{
    json=JSON.parse(
      response.getContentText()||'{}'
    );
  }catch(e){
    return {
      ok:false,
      found:false,
      siret:siret,
      error:'Réponse SIRET distante non JSON.'
    };
  }

  /*
   * Étape 3 : exactement la fonction repérée dans PFMP_Acces_QR_V116.html.
   */
  var processed=json;

  if(typeof EUC_ENT_traiterReponseApiNavigateur==='function'){
    processed=
      EUC_ENT_traiterReponseApiNavigateur(
        json,
        siret
      );
  }

  var mapped=
    EUC_DEV202_map_(
      processed,
      siret,
      'API PFMP + EUC_ENT_traiterReponseApiNavigateur'
    );

  if(!mapped.found){
    /*
     * Fallback : certaines versions du traitement peuvent renvoyer un objet
     * minimal ; on tente le JSON brut lui-même.
     */
    mapped=
      EUC_DEV202_map_(
        json,
        siret,
        'API PFMP brute'
      );
  }

  if(!mapped.found){
    return {
      ok:true,
      found:false,
      siret:siret,
      error:
        'La recherche API PFMP a répondu, mais aucune donnée entreprise exploitable n’a été extraite.',
      url:url
    };
  }

  return EUC_DEV202_finish_(mapped);
}

function EUC_DEV202_finish_(mapped){
  if(
    mapped &&
    mapped.found &&
    typeof EUC_DEV192_upsertGlobalEntreprise_==='function'
  ){
    try{
      mapped.globalEntreprise=
        EUC_DEV192_upsertGlobalEntreprise_(
          mapped
        );

      mapped.source=
        (mapped.source||'PFMP')+
        ' + base Entreprises globale';
    }catch(e){
      mapped.globalEntreprise={
        ok:false,
        linked:false,
        warning:String(
          e&&e.message||e
        )
      };
    }
  }

  return mapped;
}
