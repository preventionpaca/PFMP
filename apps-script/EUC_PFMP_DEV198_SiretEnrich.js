/**
 * DEV.198
 *
 * Cas observé :
 * le SIRET est bien retrouvé dans la base Entreprises globale,
 * mais la ligne globale ne contient pas forcément tous les champs exploitables.
 *
 * Nouvelle logique :
 * 1. retrouver l'entreprise globale par SIRET ;
 * 2. mapper largement les colonnes de la ligne globale ;
 * 3. si des données essentielles manquent, poursuivre la recherche
 *    avec la chaîne PFMP historique ;
 * 4. fusionner les deux résultats ;
 * 5. enrichir la base globale avec les données trouvées ;
 * 6. retourner au navigateur un objet complet.
 */

function EUC_DEV198_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV198_norm_(v){
  return EUC_DEV198_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}

function EUC_DEV198_siret_(v){
  return EUC_DEV198_txt_(v).replace(/\D/g,'').slice(0,14);
}

function EUC_DEV198_tables_(){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables',
      null
    ).tables || []
  );
}

function EUC_DEV198_cols_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/columns',
      null
    ).columns || []
  );
}

function EUC_DEV198_records_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/records',
      null
    ).records || []
  );
}

function EUC_DEV198_col_(cols,names){
  var wanted=names.map(EUC_DEV198_norm_);

  for(var i=0;i<cols.length;i++){
    if(
      wanted.indexOf(
        EUC_DEV198_norm_(cols[i].id)
      )>=0
    ){
      return cols[i].id;
    }
  }

  return '';
}

function EUC_DEV198_deepFlat_(obj,path,out,depth){
  if(obj==null || depth>10)return;

  if(typeof obj==='string'){
    var s=obj.trim();

    if(
      (s.charAt(0)==='{' && s.charAt(s.length-1)==='}') ||
      (s.charAt(0)==='[' && s.charAt(s.length-1)===']')
    ){
      try{
        EUC_DEV198_deepFlat_(
          JSON.parse(s),
          path,
          out,
          depth+1
        );
        return;
      }catch(e){}
    }

    out.push({
      key:path.length ? path[path.length-1] : '',
      path:path.join('.'),
      value:obj
    });

    return;
  }

  if(typeof obj!=='object'){
    out.push({
      key:path.length ? path[path.length-1] : '',
      path:path.join('.'),
      value:String(obj)
    });
    return;
  }

  if(Array.isArray(obj)){
    for(var i=0;i<obj.length;i++){
      EUC_DEV198_deepFlat_(
        obj[i],
        path.concat(String(i)),
        out,
        depth+1
      );
    }
    return;
  }

  Object.keys(obj).forEach(function(k){
    EUC_DEV198_deepFlat_(
      obj[k],
      path.concat(k),
      out,
      depth+1
    );
  });
}

function EUC_DEV198_pick_(flat,names){
  var wanted=names.map(EUC_DEV198_norm_);

  for(var wi=0;wi<wanted.length;wi++){
    for(var i=0;i<flat.length;i++){
      if(
        EUC_DEV198_norm_(flat[i].key)===wanted[wi] &&
        EUC_DEV198_txt_(flat[i].value)
      ){
        return EUC_DEV198_txt_(flat[i].value);
      }
    }
  }

  return '';
}

