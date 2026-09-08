/** Eucalyptus PFMP — v1.0.0-dev.65 — route import Pronote protégée + feedback visuel et détails ambiguïtés. */
function EUC_IMPORT_afficherApplication(){
  var ctx=EUC_PFMP_contexteAdmin_();
  if(!ctx.autorise||['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role)<0) throw new Error('Accès non autorisé.');
  var tpl=HtmlService.createTemplateFromFile('Import_Pronote_PFMP');
  tpl.config=JSON.stringify({version:'Eucalyptus PFMP — v1.0.0-dev.65',mode:'IMPORT_REEL_CONTROLE',role:ctx.role,baseUrl:ScriptApp.getService().getUrl()});
  return tpl.evaluate().setTitle('Import Pronote PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_IMPORT_diagnosticAutorisation(){return EUC_PFMP_diagnosticAdmin_();}
