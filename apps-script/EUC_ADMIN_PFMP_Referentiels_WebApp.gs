/** Eucalyptus PFMP — v1.0.0-dev.83 — pages administration référentiels Pronote et diplômes. */
function EUC_PC_afficherSynchronisation(){
  var ctx=EUC_PFMP_contexteAdmin_();
  if(!ctx.autorise||['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role)<0)throw new Error('Accès non autorisé.');
  var tpl=HtmlService.createTemplateFromFile('Import_ProfClasses_PFMP');
  tpl.config=JSON.stringify({version:'Eucalyptus PFMP — v1.0.0-dev.83',role:ctx.role,baseUrl:ScriptApp.getService().getUrl()});
  return tpl.evaluate().setTitle('Synchronisation Pronote — Professeurs et classes').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_PC_afficherDiplomes(){
  var ctx=EUC_PFMP_contexteAdmin_();
  if(!ctx.autorise||['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role)<0)throw new Error('Accès non autorisé.');
  var tpl=HtmlService.createTemplateFromFile('Diplomes_Classes_PFMP');
  tpl.config=JSON.stringify({version:'Eucalyptus PFMP — v1.0.0-dev.83',role:ctx.role,baseUrl:ScriptApp.getService().getUrl()});
  return tpl.evaluate().setTitle('Diplômes par classe').addMetaTag('viewport','width=device-width, initial-scale=1');
}
