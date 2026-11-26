/**
 * DEV740 — « Valider sous réserve » (bureau G205, page « Soumissions à traiter »).
 *
 * Cas réel : dépôt complet, mais l'entreprise ne passe pas le contrôle du SIRET (établissement fermé, numéro
 * introuvable) et le patron est injoignable. Le bureau peut :
 *   - valider sous réserve : le stage est compté dans le suivi avec la mention « sous réserve de validation de
 *     l'entreprise » ; le dépôt reste dans « À traiter » (aucune convention créée, aucun courriel) ;
 *   - ensuite, si l'entreprise confirme : « Vérifier le SIRET » avec le bon numéro (la réserve tombe d'elle-même),
 *     ou « Lever la réserve » quand le SIRET déjà vérifié est confirmé par l'entreprise ;
 *   - sinon : « Annuler le stage » (classé sans suite, motif tracé) : le stage n'est plus compté.
 * Marque : Niveau_controle = RESERVE (colonne texte existante de la table d'attente) ; une seule ligne écrite, motif tracé.
 */
function EUC_DEV740_sousReserve(q) {
  EUC_IMPORT_exigerAdminTexte_();
  q = q || {};
  var r = EUC_DEV665_ligne_(q.id), f = r.fields || {}, v = EUC_DEV665_vue_(r), motif = EUC_DEV665_t_(q.motif).slice(0, 300);
  if (/^(IGNOREE|REJETEE|REFUSEE|ESSAI|VALIDEE)$/.test(v.decision)) throw new Error('Ce dépôt est déjà clos (' + v.decision + ') : actualisez la liste.');
  if (v.reserve) throw new Error('Ce dépôt est déjà validé sous réserve.');
  if (v.dansSuivi && !v.ferme) throw new Error('Ce dépôt est déjà compté dans le suivi : aucune réserve à poser.');
  if (!v.eleveId) throw new Error('Élève non reconnu : rattachez d’abord le dépôt à un élève.');
  if (!EUC_DEV665_t_(v.saisie.nom || v.officiel.nom)) throw new Error('Nom de l’entreprise absent : corrigez d’abord la saisie.');
  if (!motif) throw new Error('Indiquez la raison de la réserve.');
  var champs = { Niveau_controle: 'RESERVE', Decision: 'A_CONTROLER',
    Alertes: EUC_DEV665_trace_(f.Alertes, 'Validé sous réserve par le bureau (numéro ' + (v.numeroSaisi || 'absent') + ') — ' + motif) };
  EUC_DEV665_patch_(r.id, champs);
  return { ok: true, soumission: EUC_DEV666_finir_(r.id, Object.assign({}, f, champs)) };
}

/* Réserve levée : l'entreprise a confirmé le SIRET déjà vérifié (ex. établissement fermé selon l'INSEE mais en activité). */
function EUC_DEV740_leverReserve(q) {
  EUC_IMPORT_exigerAdminTexte_();
  q = q || {};
  var r = EUC_DEV665_ligne_(q.id), f = r.fields || {}, v = EUC_DEV665_vue_(r), motif = EUC_DEV665_t_(q.motif).slice(0, 300);
  if (!v.reserve) throw new Error('Ce dépôt n’est pas sous réserve : actualisez la liste.');
  if (!v.siretVerifie) throw new Error('SIRET non vérifié : saisissez le bon numéro puis « Vérifier le SIRET » (la réserve est alors levée).');
  if (!motif) throw new Error('Indiquez ce qui a été confirmé.');
  var champs = { Niveau_controle: 'VERT', Decision: 'A_VALIDER',
    Alertes: EUC_DEV665_trace_(f.Alertes, 'Réserve levée par le bureau : SIRET ' + v.numeroSaisi + ' confirmé — ' + motif) };
  EUC_DEV665_patch_(r.id, champs);
  return { ok: true, soumission: EUC_DEV666_finir_(r.id, Object.assign({}, f, champs)) };
}
