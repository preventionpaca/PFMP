/**
 * DEV621 — Étiquettes et badges : formats de planches en stock, modèles (zones de texte placées, police, gras, italique,
 * souligné, alignement, couleur, rotation, image de fond), personnes puisées dans les élèves, professeurs,
 * administratifs, partenaires ou un import Excel mémorisé ; impression en PDF ; étiquettes déjà imprimées repérées.
 * Lecture seule des élèves, classes, professeurs et contacts ; écriture dans les seules tables EUC_ETQ_* et EUC_ADMINISTRATIFS.
 */

var EUC_DEV621_T_ = { formats: 'EUC_ETQ_FORMATS', modeles: 'EUC_ETQ_MODELES', imports: 'EUC_ETQ_IMPORTS', impressions: 'EUC_ETQ_IMPRESSIONS' };

/* ===================== Calcul pur ===================== */

function EUC_DEV621_t_(v) { return v == null ? '' : String(v).trim(); }
function EUC_DEV621_num_(v, d) { var t = String(v == null ? '' : v).trim().replace(',', '.'); if (t === '') return d; var n = Number(t); return isFinite(n) ? n : d; }
/* Champs proposés dans les zones d'un modèle. */
var EUC_DEV621_CHAMPS_ = [['NOM', 'Nom'], ['PRENOM', 'Prénom'], ['NOM_PRENOM', 'Nom Prénom'], ['PRENOM_NOM', 'Prénom Nom'], ['ORGANISME', 'Organisme / entreprise'], ['FONCTION', 'Fonction'], ['ROLE', 'Rôle'], ['CLASSE', 'Classe'], ['LIBRE1', 'Libre 1'], ['LIBRE2', 'Libre 2'], ['TEXTE', 'Texte fixe']];
function EUC_DEV621_valeurChamp_(z, p) {
  p = p || {}; var nom = EUC_DEV621_t_(p.nom).toUpperCase(), pre = EUC_DEV621_t_(p.prenom);
  switch (z.champ) {
    case 'NOM': return nom; case 'PRENOM': return pre; case 'NOM_PRENOM': return (nom + ' ' + pre).trim(); case 'PRENOM_NOM': return (pre + ' ' + nom).trim();
    case 'ORGANISME': return EUC_DEV621_t_(p.organisme); case 'FONCTION': return EUC_DEV621_t_(p.fonction); case 'ROLE': return EUC_DEV621_t_(p.role);
    case 'CLASSE': return EUC_DEV621_t_(p.classe); case 'LIBRE1': return EUC_DEV621_t_(p.libre1); case 'LIBRE2': return EUC_DEV621_t_(p.libre2);
    default: return EUC_DEV621_t_(z.texte);
  }
}
/* Emplacements des étiquettes d'une planche, en millimètres depuis le coin haut gauche de la page. */
function EUC_DEV621_positions_(f) {
  var out = [];
  for (var r = 0; r < f.rangees; r++) for (var c = 0; c < f.colonnes; c++) out.push({ x: f.margeGauche + c * (f.largeur + f.espaceH), y: f.margeHaut + r * (f.hauteur + f.espaceV) });
  return out;
}
/* Contrôle d'un format : la planche doit tenir dans la page. */
function EUC_DEV621_verifierFormat_(f) {
  var e = [];
  if (!(f.colonnes >= 1 && f.rangees >= 1)) e.push('au moins une colonne et une rangée');
  if (!(f.largeur > 0 && f.hauteur > 0)) e.push('largeur et hauteur de l’étiquette');
  var dl = f.margeGauche + f.colonnes * f.largeur + (f.colonnes - 1) * f.espaceH, dh = f.margeHaut + f.rangees * f.hauteur + (f.rangees - 1) * f.espaceV;
  if (dl > f.largeurPage + 0.05) e.push('trop large : ' + (Math.round(dl * 10) / 10) + ' mm pour ' + f.largeurPage + ' mm de page');
  if (dh > f.hauteurPage + 0.05) e.push('trop haute : ' + (Math.round(dh * 10) / 10) + ' mm pour ' + f.hauteurPage + ' mm de page');
  return e;
}
/* Clé d'une personne (étiquettes déjà imprimées pour un modèle). */
function EUC_DEV621_cle_(p) { return p.source + ':' + p.id; }
/* Formats proposés au premier lancement (planches en stock vues dans Labeljoy ; modifiables). */
var EUC_DEV621_FORMATS_DEFAUT_ = [
  ['Avery C2495 — 2 × 5 (95 × 48,5 mm)', 2, 5, 10, 21, 0, 3, 95, 48.5],
  ['Badge pochette — 2 × 4 (99,5 × 69,9 mm)', 2, 4, 5.5, 8.7, 0, 0, 99.5, 69.9]
];

