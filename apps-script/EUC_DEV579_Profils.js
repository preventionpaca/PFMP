/**
 * DEV579 — Profil d'apprentissage de chaque classe : modalité (classe entière
 * ou mixité) et organismes partenaires (CFA RAN, CFAI, GRETA).
 *
 * Ordre de priorité : réglage enregistré sur la page des quotas (propriété
 * EUC_DEV579_PROFILS) > table de vérité ci-dessous (validée par le DDFPT le
 * 18/10/2026) > ancien réglage de modalité (DEV545, mixité par défaut).
 *
 * Le bandeau de la gestion des apprentis en découle : apprentis par modalité et
 * par organisme, dossiers remis séparés entre mixité et classe entière.
 */
var EUC_DEV579_PROFILS_PROP_ = 'EUC_DEV579_PROFILS';
var EUC_DEV579_ORGANISMES_ = ['CFA RAN', 'CFAI', 'GRETA'];

function EUC_DEV579_norm_(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }

/* Table de vérité par défaut. Retourne null si la classe n'y figure pas. */
function EUC_DEV579_profilDefaut_(classe, etab) {
  var n = EUC_DEV579_norm_(classe), e = EUC_DEV579_norm_(etab);
  var CE = 'CLASSE_ENTIERE', MX = 'MIXITE';
  if (e === 'GRETA' || /^(1|T)MELEC G$/.test(n) || /^CQPM\b/.test(n) || /^TP ?MMA\b/.test(n) || /^TP ?EEB\b/.test(n)) return { mode: CE, organismes: ['GRETA'] };
  if (/^1CAPP$/.test(n)) return { mode: CE, organismes: ['CFA RAN'] };
  if (/^BACHELOR\b/.test(n) || /^[12]BTS ELEC ALT$/.test(n)) return { mode: CE, organismes: ['CFA RAN', 'CFAI'] };
  if (/^TSEC$/.test(n)) return { mode: CE, organismes: ['CFA RAN'] };
  if (/^[12]BTS (CPI|CPRP)$/.test(n)) return { mode: MX, organismes: ['CFA RAN', 'CFAI'] };
  if (/^[12]BTS MV$/.test(n)) return { mode: MX, organismes: ['CFA RAN'] };
  return null;
}

var EUC_DEV579_PROFILS_MEMO_ = null;
function EUC_DEV579_profilsConfig_() {
  if (EUC_DEV579_PROFILS_MEMO_) return EUC_DEV579_PROFILS_MEMO_;
  try { var p = JSON.parse(PropertiesService.getScriptProperties().getProperty(EUC_DEV579_PROFILS_PROP_) || '{}'); EUC_DEV579_PROFILS_MEMO_ = p && typeof p === 'object' ? p : {}; } catch (e) { EUC_DEV579_PROFILS_MEMO_ = {}; }
  return EUC_DEV579_PROFILS_MEMO_;
}

function EUC_DEV579_organismesValides_(l) {
  return EUC_DEV579_ORGANISMES_.filter(function(o) { return (l || []).indexOf(o) >= 0; });
}

/* Profil effectif d'une classe pour une année. */
function EUC_DEV579_profil_(config, annee, classId, classe, etab, ancienMode) {
  var saved = config && config[annee] && config[annee][String(classId)];
  if (saved && saved.mode) return { mode: saved.mode === 'CLASSE_ENTIERE' ? 'CLASSE_ENTIERE' : 'MIXITE', organismes: EUC_DEV579_organismesValides_(saved.organismes), source: 'REGLAGE' };
  var d = EUC_DEV579_profilDefaut_(classe, etab);
  if (d) return { mode: d.mode, organismes: d.organismes, source: 'TABLE' };
  return { mode: ancienMode === 'CLASSE_ENTIERE' ? 'CLASSE_ENTIERE' : 'MIXITE', organismes: [], source: 'ANCIEN' };
}

/* Enregistrement depuis la page des quotas : { classeId, mode, organismes[] } par ligne. */
function EUC_DEV579_enregistrerProfils_(annee, lignes) {
  var all = EUC_DEV579_profilsConfig_(), an = {};
  (lignes || []).forEach(function(r) {
    var id = Number(r.classeId); if (!id) return;
    an[id] = { mode: String(r.mode || '').toUpperCase() === 'CLASSE_ENTIERE' ? 'CLASSE_ENTIERE' : 'MIXITE', organismes: EUC_DEV579_organismesValides_(r.organismes) };
  });
  all[annee] = an;
  PropertiesService.getScriptProperties().setProperty(EUC_DEV579_PROFILS_PROP_, JSON.stringify(all));
  EUC_DEV579_PROFILS_MEMO_ = all;
}

