/**
 * DEV597 — Échéancier des contacts d'entrée en apprentissage.
 *
 * Obligation : un contact (appel ou visite) avec l'entreprise dans les 45 jours suivant le début
 * du contrat. Une échéance par contrat (mixité et classes entières), quelle que soit la date de
 * bascule du jeune. Seuils (jours depuis le début du contrat, sans contact enregistré) :
 *   < 30 : à faire · 30 : premier rappel · 45 : alerte · 60 : en retard.
 * Le professeur référent est désigné par l'administration (plusieurs jeunes à la fois).
 * Tables Grist créées au besoin :
 *   EUC_REFERENTS_APPRENTIS_PFMP   (Eleve, Annee_scolaire, Professeur, Professeur_nom, Actif, Date_modification)
 *   EUC_CONTACTS_ENTREE_APPRENTIS  (Contrat, Eleve, Annee_scolaire, Date_contact, Mode, Professeur_nom, Compte_rendu, Auteur, Date_saisie)
 */
var EUC_DEV597_REFERENTS_ = 'EUC_REFERENTS_APPRENTIS_PFMP';
var EUC_DEV597_CONTACTS_ = 'EUC_CONTACTS_ENTREE_APPRENTIS';
var EUC_DEV597_SEUILS_ = { rappel: 30, alerte: 45, retard: 60 };

function EUC_DEV597_t_(v) { return v == null ? '' : String(v).trim(); }
function EUC_DEV597_jours_(de, a) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 86400000); }
function EUC_DEV597_plus_(iso, j) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + j); return d.toISOString().slice(0, 10); }

/* Statut d'une échéance (calcul pur). */
function EUC_DEV597_statut_(debut, aujourdhui, contact) {
  if (contact) return 'FAIT';
  var j = EUC_DEV597_jours_(debut, aujourdhui);
  if (j < 0) return 'A_VENIR';
  if (j >= EUC_DEV597_SEUILS_.retard) return 'RETARD';
  if (j >= EUC_DEV597_SEUILS_.alerte) return 'ALERTE';
  if (j >= EUC_DEV597_SEUILS_.rappel) return 'RAPPEL';
  return 'A_FAIRE';
}

function EUC_DEV597_tables_() {
  var c = CacheService.getScriptCache(); if (c.get('EUC_DEV597_TABLES')) return;
  var ids = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; }), col = EUC_DEV441_col_;
  if (ids.indexOf(EUC_DEV597_REFERENTS_) < 0) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV597_REFERENTS_, columns: [col('Eleve', 'Élève (id)', 'Int'), col('Annee_scolaire', 'Année scolaire'), col('Professeur', 'Professeur (id)', 'Int'), col('Professeur_nom', 'Professeur'), col('Actif', 'Actif', 'Bool'), col('Date_modification', 'Date modification')] }] });
  if (ids.indexOf(EUC_DEV597_CONTACTS_) < 0) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV597_CONTACTS_, columns: [col('Contrat', 'Contrat (id)', 'Int'), col('Eleve', 'Élève (id)', 'Int'), col('Annee_scolaire', 'Année scolaire'), col('Date_contact', 'Date du contact'), col('Mode', 'Mode'), col('Professeur_nom', 'Professeur'), col('Compte_rendu', 'Compte rendu'), col('Auteur', 'Saisi par'), col('Date_saisie', 'Date de saisie')] }] });
  c.put('EUC_DEV597_TABLES', '1', 21600);
}
function EUC_DEV597_lire_(table) { try { return (EUC_ENT_grist('get', '/tables/' + table + '/records').records || []); } catch (e) { return []; } }