/* ===================== Grist ===================== */

function EUC_DEV621_lire_(t) { try { return EUC_ENT_grist('get', '/tables/' + t + '/records').records || []; } catch (e) { return []; } }
function EUC_DEV621_ecrire_(m, t, r) { return EUC_DEV620_ecrire_(m, t, r); }
function EUC_DEV621_ref_(v) { return EUC_DEV620_ref_(v); }
function EUC_DEV621_def_() {
  var c = EUC_DEV441_col_, d = {};
  d[EUC_DEV621_T_.formats] = [c('Nom', 'Nom'), c('Largeur_page', 'Largeur de page (mm)', 'Numeric'), c('Hauteur_page', 'Hauteur de page (mm)', 'Numeric'), c('Colonnes', 'Colonnes', 'Int'), c('Rangees', 'Rangées', 'Int'),
    c('Marge_gauche', 'Marge gauche (mm)', 'Numeric'), c('Marge_haut', 'Marge haute (mm)', 'Numeric'), c('Espace_h', 'Espace horizontal (mm)', 'Numeric'), c('Espace_v', 'Espace vertical (mm)', 'Numeric'),
    c('Largeur', 'Largeur étiquette (mm)', 'Numeric'), c('Hauteur', 'Hauteur étiquette (mm)', 'Numeric'), c('Actif', 'Actif', 'Bool')];
  d[EUC_DEV621_T_.modeles] = [c('Nom', 'Nom'), c('Format', 'Format (id)', 'Int'), c('Zones', 'Zones (JSON)'), c('Fond', 'Image de fond (data URL)'), c('Bordure', 'Bordure à l’écran', 'Bool'), c('Actif', 'Actif', 'Bool'), c('Date_modification', 'Date modification')];
  d[EUC_DEV621_T_.imports] = [c('Lot', 'Lot d’import'), c('Date_import', 'Date d’import'), c('Nom', 'Nom'), c('Prenom', 'Prénom'), c('Organisme', 'Organisme'), c('Fonction', 'Fonction'), c('Role', 'Rôle'), c('Classe', 'Classe'), c('Libre_1', 'Libre 1'), c('Libre_2', 'Libre 2'), c('Actif', 'Actif', 'Bool')];
  d[EUC_DEV621_T_.impressions] = [c('Modele', 'Modèle (id)', 'Int'), c('Cle', 'Personne (source:id)'), c('Date', 'Date d’impression'), c('Lot', 'Lot')];
  return d;
}
var EUC_DEV621_CACHE_ = 'EUC_DEV621_TABLES1';
function EUC_DEV621_tables_() {
  EUC_DEV620_tables_();
  var cache = CacheService.getScriptCache(); if (cache.get(EUC_DEV621_CACHE_)) return;
  var def = EUC_DEV621_def_(), ids = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; });
  var manquantes = Object.keys(def).filter(function(t) { return ids.indexOf(t) < 0; });
  if (manquantes.length) EUC_ENT_grist('post', '/tables', { tables: manquantes.map(function(t) { return { id: t, columns: def[t] }; }) });
  Object.keys(def).forEach(function(t) { if (manquantes.indexOf(t) >= 0) return;
    var cols = (EUC_ENT_grist('get', '/tables/' + t + '/columns').columns || []).map(function(x) { return x.id; }), aj = def[t].filter(function(x) { return cols.indexOf(x.id) < 0; });
    if (aj.length) EUC_ENT_grist('post', '/tables/' + t + '/columns', { columns: aj }); });
  if (!EUC_DEV621_lire_(EUC_DEV621_T_.formats).length) EUC_DEV621_ecrire_('post', EUC_DEV621_T_.formats, EUC_DEV621_FORMATS_DEFAUT_.map(function(f) { return { fields: { Nom: f[0], Largeur_page: 210, Hauteur_page: 297, Colonnes: f[1], Rangees: f[2], Marge_gauche: f[3], Marge_haut: f[4], Espace_h: f[5], Espace_v: f[6], Largeur: f[7], Hauteur: f[8], Actif: true } }; }));
  cache.put(EUC_DEV621_CACHE_, '1', 21600);
}
function EUC_DEV621_formats_() {
  var n = EUC_DEV621_num_;
  return EUC_DEV621_lire_(EUC_DEV621_T_.formats).map(function(r) { var f = r.fields || {}; return { id: Number(r.id), nom: EUC_DEV621_t_(f.Nom), largeurPage: n(f.Largeur_page, 210), hauteurPage: n(f.Hauteur_page, 297), colonnes: n(f.Colonnes, 1), rangees: n(f.Rangees, 1),
    margeGauche: n(f.Marge_gauche, 0), margeHaut: n(f.Marge_haut, 0), espaceH: n(f.Espace_h, 0), espaceV: n(f.Espace_v, 0), largeur: n(f.Largeur, 50), hauteur: n(f.Hauteur, 30), actif: f.Actif !== false }; });
}
function EUC_DEV621_modeles_() {
  return EUC_DEV621_lire_(EUC_DEV621_T_.modeles).map(function(r) { var f = r.fields || {}, z = []; try { z = JSON.parse(f.Zones || '[]') || []; } catch (e) {}
    return { id: Number(r.id), nom: EUC_DEV621_t_(f.Nom), format: Number(f.Format) || 0, zones: z, fond: EUC_DEV621_t_(f.Fond), actif: f.Actif !== false }; });
}

