/** Eucalyptus PFMP — v1.0.0-dev.142-fix3 — notification basée sur la source DEV.141 validée. */

var EUC_CONVENTION_NOTIFICATION_VERSION_V142_='v1.0.0-dev.142';

/**
 * Adresse par défaut.
 * Pour changer facilement le destinataire BFE sans toucher au code,
 * utiliser la propriété de script EUC_PFMP_NOTIFICATION_BFE_EMAIL
 * ou exécuter EUC_CONVENTION_configurerEmailBFEV142("adresse@domaine.fr").
 */
var EUC_PFMP_NOTIFICATION_BFE_EMAIL_DEFAULT_V142_='bfe@lycee-les-eucalyptus.org';
var EUC_PFMP_NOTIFICATION_BFE_PROPERTY_V142_='EUC_PFMP_NOTIFICATION_BFE_EMAIL';

function EUC_CONVENTION_emailValideV142_(v){
  var x=String(v||'').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)?x:'';
}

function EUC_CONVENTION_emailBFEV142_(){
  var props=PropertiesService.getScriptProperties();
  var configured=EUC_CONVENTION_emailValideV142_(
    props.getProperty(EUC_PFMP_NOTIFICATION_BFE_PROPERTY_V142_)
  );
  return configured||EUC_PFMP_NOTIFICATION_BFE_EMAIL_DEFAULT_V142_;
}

/**
 * Configuration simple du destinataire BFE.
 * Cette fonction n'envoie aucun mail.
 */
function EUC_CONVENTION_configurerEmailBFEV142(email){
  var x=EUC_CONVENTION_emailValideV142_(email);
  if(!x)throw new Error('Adresse électronique BFE invalide.');
  PropertiesService.getScriptProperties().setProperty(
    EUC_PFMP_NOTIFICATION_BFE_PROPERTY_V142_,
    x
  );
  return {ok:true,email:x,propriete:EUC_PFMP_NOTIFICATION_BFE_PROPERTY_V142_};
}

function EUC_CONVENTION_lireConfigNotificationV142(){
  return {
    version:EUC_CONVENTION_NOTIFICATION_VERSION_V142_,
    emailBFE:EUC_CONVENTION_emailBFEV142_(),
    propriete:EUC_PFMP_NOTIFICATION_BFE_PROPERTY_V142_,
    valeurParDefaut:EUC_PFMP_NOTIFICATION_BFE_EMAIL_DEFAULT_V142_
  };
}

function EUC_CONVENTION_uniquesV142_(values){
  var seen={},out=[];
  (values||[]).forEach(function(v){
    var x=EUC_CONVENTION_emailValideV142_(v);
    if(x&&!seen[x]){seen[x]=true;out.push(x);}
  });
  return out;
}

/**
 * Règle de routage :
 * - si l'élève a un mail : élève en destinataire principal ;
 * - sinon : responsable(s) légal(aux) en destinataire(s) principal(aux) ;
 * - les responsables légaux sont toujours informés s'ils ont un mail ;
 * - PP et adresse BFE paramétrable sont en copie ;
 * - dédoublonnage systématique.
 */
function EUC_CONVENTION_destinatairesV142_(dossier){
  dossier=dossier||{};
  var eleve=EUC_CONVENTION_uniquesV142_(
    dossier.destinataires&&dossier.destinataires.eleve||[]
  );
  var parents=EUC_CONVENTION_uniquesV142_(
    dossier.destinataires&&dossier.destinataires.responsables||[]
  );
  var pp=EUC_CONVENTION_uniquesV142_(
    dossier.destinataires&&dossier.destinataires.professeursPrincipaux||[]
  );
  var bfe=EUC_CONVENTION_uniquesV142_([EUC_CONVENTION_emailBFEV142_()]);

  var to=eleve.length?eleve.slice():parents.slice();
  var cc=[];

  if(eleve.length){
    cc=cc.concat(parents);
  }
  cc=cc.concat(pp).concat(bfe);

  to=EUC_CONVENTION_uniquesV142_(to);
  cc=EUC_CONVENTION_uniquesV142_(cc).filter(function(x){
    return to.indexOf(x)<0;
  });

  // Garde-fou : si ni élève ni parent n'a d'adresse,
  // l'information reste envoyable au PP/BFE après validation explicite.
  if(!to.length){
    to=EUC_CONVENTION_uniquesV142_(pp.concat(bfe));
    cc=[];
  }

  return {
    eleve:eleve,
    parents:parents,
    pp:pp,
    bfe:bfe,
    to:to,
    cc:cc,
    eleveSansEmail:eleve.length===0,
    aucunContactFamille:eleve.length===0&&parents.length===0
  };
}

