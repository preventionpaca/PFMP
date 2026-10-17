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
