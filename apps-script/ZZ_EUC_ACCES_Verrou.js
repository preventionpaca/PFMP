/**
 * DEV571 — Verrou d'accès des fonctions appelables et clé des liens enseignants.
 *
 * Apps Script laisse appeler par `google.script.run` toute fonction globale
 * dont le nom ne finit pas par `_`, depuis n'importe quelle page du projet, y
 * compris par un visiteur anonyme. Ce fichier est chargé en dernier (ordre
 * alphabétique de `clasp push`) : il enveloppe chaque fonction globale et
 * contrôle l'appel d'entrée d'une exécution.
 *
 * Règles (mode TRANSITION, par défaut) :
 *  - fonction utilisée par une page : ouverte, comme avant ;
 *  - fonction utilisée par aucune page : réservée aux administrateurs et au
 *    propriétaire du script (déclencheurs).
 * Mode EXIGEE (activé dans Paramétrage → Liens d'accès, une fois les liens
 * Atrium remplacés) :
 *  - seules les fonctions des pages élèves, familles et PP restent ouvertes ;
 *  - les autres fonctions des pages exigent la clé des liens enseignants ou
 *    un administrateur ;
 *  - les pages enseignants et les pages d'audit exigent la clé.
 *
 * La clé n'est jamais stockée en clair : seule son empreinte SHA-256 l'est.
 */
var EUC_ACCES_VERSION_ = '1.0.0-dev.571';
var EUC_ACCES_P_HASH_ = 'EUC_ACCES_ENS_CLE_SHA256';
var EUC_ACCES_P_SECRET_ = 'EUC_ACCES_ENS_SECRET';
var EUC_ACCES_P_MODE_ = 'EUC_ACCES_ENS_MODE';
var EUC_ACCES_P_DATE_ = 'EUC_ACCES_ENS_DATE';
var EUC_ACCES_JOURNAL_KEY_ = 'EUC_ACCES_JOURNAL';
var EUC_ACCES_SESSION_TTL_ = 21600; /* 6 h, maximum de CacheService */
var EUC_ACCES_JETON_TTL_MS_ = 12 * 3600 * 1000;
var EUC_ACCES_PARAM_ = 'acces';
var EUC_ACCES_PARAM_JETON_ = 'jeton';

/* Entrées d'exécution d'Apps Script : toujours permises, elles ne sont pas
 * appelables par google.script.run et contrôlent elles-mêmes leurs droits. */
var EUC_ACCES_ENTREES_ = {
  doGet: 1, doPost: 1, onOpen: 1, onEdit: 1, onInstall: 1, onChange: 1,
  onFormSubmit: 1, onSelectionChange: 1,
  /* Écran « Liens d'accès » : chaque fonction vérifie l'administrateur. */
  EUC_ACCES_afficherLiens: 1, EUC_ACCES_etatLiens: 1, EUC_ACCES_genererCle: 1,
  EUC_ACCES_changerMode: 1, EUC_ACCES_viderJournal: 1,
  /* Lien de secours par courriel : contrôle propre (liste des professeurs). */
  EUC_ACCES_demanderLienSecours: 1
};

/* Routes des liens enseignants (pfmp.loucodi.fr, apprentis.loucodi.fr). */
var EUC_ACCES_ROUTES_ENSEIGNANTS_ = {
  'suivi-conventions-public': 1,
  'suivi-conventions-public-famille': 1,
  'suivi-pfmp-classe-public': 1,
  'book-entreprises-public-pfmp': 1,
  'cartographie-pfmp': 1,
  'apprentissage-public-pfmp': 1,
  'cartographie-apprentis-public-pfmp': 1,
  'suivi-pfmp-enseignants': 1,
  'suivi-apprentis-enseignants': 1
};

/* Pages techniques sans contrôle propre qui affichent des noms d'élèves. */
var EUC_ACCES_ROUTES_TECHNIQUES_ = /^(audit-|diag-|perf-|dev26[89]-|pfmp-diagnostic$|reprise-idempotente$|reparation-statut-remplacement$)/;

var EUC_ACCES_etat_ = { profondeur: 0, enseignant: false, admin: null, mode: null, ens: null };

function EUC_ACCES_props_() { return PropertiesService.getScriptProperties(); }

function EUC_ACCES_mode_() {
  if (EUC_ACCES_etat_.mode === null) {
    var m = '';
    try { m = String(EUC_ACCES_props_().getProperty(EUC_ACCES_P_MODE_) || ''); } catch (e) {}
    EUC_ACCES_etat_.mode = m === 'EXIGEE' ? 'EXIGEE' : 'TRANSITION';
  }
  return EUC_ACCES_etat_.mode;
}

