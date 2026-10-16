/**
 * DEV578 — Codes postaux privés de leur 0 initial (6160 au lieu de 06160).
 *
 * Cause : une colonne « Code postal » de type Nombre dans Grist convertit
 * « 06160 » en 6160 ; aucun code postal français n'a 4 chiffres, la valeur est
 * donc sûrement tronquée. L'outil (administration PFMP seulement) :
 *  1. analyse toutes les colonnes de code postal de tous les tableaux Grist
 *     (type de la colonne, valeurs à 4 chiffres) — lecture seule ;
 *  2. sur demande explicite, passe ces colonnes en Texte (sans quoi le 0
 *     disparaîtrait de nouveau) puis réécrit les valeurs avec leur 0.
 * Les colonnes calculées par formule ne sont jamais modifiées : elles sont
 * seulement signalées.
 */
var EUC_DEV578_CP_COLONNE_ = /(^|_)(code_?postal|cp)(_|$)|codepostal/i;

function EUC_DEV578_cpCorrige_(v) {
  if (v === null || v === undefined || v === '') return null;
  var s = typeof v === 'number' ? (isFinite(v) && Math.floor(v) === v ? String(v) : '') : String(v).trim();
  /* « 0600 » n'est pas un 0 perdu mais une saisie incomplète : jamais complété automatiquement. */
  return /^[1-9]\d{3}$/.test(s) ? '0' + s : null;
}

function EUC_DEV578_cpColonnes_() {
  var out = [];
  (EUC_ENT_grist('get', '/tables').tables || []).forEach(function(t) {
    var cols = [];
    try { cols = EUC_ENT_grist('get', '/tables/' + t.id + '/columns').columns || []; } catch (e) { return; }
    cols.forEach(function(c) {
      var f = c.fields || {};
      if (!EUC_DEV578_CP_COLONNE_.test(c.id) && !/code\s*postal/i.test(String(f.label || ''))) return;
      out.push({ table: t.id, colonne: c.id, type: String(f.type || ''), formule: !!f.isFormula });
    });
  });
  return out;
}

function EUC_DEV578_cpAnalyser_() {
  var colonnes = EUC_DEV578_cpColonnes_(), parTable = {};
  colonnes.forEach(function(c) { (parTable[c.table] = parTable[c.table] || []).push(c); });
  Object.keys(parTable).forEach(function(table) {
    var recs = [];
    try { recs = EUC_ENT_grist('get', '/tables/' + table + '/records').records || []; } catch (e) { parTable[table].forEach(function(c) { c.erreur = 'lecture impossible'; }); return; }
    parTable[table].forEach(function(c) {
      c.lignes = [];
      recs.forEach(function(r) {
        var v = (r.fields || {})[c.colonne], cor = EUC_DEV578_cpCorrige_(v);
        if (cor) c.lignes.push({ id: r.id, avant: v, apres: cor });
      });
      c.nombre = c.lignes.length;
      c.typeTexte = c.type === 'Text';
    });
  });
  return colonnes;
}

/* Lecture seule : ce qui serait corrigé. */
function EUC_DEV578_cpAnalyse() {
  EUC_SUIVI2_exigerAdmin_();
  return EUC_DEV578_cpAnalyser_().map(function(c) {
    return { table: c.table, colonne: c.colonne, type: c.type, formule: c.formule, nombre: c.nombre || 0, erreur: c.erreur || '',
      exemples: (c.lignes || []).slice(0, 5).map(function(l) { return String(l.avant) + ' → ' + l.apres; }) };
  });
}

/* Correction : colonnes en Texte puis valeurs complétées par le 0. */
function EUC_DEV578_cpCorriger(confirmation) {
  var ctx = EUC_SUIVI2_exigerAdmin_();
  if (confirmation !== 'CORRIGER') throw new Error('Confirmation absente.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  try {
    var rapport = [];
    EUC_DEV578_cpAnalyser_().forEach(function(c) {
      var r = { table: c.table, colonne: c.colonne, typeAvant: c.type, typeApres: c.type, corriges: 0, ignore: '' };
      if (c.formule) { r.ignore = 'colonne calculée par formule'; rapport.push(r); return; }
      if (c.erreur) { r.ignore = c.erreur; rapport.push(r); return; }
      if (c.type !== 'Text' && /^(Numeric|Int|Any)$/.test(c.type)) {
        EUC_ENT_grist('patch', '/tables/' + c.table + '/columns', { columns: [{ id: c.colonne, fields: { type: 'Text' } }] });
        r.typeApres = 'Text';
      }
      var lignes = c.lignes || [];
      for (var i = 0; i < lignes.length; i += 100) {
        EUC_ENT_grist('patch', '/tables/' + c.table + '/records', { records: lignes.slice(i, i + 100).map(function(l) {
          var f = {}; f[c.colonne] = l.apres; return { id: l.id, fields: f };
        }) });
      }
      r.corriges = lignes.length;
      rapport.push(r);
    });
    return { ok: true, par: String(ctx.email || ''), rapport: rapport };
  } finally { lock.releaseLock(); }
}
