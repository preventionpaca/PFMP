/** PFMP DEV455 — vues de classe rapides, atomiques et exhaustives. */
var EUC_DEV455_VERSION_='1.0.0-dev.455';
var EUC_DEV455_PUBLIC_DEPLOYMENT_='AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA';
var EUC_DEV455_PUBLIC_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/'+EUC_DEV455_PUBLIC_DEPLOYMENT_+'/exec';
var EUC_DEV455_ASSIGN_TABLE_='EUC_AFFECTATIONS_SUIVI_PFMP';

function EUC_DEV455_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV455_ref_(v){if(Array.isArray(v)){for(var i=0;i<v.length;i++){var n=Number(v[i]);if(n)return n;}}return Number(v)||0;}
function EUC_DEV455_assignmentRevision_(){
  try{
    if(typeof EUC_DEV457_revision_==='function')return EUC_DEV455_t_(EUC_DEV457_revision_(EUC_DEV455_ASSIGN_TABLE_));
  }catch(e){}
  return'';
}
function EUC_DEV455_assignmentType_(v){
  var s=EUC_DEV455_t_(v).toUpperCase();
  if(s.indexOf('TELEPHONE')>=0)return'TELEPHONE';
  if(s.indexOf('VISITE')>=0)return'VISITE';
  return'';
}
function EUC_DEV455_assignmentRows_(annee,classe,periode){
  try{
    var rows=[];
    if(typeof EUC_DEV448_rows_==='function'){
      rows=EUC_DEV448_rows_(EUC_DEV455_ASSIGN_TABLE_,{
        Annee_scolaire:[annee],Classe:[Number(classe)],Periode:[Number(periode)],Actif:[true]
      })||[];
    }else if(typeof EUC_DEV190G_fastRecords_==='function'){
      rows=(EUC_DEV190G_fastRecords_(EUC_DEV455_ASSIGN_TABLE_,{
        Annee_scolaire:[annee],Classe:[Number(classe)],Periode:[Number(periode)],Actif:[true]
      })||[]).map(function(r){
        var x={id:Number(r.id)||0},f=r.fields||r||{};
        Object.keys(f).forEach(function(k){x[k]=f[k];});return x;
      });
    }else return null;
    return rows.filter(function(r){
      return r.Actif!==false&&EUC_DEV455_t_(r.Annee_scolaire)===annee&&
        EUC_DEV455_ref_(r.Classe)===Number(classe)&&EUC_DEV455_ref_(r.Periode)===Number(periode);
    });
  }catch(e){return null;}
}
/* DEV469 — une affectation réussie est déjà durable dans Grist. Le détail
 * de classe pouvait toutefois rester six heures dans CacheService et
 * réafficher l'ancien professeur après un aller-retour entre deux classes.
 * La révision de la table change à chaque écriture DEV457 : tant qu'elle est
 * identique, aucun appel n'est ajouté ; lorsqu'elle change, une seule lecture
 * ciblée classe/période réconcilie les deux colonnes et remplace le cache. */
