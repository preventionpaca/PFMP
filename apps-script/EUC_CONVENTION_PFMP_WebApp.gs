/** Eucalyptus PFMP — v1.0.0-dev.85 — générateur et impressions PFMP enrichies. */
function EUC_CONVENTION_afficherGenerateur(){
  var ctx=EUC_PFMP_contexteAdmin_();if(!ctx.autorise)throw new Error('Accès non autorisé.');
  var tpl=HtmlService.createTemplateFromFile('Convention_PFMP_Generateur');tpl.config=JSON.stringify({version:'Eucalyptus PFMP — v1.0.0-dev.85',baseUrl:ScriptApp.getService().getUrl()});
  return tpl.evaluate().setTitle('Génération des conventions PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_CONVENTION_afficherImpression(e){
  var ctx=EUC_PFMP_contexteAdmin_();if(!ctx.autorise)throw new Error('Accès non autorisé.');
  var token=String(e&&e.parameter&&e.parameter.token||'').trim();if(!token)throw new Error('Jeton manquant.');
  var tpl=HtmlService.createTemplateFromFile('Convention_PFMP_Print');tpl.data=EUC_CONVENTION_donneesImpressionV80(token);return tpl.evaluate().setTitle('Convention PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_CONVENTION_afficherImpressionLot(e){
  var ctx=EUC_PFMP_contexteAdmin_();if(!ctx.autorise)throw new Error('Accès non autorisé.');
  var lot=String(e&&e.parameter&&e.parameter.lot||'').trim();if(!lot)throw new Error('Lot manquant.');
  var d=EUC_CONVENTION_donneesImpressionLot(lot);d.items=(d.items||[]).map(function(item){return EUC_CONVENTION_donneesImpressionV80(item.token);});
  var tpl=HtmlService.createTemplateFromFile('Convention_PFMP_Batch_Print');tpl.data=d;return tpl.evaluate().setTitle('Conventions PFMP — lot classe').addMetaTag('viewport','width=device-width, initial-scale=1');
}
