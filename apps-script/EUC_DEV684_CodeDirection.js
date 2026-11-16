/**
 * DEV684 — Codes direction permanents (proviseur, adjoints).
 *
 * Recours de dernier ressort : un code personnel, sans date de fin, ouvre « Accès professeur principal » de la page
 * Suivi PFMP pour toutes les classes et toutes les périodes (affectation du suivi téléphonique et du professeur visiteur,
 * export PDF, envoi du tableau). Il reste valable jusqu'à sa révocation par l'administration (piratage, départ).
 * Stockage : table des accès PP (Famille = DIRECTION, Classe_id = 0, Periode_id = 0), code haché comme les codes PP ;
 * le code en clair n'est affiché qu'une fois, à la création.
 */
var EUC_DEV684_FAMILLE_ = 'DIRECTION';
var EUC_DEV684_ECHEANCE_ = '2099-12-31T22:59:59.000Z';

function EUC_DEV684_creerCode(q) {
  var ctx = EUC_DEV441_admin_(); q = q || {};
  var nom = EUC_DEV441_t_(q.nom).slice(0, 120), saisi = EUC_DEV441_t_(q.email), email = saisi ? EUC_DEV444_email_(saisi) : '';
  if (!nom) throw new Error('Indiquez le nom de la personne qui recevra le code.');
  if (saisi && !email) throw new Error('Courriel invalide.');
  EUC_DEV441_ensurePpTable_();
  var code = EUC_DEV441_newCode_(), salt = Utilities.getUuid(), now = new Date().toISOString();
  var fields = { Annee_scolaire: '', Famille: EUC_DEV684_FAMILLE_, Classe_id: 0, Classe_nom: 'Toutes les classes', Periode_id: 0, Periode_libelle: 'Toutes les périodes', Date_fin: '',
    Professeur_id: 0, Professeur_nom: nom, Professeur_email: email || '', Code_salt: salt, Code_hash: EUC_DEV441_codeHash_(code, salt), Actif: true, Date_creation: now,
    Expiration: EUC_DEV684_ECHEANCE_, Cree_par: EUC_DEV441_t_(ctx.email) };
  var created = EUC_ENT_grist('post', '/tables/' + EUC_DEV441_PP_TABLE_ + '/records', { records: [{ fields: fields }] });
  console.log('DEV684 code direction créé pour ' + nom + ' par ' + EUC_DEV441_t_(ctx.email));
  return { ok: true, id: created && created.records && created.records[0] ? created.records[0].id : 0, code: code, nom: nom, email: email || '' };
}

function EUC_DEV684_liste() {
  EUC_DEV441_admin_();
  var iso = function(v) { var ms = EUC_DEV463_dateMs_(v); return isFinite(ms) ? new Date(ms).toISOString() : ''; };
  return EUC_DEV441_ppRows_().filter(function(r) { return EUC_DEV441_t_(r.Famille).toUpperCase() === EUC_DEV684_FAMILLE_; })
    .map(function(r) { return { id: EUC_DEV441_n_(r.id), nom: EUC_DEV441_t_(r.Professeur_nom), email: EUC_DEV441_t_(r.Professeur_email), actif: r.Actif !== false, creation: iso(r.Date_creation), revocation: iso(r.Date_revocation) }; })
    .sort(function(a, b) { return (b.actif - a.actif) || b.creation.localeCompare(a.creation); });
}
