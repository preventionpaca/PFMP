/**
 * DEV678 — Accès professeur principal : partage du tableau de suivi.
 *
 * Avec son code, le professeur principal peut :
 *  - envoyer le tableau de suivi aux professeurs qui y figurent (suivi téléphonique, visite)
 *    et aux professeurs principaux de la classe, avec les copies institutionnelles paramétrées,
 *    exactement comme le bouton « Envoyer le tableau par email » de l'administration ;
 *  - exporter ce tableau en PDF.
 * Le tableau est toujours relu en direct (affectations qu'il vient de saisir comprises).
 * Le code est contrôlé à chaque appel et limité à sa classe et à sa période.
 */
var EUC_DEV678_DELAI_ENVOI_S_ = 120; /* un envoi au plus toutes les deux minutes par code */

function EUC_DEV678_acces_(q) {
  q = q || {};
  var access = EUC_DEV448_lookupPp_(q.code);
  EUC_DEV448_assertPpScope_(access, q);
  var detail = EUC_SUIVI_CLASSE_detailV162(EUC_DEV448_t_(access.Annee_scolaire), EUC_DEV448_n_(access.Classe_id), EUC_DEV448_n_(access.Periode_id));
  if (!detail || !detail.periode) throw new Error('Période introuvable pour ce code.');
  return { access: access, detail: detail };
}

function EUC_DEV678_preparation_(a) {
  EUC_V157_assurerParametres_();
  var map = EUC_V157_paramMap_(), d = a.detail;
  return {
    to: EUC_V157_profMails_(d),
    cc: EUC_V158_ccMails_(d),
    objet: EUC_V157_rempl_(map.SUIVI_PFMP_EMAIL_OBJET && map.SUIVI_PFMP_EMAIL_OBJET.Valeur, d),
    message: EUC_V157_rempl_(map.SUIVI_PFMP_EMAIL_MESSAGE && map.SUIVI_PFMP_EMAIL_MESSAGE.Valeur, d),
    classe: d.classe && d.classe.nom || '',
    periode: d.periode && d.periode.libelle || '',
    professeurPrincipal: EUC_DEV448_t_(a.access.Professeur_nom)
  };
}

/* Destinataires affichés pour confirmation, avant tout envoi. */
function EUC_DEV678_preparerEnvoiPp(q) {
  var p = EUC_DEV678_preparation_(EUC_DEV678_acces_(q));
  return { ok: true, to: p.to, cc: p.cc, objet: p.objet, classe: p.classe, periode: p.periode };
}

function EUC_DEV678_envoyerTableauPp(q) {
  var a = EUC_DEV678_acces_(q), p = EUC_DEV678_preparation_(a);
  if (!p.to.length) throw new Error('Aucun professeur destinataire avec une adresse email valide.');
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Quota de courriels atteint pour aujourd’hui.');
  var cache = CacheService.getScriptCache(), cle = 'EUC_DEV678_ENVOI_' + EUC_DEV448_n_(a.access.id);
  if (cache.get(cle)) throw new Error('Le tableau vient d’être envoyé. Patientez deux minutes avant un nouvel envoi.');
  var e = function(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var html = '<div style="font-family:Arial,sans-serif">' + e(p.message).replace(/\\n|\n/g, '<br>') + '</div>'
    + '<p style="font-family:Arial,sans-serif;color:#667085">Envoyé par ' + e(p.professeurPrincipal) + ', professeur principal.</p>'
    + EUC_V157_htmlTable_(a.detail) + EUC_V161F3_historiqueHtml_(a.detail);
  var replyTo = EUC_DEV448_t_(a.access.Professeur_email);
  MailApp.sendEmail({ to: p.to.join(','), cc: p.cc.join(','), subject: p.objet, htmlBody: html, name: 'PFMP — Lycée Les Eucalyptus', replyTo: replyTo.indexOf('@') > 0 ? replyTo : undefined });
  cache.put(cle, '1', EUC_DEV678_DELAI_ENVOI_S_);
  return { ok: true, to: p.to, cc: p.cc, objet: p.objet };
}

/* Tableau à imprimer en PDF, relu en direct. */
function EUC_DEV678_tableauPdfPp(q) {
  var a = EUC_DEV678_acces_(q), d = a.detail;
  return { ok: true, classe: d.classe && d.classe.nom || '', periode: d.periode && d.periode.libelle || '', html: EUC_V157_htmlTable_(d) + EUC_V161F3_historiqueHtml_(d) };
}
