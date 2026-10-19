/**
 * DEV598 — Bilan de visite en entreprise en ligne, validé par le tuteur.
 *
 * Le professeur remplit le bilan depuis son lien personnel (courriel de référent ou échéancier).
 * Le tuteur le valide lui-même, sur son téléphone :
 *   - sur place ou en visio : il scanne le QR code affiché par le professeur ;
 *   - par téléphone : il reçoit le lien sur le courriel qu'il dicte.
 * Il saisit son identité (proposée depuis le contrat, modifiable : remplaçant), un téléphone ou un
 * courriel, et signe au doigt. Ces données sont enregistrées à part : le professeur ne peut pas les
 * modifier. Toute modification du bilan après validation annule la validation.
 * Un accusé de réception part au courriel donné par le tuteur, avec copie à l'administration.
 * Signaux de vigilance : signataire différent du tuteur du contrat, contact d'un professeur,
 * adresse académique, même contact pour plusieurs entreprises.
 * Tables Grist créées au besoin :
 *   EUC_BILANS_VISITE_APPRENTIS  (un bilan par entretien)
 *   EUC_ACTIVITES_BILAN_VISITE   (repères et activités par diplôme, modifiables dans Grist)
 */
var EUC_DEV598_BILANS_ = 'EUC_BILANS_VISITE_APPRENTIS';
var EUC_DEV598_ACTIVITES_ = 'EUC_ACTIVITES_BILAN_VISITE';
var EUC_DEV598_LIEN_JOURS_ = 7;
var EUC_DEV598_COPIE_PROP_ = 'EUC_DEV598_COPIE_VALIDATIONS';

/* Comportement général et aptitudes professionnelles : commun à tous les diplômes. */
var EUC_DEV598_COMPORTEMENT_ = [
  ['tenue', 'Tenue et propreté', 'Très soignée', 'Correcte', 'Négligée'],
  ['langage', 'Langage', 'Soigné et professionnel', 'Convenable', 'Inadapté'],
  ['ponctualite', 'Ponctualité', 'Ponctuel', 'Quelques retards', 'Retards fréquents'],
  ['assiduite', 'Assiduité', 'Assidu', 'Absences justifiées', 'Absences non justifiées'],
  ['maitrise', 'Maîtrise de soi et respect', 'Accepte les contraintes, remarques et conseils', 'Convenable', 'Ne se maîtrise pas'],
  ['motivation', 'Motivation', 'Très motivé', 'S’intéresse aux activités', 'Peu de motivation'],
  ['integration', 'Intégration dans l’équipe', 'S’intègre facilement', 'Cherche à s’intégrer', 'Ne s’intègre pas'],
  ['information', 'Aptitude à s’informer', 'Fait preuve de curiosité', 'Cherche à s’informer', 'Ne pose pas de questions'],
  ['initiative', 'Initiative dans la limite de ses compétences', 'Prend des initiatives', 'Suit les instructions', 'À diriger à chaque étape'],
  ['physique', 'Aptitude physique', 'Très bonne résistance', 'Bonne résistance', 'Vite fatigué'],
  ['rigueur', 'Rigueur dans le travail', 'Très rigoureux', 'Essaie d’être méthodique', 'Peu soigné ou mal organisé'],
  ['securite', 'Hygiène et sécurité', 'Applique les règles de lui-même', 'Après un rappel', 'Non-respect fréquent'],
  ['rapidite', 'Rapidité d’exécution', 'Très rapide', 'Délais acceptables', 'Très lent']
];
var EUC_DEV598_NIVEAUX_ = ['NON_ABORDE', 'OBSERVE', 'AVEC_AIDE', 'AUTONOME'];
var EUC_DEV598_MODALITES_ = { TELEPHONE: 'APPEL', SUR_PLACE: 'VISITE', VISIO: 'VISIO' };
var EUC_DEV598_TYPES_ = ['POSITIONNEMENT', 'SUIVI', 'CCF'];
var EUC_DEV598_BILANS_OK_ = ['SATISFAISANT', 'A_RENFORCER', 'ALERTE'];

/* Première fiche : CAP Peintre automobile (motif de classe « CAPP »). */
var EUC_DEV598_SEMENCE_ = [
  ['REPERE', '', 'Préciser que ces apprentis possèdent déjà un diplôme et sont dispensés des épreuves générales : ce suivi porte sur la formation professionnelle et la progression en entreprise.'],
  ['REPERE', '', 'Présenter les deux blocs professionnels. L’objectif est de diversifier progressivement les tâches, avec un accompagnement adapté au niveau du jeune et aux règles de sécurité.'],
  ['REPERE', '', 'Expliquer que le ponçage et le nettoyage participent à l’apprentissage, mais ne couvrent pas l’ensemble des compétences attendues. Prévoir aussi réparation, préparation, colorimétrie, application et contrôle.'],
  ['ACTIVITE', 'Bloc 1 — Intervenir et réparer un élément', 'Dépose et repose d’éléments amovibles'],
  ['ACTIVITE', 'Bloc 1 — Intervenir et réparer un élément', 'Remise en forme d’éléments de carrosserie'],
  ['ACTIVITE', 'Bloc 1 — Intervenir et réparer un élément', 'Réparation des matériaux plastiques'],
  ['ACTIVITE', 'Bloc 2 — Préparer et appliquer des peintures', 'Préparation des fonds et des surfaces'],
  ['ACTIVITE', 'Bloc 2 — Préparer et appliquer des peintures', 'Colorimétrie et préparation de la teinte'],
  ['ACTIVITE', 'Bloc 2 — Préparer et appliquer des peintures', 'Application des bases et vernis'],
  ['A_VERIFIER', '', 'Collecte des informations et méthode de travail (bloc 1), contrôle de la qualité / conformité, consignes de sécurité, EPI et gestion des produits et déchets.']
];

