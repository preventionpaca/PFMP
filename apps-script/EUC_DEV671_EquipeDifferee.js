/**
 * DEV671 — Courriel de l'équipe envoyé en arrière-plan.
 *
 * Au dépôt, l'élève reçoit sa confirmation et son accusé tout de suite. La fabrication du tableau de la classe
 * (plusieurs secondes) ne se fait plus pendant le dépôt : le courriel de l'équipe (bureau des entreprises,
 * professeur principal) est mis en file d'attente et part une à deux minutes plus tard, tableau joint.
 * Si la file est indisponible (déclencheur impossible, données trop longues), l'équipe reçoit son courriel
 * immédiatement, comme avant : un dépôt ne perd jamais la copie de l'équipe.
 */
var EUC_DEV671_HANDLER_ = 'EUC_DEV671_traiterFile';
var EUC_DEV671_PREFIXE_ = 'EUC_DEV671_Q_';
var EUC_DEV671_PLANIFIE_ = 'EUC_DEV671_PLANIFIE';
var EUC_DEV671_DELAI_MS_ = 60 * 1000;
var EUC_DEV671_PLANIF_MAX_MS_ = 15 * 60 * 1000; /* au-delà, un déclencheur perdu est replanifié au dépôt suivant */
var EUC_DEV671_TAILLE_MAX_ = 8500;              /* une propriété de script est limitée à 9 Ko */
var EUC_DEV671_ESSAIS_MAX_ = 3;
var EUC_DEV671_BUDGET_MS_ = 4 * 60 * 1000;

/* Courriel de l'équipe construit (tableau compris) : utilisé par le traitement différé et en secours. */
function EUC_DEV671_message_(p) {
  var eq = EUC_DEV663_recapEquipe_(p.info, p.classeId, p.periodeId, p.eleveId, p.numero);
  return { to: p.to, name: p.name || 'Lycée Les Eucalyptus — PFMP', subject: p.subject, body: eq.texte, htmlBody: eq.html || undefined, attachments: eq.pj.length ? eq.pj : undefined };
}

/* Met le courriel de l'équipe en file ; renvoie false si c'est impossible (l'appelant envoie alors tout de suite). */
function EUC_DEV671_differer_(p) {
  var lock = null;
  try {
    var json = JSON.stringify({ p: p, cree: Date.now(), essais: 0 });
    if (json.length > EUC_DEV671_TAILLE_MAX_) return false;
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) { lock = null; return false; }
    var props = PropertiesService.getScriptProperties(), cle = EUC_DEV671_PREFIXE_ + Date.now() + '_' + Utilities.getUuid().slice(0, 8);
    var planifie = Number(props.getProperty(EUC_DEV671_PLANIFIE_) || 0);
    if (!planifie || Date.now() - planifie > EUC_DEV671_PLANIF_MAX_MS_) {
      ScriptApp.newTrigger(EUC_DEV671_HANDLER_).timeBased().after(EUC_DEV671_DELAI_MS_).create();
      props.setProperty(EUC_DEV671_PLANIFIE_, String(Date.now()));
    }
    props.setProperty(cle, json);
    return true;
  } catch (e) {
    console.log('DEV671 file indisponible, envoi immédiat : ' + (e && e.message || e));
    return false;
  } finally { if (lock) try { lock.releaseLock(); } catch (e2) {} }
}

/* Envoi d'un courriel préparé : celui de l'équipe (m.differe) passe par la file, sinon il part tout de suite. */
function EUC_DEV671_expedier_(m) {
  if (!m || !m.differe) { MailApp.sendEmail(m); return 'IMMEDIAT'; }
  if (EUC_DEV671_differer_(m.differe)) return 'DIFFERE';
  MailApp.sendEmail(EUC_DEV671_message_(m.differe));
  return 'IMMEDIAT';
}

/* Déclencheur : envoie les courriels en attente (les plus anciens d'abord). */
function EUC_DEV671_traiterFile() {
  var debut = Date.now(), props = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock(), cles;
  if (!lock.tryLock(30000)) return { ok: false, occupe: true };
  try {
    props.deleteProperty(EUC_DEV671_PLANIFIE_);
    try { ScriptApp.getProjectTriggers().forEach(function(t) { if (t.getHandlerFunction() === EUC_DEV671_HANDLER_) ScriptApp.deleteTrigger(t); }); } catch (e) {}
    cles = Object.keys(props.getProperties()).filter(function(k) { return k.indexOf(EUC_DEV671_PREFIXE_) === 0; }).sort();
  } finally { lock.releaseLock(); }
  var envoyes = 0, abandons = 0, restants = 0;
  cles.forEach(function(cle) {
    if (Date.now() - debut > EUC_DEV671_BUDGET_MS_) { restants++; return; }
    var brut = EUC_DEV671_prendre_(props, cle); if (!brut) return; /* retiré de la file avant l'envoi : jamais deux fois */
    var x; try { x = JSON.parse(brut); } catch (e) { abandons++; return; }
    try { MailApp.sendEmail(EUC_DEV671_message_(x.p)); envoyes++; }
    catch (e2) {
      x.essais = (x.essais || 0) + 1;
      console.log('DEV671 envoi ' + (x.p && x.p.numero) + ' en échec (' + x.essais + ') : ' + (e2 && e2.message || e2));
      if (x.essais >= EUC_DEV671_ESSAIS_MAX_) abandons++; else { props.setProperty(cle, JSON.stringify(x)); restants++; }
    }
  });
  if (restants) EUC_DEV671_replanifier_();
  return { ok: true, envoyes: envoyes, abandons: abandons, restants: restants };
}

/* Lecture et retrait d'un courriel en attente, sous verrou (deux traitements simultanés ne l'envoient pas deux fois). */
function EUC_DEV671_prendre_(props, cle) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return '';
  try { var brut = props.getProperty(cle); if (brut) props.deleteProperty(cle); return brut || ''; }
  finally { lock.releaseLock(); }
}

function EUC_DEV671_replanifier_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty(EUC_DEV671_PLANIFIE_)) return;
    ScriptApp.newTrigger(EUC_DEV671_HANDLER_).timeBased().after(EUC_DEV671_DELAI_MS_).create();
    props.setProperty(EUC_DEV671_PLANIFIE_, String(Date.now()));
  } catch (e) { console.log('DEV671 replanification impossible : ' + (e && e.message || e)); }
  finally { lock.releaseLock(); }
}
