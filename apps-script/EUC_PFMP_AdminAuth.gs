/** Eucalyptus PFMP — v1.0.0-dev.53 — authentification administration de recette. */
function EUC_PFMP_contexteAdmin_() {
  var ctx = EUC_SUIVI_contexteCourant_();
  if (ctx && ctx.autorise && ['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role) >= 0) return ctx;

  var cfg = EUC_ENT_lireConfiguration();
  if (String(cfg.EUC_ENT_ENVIRONMENT || '').toLowerCase() !== 'recette') return ctx;

  var email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) return ctx;

  var allow = String(PropertiesService.getScriptProperties().getProperty('EUC_PFMP_ADMIN_EMAILS') || '')
    .split(/[;,\n]/)
    .map(function(x){ return String(x || '').trim().toLowerCase(); })
    .filter(Boolean);

  if (allow.indexOf(email) < 0) return ctx;

  return {
    autorise: true,
    email: email,
    nom: email,
    role: 'ADMIN_PFMP',
    classes: [],
    peutVoirToutesClasses: true,
    peutModifier: true,
    peutSaisir: true,
    peutAnnuler: true,
    peutPurgerTests: false,
    lectureSeule: false,
    origineAutorisation: 'EUC_PFMP_ADMIN_EMAILS_RECETTE'
  };
}
