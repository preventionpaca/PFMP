/**
 * DEV651 — Registre national des entreprises (INPI, API RNE) pour les entreprises « non diffusibles ».
 *
 * L'annuaire data.gouv (INSEE) masque nom et adresse d'un entrepreneur opposé à la diffusion ; le registre
 * de l'INPI les publie. L'API RNE (compte data.inpi.fr, accès « Informations des entreprises ») permet de
 * les lire depuis le serveur. Ordre : base de l'application → data.gouv → INPI (non diffusible seulement)
 * → à défaut, saisie par l'élève (DEV649).
 *
 * Identifiants dans les propriétés du script (jamais dans Git ni les journaux), saisis depuis la page
 * d'administration « Accès INPI » (l'éditeur Apps Script n'affiche que 50 propriétés). Le branchement
 * sur les pages des élèves ne s'applique qu'après activation explicite (INPI_RNE_ACTIF = OUI).
 */
var EUC_DEV651_API_ = 'https://registre-national-entreprises.inpi.fr/api';
var EUC_DEV651_CLES_ = { identifiant: 'INPI_RNE_IDENTIFIANT', motDePasse: 'INPI_RNE_MOT_DE_PASSE', actif: 'INPI_RNE_ACTIF' };

function EUC_DEV651_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
function EUC_DEV651_props_() { return PropertiesService.getScriptProperties(); }
function EUC_DEV651_configure_() { var p = EUC_DEV651_props_(); return !!(p.getProperty(EUC_DEV651_CLES_.identifiant) && p.getProperty(EUC_DEV651_CLES_.motDePasse)); }
function EUC_DEV651_actif_() { return EUC_DEV651_props_().getProperty(EUC_DEV651_CLES_.actif) === 'OUI' && EUC_DEV651_configure_(); }

/* ---------- Appels à l'API ---------- */
function EUC_DEV651_jeton_(forcer) {
  var cache = CacheService.getScriptCache(), cle = 'EUC_DEV651_JETON';
  if (!forcer) { var j = cache.get(cle); if (j) return j; }
  var p = EUC_DEV651_props_(), id = p.getProperty(EUC_DEV651_CLES_.identifiant), mdp = p.getProperty(EUC_DEV651_CLES_.motDePasse);
  if (!id || !mdp) throw new Error('Identifiants INPI non enregistrés.');
  var r = UrlFetchApp.fetch(EUC_DEV651_API_ + '/sso/login', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ username: id, password: mdp }), muteHttpExceptions: true });
  var code = r.getResponseCode();
  if (code === 401 || code === 403) throw new Error('INPI : identifiant ou mot de passe refusé (' + code + ').');
  if (code !== 200) throw new Error('INPI : connexion impossible (HTTP ' + code + ').');
  var jeton = (JSON.parse(r.getContentText() || '{}') || {}).token;
  if (!jeton) throw new Error('INPI : connexion acceptée mais aucun jeton reçu.');
  cache.put(cle, jeton, 1800);
  return jeton;
}

function EUC_DEV651_lireEntreprise_(siren) {
  siren = String(siren || '').replace(/\D/g, '');
  if (!/^\d{9}$/.test(siren)) throw new Error('SIREN invalide.');
  var appel = function(jeton) { return UrlFetchApp.fetch(EUC_DEV651_API_ + '/companies/' + siren, { headers: { Authorization: 'Bearer ' + jeton, Accept: 'application/json' }, muteHttpExceptions: true }); };
  var r = appel(EUC_DEV651_jeton_(false));
  if (r.getResponseCode() === 401 || r.getResponseCode() === 403) r = appel(EUC_DEV651_jeton_(true));
  var code = r.getResponseCode();
  if (code === 404) return null;
  if (code === 429) throw new Error('INPI : trop de demandes, réessayer plus tard.');
  if (code !== 200) throw new Error('INPI : lecture impossible (HTTP ' + code + ').');
  return JSON.parse(r.getContentText() || 'null');
}

