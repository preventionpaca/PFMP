/**
 * DEV620 — EPI : réglages (pièces, tailles, tenues, classes → tenue), vagues de commande, essayage par classe,
 * élèves hors Pronote (rattachés plus tard), table des administratifs.
 * Lecture seule des élèves (EUC_ELEVES_PFMP), des classes et des professeurs ; écriture dans les seules tables EUC_EPI_*
 * et EUC_ADMINISTRATIFS. Aucune suppression : une ligne retirée est désactivée.
 */

var EUC_DEV620_T_ = { pieces: 'EUC_EPI_PIECES', tenues: 'EUC_EPI_TENUES', classes: 'EUC_EPI_CLASSES_TENUES', vagues: 'EUC_EPI_VAGUES', essayages: 'EUC_EPI_ESSAYAGES', administratifs: 'EUC_ADMINISTRATIFS' };

/* ===================== Calcul pur ===================== */

function EUC_DEV620_t_(v) { return v == null ? '' : String(v).trim(); }
function EUC_DEV620_n_(v) { return EUC_DEV620_t_(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, ''); }
/* Liste de tailles saisie « 1, 2, 3 » ou « S;M;L » → tableau ordonné, sans doublon. */
function EUC_DEV620_tailles_(v) {
  var vus = {}, out = [];
  (Array.isArray(v) ? v : EUC_DEV620_t_(v).split(/[,;\n]+/)).forEach(function(x) { var t = EUC_DEV620_t_(x).toUpperCase(); if (t && !vus[t]) { vus[t] = 1; out.push(t); } });
  return out;
}
/* Pièces, grilles de tailles et tenues proposées au premier lancement (modifiables dans les réglages). */
var EUC_DEV620_PIECES_DEFAUT_ = [
  ['COMBINAISON', 'Combinaison', '1, 2, 3, 4'], ['BLOUSON', 'Blouson', 'S, M, L, XL, XXL'], ['PANTALON', 'Pantalon', 'S, M, L, XL, XXL'],
  ['BLOUSON_SANS_MANCHES', 'Blouson sans manches', 'S, M, L, XL, XXL'], ['BLOUSE', 'Blouse blanche', '1, 2, 3, 4, 5'],
  ['CHAUSSURES', 'Chaussures de sécurité', '35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48']
];
var EUC_DEV620_TENUES_DEFAUT_ = [
  ['COMBINAISON', 'Combinaison + chaussures', 'COMBINAISON, CHAUSSURES'], ['BLOUSE', 'Blouse blanche + chaussures', 'BLOUSE, CHAUSSURES'],
  ['BLOUSON_PANTALON', 'Blouson + pantalon + chaussures', 'BLOUSON, PANTALON, CHAUSSURES'],
  ['ETE', 'Blouson sans manches + pantalon + chaussures (été)', 'BLOUSON_SANS_MANCHES, PANTALON, CHAUSSURES'],
  ['CHAUSSURES', 'Chaussures seules', 'CHAUSSURES']
];
/* Tailles d'un essayage contrôlées contre la tenue : seules les pièces de la tenue, et les tailles de leur grille. */
function EUC_DEV620_taillesValides_(tailles, tenue, piecesParCode) {
  var out = {}, erreurs = [];
  ((tenue && tenue.pieces) || []).forEach(function(c) {
    var v = EUC_DEV620_t_((tailles || {})[c]).toUpperCase(); if (!v) return;
    var p = piecesParCode[c]; if (!p) return;
    if (p.tailles.length && p.tailles.indexOf(v) < 0) erreurs.push(p.libelle + ' : taille « ' + v + ' » hors grille'); else out[c] = v;
  });
  return { tailles: out, erreurs: erreurs };
}
/* Promotion affichée sur l'étiquette : année d'entrée → année de sortie selon la durée du cycle (2 ans par défaut,
 * 3 ans en BAC PRO à partir de la seconde, 1 an pour un niveau terminal). */
