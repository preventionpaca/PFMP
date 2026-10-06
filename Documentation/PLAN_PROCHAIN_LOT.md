# Prochain lot après DEV452

Priorité bloquante : libérer explicitement une place dans l'historique Apps Script arrivé à `200` versions, puis créer et publier la version immuable DEV468 sur les deux Web Apps existantes. Ne supprimer aucune version sans choix explicite de la version obsolète ; conserver les déploiements `857` tant que cette opération n'est pas faite.

0. Après suppression éventuelle des pointillés dans le modèle source, refaire un seul contrôle visuel sur les huit pages sans déplacer les libellés, les marges, l’ordre ni le nombre de pages. Pour préremplir nationalité, lieu de naissance ou NIR, identifier d’abord une source autorisée et des colonnes explicites ; ne jamais les déduire de l’INE ou du responsable légal.

1. Observer une journée complète dans `Paramétrage → Consommation API Grist` et comparer le total PFMP aux informations que pourra fournir le support Grist; ne pas assimiler l'estimation PFMP au compteur officiel du document.
2. Conserver le déclencheur de snapshots désinstallé tant que son remplacement incrémental n'est pas prêt. Le futur traitement doit être différentiel, plafonné et interrompu immédiatement par le coupe-circuit.
3. Valider l'affectation par code PP sur un lot réel limité. L'affectation administrateur est validée; le chemin PP est couvert par les tests mais n'a pas utilisé de code nominatif réel pendant DEV452.
4. Réduire encore les lectures de structure : mutualiser en priorité `/tables` et les métadonnées répétitives. Objectif suivant pour la liste Apprentis : passer de `5,586 s` à moins de cinq secondes de façon reproductible à froid.
5. Étendre les mesures différentielles aux autres pages publiques et administratives, sans lancer simultanément des traitements qui fausseraient les résultats ou consommeraient inutilement le quota.
6. Transformer Destinataires/envois en coquille légère avec chargement ciblé; objectif inférieur à cinq secondes.
7. Réaligner le socle de tests Git historique (versions dev.8/dev.27, fichier d'audit dev.9 et routeur historique) sans affaiblir les assertions métier.
8. Conserver les modes protégés : Pronote `DRY_RUN`, courriels `DISABLED`, aucun envoi ni ordre de mission de test, aucune consultation de la production Grist `3pnVrygfNn7c`.
