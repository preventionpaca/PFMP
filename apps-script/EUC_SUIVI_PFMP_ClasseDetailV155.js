/** Eucalyptus PFMP — v1.0.0-dev.155
 * Tableau détaillé de suivi par classe et période.
 * Filtre majeur : année scolaire active.
 */

var EUC_SUIVI_DETAIL_V155_='v1.0.0-dev.155';

function EUC_V155_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_V155_professeursPrincipaux_(classeId){
  var out=[];
  try{
    var links=EUC_IMPORT_lireRecords_('EUC_CLASSES_PROFESSEURS_PFMP');
    var profs=EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP');
    var by={};
    profs.forEach(function(p){by[Number(p.id)]=p;});

    links.filter(function(l){
      return l.Actif!==false &&
        String(l.Role||'')==='PROFESSEUR_PRINCIPAL' &&
        Number(EUC_PFMP_ref_(l.Classe))===Number(classeId);
    }).forEach(function(l){
      var p=by[Number(EUC_PFMP_ref_(l.Professeur))];
      if(!p)return;
      out.push({
        id:Number(p.id),
        nom:[p.Civilite,p.Prenom,p.Nom].filter(Boolean).join(' '),
        email:EUC_V155_txt_(p.Email)
      });
    });
  }catch(e){}
  return out;
}

function EUC_V155_periodesClasse_(codeAnnee,classeId){
  var map=EUC_V154_anneesMap_();
  return EUC_IMPORT_lireRecords_('Planning_Periodes').filter(function(p){
    if(p.Actif===false)return false;

    var an=EUC_V154_anneeCode_(p.Annee_scolaire,map);
    if(codeAnnee && an && an!==codeAnnee)return false;

    var ids=EUC_V154_refIds_(p.Classes_concernees);
    if(!ids.length){
      var single=Number(EUC_PFMP_ref_(p.Classe));
      if(single>0)ids=[single];
    }

    return ids.indexOf(Number(classeId))>=0;
  }).map(function(p){
    return {
      id:Number(p.id),
      libelle:EUC_V154_periodeLibelle_(p),
      debut:EUC_IMPORT_dateExistanteISO_(p.Date_debut),
      fin:EUC_IMPORT_dateExistanteISO_(p.Date_fin)
    };
  }).sort(function(a,b){
    return String(a.debut||'').localeCompare(String(b.debut||''));
  });
}

function EUC_V155_statutLibelle_(a){
  if(!a)return {code:'SANS_CONVENTION',libelle:'Sans convention'};

  var s=String(a.Statut_administratif||a.Statut||'').toUpperCase();

  if(a.Supprimee_admin===true || s==='SUPPRIMEE_ADMIN'){
    return {code:'SUPPRIMEE',libelle:'Supprimée'};
  }
  if(s.indexOf('ANNULEE')>=0){
    return {code:'ANNULEE',libelle:'Annulée'};
  }
  if(s.indexOf('INTERROMP')>=0){
    return {code:'INTERROMPUE',libelle:'Interrompue'};
  }
  if(s==='PFMP_AUTORISEE'){
    return {code:'AUTORISEE',libelle:'PFMP autorisée'};
  }
  if(s==='CONVENTION_REMISE'){
    return {code:'REMISE',libelle:'Convention remise'};
  }
  if(s==='CONVENTION_FINALISEE'){
    return {code:'FINALISEE',libelle:'Convention finalisée'};
  }
  if(s==='SIGNE_PROVISEUR'){
    return {code:'SIGNEE',libelle:'Signée Proviseur'};
  }
  if(s==='ORIGINAL_DEPOSE_BFE'){
    return {code:'DEPOSEE',libelle:'Original déposé BFE'};
  }

  return {code:'ENREGISTREE',libelle:'Convention enregistrée'};
}