function EUC_DEV620_promotion_(classeNom, annee) {
  var y = Number(String(annee || '').slice(0, 4)) || 0; if (!y) return '';
  var n = EUC_DEV620_n_(classeNom), duree = 2, rang = 1;
  if (/^2/.test(n) && !/BTS/.test(n)) { duree = 3; rang = 1; }
  else if (/^1/.test(n) && !/BTS|CAP/.test(n)) { duree = 3; rang = 2; }
  else if (/^T/.test(n)) { duree = /CAP/.test(n) ? 2 : 3; rang = duree; }
  else if (/^2BTS/.test(n)) { duree = 2; rang = 2; }
  var debut = y - (rang - 1);
  return debut + '-' + (debut + duree);
}

/* ===================== Grist ===================== */

function EUC_DEV620_lire_(table) { try { return EUC_ENT_grist('get', '/tables/' + table + '/records').records || []; } catch (e) { return []; } }
function EUC_DEV620_ecrire_(methode, table, records) {
  if (typeof EUC_DEV610_ecrire_ === 'function') return EUC_DEV610_ecrire_(methode, table, records);
  var ids = []; for (var i = 0; i < records.length; i += 200) { var r = EUC_ENT_grist(methode, '/tables/' + table + '/records', { records: records.slice(i, i + 200) }) || {}; (r.records || []).forEach(function(x) { ids.push(x.id); }); } return ids;
}
function EUC_DEV620_def_() {
  var c = EUC_DEV441_col_, d = {};
  d[EUC_DEV620_T_.pieces] = [c('Code', 'Code'), c('Libelle', 'Libellé'), c('Tailles', 'Tailles (liste ordonnée)'), c('Ordre', 'Ordre', 'Int'), c('Actif', 'Actif', 'Bool')];
  d[EUC_DEV620_T_.tenues] = [c('Code', 'Code'), c('Libelle', 'Libellé'), c('Pieces', 'Pièces (codes)'), c('Ordre', 'Ordre', 'Int'), c('Actif', 'Actif', 'Bool')];
  d[EUC_DEV620_T_.classes] = [c('Annee_scolaire', 'Année scolaire'), c('Classe', 'Classe', 'Ref:Classes'), c('Tenue', 'Tenue (code)'), c('Date_modification', 'Date modification')];
  d[EUC_DEV620_T_.vagues] = [c('Annee_scolaire', 'Année scolaire'), c('Numero', 'Numéro', 'Int'), c('Libelle', 'Libellé'), c('Date_commande', 'Date de commande', 'Date'), c('Statut', 'Statut'), c('Actif', 'Actif', 'Bool')];
  d[EUC_DEV620_T_.essayages] = [c('Annee_scolaire', 'Année scolaire'), c('Vague', 'Vague', 'Int'), c('Eleve', 'Élève', 'Ref:EUC_ELEVES_PFMP'), c('Provisoire', 'Hors Pronote', 'Bool'), c('Nom', 'Nom'), c('Prenom', 'Prénom'),
    c('Classe', 'Classe', 'Ref:Classes'), c('Classe_texte', 'Classe ou formation (hors Pronote)'), c('Tenue', 'Tenue (code)'), c('Tailles', 'Tailles (JSON par pièce)'), c('Professeur', 'Professeur de l’essayage'),
    c('Saisi_par', 'Saisi par'), c('Date_saisie', 'Date de saisie'), c('Remis_le', 'Remis le', 'Date'), c('Statut', 'Statut'), c('Commentaire', 'Commentaire'), c('Actif', 'Actif', 'Bool')];
  d[EUC_DEV620_T_.administratifs] = [c('Nom', 'Nom'), c('Prenom', 'Prénom'), c('Fonction', 'Fonction'), c('Service', 'Service'), c('Email', 'Courriel'), c('Telephone', 'Téléphone'), c('Actif', 'Actif', 'Bool'), c('Date_modification', 'Date modification')];
  return d;
}
var EUC_DEV620_CACHE_ = 'EUC_DEV620_TABLES1';
function EUC_DEV620_tables_() {
  var cache = CacheService.getScriptCache(); if (cache.get(EUC_DEV620_CACHE_)) return;
  var def = EUC_DEV620_def_(), ids = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; });
  var manquantes = Object.keys(def).filter(function(t) { return ids.indexOf(t) < 0; });
  if (manquantes.length) EUC_ENT_grist('post', '/tables', { tables: manquantes.map(function(t) { return { id: t, columns: def[t] }; }) });
  /* Colonnes ajoutées au fil des versions : créées si absentes. */
  Object.keys(def).forEach(function(t) { if (manquantes.indexOf(t) >= 0) return;
    var cols = (EUC_ENT_grist('get', '/tables/' + t + '/columns').columns || []).map(function(c) { return c.id; }), aj = def[t].filter(function(c) { return cols.indexOf(c.id) < 0; });
    if (aj.length) EUC_ENT_grist('post', '/tables/' + t + '/columns', { columns: aj }); });
  if (!EUC_DEV620_lire_(EUC_DEV620_T_.pieces).length) EUC_DEV620_ecrire_('post', EUC_DEV620_T_.pieces, EUC_DEV620_PIECES_DEFAUT_.map(function(p, i) { return { fields: { Code: p[0], Libelle: p[1], Tailles: p[2], Ordre: (i + 1) * 10, Actif: true } }; }));
  if (!EUC_DEV620_lire_(EUC_DEV620_T_.tenues).length) EUC_DEV620_ecrire_('post', EUC_DEV620_T_.tenues, EUC_DEV620_TENUES_DEFAUT_.map(function(p, i) { return { fields: { Code: p[0], Libelle: p[1], Pieces: p[2], Ordre: (i + 1) * 10, Actif: true } }; }));
  cache.put(EUC_DEV620_CACHE_, '1', 21600);
}
function EUC_DEV620_ref_(v) { return typeof EUC_SUIVI2_ref_ === 'function' ? EUC_SUIVI2_ref_(v) : (Array.isArray(v) ? Number(v[1]) : Number(v) || 0); }
function EUC_DEV620_pieces_() {
  return EUC_DEV620_lire_(EUC_DEV620_T_.pieces).map(function(r) { var f = r.fields || {}; return { id: Number(r.id), code: EUC_DEV620_t_(f.Code), libelle: EUC_DEV620_t_(f.Libelle) || EUC_DEV620_t_(f.Code), tailles: EUC_DEV620_tailles_(f.Tailles), ordre: Number(f.Ordre) || 0, actif: f.Actif !== false }; })
    .filter(function(p) { return p.code; }).sort(function(a, b) { return a.ordre - b.ordre; });
}
function EUC_DEV620_tenues_() {
  return EUC_DEV620_lire_(EUC_DEV620_T_.tenues).map(function(r) { var f = r.fields || {}; return { id: Number(r.id), code: EUC_DEV620_t_(f.Code), libelle: EUC_DEV620_t_(f.Libelle) || EUC_DEV620_t_(f.Code), pieces: EUC_DEV620_t_(f.Pieces).split(/\s*,\s*/).filter(Boolean), ordre: Number(f.Ordre) || 0, actif: f.Actif !== false }; })
    .filter(function(p) { return p.code; }).sort(function(a, b) { return a.ordre - b.ordre; });
}
function EUC_DEV620_annees_() { return typeof EUC_DEV610_annees_ === 'function' ? EUC_DEV610_annees_() : []; }
function EUC_DEV620_anneeDe_(v, annees) { return typeof EUC_DEV610_codeAnnee_ === 'function' ? EUC_DEV610_codeAnnee_(v, annees) : (EUC_DEV620_t_(v).match(/20\d{2}-20\d{2}/) || [''])[0]; }
function EUC_DEV620_essayages_(annee) {
  return EUC_DEV620_lire_(EUC_DEV620_T_.essayages).map(function(r) { var f = r.fields || {}, t = {}; try { t = JSON.parse(f.Tailles || '{}') || {}; } catch (e) {}
    return { id: Number(r.id), annee: EUC_DEV620_t_(f.Annee_scolaire), vague: Number(f.Vague) || 0, eleveId: EUC_DEV620_ref_(f.Eleve), provisoire: f.Provisoire === true, nom: EUC_DEV620_t_(f.Nom), prenom: EUC_DEV620_t_(f.Prenom),
      classeId: EUC_DEV620_ref_(f.Classe), classeTexte: EUC_DEV620_t_(f.Classe_texte), tenue: EUC_DEV620_t_(f.Tenue), tailles: t, professeur: EUC_DEV620_t_(f.Professeur), saisiPar: EUC_DEV620_t_(f.Saisi_par),
      dateSaisie: EUC_DEV620_t_(f.Date_saisie), remisLe: typeof EUC_SUIVI2_date_ === 'function' ? EUC_SUIVI2_date_(f.Remis_le) : '', statut: EUC_DEV620_t_(f.Statut) || 'ESSAYE', commentaire: EUC_DEV620_t_(f.Commentaire), actif: f.Actif !== false }; })
    .filter(function(x) { return x.actif && x.annee === annee; });
}

