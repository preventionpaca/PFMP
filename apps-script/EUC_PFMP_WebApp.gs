/** Eucalyptus PFMP — v1.0.0-dev.113 — accès QR par ID Grist exact. */
function EUC_PFMP_afficherApplication(e) {
  var rid=String(e&&e.parameter&&e.parameter.rid||'').trim();
  var token=String(e&&e.parameter&&e.parameter.token||'').trim();
  var q=String(e&&e.parameter&&e.parameter.q||'').trim();
  var cle=String(e&&e.parameter&&e.parameter.k||'').trim();
  var aid=String(e&&e.parameter&&e.parameter.aid||'').trim();
  var eid=String(e&&e.parameter&&e.parameter.eid||'').trim();
  var sig=String(e&&e.parameter&&e.parameter.sig||'').trim();
  if(rid||token||q||cle||aid){
    var qr=HtmlService.createTemplateFromFile('PFMP_Acces_QR');
    qr.conventionRecordId=rid;
    qr.conventionToken=token;
    qr.conventionCode=q;
    qr.conventionAccessKey=cle;
    qr.conventionAccessId=aid;
    qr.conventionEleveId=eid;
    qr.conventionSignature=sig;
    return qr.evaluate().setTitle('Accès sécurisé PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
  }
  EUC_ENT_controlerAccesUtilisateur_();
  var tpl=HtmlService.createTemplateFromFile('PFMP');
  tpl.turnstileSiteKey=EUC_PFMP_lireConfiguration_().EUC_PFMP_TURNSTILE_SITE_KEY||'';
  tpl.pfmpModes=EUC_PFMP_modesSecurite_();
  tpl.conventionToken='';
  return tpl.evaluate().setTitle('Enregistrement de convention de PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function EUC_PFMP_inclure_(nom) { return HtmlService.createHtmlOutputFromFile(nom).getContent(); }
