/**
 * DEV579 — Profil d'apprentissage de chaque classe.
 *
 * Source de vérité : trois colonnes de la table Grist « Classes », remplies par
 * le DDFPT (pré-remplissage possible depuis la page des quotas) :
 *  - Modalite_apprentissage : Classe entière / Mixité / Formation continue ;
 *  - Organisme_gestionnaire : CFA RAN / CFAI / GRETA (gestion administrative) ;
 *  - Organisme_donneur_ordre : CFA RAN / CFAI / GRETA.
 * Le lycée est le terrain d'application. Une classe appartient à chacun de ses
 * organismes : les bulles CFA RAN, CFAI et GRETA se recoupent (données croisées).
 *
 * À défaut de colonne renseignée : réglage DEV579 enregistré, puis table de
 * vérité ci-dessous (validée par le DDFPT le 18/10/2026), puis ancien réglage.
 */
var EUC_DEV579_PROFILS_PROP_ = 'EUC_DEV579_PROFILS';
var EUC_DEV579_ORGANISMES_ = ['CFA RAN', 'CFAI', 'GRETA'];
var EUC_DEV579_COLONNES_ = { modalite: 'Modalite_apprentissage', gestionnaire: 'Organisme_gestionnaire', donneur: 'Organisme_donneur_ordre' };
var EUC_DEV579_MODES_ = { CLASSE_ENTIERE: 'Classe entière', MIXITE: 'Mixité', FORMATION_CONTINUE: 'Formation continue' };

function EUC_DEV579_norm_(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }

function EUC_DEV579_modeDe_(v) {
  var n = EUC_DEV579_norm_(v);
  if (!n) return '';
  if (/^CLASSE ENTIERE|^CLASSE_ENTIERE|^CE$/.test(n) || n === 'CLASSE ENTIERE') return 'CLASSE_ENTIERE';
  if (/^FORMATION CONTINUE|^FC$/.test(n)) return 'FORMATION_CONTINUE';
  if (/^MIXITE/.test(n)) return 'MIXITE';
  return '';
}
function EUC_DEV579_organismeDe_(v) {
  var n = EUC_DEV579_norm_(v);
  if (/^CFA ?RAN/.test(n)) return 'CFA RAN';
  if (/^CFAI/.test(n)) return 'CFAI';
  if (/^GRETA/.test(n)) return 'GRETA';
  return '';
}
function EUC_DEV579_organismesValides_(l) {
  return EUC_DEV579_ORGANISMES_.filter(function(o) { return (l || []).indexOf(o) >= 0; });
}

/* Table de vérité par défaut (gestionnaire, donneur d'ordre). Retourne null si la classe n'y figure pas. */
function EUC_DEV579_profilDefaut_(classe, etab) {
  var n = EUC_DEV579_norm_(classe), e = EUC_DEV579_norm_(etab);
  var CE = 'CLASSE_ENTIERE', MX = 'MIXITE', FC = 'FORMATION_CONTINUE';
  var p = function(mode, g, d) { return { mode: mode, gestionnaire: g, donneur: d || g }; };
  if (/^TP ?MMA\b/.test(n)) return p(FC, 'GRETA');
  if (/^TP ?EEB\b/.test(n)) return p(CE, 'GRETA');
  if (/^(1|T)MELEC G$/.test(n) || /^CQPM\b/.test(n)) return p(CE, 'GRETA', 'CFAI');
  if (e === 'GRETA') return p(CE, 'GRETA');
  if (/^1CAPP$/.test(n) || /^TSEC$/.test(n)) return p(CE, 'CFA RAN');
  if (/^BACHELOR\b/.test(n) || /^[12]BTS ELEC ALT$/.test(n)) return p(CE, 'CFA RAN', 'CFAI');
  if (/^[12]BTS (CPI|CPRP)$/.test(n)) return p(MX, 'CFA RAN', 'CFAI');
  if (/^[12]BTS MV$/.test(n)) return p(MX, 'CFA RAN');
  return null;
}