/* ===================== Services de la page ===================== */

function EUC_DEV620_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  var t = HtmlService.createTemplateFromFile('Epi_DEV620'), prm = (e && e.parameter) || {};
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  t.onglet = EUC_DEV620_t_(prm.onglet).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 30);
  t.codeClient = [EUC_DEV620_t_, EUC_DEV620_n_, EUC_DEV620_tailles_, EUC_DEV620_taillesValides_, EUC_DEV620_promotion_].map(String).join('\n');
  return t.evaluate().setTitle('EPI et étiquettes').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function EUC_DEV620_charger(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV620_tables_();
  var annees = EUC_DEV620_annees_(), courante = typeof EUC_SUIVI2_anneeCourante_ === 'function' ? EUC_SUIVI2_anneeCourante_(EUC_SUIVI2_aujourdhui_()) : '';
  var code = EUC_DEV620_t_(q.annee) || courante || (annees[annees.length - 1] || {}).code || '';
  var classes = (typeof EUC_DEV610_classes_ === 'function' ? EUC_DEV610_classes_() : []).filter(function(c) { return c.actif && !/^TEST/.test(EUC_DEV620_n_(c.nom)); }).map(function(c) { return { id: c.id, nom: c.nom }; });
  var eleves = [];
  EUC_DEV620_lire_('EUC_ELEVES_PFMP').forEach(function(r) { var f = r.fields || {};
    if (f.Actif === false || f.Present_dernier_import === false || EUC_DEV620_n_(f.Statut_scolarite) === 'SORTI') return;
    var an = EUC_DEV620_anneeDe_(f.Annee_scolaire, annees); if (an && an !== code) return;
    var cid = EUC_DEV620_ref_(f.Classe); if (!cid) return;
    eleves.push({ id: Number(r.id), nom: EUC_DEV620_t_(f.Nom), prenom: EUC_DEV620_t_(f.Prenom_usage || f.Prenom), classeId: cid }); });
  eleves.sort(function(a, b) { return (a.nom + ' ' + a.prenom).localeCompare(b.nom + ' ' + b.prenom, 'fr'); });
  var liens = {}; EUC_DEV620_lire_(EUC_DEV620_T_.classes).forEach(function(r) { var f = r.fields || {}; if (EUC_DEV620_t_(f.Annee_scolaire) !== code) return; var cid = EUC_DEV620_ref_(f.Classe); if (cid) liens[cid] = { id: Number(r.id), tenue: EUC_DEV620_t_(f.Tenue) }; });
  var vagues = EUC_DEV620_lire_(EUC_DEV620_T_.vagues).map(function(r) { var f = r.fields || {}; return { id: Number(r.id), annee: EUC_DEV620_t_(f.Annee_scolaire), numero: Number(f.Numero) || 0, libelle: EUC_DEV620_t_(f.Libelle), date: typeof EUC_SUIVI2_date_ === 'function' ? EUC_SUIVI2_date_(f.Date_commande) : '', statut: EUC_DEV620_t_(f.Statut) || 'OUVERTE', actif: f.Actif !== false }; })
    .filter(function(v) { return v.actif && v.annee === code; }).sort(function(a, b) { return a.numero - b.numero; });
  var profs = EUC_DEV620_lire_('EUC_PROFESSEURS_PFMP').map(function(r) { var f = r.fields || {}; return f.Actif === false ? '' : [EUC_DEV620_t_(f.Nom), EUC_DEV620_t_(f.Prenom)].filter(Boolean).join(' '); }).filter(Boolean).sort(function(a, b) { return a.localeCompare(b, 'fr'); });
  var administratifs = EUC_DEV620_lire_(EUC_DEV620_T_.administratifs).map(function(r) { var f = r.fields || {}; return { id: Number(r.id), nom: EUC_DEV620_t_(f.Nom), prenom: EUC_DEV620_t_(f.Prenom), fonction: EUC_DEV620_t_(f.Fonction), service: EUC_DEV620_t_(f.Service), email: EUC_DEV620_t_(f.Email), telephone: EUC_DEV620_t_(f.Telephone), actif: f.Actif !== false }; });
  return { annees: annees.map(function(a) { return a.code; }), annee: code, courante: courante, pieces: EUC_DEV620_pieces_(), tenues: EUC_DEV620_tenues_(), classes: classes, eleves: eleves, liens: liens, vagues: vagues,
    essayages: EUC_DEV620_essayages_(code), professeurs: profs, administratifs: administratifs };
}

