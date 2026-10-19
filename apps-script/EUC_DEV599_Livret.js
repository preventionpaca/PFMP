/**
 * DEV599 — Livret numérique de l'apprenti.
 *
 * L'apprenti est le seul à écrire : une fiche par séquence d'alternance (au lycée ou en entreprise,
 * du … au …), activité par activité des blocs de son diplôme (table EUC_ACTIVITES_BILAN_VISITE),
 * avec ses remarques et jusqu'à 4 photos.
 * Validation :
 *   - fiche lycée : le professeur référent reçoit un lien, relit, commente au besoin et valide ;
 *   - fiche entreprise : le tuteur scanne le QR code présenté par l'apprenti (ou reçoit le lien
 *     par courriel), indique son identité et un contact, et signe (mêmes signaux de vigilance que
 *     le bilan de visite).
 * Après validation, le compte rendu part automatiquement : apprenti, tuteur, professeur référent,
 * responsables légaux si l'apprenti est mineur, et les destinataires de la table des envois cochés
 * « Livret des apprentis » (périmètre établissement / filière / organisme de la classe).
 * Une fiche validée n'est plus modifiable.
 */
var EUC_DEV599_FICHES_ = 'EUC_LIVRET_APPRENTIS';
var EUC_DEV599_LIEN_JOURS_ = 14;
var EUC_DEV599_PHOTOS_MAX_ = 4;
var EUC_DEV599_PHOTOS_PROP_ = 'EUC_DEV599_DOSSIER_PHOTOS';

function EUC_DEV599_t_(v) { return v == null ? '' : String(v).trim(); }

/* ---------- Liens signés (secret partagé avec le bilan de visite) ---------- */
function EUC_DEV599_jetonApprenti_(eleveId) { return 'l' + Number(eleveId) + '.' + EUC_DEV598_sig_('L|' + Number(eleveId)); }
function EUC_DEV599_lireJetonApprenti_(t) {
  var m = /^l(\d+)\.([0-9a-f]{32})$/.exec(EUC_DEV599_t_(t));
  if (!m || !EUC_DEV598_egal_(m[2], EUC_DEV598_sig_('L|' + Number(m[1])))) throw new Error('Lien du livret invalide. Demandez votre lien au bureau des entreprises.');
  return Number(m[1]);
}
function EUC_DEV599_jetonValidation_(ficheId, jour) { return 'v' + Number(ficheId) + '.' + jour + '.' + EUC_DEV598_sig_('V|' + Number(ficheId) + '|' + jour); }
function EUC_DEV599_lireJetonValidation_(t, aujourdhui) {
  var m = /^v(\d+)\.(\d{8})\.([0-9a-f]{32})$/.exec(EUC_DEV599_t_(t));
  if (!m || !EUC_DEV598_egal_(m[3], EUC_DEV598_sig_('V|' + Number(m[1]) + '|' + m[2]))) throw new Error('Lien de validation invalide.');
  var emis = m[2].slice(0, 4) + '-' + m[2].slice(4, 6) + '-' + m[2].slice(6, 8);
  if (EUC_DEV597_jours_(emis, aujourdhui) > EUC_DEV599_LIEN_JOURS_) throw new Error('Ce lien de validation a expiré. Demandez à l’apprenti de vous le renvoyer.');
  return Number(m[1]);
}
function EUC_DEV599_lienApprenti_(eleveId) { return EUC_DEV598_base_() + '?page=livret-apprenti&l=' + EUC_DEV599_jetonApprenti_(eleveId); }
function EUC_DEV599_lienValidation_(ficheId) { return EUC_DEV598_base_() + '?page=validation-livret&v=' + EUC_DEV599_jetonValidation_(ficheId, EUC_SUIVI2_aujourdhui_().replace(/-/g, '')); }

