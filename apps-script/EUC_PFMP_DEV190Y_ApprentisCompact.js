/**
 * DEV.190Y
 * - tableau apprentis compact
 * - Nom entreprise distinct de Nom commercial
 * - adresse / CP / ville séparés
 * - coordonnées entreprise et tuteur sur 2 lignes dans une même cellule
 * - recherche SIRET :
 *      1) référentiels Grist
 *      2) API Recherche Entreprises (fallback)
 */

function EUC_DEV190Y_txt_(v){
  return String(v == null ? '' : v).trim();
}

function EUC_DEV190Y_norm_(v){
  return EUC_DEV190Y_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}

function EUC_DEV190Y_siret_(v){
  return EUC_DEV190Y_txt_(v)
    .replace(/\D/g,'')
    .slice(0,14);
}

function EUC_DEV190Y_tables_(){
  return (EUC_DEV190_api_('get','/tables',null).tables||[]);
}

function EUC_DEV190Y_columns_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/columns',
      null
    ).columns||[]
  );
}

function EUC_DEV190Y_records_(table){
  return (
    EUC_DEV190_api_(
      'get',
      '/tables/'+encodeURIComponent(table)+'/records',
      null
    ).records||[]
  );
}

function EUC_DEV190Y_pick_(f,names){
  f=f||{};
  var keys=Object.keys(f);
  var wanted=names.map(EUC_DEV190Y_norm_);

  for(var wi=0;wi<wanted.length;wi++){
    for(var ki=0;ki<keys.length;ki++){
      if(
        EUC_DEV190Y_norm_(keys[ki])===wanted[wi] &&
        f[keys[ki]]!=null &&
        String(f[keys[ki]]).trim()!==''
      ){
        return String(f[keys[ki]]).trim();
      }
    }
  }

  return '';
}

function EUC_DEV190Y_findGristCompany_(siret){
  var tables=EUC_DEV190Y_tables_();

  /*
   * On privilégie les tables dont le nom évoque les entreprises.
   */
  tables.sort(function(a,b){
    function score(x){
      var n=EUC_DEV190Y_norm_(x.id);
      var s=0;
      if(n.indexOf('ENTREPRISE')>=0)s+=20;
      if(n.indexOf('ENT')>=0)s+=5;
      if(n.indexOf('SNAPSHOT')>=0)s-=50;
      if(n.indexOf('AUDIT')>=0)s-=50;
      return s;
    }
    return score(b)-score(a);
  });

  for(var ti=0;ti<tables.length;ti++){
    var table=tables[ti].id;

    if(/SNAPSHOT|AUDIT|LOG/i.test(table))continue;

    var cols;

    try{
      cols=EUC_DEV190Y_columns_(table);
    }catch(e){
      continue;
    }

    var siretCols=cols
      .map(function(c){return c.id;})
      .filter(function(id){
        var n=EUC_DEV190Y_norm_(id);
        return (
          n==='SIRET' ||
          n==='NUMEROSIRET' ||
          n==='NOSIRET'
        );
      });

    if(!siretCols.length)continue;

    var rows;

    try{
      rows=EUC_DEV190Y_records_(table);
    }catch(e2){
      continue;
    }

    for(var ri=0;ri<rows.length;ri++){
      var f=rows[ri].fields||{};
      var found=false;

      for(var si=0;si<siretCols.length;si++){
        if(EUC_DEV190Y_siret_(f[siretCols[si]])===siret){
          found=true;
          break;
        }
      }

      if(!found)continue;

      return {
        found:true,
        source:'grist:'+table,
        siret:siret,

        nomEntreprise:EUC_DEV190Y_pick_(f,[
          'Nom_entreprise',
          'Nom entreprise',
          'Raison_sociale',
          'Raison sociale',
          'RaisonSociale',
          'Denomination',
          'Dénomination',
          'Nom'
        ]),

        nomCommercial:EUC_DEV190Y_pick_(f,[
          'Nom_commercial',
          'Nom commercial',
          'Enseigne',
          'Appellation',
          'Entreprise'
        ]),

        adresse:EUC_DEV190Y_pick_(f,[
          'Adresse_entreprise',
          'Adresse entreprise',
          'Adresse_postale',
          'Adresse postale',
          'Adresse'
        ]),

        codePostal:EUC_DEV190Y_pick_(f,[
          'Code_postal',
          'Code postal',
          'CodePostal',
          'CP'
        ]),

        ville:EUC_DEV190Y_pick_(f,[
          'Ville',
          'Commune'
        ]),

        telephoneEntreprise:EUC_DEV190Y_pick_(f,[
          'Entreprise_telephone',
          'Telephone_entreprise',
          'Téléphone entreprise',
          'Telephone entreprise',
          'Telephone',
          'Téléphone',
          'Tel'
        ]),

        courrielEntreprise:EUC_DEV190Y_pick_(f,[
          'Entreprise_courriel',
          'Courriel_entreprise',
          'Courriel entreprise',
          'Email_entreprise',
          'Email entreprise',
          'Courriel',
          'Email',
          'Mail'
        ]),

        tuteur:EUC_DEV190Y_pick_(f,[
          'Tuteur_nom',
          'Tuteur nom',
          'Nom_tuteur',
          'Nom tuteur',
          'Tuteur'
        ]),

        telephoneTuteur:EUC_DEV190Y_pick_(f,[
          'Tuteur_telephone',
          'Telephone_tuteur',
          'Téléphone tuteur',
          'Telephone tuteur',
          'Tel_tuteur'
        ]),

        courrielTuteur:EUC_DEV190Y_pick_(f,[
          'Tuteur_courriel',
          'Courriel_tuteur',
          'Courriel tuteur',
          'Email_tuteur',
          'Email tuteur'
        ])
      };
    }
  }

  return {found:false};
}