/* Réglages : pièces (tailles) et tenues, créées ou modifiées par code ; jamais supprimées (Actif = false). */
function EUC_DEV620_enregistrerReglages(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV620_tables_();
  var pieces = EUC_DEV620_pieces_(), tenues = EUC_DEV620_tenues_(), pc = {}, tc = {}, codesP = {};
  pieces.forEach(function(p) { pc[p.code] = p; }); tenues.forEach(function(t) { tc[t.code] = t; });
  var code = function(v) { return EUC_DEV620_t_(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30); };
  var cp = [], mp = [], ct = [], mt = [];
  (q.pieces || []).forEach(function(p, i) {
    var c = code(p.code || p.libelle), lib = EUC_DEV620_t_(p.libelle); if (!c || !lib) throw new Error('Pièce n°' + (i + 1) + ' : code et libellé obligatoires.');
    var tl = EUC_DEV620_tailles_(p.tailles); if (!tl.length) throw new Error('Pièce « ' + lib + ' » : au moins une taille.');
    codesP[c] = 1; var f = { Code: c, Libelle: lib.slice(0, 80), Tailles: tl.join(', '), Ordre: (i + 1) * 10, Actif: p.actif !== false };
    if (pc[c]) mp.push({ id: pc[c].id, fields: f }); else cp.push({ fields: f });
  });
  (q.tenues || []).forEach(function(t, i) {
    var c = code(t.code || t.libelle), lib = EUC_DEV620_t_(t.libelle); if (!c || !lib) throw new Error('Tenue n°' + (i + 1) + ' : code et libellé obligatoires.');
    var ps = (Array.isArray(t.pieces) ? t.pieces : EUC_DEV620_t_(t.pieces).split(/\s*,\s*/)).map(code).filter(Boolean);
    var inconnues = ps.filter(function(x) { return !codesP[x] && !pc[x]; }); if (inconnues.length) throw new Error('Tenue « ' + lib + ' » : pièce inconnue ' + inconnues.join(', ') + '.');
    if (!ps.length) throw new Error('Tenue « ' + lib + ' » : au moins une pièce.');
    var f = { Code: c, Libelle: lib.slice(0, 100), Pieces: ps.join(', '), Ordre: (i + 1) * 10, Actif: t.actif !== false };
    if (tc[c]) mt.push({ id: tc[c].id, fields: f }); else ct.push({ fields: f });
  });
  if (mp.length) EUC_DEV620_ecrire_('patch', EUC_DEV620_T_.pieces, mp); if (cp.length) EUC_DEV620_ecrire_('post', EUC_DEV620_T_.pieces, cp);
  if (mt.length) EUC_DEV620_ecrire_('patch', EUC_DEV620_T_.tenues, mt); if (ct.length) EUC_DEV620_ecrire_('post', EUC_DEV620_T_.tenues, ct);
  return { ok: true, pieces: cp.length + mp.length, tenues: ct.length + mt.length };
}

