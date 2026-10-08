/** Eucalyptus PFMP — v1.0.0-dev.138 — parcours QR + entreprise sur une page unique. */
function EUC_CONVENTION_lireAccesFraisV108_(){var raw=EUC_ENT_grist('get','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records');return (raw.records||[]).map(function(r){var o={id:r.id},f=r.fields||{};Object.keys(f).forEach(function(k){o[k]=f[k];});return o;});}
function EUC_CONVENTION_lireRecordDirectV161_(table,id){
  id=Number(id||0);
  if(!Number.isInteger(id)||id<=0)throw new Error('Identifiant Grist invalide.');

  try{
    var raw=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/records/'+encodeURIComponent(id));
    var rec=raw&&raw.record ? raw.record : raw;
    if(raw&&raw.records&&raw.records.length)rec=raw.records[0];

    if(rec){
      var out={id:Number(rec.id||id)};
      var f=rec.fields||{};
      Object.keys(f).forEach(function(k){out[k]=f[k];});
      return out;
    }
  }catch(err){
    console.log('QR_DIRECT_READ_FALLBACK '+table+'#'+id+' : '+String(err&&err.message||err));
  }

  var rows=EUC_IMPORT_lireRecords_(table);
  return rows.filter(function(r){return Number(r.id)===id;})[0]||null;
}

function EUC_CONVENTION_resoudreLienV113_(rid){
  rid=Number(rid||0);
  if(!Number.isInteger(rid)||rid<=0){
    throw new Error('[QR117-ENTREE] Identifiant d’accès invalide : '+String(rid||'')+'.');
  }

  var a;
  try{
    a=EUC_CONVENTION_lireRecordDirectV161_(EUC_CONVENTION_ACCES_TABLE_,rid);
  }catch(err){
    throw new Error('[QR117-GRIST] Lecture de l’accès impossible : '+(err&&err.message?err.message:String(err)));
  }

  if(!a)throw new Error('[QR117-ID] Accès '+rid+' introuvable.');
  if(a.Revoked===true)throw new Error('[QR117-REVOQUE] Cette convention a été révoquée.');

  return {acces:a,mode:'GRIST_ID_DIRECT',diag:'QR117-ID-DIRECT-OK rid='+rid};
}
function EUC_CONVENTION_resumeSecretV134_(){
  var p=PropertiesService.getScriptProperties(),
      k='EUC_QR_RESUME_SECRET_V134',
      s=String(p.getProperty(k)||'');
  if(!s){
    s=Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid();
    p.setProperty(k,s);
  }
  return s;
}

