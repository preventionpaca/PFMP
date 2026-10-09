/**
 * Repere visuel et garde de configuration des canaux de publication PFMP.
 *
 * Le meme paquet est publie sur les deux projets. L'identifiant du projet
 * determine donc le canal sans variable partagee entre le bleu et le vert.
 */
var EUC_RELEASE_BLUE_PROJECT_ID_ = '1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo';
var EUC_RELEASE_RECIPE_HOST_ = 'https://camin.getgrist.com';
var EUC_RELEASE_RECIPE_DOC_ID_ = 'kB8bvDag8x7D';

function EUC_RELEASE_isBlue_() {
  return ScriptApp.getScriptId() === EUC_RELEASE_BLUE_PROJECT_ID_;
}

function EUC_RELEASE_channel_() {
  return EUC_RELEASE_isBlue_() ? 'BLUE' : 'GREEN';
}

function EUC_RELEASE_serviceBase_() {
  var url = '';
  try { url = String(ScriptApp.getService().getUrl() || ''); } catch (e) {}
  /* Apps Script peut retourner l'alias /a/<domaine>/macros/s alors que
   * l'URL partageable du Web App Workspace est /a/macros/<domaine>/s.
   * Le premier alias affiche parfois « autorisation nécessaire » lors d'une
   * navigation depuis l'iframe, même pour un éditeur authentifié. */
  return url.replace(/[?#].*$/, '').replace(
    /^https:\/\/script\.google\.com\/a\/([^/]+)\/macros\/s\//,
    'https://script.google.com/a/macros/$1/s/'
  );
}

/**
 * L'URL /dev du projet bleu n'est accessible qu'aux editeurs Apps Script.
 * Elle constitue donc deja la porte d'entree du bac a sable. Le contexte
 * ci-dessous ne vaut jamais dans le projet vert et les garde-fous bleu
 * maintiennent les mutations metier en DRY_RUN et les courriels desactives.
 * Seul l'import Pronote explicitement confirme peut alimenter la base de
 * recette separee ; la garde serveur verifie encore le projet et le document.
 */
function EUC_RELEASE_blueEditorContext_() {
  if (!EUC_RELEASE_isBlue_()) return null;
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) {}
  return {
    autorise: true,
    email: email,
    nom: email || 'Editeur du canal bleu',
    role: 'ADMIN_PFMP',
    classes: [],
    peutVoirToutesClasses: true,
    peutModifier: true,
    peutSaisir: true,
    peutAnnuler: true,
    peutPurgerTests: false,
    lectureSeule: false,
    origineAutorisation: 'CANAL_BLEU_EDITEUR_DEV'
  };
}

