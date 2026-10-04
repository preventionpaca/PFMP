
/**
 * Eucalyptus PFMP — v1.0.0-dev.277
 * Source de vérité commune pour le statut actuel d'apprentissage.
 */
function EUC_DEV277_txt_(v){
  return String(v==null?'':v).trim();
}
function EUC_DEV277_date_(v){
  if(v===null||v===undefined||v==='')return '';
  try{
    if(typeof EUC_IMPORT_dateExistanteISO_==='function'){
      var d=EUC_IMPORT_dateExistanteISO_(v);
      if(d)return d;
    }
  }catch(e){}
  var s=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  var m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  return m ? m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0') : '';
}
function EUC_DEV277_bool_(v){
  if(v===true||v===false)return v;
  var s=String(v==null?'':v).trim().toLowerCase();
  return s==='true'||s==='1'||s==='oui'||s==='yes'||s==='x';
}
function EUC_DEV277_cols_(){
  return EUC_DEV192_cols_('EUC_APPRENTISSAGE_PFMP')||[];
}
function EUC_DEV277_col_(cols,names){
  return EUC_DEV192_col_(cols,names);
}
function EUC_DEV277_val_(f,cols,names){
  var c=EUC_DEV277_col_(cols,names);
  return c ? EUC_DEV277_txt_(f[c]) : '';
}
function EUC_DEV277_boolCol_(f,cols,names){
  var c=EUC_DEV277_col_(cols,names);
  return c ? EUC_DEV277_bool_(f[c]) : false;
}
function EUC_DEV277_ref_(v){
  try{
    if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
  }catch(e){}
  if(Array.isArray(v))return Number(v[1]||v[0])||0;
  return Number(v)||0;
}
function EUC_DEV277_episode_(row,cols){
  row=row||{};
  var f=row.fields||row;
  var eleveCol=EUC_DEV277_col_(cols,['Eleve','Élève','Eleve_id']);
  var contrat=EUC_DEV277_date_(EUC_DEV277_val_(f,cols,['Date_contrat_officielle','Date_contrat']));
  var debut=EUC_DEV277_date_(EUC_DEV277_val_(f,cols,['Date_debut','Debut']))||contrat;
  var fin=EUC_DEV277_date_(EUC_DEV277_val_(f,cols,['Date_fin','Fin']));
  var rupture=EUC_DEV277_date_(EUC_DEV277_val_(f,cols,['Date_rupture_contrat','Date_rupture']));
  if(rupture && (!fin || rupture<fin))fin=rupture;

  return {
    row:row,
    id:Number(row.id)||0,
    fields:f,
    eleveId:eleveCol ? EUC_DEV277_ref_(f[eleveCol]) : 0,
    annee:EUC_DEV277_val_(f,cols,['Annee_scolaire','Année_scolaire','Annee']),
    contrat:contrat,
    debut:debut,
    fin:fin,
    rupture:rupture,
    actif:EUC_DEV277_boolCol_(f,cols,['Actif']),
    dossierDistribue:
      EUC_DEV277_boolCol_(f,cols,['Dossier_distribue']) ||
      !!EUC_DEV277_val_(f,cols,['Date_distribution_dossier']),
    dossierRemis:
      EUC_DEV277_boolCol_(f,cols,['Dossier_remis']) ||
      !!EUC_DEV277_val_(f,cols,['Date_remise_dossier','Date_dossier']),
    transmisCfa:
      EUC_DEV277_boolCol_(f,cols,['Dossier_transmis_CFA']) ||
      !!EUC_DEV277_val_(f,cols,['Date_transmission_CFA']),
    nouveauContrat:EUC_DEV277_boolCol_(f,cols,['Nouveau_contrat'])
  };
}
/**
 * Étapes exclusives du circuit apprentissage.
 * - « remis » : reçu par le lycée, pas encore transmis et sans événement aval ;
 * - « CFA » : remis puis transmis, en attente du contrat signé.
 * La distribution du dossier est une étape amont et ne remplace jamais la remise.
 */
function EUC_DEV437_pipeline_(ep){
  ep=ep||{};
  var contratValide=!!ep.contrat && !!ep.debut && !!ep.fin && !ep.rupture;
  var autreSituation=!!ep.rupture || !!ep.nouveauContrat;
  return {
    dossier:!!ep.dossierRemis && !ep.transmisCfa && !contratValide && !autreSituation,
    cfa:!!ep.dossierRemis && !!ep.transmisCfa && !contratValide && !autreSituation,
    contrat:contratValide,
    rupture:!!ep.rupture
  };
}
function EUC_DEV277_today_(){
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone()||'Europe/Paris',
    'yyyy-MM-dd'
  );
}
function EUC_DEV277_score_(ep,today){
  var full=!!ep.contrat && !!ep.debut && !!ep.fin;
  var current=full && !ep.rupture && ep.debut<=today && ep.fin>=today;
  var future=full && !ep.rupture && ep.debut>today;
  var score=0;
  if(current)score+=10000000;
  else if(future)score+=7000000;
  else if(full&&!ep.rupture)score+=5000000;
  else if(ep.dossierDistribue||ep.dossierRemis||ep.transmisCfa)score+=2000000;
  if(ep.actif)score+=100000;
  if(ep.contrat)score+=30000;
  if(ep.debut)score+=20000;
  if(ep.fin)score+=10000;
  score+=Math.min(ep.id,999999);
  return score;
}