function EUC_DEV455_refreshAssignments_(detail,annee,classe,periode){
  detail=detail||{};
  var revision=EUC_DEV455_assignmentRevision_();
  if(revision&&EUC_DEV455_t_(detail.__dev455AssignmentRevision)===revision)return detail;
  var rows=EUC_DEV455_assignmentRows_(annee,classe,periode);
  if(rows===null)return detail;
  var newest={};
  rows.forEach(function(r){
    var eid=EUC_DEV455_ref_(r.Eleve),type=EUC_DEV455_assignmentType_(r.Type_suivi),key=eid+'|'+type;
    if(!eid||!type)return;
    if(!newest[key]||Number(r.id||0)>Number(newest[key].id||0))newest[key]=r;
  });
  (detail.lignes||[]).forEach(function(x){
    var eid=Number(x.eleveId)||0,tel=newest[eid+'|TELEPHONE'],vis=newest[eid+'|VISITE'];
    x.professeurTelephone=tel?EUC_DEV455_t_(tel.Nom_professeur_snapshot):'';
    x.professeurTelephoneId=tel?EUC_DEV455_ref_(tel.Professeur):0;
    x.affectationTelephoneId=tel?Number(tel.id)||0:0;
    x.professeurVisiteur=vis?EUC_DEV455_t_(vis.Nom_professeur_snapshot):'';
    x.professeurVisiteurId=vis?EUC_DEV455_ref_(vis.Professeur):0;
    x.affectationVisiteId=vis?Number(vis.id)||0:0;
  });
  detail.__dev455AssignmentRevision=revision||('lu_'+new Date().toISOString());
  return detail;
}
function EUC_DEV455_rosterKey_(annee,classe){return 'DEV455_ROSTER_'+EUC_DEV455_t_(annee)+'_'+(Number(classe)||0);}
function EUC_DEV455_currentRoster_(annee,classe){
  var cache=CacheService.getScriptCache(),key=EUC_DEV455_rosterKey_(annee,classe),raw='';
  try{raw=cache.get(key)||'';}catch(e){}
  if(raw){try{return JSON.parse(raw)||[];}catch(e2){}}
  var rows=[];
  if(typeof EUC_DEV190G_fastRecords_==='function'){
    rows=EUC_DEV190G_fastRecords_('EUC_ELEVES_PFMP',{Classe:[Number(classe)||0]})||[];
  }
  var out=rows.map(function(r){var f=r.fields||r;return{id:Number(r.id||f.id)||0,fields:f};}).filter(function(r){
    var f=r.fields;if(f.Actif===false||f.Present_dernier_import===false)return false;
    if(EUC_DEV455_t_(f.Statut_scolarite).toUpperCase()==='SORTI')return false;
    return EUC_DEV455_ref_(f.Classe)===Number(classe);
  }).map(function(r){var f=r.fields;return{eleveId:r.id,nom:EUC_DEV455_t_(f.Nom),prenom:EUC_DEV455_t_(f.Prenom_usage||f.Prenom)};});
  try{cache.put(key,JSON.stringify(out),21600);}catch(e3){}
  return out;
}
function EUC_DEV455_principaux_(classe){
  classe=Number(classe)||0;if(!classe)return[];
  var cache=CacheService.getScriptCache(),key='DEV455_PP_'+classe,raw='';
  try{raw=cache.get(key)||'';}catch(e){}
  if(raw){try{return JSON.parse(raw)||[];}catch(e2){}}
  var out=[];
  try{
    if(typeof EUC_DEV190G_fastRecords_!=='function'||typeof EUC_DEV448_professeurs_!=='function')return out;
    var links=EUC_DEV190G_fastRecords_('EUC_CLASSES_PROFESSEURS_PFMP',{Classe:[classe]})||[];
    var profs=EUC_DEV448_professeurs_()||[],by={};
    profs.forEach(function(p){by[Number(p.id)||0]=p;});
    links.forEach(function(r){
      var f=r.fields||r;if(f.Actif===false||EUC_DEV455_t_(f.Role)!=='PROFESSEUR_PRINCIPAL')return;
      var p=by[EUC_DEV455_ref_(f.Professeur)];if(!p)return;
      out.push({id:Number(p.id)||0,nom:EUC_DEV455_t_(p.nom),email:EUC_DEV455_t_(p.email)});
    });
    out=out.filter(function(p){return p.id&&p.nom;});
    try{cache.put(key,JSON.stringify(out),1800);}catch(e3){}
  }catch(e4){out=[];}
  return out;
}
function EUC_DEV455_mergeRoster_(detail,annee,classe){
  var roster=EUC_DEV455_currentRoster_(annee,classe);if(!roster.length)return detail;
  var existing={};(detail.lignes||[]).forEach(function(x){existing[Number(x.eleveId)||0]=x;});
  var pp='';(detail.lignes||[]).some(function(x){pp=EUC_DEV455_t_(x.professeurPrincipal);return !!pp;});
  var principaux=Array.isArray(detail.professeursPrincipaux)?detail.professeursPrincipaux:[];
  if(!pp&&principaux.length)pp=principaux.map(function(p){return EUC_DEV455_t_(p.nom);}).filter(Boolean).join(' / ');
  if(!pp){principaux=EUC_DEV455_principaux_(classe);pp=principaux.map(function(p){return EUC_DEV455_t_(p.nom);}).filter(Boolean).join(' / ');}
  if(principaux.length)detail.professeursPrincipaux=principaux;
  detail.lignes=roster.map(function(e){
    var x=existing[e.eleveId]||{eleveId:e.eleveId,nom:e.nom,prenom:e.prenom,classe:EUC_DEV455_t_(detail.classe&&detail.classe.nom),professeurPrincipal:pp,professeurTelephone:'',professeurVisiteur:'',statut:'Sans convention',statutCode:'SANS_CONVENTION'};
    x.nom=e.nom||x.nom;x.prenom=e.prenom||x.prenom;if(!EUC_DEV455_t_(x.professeurPrincipal))x.professeurPrincipal=pp;return x;
  }).sort(function(a,b){return EUC_DEV455_t_(a.nom).localeCompare(EUC_DEV455_t_(b.nom),'fr')||EUC_DEV455_t_(a.prenom).localeCompare(EUC_DEV455_t_(b.prenom),'fr');});
  try{
    if(typeof EUC_DEV422_quickFromDetail_==='function'){
      var q=EUC_DEV422_quickFromDetail_(detail);detail.stats=detail.stats||{};
      detail.stats.total=q.total;detail.stats.apprentis=q.apprentis.length;detail.stats.avecConvention=q.avec.length;
      detail.stats.sansConvention=q.sans.length;detail.stats.annulees=q.annuleesInterrompues.length;
    }
  }catch(eStats){}
  detail.__dev455RosterVerified=true;return detail;
}
/* DEV537 — un détail marqué a déjà été construit depuis l'effectif courant.
 * Le relire à chaque ouverture ajoutait un appel Grist inutile (et plusieurs
 * secondes sur une instance froide). Les anciens détails, dépourvus du
 * marqueur, conservent la réconciliation complète ci-dessus. Les imports et
 * mutations d'effectif invalident toujours les caches/snapshots concernés. */
