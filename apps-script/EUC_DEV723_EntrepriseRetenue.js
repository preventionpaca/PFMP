/**
 * DEV723 — « Soumissions à traiter » : l'entreprise retenue par le bureau remplace ce que l'élève a saisi.
 *
 * 1. Quand le bureau vérifie un SIRET (ou choisit une entreprise proposée, qui passe par la même vérification) ou
 *    enregistre un NIS de Monaco, le nom et l'adresse de l'entreprise retenue remplacent la saisie de l'élève
 *    (Entreprise_saisie, Adresse_entreprise, CP_entreprise, Ville_entreprise). Responsable, tuteur et lieu du stage
 *    ne sont jamais touchés. L'ancienne saisie reste lisible dans l'historique (Alertes).
 * 2. Adresse de l'entreprise retenue corrigée par le bureau (ex. numéro de voie absent de l'annuaire) : sur le dépôt
 *    (adresse officielle et saisie de l'élève) et, sur demande, sur la fiche de la base des entreprises du même SIRET,
 *    pour que les prochains dépôts et conventions la reprennent.
 * 3. Bouton « Reprendre l'entreprise retenue dans la saisie » pour les dépôts vérifiés avant DEV723.
 * Une seule ligne écrite par table ; aucun courriel.
 */
var EUC_DEV723_SAISIE_ = { Entreprise_saisie: 'Raison_sociale_officielle', Adresse_entreprise: 'Adresse_officielle', CP_entreprise: 'CP_officiel', Ville_entreprise: 'Ville_officielle' };

