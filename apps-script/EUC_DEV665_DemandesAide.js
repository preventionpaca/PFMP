/**
 * DEV665 — « Soumissions à traiter (bureau G205) » : tous les dépôts du formulaire en ligne en attente,
 * France ou Monaco, vérifiés ou non (demandes d'aide comprises).
 *
 * Pour chaque dépôt, le bureau peut :
 *   - corriger le SIRET (France) : vérifié dans la base ou l'annuaire officiel, coordonnées officielles reprises ;
 *   - saisir ou corriger le NIS (Monaco) avec nom et adresse ;
 *   - valider : la convention est créée par l'import éprouvé de « Soumissions reçues » (EUC_DEV466_importSelection),
 *     sous le numéro déjà donné à l'élève, qui est prévenu par courriel ;
 *   - classer « sans suite » (doublon, abandon) : la ligne est marquée REJETEE, jamais supprimée.
 * Aucune donnée n'est effacée ; chaque écriture vise une seule ligne de la table d'attente.
 */
var EUC_DEV665_PAGE_ = 'soumissions-a-traiter-pfmp';
var EUC_DEV665_CLOSES_ = ['VALIDEE', 'REJETEE', 'REFUSEE', 'ESSAI'];

function EUC_DEV665_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
/* NIS de Monaco : 4 chiffres, 1 lettre, 5 chiffres (ex. 7112B19343) ; numéro interne du lycée : EUC-MC-0001. */
function EUC_DEV665_nis_(v) { return EUC_DEV665_t_(v).toUpperCase().replace(/[\s.-]+/g, ''); }
function EUC_DEV665_nisValide_(v) { var n = EUC_DEV665_nis_(v); return /^\d{4}[A-Z]\d{5}$/.test(n) || /^EUCMC\d{4,}$/.test(n); }

