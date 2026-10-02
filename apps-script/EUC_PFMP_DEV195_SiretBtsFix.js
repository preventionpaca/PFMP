/**
 * DEV.195
 * 1) Mapping SIRET robuste :
 *    - moteur historique EUC_ENT_rechercherSiret
 *    - parse récursif des chaînes JSON imbriquées
 *    - recherche directe par SIRET dans les tables Grist
 * 2) Chargement BTS :
 *    - alias 1BTS CIEL -> 1CIEL, 2BTS CIEL -> 2CIEL, etc.
 *    - fallback Ref Classe
 */

function EUC_DEV195_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV195_norm_(v){
  return EUC_DEV195_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}

function EUC_DEV195_siret_(v){
  return EUC_DEV195_txt_(v).replace(/\D/g,'').slice(0,14);
}

function EUC_DEV195_refIds_(v){
  var out=[];

  function add(x){
    var n=Number(x);

    if(
      isFinite(n) &&
      String(x).trim()!==''
    ){
      out.push(n);
    }
  }

  if(Array.isArray(v)){
    v.forEach(add);
  }else{
    add(v);
  }

  return out;
}

function EUC_DEV195_tables_(){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables',
      null
    ).tables || []
  );
}

function EUC_DEV195_cols_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+
      encodeURIComponent(table)+
      '/columns',
      null
    ).columns || []
  );
}

function EUC_DEV195_records_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+
      encodeURIComponent(table)+
      '/records',
      null
    ).records || []
  );
}

function EUC_DEV195_col_(cols,names){
  var wanted=names.map(EUC_DEV195_norm_);

  for(var i=0;i<cols.length;i++){
    if(
      wanted.indexOf(
        EUC_DEV195_norm_(cols[i].id)
      )>=0
    ){
      return cols[i].id;
    }
  }

  return '';
}

/* -------------------------------------------------------------
 * SIRET
 * ------------------------------------------------------------- */

function EUC_DEV195_expandJson_(v,depth){
  if(depth>8)return v;

  if(typeof v==='string'){
    var s=v.trim();

    if(
      (s.charAt(0)==='{' && s.charAt(s.length-1)==='}') ||
      (s.charAt(0)==='[' && s.charAt(s.length-1)===']')
    ){
      try{
        return EUC_DEV195_expandJson_(
          JSON.parse(s),
          depth+1
        );
      }catch(e){}
    }

    return v;
  }

  if(Array.isArray(v)){
    return v.map(function(x){
      return EUC_DEV195_expandJson_(x,depth+1);
    });
  }

  if(v && typeof v==='object'){
    var out={};

    Object.keys(v).forEach(function(k){
      out[k]=EUC_DEV195_expandJson_(v[k],depth+1);
    });

    return out;
  }

  return v;
}

function EUC_DEV195_flat_(obj,path,out,depth){
  if(obj==null || depth>10)return;

  if(typeof obj!=='object'){
    out.push({
      path:path.join('.'),
      key:path.length
        ? path[path.length-1]
        : '',
      value:String(obj)
    });

    return;
  }

  if(Array.isArray(obj)){
    for(var i=0;i<obj.length;i++){
      EUC_DEV195_flat_(
        obj[i],
        path.concat(String(i)),
        out,
        depth+1
      );
    }

    return;
  }

  Object.keys(obj).forEach(function(k){
    EUC_DEV195_flat_(
      obj[k],
      path.concat(k),
      out,
      depth+1
    );
  });
}

function EUC_DEV195_pick_(flat,names){
  var wanted=names.map(EUC_DEV195_norm_);

  for(var wi=0;wi<wanted.length;wi++){
    for(var i=0;i<flat.length;i++){
      if(
        EUC_DEV195_norm_(flat[i].key)===wanted[wi] &&
        EUC_DEV195_txt_(flat[i].value)
      ){
        return EUC_DEV195_txt_(flat[i].value);
      }
    }
  }

  return '';
}

