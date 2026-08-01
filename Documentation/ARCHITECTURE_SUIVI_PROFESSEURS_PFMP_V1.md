# Architecture du suivi des professeurs PFMP V1

Séparation obligatoire :

- affectation = qui doit intervenir et pendant quelle période ;
- action = appel, visite, relance ou compte rendu réellement planifié/réalisé ;
- visite = déplacement avec destination figée ;
- ordre de mission = autorisation administrative versionnée ;
- frais = dossier financier rattaché à l’ordre.

`EUC_AFFECTATIONS_SUIVI_PFMP` doit référencer soumission et `Enseignants`, avec snapshots nom/courriel, type de suivi, dates, état, auteur et actif. Un remplacement clôt l’affectation précédente avec `REMPLACE`, sans l’écraser.

`EUC_ACTIONS_SUIVI_PFMP` journalise les actions réelles. Un enseignant ne voit que ses affectations et les données nécessaires. Les vues classe, professeur et organisation reposent sur les mêmes contrôles serveur ; les filtres URL ne donnent aucun droit.

La charge théorique peut être rapprochée de `Repartition_PFMP`, mais l’affectation nominative reste la source opérationnelle.