function EUC_V155_contactEntreprise_(a){
  if(!a)return '';
  var responsable=[EUC_V155_txt_(a.Responsable_prenom),EUC_V155_txt_(a.Responsable_nom)].filter(Boolean).join(' ').trim();
  var tuteur=[EUC_V155_txt_(a.Tuteur_prenom),EUC_V155_txt_(a.Tuteur_nom)].filter(Boolean).join(' ').trim();
  var nom=responsable||tuteur;
  var tel=EUC_V155_txt_(a.Responsable_telephone)||EUC_V155_txt_(a.Tuteur_telephone);
  var mail=EUC_V155_txt_(a.Responsable_courriel)||EUC_V155_txt_(a.Tuteur_courriel);
  return [nom,tel,mail].filter(Boolean).join(' · ');
}

function EUC_V155_adresseEntreprise_(a){
  if(!a)return '';
  var l1=EUC_V155_txt_(a.Entreprise_adresse);
  var l2=[a.Entreprise_code_postal,a.Entreprise_commune].map(EUC_V155_txt_).filter(Boolean).join(' ');
  return [l1,l2].filter(Boolean).join(', ');
}

function EUC_DEV394_BASE_EUC_PFMP_contexteAnneeLectureV155_(){
  var rows=[];
  try{rows=EUC_IMPORT_lireRecords_('Annees_Scolaires');}catch(e){rows=[];}
  var annees=rows.map(function(r){
    var code=String(r.Code||r.Libelle||'').trim();
    return {id:Number(r.id)||0,code:code,libelle:String(r.Libelle||r.Code||code).trim(),actif:r.Actif!==false};
  }).filter(function(x){return x.code;}).sort(function(a,b){return String(b.code).localeCompare(String(a.code),'fr');});
  var now=new Date(),y=now.getFullYear(),m=now.getMonth()+1,start=(m>=8)?y:(y-1);
  var courant=start+'-'+(start+1);
  var saved='';
  try{saved=String(PropertiesService.getUserProperties().getProperty('EUC_PFMP_ANNEE_ACTIVE_V148')||'').trim();}catch(e2){}
  var active=saved;
  if(!active || !annees.some(function(a){return a.code===active;})){
    active=annees.some(function(a){return a.code===courant;})?courant:(annees[0]?annees[0].code:'');
  }
  return {version:'v1.0.0-dev.155-fix2',annees:annees,active:active,courant:courant};
}

