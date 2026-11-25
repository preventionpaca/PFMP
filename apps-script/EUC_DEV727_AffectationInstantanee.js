/**
 * DEV727 — Affectation des professeurs (visites, suivi téléphonique) quasi instantanée.
 *
 * La page met le tableau à jour dès le clic et enregistre en arrière-plan. Les clics faits pendant un
 * enregistrement sont regroupés : un seul appel serveur enregistre plusieurs affectations (une par opération),
 * avec un seul contrôle d'accès (administration ou code du professeur principal) au lieu d'un par clic.
 * Chaque opération réussit ou échoue seule : la page ne remet à l'état précédent que les opérations en échec.
 * Mêmes écritures et mêmes contrôles que EUC_DEV448_core_ (élèves de la classe et de la période seulement).
 */
var EUC_DEV727_MAX_OPERATIONS_ = 40;

/* Opérations reçues de la page, nettoyées (calcul pur). */
function EUC_DEV727_operations_(list) {
  var out = (list || []).slice(0, EUC_DEV727_MAX_OPERATIONS_).map(function(o) {
    o = o || {};
    return { id: String(o.id == null ? '' : o.id).slice(0, 40), type: String(o.type || '').trim().toUpperCase(), profId: Number(o.profId) || 0,
      eleveIds: (o.eleveIds || []).map(Number).filter(function(x) { return x > 0; }) };
  });
  if (!out.length) throw new Error('Aucune affectation à enregistrer.');
  return out;
}

/* Exécution des opérations l'une après l'autre ; une erreur n'arrête pas les suivantes. */
function EUC_DEV727_executer_(ops, base, actor, core) {
  return ops.map(function(o) {
    try {
      var r = core(Object.assign({}, base, { type: o.type, profId: o.profId, eleveIds: o.eleveIds }), actor);
      return { id: o.id, ok: true, type: r.type, professeur: r.professeur, eleveIds: r.eleveIds };
    } catch (e) { return { id: o.id, ok: false, message: String(e && e.message || e) }; }
  });
}

function EUC_DEV727_affecterLot(q) {
  q = q || {}; var started = Date.now(), ops = EUC_DEV727_operations_(q.operations), base, actor;
  if (EUC_DEV448_t_(q.code)) {
    var access = EUC_DEV448_lookupPp_(q.code, q); EUC_DEV448_assertPpScope_(access, q);
    var allowed = EUC_DEV448_cachedAllowed_(access);
    if (!allowed) allowed = EUC_DEV448_cacheAllowed_(access, EUC_DEV448_detailRecord_(access.Annee_scolaire, access.Famille, access.Classe_id, access.Periode_id));
    base = { annee: EUC_DEV448_t_(access.Annee_scolaire), famille: EUC_DEV448_family_(access.Famille), classeId: EUC_DEV448_n_(access.Classe_id), periodeId: EUC_DEV448_n_(access.Periode_id), _allowedIds: allowed, _skipDetailWrite: true };
    actor = access._direction ? 'DIRECTION:' + EUC_DEV448_n_(access.id) + ':' + EUC_DEV448_t_(access.Professeur_nom) : 'PP_TEMP:' + EUC_DEV448_n_(access.Professeur_id);
  } else {
    var ctx = EUC_V156_contexteAdmin_(); if (!ctx) throw new Error('Accès administrateur requis.');
    base = { annee: q.annee, famille: q.famille, classeId: q.classeId, periodeId: q.periodeId, _allowedIds: q.scopeIds || [], _skipDetailWrite: true };
    actor = EUC_DEV448_t_(ctx.email) || 'ADMIN';
  }
  return { ok: true, resultats: EUC_DEV727_executer_(ops, base, actor, EUC_DEV448_core_), durationMs: Date.now() - started };
}
