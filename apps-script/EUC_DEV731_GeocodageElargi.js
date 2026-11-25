/**
 * DEV731 — Géocodage des entreprises : recherche élargie, nouvelles tentatives et décompte exact.
 *
 * Constats (25/11/2026, page « Entreprises et cartographie ») :
 *  - une adresse française restée « Coordonnées à renseigner » n'était plus jamais recherchée, même par
 *    « Réessayer automatiquement » (le serveur ne retenait que « à géocoder » / « à regéocoder ») : le bouton tournait
 *    sans rien faire ;
 *  - la recherche imposait le code postal saisi : « 7 CHEMIN DES ARBORAS 06000 NICE » (en réalité 06200) ne trouvait rien ;
 *  - abréviations (AV, BD, RTE…), « 2rue », « BP 139 » faisaient échouer la Base Adresse Nationale et OpenStreetMap ;
 *  - un lieu sans voie (« Aéroport de Nice ») n'était cherché que comme une adresse ;
 *  - un point validé était effacé (« Adresse modifiée depuis le dernier géocodage ») quand une autre convention écrivait
 *    la même adresse un peu autrement ;
 *  - le décompte affiché ne comptait que les adresses jamais recherchées.
 * Recherche en plusieurs essais, du plus précis au plus large ; un résultat obtenu en élargissant reste « À contrôler »
 * (point proposé, bouton « Valider »). Aucune donnée d'élève n'est transmise : seulement l'adresse ou le nom de l'entreprise.
 */