var EUC_DEV579_PROFILS_MEMO_ = null;
function EUC_DEV579_profilsConfig_() {
  if (EUC_DEV579_PROFILS_MEMO_) return EUC_DEV579_PROFILS_MEMO_;
  try { var p = JSON.parse(PropertiesService.getScriptProperties().getProperty(EUC_DEV579_PROFILS_PROP_) || '{}'); EUC_DEV579_PROFILS_MEMO_ = p && typeof p === 'object' ? p : {}; } catch (e) { EUC_DEV579_PROFILS_MEMO_ = {}; }
  return EUC_DEV579_PROFILS_MEMO_;
}

/* Colonnes de profil lues une fois par exécution dans la table Classes. */
var EUC_DEV579_COLONNES_MEMO_ = null;
function EUC_DEV579_colonnesClasses_() {
  if (EUC_DEV579_COLONNES_MEMO_) return EUC_DEV579_COLONNES_MEMO_;
  var out = {};
  try {
    (typeof EUC_DEV538_records_ === 'function' ? EUC_DEV538_records_('Classes', {}) : []).forEach(function(r) {
      var f = r.fields || r, C = EUC_DEV579_COLONNES_;
      out[String(r.id || f.id)] = { modalite: EUC_DEV579_modeDe_(f[C.modalite]), gestionnaire: EUC_DEV579_organismeDe_(f[C.gestionnaire]), donneur: EUC_DEV579_organismeDe_(f[C.donneur]) };
    });
  } catch (e) {}
  EUC_DEV579_COLONNES_MEMO_ = out;
  return out;
}

function EUC_DEV579_fabrique_(mode, g, d, source) {
  return { mode: mode, gestionnaire: g || '', donneur: d || '', organismes: EUC_DEV579_organismesValides_([g, d]), source: source };
}

/* Profil effectif d'une classe pour une année. */
function EUC_DEV579_profil_(config, annee, classId, classe, etab, ancienMode) {
  var col = EUC_DEV579_colonnesClasses_()[String(classId)], d = EUC_DEV579_profilDefaut_(classe, etab);
  if (col && (col.modalite || col.gestionnaire || col.donneur)) {
    return EUC_DEV579_fabrique_(col.modalite || (d && d.mode) || 'MIXITE', col.gestionnaire, col.donneur || col.gestionnaire, 'GRIST');
  }
  var saved = config && config[annee] && config[annee][String(classId)];
  if (saved && saved.mode && (saved.organismes || []).length) { var o = EUC_DEV579_organismesValides_(saved.organismes); return EUC_DEV579_fabrique_(saved.mode, o[0], o[1] || o[0], 'REGLAGE'); }
  if (d) return EUC_DEV579_fabrique_(d.mode, d.gestionnaire, d.donneur, 'TABLE');
  return EUC_DEV579_fabrique_(ancienMode === 'CLASSE_ENTIERE' ? 'CLASSE_ENTIERE' : 'MIXITE', '', '', 'ANCIEN');
}

/* Page des quotas : la modalité y reste réglable (les organismes se règlent dans Grist). */
function EUC_DEV579_enregistrerProfils_(annee, lignes) {
  var all = EUC_DEV579_profilsConfig_(), an = all[annee] || {};
  (lignes || []).forEach(function(r) {
    var id = Number(r.classeId); if (!id) return;
    var mode = String(r.mode || '').toUpperCase();
    an[id] = { mode: EUC_DEV579_MODES_[mode] ? mode : 'MIXITE', organismes: (an[id] && an[id].organismes) || [] };
  });
  all[annee] = an;
  PropertiesService.getScriptProperties().setProperty(EUC_DEV579_PROFILS_PROP_, JSON.stringify(all));
  EUC_DEV579_PROFILS_MEMO_ = all;
}

/* Toutes les classes actives (table Classes), au format des compteurs d'apprentissage.
 * La structure du suivi PFMP ne contient que les classes ayant des périodes : Bachelor,
 * classes du GRETA ou de formation continue y manquaient. */