function EUC_CONVENTION_resumeSignatureV134_(payload){
  var bytes=Utilities.computeHmacSha256Signature(
    String(payload||''),
    EUC_CONVENTION_resumeSecretV134_(),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(bytes);
}

function EUC_CONVENTION_creerRepriseV117_(rid){
  rid=Number(rid||0);
  if(!Number.isInteger(rid)||rid<=0)
    throw new Error('Identifiant de reprise invalide.');

  var body={
    rid:rid,
    exp:Date.now()+(60*60*1000)
  };

  var payload=Utilities.base64EncodeWebSafe(
    JSON.stringify(body),
    Utilities.Charset.UTF_8
  );

  var sig=EUC_CONVENTION_resumeSignatureV134_(payload);

  return payload+'.'+sig;
}

function EUC_CONVENTION_lireRepriseV117_(token){
  token=String(token||'').trim();

  if(!token)
    throw new Error('Session de reprise absente.');

  var parts=token.split('.');

  if(parts.length!==2)
    throw new Error('Session de reprise invalide.');

  var payload=parts[0],
      sig=parts[1],
      attendu=EUC_CONVENTION_resumeSignatureV134_(payload);

  if(sig!==attendu)
    throw new Error('Session de reprise non authentifiée.');

  var raw;

  try{
    raw=Utilities.newBlob(
      Utilities.base64DecodeWebSafe(payload)
    ).getDataAsString('UTF-8');
  }catch(e){
    throw new Error('Session de reprise illisible.');
  }

  var o;

  try{
    o=JSON.parse(raw);
  }catch(e){
    throw new Error('Session de reprise invalide.');
  }

  var rid=Number(o.rid||0),
      exp=Number(o.exp||0);

  if(!rid)
    throw new Error('Session de reprise sans identifiant.');

  if(!exp || Date.now()>exp)
    throw new Error('La session de reprise a expiré. Rescannez le QR code.');

  return EUC_CONVENTION_resoudreLienV113_(rid).acces;
}
function EUC_CONVENTION_etatQRV511_(a,aujourdhui){
  a=a||{};
  var statut=String(a.Statut_administratif||a.Statut||'').toUpperCase();
  var debut=EUC_IMPORT_dateExistanteISO_(a.Date_declaree_debut||a.Date_debut);
  var fin=EUC_IMPORT_dateExistanteISO_(a.Date_declaree_fin||a.Date_fin);
  var today=String(aujourdhui||Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd'));
  if(a.Revoked===true||a.Supprimee_admin===true||statut.indexOf('INTERROMP')>=0||statut.indexOf('ANNULEE')>=0){
    return {saisieAutorisee:false,etat:'REVOQUE',debut:debut,fin:fin,message:'Cette convention n’est plus utilisable. Présentez-vous au bureau PFMP.'};
  }
  if(!debut||!fin){
    return {saisieAutorisee:false,etat:'DATES_INVALIDES',debut:debut,fin:fin,message:'Les dates de cette convention sont incomplètes. Présentez-vous au bureau PFMP.'};
  }
  if(today<debut)return {saisieAutorisee:true,etat:'OUVERT',debut:debut,fin:fin,message:''};
  if(today<=fin){
    return {saisieAutorisee:false,etat:'PERIODE_COMMENCEE',debut:debut,fin:fin,message:'La PFMP a déjà commencé. Ce QR ne permet plus une saisie normale : présentez-vous au bureau PFMP pour recevoir une nouvelle convention adaptée.'};
  }
  return {saisieAutorisee:false,etat:'EXPIRE_DEFINITIF',debut:debut,fin:fin,message:'Ce QR est définitivement expiré depuis la fin de la PFMP. Présentez-vous au bureau PFMP.'};
}
function EUC_CONVENTION_exigerQRValideV511_(a){
  var etat=EUC_CONVENTION_etatQRV511_(a);
  if(!etat.saisieAutorisee)throw new Error(etat.message);
  return etat;
}
function EUC_CONVENTION_verifierNaissanceV113_(resolved,jour,mois){
  var a=resolved.acces;
  jour=Number(jour||0);
  mois=Number(mois||0);

  if(jour<1||jour>31||mois<1||mois>12){
    throw new Error('[QR117-NAISSANCE] Jour ou mois invalide.');
  }

  var ref=Number(EUC_PFMP_ref_(a.Eleve));
  var el;

  try{
    el=EUC_CONVENTION_lireRecordDirectV161_('EUC_ELEVES_PFMP',ref);
  }catch(e){
    throw new Error('[QR117-ELEVES] Lecture élève impossible : '+(e&&e.message?e.message:String(e)));
  }

  if(!el)throw new Error('[QR117-ELEVE] Élève '+ref+' introuvable.');

  var iso=EUC_IMPORT_dateExistanteISO_(el.Date_naissance);
  var parts=String(iso||'').split('-');

  if(parts.length!==3){
    throw new Error('[QR117-DATE] Date de naissance illisible pour l’élève '+ref+'.');
  }

  if(Number(parts[2])!==jour||Number(parts[1])!==mois){
    throw new Error('[QR117-NAISSANCE] Accès trouvé, mais jour/mois ne correspondent pas à la date enregistrée.');
  }

  var etatQR=EUC_CONVENTION_etatQRV511_(a);
  var patchFields={Tentatives_echec:0,Bloque_jusqua:null,Date_derniere_utilisation:new Date().toISOString()};
  if(etatQR.saisieAutorisee)patchFields.Statut='FORMULAIRE_OUVERT';
  EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:patchFields}]});

  var resume=etatQR.saisieAutorisee?EUC_CONVENTION_creerRepriseV117_(a.id):'';
  var classe=String(a.Classe_convention_nom||'').trim();
  var periode=String(a.Periode_libelle||'').trim();
  var debutISO=EUC_IMPORT_dateExistanteISO_(a.Date_debut);
  var finISO=EUC_IMPORT_dateExistanteISO_(a.Date_fin);

  function dateFr_(iso){
    var p=String(iso||'').split('-');
    return p.length===3 ? [p[2],p[1],p[0]].join('/') : String(iso||'');
  }

  function anneeScolaire_(valeur,dateIso){
    var direct=String(valeur||'').trim();

    // Si la valeur contient déjà 2026-2027 ou 2026/2027, on la normalise.
    var m=direct.match(/(20\d{2})\D+(20\d{2})/);
    if(m)return m[1]+'-'+m[2];

    // Si une seule année est fournie.
    m=direct.match(/^(20\d{2})$/);
    if(m){
      var y0=Number(m[1]);
      return y0+'-'+(y0+1);
    }

    // Sinon on déduit l'année scolaire depuis la date de début de PFMP.
    var p=String(dateIso||'').split('-');
    if(p.length===3){
      var y=Number(p[0]), mo=Number(p[1]);
      if(y && mo){
        var debutAnnee=mo>=9 ? y : y-1;
        return debutAnnee+'-'+(debutAnnee+1);
      }
    }

    return direct;
  }

  var debutFr=dateFr_(debutISO);
  var finFr=dateFr_(finISO);
  var annee=anneeScolaire_(a.Annee_scolaire,debutISO);
  var dates=[debutFr,finFr].filter(Boolean).join(' au ');
  var pfmp=[periode,dates].filter(Boolean).join(' — ');

  return {
    ok:true,
    diagnostic:resolved.diag+' - NAISSANCE-OK',
    accessId:a.id,
    reference:a.Reference_convention||'',
    resume:resume,
    continuationUrl:'',
    saisieAutorisee:etatQR.saisieAutorisee,
    etatQR:etatQR.etat,
    messageQR:etatQR.message,

    classe:classe,
    classeConvention:classe,
    className:classe,

    annee:annee,
    anneeScolaire:annee,
    year:annee,

    periode:periode,
    periodeLibelle:periode,
    pfmp:pfmp,

    debut:debutFr,
    fin:finFr,
    debutISO:debutISO,
    finISO:finISO,
    dateDebut:debutFr,
    dateFin:finFr,
    debutFr:debutFr,
    finFr:finFr,
    dates:dates,

    eleve:{
      nom:el.Nom||'',
      prenom:el.Prenom_usage||el.Prenom||'',
      classe:classe,
      classeConvention:classe,
      annee:annee,
      anneeScolaire:annee,
      periode:periode,
      periodeLibelle:periode,
      pfmp:pfmp,
      debut:debutFr,
      fin:finFr,
      debutISO:debutISO,
      finISO:finISO,
      dateDebut:debutFr,
      dateFin:finFr,
      debutFr:debutFr,
      finFr:finFr,
      dates:dates
    }
  };
}
function EUC_CONVENTION_verifierIdentiteV113(rid,jour,mois){return EUC_CONVENTION_verifierNaissanceV113_(EUC_CONVENTION_resoudreLienV113_(rid),jour,mois);}
function EUC_CONVENTION_assurerColonnesEntrepriseV117_(){var t=EUC_CONVENTION_ACCES_TABLE_,cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/columns').columns||[],p={};cols.forEach(function(c){p[c.id]=true;});var defs=[['Entreprise_siret','SIRET entreprise','Text'],['Entreprise_nis','NIS Monaco','Text'],['Entreprise_identifiant_type','Type identifiant entreprise','Text'],['Entreprise_validation_statut','Statut validation entreprise','Text'],['Entreprise_raison_sociale','Raison sociale entreprise','Text'],['Entreprise_enseigne','Enseigne entreprise','Text'],['Entreprise_adresse','Adresse entreprise','Text'],['Entreprise_complement','Complément adresse entreprise','Text'],['Entreprise_code_postal','Code postal entreprise','Text'],['Entreprise_commune','Commune entreprise','Text'],['Entreprise_pays','Pays entreprise','Text'],['Responsable_nom','Nom responsable','Text'],['Responsable_prenom','Prénom responsable','Text'],['Responsable_fonction','Fonction responsable','Text'],['Responsable_telephone','Téléphone responsable','Text'],['Responsable_courriel','Courriel responsable','Text'],['Tuteur_est_responsable','Tuteur = responsable','Bool'],['Tuteur_nom','Nom tuteur','Text'],['Tuteur_prenom','Prénom tuteur','Text'],['Tuteur_fonction','Fonction tuteur','Text'],['Tuteur_telephone','Téléphone tuteur','Text'],['Tuteur_courriel','Courriel tuteur','Text'],['Date_saisie_entreprise','Date saisie entreprise','DateTime']];var missing=defs.filter(function(d){return !p[d[0]];}).map(function(d){return {id:d[0],fields:{label:d[1],type:d[2]}};});if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/columns',{columns:missing});}
function EUC_CONVENTION_repriseEntrepriseV117(token){
  var a=EUC_CONVENTION_lireRepriseV117_(token);
  EUC_CONVENTION_exigerQRValideV511_(a);
  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');
  var e=eleves.filter(function(x){
    return Number(x.id)===Number(EUC_PFMP_ref_(a.Eleve));
  })[0];

  if(!e)throw new Error('Élève introuvable.');

  return {
    ok:true,
    accessId:a.id,
    reference:a.Reference_convention||'',
    eleve:{
      nom:e.Nom||'',
      prenom:e.Prenom_usage||e.Prenom||'',
      classe:a.Classe_convention_nom||'',
      annee:a.Annee_scolaire||''
    },
    entreprise:{
      siret:a.Entreprise_nis||a.Entreprise_siret||'',
      raisonSociale:a.Entreprise_raison_sociale||'',
      enseigne:a.Entreprise_enseigne||'',
      adresse:a.Entreprise_adresse||'',
      complement:a.Entreprise_complement||'',
      codePostal:a.Entreprise_code_postal||'',
      commune:a.Entreprise_commune||'',
      pays:a.Entreprise_pays||'France',
      identifiantType:a.Entreprise_identifiant_type||'SIRET',
      nis:a.Entreprise_nis||''
    },
    responsable:{
      nom:a.Responsable_nom||'',
      prenom:a.Responsable_prenom||'',
      fonction:a.Responsable_fonction||'',
      telephone:a.Responsable_telephone||'',
      courriel:a.Responsable_courriel||''
    },
    tuteur:{
      estResponsable:a.Tuteur_est_responsable===true,
      nom:a.Tuteur_nom||'',
      prenom:a.Tuteur_prenom||'',
      fonction:a.Tuteur_fonction||'',
      telephone:a.Tuteur_telephone||'',
      courriel:a.Tuteur_courriel||''
    }
  };
}

