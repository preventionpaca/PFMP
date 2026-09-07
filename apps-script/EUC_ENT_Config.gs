/** Eucalyptus Entreprises SIRET — v1.0.0-dev.10 */
var EUC_ENT_VERSION = 'Eucalyptus Entreprises SIRET — v1.0.0-dev.10';
var EUC_ENT_DOC_ID_RECETTE_AUTORISE = 'j1jDArBkzi7P';
var EUC_ENT_CLES_CONFIG = ['EUC_ENT_ENVIRONMENT','EUC_ENT_ALLOWED_DOMAIN','EUC_ENT_GRIST_API_URL','EUC_ENT_GRIST_DOC_ID','EUC_ENT_GRIST_API_KEY','EUC_ENT_TABLE_ENTREPRISES','EUC_ENT_TABLE_CONTACTS','EUC_ENT_API_RECHERCHE_URL'];
function EUC_ENT_lireConfiguration() {
  var p = PropertiesService.getScriptProperties(); var c = {};
  EUC_ENT_CLES_CONFIG.forEach(function(k){ c[k] = p.getProperty(k) || ''; }); return c;
}

function EUC_ENT_controlerAccesUtilisateur_() {
  var c=EUC_ENT_lireConfiguration(), domaine=String(c.EUC_ENT_ALLOWED_DOMAIN||'').toLowerCase().replace(/^@/,'');
  var courriel=String(Session.getActiveUser().getEmail()||'').toLowerCase();

  // RECETTE : l'accès applicatif est autorisé sans dépendre de l'adresse renvoyée par Session.
  // La sécurité de cible reste stricte : environnement=recette ET doc Grist explicitement autorisé.
  if(c.EUC_ENT_ENVIRONMENT==='recette') {
    if(c.EUC_ENT_GRIST_DOC_ID!==EUC_ENT_DOC_ID_RECETTE_AUTORISE) {
      throw new Error('Accès recette refusé : cible Grist non autorisée.');
    }
    return true;
  }

  if(!domaine) throw new Error('Accès Entreprises désactivé : domaine autorisé non configuré.');
  if(!courriel || !courriel.endsWith('@'+domaine)) throw new Error('Accès Entreprises non autorisé.');
  return true;
}
function EUC_ENT_controlerConfiguration() {
  var c = EUC_ENT_lireConfiguration(); var etat = {};
  EUC_ENT_CLES_CONFIG.forEach(function(k){ etat[k] = c[k] ? 'présente' : 'absente'; });
  return {version:EUC_ENT_VERSION, valide:EUC_ENT_CLES_CONFIG.every(function(k){return !!c[k];}), proprietes:etat};
}
function EUC_ENT_controlerCibleRecette_() {
  var c=EUC_ENT_lireConfiguration();
  if(c.EUC_ENT_ENVIRONMENT!=='recette'||c.EUC_ENT_GRIST_DOC_ID!==EUC_ENT_DOC_ID_RECETTE_AUTORISE) throw new Error('Cible Grist de recette invalide ou non autorisée pour cette version.');
  return true;
}
