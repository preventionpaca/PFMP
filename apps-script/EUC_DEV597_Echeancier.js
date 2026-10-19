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
  var c = CacheService.getScriptCache(); if (c.get('EUC_DEV597_TABLES2')) return;
  var ids = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; }), col = EUC_DEV441_col_;
  if (ids.indexOf(EUC_DEV597_REFERENTS_) < 0) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV597_REFERENTS_, columns: [col('Eleve', 'Élève (id)', 'Int'), col('Annee_scolaire', 'Année scolaire'), col('Professeur', 'Professeur (id)', 'Int'), col('Professeur_nom', 'Professeur'), col('Actif', 'Actif', 'Bool'), col('Date_modification', 'Date modification')] }] });
  if (ids.indexOf(EUC_DEV597_CONTACTS_) < 0) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV597_CONTACTS_, columns: [col('Contrat', 'Contrat (id)', 'Int'), col('Eleve', 'Élève (id)', 'Int'), col('Annee_scolaire', 'Année scolaire'), col('Date_contact', 'Date du contact'), col('Mode', 'Mode'), col('Professeur_nom', 'Professeur'), col('Compte_rendu', 'Compte rendu'), col('Auteur', 'Saisi par'), col('Date_saisie', 'Date de saisie')] }] });
  /* Colonne « Prévenu le » (courriel au référent), ajoutée aussi à une table existante. */
  try { var rc = (EUC_ENT_grist('get', '/tables/' + EUC_DEV597_REFERENTS_ + '/columns').columns || []).map(function(x) { return x.id; }); if (rc.indexOf('Notifie_le') < 0) EUC_ENT_grist('post', '/tables/' + EUC_DEV597_REFERENTS_ + '/columns', { columns: [col('Notifie_le', 'Prévenu le')] }); } catch (e) {}
  c.put('EUC_DEV597_TABLES2', '1', 21600);
}
function EUC_DEV597_lire_(table) { try { return (EUC_ENT_grist('get', '/tables/' + table + '/records').records || []); } catch (e) { return []; } }