/* DEV279_BULK_CONTEXT
 * Une seule lecture de EUC_APPRENTISSAGE_PFMP par exécution serveur.
 */
var EUC_DEV279_APP_CTX_MEMO_=null;

function EUC_DEV279_appCtx_(){
  if(EUC_DEV279_APP_CTX_MEMO_){
    return EUC_DEV279_APP_CTX_MEMO_;
  }

  var cols=EUC_DEV277_cols_();
  var rows=EUC_DEV192_records_('EUC_APPRENTISSAGE_PFMP')||[];
  var byEleve={};

  rows.forEach(function(r){
    var ep=EUC_DEV277_episode_(r,cols);
    var eid=Number(ep.eleveId)||0;
    if(!eid)return;
    (byEleve[eid]=byEleve[eid]||[]).push(ep);
  });

  EUC_DEV279_APP_CTX_MEMO_={
    cols:cols,
    rows:rows,
    byEleve:byEleve,
    today:EUC_DEV277_today_()
  };

  return EUC_DEV279_APP_CTX_MEMO_;
}

function EUC_DEV277_bestCurrent_(eleveId,annee){
  var ctx=EUC_DEV279_appCtx_();

  var eps=(ctx.byEleve[Number(eleveId)]||[])
    .filter(function(ep){
      if(annee && ep.annee && ep.annee!==annee){
        return false;
      }
      return true;
    })
    .slice()
    .sort(function(a,b){
      return (
        EUC_DEV277_score_(b,ctx.today)-
        EUC_DEV277_score_(a,ctx.today)
      );
    });

  return eps.length ? eps[0] : null;
}
function EUC_DEV277_status_(ep){
  if(!ep)return {code:'SCOLAIRE',apprenti:false,futur:false};

  var today=EUC_DEV277_today_();
  var full=!!ep.contrat && !!ep.debut && !!ep.fin;

  if(ep.rupture && ep.rupture<=today){
    return {code:'SCOLAIRE_RUPTURE',apprenti:false,futur:false};
  }
  if(full && ep.debut<=today && ep.fin>=today){
    return {code:'APPRENTI',apprenti:true,futur:false};
  }
  if(full && ep.debut>today){
    return {code:'FUTUR_APPRENTI',apprenti:false,futur:true};
  }
  if(ep.dossierDistribue||ep.dossierRemis||ep.transmisCfa||ep.contrat||ep.debut){
    return {code:'FUTUR_APPRENTI',apprenti:false,futur:true};
  }
  return {code:'SCOLAIRE',apprenti:false,futur:false};
}
function EUC_DEV277_overlay_(s,annee){
  s=s||{};
  var ep=EUC_DEV277_bestCurrent_(Number(s.id)||0,annee);
  if(!ep)return s;

  var cols=EUC_DEV277_cols_();
  var f=ep.fields||{};
  var st=EUC_DEV277_status_(ep);

  function v(names){return EUC_DEV277_val_(f,cols,names);}
  function b(names){return EUC_DEV277_boolCol_(f,cols,names);}

  s.apprenti=st.apprenti;
  s.statutAutomatique=st.code;
  s.debut=ep.debut||'';
  s.fin=ep.fin||'';
  s.dateContrat=ep.contrat||'';
  s.dateRupture=ep.rupture||'';

  s.siret=v(['SIRET'])||s.siret||'';
  s.nomEntreprise=v(['Nom_entreprise','Raison_sociale','Entreprise'])||s.nomEntreprise||'';
  s.entreprise=v(['Entreprise','Nom_commercial','Nom_entreprise'])||s.entreprise||'';
  s.nomCommercial=v(['Nom_commercial'])||s.nomCommercial||'';
  s.adresse=v(['Adresse_entreprise','Adresse'])||s.adresse||'';
  s.cp=v(['Code_postal','CodePostal','CP'])||s.cp||'';
  s.ville=v(['Ville'])||s.ville||'';
  s.telEntreprise=v(['Entreprise_telephone','Telephone_entreprise'])||s.telEntreprise||'';
  s.mailEntreprise=v(['Entreprise_courriel','Courriel_entreprise'])||s.mailEntreprise||'';
  s.tuteur=v(['Tuteur_nom','Tuteur'])||s.tuteur||'';
  s.telTuteur=v(['Tuteur_telephone','Telephone_tuteur'])||s.telTuteur||'';
  s.mailTuteur=v(['Tuteur_courriel','Courriel_tuteur'])||s.mailTuteur||'';

  s.dossierDistribue=b(['Dossier_distribue']);
  s.dateDistribution=v(['Date_distribution_dossier']);
  s.dossierRemis=b(['Dossier_remis'])||!!v(['Date_remise_dossier','Date_dossier']);
  s.dateDossier=v(['Date_remise_dossier','Date_dossier']);
  s.transmisCfa=b(['Dossier_transmis_CFA'])||!!v(['Date_transmission_CFA']);
  s.dateCfa=v(['Date_transmission_CFA']);
  s.nouveauContrat=b(['Nouveau_contrat']);

  return s;
}
function EUC_DEV277_loadStudentsJson(annee,classeId,classeNom){
  var raw=EUC_DEV235_loadStudentsJson(annee,classeId,classeNom);
  var obj=(typeof raw==='string')?JSON.parse(raw):(raw||{});

  obj.students=(obj.students||[]).map(function(s){
    return EUC_DEV277_overlay_(s,annee);
  });
  obj.source='DEV277/'+(obj.source||'base');

  return JSON.stringify(obj);
}

