/**
 * DEV724 — Book des entreprises (administration) : corriger l'adresse d'une entreprise.
 *
 * Cas d'usage : l'annuaire officiel (data.gouv) n'a pas le numéro de voie (« AVENUE DES BAUMETTES ») alors que
 * l'entreprise est au 62 ; sans numéro, elle est mal placée sur les cartes.
 *
 * Comme les autres corrections du book (DEV562), les conventions ne sont jamais réécrites : la correction est une
 * surcharge enregistrée sur le profil de l'entreprise (table EUC_ENTREPRISES_PROFILS : adresse corrigée, position
 * calculée, date, auteur, adresse d'avant). Le book l'affiche à la place de l'adresse des conventions, et sa carte
 * utilise la position de l'adresse corrigée (Géoplateforme / BAN, seulement si le numéro ou la voie est reconnu).
 * Sur demande, la fiche de la base des entreprises du même SIRET est aussi corrigée (DEV723), pour les prochains
 * dépôts et conventions. data.gouv n'est jamais modifié ; le SIRET reste l'identité de l'entreprise.
 */
var EUC_DEV724_COLONNES_ = [['Adresse_corrigee', 'Adresse corrigée (administration)'], ['Adresse_avant_correction', 'Adresse avant correction'],
  ['Latitude_corrigee', 'Latitude de l’adresse corrigée', 'Numeric'], ['Longitude_corrigee', 'Longitude de l’adresse corrigée', 'Numeric'],
  ['Adresse_corrigee_le', 'Adresse corrigée le', 'DateTime'], ['Adresse_corrigee_par', 'Adresse corrigée par']];

function EUC_DEV724_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }

/* Adresse saisie (calcul pur) : voie, code postal (5 chiffres) et ville obligatoires ; texte complet « voie, CP ville ». */
function EUC_DEV724_adresse_(q) {
  var T = EUC_DEV724_t_, a = { voie: T((q || {}).voie).slice(0, 300), cp: T((q || {}).cp).replace(/\s+/g, ''), ville: T((q || {}).ville).slice(0, 120) };
  if (!a.voie) throw new Error('Indiquez le numéro et la voie.');
  if (!/^\d{5}$/.test(a.cp)) throw new Error('Code postal : 5 chiffres.');
  if (!a.ville) throw new Error('Indiquez la ville.');
  a.complete = a.voie + ', ' + a.cp + ' ' + a.ville.toUpperCase();
  return a;
}

/* Position de l'adresse corrigée (France) : Géoplateforme, même choix que le géocodage des entreprises ; null sinon. */
function EUC_DEV724_position_(a) {
  if (/^980\d\d$/.test(a.cp)) return null;
  try {
    var base = typeof EUC_DEV441_GEO_URL_ === 'string' ? EUC_DEV441_GEO_URL_ : 'https://data.geopf.fr/geocodage/search';
    var res = UrlFetchApp.fetch(base + '?q=' + encodeURIComponent(a.complete) + '&limit=5&postcode=' + encodeURIComponent(a.cp), { method: 'get', muteHttpExceptions: true, headers: { Accept: 'application/json' } });
    var json = JSON.parse(res.getContentText() || '{}'), choix = EUC_DEV540_geoCandidate_(json.features || [], a.complete, a.cp);
    var f = choix && choix.feature, c = f && f.geometry && f.geometry.coordinates, p = (f && f.properties) || {};
    if (!c || c.length < 2 || !choix.specific) return null;
    if (typeof EUC_DEV667_coordOk_ === 'function' && !EUC_DEV667_coordOk_(c[1], c[0])) return null;
    return { latitude: Number(c[1]), longitude: Number(c[0]), libelle: EUC_DEV724_t_(p.label), numero: EUC_DEV724_t_(p.type).toLowerCase() === 'housenumber' };
  } catch (e) { return null; }
}