function EUC_DEV598_t_(v) { return v == null ? '' : String(v).trim(); }
function EUC_DEV598_hex_(bytes) { return bytes.map(function(b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join(''); }

/* ---------- Liens signés ---------- */
function EUC_DEV598_secret_() {
  var p = PropertiesService.getScriptProperties(), k = 'EUC_DEV598_SECRET', s = p.getProperty(k);
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty(k, s); }
  return s;
}
function EUC_DEV598_sig_(texte) { return EUC_DEV598_hex_(Utilities.computeHmacSha256Signature(String(texte), EUC_DEV598_secret_(), Utilities.Charset.UTF_8)).slice(0, 32); }
function EUC_DEV598_egal_(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
/* Lien du professeur : un contrat. */
function EUC_DEV598_jetonProf_(contratId) { return 'p' + Number(contratId) + '.' + EUC_DEV598_sig_('P|' + Number(contratId)); }
function EUC_DEV598_lireJetonProf_(t) {
  var m = /^p(\d+)\.([0-9a-f]{32})$/.exec(EUC_DEV598_t_(t));
  if (!m || !EUC_DEV598_egal_(m[2], EUC_DEV598_sig_('P|' + Number(m[1])))) throw new Error('Lien de fiche de visite invalide. Demandez un nouveau lien au bureau des entreprises.');
  return Number(m[1]);
}
/* Lien du tuteur : un bilan, daté (valable EUC_DEV598_LIEN_JOURS_ jours). */
function EUC_DEV598_jetonTuteur_(bilanId, jour) { return 's' + Number(bilanId) + '.' + jour + '.' + EUC_DEV598_sig_('S|' + Number(bilanId) + '|' + jour); }
function EUC_DEV598_lireJetonTuteur_(t, aujourdhui) {
  var m = /^s(\d+)\.(\d{8})\.([0-9a-f]{32})$/.exec(EUC_DEV598_t_(t));
  if (!m || !EUC_DEV598_egal_(m[3], EUC_DEV598_sig_('S|' + Number(m[1]) + '|' + m[2]))) throw new Error('Lien de validation invalide.');
  var emis = m[2].slice(0, 4) + '-' + m[2].slice(4, 6) + '-' + m[2].slice(6, 8);
  if (EUC_DEV597_jours_(emis, aujourdhui) > EUC_DEV598_LIEN_JOURS_) throw new Error('Ce lien de validation a expiré. Demandez au professeur de vous en renvoyer un.');
  return Number(m[1]);
}
function EUC_DEV598_base_() { var u = ''; try { u = String(ScriptApp.getService().getUrl() || ''); } catch (e) {} return u.replace(/[?#].*$/, ''); }
function EUC_DEV598_lienProf_(contratId) { return EUC_DEV598_base_() + '?page=bilan-visite-apprenti&t=' + EUC_DEV598_jetonProf_(contratId); }
function EUC_DEV598_lienTuteur_(bilanId) { return EUC_DEV598_base_() + '?page=validation-bilan-visite&s=' + EUC_DEV598_jetonTuteur_(bilanId, EUC_SUIVI2_aujourdhui_().replace(/-/g, '')); }

/* ---------- Calculs purs ---------- */
/* Empreinte du contenu validé : toute modification après validation se voit. */
function EUC_DEV598_canon_(b) {
  return JSON.stringify([b.date, b.modalite, b.type, b.professeur, b.contenu || {}, b.bilan]);
}
function EUC_DEV598_empreinte_(b) {
  return EUC_DEV598_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, EUC_DEV598_canon_(b), Utilities.Charset.UTF_8)).slice(0, 24);
}
/* Contenu saisi par le professeur, nettoyé et borné. */
function EUC_DEV598_nettoyer_(q, modele) {
  q = q || {}; var c = q.contenu || {}, out = { comportement: {}, reperes: [], activites: {}, observations: '', taches: '', difficultes: '', objectifs: [], prochainPoint: '', debutEntreprise: '' };
  EUC_DEV598_COMPORTEMENT_.forEach(function(k) { var v = Number((c.comportement || {})[k[0]]); if (v >= 1 && v <= 3) out.comportement[k[0]] = v; });
  (modele.reperes || []).forEach(function(r, i) { if ((c.reperes || [])[i]) out.reperes[i] = true; });
  (modele.activites || []).forEach(function(a) { var x = (c.activites || {})[a.id] || {}; var niv = EUC_DEV598_NIVEAUX_.indexOf(String(x.niveau)) >= 0 ? String(x.niveau) : ''; var ex = EUC_DEV598_t_(x.exemple).slice(0, 500); if (niv || ex) out.activites[a.id] = { niveau: niv, exemple: ex }; });
  ['observations', 'taches', 'difficultes'].forEach(function(k) { out[k] = EUC_DEV598_t_(c[k]).slice(0, 3000); });
  out.objectifs = [0, 1].map(function(i) { var o = (c.objectifs || [])[i] || {}; return { objectif: EUC_DEV598_t_(o.objectif).slice(0, 500), echeance: EUC_DEV598_t_(o.echeance).slice(0, 300) }; });
  out.prochainPoint = /^\d{4}-\d{2}-\d{2}$/.test(EUC_DEV598_t_(c.prochainPoint)) ? EUC_DEV598_t_(c.prochainPoint) : '';
  out.debutEntreprise = /^\d{4}-\d{2}-\d{2}$/.test(EUC_DEV598_t_(c.debutEntreprise)) ? EUC_DEV598_t_(c.debutEntreprise) : '';
  var b = { date: EUC_DEV598_t_(q.date), modalite: EUC_DEV598_t_(q.modalite).toUpperCase(), type: EUC_DEV598_t_(q.type).toUpperCase(), professeur: EUC_DEV598_t_(q.professeur).slice(0, 120), contenu: out, bilan: EUC_DEV598_t_(q.bilan).toUpperCase() };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) throw new Error('Date de l’entretien invalide.');
  if (!EUC_DEV598_MODALITES_[b.modalite]) throw new Error('Choisissez la modalité : téléphone, sur place ou visio.');
  if (EUC_DEV598_TYPES_.indexOf(b.type) < 0) throw new Error('Choisissez le type d’entretien.');
  if (!b.professeur) throw new Error('Indiquez le nom du professeur.');
  if (b.bilan && EUC_DEV598_BILANS_OK_.indexOf(b.bilan) < 0) b.bilan = '';
  return b;
}
/* Modèle de la fiche pour une classe : repères et activités dont le motif figure dans le nom de la classe. */
function EUC_DEV598_modele_(classe, lignes) {
  var nom = EUC_DEV598_t_(classe).toUpperCase().replace(/\s+/g, ''), m = { comportement: EUC_DEV598_COMPORTEMENT_, reperes: [], activites: [], aVerifier: [], intitule: '' };
  (lignes || []).map(function(r) { return r.fields || r; }).filter(function(f) { var mo = EUC_DEV598_t_(f.Classe_motif).toUpperCase().replace(/\s+/g, ''); return f.Actif !== false && mo && nom.indexOf(mo) >= 0; })
    .sort(function(a, b) { return (Number(a.Ordre) || 0) - (Number(b.Ordre) || 0); })
    .forEach(function(f, i) {
      var type = EUC_DEV598_t_(f.Type).toUpperCase(), texte = EUC_DEV598_t_(f.Libelle);
      if (!m.intitule && f.Diplome) m.intitule = EUC_DEV598_t_(f.Diplome);
      if (type === 'REPERE') m.reperes.push(texte);
      else if (type === 'A_VERIFIER') m.aVerifier.push(texte);
      else if (texte) m.activites.push({ id: 'a' + (Number(f.Ordre) || i), bloc: EUC_DEV598_t_(f.Bloc), libelle: texte });
    });
  return m;
}
function EUC_DEV598_normContact_(v) {
  v = EUC_DEV598_t_(v).toLowerCase();
  if (v.indexOf('@') > 0) return v.replace(/\s+/g, '');
  var d = v.replace(/\D/g, ''); if (/^33\d{9}$/.test(d)) d = '0' + d.slice(2);
  return d;
}
function EUC_DEV598_nomNorm_(v) { return EUC_DEV598_t_(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, ''); }
/* Signaux de vigilance sur une validation (calcul pur). */
function EUC_DEV598_vigilance_(sig, tuteurContrat, entreprise, autres, profs) {
  var v = [], mail = EUC_DEV598_normContact_(sig.email), tel = EUC_DEV598_normContact_(sig.telephone);
  var tc = EUC_DEV598_nomNorm_(tuteurContrat && tuteurContrat.nom), sn = EUC_DEV598_nomNorm_(sig.prenom + ' ' + sig.nom), sn2 = EUC_DEV598_nomNorm_(sig.nom);
  if (tc && sn && tc !== sn && tc.indexOf(sn2) < 0) v.push('SIGNATAIRE_DIFFERENT');
  if (mail && /@(ac-[a-z-]+\.fr|education\.gouv\.fr|.*\.ac-[a-z-]+\.fr)$/.test(mail)) v.push('ADRESSE_ACADEMIQUE');
  (profs || []).forEach(function(p) {
    if ((mail && EUC_DEV598_normContact_(p.email) === mail) || (tel && tel.length >= 9 && EUC_DEV598_normContact_(p.telephone) === tel)) { if (v.indexOf('CONTACT_PROFESSEUR') < 0) v.push('CONTACT_PROFESSEUR'); }
  });
  var ent = EUC_DEV598_nomNorm_(entreprise);
  (autres || []).forEach(function(a) {
    if (EUC_DEV598_nomNorm_(a.entreprise) === ent) return;
    if ((mail && EUC_DEV598_normContact_(a.email) === mail) || (tel && tel.length >= 9 && EUC_DEV598_normContact_(a.telephone) === tel)) { if (v.indexOf('CONTACT_PLUSIEURS_ENTREPRISES') < 0) v.push('CONTACT_PLUSIEURS_ENTREPRISES'); }
  });
  return v;
}
var EUC_DEV598_LIB_VIGILANCE_ = {
  SIGNATAIRE_DIFFERENT: 'signataire différent du tuteur du contrat',
  ADRESSE_ACADEMIQUE: 'adresse académique',
  CONTACT_PROFESSEUR: 'contact d’un professeur du lycée',
  CONTACT_PLUSIEURS_ENTREPRISES: 'même contact déjà utilisé pour une autre entreprise'
};
/* Résumé d'un bilan pour l'échéancier (calcul pur). */
function EUC_DEV598_resume_(r) {
  var f = r.fields || r, vig = EUC_DEV598_t_(f.Vigilance);
  var signe = EUC_DEV598_t_(f.Statut) === 'VALIDE' && EUC_DEV598_t_(f.Empreinte_validee) === EUC_DEV598_t_(f.Empreinte);
  return { id: Number(r.id), date: EUC_DEV598_t_(f.Date_entretien), modalite: EUC_DEV598_t_(f.Modalite), bilan: EUC_DEV598_t_(f.Bilan), professeur: EUC_DEV598_t_(f.Professeur_nom),
    statut: signe ? 'VALIDE' : 'A_VALIDER', signataire: signe ? [EUC_DEV598_t_(f.Signataire_prenom), EUC_DEV598_t_(f.Signataire_nom)].filter(Boolean).join(' ') : '',
    signeLe: signe ? EUC_DEV598_t_(f.Valide_le) : '', vigilance: signe && vig ? vig.split(',') : [] };
}

/* ---------- Grist ---------- */
function EUC_DEV598_tables_() {
  var c = CacheService.getScriptCache(); if (c.get('EUC_DEV598_TABLES1')) return;
  var ids = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; }), col = EUC_DEV441_col_;
  if (ids.indexOf(EUC_DEV598_BILANS_) < 0) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV598_BILANS_, columns: [
    col('Contrat', 'Contrat (id)', 'Int'), col('Eleve', 'Élève (id)', 'Int'), col('Annee_scolaire', 'Année scolaire'), col('Classe', 'Classe'), col('Entreprise', 'Entreprise'),
    col('Date_entretien', 'Date de l’entretien'), col('Modalite', 'Modalité'), col('Type', 'Type d’entretien'), col('Professeur_nom', 'Professeur'), col('Contenu', 'Contenu (JSON)'), col('Bilan', 'Bilan'),
    col('Empreinte', 'Empreinte du contenu'), col('Statut', 'Statut'), col('Auteur', 'Saisi depuis'), col('Date_saisie', 'Créé le'), col('Date_modification', 'Modifié le'),
    col('Signataire_nom', 'Signataire — nom'), col('Signataire_prenom', 'Signataire — prénom'), col('Signataire_fonction', 'Signataire — fonction'), col('Signataire_telephone', 'Signataire — téléphone'), col('Signataire_email', 'Signataire — courriel'),
    col('Signature', 'Signature (image)'), col('Valide_le', 'Validé le'), col('Valide_via', 'Validé via'), col('Empreinte_validee', 'Empreinte validée'), col('Vigilance', 'Vigilance'),
    col('Lien_envoye_a', 'Lien envoyé à'), col('Lien_envoye_le', 'Lien envoyé le'), col('Accuse_envoye_le', 'Accusé envoyé le'), col('Validation_annulee_le', 'Validation annulée le'), col('Journal', 'Journal')] }] });
  if (ids.indexOf(EUC_DEV598_ACTIVITES_) < 0) {
    EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV598_ACTIVITES_, columns: [col('Classe_motif', 'Motif de classe (ex. CAPP)'), col('Diplome', 'Diplôme'), col('Type', 'Type (REPERE, ACTIVITE, A_VERIFIER)'), col('Bloc', 'Bloc'), col('Libelle', 'Libellé'), col('Ordre', 'Ordre', 'Int'), col('Actif', 'Actif', 'Bool')] }] });
    EUC_ENT_grist('post', '/tables/' + EUC_DEV598_ACTIVITES_ + '/records', { records: EUC_DEV598_SEMENCE_.map(function(s, i) { return { fields: { Classe_motif: 'CAPP', Diplome: 'CAP Peintre automobile', Type: s[0], Bloc: s[1], Libelle: s[2], Ordre: (i + 1) * 10, Actif: true } }; }) });
  }
  c.put('EUC_DEV598_TABLES1', '1', 21600);
}
function EUC_DEV598_bilan_(id) { var r = EUC_ENT_grist('get', '/tables/' + EUC_DEV598_BILANS_ + '/records?filter=' + encodeURIComponent(JSON.stringify({ id: [Number(id)] }))).records || []; if (!r.length) throw new Error('Bilan introuvable.'); return r[0]; }
function EUC_DEV598_bilansContrat_(contratId) { try { return EUC_ENT_grist('get', '/tables/' + EUC_DEV598_BILANS_ + '/records?filter=' + encodeURIComponent(JSON.stringify({ Contrat: [Number(contratId)] }))).records || []; } catch (e) { return []; } }
function EUC_DEV598_journal_(f, texte) { return (EUC_DEV598_t_(f.Journal) + '\n' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' — ' + texte).trim().slice(-6000); }

