/**
 * DEV631 — Livret de suivi : périodes S / P et objectifs communs.
 *
 * Le référent enregistre, depuis le récapitulatif des périodes d'une formation (page des plannings), les périodes
 * du livret (S1, S2… au lycée ; P1, P2… en entreprise, avec leurs dates) et, pour chaque période, une liste
 * d'objectifs communs à la classe, rangés par bloc de compétences RNCP (DEV630) ou dans « Autres activités »
 * (activités hors référentiel mais formatrices : site à consulter, émission, formation à un logiciel…).
 * L'apprenti choisit sa période dans son livret : dates et objectifs viennent d'ici ; il décrit ce qu'il a fait bloc
 * par bloc. Les objectifs décochés pour un apprenti sont gardés sur sa fiche (colonne Objectifs_decoches).
 * Aucune suppression physique : une ligne retirée passe à Actif = false.
 */
var EUC_DEV631_TABLE_ = 'EUC_LIVRET_OBJECTIFS';
var EUC_DEV631_AUTRES_ = 'AUTRES';
var EUC_DEV631_MAX_ = 30;

function EUC_DEV631_t_(v) { return v == null ? '' : String(v).trim(); }

/* ---------- Calculs purs ---------- */
/* Contrôle et mise en forme d'un enregistrement (calcul pur) : périodes S/P numérotées et datées, objectifs rattachés
 * à une période connue et à un bloc du référentiel de la ligne (ou AUTRES), 30 objectifs au plus par bloc et période. */
function EUC_DEV631_normaliser_(q, blocs) {
  q = q || {}; var codes = (blocs || []).map(function(b) { return b.code; }).concat([EUC_DEV631_AUTRES_]), vues = {}, periodes = [], objectifs = [], compte = {};
  (q.periodes || []).forEach(function(p) {
    var lib = EUC_DEV631_t_(p.label).toUpperCase(), nat = lib.charAt(0) === 'S' ? 'L' : 'E', du = EUC_DEV631_t_(p.du), au = EUC_DEV631_t_(p.au);
    if (!/^[SP]\d{1,2}$/.test(lib)) throw new Error('Période inconnue : « ' + lib + ' » (S1, S2… ou P1, P2…).');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(du) || !/^\d{4}-\d{2}-\d{2}$/.test(au) || au < du) throw new Error('Dates invalides pour la période ' + lib + '.');
    if (vues[lib]) throw new Error('Période en double : ' + lib + '.'); vues[lib] = 1;
    periodes.push({ label: lib, nature: nat, du: du, au: au });
  });
  (q.objectifs || []).forEach(function(o) {
    var lib = EUC_DEV631_t_(o.periode).toUpperCase(), bloc = EUC_DEV631_t_(o.bloc), texte = EUC_DEV631_t_(o.texte).replace(/\s+/g, ' ').slice(0, 500);
    if (!texte) return;
    if (!vues[lib]) throw new Error('Objectif rattaché à une période inconnue : ' + lib + '.');
    if (codes.indexOf(bloc) < 0) throw new Error('Bloc inconnu pour cette formation : ' + bloc + '.');
    var k = lib + '|' + bloc; compte[k] = (compte[k] || 0) + 1;
    if (compte[k] > EUC_DEV631_MAX_) throw new Error('Pas plus de ' + EUC_DEV631_MAX_ + ' objectifs par bloc pour la période ' + lib + '.');
    objectifs.push({ periode: lib, bloc: bloc, texte: texte, ordre: compte[k] });
  });
  /* Regroupements choisis dans le récapitulatif (numéros calculés rattachés à la période précédente au même lieu). */
  var fusion = []; (q.fusion || []).forEach(function(x) { x = EUC_DEV631_t_(x).toUpperCase(); if (!/^[SP]\d{1,3}$/.test(x)) throw new Error('Regroupement invalide : ' + x + '.'); if (fusion.indexOf(x) < 0) fusion.push(x); });
  return { periodes: periodes, objectifs: objectifs, fusion: fusion };
}
/* Lignes Grist d'une formation lues en { periodes, objectifs } (calcul pur, lignes actives seulement). */
function EUC_DEV631_lireLignes_(rows, annee, ligne) {
  var out = { periodes: [], objectifs: [], fusion: [] };
  (rows || []).map(function(r) { return r.fields || r; }).filter(function(f) { return f.Actif !== false && EUC_DEV631_t_(f.Annee_scolaire) === annee && EUC_DEV631_t_(f.Ligne) === ligne; })
    .forEach(function(f) {
      if (EUC_DEV631_t_(f.Type) === 'REGLAGE') { try { out.fusion = JSON.parse(EUC_DEV631_t_(f.Texte) || '[]'); } catch (e) {} }
      else if (EUC_DEV631_t_(f.Type) === 'PERIODE') out.periodes.push({ label: EUC_DEV631_t_(f.Periode), nature: EUC_DEV631_t_(f.Nature), du: EUC_DEV631_t_(f.Du), au: EUC_DEV631_t_(f.Au) });
      else out.objectifs.push({ periode: EUC_DEV631_t_(f.Periode), bloc: EUC_DEV631_t_(f.Bloc), texte: EUC_DEV631_t_(f.Texte), ordre: Number(f.Ordre) || 0 });
    });
  out.periodes.sort(function(a, b) { return a.du.localeCompare(b.du) || a.label.localeCompare(b.label); });
  out.objectifs.sort(function(a, b) { return a.periode.localeCompare(b.periode) || a.bloc.localeCompare(b.bloc) || a.ordre - b.ordre; });
  return out;
}
/* Écritures pour remplacer l'enregistrement d'une formation (calcul pur) : chaque ligne existante est réutilisée dans
 * l'ordre (même type, même période, même bloc), le surplus est désactivé, le reste est créé. Champs homogènes. */