function EUC_ACCES_hex_(bytes) {
  return bytes.map(function(b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function EUC_ACCES_sha256_(texte) {
  return EUC_ACCES_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texte), Utilities.Charset.UTF_8));
}

function EUC_ACCES_hmac_(texte, secret) {
  return EUC_ACCES_hex_(Utilities.computeHmacSha256Signature(String(texte), String(secret), Utilities.Charset.UTF_8));
}

function EUC_ACCES_egal_(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* Clé, secret de signature et date, lus une fois par exécution. */
function EUC_ACCES_config_() {
  if (EUC_ACCES_etat_.ens === null) {
    var p = {};
    try { p = EUC_ACCES_props_().getProperties(); } catch (e) {}
    EUC_ACCES_etat_.ens = {
      hash: String(p[EUC_ACCES_P_HASH_] || ''),
      secret: String(p[EUC_ACCES_P_SECRET_] || ''),
      date: String(p[EUC_ACCES_P_DATE_] || '')
    };
  }
  return EUC_ACCES_etat_.ens;
}

function EUC_ACCES_cleValide_(cle) {
  var c = EUC_ACCES_config_();
  cle = String(cle || '').trim();
  return !!(c.hash && cle.length >= 32 && EUC_ACCES_egal_(EUC_ACCES_sha256_(cle), c.hash));
}

/* Jeton de session enseignant : échéance signée par le secret courant. */
function EUC_ACCES_creerJeton_() {
  var c = EUC_ACCES_config_();
  if (!c.secret) return '';
  var exp = String(Date.now() + EUC_ACCES_JETON_TTL_MS_);
  return exp + '.' + EUC_ACCES_hmac_('ENS|' + exp, c.secret);
}

function EUC_ACCES_jetonValide_(jeton) {
  var c = EUC_ACCES_config_(), parts = String(jeton || '').split('.');
  /* Lien de secours personnel : échéance.professeur.signature (12 h). */
  if (c.secret && parts.length === 3 && /^\d{10,16}$/.test(parts[0]) && /^\d{1,9}$/.test(parts[1])) {
    return Number(parts[0]) >= Date.now() && EUC_ACCES_egal_(parts[2], EUC_ACCES_hmac_('SEC|' + parts[0] + '|' + parts[1], c.secret));
  }
  if (!c.secret || parts.length !== 2 || !/^\d{10,16}$/.test(parts[0])) return false;
  if (Number(parts[0]) < Date.now()) return false;
  return EUC_ACCES_egal_(parts[1], EUC_ACCES_hmac_('ENS|' + parts[0], c.secret));
}

function EUC_ACCES_cleSession_() {
  var k = '';
  try { k = String(Session.getTemporaryActiveUserKey() || ''); } catch (e) {}
  var c = EUC_ACCES_config_();
  return k && c.secret ? 'EUC_ACCES_ENS_' + EUC_ACCES_sha256_(k + '|' + c.secret).slice(0, 40) : '';
}

function EUC_ACCES_ouvrirSession_() {
  EUC_ACCES_etat_.enseignant = true;
  var k = EUC_ACCES_cleSession_();
  if (k) { try { CacheService.getScriptCache().put(k, '1', EUC_ACCES_SESSION_TTL_); } catch (e) {} }
  return !!k;
}

function EUC_ACCES_sessionOuverte_() {
  if (EUC_ACCES_etat_.enseignant) return true;
  var k = EUC_ACCES_cleSession_();
  if (!k) return false;
  try { EUC_ACCES_etat_.enseignant = CacheService.getScriptCache().get(k) === '1'; } catch (e) {}
  return EUC_ACCES_etat_.enseignant;
}

/* Administrateur ou propriétaire du script (déclencheurs). Coût : une lecture
 * de cache au plus, sauf première vérification d'un compte du domaine. */
function EUC_ACCES_estAdmin_() {
  if (EUC_ACCES_etat_.admin !== null) return EUC_ACCES_etat_.admin;
  var ok = false, email = '', proprio = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) {}
  try { proprio = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) {}
  if (email && email === proprio) ok = true;
  if (!ok && typeof EUC_RELEASE_blueEditorContext_ === 'function') {
    try { ok = !!EUC_RELEASE_blueEditorContext_(); } catch (e) {}
  }
  if (!ok && typeof EUC_DEV270B_contextOrNull_ === 'function') {
    try { ok = !!EUC_DEV270B_contextOrNull_(); } catch (e) {}
  }
  if (!ok && email && typeof EUC_DEV270B_lookupUser_ === 'function') {
    var cache = null, cle = 'EUC_ACCES_ROLE_' + EUC_ACCES_sha256_(email).slice(0, 40), lu = null;
    try { cache = CacheService.getScriptCache(); lu = cache.get(cle); } catch (e) {}
    if (lu === null) {
      try { lu = EUC_DEV270B_lookupUser_(email) ? '1' : '0'; } catch (e) { lu = '0'; }
      try { if (cache) cache.put(cle, lu, 600); } catch (e) {}
    }
    ok = lu === '1';
  }
  EUC_ACCES_etat_.admin = ok;
  return ok;
}