/* Contrat, apprenti, classe et tuteur du contrat. */
function EUC_DEV598_contexte_(contratId) {
  var r = EUC_ENT_grist('get', '/tables/EUC_APPRENTISSAGE_PFMP/records?filter=' + encodeURIComponent(JSON.stringify({ id: [Number(contratId)] }))).records || [];
  if (!r.length) throw new Error('Contrat introuvable.');
  var f = r[0].fields || {}, eid = typeof EUC_SUIVI2_ref_ === 'function' ? EUC_SUIVI2_ref_(f.Eleve) : Number(f.Eleve), aujourdhui = EUC_SUIVI2_aujourdhui_();
  var annee = EUC_SUIVI2_anneeCourante_(aujourdhui), m = EUC_SUIVI2_modele_(annee), el = null;
  (m.classes || []).forEach(function(c) { (c.eleves || []).forEach(function(e) { if (Number(e.id) === eid) el = { nom: e.libelle, classe: c.nom }; }); });
  var ref = EUC_DEV597_lire_(EUC_DEV597_REFERENTS_).map(function(x) { return x.fields || {}; }).filter(function(x) { return Number(x.Eleve) === eid && x.Actif !== false && EUC_DEV598_t_(x.Annee_scolaire) === annee; }).pop();
  return { contratId: Number(contratId), eleveId: eid, annee: annee, apprenti: el ? el.nom : 'Apprenti', classe: el ? el.classe : '',
    entreprise: EUC_DEV598_t_(f.Nom_entreprise || f.Raison_sociale || f.Entreprise || f.Nom_commercial),
    adresse: [EUC_DEV598_t_(f.Adresse_entreprise || f.Adresse), [EUC_DEV598_t_(f.Code_postal || f.CP), EUC_DEV598_t_(f.Ville || f.Commune)].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    debut: EUC_SUIVI2_date_(f.Date_debut || f.Date_contrat_officielle || f.Date_contrat),
    tuteur: { nom: EUC_DEV598_t_(f.Tuteur_nom || f.Tuteur), prenom: EUC_DEV598_t_(f.Tuteur_prenom), fonction: EUC_DEV598_t_(f.Tuteur_fonction) },
    referent: ref ? EUC_DEV598_t_(ref.Professeur_nom) : '' };
}
function EUC_DEV598_vue_(r) {
  var f = r.fields || {}, contenu = {}; try { contenu = JSON.parse(f.Contenu || '{}'); } catch (e) {}
  var s = EUC_DEV598_resume_(r);
  s.type = EUC_DEV598_t_(f.Type); s.contenu = contenu; s.empreinte = EUC_DEV598_t_(f.Empreinte);
  s.signataireFonction = s.statut === 'VALIDE' ? EUC_DEV598_t_(f.Signataire_fonction) : ''; s.valideVia = s.statut === 'VALIDE' ? EUC_DEV598_t_(f.Valide_via) : '';
  s.signature = s.statut === 'VALIDE' ? EUC_DEV598_t_(f.Signature) : ''; s.lienTuteur = s.statut === 'VALIDE' ? '' : EUC_DEV598_lienTuteur_(r.id); s.lienEnvoyeA = EUC_DEV598_t_(f.Lien_envoye_a); s.annuleeLe = EUC_DEV598_t_(f.Validation_annulee_le);
  return s;
}

/* ---------- Page du professeur ---------- */
function EUC_DEV598_ouvrir(q) {
  var contratId = EUC_DEV598_lireJetonProf_(q && q.t);
  EUC_DEV598_tables_();
  var ctx = EUC_DEV598_contexte_(contratId);
  ctx.modele = EUC_DEV598_modele_(ctx.classe, EUC_DEV597_lire_(EUC_DEV598_ACTIVITES_));
  ctx.bilans = EUC_DEV598_bilansContrat_(contratId).map(EUC_DEV598_vue_).sort(function(a, b) { return b.date.localeCompare(a.date) || b.id - a.id; });
  ctx.aujourdhui = EUC_SUIVI2_aujourdhui_(); ctx.ok = true;
  return ctx;
}

function EUC_DEV598_enregistrer(q) {
  q = q || {}; var contratId = EUC_DEV598_lireJetonProf_(q.t);
  EUC_DEV598_tables_();
  var ctx = EUC_DEV598_contexte_(contratId), modele = EUC_DEV598_modele_(ctx.classe, EUC_DEV597_lire_(EUC_DEV598_ACTIVITES_));
  var b = EUC_DEV598_nettoyer_(q, modele), emp = EUC_DEV598_empreinte_(b), maintenant = new Date().toISOString();
  var champs = { Date_entretien: b.date, Modalite: b.modalite, Type: b.type, Professeur_nom: b.professeur, Contenu: JSON.stringify(b.contenu), Bilan: b.bilan, Empreinte: emp, Date_modification: maintenant };
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  var id;
  try {
    if (Number(q.bilanId)) {
      var ex = EUC_DEV598_bilan_(q.bilanId), ef = ex.fields || {};
      if (Number(ef.Contrat) !== contratId) throw new Error('Ce bilan ne correspond pas à ce contrat.');
      id = Number(ex.id);
      if (EUC_DEV598_t_(ef.Empreinte) === emp) return { ok: true, bilanId: id, inchange: true, bilan: EUC_DEV598_vue_(ex), lienTuteur: EUC_DEV598_lienTuteur_(id) };
      if (EUC_DEV598_t_(ef.Statut) === 'VALIDE') { champs.Statut = 'A_VALIDER'; champs.Validation_annulee_le = maintenant; champs.Journal = EUC_DEV598_journal_(ef, 'bilan modifié après validation par ' + EUC_DEV598_t_(ef.Signataire_prenom) + ' ' + EUC_DEV598_t_(ef.Signataire_nom) + ' : validation annulée'); }
      else champs.Journal = EUC_DEV598_journal_(ef, 'bilan modifié');
      EUC_ENT_grist('patch', '/tables/' + EUC_DEV598_BILANS_ + '/records', { records: [{ id: id, fields: champs }] });
    } else {
      champs.Contrat = contratId; champs.Eleve = ctx.eleveId; champs.Annee_scolaire = ctx.annee; champs.Classe = ctx.classe; champs.Entreprise = ctx.entreprise;
      champs.Statut = 'A_VALIDER'; champs.Auteur = 'lien du professeur'; champs.Date_saisie = maintenant; champs.Journal = EUC_DEV598_journal_({}, 'bilan créé par ' + b.professeur);
      id = Number((EUC_ENT_grist('post', '/tables/' + EUC_DEV598_BILANS_ + '/records', { records: [{ fields: champs }] }).records || [{}])[0].id);
    }
  } finally { lock.releaseLock(); }
  return { ok: true, bilanId: id, empreinte: emp, annulee: champs.Statut === 'A_VALIDER' && !!champs.Validation_annulee_le, bilan: EUC_DEV598_vue_(EUC_DEV598_bilan_(id)), lienTuteur: EUC_DEV598_lienTuteur_(id) };
}

/* Entretien téléphonique : lien de validation envoyé au courriel dicté par le tuteur. */
function EUC_DEV598_envoyerLien(q) {
  q = q || {}; var contratId = EUC_DEV598_lireJetonProf_(q.t), email = EUC_DEV598_t_(q.email).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) throw new Error('Adresse courriel invalide.');
  var r = EUC_DEV598_bilan_(q.bilanId), f = r.fields || {};
  if (Number(f.Contrat) !== contratId) throw new Error('Ce bilan ne correspond pas à ce contrat.');
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Quota de courriels du jour atteint. Réessayez demain ou faites scanner le QR code.');
  var ctx = EUC_DEV598_contexte_(contratId), lien = EUC_DEV598_lienTuteur_(r.id) + '&via=lien';
  MailApp.sendEmail({ to: email, name: 'Lycée Les Eucalyptus — Apprentis', subject: 'Bilan de visite de ' + ctx.apprenti + ' — validation par le tuteur',
    body: ['Bonjour,', '', 'Suite à notre entretien du ' + EUC_DEV597_dfr_(EUC_DEV598_t_(f.Date_entretien)) + ' au sujet de ' + ctx.apprenti + ' (' + ctx.classe + '), vous pouvez relire le bilan et le valider en ligne :', '', lien, '',
      'Le lien est valable ' + EUC_DEV598_LIEN_JOURS_ + ' jours. Vous pourrez y indiquer vos nom, prénom et fonction, puis signer.', '', 'Bien cordialement,', EUC_DEV598_t_(f.Professeur_nom), 'Lycée Les Eucalyptus'].join('\n') });
  EUC_ENT_grist('patch', '/tables/' + EUC_DEV598_BILANS_ + '/records', { records: [{ id: Number(r.id), fields: { Lien_envoye_a: email, Lien_envoye_le: new Date().toISOString(), Journal: EUC_DEV598_journal_(f, 'lien de validation envoyé à ' + email) } }] });
  return { ok: true, email: email };
}