/* Ligne d'attente prête à importer avec un NIS de Monaco (calcul pur) : NIS normalisé, sinon ''. */
function EUC_DEV665_nisPret_(row) {
  row = row || {}; var T = EUC_DEV665_t_, nis = EUC_DEV665_nis_(row.NIS_normalise);
  return T(row.SIRET_statut).toUpperCase() === 'NIS_MONACO' && EUC_DEV665_nisValide_(nis) && T(row.Raison_sociale_officielle) && T(row.Adresse_officielle) ? nis : '';
}
/* Champs entreprise d'une convention de Monaco (calcul pur), comme le cadre Monaco de « Soumissions reçues ». */
function EUC_DEV665_champsMonaco_(row) {
  row = row || {}; var T = EUC_DEV665_t_;
  return { Entreprise_siret: '', Entreprise_nis: T(row.NIS_brut) || EUC_DEV665_nis_(row.NIS_normalise), Entreprise_identifiant_type: 'NIS', Entreprise_validation_statut: 'A_VALIDER',
    Entreprise_raison_sociale: T(row.Raison_sociale_officielle), Entreprise_enseigne: T(row.Nom_commercial) !== T(row.Raison_sociale_officielle) ? T(row.Nom_commercial) : '',
    Entreprise_adresse: T(row.Adresse_officielle), Entreprise_code_postal: T(row.CP_officiel) || '98000', Entreprise_commune: T(row.Ville_officielle) || 'Monaco', Entreprise_pays: 'MONACO' };
}
/* Ligne d'attente → vue du panneau (calcul pur). */
function EUC_DEV665_vue_(r) {
  var f = r.fields || r, T = EUC_DEV665_t_;
  var monaco = /^(MC|MONACO)$/i.test(T(f.Pays_officiel)) || T(f.Entreprise_identifiant_type).toUpperCase() === 'NIS';
  var statut = T(f.SIRET_statut).toUpperCase();
  var pret = monaco ? !!EUC_DEV665_nisPret_(f) : statut === 'VERIFIE' && T(f.SIRET_normalise).replace(/\D/g, '').length === 14;
  return {
    id: Number(r.id) || 0, numero: T(f.Submission_ID).replace(/^SECOURS-/, ''), eleveId: Number(f.Eleve_match_id) || 0,
    eleve: T(f.Eleve_match_libelle) || [T(f.Prenom_eleve), T(f.Nom_eleve)].filter(Boolean).join(' '), classe: T(f.Classe_match_libelle || f.Classe_saisie),
    periode: T(f.Periode_numero), debut: T(f.Date_debut_brut), fin: T(f.Date_fin_brut), depose: T(f.Date_import).slice(0, 10), email: T(f.Email_eleve),
    pays: monaco ? 'MC' : T(f.Pays_officiel) && !/^FR$/i.test(T(f.Pays_officiel)) ? 'AUTRE' : 'FR', paysNom: T(f.Pays_officiel),
    numeroSaisi: T(f.NIS_normalise || f.NIS_brut || f.SIRET_normalise || f.SIRET_brut), statut: statut || 'A_CONTROLER', pret: pret, aide: T(f.Niveau_controle).toUpperCase() === 'ROUGE',
    saisie: { nom: T(f.Entreprise_saisie), adresse: T(f.Adresse_entreprise), cp: T(f.CP_entreprise), ville: T(f.Ville_entreprise) },
    officiel: { nom: T(f.Raison_sociale_officielle), enseigne: T(f.Nom_commercial), adresse: T(f.Adresse_officielle), cp: T(f.CP_officiel), ville: T(f.Ville_officielle) },
    contact: { nom: T(f.Nom_responsable), tel: T(f.Telephone_entreprise), mail: T(f.Email_entreprise) }, tuteur: { nom: T(f.Nom_tuteur), tel: T(f.Telephone_tuteur), mail: T(f.Email_tuteur) },
    lieu: [T(f.Lieu_stage_adresse), [T(f.Lieu_stage_code_postal), T(f.Lieu_stage_commune)].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    alertes: T(f.Alertes), decision: T(f.Decision).toUpperCase()
  };
}
/* Dépôts en attente (calcul pur) : formulaire en ligne seulement, les plus récents d'abord ; doublons repérés
 * (même élève, même période : seule la plus récente n'est pas marquée). */
function EUC_DEV665_enAttente_(records) {
  var l = (records || []).filter(function(r) { var f = r.fields || {}; return /^SECOURS-/.test(EUC_DEV665_t_(f.Submission_ID)) && EUC_DEV665_CLOSES_.indexOf(EUC_DEV665_t_(f.Decision).toUpperCase()) < 0; })
    .map(EUC_DEV665_vue_).sort(function(a, b) { return b.id - a.id; });
  var vus = {};
  l.forEach(function(x) { var k = x.eleveId + '|' + x.periode; x.doublonDe = vus[k] || ''; if (!vus[k]) vus[k] = x.numero; });
  return l;
}

function EUC_DEV665_lignes_() { return EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/records').records || []; }
function EUC_DEV665_ligne_(id) {
  var r = (EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/records?filter=' + encodeURIComponent(JSON.stringify({ id: [Number(id)] }))).records || [])[0];
  if (!r || !/^SECOURS-/.test(EUC_DEV665_t_((r.fields || {}).Submission_ID))) throw new Error('Dépôt introuvable : actualisez la liste.');
  if (EUC_DEV665_CLOSES_.indexOf(EUC_DEV665_t_(r.fields.Decision).toUpperCase()) >= 0) throw new Error('Ce dépôt est déjà traité (' + r.fields.Decision + ') : actualisez la liste.');
  return r;
}
/* Écriture d'une seule ligne, limitée aux colonnes existantes de la table d'attente ; les colonnes du NIS
 * de Monaco sont créées au besoin (sans elles, le NIS serait perdu). */
var EUC_DEV665_COLONNES_NIS_ = [['Entreprise_identifiant_type', 'Type d’identifiant entreprise'], ['NIS_brut', 'NIS saisi'], ['NIS_normalise', 'NIS normalisé'], ['NIS_statut', 'Statut du NIS']];
function EUC_DEV665_patch_(id, champs) {
  var cols = {}; (EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/columns').columns || []).forEach(function(c) { cols[c.id] = true; });
  var manque = EUC_DEV665_COLONNES_NIS_.filter(function(c) { return !cols[c[0]] && Object.prototype.hasOwnProperty.call(champs, c[0]) && champs[c[0]] !== ''; });
  if (manque.length) {
    EUC_ENT_grist('post', '/tables/' + EUC_V160_TABLE_ + '/columns', { columns: manque.map(function(c) { return { id: c[0], fields: { label: c[1], type: 'Text' } }; }) });
    manque.forEach(function(c) { cols[c[0]] = true; });
  }
  var f = {}; Object.keys(champs).forEach(function(k) { if (cols[k]) f[k] = champs[k]; });
  EUC_ENT_grist('patch', '/tables/' + EUC_V160_TABLE_ + '/records', { records: [{ id: Number(id), fields: f }] });
  return f;
}
function EUC_DEV665_trace_(ancien, texte) { return [EUC_DEV665_t_(ancien), texte + ' (' + Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm') + ')'].filter(Boolean).join(' — '); }

function EUC_DEV665_afficher(e) {
  EUC_IMPORT_exigerAdminTexte_();
  var t = HtmlService.createTemplateFromFile('Soumissions_A_Traiter_DEV665');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  return t.evaluate().setTitle('Soumissions à traiter — PFMP').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function EUC_DEV665_lister() {
  EUC_IMPORT_exigerAdminTexte_();
  return { soumissions: EUC_DEV665_enAttente_(EUC_DEV665_lignes_()) };
}

/* France : SIRET corrigé par le bureau, vérifié côté serveur (base Grist ou annuaire officiel relu). */
function EUC_DEV665_verifierSiret(q) {
  EUC_IMPORT_exigerAdminTexte_();
  q = q || {};
  var r = EUC_DEV665_ligne_(q.id), siret = EUC_DEV665_t_(q.siret).replace(/\D/g, ''), v = EUC_ENT_validerSiret(siret);
  if (!v.valide) throw new Error(v.message);
  var trouve = EUC_ENT_rechercherSiret(siret), e = trouve.entreprise;
  if (!e && trouve.source === 'api_navigateur') {
    if (!q.reponseApi) return { aVerifierNavigateur: true, url: trouve.url };
    e = (EUC_ENT_traiterReponseApiNavigateur(q.reponseApi, siret) || {}).entreprise;
  }
  if (!e) throw new Error('Aucune entreprise trouvée pour ce SIRET : vérifiez les 14 chiffres.');
  if (e.nonDiffusible === true && !EUC_DEV665_t_(e.raisonSociale)) throw new Error('Entreprise non diffusible : nom et adresse absents de l’annuaire. Utilisez « Accès INPI » pour les lire, puis l’import.');
  var f = r.fields || {}, actif = e.etat !== 'Fermé';
  var champs = {
    SIRET_brut: siret, SIRET_normalise: siret, SIRET_statut: 'VERIFIE', SIRET_source: 'Bureau G205 (correction manuelle)',
    Entreprise_identifiant_type: '', NIS_normalise: '', NIS_brut: '', NIS_statut: '',
    Raison_sociale_officielle: EUC_DEV665_t_(e.raisonSociale), Nom_commercial: EUC_DEV665_t_(e.enseigne || f.Entreprise_saisie || e.raisonSociale),
    Adresse_officielle: EUC_DEV665_t_(e.adresseComplete || e.numeroVoie || e.adresse), Complement_adresse_officielle: EUC_DEV665_t_(e.complementAdresse || e.complement),
    CP_officiel: EUC_DEV665_t_(e.codePostal), Ville_officielle: EUC_DEV665_t_(e.commune), Pays_officiel: 'FR',
    Niveau_controle: actif ? 'VERT' : 'ORANGE', Decision: actif ? 'A_VALIDER' : 'A_CONTROLER',
    Alertes: EUC_DEV665_trace_(f.Alertes, 'SIRET corrigé par le bureau : ' + siret + (actif ? '' : ' — établissement fermé selon l’INSEE'))
  };
  EUC_DEV665_patch_(r.id, champs);
  return { ok: true, soumission: EUC_DEV665_vue_({ id: r.id, fields: Object.assign({}, f, champs) }), ferme: !actif };
}

/* Monaco : NIS (ou numéro interne) saisi ou corrigé par le bureau, avec nom et adresse. */
function EUC_DEV665_enregistrerMonaco(q) {
  EUC_IMPORT_exigerAdminTexte_();
  q = q || {};
  var r = EUC_DEV665_ligne_(q.id), nis = EUC_DEV665_nis_(q.nis), nom = EUC_DEV665_t_(q.nom).slice(0, 250), adresse = EUC_DEV665_t_(q.adresse).slice(0, 300);
  var cp = EUC_DEV665_t_(q.cp) || '98000', ville = EUC_DEV665_t_(q.ville) || 'Monaco';
  if (!EUC_DEV665_nisValide_(nis)) throw new Error('NIS invalide : 4 chiffres, une lettre, 5 chiffres (ex. 7112B19343), ou numéro interne EUC-MC-0001.');
  if (!nom || !adresse) throw new Error('Indiquez le nom et l’adresse de l’entreprise.');
  if (/^EUCMC/.test(nis)) nis = nis.replace(/^EUCMC/, 'EUC-MC-');
  var f = r.fields || {};
  var champs = {
    Entreprise_identifiant_type: 'NIS', NIS_brut: nis, NIS_normalise: nis.replace(/[\s-]+/g, ''), NIS_statut: 'VALIDE_MANUEL',
    SIRET_brut: '', SIRET_normalise: '', SIRET_statut: 'NIS_MONACO', SIRET_source: 'Bureau G205 (NIS Monaco)',
    Raison_sociale_officielle: nom, Nom_commercial: EUC_DEV665_t_(q.enseigne) || nom, Adresse_officielle: adresse, Complement_adresse_officielle: '', CP_officiel: cp, Ville_officielle: ville, Pays_officiel: 'MC',
    Niveau_controle: 'VERT', Decision: 'A_VALIDER', Alertes: EUC_DEV665_trace_(f.Alertes, 'NIS saisi par le bureau : ' + nis)
  };
  EUC_DEV665_patch_(r.id, champs);
  return { ok: true, soumission: EUC_DEV665_vue_({ id: r.id, fields: Object.assign({}, f, champs) }) };
}

/* Validation : même import que « Soumissions reçues » (conventions relues dans Grist, suivi publié), une seule ligne. */
function EUC_DEV665_valider(q) {
  EUC_IMPORT_exigerAdminTexte_();
  q = q || {};
  var r = EUC_DEV665_ligne_(q.id), v = EUC_DEV665_vue_(r);
  if (!v.pret) throw new Error(v.pays === 'MC' ? 'Enregistrez d’abord le NIS, le nom et l’adresse de l’entreprise.' : 'Vérifiez d’abord le SIRET de l’entreprise.');
  if (v.pays === 'MC') try { if (typeof EUC_CONVENTION_assurerColonnesEntrepriseV117_ === 'function') EUC_CONVENTION_assurerColonnesEntrepriseV117_(); } catch (eCol) {}
  var res = EUC_DEV466_importSelection({ ids: [v.id], manualSelection: true }) || {}, b = res.validationBilan || {};
  var base = v.pays === 'MC' ? EUC_DEV665_ajouterBaseMonaco_(r.fields || {}) : '';
  return { ok: true, numero: v.numero, eleve: v.eleve, creees: b.creees || 0, completees: b.completees || 0, dejaExistantes: b.dejaExistantes || 0, avertissements: (b.erreurs || []).length, baseMonaco: base };
}
/* Entreprise de Monaco ajoutée à la base des entreprises (book, cartes, recherche par nom du QR code) si son NIS n'y est pas.
 * Jamais bloquant : la convention est déjà créée. */
function EUC_DEV665_ajouterBaseMonaco_(f) {
  try {
    var nis = EUC_DEV665_nis_(f.NIS_normalise), rows = EUC_IMPORT_lireRecords_(EUC_DEV646_table_());
    if (rows.some(function(x) { return EUC_DEV665_nis_(x.NIS) === nis; })) return 'déjà dans la base des entreprises';
    EUC_DEV646_creerMonaco({ nom: f.Raison_sociale_officielle, enseigne: f.Nom_commercial !== f.Raison_sociale_officielle ? f.Nom_commercial : '', nis: f.NIS_brut || nis, adresse: f.Adresse_officielle, cp: f.CP_officiel, ville: f.Ville_officielle, telephone: f.Telephone_entreprise, email: f.Email_entreprise });
    return 'ajoutée à la base des entreprises';
  } catch (e) { return 'non ajoutée à la base des entreprises : ' + EUC_DEV665_t_(e && e.message || e); }
}

/* Sans suite (doublon, abandon) : la ligne reste dans la table, marquée REJETEE avec son motif. */
/* Recherche par nom dans les entreprises de Monaco de la base (même recherche que le QR code). */
function EUC_DEV665_chercherMonaco(q) {
  EUC_IMPORT_exigerAdminTexte_();
  return EUC_DEV646_rechercherMonacoParNom(EUC_DEV665_t_(q && q.nom));
}
function EUC_DEV665_sansSuite(q) {
  var ctx = EUC_IMPORT_exigerAdminTexte_() || {};
  q = q || {};
  var r = EUC_DEV665_ligne_(q.id), motif = EUC_DEV665_t_(q.motif).slice(0, 300) || 'sans suite';
  EUC_DEV665_patch_(r.id, { Decision: 'REJETEE', Date_validation: new Date().toISOString(), Valide_par: EUC_DEV665_t_(ctx.email), Alertes: EUC_DEV665_trace_((r.fields || {}).Alertes, 'Classé sans suite par le bureau : ' + motif) });
  return { ok: true, id: Number(r.id) };
}