function EUC_DEV195_mapFields_(fields,siret,source){
  var expanded=EUC_DEV195_expandJson_(fields,0);
  var flat=[];

  EUC_DEV195_flat_(
    expanded,
    [],
    flat,
    0
  );

  var nomEntreprise=EUC_DEV195_pick_(flat,[
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
    'raisonSocialeEntreprise',
    'nom'
  ]);

  var nomCommercial=EUC_DEV195_pick_(flat,[
    'nom_commercial',
    'nomCommercial',
    'enseigne',
    'enseigne_1',
    'enseigne1',
    'appellation',
    'entreprise'
  ]);

  var adresse=EUC_DEV195_pick_(flat,[
    'adresse_complete',
    'adresseComplete',
    'adresse',
    'adresse_etablissement',
    'adresseEtablissement',
    'adresse_entreprise',
    'adresse_postale'
  ]);

  var cp=EUC_DEV195_pick_(flat,[
    'code_postal',
    'codePostal',
    'cp'
  ]);

  var ville=EUC_DEV195_pick_(flat,[
    'libelle_commune',
    'libelleCommune',
    'ville',
    'commune'
  ]);

  if(!adresse){
    var num=EUC_DEV195_pick_(flat,[
      'numero_voie',
      'numeroVoie'
    ]);

    var type=EUC_DEV195_pick_(flat,[
      'type_voie',
      'typeVoie'
    ]);

    var voie=EUC_DEV195_pick_(flat,[
      'libelle_voie',
      'libelleVoie',
      'nom_voie',
      'nomVoie'
    ]);

    adresse=[
      num,
      type,
      voie
    ].filter(Boolean).join(' ');
  }

  var out={
    ok:true,
    found:!!(
      nomEntreprise ||
      nomCommercial ||
      adresse ||
      cp ||
      ville
    ),
    source:source||'',
    siret:siret,

    nomEntreprise:nomEntreprise,
    nomCommercial:nomCommercial,

    adresse:adresse,
    codePostal:cp,
    ville:ville,

    telephoneEntreprise:EUC_DEV195_pick_(flat,[
      'telephone_entreprise',
      'telephoneEntreprise',
      'telephone',
      'tel'
    ]),

    courrielEntreprise:EUC_DEV195_pick_(flat,[
      'courriel_entreprise',
      'courrielEntreprise',
      'courriel',
      'email',
      'mail'
    ]),

    tuteur:EUC_DEV195_pick_(flat,[
      'tuteur_nom',
      'tuteurNom',
      'nom_tuteur',
      'nomTuteur',
      'tuteur'
    ]),

    telephoneTuteur:EUC_DEV195_pick_(flat,[
      'tuteur_telephone',
      'tuteurTelephone',
      'telephone_tuteur',
      'telephoneTuteur'
    ]),

    courrielTuteur:EUC_DEV195_pick_(flat,[
      'tuteur_courriel',
      'tuteurCourriel',
      'courriel_tuteur',
      'courrielTuteur',
      'email_tuteur',
      'emailTuteur'
    ])
  };

  return out;
}

