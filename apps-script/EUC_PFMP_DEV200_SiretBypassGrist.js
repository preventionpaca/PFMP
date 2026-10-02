function EUC_DEV200_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV200_norm_(v){
  return EUC_DEV200_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}
function EUC_DEV200_siret_(v){return EUC_DEV200_txt_(v).replace(/\D/g,'').slice(0,14);}

function EUC_DEV200_flat_(obj,path,out,depth){
  if(obj==null||depth>12)return;

  if(typeof obj==='string'){
    var s=obj.trim();
    if(
      (s.charAt(0)==='{'&&s.charAt(s.length-1)==='}') ||
      (s.charAt(0)==='['&&s.charAt(s.length-1)===']')
    ){
      try{
        EUC_DEV200_flat_(JSON.parse(s),path,out,depth+1);
        return;
      }catch(e){}
    }
    out.push({key:path.length?path[path.length-1]:'',path:path.join('.'),value:obj});
    return;
  }

  if(typeof obj!=='object'){
    out.push({key:path.length?path[path.length-1]:'',path:path.join('.'),value:String(obj)});
    return;
  }

  if(Array.isArray(obj)){
    for(var i=0;i<obj.length;i++){
      EUC_DEV200_flat_(obj[i],path.concat(String(i)),out,depth+1);
    }
    return;
  }

  Object.keys(obj).forEach(function(k){
    EUC_DEV200_flat_(obj[k],path.concat(k),out,depth+1);
  });
}

function EUC_DEV200_pick_(flat,names){
  var wanted=names.map(EUC_DEV200_norm_);
  for(var wi=0;wi<wanted.length;wi++){
    for(var i=0;i<flat.length;i++){
      if(
        EUC_DEV200_norm_(flat[i].key)===wanted[wi] &&
        EUC_DEV200_txt_(flat[i].value)
      ){
        return EUC_DEV200_txt_(flat[i].value);
      }
    }
  }
  return '';
}

function EUC_DEV200_score_(x){
  if(!x)return 0;
  var n=0;
  if(x.nomEntreprise)n+=3;
  if(x.nomCommercial)n+=1;
  if(x.adresse)n+=3;
  if(x.codePostal)n+=2;
  if(x.ville)n+=2;
  if(x.telephoneEntreprise)n+=1;
  if(x.courrielEntreprise)n+=1;
  return n;
}

function EUC_DEV200_map_(raw,siret,source){
  if(raw==null)return {ok:true,found:false,siret:siret,source:source};

  var flat=[];
  EUC_DEV200_flat_(raw,[],flat,0);

  var out={
    ok:true,
    source:source||'',
    siret:siret,
    nomEntreprise:EUC_DEV200_pick_(flat,[
      'nom_raison_sociale','nomRaisonSociale','raison_sociale','raisonSociale',
      'denomination','denomination_unite_legale','denominationUniteLegale',
      'nom_entreprise','nomEntreprise','nom_complet','nomComplet','nom'
    ]),
    nomCommercial:EUC_DEV200_pick_(flat,[
      'nom_commercial','nomCommercial','enseigne','enseigne_1','enseigne1',
      'appellation','entreprise'
    ]),
    adresse:EUC_DEV200_pick_(flat,[
      'adresse_complete','adresseComplete','adresse','adresse_etablissement',
      'adresseEtablissement','adresse_entreprise','adresse_postale'
    ]),
    codePostal:EUC_DEV200_pick_(flat,['code_postal','codePostal','cp']),
    ville:EUC_DEV200_pick_(flat,['libelle_commune','libelleCommune','ville','commune']),
    telephoneEntreprise:EUC_DEV200_pick_(flat,[
      'telephone_entreprise','telephoneEntreprise','telephone','tel'
    ]),
    courrielEntreprise:EUC_DEV200_pick_(flat,[
      'courriel_entreprise','courrielEntreprise','courriel','email','mail'
    ]),
    tuteur:EUC_DEV200_pick_(flat,['tuteur_nom','tuteurNom','nom_tuteur','nomTuteur','tuteur']),
    telephoneTuteur:EUC_DEV200_pick_(flat,[
      'tuteur_telephone','tuteurTelephone','telephone_tuteur','telephoneTuteur'
    ]),
    courrielTuteur:EUC_DEV200_pick_(flat,[
      'tuteur_courriel','tuteurCourriel','courriel_tuteur','courrielTuteur',
      'email_tuteur','emailTuteur'
    ])
  };

  if(!out.adresse){
    var num=EUC_DEV200_pick_(flat,['numero_voie','numeroVoie']);
    var type=EUC_DEV200_pick_(flat,['type_voie','typeVoie']);
    var voie=EUC_DEV200_pick_(flat,['libelle_voie','libelleVoie','nom_voie','nomVoie']);
    out.adresse=[num,type,voie].filter(Boolean).join(' ');
  }

  out.found=EUC_DEV200_score_(out)>0;
  return out;
}

