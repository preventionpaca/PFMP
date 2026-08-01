# Architecture du Centre de suivi PFMP V1

La route interne `?page=suivi-pfmp` reste distincte de `?page=pfmp`. Le prototype comprend `EUC_SUIVI_PFMP_WebApp.gs`, un service métier pur et testable, et trois fichiers d’interface. Aucun déploiement n’est réalisé.

Le serveur résout l’adresse avec `Session.getActiveUser()`, recherche une autorisation active, recalcule rôle, classes et permissions, puis filtre avant projection. Le navigateur ne reçoit qu’une vue de liste minimale. Un refus retourne uniquement « Accès non autorisé. ».

Rôles proposés : `ADMIN_PFMP`, `DDFPT`, `BUREAU_ENTREPRISES`, `ENSEIGNANT`, `LECTURE_SEULE`. Les capacités restent portées explicitement par l’utilisateur afin de permettre une évolution sans modifier le modèle. Un enseignant est filtré par classes et affectations ; DDFPT et bureau peuvent recevoir une vue globale selon configuration.

Les corrections utilisent : lecture de la version, aperçu avant/après, motif obligatoire, validation serveur, verrou Grist/Apps Script à ajouter lors du passage LIVE, contrôle optimiste, mise à jour courante puis insertion de l’historique dans une même section critique. Le prototype simule ce résultat sans écrire.

Annulation : changement d’état historisé, ligne conservée. Doublon : marquage et lien vers la fiche conservée. Purge : opération exceptionnelle, distincte et refusée dans ce lot.

Une correction importante après traitement Pronote positionne la proposition `A_REVERIFIER_DANS_PRONOTE`. Cette valeur doit être validée avant création.

## Décisions métier encore nécessaires

- confirmer les rôles, capacités et personnes habilitées, sans créer encore de compte ;
- décider si `Roles_EDT` peut être étendu sans coupler excessivement EDT et PFMP, ou valider `EUC_UTILISATEURS_PFMP` ;
- valider les états convention, Pronote, affectation, action, mission et frais ;
- valider les colonnes complémentaires et la durée de conservation des historiques/snapshots ;
- confirmer le référentiel `Enseignants`, son courriel stable et les classes accessibles ;
- définir la règle de réactivation, le marquage des tests/doublons et l’autorité de purge ;
- fournir modèle officiel, circuit de validation, règles Drive et règles financières des missions ;
- décider si la saisie interne crée directement une convention ou passe par une validation intermédiaire.
