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
  var vus = {};
  (EUC_CONVENTION_lireAccesFraisV108_() || []).forEach(function(a) {
    if (!EUC_ADMIN_WORKFLOW_estDossierVisibleV522_(a)) return;
    if (annee && EUC_PFMP_anneeDossierV148_(a) !== annee) return;
    if (a.Revoked === true || a.Supprimee_admin === true || t(a.Statut_administratif).toUpperCase() === 'SUPPRIMEE_ADMIN') return;
    var id = EUC_ADMIN_WORKFLOW_identiteEleveV521_(a, byEleve), cid = Number(EUC_PFMP_ref_(a.Classe_convention)) || 0, nv = niveaux[cid] || {};
    vus[(Number(id.id) || 0) + '|' + t(a.Entreprise_siret).replace(/\D/g, '')] = true;
    fn(a, id, byEleve[Number(id.id)] || {}, { id: Number(a.id), source: 'CONVENTION', statut: '', numero: EUC_ADMIN_WORKFLOW_numeroV144_(a), eleve: id.jeune || [id.prenom, id.nom].filter(Boolean).join(' '), eleveId: Number(id.id) || 0,
      nomEleve: t(id.nom), prenomEleve: t(id.prenom), classe: t(a.Classe_convention_nom), niveau: nv.code || '', niveauLibelle: nv.libelle || '', periode: t(a.Periode_libelle), entreprise: t(a.Entreprise_raison_sociale) });
  });
  /* DEV692 : conventions arrivées par JotForm ou « Déclarer mon entreprise » (n° PFMP-…-S…), table d'attente
     EUC_MIGRATION_JOTFORM_PFMP, comptées par le suivi des PFMP mais absentes de l'administration des conventions. */
  var lignes = []; try { lignes = EUC_IMPORT_lireRecords_('EUC_MIGRATION_JOTFORM_PFMP') || []; } catch (eJ) { lignes = []; }
  lignes.forEach(function(j) {
    var decision = t(j.Decision).toUpperCase(); if (decision === 'IGNOREE') return;
    var eid = Number(EUC_PFMP_ref_(j.Eleve_match_id || j.Eleve || j.Eleve_id)) || 0, e = byEleve[eid]; if (!eid || !e) return;
    var depot = t(j.Submission_ID), numero = /^SECOURS-/.test(depot) ? depot.replace(/^SECOURS-/, '') : depot;
    var an = t(j.Annee_scolaire); if (!/^20\d{2}-20\d{2}$/.test(an)) { var m = numero.match(/PFMP-(20\d{2})-/); an = m ? m[1] + '-' + (Number(m[1]) + 1) : ''; }
    if (annee && an && an !== annee) return;
    var siret = t(j.SIRET_normalise || j.SIRET_brut).replace(/\D/g, ''); if (vus[eid + '|' + siret]) return;
    var importee = j.Importer === true || /^(1|OUI|YES|TRUE|VRAI)$/i.test(t(j.Importer)), statutSiret = t(j.SIRET_statut).toUpperCase();
    var valide = decision === 'VALIDEE' || statutSiret === 'VERIFIE' || importee || statutSiret === 'NIS_MONACO';
    var c = typeof EUC_SUIVI2_contactsTampon_ === 'function' ? EUC_SUIVI2_contactsTampon_(j) : { responsable: { prenom: j.Responsable_prenom, nom: j.Responsable_nom, tel: j.Responsable_telephone }, tuteur: { prenom: j.Tuteur_prenom, nom: j.Tuteur_nom, tel: j.Tuteur_telephone } };
    var a = { Responsable_nom: c.responsable.nom, Responsable_prenom: c.responsable.prenom, Responsable_telephone: c.responsable.tel, Tuteur_nom: c.tuteur.nom, Tuteur_prenom: c.tuteur.prenom, Tuteur_telephone: c.tuteur.tel,
      Entreprise_raison_sociale: t(j.Raison_sociale_officielle) || t(j.Nom_commercial) || t(j.Entreprise_saisie), Entreprise_enseigne: t(j.Nom_commercial), Entreprise_siret: siret, Entreprise_nis: t(j.NIS_normalise || j.NIS_brut), Entreprise: EUC_PFMP_ref_(j.Entreprise_match_id), Entreprise_commune: t(j.Ville_officielle),
      Lieu_stage_adresse: j.Lieu_stage_adresse, Lieu_stage_code_postal: j.Lieu_stage_code_postal, Lieu_stage_commune: j.Lieu_stage_commune };
    var cid = Number(EUC_PFMP_ref_(e.Classe)) || 0, nv = niveaux[cid] || {}, prenom = t(e.Prenom_usage || e.Prenom), nom = t(e.Nom);
    fn(a, { id: eid, nom: nom, prenom: prenom, jeune: [prenom, nom].filter(Boolean).join(' ') }, e, { id: 'S' + Number(j.id), source: 'SOUMISSION', statut: valide ? 'Dépôt en ligne' : 'Dépôt en ligne — entreprise à vérifier', numero: numero, eleve: [prenom, nom].filter(Boolean).join(' '), eleveId: eid,
      nomEleve: nom, prenomEleve: prenom, classe: t(e.Code_classe_importe) || t(j.Classe_brut), niveau: nv.code || '', niveauLibelle: nv.libelle || '', periode: t(j.Periode_libelle) || (Number(j.Periode_numero) ? 'PFMP n°' + Number(j.Periode_numero) : ''), entreprise: a.Entreprise_raison_sociale });
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

/* DEV698 : fiches de la base des entreprises par id (SIRET ou NIS absent de la convention). */
function EUC_DEV689_fiches_() {
  var fiches = {};
  try { (EUC_IMPORT_lireRecords_(typeof EUC_V161F8_tableEntreprise_ === 'function' ? EUC_V161F8_tableEntreprise_() : 'EUC_ENTREPRISES') || []).forEach(function(f) { fiches[Number(f.id)] = f; }); } catch (eEnt) {}
  return fiches;
}
/* Identité d'une entreprise d'accueil (calcul pur) : SIRET, sinon NIS de Monaco (à la lettre près), sinon nom + commune ;
 * un lieu de stage distinct du siège est compté à part. null si rien ne l'identifie. */
function EUC_DEV689_ident_(a, fiches) {
  var t = function(v) { return String(v == null ? '' : v).trim(); };
  var fiche = (fiches || {})[Number(EUC_PFMP_ref_(a.Entreprise)) || 0] || {};
  var siret = t(a.Entreprise_siret || a.Entreprise_siret_snapshot).replace(/\D/g, '');
  if (siret.length !== 14) siret = t(fiche.SIRET || fiche.Siret).replace(/\D/g, '');
  var nis = siret.length === 14 ? '' : t(a.Entreprise_nis || a.Entreprise_nis_snapshot || fiche.NIS || fiche.Nis || (/[A-Z]/i.test(t(a.Entreprise_siret)) ? a.Entreprise_siret : '')).toUpperCase().replace(/[\s-]+/g, ''), lieu = t(a.Lieu_stage_adresse) ? [t(a.Lieu_stage_adresse), t(a.Lieu_stage_code_postal), t(a.Lieu_stage_commune)].filter(Boolean).join(' ') : '';
  var commune = t(a.Lieu_stage_commune) || t(a.Entreprise_commune), nomCle = EUC_DEV688_norm_(t(a.Entreprise_raison_sociale) || t(a.Entreprise_enseigne));
  if (!nomCle && siret.length !== 14 && !nis) return null;
  var r = { siret: siret.length === 14 ? siret : '', nis: nis, enseigne: t(a.Entreprise_enseigne), commune: commune, lieu: lieu };
  r.identifiant = r.siret ? 'SIRET ' + r.siret : nis ? 'NIS ' + nis : '';
  /* DEV697 : même NIS à la lettre près = même entreprise (TITAN : 7112B19343 / 7112Y19343), règle DEV668. */
  var nisCle = /^\d{4}[A-Z]\d{5}$/.test(nis) ? nis.slice(0, 4) + nis.slice(5) : nis;
  r.entreprise = r.siret ? 'S' + r.siret : nis ? 'M' + nisCle : 'N' + nomCle + '|' + EUC_DEV688_norm_(commune);
  r.cle = r.entreprise + (lieu ? '|L' + EUC_DEV688_norm_(lieu) : '');
  return r;
}

/* DEV689 — Élèves par entreprise / lieu de stage : une ligne par convention, regroupée côté page (filtres niveau, période, classe). */
function EUC_DEV689_lieuxStage(q) {
  EUC_ADMIN_WORKFLOW_ctxV144_(); q = q || {};
  var annee = String(q.annee || '').trim(), out = [], fiches = EUC_DEV689_fiches_();
  EUC_DEV688_parcourir_(annee, function(a, id, e, base) {
    var x = EUC_DEV689_ident_(a, fiches); if (!x) return;
    base.siret = x.siret; base.nis = x.nis; base.identifiant = x.identifiant; base.enseigne = x.enseigne; base.commune = x.commune; base.lieu = x.lieu; base.cle = x.cle;
    out.push(base);
  });
  EUC_DEV688_tri_(out);
  return { ok: true, annee: annee, total: out.length, conventions: out };
}