/**
 * Empêche une autosauvegarde de champs "dossier" d'effacer les dates
 * d'un contrat déjà enregistré.
 */
function EUC_DEV277_saveApprenti(p){
  p=p||{};
  var ep=EUC_DEV277_bestCurrent_(Number(p.eleveId)||0,EUC_DEV277_txt_(p.annee));

  if(ep && !p.nouveauContrat){
    if(!EUC_DEV277_txt_(p.dateContrat) && ep.contrat)p.dateContrat=ep.contrat;
    if(!EUC_DEV277_txt_(p.debut) && ep.debut)p.debut=ep.debut;
    if(!EUC_DEV277_txt_(p.fin) && ep.fin && ep.fin!=='9999-12-31')p.fin=ep.fin;
    if(!EUC_DEV277_txt_(p.dateRupture) && ep.rupture)p.dateRupture=ep.rupture;
  }

  if(typeof EUC_DEV225_saveApprenti==='function'){
    return EUC_DEV225_saveApprenti(p);
  }
  if(typeof EUC_DEV192_saveApprenti==='function'){
    return EUC_DEV192_saveApprenti(p);
  }
  throw new Error('Moteur de sauvegarde apprentissage introuvable.');
}

/**
 * Dashboard apprentis : même règle de sélection d'épisode que le formulaire.
 */
function EUC_DEV277_dashboardDetails(annee){
  annee=EUC_DEV277_txt_(annee);

  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP')||[];
  var classes=EUC_IMPORT_lireRecords_('Classes')||[];
  var classById={};

  classes.forEach(function(c){
    classById[Number(c.id)||0]=c;
  });

  var lists={
    total:[],
    future:[],
    dossier:[],
    cfa:[],
    contrats:[],
    ruptures:[],
    classeEntiere:[],
    mixite:[]
  };

  var allByClass={};
  var appByClass={};

  eleves
    .filter(function(e){
      return e.Actif!==false && e.Present_dernier_import!==false;
    })
    .forEach(function(e){
      var eid=Number(e.id)||0;
      if(!eid)return;

      var cid=EUC_DEV277_ref_(e.Classe);
      var c=classById[cid]||{};
      var classe=
        EUC_DEV277_txt_(e.Code_classe_importe) ||
        EUC_DEV277_txt_(c.Nom) ||
        EUC_DEV277_txt_(c.Code) ||
        ('Classe '+cid);

      var source=EUC_DEV277_txt_(e.Source_Pronote).toUpperCase();
      var etab=source==='LGT'?'LGT':'LP';

      var item={
        id:eid,
        nom:[
          EUC_DEV277_txt_(e.Nom),
          EUC_DEV277_txt_(e.Prenom_usage||e.Prenom)
        ].filter(Boolean).join(' '),
        classe:classe,
        etab:etab
      };

      allByClass[classe]=(allByClass[classe]||0)+1;

      var ep=EUC_DEV277_bestCurrent_(eid,annee);
      if(!ep)return;

      var st=EUC_DEV277_status_(ep);
      var pipeline=EUC_DEV437_pipeline_(ep);

      if(st.apprenti){
        lists.total.push(item);
        appByClass[classe]=(appByClass[classe]||0)+1;
      }
      if(st.futur)lists.future.push(item);
      if(pipeline.dossier)lists.dossier.push(item);
      if(pipeline.cfa)lists.cfa.push(item);
      if(pipeline.contrat)lists.contrats.push(item);
      if(pipeline.rupture)lists.ruptures.push(item);
    });

  lists.total.forEach(function(item){
    var total=allByClass[item.classe]||0;
    var apps=appByClass[item.classe]||0;
    if(total>0 && apps>=total)lists.classeEntiere.push(item);
    else lists.mixite.push(item);
  });

  return {ok:true,source:'DEV277',lists:lists};
}



function EUC_DEV279_dashboardDetailsCached(annee){
  annee=EUC_DEV277_txt_(annee);

  var key='EUC_DEV279_DASH_'+annee;

  try{
    var cache=CacheService.getScriptCache();
    var raw=cache.get(key);

    if(raw){
      return JSON.parse(raw);
    }

    var r=EUC_DEV277_dashboardDetails(annee);

    cache.put(
      key,
      JSON.stringify(r),
      20
    );

    return r;
  }catch(e){
    return EUC_DEV277_dashboardDetails(annee);
  }
}