function EUC_DEV195_findGristBySiret_(siret){
  var tables=EUC_DEV195_tables_();

  tables.sort(function(a,b){
    function score(x){
      var n=EUC_DEV195_norm_(x.id);
      var s=0;

      if(n.indexOf('ENTREPRISE')>=0)s+=50;
      if(n.indexOf('ENT')>=0)s+=10;
      if(n.indexOf('SNAPSHOT')>=0)s-=100;
      if(n.indexOf('AUDIT')>=0)s-=100;
      if(n.indexOf('LOG')>=0)s-=100;

      return s;
    }

    return score(b)-score(a);
  });

  for(var ti=0;ti<tables.length;ti++){
    var table=tables[ti].id;

    if(
      /SNAPSHOT|AUDIT|LOG/i.test(table)
    ){
      continue;
    }

    var cols;

    try{
      cols=EUC_DEV195_cols_(table);
    }catch(e){
      continue;
    }

    var cSiret=EUC_DEV195_col_(cols,[
      'SIRET',
      'Numero_SIRET',
      'NumeroSIRET',
      'No_SIRET'
    ]);

    if(!cSiret)continue;

    var rows;

    try{
      rows=EUC_DEV195_records_(table);
    }catch(e2){
      continue;
    }

    for(var ri=0;ri<rows.length;ri++){
      var f=rows[ri].fields||{};

      if(
        EUC_DEV195_siret_(f[cSiret])===
        siret
      ){
        var mapped=
          EUC_DEV195_mapFields_(
            f,
            siret,
            'Grist:'+table
          );

        if(mapped.found){
          mapped.table=table;
          mapped.recordId=rows[ri].id;
          return mapped;
        }
      }
    }
  }

  return {
    ok:true,
    found:false,
    siret:siret
  };
}

function EUC_DEV195_lookupSiret(siret){
  siret=EUC_DEV195_siret_(siret);

  if(siret.length!==14){
    return {
      ok:false,
      found:false,
      error:'SIRET invalide : 14 chiffres attendus.'
    };
  }

  /*
   * 1. moteur historique
   */
  if(
    typeof EUC_ENT_rechercherSiret===
    'function'
  ){
    try{
      var raw=
        EUC_ENT_rechercherSiret(
          siret
        );

      var mapped=
        EUC_DEV195_mapFields_(
          raw,
          siret,
          'EUC_ENT_rechercherSiret'
        );

      if(mapped.found){
        if(
          typeof
          EUC_DEV192_upsertGlobalEntreprise_===
          'function'
        ){
          try{
            mapped.globalEntreprise=
              EUC_DEV192_upsertGlobalEntreprise_(
                mapped
              );
          }catch(e3){}
        }

        return mapped;
      }
    }catch(e){}
  }

  /*
   * 2. recherche directe dans la base Grist,
   * notamment après passage du moteur historique.
   */
  var local=
    EUC_DEV195_findGristBySiret_(
      siret
    );

  if(local.found){
    return local;
  }

  return {
    ok:true,
    found:false,
    siret:siret
  };
}

/* -------------------------------------------------------------
 * CLASSES BTS / ÉLÈVES
 * ------------------------------------------------------------- */

function EUC_DEV195_classAliases_(classeNom){
  var raw=
    EUC_DEV195_norm_(
      classeNom
    );

  var aliases={};

  function add(v){
    var n=EUC_DEV195_norm_(v);
    if(n)aliases[n]=true;
  }

  add(raw);

  /*
   * Exemples :
   * 1BTS CIEL -> 1CIEL
   * 2BTS CIEL -> 2CIEL
   * 1BTS MV   -> 1MV
   */
  add(
    raw.replace(
      'BTS',
      ''
    )
  );

  /*
   * Certains libellés peuvent être "BTS1 CIEL" ou "BTS 1 CIEL".
   */
  var m=
    raw.match(
      /^BTS([12])(.*)$/
    );

  if(m){
    add(
      m[1]+
      m[2]
    );
  }

  /*
   * Autres variantes simples.
   */
  add(
    raw.replace(
      /^([12])BTS/,
      '$1'
    )
  );

  return Object.keys(
    aliases
  );
}