/* ---------- Calculs purs ---------- */
function EUC_DEV599_nettoyer_(q, modele) {
  q = q || {}; var c = q.contenu || {}, out = { activites: {}, autres: '', ressenti: '' };
  (modele.activites || []).forEach(function(a) {
    var x = (c.activites || {})[a.id] || {}, texte = EUC_DEV599_t_(x.texte).slice(0, 2000), niv = EUC_DEV598_NIVEAUX_.indexOf(String(x.niveau)) >= 0 ? String(x.niveau) : '';
    if (texte || niv) out.activites[a.id] = { texte: texte, niveau: niv };
  });
  out.autres = EUC_DEV599_t_(c.autres).slice(0, 4000); out.ressenti = EUC_DEV599_t_(c.ressenti).slice(0, 2000);
  var f = { lieu: EUC_DEV599_t_(q.lieu).toUpperCase(), du: EUC_DEV599_t_(q.du), au: EUC_DEV599_t_(q.au), contenu: out };
  if (['LYCEE', 'ENTREPRISE'].indexOf(f.lieu) < 0) throw new Error('Choisissez : au lycée ou en entreprise.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.du) || !/^\d{4}-\d{2}-\d{2}$/.test(f.au)) throw new Error('Indiquez les dates de la séquence (du … au …).');
  if (f.au < f.du) throw new Error('La date de fin est avant la date de début.');
  return f;
}
function EUC_DEV599_vide_(f) { return !Object.keys(f.contenu.activites).length && !f.contenu.autres && !f.contenu.ressenti; }
function EUC_DEV599_empreinte_(f, photos) {
  return EUC_DEV598_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify([f.lieu, f.du, f.au, f.contenu, photos || []]), Utilities.Charset.UTF_8)).slice(0, 24);
}
/* Mineur à une date (naissance ISO). */
function EUC_DEV599_mineur_(naissance, date) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(EUC_DEV599_t_(naissance))) return false;
  var y = Number(naissance.slice(0, 4)) + 18; return (y + naissance.slice(4, 10)) > date;
}
function EUC_DEV599_mails_(liste) {
  var vus = {}, out = [];
  liste.forEach(function(m) { m = EUC_DEV599_t_(m).toLowerCase(); if (/^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$/.test(m) && !vus[m]) { vus[m] = 1; out.push(m); } });
  return out;
}
/* Destinataires de la table des envois pour une classe (calcul pur). */
function EUC_DEV599_destinatairesTable_(lignes, scope, organismes) {
  var orgs = (organismes || []).map(EUC_DEV598_nomNorm_).filter(Boolean);
  return lignes.filter(function(r) {
    if (r.Actif === false || !EUC_V158_bool_(r.LIVRET_APPRENTIS)) return false;
    var etab = EUC_DEV599_t_(r.Perimetre_etablissement).toUpperCase() || 'TOUS';
    if (etab !== 'TOUS' && etab !== scope.etablissement) return false;
    var fil = EUC_V159_parseFilieres_(r.Filieres_JSON); if (fil.length && fil.indexOf(scope.filiere) < 0) return false;
    var org = EUC_DEV598_nomNorm_(r.Organisme); if (org && orgs.indexOf(org) < 0) return false;
    return true;
  }).map(function(r) { return EUC_DEV599_t_(r.Email); });
}
/* Compte rendu texte d'une fiche validée (calcul pur). */
function EUC_DEV599_compteRendu_(ctx, modele, f, v) {
  var c = f.contenu || {}, L = [], lieu = f.lieu === 'LYCEE' ? 'au lycée' : 'en entreprise';
  L.push('Livret d’apprentissage — ' + ctx.apprenti + ' (' + ctx.classe + ')');
  L.push('Séquence ' + lieu + ' du ' + EUC_DEV597_dfr_(f.du) + ' au ' + EUC_DEV597_dfr_(f.au) + (f.lieu === 'ENTREPRISE' && ctx.entreprise ? ' — ' + ctx.entreprise : ''), '');
  var bloc = '';
  (modele.activites || []).forEach(function(a) {
    var x = (c.activites || {})[a.id]; if (!x) return;
    if (a.bloc && a.bloc !== bloc) { bloc = a.bloc; L.push(bloc); }
    L.push('• ' + a.libelle + (x.niveau ? ' [' + ({ NON_ABORDE: 'non abordé', OBSERVE: 'observé', AVEC_AIDE: 'avec aide', AUTONOME: 'autonome' })[x.niveau] + ']' : '') + (x.texte ? ' : ' + x.texte : ''));
  });
  if (c.autres) L.push('', 'Autres activités et remarques :', c.autres);
  if (c.ressenti) L.push('', 'Ce que j’en retiens :', c.ressenti);
  L.push('', 'Validé le ' + EUC_DEV597_dfr_(v.jour || v.date.slice(0, 10)) + ' par ' + v.qui + (v.fonction ? ' (' + v.fonction + ')' : '') + '.');
  if (v.commentaire) L.push('Commentaire : ' + v.commentaire);
  return L.join('\n');
}

/* ---------- Grist et contexte ---------- */
function EUC_DEV599_tables_() {
  var c = CacheService.getScriptCache(); if (c.get('EUC_DEV599_TABLES1')) return;
  var ids = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; }), col = EUC_DEV441_col_;
  if (ids.indexOf(EUC_DEV599_FICHES_) < 0) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV599_FICHES_, columns: [
    col('Eleve', 'Élève (id)', 'Int'), col('Contrat', 'Contrat (id)', 'Int'), col('Annee_scolaire', 'Année scolaire'), col('Classe', 'Classe'), col('Entreprise', 'Entreprise'),
    col('Lieu', 'Lieu (LYCEE / ENTREPRISE)'), col('Du', 'Du'), col('Au', 'Au'), col('Contenu', 'Contenu (JSON)'), col('Photos', 'Photos (Drive, JSON)'), col('Empreinte', 'Empreinte'), col('Statut', 'Statut'),
    col('Valideur_role', 'Validé par (rôle)'), col('Signataire_nom', 'Signataire — nom'), col('Signataire_prenom', 'Signataire — prénom'), col('Signataire_fonction', 'Signataire — fonction'),
    col('Signataire_telephone', 'Signataire — téléphone'), col('Signataire_email', 'Signataire — courriel'), col('Signature', 'Signature (image)'), col('Commentaire_valideur', 'Commentaire du valideur'),
    col('Valide_le', 'Validé le'), col('Valide_via', 'Validé via'), col('Empreinte_validee', 'Empreinte validée'), col('Vigilance', 'Vigilance'),
    col('Lien_envoye_a', 'Lien envoyé à'), col('Lien_envoye_le', 'Lien envoyé le'), col('Diffuse_le', 'Diffusé le'), col('Diffuse_a', 'Diffusé à'),
    col('Date_saisie', 'Créé le'), col('Date_modification', 'Modifié le'), col('Journal', 'Journal')] }] });
  /* Table des envois : colonne « Livret des apprentis » et périmètre « Organisme ». */
  try {
    if (typeof EUC_V158_assurerTable_ === 'function') EUC_V158_assurerTable_();
    var have = {}; (EUC_ENT_grist('get', '/tables/' + EUC_V158_TABLE_ + '/columns').columns || []).forEach(function(x) { have[x.id] = 1; });
    var manque = [['LIVRET_APPRENTIS', 'Livret des apprentis', 'Bool'], ['Organisme', 'Organisme (CFA, GRETA…)', 'Text']].filter(function(d) { return !have[d[0]]; }).map(function(d) { return col(d[0], d[1], d[2]); });
    if (manque.length) EUC_ENT_grist('post', '/tables/' + EUC_V158_TABLE_ + '/columns', { columns: manque });
  } catch (e) {}
  c.put('EUC_DEV599_TABLES1', '1', 21600);
}
function EUC_DEV599_lire_(table, filtre) {
  try { return EUC_ENT_grist('get', '/tables/' + table + '/records' + (filtre ? '?filter=' + encodeURIComponent(JSON.stringify(filtre)) : '')).records || []; } catch (e) { return []; }
}
function EUC_DEV599_fiche_(id) { var r = EUC_DEV599_lire_(EUC_DEV599_FICHES_, { id: [Number(id)] }); if (!r.length) throw new Error('Fiche introuvable.'); return r[0]; }

