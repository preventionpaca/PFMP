/**
 * DEV583 — Cartographie des entreprises construite sur le modèle du suivi (EUC_SUIVI2).
 *
 * Avant : la carte relisait les anciens instantanés de conventions (DEV427 / DEV513), sans
 * les contrats d'apprentissage ni les classes entières (« 0 adresse »), et les relisait à
 * chaque ouverture (lenteur). Désormais : le modèle de l'année (déjà en cache par témoin
 * Grist) donne, pour chaque élève et chaque période, l'entreprise de sa convention ou de son
 * contrat ; la table de géocodage donne la position (par SIRET, sinon nom + adresse, sinon
 * adresse). Les entreprises encore sans position sont géocodées automatiquement (Géoplateforme,
 * lot limité) et enregistrées dans la table ; un résultat peu précis reste « à valider » dans
 * la page Géocodage et n'est pas affiché. Le détail nominatif n'est servi qu'aux personnels.
 * Familles (mode PARENTS) et « toutes les années » gardent l'ancien chemin.
 */
var EUC_DEV583_VERSION_ = '1.0.0-dev.583';
var EUC_DEV583_STATUTS_ENTREPRISE_ = { AVEC: 1, CONTRAT: 1, APPRENTI: 1, PDIF_ENTREPRISE: 1 };
var EUC_DEV583_GEOCODAGE_LOT_ = 15;

function EUC_DEV583_t_(v) { return v == null ? '' : String(v).trim(); }
function EUC_DEV583_siret_(v) { var s = EUC_DEV583_t_(v).replace(/\D/g, ''); return s.length === 14 ? s : ''; }
function EUC_DEV583_valide_(g) { return g && isFinite(Number(g.Latitude)) && isFinite(Number(g.Longitude)) && g.Latitude !== null && g.Longitude !== null && g.Latitude !== '' && (g.Statut === 'GEOCODE_AUTOMATIQUE' || g.Statut === 'VALIDE_MANUELLEMENT'); }

/* Index de la table de géocodage : SIRET, identité nom + adresse, empreinte d'adresse. */
function EUC_DEV583_indexGeo_(rows) {
  var ix = { siret: {}, identite: {}, adresse: {}, lignes: {} };
  (rows || []).forEach(function(r) {
    var g = r && r.fields ? Object.assign({ id: r.id }, r.fields) : (r || {});
    var cles = [];
    var sr = EUC_DEV583_siret_(g.SIRET); if (sr) cles.push(['siret', sr]);
    if (g.Entreprise || g.Adresse_source) cles.push(['identite', EUC_DEV443_geoIdentity_(g.Entreprise, g.Adresse_source, '')]);
    if (g.Adresse_source) cles.push(['adresse', EUC_DEV445_geoAddressFingerprint_(g.Adresse_source)]);
    if (g.Cle_adresse) ix.lignes[g.Cle_adresse] = g;
    cles.forEach(function(c) {
      var deja = ix[c[0]][c[1]];
      /* Une ligne validée l'emporte toujours sur une ligne à géocoder. */
      if (!deja || (!EUC_DEV583_valide_(deja) && EUC_DEV583_valide_(g))) ix[c[0]][c[1]] = g;
    });
  });
  return ix;
}
function EUC_DEV583_position_(ix, e) {
  var l = [e.siret && ix.siret[e.siret], ix.identite[EUC_DEV443_geoIdentity_(e.entreprise, e.adresse, '')], e.adresse && ix.adresse[EUC_DEV445_geoAddressFingerprint_(e.adresse)]];
  for (var i = 0; i < l.length; i++) if (EUC_DEV583_valide_(l[i])) return l[i];
  return l.filter(Boolean)[0] || null;
}