function EUC_DEV579_classesCompletes_(annee) {
  var base = typeof EUC_DEV541_apprentissageClasses_ === 'function' ? (EUC_DEV541_apprentissageClasses_(annee) || []) : [], vus = {};
  base.forEach(function(c) { vus[String(c.id)] = true; });
  var rows = [];
  try { rows = typeof EUC_IMPORT_chargerClassesCamin_ === 'function' ? EUC_IMPORT_chargerClassesCamin_() : []; } catch (e) { rows = []; }
  rows.forEach(function(r) {
    if (!r || r.actif === false || vus[String(r.id)] || !r.nom) return;
    var classe = String(r.nom).trim(), up = classe.toUpperCase(), special = typeof EUC_DEV564_training_ === 'function' ? EUC_DEV564_training_({ classe: classe, famille: '' }, '') : null;
    var famille = special && special.famille ? special.famille : /BTS/.test(up) ? 'BTS' : /CAP/.test(up) ? 'CAP' : /BACHELOR|CQPM|^TP/.test(up) ? 'AUTRES_FORMATIONS' : 'BACPRO';
    var niveau = typeof EUC_DEV538_level_ === 'function' ? EUC_DEV538_level_({ classe: classe, famille: famille, niveau: r.niveau }) : String(r.niveau || '');
    base.push({ id: Number(r.id), classe: classe, famille: famille, niveau: niveau, etablissement: String(r.etab || '') });
    vus[String(r.id)] = true;
  });
  return base;
}

/* Pré-remplissage des trois colonnes dans Grist (cases vides seulement), d'après la table de vérité. */
function EUC_DEV579_ecrireTableClasses(q) {
  if (typeof EUC_SUIVI2_exigerAdmin_ === 'function') EUC_SUIVI2_exigerAdmin_();
  q = q || {};
  var C = EUC_DEV579_COLONNES_, cols = (EUC_ENT_grist('get', '/tables/Classes/columns').columns || []).map(function(c) { return c.id; });
  var manquantes = [[C.modalite, 'Modalité apprentissage', ['Classe entière', 'Mixité', 'Formation continue']], [C.gestionnaire, 'Organisme gestionnaire', EUC_DEV579_ORGANISMES_], [C.donneur, 'Organisme donneur d’ordre', EUC_DEV579_ORGANISMES_]].filter(function(c) { return cols.indexOf(c[0]) < 0; });
  var lignes = [];
  (EUC_ENT_grist('get', '/tables/Classes/records').records || []).forEach(function(r) {
    var f = r.fields || {}, d = EUC_DEV579_profilDefaut_(f.Nom || f.Libelle, f.Etab); if (!d) return;
    var champs = {};
    if (!EUC_DEV579_modeDe_(f[C.modalite])) champs[C.modalite] = EUC_DEV579_MODES_[d.mode];
    if (!EUC_DEV579_organismeDe_(f[C.gestionnaire])) champs[C.gestionnaire] = d.gestionnaire;
    if (!EUC_DEV579_organismeDe_(f[C.donneur])) champs[C.donneur] = d.donneur;
    if (Object.keys(champs).length) lignes.push({ id: r.id, classe: f.Nom || f.Libelle, fields: champs });
  });
  var res = { ok: true, colonnesACreer: manquantes.map(function(c) { return c[0]; }), lignes: lignes.length, exemples: lignes.slice(0, 15).map(function(l) { return l.classe + ' : ' + Object.keys(l.fields).map(function(k) { return l.fields[k]; }).join(' / '); }), apercu: q.confirmation !== 'ECRIRE' };
  if (res.apercu) return res;
  if (manquantes.length) EUC_ENT_grist('post', '/tables/Classes/columns', { columns: manquantes.map(function(c) { return { id: c[0], fields: { label: c[1], type: 'Choice', widgetOptions: JSON.stringify({ choices: c[2] }) } }; }) });
  for (var i = 0; i < lignes.length; i += 100) EUC_ENT_grist('patch', '/tables/Classes/records', { records: lignes.slice(i, i + 100).map(function(l) { return { id: l.id, fields: l.fields }; }) });
  return res;
}