/* Libellé d'un regroupement d'organismes : « CFA RAN + CFAI », « GRETA », « Non renseigné ». */
function EUC_DEV579_regroupement_(organismes) {
  var l = EUC_DEV579_organismesValides_(organismes);
  return l.length ? l.join(' + ') : 'Non renseigné';
}

/* Bandeau et bilan compact de la gestion des apprentis (même moteur que le suivi des apprentis). */
function EUC_DEV579_bandeau(annee) {
  var m = EUC_DEV577_modele_(annee), lignes = [];
  (m.groupes || []).forEach(function(g) { (g.lignes || []).forEach(function(l) { if (l.active !== false) lignes.push({ diplome: g.diplome, famille: g.famille, l: l }); }); });
  var t = { apprentis: 0, classeEntiere: 0, mixite: 0, futurs: 0, potentiels: 0, rapportesCE: 0, rapportesMixite: 0, transmisCfa: 0, contratsValides: 0, ruptures: 0, effectif: 0, quota: 0 }, groupes = {};
  var compte = function(l, k) { return (l.noms && l.noms[k] || []).length; };
  lignes.forEach(function(x) {
    var l = x.l, ce = l.mode === 'CLASSE_ENTIERE', a = compte(l, 'apprentis'), reg = EUC_DEV579_regroupement_(l.organismes);
    t.apprentis += a; t[ce ? 'classeEntiere' : 'mixite'] += a;
    t.futurs += compte(l, 'futurs'); t.potentiels += compte(l, 'potentiels'); t.transmisCfa += compte(l, 'transmisCfa');
    t.contratsValides += compte(l, 'contratsValides'); t.ruptures += compte(l, 'ruptures');
    t[ce ? 'rapportesCE' : 'rapportesMixite'] += compte(l, 'rapportes');
    if (!ce) { t.effectif += l.effectif; t.quota += l.quota; }
    var gr = groupes[reg] = groupes[reg] || { regroupement: reg, classeEntiere: 0, mixite: 0 };
    gr[ce ? 'classeEntiere' : 'mixite'] += a;
  });
  var ordre = ['GRETA', 'CFAI + GRETA', 'CFA RAN + CFAI', 'CFA RAN', 'CFA RAN + GRETA', 'CFA RAN + CFAI + GRETA', 'CFAI', 'Non renseigné'];
  var parOrganisme = Object.keys(groupes).map(function(k) { return groupes[k]; }).sort(function(a, b) { var i = ordre.indexOf(a.regroupement), j = ordre.indexOf(b.regroupement); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || a.regroupement.localeCompare(b.regroupement, 'fr'); });
  /* Bilan compact : classes en mixité, par diplôme. */
  var compact = {};
  lignes.forEach(function(x) {
    var l = x.l; if (l.mode === 'CLASSE_ENTIERE') return;
    var a = compte(l, 'apprentis'), f = compte(l, 'futurs');
    (compact[x.diplome] = compact[x.diplome] || { diplome: x.diplome, famille: x.famille, lignes: [] }).lignes.push({ classe: l.classe, niveau: l.niveau, effectif: l.effectif, quota: l.quota, apprentis: a, futurs: f, rapportes: compte(l, 'rapportes'), potentiel: a + f, organismes: EUC_DEV579_regroupement_(l.organismes) });
  });
  /* Classes entières : une vignette par classe (en contrat / sans entreprise). */
  var entieres = lignes.filter(function(x) { return x.l.mode === 'CLASSE_ENTIERE'; }).map(function(x) {
    var l = x.l; return { classeId: l.classeId, classe: l.classe, diplome: x.diplome, organismes: EUC_DEV579_regroupement_(l.organismes), effectif: l.effectif, enContrat: l.noms.apprentis || [], sansEntreprise: (l.noms.futurs || []).concat(l.noms.ruptures || []) };
  }).sort(function(a, b) { return a.classe.localeCompare(b.classe, 'fr'); });
  /* Noms des apprentis réservés à l'administration (la page en lecture seule n'en reçoit aucun). */
  var admin = false;
  try { admin = !!(typeof EUC_V156_contexteAdmin_ === 'function' && EUC_V156_contexteAdmin_()); } catch (e) { admin = false; }
  if (!admin) entieres.forEach(function(c) { c.enContrat = c.enContrat.length; c.sansEntreprise = c.sansEntreprise.length; });
  return { ok: true, annee: m.annee, calculeLe: m.calculeLe, admin: admin, totaux: t, parOrganisme: parOrganisme,
    compact: Object.keys(compact).map(function(k) { return compact[k]; }).sort(function(a, b) { return String(a.famille).localeCompare(String(b.famille)) || a.diplome.localeCompare(b.diplome, 'fr'); }),
    classesEntieres: entieres };
}