function EUC_ACCES_anonyme_() {
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || ''); } catch (e) {}
  return !email;
}

/* Journal léger (cache, 6 h) : ce qui a été refusé ou serait refusé une fois
 * la clé exigée. Sert à vérifier avant de passer en mode EXIGEE. */
function EUC_ACCES_noter_(type, nom) {
  try {
    var cache = CacheService.getScriptCache();
    var j = JSON.parse(cache.get(EUC_ACCES_JOURNAL_KEY_) || '{}');
    var k = type + '|' + nom, e = j[k] || { n: 0 };
    e.n += 1; e.d = new Date().toISOString();
    j[k] = e;
    var cles = Object.keys(j);
    if (cles.length > 200) {
      cles.sort(function(a, b) { return String(j[a].d).localeCompare(String(j[b].d)); });
      cles.slice(0, cles.length - 200).forEach(function(x) { delete j[x]; });
    }
    cache.put(EUC_ACCES_JOURNAL_KEY_, JSON.stringify(j), EUC_ACCES_SESSION_TTL_);
  } catch (e) {}
}

var EUC_ACCES_cacheEnsembles_ = null;
function EUC_ACCES_ensembles_() {
  if (!EUC_ACCES_cacheEnsembles_) {
    var ref = {}, pub = {};
    (typeof EUC_ACCES_REFERENCEES_ !== 'undefined' ? EUC_ACCES_REFERENCEES_ : []).forEach(function(n) { ref[n] = 1; });
    (typeof EUC_ACCES_PUBLIQUES_ !== 'undefined' ? EUC_ACCES_PUBLIQUES_ : []).forEach(function(n) { pub[n] = 1; });
    EUC_ACCES_cacheEnsembles_ = { ref: ref, pub: pub };
  }
  return EUC_ACCES_cacheEnsembles_;
}

function EUC_ACCES_estJetonArg_(v) {
  return !!(v && typeof v === 'object' && !Array.isArray(v) &&
    Object.keys(v).length === 1 && typeof v.__eucAcces === 'string');
}

/* Décision pour l'appel d'entrée d'une exécution (google.script.run ou
 * déclencheur). Retourne true pour laisser passer. */
function EUC_ACCES_autoriserAppel_(nom, jeton) {
  var e = EUC_ACCES_ensembles_();
  /* Le jeton est lu avant tout : une fonction publique (carte, book) peut
   * renvoyer plus de détails à un enseignant identifié par son lien. */
  if (jeton && EUC_ACCES_jetonValide_(jeton)) EUC_ACCES_etat_.enseignant = true;
  if (e.pub[nom]) return true;
  if (e.ref[nom]) {
    if (EUC_ACCES_etat_.enseignant || EUC_ACCES_sessionOuverte_()) return true;
    if (EUC_ACCES_mode_() !== 'EXIGEE') {
      if (EUC_ACCES_anonyme_()) EUC_ACCES_noter_('appel-sans-cle', nom);
      return true;
    }
  }
  if (EUC_ACCES_estAdmin_()) return true;
  EUC_ACCES_noter_(e.ref[nom] ? 'refus-cle' : 'refus-fonction', nom);
  return false;
}

