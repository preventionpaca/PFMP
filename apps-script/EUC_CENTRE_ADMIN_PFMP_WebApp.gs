/** Eucalyptus PFMP - v1.0.0-dev.520 - centre admin multi-domaines. */
function EUC_CENTRE_ADMIN_afficherApplication(e){
  var auth=String(e&&e.parameter&&e.parameter.auth||'').trim();
  var ctx=null,erreurAuth='';

  if(auth && typeof EUC_DEV270B_startSession_==='function'){
    /* Compte Google non autorisé, jeton expiré… : proposer un autre compte
     * au lieu d'une page d'erreur Apps Script. */
    try{ctx=EUC_DEV270B_startSession_(auth);}
    catch(eAuth){ctx=null;erreurAuth=String(eAuth&&eAuth.message||eAuth);}
  }

  if(!ctx && typeof EUC_DEV270B_contextOrNull_==='function'){
    ctx=EUC_DEV270B_contextOrNull_();
  }

  /* Le sous-domaine peut arriver sans le module passerelle DEV270B. Dans ce
   * cas, réutiliser l'authentification Google Workspace déjà validée par le
   * centre au lieu de produire une page blanche. */
  if(!ctx && typeof EUC_PFMP_contexteAdmin_==='function'){
    ctx=EUC_PFMP_contexteAdmin_();
  }

  /* Visiteur non identifié (navigateur sans session Google) : le contexte
   * existe mais n'est pas autorisé. Proposer la connexion Google plutôt
   * qu'une erreur brute. */
  /* Le jeton de la passerelle peut être refusé (signature, expiration) alors que
   * la session Google Workspace suffit : on ne montre la page de connexion
   * qu'après avoir essayé toutes les voies. */
  if((!ctx || !ctx.autorise) && typeof EUC_DEV270B_GATEWAY_BASE_!=='undefined'){
    return EUC_CENTRE_ADMIN_pageConnexion_(erreurAuth);
  }

  if(
    !ctx ||
    !ctx.autorise ||
    ['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role)<0
  ){
    throw new Error('Accès PFMP non autorisé.');
  }

  var tpl=HtmlService.createTemplateFromFile('Admin_PFMP');
  var adminBase=typeof EUC_DEV459_ADMIN_URL_!=='undefined'
    ?String(EUC_DEV459_ADMIN_URL_||'').trim()
    :'';
  var publicBase=typeof EUC_DEV455_PUBLIC_URL_!=='undefined'
    ?String(EUC_DEV455_PUBLIC_URL_||'').trim()
    :'';
  if(!adminBase)adminBase=EUC_DEV368_boot().baseUrl;
  if(!publicBase)publicBase=EUC_DEV368_boot().baseUrl;
  tpl.adminBase=adminBase;
  tpl.publicBase=publicBase;

  tpl.config=JSON.stringify({
    version:'Eucalyptus PFMP - v1.0.0-dev.520',
    role:ctx.role,
    baseUrl:adminBase,
    adminBase:adminBase,
    publicBase:publicBase
  });

  return tpl.evaluate()
    .setTitle('Administration PFMP')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}

/* Page de connexion : compte Google par défaut, ou choix d'un autre compte
 * (sélecteur de comptes Google, puis retour par la passerelle PFMP). */
function EUC_CENTRE_ADMIN_pageConnexion_(message){
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  var passerelle=String(typeof EUC_DEV270B_GATEWAY_BASE_!=='undefined'?EUC_DEV270B_GATEWAY_BASE_:'');
  var autre='https://accounts.google.com/AccountChooser?continue='+encodeURIComponent(passerelle);
  var refus=/non autoris/i.test(message||'');
  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Connexion administration PFMP</title><style>body{font-family:Arial,sans-serif;background:#f4f7fb;margin:0;padding:32px;color:#17324d}'+
    '.card{max-width:650px;margin:60px auto;background:#fff;border:1px solid #d9e2ec;border-radius:14px;padding:28px}'+
    '.btn{display:inline-block;margin:16px 10px 0 0;padding:12px 18px;background:#1f6feb;color:#fff;text-decoration:none;border-radius:8px;font-weight:700}'+
    '.btn.second{background:#fff;color:#1f6feb;border:1px solid #1f6feb}.msg{background:#fff4ed;color:#9a3412;padding:10px 14px;border-radius:8px;font-weight:700}</style></head><body><div class="card">'+
    '<h2>Administration PFMP</h2>'+
    (message?'<p class="msg">'+esc(refus?'Ce compte Google n’est pas autorisé dans l’administration PFMP. Choisissez votre compte du lycée.':message)+'</p>':'<p>Une authentification Google est nécessaire.</p>')+
    (refus?'':'<a class="btn" target="_top" href="'+esc(passerelle)+'">Se connecter avec Google</a>')+
    '<a class="btn'+(refus?'':' second')+'" target="_top" href="'+esc(autre)+'">Utiliser un autre compte Google</a>'+
    '</div></body></html>'
  ).setTitle('Connexion administration PFMP');
}