/* ===================== Services de la page ===================== */

function EUC_DEV621_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  var t = HtmlService.createTemplateFromFile('Etiquettes_DEV621'), prm = (e && e.parameter) || {};
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  t.onglet = EUC_DEV621_t_(prm.onglet).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 30);
  t.codeClient = [EUC_DEV620_t_, EUC_DEV620_n_, EUC_DEV621_t_, EUC_DEV621_num_, EUC_DEV621_valeurChamp_, EUC_DEV621_positions_, EUC_DEV621_verifierFormat_, EUC_DEV621_cle_].map(String).join('\n')
    + '\nvar EUC_DEV621_CHAMPS_ = ' + JSON.stringify(EUC_DEV621_CHAMPS_) + ';';
  return t.evaluate().setTitle('Étiquettes et badges').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function EUC_DEV621_charger(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV621_tables_();
  var t = EUC_DEV621_t_, personnes = [], annees = EUC_DEV620_annees_();
  var courante = typeof EUC_SUIVI2_anneeCourante_ === 'function' ? EUC_SUIVI2_anneeCourante_(EUC_SUIVI2_aujourdhui_()) : '';
  var classes = {}; (typeof EUC_DEV610_classes_ === 'function' ? EUC_DEV610_classes_() : []).forEach(function(c) { classes[c.id] = c.nom; });
  EUC_DEV621_lire_('EUC_ELEVES_PFMP').forEach(function(r) { var f = r.fields || {};
    if (f.Actif === false || f.Present_dernier_import === false || EUC_DEV620_n_(f.Statut_scolarite) === 'SORTI') return;
    var an = EUC_DEV620_anneeDe_(f.Annee_scolaire, annees); if (an && courante && an !== courante) return;
    var cid = EUC_DEV621_ref_(f.Classe); if (!classes[cid]) return;
    personnes.push({ source: 'ELEVE', id: Number(r.id), nom: t(f.Nom), prenom: t(f.Prenom_usage || f.Prenom), classe: classes[cid], organisme: 'Lycée Les Eucalyptus', fonction: 'Élève', role: '' }); });
  EUC_DEV621_lire_('EUC_PROFESSEURS_PFMP').forEach(function(r) { var f = r.fields || {}; if (f.Actif === false) return;
    personnes.push({ source: 'PROF', id: Number(r.id), nom: t(f.Nom), prenom: t(f.Prenom), fonction: t(f.Discipline) || 'Professeur', organisme: 'Lycée Les Eucalyptus', classe: '', role: '' }); });
  EUC_DEV621_lire_('EUC_ADMINISTRATIFS').forEach(function(r) { var f = r.fields || {}; if (f.Actif === false) return;
    personnes.push({ source: 'ADMIN', id: Number(r.id), nom: t(f.Nom), prenom: t(f.Prenom), fonction: t(f.Fonction), organisme: 'Lycée Les Eucalyptus', classe: t(f.Service), role: '' }); });
  var entreprises = {}; EUC_DEV621_lire_('EUC_ENTREPRISES').forEach(function(r) { var f = r.fields || {}; entreprises[r.id] = t(f.Enseigne) || t(f.Raison_sociale); });
  EUC_DEV621_lire_('EUC_CONTACTS_ENTREPRISES').forEach(function(r) { var f = r.fields || {}; if (f.Actif === false || !(t(f.Nom) || t(f.Prenom))) return;
    personnes.push({ source: 'PARTENAIRE', id: Number(r.id), nom: t(f.Nom), prenom: t(f.Prenom), fonction: t(f.Fonction), organisme: entreprises[EUC_DEV621_ref_(f.Entreprise)] || '', classe: '', role: t(f.Type_contact) }); });
  EUC_DEV621_lire_(EUC_DEV621_T_.imports).forEach(function(r) { var f = r.fields || {}; if (f.Actif === false) return;
    personnes.push({ source: 'IMPORT', id: Number(r.id), lot: t(f.Lot), nom: t(f.Nom), prenom: t(f.Prenom), organisme: t(f.Organisme), fonction: t(f.Fonction), role: t(f.Role), classe: t(f.Classe), libre1: t(f.Libre_1), libre2: t(f.Libre_2) }); });
  var imprimees = {}; EUC_DEV621_lire_(EUC_DEV621_T_.impressions).forEach(function(r) { var f = r.fields || {}, m = Number(f.Modele) || 0; (imprimees[m] = imprimees[m] || {})[t(f.Cle)] = t(f.Date); });
  var administratifs = EUC_DEV621_lire_('EUC_ADMINISTRATIFS').map(function(r) { var f = r.fields || {}; return { id: Number(r.id), nom: t(f.Nom), prenom: t(f.Prenom), fonction: t(f.Fonction), service: t(f.Service), email: t(f.Email), telephone: t(f.Telephone), actif: f.Actif !== false }; });
  return { formats: EUC_DEV621_formats_(), modeles: EUC_DEV621_modeles_(), personnes: personnes, imprimees: imprimees, administratifs: administratifs, champs: EUC_DEV621_CHAMPS_ };
}