/* Saisie de l'élève alignée sur l'entreprise retenue (calcul pur) : seuls les champs qui changent ; jamais vidés. */
function EUC_DEV723_saisie_(avant, officiel) {
  var T = EUC_DEV665_t_, c = {};
  Object.keys(EUC_DEV723_SAISIE_).forEach(function(k) {
    var v = T((officiel || {})[EUC_DEV723_SAISIE_[k]]);
    if (v && v !== T((avant || {})[k])) c[k] = v;
  });
  return c;
}
/* Trace de l'ancienne saisie (calcul pur) : « Saisie de l'élève remplacée par l'entreprise retenue (avant : …) ». */
function EUC_DEV723_trace_(avant, c) {
  var T = EUC_DEV665_t_, a = avant || {};
  var ancien = [T(a.Entreprise_saisie), [T(a.Adresse_entreprise), [T(a.CP_entreprise), T(a.Ville_entreprise)].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
  return Object.keys(c || {}).length ? 'Saisie de l’élève remplacée par l’entreprise retenue (avant : ' + (ancien || 'vide') + ')' : '';
}
/* Ajoute aux champs d'une correction du bureau la reprise de l'entreprise retenue dans la saisie (calcul pur). */
function EUC_DEV723_avecSaisie_(f, champs) {
  var c = EUC_DEV723_saisie_(f, champs), t = EUC_DEV723_trace_(f, c);
  if (!t) return champs;
  Object.keys(c).forEach(function(k) { champs[k] = c[k]; });
  champs.Alertes = [EUC_DEV665_t_(champs.Alertes), t].filter(Boolean).join(' — ');
  return champs;
}

/* Bouton : reprendre l'entreprise retenue (déjà identifiée) dans la saisie de l'élève. */
function EUC_DEV723_reprendre(q) {
  EUC_IMPORT_exigerAdminTexte_();
  var r = EUC_DEV665_ligne_((q || {}).id), f = r.fields || {};
  if (!EUC_DEV665_t_(f.Raison_sociale_officielle)) throw new Error('Aucune entreprise retenue : vérifiez d’abord le SIRET (ou le NIS).');
  var c = EUC_DEV723_saisie_(f, f);
  if (!Object.keys(c).length) return { ok: true, inchange: true, soumission: EUC_DEV666_finir_(r.id, f) };
  c.Alertes = EUC_DEV665_trace_(f.Alertes, EUC_DEV723_trace_(f, c));
  var ecrit = EUC_DEV665_patch_(r.id, c);
  return { ok: true, soumission: EUC_DEV666_finir_(r.id, Object.assign({}, f, ecrit)) };
}

/* Adresse saisie par le bureau (calcul pur) : voie, code postal (5 chiffres) et ville obligatoires. */
function EUC_DEV723_adresse_(q) {
  var T = EUC_DEV665_t_, a = { adresse: T((q || {}).adresse).slice(0, 300), cp: T((q || {}).cp).replace(/\s+/g, ''), ville: T((q || {}).ville).slice(0, 120) };
  if (!a.adresse) throw new Error('Indiquez le numéro et la voie.');
  if (!/^\d{5}$/.test(a.cp)) throw new Error('Code postal : 5 chiffres.');
  if (!a.ville) throw new Error('Indiquez la ville.');
  return a;
}
/* Champs de la fiche de la base des entreprises (calcul pur) : seules les colonnes présentes sur la fiche, et
 * seulement celles qui changent. La voie seule dans Numero_voie et Adresse_complete (comme l'annuaire officiel).
 * Jamais d'autre colonne (une colonne calculée refuserait toute l'écriture). */
function EUC_DEV723_champsBase_(fiche, a) {
  var T = EUC_DEV665_t_, c = {}, voulu = { Numero_voie: a.adresse, Adresse_complete: a.adresse, Code_postal: a.cp, Commune: a.ville };
  Object.keys(voulu).forEach(function(k) { if (Object.prototype.hasOwnProperty.call(fiche || {}, k) && T(fiche[k]) !== voulu[k]) c[k] = voulu[k]; });
  return c;
}

function EUC_DEV723_corrigerAdresse(q) {
  EUC_IMPORT_exigerAdminTexte_();
  q = q || {};
  var r = EUC_DEV665_ligne_(q.id), f = r.fields || {}, T = EUC_DEV665_t_, a = EUC_DEV723_adresse_(q);
  if (!T(f.Raison_sociale_officielle)) throw new Error('Aucune entreprise retenue : vérifiez d’abord le SIRET (ou le NIS).');
  var avant = [T(f.Adresse_officielle), [T(f.CP_officiel), T(f.Ville_officielle)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  var apres = a.adresse + ', ' + a.cp + ' ' + a.ville;
  var champs = {};
  if (T(f.Adresse_officielle) !== a.adresse) champs.Adresse_officielle = a.adresse;
  if (T(f.CP_officiel) !== a.cp) champs.CP_officiel = a.cp;
  if (T(f.Ville_officielle) !== a.ville) champs.Ville_officielle = a.ville;
  var officiel = Object.assign({}, f, champs), saisie = EUC_DEV723_saisie_(f, officiel);
  Object.keys(saisie).forEach(function(k) { champs[k] = saisie[k]; });
  /* Base des entreprises : SIRET vérifié seulement, fiche existante seulement (jamais créée ici). */
  var base = { demande: q.base === true, misAJour: false, message: '' }, siret = T(f.SIRET_normalise).replace(/\D/g, '');
  if (base.demande) {
    if (T(f.SIRET_statut).toUpperCase() !== 'VERIFIE' || siret.length !== 14) base.message = 'base des entreprises non modifiée : SIRET non vérifié';
    else {
      var fiche = EUC_ENT_verifierDoublonGrist(siret);
      if (!fiche) base.message = 'base des entreprises non modifiée : aucune fiche pour le SIRET ' + siret;
      else {
        var cb = EUC_DEV723_champsBase_(fiche, a);
        if (Object.keys(cb).length) {
          EUC_ENT_grist('patch', '/tables/' + encodeURIComponent(EUC_DEV646_table_()) + '/records', { records: [{ id: Number(fiche.id), fields: cb }] });
          base.misAJour = true; base.message = 'fiche de la base des entreprises corrigée (SIRET ' + siret + ')';
        } else base.message = 'fiche de la base des entreprises déjà à jour';
      }
    }
  }
  if (!Object.keys(champs).length && !base.misAJour) return { ok: true, inchange: true, base: base, soumission: EUC_DEV666_finir_(r.id, f) };
  champs.Alertes = EUC_DEV665_trace_(f.Alertes, 'Adresse de l’entreprise corrigée par le bureau : ' + (avant || 'vide') + ' → ' + apres + (base.misAJour ? ' (base des entreprises aussi)' : ''));
  var ecrit = EUC_DEV665_patch_(r.id, champs);
  return { ok: true, base: base, soumission: EUC_DEV666_finir_(r.id, Object.assign({}, f, ecrit)) };
}