/* Apprenti, classe, contrat en cours, tuteur, référent. */
function EUC_DEV599_contexte_(eleveId) {
  var aujourdhui = EUC_SUIVI2_aujourdhui_(), annee = EUC_SUIVI2_anneeCourante_(aujourdhui), m = EUC_SUIVI2_modele_(annee), el = null, cl = null;
  (m.classes || []).forEach(function(c) { (c.eleves || []).forEach(function(e) { if (Number(e.id) === Number(eleveId)) { el = e; cl = c; } }); });
  if (!el) throw new Error('Apprenti introuvable pour l’année ' + annee + '.');
  var contrats = EUC_DEV599_lire_('EUC_APPRENTISSAGE_PFMP', { Eleve: [Number(eleveId)] }).filter(function(r) { var f = r.fields || {}; return f.Actif !== false && EUC_DEV599_t_(f.Nom_entreprise || f.Raison_sociale || f.Entreprise || f.Nom_commercial); })
    .sort(function(a, b) { return String(EUC_SUIVI2_date_((b.fields || {}).Date_debut) || '').localeCompare(String(EUC_SUIVI2_date_((a.fields || {}).Date_debut) || '')); });
  var ct = contrats[0] || null, f = ct ? ct.fields || {} : {};
  var ref = EUC_DEV597_lire_(EUC_DEV597_REFERENTS_).map(function(x) { return x.fields || {}; }).filter(function(x) { return Number(x.Eleve) === Number(eleveId) && x.Actif !== false && EUC_DEV599_t_(x.Annee_scolaire) === annee; }).pop();
  return { eleveId: Number(eleveId), annee: annee, apprenti: el.libelle, classe: cl.nom, classeId: Number(cl.id), etab: cl.etab || '', organismes: [cl.gestionnaire, cl.donneur].filter(Boolean),
    contratId: ct ? Number(ct.id) : 0, entreprise: EUC_DEV599_t_(f.Nom_entreprise || f.Raison_sociale || f.Entreprise || f.Nom_commercial),
    tuteur: { nom: EUC_DEV599_t_(f.Tuteur_nom || f.Tuteur), prenom: EUC_DEV599_t_(f.Tuteur_prenom), fonction: EUC_DEV599_t_(f.Tuteur_fonction), email: EUC_DEV599_t_(f.Tuteur_courriel) },
    referent: ref ? { id: Number(ref.Professeur) || 0, nom: EUC_DEV599_t_(ref.Professeur_nom) } : null };
}
function EUC_DEV599_photos_(f) { try { return JSON.parse(EUC_DEV599_t_(f.Photos) || '[]'); } catch (e) { return []; } }
function EUC_DEV599_vue_(r, avecLien) {
  var f = r.fields || {}, contenu = {}; try { contenu = JSON.parse(f.Contenu || '{}'); } catch (e) {}
  var valide = EUC_DEV599_t_(f.Statut) === 'VALIDE';
  return { id: Number(r.id), lieu: EUC_DEV599_t_(f.Lieu), du: EUC_DEV599_t_(f.Du), au: EUC_DEV599_t_(f.Au), contenu: contenu, photos: EUC_DEV599_photos_(f).map(function(p) { return { id: p.id, nom: p.nom }; }),
    statut: EUC_DEV599_t_(f.Statut) || 'BROUILLON', empreinte: EUC_DEV599_t_(f.Empreinte),
    valideur: valide ? [EUC_DEV599_t_(f.Signataire_prenom), EUC_DEV599_t_(f.Signataire_nom)].filter(Boolean).join(' ') : '', valideurFonction: valide ? EUC_DEV599_t_(f.Signataire_fonction) : '',
    commentaire: valide ? EUC_DEV599_t_(f.Commentaire_valideur) : '', valideLe: valide ? EUC_DEV599_t_(f.Valide_le) : '', diffuseLe: EUC_DEV599_t_(f.Diffuse_le),
    lienEnvoyeA: EUC_DEV599_t_(f.Lien_envoye_a), lienValidation: avecLien && EUC_DEV599_t_(f.Statut) === 'A_VALIDER' ? EUC_DEV599_lienValidation_(r.id) : '' };
}

