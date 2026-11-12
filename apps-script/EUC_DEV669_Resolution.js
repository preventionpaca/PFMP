/**
 * DEV669 — Demande d'aide résolue : l'élève est prévenu par courriel.
 *
 * Quand le bureau identifie l'entreprise d'une demande d'aide dans « Soumissions à traiter » (SIRET vérifié ou NIS
 * enregistré), la soumission passe dans le suivi (« Convention enregistrée »). L'élève, à qui l'on avait dit de passer
 * au bureau G205, reçoit alors : « Ton entreprise est identifiée, ta convention est enregistrée sous le n° … ».
 *  - automatique au moment de la correction ;
 *  - pour les demandes résolues avant DEV669 : bouton « Prévenir l'élève » (ou « Prévenir tous les élèves »).
 * Un seul courriel par soumission : la trace « Élève prévenu par courriel » est gardée dans ses alertes.
 */
var EUC_DEV669_TRACE_ = 'Élève prévenu par courriel';
function EUC_DEV669_t_(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
/* Demande d'aide (élève envoyé au bureau G205) aujourd'hui dans le suivi, élève pas encore prévenu (calcul pur). */
function EUC_DEV669_aPrevenir_(f) {
  f = f || {}; var a = EUC_DEV669_t_(f.Alertes);
  return /envoyé au bureau G205/.test(a) && a.indexOf(EUC_DEV669_TRACE_) < 0 && !!EUC_DEV669_t_(f.Email_eleve) && EUC_DEV666_dansSuivi_(f)
    && ['REJETEE', 'REFUSEE', 'ESSAI', 'IGNOREE'].indexOf(EUC_DEV669_t_(f.Decision).toUpperCase()) < 0;
}
/* Courriel à l'élève (calcul pur). */
function EUC_DEV669_courriel_(f) {
  var T = EUC_DEV669_t_, numero = T(f.Submission_ID).replace(/^SECOURS-/, ''), monaco = T(f.SIRET_statut).toUpperCase() === 'NIS_MONACO';
  var ident = monaco ? 'NIS ' + T(f.NIS_brut || f.NIS_normalise) : 'SIRET ' + T(f.SIRET_normalise);
  var adresse = [T(f.Adresse_officielle), [T(f.CP_officiel), T(f.Ville_officielle)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return { to: T(f.Email_eleve).toLowerCase(), name: 'Lycée Les Eucalyptus — PFMP', subject: 'Problème résolu : ta convention de stage est enregistrée — n° ' + numero,
    body: ['Bonjour ' + T(f.Prenom_eleve) + ',', '',
      'Bonne nouvelle : le bureau des entreprises a identifié ton entreprise. Ta convention de stage est enregistrée.', '',
      'Entreprise : ' + T(f.Raison_sociale_officielle || f.Entreprise_saisie) + (adresse ? ' — ' + adresse : ''), ident, 'Période : ' + T(f.Periode_numero), '',
      'Numéro d’enregistrement de ta convention (inchangé) : ' + numero + ' — recopie-le sur ta convention si ce n’est pas déjà fait.',
      'Tu n’as plus besoin de passer au bureau G205 pour cette demande.', '',
      (typeof EUC_DEV649_RAPPEL_SIGNATURES_ === 'string' ? EUC_DEV649_RAPPEL_SIGNATURES_ + '\n\n' : '') + 'Lycée Les Eucalyptus — bureau des formations et des entreprises'].join('\n') };
}
/* Envoi + trace ; renvoie true si un courriel est parti. */
function EUC_DEV669_prevenir_(r) {
  var f = (r && r.fields) || {}; if (!EUC_DEV669_aPrevenir_(f)) return false;
  MailApp.sendEmail(EUC_DEV669_courriel_(f));
  EUC_DEV665_patch_(r.id, { Alertes: EUC_DEV665_trace_(f.Alertes, EUC_DEV669_TRACE_) });
  return true;
}
/* Bureau : un élève. */
function EUC_DEV669_prevenir(q) {
  EUC_IMPORT_exigerAdminTexte_();
  var r = EUC_DEV665_ligne_(q && q.id), f = r.fields || {};
  if (!EUC_DEV669_aPrevenir_(f)) throw new Error(f.Email_eleve ? 'Rien à envoyer : entreprise pas encore identifiée, ou élève déjà prévenu.' : 'Pas d’adresse courriel pour cet élève.');
  EUC_DEV669_prevenir_(r);
  return { ok: true, id: Number(r.id), soumission: EUC_DEV666_finir_(r.id, Object.assign({}, f, { Alertes: EUC_DEV665_trace_(f.Alertes, EUC_DEV669_TRACE_) })) };
}
/* Bureau : tous les élèves dont la demande d'aide est résolue sans qu'ils aient été prévenus. */
function EUC_DEV669_prevenirTous() {
  EUC_IMPORT_exigerAdminTexte_();
  var l = EUC_DEV665_lignes_().filter(function(r) { var f = r.fields || {}; return /^SECOURS-/.test(EUC_DEV669_t_(f.Submission_ID)) && EUC_DEV669_aPrevenir_(f); }), ids = [], erreurs = [];
  l.forEach(function(r) { try { if (EUC_DEV669_prevenir_(r)) ids.push(Number(r.id)); } catch (e) { erreurs.push(EUC_DEV669_t_(r.fields.Submission_ID) + ' : ' + EUC_DEV669_t_(e && e.message || e)); } });
  return { ok: !erreurs.length, envoyes: ids.length, ids: ids, erreurs: erreurs };
}