function EUC_DEV198_mapObject_(obj,siret,source){
  var flat=[];

  EUC_DEV198_deepFlat_(
    obj,
    [],
    flat,
    0
  );

  var out={
    ok:true,
    found:true,
    source:source||'',
    siret:siret,

    nomEntreprise:EUC_DEV198_pick_(flat,[
      'Nom_entreprise',
      'Nom entreprise',
      'Raison_sociale',
      'Raison sociale',
      'RaisonSociale',
      'raison_sociale',
      'nom_raison_sociale',
      'nomRaisonSociale',
      'denomination',
      'dénomination',
      'denomination_unite_legale',
      'denominationUniteLegale',
      'nomEntreprise',
      'nom_complet',
      'nomComplet',
      'Nom'
    ]),

    nomCommercial:EUC_DEV198_pick_(flat,[
      'Nom_commercial',
      'Nom commercial',
      'nomCommercial',
      'nom_commercial',
      'Enseigne',
      'enseigne',
      'Appellation',
      'Entreprise'
    ]),

    adresse:EUC_DEV198_pick_(flat,[
      'Adresse',
      'Adresse_entreprise',
      'Adresse entreprise',
      'Adresse_postale',
      'Adresse postale',
      'adresse_complete',
      'adresseComplete',
      'adresse_etablissement',
      'adresseEtablissement'
    ]),

    codePostal:EUC_DEV198_pick_(flat,[
      'Code_postal',
      'Code postal',
      'CodePostal',
      'code_postal',
      'codePostal',
      'CP'
    ]),

    ville:EUC_DEV198_pick_(flat,[
      'Ville',
      'Commune',
      'ville',
      'commune',
      'libelle_commune',
      'libelleCommune'
    ]),

    telephoneEntreprise:EUC_DEV198_pick_(flat,[
      'Entreprise_telephone',
      'Telephone_entreprise',
      'Téléphone entreprise',
      'Telephone entreprise',
      'telephoneEntreprise',
      'telephone_entreprise',
      'Telephone',
      'Téléphone',
      'telephone',
      'Tel'
    ]),

    courrielEntreprise:EUC_DEV198_pick_(flat,[
      'Entreprise_courriel',
      'Courriel_entreprise',
      'Courriel entreprise',
      'Email entreprise',
      'courrielEntreprise',
      'courriel_entreprise',
      'Courriel',
      'Email',
      'Mail',
      'courriel',
      'email',
      'mail'
    ]),

    tuteur:EUC_DEV198_pick_(flat,[
      'Tuteur',
      'Tuteur_nom',
      'Nom_tuteur',
      'Nom tuteur',
      'tuteur',
      'tuteur_nom',
      'nom_tuteur'
    ]),

    telephoneTuteur:EUC_DEV198_pick_(flat,[
      'Tuteur_telephone',
      'Telephone_tuteur',
      'Téléphone tuteur',
      'tuteur_telephone',
      'telephone_tuteur'
    ]),

    courrielTuteur:EUC_DEV198_pick_(flat,[
      'Tuteur_courriel',
      'Courriel_tuteur',
      'Courriel tuteur',
      'Email_tuteur',
      'tuteur_courriel',
      'courriel_tuteur',
      'email_tuteur'
    ])
  };

  if(!out.adresse){
    var num=EUC_DEV198_pick_(flat,[
      'numero_voie',
      'numeroVoie'
    ]);

    var typeVoie=EUC_DEV198_pick_(flat,[
      'type_voie',
      'typeVoie'
    ]);

    var voie=EUC_DEV198_pick_(flat,[
      'libelle_voie',
      'libelleVoie',
      'nom_voie',
      'nomVoie'
    ]);

    out.adresse=[
      num,
      typeVoie,
      voie
    ].filter(Boolean).join(' ');
  }

  return out;
}

function EUC_DEV198_score_(x){
  x=x||{};

  var score=0;

  if(x.nomEntreprise)score+=3;
  if(x.nomCommercial)score+=1;
  if(x.adresse)score+=3;
  if(x.codePostal)score+=2;
  if(x.ville)score+=2;
  if(x.telephoneEntreprise)score+=1;
  if(x.courrielEntreprise)score+=1;

  return score;
}

function EUC_DEV198_merge_(primary,secondary){
  primary=primary||{};
  secondary=secondary||{};

  var out={};

  [
    'siret',
    'nomEntreprise',
    'nomCommercial',
    'adresse',
    'codePostal',
    'ville',
    'telephoneEntreprise',
    'courrielEntreprise',
    'tuteur',
    'telephoneTuteur',
    'courrielTuteur'
  ].forEach(function(k){
    out[k]=
      EUC_DEV198_txt_(primary[k]) ||
      EUC_DEV198_txt_(secondary[k]) ||
      '';
  });

  out.ok=true;

  out.found=!!(
    out.nomEntreprise ||
    out.nomCommercial ||
    out.adresse ||
    out.codePostal ||
    out.ville
  );

  out.source=[
    primary.source,
    secondary.source
  ].filter(Boolean).join(' + ');

  return out;
}

/* -------------------------------------------------------------
 * Base Entreprises globale
 * ------------------------------------------------------------- */

function EUC_DEV198_globalTable_(){
  if(typeof EUC_DEV196_findGlobalTable_==='function'){
    try{
      var t=EUC_DEV196_findGlobalTable_();
      if(t)return t;
    }catch(e){}
  }

  var tables=EUC_DEV198_tables_();

  var preferred=[
    'Entreprises',
    'ENTREPRISES',
    'EUC_ENTREPRISES',
    'EUC_ENTREPRISE'
  ];

  for(var p=0;p<preferred.length;p++){
    for(var i=0;i<tables.length;i++){
      if(
        EUC_DEV198_norm_(tables[i].id)===
        EUC_DEV198_norm_(preferred[p])
      ){
        return tables[i].id;
      }
    }
  }

  return '';
}

