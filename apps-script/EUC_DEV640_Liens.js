/**
 * DEV640 — Table unique des adresses publiques de l'application.
 *
 * Changer un domaine = changer UNE ligne de EUC_LIENS_table_(). Rien d'autre.
 * - Côté serveur (.js) : EUC_LIEN_('accueil').
 * - Côté pages (.html) : écrire le jeton __LIEN_ACCUEIL__ (cle en majuscules) ;
 *   EUC_RELEASE_decorateOutput_ le remplace à l'affichage par EUC_LIENS_appliquer_.
 * Les anciennes adresses (EUC_LIENS_anciens_()) restent des redirections actives
 * (QR codes imprimés, courriels envoyés, liens Atrium) et restent reconnues
 * comme coquilles autorisées.
 */
/* Fonctions et non variables globales : utilisables depuis n'importe quel fichier,
 * quel que soit l'ordre de chargement du projet Apps Script. */
function EUC_LIENS_table_() { return {
  accueil:   'https://alternance.lycee-les-eucalyptus.org/',
  pfmp:      'https://pfmp.lycee-les-eucalyptus.org/',
  apprentis: 'https://apprentis.lycee-les-eucalyptus.org/',
  book:      'https://book-entreprise.lycee-les-eucalyptus.org/',
  livretek:  'https://livret.lycee-les-eucalyptus.org/',
  suiviek:   'https://suiviek.lycee-les-eucalyptus.org/',
  /* DEV646 : formulaire « Déclarer mon entreprise » (Web App publique, sans compte) — lien Atrium. */
  enregistrer: 'https://enregistrer-pfmp.lycee-les-eucalyptus.org/'
}; }

function EUC_LIENS_anciens_() { return {
  accueil:   ['https://alternance.loucodi.fr/'],
  pfmp:      ['https://pfmp.loucodi.fr/'],
  apprentis: ['https://apprentis.loucodi.fr/'],
  book:      ['https://book-entreprise.loucodi.fr/'],
  livretek:  ['https://livretek.loucodi.fr/'],
  suiviek:   ['https://suiviek.loucodi.fr/'],
  enregistrer: []
}; }

function EUC_LIEN_(cle) {
  var u = EUC_LIENS_table_()[cle];
  if (!u) throw new Error('Lien inconnu : ' + cle);
  return u;
}

/** Nom d'hôte seul (ex. 'pfmp.lycee-les-eucalyptus.org'). */
function EUC_LIEN_hote_(cle) {
  return EUC_LIEN_(cle).replace(/^https:\/\//, '').replace(/\/.*$/, '');
}

/** Hôtes actuels et anciens d'une ou plusieurs clés (coquilles reconnues). */
function EUC_LIENS_hotes_(cles) {
  var hotes = [];
  (cles || []).forEach(function (cle) {
    [EUC_LIEN_(cle)].concat(EUC_LIENS_anciens_()[cle] || []).forEach(function (u) {
      var h = u.replace(/^https:\/\//, '').replace(/\/.*$/, '');
      if (hotes.indexOf(h) < 0) hotes.push(h);
    });
  });
  return hotes;
}

/** Remplace les jetons __LIEN_<CLE>__ et __HOTE_<CLE>__ d'une page. */
function EUC_LIENS_appliquer_(content) {
  var t = EUC_LIENS_table_();
  return String(content || '').replace(/__(LIEN|HOTE)_([A-Z]+)__/g, function (m, genre, cle) {
    var k = cle.toLowerCase();
    if (!t[k]) return m;
    return genre === 'LIEN' ? t[k] : EUC_LIEN_hote_(k);
  });
}
