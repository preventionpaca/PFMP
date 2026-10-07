/**
 * Repere visuel et garde de configuration des canaux de publication PFMP.
 *
 * Le meme paquet est publie sur les deux projets. L'identifiant du projet
 * determine donc le canal sans variable partagee entre le bleu et le vert.
 */
var EUC_RELEASE_BLUE_PROJECT_ID_ = '1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo';
var EUC_RELEASE_RECIPE_DOC_ID_ = 'j1jDArBkzi7P';

function EUC_RELEASE_isBlue_() {
  return ScriptApp.getScriptId() === EUC_RELEASE_BLUE_PROJECT_ID_;
}

function EUC_RELEASE_channel_() {
  return EUC_RELEASE_isBlue_() ? 'BLUE' : 'GREEN';
}

function EUC_RELEASE_blueSafetyValues_() {
  return {
    EUC_ENT_ENVIRONMENT: 'recette',
    EUC_ENT_ALLOWED_DOMAIN: 'lycee-les-eucalyptus.org',
    EUC_ENT_GRIST_API_URL: 'https://docs.getgrist.com',
    EUC_ENT_GRIST_DOC_ID: EUC_RELEASE_RECIPE_DOC_ID_,
    EUC_ENT_TABLE_ENTREPRISES: 'EUC_ENTREPRISES',
    EUC_ENT_TABLE_CONTACTS: 'EUC_CONTACTS_ENTREPRISES',
    EUC_ENT_API_RECHERCHE_URL: 'https://recherche-entreprises.api.gouv.fr/search',
    EUC_PFMP_SUBMISSION_MODE: 'DRY_RUN',
    EUC_PFMP_EMAIL_MODE: 'DISABLED',
    EUC_PFMP_PRONOTE_IMPORT_MODE: 'DRY_RUN',
    EUC_PFMP_ADMIN_MUTATION_MODE: 'DRY_RUN'
  };
}

function EUC_RELEASE_ensureBlueSafety_() {
  if (!EUC_RELEASE_isBlue_()) return;
  var p = PropertiesService.getScriptProperties();
  var expected = EUC_RELEASE_blueSafetyValues_();
  var changes = {};
  var changed = false;
  Object.keys(expected).forEach(function(key) {
    if (String(p.getProperty(key) || '') !== expected[key]) {
      changes[key] = expected[key];
      changed = true;
    }
  });
  if (changed) p.setProperties(changes, false);
}

function EUC_RELEASE_decorateOutput_(output) {
  if (!output || typeof output.getContent !== 'function' ||
      typeof output.setContent !== 'function') return output;

  var blue = EUC_RELEASE_isBlue_();
  var color = blue ? '#1565c0' : '#18864b';
  var label = blue
    ? 'ENVIRONNEMENT BLEU — DÉVELOPPEMENT'
    : 'ENVIRONNEMENT VERT — VERSION EN LIGNE';
  var banner = '<div data-pfmp-release-channel="' + (blue ? 'blue' : 'green') + '" '
    + 'style="position:fixed;top:8px;right:12px;z-index:2147483647;'
    + 'padding:7px 11px;border-radius:999px;background:' + color + ';color:#fff;'
    + 'font:700 11px/1.2 Arial,sans-serif;letter-spacing:.03em;'
    + 'box-shadow:0 2px 8px rgba(0,0,0,.22);pointer-events:none">'
    + label + '</div>';
  var content = String(output.getContent() || '');
  if (content.indexOf('data-pfmp-release-channel=') >= 0) return output;
  if (/<body(?:\s[^>]*)?>/i.test(content)) {
    content = content.replace(/<body(\s[^>]*)?>/i, function(match) {
      return match + banner;
    });
  } else {
    content = banner + content;
  }
  output.setContent(content);
  return output;
}

/**
 * Initialise uniquement les valeurs non sensibles du projet BLEU.
 * Cette fonction refuse de s'executer sur le projet stable.
 */
function EUC_RELEASE_configurerProjetBleu() {
  if (!EUC_RELEASE_isBlue_()) {
    throw new Error('Configuration refusee : cette fonction est reservee au projet BLEU.');
  }
  EUC_RELEASE_ensureBlueSafety_();
  return EUC_RELEASE_controlerProjetBleu();
}

/** Retourne seulement des presences et des modes non sensibles. */
function EUC_RELEASE_controlerProjetBleu() {
  var p = PropertiesService.getScriptProperties();
  var docId = String(p.getProperty('EUC_ENT_GRIST_DOC_ID') || '');
  return {
    canal: EUC_RELEASE_channel_(),
    projetCorrect: EUC_RELEASE_isBlue_(),
    recetteCorrecte: docId === EUC_RELEASE_RECIPE_DOC_ID_,
    cleRecettePresente: !!String(p.getProperty('EUC_ENT_GRIST_API_KEY') || ''),
    soumissions: String(p.getProperty('EUC_PFMP_SUBMISSION_MODE') || ''),
    courriels: String(p.getProperty('EUC_PFMP_EMAIL_MODE') || ''),
    importPronote: String(p.getProperty('EUC_PFMP_PRONOTE_IMPORT_MODE') || ''),
    mutationsAdmin: String(p.getProperty('EUC_PFMP_ADMIN_MUTATION_MODE') || '')
  };
}

/** Point d'entree appele par le wrapper ajoute au paquet de release. */
function EUC_RELEASE_doGet_(e) {
  EUC_RELEASE_ensureBlueSafety_();
  return EUC_RELEASE_decorateOutput_(EUC_RELEASE_doGetCore_(e));
}
