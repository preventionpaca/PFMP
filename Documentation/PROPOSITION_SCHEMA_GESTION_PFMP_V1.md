# Proposition de schéma de gestion PFMP V1 — non appliquée

## Compléments minimaux de `EUC_SOUMISSIONS_PFMP`

`Version_suivi` (Int), `Auteur_derniere_modification` (Text), `Motif_derniere_modification` (Text), `Origine_saisie` (Choice), `Date_reception` (DateTime), `Date_annulation` (DateTime), `Annule_par` (Text), `Indicateur_test` (Bool), `Indicateur_doublon` (Bool), `Doublon_de` (Ref), `A_traiter_dans_Pronote` (Bool), `Traite_dans_Pronote` (Bool), `Date_traitement_Pronote` (DateTime), `Traite_par` (Text), `Commentaire_traitement` (Text), `Etat_traitement_Pronote` (Choice).

## `EUC_UTILISATEURS_PFMP`

`Email` Text, `Nom_affichage` Text, `Role` Choice, `Classes_autorisees` RefList:Classes, `Actif` Bool, `Peut_voir_toutes_classes`, `Peut_modifier`, `Peut_saisir`, `Peut_annuler`, `Peut_purger_tests` Bool, `Date_derniere_modification` DateTime.

## `EUC_HISTORIQUE_SOUMISSIONS_PFMP`

`Soumission` Ref, `Identifiant_fonctionnel` Text, `Version_avant/apres` Int, `Type_action`, `Champs_modifies`, `Valeurs_avant_JSON`, `Valeurs_apres_JSON`, `Motif`, `Auteur_email`, `Auteur_nom`, `Date_action`, `Origine_action` Text/Choice. Pas d’adresse IP sans décision RGPD explicite.

Les snapshots JSON doivent être bornés et exclure secrets, nonce, empreintes techniques inutiles et données non modifiées. Conservation et purge doivent être validées avec le DPO.

## Élèves officiels Pronote et accès temporaires

La proposition complémentaire ajoute `EUC_ELEVES_PFMP`, sans remplacer automatiquement la table historique `Eleves`. Pour les liens professeurs, prévoir `EUC_ACCES_SUIVI_PFMP` (empreinte, affectation, professeur, type, création, expiration, utilisation, statut, auteur, révocation) et `EUC_SESSIONS_SUIVI_PFMP` (empreinte de session, affectation, professeur, expiration, révocation). Aucun jeton clair ne doit être conservé.
