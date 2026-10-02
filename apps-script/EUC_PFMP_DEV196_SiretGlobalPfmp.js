/**
 * DEV.196
 * Ordre strict :
 *   1. Base Entreprises globale PFMP
 *   2. Si absente : moteur SIRET déjà utilisé dans le formulaire PFMP
 *      EUC_ENT_rechercherSiret -> EUC_ENT_traiterReponseApiNavigateur si présent
 *   3. Rattachement/création dans la base globale
 *
 * AUCUN nouvel appel API externe ici.
 */

function EUC_DEV196_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV196_norm_(v){
  return EUC_DEV196_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}

function EUC_DEV196_siret_(v){
  return EUC_DEV196_txt_(v).replace(/\D/g,'').slice(0,14);
}

function EUC_DEV196_tables_(){
  return (EUC_DEV190_api_('get','/tables',null).tables||[]);
}

function EUC_DEV196_cols_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/columns',
      null
    ).columns||[]
  );
}

function EUC_DEV196_records_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/records',
      null
    ).records||[]
  );
}

function EUC_DEV196_col_(cols,names){
  var wanted=names.map(EUC_DEV196_norm_);

  for(var i=0;i<cols.length;i++){
    if(wanted.indexOf(EUC_DEV196_norm_(cols[i].id))>=0){
      return cols[i].id;
    }
  }

  return '';
}

function EUC_DEV196_pickDirect_(f,cols,names){
  var c=EUC_DEV196_col_(cols,names);
  return c ? EUC_DEV196_txt_(f[c]) : '';
}

function EUC_DEV196_findGlobalTable_(){
  var tables=EUC_DEV196_tables_();

  var preferred=[
    'Entreprises',
    'ENTREPRISES',
    'EUC_ENTREPRISES',
    'EUC_ENTREPRISE'
  ];

  for(var p=0;p<preferred.length;p++){
    for(var i=0;i<tables.length;i++){
      if(
        EUC_DEV196_norm_(tables[i].id)===
        EUC_DEV196_norm_(preferred[p])
      ){
        return tables[i].id;
      }
    }
  }

  var candidates=[];

  for(var j=0;j<tables.length;j++){
    var t=tables[j].id;

    if(/SNAPSHOT|AUDIT|LOG/i.test(t))continue;

    try{
      var cols=EUC_DEV196_cols_(t);

      if(
        EUC_DEV196_col_(cols,['SIRET','Numero_SIRET','NumeroSIRET'])
      ){
        var score=0;
        var n=EUC_DEV196_norm_(t);

        if(n.indexOf('ENTREPRISE')>=0)score+=20;
        if(n.indexOf('ENT')>=0)score+=5;

        candidates.push({id:t,score:score});
      }
    }catch(e){}
  }

  candidates.sort(function(a,b){
    return b.score-a.score;
  });

  return candidates.length ? candidates[0].id : '';
}

function EUC_DEV196_mapGlobalRow_(table,row,siret){
  var cols=EUC_DEV196_cols_(table);
  var f=row.fields||{};

  return {
    ok:true,
    found:true,
    source:'BASE_ENTREPRISES_GLOBALE',
    siret:siret,

    nomEntreprise:EUC_DEV196_pickDirect_(f,cols,[
      'Nom_entreprise',
      'Raison_sociale',
      'RaisonSociale',
      'Nom',
      'Entreprise'
    ]),

    nomCommercial:EUC_DEV196_pickDirect_(f,cols,[
      'Nom_commercial',
      'Enseigne',
      'Appellation'
    ]),

    adresse:EUC_DEV196_pickDirect_(f,cols,[
      'Adresse',
      'Adresse_entreprise',
      'Adresse_postale'
    ]),

    codePostal:EUC_DEV196_pickDirect_(f,cols,[
      'Code_postal',
      'CodePostal',
      'CP'
    ]),

    ville:EUC_DEV196_pickDirect_(f,cols,[
      'Ville',
      'Commune'
    ]),

    telephoneEntreprise:EUC_DEV196_pickDirect_(f,cols,[
      'Telephone',
      'Téléphone',
      'Telephone_entreprise',
      'Entreprise_telephone',
      'Tel'
    ]),

    courrielEntreprise:EUC_DEV196_pickDirect_(f,cols,[
      'Courriel',
      'Email',
      'Mail',
      'Entreprise_courriel',
      'Courriel_entreprise'
    ]),

    tuteur:EUC_DEV196_pickDirect_(f,cols,[
      'Tuteur',
      'Tuteur_nom',
      'Nom_tuteur'
    ]),

    telephoneTuteur:EUC_DEV196_pickDirect_(f,cols,[
      'Tuteur_telephone',
      'Telephone_tuteur'
    ]),

    courrielTuteur:EUC_DEV196_pickDirect_(f,cols,[
      'Tuteur_courriel',
      'Courriel_tuteur',
      'Email_tuteur'
    ]),

    globalEntreprise:{
      ok:true,
      linked:true,
      created:false,
      table:table,
      recordId:row.id
    }
  };
}