/* Échéances de l'année (calcul pur à partir du modèle du suivi et des tables). */
function EUC_DEV597_calcul_(m, contrats, referents, contacts, aujourdhui) {
  var annee = m.annee, debutAnnee = annee.slice(0, 4) + '-09-01', eleves = {};
  (m.classes || []).forEach(function(c) { (c.eleves || []).forEach(function(e) { eleves[e.id] = { nom: e.libelle, classe: c.nom, mode: c.modeApprentissage || 'MIXITE', gestionnaire: c.gestionnaire || '', donneur: c.donneur || '' }; }); });
  var ref = {}; referents.forEach(function(r) { var f = r.fields || r; if (f.Actif === false || EUC_DEV597_t_(f.Annee_scolaire) !== annee) return; var k = Number(f.Eleve); if (!ref[k] || Number(r.id) > ref[k].id) ref[k] = { id: Number(r.id), professeurId: Number(f.Professeur) || 0, nom: EUC_DEV597_t_(f.Professeur_nom), notifieLe: EUC_DEV597_t_(f.Notifie_le) }; });
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
  lignes.sort(function(a, b) { return EUC_DEV597_ORDRE_[a.statut] - EUC_DEV597_ORDRE_[b.statut] || a.debut.localeCompare(b.debut) || a.nom.localeCompare(b.nom, 'fr'); });
  return { annee: annee, aujourdhui: aujourdhui, seuils: EUC_DEV597_SEUILS_, lignes: lignes, compteurs: EUC_DEV597_compter_(lignes) };
}
var EUC_DEV597_ORDRE_ = { RETARD: 0, ALERTE: 1, RAPPEL: 2, A_FAIRE: 3, A_VENIR: 4, ROMPU: 5, FAIT: 6 };
function EUC_DEV597_compter_(lignes) {
  var compteurs = {}; Object.keys(EUC_DEV597_ORDRE_).forEach(function(k) { compteurs[k] = 0; }); lignes.forEach(function(l) { compteurs[l.statut]++; });
  compteurs.sansReferent = lignes.filter(function(l) { return !l.referent && l.statut !== 'FAIT' && l.statut !== 'ROMPU'; }).length;
  return compteurs;
}
/* DEV600 : classes masquées de l'échéancier (apprentis ne relevant pas encore du dispositif : GRETA, BTS…). */
var EUC_DEV597_MASQUEES_PROP_ = 'EUC_DEV597_CLASSES_MASQUEES';
function EUC_DEV597_masquees_() { try { var v = JSON.parse(PropertiesService.getScriptProperties().getProperty(EUC_DEV597_MASQUEES_PROP_) || '[]'); return Array.isArray(v) ? v.map(String) : []; } catch (e) { return []; } }
/* Filtre pur : retire les lignes des classes masquées, recalcule les compteurs, liste les classes. */
function EUC_DEV597_filtrer_(d, masquees) {
  var cl = {}; d.lignes.forEach(function(l) { cl[l.classe] = (cl[l.classe] || 0) + 1; });
  d.classes = Object.keys(cl).sort(function(a, b) { return a.localeCompare(b, 'fr'); }).map(function(c) { return { nom: c, apprentis: cl[c], masquee: masquees.indexOf(c) >= 0 }; });
  d.lignes = d.lignes.filter(function(l) { return masquees.indexOf(l.classe) < 0; });
  d.compteurs = EUC_DEV597_compter_(d.lignes); d.masquees = masquees;
  return d;
}
function EUC_DEV597_reglerClasses(q) {
  EUC_SUIVI2_exigerAdmin_(); var l = ((q && q.masquees) || []).map(function(v) { return EUC_DEV597_t_(v); }).filter(Boolean).slice(0, 300);
  PropertiesService.getScriptProperties().setProperty(EUC_DEV597_MASQUEES_PROP_, JSON.stringify(l)); return { ok: true, masquees: l };
}

function EUC_DEV597_donnees_(annee) {
  EUC_DEV597_tables_();
  var m = EUC_SUIVI2_modele_(EUC_DEV597_t_(annee));
  /* DEV598 : un bilan de visite en ligne vaut contact d'entrée. */
  var bilans = typeof EUC_DEV598_BILANS_ !== 'undefined' ? EUC_DEV597_lire_(EUC_DEV598_BILANS_) : [];
  var d = EUC_DEV597_filtrer_(EUC_DEV597_calcul_(m, EUC_DEV597_lire_('EUC_APPRENTISSAGE_PFMP'), EUC_DEV597_lire_(EUC_DEV597_REFERENTS_), EUC_DEV597_lire_(EUC_DEV597_CONTACTS_).concat(bilans.length ? EUC_DEV598_commeContacts_(bilans) : []), EUC_SUIVI2_aujourdhui_()), EUC_DEV597_masquees_());
  if (typeof EUC_DEV598_lienProf_ === 'function') {
    var parContrat = {}; bilans.forEach(function(r) { var k = Number((r.fields || {}).Contrat); (parContrat[k] = parContrat[k] || []).push(EUC_DEV598_resume_(r)); });
    d.compteurs.bilansAlerte = 0; d.compteurs.vigilance = 0; d.compteurs.aValider = 0;
    d.lignes.forEach(function(l) {
      l.lienFiche = EUC_DEV598_lienProf_(l.contratId);
      if (typeof EUC_DEV599_lienApprenti_ === 'function') l.lienLivret = EUC_DEV599_lienApprenti_(l.eleveId);
      l.bilans = (parContrat[l.contratId] || []).sort(function(a, b) { return b.date.localeCompare(a.date) || b.id - a.id; });
      var dernier = l.bilans[0]; if (!dernier) return;
      if (dernier.bilan === 'ALERTE') d.compteurs.bilansAlerte++;
      if (dernier.vigilance.length) d.compteurs.vigilance++;
      if (dernier.statut !== 'VALIDE') d.compteurs.aValider++;
    });
  }
  return d;
}