function EUC_SUIVI_CLASSE_detailV155(codeAnnee,classeId,periodeId){

  codeAnnee=EUC_V155_txt_(codeAnnee);
  classeId=Number(classeId);
  periodeId=Number(periodeId)||0;

  if(!(classeId>0))throw new Error('Classe invalide.');

  var classes=EUC_IMPORT_lireRecords_('Classes');
  var classe=classes.filter(function(c){return Number(c.id)===classeId;})[0];
  if(!classe)throw new Error('Classe introuvable.');

  var periodes=EUC_V155_periodesClasse_(codeAnnee,classeId);
  if(!periodeId && periodes.length)periodeId=periodes[0].id;

  var periode=periodes.filter(function(p){return Number(p.id)===periodeId;})[0]||null;

  var map=EUC_V154_anneesMap_();

  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(e){
    if(e.Actif===false)return false;
    if(e.Present_dernier_import===false)return false;

    var cid=Number(EUC_PFMP_ref_(e.Classe));
    if(cid!==classeId)return false;

    var an=EUC_V154_anneeCode_(e.Annee_scolaire,map);
    return !codeAnnee || !an || an===codeAnnee;
  });

  var dossiers=EUC_CONVENTION_lireAccesFraisV108_().filter(function(a){
    var cid=Number(EUC_PFMP_ref_(a.Classe_convention));
    var pid=Number(EUC_PFMP_ref_(a.Periode));

    if(cid!==classeId)return false;
    if(periodeId && pid!==periodeId)return false;

    var an=EUC_V154_anneeDossier_(a,map);
    return !codeAnnee || !an || an===codeAnnee;
  });

  var byEleve={};

  dossiers.forEach(function(a){
    var eid=Number(EUC_PFMP_ref_(a.Eleve));
    if(!(eid>0))return;

    if(!byEleve[eid])byEleve[eid]=[];
    byEleve[eid].push(a);
  });

  var pp=EUC_V155_professeursPrincipaux_(classeId);

  var lignes=eleves.map(function(e){
    var eid=Number(e.id);
    var d=(byEleve[eid]||[]).slice().sort(function(a,b){
      return Number(b.id)-Number(a.id);
    })[0]||null;

    var statut=EUC_V155_statutLibelle_(d);

    return {
      eleveId:eid,
      nom:EUC_V155_txt_(e.Nom),
      prenom:EUC_V155_txt_(e.Prenom_usage||e.Prenom),
      classe:EUC_V154_classeNom_(classe),

      conventionId:d?Number(d.id):0,
      numero:d?EUC_ADMIN_WORKFLOW_numeroV144_(d):'',
      statutCode:statut.code,
      statut:statut.libelle,

      entreprise:d?EUC_V155_txt_(d.Entreprise_raison_sociale):'',
      adresseEntreprise:EUC_V155_adresseEntreprise_(d),
      contactEntreprise:EUC_V155_contactEntreprise_(d),

      professeurPrincipal:pp.map(function(x){return x.nom;}).join(' / '),
      professeurTelephone:'',
      professeurVisiteur:''
    };
  }).sort(function(a,b){
    var n=a.nom.localeCompare(b.nom,'fr');
    return n!==0?n:a.prenom.localeCompare(b.prenom,'fr');
  });

  var stats={
    total:lignes.length,
    avecConvention:lignes.filter(function(x){return x.conventionId>0 && x.statutCode!=='SUPPRIMEE';}).length,
    sansConvention:lignes.filter(function(x){return !x.conventionId;}).length,
    annulees:lignes.filter(function(x){return x.statutCode==='ANNULEE';}).length,
    interrompues:lignes.filter(function(x){return x.statutCode==='INTERROMPUE';}).length
  };

  return {
    version:EUC_SUIVI_DETAIL_V155_,
    annee:codeAnnee,
    classe:{
      id:classeId,
      nom:EUC_V154_classeNom_(classe),
      categorie:EUC_V154_cat_(classe)
    },
    periodes:periodes,
    periode:periode,
    professeursPrincipaux:pp,
    lignes:lignes,
    stats:stats
  };
}

function EUC_SUIVI_CLASSE_afficherV155(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();

  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V155_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;

  if(classeId<=0)throw new Error('Classe manquante.');

  var detail=EUC_SUIVI_CLASSE_detailV156(annee,classeId,periodeId);

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail');
  tpl.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);

  return tpl.evaluate()
    .setTitle('Suivi PFMP — '+detail.classe.nom)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function DIAGNOSTIC_DEV155_CLASSE(classeId){
  var ctx=EUC_PFMP_contexteAnneeV148();
  var d=EUC_SUIVI_CLASSE_detailV155(ctx.active,classeId,0);

  console.log('=== DEV.155 — DETAIL CLASSE ===');
  console.log('Année : '+d.annee);
  console.log('Classe : '+d.classe.nom);
  console.log('Périodes : '+d.periodes.length);
  console.log('Élèves : '+d.stats.total);
  console.log('Avec convention : '+d.stats.avecConvention);

  return d;
}


function EUC_PFMP_contexteAnneeLectureV155_(){
  // EUC_DEV395_CONTEXT_CACHE_BEGIN
  var __t=Date.now();
  try{
    var cached=EUC_DEV395_getCachedContext_();
    if(cached){
      return cached;
    }

    var value=
      EUC_DEV394_BASE_EUC_PFMP_contexteAnneeLectureV155_
        .apply(this,arguments);

    return EUC_DEV395_putCachedContext_(value);
  } finally {
    EUC_DEV394_mark_(
      'EUC_PFMP_contexteAnneeLectureV155_',
      Date.now()-__t
    );
  }
  // EUC_DEV395_CONTEXT_CACHE_END
}
