/**
 * DEV596 — Nettoyage de la table Grist « Classes » : suppression des colonnes que l'application
 * PFMP + Apprentis n'utilise pas (anciennes saisies, module EDT, copies Pronote).
 *
 * Sécurités :
 * - aperçu d'abord ; suppression seulement avec la confirmation 'SUPPRIMER' ;
 * - une colonne citée par une formule Grist (dans Classes ou dans une autre table qui pointe vers
 *   Classes) n'est jamais supprimée : elle est signalée ;
 * - le contenu de chaque colonne supprimée est d'abord recopié dans la table d'archive
 *   EUC_ARCHIVE_COLONNES_CLASSES (classe, colonne, valeur), pour pouvoir le retrouver ;
 * - les colonnes utiles et les colonnes inconnues ne sont jamais touchées.
 */
var EUC_DEV596_GARDER_ = ['Nom', 'Etab', 'Actif', 'Code_import', 'Classe_PFMP', 'Modalite_apprentissage', 'Organisme_gestionnaire', 'Organisme_donneur_ordre'];
var EUC_DEV596_SUPPRIMER_ = ['PP_source', 'CPE', 'Libelle', 'Formation', 'Niveau', 'Effectif', 'Couleur', 'Commentaire', 'Etablissement_Pronote', 'Niveau_Pronote', 'Filiere_Pronote', 'Principaux_Pronote'];
var EUC_DEV596_ARCHIVE_ = 'EUC_ARCHIVE_COLONNES_CLASSES';

function EUC_DEV596_colonnes_(table) { return EUC_ENT_grist('get', '/tables/' + encodeURIComponent(table) + '/columns').columns || []; }

/* Formules qui citent une colonne de Classes : $X dans Classes, ou .X dans une table ayant une référence vers Classes. */
function EUC_DEV596_dependances_(cibles) {
  var dep = {};
  (EUC_ENT_grist('get', '/tables').tables || []).forEach(function(t) {
    var cols = []; try { cols = EUC_DEV596_colonnes_(t.id); } catch (e) { return; }
    var pointeVersClasses = t.id === 'Classes' || cols.some(function(c) { return /^Ref(List)?:Classes$/.test(String((c.fields || {}).type || '')); });
    if (!pointeVersClasses) return;
    cols.forEach(function(c) {
      var f = c.fields || {}, formule = String(f.formula || ''); if (!formule) return;
      cibles.forEach(function(x) {
        if (t.id === 'Classes' && c.id === x) return;
        var re = t.id === 'Classes' ? new RegExp('(\\$|\\brec\\.)' + x + '\\b') : new RegExp('\\.' + x + '\\b');
        if (re.test(formule)) (dep[x] = dep[x] || []).push(t.id + '.' + c.id);
      });
    });
  });
  return dep;
}

function EUC_DEV596_nettoyerClasses(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var cols = EUC_DEV596_colonnes_('Classes'), ids = cols.map(function(c) { return c.id; });
  var cibles = EUC_DEV596_SUPPRIMER_.filter(function(x) { return ids.indexOf(x) >= 0; });
  var inconnues = ids.filter(function(x) { return EUC_DEV596_GARDER_.indexOf(x) < 0 && EUC_DEV596_SUPPRIMER_.indexOf(x) < 0 && !/^(manualSort|gristHelper_)/.test(x); });
  var dep = EUC_DEV596_dependances_(cibles), bloquees = cibles.filter(function(x) { return dep[x]; }), aSupprimer = cibles.filter(function(x) { return !dep[x]; });
  var res = { ok: true, apercu: q.confirmation !== 'SUPPRIMER', garder: EUC_DEV596_GARDER_.filter(function(x) { return ids.indexOf(x) >= 0; }), aSupprimer: aSupprimer, bloquees: bloquees.map(function(x) { return { colonne: x, formules: dep[x] }; }), inconnues: inconnues };
  if (res.apercu || !aSupprimer.length) return res;
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  try {
    /* 1. Archive du contenu (cellules non vides seulement). */
    var tables = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; });
    if (tables.indexOf(EUC_DEV596_ARCHIVE_) < 0) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV596_ARCHIVE_, columns: [EUC_DEV441_col_('Classe_id', 'Classe (id)', 'Int'), EUC_DEV441_col_('Classe', 'Classe'), EUC_DEV441_col_('Colonne', 'Colonne'), EUC_DEV441_col_('Valeur', 'Valeur'), EUC_DEV441_col_('Archive_le', 'Archivé le')] }] });
    var maintenant = new Date().toISOString(), lignes = [];
    (EUC_ENT_grist('get', '/tables/Classes/records').records || []).forEach(function(r) {
      var f = r.fields || {};
      aSupprimer.forEach(function(x) { var v = f[x]; if (v === null || v === undefined || v === '' || v === false) return; lignes.push({ fields: { Classe_id: Number(r.id), Classe: String(f.Nom || ''), Colonne: x, Valeur: typeof v === 'object' ? JSON.stringify(v) : String(v), Archive_le: maintenant } }); });
    });
    for (var i = 0; i < lignes.length; i += 100) EUC_ENT_grist('post', '/tables/' + EUC_DEV596_ARCHIVE_ + '/records', { records: lignes.slice(i, i + 100) });
    /* 2. Suppression, colonne par colonne. */
    var supprimees = [], erreurs = [];
    aSupprimer.forEach(function(x) { try { EUC_ENT_grist('delete', '/tables/Classes/columns/' + encodeURIComponent(x)); supprimees.push(x); } catch (e) { erreurs.push(x + ' : ' + (e && e.message || e)); } });
    res.archivees = lignes.length; res.supprimees = supprimees; res.erreurs = erreurs;
  } finally { lock.releaseLock(); }
  try { CacheService.getScriptCache().remove('EUC_DEV586_CLASSES'); } catch (e) {}
  return res;
}