function EUC_RELEASE_blueNavigation_(content) {
  content = String(content || '');
  if (!EUC_RELEASE_isBlue_()) return content;

  var base = EUC_RELEASE_serviceBase_();
  if (!base) return content;
  var home = base + '?page=admin-pfmp';

  /* Les anciens ecrans contiennent encore les deux deploiements verts ou le
   * sous-domaine canonique. Dans le projet bleu uniquement, les ramener vers
   * le meme /dev evite de quitter la recette au milieu d'un parcours. */
  content = content.replace(/https:\/\/alternance\.loucodi\.fr\//g, home);
  content = content.replace(
    /https:\/\/script\.google\.com\/(?:a\/macros\/lycee-les-eucalyptus\.org\/)?s\/(?:AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg|AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA)\/exec/g,
    base
  );
  return content;
}

function EUC_RELEASE_blueSafetyValues_() {
  return {
    EUC_ENT_ENVIRONMENT: 'recette',
    EUC_ENT_ALLOWED_DOMAIN: 'lycee-les-eucalyptus.org',
    EUC_ENT_GRIST_API_URL: EUC_RELEASE_RECIPE_HOST_,
    EUC_ENT_GRIST_DOC_ID: EUC_RELEASE_RECIPE_DOC_ID_,
    EUC_ENT_TABLE_ENTREPRISES: 'EUC_ENTREPRISES',
    EUC_ENT_TABLE_CONTACTS: 'EUC_CONTACTS_ENTREPRISES',
    EUC_ENT_API_RECHERCHE_URL: 'https://recherche-entreprises.api.gouv.fr/search',
    EUC_PFMP_SUBMISSION_MODE: 'DRY_RUN',
    EUC_PFMP_EMAIL_MODE: 'DISABLED',
    EUC_PFMP_PRONOTE_IMPORT_MODE: 'RECIPE_DATA',
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
  var color = blue ? '#0d47a1' : '#18864b';
  var label = blue
    ? 'MODE DÉVELOPPEMENT — SITE BLEU — RECETTE SÉPARÉE'
    : 'ENVIRONNEMENT VERT — VERSION EN LIGNE';
  var banner = '<div data-pfmp-release-channel="' + (blue ? 'blue' : 'green') + '" '
    + 'style="position:fixed;' + (blue ? 'top:0;left:0;right:0;' : 'top:8px;right:12px;')
    + 'z-index:2147483647;padding:' + (blue ? '11px 16px' : '7px 11px') + ';'
    + (blue ? '' : 'border-radius:999px;') + 'background:' + color + ';color:#fff;'
    + 'text-align:center;font:800 ' + (blue ? '14px' : '11px') + '/1.2 Arial,sans-serif;'
    + 'letter-spacing:.05em;box-shadow:0 2px 8px rgba(0,0,0,.28);pointer-events:none">'
    + label + '</div>';
  var content = EUC_RELEASE_blueNavigation_(output.getContent());
  if (content.indexOf('data-pfmp-release-channel=') >= 0) return output;
  var busyStyle='<style data-pfmp-busy-style="1">'+
    'button.pfmp-auto-busy::before{content:"";display:inline-block;width:13px;height:13px;'+
    'margin-right:7px;border:2px solid currentColor;border-right-color:transparent;'+
    'border-radius:50%;vertical-align:-2px;animation:pfmpAutoSpin .7s linear infinite}'+
    '@keyframes pfmpAutoSpin{to{transform:rotate(360deg)}}'+
    '</style>';
  var busyScript='<script data-pfmp-busy-script="1">(function(){'+
    'function sync(b){if(!b||!document.documentElement.contains(b))return;'+
      'var explicit=b.getAttribute("aria-busy")==="true"||b.classList.contains("busy");'+
      'var tracked=b.getAttribute("data-pfmp-auto-pending")==="1";'+
      'var active=explicit||(tracked&&b.disabled);'+
      'var own=b.querySelector&&b.querySelector(".spinner,.loader,[role=progressbar]");'+
      'b.classList.toggle("pfmp-auto-busy",!!active&&!own);'+
      'if(!b.disabled&&!explicit)b.removeAttribute("data-pfmp-auto-pending")}'+
    'document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("button");'+
      'if(!b||b.disabled)return;b.setAttribute("data-pfmp-auto-pending","1");'+
      'setTimeout(function(){sync(b)},0);setTimeout(function(){sync(b)},60)},false);'+
    'new MutationObserver(function(ms){ms.forEach(function(m){var b=m.target&&m.target.closest&&m.target.closest("button");if(b)sync(b)})})'+
      '.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["disabled","class","aria-busy"],childList:true});'+
    '})()<\/script>';
  if (/<\/head>/i.test(content)) {
    content = content.replace(/<\/head>/i, busyStyle + '</head>');
  }
  if (blue && /<\/head>/i.test(content)) {
    content = content.replace(/<\/head>/i, '<style data-pfmp-blue-offset="1">body{padding-top:42px!important}</style></head>');
  }
  /* Placer le bandeau a la fin du body : certains modeles reconstruisent
   * leur contenu au chargement et pouvaient effacer l'ancien petit badge. */
  if (/<\/body>/i.test(content)) {
    content = content.replace(/<\/body>/i, busyScript + banner + '</body>');
  } else if (/<body(?:\s[^>]*)?>/i.test(content)) {
    content = content + banner;
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
  var apiUrl = String(p.getProperty('EUC_ENT_GRIST_API_URL') || '').replace(/\/+$/, '');
  var docId = String(p.getProperty('EUC_ENT_GRIST_DOC_ID') || '');
  return {
    canal: EUC_RELEASE_channel_(),
    projetCorrect: EUC_RELEASE_isBlue_(),
    hoteRecetteCorrect: apiUrl === EUC_RELEASE_RECIPE_HOST_,
    recetteCorrecte: apiUrl === EUC_RELEASE_RECIPE_HOST_ && docId === EUC_RELEASE_RECIPE_DOC_ID_,
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
