/**
 * DEV643 — « Contrôle des saisies » : pour une classe, ce qui a vraiment été saisi
 * (QR code, formulaire de secours, JotForm, dossier du bureau) en regard de ce que
 * le suivi affiche, et la raison de tout écart. Réservé à l'administration. Lecture seule.
 */
var EUC_DEV643_REQUIS_ = [['prenom', 'prénom'], ['nom', 'nom'], ['fonction', 'fonction'], ['tel', 'téléphone'], ['mail', 'courriel']];

function EUC_DEV643_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  var t = HtmlService.createTemplateFromFile('Controle_Saisies_DEV643');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  t.annee = EUC_SUIVI2_t_(e && e.parameter && e.parameter.annee);
  t.classe = Number(e && e.parameter && e.parameter.classe) || 0;
  return t.evaluate().setTitle('Contrôle des saisies — PFMP').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function EUC_DEV643_classes(annee) {
  EUC_SUIVI2_exigerAdmin_();
  var m = EUC_SUIVI2_modele_(annee);
  return { annee: m.annee, classes: m.classes.map(function(c) { return { id: c.id, nom: c.nom }; }).sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); }) };
}

function EUC_DEV643_saisies(annee, classeId) {
  EUC_SUIVI2_exigerAdmin_();
  return EUC_DEV643_lignes_(EUC_SUIVI2_modele_(annee), EUC_SUIVI2_lireSources_(), Number(classeId));
}

/* Toutes les saisies de l'année, sans filtre de classe ni de période, la plus récente d'abord. */
function EUC_DEV643_journal(annee) {
  EUC_SUIVI2_exigerAdmin_();
  return EUC_DEV643_journal_(EUC_SUIVI2_t_(annee) || EUC_SUIVI2_anneeCourante_(EUC_SUIVI2_aujourdhui_()), EUC_SUIVI2_lireSources_());
}

function EUC_DEV643_manques_(personne, prefixe) {
  return EUC_DEV643_REQUIS_.filter(function(c) { return !personne[c[0]]; }).map(function(c) { return c[1] + ' ' + prefixe; });
}
function EUC_DEV643_completer_(s) {
  s.manques = EUC_DEV643_manques_(s.responsable, 'du responsable').concat(EUC_DEV643_manques_(s.tuteur, 'du tuteur'));
  return s;
}
function EUC_DEV643_saisieDossier_(a) {
  var P = EUC_SUIVI2_premier_, T = EUC_SUIVI2_t_, personne = function(x) { return { civilite: T(a[x + '_civilite']), prenom: T(a[x + '_prenom']), nom: T(a[x + '_nom']), fonction: T(a[x + '_fonction']), tel: T(a[x + '_telephone']), mail: T(a[x + '_courriel']) }; };
  var saisieLe = EUC_SUIVI2_date_(a.Date_saisie_entreprise), quand = a.Date_saisie_entreprise || a.Date_enregistrement || a.Date_creation;
  return EUC_DEV643_completer_({ origine: saisieLe ? 'QR code' : 'Dossier du bureau', table: 'Dossier', ligne: Number(a.id), statut: T(a.Statut_administratif || a.Statut) || 'sans statut',
    date: saisieLe || EUC_SUIVI2_date_(a.Date_enregistrement || a.Date_creation), ms: EUC_DEV643_ms_(quand), periode: EUC_SUIVI2_ref_(a.Periode), debut: EUC_SUIVI2_date_(a.Date_debut), fin: EUC_SUIVI2_date_(a.Date_fin_reelle || a.Date_fin), numero: P(a.Numero_enregistrement, a.Reference_convention), entreprise: P(a.Entreprise_raison_sociale, a.Entreprise_enseigne),
    siret: T(a.Entreprise_siret || a.Entreprise_siret_snapshot).replace(/\D/g, ''), tuteurEstResponsable: a.Tuteur_est_responsable === true, responsable: personne('Responsable'), tuteur: personne('Tuteur') });
}
function EUC_DEV643_saisieTampon_(j) {
  var D = function(col, libelles) { return EUC_SUIVI2_date_(j[col]) || EUC_SUIVI2_date_(EUC_SUIVI2_brut_(j, libelles)); };
  var T = EUC_SUIVI2_t_, c = EUC_SUIVI2_contactsTampon_(j), depot = T(j.Submission_ID), secours = /^SECOURS-/.test(depot);
  return EUC_DEV643_completer_({ origine: secours ? 'Formulaire de secours' : 'JotForm', table: 'Table d’attente', ligne: Number(j.id), statut: T(j.Decision) || 'sans décision',
    date: EUC_SUIVI2_date_(j.Date_import), ms: EUC_DEV643_ms_(j.Date_import), periode: 0, debut: D('Date_debut_brut', ['Date de début', 'Date debut']), fin: D('Date_fin_brut', ['Date de fin', 'Date fin']), numero: secours ? depot.replace(/^SECOURS-/, '') : depot, entreprise: EUC_SUIVI2_premier_(j.Raison_sociale_officielle, j.Nom_commercial, j.Entreprise_saisie),
    siret: T(j.SIRET_normalise || j.SIRET_brut).replace(/\D/g, ''), tuteurEstResponsable: false, responsable: c.responsable, tuteur: c.tuteur });
}
/* Horodatage pour le tri : secondes Grist, millisecondes ou date écrite. */
function EUC_DEV643_ms_(v) {
  if (typeof v === 'number') return v < 1e11 ? v * 1000 : v;
  return Date.parse(EUC_SUIVI2_t_(v)) || 0;
}
/* Une saisie concerne une période par son lien direct ou par ses dates ; sans date, elle reste visible partout. */
function EUC_DEV643_concerne_(s, p) {
  if (s.periode && s.periode === Number(p.id)) return true;
  if (s.debut && s.fin) return s.debut <= p.fin && s.fin >= p.debut;
  return !s.periode;
}
/* Un dossier préparé à la génération de la convention, sans rien de saisi, n'est pas une saisie. */
function EUC_DEV643_vide_(s) { return !s.entreprise && !s.siret && !s.responsable.nom && !s.tuteur.nom; }

