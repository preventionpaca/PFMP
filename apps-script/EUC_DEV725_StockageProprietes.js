/**
 * DEV725 — Stockage des propriétés du script saturé (500 Ko) : lenteurs générales et erreurs après écriture.
 *
 * Constat (exécutions du 24/11/2026) : affectation d'un professeur en échec après ~30 s, liste des professeurs 40 s,
 * effectifs 90 à 140 s, génération d'un code professeur principal de plusieurs minutes, compteur d'appels Grist à zéro.
 * Cause : trois caches régénérables écrits dans les propriétés du script remplissent les 500 Ko :
 *   - snapshot persistant de chaque famille (DEV456, jusqu'à 60 blocs de 7 000 caractères par famille) ;
 *   - index du book public (DEV549, jusqu'à 80 blocs) ;
 *   - lignes d'accès des formulaires (DEV398, une clé par année) ;
 *   - index géographique des cartes (DEV517) et reliquat DEV418 d'une ancienne version (constatés le 25/11 : 445 Ko).
 * Stockage plein : chaque écriture (révision DEV457 après une écriture Grist, compteur DEV447, état DEV425) échoue ;
 * la révision DEV457 levait l'erreur APRÈS l'écriture Grist réussie (affectation enregistrée mais « Erreur ») ; les
 * snapshots de famille ne pouvaient plus être conservés et chaque ouverture les reconstruisait.
 *
 * Règle : les caches régénérables ne dépassent jamais ensemble le budget (EUC_DEV725_BUDGET_), ce qui laisse toujours
 * de la place aux réglages et aux révisions. En cas d'écriture refusée, les caches sont libérés (book d'abord, puis
 * accès, puis familles) et l'écriture est retentée. Aucune donnée métier n'est stockée dans ces caches : tout est
 * relu depuis Grist au besoin. Les valeurs ne sont jamais journalisées (diagnostic : noms et tailles seulement).
 */
var EUC_DEV725_PLAFOND_ = 500 * 1024;
var EUC_DEV725_BUDGET_ = 430000;

/* Taille d'une propriété en octets UTF-8 (clé + valeur), calcul pur. */
function EUC_DEV725_octets_(s) {
  s = String(s == null ? '' : s); var n = 0;
  for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xD800 && c < 0xDC00) ? (i++, 4) : 3; }
  return n;
}
function EUC_DEV725_taille_(all, exclure) {
  var t = 0; Object.keys(all || {}).forEach(function(k) { if (!exclure || !exclure(k)) t += EUC_DEV725_octets_(k) + EUC_DEV725_octets_(all[k]); });
  return t;
}

/* Groupe de cache régénérable d'une clé (calcul pur) : { groupe, rang } ou null (réglage, révision : jamais libéré).
 * Rang 0 = libéré en premier. */
function EUC_DEV725_groupe_(k) {
  k = String(k || '');
  var livre = (typeof EUC_DEV549_PUBLIC_BOOK_CACHE_PROP_ === 'string' ? EUC_DEV549_PUBLIC_BOOK_CACHE_PROP_ : 'EUC_DEV549_PUBLIC_BOOK_INDEX_V1') + '_';
  if (k.indexOf(livre) === 0) return { groupe: livre, rang: 0 };
  /* Reliquat d'une ancienne version (plus aucun code ne le lit) : libéré en premier. */
  if (/^DEV418_ACCESS_ROWS_/.test(k)) return { groupe: 'DEV418_ACCESS_ROWS_', rang: 0 };
  /* Index géographique des cartes (DEV517), aussi conservé dans le cache de script. */
  var geo = k.match(/^(DEV517_GEO_INDEX_.+?)_(?:COUNT|REV|AT|\d+)$/);
  if (geo) return { groupe: geo[1] + '_', rang: 0 };
  if (/^DEV398_ACCESS_ROWS_/.test(k)) return { groupe: k, rang: 1 };
  var m = k.match(/^(DEV456R13_FAMILY_.+_P)(?:N|\d+)$/);
  if (m) return { groupe: m[1], rang: 2 };
  return null;
}

/* Clés à supprimer pour revenir sous `cible` (calcul pur) : groupes entiers, rang croissant, plus gros d'abord.
 * `rangMax` borne les rangs libérables ; `garder` protège un groupe (celui qu'on s'apprête à écrire). */
