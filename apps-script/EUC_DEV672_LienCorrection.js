/**
 * DEV672 — Lien direct « Vérifier et corriger ce dépôt » dans le courriel de l'équipe.
 *
 * Formulaire en ligne : la soumission s'ouvre seule dans « Soumissions à traiter » (SIRET, NIS, entreprise de la base),
 * avec un formulaire pour corriger ce que l'élève a saisi (entreprise, responsable, tuteur, lieu du stage).
 * Page du QR code : le dossier s'ouvre seul dans « Administration des conventions » (correction historisée existante).
 * Pages réservées à l'administration : le lien ne donne aucun accès à un professeur non administrateur.
 */
/* Numéro de dépôt lu dans l'adresse (?numero=…), réduit aux caractères d'un numéro. */
function EUC_DEV672_numero_(e) {
  var v = e && e.parameter && e.parameter.numero;
  return String(v == null ? '' : v).replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
}
/* Adresse de la page d'administration ouverte sur ce dépôt ('' si l'adresse d'administration est inconnue). */
function EUC_DEV672_lien_(page, numero) {
  var base = typeof EUC_DEV459_ADMIN_URL_ === 'string' ? EUC_DEV459_ADMIN_URL_ : '';
  var n = EUC_DEV672_numero_({ parameter: { numero: numero } });
  return base && n ? base + '?page=' + page + '&numero=' + encodeURIComponent(n) : '';
}

/* Saisie de l'élève corrigeable par le bureau (colonnes de la table d'attente). */
var EUC_DEV672_CHAMPS_ = ['Entreprise_saisie', 'Adresse_entreprise', 'CP_entreprise', 'Ville_entreprise',
  'Nom_responsable', 'Telephone_entreprise', 'Email_entreprise',
  'Nom_tuteur', 'Fonction_tuteur', 'Telephone_tuteur', 'Email_tuteur',
  'Lieu_stage_adresse', 'Lieu_stage_code_postal', 'Lieu_stage_commune'];
var EUC_DEV672_LIBELLES_ = { Entreprise_saisie: 'entreprise', Adresse_entreprise: 'adresse', CP_entreprise: 'code postal', Ville_entreprise: 'ville',
  Nom_responsable: 'responsable', Telephone_entreprise: 'téléphone du responsable', Email_entreprise: 'courriel du responsable',
  Nom_tuteur: 'tuteur', Fonction_tuteur: 'fonction du tuteur', Telephone_tuteur: 'téléphone du tuteur', Email_tuteur: 'courriel du tuteur',
  Lieu_stage_adresse: 'lieu du stage', Lieu_stage_code_postal: 'code postal du lieu', Lieu_stage_commune: 'commune du lieu' };

/* Champs réellement modifiés (calcul pur) : seulement les colonnes autorisées ; courriels contrôlés. */
function EUC_DEV672_changements_(avant, saisis) {
  var T = EUC_DEV665_t_, c = {};
  EUC_DEV672_CHAMPS_.forEach(function(k) {
    if (!saisis || !Object.prototype.hasOwnProperty.call(saisis, k)) return;
    var v = T(saisis[k]).slice(0, 300);
    if (/^Email_/.test(k) && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error('Courriel invalide (' + EUC_DEV672_LIBELLES_[k] + ') : ' + v);
    if (v !== T((avant || {})[k])) c[k] = v;
  });
  return c;
}

function EUC_DEV672_corrigerSaisie(q) {
  EUC_IMPORT_exigerAdminTexte_();
  q = q || {};
  var r = EUC_DEV665_ligne_(q.id), f = r.fields || {}, c = EUC_DEV672_changements_(f, q.champs || {});
  var noms = Object.keys(c).map(function(k) { return EUC_DEV672_LIBELLES_[k]; });
  if (!noms.length) return { ok: true, inchange: true, soumission: EUC_DEV666_finir_(r.id, f) };
  c.Alertes = EUC_DEV665_trace_(f.Alertes, 'Saisie corrigée par le bureau : ' + noms.join(', '));
  var ecrit = EUC_DEV665_patch_(r.id, c);
  var ignores = noms.length - Object.keys(ecrit).filter(function(k) { return k !== 'Alertes'; }).length;
  return { ok: true, corriges: noms, ignores: ignores, soumission: EUC_DEV666_finir_(r.id, Object.assign({}, f, ecrit)) };
}
