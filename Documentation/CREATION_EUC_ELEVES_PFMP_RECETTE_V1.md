# Création de EUC_ELEVES_PFMP en recette — rapport V1

## Cible et état

Ce document préparatoire est remplacé pour l’import réel par `RAPPORT_IMPORT_PRONOTE_REEL_PFMP_DEV19.md`. La table a été créée uniquement dans la copie Grist `j1jDArBkzi7P` et alimentée par 628 lignes admissibles.

## Schéma exact proposé

Le fichier source est `proposals/euc-eleves-pfmp-schema-v1.json`. Il définit désormais 37 colonnes pour l’export réel ; sa définition JSON fait foi. Les quatre références sont `Classe`, `Offre_formation`, `Annee_scolaire` et `Soumission_PFMP`.

L’INE est absent. La table historique `Eleves` n’est ni remplacée ni modifiée.

## Règles contrôlées

- Statuts : `PRESENT`, `SORTI`, `SORTIE_A_CONFIRMER`, `REINTEGRE`, `INACTIF_AUTRE`.
- Une absence d’un export ne confirme jamais une sortie et n’invente aucune date.
- Une sortie confirmée avant une période exclut l’élève du compteur « sans convention » ; pendant la période, elle conserve la convention et déclenche une alerte ; après la période, elle ne réécrit pas les statistiques historiques.
- Une réintégration conserve l’historique et ne crée pas automatiquement de doublon.
- Le rapprochement privilégie l’identifiant Pronote, puis l’identité normalisée, la classe et la date de naissance ; une ambiguïté exige un contrôle humain.
- Aucune convention existante n’est supprimée ou annulée par un changement de statut.

## Garde-fous d’installation

L’installateur refuse toute cible autre que la copie figée, exige une autorisation explicite et un fichier de jeton privé, puis vérifie les quatre tables référencées. L’importeur réel peut compléter uniquement cette table, effectue un upsert et relit les lignes. Le fichier temporaire du jeton doit être supprimé après l’opération.

## Étape suivante non autorisée dans ce lot

La prévisualisation, la création, l’upsert et la relecture sont terminés. Le second passage ne prévoit aucune écriture supplémentaire.
