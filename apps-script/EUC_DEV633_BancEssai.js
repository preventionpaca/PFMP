/**
 * DEV633 — Banc d'essai (administration) : tester tous les parcours avant l'ouverture aux professeurs et aux élèves.
 *
 * Crée, sans doublon et toujours après un aperçu, deux apprentis de test dont le courriel est celui de
 * l'administrateur :
 *   - un apprenti en classe entière (classe « TEST APPRENTIS CE », modalité Classe entière) ;
 *   - un apprenti en mixité (classe « TEST APPRENTIS MIX », modalité Mixité) ;
 * chacun avec un contrat dans une « ENTREPRISE TEST », un tuteur (l'administrateur) et un professeur référent choisi
 * dans la table des professeurs (l'administrateur lui-même, pour voir l'espace référent). Les classes TEST restent
 * hors effectifs, carte et books (EUC_SUIVI2_classeTest_).
 * Le livret de l'apprenti de test reprend les périodes et les objectifs d'une vraie formation choisie ici (Bachelor IP,
 * 1 BAC PRO MVA…) sans toucher au rattachement des classes du planning : la correspondance est gardée dans les
 * propriétés du script (lue par EUC_DEV631_lignesClasse_), donc jamais publiée dans Planning_Periodes.
 * La page rassemble ensuite tous les accès : formulaire de secours (élève scolaire de test, DEV604), livrets et codes,
 * espace référent, échéancier, sous-domaines livretek / suiviek, et une liste de contrôle des parcours.
 */
var EUC_DEV633_PROP_LIGNES_ = 'EUC_DEV633_LIGNES_TEST';
var EUC_DEV633_TYPES_ = {
  CE: { classe: 'TEST APPRENTIS CE', modalite: 'Classe entière', libelle: 'Apprenti en classe entière' },
  MIX: { classe: 'TEST APPRENTIS MIX', modalite: 'Mixité', libelle: 'Apprenti en mixité' }
};

