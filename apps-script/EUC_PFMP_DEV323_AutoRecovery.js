/**
 * PFMP — v1.0.0-dev.323
 * Récupération automatique d'entreprise depuis l'API Recherche d'Entreprises.
 *
 * L'appel HTTP est fait par le navigateur.
 * Ce module reçoit la réponse JSON et ne modifie que le tampon JotForm.
 */

function EUC_DEV323_norm_(v){
  return String(v==null?'':v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,'')
    .trim();
}

function EUC_DEV323_digits_(v){
  return String(v==null?'':v).replace(/\D/g,'');
}

function EUC_DEV323_pick_(o,names){
  o=o||{};

  if(typeof EUC_DEV315_pick_==='function'){
    try{
      var v=EUC_DEV315_pick_(o,names);
      if(v!==undefined&&v!==null&&String(v).trim()!==''){
        return v;
      }
    }catch(e){}
  }

  var map={};

  Object.keys(o).forEach(function(k){
    map[EUC_DEV323_norm_(k)]=k;
  });

  for(var i=0;i<names.length;i++){
    var real=map[EUC_DEV323_norm_(names[i])];

    if(
      real &&
      o[real]!==undefined &&
      o[real]!==null &&
      String(o[real]).trim()!==''
    ){
      return o[real];
    }
  }

  return '';
}

function EUC_DEV323_companyInput_(row){
  row=row||{};

  return {
    nom:String(
      EUC_DEV323_pick_(row,[
        'Entreprise_saisie',
        'Entreprise_brut',
        'Entreprise',
        'Raison_sociale_saisie',
        'Raison sociale',
        'Nom entreprise',
        'Entreprise saisie JotForm'
      ])||
      row.Raison_sociale_officielle||
      ''
    ).trim(),

    adresse:String(
      EUC_DEV323_pick_(row,[
        'Adresse_entreprise',
        'Adresse entreprise',
        'Entreprise_adresse',
        'Adresse_brute',
        'Adresse',
        'Adresse saisie'
      ])||
      row.Adresse_officielle||
      ''
    ).trim(),

    cp:String(
      EUC_DEV323_pick_(row,[
        'CP',
        'Code_postal_entreprise',
        'Code postal entreprise',
        'Code_postal',
        'Code postal'
      ])||
      row.CP_officiel||
      ''
    ).replace(/\D/g,'').slice(0,5),

    ville:String(
      EUC_DEV323_pick_(row,[
        'Ville_entreprise',
        'Ville entreprise',
        'Entreprise_commune',
        'Commune',
        'Ville'
      ])||
      row.Ville_officielle||
      ''
    ).trim()
  };
}

function EUC_DEV323_queryFor_(item){
  var row=item.row||{};
  var id=EUC_DEV323_digits_(
    row.SIRET_normalise||
    row.SIRET_brut||
    ''
  );

  if(id.length===14||id.length===9){
    return id;
  }

  var c=EUC_DEV323_companyInput_(row);

  return [
    c.nom,
    c.cp,
    c.ville
  ].filter(Boolean).join(' ').trim();
}

