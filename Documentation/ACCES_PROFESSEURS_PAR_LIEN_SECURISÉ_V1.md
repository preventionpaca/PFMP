# Accès professeur par lien sécurisé V1 — non déployé

Le mécanisme évite un nouveau mot de passe mais ne remplace pas les contrôles serveur. Le prototype exige exactement 32 octets provenant d’un générateur cryptographique explicitement approuvé ; il refuse toute génération en leur absence. Apps Script ne fournissant pas ici de garantie suffisante avec `Utilities.getUuid()`, la source CSPRNG définitive doit être validée avant déploiement. Seule l’empreinte SHA-256 du jeton est destinée à être stockée.

## Cycle proposé

1. préparer un courriel uniquement vers l’adresse institutionnelle validée ;
2. créer une empreinte liée à une affectation, un professeur et un type d’action ;
3. lien valable **72 heures** ;
4. au premier usage, vérifier empreinte, expiration, révocation, affectation et rejeu ;
5. marquer le jeton utilisé et créer une session limitée de **8 heures** ;
6. retirer le jeton initial de l’URL par redirection ;
7. limiter chaque session à une seule affectation.

Une réaffectation révoque l’ancien accès, exige un motif, conserve affectation et compte rendu antérieurs, puis prépare un nouveau lien.

À ajouter avant mise en service : table jetons/sessions, verrou transactionnel, quota par empreinte et compte, `Referrer-Policy: no-referrer`, absence de ressources tierces, journal sans jeton, page d’échange sans cache et procédure de révocation administrateur.

Aucun courriel ni jeton réel n’est envoyé ou stocké dans ce lot.
