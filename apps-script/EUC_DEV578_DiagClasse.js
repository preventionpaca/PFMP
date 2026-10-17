/**
 * DEV578 — Diagnostic d'une classe introuvable dans l'application (ex. 1MELEC C).
 *
 * Lecture seule, administration PFMP. Cherche la classe par son nom exact
 * (sans tenir compte des accents, de la casse ni de la ponctuation) dans le
 * référentiel Classes, puis toutes ses traces : références par identifiant ou
 * mentions du nom dans les élèves, périodes, correspondances Pronote,
 * professeurs, diplômes, réglages de l'apprentissage, et enfin dans le modèle
 * du nouveau suivi. Le rapport dit où la classe se perd.
 */
function EUC_DEV578_cleClasse_(v) {
  return String(v == null ? '' : v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}

function EUC_DEV578_diagClasse(nom, annee) {
  EUC_SUIVI2_exigerAdmin_();
  var cle = EUC_DEV578_cleClasse_(nom);
  if (!cle) throw new Error('Indiquez le nom de la classe.');
  annee = String(annee || '') || (typeof EUC_DEV368_year === 'function' ? EUC_DEV368_year('') : '');
  var lire = function(t) { try { return EUC_ENT_grist('get', '/tables/' + encodeURIComponent(t) + '/records').records || []; } catch (e) { return null; } };
  var rapport = { classe: nom, cle: cle, annee: annee, referentiel: [], traces: [], suivi: null, apprentissage: null };

  /* 1. Référentiel : lignes dont un libellé vaut exactement le nom ; lignes voisines signalées. */
  var ids = {}, classes = lire('Classes') || [];
  classes.forEach(function(r) {
    var f = r.fields || {}, noms = ['Nom', 'Libelle', 'Code', 'Code_import', 'Nom_Pronote', 'Classe'].map(function(k) { return EUC_DEV578_cleClasse_(f[k]); }).filter(Boolean);
    var exact = noms.indexOf(cle) >= 0, voisin = !exact && noms.some(function(n) { return n.indexOf(cle.split(' ')[0]) === 0; });
    if (exact) ids[r.id] = true;
    if (exact || voisin) rapport.referentiel.push({ id: r.id, exact: exact, nom: String(f.Nom || f.Libelle || ''), actif: f.Actif, annee: String(f.Annee_scolaire || f.Annee || ''), famille: String(f.Famille || f.Formation || '') });
  });

  /* 2. Traces dans les autres tableaux : référence à l'identifiant ou nom exact. */
  ['Planning_Periodes', 'EUC_ELEVES_PFMP', 'EUC_CORRESPONDANCE_CLASSES_PRONOTE', 'EUC_CLASSES_PROFESSEURS_PFMP', 'EUC_CLASSES_DIPLOMES_PFMP', 'EUC_APPRENTISSAGE_PFMP', 'EUC_ACCES_FORMULAIRES_PFMP'].forEach(function(t) {
    var recs = lire(t);
    if (recs === null) { rapport.traces.push({ table: t, erreur: 'tableau illisible ou absent' }); return; }
    var n = 0, exemples = [], champs = {};
    recs.forEach(function(r) {
      var f = r.fields || {}, trouve = [];
      Object.keys(f).forEach(function(k) {
        var v = f[k];
        if (typeof v === 'number' && ids[v] && /classe/i.test(k)) trouve.push(k + '=' + v);
        else if (Array.isArray(v) && v[0] === 'L' && v.slice(1).some(function(x) { return ids[x]; })) trouve.push(k + ' (liste)');
        else if (typeof v === 'string' && v.length < 80 && EUC_DEV578_cleClasse_(v) === cle) trouve.push(k + '="' + v + '"');
      });
      if (!trouve.length) return;
      n++; trouve.forEach(function(x) { var k = x.split(/[=( ]/)[0]; champs[k] = (champs[k] || 0) + 1; });
      if (exemples.length < 4) {
        var ex = { id: r.id, champs: trouve.join(', ') };
        if (t === 'EUC_CORRESPONDANCE_CLASSES_PRONOTE') { ex.exclure = f.Exclure_import; ex.cible = String(f.Classe_Grist_nom || f.Classe_Grist || ''); ex.anneeLigne = String(f.Annee_scolaire || ''); }
        if (t === 'EUC_ELEVES_PFMP') { ex.actif = f.Actif; ex.anneeLigne = String(f.Annee_scolaire_code || f.Annee_scolaire || ''); }
        exemples.push(ex);
      }
    });
    rapport.traces.push({ table: t, lignes: n, champs: champs, exemples: exemples });
  });

  /* 3. Réglages apprentissage (classe incluse / exclue) et 4. nouveau suivi. */
  try {
    var actifs = EUC_DEV542_activeClassesConfig_();
    rapport.apprentissage = Object.keys(ids).map(function(id) { return { id: Number(id), active: EUC_DEV542_classActive_(actifs, annee, Number(id)) }; });
  } catch (e) { rapport.apprentissage = 'réglage illisible'; }
  try {
    var m = EUC_SUIVI2_modele_(annee), trouvees = (m.classes || []).filter(function(c) { return EUC_DEV578_cleClasse_(c.nom || c.classe) === cle; });
    rapport.suivi = { presente: trouvees.length > 0, eleves: trouvees.length ? (trouvees[0].eleves || []).length : 0 };
  } catch (e2) { rapport.suivi = 'modèle illisible : ' + String(e2 && e2.message || e2).slice(0, 120); }
  return rapport;
}

/* ---------- Réparation d'une classe exclue par erreur (administration PFMP) ----------
 * À partir d'une classe modèle (ex. 1MELEC pour 1MELEC2) : crée la ligne du
 * référentiel en recopiant les champs saisis du modèle, lève l'exclusion des
 * correspondances Pronote de l'année et rattache la classe aux mêmes périodes
 * de l'année que le modèle. Sans « REPARER », rien n'est écrit : le plan est
 * seulement renvoyé pour être relu. Les élèves arrivent ensuite par
 * l'import Pronote habituel. */
function EUC_DEV578_planReparation_(nom, modele, annee) {
  var cle = EUC_DEV578_cleClasse_(nom), cleModele = EUC_DEV578_cleClasse_(modele);
  if (!cle || !cleModele) throw new Error('Indiquez la classe à réparer et la classe modèle.');
  if (cle === cleModele) throw new Error('La classe modèle doit être une autre classe.');
  var lire = function(t) { return EUC_ENT_grist('get', '/tables/' + encodeURIComponent(t) + '/records').records || []; };
  var nomDe = function(f) { return ['Nom', 'Libelle', 'Code_import'].map(function(k) { return EUC_DEV578_cleClasse_(f[k]); }); };
  var classes = lire('Classes');
  if (classes.some(function(r) { return nomDe(r.fields || {}).indexOf(cle) >= 0; })) throw new Error('La classe « ' + nom + ' » existe déjà dans le référentiel : rien à créer.');
  var mod = classes.filter(function(r) { var f = r.fields || {}; return f.Actif !== false && nomDe(f).indexOf(cleModele) >= 0; })[0];
  if (!mod) throw new Error('Classe modèle « ' + modele + ' » introuvable ou inactive.');
  var colonnes = EUC_ENT_grist('get', '/tables/Classes/columns').columns || [], champs = {}, existe = {};
  /* Champs descriptifs seulement : jamais d'identifiant, de code ni de clé du modèle (la nouvelle classe serait confondue avec lui). */
  var identifiant = /(^|_)(id|ident|identifiant|uuid|cle|key|numero|code|hash|source)(_|$)/i;
  colonnes.forEach(function(c) {
    var f = c.fields || {}, v = (mod.fields || {})[c.id];
    existe[c.id] = true;
    if (f.isFormula || c.id === 'manualSort' || identifiant.test(c.id) || /^(Nom|Libelle)$/.test(c.id)) return;
    if (v === undefined || v === null || v === '') return;
    champs[c.id] = v;
  });
  ['Nom', 'Libelle', 'Code_import'].forEach(function(k) { if (existe[k]) champs[k] = nom; });
  if (existe.Actif) champs.Actif = true;
  if (!existe.Nom && !existe.Libelle) throw new Error('Le référentiel Classes n’a ni colonne Nom ni colonne Libelle.');
  var annees = {};
  try { lire('Annees_Scolaires').forEach(function(a) { var f = a.fields || {}; annees[a.id] = String(f.Code || f.Libelle || ''); }); } catch (e) {}
  var periodes = lire('Planning_Periodes').filter(function(p) {
    var f = p.fields || {}, l = f.Classes_concernees;
    if (f.Actif === false || !Array.isArray(l) || l[0] !== 'L' || l.indexOf(mod.id) < 1) return false;
    var an = typeof f.Annee_scolaire === 'number' ? annees[f.Annee_scolaire] : String(f.Annee_scolaire || '');
    return !an || an === annee;
  }).map(function(p) { var f = p.fields || {}; return { id: p.id, libelle: String(f.Libelle_periode || f.Libelle || f.Nom || ('Période ' + p.id)), debut: String(f.Date_debut || ''), liste: f.Classes_concernees }; });
  var corr = [];
  try {
    corr = lire('EUC_CORRESPONDANCE_CLASSES_PRONOTE').filter(function(r) { var f = r.fields || {}; return EUC_DEV578_cleClasse_(f.Nom_classe_Pronote) === cle && (!f.Annee_scolaire || String(f.Annee_scolaire) === annee); })
      .map(function(r) { return { id: r.id, exclure: (r.fields || {}).Exclure_import === true }; });
  } catch (e2) { corr = []; }
  return { nom: nom, modele: { id: mod.id, nom: String((mod.fields || {}).Nom || modele) }, champs: champs, periodes: periodes, correspondances: corr, annee: annee };
}

function EUC_DEV578_reparerClasse(nom, modele, annee, confirmation) {
  var ctx = EUC_SUIVI2_exigerAdmin_();
  annee = String(annee || '') || (typeof EUC_DEV368_year === 'function' ? EUC_DEV368_year('') : '');
  var plan = EUC_DEV578_planReparation_(nom, modele, annee);
  var resume = { classe: plan.nom, modele: plan.modele.nom, champs: Object.keys(plan.champs), periodes: plan.periodes.map(function(p) { return p.libelle + (p.debut ? ' (' + String(p.debut).slice(0, 10) + ')' : ''); }), correspondances: plan.correspondances.length, annee: annee };
  if (confirmation !== 'REPARER') { resume.apercu = true; return resume; }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  try {
    var cree = EUC_ENT_grist('post', '/tables/Classes/records', { records: [{ fields: plan.champs }] }), id = cree && cree.records && cree.records[0] && cree.records[0].id;
    if (!id) throw new Error('Création de la classe refusée par Grist.');
    if (plan.periodes.length) EUC_ENT_grist('patch', '/tables/Planning_Periodes/records', { records: plan.periodes.map(function(p) { return { id: p.id, fields: { Classes_concernees: p.liste.concat([id]) } }; }) });
    if (plan.correspondances.length) EUC_ENT_grist('patch', '/tables/EUC_CORRESPONDANCE_CLASSES_PRONOTE/records', { records: plan.correspondances.map(function(c) { return { id: c.id, fields: { Exclure_import: false, Classe_Grist: id, Classe_Grist_nom: plan.nom } }; }) });
    resume.apercu = false; resume.id = id; resume.par = String(ctx.email || '');
    return resume;
  } finally { lock.releaseLock(); }
}
