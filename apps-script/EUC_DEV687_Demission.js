/**
 * DEV687 — Élèves démissionnaires encore présents dans Pronote.
 *
 * L'administration marque l'élève « démissionnaire » depuis le suivi des PFMP : il est masqué tout de suite
 * (Actif = faux) sans attendre Pronote. L'import Pronote ne le réactive pas tant qu'il figure encore dans l'export ;
 * dès qu'il en a disparu, l'import le classe sorti (archivé : Statut_scolarite = SORTI), sans rien supprimer.
 * Tant que l'import ne l'a pas archivé, le marquage peut être annulé.
 */
var EUC_DEV687_TABLE_ = 'EUC_ELEVES_PFMP';

function EUC_DEV687_t_(v) { return String(v == null ? '' : v).trim(); }
function EUC_DEV687_n_(v) { return Number(Array.isArray(v) ? v[1] : v) || 0; }

function EUC_DEV687_assurerColonnes_() {
  var c = function(id, label, type) { return { id: id, fields: { label: label, type: type || 'Text' } }; };
  var voulues = [c('Demission_app', 'Démissionnaire (application)', 'Bool'), c('Date_demission_app', 'Date démission (application)', 'DateTime'), c('Demission_par', 'Démission signalée par'), c('Demission_motif', 'Motif de la démission')];
  var have = {}; (EUC_ENT_grist('get', '/tables/' + EUC_DEV687_TABLE_ + '/columns').columns || []).forEach(function(x) { have[x.id] = true; });
  var manque = voulues.filter(function(x) { return !have[x.id]; });
  if (manque.length) EUC_ENT_grist('post', '/tables/' + EUC_DEV687_TABLE_ + '/columns', { columns: manque });
}
function EUC_DEV687_eleve_(id) {
  id = EUC_DEV687_n_(id); if (!id) throw new Error('Élève non précisé.');
  var e = (EUC_IMPORT_lireRecords_(EUC_DEV687_TABLE_) || []).filter(function(x) { return EUC_DEV687_n_(x.id) === id; })[0];
  if (!e) throw new Error('Élève introuvable.'); return e;
}
function EUC_DEV687_archive_(e) { return EUC_DEV687_t_(e.Statut_scolarite).toUpperCase() === 'SORTI' && e.Present_dernier_import === false; }
function EUC_DEV687_nom_(e) { return [EUC_DEV687_t_(e.Nom), EUC_DEV687_t_(e.Prenom_usage || e.Prenom)].filter(Boolean).join(' '); }

function EUC_DEV687_marquer(q) {
  var ctx = EUC_IMPORT_exigerAdminTexte_(); q = q || {};
  var e = EUC_DEV687_eleve_(q.eleveId), motif = EUC_DEV687_t_(q.motif).slice(0, 300);
  if (e.Demission_app === true) return { ok: true, deja: true, eleve: EUC_DEV687_nom_(e) };
  EUC_DEV687_assurerColonnes_();
  EUC_ENT_grist('patch', '/tables/' + EUC_DEV687_TABLE_ + '/records', { records: [{ id: EUC_DEV687_n_(e.id), fields: { Actif: false, Demission_app: true, Date_demission_app: new Date().toISOString(), Demission_par: EUC_DEV687_t_(ctx.email), Demission_motif: motif } }] });
  console.log('DEV687 élève ' + EUC_DEV687_n_(e.id) + ' marqué démissionnaire par ' + EUC_DEV687_t_(ctx.email));
  return { ok: true, eleve: EUC_DEV687_nom_(e) };
}

function EUC_DEV687_annuler(q) {
  var ctx = EUC_IMPORT_exigerAdminTexte_(); q = q || {};
  var e = EUC_DEV687_eleve_(q.eleveId);
  if (e.Demission_app !== true) throw new Error('Cet élève n’est pas marqué démissionnaire.');
  if (EUC_DEV687_archive_(e)) throw new Error('Cet élève a déjà été archivé par l’import Pronote (il n’y figure plus) : le marquage ne peut plus être annulé ici.');
  EUC_ENT_grist('patch', '/tables/' + EUC_DEV687_TABLE_ + '/records', { records: [{ id: EUC_DEV687_n_(e.id), fields: { Actif: true, Demission_app: false } }] });
  console.log('DEV687 démission annulée pour l’élève ' + EUC_DEV687_n_(e.id) + ' par ' + EUC_DEV687_t_(ctx.email));
  return { ok: true, eleve: EUC_DEV687_nom_(e) };
}

function EUC_DEV687_liste(q) {
  EUC_IMPORT_exigerAdminTexte_(); q = q || {};
  var classeId = EUC_DEV687_n_(q.classeId);
  return (EUC_IMPORT_lireRecords_(EUC_DEV687_TABLE_) || []).filter(function(e) { return e.Demission_app === true && (!classeId || EUC_DEV687_n_(EUC_PFMP_ref_(e.Classe)) === classeId); })
    .map(function(e) { var d = e.Date_demission_app, ms = typeof d === 'number' ? (d < 1e12 ? d * 1000 : d) : /^\d+(\.\d+)?$/.test(EUC_DEV687_t_(d)) ? Number(d) * (Number(d) < 1e12 ? 1000 : 1) : Date.parse(EUC_DEV687_t_(d));
      return { id: EUC_DEV687_n_(e.id), eleve: EUC_DEV687_nom_(e), classe: EUC_DEV687_t_(e.Code_classe_importe), date: isFinite(ms) ? new Date(ms).toISOString() : '', motif: EUC_DEV687_t_(e.Demission_motif), par: EUC_DEV687_t_(e.Demission_par), archive: EUC_DEV687_archive_(e) }; })
    .sort(function(a, b) { return a.eleve.localeCompare(b.eleve, 'fr'); });
}

/* Import Pronote (EUC_IMPORT_PFMP_RichData) : élève encore présent → reste masqué ; absent de l'export → archivé. */
function EUC_DEV687_garderMasque_(ancien, champs) { if (ancien && ancien.Demission_app === true) champs.Actif = false; return champs; }
function EUC_DEV687_archivages_(existants, vus, anneeId, source, now, lot) {
  var out = [];
  (existants || []).forEach(function(r) {
    var f = r.fields || r, id = Number(r.id) || 0;
    if (!id || f.Demission_app !== true || vus[id]) return;
    if (Number(EUC_PFMP_ref_(f.Annee_scolaire)) !== Number(anneeId)) return;
    var brut = EUC_DEV687_t_(f.Source_Pronote || f.Source_import), src = brut && typeof EUC_IMPORT_normaliserSourcePronote_ === 'function' ? EUC_IMPORT_normaliserSourcePronote_(brut) : brut;
    if (src && src !== source) return;
    if (EUC_DEV687_archive_(f)) return;
    out.push({ id: id, fields: { Actif: false, Statut_scolarite: 'SORTI', Sortie_confirmee: true, Present_dernier_import: false, Date_modification: now, Identifiant_lot_import: lot } });
  });
  return out;
}
