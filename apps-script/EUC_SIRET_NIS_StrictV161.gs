/** Eucalyptus PFMP — DEV.527/DEV.567 — SIRET France strict / NIS Monaco. */

var EUC_V161_SIRET_CACHE_PREFIX_='EUC_V161_SIRET_OFFICIEL_V527_';
var EUC_V161_SIRET_PREUVE_DUREE_MS_=60*60*1000;
function EUC_V161_siretCacheGet_(siret){
  try{
    var raw=CacheService.getScriptCache().get(EUC_V161_SIRET_CACHE_PREFIX_+siret),d=raw?JSON.parse(raw):null;
    return d&&d.found&&d.entrepriseRaisonSociale&&d.entrepriseAdresse&&d.entrepriseCodePostal&&d.entrepriseCommune?d:null;
  }catch(e){return null;}
}
function EUC_V161_siretCachePut_(d){
  if(!d||!d.found)return d;
  try{CacheService.getScriptCache().put(EUC_V161_SIRET_CACHE_PREFIX_+d.entrepriseSiret,JSON.stringify(d),900);}catch(e){}
  return d;
}

/* Le CacheService accélère la seconde vérification, mais il peut évincer une
 * entrée avant ses 15 minutes théoriques. Une preuve signée transporte donc
 * la réponse officielle déjà contrôlée jusqu'à l'enregistrement final. Elle
 * ne remplace jamais la validation SIRET : elle est liée au numéro, bornée à
 * la durée de la session QR et authentifiée côté serveur. */
function EUC_V161_creerPreuveSiretFrance_(d){
  if(!d||!d.found||typeof Utilities==='undefined'||
     typeof EUC_CONVENTION_resumeSignatureV134_!=='function')return '';

  var body={
    v:1,
    exp:Date.now()+EUC_V161_SIRET_PREUVE_DUREE_MS_,
    siret:String(d.entrepriseSiret||'').replace(/\D/g,''),
    raison:String(d.entrepriseRaisonSociale||'').trim(),
    enseigne:String(d.entrepriseEnseigne||'').trim(),
    adresse:String(d.entrepriseAdresse||'').trim(),
    complement:String(d.entrepriseComplement||'').trim(),
    cp:String(d.entrepriseCodePostal||'').trim(),
    commune:String(d.entrepriseCommune||'').trim()
  };
  if(!/^\d{14}$/.test(body.siret)||!body.raison||!body.adresse||!body.cp||!body.commune)return '';

  var payload=Utilities.base64EncodeWebSafe(JSON.stringify(body),Utilities.Charset.UTF_8);
  return payload+'.'+EUC_CONVENTION_resumeSignatureV134_('SIRET_FRANCE_V567|'+payload);
}

function EUC_V161_lirePreuveSiretFrance_(preuve,siret){
  preuve=String(preuve||'').trim();
  siret=String(siret||'').replace(/\D/g,'');
  if(!preuve||!/^\d{14}$/.test(siret)||typeof Utilities==='undefined'||
     typeof EUC_CONVENTION_resumeSignatureV134_!=='function')return null;

  var parts=preuve.split('.');
  if(parts.length!==2)return null;
  var payload=parts[0],sig=parts[1];
  if(sig!==EUC_CONVENTION_resumeSignatureV134_('SIRET_FRANCE_V567|'+payload))return null;

  var body;
  try{
    body=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payload)).getDataAsString('UTF-8'));
  }catch(e){return null;}
  if(!body||Number(body.v)!==1||String(body.siret||'')!==siret||
     !Number.isFinite(Number(body.exp))||Number(body.exp)<Date.now()||
     Number(body.exp)>Date.now()+EUC_V161_SIRET_PREUVE_DUREE_MS_+60000)return null;

  var d={
    found:true,
    entrepriseSiret:siret,
    entrepriseRaisonSociale:String(body.raison||'').trim(),
    entrepriseEnseigne:String(body.enseigne||'').trim(),
    entrepriseAdresse:String(body.adresse||'').trim(),
    entrepriseComplement:String(body.complement||'').trim(),
    entrepriseCodePostal:String(body.cp||'').trim(),
    entrepriseCommune:String(body.commune||'').trim(),
    entreprisePays:'France'
  };
  return d.entrepriseRaisonSociale&&d.entrepriseAdresse&&d.entrepriseCodePostal&&d.entrepriseCommune?d:null;
}

function EUC_V161_avecPreuveSiretFrance_(d){
  if(!d||!d.found)return d;
  d.preuveEnregistrement=EUC_V161_creerPreuveSiretFrance_(d);
  return d;
}

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

  /* EUC_ENT_mapperReponseApi et le cache Grist exposent la voie normalisée
   * sous `numeroVoie`. Garder aussi les anciens noms pour les réponses déjà
   * connues, mais ne jamais accepter qu'un SIRET trouvé perde sa rue pendant
   * le second remappage strict. */
  var adresse=p(d.numeroVoie,d.adresse,d.adresse_complete,d.adresseComplete);
  var cp=p(d.codePostal,d.code_postal,d.cp);
  var commune=p(d.commune,d.ville,d.localite);

  var manquants=[];
  if(!raison)manquants.push('raison sociale');
  if(!adresse)manquants.push('adresse');
  if(!cp)manquants.push('code postal');
  if(!commune)manquants.push('ville');
  if(manquants.length){
    return {found:false,incomplete:true,champsManquants:manquants};
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

  var cached=EUC_V161_siretCacheGet_(siret);
  if(cached)return EUC_V161_avecPreuveSiretFrance_(cached);
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

  return EUC_V161_avecPreuveSiretFrance_(
    EUC_V161_siretCachePut_(EUC_V161_mapperEntrepriseFrance_(r,siret))
  );
}

function EUC_V161_traiterSiretFranceNavigateur(json,siret){
  siret=String(siret||'').replace(/\D/g,'');

  if(!/^\d{14}$/.test(siret)){
    throw new Error('Le SIRET doit comporter exactement 14 chiffres.');
  }

  var r=EUC_ENT_traiterReponseApiNavigateur(json,siret);
  return EUC_V161_avecPreuveSiretFrance_(
    EUC_V161_siretCachePut_(EUC_V161_mapperEntrepriseFrance_(r,siret))
  );
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
