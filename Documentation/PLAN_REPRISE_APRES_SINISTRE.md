# Plan de reprise après sinistre — proposition

Ce document décrit le futur mécanisme de reconstruction et de bascule. Il ne
crée aujourd'hui ni nouvelle Web App, ni miroir actif, ni copie de production.

## Objectif

Rétablir Eucalyptus PFMP depuis une sauvegarde vérifiée sans changer les URL
publiques utilisées par les personnels, les élèves et les familles. Les noms de
domaine constituent la façade stable ; les identifiants Apps Script, Grist,
Drive et Git restent des paramètres remplaçables derrière cette façade.

## Contenu d'un point de reprise

Chaque sauvegarde exploitable doit produire un manifeste horodaté contenant :

- le commit Git et le tag immuable du code livré ;
- la version Apps Script et l'inventaire des deux déploiements existants ;
- les identifiants de configuration nécessaires, sans aucune valeur secrète ;
- un export ou snapshot Grist avec son empreinte et sa date ;
- l'inventaire des dossiers Drive utilisés par les PDF et les photos ;
- les règles de routage des sous-domaines et leurs cibles actuelles ;
- les empreintes des fichiers et un rapport de restauration à blanc.

Les secrets restent dans un coffre ou dans les propriétés du service. Ils ne
sont jamais placés dans Git ni dans le manifeste.

## Commandes à prévoir

1. `prepare-restore` crée un environnement isolé à partir d'un manifeste,
   restaure le code et une copie des données, injecte les paramètres autorisés,
   puis exécute la suite de tests et la matrice complète des routes.
2. `verify-restore` contrôle les liens internes, les droits, les lectures Grist,
   les documents Drive et les principaux parcours navigateur sans écrire dans
   les données métier.
3. `switch-production` exige une confirmation humaine explicite et ne modifie
   que les cibles derrière les domaines stables. Il conserve les anciennes
   cibles afin de permettre un retour immédiat.
4. `rollback-switch` restaure les cibles précédentes sans réimporter de données.

La création d'un nouvel Apps Script ou d'une nouvelle Web App reste interdite
hors procédure de sinistre explicitement autorisée.

## Garde-fous

- restauration d'abord isolée, jamais directement sur la production ;
- comparaison des volumes, schémas, révisions et empreintes avant bascule ;
- test de toutes les routes et de toute la navigation visible ;
- arrêt automatique au premier écart de schéma, secret manquant ou test rouge ;
- sauvegarde de l'état courant juste avant toute bascule ;
- journal d'audit sans donnée nominative ni secret ;
- exercice de restauration périodique avec mesure du RPO et du RTO.

## Décisions à prendre avant implémentation

- durée maximale de perte de données acceptable (RPO) ;
- délai maximal de remise en service (RTO) ;
- emplacement et durée de conservation des exports Grist chiffrés ;
- personne habilitée à confirmer la bascule ;
- mécanisme exact utilisé par chaque sous-domaine pour changer de cible.

Le bouton « créer le miroir » ne devra apparaître qu'après un premier exercice
de restauration complet et documenté. Le bouton « mettre en route le miroir »
sera séparé, protégé par une confirmation explicite et précédé d'un contrôle de
santé automatique.
