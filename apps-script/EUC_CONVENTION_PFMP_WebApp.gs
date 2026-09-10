/** Eucalyptus PFMP — v1.0.0-dev.95 — générateur PDF maître 2 pages + conservation Word secondaire. */
function EUC_CONVENTION_afficherGenerateur(){
  var ctx=EUC_PFMP_contexteAdmin_();if(!ctx.autorise)throw new Error('Accès non autorisé.');
  var tpl=HtmlService.createTemplateFromFile('Convention_PFMP_Generateur');tpl.config=JSON.stringify({version:'Eucalyptus PFMP — v1.0.0-dev.95',baseUrl:ScriptApp.getService().getUrl()});
  return tpl.evaluate().setTitle('Génération des conventions PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_CONVENTION_htmlLienDrive_(titre,texte,url,folderUrl){
  function e(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  var h='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;background:#eef7f4;color:#073b35;margin:0}main{max-width:760px;margin:50px auto;padding:24px}.card{background:white;border:1px solid #cfe1dc;border-radius:14px;padding:24px}a.btn{display:inline-block;background:#07866e;color:white;padding:.8rem 1rem;border-radius:8px;text-decoration:none;font-weight:700;margin:8px 8px 0 0}.muted{color:#56706b}</style></head><body><main><section class="card"><h1>'+e(titre)+'</h1><p>'+e(texte)+'</p><a class="btn" href="'+e(url)+'" target="_blank">Ouvrir le document Word</a>'+(folderUrl?'<a class="btn" href="'+e(folderUrl)+'" target="_blank">Ouvrir le dossier Drive</a>':'')+'<p class="muted">Sortie Word secondaire conservée pour archivage/modification.</p></section></main></body></html>';
  return HtmlService.createHtmlOutput(h).setTitle(titre).addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_CONVENTION_afficherImpression(e){
  var ctx=EUC_PFMP_contexteAdmin_();if(!ctx.autorise)throw new Error('Accès non autorisé.');
  var token=String(e&&e.parameter&&e.parameter.token||'').trim();if(!token)throw new Error('Jeton manquant.');
  if(String(e.parameter&&e.parameter.format||'').toLowerCase()==='word'){var d=EUC_DOCX_genererDepuisToken(token);return EUC_CONVENTION_htmlLienDrive_('Convention PFMP Word','Convention générée : '+d.nom,d.url,d.folderUrl);}
  var tpl=HtmlService.createTemplateFromFile('Convention_PFMP_PdfV95');tpl.payload=JSON.stringify(EUC_PDF_payloadTokenV95(token));return tpl.evaluate().setTitle('Convention PFMP — PDF').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_CONVENTION_afficherImpressionLot(e){
  var ctx=EUC_PFMP_contexteAdmin_();if(!ctx.autorise)throw new Error('Accès non autorisé.');
  var lot=String(e&&e.parameter&&e.parameter.lot||'').trim();if(!lot)throw new Error('Lot manquant.');
  if(String(e.parameter&&e.parameter.format||'').toLowerCase()==='word'){var d=EUC_CONVENTION_donneesImpressionLot(lot),tokens=(d.items||[]).map(function(i){return i.token;}).filter(Boolean),r=EUC_DOCX_genererLotImprimableV94(tokens);return EUC_CONVENTION_htmlLienDrive_('Lot PFMP Word',r.total+' conventions regroupées dans un seul document Word imprimable.',r.url,r.folderUrl);}
  var tpl=HtmlService.createTemplateFromFile('Convention_PFMP_PdfV95');tpl.payload=JSON.stringify(EUC_PDF_payloadLotV95(lot));return tpl.evaluate().setTitle('Conventions PFMP — lot PDF').addMetaTag('viewport','width=device-width, initial-scale=1');
}