/* Compare l'affichage du suivi à ce qui a été saisi pour la même entreprise. */
function EUC_DEV643_etat_(statut, fiche, saisies) {
  if (statut !== 'AVEC') {
    if (statut === 'APPRENTI') return { code: 'AUTRE', texte: 'Apprenti : pas de convention de stage.' };
    return saisies.length ? { code: 'NON_COMPTEE', texte: 'Saisie présente, mais la période reste sans convention : voir son statut ci-dessous.' } : { code: 'AUCUNE', texte: 'Rien de saisi.' };
  }
  var f = fiche || {}, c = f.contact || {}, t = f.tuteur || {};
  var memes = saisies.filter(function(s) { return !f.siret || !s.siret || s.siret === f.siret; }), nonAffiches = [], nonSaisis = [];
  [[c.nom, 'responsable', 'nom', 'nom du responsable'], [c.tel, 'responsable', 'tel', 'téléphone du responsable'], [c.mail, 'responsable', 'mail', 'courriel du responsable'],
    [t.nom, 'tuteur', 'nom', 'nom du tuteur'], [t.tel, 'tuteur', 'tel', 'téléphone du tuteur'], [t.mail, 'tuteur', 'mail', 'courriel du tuteur']].forEach(function(x) {
    if (x[0]) return;
    (memes.some(function(s) { return !!s[x[1]][x[2]]; }) ? nonAffiches : nonSaisis).push(x[3]);
  });
  if (nonAffiches.length) return { code: 'NON_AFFICHE', texte: 'Saisi mais non affiché : ' + nonAffiches.join(', ') + '.' };
  if (nonSaisis.length) return { code: 'NON_SAISI', texte: 'Jamais saisi : ' + nonSaisis.join(', ') + '.' };
  return { code: 'OK', texte: 'Coordonnées complètes.' };
}

