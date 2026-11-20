/**
 * DEV688 — Contrôle des noms du responsable d'entreprise et du tuteur saisis par les élèves.
 *
 * Certains élèves mettent un numéro de téléphone, leur propre nom ou celui de leurs parents à la place du
 * responsable ou du tuteur. Cette analyse (lecture seule) signale les saisies suspectes de toutes les conventions
 * de l'année ; la page « Administration des conventions » les filtre (niveau, période, classe, type d'anomalie,
 * recherche) et ouvre le dossier à corriger. Une alerte est une saisie à vérifier, pas forcément une erreur
 * (un parent peut réellement être le responsable de l'entreprise).
 */
var EUC_DEV688_MOTS_ = ['PAPA', 'MAMAN', 'PERE', 'MERE', 'PARENT', 'PARENTS', 'MOI', 'MOI MEME', 'LUI', 'ELLE', 'TEST', 'XXX', 'XX', 'X', 'AUCUN', 'AUCUNE',
  'NEANT', 'NON', 'RIEN', 'INCONNU', 'INCONNUE', 'IDEM', 'PAREIL', 'MEME', 'VOIR', 'NC', 'NA', 'SANS', 'PATRON', 'PATRONNE', 'CHEF', 'TUTEUR', 'RESPONSABLE', 'DIRECTEUR', 'GERANT'];

function EUC_DEV688_norm_(v) {
  return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9@]+/g, ' ').trim();
}
function EUC_DEV688_tel_(v) { var d = String(v == null ? '' : v).replace(/\D/g, ''); if (d.indexOf('33') === 0 && d.length === 11) d = '0' + d.slice(2); return d.length >= 9 ? d.slice(-9) : ''; }

/* Analyse d'une personne (responsable ou tuteur). eleve = {nom, prenom, tels:[]} ; parents = [{nom, prenom, tels:[]}]. */
function EUC_DEV688_analyser_(champ, p, eleve, parents) {
  p = p || {}; eleve = eleve || {}; parents = parents || [];
  var nom = EUC_DEV688_norm_(p.nom), prenom = EUC_DEV688_norm_(p.prenom), brut = [p.prenom, p.nom].filter(Boolean).join(' ').trim();
  var complet = (prenom + ' ' + nom).trim(), out = [], add = function(code, motif) { out.push({ champ: champ, valeur: brut || '(vide)', code: code, motif: motif }); };
  var lettres = (nom + prenom).replace(/[^A-Z]/g, '').length;
  if (!nom) add('VIDE', 'Nom manquant');
  if (/\d/.test(String(p.nom || '') + String(p.prenom || ''))) add('CHIFFRES', 'Chiffres dans le nom (numéro de téléphone ?)');
  if (/@/.test(String(p.nom || '') + String(p.prenom || ''))) add('COURRIEL', 'Adresse électronique à la place du nom');
  if (nom && lettres < 3 && !out.length) add('TROP_COURT', 'Nom trop court');
  var mots = complet.split(' ');
  if (complet && (EUC_DEV688_MOTS_.indexOf(complet) >= 0 || EUC_DEV688_MOTS_.indexOf(nom) >= 0 || mots.every(function(m) { return EUC_DEV688_MOTS_.indexOf(m) >= 0; }))) add('MOT_SUSPECT', 'Mot générique au lieu d’un nom');
  var en = EUC_DEV688_norm_(eleve.nom), ep = EUC_DEV688_norm_(eleve.prenom);
  if (nom && en && nom === en) add(prenom && ep && prenom === ep ? 'NOM_ELEVE' : 'NOM_FAMILLE', prenom && ep && prenom === ep ? 'Nom et prénom de l’élève' : 'Même nom de famille que l’élève (parent ?)');
  else if (nom && ep && nom === ep) add('NOM_ELEVE', 'Prénom de l’élève à la place du nom');
  parents.forEach(function(r) {
    var rn = EUC_DEV688_norm_(r.nom), rp = EUC_DEV688_norm_(r.prenom);
    if (nom && rn && nom === rn && (!prenom || !rp || prenom === rp) && !(en && nom === en)) add('PARENT', 'Nom d’un responsable légal de l’élève');
  });
  var tel = EUC_DEV688_tel_(p.telephone);
  if (tel) {
    if ((eleve.tels || []).map(EUC_DEV688_tel_).indexOf(tel) >= 0) add('TEL_ELEVE', 'Téléphone de l’élève');
    else if (parents.some(function(r) { return (r.tels || []).map(EUC_DEV688_tel_).indexOf(tel) >= 0; })) add('TEL_PARENT', 'Téléphone d’un responsable légal');
  }
  /* une même alerte n'est donnée qu'une fois par personne */
  var vu = {}; return out.filter(function(x) { if (vu[x.code]) return false; vu[x.code] = true; return true; });
}

