/** Eucalyptus Entreprises SIRET — v1.0.0-dev.11 */
var EUC_ENT_VERSION = 'Eucalyptus Entreprises SIRET — v1.0.0-dev.11';
var EUC_ENT_API_URL_RECETTE_AUTORISE = 'https://camin.getgrist.com';
var EUC_ENT_DOC_ID_RECETTE_AUTORISE = 'kB8bvDag8x7D';
var EUC_ENT_PROJET_BLEU_AUTORISE = '1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo';
var EUC_ENT_PROJET_VERT_AUTORISE = '1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c';
var EUC_ENT_CLES_CONFIG = ['EUC_ENT_ENVIRONMENT','EUC_ENT_ALLOWED_DOMAIN','EUC_ENT_GRIST_API_URL','EUC_ENT_GRIST_DOC_ID','EUC_ENT_GRIST_API_KEY','EUC_ENT_TABLE_ENTREPRISES','EUC_ENT_TABLE_CONTACTS','EUC_ENT_API_RECHERCHE_URL'];
function EUC_ENT_lireConfiguration() {
  var p = PropertiesService.getScriptProperties(); var c = {};
  EUC_ENT_CLES_CONFIG.forEach(function(k){ c[k] = p.getProperty(k) || ''; }); return c;
}

function EUC_ENT_controlerAccesUtilisateur_() {
  var c=EUC_ENT_lireConfiguration(), domaine=String(c.EUC_ENT_ALLOWED_DOMAIN||'').toLowerCase().replace(/^@/,'');
  var apiUrl=String(c.EUC_ENT_GRIST_API_URL||'').replace(/\/+$/,'');
  var courriel=String(Session.getActiveUser().getEmail()||'').toLowerCase();
  var canal=EUC_ENT_canalProjet_();

  // BLEU : l'accès /dev est réservé aux éditeurs du projet et la cible Grist
  // reste strictement la recette. Le projet VERT conserve le contrôle de
  // domaine, même si une ancienne propriété d'environnement a été oubliée.
  if(canal==='BLUE') {
    if(apiUrl!==EUC_ENT_API_URL_RECETTE_AUTORISE||c.EUC_ENT_GRIST_DOC_ID!==EUC_ENT_DOC_ID_RECETTE_AUTORISE) {
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
function EUC_ENT_canalProjet_() {
  var id='';
  try{id=String(ScriptApp.getScriptId()||'');}catch(e){}
  if(id===EUC_ENT_PROJET_BLEU_AUTORISE)return 'BLUE';
  if(id===EUC_ENT_PROJET_VERT_AUTORISE)return 'GREEN';
  return 'UNKNOWN';
}
function EUC_ENT_controlerCibleRecette_() {
  var c=EUC_ENT_lireConfiguration();
  var apiUrl=String(c.EUC_ENT_GRIST_API_URL||'').replace(/\/+$/,'');
  var canal=EUC_ENT_canalProjet_();
  if(canal==='BLUE') {
    if(c.EUC_ENT_ENVIRONMENT!=='recette'||apiUrl!==EUC_ENT_API_URL_RECETTE_AUTORISE||c.EUC_ENT_GRIST_DOC_ID!==EUC_ENT_DOC_ID_RECETTE_AUTORISE) throw new Error('Cible Grist de recette invalide ou non autorisée pour cette version.');
    return true;
  }
  if(canal==='GREEN') {
    if(!c.EUC_ENT_GRIST_DOC_ID||c.EUC_ENT_GRIST_DOC_ID===EUC_ENT_DOC_ID_RECETTE_AUTORISE) throw new Error('Cible Grist du site vert absente ou confondue avec la recette.');
    return true;
  }
  throw new Error('Projet Apps Script non autorisé à accéder à Grist.');
}
