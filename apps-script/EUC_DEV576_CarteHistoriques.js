/**
 * DEV576 — Fiches entreprise instantanées sur la carte des lieux de stage.
 *
 * Avant : chaque clic sur un point relançait EUC_DEV538_history_ (toutes les
 * années, classes et contrats du périmètre) pour ne garder qu'une entreprise,
 * soit environ 15 s par fiche. Désormais la carte demande, une seule fois et
 * en arrière-plan, l'historique de toutes les entreprises du périmètre. Le
 * résultat est mis en cache par périmètre et par témoin de modification Grist :
 * il reste valable tant que rien ne change dans Grist. Lecture seule.
 */
function EUC_DEV576_historiquesCarte(q) {
  if (!EUC_DEV538_staffAllowed_()) throw new Error('Accès réservé aux personnels authentifiés.');
  q = q || {};
  var scope = { annee: q.annee, fenetre: q.fenetre, famille: q.famille, classeId: q.classeId, periodeId: q.periodeId };
  var temoin = '';
  try { temoin = typeof EUC_SUIVI2_temoin_ === 'function' ? EUC_SUIVI2_temoin_() : ''; } catch (e) { temoin = ''; }
  var cle = 'EUC_DEV576_HIST_' + EUC_DEV441_digest_(JSON.stringify(scope)).slice(0, 16) + '_' + String(temoin).replace(/[^\w-]/g, '');
  var memo = temoin && typeof EUC_DEV572_lire_ === 'function' ? EUC_DEV572_lire_(cle) : null;
  if (memo && memo.par) { memo.depuisCache = true; return memo; }
  var par = {};
  (EUC_DEV538_history_(scope) || []).forEach(function(c) {
    if (!c || !c.identity) return;
    par[EUC_DEV441_digest_(c.identity).slice(0, 32)] = c.historique || [];
  });
  var res = { ok: true, par: par };
  if (temoin && typeof EUC_DEV572_ecrire_ === 'function') EUC_DEV572_ecrire_(cle, res);
  return res;
}
