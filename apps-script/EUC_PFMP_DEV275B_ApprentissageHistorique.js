/**
 * Eucalyptus PFMP — v1.0.0-dev.275b
 * Moteur unique apprentissage <-> périodes PFMP.
 *
 * Règles :
 * - contrat couvrant toute la période => APPRENTI / "Contrat apprentissage"
 * - contrat ne couvrant aucune partie => SCOLAIRE
 * - chevauchement partiel => MIXTE
 * - rupture : l'épisode historique reste exploitable pour les périodes antérieures
 * - fonctionne pour toutes les classes, BAC PRO / CAP / BTS / P.dif. / autres périodes datées
 */
var EUC_DEV275B_APP_TABLE_='EUC_APPRENTISSAGE_PFMP';

function EUC_DEV275B_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV275B_norm_(v){
  return EUC_DEV275B_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function EUC_DEV275B_date_(v){
  if(v===null||v===undefined||v==='')return '';

  try{
    if(typeof EUC_IMPORT_dateExistanteISO_==='function'){
      var x=EUC_IMPORT_dateExistanteISO_(v);
      if(x)return x;
    }
  }catch(e){}

  var s=String(v).trim();

  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;

  var m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);

  if(m){
    return m[3]+'-'+
      String(m[2]).padStart(2,'0')+'-'+
      String(m[1]).padStart(2,'0');
  }

  return '';
}

function EUC_DEV275B_ref_(v){
  try{
    if(typeof EUC_PFMP_ref_==='function'){
      return Number(EUC_PFMP_ref_(v))||0;
    }
  }catch(e){}

  if(Array.isArray(v)){
    return Number(v[1]||v[0])||0;
  }

  return Number(v)||0;
}

function EUC_DEV275B_pick_(r,names){
  r=r||{};

  for(var i=0;i<names.length;i++){
    var k=names[i];

    if(
      r[k]!==null &&
      r[k]!==undefined &&
      EUC_DEV275B_txt_(r[k])!==''
    ){
      return EUC_DEV275B_txt_(r[k]);
    }
  }

  return '';
}

function EUC_DEV275B_minDate_(a,b){
  a=EUC_DEV275B_date_(a);
  b=EUC_DEV275B_date_(b);

  if(a&&b)return a<b?a:b;
  return a||b||'';
}

/**
 * Lecture de TOUT l'historique.
 *
 * On ne filtre surtout pas Actif=false : une rupture ferme l'épisode courant,
 * mais cet épisode doit rester valable pour les périodes antérieures à la rupture.
 */
function EUC_DEV275B_rows_(){
  try{
    return EUC_IMPORT_lireRecords_(
      EUC_DEV275B_APP_TABLE_
    )||[];
  }catch(e){
    return [];
  }
}

function EUC_DEV275B_contract_(r){
  r=r||{};

  var debut=EUC_DEV275B_date_(
    r.Date_contrat_officielle||
    r.Date_debut||
    r.Debut
  );

  var rupture=EUC_DEV275B_date_(
    r.Date_rupture_contrat
  );

  var fin=EUC_DEV275B_date_(
    r.Date_fin||
    r.Fin
  );

  /*
   * Si une date de rupture est plus ancienne que la fin prévue,
   * elle devient la vraie fin de l'épisode.
   */
  fin=EUC_DEV275B_minDate_(fin,rupture);

  /*
   * Un ancien enregistrement inactif sans aucune date de fin n'est pas
   * exploitable historiquement : on l'ignore pour éviter un faux contrat éternel.
   */
  var historiqueValide=
    r.Actif!==false ||
    !!fin ||
    !!rupture;

  var nomEntreprise=EUC_DEV275B_pick_(r,[
    'Nom_entreprise',
    'Raison_sociale',
    'Entreprise'
  ]);

  var nomCommercial=EUC_DEV275B_pick_(r,[
    'Nom_commercial',
    'Entreprise'
  ]);

  return {
    id:Number(r.id)||0,
    eleveId:EUC_DEV275B_ref_(r.Eleve),
    debut:debut,
    fin:fin||'9999-12-31',
    rupture:rupture,
    actif:r.Actif!==false,
    historiqueValide:historiqueValide,

    nomEntreprise:nomEntreprise,
    nomCommercial:nomCommercial,
    entreprise:nomCommercial||nomEntreprise,

    siret:EUC_DEV275B_pick_(r,['SIRET']),

    adresse:EUC_DEV275B_pick_(r,[
      'Adresse_entreprise',
      'Adresse'
    ]),

    cp:EUC_DEV275B_pick_(r,[
      'Code_postal',
      'CodePostal',
      'CP'
    ]),

    ville:EUC_DEV275B_pick_(r,['Ville']),

    telEntreprise:EUC_DEV275B_pick_(r,[
      'Entreprise_telephone',
      'Telephone_entreprise'
    ]),

    mailEntreprise:EUC_DEV275B_pick_(r,[
      'Entreprise_courriel',
      'Courriel_entreprise'
    ]),

    tuteur:EUC_DEV275B_pick_(r,[
      'Tuteur_nom',
      'Tuteur'
    ]),

    telTuteur:EUC_DEV275B_pick_(r,[
      'Tuteur_telephone',
      'Telephone_tuteur'
    ]),

    mailTuteur:EUC_DEV275B_pick_(r,[
      'Tuteur_courriel',
      'Courriel_tuteur'
    ])
  };
}