/* ---------- Page de l'apprenti ---------- */
function EUC_DEV599_ouvrir(q) {
  var eid = EUC_DEV599_lireJetonApprenti_(q && q.l);
  EUC_DEV599_tables_(); EUC_DEV598_tables_();
  var ctx = EUC_DEV599_contexte_(eid);
  ctx.modele = EUC_DEV598_modele_(ctx.classe, EUC_DEV597_lire_(EUC_DEV598_ACTIVITES_));
  ctx.fiches = EUC_DEV599_lire_(EUC_DEV599_FICHES_, { Eleve: [eid] }).map(function(r) { return EUC_DEV599_vue_(r, true); }).sort(function(a, b) { return b.du.localeCompare(a.du) || b.id - a.id; });
  ctx.aujourdhui = EUC_SUIVI2_aujourdhui_(); ctx.photosMax = EUC_DEV599_PHOTOS_MAX_; ctx.tuteur = { nom: ctx.tuteur.nom, prenom: ctx.tuteur.prenom, email: ctx.tuteur.email };
  ctx.ok = true; return ctx;
}
function EUC_DEV599_enregistrer(q) {
  q = q || {}; var eid = EUC_DEV599_lireJetonApprenti_(q.l);
  EUC_DEV599_tables_();
  var ctx = EUC_DEV599_contexte_(eid), modele = EUC_DEV598_modele_(ctx.classe, EUC_DEV597_lire_(EUC_DEV598_ACTIVITES_)), f = EUC_DEV599_nettoyer_(q, modele), maintenant = new Date().toISOString();
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  var id;
  try {
    var champs = { Lieu: f.lieu, Du: f.du, Au: f.au, Contenu: JSON.stringify(f.contenu), Date_modification: maintenant };
    if (Number(q.ficheId)) {
      var ex = EUC_DEV599_fiche_(q.ficheId), ef = ex.fields || {};
      if (Number(ef.Eleve) !== eid) throw new Error('Cette fiche ne vous appartient pas.');
      if (EUC_DEV599_t_(ef.Statut) === 'VALIDE') throw new Error('Cette fiche est déjà validée : elle n’est plus modifiable. Créez une nouvelle fiche.');
      id = Number(ex.id); champs.Empreinte = EUC_DEV599_empreinte_(f, EUC_DEV599_photos_(ef).map(function(p) { return p.id; }));
      EUC_ENT_grist('patch', '/tables/' + EUC_DEV599_FICHES_ + '/records', { records: [{ id: id, fields: champs }] });
    } else {
      champs.Eleve = eid; champs.Contrat = ctx.contratId; champs.Annee_scolaire = ctx.annee; champs.Classe = ctx.classe; champs.Entreprise = ctx.entreprise; champs.Statut = 'BROUILLON';
      champs.Date_saisie = maintenant; champs.Empreinte = EUC_DEV599_empreinte_(f, []); champs.Journal = maintenant.slice(0, 16).replace('T', ' ') + ' — fiche créée';
      id = Number((EUC_ENT_grist('post', '/tables/' + EUC_DEV599_FICHES_ + '/records', { records: [{ fields: champs }] }).records || [{}])[0].id);
    }
  } finally { lock.releaseLock(); }
  return { ok: true, fiche: EUC_DEV599_vue_(EUC_DEV599_fiche_(id), true) };
}

