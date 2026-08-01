# Retour arrière Apps Script

## Point de restauration

La version immuable **2** du projet principal `1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c` a été créée avant l'intégration `v1.0.0-dev.6`. Elle contient le `HEAD` historique complet à 14 fichiers.

## Procédure

1. suspendre toute recette et inventorier le déploiement actif ;
2. redéployer la version **2** sous un nouveau déploiement ou mettre à jour explicitement le déploiement concerné vers cette version ;
3. ne pas effectuer de `clasp push` pour un simple retour du déploiement Web App ;
4. si le `HEAD` doit également être restauré, télécharger la version 2 dans un dossier temporaire, comparer les 14 fichiers et demander une autorisation distincte avant de les repousser ;
5. ne modifier aucune propriété EDT, calendrier ou Grist pendant le retour arrière ;
6. vérifier les routes historiques, `onOpen`, `onEdit` et les déploiements après restauration.

Le projet Apps Script de recette abandonné n'est pas un mécanisme de retour arrière et ne doit pas être réutilisé.