function EUC_CONVENTION_texteConfirmationV142_(d){
  var numero=d.numeroEnregistrement||'';
  var prenom=d.eleve&&d.eleve.prenom||'';
  var nom=d.eleve&&d.eleve.nom||'';
  var entreprise=d.entreprise&&d.entreprise.raisonSociale||'';
  var dates='';
  if(d.periode&&d.periode.debut&&d.periode.fin){
    dates=d.periode.debut+' au '+d.periode.fin;
  }

  var objet='[PFMP] Enregistrement '+numero+' — '+prenom+' '+nom;

  var texte=[
    'Bonjour,',
    '',
    'La demande de convention de PFMP de '+prenom+' '+nom+
      (entreprise?' auprès de '+entreprise:'')+
      ' a bien été enregistrée sous le numéro '+numero+'.',
    '',
    dates?'Période prévue : '+dates+'.':'',
    '',
    'L’original papier de la convention doit maintenant être déposé au Bureau des formations et des entreprises afin d’être présenté à la signature de Monsieur le Proviseur.',
    '',
    'Important : cet enregistrement ne vaut pas validation définitive de la PFMP. La convention signée constitue le document officiel.',
    '',
    'Une fois signée par Monsieur le Proviseur et par les parties concernées, la convention devra être remise à l’entreprise. La PFMP ne pourra débuter qu’après finalisation de la convention.',
    '',
    'Ce message confirme uniquement l’enregistrement administratif des informations transmises.',
    '',
    'Cordialement,',
    'Bureau des formations et des entreprises',
    'Lycée Les Eucalyptus'
  ].filter(function(x,i,a){
    return !(x==='' && i>0 && a[i-1]==='');
  }).join('\n');

  return {objet:objet,texte:texte};
}


function EUC_CONVENTION_preparerDossierAdminV142_(acces){
  if(!acces)throw new Error('Accès convention absent.');

  function txt(v,n){
    return String(v==null?'':v).trim().slice(0,n||500);
  }

  function email(v){
    var x=txt(v,250).toLowerCase();
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(x)?x:'';
  }

  function uniques(values){
    var seen={},out=[];
    (values||[]).forEach(function(v){
      var x=email(v);
      if(x&&!seen[x]){seen[x]=true;out.push(x);}
    });
    return out;
  }

  var eleveId=Number(EUC_PFMP_ref_(acces.Eleve));
  var classeId=Number(EUC_PFMP_ref_(acces.Classe_convention));
  var periodeId=Number(EUC_PFMP_ref_(acces.Periode));

  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');
  var eleve=eleves.filter(function(e){
    return Number(e.id)===eleveId;
  })[0];

  if(!eleve)throw new Error('Élève '+eleveId+' introuvable.');

  var numero=txt(acces.Numero_enregistrement,100);
  if(!numero){
    var annee=txt(acces.Annee_scolaire,50);
    var debut=(annee.match(/20\\d{2}/)||['PFMP'])[0];
    numero='PFMP-'+debut+'-'+String(Number(acces.id||0)).padStart(6,'0');
  }

  var responsables=[];
  try{
    responsables=EUC_IMPORT_lireRecords_('EUC_RESPONSABLES_ELEVES_PFMP')
      .filter(function(r){
        return Number(EUC_PFMP_ref_(r.Eleve))===eleveId;
      })
      .map(function(r){
        return {
          id:r.id,
          rang:txt(r.Rang_responsable,30),
          nom:[r.Prenom,r.Nom].filter(Boolean).join(' '),
          lien:txt(r.Lien_avec_eleve,100),
          responsableLegal:r.Responsable_legal===true,
          responsableEnCharge:r.Responsable_en_charge===true,
          email:email(r.Email)
        };
      })
      .filter(function(r){return !!r.email;});
  }catch(e){}

  var pp=[];
  try{
    var links=EUC_IMPORT_lireRecords_('EUC_CLASSES_PROFESSEURS_PFMP');
    var profs=EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP');
    var byId={};
    profs.forEach(function(p){byId[Number(p.id)]=p;});

    pp=links
      .filter(function(l){
        return l.Actif!==false &&
          String(l.Role||'')==='PROFESSEUR_PRINCIPAL' &&
          Number(EUC_PFMP_ref_(l.Classe))===classeId;
      })
      .map(function(l){
        var prof=byId[Number(EUC_PFMP_ref_(l.Professeur))];
        if(!prof)return null;
        return {
          id:prof.id,
          nom:[prof.Civilite,prof.Prenom,prof.Nom].filter(Boolean).join(' '),
          email:email(prof.Email)
        };
      })
      .filter(function(x){return x&&x.email;});
  }catch(e){}

  var emailEleve=email(eleve.Email_eleve||eleve.Courriel||eleve.Email);

  var destinataires={
    eleve:emailEleve?[emailEleve]:[],
    responsables:uniques(responsables.map(function(x){return x.email;})),
    professeursPrincipaux:uniques(pp.map(function(x){return x.email;}))
  };

  return {
    version:'v1.0.0-dev.142-fix',
    lectureSeule:true,
    aucuneEcriture:true,
    aucunCourriel:true,
    accesId:Number(acces.id),
    numeroEnregistrement:numero,
    eleve:{
      id:eleveId,
      nom:txt(eleve.Nom,150),
      prenom:txt(eleve.Prenom_usage||eleve.Prenom,150),
      email:emailEleve
    },
    classe:{
      id:classeId,
      nom:txt(acces.Classe_convention_nom,150)
    },
    periode:{
      id:periodeId,
      libelle:txt(acces.Periode_libelle,250),
      debut:EUC_IMPORT_dateExistanteISO_(acces.Date_debut),
      fin:EUC_IMPORT_dateExistanteISO_(acces.Date_fin)
    },
    entreprise:{
      siret:txt(acces.Entreprise_siret,30),
      raisonSociale:txt(acces.Entreprise_raison_sociale,250),
      commune:txt(acces.Entreprise_commune,150)
    },
    responsablesLegaux:responsables,
    professeursPrincipaux:pp,
    destinataires:destinataires
  };
}

