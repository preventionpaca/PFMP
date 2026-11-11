/**
 * DEV667 — Répertoire du commerce et de l'industrie de Monaco (RCI, teleservice.gouv.mc/rci), comme l'annuaire SIRET.
 *
 *  - recherche par nom, ouverte et gratuite : nom, numéro RCI, état (active, radiée), forme juridique ;
 *  - fiche gratuite d'une entreprise : enseigne, adresse et NIS de l'établissement principal.
 * Le NIS affiché par le RCI est « donné à titre d'information » (seule l'IMSEE en atteste la validité) : il peut
 * différer de monentreprise.gouv.mc d'une lettre (ex. TITAN : 7112Y19343 au RCI, 7112B19343 à l'IMSEE).
 * Aucune donnée d'élève n'est transmise : seulement le nom cherché ou le numéro RCI.
 */
var EUC_DEV667_RCI_ = 'https://teleservice.gouv.mc/rci/';
function EUC_DEV667_t_(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
function EUC_DEV667_rciValide_(v) { return /^\d{2}[A-Z]\d{5}$/.test(EUC_DEV667_t_(v).toUpperCase()); }

/* Résultats de recherche (calcul pur) : entreprises actives d'abord, 8 au plus. */
function EUC_DEV667_lireRecherche_(json) {
  var l = ((json && json.data) || []).filter(function(x) { return x && EUC_DEV667_rciValide_(x.numeroRci); }).map(function(x) {
    return { rci: EUC_DEV667_t_(x.numeroRci).toUpperCase(), nom: EUC_DEV667_t_(x.titre), sigle: EUC_DEV667_t_(x.sigle), forme: EUC_DEV667_t_(x.formJuridique) || (x.commercant ? 'Commerçant (entreprise individuelle)' : ''),
      etat: EUC_DEV667_t_(x.etatLibelle || x.etat), actif: EUC_DEV667_t_(x.etat).toUpperCase() === 'ACTIVE' };
  });
  return l.filter(function(x) { return x.actif; }).concat(l.filter(function(x) { return !x.actif; })).slice(0, 8);
}
/* Fiche gratuite (calcul pur) : « <strong>Libellé :</strong> valeur », en français ou en anglais. */
function EUC_DEV667_lireFiche_(html) {
  var champs = {}, re = /<strong>\s*([^<]+?)\s*:?\s*<\/strong>\s*([^<]*)/g, m;
  while ((m = re.exec(String(html || '')))) {
    var cle = EUC_DEV667_t_(m[1]).replace(/\s*:$/, '').toLowerCase(), val = EUC_DEV667_t_(m[2].replace(/&#39;/g, '\'').replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
    if (val && !(cle in champs)) champs[cle] = val;
  }
  function pris(motifs) { var k = Object.keys(champs).filter(function(c) { return motifs.some(function(x) { return c.indexOf(x) >= 0; }); })[0]; return k ? champs[k] : ''; }
  var adresse = pris(['adresse', 'address']), morceaux = adresse.split(/\s*;\s*/).filter(Boolean), dernier = morceaux.length ? morceaux[morceaux.length - 1] : '';
  var cpVille = /^(\d{5})\s+(.+)$/.exec(dernier) || null;
  var nis = pris(['nis*', 'nis)', '(sin', 'statistique', 'statistical']).toUpperCase().replace(/[\s.-]+/g, '');
  return {
    rci: pris(['numéro rci', 'rci number']).toUpperCase(), nom: pris(['raison sociale', 'company name', 'dénomination']), enseigne: pris(['enseigne', 'sign of']),
    etat: pris(['état', 'status']), adresse: (cpVille ? morceaux.slice(0, -1) : morceaux).join(', '), cp: cpVille ? cpVille[1] : '', ville: cpVille ? cpVille[2] : '',
    nis: /^\d{4}[A-Z]\d{5}$/.test(nis) ? nis : ''
  };
}
function EUC_DEV667_get_(url) {
  var r = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true, followRedirects: true, headers: { 'Accept-Language': 'fr-FR,fr', 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json, text/html' } });
  if (r.getResponseCode() !== 200) throw new Error('Le registre de Monaco ne répond pas (' + r.getResponseCode() + ') : réessayez dans un instant.');
  return r.getContentText();
}
/* Recherche par nom (élèves et bureau) : aucune donnée personnelle, résultat gardé 6 h. */
function EUC_DEV667_rechercherRci(q) {
  var nom = EUC_DEV667_t_(q && typeof q === 'object' ? q.nom : q).slice(0, 100);
  if (nom.replace(/[^A-Za-z0-9À-ÿ]/g, '').length < 3) throw new Error('Écris au moins 3 lettres du nom de l’entreprise.');
  var cache = CacheService.getScriptCache(), cle = 'DEV667_RCI_' + Utilities.base64EncodeWebSafe(nom.toUpperCase()).slice(0, 200), deja = cache.get(cle);
  if (deja) return JSON.parse(deja);
  var json = JSON.parse(EUC_DEV667_get_(EUC_DEV667_RCI_ + 'recherche/page?value=' + encodeURIComponent(nom) + '&page=1&size=10') || '{}');
  var r = { resultats: EUC_DEV667_lireRecherche_(json), total: Number(json.total) || 0 };
  cache.put(cle, JSON.stringify(r), 21600);
  return r;
}
/* Fiche d'une entreprise du RCI (numéro RCI choisi dans la recherche), gardée 24 h. */
function EUC_DEV667_ficheRci(q) {
  var rci = EUC_DEV667_t_(q && typeof q === 'object' ? q.rci : q).toUpperCase();
  if (!EUC_DEV667_rciValide_(rci)) throw new Error('Numéro RCI invalide (ex. 17S07483).');
  var cache = CacheService.getScriptCache(), cle = 'DEV667_FICHE_' + rci, deja = cache.get(cle);
  if (deja) return JSON.parse(deja);
  var f = EUC_DEV667_lireFiche_(EUC_DEV667_get_(EUC_DEV667_RCI_ + 'extrait/' + rci));
  if (!f.nom) throw new Error('Fiche du registre illisible pour ' + rci + ' : saisissez les informations à la main.');
  f.rci = f.rci || rci; f.lien = EUC_DEV667_RCI_ + 'extrait/' + rci;
  cache.put(cle, JSON.stringify(f), 86400);
  return f;
}
/* Bureau : numéro interne suivant (EUC-MC-0001…) pour une entreprise de Monaco sans NIS trouvable. */
function EUC_DEV667_numeroInterne() {
  EUC_IMPORT_exigerAdminTexte_();
  return { nis: EUC_DEV646_numeroSuivant_(EUC_IMPORT_lireRecords_(EUC_DEV646_table_())) };
}
