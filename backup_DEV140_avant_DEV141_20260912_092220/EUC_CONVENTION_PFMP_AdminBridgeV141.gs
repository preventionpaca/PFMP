/** Eucalyptus PFMP — v1.0.0-dev.141 — pont convention QR vers gestion administrative. */

var EUC_CONVENTION_ADMIN_VERSION_V141_ = 'v1.0.0-dev.141';


function EUC_CONVENTION_adminTxtV141_(v,n){
  return String(v==null?'':v).trim().slice(0,n||500);
}


function EUC_CONVENTION_adminEmailV141_(v){
  var x=EUC_CONVENTION_adminTxtV141_(v,250).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)?x:'';
}


function EUC_CONVENTION_adminUniqueEmailsV141_(values){
  var seen={},out=[];

  (values||[]).forEach(function(v){
    var x=EUC_CONVENTION_adminEmailV141_(v);

    if(x&&!seen[x]){
      seen[x]=true;
      out.push(x);
    }
  });

  return out;
}


/**
 * Prépare les colonnes administratives du registre QR.
 * ATTENTION : cette fonction écrit le schéma Grist.
 * Elle n'est PAS exécutée automatiquement.
 */
function EUC_CONVENTION_assurerColonnesAdminV141_(){

  var t=EUC_CONVENTION_ACCES_TABLE_;

  var cols=
    EUC_ENT_grist(
      'get',
      '/tables/'+encodeURIComponent(t)+'/columns'
    ).columns||[];

  var exists={};

  cols.forEach(function(c){
    exists[c.id]=true;
  });

  var defs=[
    ['Numero_enregistrement',
     'Numéro d’enregistrement',
     'Text'],

    ['Date_enregistrement',
     'Date d’enregistrement',
     'DateTime'],

    ['Soumission_admin',
     'Dossier administratif',
     'Ref:EUC_SOUMISSIONS_PFMP'],

    ['Statut_administratif',
     'Statut administratif',
     'Text'],

    ['Date_depot_BFE',
     'Date dépôt BFE',
     'DateTime'],

    ['Date_signature_proviseur',
     'Date signature Proviseur',
     'DateTime'],

    ['Date_remise_convention',
     'Date remise convention',
     'DateTime'],

    ['Date_annulation',
     'Date annulation',
     'DateTime'],

    ['Motif_annulation',
     'Motif annulation',
     'Text'],

    ['Date_interruption',
     'Date interruption',
     'DateTime'],

    ['Motif_interruption',
     'Motif interruption',
     'Text']
  ];

  var missing=
    defs
      .filter(function(d){
        return !exists[d[0]];
      })
      .map(function(d){
        return {
          id:d[0],
          fields:{
            label:d[1],
            type:d[2]
          }
        };
      });

  if(missing.length){

    EUC_ENT_grist(
      'post',
      '/tables/'+encodeURIComponent(t)+'/columns',
      {columns:missing}
    );
  }

  return {
    ok:true,
    version:EUC_CONVENTION_ADMIN_VERSION_V141_,
    table:t,
    colonnesExistantes:defs.length-missing.length,
    colonnesCreees:missing.map(function(x){return x.id;}),
    totalAjoute:missing.length
  };
}


/**
 * Retrouve les responsables de l'élève ayant un courriel.
 */
function EUC_CONVENTION_responsablesEmailsV141_(eleveId){

  var rows=[];

  try{
    rows=
      EUC_IMPORT_lireRecords_(
        'EUC_RESPONSABLES_ELEVES_PFMP'
      );
  }catch(e){
    return [];
  }

  return rows

    .filter(function(r){
      return Number(EUC_PFMP_ref_(r.Eleve))===
             Number(eleveId);
    })

    .map(function(r){

      return {
        id:r.id,
        rang:EUC_CONVENTION_adminTxtV141_(
          r.Rang_responsable,
          30
        ),
        nom:[
          EUC_CONVENTION_adminTxtV141_(r.Prenom,100),
          EUC_CONVENTION_adminTxtV141_(r.Nom,100)
        ].filter(Boolean).join(' '),
        lien:EUC_CONVENTION_adminTxtV141_(
          r.Lien_avec_eleve,
          100
        ),
        responsableLegal:r.Responsable_legal===true,
        responsableEnCharge:r.Responsable_en_charge===true,
        email:EUC_CONVENTION_adminEmailV141_(r.Email)
      };

    })

    .filter(function(r){
      return !!r.email;
    });
}


/**
 * Retrouve les PP à partir de la référence stable de classe.
 */