/* Conventions de l'année visibles dans l'administration (ni supprimées ni révoquées), avec élève et niveau. */
function EUC_DEV688_parcourir_(annee, fn) {
  var t = function(v) { return String(v == null ? '' : v).trim(); };
  var byEleve = {}; (EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP') || []).forEach(function(e) { byEleve[Number(e.id)] = e; });
  var niveaux = {};
  try {
    EUC_DEV368_catalog(annee).classes.forEach(function(c) { var code = EUC_DEV371_levelOf_(c.classe, c.famille); niveaux[Number(c.classeId)] = { code: code, libelle: EUC_DEV371_levelLabel_(code) || code }; });
  } catch (eCat) {}
  (EUC_CONVENTION_lireAccesFraisV108_() || []).forEach(function(a) {
    if (!EUC_ADMIN_WORKFLOW_estDossierVisibleV522_(a)) return;
    if (annee && EUC_PFMP_anneeDossierV148_(a) !== annee) return;
    if (a.Revoked === true || a.Supprimee_admin === true || t(a.Statut_administratif).toUpperCase() === 'SUPPRIMEE_ADMIN') return;
    var id = EUC_ADMIN_WORKFLOW_identiteEleveV521_(a, byEleve), cid = Number(EUC_PFMP_ref_(a.Classe_convention)) || 0, nv = niveaux[cid] || {};
    fn(a, id, byEleve[Number(id.id)] || {}, { id: Number(a.id), numero: EUC_ADMIN_WORKFLOW_numeroV144_(a), eleve: id.jeune || [id.prenom, id.nom].filter(Boolean).join(' '), eleveId: Number(id.id) || 0,
      nomEleve: t(id.nom), prenomEleve: t(id.prenom), classe: t(a.Classe_convention_nom), niveau: nv.code || '', niveauLibelle: nv.libelle || '', periode: t(a.Periode_libelle), entreprise: t(a.Entreprise_raison_sociale) });
  });
}
function EUC_DEV688_tri_(l) { return l.sort(function(x, y) { return x.classe.localeCompare(y.classe, 'fr') || (x.nomEleve + ' ' + x.prenomEleve).localeCompare(y.nomEleve + ' ' + y.prenomEleve, 'fr'); }); }

function EUC_DEV688_controleNoms(q) {
  EUC_ADMIN_WORKFLOW_ctxV144_(); q = q || {};
  var annee = String(q.annee || '').trim(), t = function(v) { return String(v == null ? '' : v).trim(); };
  var parents = {};
  try {
    (EUC_IMPORT_lireRecords_(typeof EUC_IMPORT_RESP_TABLE_ === 'string' ? EUC_IMPORT_RESP_TABLE_ : 'EUC_RESPONSABLES_ELEVES_PFMP') || []).forEach(function(r) {
      var id = Number(EUC_PFMP_ref_(r.Eleve)) || 0; if (!id) return;
      (parents[id] = parents[id] || []).push({ nom: r.Nom, prenom: r.Prenom, tels: [r.Telephone_portable, r.Telephone_fixe, r.Telephone_professionnel] });
    });
  } catch (eResp) {}
  var out = [];
  EUC_DEV688_parcourir_(annee, function(a, id, e, base) {
    var eleve = { nom: id.nom, prenom: id.prenom, tels: [e.Telephone_portable, e.Portable, e.Telephone, e.Telephone_eleve] };
    var resp = { nom: a.Responsable_nom, prenom: a.Responsable_prenom, telephone: a.Responsable_telephone };
    var tut = { nom: a.Tuteur_nom, prenom: a.Tuteur_prenom, telephone: a.Tuteur_telephone };
    base.anomalies = EUC_DEV688_analyser_('Responsable', resp, eleve, parents[base.eleveId]).concat(EUC_DEV688_analyser_('Tuteur', tut, eleve, parents[base.eleveId]));
    base.responsable = [t(a.Responsable_prenom), t(a.Responsable_nom)].filter(Boolean).join(' '); base.tuteur = [t(a.Tuteur_prenom), t(a.Tuteur_nom)].filter(Boolean).join(' ');
    out.push(base);
  });
  EUC_DEV688_tri_(out);
  return { ok: true, annee: annee, total: out.length, avecAnomalie: out.filter(function(x) { return x.anomalies.length; }).length, conventions: out };
}

/* DEV689 — Élèves par entreprise / lieu de stage : une ligne par convention, regroupée côté page (filtres niveau, période, classe). */
function EUC_DEV689_lieuxStage(q) {
  EUC_ADMIN_WORKFLOW_ctxV144_(); q = q || {};
  var annee = String(q.annee || '').trim(), t = function(v) { return String(v == null ? '' : v).trim(); }, out = [];
  EUC_DEV688_parcourir_(annee, function(a, id, e, base) {
    var siret = t(a.Entreprise_siret).replace(/\D/g, ''), lieu = t(a.Lieu_stage_adresse) ? [t(a.Lieu_stage_adresse), t(a.Lieu_stage_code_postal), t(a.Lieu_stage_commune)].filter(Boolean).join(' ') : '';
    var commune = t(a.Lieu_stage_commune) || t(a.Entreprise_commune), nomCle = EUC_DEV688_norm_(t(a.Entreprise_raison_sociale) || t(a.Entreprise_enseigne));
    if (!nomCle && !siret) return;
    base.siret = siret.length === 14 ? siret : ''; base.enseigne = t(a.Entreprise_enseigne); base.commune = commune; base.lieu = lieu;
    base.cle = (base.siret ? 'S' + base.siret : 'N' + nomCle + '|' + EUC_DEV688_norm_(commune)) + (lieu ? '|L' + EUC_DEV688_norm_(lieu) : '');
    out.push(base);
  });
  EUC_DEV688_tri_(out);
  return { ok: true, annee: annee, total: out.length, conventions: out };
}
