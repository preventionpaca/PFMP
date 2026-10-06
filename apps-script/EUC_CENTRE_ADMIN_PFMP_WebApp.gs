/** Eucalyptus PFMP - v1.0.0-dev.270b - centre admin multi-domaines. */
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

  tpl.config=JSON.stringify({
    version:'Eucalyptus PFMP - v1.0.0-dev.270b',
    role:ctx.role,
    baseUrl:EUC_DEV368_boot().baseUrl
  });

  return tpl.evaluate()
    .setTitle('Administration PFMP')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
