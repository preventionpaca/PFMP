/** Eucalyptus PFMP — v1.0.0-dev.156
 * Affectations téléphone / visite + correction contexte année scolaire.
 */
var EUC_V156_TABLE_='EUC_AFFECTATIONS_SUIVI_PFMP';

function EUC_V156_txt_(v){return String(v==null?'':v).trim();}

function EUC_PFMP_definirAnneeActiveLectureV156(code){
  code=EUC_V156_txt_(code);
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  if(!ctx.annees.some(function(a){return a.code===code;}))throw new Error('Année scolaire inconnue : '+code);
  try{PropertiesService.getUserProperties().setProperty('EUC_PFMP_ANNEE_ACTIVE_V148',code);}catch(e){}
  ctx.active=code;
  return ctx;
}

function EUC_V156_admin_(){
  try{var c=EUC_PFMP_contexteAdmin_();return c&&c.autorise?c:null;}catch(e){return null;}
}

function EUC_V156_col_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}

function EUC_V156_assurerTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tables.some(function(t){return t.id===EUC_V156_TABLE_;});
  var c=EUC_V156_col_;
  var cols=[
    c('Annee_scolaire','Année scolaire'),c('Classe','Classe','Ref:Classes'),c('Periode','Période','Ref:Planning_Periodes'),
    c('Eleve','Élève','Ref:EUC_ELEVES_PFMP'),c('Type_suivi','Type suivi'),c('Professeur','Professeur','Ref:EUC_PROFESSEURS_PFMP'),
    c('Nom_professeur_snapshot','Nom professeur'),c('Email_professeur_snapshot','Email professeur'),
    c('Date_affectation','Date affectation','DateTime'),c('Affecte_par','Affecté par'),c('Actif','Actif','Bool'),c('Date_modification','Date modification','DateTime')
  ];
  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V156_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V156_TABLE_+'/columns').columns||[],have={};
    current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_V156_TABLE_+'/columns',{columns:missing});
  }
  return true;
}

function INSTALLER_DEV156_AFFECTATIONS(){
  var ctx=EUC_V156_admin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V156_assurerTable_();
  return {ok:true,table:EUC_V156_TABLE_};
}

function EUC_V156_professeurs_(){
  return EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP').filter(function(p){return p.Actif!==false;}).map(function(p){
    return {id:Number(p.id),nom:[p.Civilite,p.Prenom,p.Nom].filter(Boolean).join(' '),email:EUC_V156_txt_(p.Email),discipline:EUC_V156_txt_(p.Discipline)};
  }).filter(function(p){return p.id&&p.nom;}).sort(function(a,b){return a.nom.localeCompare(b.nom,'fr');});
}

function EUC_V156_affectations_(annee,classeId,periodeId){
  try{EUC_V156_assurerTable_();}catch(e){return [];}
  return EUC_IMPORT_lireRecords_(EUC_V156_TABLE_).filter(function(r){
    return r.Actif!==false && EUC_V156_txt_(r.Annee_scolaire)===EUC_V156_txt_(annee) &&
      Number(EUC_PFMP_ref_(r.Classe))===Number(classeId) && Number(EUC_PFMP_ref_(r.Periode))===Number(periodeId);
  });
}

function EUC_SUIVI_CLASSE_detailV161(codeAnnee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV155(codeAnnee,classeId,periodeId);
  var profs=EUC_V156_professeurs_();
  var affect=EUC_V156_affectations_(d.annee,d.classe.id,d.periode?d.periode.id:0),by={};
  affect.forEach(function(a){var eid=Number(EUC_PFMP_ref_(a.Eleve)),type=EUC_V156_txt_(a.Type_suivi).toUpperCase();if(eid&&type)by[eid+'|'+type]=a;});
  d.lignes=(d.lignes||[]).map(function(x){
    var tel=by[x.eleveId+'|TELEPHONE'],vis=by[x.eleveId+'|VISITE'];
    x.professeurTelephone=tel?EUC_V156_txt_(tel.Nom_professeur_snapshot):'';
    x.professeurVisiteur=vis?EUC_V156_txt_(vis.Nom_professeur_snapshot):'';
    x.affectationTelephoneId=tel?Number(tel.id)||0:0;
    x.affectationVisiteId=vis?Number(vis.id)||0:0;
    return x;
  });
  d.professeursDisponibles=profs;
  d.peutModifier=!!EUC_V156_admin_();
  return d;
}