/* Entreprises du périmètre, depuis le modèle du suivi. Calcul pur (testé hors Apps Script). */
function EUC_DEV583_entreprises_(m, q, nominatif) {
  q = q || {};
  var fam = EUC_DEV583_t_(q.famille).toUpperCase(), cid = Number(q.classeId) || 0, pid = Number(q.periodeId) || 0, par = {}, liste = [];
  (m.classes || []).forEach(function(c) {
    if (cid && Number(c.id) !== cid) return;
    if (!cid && fam && c.famille !== fam) return;
    (c.periodes || []).forEach(function(p) {
      if (pid && Number(p.id) !== pid) return;
      var r = p.resume || {};
      (c.eleves || []).forEach(function(e) {
        var st = (r.statuts || {})[e.id], f = (r.fiches || {})[e.id];
        if (!EUC_DEV583_STATUTS_ENTREPRISE_[st] || !f || !f.entreprise) return;
        var siret = EUC_DEV583_siret_(f.siret), cle = EUC_DEV443_geoIdentity_(f.entreprise, f.adresse, siret), x = par[cle];
        if (!x) { x = par[cle] = { cle: cle, siret: siret, entreprise: f.entreprise, adresse: f.adresse || '', eleves: {}, classes: {}, historique: [] }; liste.push(x); }
        if (!x.adresse && f.adresse) x.adresse = f.adresse;
        x.classes[c.nom] = true;
        var apprenti = st === 'APPRENTI' || st === 'CONTRAT', k = e.id + '|' + (apprenti ? 'A' : p.id);
        if (x.eleves[k]) return; x.eleves[k] = true;
        if (nominatif) x.historique.push({ annee: m.annee, eleve: e.libelle, classe: c.nom, periode: apprenti ? '' : p.libelle, apprenti: apprenti,
          professeurVisiteur: ((r.suivis || {})[e.id] || {}).visite || '', responsable: (f.contact || {}).nom || '', telephoneResponsable: (f.contact || {}).tel || '', courrielResponsable: (f.contact || {}).mail || '',
          tuteur: (f.tuteur || {}).nom || '', telephoneTuteur: (f.tuteur || {}).tel || '', courrielTuteur: (f.tuteur || {}).mail || '', dateSaisie: f.enregistreLe || f.contratDebut || p.debut });
      });
    });
  });
  return liste;
}

/* Points de la carte : une entreprise = un point ; les autres sont listées « sans position ». */
function EUC_DEV583_points_(entreprises, ix, nominatif) {
  var points = [], sans = [], vus = {};
  entreprises.forEach(function(x) {
    var g = EUC_DEV583_position_(ix, x), n = Object.keys(x.eleves).length;
    if (!EUC_DEV583_valide_(g)) { sans.push({ entreprise: x.entreprise, adresse: x.adresse, eleves: n, statut: g ? EUC_DEV583_t_(g.Statut) : 'A_GEOCODER' }); return; }
    var lat = Number(g.Latitude), lon = Number(g.Longitude), k = x.cle;
    var pt = vus[k] || (vus[k] = { key: EUC_DEV441_digest_(k).slice(0, 32), entreprise: x.entreprise, adresse: x.adresse, latitude: lat, longitude: lon, pays: EUC_DEV583_t_(g.Pays), classe: '', elevesAccueillis: 0, nominatif: nominatif, source: 'SUIVI2' });
    if (points.indexOf(pt) < 0) points.push(pt);
    pt.elevesAccueillis += n; pt.classe = Object.keys(x.classes).sort().join(' / ');
    if (nominatif) { pt.historique = (pt.historique || []).concat(x.historique); pt.historyLoaded = true; }
  });
  return { points: points, sansPosition: sans };
}

/* Géocodage automatique d'un lot d'entreprises sans position (adresses françaises seulement). */
function EUC_DEV583_geocoder_(sans, ix) {
  var lot = (sans || []).filter(function(x) { return x.statut === 'A_GEOCODER' && x.adresse && EUC_DEV441_geoClassify_(x.adresse).pays === 'FRANCE'; }).slice(0, EUC_DEV583_GEOCODAGE_LOT_);
  if (!lot.length) return 0;
  var reqs = lot.map(function(x) {
    var c = EUC_DEV441_geoClassify_(x.adresse), clean = EUC_DEV443_normalizeAddress_(x.adresse);
    x._cp = c.codePostal; x._clean = clean;
    return { url: EUC_DEV441_GEO_URL_ + '?q=' + encodeURIComponent(clean) + '&limit=5' + (c.codePostal ? '&postcode=' + encodeURIComponent(c.codePostal) : ''), method: 'get', muteHttpExceptions: true, headers: { Accept: 'application/json' } };
  });
  var reps = []; try { reps = UrlFetchApp.fetchAll(reqs); } catch (e) { return 0; }
  var ecrits = [];
  lot.forEach(function(x, i) {
    var json = {}; try { json = JSON.parse(reps[i].getContentText() || '{}'); } catch (e) {}
    var sel = EUC_DEV540_geoCandidate_(json.features || [], x._clean, x._cp), feat = sel && sel.feature, co = feat && feat.geometry && feat.geometry.coordinates, pr = feat && feat.properties || {}, score = Number(pr.score) || 0;
    var cleGeo = EUC_DEV441_geoKey_(x.entreprise, x.adresse, x.siret), item = { key: cleGeo, siret: x.siret || '', entreprise: x.entreprise, adresse: x.adresse }, existant = ix.lignes[cleGeo];
    if (existant && existant.id) item._recordId = Number(existant.id);
    var fields = co && co.length >= 2
      ? { Adresse_normalisee: EUC_DEV583_t_(pr.label), Pays: 'FRANCE', Code_postal: EUC_DEV443_postal_(pr.postcode || x._cp), Commune: EUC_DEV583_t_(pr.city), Latitude: Number(co[1]), Longitude: Number(co[0]), Score: score, Precision: EUC_DEV583_t_(pr.type), Fournisseur: 'Géoplateforme / BAN', Statut: score < 0.45 || !sel.specific ? 'A_VALIDER_MANUELLEMENT' : 'GEOCODE_AUTOMATIQUE', Date_geocodage: new Date().toISOString(), Commentaire: score < 0.45 || !sel.specific ? 'Résultat automatique peu précis : contrôlez le point proposé.' : '' }
      : { Pays: 'FRANCE', Code_postal: x._cp, Latitude: null, Longitude: null, Fournisseur: 'Géoplateforme / BAN', Statut: 'COORDONNEES_A_RENSEIGNER', Date_geocodage: new Date().toISOString(), Commentaire: 'Aucun résultat cohérent avec la voie et le code postal.' };
    ecrits.push({ item: item, fields: fields });
  });
  try { return EUC_DEV445_geoBatchUpsert_(ecrits).saved.length; } catch (e) { return 0; }
}

