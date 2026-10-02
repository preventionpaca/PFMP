/**
 * DEV.197
 * Ordre :
 * 1) base Entreprises globale
 * 2) fonctions EUC_ENT_* déjà présentes dans le projet PFMP
 * 3) rattachement/création dans la base globale
 *
 * Aucun nouveau service web n'est introduit ici.
 */

function EUC_DEV197_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV197_norm_(v){
  return EUC_DEV197_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}

function EUC_DEV197_siret_(v){
  return EUC_DEV197_txt_(v).replace(/\D/g,'').slice(0,14);
}

function EUC_DEV197_flat_(obj,path,out,depth){
  if(obj==null || depth>12)return;

  if(typeof obj==='string'){
    var s=obj.trim();

    if(
      (s.charAt(0)==='{' && s.charAt(s.length-1)==='}') ||
      (s.charAt(0)==='[' && s.charAt(s.length-1)===']')
    ){
      try{
        EUC_DEV197_flat_(
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
      EUC_DEV197_flat_(
        obj[i],
        path.concat(String(i)),
        out,
        depth+1
      );
    }
    return;
  }

  Object.keys(obj).forEach(function(k){
    EUC_DEV197_flat_(
      obj[k],
      path.concat(k),
      out,
      depth+1
    );
  });
}

function EUC_DEV197_pick_(flat,names){
  var wanted=names.map(EUC_DEV197_norm_);

  for(var wi=0;wi<wanted.length;wi++){
    for(var i=0;i<flat.length;i++){
      if(
        EUC_DEV197_norm_(flat[i].key)===wanted[wi] &&
        EUC_DEV197_txt_(flat[i].value)
      ){
        return EUC_DEV197_txt_(flat[i].value);
      }
    }
  }

  return '';
}

function EUC_DEV197_normalize_(raw,siret,source){
  if(raw==null){
    return {
      ok:true,
      found:false,
      siret:siret
    };
  }

  var flat=[];
  EUC_DEV197_flat_(raw,[],flat,0);

  var out={
    ok:true,
    source:source||'PFMP',
    siret:siret,

    nomEntreprise:EUC_DEV197_pick_(flat,[
      'nom_raison_sociale',
      'nomRaisonSociale',
      'raison_sociale',
      'raisonSociale',
      'denomination',
      'denomination_unite_legale',
      'denominationUniteLegale',
      'nom_entreprise',
      'nomEntreprise',
      'nom_complet',
      'nomComplet',
      'nom'
    ]),

    nomCommercial:EUC_DEV197_pick_(flat,[
      'nom_commercial',
      'nomCommercial',
      'enseigne',
      'enseigne_1',
      'enseigne1',
      'appellation',
      'entreprise'
    ]),

    adresse:EUC_DEV197_pick_(flat,[
      'adresse_complete',
      'adresseComplete',
      'adresse',
      'adresse_etablissement',
      'adresseEtablissement',
      'adresse_entreprise',
      'adresse_postale'
    ]),

    codePostal:EUC_DEV197_pick_(flat,[
      'code_postal',
      'codePostal',
      'cp'
    ]),

    ville:EUC_DEV197_pick_(flat,[
      'libelle_commune',
      'libelleCommune',
      'ville',
      'commune'
    ]),

    telephoneEntreprise:EUC_DEV197_pick_(flat,[
      'telephone_entreprise',
      'telephoneEntreprise',
      'telephone',
      'tel'
    ]),

    courrielEntreprise:EUC_DEV197_pick_(flat,[
      'courriel_entreprise',
      'courrielEntreprise',
      'courriel',
      'email',
      'mail'
    ]),

    tuteur:EUC_DEV197_pick_(flat,[
      'tuteur_nom',
      'tuteurNom',
      'nom_tuteur',
      'nomTuteur',
      'tuteur'
    ]),

    telephoneTuteur:EUC_DEV197_pick_(flat,[
      'tuteur_telephone',
      'tuteurTelephone',
      'telephone_tuteur',
      'telephoneTuteur'
    ]),

    courrielTuteur:EUC_DEV197_pick_(flat,[
      'tuteur_courriel',
      'tuteurCourriel',
      'courriel_tuteur',
      'courrielTuteur',
      'email_tuteur',
      'emailTuteur'
    ])
  };

  if(!out.adresse){
    var numero=EUC_DEV197_pick_(flat,[
      'numero_voie',
      'numeroVoie'
    ]);

    var typeVoie=EUC_DEV197_pick_(flat,[
      'type_voie',
      'typeVoie'
    ]);

    var voie=EUC_DEV197_pick_(flat,[
      'libelle_voie',
      'libelleVoie',
      'nom_voie',
      'nomVoie'
    ]);

    out.adresse=[
      numero,
      typeVoie,
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

/* -------------------------------------------------------------
 * Détection dynamique des fonctions SIRET historiques
 * ------------------------------------------------------------- */

function EUC_DEV197_candidateFunctions_(){
  var names=[];

  try{
    names=Object.getOwnPropertyNames(globalThis);
  }catch(e){
    return [];
  }

  return names
    .filter(function(name){
      if(name.indexOf('EUC_ENT_')!==0){
        return false;
      }

      var n=name.toLowerCase();

      if(
        n.indexOf('save')>=0 ||
        n.indexOf('write')>=0 ||
        n.indexOf('delete')>=0 ||
        n.indexOf('create')>=0 ||
        n.indexOf('update')>=0 ||
        n.indexOf('install')>=0 ||
        n.indexOf('setup')>=0
      ){
        return false;
      }

      return (
        n.indexOf('siret')>=0 ||
        n.indexOf('recherch')>=0 ||
        n.indexOf('api')>=0 ||
        n.indexOf('entreprise')>=0 ||
        n.indexOf('etablissement')>=0
      );
    })
    .sort(function(a,b){
      function score(name){
        var n=name.toLowerCase();
        var s=0;

        if(n==='euc_ent_recherchersiret')s+=200;
        if(n.indexOf('siret')>=0)s+=80;
        if(n.indexOf('recherch')>=0)s+=60;
        if(n.indexOf('api')>=0)s+=40;
        if(n.indexOf('entreprise')>=0)s+=20;

        return s;
      }

      return score(b)-score(a);
    });
}

function EUC_DEV197_callHistorical_(siret){
  var names=EUC_DEV197_candidateFunctions_();
  var debug=[];

  for(var i=0;i<names.length;i++){
    var name=names[i];
    var fn=globalThis[name];

    if(typeof fn!=='function'){
      continue;
    }

    /*
     * Essai 1 : argument SIRET simple
     */
    try{
      var r1=fn(siret);
      var m1=EUC_DEV197_normalize_(
        r1,
        siret,
        name
      );

      if(m1.found){
        return m1;
      }

      debug.push(
        name+': réponse sans données mappables'
      );
    }catch(e1){
      debug.push(
        name+': '+
        String(
          e1&&e1.message||e1
        )
      );
    }

    /*
     * Essai 2 : objet, pour les helpers qui attendent une structure.
     */
    try{
      var r2=fn({
        siret:siret,
        SIRET:siret
      });

      var m2=EUC_DEV197_normalize_(
        r2,
        siret,
        name+':object'
      );

      if(m2.found){
        return m2;
      }
    }catch(e2){}
  }

  return {
    ok:true,
    found:false,
    siret:siret,
    debug:debug,
    candidates:names
  };
}

function EUC_DEV197_lookupSiret(siret){
  siret=EUC_DEV197_siret_(siret);

  if(siret.length!==14){
    return {
      ok:false,
      found:false,
      error:'SIRET invalide : 14 chiffres attendus.'
    };
  }

  /*
   * 1. BASE ENTREPRISES GLOBALE
   */
  if(typeof EUC_DEV196_findGlobal_==='function'){
    try{
      var global=
        EUC_DEV196_findGlobal_(
          siret
        );

      if(
        global &&
        global.found
      ){
        return global;
      }
    }catch(e){}
  }

  /*
   * 2. CHAÎNE HISTORIQUE DU MODULE PFMP
   */
  var found=
    EUC_DEV197_callHistorical_(
      siret
    );

  if(
    !found ||
    !found.found
  ){
    return found;
  }

  /*
   * 3. RATTACHEMENT À LA BASE ENTREPRISES GLOBALE
   */
  if(
    typeof
    EUC_DEV192_upsertGlobalEntreprise_===
    'function'
  ){
    try{
      found.globalEntreprise=
        EUC_DEV192_upsertGlobalEntreprise_(
          found
        );
    }catch(e2){
      found.globalEntreprise={
        ok:false,
        linked:false,
        warning:String(
          e2&&e2.message||e2
        )
      };
    }
  }

  return found;
}