function EUC_DEV631_ecritures_(existants, annee, ligne, propre, maintenant) {
  var dispo = {}, creer = [], modifier = [];
  (existants || []).filter(function(r) { var f = r.fields || {}; return EUC_DEV631_t_(f.Annee_scolaire) === annee && EUC_DEV631_t_(f.Ligne) === ligne; })
    .sort(function(a, b) { return Number(a.id) - Number(b.id); })
    .forEach(function(r) { var f = r.fields || {}, k = EUC_DEV631_t_(f.Type) + '|' + EUC_DEV631_t_(f.Periode) + '|' + EUC_DEV631_t_(f.Bloc); (dispo[k] = dispo[k] || []).push(Number(r.id)); });
  var champs = function(type, p, bloc, texte, ordre, nat, du, au) { return { Annee_scolaire: annee, Ligne: ligne, Type: type, Periode: p, Nature: nat || '', Du: du || '', Au: au || '', Bloc: bloc || '', Texte: texte || '', Ordre: ordre || 0, Actif: true, Date_modification: maintenant }; };
  var placer = function(k, f) { var id = (dispo[k] || []).shift(); if (id) modifier.push({ id: id, fields: f }); else creer.push({ fields: f }); };
  propre.periodes.forEach(function(p) { placer('PERIODE|' + p.label + '|', champs('PERIODE', p.label, '', '', 0, p.nature, p.du, p.au)); });
  if ((propre.fusion || []).length) placer('REGLAGE||', champs('REGLAGE', '', '', JSON.stringify(propre.fusion), 0));
  propre.objectifs.forEach(function(o) { placer('OBJECTIF|' + o.periode + '|' + o.bloc, champs('OBJECTIF', o.periode, o.bloc, o.texte, o.ordre)); });
  var desactiver = []; Object.keys(dispo).forEach(function(k) { dispo[k].forEach(function(id) { desactiver.push({ id: id, fields: { Actif: false, Date_modification: maintenant } }); }); });
  return { creer: creer, modifier: modifier, desactiver: desactiver };
}
/* Livret d'un apprenti (calcul pur) : périodes de sa formation avec les objectifs de chaque période, rangés par bloc,
 * sans les objectifs décochés pour lui (« S1|BLOC|2 » : période, bloc, rang). */
function EUC_DEV631_periodesLivret_(lu, blocs, decoches) {
  var off = {}, permis = null; (decoches || []).forEach(function(k) { off[k] = 1; });
  /* Seuls les blocs du diplôme de l'apprenti (et les autres activités, communes) : une mixité multi-filières garde les
   * objectifs de chaque diplôme sur la même ligne. */
  if ((blocs || []).length) { permis = { AUTRES: 1 }; blocs.forEach(function(b) { permis[b.code] = 1; }); }
  return lu.periodes.map(function(p) {
    var parBloc = {};
    lu.objectifs.filter(function(o) { return o.periode === p.label; }).forEach(function(o) { if (!off[o.periode + '|' + o.bloc + '|' + o.ordre] && (!permis || permis[o.bloc])) (parBloc[o.bloc] = parBloc[o.bloc] || []).push(o.texte); });
    return { label: p.label, nature: p.nature, lieu: p.nature === 'L' ? 'LYCEE' : 'ENTREPRISE', du: p.du, au: p.au, objectifs: parBloc };
  });
}

