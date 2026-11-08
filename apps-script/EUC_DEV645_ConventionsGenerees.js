/**
 * DEV645 — « Conventions générées » : toutes les conventions créées par le générateur
 * (table EUC_ACCES_FORMULAIRES_PFMP) pour une année, rangées par niveau puis par classe.
 * La page charge d'abord la structure (niveaux, classes, périodes et effectifs, sans nom),
 * puis seulement la liste demandée : tout, un niveau, une classe ou une période.
 * Réservé à l'administration. Lecture seule.
 */
var EUC_DEV645_ORDRE_ = ['BACPRO|Seconde', 'BACPRO|Première', 'BACPRO|Terminale', 'BACPRO|Autres', 'CAP|1CAP', 'CAP|TCAP', 'BTS|1re année', 'BTS|2e année', 'AUTRES|Autres'];
var EUC_DEV645_FAMILLES_ = { BACPRO: 'BAC PRO', CAP: 'CAP', BTS: 'BTS', AUTRES: 'Autres formations' };
var EUC_DEV645_STATUTS_ = { ENREGISTREE: 'Générée', A_COMPLETER_ENTREPRISE: 'À compléter par l’entreprise', AUTORISEE: 'PFMP autorisée', ANNULEE: 'Annulée', INTERROMPUE: 'Interrompue' };

function EUC_DEV645_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  var t = HtmlService.createTemplateFromFile('Conventions_Generees_DEV645');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  t.annee = EUC_SUIVI2_t_(e && e.parameter && e.parameter.annee);
  return t.evaluate().setTitle('Conventions générées — PFMP').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* Structure seule : aucun nom d'élève. */
function EUC_DEV645_structure(annee) {
  EUC_SUIVI2_exigerAdmin_();
  return EUC_DEV645_structure_(EUC_DEV645_index_(EUC_SUIVI2_modele_(annee), EUC_SUIVI2_lireSources_()));
}

/* q = { niveau, classeId, periode, sansConvention } ; tous facultatifs (rien = toute l'année). */
function EUC_DEV645_lister(annee, q) {
  EUC_SUIVI2_exigerAdmin_();
  return EUC_DEV645_accesQr_(EUC_DEV645_lister_(EUC_DEV645_index_(EUC_SUIVI2_modele_(annee), EUC_SUIVI2_lireSources_()), q || {}), EUC_LIEN_eleve_, EUC_DEV603_codeConvention_);
}

/* DEV648 : page QR de l'élève (par l'enveloppe enregistrer-pfmp) et code écrit sous le QR, pour chaque
 * convention active : l'administration intervient sans réimprimer. Calcul pur (fonctions passées). */
function EUC_DEV645_accesQr_(r, lien, code) {
  (r && r.lignes || []).forEach(function(l) {
    if (!(Number(l.id) > 0) || l.annulee || l.sansConvention) return;
    l.lienQr = lien('page=pfmp&rid=' + Number(l.id));
    try { l.codeQr = code(Number(l.id)); } catch (e) { l.codeQr = ''; }
  });
  return r;
}

function EUC_DEV645_cleNiveau_(c) { return c.famille + '|' + c.niveau; }
function EUC_DEV645_libelleNiveau_(cle) {
  var p = cle.split('|'), f = EUC_DEV645_FAMILLES_[p[0]] || p[0];
  return p[0] === 'AUTRES' ? f : f + ' — ' + p[1];
}
function EUC_DEV645_rangNiveau_(cle) { var i = EUC_DEV645_ORDRE_.indexOf(cle); return i < 0 ? 99 : i; }
/* « PFMP n°2 » et « Stage n°2 » sont la même période d'une année à l'autre de formation. */
function EUC_DEV645_clePeriode_(libelle) { return EUC_SUIVI2_t_(libelle); }