/* ---------- Calcul pur : réponse RNE → fiche entreprise ---------- */
function EUC_DEV651_adresse_(a) {
  a = a || {};
  var voie = [a.numVoie, a.indiceRepetition, a.typeVoie, a.voie].map(EUC_DEV651_t_).filter(Boolean).join(' ');
  return { voie: voie, complement: EUC_DEV651_t_(a.complementLocalisation), codePostal: EUC_DEV651_t_(a.codePostal), commune: EUC_DEV651_t_(a.commune), pays: EUC_DEV651_t_(a.pays) };
}
function EUC_DEV651_mapper_(json, siret) {
  var f = (json && json.formality) || {}, c = f.content || {}, s = String(siret || '').replace(/\D/g, '');
  var pm = c.personneMorale, pp = c.personnePhysique, ex = c.exploitation, base = pm || pp || ex;
  if (!base) return null;
  var nom = '';
  if (pm) nom = EUC_DEV651_t_(((pm.identite || {}).entreprise || {}).denomination);
  if (!nom && pp) { var dp = ((pp.identite || {}).entrepreneur || {}).descriptionPersonne || {}; nom = [EUC_DEV651_t_(dp.nomUsage || dp.nom), [].concat(dp.prenoms || []).map(EUC_DEV651_t_).join(' ')].filter(Boolean).join(' '); }
  if (!nom && ex) nom = EUC_DEV651_t_(((ex.identite || {}).entreprise || {}).denomination);
  var etabs = [base.etablissementPrincipal].concat(base.autresEtablissements || []).filter(Boolean), etab = null;
  etabs.some(function(e) { if (String(((e.descriptionEtablissement || {}).siret) || '').replace(/\D/g, '') === s) { etab = e; return true; } return false; });
  var d = (etab || {}).descriptionEtablissement || {};
  var adr = EUC_DEV651_adresse_(etab && etab.adresse && (etab.adresse.voie || etab.adresse.commune) ? etab.adresse : (base.adresseEntreprise || {}).adresse);
  return { nom: nom, enseigne: EUC_DEV651_t_(d.nomCommercial || d.enseigne), siretTrouve: !!etab, adresse: adr.voie, complement: adr.complement, codePostal: adr.codePostal, commune: adr.commune, pays: adr.pays };
}
function EUC_DEV651_complete_(x) { return !!(x && x.nom && x.adresse && x.codePostal && x.commune); }

/* Complète une entreprise non diffusible (format EUC_ENT_mapperReponseApi) depuis l'INPI.
 * Renvoie l'entreprise inchangée si l'INPI n'est pas actif, ne répond pas ou renvoie une fiche incomplète. */
function EUC_DEV651_completerNonDiffusible_(ent, siret) {
  if (!ent || ent.nonDiffusible !== true) return ent;
  try {
    if (!EUC_DEV651_actif_()) return ent;
    var x = EUC_DEV651_mapper_(EUC_DEV651_lireEntreprise_(String(siret).slice(0, 9)), siret);
    if (!EUC_DEV651_complete_(x)) return ent;
    var r = Object.assign({}, ent, { raisonSociale: x.nom, enseigne: ent.enseigne || x.enseigne, numeroVoie: x.adresse, adresseComplete: x.adresse, complementAdresse: x.complement,
      codePostal: x.codePostal, commune: x.commune, pays: 'France', sourceIdentite: 'INPI_RNE', diffusionPartielle: true });
    delete r.nonDiffusible;
    return r;
  } catch (e) {
    try { console.warn('DEV651 INPI indisponible : ' + String(e && e.message || e).slice(0, 160)); } catch (e2) {}
    return ent;
  }
}

