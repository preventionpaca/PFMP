/**
 * DEV646 — Entreprises de Monaco sans NIS connu.
 *
 * 1. Recherche par nom (page QR, publique) : l'élève qui n'a pas le NIS cherche l'entreprise par son nom
 *    parmi les entreprises de Monaco déjà dans la base ; il reçoit son NIS (réel ou interne) et la page QR
 *    la retrouve comme d'habitude. Entreprise absente : l'élève passe au bureau G205.
 * 2. Numéro interne (administration) : une entreprise dont on n'aura jamais le NIS reçoit un numéro du lycée
 *    « EUC-MC-0001 », rangé dans la colonne NIS, pour être comptée dans la base, le suivi et les cartes.
 */
var EUC_DEV646_PREFIXE_ = 'EUC-MC-';

function EUC_DEV646_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
function EUC_DEV646_n_(v) { return EUC_DEV646_t_(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function EUC_DEV646_nis_(v) { return EUC_DEV646_t_(v).toUpperCase().replace(/[\s-]+/g, ''); }
function EUC_DEV646_interne_(nis) { return EUC_DEV646_nis_(nis).indexOf(EUC_DEV646_nis_(EUC_DEV646_PREFIXE_)) === 0; }
function EUC_DEV646_table_() { return typeof EUC_V161F8_tableEntreprise_ === 'function' ? EUC_V161F8_tableEntreprise_() : 'EUC_ENTREPRISES'; }

/* Entreprise de Monaco : pays Monaco ou NIS renseigné. Calcul pur. */
function EUC_DEV646_monaco_(r) { return /monaco/i.test(EUC_DEV646_t_(r.Pays)) || !!EUC_DEV646_t_(r.NIS); }
function EUC_DEV646_fiche_(r) {
  return { id: Number(r.id) || 0, nis: EUC_DEV646_t_(r.NIS), interne: EUC_DEV646_interne_(r.NIS), nom: EUC_DEV646_t_(r.Raison_sociale || r.Nom || r.Entreprise), enseigne: EUC_DEV646_t_(r.Enseigne),
    adresse: EUC_DEV646_t_(r.Adresse || r.Adresse_complete), cp: EUC_DEV646_t_(r.Code_postal), ville: EUC_DEV646_t_(r.Commune) || 'Monaco', telephone: EUC_DEV646_t_(r.Telephone), email: EUC_DEV646_t_(r.Email) };
}

/* Calcul pur : entreprises de Monaco ayant un NIS (réel ou interne) dont le nom contient tous les mots cherchés. */
function EUC_DEV646_filtrerParNom_(rows, q) {
  var mots = EUC_DEV646_n_(q).split(' ').filter(function(m) { return m.length >= 2; });
  if (EUC_DEV646_n_(q).replace(/ /g, '').length < 3 || !mots.length) throw new Error('Écris au moins 3 lettres du nom de l’entreprise.');
  return (rows || []).filter(function(r) {
    if (!EUC_DEV646_monaco_(r) || !EUC_DEV646_t_(r.NIS)) return false;
    var nom = ' ' + EUC_DEV646_n_([r.Raison_sociale, r.Nom, r.Entreprise, r.Enseigne].join(' ')) + ' ';
    return mots.every(function(m) { return nom.indexOf(m) >= 0; });
  }).map(EUC_DEV646_fiche_).sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); }).slice(0, 8)
    .map(function(f) { return { nis: f.nis, nom: f.nom, enseigne: f.enseigne, adresse: f.adresse, ville: f.ville }; });
}

/* Page QR (publique, sans compte) : seulement nom, enseigne, adresse et NIS d'entreprises, aucune donnée d'élève. */
function EUC_DEV646_rechercherMonacoParNom(q) {
  var cache = CacheService.getScriptCache(), cle = 'DEV646_NOM_' + Utilities.base64EncodeWebSafe(EUC_DEV646_n_(q)).slice(0, 200);
  var deja = cache.get(cle); if (deja) return JSON.parse(deja);
  var r = { resultats: EUC_DEV646_filtrerParNom_(EUC_IMPORT_lireRecords_(EUC_DEV646_table_()), q) };
  cache.put(cle, JSON.stringify(r), 300);
  return r;
}

/* Calcul pur : numéro interne suivant (EUC-MC-0001, EUC-MC-0002…). */
function EUC_DEV646_numeroSuivant_(rows) {
  var max = 0, p = EUC_DEV646_nis_(EUC_DEV646_PREFIXE_);
  (rows || []).forEach(function(r) { var n = EUC_DEV646_nis_(r.NIS); if (n.indexOf(p) === 0) max = Math.max(max, Number(n.slice(p.length)) || 0); });
  return EUC_DEV646_PREFIXE_ + ('000' + (max + 1)).slice(-4);
}