function EUC_ACCES_envelopper_(nom, original) {
  var entree = !!EUC_ACCES_ENTREES_[nom];
  var enveloppe = function() {
    var args = Array.prototype.slice.call(arguments), jeton = '';
    if (new.target) return Reflect.construct(original, args);
    if (args.length && EUC_ACCES_estJetonArg_(args[args.length - 1])) {
      jeton = args.pop().__eucAcces;
    }
    EUC_ACCES_etat_.profondeur++;
    if (EUC_ACCES_etat_.profondeur === 1 && !entree) {
      /* La décision elle-même appelle d'autres fonctions (lecture du rôle) :
       * la profondeur est déjà comptée pour qu'elles passent sans contrôle. */
      var ok = false;
      try { ok = EUC_ACCES_autoriserAppel_(nom, jeton); } catch (e) { ok = false; }
      if (!ok) {
        EUC_ACCES_etat_.profondeur--;
        throw new Error('Accès refusé.');
      }
    }
    try {
      return original.apply(this, args);
    } finally {
      EUC_ACCES_etat_.profondeur--;
    }
  };
  enveloppe.__eucAccesOriginal = original;
  return enveloppe;
}

function EUC_ACCES_installer_(global) {
  if (global.__EUC_ACCES_INSTALLE__) return 0;
  var n = 0;
  Object.getOwnPropertyNames(global).forEach(function(nom) {
    if (/_$/.test(nom) || nom.indexOf('__') === 0) return;
    var v;
    try { v = global[nom]; } catch (e) { return; }
    if (typeof v !== 'function' || v.__eucAccesOriginal) return;
    /* Seules les fonctions du script sont concernées, pas les services. */
    if (!/^[A-Za-z$][\w$]*$/.test(nom) || /^[A-Z][a-zA-Z]+App$|^(Utilities|Session|Logger|console|JSON|Math|Date|Object|Array|String|Number|Boolean|RegExp|Error|Function|Promise|Symbol|Map|Set|WeakMap|WeakSet|Proxy|Reflect|Intl|parseInt|parseFloat|isNaN|isFinite|encodeURIComponent|decodeURIComponent|encodeURI|decodeURI|escape|unescape|eval)$/.test(nom)) return;
    try { global[nom] = EUC_ACCES_envelopper_(nom, v); n++; } catch (e) {}
  });
  global.__EUC_ACCES_INSTALLE__ = true;
  return n;
}

/* Le book « personnels » reconnaît aussi la session d'un lien enseignant. */
(function(global) {
  var original = global.EUC_DEV538_staffAllowed_;
  if (typeof original !== 'function') return;
  global.EUC_DEV538_staffAllowed_ = function() {
    if (EUC_ACCES_etat_.enseignant || EUC_ACCES_sessionOuverte_()) return true;
    return original.apply(this, arguments);
  };
})(this);

/* ---------- Pages : contrôle de route et injection du jeton ---------- */

function EUC_ACCES_pageRefus_(page) {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Lien d’accès requis</title></head><body data-euc-acces-requis="1" style="font:16px/1.5 Arial,sans-serif;margin:0;padding:32px;color:#163;background:#f7fbf9">' +
    '<h1 style="font-size:22px">Lien d’accès requis</h1>' +
    '<p>Cette page est réservée aux personnels du lycée. Ouvrez-la depuis le lien de l’ENT Atrium.</p>' +
    '<p>Si votre lien ne fonctionne plus, demandez le nouveau lien au bureau des entreprises.</p>' +
    EUC_ACCES_formSecours_(page) +
    '</body></html>'
  ).setTitle('Lien d’accès requis').addMetaTag('viewport', 'width=device-width, initial-scale=1')
    /* DEV578 : affichable dans les coquilles pfmp/apprentis.loucodi.fr (sinon « script.google.com est bloqué »). */
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* Appelé par EUC_RELEASE_doGet_ avant le rendu. Retourne une page de refus,
 * ou null pour laisser la route s'afficher. */
