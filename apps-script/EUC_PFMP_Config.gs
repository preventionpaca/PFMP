/** Eucalyptus PFMP — v1.0.0-dev.26 */
var EUC_PFMP_VERSION = 'Eucalyptus PFMP — v1.0.0-dev.26';
var EUC_PFMP_TABLES = {
  annees:'Annees_Scolaires', diplomes:'EUC_DIPLOMES', offres:'EUC_OFFRES_FORMATION',
  relations:'EUC_OFFRES_PERIODES', periodes:'Planning_Periodes', soumissions:'EUC_SOUMISSIONS_PFMP',
  entreprises:'EUC_ENTREPRISES', contacts:'EUC_CONTACTS_ENTREPRISES'
};
var EUC_PFMP_PROPERTIES = ['EUC_PFMP_SUBMISSION_MODE','EUC_PFMP_EMAIL_MODE','EUC_PFMP_NOTIFICATION_EMAIL','EUC_PFMP_SEND_STUDENT_CONFIRMATION','EUC_PFMP_TURNSTILE_SITE_KEY','EUC_PFMP_TURNSTILE_SECRET_KEY','EUC_PFMP_TURNSTILE_EXPECTED_HOSTNAME'];

function EUC_PFMP_lireConfiguration_() {
  var p=PropertiesService.getScriptProperties(), c={};
  EUC_PFMP_PROPERTIES.forEach(function(k){c[k]=p.getProperty(k)||'';});
  return c;
}
function EUC_PFMP_controlerConfiguration() {
  var c=EUC_PFMP_lireConfiguration_(), etat={};
  EUC_PFMP_PROPERTIES.forEach(function(k){etat[k]=c[k]?'présente':'absente';});
  return {version:EUC_PFMP_VERSION,proprietes:etat,valide:EUC_PFMP_PROPERTIES.filter(function(k){return k!=='EUC_PFMP_SEND_STUDENT_CONFIRMATION';}).every(function(k){return !!c[k];})};
}
function EUC_PFMP_modesSecurite_() {
  var c=EUC_PFMP_lireConfiguration_();
  return {submission:c.EUC_PFMP_SUBMISSION_MODE==='LIVE'?'LIVE':'DRY_RUN',email:c.EUC_PFMP_EMAIL_MODE==='ENABLED'?'ENABLED':'DISABLED',turnstileConfigure:!!(c.EUC_PFMP_TURNSTILE_SITE_KEY&&c.EUC_PFMP_TURNSTILE_SECRET_KEY&&c.EUC_PFMP_TURNSTILE_EXPECTED_HOSTNAME)};
}
function EUC_PFMP_exigerModeEcritureLive_() {
  EUC_ENT_controlerCibleRecette_();
  if(EUC_PFMP_lireConfiguration_().EUC_PFMP_SUBMISSION_MODE!=='LIVE')throw new Error('Écriture PFMP refusée : mode DRY_RUN actif.');
  return true;
}
function EUC_PFMP_exigerModeCourrielActif_() {
  if(EUC_PFMP_lireConfiguration_().EUC_PFMP_EMAIL_MODE!=='ENABLED')throw new Error('Courriel PFMP refusé : mode DISABLED actif.');
  return true;
}
function EUC_PFMP_configurerModesRecette(autorisation) {
  if(autorisation!=='AUTORISATION_MODES_PFMP_RECETTE_DEV8')throw new Error('Autorisation explicite requise.');
  PropertiesService.getScriptProperties().setProperties({EUC_PFMP_SUBMISSION_MODE:'DRY_RUN',EUC_PFMP_EMAIL_MODE:'DISABLED'},false);
  return {version:EUC_PFMP_VERSION,submission:'DRY_RUN',email:'DISABLED'};
}