/* ---------- Page du tuteur ---------- */
function EUC_DEV598_lireValidation(q) {
  var id = EUC_DEV598_lireJetonTuteur_(q && q.s, EUC_SUIVI2_aujourdhui_());
  var r = EUC_DEV598_bilan_(id), f = r.fields || {}, ctx = EUC_DEV598_contexte_(Number(f.Contrat));
  var v = EUC_DEV598_vue_(r);
  return { ok: true, apprenti: ctx.apprenti, classe: ctx.classe, entreprise: ctx.entreprise, tuteur: ctx.tuteur, modele: EUC_DEV598_modele_(ctx.classe, EUC_DEV597_lire_(EUC_DEV598_ACTIVITES_)),
    bilan: { date: v.date, modalite: v.modalite, type: v.type, professeur: v.professeur, contenu: v.contenu, bilan: v.bilan, empreinte: v.empreinte, statut: v.statut, signataire: v.signataire, signeLe: v.signeLe } };
}

function EUC_DEV598_valider(q) {
  q = q || {}; var id = EUC_DEV598_lireJetonTuteur_(q.s, EUC_SUIVI2_aujourdhui_());
  var sig = { nom: EUC_DEV598_t_(q.nom).slice(0, 80), prenom: EUC_DEV598_t_(q.prenom).slice(0, 80), fonction: EUC_DEV598_t_(q.fonction).slice(0, 120), telephone: EUC_DEV598_t_(q.telephone).slice(0, 30), email: EUC_DEV598_t_(q.email).toLowerCase().slice(0, 120) };
  if (!sig.nom || !sig.prenom) throw new Error('Indiquez votre nom et votre prénom.');
  if (!sig.email && !sig.telephone) throw new Error('Indiquez un téléphone ou un courriel.');
  if (sig.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(sig.email)) throw new Error('Adresse courriel invalide.');
  if (sig.telephone && EUC_DEV598_normContact_(sig.telephone).length < 9) throw new Error('Numéro de téléphone invalide.');
  var image = EUC_DEV598_t_(q.signature);
  if (!/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(image) || image.length < 400) throw new Error('Signez dans le cadre avant de valider.');
  if (image.length > 90000) throw new Error('Signature trop volumineuse : effacez et signez de nouveau.');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  var r, f, ctx, vig, maintenant = new Date().toISOString();
  try {
    r = EUC_DEV598_bilan_(id); f = r.fields || {};
    if (EUC_DEV598_t_(f.Empreinte) !== EUC_DEV598_t_(q.empreinte)) throw new Error('Le bilan a été modifié pendant votre lecture. Rechargez la page pour relire la nouvelle version.');
    if (EUC_DEV598_t_(f.Statut) === 'VALIDE' && EUC_DEV598_t_(f.Empreinte_validee) === EUC_DEV598_t_(f.Empreinte)) throw new Error('Ce bilan est déjà validé.');
    ctx = EUC_DEV598_contexte_(Number(f.Contrat));
    var autres = EUC_DEV597_lire_(EUC_DEV598_BILANS_).filter(function(x) { return Number(x.id) !== Number(id) && EUC_DEV598_t_((x.fields || {}).Statut) === 'VALIDE'; }).map(function(x) { var g = x.fields || {}; return { entreprise: g.Entreprise, email: g.Signataire_email, telephone: g.Signataire_telephone }; });
    var profs = EUC_DEV597_lire_('EUC_PROFESSEURS_PFMP').map(function(p) { var g = p.fields || {}; return { email: g.Email, telephone: g.Telephone || g.Portable }; });
    vig = EUC_DEV598_vigilance_(sig, { nom: [ctx.tuteur.prenom, ctx.tuteur.nom].filter(Boolean).join(' ') }, ctx.entreprise, autres, profs);
    var via = EUC_DEV598_t_(f.Lien_envoye_a) && q.via === 'LIEN' ? 'LIEN' : (EUC_DEV598_t_(f.Modalite) === 'VISIO' ? 'QR_VISIO' : 'QR_SUR_PLACE');
    EUC_ENT_grist('patch', '/tables/' + EUC_DEV598_BILANS_ + '/records', { records: [{ id: Number(id), fields: {
      Signataire_nom: sig.nom, Signataire_prenom: sig.prenom, Signataire_fonction: sig.fonction, Signataire_telephone: sig.telephone, Signataire_email: sig.email,
      Signature: image, Valide_le: maintenant, Valide_via: via, Empreinte_validee: EUC_DEV598_t_(f.Empreinte), Statut: 'VALIDE', Vigilance: vig.join(','),
      Journal: EUC_DEV598_journal_(f, 'validé par ' + sig.prenom + ' ' + sig.nom + (sig.fonction ? ' (' + sig.fonction + ')' : '') + ' — ' + [sig.telephone, sig.email].filter(Boolean).join(' · ') + ' — ' + via + (vig.length ? ' — vigilance : ' + vig.join(', ') : '')) } }] });
  } finally { lock.releaseLock(); }
  var accuse = EUC_DEV598_accuse_(r, f, ctx, sig, vig, maintenant);
  return { ok: true, accuse: accuse };
}

