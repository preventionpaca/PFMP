# Architecture des frais de déplacement PFMP V1

`EUC_FRAIS_MISSION_PFMP` est un dossier rattaché à un ordre de mission et au professeur : statut, transport réel, véhicule, distances et montants déclarés/validés, commentaires, dépôt, validation et document versionné.

Aucun calcul d’indemnité n’est implémenté avant validation du barème, des règles académiques, des repas/hébergement et du véhicule personnel. Aucune coordonnée bancaire n’est stockée ; le paiement reste dans l’outil financier officiel.

Les justificatifs futurs doivent être des fichiers Drive institutionnels dans un dossier non public, avec partage par groupes restreints, identifiant enregistré dans Grist et journal d’accès. Jamais de binaire en cellule Grist. Durée de conservation, archivage et suppression restent à valider avec gestion et DPO.

Un professeur accède uniquement à son dossier ; DDFPT/bureau/gestionnaires selon permissions explicites. Les justificatifs d’un autre agent ne sont jamais transmis au navigateur.