/* Photos : réduites dans le navigateur (JPEG), rangées dans un dossier Drive privé. */
function EUC_DEV599_dossierPhotos_() { return EUC_DEV562_folder_(EUC_DEV599_PHOTOS_PROP_, 'Eucalyptus PFMP - Livret des apprentis (photos)'); }
function EUC_DEV599_ficheModifiable_(q) {
  var eid = EUC_DEV599_lireJetonApprenti_(q.l), r = EUC_DEV599_fiche_(q.ficheId), f = r.fields || {};
  if (Number(f.Eleve) !== eid) throw new Error('Cette fiche ne vous appartient pas.');
  if (EUC_DEV599_t_(f.Statut) === 'VALIDE') throw new Error('Cette fiche est déjà validée : elle n’est plus modifiable.');
  return r;
}
function EUC_DEV599_majPhotos_(r, photos) {
  var f = r.fields || {}, contenu = {}; try { contenu = JSON.parse(f.Contenu || '{}'); } catch (e) {}
  var emp = EUC_DEV599_empreinte_({ lieu: EUC_DEV599_t_(f.Lieu), du: EUC_DEV599_t_(f.Du), au: EUC_DEV599_t_(f.Au), contenu: contenu }, photos.map(function(p) { return p.id; }));
  EUC_ENT_grist('patch', '/tables/' + EUC_DEV599_FICHES_ + '/records', { records: [{ id: Number(r.id), fields: { Photos: JSON.stringify(photos), Empreinte: emp, Date_modification: new Date().toISOString() } }] });
}
function EUC_DEV599_ajouterPhoto(q) {
  q = q || {}; var r = EUC_DEV599_ficheModifiable_(q), photos = EUC_DEV599_photos_(r.fields || {});
  if (photos.length >= EUC_DEV599_PHOTOS_MAX_) throw new Error('Pas plus de ' + EUC_DEV599_PHOTOS_MAX_ + ' photos par fiche.');
  var m = /^data:image\/jpeg;base64,([A-Za-z0-9+\/=]+)$/.exec(EUC_DEV599_t_(q.data));
  if (!m) throw new Error('Photo illisible.'); if (m[1].length > 1400000) throw new Error('Photo trop lourde.');
  var nom = EUC_DEV599_t_(q.nom).replace(/[^\w .-]/g, '').slice(0, 60) || 'photo.jpg';
  var fichier = EUC_DEV599_dossierPhotos_().createFile(Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/jpeg', 'livret-' + r.id + '-' + Date.now() + '-' + nom));
  photos.push({ id: fichier.getId(), nom: nom }); EUC_DEV599_majPhotos_(r, photos);
  return { ok: true, fiche: EUC_DEV599_vue_(EUC_DEV599_fiche_(r.id), true) };
}
function EUC_DEV599_retirerPhoto(q) {
  q = q || {}; var r = EUC_DEV599_ficheModifiable_(q), photos = EUC_DEV599_photos_(r.fields || {});
  var reste = photos.filter(function(p) { return p.id !== q.photoId; });
  if (reste.length === photos.length) throw new Error('Photo introuvable.');
  try { DriveApp.getFileById(q.photoId).setTrashed(true); } catch (e) {}
  EUC_DEV599_majPhotos_(r, reste);
  return { ok: true, fiche: EUC_DEV599_vue_(EUC_DEV599_fiche_(r.id), true) };
}
/* Vignette d'une photo, pour l'apprenti (lien du livret) ou le valideur (lien de validation). */
function EUC_DEV599_photo(q) {
  q = q || {}; var r;
  if (q.l) { var eid = EUC_DEV599_lireJetonApprenti_(q.l); r = EUC_DEV599_fiche_(q.ficheId); if (Number((r.fields || {}).Eleve) !== eid) throw new Error('Accès refusé.'); }
  else r = EUC_DEV599_fiche_(EUC_DEV599_lireJetonValidation_(q.v, EUC_SUIVI2_aujourdhui_()));
  if (!EUC_DEV599_photos_(r.fields || {}).some(function(p) { return p.id === q.photoId; })) throw new Error('Photo introuvable.');
  return 'data:image/jpeg;base64,' + Utilities.base64Encode(DriveApp.getFileById(q.photoId).getBlob().getBytes());
}

/* Demande de validation : au professeur référent (lycée) ou au tuteur (entreprise, courriel facultatif). */
function EUC_DEV599_demanderValidation(q) {
  q = q || {}; var eid = EUC_DEV599_lireJetonApprenti_(q.l), r = EUC_DEV599_fiche_(q.ficheId), f = r.fields || {};
  if (Number(f.Eleve) !== eid) throw new Error('Cette fiche ne vous appartient pas.');
  if (EUC_DEV599_t_(f.Statut) === 'VALIDE') throw new Error('Cette fiche est déjà validée.');
  var contenu = {}; try { contenu = JSON.parse(f.Contenu || '{}'); } catch (e) {}
  if (EUC_DEV599_vide_({ contenu: { activites: contenu.activites || {}, autres: contenu.autres, ressenti: contenu.ressenti } })) throw new Error('La fiche est vide : décrivez au moins une activité.');
  var ctx = EUC_DEV599_contexte_(eid), lien = EUC_DEV599_lienValidation_(r.id), champs = { Statut: 'A_VALIDER' }, envoyeA = '';
  var periode = 'du ' + EUC_DEV597_dfr_(EUC_DEV599_t_(f.Du)) + ' au ' + EUC_DEV597_dfr_(EUC_DEV599_t_(f.Au));
  if (EUC_DEV599_t_(f.Lieu) === 'LYCEE') {
    if (!ctx.referent) throw new Error('Aucun professeur référent n’est encore désigné pour vous : prévenez le bureau des entreprises.');
    var p = EUC_DEV597_lire_('EUC_PROFESSEURS_PFMP').filter(function(x) { return Number(x.id) === ctx.referent.id; })[0], mail = p ? EUC_DEV599_t_((p.fields || {}).Email) : '';
    if (!mail) throw new Error('Votre professeur référent n’a pas d’adresse enregistrée : prévenez le bureau des entreprises.');
    MailApp.sendEmail({ to: mail, name: 'Lycée Les Eucalyptus — Livret des apprentis', subject: 'Livret de ' + ctx.apprenti + ' — séquence au lycée ' + periode + ' à valider',
      body: ['Bonjour ' + ctx.referent.nom + ',', '', ctx.apprenti + ' (' + ctx.classe + ') a complété son livret pour la séquence au lycée ' + periode + '.', 'Vous pouvez la relire, ajouter un commentaire et la valider :', '', lien, '',
        'Après votre validation, le compte rendu sera envoyé automatiquement aux destinataires du livret.', '', 'Lycée Les Eucalyptus'].join('\n') });
    envoyeA = mail;
  } else if (q.email) {
    var em = EUC_DEV599_t_(q.email).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(em)) throw new Error('Adresse courriel invalide.');
    MailApp.sendEmail({ to: em, name: 'Lycée Les Eucalyptus — Livret des apprentis', subject: 'Livret de ' + ctx.apprenti + ' — séquence en entreprise ' + periode + ' à valider',
      body: ['Bonjour,', '', ctx.apprenti + ', apprenti(e) dans votre entreprise, a décrit ce qu’il ou elle a réalisé ' + periode + '.', 'Merci de relire sa fiche et de la valider :', '', lien + '&via=lien', '',
        'Vous y indiquerez vos nom, prénom et fonction, puis signerez. Le lien est valable ' + EUC_DEV599_LIEN_JOURS_ + ' jours.', '', 'Bien cordialement,', 'Lycée Les Eucalyptus'].join('\n') });
    envoyeA = em;
  }
  if (envoyeA) { champs.Lien_envoye_a = envoyeA; champs.Lien_envoye_le = new Date().toISOString(); }
  champs.Journal = (EUC_DEV599_t_(f.Journal) + '\n' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' — validation demandée' + (envoyeA ? ' (lien envoyé à ' + envoyeA + ')' : ' (QR code)')).trim().slice(-6000);
  EUC_ENT_grist('patch', '/tables/' + EUC_DEV599_FICHES_ + '/records', { records: [{ id: Number(r.id), fields: champs }] });
  return { ok: true, envoyeA: envoyeA, fiche: EUC_DEV599_vue_(EUC_DEV599_fiche_(r.id), true) };
}