/* Calcul pur : m = modèle du suivi, src = tables brutes. */
function EUC_DEV645_index_(m, src) {
  var F = EUC_SUIVI2_champs_, T = EUC_SUIVI2_t_, D = EUC_SUIVI2_date_, annees = {}, classes = {}, eleves = {};
  (src.annees || []).map(F).forEach(function(a) { annees[String(a.id)] = T(a.Code || a.Libelle); });
  (m.classes || []).forEach(function(c) {
    classes[c.id] = c;
    (c.eleves || []).forEach(function(e) { eleves[e.id] = { id: e.id, libelle: e.libelle, classeId: c.id }; });
  });
  var deLAnnee = function(x) { return [m.annee, ''].indexOf(EUC_SUIVI2_annee_(x.Annee_scolaire, annees)) >= 0; };
  var lignes = [], avec = {};
  (src.dossiers || []).map(F).filter(deLAnnee).forEach(function(a) {
    var code = EUC_SUIVI2_statut_(a);
    if (code === 'SUPPRIMEE') return;
    var eid = EUC_SUIVI2_ref_(a.Eleve), e = eleves[eid], cid = e ? e.classeId : EUC_SUIVI2_ref_(a.Classe_convention), c = classes[cid];
    if (!c) return;
    var periodes = (c.periodes || []).filter(function(p) { return !p.suivi; }), pid = EUC_SUIVI2_ref_(a.Periode);
    var debut = D(a.Date_debut), fin = D(a.Date_fin_reelle || a.Date_fin);
    var p = periodes.filter(function(x) { return x.id === pid; })[0] || (debut && fin ? EUC_SUIVI2_meilleurePeriode_(periodes, debut, fin) : null);
    var annulee = code === 'ANNULEE' || code === 'INTERROMPUE' || a.Revoked === true;
    var l = { id: Number(a.id), eleveId: eid || 0, eleve: e ? e.libelle : (T(a.Eleve_nom) || 'Élève non inscrit cette année'), classeId: c.id, classe: c.nom, niveau: EUC_DEV645_cleNiveau_(c),
      periodeId: p ? p.id : 0, periode: p ? p.libelle : 'Hors période', periodeDebut: p ? p.debut : '9999', debut: debut || (p ? p.debut : ''), fin: fin || (p ? p.fin : ''),
      numero: EUC_SUIVI2_premier_(a.Numero_enregistrement, a.Reference_convention), statut: a.Revoked === true && !annulee ? 'Révoquée' : (EUC_DEV645_STATUTS_[code] || code), annulee: annulee,
      rattrapage: /RATTRAPAGE/i.test(T(a.Type_sequence)), remplacement: /REMPLACEMENT/i.test(T(a.Type_sequence)),
      generee: D(a.Date_creation || a.Date_enregistrement), ms: EUC_DEV643_ms_(a.Date_creation || a.Date_enregistrement), lot: T(a.Lot_generation), auteur: EUC_DEV645_auteur_(a.Auteur),
      saisieEntreprise: D(a.Date_saisie_entreprise), entreprise: EUC_SUIVI2_premier_(a.Entreprise_raison_sociale, a.Entreprise_enseigne) };
    var seq = l.rattrapage || l.remplacement ? T(a.Type_sequence).toUpperCase() + (Number(a.Numero_sequence) || 1) : 'INITIALE';
    l.cle = eid ? eid + '|' + l.periodeId + '|' + seq : 'D' + l.id;
    lignes.push(l);
    if (eid && !annulee) avec[eid + '|' + l.periodeId] = true;
  });
  EUC_DEV645_regrouper_(lignes);
  return { annee: m.annee, classes: classes, lignes: lignes, avec: avec };
}

/* Chaque réimpression depuis le générateur crée une ligne : une seule convention par élève, période et séquence.
 * Celle retenue : active, puis remplie par l'entreprise, puis la plus récente. Les autres sont des générations antérieures. */