function EUC_DEV724_corrigerAdresse(q) {
  var ctx = EUC_DEV538_admin_() || {}; q = q || {};
  var cle = EUC_DEV562_companyKey_(q), siret = EUC_DEV724_t_(q.siret).replace(/\D/g, '');
  if (!cle || !EUC_DEV724_t_(q.entreprise)) throw new Error('Entreprise invalide.');
  var a = EUC_DEV724_adresse_(q), pos = EUC_DEV724_position_(a);
  EUC_DEV562_ensureProfileTable_();
  EUC_DEV562_ensureTable_(EUC_DEV562_PROFILE_TABLE_, EUC_DEV724_COLONNES_);
  var existant = EUC_DEV562_profileRow_(q), ancien = existant ? EUC_DEV538_fields_(existant) : {};
  var avant = EUC_DEV724_t_(ancien.Adresse_corrigee) ? EUC_DEV724_t_(ancien.Adresse_avant_correction) : EUC_DEV724_t_(q.adresse);
  var champs = { Cle_entreprise: cle, SIRET: siret, Entreprise: EUC_DEV562_trim_(q.entreprise, 250), Adresse: EUC_DEV562_trim_(q.adresse, 500), Actif: true,
    Adresse_corrigee: a.complete, Adresse_avant_correction: avant.slice(0, 500), Latitude_corrigee: pos ? pos.latitude : null, Longitude_corrigee: pos ? pos.longitude : null,
    Adresse_corrigee_le: new Date().toISOString(), Adresse_corrigee_par: EUC_DEV724_t_(ctx.email), Updated_at: new Date().toISOString(), Updated_by: EUC_DEV724_t_(ctx.email) };
  if (existant) { delete champs.Adresse; EUC_ENT_grist('patch', '/tables/' + EUC_DEV562_PROFILE_TABLE_ + '/records', { records: [{ id: Number(existant.id), fields: champs }] }); }
  else EUC_ENT_grist('post', '/tables/' + EUC_DEV562_PROFILE_TABLE_ + '/records', { records: [{ fields: champs }] });
  /* Base des entreprises : fiche existante du même SIRET seulement (jamais créée ici). */
  var base = { demande: q.base === true, misAJour: false, message: '' };
  if (base.demande) {
    var fiche = siret.length === 14 ? EUC_ENT_verifierDoublonGrist(siret) : null;
    if (!fiche) base.message = siret.length === 14 ? 'aucune fiche dans la base des entreprises pour ce SIRET' : 'pas de SIRET : base des entreprises non modifiée';
    else {
      var cb = EUC_DEV723_champsBase_(fiche, { adresse: a.voie, cp: a.cp, ville: a.ville });
      if (Object.keys(cb).length) { EUC_ENT_grist('patch', '/tables/' + encodeURIComponent(EUC_DEV646_table_()) + '/records', { records: [{ id: Number(fiche.id), fields: cb }] }); base.misAJour = true; base.message = 'fiche de la base des entreprises corrigée'; }
      else base.message = 'fiche de la base des entreprises déjà à jour';
    }
  }
  return { ok: true, adresse: a.complete, avant: avant, position: pos, base: base };
}

/* Surcharges d'adresse appliquées à la liste du book (calcul sur les lignes du profil, injectables pour les tests). */
function EUC_DEV724_appliquer_(list, lignes) {
  var T = EUC_DEV724_t_, parCle = {}, parSiret = {};
  if (lignes == null) { try { lignes = EUC_DEV538_optionalRecords_(EUC_DEV562_PROFILE_TABLE_, {}); } catch (e) { lignes = []; } }
  (lignes || []).slice().sort(function(a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); }).forEach(function(r) {
    var f = (r && r.fields) || r || {}; if (f.Actif === false || !T(f.Adresse_corrigee)) return;
    if (T(f.Cle_entreprise)) parCle[T(f.Cle_entreprise)] = f;
    var s = T(f.SIRET).replace(/\D/g, ''); if (s.length === 14) parSiret[s] = f;
  });
  (list || []).forEach(function(c) {
    var f = parCle[T(c.identity)] || (T(c.siret).length === 14 && parSiret[T(c.siret)]); if (!f) return;
    if (!c.adresseCorrigee) c.adresseSource = c.adresse;
    c.adresse = T(f.Adresse_corrigee); c.adresseCorrigee = true; c.adresseCorrigeeLe = T(f.Adresse_corrigee_le).slice(0, 10); c.adresseCorrigeePar = T(f.Adresse_corrigee_par);
    if (typeof EUC_DEV547_city_ === 'function') c.ville = EUC_DEV547_city_(c.adresse);
    var lat = f.Latitude_corrigee, lon = f.Longitude_corrigee;
    if (lat !== null && lat !== '' && lon !== null && lon !== '' && isFinite(Number(lat)) && isFinite(Number(lon))) { c.latitude = Number(lat); c.longitude = Number(lon); }
  });
  return list;
}