function EUC_DEV200_lookupSiret(siret){
  siret=EUC_DEV200_siret_(siret);

  if(siret.length!==14){
    return {ok:false,found:false,error:'SIRET invalide : 14 chiffres attendus.'};
  }

  var debug=[];

  if(typeof EUC_DEV198_findGlobalDetailed_==='function'){
    try{
      var g=EUC_DEV198_findGlobalDetailed_(siret);
      var gs=EUC_DEV200_score_(g);

      if(g&&g.found&&gs>=3){
        g.source='BASE_ENTREPRISES_GLOBALE';
        return g;
      }

      debug.push('Base globale présente mais incomplète, score='+gs);
    }catch(eg){
      debug.push('Base globale: '+String(eg&&eg.message||eg));
    }
  }


  try {
    var r = EUC_ENT_validerSiret(siret);
    var m = EUC_DEV200_map_(r,siret,'EUC_ENT_validerSiret');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('EUC_ENT_validerSiret: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('EUC_ENT_validerSiret: '+String(e&&e.message||e));
  }


  try {
    var r2 = EUC_ENT_validerSiret({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'EUC_ENT_validerSiret:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = EUC_V161_traiterSiretFranceNavigateur(siret);
    var m = EUC_DEV200_map_(r,siret,'EUC_V161_traiterSiretFranceNavigateur');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('EUC_V161_traiterSiretFranceNavigateur: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('EUC_V161_traiterSiretFranceNavigateur: '+String(e&&e.message||e));
  }


  try {
    var r2 = EUC_V161_traiterSiretFranceNavigateur({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'EUC_V161_traiterSiretFranceNavigateur:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = EUC_V161_verifierSiretFrance(siret);
    var m = EUC_DEV200_map_(r,siret,'EUC_V161_verifierSiretFrance');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('EUC_V161_verifierSiretFrance: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('EUC_V161_verifierSiretFrance: '+String(e&&e.message||e));
  }


  try {
    var r2 = EUC_V161_verifierSiretFrance({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'EUC_V161_verifierSiretFrance:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = EDT_applyActions_(siret);
    var m = EUC_DEV200_map_(r,siret,'EDT_applyActions_');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('EDT_applyActions_: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('EDT_applyActions_: '+String(e&&e.message||e));
  }


  try {
    var r2 = EDT_applyActions_({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'EDT_applyActions_:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = EDT_gristGet_(siret);
    var m = EUC_DEV200_map_(r,siret,'EDT_gristGet_');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('EDT_gristGet_: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('EDT_gristGet_: '+String(e&&e.message||e));
  }


  try {
    var r2 = EDT_gristGet_({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'EDT_gristGet_:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = EUC_DOCX_fetchQrsV94_(siret);
    var m = EUC_DEV200_map_(r,siret,'EUC_DOCX_fetchQrsV94_');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('EUC_DOCX_fetchQrsV94_: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('EUC_DOCX_fetchQrsV94_: '+String(e&&e.message||e));
  }


  try {
    var r2 = EUC_DOCX_fetchQrsV94_({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'EUC_DOCX_fetchQrsV94_:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = EUC_DOCX_qrBlob_(siret);
    var m = EUC_DEV200_map_(r,siret,'EUC_DOCX_qrBlob_');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('EUC_DOCX_qrBlob_: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('EUC_DOCX_qrBlob_: '+String(e&&e.message||e));
  }


  try {
    var r2 = EUC_DOCX_qrBlob_({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'EUC_DOCX_qrBlob_:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = EUC_PFMP_verifierTurnstile_(siret);
    var m = EUC_DEV200_map_(r,siret,'EUC_PFMP_verifierTurnstile_');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('EUC_PFMP_verifierTurnstile_: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('EUC_PFMP_verifierTurnstile_: '+String(e&&e.message||e));
  }


  try {
    var r2 = EUC_PFMP_verifierTurnstile_({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'EUC_PFMP_verifierTurnstile_:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = exporterPDF_A3(siret);
    var m = EUC_DEV200_map_(r,siret,'exporterPDF_A3');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('exporterPDF_A3: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('exporterPDF_A3: '+String(e&&e.message||e));
  }


  try {
    var r2 = exporterPDF_A3({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'exporterPDF_A3:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = gristApplyActions_(siret);
    var m = EUC_DEV200_map_(r,siret,'gristApplyActions_');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('gristApplyActions_: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('gristApplyActions_: '+String(e&&e.message||e));
  }


  try {
    var r2 = gristApplyActions_({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'gristApplyActions_:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = EUC_ENT_mapperReponseApi(siret);
    var m = EUC_DEV200_map_(r,siret,'EUC_ENT_mapperReponseApi');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('EUC_ENT_mapperReponseApi: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('EUC_ENT_mapperReponseApi: '+String(e&&e.message||e));
  }


  try {
    var r2 = EUC_ENT_mapperReponseApi({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'EUC_ENT_mapperReponseApi:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  try {
    var r = EUC_ENT_traiterReponseApiNavigateur(siret);
    var m = EUC_DEV200_map_(r,siret,'EUC_ENT_traiterReponseApiNavigateur');
    if(EUC_DEV200_score_(m) >= 3) return m;
    debug.push('EUC_ENT_traiterReponseApiNavigateur: score='+EUC_DEV200_score_(m));
  } catch(e) {
    debug.push('EUC_ENT_traiterReponseApiNavigateur: '+String(e&&e.message||e));
  }


  try {
    var r2 = EUC_ENT_traiterReponseApiNavigateur({siret:siret,SIRET:siret});
    var m2 = EUC_DEV200_map_(r2,siret,'EUC_ENT_traiterReponseApiNavigateur:object');
    if(EUC_DEV200_score_(m2) >= 3) return m2;
  } catch(e2) {}


  if(typeof EUC_ENT_rechercherSiret==='function'){
    try{
      var old=EUC_ENT_rechercherSiret(siret);
      var om=EUC_DEV200_map_(old,siret,'EUC_ENT_rechercherSiret');
      debug.push('EUC_ENT_rechercherSiret score='+EUC_DEV200_score_(om));
    }catch(eold){
      debug.push('EUC_ENT_rechercherSiret: '+String(eold&&eold.message||eold));
    }
  }

  return {
    ok:true,
    found:false,
    siret:siret,
    error:'La fiche Grist existe mais est vide et aucun appel API direct PFMP n’a retourné les données.',
    debug:debug
  };
}

function EUC_DEV200_lookupAndUpsert(siret){
  var r=EUC_DEV200_lookupSiret(siret);

  if(r&&r.found&&typeof EUC_DEV192_upsertGlobalEntreprise_==='function'){
    try{
      r.globalEntreprise=EUC_DEV192_upsertGlobalEntreprise_(r);
      r.source=(r.source||'PFMP')+' + base globale';
    }catch(e){
      r.globalEntreprise={
        ok:false,
        linked:false,
        warning:String(e&&e.message||e)
      };
    }
  }

  return r;
}
