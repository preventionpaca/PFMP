/**
 * Eucalyptus PFMP — v1.0.0-dev.144-fix3
 * Workflow administratif + migration des dossiers existants.
 * Aucun courriel envoyé par les fonctions de diagnostic/migration.
 */


var EUC_ADMIN_WORKFLOW_V144_='v1.0.0-dev.144';

function EUC_ADMIN_WORKFLOW_txtV144_(v,n){
  return String(v==null?'':v).trim().slice(0,n||1000);
}

function EUC_ADMIN_WORKFLOW_nowV144_(){
  return new Date().toISOString();
}

function EUC_ADMIN_WORKFLOW_ctxV144_(){
  var ctx=EUC_PFMP_contexteAdmin_();
  if(!ctx||!ctx.autorise)throw new Error('Accès administrateur requis.');
  return ctx;
}

function EUC_ADMIN_WORKFLOW_defsV144_(){
  return {
    INFORMATIONS_ENREGISTREES:{
      ordre:10,
      label:'Informations enregistrées',
      date:'Date_enregistrement',
      auteur:'Auteur_enregistrement'
    },
    ORIGINAL_DEPOSE_BFE:{
      ordre:20,
      label:'Original papier déposé au BFE',
      date:'Date_depot_BFE',
      auteur:'Auteur_depot_BFE'
    },
    SIGNE_PROVISEUR:{
      ordre:30,
      label:'Signée par le Proviseur',
      date:'Date_signature_proviseur',
      auteur:'Auteur_signature_proviseur'
    },
    CONVENTION_FINALISEE:{
      ordre:40,
      label:'Convention finalisée',
      date:'Date_finalisation',
      auteur:'Auteur_finalisation'
    },
    CONVENTION_REMISE:{
      ordre:50,
      label:'Convention remise / retournée',
      date:'Date_remise_convention',
      auteur:'Auteur_remise_convention'
    },
    PFMP_AUTORISEE:{
      ordre:60,
      label:'PFMP autorisée',
      date:'Date_autorisation_PFMP',
      auteur:'Auteur_autorisation_PFMP'
    },
    ANNULEE_AVANT_DEMARRAGE:{
      ordre:900,
      label:'Annulée avant démarrage',
      date:'Date_annulation',
      auteur:'Auteur_annulation'
    },
    INTERROMPUE:{
      ordre:910,
      label:'PFMP interrompue',
      date:'Date_interruption',
      auteur:'Auteur_interruption'
    }
  };
}

function EUC_ADMIN_WORKFLOW_colV144_(id,label,type){
  return {id:id,fields:{label:label,type:type||'Text'}};
}

function EUC_ADMIN_WORKFLOW_assurerColonnesV144_(){
  var table=EUC_CONVENTION_ACCES_TABLE_;
  var current=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[];
  var have={};
  current.forEach(function(c){have[c.id]=true;});

  var c=EUC_ADMIN_WORKFLOW_colV144_;
  var cols=[
    c('Statut_administratif','Statut administratif'),
    c('Auteur_enregistrement','Auteur enregistrement'),
    c('Date_depot_BFE','Date dépôt BFE','DateTime'),
    c('Auteur_depot_BFE','Auteur dépôt BFE'),
    c('Date_signature_proviseur','Date signature Proviseur','DateTime'),
    c('Auteur_signature_proviseur','Auteur signature Proviseur'),
    c('Date_finalisation','Date finalisation','DateTime'),
    c('Auteur_finalisation','Auteur finalisation'),
    c('Date_remise_convention','Date remise convention','DateTime'),
    c('Auteur_remise_convention','Auteur remise convention'),
    c('Date_autorisation_PFMP','Date autorisation PFMP','DateTime'),
    c('Auteur_autorisation_PFMP','Auteur autorisation PFMP'),
    c('Date_annulation','Date annulation','DateTime'),
    c('Auteur_annulation','Auteur annulation'),
    c('Motif_annulation','Motif annulation'),
    c('Date_interruption','Date interruption','DateTime'),
    c('Auteur_interruption','Auteur interruption'),
    c('Motif_interruption','Motif interruption'),
    c('Date_fin_reelle','Date fin réelle','Date'),
    c('Historique_admin_JSON','Historique administratif JSON')
  ];

  var missing=cols.filter(function(x){return !have[x.id];});
  if(missing.length){
    EUC_ENT_grist(
      'post',
      '/tables/'+encodeURIComponent(table)+'/columns',
      {columns:missing}
    );
  }
  return missing.map(function(x){return x.id;});
}