function EUC_DEV195_findStudents(
  annee,
  classeId,
  classeNom
){
  var table='EUC_ELEVES_PFMP';

  var cols=
    EUC_DEV195_cols_(
      table
    );

  var rows=
    EUC_DEV195_records_(
      table
    );

  var cCode=
    EUC_DEV195_col_(
      cols,
      [
        'Code_classe_importe',
        'Code_classe',
        'Classe_Pronote',
        'ClassePronote'
      ]
    );

  var cClasse=
    EUC_DEV195_col_(
      cols,
      [
        'Classe',
        'Classe_id',
        'ClasseRef'
      ]
    );

  var cNom=
    EUC_DEV195_col_(
      cols,
      [
        'Nom',
        'Nom_eleve',
        'Eleve_nom'
      ]
    );

  var cPrenom=
    EUC_DEV195_col_(
      cols,
      [
        'Prenom',
        'Prénom',
        'Prenom_eleve',
        'Eleve_prenom'
      ]
    );

  var aliases=
    EUC_DEV195_classAliases_(
      classeNom
    );

  var matched=
    rows.filter(
      function(r){
        var f=
          r.fields||{};

        var ok=false;

        if(cCode){
          var code=
            EUC_DEV195_norm_(
              f[cCode]
            );

          if(
            aliases.indexOf(
              code
            )>=0
          ){
            ok=true;
          }
        }

        if(
          !ok &&
          cClasse &&
          EUC_DEV195_refIds_(
            f[cClasse]
          ).indexOf(
            Number(
              classeId
            )
          )>=0
        ){
          ok=true;
        }

        return ok;
      }
    );

  return matched
    .map(
      function(r){
        var f=
          r.fields||{};

        return {
          id:r.id,
          nom:
            cNom
              ? EUC_DEV195_txt_(
                  f[cNom]
                )
              : '',
          prenom:
            cPrenom
              ? EUC_DEV195_txt_(
                  f[cPrenom]
                )
              : ''
        };
      }
    )
    .sort(
      function(a,b){
        return (
          a.nom+
          ' '+
          a.prenom
        ).localeCompare(
          b.nom+
          ' '+
          b.prenom,
          'fr'
        );
      }
    );
}

function EUC_DEV195_loadApprentis(
  annee,
  classeId,
  classeNom
){
  var baseStudents=
    EUC_DEV195_findStudents(
      annee,
      classeId,
      classeNom
    );

  var old=
    EUC_DEV192_loadApprentis(
      annee,
      classeId,
      classeNom
    );

  var map={};

  (old.students||[])
    .forEach(
      function(x){
        map[x.id]=x;
      }
    );

  return {
    ok:true,
    students:
      baseStudents
      .map(
        function(s){
          var x=
            map[s.id]||{};

          x.id=s.id;
          x.nom=s.nom;
          x.prenom=s.prenom;

          x.apprenti=
            !!x.apprenti;

          x.debut=
            x.debut||'';

          x.fin=
            x.fin||'';

          x.siret=
            x.siret||'';

          x.nomEntreprise=
            x.nomEntreprise||'';

          x.nomCommercial=
            x.nomCommercial||'';

          x.adresse=
            x.adresse||'';

          x.cp=
            x.cp||'';

          x.ville=
            x.ville||'';

          x.telEntreprise=
            x.telEntreprise||'';

          x.mailEntreprise=
            x.mailEntreprise||'';

          x.tuteur=
            x.tuteur||'';

          x.telTuteur=
            x.telTuteur||'';

          x.mailTuteur=
            x.mailTuteur||'';

          return x;
        }
      )
  };
}

function EUC_DEV195_loadPdif(
  annee,
  classeId,
  classeNom
){
  var baseStudents=
    EUC_DEV195_findStudents(
      annee,
      classeId,
      classeNom
    );

  var old=
    EUC_DEV190V1_loadPdif(
      annee,
      classeId,
      classeNom
    );

  var map={};

  (old.students||[])
    .forEach(
      function(x){
        map[x.id]=x;
      }
    );

  return {
    ok:true,
    students:
      baseStudents
      .map(
        function(s){
          var x=
            map[s.id]||{};

          return {
            id:s.id,
            nom:s.nom,
            prenom:s.prenom,
            selected:
              !!x.selected,
            remarque:
              x.remarque||''
          };
        }
      )
  };
}