function EUC_ACCES_controlerRoute_(e) {
  var p = (e && e.parameter) || {};
  var page = String(p.page || '').toLowerCase();
  var cle = String(p[EUC_ACCES_PARAM_] || '');
  if (cle && EUC_ACCES_cleValide_(cle)) EUC_ACCES_ouvrirSession_();
  else if (p[EUC_ACCES_PARAM_JETON_] && EUC_ACCES_jetonValide_(p[EUC_ACCES_PARAM_JETON_])) {
    EUC_ACCES_ouvrirSession_();
    var sp = String(p[EUC_ACCES_PARAM_JETON_]).split('.');
    if (sp.length === 3 && p.orig != null) EUC_ACCES_noter_('secours-ouverture', EUC_ACCES_secoursQui_(sp[1]));
  }

  var enseignant = !!EUC_ACCES_ROUTES_ENSEIGNANTS_[page];
  var technique = EUC_ACCES_ROUTES_TECHNIQUES_.test(page);
  /* DEV578 — observation : origine du clic transmise par les coquilles
   * pfmp.loucodi.fr / apprentis.loucodi.fr à la première ouverture d'un onglet. */
  if (enseignant && p.orig != null) EUC_ACCES_noter_('origine', page + ' ← ' + (String(p.orig).replace(/[^a-z0-9.\-]/gi, '').slice(0, 60) || 'ouverture directe (sans origine)'));
  if (!enseignant && !technique) return null;
  if (EUC_ACCES_etat_.enseignant || EUC_ACCES_sessionOuverte_()) return null;
  if (EUC_ACCES_mode_() !== 'EXIGEE') {
    if (EUC_ACCES_anonyme_()) EUC_ACCES_noter_('page-sans-cle', page);
    return null;
  }
  if (EUC_ACCES_estAdmin_()) return null;
  EUC_ACCES_noter_('page-refusee', page);
  return EUC_ACCES_pageRefus_(page);
}

/* Script ajouté aux pages servies avec une session enseignant : il ajoute le
 * jeton signé aux appels google.script.run et aux liens internes. */
function EUC_ACCES_scriptPage_() {
  if (!(EUC_ACCES_etat_.enseignant || EUC_ACCES_sessionOuverte_())) return '';
  var jeton = EUC_ACCES_creerJeton_();
  if (!jeton) return '';
  return '<script data-euc-acces="1">(function(){var T=' + JSON.stringify(jeton) + ';' +
    'function wrap(r){if(!r||typeof Proxy!=="function")return r;return new Proxy(r,{get:function(t,p){var v=t[p];' +
      'if(typeof v!=="function")return v;' +
      'if(p==="withSuccessHandler"||p==="withFailureHandler"||p==="withUserObject")return function(){return wrap(v.apply(t,arguments))};' +
      'return function(){var a=Array.prototype.slice.call(arguments);a.push({__eucAcces:T});return v.apply(t,a)}}})}' +
    'try{var g=window.google&&google.script;if(g&&g.run){var d=Object.getOwnPropertyDescriptor(g,"run");' +
      'if(d&&d.get&&d.configurable)Object.defineProperty(g,"run",{configurable:true,get:function(){return wrap(d.get.call(g))}});' +
      'else if(!d||d.writable)g.run=wrap(g.run)}}catch(e){}' +
    'function lien(a){try{var h=a.getAttribute("href");if(!h||/[?&]' + EUC_ACCES_PARAM_JETON_ + '=/.test(h))return;' +
      'var u=new URL(h,location.href),sd=/^(pfmp|apprentis)\\.loucodi\\.fr$/.test(u.hostname);' +
      'if(!sd&&!/[?&]page=/.test(h))return;' +
      'if(!sd&&!/script\\.google(usercontent)?\\.com$/.test(u.hostname)&&u.origin!==location.origin)return;' +
      'u.searchParams.set("' + EUC_ACCES_PARAM_JETON_ + '",T);a.setAttribute("href",u.toString())}catch(e){}}' +
    'document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(a)lien(a)},true);' +
    '})()<\/script>';
}

function EUC_ACCES_decorer_(output) {
  if (!output || typeof output.getContent !== 'function' || typeof output.setContent !== 'function') return output;
  var s = '';
  try { s = EUC_ACCES_scriptPage_(); } catch (e) {}
  if (!s) return output;
  var c = output.getContent();
  if (/<head[^>]*>/i.test(c)) c = c.replace(/<head[^>]*>/i, function(m) { return m + s; });
  else c = s + c;
  output.setContent(c);
  return output;
}

/* ---------- Écran Paramétrage → Liens d'accès ---------- */

function EUC_ACCES_exigerGestionnaire_() {
  var ctx = null;
  if (typeof EUC_PFMP_contexteAdmin_ === 'function') ctx = EUC_PFMP_contexteAdmin_();
  if (!ctx || !ctx.autorise || ['ADMIN_PFMP', 'DDFPT'].indexOf(ctx.role) < 0) {
    throw new Error('Accès réservé aux administrateurs PFMP et à la DDFPT.');
  }
  return ctx;
}

