

/**
 * EDT V2.0 - Configuration
 * Aucun fichier Code.gs fourni pour éviter d'écraser ton projet existant.
 * Toutes les fonctions Apps Script de cette archive commencent par EDT_.
 */

var EDT_CONFIG = {
  GRIST_HOST: 'https://docs.getgrist.com',
  DOC_ID: '3pnVrygfNn7c',
  GRIST_API_KEY: PropertiesService.getScriptProperties().getProperty('EUC_ENT_GRIST_API_KEY') || '',
  TIMEZONE: 'Europe/Paris'
};

var EDT_DEFAULT_PARAMS = [
  ['LastUpdate', new Date().toISOString(), 'Horodatage de synchronisation widgets.'],
  ['RefreshSeconds', '1', 'Rafraîchissement des vues en secondes.'],
  ['Pas_Horaire_Minutes', '30', 'Pas horaire EDT.'],
  ['Heure_Debut_Journee', '07:00', 'Début affichage standard.'],
  ['Heure_Fin_Journee', '18:00', 'Fin affichage standard.'],
  ['Heure_Fin_Extension', '22:00', 'Fin affichage soirée.'],
  ['Afficher_Soirees', 'non', 'Afficher les créneaux après 18h.'],
  ['Semaines_Reference_Service', '36', 'Nombre de semaines de référence pour la moyenne annuelle.'],
  ['Service_Hebdo_Defaut', '18', 'Service hebdomadaire par défaut si non renseigné.'],
  ['Annee_EDT_Defaut', '2026-2027', 'Année EDT proposée par défaut dans le widget.'],
  ['Version_EDT_Defaut', 'Version active', 'Version EDT proposée par défaut dans le widget.'],
  ['Deplacement_Optimiste', 'oui', 'Déplacement visible immédiatement puis sauvegarde Grist en tâche masquée.'],
  ['Recalcul_Differe_ms', '1200', 'Délai avant recalcul différé après un déplacement.'],
  ['Couleurs_EDT', '#FDE68A,#A7F3D0,#BFDBFE,#FBCFE8,#DDD6FE,#FED7AA,#C7D2FE,#BAE6FD,#BBF7D0,#FECACA,#E9D5FF,#D9F99D,#F5D0FE,#CCFBF1,#E5E7EB', 'Palette affichée dans le widget.']
];
