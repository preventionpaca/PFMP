/** Eucalyptus PFMP — v1.0.0-dev.161-fix8
 * Renderers lecture seule dédiés à l'ENT.
 */
function EUC_SUIVI_ENT_afficherClassesV161(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var requested=String(e&&e.parameter&&e.parameter.annee||'').trim();
  if(requested && ctx.annees && ctx.annees.some(function(a){return a.code===requested;}))ctx.active=requested;
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classes');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl(),ent:true});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.accueilJson=JSON.stringify(EUC_V154_accueil_(ctx.active));
  return tpl.evaluate().setTitle('Suivi PFMP par classe').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_SUIVI_ENT_afficherClasseV161(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=String(e&&e.parameter&&e.parameter.annee||'').trim()||ctx.active;
  if(classeId<=0)throw new Error('Classe manquante.');
  var detail=EUC_SUIVI_CLASSE_detailV161(annee,classeId,periodeId);
  detail.peutModifier=false;
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl(),ent:true});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);
  return tpl.evaluate().setTitle('Suivi PFMP — '+detail.classe.nom).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
