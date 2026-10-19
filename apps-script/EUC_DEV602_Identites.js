/**
 * DEV602 — Identités réutilisables des contacts d'entreprise.
 *
 * Le formulaire du QR code exigeait déjà nom, prénom, fonction, téléphone et courriel ; il refuse
 * désormais les saisies inexploitables (initiale seule, chiffres, « chef », « M. », prénom = nom,
 * nom et prénom dans la même case) et enregistre la civilité. L'import JotForm lit les nouvelles
 * colonnes (civilité, prénom, nom, fonction, téléphone, courriel du responsable et du tuteur).
 * Le répertoire signale les contacts incomplets, montre les identités confirmées par les tuteurs
 * (bilan de visite, livret) et permet d'archiver un contact qui a quitté l'entreprise.
 */
var EUC_DEV602_INTERDITS_ = ['monsieur', 'madame', 'mademoiselle', 'mr', 'mme', 'mlle', 'm', 'mm', 'patron', 'patronne', 'chef', 'cheffe', 'gerant', 'gerante', 'responsable', 'tuteur', 'tutrice',
  'directeur', 'directrice', 'inconnu', 'inconnue', 'aucun', 'aucune', 'rien', 'test', 'nc', 'na', 'xx', 'xxx', 'idem', 'pareil', 'moi', 'lui', 'elle', 'boss', 'manager', 'secretaire', 'accueil', 'contact', 'entreprise', 'societe'];