function EUC_DEV190Y_findPublicCompany_(siret){
  var url=
    'https://recherche-entreprises.api.gouv.fr/search?q='+
    encodeURIComponent(siret)+
    '&per_page=10';

  try{
    var res=UrlFetchApp.fetch(url,{
      muteHttpExceptions:true,
      followRedirects:true
    });

    if(res.getResponseCode()<200 || res.getResponseCode()>=300){
      return {found:false};
    }

    var data=JSON.parse(res.getContentText()||'{}');
    var results=data.results||[];

    for(var i=0;i<results.length;i++){
      var r=results[i]||{};
      var siege=r.siege||{};

      var rsiret=EUC_DEV190Y_siret_(
        siege.siret ||
        r.siret ||
        ''
      );

      if(rsiret!==siret){
        /*
         * Certains résultats renvoient une liste de sièges correspondants.
         */
        var matches=r.matching_etablissements||r.matching_siege||[];
        var hit=null;

        if(Array.isArray(matches)){
          for(var j=0;j<matches.length;j++){
            if(EUC_DEV190Y_siret_(matches[j].siret)===siret){
              hit=matches[j];
              break;
            }
          }
        }

        if(hit){
          siege=hit;
          rsiret=siret;
        }
      }

      if(rsiret!==siret)continue;

      return {
        found:true,
        source:'api.gouv.fr',
        siret:siret,
        nomEntreprise:
          r.nom_raison_sociale ||
          r.nom_complet ||
          r.nom_entreprise ||
          '',
        nomCommercial:
          siege.nom_commercial ||
          siege.enseigne ||
          r.nom_commercial ||
          '',
        adresse:
          siege.adresse ||
          siege.adresse_complete ||
          '',
        codePostal:
          siege.code_postal ||
          '',
        ville:
          siege.libelle_commune ||
          siege.commune ||
          '',
        telephoneEntreprise:'',
        courrielEntreprise:'',
        tuteur:'',
        telephoneTuteur:'',
        courrielTuteur:''
      };
    }
  }catch(e){}

  return {found:false};
}

function EUC_DEV190Y_lookupSiret(siret){
  siret=EUC_DEV190Y_siret_(siret);

  if(siret.length!==14){
    return {
      ok:false,
      found:false,
      error:'Le SIRET doit contenir 14 chiffres.'
    };
  }

  var local=EUC_DEV190Y_findGristCompany_(siret);

  if(local.found){
    local.ok=true;
    return local;
  }

  var pub=EUC_DEV190Y_findPublicCompany_(siret);

  if(pub.found){
    pub.ok=true;
    return pub;
  }

  return {
    ok:true,
    found:false,
    siret:siret
  };
}

function EUC_DEV190Y_apprTable_(){
  var tables=EUC_DEV190Y_tables_();

  for(var i=0;i<tables.length;i++){
    if(EUC_DEV190Y_norm_(tables[i].id)===EUC_DEV190Y_norm_('EUC_APPRENTISSAGE_PFMP')){
      return tables[i].id;
    }
  }

  throw new Error('DEV190Y : EUC_APPRENTISSAGE_PFMP introuvable.');
}

function EUC_DEV190Y_ensureColumns_(){
  var table=EUC_DEV190Y_apprTable_();
  var cols=EUC_DEV190Y_columns_(table);
  var have={};

  cols.forEach(function(c){have[c.id]=true;});

  var wanted=[
    {id:'Nom_entreprise',type:'Text'},
    {id:'Nom_commercial',type:'Text'},
    {id:'SIRET',type:'Text'},
    {id:'Adresse_entreprise',type:'Text'},
    {id:'Code_postal',type:'Text'},
    {id:'Ville',type:'Text'},
    {id:'Entreprise_telephone',type:'Text'},
    {id:'Entreprise_courriel',type:'Text'}
  ];

  var missing=wanted.filter(function(c){return !have[c.id];});

  if(missing.length){
    EUC_DEV190_api_(
      'post',
      '/tables/'+encodeURIComponent(table)+'/columns',
      {columns:missing}
    );
  }

  return {ok:true,added:missing.map(function(c){return c.id;})};
}