function EUC_CONVENTION_enregistrerEntrepriseV117(token,d){
  var a=EUC_CONVENTION_lireRepriseV117_(token);
  EUC_CONVENTION_exigerQRValideV511_(a);
  d=d||{};

  function txt(v,n){
    return String(v==null?'':v).trim().replace(/[<>]/g,'').slice(0,n||500);
  }

  var pays=txt(d.entreprisePays,100)||'France';
  var identifiant=txt(d.entrepriseSiret,30);
  var raison=txt(d.entrepriseRaisonSociale,250);
  var adresse=txt(d.entrepriseAdresse,300);
  var commune=txt(d.entrepriseCommune,150);
  var respNom=txt(d.responsableNom,150);
  var respPrenom=txt(d.responsablePrenom,150);
  var respFonction=txt(d.responsableFonction,200);
  var respTelephone=txt(d.responsableTelephone,50);
  var respCourriel=txt(d.responsableCourriel,250);
  var tuteurEst=d.tuteurEstResponsable===true||String(d.tuteurEstResponsable)==='true';

  var estMonaco=pays.toLowerCase()==='monaco';
  var siret=estMonaco?'':identifiant;
  var nis=estMonaco?EUC_V161_normaliserNIS_(identifiant):'';if(estMonaco)d.entrepriseSiret=nis;

  if(!estMonaco&&!siret){
    throw new Error('Le SIRET est obligatoire pour une entreprise française.');
  }

  var officielFrance=null;
  var officielMonaco=null;
  if(!estMonaco){
    officielFrance=EUC_V161_verifierSiretFrance(siret);
    if(!officielFrance||!officielFrance.found) throw new Error('SIRET non retrouvé dans la base officielle. Enregistrement impossible.');
    raison=String(officielFrance.entrepriseRaisonSociale||'').trim();
    adresse=String(officielFrance.entrepriseAdresse||'').trim();
    commune=String(officielFrance.entrepriseCommune||'').trim();
    d.entrepriseComplement=officielFrance.entrepriseComplement||'';
    d.entrepriseCodePostal=officielFrance.entrepriseCodePostal||'';
    pays='France';
  }else{
    officielMonaco=EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_(nis);
    if(officielMonaco){
      raison=String(officielMonaco.nom||'').trim();
      adresse=String(officielMonaco.adresse||'').trim();
      commune=String(officielMonaco.ville||'Monaco').trim();
      d.entrepriseComplement=officielMonaco.complement||'';
      d.entrepriseCodePostal=officielMonaco.cp||'';
      if(officielMonaco.enseigne&&!String(d.entrepriseEnseigne||'').trim()) d.entrepriseEnseigne=officielMonaco.enseigne;
    }
  }
  if(estMonaco&&!nis){
    throw new Error('Le NIS est obligatoire pour une entreprise monégasque.');
  }
  if(!raison||!adresse||!commune){
    throw new Error('Raison sociale, adresse et commune sont obligatoires.');
  }

  if(!respNom||!respPrenom||!respFonction||!respTelephone||!respCourriel){
    throw new Error('Nom, prénom, fonction, téléphone et e-mail du responsable de l’entreprise sont obligatoires.');
  }

  var tNom=tuteurEst?respNom:txt(d.tuteurNom,150);
  var tPrenom=tuteurEst?respPrenom:txt(d.tuteurPrenom,150);
  var tFonction=tuteurEst?respFonction:txt(d.tuteurFonction,200);
  var tTelephone=tuteurEst?respTelephone:txt(d.tuteurTelephone,50);
  var tCourriel=tuteurEst?respCourriel:txt(d.tuteurCourriel,250);

  if(!tNom||!tPrenom||!tFonction||!tTelephone||!tCourriel){
    throw new Error('Nom, prénom, fonction, téléphone et e-mail du tuteur sont obligatoires.');
  }

  var anneeTxt=String(a.Annee_scolaire||'').trim();
  var anneeDebut=(anneeTxt.match(/20\d{2}/)||['PFMP'])[0];
  var numeroEnregistrement=String(a.Numero_enregistrement||'').trim()||
    ('PFMP-'+anneeDebut+'-'+String(Number(a.id||0)).padStart(6,'0'));

  var fields={
    Entreprise_siret:siret,
    Entreprise_nis:nis,
    Entreprise_identifiant_type:estMonaco?'NIS':'SIRET',
    Entreprise_validation_statut:estMonaco?(officielMonaco?'VALIDE':'A_VALIDER'):'VALIDE',
    Entreprise_raison_sociale:raison,
    Entreprise_enseigne:txt(d.entrepriseEnseigne,250),
    Entreprise_adresse:adresse,
    Entreprise_complement:txt(d.entrepriseComplement,250),
    Entreprise_code_postal:txt(d.entrepriseCodePostal,20),
    Entreprise_commune:commune,
    Entreprise_pays:pays,
    Responsable_nom:respNom,
    Responsable_prenom:respPrenom,
    Responsable_fonction:respFonction,
    Responsable_telephone:respTelephone,
    Responsable_courriel:respCourriel,
    Tuteur_est_responsable:tuteurEst,
    Tuteur_nom:tuteurEst?respNom:tNom,
    Tuteur_prenom:tPrenom,
    Tuteur_fonction:tFonction,
    Tuteur_telephone:tTelephone,
    Tuteur_courriel:tCourriel,
    Date_saisie_entreprise:new Date().toISOString(),
    Statut:'ENTREPRISE_SAISIE',
    Statut_administratif:'INFORMATIONS_ENREGISTREES',
    Date_derniere_utilisation:new Date().toISOString()
  };

  var refresh=EUC_CONVENTION_debutRafraichissementV511_(a,'saisie-entreprise-qr');
  EUC_ENT_grist(
    'patch',
    '/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',
    {records:[{id:a.id,fields:fields}]}
  );

  if(estMonaco&&!officielMonaco){
    try{
      EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d);
    }catch(monacoErr){
      console.log('MONACO_REF_WARNING '+String(monacoErr&&monacoErr.message||monacoErr));
    }
  }

  var notif={};
  try{
    notif=EUC_CONVENTION_apresEnregistrementV143_(a.id,numeroEnregistrement);
  }catch(err143){
    notif={
      envoye:false,
      erreur:String(err143&&err143.message?err143.message:err143)
    };
  }
  var snapshot=EUC_CONVENTION_finRafraichissementV511_(refresh);

  return {
    ok:true,
    reference:a.Reference_convention||'',
    numeroEnregistrement:numeroEnregistrement,
    message:'Informations entreprise enregistrées.',
    notification:notif,
    snapshot:snapshot
  };
}

/* Compatibilité anciens appels. */
function EUC_CONVENTION_verifierIdentiteV112(code,cle,jour,mois){var rows=EUC_CONVENTION_lireAccesFraisV108_(),m=rows.filter(function(r){return r.Revoked!==true&&String(r.Reference_convention||'').trim()===String(code||'').trim()&&String(r.Token_hash||'').trim()===String(cle||'').trim();});if(m.length!==1)throw new Error('[QR117-ANCIEN] Ancien QR non résolu. Régénérez la convention.');return EUC_CONVENTION_verifierIdentiteV113(m[0].id,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois){return EUC_CONVENTION_verifierIdentiteV112(code,EUC_CONVENTION_hash_(String(token||'')),jour,mois);}
function EUC_CONVENTION_verifierIdentiteV110(code,token,sig,jour,mois){return EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV108(aid,code,eid,token,sig,jour,mois){return aid?EUC_CONVENTION_verifierIdentiteV113(aid,jour,mois):EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV107(code,token,jour,mois){return EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV106(code,token,jour,mois){return EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
