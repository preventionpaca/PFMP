/**
 * Eucalyptus PFMP — DEV655 : fin de Terminale et parcours différencié (PDIF).
 *
 * Décision (9 novembre 2026) : deux conventions distinctes dès le départ.
 *  - la dernière PFMP de Terminale garde ses dates officielles (plus de prolongation) ;
 *  - un élève « PDIF en entreprise » reçoit en plus une convention sur la période PDIF,
 *    avec son propre QR code, éventuellement dans une autre entreprise ;
 *  - un élève peut changer d'avis : la convention PDIF se génère plus tard (dates
 *    individuelles ou début retardé possibles) ou s'annule avant démarrage, sans rupture.
 *
 * Le choix de chaque élève est conservé dans EUC_PARCOURS_DIFFERENCIE_PFMP
 * (Mode_fin_terminale), source lue par le suivi. Le module DEV285B qui servait la page
 * « Fin de Terminale » n'existait plus dans le dépôt : ses deux fonctions sont rétablies
 * ici sous le même nom pour la page.
 */
var EUC_DEV655_TABLE_ = 'EUC_PARCOURS_DIFFERENCIE_PFMP';
var EUC_DEV655_LYCEE_ = 'PARCOURS_DIFF_LYCEE';
var EUC_DEV655_ENTREPRISE_ = 'POURSUITE_PFMP2_ENTREPRISE';

