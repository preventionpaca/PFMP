/**
 * DEV578 — Historique des entreprises toujours prêt (fiches instantanées).
 *
 * Avant : chaque carte demandait l'historique de son périmètre (classe,
 * période…), mis en cache par témoin Grist. Chaque nouveau périmètre et chaque
 * modification Grist relançaient le calcul complet : 15 à 20 s d'attente.
 *
 * Désormais un seul historique, toutes années et toutes classes (apprentis et
 * scolaires), est calculé en arrière-plan par un déclencheur toutes les
 * 10 minutes, seulement si Grist a changé. Les cartes lisent la dernière
 * version calculée, sans attendre ; elle indique son heure de calcul.
 * Lecture seule : aucune écriture Grist.
 */
var EUC_DEV578_HIST_CLE_ = 'EUC_DEV578_HIST_TOUS_V2'; /* V2 : index par nom + code postal */
var EUC_DEV578_HIST_HANDLER_ = 'EUC_DEV578_prechaufferHistoriques';
var EUC_DEV578_HIST_AGE_MAX_MS_ = 4 * 3600 * 1000; /* recalcul avant l'expiration du cache (6 h) */

function EUC_DEV578_temoin_() {
  try { return typeof EUC_SUIVI2_temoin_ === 'function' ? String(EUC_SUIVI2_temoin_() || '') : ''; } catch (e) { return ''; }
}

/* Clé de secours reproductible côté navigateur : nom + code postal, sans accents ni ponctuation.
 * Elle retrouve une entreprise que l'historique a regroupée sous une autre identité (SIRET, alias). */
function EUC_DEV578_cleNom_(entreprise, adresse) {
  var n = String(entreprise || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  var cp = (String(adresse || '').match(/\b\d{5}\b/g) || []).pop() || '';
  return n ? n + '|' + cp : '';
}

function EUC_DEV578_calculerHistoriques_(temoin) {
  var par = {}, noms = {};
  (EUC_DEV538_history_({ annee: 'ALL' }) || []).forEach(function(c) {
    if (!c || !c.identity) return;
    var k = EUC_DEV441_digest_(c.identity).slice(0, 32), n = EUC_DEV578_cleNom_(c.entreprise, c.adresse);
    par[k] = c.historique || [];
    if (n && !noms[n]) noms[n] = k;
  });
  var res = { ok: true, par: par, noms: noms, temoin: temoin, calcule: new Date().toISOString() };
  EUC_DEV572_ecrire_(EUC_DEV578_HIST_CLE_, res);
  return res;
}

/* Dernière version calculée ; calcul immédiat seulement s'il n'y en a aucune. */
function EUC_DEV578_historiquesTous_() {
  var memo = EUC_DEV572_lire_(EUC_DEV578_HIST_CLE_), temoin = EUC_DEV578_temoin_();
  EUC_DEV578_installerDeclencheur_();
  if (memo && memo.par) {
    memo.depuisCache = true;
    memo.aJour = !!temoin && memo.temoin === temoin;
    return memo;
  }
  var res = EUC_DEV578_calculerHistoriques_(temoin);
  res.aJour = true;
  return res;
}

/* Déclencheur (toutes les 10 min) : recalcul seulement si Grist a changé. */
/* Book des entreprises (12 s à froid) : les deux listes ouvertes par défaut (année en cours et toutes
 * années, fenêtre de 3 ans) et l'index du book des familles restent prêts. Chaque appel ne recalcule
 * que si son cache a expiré ou si les données ont changé ; sinon il se contente de le lire. */
function EUC_DEV578_prechaufferBook_() {
  var y = '';
  try { y = EUC_DEV368_year(''); } catch (e) { y = ''; }
  [{ annee: y, fenetre: 3 }, { annee: 'ALL', fenetre: 3 }].forEach(function(s) { if (!s.annee) return; try { EUC_DEV572_base_(s, true); } catch (e) {} });
  try { if (typeof EUC_DEV549_publicBookIndex_ === 'function') EUC_DEV549_publicBookIndex_(); } catch (e2) {}
}

function EUC_DEV578_prechaufferHistoriques() {
  EUC_DEV578_prechaufferBook_();
  try { if (typeof EUC_DEV600_prechaufferAnnuaire_ === 'function') EUC_DEV600_prechaufferAnnuaire_(); } catch (e) {}
  var memo = EUC_DEV572_lire_(EUC_DEV578_HIST_CLE_), temoin = EUC_DEV578_temoin_();
  var age = memo && memo.calcule ? Date.now() - new Date(memo.calcule).getTime() : Infinity;
  if (memo && memo.par && temoin && memo.temoin === temoin && age < EUC_DEV578_HIST_AGE_MAX_MS_) return { ok: true, inchange: true };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { ok: true, occupe: true };
  try { return EUC_DEV578_calculerHistoriques_(temoin); } finally { lock.releaseLock(); }
}

/* Installé une fois, depuis une page servie par le propriétaire du script. */
function EUC_DEV578_installerDeclencheur_() {
  var cache = CacheService.getScriptCache();
  try {
    if (cache.get('EUC_DEV578_TRIG_OK')) return;
    var ok = ScriptApp.getProjectTriggers().some(function(t) { return t.getHandlerFunction() === EUC_DEV578_HIST_HANDLER_; });
    if (!ok) ScriptApp.newTrigger(EUC_DEV578_HIST_HANDLER_).timeBased().everyMinutes(10).create();
    cache.put('EUC_DEV578_TRIG_OK', '1', 21600);
  } catch (e) {}
}