function EUC_DEV725_aLiberer_(all, cible, rangMax, garder) {
  var total = EUC_DEV725_taille_(all), groupes = {};
  if (total <= cible) return [];
  Object.keys(all || {}).forEach(function(k) {
    var g = EUC_DEV725_groupe_(k); if (!g || g.rang > rangMax || g.groupe === garder) return;
    var x = groupes[g.groupe] || (groupes[g.groupe] = { rang: g.rang, taille: 0, cles: [] });
    x.taille += EUC_DEV725_octets_(k) + EUC_DEV725_octets_(all[k]); x.cles.push(k);
  });
  var ordre = Object.keys(groupes).map(function(g) { return groupes[g]; }).sort(function(a, b) { return a.rang - b.rang || b.taille - a.taille; });
  var out = [];
  for (var i = 0; i < ordre.length && total > cible; i++) { total -= ordre[i].taille; out = out.concat(ordre[i].cles.sort()); }
  return out;
}

function EUC_DEV725_supprimer_(props, cles) {
  var n = 0; (cles || []).forEach(function(k) { try { props.deleteProperty(k); n++; } catch (e) {} }); return n;
}

/* Libère les caches régénérables jusqu'au budget (rangs 0 à 2). Renvoie le bilan sans valeur. */
function EUC_DEV725_liberer_(cible) {
  var props = PropertiesService.getScriptProperties(), all = {};
  try { all = props.getProperties() || {}; } catch (e) { return { ok: false, supprimees: 0 }; }
  var avant = EUC_DEV725_taille_(all), cles = EUC_DEV725_aLiberer_(all, cible == null ? EUC_DEV725_BUDGET_ : cible, 2, '');
  var n = EUC_DEV725_supprimer_(props, cles);
  return { ok: true, avant: avant, supprimees: n };
}

/* Écriture d'une petite propriété indispensable (révision, état) : en cas de refus, libère les caches puis retente.
 * Ne lève jamais : renvoie false si l'écriture reste impossible. */
function EUC_DEV725_ecrire_(props, cle, valeur) {
  try { props.setProperty(cle, valeur); return true; } catch (e) {}
  try { EUC_DEV725_liberer_(EUC_DEV725_BUDGET_); props.setProperty(cle, valeur); return true; } catch (e2) { return false; }
}

/* Place pour un cache régénérable (`items` : clés → valeurs du groupe `groupe`) : le total après écriture doit rester
 * sous le budget ; libère au besoin les caches de rang strictement inférieur, et supprime les anciens blocs du
 * groupe qui ne seront pas réécrits. Renvoie true si l'écriture peut avoir lieu. */
function EUC_DEV725_reserver_(items, groupe) {
  var props = PropertiesService.getScriptProperties(), all = {};
  try { all = props.getProperties() || {}; } catch (e) { return false; }
  var g = EUC_DEV725_groupe_(Object.keys(items || {})[0]), rang = g ? g.rang : 0;
  var duGroupe = function(k) { var x = EUC_DEV725_groupe_(k); return !!x && x.groupe === groupe; };
  var besoin = EUC_DEV725_taille_(items), reste = EUC_DEV725_taille_(all, duGroupe);
  if (reste + besoin > EUC_DEV725_BUDGET_ && rang > 0) {
    var autres = {}; Object.keys(all).forEach(function(k) { if (!duGroupe(k)) autres[k] = all[k]; });
    var cles = EUC_DEV725_aLiberer_(autres, EUC_DEV725_BUDGET_ - besoin, rang - 1, groupe);
    EUC_DEV725_supprimer_(props, cles); cles.forEach(function(k) { reste -= EUC_DEV725_octets_(k) + EUC_DEV725_octets_(all[k]); });
  }
  if (reste + besoin > EUC_DEV725_BUDGET_) return false;
  EUC_DEV725_supprimer_(props, Object.keys(all).filter(function(k) { return duGroupe(k) && !Object.prototype.hasOwnProperty.call(items, k); }));
  return true;
}

/* Diagnostic pour l'administration : taille totale et groupes les plus lourds (noms et tailles, jamais de valeur). */
function EUC_DEV725_etat_() {
  var all = {}; try { all = PropertiesService.getScriptProperties().getProperties() || {}; } catch (e) { return { ok: false }; }
  var groupes = {};
  Object.keys(all).forEach(function(k) { var g = EUC_DEV725_groupe_(k), nom = g ? g.groupe.replace(/_+$/, '') : k;
    var x = groupes[nom] || (groupes[nom] = { nom: nom, cache: !!g, octets: 0, cles: 0 }); x.octets += EUC_DEV725_octets_(k) + EUC_DEV725_octets_(all[k]); x.cles++; });
  var l = Object.keys(groupes).map(function(n) { return groupes[n]; }).sort(function(a, b) { return b.octets - a.octets; });
  return { ok: true, octets: EUC_DEV725_taille_(all), plafond: EUC_DEV725_PLAFOND_, budget: EUC_DEV725_BUDGET_, cles: Object.keys(all).length, lourds: l.slice(0, 8) };
}