/* Échéances de l'année (calcul pur à partir du modèle du suivi et des tables). */
function EUC_DEV597_calcul_(m, contrats, referents, contacts, aujourdhui) {
  var annee = m.annee, debutAnnee = annee.slice(0, 4) + '-09-01', eleves = {};
  (m.classes || []).forEach(function(c) { (c.eleves || []).forEach(function(e) { eleves[e.id] = { nom: e.libelle, classe: c.nom, mode: c.modeApprentissage || 'MIXITE', gestionnaire: c.gestionnaire || '', donneur: c.donneur || '' }; }); });
  var ref = {}; referents.forEach(function(r) { var f = r.fields || r; if (f.Actif === false || EUC_DEV597_t_(f.Annee_scolaire) !== annee) return; var k = Number(f.Eleve); if (!ref[k] || Number(r.id) > ref[k].id) ref[k] = { id: Number(r.id), professeurId: Number(f.Professeur) || 0, nom: EUC_DEV597_t_(f.Professeur_nom) }; });
  var cont = {}; contacts.forEach(function(r) { var f = r.fields || r, k = Number(f.Contrat); if (!cont[k] || EUC_DEV597_t_(f.Date_contact) > cont[k].date) cont[k] = { date: EUC_DEV597_t_(f.Date_contact), mode: EUC_DEV597_t_(f.Mode), professeur: EUC_DEV597_t_(f.Professeur_nom), compteRendu: EUC_DEV597_t_(f.Compte_rendu) }; });
  var lignes = [];
  contrats.forEach(function(r) {
    var f = r.fields || r; if (f.Actif === false) return;
    var eid = typeof EUC_SUIVI2_ref_ === 'function' ? EUC_SUIVI2_ref_(f.Eleve) : Number(f.Eleve), e = eleves[eid]; if (!e) return;
    var debut = EUC_SUIVI2_date_(f.Date_debut || f.Date_contrat_officielle || f.Date_contrat), fin = EUC_SUIVI2_date_(f.Date_fin), rupture = EUC_SUIVI2_date_(f.Date_rupture_contrat || f.Date_rupture);
    var entreprise = EUC_DEV597_t_(f.Nom_entreprise || f.Raison_sociale || f.Entreprise || f.Nom_commercial);
    /* Pas de contrat (futur apprenti sans entreprise) ou contrat terminé avant l'année : pas d'échéance. */
    if (!debut || !entreprise || (fin && fin < debutAnnee) || (rupture && rupture <= debut)) return;
    var contact = cont[Number(r.id)] || null, statut = EUC_DEV597_statut_(debut, aujourdhui, contact);
    if (rupture && rupture < aujourdhui && !contact) statut = 'ROMPU';
    lignes.push({ contratId: Number(r.id), eleveId: eid, nom: e.nom, classe: e.classe, mode: e.mode, organismes: [e.gestionnaire, e.donneur].filter(function(v, i, a) { return v && a.indexOf(v) === i; }).join(' + '),
      entreprise: entreprise, tuteur: { nom: [EUC_DEV597_t_(f.Tuteur_prenom), EUC_DEV597_t_(f.Tuteur_nom || f.Tuteur)].filter(Boolean).join(' '), tel: EUC_DEV597_t_(f.Tuteur_telephone), mail: EUC_DEV597_t_(f.Tuteur_courriel) },
      debut: debut, jours: EUC_DEV597_jours_(debut, aujourdhui), echeance: EUC_DEV597_plus_(debut, EUC_DEV597_SEUILS_.alerte), statut: statut, contact: contact, referent: ref[eid] || null });
  });
  var ordre = { RETARD: 0, ALERTE: 1, RAPPEL: 2, A_FAIRE: 3, A_VENIR: 4, ROMPU: 5, FAIT: 6 };
  lignes.sort(function(a, b) { return ordre[a.statut] - ordre[b.statut] || a.debut.localeCompare(b.debut) || a.nom.localeCompare(b.nom, 'fr'); });
  var compteurs = {}; Object.keys(ordre).forEach(function(k) { compteurs[k] = 0; }); lignes.forEach(function(l) { compteurs[l.statut]++; });
  compteurs.sansReferent = lignes.filter(function(l) { return !l.referent && l.statut !== 'FAIT' && l.statut !== 'ROMPU'; }).length;
  return { annee: annee, aujourdhui: aujourdhui, seuils: EUC_DEV597_SEUILS_, lignes: lignes, compteurs: compteurs };
}

function EUC_DEV597_donnees_(annee) {
  EUC_DEV597_tables_();
  var m = EUC_SUIVI2_modele_(EUC_DEV597_t_(annee));
  return EUC_DEV597_calcul_(m, EUC_DEV597_lire_('EUC_APPRENTISSAGE_PFMP'), EUC_DEV597_lire_(EUC_DEV597_REFERENTS_), EUC_DEV597_lire_(EUC_DEV597_CONTACTS_), EUC_SUIVI2_aujourdhui_());
}

