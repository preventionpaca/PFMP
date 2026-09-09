/** Eucalyptus PFMP — v1.0.0-dev.82 — centre administration PFMP protégé. */
function EUC_CENTRE_ADMIN_afficherApplication(){
  var ctx=EUC_PFMP_contexteAdmin_();
  if(!ctx.autorise||['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role)<0) throw new Error('Accès non autorisé.');
  var tpl=HtmlService.createTemplateFromFile('Admin_PFMP');
  tpl.config=JSON.stringify({
    version:'Eucalyptus PFMP — v1.0.0-dev.82',
    role:ctx.role,
    baseUrl:ScriptApp.getService().getUrl()
  });
  return tpl.evaluate().setTitle('Administration PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