/* Classe → tenue pour l'année (une ligne par classe ; tenue vide = aucune tenue). */
function EUC_DEV620_enregistrerClassesTenues(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV620_tables_();
  var annee = EUC_DEV620_t_(q.annee); if (!/^\d{4}-\d{4}$/.test(annee)) throw new Error('Année scolaire invalide.');
  var codes = {}; EUC_DEV620_tenues_().forEach(function(t) { codes[t.code] = 1; });
  var ex = {}; EUC_DEV620_lire_(EUC_DEV620_T_.classes).forEach(function(r) { var f = r.fields || {}; if (EUC_DEV620_t_(f.Annee_scolaire) === annee) ex[EUC_DEV620_ref_(f.Classe)] = Number(r.id); });
  var creer = [], modifier = [], maintenant = new Date().toISOString();
  Object.keys(q.liens || {}).forEach(function(cid) { var t = EUC_DEV620_t_(q.liens[cid]); if (t && !codes[t]) throw new Error('Tenue inconnue : ' + t + '.');
    var f = { Annee_scolaire: annee, Classe: Number(cid), Tenue: t, Date_modification: maintenant };
    if (ex[Number(cid)]) modifier.push({ id: ex[Number(cid)], fields: f }); else if (t) creer.push({ fields: f }); });
  if (modifier.length) EUC_DEV620_ecrire_('patch', EUC_DEV620_T_.classes, modifier); if (creer.length) EUC_DEV620_ecrire_('post', EUC_DEV620_T_.classes, creer);
  return { ok: true, creees: creer.length, modifiees: modifier.length };
}