/* ---------- Administration ---------- */
function EUC_DEV646_afficher(e) {
  EUC_IMPORT_exigerAdminTexte_();
  var t = HtmlService.createTemplateFromFile('Entreprises_Monaco_DEV646');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  return t.evaluate().setTitle('Entreprises de Monaco — PFMP').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function EUC_DEV646_listerMonaco() {
  EUC_IMPORT_exigerAdminTexte_();
  return { entreprises: EUC_IMPORT_lireRecords_(EUC_DEV646_table_()).filter(EUC_DEV646_monaco_).map(EUC_DEV646_fiche_).sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); }) };
}

/* Calcul pur : contrôle d'une nouvelle entreprise ; renvoie les champs à écrire. */
function EUC_DEV646_preparer_(rows, d, numeroInterne) {
  d = d || {};
  var nom = EUC_DEV646_t_(d.nom), nis = EUC_DEV646_t_(d.nis).toUpperCase(), adresse = EUC_DEV646_t_(d.adresse), ville = EUC_DEV646_t_(d.ville) || 'Monaco';
  if (!nom) throw new Error('Le nom de l’entreprise est obligatoire.');
  if (!adresse) throw new Error('L’adresse est obligatoire.');
  if (nis && EUC_DEV646_interne_(nis)) throw new Error('Laissez le NIS vide pour recevoir un numéro interne : il est attribué automatiquement.');
  (rows || []).filter(EUC_DEV646_monaco_).forEach(function(r) {
    if (nis && EUC_DEV646_nis_(r.NIS) === EUC_DEV646_nis_(nis)) throw new Error('Ce NIS existe déjà : ' + EUC_DEV646_t_(r.Raison_sociale) + '.');
    if (EUC_DEV646_n_(r.Raison_sociale || r.Nom) === EUC_DEV646_n_(nom)) throw new Error('Une entreprise de Monaco porte déjà ce nom (' + (EUC_DEV646_t_(r.NIS) || 'sans NIS') + ') : donnez-lui un numéro interne depuis la liste.');
  });
  return { NIS: nis || numeroInterne, Raison_sociale: nom, Enseigne: EUC_DEV646_t_(d.enseigne), Adresse: adresse, Code_postal: EUC_DEV646_t_(d.cp) || '98000', Commune: ville, Pays: 'Monaco',
    Telephone: EUC_DEV646_t_(d.telephone), Email: EUC_DEV646_t_(d.email).toLowerCase(), Statut_validation: 'VALIDEE', Source_creation: nis ? 'ADMIN_DEV646' : 'ADMIN_DEV646_NUMERO_INTERNE' };
}

function EUC_DEV646_colonnes_() {
  var table = typeof EUC_V161F8_assurerColonnesMonaco_ === 'function' ? EUC_V161F8_assurerColonnesMonaco_() : EUC_DEV646_table_();
  var have = {}; (EUC_ENT_grist('get', '/tables/' + encodeURIComponent(table) + '/columns').columns || []).forEach(function(c) { have[c.id] = true; });
  return { table: table, garder: function(f) { var o = {}; Object.keys(f).forEach(function(k) { if (have[k] && f[k] !== '') o[k] = f[k]; }); return o; } };
}

function EUC_DEV646_creerMonaco(d) {
  EUC_IMPORT_exigerAdminTexte_();
  var lock = LockService.getScriptLock(); if (!lock.tryLock(15000)) throw new Error('Une autre création est en cours : réessayez dans un instant.');
  try {
    var c = EUC_DEV646_colonnes_(), rows = EUC_IMPORT_lireRecords_(c.table), f = c.garder(EUC_DEV646_preparer_(rows, d, EUC_DEV646_numeroSuivant_(rows)));
    var r = EUC_ENT_grist('post', '/tables/' + encodeURIComponent(c.table) + '/records', { records: [{ fields: f }] });
    return { ok: true, id: Number(r && r.records && r.records[0] && r.records[0].id) || 0, nis: f.NIS, nom: f.Raison_sociale };
  } finally { lock.releaseLock(); }
}

function EUC_DEV646_attribuerNumero(id) {
  EUC_IMPORT_exigerAdminTexte_();
  id = Number(id); if (!id) throw new Error('Entreprise introuvable.');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(15000)) throw new Error('Une autre attribution est en cours : réessayez dans un instant.');
  try {
    var c = EUC_DEV646_colonnes_(), rows = EUC_IMPORT_lireRecords_(c.table), r = rows.filter(function(x) { return Number(x.id) === id; })[0];
    if (!r || !EUC_DEV646_monaco_(r)) throw new Error('Entreprise de Monaco introuvable.');
    if (EUC_DEV646_t_(r.NIS)) throw new Error('Cette entreprise a déjà un numéro : ' + EUC_DEV646_t_(r.NIS) + '.');
    var nis = EUC_DEV646_numeroSuivant_(rows);
    EUC_ENT_grist('patch', '/tables/' + encodeURIComponent(c.table) + '/records', { records: [{ id: id, fields: c.garder({ NIS: nis }) }] });
    return { ok: true, id: id, nis: nis };
  } finally { lock.releaseLock(); }
}