function EUC_DEV645_regrouper_(lignes) {
  var groupes = {};
  lignes.forEach(function(l) { (groupes[l.cle] = groupes[l.cle] || []).push(l); });
  Object.keys(groupes).forEach(function(k) {
    var g = groupes[k].sort(function(a, b) { return (a.annulee ? 1 : 0) - (b.annulee ? 1 : 0) || (b.saisieEntreprise || b.entreprise ? 1 : 0) - (a.saisieEntreprise || a.entreprise ? 1 : 0) || b.ms - a.ms || b.id - a.id; });
    g.forEach(function(l, i) { l.generations = g.length; l.anterieure = i > 0; l.principale = g[0].id; });
    /* Historique de toutes les générations, de la première à la dernière : quand, qui, comment. */
    g[0].historique = g.slice().sort(function(a, b) { return a.ms - b.ms || a.id - b.id; }).map(function(l) {
      return { id: l.id, ms: l.ms, date: l.generee, auteur: l.auteur, mode: l.lot ? 'Classe entière' : 'Élève seul', retenue: l.id === g[0].id, saisie: l.saisieEntreprise };
    });
  });
}

/* Adresse du compte du lycée → identifiant lisible (« prenom.nom ») ; vide si non enregistré. */
function EUC_DEV645_auteur_(v) { return EUC_SUIVI2_t_(v).toLowerCase().replace(/@.*$/, ''); }

/* Qui doit avoir une convention pour une période (même calcul que le suivi) :
 * les apprentis n'en ont pas ; pour le P.dif., seulement les élèves qui le font en entreprise. */
function EUC_DEV645_repartition_(ix, c, p) {
  var r = p.resume || {}, apprentis = {}, entreprise = {}, aDefinir = {};
  (r.apprentis || []).forEach(function(id) { apprentis[id] = true; });
  (r.entreprise || []).forEach(function(id) { entreprise[id] = true; });
  (r.aDefinir || []).forEach(function(id) { aDefinir[id] = true; });
  var out = { sans: [], apprentis: [], aDefinir: [] };
  (c.eleves || []).forEach(function(e) {
    if (ix.avec[e.id + '|' + p.id]) return;
    if (apprentis[e.id] && !p.pdif) out.apprentis.push(e);
    else if (p.pdif && aDefinir[e.id]) out.aDefinir.push(e);
    else if (!p.pdif || (entreprise[e.id] && !apprentis[e.id])) out.sans.push(e);
  });
  return out;
}

function EUC_DEV645_structure_(ix) {
  var niveaux = {}, periodes = {};
  Object.keys(ix.classes).forEach(function(k) {
    var c = ix.classes[k], cle = EUC_DEV645_cleNiveau_(c);
    var n = niveaux[cle] = niveaux[cle] || { cle: cle, libelle: EUC_DEV645_libelleNiveau_(cle), rang: EUC_DEV645_rangNiveau_(cle), total: 0, classes: [] };
    var ps = (c.periodes || []).filter(function(p) { return !p.suivi; });
    var x = { id: c.id, nom: c.nom, eleves: (c.eleves || []).length, total: 0, generations: 0, periodes: ps.map(function(p) {
      var pc = EUC_DEV645_clePeriode_(p.libelle); periodes[pc] = true;
      var rp = EUC_DEV645_repartition_(ix, c, p);
      return { id: p.id, libelle: p.libelle, debut: p.debut, fin: p.fin, pdif: !!p.pdif, total: 0, sans: rp.sans.length, apprentis: rp.apprentis.length, aDefinir: rp.aDefinir.length };
    }), horsPeriode: 0 };
    ix.lignes.forEach(function(l) {
      if (l.classeId !== c.id) return;
      x.generations = (x.generations || 0) + 1;
      if (l.anterieure) return;
      x.total++;
      var p = x.periodes.filter(function(y) { return y.id === l.periodeId; })[0];
      if (p) p.total++; else x.horsPeriode++;
    });
    n.total += x.total; n.classes.push(x);
  });
  var l = Object.keys(niveaux).map(function(k) { var n = niveaux[k]; n.classes.sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); }); return n; })
    .sort(function(a, b) { return a.rang - b.rang || a.libelle.localeCompare(b.libelle, 'fr'); });
  return { annee: ix.annee, total: ix.lignes.filter(function(l) { return !l.anterieure; }).length, generations: ix.lignes.length, niveaux: l, periodes: Object.keys(periodes).sort(function(a, b) { return a.localeCompare(b, 'fr', { numeric: true }); }) };
}

