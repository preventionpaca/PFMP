/** Eucalyptus PFMP - v1.0.0-dev.520 - centre admin multi-domaines. */
function EUC_CENTRE_ADMIN_afficherApplication(e){
  var auth=String(e&&e.parameter&&e.parameter.auth||'').trim();
  var ctx=null;

  if(auth && typeof EUC_DEV270B_startSession_==='function'){
    ctx=EUC_DEV270B_startSession_(auth);
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

  if(!ctx && typeof EUC_DEV270B_loginPage_==='function'){
    return EUC_DEV270B_loginPage_();
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