function EUC_DEV323_periodHints_(){
  var a=EUC_DEV322_analyze_();
  var out=[];

  (a.items||[]).forEach(function(item){
    if(item.statut!=='PERIODE_A_CONTROLER'){
      return;
    }

    var row=item.row||{};
    var year=String(item.year||'');
    var classId=Number(item.classId)||0;

    var hint={
      ligne:Number(item.ligne)||0,
      eleve:String(item.eleve||''),
      raison:String(item.detail||''),
      propositions:[]
    };

    if(!year||!classId){
      out.push(hint);
      return;
    }

    var snap;

    try{
      snap=EUC_SUIVI_V45_snapshot_(year);
    }catch(e){
      out.push(hint);
      return;
    }

    var card=(snap.cartes||[]).filter(function(c){
      return Number(c.classeId)===classId;
    })[0]||null;

    if(!card){
      out.push(hint);
      return;
    }

    var candidates=(card.periodes||[])
      .filter(function(p){
        var n=EUC_DEV323_norm_(p.libelle||'');
        return (
          Number(p.id)>0 &&
          n.indexOf('PDIF')<0 &&
          n.indexOf('DIFFERENC')<0
        );
      });

    var rawStart=EUC_DEV315_dateISO_(
      EUC_DEV323_pick_(row,[
        'Date_debut_brut',
        'Date_debut',
        'Date début',
        'Date debut'
      ])
    );

    var rawEnd=EUC_DEV315_dateISO_(
      EUC_DEV323_pick_(row,[
        'Date_fin_brut',
        'Date_fin',
        'Date fin'
      ])
    );

    /*
     * Cas typique : année 1926 au lieu de 2026.
     * On compare mois/jour avec les périodes officielles sans écrire.
     */
    if(rawStart&&rawEnd){
      candidates.forEach(function(p){
        var ps=EUC_DEV315_dateISO_(p.debut||p.Date_debut);
        var pe=EUC_DEV315_dateISO_(p.fin||p.Date_fin);

        if(!ps||!pe)return;

        var smd=rawStart.slice(5);
        var emd=rawEnd.slice(5);

        var score=0;

        if(smd===ps.slice(5))score+=3;
        if(emd===pe.slice(5))score+=3;

        if(score>=3){
          hint.propositions.push({
            periodeId:Number(p.id)||0,
            libelle:String(p.libelle||'PFMP'),
            debut:ps,
            fin:pe,
            confiance:score>=6?'FORTE':'MOYENNE'
          });
        }
      });
    }

    /*
     * Si aucune date exploitable et une seule période normale existe,
     * on peut seulement la proposer, jamais l'écrire automatiquement.
     */
    if(
      !hint.propositions.length &&
      candidates.length===1
    ){
      var only=candidates[0];

      hint.propositions.push({
        periodeId:Number(only.id)||0,
        libelle:String(only.libelle||'PFMP'),
        debut:EUC_DEV315_dateISO_(
          only.debut||only.Date_debut
        ),
        fin:EUC_DEV315_dateISO_(
          only.fin||only.Date_fin
        ),
        confiance:'FAIBLE'
      });
    }

    out.push(hint);
  });

  return out;
}

function EUC_DEV323_preparerRecuperation(){
  EUC_IMPORT_exigerAdminTexte_();

  var a=EUC_DEV322_analyze_();

  var wanted={
    SIRET_A_VERIFIER:true,
    SIREN_9_CHIFFRES:true,
    SIRET_ABSENT:true,
    SIRET_INVALIDE:true,
    ENTREPRISE_INCOMPLETE:true
  };

  var candidates=[];

  (a.items||[]).forEach(function(item){
    if(!wanted[item.statut]){
      return;
    }

    var query=EUC_DEV323_queryFor_(item);
    var company=EUC_DEV323_companyInput_(item.row||{});

    candidates.push({
      ligne:Number(item.ligne)||0,
      eleve:String(item.eleve||''),
      statut:String(item.statut||''),
      identifiant:EUC_DEV323_digits_(
        item.row&&(
          item.row.SIRET_normalise||
          item.row.SIRET_brut
        )||
        ''
      ),
      query:query,
      nom:company.nom,
      adresse:company.adresse,
      cp:company.cp,
      ville:company.ville
    });
  });

  return {
    ok:true,
    total:a.total,
    counts:a.counts,
    candidates:candidates,
    periodes:EUC_DEV323_periodHints_()
  };
}

function EUC_DEV323_establishments_(json){
  var out=[];
  var seen={};

  function add(r,e){
    r=r||{};
    e=e||{};

    var siret=EUC_DEV323_digits_(
      e.siret||
      e.numero_siret||
      ''
    );

    if(siret.length!==14||seen[siret]){
      return;
    }

    seen[siret]=true;

    var enseigne='';

    if(Array.isArray(e.liste_enseignes)){
      enseigne=String(e.liste_enseignes[0]||'');
    }else{
      enseigne=String(
        e.enseigne||
        e.nom_commercial||
        ''
      );
    }

    out.push({
      siret:siret,
      siren:EUC_DEV323_digits_(
        r.siren||
        siret.slice(0,9)
      ),
      nom:String(
        r.nom_complet||
        r.nom_raison_sociale||
        r.nom_commercial||
        ''
      ).trim(),
      enseigne:enseigne.trim(),
      adresse:String(
        e.adresse||
        e.adresse_complete||
        ''
      ).trim(),
      cp:String(
        e.code_postal||
        ''
      ).replace(/\D/g,'').slice(0,5),
      ville:String(
        e.libelle_commune||
        e.commune||
        ''
      ).trim(),
      etat:String(
        e.etat_administratif||
        ''
      ).toUpperCase(),
      nbOuverts:Number(
        r.nombre_etablissements_ouverts||
        0
      )||0
    });
  }

  ((json&&json.results)||[]).forEach(function(r){
    if(r.siege){
      add(r,r.siege);
    }

    (r.matching_etablissements||[]).forEach(function(e){
      add(r,e);
    });
  });

  return out;
}