function EUC_DEV198_findGlobalDetailed_(siret){
  var table=EUC_DEV198_globalTable_();

  if(!table){
    return {
      ok:true,
      found:false,
      siret:siret
    };
  }

  var cols=EUC_DEV198_cols_(table);

  var cSiret=EUC_DEV198_col_(cols,[
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

  var rows=EUC_DEV198_records_(table);

  for(var i=0;i<rows.length;i++){
    var f=rows[i].fields||{};

    if(
      EUC_DEV198_siret_(f[cSiret])===
      siret
    ){
      var mapped=
        EUC_DEV198_mapObject_(
          f,
          siret,
          'BASE_ENTREPRISES_GLOBALE'
        );

      mapped.globalEntreprise={
        ok:true,
        linked:true,
        created:false,
        table:table,
        recordId:rows[i].id
      };

      return mapped;
    }
  }

  return {
    ok:true,
    found:false,
    siret:siret
  };
}

/* -------------------------------------------------------------
 * Recherche PFMP historique
 * ------------------------------------------------------------- */

function EUC_DEV198_historicalLookup_(siret){
  /*
   * Utilise en priorité DEV197 qui parcourt la chaîne EUC_ENT_* existante.
   */
  if(typeof EUC_DEV197_callHistorical_==='function'){
    try{
      var h=
        EUC_DEV197_callHistorical_(
          siret
        );

      if(h && h.found){
        return h;
      }
    }catch(e){}
  }

  /*
   * Fallback explicite vers le moteur principal.
   */
  if(typeof EUC_ENT_rechercherSiret==='function'){
    try{
      var raw=
        EUC_ENT_rechercherSiret(
          siret
        );

      var mapped=
        EUC_DEV198_mapObject_(
          raw,
          siret,
          'EUC_ENT_rechercherSiret'
        );

      mapped.found=
        EUC_DEV198_score_(
          mapped
        )>0;

      if(mapped.found){
        return mapped;
      }
    }catch(e2){}
  }

  return {
    ok:true,
    found:false,
    siret:siret
  };
}

function EUC_DEV198_lookupSiret(siret){
  siret=
    EUC_DEV198_siret_(
      siret
    );

  if(siret.length!==14){
    return {
      ok:false,
      found:false,
      error:
        'SIRET invalide : 14 chiffres attendus.'
    };
  }

  /*
   * 1) BASE GLOBALE
   */
  var global=
    EUC_DEV198_findGlobalDetailed_(
      siret
    );

  /*
   * Si la base globale est suffisamment complète,
   * on répond immédiatement.
   */
  if(
    global.found &&
    EUC_DEV198_score_(
      global
    )>=7
  ){
    return global;
  }

  /*
   * 2) Si la base globale existe mais est incomplète,
   * on enrichit avec le même moteur PFMP.
   * Si elle n'existe pas, même recherche.
   */
  var historical=
    EUC_DEV198_historicalLookup_(
      siret
    );

  var merged=
    EUC_DEV198_merge_(
      global.found
        ? global
        : {},
      historical.found
        ? historical
        : {}
    );

  merged.siret=siret;

  /*
   * 3) Réécrit/enrichit la base globale
   */
  if(
    merged.found &&
    typeof
      EUC_DEV192_upsertGlobalEntreprise_===
      'function'
  ){
    try{
      merged.globalEntreprise=
        EUC_DEV192_upsertGlobalEntreprise_(
          merged
        );
    }catch(e3){
      merged.globalEntreprise=
        global.globalEntreprise || {
          ok:false,
          linked:false,
          warning:String(
            e3&&e3.message||e3
          )
        };
    }
  }else if(global.globalEntreprise){
    merged.globalEntreprise=
      global.globalEntreprise;
  }

  /*
   * Cas très utile au diagnostic :
   * le SIRET existe, mais aucune colonne descriptive n'est renseignée.
   */
  if(
    global.found &&
    !merged.found
  ){
    return {
      ok:true,
      found:false,
      siret:siret,
      source:'BASE_ENTREPRISES_GLOBALE',
      error:
        'Le SIRET existe dans la base globale mais la fiche entreprise ne contient pas encore de données descriptives exploitables.'
    };
  }

  return merged;
}