function EUC_DEV537_verifiedRoster_(detail,annee,classe){
  return detail&&detail.__dev455RosterVerified===true
    ?detail
    :EUC_DEV455_mergeRoster_(detail,annee,classe);
}
function EUC_DEV455_buildTargeted_(annee,famille,classe,periode){
  if((typeof EUC_DEV456_familyData_!=='function'&&typeof EUC_DEV421_fastFamilySnapshot_!=='function')||
     typeof EUC_DEV422_batchSources_!=='function'||
     typeof EUC_DEV422_enrichDetailBatch_!=='function')return null;
  var family=typeof EUC_DEV456_familyData_==='function'
    ?{ready:true,payload:EUC_DEV456_familyData_(annee,famille)}
    :EUC_DEV421_fastFamilySnapshot_({annee:annee,famille:famille});
  var data=family&&family.payload;if(!data||!Array.isArray(data.classes))return null;
  var card=null;
  data.classes.some(function(c){
    if(Number(c.classeId||c.id)!==Number(classe))return false;card=c;return true;
  });
  if(!card)return null;
  var periodCard=null,periods=(card.periodes||[]).map(function(p){
    var x={};Object.keys(p||{}).forEach(function(k){x[k]=p[k];});
    x.id=Number(p.id||p.periodeId)||0;x.libelle=EUC_DEV455_t_(p.libelle||p.nom||p.periode)||'Période';
    if(x.id===Number(periode))periodCard=x;return x;
  });
  if(!periodCard)return null;
  var roster=EUC_DEV455_currentRoster_(annee,classe),className=EUC_DEV455_t_(card.classe||card.nom||card.classeNom);
  var principaux=EUC_DEV455_principaux_(classe);
  var pp=EUC_DEV455_t_(card.professeurPrincipal||card.professeur_principal||card.pp)||principaux.map(function(p){return EUC_DEV455_t_(p.nom);}).filter(Boolean).join(' / ');
  var detail={
    annee:annee,famille:famille,classe:{id:Number(classe),nom:className},
    periode:periodCard,periodes:periods,professeursPrincipaux:principaux,
    lignes:roster.map(function(e){return{
      eleveId:e.eleveId,nom:e.nom,prenom:e.prenom,classe:className,
      professeurPrincipal:pp,professeurTelephone:'',professeurVisiteur:'',
      statut:'Sans convention',statutCode:'SANS_CONVENTION'
    };}),stats:{total:roster.length}
  };
  var classIds={};classIds[String(Number(classe))]=card;
  detail=EUC_DEV422_enrichDetailBatch_(detail,annee,famille,Number(classe),Number(periode),EUC_DEV422_batchSources_(annee,classIds),periodCard)||detail;
  detail.__dev425Revision=data.__dev425Revision||'';
  /* Le roster vient d'être lu pour cette classe : il est autonome jusqu'à la
   * prochaine invalidation d'effectif et peut être servi sans seconde lecture. */
  detail.__dev455RosterVerified=true;
  detail.__dev455Targeted=true;detail.__dev455BuiltAt=Date.now();
  if(typeof EUC_DEV534_compactDetail_==='function')detail=EUC_DEV534_compactDetail_(detail);
  return detail;
}
function EUC_DEV455_readLegacyTargeted_(annee,classe,periode){
  if(typeof EUC_DEV190G_snapshotDetail!=='function')return null;
  try{
    var r=EUC_DEV190G_snapshotDetail({annee:annee,classe:Number(classe),periode:Number(periode)});
    if(r&&r.exists&&r.detail&&Array.isArray(r.detail.lignes)){
      r.detail.__dev455Targeted=true;r.detail.__dev455BuiltAt=Date.now();
      return r.detail;
    }
  }catch(e){}
  return null;
}
function EUC_DEV455_isPdif_(period){
  try{
    if(typeof EUC_DEV387_isPdifPeriod_==='function')return EUC_DEV387_isPdifPeriod_(period||{});
  }catch(e){}
  return /P[\.\s-]*DIF|PARCOURS\s+DIFFERENCIE/i.test(EUC_DEV455_t_(period&&(period.libelle||period.nom)));
}