/* Page : échéances + professeurs pour l'affectation. */
function EUC_DEV597_echeancier(annee) {
  EUC_SUIVI2_exigerAdmin_();
  var r = EUC_DEV597_donnees_(annee);
  r.professeurs = EUC_DEV597_lire_('EUC_PROFESSEURS_PFMP').map(function(p) { var f = p.fields || p; return { id: Number(p.id), nom: [EUC_DEV597_t_(f.Civilite), EUC_DEV597_t_(f.Prenom), EUC_DEV597_t_(f.Nom)].filter(Boolean).join(' '), actif: f.Actif !== false }; })
    .filter(function(p) { return p.nom && p.actif; }).sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
  r.fiche = EUC_DEV597_fiche_();
  r.copieValidations = typeof EUC_DEV598_copie_ === 'function' ? EUC_DEV598_copie_() : '';
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
  if (['APPEL', 'VISITE', 'VISIO'].indexOf(mode) < 0) throw new Error('Choisissez appel, visio ou visite.');
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

/* ---------- Courriel au professeur référent ---------- */
var EUC_DEV597_FICHE_PROP_ = 'EUC_DEV597_FICHE_ENTRETIEN_URL';
function EUC_DEV597_dfr_(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
function EUC_DEV597_fiche_() { try { return PropertiesService.getScriptProperties().getProperty(EUC_DEV597_FICHE_PROP_) || ''; } catch (e) { return ''; } }
function EUC_DEV597_reglerFiche(q) { EUC_SUIVI2_exigerAdmin_(); var u = EUC_DEV597_t_(q && q.url); if (u && !/^https:\/\//.test(u)) throw new Error('Le lien doit commencer par https://'); PropertiesService.getScriptProperties().setProperty(EUC_DEV597_FICHE_PROP_, u); return { ok: true, url: u }; }

/* Message (texte) pour un professeur et ses apprentis (calcul pur). */
function EUC_DEV597_message_(prof, lignes, fiche) {
  var avant = lignes.map(function(l) { return l.echeance; }).sort()[0];
  var t = ['Bonjour ' + prof.nom + ',', '',
    'Vous êtes désigné(e) professeur référent ' + (lignes.length > 1 ? 'des apprentis suivants' : 'de l’apprenti suivant') + '. La réglementation impose un premier contact avec l’entreprise dans les 45 jours qui suivent le début du contrat.', ''];
  if (prof.lienEspace) t.push('Votre espace professeur référent (tous vos apprentis de l’année, bilans de visite, livrets) — à garder dans vos favoris :', prof.lienEspace, '');
  lignes.forEach(function(l) {
    var tu = l.tuteur || {};
    t.push('• ' + l.nom + ' — ' + l.classe + (l.organismes ? ' (' + l.organismes + ')' : ''));
    t.push('  Entreprise : ' + l.entreprise);
    if (tu.nom || tu.tel || tu.mail) t.push('  Tuteur : ' + [tu.nom, tu.tel, tu.mail].filter(Boolean).join(' · '));
    t.push('  Début du contrat : ' + EUC_DEV597_dfr_(l.debut) + ' — contact à prendre avant le ' + EUC_DEV597_dfr_(l.echeance));
    if (l.lienFiche) t.push('  Bilan de visite en ligne (lien personnel, à garder) : ' + l.lienFiche);
    t.push('');
  });
  t.push('Au cours de cet échange (téléphone, visio ou visite) :',
    '1. Faire le point avec le tuteur sur ce qui a été vu au lycée et sur ce qui est attendu en entreprise.',
    '2. Rappeler les attendus de l’année et du diplôme.',
    '3. Prendre des nouvelles des premiers temps : intégration, assiduité, comportement, motivation.',
    '4. Repérer toute difficulté pouvant conduire à une rupture et la signaler sans attendre.', '');
  if (fiche) t.push('Fiche d’entretien à utiliser : ' + fiche, '');
  if (lignes.some(function(l) { return l.lienFiche; })) t.push('Le bilan de visite se remplit en ligne depuis le lien de chaque apprenti. À la fin de l’entretien, le tuteur le valide lui-même : sur place ou en visio, il scanne le QR code affiché ; par téléphone, il reçoit le lien sur le courriel qu’il vous indique.', '');
  if (!lignes.some(function(l) { return l.lienFiche; })) t.push('Merci de répondre à ce courriel en indiquant la date, le mode de contact (téléphone, visio, visite) et un bref compte rendu : il sera enregistré dans le suivi de l’apprenti.', '');
  t.push( 'Bien cordialement,', 'Le bureau des entreprises — Lycée Les Eucalyptus');
  return { sujet: '[Apprentis] Référent — premier contact entreprise avant le ' + EUC_DEV597_dfr_(avant), corps: t.join('\n') };
}

/* Aperçu, puis avec confirmation 'ENVOYER' : un courriel par professeur référent. */
function EUC_DEV597_prevenirReferents(q) {
  var ctx = EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var d = EUC_DEV597_donnees_(q.annee), choisis = (q.eleveIds || []).map(Number), fiche = EUC_DEV597_fiche_();
  var profs = {}; EUC_DEV597_lire_('EUC_PROFESSEURS_PFMP').forEach(function(p) { var f = p.fields || {}; profs[Number(p.id)] = { nom: [EUC_DEV597_t_(f.Civilite), EUC_DEV597_t_(f.Prenom), EUC_DEV597_t_(f.Nom)].filter(Boolean).join(' '), email: EUC_DEV597_t_(f.Email), lienEspace: typeof EUC_DEV600_lien_ === 'function' ? EUC_DEV600_lien_(p.id) : '' }; });
  var groupes = {}, sansMail = [];
  d.lignes.forEach(function(l) {
    if (!l.referent || l.statut === 'FAIT' || l.statut === 'ROMPU') return;
    if (choisis.length ? choisis.indexOf(l.eleveId) < 0 : !!l.referent.notifieLe) return;
    var p = profs[l.referent.professeurId]; if (!p || !p.email) { sansMail.push(l.referent.nom); return; }
    var g = groupes[l.referent.professeurId] = groupes[l.referent.professeurId] || { prof: p, lignes: [] }; g.lignes.push(l);
  });
  var envois = Object.keys(groupes).map(function(k) { var g = groupes[k], msg = EUC_DEV597_message_(g.prof, g.lignes, fiche); return { professeurId: Number(k), professeur: g.prof.nom, email: g.prof.email, apprentis: g.lignes.map(function(l) { return l.nom; }), referentIds: g.lignes.map(function(l) { return l.referent.id; }), sujet: msg.sujet, corps: msg.corps }; });
  var res = { ok: true, apercu: q.confirmation !== 'ENVOYER', envois: envois, sansMail: sansMail.filter(function(v, i, a) { return a.indexOf(v) === i; }), fiche: fiche };
  if (res.apercu || !envois.length) return res;
  if (MailApp.getRemainingDailyQuota() < envois.length) throw new Error('Quota de courriels du jour insuffisant.');
  var maintenant = new Date().toISOString(), patches = [], envoyes = 0;
  envois.forEach(function(e) {
    MailApp.sendEmail({ to: e.email, replyTo: EUC_DEV597_t_(ctx && ctx.email) || undefined, name: 'Lycée Les Eucalyptus — Apprentis', subject: e.sujet, body: e.corps });
    envoyes++; e.referentIds.forEach(function(id) { patches.push({ id: id, fields: { Notifie_le: maintenant } }); });
  });
  if (patches.length) EUC_ENT_grist('patch', '/tables/' + EUC_DEV597_REFERENTS_ + '/records', { records: patches });
  res.envoyes = envoyes; return res;
}