function EUC_SUIVI_AFFECTER_V156(payload){
  var ctx=EUC_V156_admin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  payload=payload||{};
  var annee=EUC_V156_txt_(payload.annee),classeId=Number(payload.classeId),periodeId=Number(payload.periodeId),type=EUC_V156_txt_(payload.type).toUpperCase(),profId=Number(payload.profId);
  var eleveIds=(payload.eleveIds||[]).map(Number).filter(function(x){return x>0;});
  if(!annee||!(classeId>0)||!(periodeId>0)||['TELEPHONE','VISITE'].indexOf(type)<0||!(profId>0)||!eleveIds.length)throw new Error('Affectation incomplète.');
  EUC_V156_assurerTable_();
  var prof=EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP').filter(function(p){return Number(p.id)===profId&&p.Actif!==false;})[0];
  if(!prof)throw new Error('Professeur introuvable.');
  var token=EUC_DEV425_beginMutation_({annee:annee,classeId:classeId,periodeId:periodeId,reason:'affectation-professeur'});
  var profNom=[prof.Civilite,prof.Prenom,prof.Nom].filter(Boolean).join(' '),profMail=EUC_V156_txt_(prof.Email),now=new Date().toISOString();
  var existing=EUC_IMPORT_lireRecords_(EUC_V156_TABLE_);
  eleveIds.forEach(function(eid){
    var ex=existing.filter(function(r){return r.Actif!==false&&EUC_V156_txt_(r.Annee_scolaire)===annee&&Number(EUC_PFMP_ref_(r.Classe))===classeId&&Number(EUC_PFMP_ref_(r.Periode))===periodeId&&Number(EUC_PFMP_ref_(r.Eleve))===eid&&EUC_V156_txt_(r.Type_suivi).toUpperCase()===type;})[0];
    var fields={Annee_scolaire:annee,Classe:classeId,Periode:periodeId,Eleve:eid,Type_suivi:type,Professeur:profId,Nom_professeur_snapshot:profNom,Email_professeur_snapshot:profMail,Date_affectation:now,Affecte_par:ctx.email||'',Actif:true,Date_modification:now};
    if(ex)EUC_ENT_grist('patch','/tables/'+EUC_V156_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});
    else EUC_ENT_grist('post','/tables/'+EUC_V156_TABLE_+'/records',{records:[{fields:fields}]});
  });
  return EUC_DEV425_finishResult_(token,EUC_SUIVI_CLASSE_detailV156(annee,classeId,periodeId));
}

function EUC_SUIVI_CLASSE_afficherV156(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0,periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V156_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  if(classeId<=0)throw new Error('Classe manquante.');
  var detail=EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId);

  // DEV.161 FIX16A
  // Garantir les IDs techniques d'affectation DANS LE DETAIL FINAL envoyé au navigateur.
  // On le fait ici, après detailV162(), pour éviter qu'un wrapper ultérieur ne perde
  // affectationTelephoneId / affectationVisiteId.
  try{
    var pidFinal=Number(detail&&detail.periode&&detail.periode.id)||Number(periodeId)||0;
    if(pidFinal>0 && detail && Array.isArray(detail.lignes)){
      var affFinal=EUC_V156_affectations_(annee,classeId,pidFinal);
      var byFinal={};

      affFinal.forEach(function(a){
        var eid=Number(EUC_PFMP_ref_(a.Eleve));
        var typ=EUC_V156_txt_(a.Type_suivi).toUpperCase();
        if(eid && typ){
          byFinal[eid+'|'+typ]=Number(a.id)||0;
        }
      });

      detail.lignes.forEach(function(x){
        var eid=Number(x.eleveId)||0;
        x.affectationTelephoneId=byFinal[eid+'|TELEPHONE']||0;
        x.affectationVisiteId=byFinal[eid+'|VISITE']||0;
      });
    }
  }catch(e){
    console.log('FIX16A IDs affectation : '+String(e&&e.message||e));
  }

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);
  return tpl.evaluate().setTitle('Suivi PFMP — '+detail.classe.nom).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * V4.5 — enrichissement final de l'écran détail classe.
 * Corrige le statut métier final, les compteurs et ajoute le tuteur.
 */
function EUC_SUIVI_V45_statutDetail_(a){
  if(!a){
    return {
      code:'SANS_CONVENTION',
      libelle:'Sans convention',
      active:false,
      incident:false
    };
  }

  var s=String(
    a.Statut_administratif ||
    a.Statut ||
    ''
  ).toUpperCase();

  if(a.Revoked===true || a.Supprimee_admin===true || s.indexOf('SUPPRIM')>=0){
    return {
      code:'SUPPRIMEE',
      libelle:'Sans convention',
      active:false,
      incident:false
    };
  }

  if(s.indexOf('ANNULEE')>=0){
    return {
      code:'ANNULEE',
      libelle:'Annulée',
      active:false,
      incident:true
    };
  }

  if(s.indexOf('INTERROMP')>=0){
    return {
      code:'INTERROMPUE',
      libelle:'Interrompue',
      active:false,
      incident:true
    };
  }

  var legacy=EUC_V155_statutLibelle_(a);

  return {
    code:legacy.code,
    libelle:legacy.libelle,
    active:true,
    incident:false
  };
}

