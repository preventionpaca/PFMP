/**
 * Eucalyptus PFMP — v1.0.0-dev.275
 * Recroisement apprentissage <-> périodes PFMP.
 *
 * Règle :
 * - APPRENTI uniquement si le contrat couvre TOUTE la période sélectionnée ;
 * - contrat commençant après la PFMP => SCOLAIRE pour cette PFMP ;
 * - chevauchement partiel => MIXTE (non compté dans la bulle "Apprenti").
 *
 * Les données sont lues en direct dans EUC_APPRENTISSAGE_PFMP afin de ne pas
 * dépendre d'un snapshot de suivi devenu obsolète.
 */
var EUC_DEV275_APP_TABLE_='EUC_APPRENTISSAGE_PFMP';

function EUC_DEV275_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV275_norm_(v){
  return EUC_DEV275_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function EUC_DEV275_date_(v){
  try{
    if(typeof EUC_IMPORT_dateExistanteISO_==='function'){
      var d=EUC_IMPORT_dateExistanteISO_(v);
      if(d)return d;
    }
  }catch(e){}

  var s=EUC_DEV275_txt_(v);

  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
    return s;
  }

  return '';
}

function EUC_DEV275_ref_(v){
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

function EUC_DEV275_pick_(f,names){
  f=f||{};

  for(var i=0;i<names.length;i++){
    var k=names[i];

    if(
      f[k]!==null &&
      f[k]!==undefined &&
      EUC_DEV275_txt_(f[k])!==''
    ){
      return EUC_DEV275_txt_(f[k]);
    }
  }

  return '';
}

function EUC_DEV275_appRows_(){
  try{
    return (EUC_IMPORT_lireRecords_(EUC_DEV275_APP_TABLE_)||[])
      .filter(function(r){
        return r.Actif!==false;
      });
  }catch(e){
    return [];
  }
}

function EUC_DEV275_contract_(r){
  r=r||{};

  return {
    id:Number(r.id)||0,
    eleveId:EUC_DEV275_ref_(r.Eleve),
    debut:EUC_DEV275_date_(r.Date_debut||r.Debut),
    fin:EUC_DEV275_date_(r.Date_fin||r.Fin)||'9999-12-31',

    nomEntreprise:EUC_DEV275_pick_(r,[
      'Nom_entreprise',
      'Entreprise',
      'Raison_sociale'
    ]),

    nomCommercial:EUC_DEV275_pick_(r,[
      'Nom_commercial',
      'Entreprise'
    ]),

    siret:EUC_DEV275_pick_(r,[
      'SIRET'
    ]),

    adresse:EUC_DEV275_pick_(r,[
      'Adresse_entreprise',
      'Adresse'
    ]),

    cp:EUC_DEV275_pick_(r,[
      'Code_postal',
      'CodePostal',
      'CP'
    ]),

    ville:EUC_DEV275_pick_(r,[
      'Ville'
    ]),

    telephoneEntreprise:EUC_DEV275_pick_(r,[
      'Entreprise_telephone',
      'Telephone_entreprise'
    ]),

    courrielEntreprise:EUC_DEV275_pick_(r,[
      'Entreprise_courriel',
      'Courriel_entreprise'
    ]),

    tuteur:EUC_DEV275_pick_(r,[
      'Tuteur_nom',
      'Tuteur'
    ]),

    telephoneTuteur:EUC_DEV275_pick_(r,[
      'Tuteur_telephone',
      'Telephone_tuteur'
    ]),

    courrielTuteur:EUC_DEV275_pick_(r,[
      'Tuteur_courriel',
      'Courriel_tuteur'
    ])
  };
}

function EUC_DEV275_eval_(contracts,eleveId,debut,fin){
  debut=EUC_DEV275_date_(debut);
  fin=EUC_DEV275_date_(fin);

  if(!debut||!fin){
    return {code:'SCOLAIRE',record:null};
  }

  var rows=(contracts||[])
    .filter(function(r){
      return Number(r.eleveId)===Number(eleveId) && !!r.debut;
    })
    .sort(function(a,b){
      return String(b.debut).localeCompare(String(a.debut));
    });

  var full=rows.filter(function(r){
    return r.debut<=debut && r.fin>=fin;
  });

  if(full.length){
    return {code:'APPRENTI',record:full[0]};
  }

  var partial=rows.filter(function(r){
    return r.debut<=fin && r.fin>=debut;
  });

  if(partial.length){
    return {code:'MIXTE',record:partial[0]};
  }

  return {code:'SCOLAIRE',record:null};
}

function EUC_DEV275_detailBase_(annee,classe,periode){
  var d=null;

  try{
    if(typeof EUC_DEV190I_readOne==='function'){
      var r=EUC_DEV283_readOne({
        annee:annee,
        classe:classe,
        periode:periode
      });

      if(r&&r.ready&&r.detail){
        d=JSON.parse(JSON.stringify(r.detail));
      }
    }
  }catch(e){}

  if(!d){
    try{
      if(typeof EUC_DEV190_buildHistoricalDetail_==='function'){
        d=EUC_DEV190_buildHistoricalDetail_(
          annee,
          classe,
          periode
        );
      }
    }catch(e2){}
  }

  if(!d){
    throw new Error(
      'Détail de classe/période PFMP introuvable.'
    );
  }

  return d;
}

function EUC_DEV275_nomKey_(nom,prenom){
  return EUC_DEV275_norm_(
    [nom||'',prenom||''].join(' ')
  );
}

function EUC_DEV275_detailApprentis(payload){
  payload=payload||{};

  var annee=EUC_DEV275_txt_(payload.annee);
  var classe=Number(payload.classe)||0;
  var periode=Number(payload.periode)||0;

  if(!annee||!classe||!periode){
    throw new Error(
      'Année, classe ou période manquante.'
    );
  }

  var detail=EUC_DEV275_detailBase_(
    annee,
    classe,
    periode
  );

  var p=detail.periode||{};
  var debut=EUC_DEV275_date_(
    p.debut||
    p.Date_debut
  );
  var fin=EUC_DEV275_date_(
    p.fin||
    p.Date_fin
  );

  if(!debut||!fin){
    throw new Error(
      'Dates de la période PFMP introuvables.'
    );
  }

  var contracts=EUC_DEV275_appRows_()
    .map(EUC_DEV275_contract_);

  var apprentices=[];
  var mixtes=[];
  var byId={};
  var byName={};

  var effectif=0;
  var avecConvention=0;
  var sansConvention=0;
  var incidents=0;

  (detail.lignes||[]).forEach(function(x){
    effectif++;

    var eid=Number(x.eleveId)||0;
    var st=EUC_DEV275_eval_(
      contracts,
      eid,
      debut,
      fin
    );

    var item={
      eleveId:eid,
      nom:EUC_DEV275_txt_(x.nom),
      prenom:EUC_DEV275_txt_(x.prenom),
      code:st.code,
      record:st.record
    };

    if(st.code==='APPRENTI'){
      apprentices.push(item);
      byId[String(eid)]=item;
      byName[EUC_DEV275_nomKey_(x.nom,x.prenom)]=item;
      byName[EUC_DEV275_nomKey_(x.prenom,x.nom)]=item;
      return;
    }

    if(st.code==='MIXTE'){
      mixtes.push(item);
    }

    var sc=EUC_DEV275_norm_(
      (x.statutCode||'')+' '+(x.statut||'')
    );

    if(
      sc.indexOf('ANNULE')>=0 ||
      sc.indexOf('INTERROMP')>=0
    ){
      incidents++;
    }else if(
      sc.indexOf('SANS CONVENTION')>=0 ||
      sc.indexOf('SANS_CONVENTION')>=0
    ){
      sansConvention++;
    }else{
      avecConvention++;
    }
  });

  return {
    ok:true,
    annee:annee,
    classe:classe,
    periode:periode,
    periodeLibelle:EUC_DEV275_txt_(p.libelle),
    debut:debut,
    fin:fin,

    compteurs:{
      effectif:effectif,
      apprentis:apprentices.length,
      avecConvention:avecConvention,
      sansConvention:sansConvention,
      incidents:incidents,
      mixtes:mixtes.length
    },

    apprentis:apprentices,
    mixtes:mixtes,
    byId:byId,
    byName:byName
  };
}

function EUC_DEV275_anneeCode_(e,map){
  try{
    if(
      typeof EUC_V154_anneeCode_==='function' &&
      map
    ){
      return EUC_V154_anneeCode_(e.Annee_scolaire,map);
    }
  }catch(err){}

  return EUC_DEV275_txt_(e.Annee_code||e.Annee_scolaire);
}

function EUC_DEV275_familyApprentis(payload){
  payload=payload||{};

  var annee=EUC_DEV275_txt_(payload.annee);
  var famille=EUC_DEV275_txt_(payload.famille);

  if(!annee||!famille){
    throw new Error(
      'Année ou famille manquante.'
    );
  }

  var fast=null;

  if(typeof EUC_DEV190G1_fastFamilyIndex==='function'){
    fast=EUC_DEV190G1_fastFamilyIndex({
      annee:annee,
      famille:famille
    });
  }

  var data=
    fast&&fast.ready&&fast.payload
      ? fast.payload
      : null;

  if(!data){
    throw new Error(
      'Index famille PFMP indisponible.'
    );
  }

  var contracts=EUC_DEV275_appRows_()
    .map(EUC_DEV275_contract_);

  var mapAnnee=null;

  try{
    if(typeof EUC_V154_anneesMap_==='function'){
      mapAnnee=EUC_V154_anneesMap_();
    }
  }catch(e){}

  var students=(EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP')||[])
    .filter(function(e){
      if(
        e.Actif===false ||
        e.Present_dernier_import===false
      ){
        return false;
      }

      var a=EUC_DEV275_anneeCode_(
        e,
        mapAnnee
      );

      return !a || a===annee;
    });

  var byClass={};

  students.forEach(function(e){
    var cid=EUC_DEV275_ref_(e.Classe);

    if(!cid)return;

    (byClass[cid]=byClass[cid]||[])
      .push(e);
  });

  var classes=[];

  (data.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    var unique={};
    var periods=[];

    (c.periodes||[]).forEach(function(p){
      var debut=EUC_DEV275_date_(
        p.debut||
        p.Date_debut
      );

      var fin=EUC_DEV275_date_(
        p.fin||
        p.Date_fin
      );

      var ap=0;
      var mx=0;

      (byClass[cid]||[]).forEach(function(e){
        var st=EUC_DEV275_eval_(
          contracts,
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

      periods.push({
        id:Number(p.id)||0,
        libelle:EUC_DEV275_txt_(
          p.v50Slot||
          p.v51Slot||
          p.libelle
        ),
        debut:debut,
        fin:fin,
        apprentis:ap,
        mixtes:mx,
        scolaireTotal:Math.max(
          0,
          (Number(c.effectif)||Number(p.total)||0)-ap
        )
      });
    });

    classes.push({
      classeId:cid,
      nom:EUC_DEV275_txt_(
        c.nom||
        c.classeNom||
        c.code||
        c.Code_classe
      ),
      apprentis:Object.keys(unique).length,
      periodes:periods
    });
  });

  return {
    ok:true,
    annee:annee,
    famille:famille,
    classes:classes
  };
}
