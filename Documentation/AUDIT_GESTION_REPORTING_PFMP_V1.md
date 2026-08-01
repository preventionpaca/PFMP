# Audit gestion et reporting PFMP V1

Audit local du 1er août 2026, complété par les derniers exports authentifiés disponibles de la copie `j1jDArBkzi7P`. Aucun jeton PFMP temporaire n’était disponible pendant ce lot : aucune requête Grist nouvelle n’a été exécutée. L’état courant devra être relu avant toute création de schéma.

## Existant réutilisable

`EUC_SOUMISSIONS_PFMP` possède 64 colonnes et aucune ligne dans le dernier export. Sont réutilisables : `Reference` comme identifiant fonctionnel, `Date_creation`, `Date_modification`, `Statut_administratif`, `Valide_par`, `Date_validation`, `Commentaire_administratif`, `Empreinte_doublon`, `Auteur_technique`, `Version_formulaire` et les snapshots de formation, entreprise et contacts.

`Version_formulaire` décrit la version logicielle, pas la version concurrente d’une fiche. `Auteur_technique` décrit l’origine technique, pas nécessairement l’auteur d’une correction. `Commentaire_administratif` ne remplace pas un motif historisé.

Manquent explicitement : annulation/date/auteur/motif, auteur de dernière modification, version optimiste, indicateur de test, marqueur et référence de doublon, origine ELEVE/PERSONNEL, réception, ainsi que le suivi Pronote (`A_traiter`, `Traite`, date, auteur, commentaire, état de revérification).

Les tables entreprises, contacts, offres, relations, classes, périodes et années existent. Aucune table PFMP d’utilisateurs, historique, affectations, actions, missions ou frais n’apparaît dans les exports ciblés. Les tables EDT historiques `Roles_EDT`, `Enseignants`, `Quotas_PFMP_Enseignants`, `Repartition_PFMP`, `Creneaux_EDT`, `Seances_Generees` et `Indisponibilites_EDT` sont définies dans les installateurs, mais leur présence et leur contenu actuels dans la copie restent à confirmer.

## Conclusion

Le tableau peut réutiliser les 64 colonnes pour l’affichage. Une historisation fiable et les droits exigent des structures dédiées. Aucun état métier proposé ne doit devenir une valeur Grist avant inventaire des valeurs réelles de `Statut_administratif`.