function INSTALLER_DEV144_WORKFLOW_ADMIN(){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();
  return {
    ok:true,
    version:EUC_ADMIN_WORKFLOW_V144_,
    auteur:ctx.email||'',
    colonnesCreees:EUC_ADMIN_WORKFLOW_assurerColonnesV144_()
  };
}

function EUC_ADMIN_WORKFLOW_lireDossierV144_(accesId){
  var rows=EUC_CONVENTION_lireAccesFraisV108_();
  var a=rows.filter(function(r){return Number(r.id)===Number(accesId);})[0];
  if(!a)throw new Error('Dossier '+accesId+' introuvable.');
  return a;
}


function EUC_ADMIN_WORKFLOW_numeroV144_(a){
  var n=String(a.Numero_enregistrement||'').trim();
  if(n)return n;

  var annee=String(a.Annee_scolaire||'').trim();
  var y=(annee.match(/20\d{2}/)||['PFMP'])[0];

  return 'PFMP-'+y+'-'+String(Number(a.id||0)).padStart(6,'0');
}

function EUC_ADMIN_WORKFLOW_dateEnregistrementV144_(a){
  return a.Date_enregistrement || a.Date_saisie_entreprise || '';
}


function EUC_ADMIN_WORKFLOW_dateLisibleV144_(v){
  if(v===null||v===undefined||v==='')return '';

  var d=null;

  if(typeof v==='number'){
    d=new Date(v*1000);
  }else{
    var txt=String(v).trim();

    if(/^\d+(?:\.\d+)?$/.test(txt)){
      d=new Date(Number(txt)*1000);
    }else{
      d=new Date(txt);
    }
  }

  if(!d||isNaN(d.getTime()))return String(v);

  return Utilities.formatDate(
    d,
    Session.getScriptTimeZone()||'Europe/Paris',
    'dd/MM/yyyy HH:mm'
  );
}

function EUC_ADMIN_WORKFLOW_historiqueV144_(a){
  var h=[];
  try{
    h=JSON.parse(String(a.Historique_admin_JSON||'[]'));
    if(!Array.isArray(h))h=[];
  }catch(e){h=[];}
  return h;
}

function EUC_ADMIN_WORKFLOW_vueV144(accesId){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var a=EUC_ADMIN_WORKFLOW_lireDossierV144_(accesId);
  var defs=EUC_ADMIN_WORKFLOW_defsV144_();

  var etapes=Object.keys(defs)
    .filter(function(k){
      return k!=='ANNULEE_AVANT_DEMARRAGE'&&k!=='INTERROMPUE';
    })
    .sort(function(x,y){return defs[x].ordre-defs[y].ordre;})
    .map(function(k){
      var d=defs[k];
      var dateValeur=a[d.date]||'';
      if(k==='INFORMATIONS_ENREGISTREES'&&!dateValeur){
        dateValeur=EUC_ADMIN_WORKFLOW_dateEnregistrementV144_(a);
      }
      return {
        code:k,
        label:d.label,
        date:dateValeur,
        auteur:a[d.auteur]||'',
        validee:!!dateValeur
      };
    });

  return {
    version:EUC_ADMIN_WORKFLOW_V144_,
    id:Number(a.id),
    numero:EUC_ADMIN_WORKFLOW_numeroV144_(a),
    statut:a.Statut_administratif||'INFORMATIONS_ENREGISTREES',
    eleve:a.Eleve_nom||a.Nom_eleve||'',
    entreprise:a.Entreprise_raison_sociale||'',
    etapes:etapes,
    annulation:{
      date:a.Date_annulation||'',
      auteur:a.Auteur_annulation||'',
      motif:a.Motif_annulation||''
    },
    interruption:{
      date:a.Date_interruption||'',
      auteur:a.Auteur_interruption||'',
      motif:a.Motif_interruption||'',
      dateFinReelle:a.Date_fin_reelle||''
    },
    historique:EUC_ADMIN_WORKFLOW_historiqueV144_(a)
  };
}