/* ---------- Grist ---------- */
function EUC_DEV631_tables_() {
  var c = CacheService.getScriptCache(); if (c.get('EUC_DEV631_TABLES1')) return;
  var col = EUC_DEV441_col_, ids = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; });
  if (ids.indexOf(EUC_DEV631_TABLE_) < 0) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV631_TABLE_, columns: [
    col('Annee_scolaire', 'Année scolaire'), col('Ligne', 'Ligne de planning (code)'), col('Type', 'Type (PERIODE / OBJECTIF / REGLAGE)'), col('Periode', 'Période (S1, P1…)'), col('Nature', 'Nature (L lycée / E entreprise)'),
    col('Du', 'Du'), col('Au', 'Au'), col('Bloc', 'Bloc RNCP (ou AUTRES)'), col('Texte', 'Objectif'), col('Ordre', 'Ordre', 'Int'), col('Actif', 'Actif', 'Bool'), col('Date_modification', 'Modifié le')] }] });
  /* Fiches du livret (DEV599) : période, ligne de planning et objectifs décochés pour l'apprenti. */
  if (typeof EUC_DEV599_tables_ === 'function') EUC_DEV599_tables_();
  var have = (EUC_ENT_grist('get', '/tables/' + EUC_DEV599_FICHES_ + '/columns').columns || []).map(function(x) { return x.id; });
  var manque = [col('Periode', 'Période du livret (S1, P1…)'), col('Ligne', 'Ligne de planning (code)'), col('Objectifs_decoches', 'Objectifs décochés (JSON)')].filter(function(x) { return have.indexOf(x.id) < 0; });
  if (manque.length) EUC_ENT_grist('post', '/tables/' + EUC_DEV599_FICHES_ + '/columns', { columns: manque });
  c.put('EUC_DEV631_TABLES1', '1', 21600);
}
function EUC_DEV631_lire_() { try { return EUC_ENT_grist('get', '/tables/' + EUC_DEV631_TABLE_ + '/records').records || []; } catch (e) { return []; } }
/* Référentiel d'une ligne réelle du planning (code, classe PFMP, filières couvertes par une mixité : DEV630). */
function EUC_DEV631_lignesPlanning_() { try { return typeof EUC_DEV610_lignes_ === 'function' ? EUC_DEV610_lignes_() : []; } catch (e) { return []; } }
function EUC_DEV631_referentiel_(ligne, ls) {
  if (typeof EUC_DEV630_referentielPour_ !== 'function') return null;
  ls = ls || EUC_DEV631_lignesPlanning_();
  return EUC_DEV630_referentielPour_(ls.filter(function(l) { return l.code === ligne; })[0] || { code: ligne }, ls);
}
/* Blocs autorisés pour une ligne : ceux de son diplôme, ou de tous les diplômes d'une mixité multi-filières. */
function EUC_DEV631_blocs_(ligne) {
  var ls = EUC_DEV631_lignesPlanning_(), r = EUC_DEV631_referentiel_(ligne, ls); if (r) return r.blocs;
  var l = ls.filter(function(x) { return x.code === ligne; })[0], multi = typeof EUC_DEV630_diplomesMixite_ === 'function' ? EUC_DEV630_diplomesMixite_(l, ls) : [];
  return [].concat.apply([], multi.map(function(m) { return m.blocs; }));
}
function EUC_DEV631_ecrire_(methode, lignes) { for (var i = 0; i < lignes.length; i += 200) EUC_ENT_grist(methode, '/tables/' + EUC_DEV631_TABLE_ + '/records', { records: lignes.slice(i, i + 200) }); }