/* Point d'entrée : null = périmètre non couvert (familles, toutes années), l'ancien chemin répond. */
function EUC_DEV583_carte(q) {
  q = q || {};
  var annee = EUC_DEV583_t_(q.annee);
  if (!annee || annee.toUpperCase() === 'ALL' || EUC_DEV583_t_(q.mode).toUpperCase() === 'PARENTS' || typeof EUC_SUIVI2_modele_ !== 'function') return null;
  var nominatif = false; try { nominatif = EUC_DEV538_staffAllowed_(); } catch (e) {}
  var m = EUC_SUIVI2_modele_(annee), temoin = EUC_DEV583_t_(m.temoin);
  var cle = 'EUC_DEV583_' + EUC_DEV441_digest_(JSON.stringify([EUC_DEV583_VERSION_, annee, q.famille || '', Number(q.classeId) || 0, Number(q.periodeId) || 0, nominatif])).slice(0, 16) + '_' + temoin.replace(/[^\w-]/g, '');
  var memo = typeof EUC_DEV572_lire_ === 'function' ? EUC_DEV572_lire_(cle) : null;
  if (memo && memo.points) return memo;
  var t0 = Date.now(), entreprises = EUC_DEV583_entreprises_(m, q, nominatif), ix = EUC_DEV583_indexGeo_(EUC_DEV441_geoRows_()), res = EUC_DEV583_points_(entreprises, ix, nominatif), geocodees = 0;
  if (nominatif && res.sansPosition.length) {
    geocodees = EUC_DEV583_geocoder_(res.sansPosition, ix);
    if (geocodees) { ix = EUC_DEV583_indexGeo_(EUC_DEV441_geoRows_()); res = EUC_DEV583_points_(entreprises, ix, nominatif); }
  }
  var out = { ok: true, source: 'SUIVI2', version: EUC_DEV583_VERSION_, annee: m.annee, total: res.points.length, points: res.points, nominatif: nominatif,
    sansPosition: nominatif ? res.sansPosition : [], sansPositionTotal: res.sansPosition.length, geocodees: geocodees, calculMs: Date.now() - t0 };
  /* Après un géocodage, Grist a changé : on ne fige pas ce résultat sous l'ancien témoin. */
  if (!geocodees && typeof EUC_DEV572_ecrire_ === 'function') EUC_DEV572_ecrire_(cle, out);
  return out;
}

/* Filtres de la carte (classes et périodes) depuis le même modèle : classes entières comprises. */
function EUC_DEV583_catalogue(annee) {
  annee = EUC_DEV583_t_(annee);
  if (!annee || annee.toUpperCase() === 'ALL' || typeof EUC_SUIVI2_modele_ !== 'function') return null;
  var m = EUC_SUIVI2_modele_(annee);
  return { ok: true, source: 'SUIVI2', annee: m.annee, classes: (m.classes || []).filter(function(c) { return c.periodes.length; }).map(function(c) {
    return { classeId: Number(c.id), classe: c.nom, famille: c.famille, periodes: c.periodes.map(function(p) { return { id: Number(p.id), libelle: p.libelle }; }) };
  }) };
}