function EUC_DEV633_t_(v) { return v == null ? '' : String(v).trim(); }
/* Correspondance classe de test → ligne de planning (propriétés du script). */
function EUC_DEV633_lignesTest_() { try { var v = JSON.parse(PropertiesService.getScriptProperties().getProperty(EUC_DEV633_PROP_LIGNES_) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
function EUC_DEV633_ecrireLigneTest_(classeId, ligne) {
  var v = EUC_DEV633_lignesTest_(); if (ligne) v[String(classeId)] = [ligne]; else delete v[String(classeId)];
  PropertiesService.getScriptProperties().setProperty(EUC_DEV633_PROP_LIGNES_, JSON.stringify(v));
}
function EUC_DEV633_mail_(v, quoi) { v = EUC_DEV633_t_(v).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(v)) throw new Error('Adresse courriel invalide' + (quoi ? ' (' + quoi + ')' : '') + '.'); return v; }
function EUC_DEV633_profs_() {
  return EUC_DEV604_lignes_('EUC_PROFESSEURS_PFMP').map(function(r) { var f = r.fields || {}; return { id: Number(r.id), nom: [EUC_DEV633_t_(f.Prenom), EUC_DEV633_t_(f.Nom)].filter(Boolean).join(' '), email: EUC_DEV633_t_(f.Email).toLowerCase(), actif: f.Actif !== false }; })
    .filter(function(p) { return p.nom && p.actif; }).sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
}
var EUC_DEV633_ref_ = function(v) { return Array.isArray(v) ? Number(v[1]) : Number(v); };

/* État du banc d'essai : apprentis de test existants, accès, listes pour les formulaires. */
function EUC_DEV633_etat() {
  var ctx = EUC_SUIVI2_exigerAdmin_(), annee = EUC_SUIVI2_anneeCourante_(EUC_SUIVI2_aujourdhui_()), lt = EUC_DEV633_lignesTest_();
  var classes = EUC_DEV604_lignes_('Classes'), eleves = EUC_DEV604_lignes_('EUC_ELEVES_PFMP'), contrats = EUC_DEV604_lignes_('EUC_APPRENTISSAGE_PFMP');
  var referents = EUC_DEV604_lignes_('EUC_REFERENTS_APPRENTIS_PFMP'), profs = EUC_DEV633_profs_();
  var apprentis = Object.keys(EUC_DEV633_TYPES_).map(function(type) {
    var T = EUC_DEV633_TYPES_[type], c = classes.filter(function(r) { return EUC_DEV604_n_((r.fields || {}).Nom) === EUC_DEV604_n_(T.classe); })[0];
    var out = { type: type, libelle: T.libelle, classe: T.classe, classeId: c ? Number(c.id) : 0, ligne: c ? ((lt[String(c.id)] || [])[0] || '') : '', eleves: [] };
    if (!c) return out;
    eleves.filter(function(r) { return EUC_DEV633_ref_((r.fields || {}).Classe) === Number(c.id) && (r.fields || {}).Actif !== false; }).forEach(function(r) {
      var f = r.fields || {}, eid = Number(r.id), ct = contrats.filter(function(x) { return EUC_DEV633_ref_((x.fields || {}).Eleve) === eid && (x.fields || {}).Actif !== false; })[0];
      var rf = referents.map(function(x) { return x.fields || {}; }).filter(function(x) { return Number(x.Eleve) === eid && x.Actif !== false && EUC_DEV633_t_(x.Annee_scolaire) === annee; }).pop();
      var prof = rf ? profs.filter(function(p) { return p.id === Number(rf.Professeur); })[0] : null;
      out.eleves.push({ id: eid, nom: [EUC_DEV633_t_(f.Prenom), EUC_DEV633_t_(f.Nom)].join(' '), email: EUC_DEV633_t_(f.Email_eleve || f.Courriel),
        entreprise: ct ? EUC_DEV633_t_((ct.fields || {}).Nom_entreprise) : '', contratId: ct ? Number(ct.id) : 0,
        referent: prof ? prof.nom : (rf ? EUC_DEV633_t_(rf.Professeur_nom) : ''), referentId: prof ? prof.id : 0,
        lienLivret: EUC_DEV599_lienApprenti_(eid), code: EUC_DEV599_codeApprenti_(eid),
        lienEspace: prof ? EUC_DEV600_lien_(prof.id) : '', lienBilan: ct && typeof EUC_DEV598_lienProf_ === 'function' ? EUC_DEV598_lienProf_(Number(ct.id)) : '' });
    });
    return out;
  });
  var base = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : EUC_DEV598_base_();
  var lignes = []; try { lignes = EUC_DEV610_lignes_().filter(function(l) { return l.actif; }).map(function(l) { return { code: l.code, nom: l.libelle, calendrier: l.calendrier }; }); } catch (e) {}
  var moi = EUC_DEV633_t_(ctx && ctx.email).toLowerCase();
  return { ok: true, annee: annee, moi: moi, moiProf: (profs.filter(function(p) { return p.email === moi; })[0] || {}).id || 0, profs: profs, lignes: lignes, apprentis: apprentis,
    scolaire: { classe: 'TEST PFMP', existe: classes.some(function(r) { return EUC_DEV604_n_((r.fields || {}).Nom) === 'testpfmp'; }) },
    liens: { formulaire: base + '?page=declaration-entreprise', soumissions: base + '?page=migration-jotform-pfmp', echeancier: base + '?page=echeancier-apprentis-pfmp', plannings: base + '?page=plannings-pfmp&vue=formations',
      livretek: 'https://livretek.loucodi.fr/', suiviek: 'https://suiviek.loucodi.fr/', admin: base + '?page=admin-pfmp' } };
}

/* Création (ou mise à jour) d'un apprenti de test : aperçu sans confirmation, écriture avec confirmation 'CREER'. */
function EUC_DEV633_creerApprenti(q) {
  var ctx = EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var T = EUC_DEV633_TYPES_[EUC_DEV633_t_(q.type).toUpperCase()]; if (!T) throw new Error('Type d’apprenti de test inconnu.');
  var annee = EUC_SUIVI2_anneeCourante_(EUC_SUIVI2_aujourdhui_());
  var prenom = EUC_DEV633_t_(q.prenom), nom = EUC_DEV602_nomCapitales_(q.nom), email = EUC_DEV633_mail_(q.email, 'apprenti'), naissance = EUC_DEV633_t_(q.naissance);
  var entreprise = EUC_DEV633_t_(q.entreprise) || 'ENTREPRISE TEST', tPrenom = EUC_DEV633_t_(q.tuteurPrenom) || 'Tuteur', tNom = EUC_DEV602_nomCapitales_(EUC_DEV633_t_(q.tuteurNom) || 'TEST'), tEmail = EUC_DEV633_mail_(q.tuteurEmail || email, 'tuteur');
  var debut = EUC_DEV633_t_(q.debut), ligne = EUC_DEV633_t_(q.ligne), profId = Number(q.profId) || 0;
  if (!prenom || !nom) throw new Error('Indiquez le prénom et le nom de l’apprenti de test.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(naissance)) throw new Error('Indiquez une date de naissance (majeur : pas de courriel aux responsables).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(debut)) throw new Error('Indiquez la date de début du contrat.');
  var prof = profId ? EUC_DEV633_profs_().filter(function(p) { return p.id === profId; })[0] : null;
  if (profId && !prof) throw new Error('Professeur référent introuvable.');
  var classe = EUC_DEV604_lignes_('Classes').filter(function(r) { return EUC_DEV604_n_((r.fields || {}).Nom) === EUC_DEV604_n_(T.classe); })[0];
  var eleve = classe ? EUC_DEV604_lignes_('EUC_ELEVES_PFMP').filter(function(r) { var f = r.fields || {}; return EUC_DEV633_ref_(f.Classe) === Number(classe.id) && EUC_DEV604_n_(f.Nom) === EUC_DEV604_n_(nom) && EUC_DEV604_n_(f.Prenom) === EUC_DEV604_n_(prenom); })[0] : null;
  var contrat = eleve ? EUC_DEV604_lignes_('EUC_APPRENTISSAGE_PFMP').filter(function(r) { return EUC_DEV633_ref_((r.fields || {}).Eleve) === Number(eleve.id); })[0] : null;
  var plan = { annee: annee, type: q.type, classe: { nom: T.classe, modalite: T.modalite, existe: !!classe }, eleve: { prenom: prenom, nom: nom, email: email, existe: !!eleve },
    contrat: { entreprise: entreprise, debut: debut, tuteur: tPrenom + ' ' + tNom, tuteurEmail: tEmail, existe: !!contrat }, referent: prof ? prof.nom : '', ligne: ligne };
  if (q.confirmation !== 'CREER') { plan.apercu = true; plan.ok = true; return plan; }

  var cc = EUC_DEV604_colonnes_('Classes'), ce = EUC_DEV604_colonnes_('EUC_ELEVES_PFMP'), ca = EUC_DEV604_colonnes_('EUC_APPRENTISSAGE_PFMP');
  var fc = EUC_DEV604_champs_(cc, { Nom: T.classe, Actif: true, Etab: 'LP', Code_import: T.classe, Classe_PFMP: T.classe, Modalite_apprentissage: T.modalite, Organisme_gestionnaire: 'CFA RAN', Organisme_donneur_ordre: 'CFA RAN' });
  var classeId = classe ? Number(classe.id) : 0;
  if (classe) EUC_DEV604_etape_('mise à jour de la classe', function() { EUC_ENT_grist('patch', '/tables/Classes/records', { records: [{ id: classeId, fields: fc }] }); });
  else classeId = Number((EUC_DEV604_etape_('création de la classe', function() { return EUC_ENT_grist('post', '/tables/Classes/records', { records: [{ fields: fc }] }); }).records || [{}])[0].id);
  var champsE = EUC_DEV604_champs_(ce, { Nom: nom, Prenom: prenom, Date_naissance: naissance, Email_eleve: email, Courriel: email, Classe: classeId, Annee_scolaire: EUC_DEV604_ref_(ce.Annee_scolaire, annee, ['Code', 'Libelle']), Actif: true, Present_dernier_import: true });
  var eleveId = eleve ? Number(eleve.id) : 0;
  if (eleve) EUC_DEV604_etape_('mise à jour de l’apprenti', function() { EUC_ENT_grist('patch', '/tables/EUC_ELEVES_PFMP/records', { records: [{ id: eleveId, fields: champsE }] }); });
  else eleveId = Number((EUC_DEV604_etape_('création de l’apprenti', function() { return EUC_ENT_grist('post', '/tables/EUC_ELEVES_PFMP/records', { records: [{ fields: champsE }] }); }).records || [{}])[0].id);
  var champsA = EUC_DEV604_champs_(ca, { Eleve: eleveId, Annee_scolaire: EUC_DEV604_ref_(ca.Annee_scolaire, annee, ['Code', 'Libelle']), Nom_entreprise: entreprise, Raison_sociale: entreprise, Date_debut: debut,
    Tuteur_prenom: tPrenom, Tuteur_nom: tNom, Tuteur_fonction: 'Tuteur (test)', Tuteur_courriel: tEmail, Actif: true, Commentaire: 'Contrat de test (DEV633)' });
  var contratId = contrat ? Number(contrat.id) : 0;
  if (contrat) EUC_DEV604_etape_('mise à jour du contrat', function() { EUC_ENT_grist('patch', '/tables/EUC_APPRENTISSAGE_PFMP/records', { records: [{ id: contratId, fields: champsA }] }); });
  else contratId = Number((EUC_DEV604_etape_('création du contrat', function() { return EUC_ENT_grist('post', '/tables/EUC_APPRENTISSAGE_PFMP/records', { records: [{ fields: champsA }] }); }).records || [{}])[0].id);
  if (prof) {
    if (typeof EUC_DEV597_tables_ === 'function') EUC_DEV597_tables_();
    var cr = EUC_DEV604_colonnes_('EUC_REFERENTS_APPRENTIS_PFMP'), ex = EUC_DEV604_lignes_('EUC_REFERENTS_APPRENTIS_PFMP').filter(function(r) { var f = r.fields || {}; return Number(f.Eleve) === eleveId && EUC_DEV633_t_(f.Annee_scolaire) === annee; })[0];
    var champsR = EUC_DEV604_champs_(cr, { Eleve: eleveId, Annee_scolaire: annee, Professeur: prof.id, Professeur_nom: prof.nom, Actif: true, Date_modification: new Date().toISOString() });
    EUC_DEV604_etape_('désignation du professeur référent', function() {
      if (ex) EUC_ENT_grist('patch', '/tables/EUC_REFERENTS_APPRENTIS_PFMP/records', { records: [{ id: Number(ex.id), fields: champsR }] });
      else EUC_ENT_grist('post', '/tables/EUC_REFERENTS_APPRENTIS_PFMP/records', { records: [{ fields: champsR }] });
    });
  }
  EUC_DEV633_ecrireLigneTest_(classeId, ligne);
  try { CacheService.getScriptCache().remove('EUC_DEV586_CLASSES'); } catch (e) {}
  plan.ok = true; plan.apercu = false; plan.auteur = ctx && ctx.email || '';
  return plan;
}
/* Formation dont l'apprenti de test reprend les périodes du livret (sans rattachement dans le planning). */
function EUC_DEV633_choisirLigne(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var id = Number(q.classeId), c = EUC_DEV604_lignes_('Classes').filter(function(r) { return Number(r.id) === id; })[0];
  if (!c || !EUC_SUIVI2_classeTest_((c.fields || {}).Nom)) throw new Error('Seule une classe TEST peut recevoir une formation de test.');
  EUC_DEV633_ecrireLigneTest_(id, EUC_DEV633_t_(q.ligne)); return { ok: true };
}

function EUC_DEV633_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  var t = HtmlService.createTemplateFromFile('Banc_Essai_DEV633');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  return t.evaluate().setTitle('Banc d’essai').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
