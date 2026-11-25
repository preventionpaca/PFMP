/**
 * DEV736 — Tableau de bord de la direction (proviseur, adjoints).
 *
 * Une page : les effectifs (mêmes chiffres et même présentation que l'accueil d'administration, rendu partagé
 * Effectifs_Rendu_DEV736) et les liens utiles habituellement pris sur Atrium. Les effectifs contiennent la liste
 * nominative des jeunes des classes entières : ils ne sont servis qu'à l'administration PFMP ou sur présentation
 * d'un code direction actif (DEV684, créé et révoqué depuis l'administration). Lecture seule, aucune écriture.
 */
var EUC_DEV736_FAMILLE_ = 'DIRECTION';

function EUC_DEV736_estAdmin_() {
  try { var ctx = typeof EUC_PFMP_contexteAdmin_ === 'function' ? EUC_PFMP_contexteAdmin_() : null; return !!(ctx && ctx.autorise && ['ADMIN_PFMP', 'DDFPT', 'BUREAU_ENTREPRISES'].indexOf(ctx.role) >= 0); } catch (e) { return false; }
}

/* Code direction actif (calcul pur sur les lignes de la table des accès) : renvoie la ligne ou null. */
function EUC_DEV736_ligneDirection_(code, lignes) {
  var c = EUC_DEV441_codeCanon_(code); if (c.length < 16) return null;
  return (lignes || []).filter(function(r) {
    return r && r.Actif !== false && String(r.Famille || '').trim().toUpperCase() === EUC_DEV736_FAMILLE_ && !r.Date_revocation && EUC_DEV441_codeHash_(c, r.Code_salt) === String(r.Code_hash || '');
  })[0] || null;
}

function EUC_DEV736_acces_(q) {
  if (EUC_DEV736_estAdmin_()) return { admin: true, nom: '' };
  var r = EUC_DEV736_ligneDirection_(q && q.code, EUC_DEV441_ppRows_());
  if (!r) throw new Error('Code direction inconnu ou révoqué.');
  return { admin: false, nom: String(r.Professeur_nom || '').trim() };
}

function EUC_DEV736_effectifs(q) {
  q = q || {}; var a = EUC_DEV736_acces_(q);
  var r = EUC_DEV592_effectifsCalcul_(String(q.annee || ''), { forcer: !!q.forcer }); r.nom = a.nom;
  /* Jeton de session enseignant (12 h) : ouvre les pages des liens Atrium (suivi PFMP, book, apprentis, cartographie). */
  try { r.jeton = typeof EUC_ACCES_creerJeton_ === 'function' ? EUC_ACCES_creerJeton_() : ''; } catch (e) { r.jeton = ''; }
  return r;
}

function EUC_DEV736_afficher(e) {
  var t = HtmlService.createTemplateFromFile('Tableau_De_Bord_DEV736');
  t.admin = EUC_DEV736_estAdmin_();
  return t.evaluate().setTitle('Tableau de bord — Direction').addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