function EUC_DEV190Y_loadApprentis(annee,classeId,classeNom){
  var r=EUC_DEV190V1_loadApprentis(
    annee,
    classeId,
    classeNom
  );

  /*
   * Ajoute les 2 noms distincts depuis les données apprentissage persistées.
   */
  var table=EUC_DEV190Y_apprTable_();
  var cols=EUC_DEV190Y_columns_(table);

  function col(names){
    var wanted=names.map(EUC_DEV190Y_norm_);
    for(var i=0;i<cols.length;i++){
      if(wanted.indexOf(EUC_DEV190Y_norm_(cols[i].id))>=0){
        return cols[i].id;
      }
    }
    return '';
  }

  var cEleve=col(['Eleve','Élève','Eleve_id']);
  var cNomEnt=col(['Nom_entreprise','Nom entreprise']);
  var cNomCom=col(['Nom_commercial','Nom commercial']);

  var map={};

  if(cEleve){
    EUC_DEV190Y_records_(table).forEach(function(row){
      var f=row.fields||{};
      var v=f[cEleve];
      var id=0;

      if(typeof v==='number')id=v;
      else if(Array.isArray(v)){
        for(var j=0;j<v.length;j++){
          if(typeof v[j]==='number'){id=v[j];break;}
        }
      }else{
        id=Number(v)||0;
      }

      if(id)map[id]=f;
    });
  }

  (r.students||[]).forEach(function(s){
    var f=map[s.id]||{};

    s.nomEntreprise=
      cNomEnt
        ? EUC_DEV190Y_txt_(f[cNomEnt])
        : '';

    s.nomCommercial=
      cNomCom
        ? EUC_DEV190Y_txt_(f[cNomCom])
        : (
            s.entreprise || ''
          );
  });

  return r;
}

function EUC_DEV190Y_init(){
  return EUC_DEV190Y_ensureColumns_();
}

function EUC_DEV190Y_saveApprenti(p){
  p=p||{};

  EUC_DEV190Y_ensureColumns_();

  /*
   * Compatibilité avec l'ancien service :
   * "Entreprise" reste alimenté avec Nom commercial si présent,
   * sinon Nom entreprise.
   */
  var legacy={
    eleveId:p.eleveId,
    annee:p.annee,
    apprenti:!!p.apprenti,
    debut:p.debut||'',
    fin:p.fin||'',
    siret:EUC_DEV190Y_siret_(p.siret),
    entreprise:p.nomCommercial||p.nomEntreprise||'',
    adresse:p.adresse||'',
    cp:p.cp||'',
    ville:p.ville||'',
    telEntreprise:p.telEntreprise||'',
    mailEntreprise:p.mailEntreprise||'',
    tuteur:p.tuteur||'',
    telTuteur:p.telTuteur||'',
    mailTuteur:p.mailTuteur||''
  };

  if(typeof EUC_DEV190U_saveApprenti!=='function'){
    throw new Error('DEV190Y : service de sauvegarde apprentissage indisponible.');
  }

  var result=EUC_DEV190U_saveApprenti(legacy);

  /*
   * Écrit ensuite les 2 nouveaux champs distincts.
   */
  var table=EUC_DEV190Y_apprTable_();
  var cols=EUC_DEV190Y_columns_(table);

  function col(names){
    var wanted=names.map(EUC_DEV190Y_norm_);
    for(var i=0;i<cols.length;i++){
      if(wanted.indexOf(EUC_DEV190Y_norm_(cols[i].id))>=0){
        return cols[i].id;
      }
    }
    return '';
  }

  var cEleve=col(['Eleve','Élève','Eleve_id']);
  var cNomEnt=col(['Nom_entreprise','Nom entreprise']);
  var cNomCom=col(['Nom_commercial','Nom commercial']);

  if(cEleve && (cNomEnt||cNomCom)){
    var rows=EUC_DEV190Y_records_(table);
    var target=null;

    for(var r=0;r<rows.length;r++){
      var v=(rows[r].fields||{})[cEleve];
      var id=0;

      if(typeof v==='number')id=v;
      else if(Array.isArray(v)){
        for(var j=0;j<v.length;j++){
          if(typeof v[j]==='number'){id=v[j];break;}
        }
      }else{
        id=Number(v)||0;
      }

      if(id===Number(p.eleveId)){
        target=rows[r];
        break;
      }
    }

    if(target){
      var fields={};
      if(cNomEnt)fields[cNomEnt]=p.nomEntreprise||'';
      if(cNomCom)fields[cNomCom]=p.nomCommercial||'';

      EUC_DEV190_api_(
        'patch',
        '/tables/'+encodeURIComponent(table)+'/records',
        {
          records:[{
            id:target.id,
            fields:fields
          }]
        }
      );
    }
  }

  return result||{ok:true};
}