function EUC_DEV645_lister_(ix, q) {
  var cid = Number(q.classeId) || 0, niveau = EUC_SUIVI2_t_(q.niveau), periode = EUC_DEV645_clePeriode_(q.periode);
  var garder = function(c) { return (!cid || c.id === cid) && (!niveau || EUC_DEV645_cleNiveau_(c) === niveau); };
  var lignes = ix.lignes.filter(function(l) { var c = ix.classes[l.classeId]; return garder(c) && (q.toutes || !l.anterieure) && (!periode || EUC_DEV645_clePeriode_(l.periode) === periode); });
  var sans = [];
  if (q.sansConvention) Object.keys(ix.classes).forEach(function(k) {
    var c = ix.classes[k]; if (!garder(c)) return;
    (c.periodes || []).filter(function(p) { return !p.suivi && (!periode || EUC_DEV645_clePeriode_(p.libelle) === periode); }).forEach(function(p) {
      var rp = EUC_DEV645_repartition_(ix, c, p);
      [['sans', 'SANS'], ['apprentis', 'APPRENTI'], ['aDefinir', 'PDIF_A_DEFINIR']].forEach(function(k) {
        rp[k[0]].forEach(function(e) { sans.push({ id: 0, eleveId: e.id, eleve: e.libelle, classeId: c.id, classe: c.nom, niveau: EUC_DEV645_cleNiveau_(c), periodeId: p.id, periode: p.libelle, periodeDebut: p.debut, debut: p.debut, fin: p.fin, sansConvention: true, motif: k[1] }); });
      });
    });
  });
  /* Petit « A » : élève apprenti (contrat actif couvrant la période), sur toutes ses lignes de la période. */
  var apprentis = {};
  Object.keys(ix.classes).forEach(function(k) { (ix.classes[k].periodes || []).forEach(function(p) { ((p.resume || {}).apprentis || []).forEach(function(id) { apprentis[id + '|' + p.id] = true; }); }); });
  var tout = lignes.concat(sans), rang = function(l) { return EUC_DEV645_rangNiveau_(l.niveau); };
  tout.sort(function(a, b) { return rang(a) - rang(b) || a.classe.localeCompare(b.classe, 'fr') || String(a.periodeDebut).localeCompare(String(b.periodeDebut)) || a.eleve.localeCompare(b.eleve, 'fr') || (a.sansConvention ? 1 : 0) - (b.sansConvention ? 1 : 0) || String(a.cle).localeCompare(String(b.cle)) || (a.anterieure ? 1 : 0) - (b.anterieure ? 1 : 0) || (b.ms || 0) - (a.ms || 0) || a.id - b.id; });
  tout.forEach(function(l) { l.niveauLibelle = EUC_DEV645_libelleNiveau_(l.niveau); l.apprenti = !!apprentis[l.eleveId + '|' + l.periodeId]; });
  return { annee: ix.annee, conventions: lignes.filter(function(l) { return !l.anterieure; }).length, anterieures: lignes.filter(function(l) { return l.anterieure; }).length,
    sansConvention: sans.filter(function(l) { return l.motif === 'SANS'; }).length, apprentis: sans.filter(function(l) { return l.motif === 'APPRENTI'; }).length, aDefinir: sans.filter(function(l) { return l.motif === 'PDIF_A_DEFINIR'; }).length, lignes: tout };
}