function EUC_CONVENTION_ppEmailsV141_(classeId){

  var links=[],profs=[];

  try{
    links=
      EUC_IMPORT_lireRecords_(
        'EUC_CLASSES_PROFESSEURS_PFMP'
      );

    profs=
      EUC_IMPORT_lireRecords_(
        'EUC_PROFESSEURS_PFMP'
      );

  }catch(e){
    return [];
  }

  var byId={};

  profs.forEach(function(p){
    byId[Number(p.id)]=p;
  });

  return links

    .filter(function(l){

      return l.Actif!==false &&
        String(l.Role||'')==='PROFESSEUR_PRINCIPAL' &&
        Number(EUC_PFMP_ref_(l.Classe))===Number(classeId);

    })

    .map(function(l){

      var p=
        byId[
          Number(EUC_PFMP_ref_(l.Professeur))
        ];

      if(!p)return null;

      return {
        id:p.id,
        nom:[
          EUC_CONVENTION_adminTxtV141_(p.Civilite,30),
          EUC_CONVENTION_adminTxtV141_(p.Prenom,100),
          EUC_CONVENTION_adminTxtV141_(p.Nom,100)
        ].filter(Boolean).join(' '),
        email:EUC_CONVENTION_adminEmailV141_(p.Email)
      };

    })

    .filter(function(p){
      return p&&p.email;
    });
}


/**
 * Prépare le dossier administratif sans aucune écriture.
 */
function EUC_CONVENTION_preparerDossierAdminV141_(acces){

  if(!acces)throw new Error('Accès convention absent.');

  var eleveId=
    Number(EUC_PFMP_ref_(acces.Eleve));

  var classeId=
    Number(EUC_PFMP_ref_(acces.Classe_convention));

  var periodeId=
    Number(EUC_PFMP_ref_(acces.Periode));

  var eleves=
    EUC_IMPORT_lireRecords_(
      'EUC_ELEVES_PFMP'
    );

  var eleve=
    eleves.filter(function(e){
      return Number(e.id)===eleveId;
    })[0];

  if(!eleve){
    throw new Error(
      'Élève '+eleveId+' introuvable.'
    );
  }

  var numero=
    EUC_CONVENTION_adminTxtV141_(
      acces.Numero_enregistrement,
      100
    );

  if(!numero){

    var annee=
      EUC_CONVENTION_adminTxtV141_(
        acces.Annee_scolaire,
        50
      );

    var debut=
      (annee.match(/20\d{2}/)||['PFMP'])[0];

    numero=
      'PFMP-'+
      debut+'-'+
      String(Number(acces.id||0)).padStart(6,'0');
  }

  var responsables=
    EUC_CONVENTION_responsablesEmailsV141_(
      eleveId
    );

  var pp=
    EUC_CONVENTION_ppEmailsV141_(
      classeId
    );

  var emailEleve=
    EUC_CONVENTION_adminEmailV141_(
      eleve.Email_eleve||
      eleve.Courriel||
      eleve.Email
    );

  var emailBFE='';

  try{

    var etab=
      EUC_CONVENTION_etablissementV94_(
        classeId
      );

    emailBFE=
      EUC_CONVENTION_adminEmailV141_(
        etab.email
      );

  }catch(e){}

  if(!emailBFE){
    emailBFE='bfe@lycee-les-eucalyptus.org';
  }

  var destinataires={
    eleve:emailEleve?[emailEleve]:[],
    responsables:EUC_CONVENTION_adminUniqueEmailsV141_(
      responsables.map(function(x){return x.email;})
    ),
    professeursPrincipaux:EUC_CONVENTION_adminUniqueEmailsV141_(
      pp.map(function(x){return x.email;})
    ),
    bfe:EUC_CONVENTION_adminUniqueEmailsV141_(
      [emailBFE]
    )
  };

  destinataires.tous=
    EUC_CONVENTION_adminUniqueEmailsV141_(
      []
        .concat(destinataires.eleve)
        .concat(destinataires.responsables)
        .concat(destinataires.professeursPrincipaux)
        .concat(destinataires.bfe)
    );

  return {
    version:EUC_CONVENTION_ADMIN_VERSION_V141_,
    lectureSeule:true,
    aucuneEcriture:true,
    aucunCourriel:true,

    accesId:Number(acces.id),
    numeroEnregistrement:numero,

    eleve:{
      id:eleveId,
      nom:EUC_CONVENTION_adminTxtV141_(eleve.Nom,150),
      prenom:EUC_CONVENTION_adminTxtV141_(
        eleve.Prenom_usage||eleve.Prenom,
        150
      ),
      email:emailEleve
    },

    classe:{
      id:classeId,
      nom:EUC_CONVENTION_adminTxtV141_(
        acces.Classe_convention_nom,
        150
      )
    },

    periode:{
      id:periodeId,
      libelle:EUC_CONVENTION_adminTxtV141_(
        acces.Periode_libelle,
        250
      ),
      debut:EUC_IMPORT_dateExistanteISO_(
        acces.Date_debut
      ),
      fin:EUC_IMPORT_dateExistanteISO_(
        acces.Date_fin
      )
    },

    entreprise:{
      siret:EUC_CONVENTION_adminTxtV141_(
        acces.Entreprise_siret,
        30
      ),
      raisonSociale:EUC_CONVENTION_adminTxtV141_(
        acces.Entreprise_raison_sociale,
        250
      ),
      commune:EUC_CONVENTION_adminTxtV141_(
        acces.Entreprise_commune,
        150
      )
    },

    responsableEntreprise:{
      nom:[
        acces.Responsable_prenom,
        acces.Responsable_nom
      ].filter(Boolean).join(' '),
      email:EUC_CONVENTION_adminEmailV141_(
        acces.Responsable_courriel
      )
    },

    tuteur:{
      nom:[
        acces.Tuteur_prenom,
        acces.Tuteur_nom
      ].filter(Boolean).join(' '),
      email:EUC_CONVENTION_adminEmailV141_(
        acces.Tuteur_courriel
      )
    },

    responsablesLegaux:responsables,
    professeursPrincipaux:pp,
    destinataires:destinataires,

    statutInitial:'INFORMATIONS_ENREGISTREES'
  };
}