function EUC_DEV655_txt_(v) { return String(v == null ? '' : v).trim(); }
function EUC_DEV655_bool_(v) {
  if (v === true || v === false) return v;
  var s = String(v == null ? '' : v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'oui' || s === 'x';
}

/* Période « PDIF » reconnue par son type (même règle que le générateur). */
function EUC_DEV655_estPeriodePdif_(p) {
  return /^P[\.\s-]*DIF|PARCOURS DIFFERENCIE/.test(EUC_CONVENTION_norm_(p && (p.type || p.Type) || ''));
}

/* Classe de Terminale bac pro (pas CAP, pas BTS), même règle que classKind() du générateur. */
function EUC_DEV655_estTerminale_(nom) {
  var n = EUC_CONVENTION_norm_(nom);
  if (/BTS|CAP/.test(n)) return false;
  if (/^2|2NDE|SECONDE|^1|1ERE|PREMIERE/.test(n)) return false;
  return /^T|TERM/.test(n);
}

/* Modes de mise à jour : LYCEE / ENTREPRISE (générateur) ↔ valeurs stockées (suivi). */
function EUC_DEV655_versStockage_(m) {
  m = EUC_DEV655_txt_(m).toUpperCase();
  if (m === 'LYCEE' || m === EUC_DEV655_LYCEE_) return EUC_DEV655_LYCEE_;
  if (m === 'ENTREPRISE' || m === EUC_DEV655_ENTREPRISE_) return EUC_DEV655_ENTREPRISE_;
  if (!m || m === 'A_DEFINIR') return '';
  throw new Error('Choix de fin de Terminale invalide.');
}
function EUC_DEV655_versGenerateur_(m) {
  return m === EUC_DEV655_LYCEE_ ? 'LYCEE' : m === EUC_DEV655_ENTREPRISE_ ? 'ENTREPRISE' : '';
}

/* Calcul pur : dernière ligne de chaque élève pour l'année. */
function EUC_DEV655_dernieres_(rows, annee) {
  var out = {};
  (rows || []).forEach(function(r) {
    if (!r || EUC_DEV655_txt_(r.Annee_scolaire) !== String(annee)) return;
    var eid = Number(EUC_PFMP_ref_(r.Eleve)) || 0;
    if (!eid) return;
    if (!out[eid] || Number(r.id) > Number(out[eid].id)) out[eid] = r;
  });
  return out;
}
function EUC_DEV655_modeLigne_(r) {
  if (!r) return '';
  var m = EUC_DEV655_txt_(r.Mode_fin_terminale);
  if (!m && EUC_DEV655_bool_(r.Parcours_differencie)) m = EUC_DEV655_LYCEE_;
  return m === EUC_DEV655_LYCEE_ || m === EUC_DEV655_ENTREPRISE_ ? m : '';
}

function EUC_DEV655_assurerTable_() {
  var cols = (EUC_ENT_grist('get', '/tables/' + EUC_DEV655_TABLE_ + '/columns') || {}).columns || [];
  var have = {}; cols.forEach(function(c) { have[c.id] = true; });
  var manque = [
    ['Eleve', 'Élève', 'Ref:EUC_ELEVES_PFMP'], ['Annee_scolaire', 'Année scolaire', 'Text'],
    ['Parcours_differencie', 'Parcours différencié', 'Bool'], ['Mode_fin_terminale', 'Mode fin Terminale', 'Text'],
    ['Actif', 'Actif', 'Bool'], ['Remarque', 'Remarque', 'Text'], ['Date_decision', 'Date décision', 'DateTime'],
    ['Date_modification', 'Modifié le', 'DateTime'], ['Auteur', 'Auteur', 'Text']
  ].filter(function(c) { return !have[c[0]]; }).map(function(c) { return { id: c[0], fields: { label: c[1], type: c[2] } }; });
  if (manque.length) EUC_ENT_grist('post', '/tables/' + EUC_DEV655_TABLE_ + '/columns', { columns: manque });
}
function EUC_DEV655_lignes_() {
  try { return EUC_IMPORT_lireRecords_(EUC_DEV655_TABLE_) || []; } catch (e) { return []; }
}

/* Enregistre plusieurs choix d'un coup : { eleveId: 'LYCEE' | 'ENTREPRISE' | '' }. Un choix identique n'écrit rien. */
function EUC_DEV655_enregistrerModes_(ctx, annee, choix, remarques) {
  annee = EUC_DEV655_txt_(annee); remarques = remarques || {};
  var ids = Object.keys(choix || {}).filter(function(k) { return Number(k) > 0; });
  if (!annee || !ids.length) return { modifies: 0 };
  EUC_DEV655_assurerTable_();
  var dernieres = EUC_DEV655_dernieres_(EUC_DEV655_lignes_(), annee), now = new Date().toISOString(), patch = [], post = [];
  ids.forEach(function(k) {
    var mode = EUC_DEV655_versStockage_(choix[k]), ex = dernieres[Number(k)] || null;
    var rem = Object.prototype.hasOwnProperty.call(remarques, k) ? EUC_DEV655_txt_(remarques[k]) : (ex ? EUC_DEV655_txt_(ex.Remarque) : '');
    if (ex && EUC_DEV655_modeLigne_(ex) === mode && EUC_DEV655_txt_(ex.Remarque) === rem && ex.Actif !== false) return;
    var f = { Eleve: Number(k), Annee_scolaire: annee, Mode_fin_terminale: mode, Parcours_differencie: mode === EUC_DEV655_LYCEE_,
      Actif: true, Remarque: rem, Date_decision: mode ? now : null, Date_modification: now, Auteur: (ctx && ctx.email) || '' };
    if (ex) patch.push({ id: Number(ex.id), fields: f }); else post.push({ fields: f });
  });
  if (patch.length) EUC_ENT_grist('patch', '/tables/' + EUC_DEV655_TABLE_ + '/records', { records: patch });
  if (post.length) EUC_ENT_grist('post', '/tables/' + EUC_DEV655_TABLE_ + '/records', { records: post });
  return { modifies: patch.length + post.length };
}

/* Générateur : choix déjà enregistrés pour l'année, au format LYCEE / ENTREPRISE. */
function EUC_DEV655_modesFinTerminale(annee) {
  EUC_IMPORT_exigerAdminTexte_();
  var d = EUC_DEV655_dernieres_(EUC_DEV655_lignes_(), EUC_DEV655_txt_(annee)), out = {};
  Object.keys(d).forEach(function(k) { var m = EUC_DEV655_versGenerateur_(EUC_DEV655_modeLigne_(d[k])); if (m) out[k] = m; });
  return { annee: EUC_DEV655_txt_(annee), modes: out };
}

/* Page « Fin de Terminale » : classes de Terminale (promotions des élèves). */
function EUC_DEV655_terminales_() {
  return (EUC_DEV526_generateurPayload_().groupes || []).filter(function(g) { return EUC_DEV655_estTerminale_(g.nom); })
    .map(function(g) { return { id: g.nom, nom: g.nom, effectif: g.effectif }; });
}

/* Page « Fin de Terminale » : élèves de la classe et leur choix. */
function EUC_DEV285B_loadChoices(annee, classeId, classeNom) {
  EUC_IMPORT_exigerAdminTexte_();
  var cle = EUC_CONVENTION_norm_(classeNom || classeId);
  var d = EUC_DEV655_dernieres_(EUC_DEV655_lignes_(), EUC_DEV655_txt_(annee));
  var eleves = (EUC_DEV526_generateurPayload_().eleves || []).filter(function(e) { return EUC_CONVENTION_norm_(e.classe) === cle; });
  return { ok: true, students: eleves.map(function(e) {
    var r = d[Number(e.id)] || null;
    return { id: Number(e.id), nom: e.nom || '', prenom: e.prenom || '', mode: EUC_DEV655_modeLigne_(r), remarque: r ? EUC_DEV655_txt_(r.Remarque) : '' };
  }) };
}

function EUC_DEV285B_saveChoice(p) {
  var ctx = EUC_IMPORT_exigerAdminTexte_(); p = p || {};
  var annee = EUC_DEV655_txt_(p.annee), eid = Number(p.eleveId) || 0;
  if (!annee || !eid) throw new Error('Année et élève obligatoires.');
  var choix = {}, rem = {}; choix[eid] = p.mode; rem[eid] = p.remarque;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Un autre enregistrement est en cours. Réessayez dans quelques secondes.');
  try { EUC_DEV655_enregistrerModes_(ctx, annee, choix, rem); } finally { lock.releaseLock(); }
  return { ok: true, mode: EUC_DEV655_versStockage_(p.mode) };
}