/* Le choix de fin d'année ne devient jamais un statut général. PFMP n°1 et
 * PFMP n°2 conservent tous les élèves et n'affichent aucun badge P.dif. La
 * valeur modeFinTerminale reste disponible pour prolonger la convention de
 * PFMP n°2 et pour alimenter la vue P.dif. dédiée. */
function EUC_DEV455_sanitizePeriod_(detail){
  detail=detail||{};
  if(EUC_DEV455_isPdif_(detail.periode||{})){
    if(detail.__dev456PdifDetail!==true&&typeof EUC_DEV285B_enrichDetail_==='function'){
      try{detail=EUC_DEV285B_enrichDetail_(detail,detail.annee)||detail;}catch(ePdif){}
    }
    detail.__dev456PdifDetail=true;
    return detail;
  }
  (detail.lignes||[]).forEach(function(x){x.parcoursDifferencie=false;});
  detail.stats=detail.stats||{};
  detail.stats.parcoursDifferencies=0;
  detail.__dev455OrdinaryPeriod=true;
  return detail;
}

/* L'ancienne route téléchargeait toute la table historique de détails. Le chemin normal tient dans
 * CacheService. Après éviction du cache, une seule lecture ciblée DEV427 est
 * autorisée et sa révision doit être READY. */
function EUC_DEV455_fastDetail_(annee,famille,classe,periode){
  annee=EUC_DEV455_t_(annee);famille=EUC_DEV455_t_(famille).toUpperCase()||'BACPRO';
  classe=Number(classe)||0;periode=Number(periode)||0;
  if(!annee||!classe||!periode)throw new Error('Classe, période ou année manquante.');
  var started=Date.now(),key=EUC_DEV416_key_(annee,famille,classe,periode);
  var detail=EUC_DEV416_cacheGet_(key);
  var cacheFresh=!!detail;
  if(detail&&detail.__dev455Targeted===true){
    cacheFresh=Date.now()-Number(detail.__dev455BuiltAt||0)<300000;
  }else if(detail&&typeof EUC_DEV425_payloadFresh_==='function'){
    try{cacheFresh=EUC_DEV425_payloadFresh_(annee,famille,detail);}catch(eFresh){cacheFresh=false;}
  }
  if(detail&&cacheFresh){
    detail=EUC_DEV455_sanitizePeriod_(EUC_DEV537_verifiedRoster_(detail,annee,classe));
    var assignmentRevisionBefore=EUC_DEV455_t_(detail.__dev455AssignmentRevision);
    detail=EUC_DEV455_refreshAssignments_(detail,annee,classe,periode);
    if(EUC_DEV455_t_(detail.__dev455AssignmentRevision)!==assignmentRevisionBefore)EUC_DEV416_cachePut_(key,detail);
    detail.__dev455Source='CACHE_VERIFIE';detail.__dev455DurationMs=Date.now()-started;
    return detail;
  }
  if(detail&&!cacheFresh)EUC_DEV416_cacheDrop_(key);
  if(typeof EUC_DEV427_readDetail_==='function'){
    detail=EUC_DEV427_readDetail_(annee,famille,classe,periode,false);
  }
  if(!detail)detail=EUC_DEV455_readLegacyTargeted_(annee,classe,periode);
  if(!detail&&typeof EUC_DEV455_buildTargeted_==='function'){
    detail=EUC_DEV455_buildTargeted_(annee,famille,classe,periode);
  }
  if(!detail||!Array.isArray(detail.lignes)){
    var err=new Error('Les informations de cette classe sont en cours de mise à jour.');
    err.code='DEV455_REFRESHING';throw err;
  }
  detail=EUC_DEV455_sanitizePeriod_(EUC_DEV537_verifiedRoster_(detail,annee,classe));
  detail=EUC_DEV455_refreshAssignments_(detail,annee,classe,periode);
  detail.__dev455Source='SNAPSHOT_CIBLE_VERIFIE';detail.__dev455DurationMs=Date.now()-started;
  EUC_DEV416_cachePut_(key,detail);
  return detail;
}

