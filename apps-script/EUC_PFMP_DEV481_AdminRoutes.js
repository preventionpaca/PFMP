/**
 * DEV481 - Point d'entree stable des liens affiches par l'accueil PFMP.
 *
 * Ce routeur est volontairement place avant les anciens routeurs DEV190.
 * Une page administrative ne doit jamais etre bloquee par l'absence d'un
 * module historique qui ne la concerne pas.
 */
function EUC_DEV481_routeAccueil_(e) {
  var page = String(e && e.parameter && e.parameter.page || '').toLowerCase();

  switch (page) {
    case 'admin-pfmp':
      return EUC_CENTRE_ADMIN_afficherApplication(e);
    case 'import-pronote-pfmp':
      return EUC_IMPORT_afficherApplication(e);
    case 'import-prof-classes-pfmp':
      return EUC_PC_afficherSynchronisation(e);
    case 'diplomes-classes-pfmp':
      return EUC_PC_afficherDiplomes(e);
    case 'parametres-convention-pfmp':
      return EUC_PARAM_CONV_afficher(e);
    case 'conventions-pfmp':
      return EUC_P7_generateur(e);
    case 'gestion-pfmp':
      return EUC_ADMIN_afficherApplication(e);
    case 'suivi-pfmp':
      return EUC_SUIVI_afficherApplication(e);
    case 'admin-conventions-pfmp':
      return EUC_P7_adminConventions(e);
    case 'migration-jotform-pfmp':
      return EUC_P7_migration(e);
    case 'destinataires-envois-pfmp':
      return EUC_P7_destinataires(e);
    case 'parametres-envois-pfmp':
      return EUC_P7_parametresEnvois(e);

    case 'apprentissage-pfmp':
      return EUC_DEV190X_afficherApprentis(e);
    case 'apprentissage-public-pfmp':
      return EUC_DEV252_afficherApprentisPublic(e);
    case 'parcours-differencie-pfmp':
      return EUC_DEV190X_afficherPdif(e);
    case 'dossier-apprentissage-pfmp':
      return EUC_DEV464_afficherDossierApprentissage(e);

    case 'suivi-conventions':
    case 'suivi-pfmp-classes':
      return EUC_DEV481_afficherSuivi_(e);
    case 'snapshot-pfmp-admin':
      return EUC_DEV481_afficherSnapshot_(e);
    case 'suivi-conventions-public':
      return EUC_DEV348_publicSummary(e);

    case 'sans-convention-pfmp':
      return EUC_DEV368_afficherSans(e);
    case 'ordres-mission-pfmp':
      return EUC_DEV368_afficherMissions(e);
    case 'acces-pp-admin':
      return EUC_DEV441_afficherPpAdmin(e);
    case 'acces-pp-pfmp':
      return EUC_DEV441_afficherPp(e);
    case 'geocodage-pfmp-admin':
      return EUC_DEV441_afficherGeoAdmin(e);
    case 'cartographie-pfmp':
      return EUC_DEV441_afficherCarte(e);
    default:
      return null;
  }
}

function EUC_DEV481_afficherSuivi_(e) {
  var contexte = EUC_PFMP_contexteAnneeLectureV155_();
  var annee = String(
    e && e.parameter && e.parameter.annee || contexte.active || ''
  );
  var template = HtmlService.createTemplateFromFile(
    'Suivi_Conventions_Admin_LazyV190K4'
  );
  template.paramsJson = JSON.stringify({annee: annee});
  template.baseUrl = ScriptApp.getService().getUrl();
  return EUC_DEV481_accueilCanonique_(
    EUC_DEV484_nettoyerAccueilSuivi_(template.evaluate())
  )
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* DEV484 — restauration visuelle limitée à l'accueil administratif du suivi.
 * La page publique suit une route et un modèle distincts et n'est jamais
 * transformée par cette fonction. */
function EUC_DEV484_nettoyerAccueilSuivi_(output) {
  var html = output.getContent();
  html = html.replace(/<div class="quick">[^<]*<\/div>/g, '');
  html = html.replace(
    '</head>',
    '<style id="EUC_DEV484_SUIVI_ADMIN_STYLE">'+
      '.crumb a,.crumb a:visited,.crumb a:hover,.crumb a:active{'+
        'color:#0b745f;text-decoration:none;font-weight:700}'+
      '.card{min-height:0}'+
    '</style></head>'
  );
  return HtmlService.createHtmlOutput(html);
}

function EUC_DEV481_afficherSnapshot_(e) {
  var template = HtmlService.createTemplateFromFile(
    'Snapshot_PFMP_Admin_V190'
  );
  template.baseUrl = ScriptApp.getService().getUrl();
  return EUC_DEV481_accueilCanonique_(
    template.evaluate()
  )
    .setTitle('Maintenance Snapshot PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV481_accueilCanonique_(output) {
  var html = output.getContent();
  html = html.replace(
    /https:\/\/script\.google\.com\/a\/macros\/lycee-les-eucalyptus\.org\/s\/[A-Za-z0-9_-]+\/exec\?page=admin-pfmp/g,
    'https://alternance.loucodi.fr/'
  );
  return HtmlService.createHtmlOutput(html);
}