/* ---------- Page de validation (professeur référent ou tuteur) ---------- */
function EUC_DEV599_lireValidation(q) {
  var id = EUC_DEV599_lireJetonValidation_(q && q.v, EUC_SUIVI2_aujourdhui_()), r = EUC_DEV599_fiche_(id), f = r.fields || {};
  var ctx = EUC_DEV599_contexte_(Number(f.Eleve)), v = EUC_DEV599_vue_(r, false);
  return { ok: true, apprenti: ctx.apprenti, classe: ctx.classe, entreprise: ctx.entreprise, modele: EUC_DEV598_modele_(ctx.classe, EUC_DEV597_lire_(EUC_DEV598_ACTIVITES_)),
    role: v.lieu === 'LYCEE' ? 'REFERENT' : 'TUTEUR', proposition: v.lieu === 'LYCEE' ? { nom: ctx.referent ? ctx.referent.nom : '' } : { prenom: ctx.tuteur.prenom, nom: ctx.tuteur.nom, fonction: ctx.tuteur.fonction },
    fiche: v };
}
function EUC_DEV599_valider(q) {
  q = q || {}; var id = EUC_DEV599_lireJetonValidation_(q.v, EUC_SUIVI2_aujourdhui_());
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  var r, f, ctx, champs, vig = [], maintenant = new Date().toISOString(), qui, fonction;
  try {
    r = EUC_DEV599_fiche_(id); f = r.fields || {};
    if (EUC_DEV599_t_(f.Statut) === 'VALIDE') throw new Error('Cette fiche est déjà validée.');
    if (EUC_DEV599_t_(f.Empreinte) !== EUC_DEV599_t_(q.empreinte)) throw new Error('La fiche a été modifiée pendant votre lecture. Rechargez la page pour relire la nouvelle version.');
    ctx = EUC_DEV599_contexte_(Number(f.Eleve));
    var commentaire = EUC_DEV599_t_(q.commentaire).slice(0, 2000);
    if (EUC_DEV599_t_(f.Lieu) === 'LYCEE') {
      qui = EUC_DEV599_t_(q.nom).slice(0, 120) || (ctx.referent ? ctx.referent.nom : '');
      if (!qui) throw new Error('Indiquez votre nom.');
      champs = { Valideur_role: 'REFERENT', Signataire_nom: qui, Signataire_prenom: '', Signataire_fonction: 'Professeur référent', Valide_via: 'LIEN_REFERENT' }; fonction = 'professeur référent';
    } else {
      var sig = { nom: EUC_DEV599_t_(q.nom).slice(0, 80), prenom: EUC_DEV599_t_(q.prenom).slice(0, 80), fonction: EUC_DEV599_t_(q.fonction).slice(0, 120), telephone: EUC_DEV599_t_(q.telephone).slice(0, 30), email: EUC_DEV599_t_(q.email).toLowerCase().slice(0, 120) };
      if (!sig.nom || !sig.prenom) throw new Error('Indiquez votre nom et votre prénom.');
      if (!sig.email && !sig.telephone) throw new Error('Indiquez un téléphone ou un courriel.');
      if (sig.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(sig.email)) throw new Error('Adresse courriel invalide.');
      if (sig.telephone && EUC_DEV598_normContact_(sig.telephone).length < 9) throw new Error('Numéro de téléphone invalide.');
      var image = EUC_DEV599_t_(q.signature);
      if (!/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(image) || image.length < 400) throw new Error('Signez dans le cadre avant de valider.');
      if (image.length > 90000) throw new Error('Signature trop volumineuse : effacez et signez de nouveau.');
      var autres = EUC_DEV597_lire_(EUC_DEV598_BILANS_).concat(EUC_DEV599_lire_(EUC_DEV599_FICHES_)).filter(function(x) { var g = x.fields || {}; return EUC_DEV599_t_(g.Statut) === 'VALIDE' && EUC_DEV599_t_(g.Signataire_email || g.Signataire_telephone); })
        .map(function(x) { var g = x.fields || {}; return { entreprise: g.Entreprise, email: g.Signataire_email, telephone: g.Signataire_telephone }; });
      var profs = EUC_DEV597_lire_('EUC_PROFESSEURS_PFMP').map(function(p) { var g = p.fields || {}; return { email: g.Email, telephone: g.Telephone || g.Portable }; });
      vig = EUC_DEV598_vigilance_(sig, { nom: [ctx.tuteur.prenom, ctx.tuteur.nom].filter(Boolean).join(' ') }, ctx.entreprise, autres, profs);
      champs = { Valideur_role: 'TUTEUR', Signataire_nom: sig.nom, Signataire_prenom: sig.prenom, Signataire_fonction: sig.fonction, Signataire_telephone: sig.telephone, Signataire_email: sig.email, Signature: image, Vigilance: vig.join(','),
        Valide_via: q.via === 'LIEN' && EUC_DEV599_t_(f.Lien_envoye_a) ? 'LIEN' : 'QR' };
      qui = sig.prenom + ' ' + sig.nom; fonction = sig.fonction;
    }
    champs.Commentaire_valideur = commentaire; champs.Valide_le = maintenant; champs.Empreinte_validee = EUC_DEV599_t_(f.Empreinte); champs.Statut = 'VALIDE';
    champs.Journal = (EUC_DEV599_t_(f.Journal) + '\n' + maintenant.slice(0, 16).replace('T', ' ') + ' — validé par ' + qui + (vig.length ? ' — vigilance : ' + vig.join(', ') : '')).trim().slice(-6000);
    EUC_ENT_grist('patch', '/tables/' + EUC_DEV599_FICHES_ + '/records', { records: [{ id: Number(id), fields: champs }] });
  } finally { lock.releaseLock(); }
  var diff = EUC_DEV599_diffuser_(EUC_DEV599_fiche_(id), ctx, { date: maintenant, jour: EUC_SUIVI2_aujourdhui_(), qui: qui, fonction: fonction, commentaire: champs.Commentaire_valideur, vigilance: vig });
  return { ok: true, diffuseA: diff.length };
}