/* Vague de commande : création (numéro suivant) ou modification (libellé, date, statut). */
function EUC_DEV620_enregistrerVague(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV620_tables_();
  var annee = EUC_DEV620_t_(q.annee); if (!/^\d{4}-\d{4}$/.test(annee)) throw new Error('Année scolaire invalide.');
  var date = EUC_DEV620_t_(q.date); if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date de commande invalide.');
  var statut = EUC_DEV620_t_(q.statut) || 'OUVERTE'; if (['OUVERTE', 'COMMANDEE', 'LIVREE', 'CLOSE'].indexOf(statut) < 0) throw new Error('Statut de vague invalide.');
  var vagues = EUC_DEV620_lire_(EUC_DEV620_T_.vagues).filter(function(r) { return EUC_DEV620_t_((r.fields || {}).Annee_scolaire) === annee; });
  var f = { Annee_scolaire: annee, Libelle: EUC_DEV620_t_(q.libelle).slice(0, 80), Date_commande: date ? Math.round(Date.parse(date + 'T00:00:00Z') / 1000) : null, Statut: statut, Actif: true };
  if (Number(q.id) > 0) { EUC_DEV620_ecrire_('patch', EUC_DEV620_T_.vagues, [{ id: Number(q.id), fields: f }]); return { ok: true, id: Number(q.id) }; }
  f.Numero = vagues.reduce(function(m, r) { return Math.max(m, Number((r.fields || {}).Numero) || 0); }, 0) + 1;
  if (!f.Libelle) f.Libelle = 'Vague ' + f.Numero;
  var ids = EUC_DEV620_ecrire_('post', EUC_DEV620_T_.vagues, [{ fields: f }]);
  return { ok: true, id: ids[0], numero: f.Numero };
}

/* Essayage d'une classe : une ligne par élève et par vague ; « saisi par » (nom et prénom saisis au démarrage du poste)
 * et la date sont écrits automatiquement. Élève hors Pronote : nom, prénom, classe ou formation, rattaché plus tard. */