/* Accusé de réception au signataire (s'il a donné un courriel), copie à l'administration. */
/* DEV605 : copies selon la page « Destinataires & envois » (rubrique cochée) ; à défaut, l'adresse
 * réglée dans l'échéancier, puis le compte qui publie l'application. */
function EUC_DEV598_copie_(colonne) {
  colonne = colonne || 'VALIDATIONS_TUTEURS';
  try {
    if (typeof EUC_V158_TABLE_ !== 'undefined' && typeof EUC_IMPORT_lireRecords_ === 'function') {
      var vus = {}, l = EUC_IMPORT_lireRecords_(EUC_V158_TABLE_).filter(function(r) { return r.Actif !== false && (r[colonne] === true || /^(1|true|oui)$/i.test(String(r[colonne] || ''))); })
        .map(function(r) { return EUC_DEV598_t_(r.Email).toLowerCase(); }).filter(function(m) { if (!/^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$/.test(m) || vus[m]) return false; vus[m] = 1; return true; });
      if (l.length) return l.join(',');
    }
  } catch (e) {}
  var c = ''; try { c = PropertiesService.getScriptProperties().getProperty(EUC_DEV598_COPIE_PROP_) || ''; } catch (e) {}
  if (!c) try { c = Session.getEffectiveUser().getEmail() || ''; } catch (e) {}
  return c;
}
function EUC_DEV598_messageAccuse_(ctx, sig, f, vig, quand) {
  var heure = quand.slice(11, 16), corps = ['Bonjour ' + sig.prenom + ' ' + sig.nom + ',', '',
    'Vous avez validé le ' + EUC_DEV597_dfr_(quand.slice(0, 10)) + ' (heure UTC ' + heure + ') le bilan de visite de ' + ctx.apprenti + ' (' + ctx.classe + ') pour l’entreprise ' + ctx.entreprise + '.',
    'Entretien du ' + EUC_DEV597_dfr_(EUC_DEV598_t_(f.Date_entretien)) + ' avec ' + EUC_DEV598_t_(f.Professeur_nom) + '.',
    'Identité indiquée : ' + sig.prenom + ' ' + sig.nom + (sig.fonction ? ', ' + sig.fonction : '') + (sig.telephone ? ' — téléphone ' + sig.telephone : '') + '.', '',
    'Si vous n’êtes pas à l’origine de cette validation, répondez simplement à ce courriel : le bureau des entreprises du lycée sera prévenu.', '', 'Merci pour votre accompagnement.', 'Lycée Les Eucalyptus — Apprentis'];
  var admin = ['Validation tuteur — ' + ctx.apprenti + ' (' + ctx.classe + ')', '', 'Entreprise : ' + ctx.entreprise,
    'Tuteur du contrat : ' + ([ctx.tuteur.prenom, ctx.tuteur.nom].filter(Boolean).join(' ') || 'non renseigné'),
    'Signataire : ' + sig.prenom + ' ' + sig.nom + (sig.fonction ? ' — ' + sig.fonction : ''),
    'Téléphone donné : ' + (sig.telephone || '—'), 'Courriel donné : ' + (sig.email || '— (aucun accusé envoyé au signataire)'),
    'Professeur : ' + EUC_DEV598_t_(f.Professeur_nom) + ' — entretien du ' + EUC_DEV597_dfr_(EUC_DEV598_t_(f.Date_entretien)),
    'Vigilance : ' + (vig.length ? vig.map(function(k) { return EUC_DEV598_LIB_VIGILANCE_[k] || k; }).join(' ; ') : 'aucune')];
  return { sujet: 'Bilan de visite validé — ' + ctx.apprenti, corps: corps.join('\n'), sujetAdmin: (vig.length ? '[Vigilance] ' : '') + 'Bilan de visite validé — ' + ctx.apprenti + ' — ' + ctx.entreprise, corpsAdmin: admin.join('\n') };
}
function EUC_DEV598_accuse_(r, f, ctx, sig, vig, quand) {
  var m = EUC_DEV598_messageAccuse_(ctx, sig, f, vig, quand), copie = EUC_DEV598_copie_(), envoye = false;
  try {
    /* Copie visible : l'administration voit l'adresse réellement utilisée par le signataire. */
    if (sig.email) { MailApp.sendEmail({ to: sig.email, cc: copie || undefined, replyTo: copie || undefined, name: 'Lycée Les Eucalyptus — Apprentis', subject: m.sujet, body: m.corps }); envoye = true; }
    /* Sans courriel du signataire, ou avec un signal de vigilance : message détaillé à l'administration seule. */
    if (copie && (!sig.email || vig.length)) MailApp.sendEmail({ to: copie, name: 'Lycée Les Eucalyptus — Apprentis', subject: m.sujetAdmin, body: m.corpsAdmin });
    if (envoye) EUC_ENT_grist('patch', '/tables/' + EUC_DEV598_BILANS_ + '/records', { records: [{ id: Number(r.id), fields: { Accuse_envoye_le: new Date().toISOString() } }] });
  } catch (e) { console.log('DEV598 accusé non envoyé : ' + (e && e.message || e)); }
  return envoye ? sig.email : '';
}