function EUC_DEV602_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
function EUC_DEV602_n_(v) { return EUC_DEV602_t_(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z' -]/g, '').trim(); }

/* Civilité normalisée : « M. », « Mme » ou vide. */
function EUC_DEV602_civilite_(v) {
  var s = EUC_DEV602_n_(v).replace(/[ .]/g, '');
  if (['m', 'mr', 'monsieur'].indexOf(s) >= 0) return 'M.';
  if (['mme', 'madame', 'mlle', 'mademoiselle'].indexOf(s) >= 0) return 'Mme';
  return '';
}

/* Problème d'un prénom ou d'un nom (texte du message), ou '' si exploitable. */
function EUC_DEV602_probleme_(valeur, quoi) {
  var v = EUC_DEV602_t_(valeur), n = EUC_DEV602_n_(v);
  if (!v) return quoi + ' manquant';
  if (/[0-9@_/\\:;!?()[\]{}<>=+*#%&$€]/.test(v)) return quoi + ' « ' + v + ' » contient des caractères non autorisés';
  if (n.replace(/[^a-z]/g, '').length < 2) return quoi + ' « ' + v + ' » est trop court (initiale seule ?)';
  if (EUC_DEV602_INTERDITS_.indexOf(n.replace(/[^a-z]/g, '')) >= 0 || EUC_DEV602_INTERDITS_.indexOf(n.split(' ')[0]) >= 0 && n.split(' ').length === 1) return quoi + ' « ' + v + ' » n’est pas un vrai ' + quoi.toLowerCase();
  if (/^(m|mr|mme|mlle|monsieur|madame)[ .]/.test(n)) return quoi + ' « ' + v + ' » : indiquez la civilité dans la liste, pas dans le nom';
  return '';
}

/* Vérification complète d'une personne ; lève une erreur lisible. Retourne l'identité mise en forme. */
function EUC_DEV602_verifierPersonne_(role, civilite, prenom, nom) {
  var p = EUC_DEV602_probleme_(prenom, 'Prénom') || EUC_DEV602_probleme_(nom, 'Nom');
  if (!p && EUC_DEV602_n_(prenom) === EUC_DEV602_n_(nom)) p = 'Le prénom et le nom sont identiques';
  if (!p) {
    var mp = EUC_DEV602_n_(prenom).split(' ');
    if (EUC_DEV602_n_(nom).split(' ').some(function(w) { return w.length > 1 && mp.indexOf(w) >= 0; })) p = 'Le nom « ' + EUC_DEV602_t_(nom) + ' » reprend le prénom : n’écrivez que le nom de famille';
  }
  if (p) throw new Error(role + ' : ' + p + '.');
  return { civilite: EUC_DEV602_civilite_(civilite), prenom: EUC_DEV602_t_(prenom), nom: EUC_DEV602_t_(nom) };
}

/* Un nom complet affiché dans le répertoire est-il exploitable (prénom + nom) ? */
function EUC_DEV602_nomIncomplet_(nomComplet) {
  var mots = EUC_DEV602_n_(nomComplet).split(/[ ]+/).filter(function(w) { return w.replace(/[^a-z]/g, '').length >= 2; });
  return mots.filter(function(w) { return EUC_DEV602_INTERDITS_.indexOf(w.replace(/[^a-z]/g, '')) < 0; }).length < 2;
}

/* Import JotForm : colonnes du nouveau formulaire (libellés tolérants aux accents et à la casse). */
function EUC_DEV602_jotform_(row, raw) {
  var pick = function(noms) { return EUC_DEV528_pick_(row, noms) || EUC_DEV528_pick_(raw, noms); };
  var out = {};
  [['Responsable', 'responsable', ['Nom_responsable', 'Responsable_nom', 'Nom du responsable', 'Nom responsable']], ['Tuteur', 'tuteur', ['Nom_tuteur', 'Tuteur_nom', 'Nom du tuteur', 'Nom tuteur']]].forEach(function(r) {
    var R = r[0], x = r[1];
    out[R + '_civilite'] = EUC_DEV602_civilite_(pick(['Civilité du ' + x, 'Civilite du ' + x, 'Civilité ' + x, R + '_civilite']));
    out[R + '_prenom'] = EUC_DEV528_personName_(pick(['Prénom du ' + x, 'Prenom du ' + x, 'Prénom ' + x, 'Prenom ' + x, R + '_prenom']));
    out[R + '_nom'] = EUC_DEV528_personName_(pick(r[2])).toLocaleUpperCase('fr-FR');
    out[R + '_fonction'] = pick(['Fonction du ' + x, 'Fonction ' + x, R + '_fonction']);
    out[R + '_telephone'] = pick(['Téléphone du ' + x, 'Telephone du ' + x, 'Téléphone ' + x, R + '_telephone']);
    out[R + '_courriel'] = pick(['E-mail du ' + x, 'Email du ' + x, 'Adresse e-mail du ' + x, 'Courriel du ' + x, 'Courriel ' + x, 'Email ' + x, R + '_courriel']);
  });
  Object.keys(out).forEach(function(k) { if (!out[k]) delete out[k]; });
  return out;
}

/* Colonnes de civilité dans la table des accès conventions : créées une fois (mémoire 6 h).
 * En cas d'échec, les civilités sont retirées des champs pour que l'enregistrement passe toujours. */
function EUC_DEV602_assurerCivilites_(fields) {
  var c = CacheService.getScriptCache();
  if (c.get('EUC_DEV602_CIVILITES')) return fields;
  try {
    var cols = (EUC_ENT_grist('get', '/tables/' + encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_) + '/columns').columns || []).map(function(x) { return x.id; });
    var manque = [['Responsable_civilite', 'Civilité responsable'], ['Tuteur_civilite', 'Civilité tuteur']].filter(function(d) { return cols.indexOf(d[0]) < 0; })
      .map(function(d) { return { id: d[0], fields: { label: d[1], type: 'Text' } }; });
    if (manque.length) EUC_ENT_grist('post', '/tables/' + encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_) + '/columns', { columns: manque });
    c.put('EUC_DEV602_CIVILITES', '1', 21600);
  } catch (e) { delete fields.Responsable_civilite; delete fields.Tuteur_civilite; }
  return fields;
}

/* ---------- Répertoire des entreprises ---------- */
function EUC_DEV602_cleEnt_(v) { return EUC_DEV602_n_(v).replace(/[^a-z0-9]/g, ''); }
/* Identités saisies et signées par les tuteurs (bilans de visite, fiches entreprise du livret). */
function EUC_DEV602_confirmes_() {
  var lire = function(t) { try { return (EUC_ENT_grist('get', '/tables/' + t + '/records').records || []); } catch (e) { return []; } }, out = [];
  lire('EUC_BILANS_VISITE_APPRENTIS').concat(lire('EUC_LIVRET_APPRENTIS')).forEach(function(r) {
    var f = r.fields || {};
    if (EUC_DEV602_t_(f.Statut) !== 'VALIDE' || (f.Valideur_role && f.Valideur_role !== 'TUTEUR') || !EUC_DEV602_t_(f.Signataire_nom) || !EUC_DEV602_t_(f.Entreprise)) return;
    out.push({ entreprise: EUC_DEV602_t_(f.Entreprise), prenom: EUC_DEV602_t_(f.Signataire_prenom), nom: EUC_DEV602_t_(f.Signataire_nom), fonction: EUC_DEV602_t_(f.Signataire_fonction),
      telephone: EUC_DEV602_t_(f.Signataire_telephone), courriel: EUC_DEV602_t_(f.Signataire_email), le: EUC_DEV602_t_(f.Valide_le).slice(0, 10) });
  });
  return out.sort(function(a, b) { return b.le.localeCompare(a.le); });
}
/* Ajoute au répertoire (calcul pur, hors lecture) : noms incomplets, identités confirmées, contacts archivés. */
function EUC_DEV602_enrichirAnnuaire_(out, correctionRows, confirmes) {
  out.forEach(function(x) { if (x.contactKey) x.incomplet = EUC_DEV602_nomIncomplet_(x.nom); });
  (confirmes || EUC_DEV602_confirmes_()).forEach(function(c) {
    var ent = EUC_DEV602_cleEnt_(c.entreprise), nomN = EUC_DEV602_n_(c.nom), complet = [c.prenom, c.nom].filter(Boolean).join(' ');
    var lignes = out.filter(function(x) { return EUC_DEV602_cleEnt_(x.entreprise) === ent; }); if (!lignes.length) return;
    var meme = lignes.filter(function(x) { return x.contactKey && x.role === 'TUTEUR' && nomN && EUC_DEV602_n_(x.nom).split(' ').indexOf(nomN.split(' ').pop()) >= 0; })[0];
    if (meme) {
      if (!meme.confirme) { meme.confirme = c.le; meme.nomConfirme = complet; meme.fonction = meme.fonction || c.fonction; }
      if (c.telephone && (meme.telephones || []).indexOf(c.telephone) < 0) meme.telephones = (meme.telephones || []).concat([c.telephone]);
      if (c.courriel && (meme.courriels || []).indexOf(c.courriel) < 0) meme.courriels = (meme.courriels || []).concat([c.courriel]);
      meme.incomplet = false; return;
    }
    if (lignes.some(function(x) { return x.confirmeSeul && EUC_DEV602_n_(x.nom) === EUC_DEV602_n_(complet); })) return;
    var b = lignes[0];
    out.push({ identity: b.identity, siret: b.siret, entreprise: b.entreprise, adresse: b.adresse, site: b.site, role: 'TUTEUR', contactKey: '', nom: complet, nomSource: 'Saisi et signé par le tuteur',
      fonction: c.fonction, telephones: c.telephone ? [c.telephone] : [], courriels: c.courriel ? [c.courriel] : [], annees: [], corrige: false, confirme: c.le, confirmeSeul: true });
  });
  (correctionRows || []).forEach(function(r) {
    var f = r.fields || r; if (!f || f.Actif === false || f.Archive !== true) return;
    out.push({ identity: EUC_DEV602_t_(f.Cle_entreprise), siret: EUC_DEV602_t_(f.SIRET), entreprise: EUC_DEV602_t_(f.Entreprise), adresse: EUC_DEV602_t_(f.Adresse), site: '', role: EUC_DEV602_t_(f.Role_contact).toUpperCase(),
      contactKey: EUC_DEV602_t_(f.Cle_contact_source), nom: EUC_DEV602_t_(f.Nom_corrige) || EUC_DEV602_t_(f.Nom_source), nomSource: EUC_DEV602_t_(f.Nom_source), telephones: [], courriels: [], annees: [],
      archive: true, archiveLe: EUC_DEV602_t_(f.Archive_le).slice(0, 10), archivePar: EUC_DEV602_t_(f.Archive_par) });
  });
  return out.sort(function(a, b) { return a.entreprise.localeCompare(b.entreprise, 'fr') || String(a.role).localeCompare(String(b.role), 'fr') || a.nom.localeCompare(b.nom, 'fr'); });
}
/* Archiver (ou réactiver) un contact : il ne fait plus partie de l'entreprise. Rien n'est supprimé. */
function EUC_DEV602_archiverContact(q) {
  var ctx = EUC_DEV538_admin_(); q = q || {};
  var companyKey = EUC_DEV562_companyKey_(q), role = EUC_DEV602_t_(q.role).toUpperCase(), contactKey = EUC_DEV602_t_(q.contactKey).slice(0, 80), archiver = q.archive !== false;
  if (!companyKey || ['RESPONSABLE', 'TUTEUR'].indexOf(role) < 0 || !contactKey) throw new Error('Contact incomplet.');
  EUC_DEV562_ensureContactTable_();
  var now = new Date().toISOString(), existing = EUC_DEV562_contactRows_().filter(function(r) { var f = EUC_DEV538_fields_(r); return EUC_DEV562_matchCompany_(r, q) && EUC_DEV538_t_(f.Role_contact).toUpperCase() === role && EUC_DEV538_t_(f.Cle_contact_source) === contactKey; })[0];
  var fields = { Cle_entreprise: companyKey, SIRET: EUC_DEV602_t_(q.siret).replace(/\D/g, ''), Entreprise: EUC_DEV602_t_(q.entreprise).slice(0, 250), Adresse: EUC_DEV602_t_(q.adresse).slice(0, 500), Role_contact: role, Cle_contact_source: contactKey,
    Nom_source: EUC_DEV602_t_(q.nomSource).slice(0, 200), Actif: true, Archive: archiver, Archive_le: archiver ? now : '', Archive_par: archiver ? EUC_DEV602_t_(ctx && ctx.email) : '', Updated_at: now, Updated_by: EUC_DEV602_t_(ctx && ctx.email) };
  if (!existing) fields.Nom_corrige = '';
  var record = { fields: fields }; if (existing) record.id = existing.id;
  EUC_ENT_grist(existing ? 'patch' : 'post', '/tables/' + EUC_DEV562_CONTACT_TABLE_ + '/records', { records: [record] });
  if (typeof EUC_DEV600_annuaireMaj_ === 'function') EUC_DEV600_annuaireMaj_(function(x) { return x.identity === EUC_DEV602_t_(q.identity) && x.role === role && x.contactKey === contactKey; }, function(x) { x.archive = archiver; x.archiveLe = archiver ? now.slice(0, 10) : ''; });
  return { ok: true, archive: archiver, le: now.slice(0, 10) };
}
