/**
 * DEV668 — NIS de Monaco : une même entreprise, quelle que soit la lettre.
 *
 * Le NIS = code d'activité (4 chiffres + 1 lettre) + numéro séquentiel (5 chiffres). Le registre RCI et l'IMSEE
 * (monentreprise.gouv.mc) peuvent afficher une lettre différente pour la même entreprise (TITAN : 7112Y19343 au
 * RCI, 7112B19343 à l'IMSEE). Le but du NIS ici est de prouver que l'entreprise existe : deux NIS qui ne diffèrent
 * que par la lettre désignent la même entreprise.
 *  - dans notre base : comparaison sur les 9 chiffres (EUC_DEV668_cle_) ;
 *  - au registre de Monaco : le NIS saisi, puis la même suite de chiffres avec chacune des autres lettres
 *    (appels parallèles), la fiche trouvée devant porter les mêmes chiffres.
 * L'IMSEE refuse les appels automatiques (403) : elle n'est pas interrogée.
 */
function EUC_DEV668_t_(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
function EUC_DEV668_norm_(v) { return EUC_DEV668_t_(v).toUpperCase().replace(/[\s.\-]+/g, ''); }
function EUC_DEV668_reel_(v) { return /^\d{4}[A-Z]\d{5}$/.test(EUC_DEV668_norm_(v)); }
/* Clé de comparaison (calcul pur) : NIS réel → ses 9 chiffres ; numéro interne ou autre → tel quel, normalisé. */
function EUC_DEV668_cle_(v) { var n = EUC_DEV668_norm_(v); return EUC_DEV668_reel_(n) ? n.slice(0, 4) + n.slice(5) : n; }
function EUC_DEV668_memeNis_(a, b) { return !!EUC_DEV668_cle_(a) && EUC_DEV668_cle_(a) === EUC_DEV668_cle_(b); }
/* Variantes à essayer au registre (calcul pur) : la lettre saisie d'abord, puis les 25 autres. */
function EUC_DEV668_variantes_(v) {
  var n = EUC_DEV668_norm_(v); if (!EUC_DEV668_reel_(n)) return [];
  var l = [n]; 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function(c) { if (c !== n[4]) l.push(n.slice(0, 4) + c + n.slice(5)); });
  return l;
}
/* Entreprise de notre base portant ce NIS, à la lettre près (calcul pur). */
function EUC_DEV668_dansBase_(rows, nis) {
  var c = EUC_DEV668_cle_(nis); if (!c) return null;
  return (rows || []).filter(function(r) { return EUC_DEV668_t_(r.NIS) && EUC_DEV668_cle_(r.NIS) === c; })[0] || null;
}
/* Vérifie qu'une entreprise de Monaco existe pour ce NIS : notre base, sinon le registre de Monaco.
 * Renvoie { trouve, source: 'BASE' | 'RCI', nis (saisi ou celui de la base), nisRegistre, nom, enseigne, adresse, cp, ville, rci, baseId }. */
function EUC_DEV668_verifierNis_(nis) {
  var n = EUC_DEV668_norm_(nis); if (!n) return { trouve: false };
  try {
    var rows = EUC_IMPORT_lireRecords_(EUC_DEV646_table_()), b = EUC_DEV668_dansBase_(rows, n);
    if (b) return { trouve: true, source: 'BASE', nis: EUC_DEV668_t_(b.NIS), nom: EUC_DEV668_t_(b.Raison_sociale || b.Nom || b.Entreprise), enseigne: EUC_DEV668_t_(b.Enseigne),
      adresse: EUC_DEV668_t_(b.Numero_voie || b.Adresse || b.Adresse_complete), cp: EUC_DEV668_t_(b.Code_postal) || '98000', ville: EUC_DEV668_t_(b.Commune) || 'Monaco', rci: EUC_DEV668_t_(b.RCI), baseId: Number(b.id) || 0 };
  } catch (e) {}
  if (!EUC_DEV668_reel_(n) || typeof EUC_DEV667_ficheRci !== 'function') return { trouve: false };
  var cache = CacheService.getScriptCache(), cle = 'DEV668_NIS_' + EUC_DEV668_cle_(n), deja = cache.get(cle);
  if (deja) { var d = JSON.parse(deja); if (d.trouve) d.nis = n; return d; }
  var res = { trouve: false };
  try {
    var v = EUC_DEV668_variantes_(n), rep = UrlFetchApp.fetchAll(v.map(function(x) {
      return { url: EUC_DEV667_RCI_ + 'recherche/page?value=' + encodeURIComponent(x) + '&page=1&size=5', method: 'get', muteHttpExceptions: true, headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' } };
    }));
    for (var i = 0; i < rep.length && !res.trouve; i++) {
      if (rep[i].getResponseCode() !== 200) continue;
      var l = EUC_DEV667_lireRecherche_(JSON.parse(rep[i].getContentText() || '{}'));
      for (var j = 0; j < l.length && j < 2 && !res.trouve; j++) {
        var f = EUC_DEV667_ficheRci(l[j].rci);
        if (f.nis && EUC_DEV668_memeNis_(f.nis, n)) res = { trouve: true, source: 'RCI', nis: n, nisRegistre: f.nis, nom: f.nom, enseigne: f.enseigne, adresse: f.adresse, cp: f.cp || '98000', ville: f.ville || 'Monaco', rci: f.rci, baseId: 0 };
      }
    }
  } catch (e) { return { trouve: false, erreur: EUC_DEV668_t_(e && e.message || e) }; }
  cache.put(cle, JSON.stringify(res), res.trouve ? 86400 : 3600);
  return res;
}
/* Bureau : vérification d'un NIS depuis « Soumissions à traiter ». */
function EUC_DEV668_verifierNis(q) {
  EUC_IMPORT_exigerAdminTexte_();
  var nis = EUC_DEV668_t_(q && typeof q === 'object' ? q.nis : q);
  if (!EUC_DEV668_reel_(nis) && !/^EUCMC\d{4,}$/.test(EUC_DEV668_norm_(nis))) throw new Error('NIS invalide : 4 chiffres, une lettre, 5 chiffres (ex. 7112B19343).');
  return EUC_DEV668_verifierNis_(nis);
}