function EUC_DEV323_tokenOverlap_(a,b){
  var aa=String(a||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(function(x){
      return x.length>=3;
    });

  var bb={};

  String(b||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(function(x){
      return x.length>=3;
    })
    .forEach(function(x){
      bb[x]=true;
    });

  var n=0;

  aa.forEach(function(x){
    if(bb[x])n++;
  });

  return n;
}

function EUC_DEV323_score_(cand,input){
  var score=0;

  var cn=EUC_DEV323_norm_(cand.nom);
  var iname=EUC_DEV323_norm_(input.nom);

  if(iname&&cn){
    if(cn===iname){
      score+=600;
    }else if(
      cn.indexOf(iname)>=0 ||
      iname.indexOf(cn)>=0
    ){
      score+=350;
    }else{
      score+=Math.min(
        180,
        45*EUC_DEV323_tokenOverlap_(
          input.nom,
          cand.nom
        )
      );
    }
  }

  if(
    input.cp &&
    cand.cp &&
    input.cp===cand.cp
  ){
    score+=260;
  }

  if(
    input.ville &&
    cand.ville &&
    EUC_DEV323_norm_(input.ville)===
      EUC_DEV323_norm_(cand.ville)
  ){
    score+=220;
  }

  score+=Math.min(
    160,
    35*EUC_DEV323_tokenOverlap_(
      input.adresse,
      cand.adresse
    )
  );

  if(cand.etat==='A'){
    score+=20;
  }

  return score;
}

function EUC_DEV323_choose_(row,json){
  var original=EUC_DEV323_digits_(
    row.SIRET_normalise||
    row.SIRET_brut||
    ''
  );

  var input=EUC_DEV323_companyInput_(row);
  var cands=EUC_DEV323_establishments_(json);

  if(!cands.length){
    return {
      ok:false,
      reason:'Aucun établissement trouvé.'
    };
  }

  /*
   * SIRET exact : aucune ambiguïté.
   */
  if(original.length===14){
    var exact=cands.filter(function(c){
      return c.siret===original;
    });

    if(exact.length===1){
      return {
        ok:true,
        candidate:exact[0],
        confidence:'EXACT_SIRET'
      };
    }
  }

  /*
   * SIREN exact : choisir l'établissement correspondant à l'adresse
   * JotForm. Si l'entreprise n'a qu'un établissement ouvert, le siège
   * peut être retenu sans autre ambiguïté.
   */
  if(original.length===9){
    var same=cands.filter(function(c){
      return c.siren===original;
    });

    if(!same.length){
      return {
        ok:false,
        reason:'SIREN non retrouvé dans la réponse API.'
      };
    }

    var scoredSame=same
      .map(function(c){
        return {
          c:c,
          score:EUC_DEV323_score_(c,input)
        };
      })
      .sort(function(a,b){
        return b.score-a.score;
      });

    if(
      scoredSame[0] &&
      scoredSame[0].score>=260 &&
      (
        scoredSame.length===1 ||
        scoredSame[0].score-
          scoredSame[1].score>=100
      )
    ){
      return {
        ok:true,
        candidate:scoredSame[0].c,
        confidence:'SIREN_PLUS_ADRESSE'
      };
    }

    var uniqueOpen=same.filter(function(c){
      return c.nbOuverts===1;
    });

    if(uniqueOpen.length===1){
      return {
        ok:true,
        candidate:uniqueOpen[0],
        confidence:'SIREN_ETABLISSEMENT_UNIQUE'
      };
    }

    return {
      ok:false,
      reason:
        'SIREN reconnu mais établissement ambigu.',
      suggestions:scoredSame.slice(0,3)
        .map(function(x){
          return x.c;
        })
    };
  }

  /*
   * SIRET absent/invalide : auto-acceptation uniquement sur un match
   * entreprise + localisation fort et nettement meilleur que le suivant.
   */
  var scored=cands
    .map(function(c){
      return {
        c:c,
        score:EUC_DEV323_score_(c,input)
      };
    })
    .sort(function(a,b){
      return b.score-a.score;
    });

  var first=scored[0]||null;
  var second=scored[1]||null;

  if(first){
    var exactName=
      input.nom &&
      EUC_DEV323_norm_(input.nom)===
        EUC_DEV323_norm_(first.c.nom);

    var locationMatch=
      (
        input.cp &&
        first.c.cp &&
        input.cp===first.c.cp
      )||
      (
        input.ville &&
        first.c.ville &&
        EUC_DEV323_norm_(input.ville)===
          EUC_DEV323_norm_(first.c.ville)
      );

    var margin=
      first.score-
      (second?second.score:0);

    if(
      (
        exactName&&locationMatch&&
        first.score>=800
      )||
      (
        first.score>=950&&
        margin>=150
      )
    ){
      return {
        ok:true,
        candidate:first.c,
        confidence:'NOM_ADRESSE_FORTE'
      };
    }
  }

  return {
    ok:false,
    reason:
      'Résultat insuffisamment sûr pour une correction automatique.',
    suggestions:scored.slice(0,3)
      .map(function(x){
        return {
          siret:x.c.siret,
          nom:x.c.nom,
          adresse:x.c.adresse,
          cp:x.c.cp,
          ville:x.c.ville,
          score:x.score
        };
      })
  };
}

function EUC_DEV323_bufferColumns_(table){
  var cols=
    EUC_ENT_grist(
      'get',
      '/tables/'+encodeURIComponent(table)+'/columns'
    ).columns||[];

  var have={};

  cols.forEach(function(c){
    have[String(c.id||'')]=true;
  });

  return have;
}

function EUC_DEV323_applyApiResult(payload){
  EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var lineId=Number(payload.ligne)||0;
  var json=payload.reponse||{};

  if(!(lineId>0)){
    throw new Error('Ligne tampon manquante.');
  }

  var table=EUC_DEV316_detectBufferTable_();
  var rows=EUC_DEV316_rawBuffer_();

  var row=rows.filter(function(r){
    return Number(r.id)===lineId;
  })[0]||null;

  if(!row){
    throw new Error(
      'Ligne tampon '+lineId+' introuvable.'
    );
  }

  var choice=EUC_DEV323_choose_(row,json);

  if(!choice.ok){
    return {
      ok:false,
      ligne:lineId,
      eleve:String(
        row.Eleve_match_libelle||
        row.Eleve_saisi||
        row.Eleve_brut||
        ''
      ),
      reason:choice.reason,
      suggestions:choice.suggestions||[]
    };
  }

  var c=choice.candidate;
  var have=EUC_DEV323_bufferColumns_(table);

  var fields={
    SIRET_normalise:c.siret,
    SIRET_statut:'VERIFIE',
    Raison_sociale_officielle:c.nom,
    Nom_commercial:c.enseigne,
    Adresse_officielle:c.adresse,
    CP_officiel:c.cp,
    Ville_officielle:c.ville
  };

  var filtered={};

  Object.keys(fields).forEach(function(k){
    if(have[k]){
      filtered[k]=fields[k];
    }
  });

  if(!Object.keys(filtered).length){
    throw new Error(
      'Aucune colonne de récupération présente dans le tampon.'
    );
  }

  EUC_ENT_grist(
    'patch',
    '/tables/'+encodeURIComponent(table)+'/records',
    {
      records:[
        {
          id:lineId,
          fields:filtered
        }
      ]
    }
  );

  return {
    ok:true,
    ligne:lineId,
    eleve:String(
      row.Eleve_match_libelle||
      row.Eleve_saisi||
      row.Eleve_brut||
      ''
    ),
    siret:c.siret,
    nom:c.nom,
    adresse:c.adresse,
    cp:c.cp,
    ville:c.ville,
    confidence:choice.confidence
  };
}