function EUC_SUIVI_V45_tuteur_(a){
  if(!a)return '';

  var nom=[
    String(a.Tuteur_prenom||'').trim(),
    String(a.Tuteur_nom||'').trim()
  ].filter(Boolean).join(' ');

  // Dans certaines écritures, Tuteur_nom contient déjà le nom complet.
  if(!nom){
    nom=String(a.Tuteur_nom||'').trim();
  }

  var tel=String(a.Tuteur_telephone||'').trim();
  var mail=String(a.Tuteur_courriel||'').trim();

  return [nom,tel,mail].filter(Boolean).join(' · ');
}

function EUC_SUIVI_V45_enrichirDetail_(detail,annee,classeId,periodeId){
  if(!detail||!Array.isArray(detail.lignes))return detail;

  var dossiers=EUC_CONVENTION_lireAccesFraisV108_().filter(function(a){
    if(Number(EUC_PFMP_ref_(a.Classe_convention))!==Number(classeId))return false;
    if(Number(EUC_PFMP_ref_(a.Periode))!==Number(periodeId))return false;

    var an=String(a.Annee_scolaire||'').trim();
    return !annee||!an||an===annee;
  });

  var byEleve={};

  dossiers.forEach(function(a){
    var eid=Number(EUC_PFMP_ref_(a.Eleve))||0;
    if(!eid)return;

    if(!byEleve[eid])byEleve[eid]=[];
    byEleve[eid].push(a);
  });

  var avec=0, incidents=0;

  detail.lignes.forEach(function(x){
    var list=(byEleve[Number(x.eleveId)]||[])
      .slice()
      .sort(function(a,b){
        return Number(b.id||0)-Number(a.id||0);
      });

    // Priorité au dossier actif le plus récent.
    var actif=list.filter(function(a){
      return EUC_SUIVI_V45_statutDetail_(a).active;
    })[0]||null;

    var dernier=actif||list[0]||null;
    var st=EUC_SUIVI_V45_statutDetail_(dernier);

    x.conventionId=actif?Number(actif.id)||0:0;
    x.numero=actif?EUC_ADMIN_WORKFLOW_numeroV144_(actif):'';
    x.statutCode=st.code;
    x.statut=st.libelle;

    if(actif){
      x.entreprise=String(actif.Entreprise_raison_sociale||'').trim();
      x.adresseEntreprise=EUC_V155_adresseEntreprise_(actif);
      x.contactEntreprise=EUC_V155_contactEntreprise_(actif);
      x.tuteurEntreprise=EUC_SUIVI_V45_tuteur_(actif);
      avec++;
    }else{
      // On conserve l'information de l'incident, mais jamais comme convention active.
      if(st.incident){
        incidents++;
        x.entreprise=dernier?String(dernier.Entreprise_raison_sociale||'').trim():'';
        x.adresseEntreprise=EUC_V155_adresseEntreprise_(dernier);
        x.contactEntreprise=EUC_V155_contactEntreprise_(dernier);
        x.tuteurEntreprise=EUC_SUIVI_V45_tuteur_(dernier);
      }else{
        x.entreprise='';
        x.adresseEntreprise='';
        x.contactEntreprise='';
        x.tuteurEntreprise='';
      }
    }
  });

  detail.stats=detail.stats||{};
  detail.stats.total=detail.lignes.length;
  detail.stats.avecConvention=avec;
  detail.stats.sansConvention=Math.max(0,detail.lignes.length-avec);
  detail.stats.annulees=detail.lignes.filter(function(x){
    return x.statutCode==='ANNULEE';
  }).length;
  detail.stats.interrompues=detail.lignes.filter(function(x){
    return x.statutCode==='INTERROMPUE';
  }).length;

  // Numérotation chronologique des périodes de la classe.
  var ps=(detail.periodes||[]).slice().sort(function(a,b){
    return String(a.debut||'').localeCompare(String(b.debut||''));
  });

  ps.forEach(function(p,i){
    p.originalLibelle=p.libelle;
    p.numero=i+1;
    p.libelle='PFMP n°'+(i+1);
  });

  detail.periodes=ps;

  if(detail.periode){
    var found=ps.filter(function(p){
      return Number(p.id)===Number(detail.periode.id);
    })[0];

    if(found){
      detail.periode.originalLibelle=detail.periode.libelle;
      detail.periode.libelle=found.libelle;
      detail.periode.numero=found.numero;
    }
  }

  return detail;
}