/* ---------- Administration : page « Accès INPI » ---------- */
function EUC_DEV651_exigerGestion_() {
  var ctx = EUC_IMPORT_exigerAdminTexte_();
  if (['DDFPT', 'ADMIN_PFMP'].indexOf(ctx.role) < 0) throw new Error('Réservé à l’administration PFMP.');
  return ctx;
}
function EUC_DEV651_afficher(e) {
  EUC_IMPORT_exigerAdminTexte_();
  var t = HtmlService.createTemplateFromFile('Acces_INPI_DEV651');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  return t.evaluate().setTitle('Accès INPI — PFMP').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function EUC_DEV651_etat() {
  EUC_IMPORT_exigerAdminTexte_();
  var p = EUC_DEV651_props_(), id = p.getProperty(EUC_DEV651_CLES_.identifiant) || '';
  return { configure: EUC_DEV651_configure_(), actif: EUC_DEV651_actif_(), identifiant: id ? id.replace(/^(.{2}).*(@.*)$/, '$1…$2') : '' };
}
function EUC_DEV651_enregistrer(d) {
  EUC_DEV651_exigerGestion_();
  d = d || {};
  var id = EUC_DEV651_t_(d.identifiant), mdp = String(d.motDePasse || '');
  if (!id) throw new Error('Indiquez l’identifiant du compte data.inpi.fr.');
  if (!mdp) throw new Error('Indiquez le mot de passe du compte data.inpi.fr.');
  var p = EUC_DEV651_props_();
  p.setProperty(EUC_DEV651_CLES_.identifiant, id);
  p.setProperty(EUC_DEV651_CLES_.motDePasse, mdp);
  CacheService.getScriptCache().remove('EUC_DEV651_JETON');
  return EUC_DEV651_etat();
}
function EUC_DEV651_tester(siret) {
  EUC_DEV651_exigerGestion_();
  var s = String(siret || '').replace(/\D/g, '');
  if (!/^\d{14}$/.test(s)) throw new Error('Le SIRET doit comporter 14 chiffres.');
  var debut = Date.now(), json = EUC_DEV651_lireEntreprise_(s.slice(0, 9));
  if (!json) return { trouve: false, duree: Date.now() - debut };
  var x = EUC_DEV651_mapper_(json, s);
  return { trouve: true, complet: EUC_DEV651_complete_(x), fiche: x, duree: Date.now() - debut };
}
function EUC_DEV651_activer(oui) {
  EUC_DEV651_exigerGestion_();
  if (oui && !EUC_DEV651_configure_()) throw new Error('Enregistrez d’abord les identifiants INPI.');
  EUC_DEV651_props_().setProperty(EUC_DEV651_CLES_.actif, oui ? 'OUI' : 'NON');
  return EUC_DEV651_etat();
}

/* ---------- Fiches de la base encore masquées « [NON-DIFFUSIBLE] » (import d'avant DEV648) ---------- */
function EUC_DEV651_masque_(v) { return /NON[\s_-]*DIFFUSIBLE/i.test(String(v == null ? '' : v)); }
var EUC_DEV651_CHAMPS_FICHE_ = ['Raison_sociale', 'Enseigne', 'Numero_voie', 'Adresse_complete', 'Code_postal', 'Commune'];
function EUC_DEV651_table_() { var c = EUC_ENT_lireConfiguration(); return c.EUC_ENT_TABLE_ENTREPRISES || 'EUC_ENTREPRISES'; }
/* Calcul pur : champs à écrire sur une fiche masquée (seuls les champs masqués ou vides sont remplacés). */
function EUC_DEV651_correctionFiche_(r, x) {
  var v = { Raison_sociale: x.nom, Enseigne: x.enseigne, Numero_voie: x.adresse, Adresse_complete: [x.adresse, [x.codePostal, x.commune].join(' ')].filter(Boolean).join(', '), Code_postal: x.codePostal, Commune: x.commune }, f = {};
  EUC_DEV651_CHAMPS_FICHE_.forEach(function(k) { if (v[k] && (!EUC_DEV651_t_(r[k]) || EUC_DEV651_masque_(r[k]))) f[k] = v[k]; });
  return f;
}
function EUC_DEV651_fichesMasquees() {
  EUC_IMPORT_exigerAdminTexte_();
  return { fiches: EUC_IMPORT_lireRecords_(EUC_DEV651_table_()).filter(function(r) { return EUC_DEV651_CHAMPS_FICHE_.some(function(k) { return EUC_DEV651_masque_(r[k]); }); })
    .map(function(r) { return { id: r.id, siret: EUC_DEV651_t_(r.SIRET), nom: EUC_DEV651_t_(r.Raison_sociale), enseigne: EUC_DEV651_t_(r.Enseigne), commune: EUC_DEV651_t_(r.Commune) }; }) };
}
function EUC_DEV651_corrigerFiche(id) {
  EUC_DEV651_exigerGestion_();
  id = Number(id);
  var r = EUC_IMPORT_lireRecords_(EUC_DEV651_table_()).filter(function(x) { return x.id === id; })[0];
  if (!r) throw new Error('Fiche entreprise introuvable.');
  var s = EUC_DEV651_t_(r.SIRET).replace(/\D/g, '');
  if (!/^\d{14}$/.test(s)) throw new Error('Cette fiche n’a pas de SIRET valide.');
  var x = EUC_DEV651_mapper_(EUC_DEV651_lireEntreprise_(s.slice(0, 9)), s);
  if (!EUC_DEV651_complete_(x)) throw new Error('L’INPI ne donne pas de fiche complète pour ce SIRET.');
  var champs = EUC_DEV651_correctionFiche_(r, x);
  if (!Object.keys(champs).length) return { id: id, champs: {} };
  EUC_ENT_grist('patch', '/tables/' + encodeURIComponent(EUC_DEV651_table_()) + '/records', { records: [{ id: id, fields: champs }] });
  try { if (typeof EUC_V161_SIRET_CACHE_PREFIX_ !== 'undefined') CacheService.getScriptCache().remove(EUC_V161_SIRET_CACHE_PREFIX_ + s); } catch (e) {}
  return { id: id, champs: champs };
}