/* ---------- Services du référent (administration) ---------- */
function EUC_DEV631_lireObjectifs(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV631_tables_();
  var annee = EUC_DEV631_t_(q.annee), ligne = EUC_DEV631_t_(q.ligne);
  return { ok: true, annee: annee, ligne: ligne, blocs: EUC_DEV631_blocs_(ligne).map(function(b) { return { code: b.code, intitule: b.intitule }; }), lu: EUC_DEV631_lireLignes_(EUC_DEV631_lire_(), annee, ligne) };
}
function EUC_DEV631_enregistrerObjectifs(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV631_tables_();
  var annee = EUC_DEV631_t_(q.annee), ligne = EUC_DEV631_t_(q.ligne);
  if (!/^\d{4}-\d{4}$/.test(annee) || !ligne) throw new Error('Année ou formation manquante.');
  var blocs = EUC_DEV631_blocs_(ligne), propre = EUC_DEV631_normaliser_(q, blocs);
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  var e;
  try {
    e = EUC_DEV631_ecritures_(EUC_DEV631_lire_(), annee, ligne, propre, new Date().toISOString());
    if (e.modifier.length) EUC_DEV631_ecrire_('patch', e.modifier);
    if (e.desactiver.length) EUC_DEV631_ecrire_('patch', e.desactiver);
    if (e.creer.length) EUC_DEV631_ecrire_('post', e.creer);
  } finally { lock.releaseLock(); }
  return { ok: true, periodes: propre.periodes.length, objectifs: propre.objectifs.length, lu: EUC_DEV631_lireLignes_(EUC_DEV631_lire_(), annee, ligne) };
}

/* ---------- Livret de l'apprenti ---------- */
/* Lignes de planning rattachées à une classe pour l'année (EUC_PLAN_LIGNES_CLASSES). */
function EUC_DEV631_lignesClasse_(annee, classeId) {
  var rows = []; try { rows = EUC_ENT_grist('get', '/tables/EUC_PLAN_LIGNES_CLASSES/records').records || []; } catch (e) {}
  return rows.map(function(r) { return r.fields || {}; }).filter(function(f) {
    if (EUC_DEV631_t_(f.Annee_scolaire) !== annee) return false;
    var cl = Array.isArray(f.Classes) ? f.Classes.filter(function(x) { return typeof x === 'number'; }) : [];
    return cl.indexOf(Number(classeId)) >= 0;
  }).map(function(f) { return EUC_DEV631_t_(f.Ligne); });
}
/* Ce que voit l'apprenti : sa formation, les blocs de son référentiel et les périodes avec leurs objectifs.
 * La première ligne rattachée qui a des périodes enregistrées l'emporte (classe entière ou section scolaire). */
function EUC_DEV631_pourApprenti_(ctx, decoches) {
  var rows = EUC_DEV631_lire_(), lignes = EUC_DEV631_lignesClasse_(ctx.annee, ctx.classeId), ls = EUC_DEV631_lignesPlanning_();
  var livret = function(lignePeriodes, ref, lu) { return { ligne: lignePeriodes, diplome: ref ? ref.titre : '', blocs: (ref ? ref.blocs : []).map(function(b) { return { code: b.code, intitule: b.intitule }; }),
    periodes: EUC_DEV631_periodesLivret_(lu, ref ? ref.blocs : [], decoches) }; };
  for (var i = 0; i < lignes.length; i++) {
    var lu = EUC_DEV631_lireLignes_(rows, ctx.annee, lignes[i]); if (!lu.periodes.length) continue;
    return livret(lignes[i], EUC_DEV631_referentiel_(lignes[i], ls), lu);
  }
  /* Apprenti en mixité : sa classe est rattachée à la ligne scolaire de sa filière (1MVA → 1BP_MVA), qui donne son diplôme ;
   * les périodes viennent de la mixité qui couvre cette filière (même alternance pour toutes les filières). */
  var cov = typeof EUC_DEV610_couvertureMixites_ === 'function' ? (EUC_DEV610_couvertureMixites_(ls).parLigne || {}) : {};
  for (var j = 0; j < lignes.length; j++) {
    var mix = Object.keys(cov).filter(function(m) { return (cov[m].sections || []).indexOf(lignes[j]) >= 0; });
    for (var k = 0; k < mix.length; k++) {
      var lum = EUC_DEV631_lireLignes_(rows, ctx.annee, mix[k]); if (!lum.periodes.length) continue;
      return livret(mix[k], EUC_DEV631_referentiel_(lignes[j], ls), lum);
    }
  }
  return null;
}
