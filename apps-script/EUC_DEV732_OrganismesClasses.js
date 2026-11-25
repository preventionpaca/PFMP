/**
 * DEV732 — Organismes de chaque classe réglés depuis l'application (page « Quotas d'apprentissage »).
 *
 * Trois listes par classe : organisme gestionnaire, donneur d'ordre et organisme de la relation OPCO (celui qui porte
 * le contrat ; la classe entière n'est comptée que dans cet organisme sur l'accueil). Le choix est enregistré dans la
 * table Grist « Classes » (colonnes DEV579), seulement pour les cases réellement modifiées. « Automatique » (vide)
 * laisse la règle par défaut s'appliquer (table de vérité DEV579, puis donneur d'ordre, puis gestionnaire).
 */
var EUC_DEV732_CHAMPS_ = ['gestionnaire', 'donneur', 'opco'];
var EUC_DEV732_LIBELLES_ = { gestionnaire: 'Organisme gestionnaire', donneur: 'Organisme donneur d’ordre', opco: 'Organisme relation OPCO' };

/* Profil d'une ligne de la page des quotas : valeurs effectives et valeurs saisies dans Grist (vides si automatiques). */
function EUC_DEV732_profilLigne_(annee, c) {
  var p = typeof EUC_DEV579_profil_ === 'function' ? EUC_DEV579_profil_(EUC_DEV579_profilsConfig_(), annee, c.id, c.classe, c.etablissement, 'MIXITE') : null;
  var col = (typeof EUC_DEV579_colonnesClasses_ === 'function' ? EUC_DEV579_colonnesClasses_()[String(c.id)] : null) || {};
  return { organismes: p ? p.organismes : [], gestionnaire: p ? p.gestionnaire : '', donneur: p ? p.donneur : '', opco: p ? p.opco || '' : '',
    saisis: { gestionnaire: col.gestionnaire || '', donneur: col.donneur || '', opco: col.opco || '' } };
}

/* Modifications à écrire (calcul pur) : lignes envoyées par la page × enregistrements actuels de la table Classes. */
function EUC_DEV732_modifications_(lignes, records) {
  var C = EUC_DEV579_COLONNES_, actuels = {}, out = [];
  (records || []).forEach(function(r) { actuels[String(r.id)] = r.fields || {}; });
  (lignes || []).forEach(function(l) {
    var o = l && l.organismesSaisis; if (!o || typeof o !== 'object') return;
    var f = actuels[String(l.classeId)]; if (!f) return;
    var champs = {};
    EUC_DEV732_CHAMPS_.forEach(function(k) {
      if (!(k in o)) return;
      var v = String(o[k] || ''); if (v && EUC_DEV579_ORGANISMES_.indexOf(v) < 0) throw new Error('Organisme invalide pour une classe : ' + v);
      if (EUC_DEV579_organismeDe_(f[C[k]]) !== v) champs[C[k]] = v;
    });
    if (Object.keys(champs).length) out.push({ id: Number(l.classeId), fields: champs });
  });
  return out;
}

function EUC_DEV732_ecrireOrganismes_(lignes) {
  if (!(lignes || []).some(function(l) { return l && l.organismesSaisis; })) return 0;
  var C = EUC_DEV579_COLONNES_, mods = EUC_DEV732_modifications_(lignes, EUC_ENT_grist('get', '/tables/Classes/records').records || []);
  if (!mods.length) return 0;
  var cols = (EUC_ENT_grist('get', '/tables/Classes/columns').columns || []).map(function(c) { return c.id; });
  var utiles = {}; mods.forEach(function(m) { Object.keys(m.fields).forEach(function(k) { utiles[k] = true; }); });
  var manquantes = EUC_DEV732_CHAMPS_.filter(function(k) { return utiles[C[k]] && cols.indexOf(C[k]) < 0; });
  if (manquantes.length) EUC_ENT_grist('post', '/tables/Classes/columns', { columns: manquantes.map(function(k) { return { id: C[k], fields: { label: EUC_DEV732_LIBELLES_[k], type: 'Choice', widgetOptions: JSON.stringify({ choices: EUC_DEV579_ORGANISMES_ }) } }; }) });
  for (var i = 0; i < mods.length; i += 100) EUC_ENT_grist('patch', '/tables/Classes/records', { records: mods.slice(i, i + 100) });
  EUC_DEV579_COLONNES_MEMO_ = null;
  return mods.length;
}