/**
 * Un élève possède une inscription différente pour chaque année scolaire.
 * Les contrats restent néanmoins attachés à la personne : on retrouve donc
 * toutes ses inscriptions par identifiants Pronote/national stables. Le repli
 * nom + prénom + naissance n'est accepté que lorsqu'il est non ambigu.
 */
function EUC_DEV275B_studentIdentity_(e){
  e=e||{};
  var strong=[];

  function add(prefix,value){
    value=EUC_DEV275B_txt_(value);
    if(value)strong.push(prefix+'|'+value);
  }

  add('NN',e.Numero_national||e.Numero_National||e.Identifiant_national);
  add('I',e.Identifiant_Pronote||e.Identifiant_source);
  add('N',e.Numero_Pronote);

  var fallback='ID|'+[
    EUC_DEV275B_norm_(e.Nom),
    EUC_DEV275B_norm_(e.Prenom_usage||e.Prenom),
    EUC_DEV275B_date_(e.Date_naissance)
  ].join('|');

  return {strong:strong,fallback:fallback};
}

function EUC_DEV275B_studentAliases_(students){
  var byStrong={},byFallback={},identityById={};

  (students||[]).forEach(function(e){
    var id=Number(e.id)||0;
    if(!id)return;
    var identity=EUC_DEV275B_studentIdentity_(e);
    identityById[id]=identity;
    identity.strong.forEach(function(k){
      (byStrong[k]=byStrong[k]||[]).push(id);
    });
    if(identity.fallback.indexOf('ID|||')!==0){
      (byFallback[identity.fallback]=byFallback[identity.fallback]||[]).push(id);
    }
  });

  var out={};
  Object.keys(identityById).forEach(function(rawId){
    var id=Number(rawId),identity=identityById[id],ids={};
    ids[id]=true;
    identity.strong.forEach(function(k){
      (byStrong[k]||[]).forEach(function(x){ids[x]=true;});
    });
    /* Aucun rapprochement faible si plusieurs personnes le partagent. */
    if(!identity.strong.length && (byFallback[identity.fallback]||[]).length===1){
      (byFallback[identity.fallback]||[]).forEach(function(x){ids[x]=true;});
    }else if(identity.strong.length){
      (byFallback[identity.fallback]||[]).forEach(function(x){
        var other=identityById[x];
        if(other&&other.strong.some(function(k){return identity.strong.indexOf(k)>=0;}))ids[x]=true;
      });
    }
    out[id]=Object.keys(ids).map(Number);
  });
  return out;
}

function EUC_DEV275B_evalStudent_(rows,aliases,eid,debut,fin){
  var ids=(aliases&&aliases[Number(eid)])||[Number(eid)||0];
  var allowed={};
  ids.forEach(function(id){if(id)allowed[id]=true;});
  return EUC_DEV275B_evalRows_(
    (rows||[]).filter(function(r){
      return !!allowed[EUC_DEV275B_ref_(r.Eleve)];
    }),
    Number(eid)||0,
    debut,
    fin,
    allowed
  );
}