var EUC_DEV731_MARQUE_ = 'recherche élargie';
var EUC_DEV731_ABREV_ = [[/\bAV(?:E|N)?\b\.?/g, 'AVENUE'], [/\bBD\b\.?|\bBLD\b\.?|\bBVD\b\.?/g, 'BOULEVARD'], [/\bRTE\b\.?/g, 'ROUTE'], [/\bCHE?M?\b\.?(?=\s+(?:DE|DU|DES|D'))/g, 'CHEMIN'],
  [/\bIMP\b\.?/g, 'IMPASSE'], [/\bALL\b\.?(?=\s)/g, 'ALLEE'], [/\bPL\b\.?(?=\s)/g, 'PLACE'], [/\bPROM\b\.?/g, 'PROMENADE'], [/\bSTE\b\.?(?=\s)/g, 'SAINTE'], [/\bST\b\.?(?=[\s-])/g, 'SAINT'],
  [/\bQU?AI\b/g, 'QUAI'], [/\bCRS\b\.?/g, 'COURS'], [/\bRD\s*(\d+)/g, 'ROUTE DEPARTEMENTALE $1'], [/\bROUTE\s+D\s*(\d+)/g, 'ROUTE DEPARTEMENTALE $1']];

function EUC_DEV731_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
function EUC_DEV731_sansAccent_(v) { return EUC_DEV731_t_(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

/* Adresse nettoyée pour les moteurs (calcul pur) : « 2rue » → « 2 rue », abréviations développées, BP / CS / CEDEX retirés. */
function EUC_DEV731_nettoyer_(adresse) {
  var s = EUC_DEV731_sansAccent_(adresse).replace(/(\d)([A-Z]{2,})/g, '$1 $2').replace(/\b(?:BP|CS|TSA)\s*\d+\b/g, ' ').replace(/\bCEDEX\s*\d*\b/g, ' ');
  EUC_DEV731_ABREV_.forEach(function(r) { s = s.replace(r[0], r[1]); });
  return s.replace(/\s*,\s*/g, ', ').replace(/(,\s*)+/g, ', ').replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '');
}
/* Commune écrite après le dernier code postal (calcul pur). */
function EUC_DEV731_ville_(adresse) {
  var s = EUC_DEV731_sansAccent_(adresse), m = s.match(/\b\d{5}\b(?!.*\b\d{5}\b)\s*,?\s*([A-Z' -]+)$/);
  return m ? m[1].trim() : '';
}
/* Même commune (calcul pur) : sans accents, tirets ni « SAINT »/« ST ». */
function EUC_DEV731_memeVille_(a, b) { var n = function(v) { return EUC_DEV731_sansAccent_(v).replace(/\bST\b/g, 'SAINT').replace(/[^A-Z]+/g, ''); }; return !!n(a) && n(a) === n(b); }
function EUC_DEV731_departement_(cp) { cp = String(cp || ''); return /^97/.test(cp) ? cp.slice(0, 3) : cp.slice(0, 2); }
function EUC_DEV731_premier_(v) { return Array.isArray(v) ? EUC_DEV731_t_(v[0]) : EUC_DEV731_t_(v); }

/* Même lieu (calcul pur) : même code postal, même numéro, voie commune. Une simple différence d'écriture d'une autre
 * convention ne doit pas effacer un point déjà géocodé ou validé. */
function EUC_DEV731_memeLieu_(a, b) {
  var cp = function(x) { var l = EUC_DEV731_sansAccent_(x).match(/\b\d{5}\b/g) || []; return l.length ? l[l.length - 1] : ''; };
  var num = function(x) { var m = EUC_DEV731_nettoyer_(x).match(/^(\d+)\b/); return m ? m[1] : ''; };
  var A = EUC_DEV731_nettoyer_(a), B = EUC_DEV731_nettoyer_(b);
  if (!A || !B || cp(a) !== cp(b) || num(A) !== num(B)) return false;
  return EUC_DEV540_geoSavedRelevant_(A, B);
}

/* Adresses à rechercher (calcul pur). Lot général : jamais recherchées, à regéocoder, ou en échec avant la recherche
 * élargie. Bouton « Réessayer » (clés explicites) : toute adresse non validée. */
function EUC_DEV731_aRechercher_(x, keys, pays) {
  if (!x || x.pays !== pays) return false;
  var valide = x.statut === 'GEOCODE_AUTOMATIQUE' || x.statut === 'VALIDE_MANUELLEMENT';
  if (keys && keys.length) return keys.indexOf(x.key) >= 0 && !valide;
  if (pays === 'MONACO') return !valide;
  return x.statut === 'A_GEOCODER' || x.statut === 'A_REGEOCODER' || (x.statut === 'COORDONNEES_A_RENSEIGNER' && String(x.commentaire || '').indexOf(EUC_DEV731_MARQUE_) < 0);
}

function EUC_DEV731_get_(url, headers) {
  try {
    var res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true, headers: headers || { Accept: 'application/json' } });
    if (Number(res.getResponseCode ? res.getResponseCode() : 200) >= 400) return null;
    return JSON.parse(res.getContentText() || 'null');
  } catch (e) { return null; }
}

/* France : essais successifs (fetch injectable pour les tests). Renvoie les champs à enregistrer. */
function EUC_DEV731_champsFrance_(x, get) {
  get = get || EUC_DEV731_get_;
  var base = EUC_DEV441_GEO_URL_, cp = EUC_DEV731_t_(x.codePostal), dep = EUC_DEV731_departement_(cp), propre = EUC_DEV731_nettoyer_(x.adresse), ville = EUC_DEV731_ville_(x.adresse);
  var ok = function(c) { return c && c.length >= 2 && (typeof EUC_DEV667_coordOk_ !== 'function' || EUC_DEV667_coordOk_(c[1], c[0])); };
  /* Adresse précédée d'un nom de zone (« AEROPOLE ZAC … 455 PROMENADE DES ANGLAIS ») : la partie « numéro + voie » d'abord. */
  var voie = (propre.replace(/\b\d{5}\b.*$/, '').match(/\b\d+\s*(?:BIS|TER)?\s+(?:RUE|AVENUE|BOULEVARD|ROUTE|CHEMIN|PROMENADE|ALLEE|IMPASSE|PLACE|QUAI|COURS|TRAVERSE|MONTEE|AVENUE)\b[^,]*/) || [''])[0].trim();
  var precis = voie && propre.indexOf(voie) > 0 ? voie + ' ' + (cp ? cp + ' ' : '') + ville : '';
  var essais = (precis ? [{ q: precis, cp: cp, large: false }] : []).concat([{ q: propre, cp: cp, large: false }, { q: propre, cp: '', large: true }]);
  for (var i = 0; i < essais.length; i++) {
    var e = essais[i], json = get(base + '?q=' + encodeURIComponent(e.q) + '&limit=5' + (e.cp ? '&postcode=' + encodeURIComponent(e.cp) : '')) || {};
    /* Recherche élargie : même commune (nom), à défaut même département ; jamais une autre ville. */
    var feats = (json.features || []).filter(function(f) { var p = (f && f.properties) || {}; if (!e.large) return true;
      return ville ? EUC_DEV731_memeVille_(p.city, ville) : (!dep || EUC_DEV731_departement_(EUC_DEV443_postal_(p.postcode || '')) === dep); });
    var sel = EUC_DEV540_geoCandidate_(feats, e.q, e.cp), f = sel && sel.feature, c = f && f.geometry && f.geometry.coordinates, p = (f && f.properties) || {}, score = Number(p.score) || 0;
    if (!f || !ok(c) || (e.large && !sel.specific)) continue;
    var revoir = e.large || score < 0.45 || !sel.specific;
    return { Adresse_normalisee: EUC_DEV731_t_(p.label), Pays: 'FRANCE', Code_postal: EUC_DEV443_postal_(p.postcode || cp), Commune: EUC_DEV731_t_(p.city), Latitude: Number(c[1]), Longitude: Number(c[0]), Score: score,
      Precision: EUC_DEV731_t_(p.type), Fournisseur: 'Géoplateforme / BAN', Statut: revoir ? 'A_VALIDER_MANUELLEMENT' : 'GEOCODE_AUTOMATIQUE', Date_geocodage: new Date().toISOString(),
      Commentaire: !revoir ? '' : e.large ? 'Point trouvé en élargissant au département (' + EUC_DEV731_t_(p.label) + ', ' + EUC_DEV731_MARQUE_ + ') : contrôlez puis « Valider ».' : 'Résultat automatique peu précis : contrôlez le point proposé puis « Valider ».' };
  }
  /* Lieu connu (aéroport, zone, établissement) : index des points d'intérêt, adresse puis nom de l'entreprise. */
  var lieux = [propre.replace(/\b\d{5}\b.*$/, '').replace(/[\s,]+$/, ''), EUC_DEV731_t_(x.entreprise)].filter(Boolean);
  for (var j = 0; j < lieux.length; j++) {
    var lq = lieux[j] + (ville && EUC_DEV731_sansAccent_(lieux[j]).indexOf(ville) < 0 ? ' ' + ville : ''), poi = get(base + '?index=poi&limit=3&q=' + encodeURIComponent(lq)) || {};
    var h = (poi.features || []).filter(function(f) { var pc = [].concat((f.properties || {}).postcode || []); return f.geometry && ok(f.geometry.coordinates) && (ville ? [].concat((f.properties || {}).city || []).some(function(v) { return EUC_DEV731_memeVille_(v, ville); }) : (!dep || pc.some(function(z) { return EUC_DEV731_departement_(z) === dep; }))) && (Number((f.properties || {}).score) || 0) >= 0.4; })[0];
    if (!h) continue;
    var hp = h.properties || {}, hc = h.geometry.coordinates, nom = EUC_DEV731_premier_(hp.name);
    return { Adresse_normalisee: nom + (EUC_DEV731_premier_(hp.city) ? ', ' + EUC_DEV731_premier_(hp.city) : ''), Pays: 'FRANCE', Code_postal: cp, Commune: EUC_DEV731_premier_(hp.city), Latitude: Number(hc[1]), Longitude: Number(hc[0]),
      Score: Number(hp.score) || 0, Precision: 'poi', Fournisseur: 'Géoplateforme / points d’intérêt', Statut: 'A_VALIDER_MANUELLEMENT', Date_geocodage: new Date().toISOString(),
      Commentaire: 'Lieu proposé : « ' + nom + ' » (' + EUC_DEV731_MARQUE_ + ') : contrôlez puis « Valider ».' };
  }
  return { Pays: 'FRANCE', Code_postal: cp, Latitude: null, Longitude: null, Fournisseur: 'Géoplateforme / BAN', Statut: 'COORDONNEES_A_RENSEIGNER', Date_geocodage: new Date().toISOString(),
    Commentaire: 'Introuvable dans la Base Adresse Nationale, même sans le code postal ni par le nom du lieu (' + EUC_DEV731_MARQUE_ + '). Ouvrez Google Maps, copiez le point, puis « Coller GPS » et « Valider ».' };
}

/* Monaco : requêtes successives pour OpenStreetMap (calcul pur) : adresse nettoyée, voie sans numéro, nom de l'entreprise. */
function EUC_DEV731_requetesMonaco_(x) {
  var a = EUC_DEV540_monacoQuery_(EUC_DEV731_nettoyer_(x.adresse)).replace(/\bZONE\s+[A-Z0-9]\b/g, '').replace(/\s+,/g, ',').replace(/\s+/g, ' ');
  var voie = a.replace(/^\s*\d+[A-Z]?\s+/, ''), nom = EUC_DEV731_t_(x.entreprise);
  return [a, voie !== a ? voie : '', nom ? nom + ', MONACO' : ''].filter(function(v, i, l) { return v && l.indexOf(v) === i; });
}
