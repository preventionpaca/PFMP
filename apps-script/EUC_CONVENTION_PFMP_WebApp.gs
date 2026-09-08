/** Eucalyptus PFMP — v1.0.0-dev.71 — générateur de conventions PFMP. */
function EUC_CONVENTION_afficherGenerateur(){
  var ctx=EUC_PFMP_contexteAdmin_();if(!ctx.autorise)throw new Error('Accès non autorisé.');
  var tpl=HtmlService.createTemplateFromFile('Convention_PFMP_Generateur');tpl.config=JSON.stringify({version:'Eucalyptus PFMP — v1.0.0-dev.71',baseUrl:ScriptApp.getService().getUrl()});
  return tpl.evaluate().setTitle('Génération des conventions PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_CONVENTION_afficherImpression(e){
  var token=String(e&&e.parameter&&e.parameter.token||'').trim();if(!token)throw new Error('Jeton manquant.');
  var tpl=HtmlService.createTemplateFromFile('Convention_PFMP_Print');tpl.data=EUC_CONVENTION_donneesImpression(token);return tpl.evaluate().setTitle('Convention PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
