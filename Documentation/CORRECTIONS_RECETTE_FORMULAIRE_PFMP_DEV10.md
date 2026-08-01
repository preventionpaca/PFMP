# Corrections de recette du formulaire PFMP — dev.10

Date : 1er août 2026. Cible exclusive : copie Grist `j1jDArBkzi7P`.

## Origine et correction de l’adresse

L’API Recherche d’entreprises fournit à la fois des composants structurés (`numero_voie`, `type_voie`, `libelle_voie`, `complement_adresse`, `code_postal`, `libelle_commune`) et une adresse concaténée. Le client dev.9 utilisait `adresseComplete` lorsque `numeroVoie` était vide. Les entreprises déjà présentes dans Grist revenaient par ailleurs avec les noms techniques bruts (`Adresse_complete`, `Code_postal`, `Commune`) au lieu du format attendu par le formulaire.

La fonction centralisée `EUC_ENT_normaliserAdresse_` privilégie désormais les composants structurés. En repli seulement, elle retire le couple code postal–ville s’il correspond exactement aux valeurs structurées et se trouve en fin de chaîne. Elle ne fait aucun remplacement global. `EUC_ENT_mapperEntrepriseGrist_` applique la même lecture aux entreprises existantes, sans modifier les données historiques. Le formulaire, le récapitulatif, le payload et les snapshots utilisent ensuite les champs séparés.

## Téléphones

La validation est appliquée pendant la saisie, à la sortie du champ, au clic sur « Suivant » et côté serveur. Les caractères de présentation autorisés sont retirés avant contrôle ; les lettres, textes et indicatifs internationaux précédés de `+` sont refusés.

### France

Le format national comporte exactement 10 chiffres, commence par `0`, puis par un préfixe de `1` à `9`. L’affichage est normalisé par groupes de deux, par exemple `06 12 34 56 78`. Le téléphone du jeune suit toujours cette règle.

### Monaco

Les règles proviennent de l’arrêté ministériel monégasque n° 2025‑354 du 10 juillet 2025 :

- fixes : 8 chiffres commençant par `87` ou `9` ;
- mobiles à 8 chiffres commençant par `3`, `44`, `45` ou `46` ;
- mobiles dont le N(S)N commence par `6` ou `7` : 9 chiffres avec préfixe national `0`, donc 10 chiffres saisis ;
- plage mobile commençant par `2` : 12 chiffres.

Source officielle : https://journaldemonaco.gouv.mc/fr/Journaux/2025/Journal-8756/Arrete-Ministeriel-n-2025-354-du-10-juillet-2025-definissant-un-plan-national-de-numerotation-telephonique

### Autres pays

Aucune bibliothèque internationale n’a été embarquée pour cette correction ciblée. Une saisie nationale de 6 à 15 chiffres est acceptée après retrait des séparateurs autorisés. Cette règle contrôle la forme et la longueur, mais ne prétend pas valider précisément tous les plans mondiaux.

Les téléphones facultatifs peuvent rester vides. Le responsable et le tuteur utilisent le pays de l’entreprise ; un changement de pays les revalide sans les effacer. La copie responsable–tuteur reprend le numéro normalisé.

## Interface et récapitulatif

Le libellé et l’astérisque SIRET sont réunis, le champ et le bouton sont alignés sur ordinateur puis empilés sur petit écran. Le champ est relié au label et au message avec `aria-required` et `aria-describedby`.

Le libellé visible `Enseigne` devient `Nom commercial`, tandis que le mapping technique `Entreprise_enseigne_snapshot` reste inchangé. Le récapitulatif comporte quatre sections : élève et formation, entreprise, responsable et tuteur. Les valeurs facultatives vides sont masquées et trois boutons permettent de revenir directement aux étapes concernées.

## Vérifications et livraison

- tests locaux : **88 réussis, aucun échec** ;
- accès Web App : **DOMAIN** ;
- mode soumission : **DRY_RUN** ;
- mode courriel : **DISABLED** ;
- Turnstile : non activé ;
- production Grist : **ni consultée ni modifiée** ;
- soumission réelle, courriel réel et modification en masse : aucun ;
- version Apps Script immuable : **9** ;
- déploiement existant mis à jour : `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg` (`@9`), sans changement d’URL.
