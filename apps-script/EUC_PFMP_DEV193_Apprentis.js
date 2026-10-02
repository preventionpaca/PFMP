function EUC_DEV193_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV193_norm_(v){
  return EUC_DEV193_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}
function EUC_DEV193_siret_(v){
  return EUC_DEV193_txt_(v).replace(/\D/g,'').slice(0,14);
}
function EUC_DEV193_refId_(v){
  if(typeof v==='number')return v;
  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++){
      if(typeof v[i]==='number')return v[i];
    }
  }
  return Number(v)||0;
}
function EUC_DEV193_cols_(){
  return (EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent('EUC_APPRENTISSAGE_PFMP')+'/columns',
    null
  ).columns||[]);
}
function EUC_DEV193_records_(){
  return (EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent('EUC_APPRENTISSAGE_PFMP')+'/records',
    null
  ).records||[]);
}
function EUC_DEV193_col_(cols,names){
  var wanted=names.map(EUC_DEV193_norm_);
  for(var i=0;i<cols.length;i++){
    if(wanted.indexOf(EUC_DEV193_norm_(cols[i].id))>=0){
      return cols[i].id;
    }
  }
  return '';
}
function EUC_DEV193_flat_(obj,depth,out){
  if(obj==null||depth>8)return;
  if(typeof obj!=='object')return;

  if(Array.isArray(obj)){
    for(var i=0;i<obj.length;i++){
      EUC_DEV193_flat_(obj[i],depth+1,out);
    }
    return;
  }

  Object.keys(obj).forEach(function(k){
    var v=obj[k];

    if(v!=null && typeof v!=='object'){
      out.push({key:k,value:String(v)});
    }else{
      EUC_DEV193_flat_(v,depth+1,out);
    }
  });
}
function EUC_DEV193_pick_(flat,names){
  var wanted=names.map(EUC_DEV193_norm_);

  for(var wi=0;wi<wanted.length;wi++){
    for(var i=0;i<flat.length;i++){
      if(
        EUC_DEV193_norm_(flat[i].key)===wanted[wi] &&
        EUC_DEV193_txt_(flat[i].value)
      ){
        return EUC_DEV193_txt_(flat[i].value);
      }
    }
  }

  return '';
}

function EUC_DEV193_lookupSiret(siret){
  siret=EUC_DEV193_siret_(siret);

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

  var raw=EUC_ENT_rechercherSiret(siret);

  if(typeof raw==='string'){
    try{raw=JSON.parse(raw);}catch(e){}
  }

  var flat=[];
  EUC_DEV193_flat_(raw,0,flat);

  var nomEntreprise=EUC_DEV193_pick_(flat,[
    'nom_raison_sociale','nomRaisonSociale','raison_sociale','raisonSociale',
    'denomination','denomination_unite_legale','denominationUniteLegale',
    'nom_entreprise','nomEntreprise','nom_complet','nomComplet','nom'
  ]);

  var nomCommercial=EUC_DEV193_pick_(flat,[
    'nom_commercial','nomCommercial','enseigne_1','enseigne1','enseigne',
    'appellation','entreprise'
  ]);

  var adresse=EUC_DEV193_pick_(flat,[
    'adresse_complete','adresseComplete','adresse','adresse_etablissement',
    'adresseEtablissement','adresse_entreprise','adresse_postale'
  ]);

  var cp=EUC_DEV193_pick_(flat,[
    'code_postal','codePostal','cp'
  ]);

  var ville=EUC_DEV193_pick_(flat,[
    'libelle_commune','libelleCommune','ville','commune'
  ]);

  if(!adresse){
    var num=EUC_DEV193_pick_(flat,['numero_voie','numeroVoie']);
    var type=EUC_DEV193_pick_(flat,['type_voie','typeVoie']);
    var voie=EUC_DEV193_pick_(flat,['libelle_voie','libelleVoie','nom_voie','nomVoie']);
    adresse=[num,type,voie].filter(Boolean).join(' ');
  }

  var result={
    ok:true,
    found:!!(nomEntreprise||nomCommercial||adresse||cp||ville),
    source:'EUC_ENT_rechercherSiret',
    siret:siret,

    nomEntreprise:nomEntreprise,
    nomCommercial:nomCommercial,

    adresse:adresse,
    codePostal:cp,
    ville:ville,

    telephoneEntreprise:EUC_DEV193_pick_(flat,[
      'telephone_entreprise','telephoneEntreprise','telephone','tel'
    ]),

    courrielEntreprise:EUC_DEV193_pick_(flat,[
      'courriel_entreprise','courrielEntreprise','courriel','email','mail'
    ]),

    tuteur:EUC_DEV193_pick_(flat,[
      'tuteur_nom','tuteurNom','nom_tuteur','nomTuteur','tuteur'
    ]),

    telephoneTuteur:EUC_DEV193_pick_(flat,[
      'tuteur_telephone','tuteurTelephone','telephone_tuteur','telephoneTuteur'
    ]),

    courrielTuteur:EUC_DEV193_pick_(flat,[
      'tuteur_courriel','tuteurCourriel','courriel_tuteur','courrielTuteur',
      'email_tuteur','emailTuteur'
    ])
  };

  if(result.found && typeof EUC_DEV192_upsertGlobalEntreprise_==='function'){
    try{
      result.globalEntreprise=EUC_DEV192_upsertGlobalEntreprise_(result);
    }catch(e2){
      result.globalEntreprise={
        ok:false,
        linked:false,
        warning:String(e2&&e2.message||e2)
      };
    }
  }

  return result;
}

function EUC_DEV193_history(eleveId){
  var cols=EUC_DEV193_cols_();
  function c(names){return EUC_DEV193_col_(cols,names);}

  var cEleve=c(['Eleve','Élève','Eleve_id']);

  var rows=EUC_DEV193_records_()
    .filter(function(r){
      return EUC_DEV193_refId_((r.fields||{})[cEleve])===Number(eleveId);
    })
    .sort(function(a,b){return b.id-a.id;});

  return {
    ok:true,
    history:rows.map(function(r){
      var f=r.fields||{};

      function v(names){
        var cc=c(names);
        return cc?EUC_DEV193_txt_(f[cc]):'';
      }

      function b(names){
        var cc=c(names);
        return cc?!!f[cc]:false;
      }

      return {
        id:r.id,
        actif:b(['Actif']),
        siret:v(['SIRET']),
        nomEntreprise:v(['Nom_entreprise']),
        nomCommercial:v(['Nom_commercial','Entreprise']),
        debut:v(['Date_contrat_officielle','Date_debut']),
        fin:v(['Date_fin']),
        rupture:v(['Date_rupture_contrat']),
        dossierRemis:b(['Dossier_distribue']),
        dateDossier:v(['Date_distribution_dossier']),
        transmisCfa:b(['Dossier_transmis_CFA']),
        dateCfa:v(['Date_transmission_CFA']),
        nouveauContrat:b(['Nouveau_contrat']),
        statut:v(['Statut_dossier'])
      };
    })
  };
}