function EUC_ACCES_afficherLiens(e) {
  EUC_ACCES_exigerGestionnaire_();
  var t = HtmlService.createTemplateFromFile('Liens_Acces_DEV571');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  return t.evaluate().setTitle('Liens d’accès — PFMP').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function EUC_ACCES_liens_(cle) {
  var q = encodeURIComponent(cle);
  return [
    { libelle: 'Suivi des PFMP — enseignants', url: 'https://pfmp.loucodi.fr/?' + EUC_ACCES_PARAM_ + '=' + q },
    { libelle: 'Book des entreprises — professeurs', url: 'https://pfmp.loucodi.fr/?page=book-entreprises-public-pfmp&' + EUC_ACCES_PARAM_ + '=' + q },
    { libelle: 'Suivi des apprentis — enseignants', url: 'https://apprentis.loucodi.fr/?' + EUC_ACCES_PARAM_ + '=' + q },
    { libelle: 'Book des entreprises — élèves et familles (sans clé)', url: 'https://book-entreprise.loucodi.fr/' }
  ];
}

function EUC_ACCES_lireJournal_() {
  var j = {};
  try { j = JSON.parse(CacheService.getScriptCache().get(EUC_ACCES_JOURNAL_KEY_) || '{}'); } catch (e) {}
  return Object.keys(j).map(function(k) {
    var i = k.indexOf('|');
    return { type: k.slice(0, i), nom: k.slice(i + 1), nombre: j[k].n, dernier: j[k].d };
  }).sort(function(a, b) { return String(b.dernier).localeCompare(String(a.dernier)); });
}

function EUC_ACCES_etatLiens() {
  EUC_ACCES_exigerGestionnaire_();
  var c = EUC_ACCES_config_();
  return {
    version: EUC_ACCES_VERSION_,
    cleConfiguree: !!c.hash,
    dateCle: c.date,
    mode: EUC_ACCES_mode_(),
    sessionNavigateurDisponible: !!(function() { try { return Session.getTemporaryActiveUserKey(); } catch (e) { return ''; } })(),
    journal: EUC_ACCES_lireJournal_(),
    familles: 'https://book-entreprise.loucodi.fr/'
  };
}

function EUC_ACCES_genererCle() {
  var ctx = EUC_ACCES_exigerGestionnaire_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Une autre génération est en cours. Réessayez.');
  try {
    var cle = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    var secret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    var date = new Date().toISOString();
    var props = {};
    props[EUC_ACCES_P_HASH_] = EUC_ACCES_sha256_(cle);
    props[EUC_ACCES_P_SECRET_] = secret;
    props[EUC_ACCES_P_DATE_] = date + ' — ' + String(ctx.email || '');
    EUC_ACCES_props_().setProperties(props, false);
    EUC_ACCES_etat_.ens = null;
    return { liens: EUC_ACCES_liens_(cle), date: props[EUC_ACCES_P_DATE_] };
  } finally {
    lock.releaseLock();
  }
}

function EUC_ACCES_changerMode(mode) {
  EUC_ACCES_exigerGestionnaire_();
  mode = mode === 'EXIGEE' ? 'EXIGEE' : 'TRANSITION';
  if (mode === 'EXIGEE' && !EUC_ACCES_config_().hash) {
    throw new Error('Générez d’abord la clé et remplacez les liens dans Atrium.');
  }
  EUC_ACCES_props_().setProperty(EUC_ACCES_P_MODE_, mode);
  EUC_ACCES_etat_.mode = mode;
  return EUC_ACCES_etatLiens();
}

function EUC_ACCES_viderJournal() {
  EUC_ACCES_exigerGestionnaire_();
  try { CacheService.getScriptCache().remove(EUC_ACCES_JOURNAL_KEY_); } catch (e) {}
  return EUC_ACCES_etatLiens();
}

/* Installation au chargement : ce fichier est le dernier du projet. Les
 * fonctions de l'écran ci-dessus sont des entrées : elles vérifient
 * elles-mêmes l'administrateur. */
var EUC_SONDE_T1_ = Date.now();
EUC_ACCES_installer_(this);
var EUC_SONDE_T2_ = Date.now();

/* DEV573 — ?page=sonde-performance : durées seules, aucune donnée.
 * chargementMs = exécution du code de tous les fichiers serveur ;
 * verrouMs = installation du verrou ; avantPageMs = du chargement à la page. */
function EUC_SONDE_reponse_(e) {
  var t0 = typeof EUC_SONDE_T0_ === 'number' ? EUC_SONDE_T0_ : null;
  var r = {
    version: EUC_ACCES_VERSION_,
    chargementMs: t0 === null ? null : EUC_SONDE_T1_ - t0,
    verrouMs: EUC_SONDE_T2_ - EUC_SONDE_T1_,
    avantPageMs: Date.now() - EUC_SONDE_T2_
  };
  if (e && e.parameter && e.parameter.grist === '1') r.grist = EUC_SONDE_grist_();
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}

/* DEV575 — Coût de lecture des tables sources du suivi et témoin de
 * modification du document (/states). Nombres seulement ; une mesure par
 * minute au plus, les autres demandes reçoivent la dernière mesure. */
var EUC_SONDE_TABLES_ = ['Planning_Periodes', 'Classes', 'Annees_Scolaires', 'EUC_ELEVES_PFMP', 'EUC_ACCES_FORMULAIRES_PFMP', 'EUC_APPRENTISSAGE_PFMP', 'EUC_PARCOURS_DIFFERENCIE_PFMP', 'EUC_CLASSES_DIPLOMES_PFMP', 'EUC_AFFECTATIONS_SUIVI_PFMP'];
function EUC_SONDE_grist_() {
  var cache = CacheService.getScriptCache(), dernier = cache.get('EUC_SONDE_GRIST');
  if (dernier) { var d = JSON.parse(dernier); d.depuisCache = true; return d; }
  var c = EUC_ENT_lireConfiguration(), base = String(c.EUC_ENT_GRIST_API_URL || '').replace(/\/$/, '') + '/api/docs/' + encodeURIComponent(c.EUC_ENT_GRIST_DOC_ID);
  var entetes = { Authorization: 'Bearer ' + c.EUC_ENT_GRIST_API_KEY, Accept: 'application/json' };
  function lire(chemin) {
    var t = Date.now(), rep = UrlFetchApp.fetch(base + chemin, { headers: entetes, muteHttpExceptions: true });
    var code = rep.getResponseCode(), texte = rep.getContentText();
    return { ms: Date.now() - t, code: code, octets: texte.length, json: code === 200 ? JSON.parse(texte) : null };
  }
  var out = { mesureLe: new Date().toISOString(), tables: {} }, total = 0;
  var st = lire('/states');
  out.etats = { ms: st.ms, code: st.code, nombre: st.json && st.json.states ? st.json.states.length : null, dernier: st.json && st.json.states && st.json.states[0] ? st.json.states[0].n : null };
  EUC_SONDE_TABLES_.forEach(function(t) {
    var r = lire('/tables/' + t + '/records');
    out.tables[t] = { ms: r.ms, code: r.code, lignes: r.json && r.json.records ? r.json.records.length : null, ko: Math.round(r.octets / 1024) };
    total += r.ms;
  });
  out.totalTablesMs = total;
  cache.put('EUC_SONDE_GRIST', JSON.stringify(out), 60);
  return out;
}


/* ---------- DEV578 : lien de secours par courriel (Atrium en panne) ----------
 * Seules les adresses @ac-nice.fr ou @lycee-les-eucalyptus.org présentes dans la liste des professeurs
 * (import Pronote, actifs) reçoivent un lien personnel valable 12 heures,
 * signé par le secret de la clé : générer une nouvelle clé les annule tous.
 * La réponse est la même que l'adresse soit autorisée ou non. */
var EUC_ACCES_DOMAINE_SECOURS_ = /@(?:ac-nice\.fr|lycee-les-eucalyptus\.org)$/i;

function EUC_ACCES_formSecours_(page) {
  var p = String(page || '').replace(/[^a-z0-9-]/gi, '');
  return '<div style="margin-top:28px;padding:18px;border:1px solid #cfe5dc;border-radius:12px;background:#fff;max-width:560px">' +
    '<h2 style="font-size:17px;margin:0 0 6px">Atrium en panne ?</h2>' +
    '<p style="margin:0 0 10px">Recevez un lien personnel par courriel, valable 12 heures. ' +
    '<b>Seules les adresses autorisées (professeurs du lycée) peuvent accéder au mode secours.</b></p>' +
    '<form id="sec" style="display:flex;gap:8px;flex-wrap:wrap"><input id="mel" type="email" required autocomplete="email" ' +
    'placeholder="prenom.nom@ac-nice.fr" style="flex:1;min-width:240px;padding:9px;border:1px solid #9cc;border-radius:8px;font:inherit">' +
    '<button id="btn" style="padding:9px 14px;border:0;border-radius:8px;background:#087f70;color:#fff;font:inherit;font-weight:700;cursor:pointer">Recevoir le lien</button></form>' +
    '<p id="rep" style="margin:10px 0 0;color:#355"></p></div>' +
    '<script>document.getElementById("sec").onsubmit=function(ev){ev.preventDefault();var b=document.getElementById("btn"),r=document.getElementById("rep");b.disabled=true;b.textContent="Envoi…";' +
    'google.script.run.withSuccessHandler(function(m){r.textContent=m;b.textContent="Recevoir le lien";b.disabled=false;})' +
    '.withFailureHandler(function(){r.textContent="Service momentanément indisponible. Réessayez dans quelques minutes.";b.textContent="Recevoir le lien";b.disabled=false;})' +
    '.EUC_ACCES_demanderLienSecours(document.getElementById("mel").value,' + JSON.stringify(p) + ');};</script>';
}

function EUC_ACCES_secoursQui_(pid) {
  var mel = '';
  try { mel = CacheService.getScriptCache().get('EUC_ACCES_SEC_' + pid) || ''; } catch (e) {}
  return mel || ('professeur n°' + pid);
}

function EUC_ACCES_profAutorise_(mel) {
  if (!EUC_ACCES_DOMAINE_SECOURS_.test(mel)) return null;
  var rows = [];
  try { rows = EUC_DEV538_records_('EUC_PROFESSEURS_PFMP', {}) || []; } catch (e) { rows = []; }
  for (var i = 0; i < rows.length; i++) {
    var f = rows[i].fields || rows[i];
    if (f.Actif === false) continue;
    if (String(f.Email || '').trim().toLowerCase() === mel) return { id: Number(rows[i].id || f.id) || 0, nom: [f.Prenom, f.Nom].filter(Boolean).join(' ') };
  }
  return null;
}

function EUC_ACCES_compter_(cache, cle, max) {
  var n = Number(cache.get(cle) || 0);
  if (n >= max) return false;
  cache.put(cle, String(n + 1), 3600);
  return true;
}

function EUC_ACCES_demanderLienSecours(courriel, page) {
  var reponse = 'Si cette adresse est autorisée, un lien personnel vient de lui être envoyé (valable 12 heures). Pensez à vérifier les indésirables.';
  var mel = String(courriel || '').trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(mel)) return 'Adresse courriel invalide.';
  var c = EUC_ACCES_config_(), cache = CacheService.getScriptCache();
  if (!c.secret) return reponse;
  if (!EUC_ACCES_compter_(cache, 'EUC_ACCES_SECN_' + EUC_ACCES_sha256_(mel).slice(0, 24), 3) ||
      !EUC_ACCES_compter_(cache, 'EUC_ACCES_SECN_TOUS', 40)) {
    EUC_ACCES_noter_('secours-limite', mel);
    return 'Trop de demandes. Réessayez dans une heure.';
  }
  var prof = EUC_ACCES_profAutorise_(mel);
  if (!prof || !prof.id) { EUC_ACCES_noter_('secours-refuse', mel); return reponse; }
  var exp = String(Date.now() + EUC_ACCES_JETON_TTL_MS_), pid = String(prof.id);
  var jeton = exp + '.' + pid + '.' + EUC_ACCES_hmac_('SEC|' + exp + '|' + pid, c.secret);
  var pg = String(page || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  var base = /apprenti/.test(pg) ? 'https://apprentis.loucodi.fr/' : 'https://pfmp.loucodi.fr/';
  var lien = base + '?' + (pg && EUC_ACCES_ROUTES_ENSEIGNANTS_[pg] ? 'page=' + pg + '&' : '') + EUC_ACCES_PARAM_JETON_ + '=' + encodeURIComponent(jeton);
  try { cache.put('EUC_ACCES_SEC_' + pid, mel, EUC_ACCES_SESSION_TTL_); } catch (e) {}
  MailApp.sendEmail({
    to: mel,
    subject: 'Lien de secours — suivis PFMP et apprentis',
    body: 'Bonjour' + (prof.nom ? ' ' + prof.nom : '') + ',\n\nVoici votre lien personnel d’accès aux suivis, à utiliser pendant l’indisponibilité d’Atrium :\n\n' + lien +
      '\n\nCe lien est valable 12 heures et ne doit pas être transféré : chaque ouverture est enregistrée.\nSi vous n’avez rien demandé, ignorez ce message.\n\nLycée Les Eucalyptus — bureau des entreprises'
  });
  EUC_ACCES_noter_('secours-envoye', mel);
  return reponse;
}