function EUC_DEV455_params_(e){
  var p=e&&e.parameter||{},annee=EUC_DEV455_t_(p.annee),famille=EUC_DEV455_t_(p.famille).toUpperCase()||'BACPRO';
  if(!annee){try{annee=EUC_DEV455_t_(EUC_PFMP_contexteAnneeLectureV155_().active);}catch(ignore){}}
  return {annee:annee,famille:famille,classe:Number(p.classe)||0,periode:Number(p.periode)||0};
}
function EUC_DEV455_publicRuntime_(){
  try{return EUC_DEV455_t_(ScriptApp.getService().getUrl()).indexOf(EUC_DEV455_PUBLIC_DEPLOYMENT_)>=0;}
  catch(e){return false;}
}
function EUC_DEV455_refreshing_(isPublic,p){
  var base=isPublic?EUC_DEV455_PUBLIC_URL_:(typeof EUC_DEV459_ADMIN_URL_!=='undefined'?EUC_DEV459_ADMIN_URL_:ScriptApp.getService().getUrl());
  var url=base+'?page='+(isPublic?'suivi-pfmp-classe-public':'suivi-pfmp-classe')+
    '&annee='+encodeURIComponent(p.annee)+'&famille='+encodeURIComponent(p.famille)+
    '&classe='+encodeURIComponent(p.classe)+'&periode='+encodeURIComponent(p.periode);
  return HtmlService.createHtmlOutput('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="3;url='+url.replace(/&/g,'&amp;')+'"><style>body{font:16px Arial;background:#f5fbf8;color:#173b34;margin:0}.b{max-width:760px;margin:12vh auto;background:#fff;border:1px solid #bfe1d8;border-radius:16px;padding:28px}.s{display:inline-block;width:18px;height:18px;border:3px solid #bfe1d8;border-top-color:#07856f;border-radius:50%;animation:r .8s linear infinite;vertical-align:middle;margin-right:10px}@keyframes r{to{transform:rotate(360deg)}}</style></head><body><div class="b"><h2><span class="s"></span>Mise à jour en cours</h2><p>La liste complète est en cours de publication. La page se recharge automatiquement sans afficher d’anciennes données.</p></div></body></html>')
    .setTitle('Mise à jour du suivi PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV455_publicDetail(e){
  var p=EUC_DEV455_params_(e),detail;
  try{detail=EUC_DEV455_fastDetail_(p.annee,p.famille,p.classe,p.periode);}
  catch(err){if(err&&err.code==='DEV455_REFRESHING')return EUC_DEV455_refreshing_(true,p);throw err;}
  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Public_DEV455');
  t.paramsJson=JSON.stringify(p);t.detailJson=JSON.stringify(detail);t.baseUrl=EUC_DEV455_PUBLIC_URL_;
  return t.evaluate().setTitle('Suivi des PFMP — consultation').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV455_adminDetail(e){
  var p=EUC_DEV455_params_(e),detail;
  try{detail=EUC_DEV455_fastDetail_(p.annee,p.famille,p.classe,p.periode);}
  catch(err){if(err&&err.code==='DEV455_REFRESHING')return EUC_DEV455_refreshing_(false,p);throw err;}
  try{detail.peutModifier=!!EUC_V156_contexteAdmin_();}catch(eAdmin){detail.peutModifier=false;}
  detail.professeursDisponibles=[];detail.professeursDisponiblesCharges=false;
  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  t.config=JSON.stringify({baseUrl:typeof EUC_DEV459_ADMIN_URL_!=='undefined'?EUC_DEV459_ADMIN_URL_:ScriptApp.getService().getUrl(),readonly:false,publicMode:false});
  t.anneeContextJson=JSON.stringify({active:p.annee,annees:[{code:p.annee,libelle:p.annee}]});
  t.detailJson=JSON.stringify(detail);
  var jump=[];
  try{
    if(typeof EUC_DEV456_jump_==='function'){
      jump=EUC_DEV456_jump_(detail,p)||[];
    }else if(typeof EUC_DEV333_nav==='function'){
      var jr=EUC_DEV333_nav(p)||{};
      jump=(jr.items||[]).map(function(x){return{
        id:Number(x.classeId)||0,nom:EUC_DEV455_t_(x.classe),classe:EUC_DEV455_t_(x.classe),
        label:EUC_DEV455_t_(x.classe),famille:EUC_DEV455_t_(jr.famille||p.famille),
        periode:Number(x.periodeId)||0,current:!!x.current
      };});
    }
  }catch(eJump){}
  t.jumpClassesJson=JSON.stringify(jump);
  t.dev186BreadcrumbHtml=typeof EUC_DEV186_breadcrumbHtml_==='function'?EUC_DEV186_breadcrumbHtml_(detail,p.annee):'';
  return t.evaluate().setTitle('Suivi PFMP — '+((detail.classe&&detail.classe.nom)||'Classe')).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV455_routeDetail_(e){
  var page=EUC_DEV455_t_(e&&e.parameter&&e.parameter.page);
  if(page==='dossier-apprentissage-pfmp'&&typeof EUC_DEV464_afficherDossierApprentissage==='function')return EUC_DEV464_afficherDossierApprentissage(e);
  /* DEV508 : ce routeur est le tout premier appelé par doGet. La vue famille
   * d'administration doit donc déléguer ici à la coque asynchrone DEV504 ;
   * la délégation plus basse dans EDT n'est jamais atteinte. Cela évite qu'une
   * recette incomplète bloque le rendu initial pendant une lecture Grist. */
  if(page==='suivi-conventions-famille'&&typeof EUC_DEV339_afficherFamille==='function')return EUC_DEV339_afficherFamille(e);
  if(page==='suivi-conventions-famille'&&typeof EUC_DEV459_family_==='function')return EUC_DEV459_family_(e,false);
  if(page==='suivi-conventions-public-famille'&&typeof EUC_DEV508_afficherFamillePublique_==='function')return EUC_DEV508_afficherFamillePublique_(e);
  if(page==='suivi-conventions-public-famille'&&typeof EUC_DEV459_family_==='function')return EUC_DEV459_family_(e,true);
  if(page==='suivi-conventions-public-famille'&&typeof EUC_DEV456_publicFamily==='function')return EUC_DEV456_publicFamily(e);
  if(page==='suivi-pfmp-classe-public')return typeof EUC_DEV459_detail_==='function'?EUC_DEV459_detail_(e,true):(typeof EUC_DEV456_publicDetail==='function'?EUC_DEV456_publicDetail(e):EUC_DEV455_publicDetail(e));
  /* La route demandée décide du mode. Deux déploiements d'un même projet
     Apps Script peuvent renvoyer la même URL de service ; l'inférer via
     ScriptApp.getService() envoyait parfois l'administration en lecture seule. */
  if(page==='suivi-pfmp-classe')return typeof EUC_DEV459_detail_==='function'?EUC_DEV459_detail_(e,false):EUC_DEV455_adminDetail(e);
  return null;
}
