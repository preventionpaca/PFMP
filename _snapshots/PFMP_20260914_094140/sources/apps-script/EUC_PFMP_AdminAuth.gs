/** Eucalyptus PFMP — v1.0.0-dev.56 — authentification administration de recette. */
function EUC_PFMP_contexteAdmin_() {
  var ctx = EUC_SUIVI_contexteCourant_();
  if (ctx && ctx.autorise && ['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role) >= 0) return ctx;
  var cfg = EUC_ENT_lireConfiguration();
  if (String(cfg.EUC_ENT_ENVIRONMENT || '').toLowerCase() !== 'recette') return ctx;
  var email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) return ctx;
  var allow = String(PropertiesService.getScriptProperties().getProperty('EUC_PFMP_ADMIN_EMAILS') || '').split(/[;,\n]/).map(function(x){ return String(x || '').trim().toLowerCase(); }).filter(Boolean);
  if (allow.indexOf(email) < 0) return ctx;
  return {autorise:true,email:email,nom:email,role:'ADMIN_PFMP',classes:[],peutVoirToutesClasses:true,peutModifier:true,peutSaisir:true,peutAnnuler:true,peutPurgerTests:false,lectureSeule:false,origineAutorisation:'EUC_PFMP_ADMIN_EMAILS_RECETTE'};
}
function EUC_PFMP_diagnosticAdmin_(){
  var cfg=EUC_ENT_lireConfiguration(),email=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase(),allow=String(PropertiesService.getScriptProperties().getProperty('EUC_PFMP_ADMIN_EMAILS')||'').split(/[;,\n]/).map(function(x){return String(x||'').trim().toLowerCase();}).filter(Boolean),ctx=EUC_PFMP_contexteAdmin_();
  return {version:'Eucalyptus PFMP — v1.0.0-dev.56',environnement:String(cfg.EUC_ENT_ENVIRONMENT||''),emailDetecte:email||'(vide)',listeAdminConfiguree:allow.length>0,emailDansListe:!!email&&allow.indexOf(email)>=0,autorise:!!(ctx&&ctx.autorise),role:ctx&&ctx.role||'',origine:ctx&&ctx.origineAutorisation||'EUC_UTILISATEURS_PFMP/aucune'};
}