/* Diffusion du compte rendu après validation. */
function EUC_DEV599_destinataires_(r, ctx) {
  var f = r.fields || {}, l = [];
  var el = EUC_DEV599_lire_('EUC_ELEVES_PFMP', { id: [ctx.eleveId] })[0], ef = el ? el.fields || {} : {};
  l.push(ef.Email_eleve || ef.Courriel || ef.Email);
  l.push(ctx.tuteur.email, f.Signataire_email);
  if (ctx.referent) { var p = EUC_DEV597_lire_('EUC_PROFESSEURS_PFMP').filter(function(x) { return Number(x.id) === ctx.referent.id; })[0]; if (p) l.push((p.fields || {}).Email); }
  var naissance = EUC_SUIVI2_date_(ef.Date_naissance);
  if (EUC_DEV599_mineur_(naissance, EUC_SUIVI2_aujourdhui_())) {
    EUC_DEV599_lire_('EUC_RESPONSABLES_ELEVES_PFMP').map(function(x) { return x.fields || {}; })
      .filter(function(x) { return (typeof EUC_SUIVI2_ref_ === 'function' ? EUC_SUIVI2_ref_(x.Eleve) : Number(x.Eleve)) === ctx.eleveId && x.Responsable_legal !== false; })
      .forEach(function(x) { l.push(x.Email); });
  }
  try {
    var scope = typeof EUC_V159_scopeClasse_ === 'function' ? EUC_V159_scopeClasse_({ classe: { id: ctx.classeId } }) : { etablissement: ctx.etab, filiere: '' };
    if (!scope.etablissement) scope.etablissement = ctx.etab;
    l = l.concat(EUC_DEV599_destinatairesTable_(EUC_IMPORT_lireRecords_(EUC_V158_TABLE_), scope, ctx.organismes));
  } catch (e) {}
  return EUC_DEV599_mails_(l);
}
function EUC_DEV599_diffuser_(r, ctx, v) {
  var f = r.fields || {}, contenu = {}; try { contenu = JSON.parse(f.Contenu || '{}'); } catch (e) {}
  var modele = EUC_DEV598_modele_(ctx.classe, EUC_DEV597_lire_(EUC_DEV598_ACTIVITES_));
  var texte = EUC_DEV599_compteRendu_(ctx, modele, { lieu: EUC_DEV599_t_(f.Lieu), du: EUC_DEV599_t_(f.Du), au: EUC_DEV599_t_(f.Au), contenu: contenu }, v);
  var dest = EUC_DEV599_destinataires_(r, ctx), copie = EUC_DEV598_copie_();
  if (!dest.length && copie) dest = [copie];
  if (!dest.length) return [];
  var pj = []; EUC_DEV599_photos_(f).forEach(function(p) { try { pj.push(DriveApp.getFileById(p.id).getBlob()); } catch (e) {} });
  try {
    /* Copie cachée : les adresses des familles et des entreprises ne sont pas montrées aux autres destinataires. */
    MailApp.sendEmail({ to: copie || dest[0], bcc: dest.join(','), name: 'Lycée Les Eucalyptus — Livret des apprentis',
      subject: 'Livret de ' + ctx.apprenti + ' — séquence ' + (EUC_DEV599_t_(f.Lieu) === 'LYCEE' ? 'au lycée' : 'en entreprise') + ' du ' + EUC_DEV597_dfr_(EUC_DEV599_t_(f.Du)) + ' au ' + EUC_DEV597_dfr_(EUC_DEV599_t_(f.Au)),
      body: texte, attachments: pj.length ? pj : undefined });
    if (v.vigilance && v.vigilance.length && copie) MailApp.sendEmail({ to: copie, name: 'Lycée Les Eucalyptus — Livret des apprentis', subject: '[Vigilance] Livret de ' + ctx.apprenti + ' — ' + ctx.entreprise,
      body: ['Validation tuteur à vérifier : ' + v.vigilance.map(function(k) { return EUC_DEV598_LIB_VIGILANCE_[k] || k; }).join(' ; '), 'Signataire : ' + v.qui + (v.fonction ? ' — ' + v.fonction : ''),
        'Téléphone donné : ' + (EUC_DEV599_t_(f.Signataire_telephone) || '—'), 'Courriel donné : ' + (EUC_DEV599_t_(f.Signataire_email) || '—'), 'Tuteur du contrat : ' + ([ctx.tuteur.prenom, ctx.tuteur.nom].filter(Boolean).join(' ') || 'non renseigné')].join('\n') });
    EUC_ENT_grist('patch', '/tables/' + EUC_DEV599_FICHES_ + '/records', { records: [{ id: Number(r.id), fields: { Diffuse_le: new Date().toISOString(), Diffuse_a: dest.join(', ') } }] });
  } catch (e) { console.log('DEV599 diffusion impossible : ' + (e && e.message || e)); return []; }
  return dest;
}

