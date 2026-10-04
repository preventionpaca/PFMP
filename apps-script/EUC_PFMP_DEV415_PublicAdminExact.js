function EUC_DEV415_publicDetail(e){

  var ctx=EUC_PFMP_contexteAnneeLectureV155_();

  var annee=
    typeof EUC_DEV401_year_==='function'
      ? EUC_DEV401_year_(e,ctx)
      : String(e&&e.parameter&&e.parameter.annee||'').trim();

  var famille=
    typeof EUC_DEV401_txt_==='function'
      ? EUC_DEV401_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO'
      : String(e&&e.parameter&&e.parameter.famille||'BACPRO');

  var classe=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periode=Number(e&&e.parameter&&e.parameter.periode)||0;
  var wrapperMode=String(e&&e.parameter&&e.parameter.wrapper||'')==='1';

  if(!annee||!classe||!periode){
    throw new Error('Contexte détail PUBLIC incomplet.');
  }

  /*
   * EXACTEMENT LE PIPELINE ADMIN DEV401
   */
  var d=EUC_DEV416_finalDetail_(annee,famille,classe,periode);

  /*
   * EXACTEMENT LA LISTE DE CLASSES ADMIN
   */
  var jump=[];

  try{
    var jr=EUC_DEV333_nav({
      annee:annee,
      famille:famille,
      classe:classe,
      periode:periode
    })||{};

    jump=(jr.items||[]).map(function(x){
      return {
        id:Number(x.classeId)||0,
        nom:String(x.classe||''),
        classe:String(x.classe||''),
        label:String(x.classe||''),
        famille:String(jr.famille||famille),
        periode:Number(x.periodeId)||0,
        current:!!x.current
      };
    });
  }catch(e4){}

  /*
   * EXACTEMENT LE TEMPLATE ADMIN
   */
  var tpl=HtmlService.createTemplateFromFile(
    'Suivi_PFMP_Classe_Detail_V156'
  );

  tpl.config=JSON.stringify({
    baseUrl:'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec',
    readonly:true,
    publicMode:true
  });

  tpl.anneeContextJson=JSON.stringify(ctx||{});
  tpl.detailJson=JSON.stringify(d);
  tpl.jumpClassesJson=JSON.stringify(jump);
  tpl.dev186BreadcrumbHtml='';

  var html=tpl.evaluate().getContent();

  /*
   * Toutes les routes ADMIN du HTML rendu deviennent PUBLIC.
   * Aucun changement dans le vrai template ADMIN.
   */
  html=html.split(
    'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec'
  ).join(
    'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec'
  );

  html=html.replace(
    /page=suivi-pfmp-classe(?!-public)/g,
    'page=suivi-pfmp-classe-public'
  );

  html=html.replace(
    /page=suivi-conventions-famille(?!-public)/g,
    'page=suivi-conventions-public-famille'
  );

  html=html.replace(
    /page=suivi-conventions(?!-public)/g,
    'page=suivi-conventions-public'
  );

  html=html.replace(
    /'suivi-pfmp-classe'/g,
    "'suivi-pfmp-classe-public'"
  );

  html=html.replace(
    /'suivi-conventions-famille'/g,
    "'suivi-conventions-public-famille'"
  );

  /*
   * Dans les wrappers loucodi.fr, la page publique vit dans une iframe.
   * Les anciens target=_top / window.top forçaient la navigation hors du
   * sous-domaine.  La transformation ne concerne que le HTML PUBLIC rendu.
  */
  html=html.replace(/target=["']_top["']/gi,'target="_self"');
  html=html.replace(/\.EUC_DEV382_fastDetail\(/g,'.EUC_DEV417_publicFastDetail(');

  /*
   * Le wrapper GitHub conserve pfmp.loucodi.fr et remplace son iframe.
   * Sans wrapper (URL Apps Script ouverte directement), la navigation _top
   * reste le repli fonctionnel.
   */
  var wrapperNav=
    '<script id="EUC_DEV418_WRAPPER_NAV">(function(){'+
    'var ready='+(wrapperMode?'true':'false')+',BASE="https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec";'+
    'function busy(el,label){if(typeof window.EUC_DEV419_beginNavigation==="function"){window.EUC_DEV419_beginNavigation(el,label);return;}if(el){el.classList.add("euc419-nav-busy");el.setAttribute("aria-busy","true");}}'+
    'function sendToWrapper(message){var w=window;for(var i=0;i<6;i++){try{w=w.parent;w.postMessage(message,"*");}catch(e){break;}}}'+
    'function normalized(raw){try{var u=new URL(raw,location.href),p=u.searchParams.get("page")||"";'+
    'if(p==="suivi-pfmp-classe")u.searchParams.set("page","suivi-pfmp-classe-public");'+
    'if(p==="suivi-conventions-famille")u.searchParams.set("page","suivi-conventions-public-famille");'+
    'if(p==="suivi-conventions")u.searchParams.set("page","suivi-conventions-public");'+
    'if(!u.searchParams.get("annee")){var y=new URLSearchParams(location.search).get("annee")||((typeof detail!=="undefined"&&detail&&detail.annee)||"");if(y)u.searchParams.set("annee",y);}'+
    'if((u.searchParams.get("page")||"").indexOf("suivi-")!==0)return "";if(ready)u.searchParams.set("wrapper","1");return u.toString();}catch(e){return "";}}'+
    'addEventListener("message",function(ev){if(ev.data&&ev.data.type==="EUC_PFMP_WRAPPER_READY")ready=true;});'+
    'window.EUC_DEV418_publicNavigate=function(raw,el,label){var url=normalized(raw);if(!url)return;busy(el,label||"Chargement…");'+
    'if(ready||window.top!==window.self){var framed=new URL(url,location.href);framed.searchParams.set("wrapper","1");sendToWrapper({type:"EUC_PFMP_WRAPPER_NAVIGATE",url:framed.toString()});return;}top.location.href=url;};'+
    'document.addEventListener("click",function(ev){var a=ev.target&&ev.target.closest?ev.target.closest("a[href]"):null;'+
    'var url=a&&normalized(a.href);if(!url)return;if(url.indexOf("page=suivi-pfmp-classe-public")>=0&&typeof window.EUC_DEV418_detailFastNavigate==="function"){ev.preventDefault();ev.stopImmediatePropagation();busy(a,"Chargement de la classe…");window.EUC_DEV418_detailFastNavigate(url,"Chargement de la classe…",a);return;}'+
    'ev.preventDefault();ev.stopImmediatePropagation();EUC_DEV418_publicNavigate(url,a,"Chargement…");},true);'+
    'document.addEventListener("change",function(ev){var t=ev.target;if(!t)return;'+
    'if(t.id==="euc357Jump"&&t.value){ev.preventDefault();ev.stopImmediatePropagation();var jump=decodeURIComponent(t.value);if(typeof window.EUC_DEV418_detailFastNavigate==="function"){busy(t,"Chargement de la classe…");window.EUC_DEV418_detailFastNavigate(jump,"Chargement de la classe…",t);return;}EUC_DEV418_publicNavigate(jump,t,"Chargement de la classe…");return;}'+
    'if(t.id==="yearSelect"&&typeof detail!=="undefined"){ev.preventDefault();ev.stopImmediatePropagation();var u=new URL(BASE);'+
    'u.searchParams.set("page","suivi-pfmp-classe-public");u.searchParams.set("annee",t.value);'+
    'u.searchParams.set("famille","BACPRO");u.searchParams.set("classe",detail.classe.id);u.searchParams.set("periode",detail.periode.id);EUC_DEV418_publicNavigate(u.toString());}},true);'+
    'function ping(){sendToWrapper({type:"EUC_PFMP_WRAPPER_QUERY"});}'+
    'ping();setTimeout(ping,100);setTimeout(ping,500);setTimeout(ping,1500);'+
    '})();<\/script>';

  html=html.replace(/<\/head>/i,wrapperNav+'</head>');

  /*
   * Lecture seule :
   * on masque seulement les commandes ADMIN.
   */
  var lock=
    '<style id="EUC_DEV415_READONLY">'+
    '#assignToolbar,#assignToolbarV156,'+
    '#assignStatus,#assignStatusV156,'+
    '#mailParams,#sendTable,#mailModal,'+
    '#retModalV162,#selectHead,'+
    '#tbody tr>td:first-child,'+
    '#euc340SnapshotDetail,'+
    '.euc190e-snapshot-tile,'+
    '.assignbar,.assign-status,'+
    '.student-check,'+
    'input[type="checkbox"].rowcheck,'+
    'button[id^="retire"],'+
    'a[href*="admin-pfmp"],'+
    'a[href*="snapshot-pfmp-admin"]'+
    '{display:none!important}'+
    '#EUC_DEV183_BREADCRUMB{display:none!important}'+
    '</style>';

  html=html.replace(
    /<\/head>/i,
    lock+'</head>'
  );

  /*
   * DEV425 R2 — le fil DEV183 est aussi (re)créé tardivement par le
   * JavaScript historique du template ADMIN. Le CSS suffit en principe,
   * mais on le neutralise également à chaque insertion DOM afin qu'aucun
   * fil « Accueil PFMP » ne puisse réapparaître dans la consultation
   * publique, y compris après une navigation rapide sans rechargement.
   */
  var publicBreadcrumbGuard=
    '<script id="EUC_DEV425_PUBLIC_BREADCRUMB_GUARD">(function(){'+
    'function hideAdminBreadcrumb(){var el=document.getElementById("EUC_DEV183_BREADCRUMB");if(!el)return;el.hidden=true;el.setAttribute("aria-hidden","true");el.style.setProperty("display","none","important");}'+
    'hideAdminBreadcrumb();'+
    'if(document.documentElement&&typeof MutationObserver!=="undefined"){new MutationObserver(hideAdminBreadcrumb).observe(document.documentElement,{childList:true,subtree:true});}'+
    'document.addEventListener("DOMContentLoaded",hideAdminBreadcrumb,{once:true});'+
    'setTimeout(hideAdminBreadcrumb,0);setTimeout(hideAdminBreadcrumb,250);'+
    '})();<\/script>';

  html=html.replace(/<\/body>/i,publicBreadcrumbGuard+'</body>');

  return HtmlService
    .createHtmlOutput(html)
    .setTitle(
      'Point sur les stages — '+
      ((d.classe&&d.classe.nom)||'Classe')
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}

/* Navigation rapide publique : lecture seule, sans contrôle administrateur. */
function EUC_DEV417_publicFastDetail(payload){
  payload=payload||{};
  var annee=String(payload.annee||'').trim();
  var famille=String(payload.famille||'BACPRO').trim().toUpperCase();
  var classe=Number(payload.classe)||0;
  var periode=Number(payload.periode)||0;

  if(!annee||!classe||!periode){
    throw new Error('Année, classe et période obligatoires.');
  }

  var t0=Date.now();
  var detail=EUC_DEV416_finalDetail_(annee,famille,classe,periode);
  if(!detail||!detail.classe||!detail.periode){
    throw new Error('Détail PFMP incomplet.');
  }

  return {ok:true,detail:detail,serverMs:Date.now()-t0};
}