function EUC_ADMIN_WORKFLOW_validerEtapeV144(accesId,code,options){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();
  var a=EUC_ADMIN_WORKFLOW_lireDossierV144_(accesId);
  var defs=EUC_ADMIN_WORKFLOW_defsV144_();
  var d=defs[String(code||'')];

  if(!d)throw new Error('Étape administrative inconnue : '+code);
  if(code==='ANNULEE_AVANT_DEMARRAGE'||code==='INTERROMPUE'){
    throw new Error('Utiliser la fonction dédiée pour annuler ou interrompre une PFMP.');
  }

  options=options||{};
  var now=options.date||EUC_ADMIN_WORKFLOW_nowV144_();
  var auteur=ctx.email||'';

  var fields={};
  fields[d.date]=now;
  fields[d.auteur]=auteur;
  fields.Statut_administratif=code;

  var h=EUC_ADMIN_WORKFLOW_historiqueV144_(a);
  h.push({
    date:now,
    auteur:auteur,
    action:'VALIDATION_ETAPE',
    statut:code,
    libelle:d.label,
    commentaire:EUC_ADMIN_WORKFLOW_txtV144_(options.commentaire,1000)
  });
  fields.Historique_admin_JSON=JSON.stringify(h);

  EUC_ENT_grist(
    'patch',
    '/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',
    {records:[{id:Number(a.id),fields:fields}]}
  );

  return EUC_ADMIN_WORKFLOW_vueV144(a.id);
}

function EUC_ADMIN_WORKFLOW_annulerV144(accesId,motif){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();
  var a=EUC_ADMIN_WORKFLOW_lireDossierV144_(accesId);
  motif=EUC_ADMIN_WORKFLOW_txtV144_(motif,1000);
  if(!motif)throw new Error('Motif d’annulation obligatoire.');

  var now=EUC_ADMIN_WORKFLOW_nowV144_();
  var auteur=ctx.email||'';
  var h=EUC_ADMIN_WORKFLOW_historiqueV144_(a);

  h.push({
    date:now,
    auteur:auteur,
    action:'ANNULATION_AVANT_DEMARRAGE',
    statut:'ANNULEE_AVANT_DEMARRAGE',
    motif:motif
  });

  EUC_ENT_grist(
    'patch',
    '/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',
    {records:[{id:Number(a.id),fields:{
      Statut_administratif:'ANNULEE_AVANT_DEMARRAGE',
      Date_annulation:now,
      Auteur_annulation:auteur,
      Motif_annulation:motif,
      Historique_admin_JSON:JSON.stringify(h)
    }}]}
  );

  return EUC_ADMIN_WORKFLOW_vueV144(a.id);
}

function EUC_ADMIN_WORKFLOW_interrompreV144(accesId,dateFinReelle,motif){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();
  var a=EUC_ADMIN_WORKFLOW_lireDossierV144_(accesId);
  motif=EUC_ADMIN_WORKFLOW_txtV144_(motif,1000);
  if(!motif)throw new Error('Motif d’interruption obligatoire.');

  var fin=EUC_ADMIN_WORKFLOW_txtV144_(dateFinReelle,20);
  if(!fin)throw new Error('Date de fin réelle obligatoire.');

  var now=EUC_ADMIN_WORKFLOW_nowV144_();
  var auteur=ctx.email||'';
  var h=EUC_ADMIN_WORKFLOW_historiqueV144_(a);

  h.push({
    date:now,
    auteur:auteur,
    action:'INTERRUPTION',
    statut:'INTERROMPUE',
    dateFinReelle:fin,
    motif:motif
  });

  EUC_ENT_grist(
    'patch',
    '/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',
    {records:[{id:Number(a.id),fields:{
      Statut_administratif:'INTERROMPUE',
      Date_interruption:now,
      Auteur_interruption:auteur,
      Date_fin_reelle:fin,
      Motif_interruption:motif,
      Historique_admin_JSON:JSON.stringify(h)
    }}]}
  );

  return EUC_ADMIN_WORKFLOW_vueV144(a.id);
}

function DIAGNOSTIC_DEV144_PFMP_000223(){
  var v=EUC_ADMIN_WORKFLOW_vueV144(223);
  console.log('=== DEV.144 — WORKFLOW ADMINISTRATIF — LECTURE SEULE ===');
  console.log('Numéro : '+v.numero);
  console.log('Statut : '+v.statut);
  console.log('Entreprise : '+v.entreprise);
  v.etapes.forEach(function(e){
    console.log(
      (e.validee?'✓ ':'○ ')+e.label+
      (e.date?' | '+EUC_ADMIN_WORKFLOW_dateLisibleV144_(e.date):'')+
      (e.auteur?' | '+e.auteur:'')
    );
  });
  console.log('AUCUNE MODIFICATION PAR CE DIAGNOSTIC.');
  return v;
}