/* ---------- Administration : liens des livrets ---------- */
function EUC_DEV599_envoyerLiens(q) {
  var ctx = EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var ids = (q.eleveIds || []).map(Number).filter(Boolean); if (!ids.length) throw new Error('Cochez au moins un apprenti.');
  var eleves = EUC_DEV599_lire_('EUC_ELEVES_PFMP', { id: ids }), envois = [], sans = [];
  eleves.forEach(function(r) { var f = r.fields || {}, mail = EUC_DEV599_t_(f.Email_eleve || f.Courriel || f.Email), nom = [EUC_DEV599_t_(f.Prenom_usage || f.Prenom), EUC_DEV599_t_(f.Nom)].filter(Boolean).join(' ');
    if (mail) envois.push({ eleveId: Number(r.id), nom: nom, email: mail }); else sans.push(nom); });
  if (q.confirmation !== 'ENVOYER') return { ok: true, apercu: true, envois: envois, sansMail: sans };
  if (MailApp.getRemainingDailyQuota() < envois.length) throw new Error('Quota de courriels du jour insuffisant.');
  envois.forEach(function(e) {
    MailApp.sendEmail({ to: e.email, replyTo: EUC_DEV599_t_(ctx && ctx.email) || undefined, name: 'Lycée Les Eucalyptus — Livret des apprentis', subject: 'Ton livret d’apprentissage en ligne',
      body: ['Bonjour ' + e.nom + ',', '', 'Voici ton lien personnel vers ton livret d’apprentissage. Garde-le : c’est lui qui t’identifie.', '', EUC_DEV599_lienApprenti_(e.eleveId), '',
        'À chaque séquence (au lycée ou en entreprise), décris ce que tu as fait, bloc par bloc, ajoute des photos si tu veux, puis demande la validation :',
        '• au lycée : ton professeur référent la reçoit par courriel ;', '• en entreprise : ton tuteur scanne le QR code affiché sur ton téléphone et signe.', '',
        'Le compte rendu validé est ensuite envoyé à ton tuteur, à ton professeur référent et aux personnes qui suivent ta formation.', '', 'Le bureau des entreprises — Lycée Les Eucalyptus'].join('\n') });
  });
  return { ok: true, apercu: false, envoyes: envois.length, sansMail: sans };
}

/* ---------- Pages ---------- */
function EUC_DEV599_afficherLivret(e) {
  var t = HtmlService.createTemplateFromFile('Livret_Apprenti_DEV599');
  t.jeton = EUC_DEV599_t_(e && e.parameter && e.parameter.l);
  return t.evaluate().setTitle('Mon livret d’apprentissage').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV599_afficherValidation(e) {
  var t = HtmlService.createTemplateFromFile('Validation_Livret_DEV599');
  t.jeton = EUC_DEV599_t_(e && e.parameter && e.parameter.v);
  t.via = EUC_DEV599_t_(e && e.parameter && e.parameter.via).toLowerCase();
  return t.evaluate().setTitle('Validation du livret d’apprentissage').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