function EUC_CONVENTION_preparerNotificationV142_(accesId){
  var rows=EUC_CONVENTION_lireAccesFraisV108_();
  var acces=rows.filter(function(r){return Number(r.id)===Number(accesId);})[0];
  if(!acces)throw new Error('Dossier QR '+accesId+' introuvable.');

  var dossier=DIAGNOSTIC_DEV141_DOSSIER(accesId);
  var dest=EUC_CONVENTION_destinatairesV142_(dossier);
  var mail=EUC_CONVENTION_texteConfirmationV142_(dossier);

  return {
    version:EUC_CONVENTION_NOTIFICATION_VERSION_V142_,
    simulation:true,
    aucunEnvoi:true,
    dossier:dossier,
    destinataires:dest,
    objet:mail.objet,
    texte:mail.texte
  };
}

/**
 * DIAGNOSTIC : aucune écriture, aucun envoi.
 */
function DIAGNOSTIC_DEV142_PFMP_000223(){
  var x=EUC_CONVENTION_preparerNotificationV142_(223);

  console.log('============================================================');
  console.log(' DEV.142 — SIMULATION NOTIFICATION PFMP');
  console.log('============================================================');
  console.log('Numéro : '+x.dossier.numeroEnregistrement);
  console.log('Élève : '+x.dossier.eleve.prenom+' '+x.dossier.eleve.nom);
  console.log('Mail élève présent : '+(!x.destinataires.eleveSansEmail));
  console.log('Destinataire(s) principal(aux) : '+(x.destinataires.to.join(', ')||'—'));
  console.log('Copie(s) : '+(x.destinataires.cc.join(', ')||'—'));
  console.log('Adresse BFE configurée : '+x.destinataires.bfe.join(', '));
  console.log('Aucun contact famille : '+x.destinataires.aucunContactFamille);
  console.log('');
  console.log('OBJET : '+x.objet);
  console.log('');
  console.log(x.texte);
  console.log('');
  console.log('AUCUN COURRIEL ENVOYÉ — SIMULATION UNIQUEMENT.');
  return x;
}

/**
 * Fonction d'envoi réel disponible mais JAMAIS appelée automatiquement
 * dans DEV.142. À n'utiliser qu'après validation de la simulation.
 */
function EUC_CONVENTION_envoyerConfirmationV142(accesId){
  var x=EUC_CONVENTION_preparerNotificationV142_(accesId);
  if(!x.destinataires.to.length)throw new Error('Aucun destinataire principal exploitable.');

  MailApp.sendEmail({
    to:x.destinataires.to.join(','),
    cc:x.destinataires.cc.join(','),
    subject:x.objet,
    body:x.texte,
    name:'Lycée Les Eucalyptus — PFMP'
  });

  return {
    ok:true,
    numero:x.dossier.numeroEnregistrement,
    to:x.destinataires.to,
    cc:x.destinataires.cc,
    dateEnvoi:new Date().toISOString()
  };
}