/* ---------- Échéancier : résumé des bilans, liens des professeurs, réglage de la copie ---------- */
function EUC_DEV598_parContrat_() {
  var out = {}; EUC_DEV597_lire_(EUC_DEV598_BILANS_).forEach(function(r) { var k = Number((r.fields || {}).Contrat); (out[k] = out[k] || []).push(EUC_DEV598_resume_(r)); });
  Object.keys(out).forEach(function(k) { out[k].sort(function(a, b) { return b.date.localeCompare(a.date) || b.id - a.id; }); });
  return out;
}
/* Les bilans comptent comme contacts d'entrée pour l'échéancier. */
function EUC_DEV598_commeContacts_(bilans) {
  return (bilans || []).map(function(r) { var f = r.fields || {}; return { fields: { Contrat: f.Contrat, Date_contact: f.Date_entretien, Mode: EUC_DEV598_MODALITES_[EUC_DEV598_t_(f.Modalite)] || 'APPEL', Professeur_nom: f.Professeur_nom, Compte_rendu: 'Bilan de visite en ligne' + (EUC_DEV598_t_(f.Statut) === 'VALIDE' ? ' — validé par le tuteur' : ' — en attente de validation du tuteur') } }; });
}
function EUC_DEV598_reglerCopie(q) {
  EUC_SUIVI2_exigerAdmin_(); var u = EUC_DEV598_t_(q && q.email).toLowerCase();
  if (u && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(u)) throw new Error('Adresse courriel invalide.');
  PropertiesService.getScriptProperties().setProperty(EUC_DEV598_COPIE_PROP_, u); return { ok: true, email: u };
}

/* ---------- Pages ---------- */
function EUC_DEV598_afficherFiche(e) {
  var t = HtmlService.createTemplateFromFile('Bilan_Visite_DEV598');
  t.jeton = EUC_DEV598_t_(e && e.parameter && e.parameter.t);
  return t.evaluate().setTitle('Bilan de visite en entreprise').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV598_afficherValidation(e) {
  var t = HtmlService.createTemplateFromFile('Validation_Bilan_DEV598');
  t.jeton = EUC_DEV598_t_(e && e.parameter && e.parameter.s);
  t.via = EUC_DEV598_t_(e && e.parameter && e.parameter.via).toLowerCase();
  return t.evaluate().setTitle('Validation du bilan de visite').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