/* Page : échéances + professeurs pour l'affectation. */
function EUC_DEV597_echeancier(annee) {
  EUC_SUIVI2_exigerAdmin_();
  var r = EUC_DEV597_donnees_(annee);
  r.professeurs = EUC_DEV597_lire_('EUC_PROFESSEURS_PFMP').map(function(p) { var f = p.fields || p; return { id: Number(p.id), nom: [EUC_DEV597_t_(f.Civilite), EUC_DEV597_t_(f.Prenom), EUC_DEV597_t_(f.Nom)].filter(Boolean).join(' '), actif: f.Actif !== false }; })
    .filter(function(p) { return p.nom && p.actif; }).sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
  r.ok = true; return r;
}

/* Compteurs pour l'accueil (sans la liste). */
function EUC_DEV597_compteurs_(annee) { var r = EUC_DEV597_donnees_(annee); return r.compteurs; }

function EUC_DEV597_affecterReferent(q) {
  var ctx = EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var ids = (q.eleveIds || []).map(Number).filter(Boolean), annee = EUC_DEV597_t_(q.annee) || EUC_SUIVI2_anneeCourante_(EUC_SUIVI2_aujourdhui_());
  if (!ids.length) throw new Error('Choisissez au moins un apprenti.');
  var prof = EUC_DEV597_lire_('EUC_PROFESSEURS_PFMP').filter(function(p) { return Number(p.id) === Number(q.profId); })[0];
  if (!prof && q.profId) throw new Error('Professeur introuvable.');
  EUC_DEV597_tables_();
  var pf = prof ? (prof.fields || {}) : {}, nom = prof ? [EUC_DEV597_t_(pf.Civilite), EUC_DEV597_t_(pf.Prenom), EUC_DEV597_t_(pf.Nom)].filter(Boolean).join(' ') : '';
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  try {
    var existants = {}; EUC_DEV597_lire_(EUC_DEV597_REFERENTS_).forEach(function(r) { var f = r.fields || {}; if (EUC_DEV597_t_(f.Annee_scolaire) === annee && f.Actif !== false) (existants[Number(f.Eleve)] = existants[Number(f.Eleve)] || []).push(r.id); });
    var patches = [], posts = [], maintenant = new Date().toISOString();
    ids.forEach(function(eid) {
      (existants[eid] || []).forEach(function(id) { patches.push({ id: id, fields: { Actif: false, Date_modification: maintenant } }); });
      if (prof) posts.push({ fields: { Eleve: eid, Annee_scolaire: annee, Professeur: Number(prof.id), Professeur_nom: nom, Actif: true, Date_modification: maintenant } });
    });
    if (patches.length) EUC_ENT_grist('patch', '/tables/' + EUC_DEV597_REFERENTS_ + '/records', { records: patches });
    if (posts.length) EUC_ENT_grist('post', '/tables/' + EUC_DEV597_REFERENTS_ + '/records', { records: posts });
  } finally { lock.releaseLock(); }
  return { ok: true, referent: nom, eleves: ids.length, auteur: ctx && ctx.email || '' };
}

function EUC_DEV597_enregistrerContact(q) {
  var ctx = EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var date = EUC_DEV597_t_(q.date), mode = EUC_DEV597_t_(q.mode).toUpperCase();
  if (!Number(q.contratId) || !Number(q.eleveId)) throw new Error('Contrat inconnu.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date du contact invalide.');
  if (['APPEL', 'VISITE'].indexOf(mode) < 0) throw new Error('Choisissez appel ou visite.');
  EUC_DEV597_tables_();
  EUC_ENT_grist('post', '/tables/' + EUC_DEV597_CONTACTS_ + '/records', { records: [{ fields: { Contrat: Number(q.contratId), Eleve: Number(q.eleveId), Annee_scolaire: EUC_DEV597_t_(q.annee), Date_contact: date, Mode: mode, Professeur_nom: EUC_DEV597_t_(q.professeur), Compte_rendu: EUC_DEV597_t_(q.compteRendu).slice(0, 4000), Auteur: EUC_DEV597_t_(ctx && ctx.email), Date_saisie: new Date().toISOString() } }] });
  return { ok: true };
}

function EUC_DEV597_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  var t = HtmlService.createTemplateFromFile('Echeancier_Apprentis_DEV597');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  t.annee = EUC_DEV597_t_(e && e.parameter && e.parameter.annee);
  return t.evaluate().setTitle('Échéancier des apprentis').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