function MIGRER_DEV144_DOSSIERS_EXISTANTS(){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();
  var rows=EUC_CONVENTION_lireAccesFraisV108_();

  var nb=0,ignores=0,erreurs=[];

  rows.forEach(function(a){
    var aDesInfosEntreprise=!!(
      a.Date_saisie_entreprise ||
      a.Entreprise_raison_sociale ||
      a.Statut==='ENTREPRISE_SAISIE'
    );

    if(!aDesInfosEntreprise){
      ignores++;
      return;
    }

    var fields={};
    var change=false;

    if(!String(a.Numero_enregistrement||'').trim()){
      fields.Numero_enregistrement=EUC_ADMIN_WORKFLOW_numeroV144_(a);
      change=true;
    }

    if(!a.Date_enregistrement && a.Date_saisie_entreprise){
      fields.Date_enregistrement=a.Date_saisie_entreprise;
      change=true;
    }

    if(!String(a.Statut_administratif||'').trim()){
      fields.Statut_administratif='INFORMATIONS_ENREGISTREES';
      change=true;
    }

    if(!change){
      ignores++;
      return;
    }

    try{
      EUC_ENT_grist(
        'patch',
        '/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',
        {records:[{id:Number(a.id),fields:fields}]}
      );
      nb++;
    }catch(e){
      erreurs.push({
        id:a.id,
        erreur:String(e&&e.message?e.message:e)
      });
    }
  });

  console.log('=== DEV.144 FIX1 — MIGRATION DOSSIERS EXISTANTS ===');
  console.log('Mis à jour : '+nb);
  console.log('Ignorés : '+ignores);
  console.log('Erreurs : '+erreurs.length);
  erreurs.forEach(function(x){
    console.log('ID '+x.id+' : '+x.erreur);
  });

  return {
    ok:erreurs.length===0,
    auteur:ctx.email||'',
    misAJour:nb,
    ignores:ignores,
    erreurs:erreurs
  };
}

function EUC_ADMIN_WORKFLOW_listerDossiersV145(){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var rows=EUC_CONVENTION_lireAccesFraisV108_();

  return rows
    .filter(function(a){
      return !!(
        a.Date_saisie_entreprise ||
        a.Numero_enregistrement ||
        a.Entreprise_raison_sociale ||
        a.Statut==='ENTREPRISE_SAISIE'
      );
    })
    .map(function(a){
      return {
        id:Number(a.id),
        numero:EUC_ADMIN_WORKFLOW_numeroV144_(a),
        statut:String(a.Statut_administratif||'INFORMATIONS_ENREGISTREES'),
        eleve:String(a.Eleve_nom||a.Nom_eleve||''),
        classe:String(a.Classe_convention_nom||''),
        entreprise:String(a.Entreprise_raison_sociale||''),
        dateDebut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),
        dateFin:EUC_IMPORT_dateExistanteISO_(a.Date_fin),
        dateEnregistrement:EUC_ADMIN_WORKFLOW_dateLisibleV144_(
          EUC_ADMIN_WORKFLOW_dateEnregistrementV144_(a)
        )
      };
    })
    .sort(function(a,b){
      return String(b.numero||'').localeCompare(String(a.numero||''),'fr');
    });
}

function EUC_ADMIN_WORKFLOW_validerEtapeV145(accesId,code,commentaire){
  return EUC_ADMIN_WORKFLOW_validerEtapeV144(
    accesId,
    code,
    {commentaire:String(commentaire||'')}
  );
}

function EUC_ADMIN_WORKFLOW_annulerV145(accesId,motif){
  return EUC_ADMIN_WORKFLOW_annulerV144(accesId,motif);
}

function EUC_ADMIN_WORKFLOW_interrompreV145(accesId,dateFinReelle,motif){
  return EUC_ADMIN_WORKFLOW_interrompreV144(accesId,dateFinReelle,motif);
}