/* Calcul pur : journal de toutes les saisies, y compris celles dont l'élève n'est pas reconnu. */
function EUC_DEV643_journal_(annee, src) {
  var F = EUC_SUIVI2_champs_, T = EUC_SUIVI2_t_, annees = {}, classes = {}, eleves = {};
  (src.annees || []).map(F).forEach(function(a) { annees[String(a.id)] = T(a.Code || a.Libelle); });
  (src.classes || []).map(F).forEach(function(c) { classes[c.id] = T(c.Nom || c.Libelle); });
  (src.eleves || []).map(F).forEach(function(e) { eleves[e.id] = e; });
  var deLAnnee = function(x) { return [annee, ''].indexOf(EUC_SUIVI2_annee_(x.Annee_scolaire, annees)) >= 0; }, lignes = [];
  var ajouter = function(s, eid, nom, classe) {
    if (EUC_DEV643_vide_(s)) return;
    var e = eleves[eid];
    s.eleve = e ? [T(e.Nom), T(e.Prenom_usage || e.Prenom)].join(' ') : nom || 'Élève non reconnu';
    s.classe = (e && classes[EUC_SUIVI2_ref_(e.Classe)]) || classe || '';
    lignes.push(s);
  };
  (src.dossiers || []).map(F).filter(deLAnnee).forEach(function(a) { ajouter(EUC_DEV643_saisieDossier_(a), EUC_SUIVI2_ref_(a.Eleve), '', classes[EUC_SUIVI2_ref_(a.Classe_convention)]); });
  (src.jotform || []).map(F).filter(deLAnnee).forEach(function(j) { ajouter(EUC_DEV643_saisieTampon_(j), EUC_SUIVI2_ref_(j.Eleve_match_id || j.Eleve || j.Eleve_id), [T(j.Nom_eleve), T(j.Prenom_eleve)].filter(Boolean).join(' '), T(j.Classe_saisie)); });
  lignes.sort(function(a, b) { return b.ms - a.ms || b.ligne - a.ligne; });
  return { annee: annee, saisies: lignes };
}

/* Calcul pur : m = modèle du suivi, src = tables brutes. */
function EUC_DEV643_lignes_(m, src, classeId) {
  var c = (m.classes || []).filter(function(x) { return Number(x.id) === classeId; })[0];
  if (!c) throw new Error('Classe introuvable pour cette année.');
  var F = EUC_SUIVI2_champs_, annees = {};
  (src.annees || []).map(F).forEach(function(a) { annees[String(a.id)] = EUC_SUIVI2_t_(a.Code || a.Libelle); });
  var deLAnnee = function(x) { return [m.annee, ''].indexOf(EUC_SUIVI2_annee_(x.Annee_scolaire, annees)) >= 0; };
  var parEleve = {}, ranger = function(eid, s) { if (eid && !EUC_DEV643_vide_(s)) (parEleve[eid] = parEleve[eid] || []).push(s); };
  (src.dossiers || []).map(F).filter(deLAnnee).forEach(function(a) { ranger(EUC_SUIVI2_ref_(a.Eleve), EUC_DEV643_saisieDossier_(a)); });
  (src.jotform || []).map(F).filter(deLAnnee).forEach(function(j) { ranger(EUC_SUIVI2_ref_(j.Eleve_match_id || j.Eleve || j.Eleve_id), EUC_DEV643_saisieTampon_(j)); });
  var resume = { OK: 0, NON_AFFICHE: 0, NON_SAISI: 0, NON_COMPTEE: 0, AUCUNE: 0, AUTRE: 0 };
  var eleves = c.eleves.map(function(e) {
    var saisies = parEleve[e.id] || [];
    var periodes = c.periodes.filter(function(p) { return p.resume && !p.pdif; }).map(function(p) {
      var r = p.resume, statut = (r.statuts || {})[e.id] || '', fiche = (r.fiches || {})[e.id] || null, etat = EUC_DEV643_etat_(statut, fiche, saisies.filter(function(s) { return EUC_DEV643_concerne_(s, p); }));
      resume[etat.code]++;
      return { id: p.id, libelle: p.libelle, debut: p.debut, fin: p.fin, source: (r.sources || {})[e.id] || '', affiche: fiche, etat: etat };
    });
    return { id: e.id, libelle: e.libelle, periodes: periodes, saisies: saisies };
  });
  return { annee: m.annee, classe: { id: c.id, nom: c.nom }, resume: resume, eleves: eleves };
}