function EUC_DEV275B_evalRows_(rows,eid,debut,fin,allowedIds){
  debut=EUC_DEV275B_date_(debut);
  fin=EUC_DEV275B_date_(fin);

  if(!debut||!fin){
    return {code:'SCOLAIRE',record:null};
  }

  var contracts=(rows||[])
    .map(EUC_DEV275B_contract_)
    .filter(function(r){
      return (
        (allowedIds ? !!allowedIds[Number(r.eleveId)] : Number(r.eleveId)===Number(eid)) &&
        !!r.debut &&
        r.historiqueValide
      );
    })
    .sort(function(a,b){
      return String(b.debut).localeCompare(
        String(a.debut)
      );
    });

  var full=contracts.filter(function(r){
    return (
      r.debut<=debut &&
      r.fin>=fin
    );
  });

  if(full.length){
    return {
      code:'APPRENTI',
      record:full[0]
    };
  }

  var partial=contracts.filter(function(r){
    return (
      r.debut<=fin &&
      r.fin>=debut
    );
  });

  if(partial.length){
    return {
      code:'MIXTE',
      record:partial[0]
    };
  }

  return {
    code:'SCOLAIRE',
    record:null
  };
}

function EUC_DEV275B_address_(r){
  if(!r)return '';

  return [
    r.adresse||'',
    [r.cp||'',r.ville||'']
      .filter(Boolean)
      .join(' ')
  ]
    .filter(Boolean)
    .join(' · ');
}

function EUC_DEV275B_contact_(tel,mail){
  return [
    tel||'',
    mail||''
  ]
    .filter(Boolean)
    .join(' · ');
}

function EUC_DEV275B_isIncident_(x){
  var s=EUC_DEV275B_norm_(
    (x&&x.statutCode||'')+
    ' '+
    (x&&x.statut||'')
  );

  return (
    s.indexOf('ANNULE')>=0 ||
    s.indexOf('INTERROMP')>=0
  );
}

function EUC_DEV275B_isSansConvention_(x){
  var s=EUC_DEV275B_norm_(
    (x&&x.statutCode||'')+
    ' '+
    (x&&x.statut||'')
  );

  return (
    s.indexOf('SANS CONVENTION')>=0 ||
    s.indexOf('SANS_CONVENTION')>=0
  );
}

/**
 * Enrichissement du détail réellement servi.
 *
 * Important : APPRENTI sort des compteurs convention.
 * Le statut affiché devient "Contrat apprentissage".
 */
function EUC_DEV275B_enrichDetail_(d){
  if(!d)return d;

  var debut=EUC_DEV275B_date_(
    d&&d.periode&&(
      d.periode.debut||
      d.periode.Date_debut
    )
  );

  var fin=EUC_DEV275B_date_(
    d&&d.periode&&(
      d.periode.fin||
      d.periode.Date_fin
    )
  );

  if(!debut||!fin){
    return d;
  }

  var rows=EUC_DEV275B_rows_();
  var allStudents=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP')||[];
  var aliases=EUC_DEV275B_studentAliases_(allStudents);
  var apprentis=0;
  var mixtes=0;
  var avec=0;
  var sans=0;
  var incidents=0;

  (d.lignes||[]).forEach(function(x){
    var st=EUC_DEV275B_evalStudent_(
      rows,
      aliases,
      Number(x.eleveId)||0,
      debut,
      fin
    );

    x.statutApprentissage=st.code;
    x.apprenti=st.code==='APPRENTI';
    x.statutMixte=st.code==='MIXTE';

    if(x.apprenti){
      apprentis++;

      var r=st.record||{};

      x.statutCode='CONTRAT_APPRENTISSAGE';
      x.statut='Contrat apprentissage';
      x.numero='';
      x.convention=false;

      x.entreprise=
        r.entreprise||
        x.entreprise||
        '';

      x.adresseEntreprise=
        EUC_DEV275B_address_(r)||
        x.adresseEntreprise||
        '';

      x.telephoneEntreprise=
        r.telEntreprise||
        x.telephoneEntreprise||
        '';

      x.courrielEntreprise=
        r.mailEntreprise||
        x.courrielEntreprise||
        '';

      x.contactEntreprise=
        EUC_DEV275B_contact_(
          r.telEntreprise,
          r.mailEntreprise
        )||
        x.contactEntreprise||
        '';

      x.tuteurEntreprise=
        [
          r.tuteur||'',
          r.telTuteur||'',
          r.mailTuteur||''
        ]
          .filter(Boolean)
          .join(' · ')||
        x.tuteurEntreprise||
        '';

      x.telephoneTuteur=
        r.telTuteur||
        x.telephoneTuteur||
        '';

      x.courrielTuteur=
        r.mailTuteur||
        x.courrielTuteur||
        '';

      x.siretApprentissage=
        r.siret||
        '';

      return;
    }

    if(x.statutMixte){
      mixtes++;
    }

    /*
     * Un statut MIXTE reste dans le circuit scolaire/convention,
     * puisque le contrat ne couvre pas toute la période.
     */
    if(EUC_DEV275B_isIncident_(x)){
      incidents++;
    }else if(EUC_DEV275B_isSansConvention_(x)){
      sans++;
    }else{
      avec++;
    }
  });

  d.stats=d.stats||{};

  d.stats.total=(d.lignes||[]).length;
  d.stats.apprentis=apprentis;
  d.stats.mixtes=mixtes;

  /*
   * Seuls les apprentis couvrant TOUTE la période sont retirés
   * du besoin de convention. Un MIXTE reste scolaire pour une partie
   * de la période et reste donc dans les compteurs convention.
   */
  d.stats.scolairesAttendus=
    Math.max(
      0,
      d.stats.total-apprentis
    );

  d.stats.avecConvention=avec;
  d.stats.sansConvention=sans;

  /*
   * On conserve les compteurs incidents déjà détaillés s'ils existent.
   * Sinon on place le total dans annulees pour que l'agrégat visuel reste juste.
   */
  if(
    d.stats.annulees===undefined &&
    d.stats.interrompues===undefined
  ){
    d.stats.annulees=incidents;
    d.stats.interrompues=0;
  }

  return d;
}