function EUC_DEV196_findGlobal_(siret){
  var table=EUC_DEV196_findGlobalTable_();

  if(!table){
    return {
      ok:true,
      found:false,
      siret:siret
    };
  }

  var cols=EUC_DEV196_cols_(table);
  var cSiret=EUC_DEV196_col_(cols,[
    'SIRET',
    'Numero_SIRET',
    'NumeroSIRET'
  ]);

  if(!cSiret){
    return {
      ok:true,
      found:false,
      siret:siret
    };
  }

  var rows=EUC_DEV196_records_(table);

  for(var i=0;i<rows.length;i++){
    if(
      EUC_DEV196_siret_((rows[i].fields||{})[cSiret])===
      siret
    ){
      return EUC_DEV196_mapGlobalRow_(
        table,
        rows[i],
        siret
      );
    }
  }

  return {
    ok:true,
    found:false,
    siret:siret
  };
}

/* -------------------------------------------------------------
 * Normalisation du moteur PFMP existant
 * ------------------------------------------------------------- */

function EUC_DEV196_flat_(obj,path,out,depth){
  if(obj==null||depth>10)return;

  if(typeof obj==='string'){
    var s=obj.trim();

    if(
      (s.charAt(0)==='{'&&s.charAt(s.length-1)==='}') ||
      (s.charAt(0)==='['&&s.charAt(s.length-1)===']')
    ){
      try{
        EUC_DEV196_flat_(
          JSON.parse(s),
          path,
          out,
          depth+1
        );
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
      EUC_DEV196_flat_(
        obj[i],
        path.concat(String(i)),
        out,
        depth+1
      );
    }
    return;
  }

  Object.keys(obj).forEach(function(k){
    EUC_DEV196_flat_(
      obj[k],
      path.concat(k),
      out,
      depth+1
    );
  });
}

function EUC_DEV196_pick_(flat,names){
  var wanted=names.map(EUC_DEV196_norm_);

  for(var wi=0;wi<wanted.length;wi++){
    for(var i=0;i<flat.length;i++){
      if(
        EUC_DEV196_norm_(flat[i].key)===wanted[wi] &&
        EUC_DEV196_txt_(flat[i].value)
      ){
        return EUC_DEV196_txt_(flat[i].value);
      }
    }
  }

  return '';
}

function EUC_DEV196_normalizePfmp_(raw,siret,source){
  if(raw==null){
    return {
      ok:true,
      found:false,
      siret:siret
    };
  }

  var flat=[];
  EUC_DEV196_flat_(raw,[],flat,0);

  var out={
    ok:true,
    source:source||'PFMP',
    siret:siret,

    nomEntreprise:EUC_DEV196_pick_(flat,[
      'nom_raison_sociale',
      'raison_sociale',
      'raisonSociale',
      'denomination',
      'denomination_unite_legale',
      'nomEntreprise',
      'nom_entreprise',
      'nom_complet',
      'nom'
    ]),

    nomCommercial:EUC_DEV196_pick_(flat,[
      'nom_commercial',
      'nomCommercial',
      'enseigne',
      'enseigne_1',
      'appellation',
      'entreprise'
    ]),

    adresse:EUC_DEV196_pick_(flat,[
      'adresse_complete',
      'adresseComplete',
      'adresse',
      'adresse_etablissement',
      'adresse_entreprise',
      'adresse_postale'
    ]),

    codePostal:EUC_DEV196_pick_(flat,[
      'code_postal',
      'codePostal',
      'cp'
    ]),

    ville:EUC_DEV196_pick_(flat,[
      'libelle_commune',
      'libelleCommune',
      'ville',
      'commune'
    ]),

    telephoneEntreprise:EUC_DEV196_pick_(flat,[
      'telephone_entreprise',
      'telephoneEntreprise',
      'telephone',
      'tel'
    ]),

    courrielEntreprise:EUC_DEV196_pick_(flat,[
      'courriel_entreprise',
      'courrielEntreprise',
      'courriel',
      'email',
      'mail'
    ]),

    tuteur:EUC_DEV196_pick_(flat,[
      'tuteur_nom',
      'nom_tuteur',
      'tuteur'
    ]),

    telephoneTuteur:EUC_DEV196_pick_(flat,[
      'tuteur_telephone',
      'telephone_tuteur'
    ]),

    courrielTuteur:EUC_DEV196_pick_(flat,[
      'tuteur_courriel',
      'courriel_tuteur',
      'email_tuteur'
    ])
  };

  if(!out.adresse){
    var num=EUC_DEV196_pick_(flat,['numero_voie','numeroVoie']);
    var type=EUC_DEV196_pick_(flat,['type_voie','typeVoie']);
    var voie=EUC_DEV196_pick_(flat,['libelle_voie','libelleVoie','nom_voie']);

    out.adresse=[
      num,
      type,
      voie
    ].filter(Boolean).join(' ');
  }

  out.found=!!(
    out.nomEntreprise ||
    out.nomCommercial ||
    out.adresse ||
    out.codePostal ||
    out.ville
  );

  return out;
}

function EUC_DEV196_callPfmpLookup_(siret){
  if(typeof EUC_ENT_rechercherSiret!=='function'){
    return {
      ok:false,
      found:false,
      error:'EUC_ENT_rechercherSiret indisponible.'
    };
  }

  var raw=EUC_ENT_rechercherSiret(siret);

  /*
   * Si le projet dispose du traitement historique utilisé côté PFMP,
   * on tente exactement cette étape avant notre normalisation.
   */
  if(typeof EUC_ENT_traiterReponseApiNavigateur==='function'){
    var attempts=[];

    try{
      attempts.push(
        EUC_ENT_traiterReponseApiNavigateur(
          raw
        )
      );
    }catch(e1){}

    try{
      attempts.push(
        EUC_ENT_traiterReponseApiNavigateur(
          raw,
          siret
        )
      );
    }catch(e2){}

    try{
      attempts.push(
        EUC_ENT_traiterReponseApiNavigateur(
          siret,
          raw
        )
      );
    }catch(e3){}

    for(var i=0;i<attempts.length;i++){
      var mapped=
        EUC_DEV196_normalizePfmp_(
          attempts[i],
          siret,
          'PFMP:EUC_ENT_traiterReponseApiNavigateur'
        );

      if(mapped.found){
        return mapped;
      }
    }
  }

  return EUC_DEV196_normalizePfmp_(
    raw,
    siret,
    'PFMP:EUC_ENT_rechercherSiret'
  );
}

function EUC_DEV196_lookupSiret(siret){
  siret=EUC_DEV196_siret_(siret);

  if(siret.length!==14){
    return {
      ok:false,
      found:false,
      error:'SIRET invalide : 14 chiffres attendus.'
    };
  }

  /*
   * 1. BASE GLOBALE
   */
  var global=EUC_DEV196_findGlobal_(siret);

  if(global.found){
    return global;
  }

  /*
   * 2. EXACTEMENT LE MOTEUR UTILISÉ DANS LE MODULE PFMP
   */
  var api=EUC_DEV196_callPfmpLookup_(siret);

  if(!api.found){
    return api;
  }

  /*
   * 3. AJOUT/RAPPROCHEMENT DANS LA BASE GLOBALE
   */
  if(typeof EUC_DEV192_upsertGlobalEntreprise_==='function'){
    try{
      api.globalEntreprise=
        EUC_DEV192_upsertGlobalEntreprise_(
          api
        );
    }catch(e){
      api.globalEntreprise={
        ok:false,
        linked:false,
        warning:String(e&&e.message||e)
      };
    }
  }

  return api;
}
