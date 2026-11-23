/**
 * DEV678 — Accès professeur principal : partage du tableau de suivi.
 *
 * Avec son code, le professeur principal peut :
 *  - envoyer le tableau de suivi aux professeurs qui y figurent (suivi téléphonique, visite)
 *    et aux professeurs principaux de la classe, avec les copies institutionnelles paramétrées,
 *    exactement comme le bouton « Envoyer le tableau par email » de l'administration ;
 *  - (l'export PDF existe déjà sur la page de la classe, accessible à tous les professeurs).
 * Le tableau envoyé est relu en direct (affectations qu'il vient de saisir comprises).
 * Le code est contrôlé à chaque appel et limité à sa classe et à sa période.
 */
var EUC_DEV678_DELAI_ENVOI_S_ = 120; /* un envoi au plus toutes les deux minutes par code */

function EUC_DEV678_acces_(q) {
  q = q || {};
  var access = EUC_DEV448_lookupPp_(q.code, q);
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
  var pdf = EUC_DEV678_pdf_(q, a.detail);
  var e = function(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var html = '<div style="font-family:Arial,sans-serif">' + e(EUC_DEV678_messagePj_(p.message)).replace(/\\n|\n/g, '<br>') + '</div>'
    + '<p style="font-family:Arial,sans-serif;color:#667085">Envoyé par ' + e(p.professeurPrincipal) + (a.access._direction ? ', direction de l’établissement.' : ', professeur principal.') + '</p>'
    + EUC_DEV678_mentionPdf_(pdf);
  var replyTo = EUC_DEV448_t_(a.access.Professeur_email);
  MailApp.sendEmail({ to: p.to.join(','), cc: p.cc.join(','), subject: p.objet, htmlBody: html, attachments: [pdf], name: 'PFMP — Lycée Les Eucalyptus', replyTo: replyTo.indexOf('@') > 0 ? replyTo : undefined });
  cache.put(cle, '1', EUC_DEV678_DELAI_ENVOI_S_);
  return { ok: true, to: p.to, cc: p.cc, objet: p.objet };
}

/* DEV720 — Le tableau part en pièce jointe : le PDF produit par la page de suivi (« Exporter PDF »), avec les données en
 * direct de l'application (dépôts en ligne, statuts, même entreprise). Le tableau n'est plus recopié dans le courriel :
 * il venait d'un ancien calcul (EUC_SUIVI_CLASSE_detailV162) qui ignorait les dépôts en ligne et marquait « Convention
 * enregistrée » des élèves sans convention. Contrôles : vrai PDF (%PDF), 10 Mo au plus ; nom de fichier fixé par le serveur. */
var EUC_DEV678_PDF_MAX_ = 10 * 1024 * 1024;
function EUC_DEV678_nomPdf_(d) {
  d = d || {};
  return ('PFMP ' + (d.classe && d.classe.nom || '') + ' ' + (d.periode && d.periode.libelle || '') + ' ' + (d.annee || '')).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + '.pdf';
}
function EUC_DEV678_pdf_(q, d) {
  var b64 = String(q && q.pdf || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  if (!b64) throw new Error('Le tableau PDF n’a pas été préparé : rechargez la page puis réessayez. Rien n’a été envoyé.');
  if (b64.length > EUC_DEV678_PDF_MAX_ * 4 / 3 + 4) throw new Error('Tableau PDF trop volumineux. Rien n’a été envoyé.');
  var octets;
  try { octets = Utilities.base64Decode(b64); } catch (e) { throw new Error('Tableau PDF illisible. Rien n’a été envoyé.'); }
  if (!octets || octets.length < 5 || String.fromCharCode(octets[0], octets[1], octets[2], octets[3]) !== '%PDF') throw new Error('Tableau PDF illisible. Rien n’a été envoyé.');
  return Utilities.newBlob(octets, 'application/pdf', EUC_DEV678_nomPdf_(d));
}
function EUC_DEV678_mentionPdf_(pdf) {
  var nom = String(pdf && pdf.getName ? pdf.getName() : '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<p style="font-family:Arial,sans-serif">Le tableau de suivi est joint en PDF' + (nom ? ' (' + nom + ')' : '') + ' : c’est le même document que « Exporter PDF » dans le suivi des PFMP.</p>';
}
/* Message paramétré (« Vous trouverez ci-dessous le tableau… ») adapté à la pièce jointe, sans modifier le paramètre. */
function EUC_DEV678_messagePj_(m) { return String(m == null ? '' : m).replace(/ci-dessous/g, 'en pièce jointe').replace(/Ci-dessous/g, 'En pièce jointe'); }