function EUC_DEV620_enregistrerEssayages(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV620_tables_();
  var annee = EUC_DEV620_t_(q.annee), vague = Number(q.vague) || 0, saisi = EUC_DEV620_t_(q.saisiPar).slice(0, 80);
  if (!/^\d{4}-\d{4}$/.test(annee)) throw new Error('Année scolaire invalide.');
  if (!vague) throw new Error('Choisissez la vague de commande.');
  if (saisi.split(/\s+/).length < 2) throw new Error('Indiquez votre nom et votre prénom avant d’enregistrer.');
  var pieces = {}; EUC_DEV620_pieces_().forEach(function(p) { pieces[p.code] = p; });
  var tenues = {}; EUC_DEV620_tenues_().forEach(function(t) { tenues[t.code] = t; });
  var ex = {}; EUC_DEV620_essayages_(annee).forEach(function(x) { if (x.vague === vague && x.eleveId) ex[x.eleveId] = x; });
  var creer = [], modifier = [], erreurs = [], maintenant = new Date().toISOString();
  (q.lignes || []).forEach(function(l) {
    var tenue = tenues[EUC_DEV620_t_(l.tenue)], nom = EUC_DEV620_t_(l.nom), prenom = EUC_DEV620_t_(l.prenom);
    if (!tenue) { erreurs.push((nom || 'Ligne') + ' : tenue à choisir'); return; }
    var v = EUC_DEV620_taillesValides_(l.tailles, tenue, pieces); v.erreurs.forEach(function(x) { erreurs.push(nom + ' ' + prenom + ' — ' + x); });
    var provisoire = !(Number(l.eleveId) > 0);
    if (provisoire && (!nom || !prenom)) { erreurs.push('Élève hors Pronote : nom et prénom obligatoires'); return; }
    var f = { Annee_scolaire: annee, Vague: vague, Eleve: provisoire ? 0 : Number(l.eleveId), Provisoire: provisoire, Nom: nom.slice(0, 80), Prenom: prenom.slice(0, 80), Classe: Number(l.classeId) || 0,
      Classe_texte: EUC_DEV620_t_(l.classeTexte).slice(0, 80), Tenue: tenue.code, Tailles: JSON.stringify(v.tailles), Professeur: EUC_DEV620_t_(l.professeur).slice(0, 80), Saisi_par: saisi, Date_saisie: maintenant,
      Statut: EUC_DEV620_t_(l.statut) || 'ESSAYE', Commentaire: EUC_DEV620_t_(l.commentaire).slice(0, 200), Actif: true };
    var id = Number(l.id) || (ex[Number(l.eleveId)] || {}).id || 0;
    if (id) modifier.push({ id: id, fields: f }); else creer.push({ fields: f });
  });
  if (erreurs.length) throw new Error('Essayage non enregistré : ' + erreurs.slice(0, 5).join(' ; ') + (erreurs.length > 5 ? ' (et ' + (erreurs.length - 5) + ' autre(s))' : '') + '.');
  if (modifier.length) EUC_DEV620_ecrire_('patch', EUC_DEV620_T_.essayages, modifier); if (creer.length) EUC_DEV620_ecrire_('post', EUC_DEV620_T_.essayages, creer);
  return { ok: true, creees: creer.length, modifiees: modifier.length };
}

/* Rattachement d'un élève saisi hors Pronote à son dossier Pronote (quand il apparaît dans l'import). */
function EUC_DEV620_rattacher(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV620_tables_();
  var id = Number(q.id), eleve = Number(q.eleveId); if (!(id > 0) || !(eleve > 0)) throw new Error('Rattachement incomplet.');
  var e = EUC_DEV620_lire_('EUC_ELEVES_PFMP').filter(function(r) { return Number(r.id) === eleve; })[0]; if (!e) throw new Error('Élève introuvable dans Pronote.');
  var f = e.fields || {};
  EUC_DEV620_ecrire_('patch', EUC_DEV620_T_.essayages, [{ id: id, fields: { Eleve: eleve, Provisoire: false, Nom: EUC_DEV620_t_(f.Nom), Prenom: EUC_DEV620_t_(f.Prenom_usage || f.Prenom), Classe: EUC_DEV620_ref_(f.Classe) } }]);
  return { ok: true };
}

/* Administratifs : liste tenue par l'utilisateur (badges, événements) ; retrait = Actif false. */
function EUC_DEV620_enregistrerAdministratifs(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV620_tables_();
  var creer = [], modifier = [], maintenant = new Date().toISOString();
  (q.lignes || []).forEach(function(l, i) {
    var nom = EUC_DEV620_t_(l.nom), prenom = EUC_DEV620_t_(l.prenom); if (!nom && !prenom) return;
    if (!nom) throw new Error('Administratif n°' + (i + 1) + ' : nom obligatoire.');
    var email = EUC_DEV620_t_(l.email); if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Courriel invalide pour ' + nom + '.');
    var f = { Nom: nom.slice(0, 80), Prenom: prenom.slice(0, 80), Fonction: EUC_DEV620_t_(l.fonction).slice(0, 80), Service: EUC_DEV620_t_(l.service).slice(0, 80), Email: email.slice(0, 120), Telephone: EUC_DEV620_t_(l.telephone).slice(0, 30), Actif: l.actif !== false, Date_modification: maintenant };
    if (Number(l.id) > 0) modifier.push({ id: Number(l.id), fields: f }); else creer.push({ fields: f });
  });
  if (modifier.length) EUC_DEV620_ecrire_('patch', EUC_DEV620_T_.administratifs, modifier); if (creer.length) EUC_DEV620_ecrire_('post', EUC_DEV620_T_.administratifs, creer);
  return { ok: true, creees: creer.length, modifiees: modifier.length };
}
