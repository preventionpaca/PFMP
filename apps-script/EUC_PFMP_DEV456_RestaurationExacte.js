/** PFMP DEV456 — rendu exact, navigation publique restaurée et famille rapide. */
var EUC_DEV456_VERSION_='1.0.0-dev.456';
var EUC_DEV456_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec';
function EUC_DEV456_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV456_familyKey_(annee,famille){return 'DEV456R13_FAMILY_'+EUC_DEV456_t_(annee)+'_'+EUC_DEV456_t_(famille).toUpperCase();}
function EUC_DEV456_familyCacheGet_(annee,famille){
  var c=CacheService.getScriptCache(),k=EUC_DEV456_familyKey_(annee,famille),n=0,parts={},raw='';
  try{n=Number(c.get(k+'_N'))||0;}catch(e){}
  if(!n||n>12)return null;
  var keys=[];for(var i=0;i<n;i++)keys.push(k+'_'+i);
  try{parts=c.getAll(keys)||{};}catch(e2){return null;}
  for(var j=0;j<n;j++){if(parts[k+'_'+j]==null)return null;raw+=parts[k+'_'+j];}
  try{return JSON.parse(raw);}catch(e3){return null;}
}
function EUC_DEV456_familyCachePut_(annee,famille,data){
  var c=CacheService.getScriptCache(),k=EUC_DEV456_familyKey_(annee,famille),raw='';
  try{raw=JSON.stringify(data);}catch(e){return data;}
  var size=50000,n=Math.ceil(raw.length/size);if(!n||n>12)return data;
  try{for(var i=0;i<n;i++)c.put(k+'_'+i,raw.slice(i*size,(i+1)*size),21600);c.put(k+'_N',String(n),21600);}catch(e2){}
  return data;
}
function EUC_DEV456_familyTransientDrop_(annee,famille){
  var k=EUC_DEV456_familyKey_(annee,famille),c=CacheService.getScriptCache(),keys=[k+'_N'];
  for(var i=0;i<12;i++)keys.push(k+'_'+i);
  try{c.removeAll(keys);}catch(e){keys.forEach(function(x){try{c.remove(x);}catch(e2){}});}
}
function EUC_DEV456_familyPersistentGet_(annee,famille){
  var p=PropertiesService.getScriptProperties(),k=EUC_DEV456_familyKey_(annee,famille),n=0,raw='';
  try{n=Number(p.getProperty(k+'_PN'))||0;if(!n||n>60)return null;for(var i=0;i<n;i++){var part=p.getProperty(k+'_P'+i);if(part==null)return null;raw+=part;}return JSON.parse(raw);}catch(e){return null;}
}
function EUC_DEV456_familyPersistentPut_(annee,famille,data){
  var p=PropertiesService.getScriptProperties(),k=EUC_DEV456_familyKey_(annee,famille),raw='',size=7000,items={};
  try{raw=JSON.stringify(data);}catch(e){return data;}var n=Math.ceil(raw.length/size);if(!n||n>60)return data;
  items[k+'_PN']=String(n);for(var i=0;i<n;i++)items[k+'_P'+i]=raw.slice(i*size,(i+1)*size);
  try{p.setProperties(items,false);}catch(e2){}return data;
}
function EUC_DEV456_familyCacheDrop_(annee,famille){
  var k=EUC_DEV456_familyKey_(annee,famille),c=CacheService.getScriptCache(),p=PropertiesService.getScriptProperties(),keys=[k+'_N',k+'_PN'];
  for(var i=0;i<60;i++){keys.push(k+'_'+i);keys.push(k+'_P'+i);}
  try{c.removeAll(keys);}catch(e){}try{keys.forEach(function(x){p.deleteProperty(x);});}catch(e2){}
}
function EUC_DEV456_rosters_(annee){
  var out={},rows=[];
  /* EUC_ELEVES_PFMP représente l'effectif courant et ne porte pas une colonne
   * Annee_scolaire fiable. Un filtre inexistant renvoyait zéro élève dans les
   * vignettes P.dif., alors que le détail ciblé était exact. */
  try{rows=EUC_DEV190G_fastRecords_('EUC_ELEVES_PFMP',{})||[];}catch(e){}
  rows.forEach(function(r){
    var f=r.fields||r,cid=EUC_DEV455_ref_(f.Classe);
    if(!cid||f.Actif===false||f.Present_dernier_import===false||EUC_DEV456_t_(f.Statut_scolarite).toUpperCase()==='SORTI')return;
    (out[String(cid)]=out[String(cid)]||[]).push({eleveId:Number(r.id)||0,nom:EUC_DEV455_t_(f.Nom),prenom:EUC_DEV455_t_(f.Prenom),label:[EUC_DEV455_t_(f.Nom),EUC_DEV455_t_(f.Prenom)].filter(Boolean).join(' ')});
  });
  return out;
}
function EUC_DEV456_reconcileRosters_(data,annee,preparedRosters){
  var rosters=preparedRosters||EUC_DEV456_rosters_(annee);
  (data.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0,roster=rosters[String(cid)]||[],appNames={};
    (c.periodes||[]).forEach(function(p){
      var isPdif=(typeof EUC_DEV387_isPdifPeriod_==='function'&&EUC_DEV387_isPdifPeriod_(p))||/P\.?\s*DIF/i.test(EUC_DEV456_t_(p.v50Slot||p.v51Slot||p.libelle||p.nom));p.isPdif=!!isPdif;var q=p.quick;if(!q)return;var valid={},seen={};q.isPdif=!!isPdif;roster.forEach(function(s){valid[s.label]=1;});
      function nameOf(v){return EUC_DEV456_t_(v).split(' — ')[0];}
      ['avec','sans','apprentis','situations','annuleesInterrompues','lycee','entreprise','indefini'].forEach(function(k){q[k]=(q[k]||[]).filter(function(v){var n=nameOf(v);if(!valid[n])return false;seen[n]=1;return true;});});
      roster.forEach(function(s){if(!seen[s.label]){if(q.isPdif)(q.indefini=q.indefini||[]).push(s.label);else(q.sans=q.sans||[]).push(s.label);}});
      q.total=roster.length;q.situationsCouvertes=Math.min(Number(q.situationsCouvertes)||0,(q.situations||[]).length);q.couverts=(q.avec||[]).length+(q.apprentis||[]).length+q.situationsCouvertes;q.scolairesAttendus=Math.max(0,q.total-(q.apprentis||[]).length);q.sansConvention=(q.sans||[]).length;
      if(typeof EUC_DEV426_applyQuick_==='function')EUC_DEV426_applyQuick_(p,q);
      else if(!q.isPdif){p.effectifTotal=q.total;p.apprentis=q.apprentis.length;p.total=Math.max(0,q.total-q.apprentis.length);p.conventions=q.avec.length;p.situationsAdministratives=q.situationsCouvertes;p.manquantes=q.sans.length;p.sansConvention=q.sans.length;p.couverts=q.couverts;}
      (q.apprentis||[]).forEach(function(n){appNames[n]=1;});
    });
    c.apprentis=(c.periodes||[]).reduce(function(max,p){return Math.max(max,Number(p.apprentis)||0);},0);
  });
  data.__dev456RosterReconciled=true;return data;
}
function EUC_DEV456_applyPdifModes_(data,annee,rosters){
  data=data||{};rosters=rosters||{};
  var modes={};
  try{if(typeof EUC_DEV285B_state_==='function')modes=(EUC_DEV285B_state_(annee)||{}).modes||{};}catch(eModes){}
  (data.classes||[]).forEach(function(c){
    var cid=Number(c.classeId||c.id)||0,students=rosters[String(cid)]||[],apprentis={};
    (c.periodes||[]).forEach(function(p){
      var isPdif=(typeof EUC_DEV387_isPdifPeriod_==='function'&&EUC_DEV387_isPdifPeriod_(p))||/P\.?\s*DIF|PARCOURS\s+DIFFERENCIE/i.test(EUC_DEV456_t_(p.v50Slot||p.v51Slot||p.libelle||p.nom));
      if(isPdif)return;
      ((p.quick&&p.quick.apprentis)||[]).forEach(function(n){apprentis[EUC_DEV456_t_(n).split(' — ')[0]]=1;});
    });
    /* Les snapshots de famille ne transportent pas toujours quick.apprentis.
     * On complète donc le jeu d'exclusion depuis la table apprentissage, lue
     * une seule fois par exécution par EUC_DEV279_appCtx_. Un apprenti actif
     * reste dans les PFMP ordinaires, mais n'entre jamais dans le choix P.dif.
     */
    students.forEach(function(s){
      try{
        if(typeof EUC_DEV277_bestCurrent_!=='function'||typeof EUC_DEV277_status_!=='function')return;
        var ep=EUC_DEV277_bestCurrent_(Number(s.eleveId)||0,annee),st=EUC_DEV277_status_(ep);
        if(st&&st.apprenti)apprentis[EUC_DEV456_t_(s.label||([s.nom,s.prenom].filter(Boolean).join(' ')))]=1;
      }catch(eApp){}
    });
    (c.periodes||[]).forEach(function(p){
      var isPdif=(typeof EUC_DEV387_isPdifPeriod_==='function'&&EUC_DEV387_isPdifPeriod_(p))||/P\.?\s*DIF|PARCOURS\s+DIFFERENCIE/i.test(EUC_DEV456_t_(p.v50Slot||p.v51Slot||p.libelle||p.nom));
      if(!isPdif)return;
      var q={ok:true,source:'dev456-pdif-modes',classe:EUC_DEV456_t_(c.classe||c.nom),periode:EUC_DEV456_t_(p.libelle||p.nom||'P.dif.'),isPdif:true,total:0,avec:[],sans:[],apprentis:[],situations:[],situationsCouvertes:0,annuleesInterrompues:[],lycee:[],entreprise:[],indefini:[]};
      students.forEach(function(s){
        var name=EUC_DEV456_t_(s.label||([s.nom,s.prenom].filter(Boolean).join(' ')));if(!name||apprentis[name])return;
        var mode=EUC_DEV456_t_(modes[Number(s.eleveId)||0]);
        if(mode==='PARCOURS_DIFF_LYCEE')q.lycee.push(name);
        else if(mode==='POURSUITE_PFMP2_ENTREPRISE')q.entreprise.push(name);
        else q.indefini.push(name);
      });
      q.total=q.lycee.length+q.entreprise.length+q.indefini.length;
      ['lycee','entreprise','indefini'].forEach(function(k){q[k].sort(function(a,b){return a.localeCompare(b,'fr');});});
      p.quick=q;p.isPdif=true;p.parcoursDifferencies=q.lycee.length;p.poursuitePfmp2=q.entreprise.length;p.aDefinirFinTerminale=q.indefini.length;
      try{if(typeof EUC_DEV426_applyQuick_==='function')EUC_DEV426_applyQuick_(p,q);}catch(eApply){}
    });
  });
  data.__dev456PdifModes=true;return data;
}
function EUC_DEV456_familyData_(annee,famille){
  var cached=EUC_DEV456_familyCacheGet_(annee,famille);
  if(cached&&(
    typeof EUC_DEV425_payloadFresh_!=='function'||
    EUC_DEV425_payloadFresh_(annee,famille,cached)
  )){cached.__dev456FamilySource='CACHE';return cached;}
  if(cached)EUC_DEV456_familyCacheDrop_(annee,famille);
  var persisted=EUC_DEV456_familyPersistentGet_(annee,famille);
  if(persisted&&(
    typeof EUC_DEV425_payloadFresh_!=='function'||
    EUC_DEV425_payloadFresh_(annee,famille,persisted)
  )){persisted.__dev456FamilySource='PERSISTENT';EUC_DEV456_familyCachePut_(annee,famille,persisted);return persisted;}
  if(persisted)EUC_DEV456_familyCacheDrop_(annee,famille);
  try{EUC_DEV421_familyCacheInvalidate_(annee,famille);}catch(eInvalidate){}
  var r=EUC_DEV421_fastFamilySnapshot_({annee:annee,famille:famille});
  var d=r&&r.ready&&r.payload?r.payload:{ok:true,ready:false,annee:annee,famille:famille,classes:[]};
  var rosters=EUC_DEV456_rosters_(annee);
  d=EUC_DEV456_reconcileRosters_(d,annee,rosters);d=EUC_DEV456_applyPdifModes_(d,annee,rosters);d.ready=!!(r&&r.ready&&r.payload);d.__dev456FastFamily=true;d.__dev456FamilySource='ENRICHED_SNAPSHOT';EUC_DEV456_familyPersistentPut_(annee,famille,d);return EUC_DEV456_familyCachePut_(annee,famille,d);
}
function EUC_DEV456_publicFamily(e){
  var p=EUC_DEV455_params_(e),d=EUC_DEV456_familyData_(p.annee,p.famille);
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_FamilleClone_V353');
  t.wrapperMode=EUC_DEV456_t_(e&&e.parameter&&e.parameter.wrapper)==='1';
  t.paramsJson=JSON.stringify({annee:p.annee,famille:p.famille,wrapper:t.wrapperMode});
  t.dataJson=JSON.stringify(d);t.baseUrl=EUC_DEV455_PUBLIC_URL_;
  var html=EUC_DEV456_publicShell_(t.evaluate().getContent(),{classe:{},periode:{}},p,t.wrapperMode);
  return HtmlService.createHtmlOutput(html).setTitle('Suivi des PFMP — consultation').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV456_jump_(detail,p){
  var d=EUC_DEV456_familyData_(p.annee,p.famille),selected=0;
  (detail.periodes||[]).some(function(x,i){if(Number(x.id||x.periodeId)===Number(p.periode)){selected=i;return true;}return false;});
  return(d.classes||[]).map(function(c){var ps=c.periodes||[],period=ps[selected]||ps[0]||{};return{id:Number(c.classeId||c.id)||0,nom:EUC_DEV456_t_(c.classe||c.nom),classe:EUC_DEV456_t_(c.classe||c.nom),label:EUC_DEV456_t_(c.classe||c.nom),famille:p.famille,periode:Number(period.id||period.periodeId)||0,current:Number(c.classeId||c.id)===Number(p.classe)};}).filter(function(x){return x.id&&x.nom&&x.periode;});
}
function EUC_DEV456_publicShell_(html,detail,p,wrapperMode){
  html=html.split(EUC_DEV456_ADMIN_URL_).join(EUC_DEV455_PUBLIC_URL_).replace(/page=suivi-pfmp-classe(?!-public)/g,'page=suivi-pfmp-classe-public').replace(/page=suivi-conventions-famille(?!-public)/g,'page=suivi-conventions-public-famille').replace(/page=suivi-conventions(?!-public)/g,'page=suivi-conventions-public').replace(/target=["']_top["']/gi,'target="_self"');
  var lock='<style id="EUC_DEV456_READONLY">#assignToolbar,#assignStatus,#mailParams,#sendTable,#mailModal,#retModalV162,#selectHead,#tbody tr>td:first-child,.assignbar,.assign-status,.student-check,input[type="checkbox"].rowcheck,button[id^="retire"],a[href*="admin-pfmp"],a[href*="snapshot-pfmp-admin"]{display:none!important}#EUC_DEV183_BREADCRUMB{display:none!important}</style>';
  var nav='<script id="EUC_DEV456_PUBLIC_NAV">(function(){var ready='+(wrapperMode?'true':'false')+';function send(m){var w=window;for(var i=0;i<6;i++){try{w=w.parent;w.postMessage(m,"*");}catch(e){break;}}}function fix(raw){try{var u=new URL(raw,location.href),page=u.searchParams.get("page")||"";if(page==="suivi-pfmp-classe")u.searchParams.set("page","suivi-pfmp-classe-public");if(page==="suivi-conventions-famille")u.searchParams.set("page","suivi-conventions-public-famille");if(page==="suivi-conventions")u.searchParams.set("page","suivi-conventions-public");if((u.searchParams.get("page")||"").indexOf("suivi-")!==0)return"";if(ready)u.searchParams.set("wrapper","1");return u.toString();}catch(e){return"";}}addEventListener("message",function(ev){if(ev.data&&ev.data.type==="EUC_PFMP_WRAPPER_READY")ready=true;});window.EUC_DEV418_publicNavigate=function(raw){var url=fix(raw);if(!url)return;if(ready){var u=new URL(url);u.searchParams.set("wrapper","1");send({type:"EUC_PFMP_WRAPPER_NAVIGATE",url:u.toString()});}else window.location.href=url;};document.addEventListener("click",function(ev){var a=ev.target&&ev.target.closest?ev.target.closest("a[href]"):null,u=a&&fix(a.href);if(!u)return;ev.preventDefault();ev.stopImmediatePropagation();EUC_DEV418_publicNavigate(u);},true);function ping(){send({type:"EUC_PFMP_WRAPPER_QUERY"});}ping();setTimeout(ping,100);setTimeout(ping,500);send({type:"EUC_ATRIUM_META",meta:{page:"detail",family:'+JSON.stringify(p.famille)+',classLabel:'+JSON.stringify(EUC_DEV456_t_(detail.classe&&detail.classe.nom))+',periodLabel:'+JSON.stringify(EUC_DEV456_t_(detail.periode&&detail.periode.libelle))+'}});})();<\/script>';
  var periods='<script id="EUC_DEV456_PERIOD_NAV">(function(){var base='+JSON.stringify(EUC_DEV455_PUBLIC_URL_)+',year='+JSON.stringify(p.annee)+',family='+JSON.stringify(p.famille)+';document.querySelectorAll(".period[data-class][data-period]").forEach(function(el){el.onclick=function(ev){if(ev){ev.preventDefault();ev.stopPropagation();}var u=base+"?page=suivi-pfmp-classe-public&annee="+encodeURIComponent(year)+"&famille="+encodeURIComponent(family)+"&classe="+encodeURIComponent(el.dataset.class)+"&periode="+encodeURIComponent(el.dataset.period)+"&origin=suivi-conventions";window.EUC_DEV418_publicNavigate(u);};el.classList.remove("euc339-busy");el.removeAttribute("aria-busy");var s=el.querySelector(".euc419-inline-spin");if(s)s.remove();});})();<\/script>';
  return html.replace(/<\/head>/i,lock+'</head>').replace(/<\/body>/i,nav+periods+'</body>');
}
function EUC_DEV456_publicDetail(e){
  var p=EUC_DEV455_params_(e),detail=EUC_DEV455_fastDetail_(p.annee,p.famille,p.classe,p.periode);
  detail.peutModifier=false;detail.professeursDisponibles=[];detail.professeursDisponiblesCharges=false;
  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  t.config=JSON.stringify({baseUrl:EUC_DEV455_PUBLIC_URL_,readonly:true,publicMode:true});
  t.anneeContextJson=JSON.stringify({active:p.annee,annees:[{code:p.annee,libelle:p.annee}]});
  t.detailJson=JSON.stringify(detail);t.jumpClassesJson=JSON.stringify(EUC_DEV456_jump_(detail,p));t.dev186BreadcrumbHtml='';
  var wrapperMode=EUC_DEV456_t_(e&&e.parameter&&e.parameter.wrapper)==='1';
  var html=EUC_DEV456_publicShell_(t.evaluate().getContent(),detail,p,wrapperMode);
  return HtmlService.createHtmlOutput(html).setTitle('Point sur les stages — '+EUC_DEV456_t_(detail.classe&&detail.classe.nom)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
