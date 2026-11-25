/**
 * DEV737 — Statistiques de l'établissement pour la direction (proviseur, adjoints).
 *
 * Même page et mêmes chiffres que les statistiques de l'administration (Statistiques_PFMP_DEV698), ouverte
 * depuis le tableau de bord (DEV736) avec un jeton direction signé (12 h) remis après vérification du code
 * direction. Lecture seule : aucun calcul d'itinéraire, aucune écriture.
 */
var EUC_DEV737_TTL_MS_ = 12 * 3600 * 1000;

function EUC_DEV737_secret_() {
  try { return typeof EUC_ACCES_config_ === 'function' ? String(EUC_ACCES_config_().secret || '') : ''; } catch (e) { return ''; }
}

/* Jeton direction : échéance.signature, signé sur « DIR| » (un jeton enseignant « ENS| » n'est pas accepté). */
function EUC_DEV737_creerJeton_() {
  var s = EUC_DEV737_secret_(); if (!s) return '';
  var exp = String(Date.now() + EUC_DEV737_TTL_MS_);
  return exp + '.' + EUC_ACCES_hmac_('DIR|' + exp, s);
}

function EUC_DEV737_jetonValide_(jeton) {
  var s = EUC_DEV737_secret_(), p = String(jeton || '').split('.');
  if (!s || p.length !== 2 || !/^\d{10,16}$/.test(p[0]) || !/^[0-9a-f]{16,128}$/.test(p[1])) return false;
  if (Number(p[0]) < Date.now()) return false;
  return EUC_ACCES_egal_(p[1], EUC_ACCES_hmac_('DIR|' + p[0], s));
}

function EUC_DEV737_acces_(q) {
  if (EUC_DEV737_jetonValide_(q && q.dir)) return true;
  if (EUC_DEV736_estAdmin_()) return true;
  throw new Error('Accès direction expiré : rouvrez les statistiques depuis le tableau de bord.');
}

function EUC_DEV737_statsAnnees(q) { EUC_DEV737_acces_(q); return EUC_DEV698_anneesLecture_(); }
function EUC_DEV737_statsAnnee(q) { EUC_DEV737_acces_(q); return EUC_DEV698_anneeLecture_({ annee: q && q.annee }); }
function EUC_DEV737_statsDistances(q) { EUC_DEV737_acces_(q); return EUC_DEV703_distancesLecture_({ annee: q && q.annee }); }

function EUC_DEV737_afficherStats(e) {
  var p = (e && e.parameter) || {}, dir = String(p.dir || '');
  var base = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  var ok = EUC_DEV737_jetonValide_(dir);
  if (!ok && !EUC_DEV736_estAdmin_()) {
    return HtmlService.createHtmlOutput('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Statistiques de l’établissement</title></head>' +
      '<body style="font:16px/1.5 Arial,sans-serif;margin:0;padding:32px;color:#163;background:#f7fbf9"><h1 style="font-size:22px">Statistiques de l’établissement</h1>' +
      '<p>Ouvrez cette page depuis le tableau de bord de la direction, après votre code direction (accès valable 12 heures).</p>' +
      '<p><a href="' + base + '?page=tableau-de-bord" target="_top">Tableau de bord</a></p></body></html>')
      .setTitle('Statistiques de l’établissement').addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var t = HtmlService.createTemplateFromFile('Statistiques_PFMP_DEV698');
  t.adminBase = base; t.direction = true; t.dir = ok ? dir : '';
  return t.evaluate().setTitle('Statistiques de l’établissement').addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
