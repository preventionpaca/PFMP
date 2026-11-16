/**
 * DEV675 — Professeur principal ajouté dans l'application (dépannage quand l'import Pronote est vide ou mal codé).
 *
 * Depuis le lot de la page « Accès professeurs principaux », l'administration choisit un professeur dans la liste
 * déjà importée (EUC_PROFESSEURS_PFMP) : aucun nom n'est retapé. Le lien est marqué Source_Pronote = MANUEL_PFMP.
 * L'import Pronote reste prioritaire : dès qu'il fournit un professeur principal pour la classe, le lien manuel est
 * désactivé (ou repris tel quel s'il s'agit du même professeur). Un import sans professeur principal ne l'efface pas.
 */
var EUC_DEV675_SOURCE_ = 'MANUEL_PFMP';
var EUC_DEV675_TABLE_ = 'EUC_CLASSES_PROFESSEURS_PFMP';

function EUC_DEV675_nom_(p) { return [p.Civilite, p.Prenom, p.Nom].map(EUC_DEV441_t_).filter(Boolean).join(' '); }

/* Liste des professeurs déjà importés (actifs), pour le menu de choix. */
function EUC_DEV675_professeurs() {
  EUC_DEV441_admin_();
  return (EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP') || []).filter(function(p) { return p.Actif !== false && EUC_DEV441_t_(p.Nom); })
    .map(function(p) { return { id: EUC_DEV441_n_(p.id), nom: EUC_DEV675_nom_(p), tri: (EUC_DEV441_t_(p.Nom) + ' ' + EUC_DEV441_t_(p.Prenom)).toUpperCase(), email: EUC_DEV444_email_(p.Email) }; })
    .sort(function(a, b) { return a.tri.localeCompare(b.tri, 'fr'); })
    .map(function(p) { return { id: p.id, nom: p.nom, email: p.email }; });
}

/* Liens manuels actifs, par classe|professeur → id du lien (pour afficher « Retirer »). */
function EUC_DEV675_manuels_() {
  var out = {};
  (EUC_IMPORT_lireRecords_(EUC_DEV675_TABLE_) || []).forEach(function(l) {
    if (l.Actif === false || EUC_DEV441_t_(l.Role) !== 'PROFESSEUR_PRINCIPAL' || EUC_DEV441_t_(l.Source_Pronote) !== EUC_DEV675_SOURCE_) return;
    out[EUC_DEV441_n_(EUC_PFMP_ref_(l.Classe)) + '|' + EUC_DEV441_n_(EUC_PFMP_ref_(l.Professeur))] = EUC_DEV441_n_(l.id);
  });
  return out;
}
function EUC_DEV675_marquer_(classes) {
  var m = {}; try { m = EUC_DEV675_manuels_(); } catch (e) { return classes; }
  (classes || []).forEach(function(c) { (c.principaux || []).forEach(function(p) { var id = m[c.classeId + '|' + p.id]; if (id) p.manuel = id; }); });
  return classes;
}
function EUC_DEV675_oublierCache_(classeId) { try { CacheService.getScriptCache().remove('DEV455_PP_' + classeId); } catch (e) {} }

function EUC_DEV675_ajouterPp(q) {
  var ctx = EUC_DEV441_admin_(); q = q || {};
  var annee = EUC_DEV368_year(q.annee), classeId = EUC_DEV441_n_(q.classeId), profId = EUC_DEV441_n_(q.profId);
  if (!classeId || !profId) throw new Error('Choisissez une classe et un professeur.');
  var classe = EUC_DEV441_catalog_(annee, false).classes.filter(function(c) { return c.classeId === classeId; })[0];
  if (!classe) throw new Error('Classe introuvable pour cette année.');
  var prof = (EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP') || []).filter(function(p) { return EUC_DEV441_n_(p.id) === profId && p.Actif !== false; })[0];
  if (!prof) throw new Error('Ce professeur n’est pas dans la liste importée.');
  if (!EUC_DEV444_email_(prof.Email)) throw new Error(EUC_DEV675_nom_(prof) + ' n’a pas de courriel : il ne pourrait pas recevoir son code.');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(10000)) throw new Error('Une autre modification est en cours, réessayez.');
  try {
    var deja = (EUC_IMPORT_lireRecords_(EUC_DEV675_TABLE_) || []).filter(function(l) { return l.Actif !== false && EUC_DEV441_t_(l.Role) === 'PROFESSEUR_PRINCIPAL' && EUC_DEV441_n_(EUC_PFMP_ref_(l.Classe)) === classeId && EUC_DEV441_n_(EUC_PFMP_ref_(l.Professeur)) === profId; })[0];
    if (deja) return { ok: true, deja: true, classe: classe.classe, professeur: EUC_DEV675_nom_(prof) };
    var now = new Date().toISOString();
    EUC_ENT_grist('post', '/tables/' + EUC_DEV675_TABLE_ + '/records', { records: [{ fields: { Classe: classeId, Professeur: profId, Role: 'PROFESSEUR_PRINCIPAL', Source_Pronote: EUC_DEV675_SOURCE_, Annee_scolaire: annee, Actif: true, Date_modification: now } }] });
  } finally { lock.releaseLock(); }
  EUC_DEV675_oublierCache_(classeId);
  console.log('DEV675 professeur principal ajouté : classe ' + classeId + ', professeur ' + profId + ', par ' + EUC_DEV441_t_(ctx.email));
  return { ok: true, classe: classe.classe, professeur: EUC_DEV675_nom_(prof) };
}

/* Seul un lien ajouté dans l'application peut être retiré ici ; ceux de Pronote se corrigent par l'import. */
function EUC_DEV675_retirerPp(q) {
  EUC_DEV441_admin_(); var id = EUC_DEV441_n_(q && q.lienId);
  var l = (EUC_IMPORT_lireRecords_(EUC_DEV675_TABLE_) || []).filter(function(x) { return EUC_DEV441_n_(x.id) === id; })[0];
  if (!l || l.Actif === false) throw new Error('Lien introuvable ou déjà retiré.');
  if (EUC_DEV441_t_(l.Source_Pronote) !== EUC_DEV675_SOURCE_) throw new Error('Ce professeur principal vient de Pronote : corrigez-le par l’import.');
  var now = new Date().toISOString();
  EUC_ENT_grist('patch', '/tables/' + EUC_DEV675_TABLE_ + '/records', { records: [{ id: id, fields: { Actif: false, Retire_le: now, Date_modification: now } }] });
  EUC_DEV675_oublierCache_(EUC_DEV441_n_(EUC_PFMP_ref_(l.Classe)));
  return { ok: true };
}
