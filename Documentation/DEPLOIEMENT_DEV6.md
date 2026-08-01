# Déploiement `v1.0.0-dev.6`

## Projet et versions

- projet Apps Script principal : `1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c` ;
- version de sauvegarde avant intégration : **2** ;
- version intégrée initiale : **3** ;
- version temporaire de diagnostic retirée : **4** ;
- version finale initiale Web App : **5** ;
- version corrective API navigateur : **6** ;
- déploiement Web App final : `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg` ;
- accès : `DOMAIN` ; exécution : `USER_DEPLOYING`.

URL de recette :

`https://script.google.com/macros/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec?page=entreprises`

## Composition

Le distant contient 23 fichiers : les 14 noms historiques sont préservés et les neuf fichiers Entreprises sont ajoutés. Parmi le socle historique, `EDT.js` ajoute la route Entreprises et le manifeste limite l'accès au domaine ; les douze autres sources historiques ont été réutilisées depuis le `HEAD` distant sans altération.

Le module `EUC_ENT_` refuse toute cible autre que l'environnement `recette` et le Doc ID `j1jDArBkzi7P` dans cette version. Le passage ultérieur en production nécessitera une version distincte retirant cette garde de recette et une modification de la seule propriété `EUC_ENT_GRIST_DOC_ID`.

## Correctif version 6

La version immuable `6` conserve la même URL de déploiement et la même cible Grist de recette. Elle contourne le `502` reproductible de `UrlFetchApp` vers l'API Recherche d'entreprises : après contrôle d'absence dans Grist côté serveur, le navigateur appelle l'API publique sans secret, puis Apps Script valide et mappe la réponse. Aucune écriture Grist n'a été effectuée pendant le déploiement.

## Diagnostic temporaire

Un exécutable API `MYSELF` temporaire a été créé pour tenter le diagnostic sans exposer de secret. Google a refusé l'exécution avec les autorisations disponibles. Ce déploiement a été supprimé et le manifeste final ne contient plus `executionApi`. Aucun appel métier ni aucune écriture Grist n'a eu lieu.