/* Bandeau, bulles et bilan compact de la gestion des apprentis (moteur du suivi des apprentis). */
function EUC_DEV579_bandeau(annee) {
  var m = EUC_DEV577_modele_(annee), admin = false;
  try { admin = !!(typeof EUC_V156_contexteAdmin_ === 'function' && EUC_V156_contexteAdmin_()); } catch (e) { admin = false; }
  /* Entreprise de chaque apprenti, d'après les cartes du suivi (nom → entreprise, par classe). */
  var entreprise = {};
  Object.keys(m.cartes || {}).forEach(function(cid) { (m.cartes[cid] || []).forEach(function(c) { entreprise[cid + '|' + c.eleve] = c.fiche && (c.fiche.enseigne || c.fiche.entreprise) || ''; }); });
  var personne = function(cid, nom) { return admin ? { nom: nom, entreprise: entreprise[cid + '|' + nom] || '' } : null; };
  var vide = function() { return { mixite: 0, classeEntiere: 0 }; };
  var t = { apprentis: 0, classeEntiere: 0, mixite: 0, formationContinue: 0, futurs: vide(), distribues: vide(), rapportes: vide(), transmisCfa: vide(), contratsValides: vide(), ruptures: vide() };
  var orgs = {}, classes = [], compact = {};
  EUC_DEV579_ORGANISMES_.concat(['Non renseigné']).forEach(function(o) { orgs[o] = { organisme: o, classeEntiere: 0, mixite: 0, formationContinue: 0, classes: [] }; });
  var n = function(l, k) { return (l.noms && l.noms[k] || []).length; };
  (m.groupes || []).forEach(function(g) { (g.lignes || []).forEach(function(l) {
    if (l.active === false) return;
    var mode = l.mode || 'MIXITE', ce = mode === 'CLASSE_ENTIERE', fc = mode === 'FORMATION_CONTINUE', k = ce ? 'classeEntiere' : 'mixite';
    var apprentis = n(l, 'apprentis');
    var fiche = { classeId: l.classeId, classe: l.classe, niveau: l.niveau, diplome: g.diplome, famille: g.famille, mode: mode, gestionnaire: l.gestionnaire || '', donneur: l.donneur || '', organismes: l.organismes || [], effectif: l.effectif, quota: l.quota,
      apprentis: apprentis, futurs: n(l, 'futurs'), rapportes: n(l, 'rapportes'), ruptures: n(l, 'ruptures'),
      enContrat: (l.noms.apprentis || []).map(function(x) { return personne(l.classeId, x); }).filter(Boolean),
      sansEntreprise: (l.noms.futurs || []).concat(l.noms.ruptures || []).map(function(x) { return personne(l.classeId, x); }).filter(Boolean) };
    if (fc) { t.formationContinue += l.effectif; }
    else {
      t.apprentis += apprentis; t[k] += apprentis;
      ['futurs', 'distribues', 'rapportes', 'transmisCfa', 'contratsValides', 'ruptures'].forEach(function(c) { t[c][k] += n(l, c); });
    }
    var liste = fiche.organismes.length ? fiche.organismes : ['Non renseigné'];
    liste.forEach(function(o) { var x = orgs[o]; if (fc) x.formationContinue += l.effectif; else x[k] += apprentis; x.classes.push(fiche); });
    if (ce || fc) classes.push(fiche);
    else (compact[g.diplome] = compact[g.diplome] || { diplome: g.diplome, famille: g.famille, lignes: [] }).lignes.push({ classe: l.classe, organismes: fiche.organismes.join(' + ') || 'Non renseigné', effectif: l.effectif, quota: l.quota, apprentis: apprentis, futurs: fiche.futurs, rapportes: fiche.rapportes, potentiel: apprentis + fiche.futurs, classeId: l.classeId, enContrat: fiche.enContrat });
  }); });
  /* Vignettes rapprochées : par organisme gestionnaire, puis diplôme, puis niveau (1BTS à côté de 2BTS). */
  var rang = { 'CFA RAN': 1, 'CFAI': 2, 'GRETA': 3 };
  classes.sort(function(a, b) { return (rang[a.gestionnaire] || 9) - (rang[b.gestionnaire] || 9) || String(a.diplome).localeCompare(String(b.diplome), 'fr') || a.classe.localeCompare(b.classe, 'fr'); });
  return { ok: true, annee: m.annee, calculeLe: m.calculeLe, admin: admin, totaux: t,
    organismes: Object.keys(orgs).map(function(o) { return orgs[o]; }).filter(function(o) { return o.classes.length; }),
    classesEntieres: classes,
    compact: Object.keys(compact).map(function(k) { return compact[k]; }).sort(function(a, b) { return String(a.famille).localeCompare(String(b.famille)) || a.diplome.localeCompare(b.diplome, 'fr'); }) };
}