function EUC_DEV621_enregistrerFormats(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV621_tables_();
  var creer = [], modifier = [], n = EUC_DEV621_num_;
  (q.formats || []).forEach(function(x, i) {
    var f = { nom: EUC_DEV621_t_(x.nom), largeurPage: n(x.largeurPage, 210), hauteurPage: n(x.hauteurPage, 297), colonnes: Math.round(n(x.colonnes, 1)), rangees: Math.round(n(x.rangees, 1)), margeGauche: n(x.margeGauche, 0), margeHaut: n(x.margeHaut, 0), espaceH: n(x.espaceH, 0), espaceV: n(x.espaceV, 0), largeur: n(x.largeur, 0), hauteur: n(x.hauteur, 0) };
    if (!f.nom && !Number(x.id)) return;
    if (!f.nom) throw new Error('Format n°' + (i + 1) + ' : nom obligatoire.');
    var err = EUC_DEV621_verifierFormat_(f); if (err.length && x.actif !== false) throw new Error('Format « ' + f.nom + ' » : ' + err.join(', ') + '.');
    var champs = { Nom: f.nom.slice(0, 80), Largeur_page: f.largeurPage, Hauteur_page: f.hauteurPage, Colonnes: f.colonnes, Rangees: f.rangees, Marge_gauche: f.margeGauche, Marge_haut: f.margeHaut, Espace_h: f.espaceH, Espace_v: f.espaceV, Largeur: f.largeur, Hauteur: f.hauteur, Actif: x.actif !== false };
    if (Number(x.id) > 0) modifier.push({ id: Number(x.id), fields: champs }); else creer.push({ fields: champs });
  });
  if (modifier.length) EUC_DEV621_ecrire_('patch', EUC_DEV621_T_.formats, modifier); if (creer.length) EUC_DEV621_ecrire_('post', EUC_DEV621_T_.formats, creer);
  return { ok: true, creees: creer.length, modifiees: modifier.length };
}

