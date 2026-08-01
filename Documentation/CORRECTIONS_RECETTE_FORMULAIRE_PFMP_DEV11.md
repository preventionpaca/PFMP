# Corrections de recette du formulaire PFMP — dev.11

Date : 1er août 2026. Cible exclusive : copie Grist `j1jDArBkzi7P`.

## Origine du suffixe ville/pays

Le cas observé correspond à SAM SACOME, SIRET `40822877300060`. La réponse brute de l’API Recherche d’entreprises présente deux descriptions du même établissement :

- `matching_etablissements[0]` contient `adresse = "1 AV PRINCE HEREDITAIRE ALBERT MONACO MONACO"`, mais pas les composants de voie ;
- `siege` contient `numero_voie = "1"`, `indice_repetition = null`, `type_voie = "AV"`, `libelle_voie = "PRINCE HEREDITAIRE ALBERT"`, `libelle_commune_etranger = "MONACO"` et `libelle_pays_etranger = "MONACO"` ;
- pour cet établissement étranger, l’API renvoie `code_postal = null`, `commune = null` et `code_pays_etranger = "99138"` : la répétition ne vient donc pas d’une concaténation locale du code postal, mais directement du champ `adresse` fourni par l’API.

Le mapping sélectionnait exclusivement le résultat `matching_etablissements`, plus pauvre, alors que le siège portait les champs structurés. La correction fusionne les deux objets lorsqu’ils désignent le même SIRET, puis privilégie strictement numéro, indice de répétition, type et libellé de voie.

## Nettoyage de repli

`EUC_ENT_nettoyerSuffixesAdresse_` découpe l’adresse en mots et retire itérativement, uniquement en fin de chaîne, les valeurs exactes du code postal, de la ville et du pays, puis les codes `MC`, `MCO`, `FR` et `FRA`. La comparaison ignore casse et accents. Il n’existe aucun remplacement global : `RUE DE MONACO` ou `AVENUE DE FRANCE` reste intact au milieu d’une voie.

Résultat du test réel Monaco :

- brut : `1 AV PRINCE HEREDITAIRE ALBERT MONACO MONACO` ;
- voie affichée : `1 AV PRINCE HEREDITAIRE ALBERT` ;
- ville : `MONACO` ;
- pays : `MONACO`.

La normalisation intervient au chargement automatique de l’API ou d’une entreprise Grist existante. Elle n’est pas rejouée dans `data()` : une correction manuelle de l’utilisateur n’est donc pas écrasée. Aucune ancienne ligne Grist n’a été modifiée.

## Téléphones professionnels : pays ou France

Le responsable et le tuteur sont validés successivement :

1. selon le pays sélectionné pour l’entreprise ;
2. si ce contrôle échoue, selon la règle française nationale à 10 chiffres.

Ainsi, pour Monaco, les formats monégasques validés en dev.10 et les fixes ou mobiles français sont acceptés. Pour les autres pays, le format national prudent de 6 à 15 chiffres ou un numéro français valide est accepté. Les lettres, textes, longueurs invalides et indicatifs `+` restent refusés. Les champs restent facultatifs, mais toute valeur saisie doit être valide et est normalisée avant la simulation.

Le changement de pays déclenche une nouvelle validation sans effacement. La copie responsable–tuteur reprend le même numéro normalisé. Le téléphone personnel du jeune reste validé exclusivement selon la règle française.

## Vérifications et livraison

- tests locaux : **106 réussis, aucun échec** ;
- syntaxe JavaScript et fichiers JSON : **valides** ;
- relecture de la version distante `10` : **29 fichiers, aucune différence avec le local** ;
- accès Web App : **DOMAIN** ;
- mode soumission : **DRY_RUN** ;
- mode courriel : **DISABLED** ;
- Turnstile : non activé ;
- production Grist : **ni consultée ni modifiée** ;
- soumission réelle, courriel réel et modification en masse : aucun ;
- version Apps Script immuable : **10** ;
- déploiement existant mis à jour : `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg` (`@10`), sans changement d’URL.