function EUC_DEV275B_anneeCode_(e,map){
  try{
    if(
      typeof EUC_V154_anneeCode_==='function' &&
      map
    ){
      return EUC_V154_anneeCode_(
        e.Annee_scolaire,
        map
      );
    }
  }catch(err){}

  return EUC_DEV275B_txt_(
    e.Annee_code||
    e.Annee_scolaire
  );
}

/**
 * Corrige dynamiquement l'index famille au moment de sa lecture.
 * Aucun rebuild manuel de snapshot nécessaire.
 */
function EUC_DEV275B_enrichFamilyPayload_(payload,annee,famille){
  if(!payload)return payload;

  var rows=EUC_DEV275B_rows_();

  var mapAnnee=null;

  try{
    if(typeof EUC_V154_anneesMap_==='function'){
      mapAnnee=EUC_V154_anneesMap_();
    }
  }catch(e){}

  var allStudents=(EUC_IMPORT_lireRecords_(
    'EUC_ELEVES_PFMP'
  )||[]);
  var aliases=EUC_DEV275B_studentAliases_(allStudents);
  var students=allStudents
    .filter(function(e){
      if(
        e.Actif===false ||
        e.Present_dernier_import===false
      ){
        return false;
      }

      var a=EUC_DEV275B_anneeCode_(
        e,
        mapAnnee
      );

      return (
        !annee ||
        !a ||
        a===annee
      );
    });

  var byClass={};

  students.forEach(function(e){
    var cid=EUC_DEV275B_ref_(e.Classe);

    if(cid){
      (byClass[cid]=byClass[cid]||[])
        .push(e);
    }
  });

  (payload.classes||[]).forEach(function(c){
    var cid=Number(
      c.classeId||
      c.id
    )||0;

    var effectif=
      Number(c.effectif)||
      Number(c.total)||
      (byClass[cid]||[]).length;

    var unique={};

    (c.periodes||[]).forEach(function(p){
      var debut=EUC_DEV275B_date_(
        p.debut||
        p.Date_debut
      );

      var fin=EUC_DEV275B_date_(
        p.fin||
        p.Date_fin
      );

      var ap=0;
      var mx=0;

      (byClass[cid]||[]).forEach(function(e){
        var st=EUC_DEV275B_evalStudent_(
          rows,
          aliases,
          Number(e.id)||0,
          debut,
          fin
        );

        if(st.code==='APPRENTI'){
          ap++;
          unique[String(e.id)]=1;
        }else if(st.code==='MIXTE'){
          mx++;
        }
      });

      p.apprentis=ap;
      p.mixtes=mx;

      /*
       * Décompte demandé : seul APPRENTI complet sort du dénominateur.
       */
      p.total=Math.max(
        0,
        effectif-ap
      );

      p.manquantes=Math.max(
        0,
        p.total-(Number(p.conventions)||0)
      );

      p.pourcentage=
        p.total
          ? Math.round(
              (Number(p.conventions)||0)/
              p.total*100
            )
          : 100;
    });

    c.apprentis=
      Object.keys(unique).length;
  });

  payload.apprentis=
    (payload.classes||[])
      .reduce(function(n,c){
        return n+(Number(c.apprentis)||0);
      },0);

  return payload;
}