/**
 * Diagnostic générique lecture seule.
 */
function DIAGNOSTIC_DEV141_DOSSIER(accesId){

  accesId=Number(accesId||0);

  if(!accesId){
    throw new Error(
      'Indiquez l’ID numérique du dossier QR.'
    );
  }

  var rows=
    EUC_CONVENTION_lireAccesFraisV108_();

  var acces=
    rows.filter(function(r){
      return Number(r.id)===accesId;
    })[0];

  if(!acces){
    throw new Error(
      'Dossier QR '+accesId+' introuvable.'
    );
  }

  var d=
    EUC_CONVENTION_preparerDossierAdminV141_(
      acces
    );

  console.log(
    '============================================================'
  );
  console.log(
    ' DEV.141 — DIAGNOSTIC DOSSIER ADMINISTRATIF'
  );
  console.log(
    '============================================================'
  );

  console.log(
    'Numéro : '+d.numeroEnregistrement
  );

  console.log(
    'Élève  : '+
    d.eleve.prenom+' '+
    d.eleve.nom+
    ' | '+(d.eleve.email||'AUCUN EMAIL')
  );

  console.log(
    'Classe : '+
    d.classe.nom+
    ' (ID '+d.classe.id+')'
  );

  console.log(
    'Période : '+
    d.periode.libelle+
    ' | '+
    d.periode.debut+
    ' → '+
    d.periode.fin
  );

  console.log(
    'Entreprise : '+
    d.entreprise.raisonSociale+
    ' | SIRET '+
    d.entreprise.siret
  );

  console.log('');
  console.log('=== RESPONSABLES ===');

  if(!d.responsablesLegaux.length){
    console.log('Aucun responsable avec courriel.');
  }

  d.responsablesLegaux.forEach(function(r){
    console.log(
      (r.rang||'')+
      ' | '+
      (r.nom||'')+
      ' | '+
      (r.email||'')+
      ' | légal='+
      r.responsableLegal+
      ' | en charge='+
      r.responsableEnCharge
    );
  });

  console.log('');
  console.log('=== PROFESSEUR(S) PRINCIPAL(AUX) ===');

  if(!d.professeursPrincipaux.length){
    console.log(
      'Aucun professeur principal avec courriel.'
    );
  }

  d.professeursPrincipaux.forEach(function(p){
    console.log(
      p.nom+' | '+p.email
    );
  });

  console.log('');
  console.log('=== DESTINATAIRES PREVUS ===');

  console.log(
    'Élève   : '+
    (d.destinataires.eleve.join(', ')||'—')
  );

  console.log(
    'Parents : '+
    (d.destinataires.responsables.join(', ')||'—')
  );

  console.log(
    'PP      : '+
    (d.destinataires.professeursPrincipaux.join(', ')||'—')
  );

  console.log(
    'BFE     : '+
    d.destinataires.bfe.join(', ')
  );

  console.log('');
  console.log(
    'TOTAL destinataires uniques : '+
    d.destinataires.tous.length
  );

  console.log('');
  console.log(
    'AUCUNE ECRITURE — AUCUN COURRIEL ENVOYE.'
  );

  return d;
}


/**
 * Diagnostic temporaire du dossier PFMP-2026-000223.
 * Lecture seule.
 */
function DIAGNOSTIC_DEV141_PFMP_000223(){
  return DIAGNOSTIC_DEV141_DOSSIER(223);
}