/* DEV.146 — Centre administratif des conventions */
function EUC_ADMIN_WORKFLOW_listerDossiersV146(){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var rows=EUC_CONVENTION_lireAccesFraisV108_();
  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP'),byEleve={};
  eleves.forEach(function(e){byEleve[Number(e.id)]=e;});

  return rows.filter(function(a){
    return !!(a.Date_saisie_entreprise||a.Numero_enregistrement||a.Entreprise_raison_sociale||a.Statut==='ENTREPRISE_SAISIE');
  }).map(function(a){
    var e=byEleve[Number(EUC_PFMP_ref_(a.Eleve))]||{};
    var nom=String(e.Nom||a.Eleve_nom||a.Nom_eleve||'').trim();
    var prenom=String(e.Prenom_usage||e.Prenom||a.Eleve_prenom||'').trim();
    return {
      id:Number(a.id),
      numero:EUC_ADMIN_WORKFLOW_numeroV144_(a),
      nom:nom,prenom:prenom,
      jeune:[prenom,nom].filter(Boolean).join(' '),
      classe:String(a.Classe_convention_nom||''),
      entreprise:String(a.Entreprise_raison_sociale||''),
      statut:String(a.Statut_administratif||'INFORMATIONS_ENREGISTREES'),
      dateDebut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),
      dateFin:EUC_IMPORT_dateExistanteISO_(a.Date_fin),
      recherche:[EUC_ADMIN_WORKFLOW_numeroV144_(a),nom,prenom,a.Classe_convention_nom||'',a.Entreprise_raison_sociale||''].join(' ').toLowerCase()
    };
  }).sort(function(a,b){return String(b.numero||'').localeCompare(String(a.numero||''),'fr');});
}

function EUC_ADMIN_WORKFLOW_vueV146(accesId){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var base=EUC_ADMIN_WORKFLOW_vueV144(accesId);
  var a=EUC_ADMIN_WORKFLOW_lireDossierV144_(accesId);
  var e=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(x){
    return Number(x.id)===Number(EUC_PFMP_ref_(a.Eleve));
  })[0]||{};

  base.jeune={nom:String(e.Nom||a.Eleve_nom||a.Nom_eleve||''),prenom:String(e.Prenom_usage||e.Prenom||a.Eleve_prenom||'')};
  base.classe=String(a.Classe_convention_nom||'');
  base.periode={debut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),fin:EUC_IMPORT_dateExistanteISO_(a.Date_fin),libelle:String(a.Periode_libelle||'')};
  base.etapes=(base.etapes||[]).map(function(x){return Object.assign({},x,{dateLisible:x.date?EUC_ADMIN_WORKFLOW_dateLisibleV144_(x.date):''});});
  return base;
}

function EUC_ADMIN_CONVENTIONS_afficherV146(e){
  EUC_ADMIN_WORKFLOW_ctxV144_();

  var tpl=HtmlService.createTemplateFromFile('Admin_Conventions_PFMP');
  tpl.config={
    baseUrl:ScriptApp.getService().getUrl()
  };

  return tpl.evaluate()
    .setTitle('Administration des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function DIAGNOSTIC_DEV146_RECHERCHE_DOSSIERS(){
  var rows=EUC_CONVENTION_lireAccesFraisV108_();
  console.log('=== DEV.146 — DIAGNOSTIC RECHERCHE DOSSIERS ===');
  console.log('Accès totaux : '+rows.length);

  rows.forEach(function(a){
    var eligible=!!(
      a.Date_saisie_entreprise ||
      a.Numero_enregistrement ||
      a.Entreprise_raison_sociale ||
      a.Statut==='ENTREPRISE_SAISIE'
    );
    if(!eligible)return;

    console.log(
      'ID='+a.id+
      ' | Numero='+String(a.Numero_enregistrement||'')+
      ' | EleveRef='+String(a.Eleve||'')+
      ' | Eleve_nom='+String(a.Eleve_nom||'')+
      ' | Nom_eleve='+String(a.Nom_eleve||'')+
      ' | Classe='+String(a.Classe_convention_nom||'')+
      ' | Entreprise='+String(a.Entreprise_raison_sociale||'')
    );
  });

  var out=EUC_ADMIN_WORKFLOW_listerDossiersV146();
  console.log('Dossiers V146 : '+out.length);

  out.forEach(function(d){
    console.log(
      'V146 ID='+d.id+
      ' | '+d.numero+
      ' | jeune='+d.jeune+
      ' | classe='+d.classe+
      ' | entreprise='+d.entreprise+
      ' | recherche='+d.recherche
    );
  });

  return out;
}
