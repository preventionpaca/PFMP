# Décisions du référentiel PFMP — V1

Date : 31 juillet 2026  
Statut : décisions métier validées, préparation locale en lecture seule

## Référentiel autorisé

Le référentiel proposé contient exactement **38 classes autorisées**. Seules ces offres pourront recevoir `Afficher_formulaire_PFMP=true`, sous réserve que l'année scolaire et l'offre soient actives. Toute autre offre doit conserver `Afficher_formulaire_PFMP=false`.

La liste est une donnée métier destinée à être alimentée dans Grist. Elle ne doit être codée en dur ni dans le HTML ni dans Apps Script. Le fichier de préparation est `proposals/pfmp-classes-autorisees-proposees.csv`.

## Exclusions métier définitives

- `1CAPP`, ligne Grist ID 2 : exclue du formulaire ; aucune recherche de diplôme n'est nécessaire pour ce formulaire.
- `TMELEC G`, lignes Grist IDs 27 et 38 : exclues du formulaire ; l'ancienne ambiguïté de sélection est résolue par cette exclusion.

Ces lignes restent historiques. Aucune fusion, suppression, désactivation ou modification de données n'est autorisée par cette décision.

## Bilan recalculé

|Indicateur|Valeur|
|---|---:|
|Classes autorisées|38|
|Correspondances exactes|28|
|Correspondances normalisées certaines|2|
|Classes introuvables|8|
|Classes ambiguës|0|
|Lignes Grist exclues du formulaire|8|
|Périodes PFMP/Stage reconnues|47|
|Relations candidates offre–période|54|
|Relations certaines|43|
|Relations à valider|11|

Les lignes Grist exclues sont les IDs 2, 6, 27, 34, 35, 36, 37 et 38. « Exclue » impose uniquement `Afficher_formulaire_PFMP=false` dans la future alimentation ; les données historiques et calendriers restent intacts.

## Décisions restant à prendre

1. Confirmer `CAR=CPA=CA` et `MP3=MP3D`.
2. Déterminer les diplômes finaux des parcours MTNE et REMI.
3. Confirmer le régime des BTS ELEC `Alt` et les périodes scolaires manquantes de deuxième année.
4. Qualifier l'usage de la période mixité ID 278.
5. Valider les 11 relations encore incertaines avant toute écriture.

## Garantie

Ce document ne matérialise aucune mutation : aucune écriture ou modification de schéma Grist, aucune opération Apps Script ou déploiement, aucun courriel, commit ou push Git n'a été effectué.