var EUC_DEV621_ALIGN_ = ['left', 'center', 'right'];
function EUC_DEV621_enregistrerModele(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV621_tables_();
  var nom = EUC_DEV621_t_(q.nom); if (!nom) throw new Error('Nom du modèle obligatoire.');
  var fmt = EUC_DEV621_formats_().filter(function(f) { return f.id === Number(q.format); })[0]; if (!fmt) throw new Error('Choisissez le format de planche du modèle.');
  var fond = EUC_DEV621_t_(q.fond); if (fond && !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(fond)) throw new Error('Image de fond PNG ou JPEG attendue.');
  if (fond.length > 700000) throw new Error('Image de fond trop lourde, même réduite (700 Ko au plus).');
  var codes = EUC_DEV621_CHAMPS_.map(function(c) { return c[0]; }), n = EUC_DEV621_num_;
  var zones = (q.zones || []).map(function(z) { var champ = codes.indexOf(z.champ) >= 0 ? z.champ : 'TEXTE', rot = Number(z.rotation) || 0;
    return { champ: champ, texte: EUC_DEV621_t_(z.texte).slice(0, 120), x: n(z.x, 0), y: n(z.y, 0), l: Math.max(1, n(z.l, fmt.largeur)), taille: Math.min(120, Math.max(4, n(z.taille, 12))), gras: !!z.gras, italique: !!z.italique, souligne: !!z.souligne,
      align: EUC_DEV621_ALIGN_.indexOf(z.align) >= 0 ? z.align : 'center', couleur: /^#[0-9A-Fa-f]{6}$/.test(z.couleur || '') ? z.couleur : '#000000', rotation: [0, 90, -90, 180].indexOf(rot) >= 0 ? rot : 0, police: ['Arial', 'Georgia', 'Verdana', 'Trebuchet MS', 'Courier New'].indexOf(z.police) >= 0 ? z.police : 'Arial' }; });
  var champs = { Nom: nom.slice(0, 80), Format: fmt.id, Zones: JSON.stringify(zones), Fond: fond, Bordure: true, Actif: q.actif !== false, Date_modification: new Date().toISOString() };
  if (Number(q.id) > 0) { EUC_DEV621_ecrire_('patch', EUC_DEV621_T_.modeles, [{ id: Number(q.id), fields: champs }]); return { ok: true, id: Number(q.id) }; }
  var ids = EUC_DEV621_ecrire_('post', EUC_DEV621_T_.modeles, [{ fields: champs }]); return { ok: true, id: ids[0] };
}

/* Import d'un classeur (lignes déjà lues dans la page) : mémorisé dans EUC_ETQ_IMPORTS sous un nom de lot. */
function EUC_DEV621_importer(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV621_tables_();
  var lot = EUC_DEV621_t_(q.lot).slice(0, 60); if (!lot) throw new Error('Donnez un nom au lot importé (ex. « Concours 6 mai »).');
  var t = EUC_DEV621_t_, quand = new Date().toISOString();
  var lignes = (q.lignes || []).filter(function(l) { return t(l.nom) || t(l.prenom); }).map(function(l) {
    return { fields: { Lot: lot, Date_import: quand, Nom: t(l.nom).toUpperCase().slice(0, 80), Prenom: t(l.prenom).slice(0, 80), Organisme: t(l.organisme).slice(0, 120), Fonction: t(l.fonction).slice(0, 80), Role: t(l.role).slice(0, 60), Classe: t(l.classe).slice(0, 60), Libre_1: t(l.libre1).slice(0, 120), Libre_2: t(l.libre2).slice(0, 120), Actif: true } }; });
  if (!lignes.length) throw new Error('Aucune ligne avec un nom ou un prénom dans le fichier.');
  if (lignes.length > 2000) throw new Error('Fichier trop long (2 000 lignes au plus).');
  EUC_DEV621_ecrire_('post', EUC_DEV621_T_.imports, lignes);
  return { ok: true, importees: lignes.length, lot: lot };
}

/* Étiquettes imprimées pour un modèle : repérées pour ne pas les refaire. */
function EUC_DEV621_marquerImprimees(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV621_tables_();
  var m = Number(q.modele) || 0, cles = (q.cles || []).map(EUC_DEV621_t_).filter(function(c) { return /^[A-Z]+:\d+$/.test(c); });
  if (!m || !cles.length) throw new Error('Rien à marquer.');
  var quand = new Date().toISOString(), lot = EUC_DEV621_t_(q.lot).slice(0, 60);
  EUC_DEV621_ecrire_('post', EUC_DEV621_T_.impressions, cles.map(function(c) { return { fields: { Modele: m, Cle: c, Date: quand, Lot: lot } }; }));
  return { ok: true, marquees: cles.length };
}
