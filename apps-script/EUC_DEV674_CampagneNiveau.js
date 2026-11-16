/**
 * DEV674 — Codes des professeurs principaux par niveau.
 *
 * Sur la page « Accès professeurs principaux », l'administration choisit l'année, la famille, le niveau
 * (Seconde, Première, Terminale ; 1re/2e année BTS ; 1re/2e année CAP), éventuellement une classe, puis
 * la période. La campagne existante (DEV444 : un code et un courriel individuel par professeur principal)
 * porte alors sur toutes les classes de ce niveau qui ont cette période (même libellé, mêmes dates).
 * Choisir une classe limite le lot à cette classe ; « Tous les niveaux » reprend toute la famille.
 */

/* Niveau déduit du nom de la classe (même règle que les pages famille) : 2MVA → Seconde, 1MELEC → Première, TMELEC → Terminale. */
function EUC_DEV674_niveau_(famille, classe) {
  var f = String(famille || '').toUpperCase(), n = String(classe || '').toUpperCase().replace(/\s+/g, '');
  if (f === 'BTS') return /^2/.test(n) || (!/^1/.test(n) && /2$/.test(n)) ? '2e année BTS' : '1re année BTS';
  if (f === 'CAP') return /^(T|2)/.test(n) || (!/^1/.test(n) && /2$/.test(n)) ? '2e année CAP' : '1re année CAP';
  return /^T/.test(n) ? 'Terminale' : (/^1/.test(n) ? 'Première' : 'Seconde');
}

/* Classes visées : famille, niveau et classe facultatifs, période obligatoire (clé libellé|début|fin). */
function EUC_DEV674_cible_(q) {
  q = q || {};
  var annee = EUC_DEV368_year(q.annee), famille = EUC_DEV441_t_(q.famille).toUpperCase(), niveau = EUC_DEV441_t_(q.niveau),
      classeId = EUC_DEV441_n_(q.classeId), cle = EUC_DEV441_t_(q.periodeCle), out = [];
  if (!cle) throw new Error('Choisissez une période.');
  EUC_DEV441_catalog_(annee, false).classes.forEach(function(c) {
    if (famille && c.famille !== famille) return;
    if (niveau && c.niveau !== niveau) return;
    if (classeId && c.classeId !== classeId) return;
    (c.periodes || []).forEach(function(p) { if (EUC_DEV444_periodKey_(p) === cle) out.push({ annee: annee, famille: c.famille, classeId: c.classeId, classe: c.classe, niveau: c.niveau, periode: p }); });
  });
  if (!out.length) throw new Error('Aucune classe de cette sélection n’a cette période.');
  return { anchor: out[0], targets: out };
}

/* Accès déjà créés pour toutes les classes de la sélection (lecture seule). */
function EUC_DEV674_accesNiveau(q) {
  EUC_DEV441_admin_();
  var cible = EUC_DEV674_cible_(q), par = {};
  cible.targets.forEach(function(t) { par[t.annee + '|' + t.classeId + '|' + t.periode.id] = t; });
  var acces = EUC_DEV441_ppRows_().filter(function(r) { return par[EUC_DEV441_t_(r.Annee_scolaire) + '|' + EUC_DEV441_n_(r.Classe_id) + '|' + EUC_DEV441_n_(r.Periode_id)]; })
    .map(function(r) { return { id: EUC_DEV441_n_(r.id), classe: EUC_DEV441_t_(r.Classe_nom), professeur: EUC_DEV441_t_(r.Professeur_nom), actif: r.Actif !== false, expiration: EUC_DEV441_t_(r.Expiration), courriel: EUC_DEV441_t_(r.Etat_courriel) }; })
    .sort(function(a, b) { return a.classe.localeCompare(b.classe, 'fr') || (b.actif - a.actif) || (b.id - a.id); });
  return { ok: true, classes: cible.targets.map(function(t) { return t.classe; }), acces: acces };
}
