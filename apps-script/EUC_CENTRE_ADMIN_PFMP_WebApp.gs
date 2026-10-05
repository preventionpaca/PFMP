/** Eucalyptus PFMP - v1.0.0-dev.270b - centre admin multi-domaines. */
function EUC_CENTRE_ADMIN_afficherApplication(e){
  var auth=String(e&&e.parameter&&e.parameter.auth||'').trim();
  var ctx=null;

  if(auth){
    ctx=EUC_DEV270B_startSession_(auth);
  }

  if(!ctx){
    ctx=EUC_DEV270B_contextOrNull_();
  }

  if(!ctx){
    return EUC_DEV270B_loginPage_();
  }

  if(
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
