/** PFMP DEV459 — vues canoniques, explicites et transversales. */
var EUC_DEV459_VERSION_='1.0.0-dev.516';
var EUC_DEV459_CANONICAL_='DEV516-C8';
var EUC_DEV459_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec';

function EUC_DEV459_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV459_n_(v){return Number(v)||0;}
function EUC_DEV459_clone_(v){return JSON.parse(JSON.stringify(v==null?{}:v));}
function EUC_DEV459_isPdif_(p){
  try{if(typeof EUC_DEV387_isPdifPeriod_==='function')return !!EUC_DEV387_isPdifPeriod_(p||{});}catch(e){}
  return /P[.\s-]*DIF|PARCOURS\s+DIFFERENCIE/i.test(EUC_DEV459_t_(p&&(p.libelle||p.nom||p.v50Slot||p.v51Slot)));
}
function EUC_DEV459_periodKey_(c,p){return EUC_DEV459_n_(c&&(c.classeId||c.id))+'|'+EUC_DEV459_n_(p&&(p.id||p.periodeId));}
function EUC_DEV459_quickFromPeriod_(c,p){
  var q=EUC_DEV459_clone_(p&&p.quick||{}),isPdif=EUC_DEV459_isPdif_(p);
  q.ok=true;q.source='dev459-canonical';q.isPdif=isPdif;
  q.classe=EUC_DEV459_t_(c&&(c.classe||c.nom));q.periode=EUC_DEV459_t_(p&&(p.libelle||p.nom||p.v50Slot||p.v51Slot))||'Période';
  ['avec','sans','apprentis','situations','annuleesInterrompues','lycee','entreprise','indefini'].forEach(function(k){if(!Array.isArray(q[k]))q[k]=[];});
  if(isPdif){
    q.total=q.lycee.length+q.entreprise.length+q.indefini.length;
  }else{
    q.total=EUC_DEV459_n_(p&&p.effectifTotal)||EUC_DEV459_n_(q.total)||Math.max(0,EUC_DEV459_n_(p&&p.total)+EUC_DEV459_n_(p&&p.apprentis));
    q.couverts=EUC_DEV459_n_(p&&p.couverts)||EUC_DEV459_n_(q.couverts)||q.avec.length+q.apprentis.length+EUC_DEV459_n_(q.situationsCouvertes);
    q.scolairesAttendus=Math.max(0,q.total-q.apprentis.length);
    q.sansConvention=q.sans.length;
  }
  return q;
}
function EUC_DEV459_applyCanonicalQuick_(c,p,q){
  q=q||EUC_DEV459_quickFromPeriod_(c,p);q.source='dev459-canonical';
  if(typeof EUC_DEV426_applyQuick_==='function')EUC_DEV426_applyQuick_(p,q);
  else{
    p.quick=q;p.__detailSnapshotVerified=true;
    if(!q.isPdif){p.effectifTotal=q.total;p.apprentis=q.apprentis.length;p.total=Math.max(0,q.total-q.apprentis.length);p.conventions=q.avec.length;p.situationsAdministratives=EUC_DEV459_n_(q.situationsCouvertes);p.manquantes=q.sans.length;p.sansConvention=q.sans.length;p.couverts=q.couverts;}
  }
  p.quick=q;return q;
}
function EUC_DEV459_mergeQuickSources_(c,p,detailQuick,roster){
  var old=EUC_DEV459_clone_(p.quick||{}),q=EUC_DEV459_clone_(old),isPdif=EUC_DEV459_isPdif_(p),seen={};
  q.ok=true;q.source='dev459-canonical-merged';q.isPdif=isPdif;q.classe=EUC_DEV459_t_(c&&(c.classe||c.nom));q.periode=EUC_DEV459_t_(p&&(p.libelle||p.nom))||'Période';
  function merge(k){var out=[];[old[k]||[],detailQuick&&detailQuick[k]||[]].forEach(function(a){a.forEach(function(v){v=EUC_DEV459_t_(v);if(v&&!seen[k+'|'+v]){seen[k+'|'+v]=1;out.push(v);}});});return out;}
  ['avec','sans','apprentis','situations','annuleesInterrompues','lycee','entreprise','indefini'].forEach(function(k){q[k]=merge(k);});
  if(isPdif){q.total=q.lycee.length+q.entreprise.length+q.indefini.length;return q;}
  var targetApps=Math.max(EUC_DEV459_n_(p.apprentis),q.apprentis.length),targetAvec=Math.max(EUC_DEV459_n_(p.conventions),q.avec.length),targetSituations=Math.max(EUC_DEV459_n_(p.situationsAdministratives),EUC_DEV459_n_(q.situationsCouvertes));
  var categories={};['apprentis','avec','annuleesInterrompues','sans'].forEach(function(k){q[k]=q[k].filter(function(n){if(categories[n])return false;categories[n]=k;return true;});});
  (roster||[]).forEach(function(s){var n=EUC_DEV459_t_(s.label||([s.nom,s.prenom].filter(Boolean).join(' ')));if(n&&!categories[n]){q.sans.push(n);categories[n]='sans';}});
  function promote(to,target){while(q[to].length<target&&q.sans.length){var n=q.sans.shift();q[to].push(n);categories[n]=to;}}
  promote('apprentis',targetApps);promote('avec',targetAvec);
  q.total=(roster&&roster.length)||EUC_DEV459_n_(p.effectifTotal)||EUC_DEV459_n_(old.total)||q.avec.length+q.sans.length+q.apprentis.length+q.annuleesInterrompues.length;
  q.situationsCouvertes=targetSituations;q.couverts=Math.min(q.total,q.avec.length+q.apprentis.length+targetSituations);q.scolairesAttendus=Math.max(0,q.total-q.apprentis.length);q.sansConvention=q.sans.length;
  ['avec','sans','apprentis','situations','annuleesInterrompues'].forEach(function(k){q[k].sort(function(a,b){return a.localeCompare(b,'fr');});});return q;
}
function EUC_DEV459_mergePreparedRoster_(detail,roster){
  roster=roster||[];if(!roster.length)return detail;
  var byId={};(detail.lignes||[]).forEach(function(x){byId[EUC_DEV459_n_(x.eleveId)]=x;});
  var pp='';(detail.lignes||[]).some(function(x){pp=EUC_DEV459_t_(x.professeurPrincipal);return !!pp;});
  detail.lignes=roster.map(function(s){
    var x=byId[EUC_DEV459_n_(s.eleveId)]||{eleveId:EUC_DEV459_n_(s.eleveId),nom:EUC_DEV459_t_(s.nom),prenom:EUC_DEV459_t_(s.prenom),statut:'Sans convention',statutCode:'SANS_CONVENTION',professeurPrincipal:pp,professeurTelephone:'',professeurVisiteur:''};
    x.nom=EUC_DEV459_t_(s.nom)||x.nom;x.prenom=EUC_DEV459_t_(s.prenom)||x.prenom;return x;
  });
  return detail;
}
function EUC_DEV459_familyData_(annee,famille){
  annee=EUC_DEV459_t_(annee);famille=EUC_DEV459_t_(famille).toUpperCase()||'BACPRO';
  var data=EUC_DEV456_familyData_(annee,famille);
  if(data&&data.__dev459Canonical===EUC_DEV459_CANONICAL_&&(
    typeof EUC_DEV425_payloadFresh_!=='function'||
    EUC_DEV425_payloadFresh_(annee,famille,data)
  ))return data;
  if(data&&data.__dev459Canonical===EUC_DEV459_CANONICAL_){
    try{EUC_DEV456_familyCacheDrop_(annee,famille);}catch(eStale){}
    data=EUC_DEV456_familyData_(annee,famille);
  }
  if(data&&data.__dev459Canonical){try{EUC_DEV456_familyCacheDrop_(annee,famille);data=EUC_DEV456_familyData_(annee,famille);}catch(eReset){}}
  data=EUC_DEV459_clone_(data||{classes:[]});
  var details={},rosters=null,batch=null,classIds={};
  try{if(typeof EUC_DEV427_rawDetailMap_==='function')details=EUC_DEV427_rawDetailMap_(annee,famille)||{};}catch(eDetails){details={};}
  try{if(typeof EUC_DEV456_rosters_==='function')rosters=EUC_DEV456_rosters_(annee);}catch(eRoster){rosters=null;}
  (data.classes||[]).forEach(function(c){var cid=EUC_DEV459_n_(c.classeId||c.id);if(cid)classIds[String(cid)]=c;});
  /* Les anciens snapshots familiaux peuvent avoir conservé l'effectif mais
   * perdu les statuts convention/apprenti. Une seule lecture groupée des
   * conventions, apprentissages et affectations reconstruit alors tous les
   * détails de la famille ; aucun appel Grist n'est effectué par classe. */
  try{if(typeof EUC_DEV422_batchSources_==='function')batch=EUC_DEV422_batchSources_(annee,classIds);}catch(eBatch){batch=null;}
  if(rosters){
    try{var rosterCache=CacheService.getScriptCache();Object.keys(rosters).forEach(function(cid){rosterCache.put(EUC_DEV455_rosterKey_(annee,cid),JSON.stringify(rosters[cid]),21600);});}catch(ePrime){}
  }
  (data.classes||[]).forEach(function(c){
    (c.periodes||[]).forEach(function(p){
      var cid=EUC_DEV459_n_(c.classeId||c.id),pid=EUC_DEV459_n_(p.id||p.periodeId);
      var detail=details[EUC_DEV459_periodKey_(c,p)],q=null;
      detail=EUC_DEV459_clone_(detail&&Array.isArray(detail.lignes)?detail:{
        annee:annee,famille:famille,classe:{id:cid,nom:EUC_DEV459_t_(c.classe||c.nom)},periode:p,lignes:[]
      });
      detail.classe=detail.classe||{id:cid,nom:EUC_DEV459_t_(c.classe||c.nom)};
      detail.periode=Object.assign({},p,detail.periode||{});
      detail=EUC_DEV459_mergePreparedRoster_(detail,rosters&&rosters[String(cid)]||[]);
      if(batch&&typeof EUC_DEV422_enrichDetailBatch_==='function'){
        try{detail=EUC_DEV422_enrichDetailBatch_(detail,annee,famille,cid,pid,batch,p)||detail;}catch(eEnrich){}
      }
      if(!EUC_DEV459_isPdif_(p))(detail.lignes||[]).forEach(function(x){x.parcoursDifferencie=false;});
      /* La synthese et la fiche de classe doivent partager le meme detail
       * enrichi. Sans cette ecriture, la carte pouvait etre correcte tandis
       * que le clic rouvrait un ancien snapshot de classe reste en cache. */
      detail.__dev459CanonicalDetail=EUC_DEV459_CANONICAL_;
      try{
        if(typeof EUC_DEV416_key_==='function'&&typeof EUC_DEV416_cachePut_==='function'){
          EUC_DEV416_cachePut_(EUC_DEV416_key_(annee,famille,cid,pid),detail);
        }
      }catch(eDetailCache){}
      try{if(typeof EUC_DEV422_quickFromDetail_==='function')q=EUC_DEV422_quickFromDetail_(detail);}catch(eQuick){}
      q=EUC_DEV459_mergeQuickSources_(c,p,q,rosters&&rosters[String(EUC_DEV459_n_(c.classeId||c.id))]||[]);
      EUC_DEV459_applyCanonicalQuick_(c,p,q);
    });
  });
  if(rosters&&typeof EUC_DEV456_reconcileRosters_==='function')data=EUC_DEV456_reconcileRosters_(data,annee,rosters);
  if(rosters&&typeof EUC_DEV456_applyPdifModes_==='function')data=EUC_DEV456_applyPdifModes_(data,annee,rosters);
  (data.classes||[]).forEach(function(c){(c.periodes||[]).forEach(function(p){EUC_DEV459_applyCanonicalQuick_(c,p,p.quick||EUC_DEV459_quickFromPeriod_(c,p));});});
  data.__dev459Canonical=EUC_DEV459_CANONICAL_;data.__dev459CanonicalAt=new Date().toISOString();
  try{EUC_DEV456_familyPersistentPut_(annee,famille,data);EUC_DEV456_familyCachePut_(annee,famille,data);}catch(eStore){}
  return data;
}
function EUC_DEV459_sanitizeDetail_(detail){
  detail=EUC_DEV459_clone_(detail||{});
  if(!EUC_DEV459_isPdif_(detail.periode||{})){
    (detail.lignes||[]).forEach(function(x){x.parcoursDifferencie=false;});
    detail.stats=detail.stats||{};detail.stats.parcoursDifferencies=0;detail.__dev459OrdinaryPeriod=true;
  }
  return detail;
}
function EUC_DEV459_canonicalDetail_(p){
  var detail=EUC_DEV455_fastDetail_(p.annee,p.famille,p.classe,p.periode);
  /* Une nouvelle revision canonique invalide le contenu metier du detail,
   * sans reconstruire toute la famille sur le chemin utilisateur. */
  if(detail.__dev459CanonicalDetail!==EUC_DEV459_CANONICAL_&&typeof EUC_DEV455_buildTargeted_==='function'){
    var rebuilt=EUC_DEV455_buildTargeted_(p.annee,p.famille,p.classe,p.periode);
    if(rebuilt&&Array.isArray(rebuilt.lignes)){
      detail=rebuilt;detail.__dev459CanonicalDetail=EUC_DEV459_CANONICAL_;
      try{
        if(typeof EUC_DEV416_key_==='function'&&typeof EUC_DEV416_cachePut_==='function'){
          EUC_DEV416_cachePut_(EUC_DEV416_key_(p.annee,p.famille,p.classe,p.periode),detail);
        }
      }catch(eCache){}
    }
  }
  return EUC_DEV459_sanitizeDetail_(detail);
}
function EUC_DEV459_jump_(detail,p){
  var data=EUC_DEV459_familyData_(p.annee,p.famille),selected=0;
  (detail.periodes||[]).some(function(x,i){if(EUC_DEV459_n_(x.id||x.periodeId)===p.periode){selected=i;return true;}return false;});
  return (data.classes||[]).map(function(c){var ps=c.periodes||[],period=ps[selected]||ps[0]||{};return{id:EUC_DEV459_n_(c.classeId||c.id),nom:EUC_DEV459_t_(c.classe||c.nom),classe:EUC_DEV459_t_(c.classe||c.nom),label:EUC_DEV459_t_(c.classe||c.nom),famille:p.famille,periode:EUC_DEV459_n_(period.id||period.periodeId),current:EUC_DEV459_n_(c.classeId||c.id)===p.classe};}).filter(function(x){return x.id&&x.nom&&x.periode;});
}
function EUC_DEV459_family_(e,isPublic){
  var p=EUC_DEV455_params_(e),data=EUC_DEV459_familyData_(p.annee,p.famille),t=HtmlService.createTemplateFromFile('Suivi_Conventions_Famille_DEV459');
  t.paramsJson=JSON.stringify({annee:p.annee,famille:p.famille,publicMode:!!isPublic});t.dataJson=JSON.stringify(data);
  /* Deux déploiements partagent le même projet. ScriptApp.getService().getUrl()
   * ne permet pas de déterminer de façon fiable lequel sert la requête. */
  t.baseUrl=isPublic?EUC_DEV455_PUBLIC_URL_:EUC_DEV459_ADMIN_URL_;
  return t.evaluate().setTitle('Suivi des conventions — '+p.famille).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV459_adminBreadcrumb_(detail,p){
  var fam=EUC_DEV459_t_(p.famille).toUpperCase()||'BACPRO',fl=fam==='BACPRO'?'BAC PRO':fam;
  function esc(v){return EUC_DEV459_t_(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function url(page,extra){var q=['page='+encodeURIComponent(page),'annee='+encodeURIComponent(p.annee)];Object.keys(extra||{}).forEach(function(k){q.push(encodeURIComponent(k)+'='+encodeURIComponent(extra[k]));});return EUC_DEV459_ADMIN_URL_+'?'+q.join('&');}
  return '<nav id="EUC_DEV183_BREADCRUMB" aria-label="Fil d’Ariane">'+
    '<a target="_top" href="https://alternance.loucodi.fr/">Accueil PFMP</a><span>›</span>'+
    '<a target="_top" href="'+url('suivi-conventions',{})+'">Suivi des conventions</a><span>›</span>'+
    '<a target="_top" href="'+url('suivi-conventions-famille',{famille:fam})+'">'+esc(fl)+'</a><span>›</span>'+
    '<strong>'+esc(detail&&detail.classe&&detail.classe.nom||'Classe')+'</strong><span>›</span>'+
    '<strong>'+esc(detail&&detail.periode&&detail.periode.libelle||'Période')+'</strong></nav>';
}
function EUC_DEV459_navigationFeedback_(){
  return '<style id="EUC_DEV462_NAV_FEEDBACK">a.euc462-busy{pointer-events:none;opacity:.72}a.euc462-busy:after{content:"";display:inline-block;width:14px;height:14px;margin-left:7px;border:2px solid #b9ded6;border-top-color:#07856f;border-radius:50%;vertical-align:middle;animation:euc462spin .7s linear infinite}@keyframes euc462spin{to{transform:rotate(360deg)}}</style><script id="EUC_DEV462_NAV_FEEDBACK_JS">document.addEventListener("click",function(ev){var a=ev.target&&ev.target.closest?ev.target.closest("a[href]"):null;if(!a)return;a.classList.add("euc462-busy");a.setAttribute("aria-busy","true");},true);<\/script>';
}
function EUC_DEV505_retirerCommandesAdminPubliques_(html){
  /* Le détail public partage le tableau administratif, mais aucune commande
   * propre à l'administration ne doit rester dans son DOM. */
  return String(html||'').replace(
    /<a\b[^>]*\bid=["']missionOrders["'][^>]*>[\s\S]*?<\/a>/gi,
    ''
  );
}
function EUC_DEV459_detail_(e,isPublic){
  var p=EUC_DEV455_params_(e),detail;
  try{detail=EUC_DEV459_canonicalDetail_(p);}
  catch(err){if(err&&err.code==='DEV455_REFRESHING')return EUC_DEV455_refreshing_(!!isPublic,p);throw err;}
  detail.peutModifier=!isPublic;
  if(!isPublic){try{detail.peutModifier=!!EUC_V156_contexteAdmin_();}catch(eAdmin){detail.peutModifier=false;}}
  detail.professeursDisponibles=[];detail.professeursDisponiblesCharges=false;
  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  t.config=JSON.stringify({baseUrl:isPublic?EUC_DEV455_PUBLIC_URL_:EUC_DEV459_ADMIN_URL_,readonly:!!isPublic,publicMode:!!isPublic});
  t.anneeContextJson=JSON.stringify({active:p.annee,annees:[{code:p.annee,libelle:p.annee}]});
  t.detailJson=JSON.stringify(detail);t.jumpClassesJson=JSON.stringify(EUC_DEV459_jump_(detail,p));
  t.dev186BreadcrumbHtml=isPublic?'':EUC_DEV459_adminBreadcrumb_(detail,p);
  var html=t.evaluate().getContent();
  if(isPublic){
    /* Le modèle historique construit plusieurs URL après le chargement. La
     * réécriture porte donc sur les noms de routes eux-mêmes, et pas seulement
     * sur les href déjà matérialisés dans le HTML initial. */
    html=html.replace(/suivi-pfmp-classe(?!-public)/g,'suivi-pfmp-classe-public').replace(/suivi-conventions-famille(?!-public)/g,'suivi-conventions-public-famille').replace(/suivi-conventions(?!-public)/g,'suivi-conventions-public');
    html=EUC_DEV505_retirerCommandesAdminPubliques_(html);
    html=html.replace(/<\/head>/i,'<style id="EUC_DEV459_READONLY">#assignToolbar,#assignStatus,#mailParams,#sendTable,#missionOrders,#mailModal,#retModalV162,#selectHead,#tbody tr>td:first-child,.assignbar,.assign-status,.student-check,input[type="checkbox"].rowcheck,button[id^="retire"],#EUC_DEV183_BREADCRUMB{display:none!important}</style></head>');
  }else{
    /* Un seul fil en administration : celui qui commence par Accueil PFMP. */
    html=html.replace(/<\/head>/i,'<style id="EUC_DEV459_ADMIN_CRUMB">#EUC_V51_CRUMB,#EUC_V50_BREADCRUMB,#EUC_DEV175C_CRUMB,.euc186-crumb{display:none!important}</style></head>');
  }
  html=html.replace(/<\/body>/i,EUC_DEV459_navigationFeedback_()+'</body>');
  return HtmlService.createHtmlOutput(html).setTitle((isPublic?'Point sur les stages — ':'Suivi PFMP — ')+EUC_DEV459_t_(detail.classe&&detail.classe.nom)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV459_auditAll(q){
  q=q||{};var years=Array.isArray(q.years)?q.years.filter(Boolean):[],families=['BACPRO','CAP','BTS'],report={ok:true,years:[],families:families.slice(),combinations:0,renderModes:0,classes:0,periods:0,mismatches:[],pdifLeaks:[]};
  if(!years.length){try{years=(EUC_PFMP_contexteAnneeLectureV155_().annees||[]).filter(function(x){return x.actif!==false;}).map(function(x){return EUC_DEV459_t_(x.code);}).filter(Boolean);}catch(eYears){years=[];}}
  report.years=years.slice();
  years.forEach(function(y){families.forEach(function(f){var d=EUC_DEV459_familyData_(y,f);(d.classes||[]).forEach(function(c){report.classes++;(c.periodes||[]).forEach(function(p){report.periods++;report.combinations++;var qk=p.quick||{},expected=EUC_DEV459_n_(p.effectifTotal),actual=EUC_DEV459_n_(qk.total);if(!EUC_DEV459_isPdif_(p)&&expected!==actual)report.mismatches.push({annee:y,famille:f,classe:EUC_DEV459_t_(c.classe||c.nom),periode:EUC_DEV459_t_(p.libelle||p.nom),carte:expected,detail:actual});if(!EUC_DEV459_isPdif_(p)&&(qk.lycee||[]).length)report.pdifLeaks.push({annee:y,famille:f,classe:EUC_DEV459_t_(c.classe||c.nom),periode:EUC_DEV459_t_(p.libelle||p.nom)});});});});});
  report.renderModes=report.combinations*2;report.ok=!!years.length&&!report.mismatches.length&&!report.pdifLeaks.length;return report;
}
