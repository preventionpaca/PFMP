# Recette avant tout futur `clasp push`

Version intégrée : **Eucalyptus Entreprises SIRET — v1.0.0-dev.6**. Le projet cible est l'unique projet existant `1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c`. La version immuable `2` en conserve l'état historique complet avant intégration ; la version initiale est `5` et le correctif API navigateur est la version `6`.

La décision d'architecture du 31 juillet 2026 autorise l'intégration et la recette sur la copie Grist. Le projet Apps Script de recette distinct est abandonné, non supprimé et ne doit plus être utilisé.

## Résultat de l'intégration locale

Les 14 fichiers récupérés par CLASP sont tous représentés dans `apps-script/`. Les fichiers historiques conservent leur nom. Les différences volontaires avec la copie distante initiale sont limitées à :

- `Code.js` : clé Grist remplacée par la propriété `EUC_ENT_GRIST_API_KEY` ;
- `EDT_Config.js` : même assainissement ;
- `EDT_Install_Reset_V21.js` : même assainissement ;
- `EDT.js` : `doGet(e)` conservé comme point d'entrée unique, ajout de `?page=entreprises`, comportement EDT historique déplacé sans changement dans `EDT_afficherWebAppExistante_(e)` ;
- `appsscript.json` : contenu sémantiquement identique au manifeste distant, mise en forme locale seulement.

Les neuf fichiers Eucalyptus ajoutés sont :

- `EUC_ENT_ApiEntreprise.gs`
- `EUC_ENT_Config.gs`
- `EUC_ENT_Grist.gs`
- `EUC_ENT_InstallationGrist.gs`
- `EUC_ENT_Validation.gs`
- `EUC_ENT_WebApp.gs`
- `Index.html`
- `Scripts.html`
- `Styles.html`

L'ancien `Code.gs` du prototype autonome a été remplacé par `EUC_ENT_WebApp.gs`; il n'existe donc plus de second `doGet`.

## Propriétés obligatoires avant publication

À saisir manuellement dans **Paramètres du projet → Propriétés du script** :

- `EUC_ENT_ENVIRONMENT`
- `EUC_ENT_ALLOWED_DOMAIN` = `lycee-les-eucalyptus.org`
- `EUC_ENT_GRIST_API_URL` = `https://docs.getgrist.com`
- `EUC_ENT_GRIST_DOC_ID` = identifiant du document Eucalyptus
- `EUC_ENT_GRIST_API_KEY` = nouvelle clé après rotation de la clé exposée historiquement
- `EUC_ENT_TABLE_ENTREPRISES` = `EUC_ENTREPRISES`
- `EUC_ENT_TABLE_CONTACTS` = `EUC_CONTACTS_ENTREPRISES`
- `EUC_ENT_API_RECHERCHE_URL` = `https://recherche-entreprises.api.gouv.fr/search`

Ne pas configurer `EUC_ENT_TABLE_RELATIONS` en v1. Aucune valeur de secret ne doit être placée dans Git.

## Blocages avant publication

1. **Rotation du secret :** la clé actuelle a été présente en clair dans le projet distant; créer une nouvelle clé, la placer dans les propriétés du script, puis révoquer l'ancienne au moment coordonné de la publication.
2. **Accès Web App :** le manifeste `dev.6` utilise `DOMAIN` et `USER_DEPLOYING`. Le module refuse également l'accès sans domaine configuré et sans courriel institutionnel visible.
3. **Templates EDT absents :** `WebApp_EDT.html` et `EDT_WebApp.html` ne figurent pas dans le projet téléchargé alors que le code les référence. Confirmer si la Web App EDT est réellement utilisée avant toute nouvelle version.
4. **Doublons historiques :** 31 noms de fonctions restent dupliqués afin de ne pas modifier arbitrairement la production. Une recette de non-régression est indispensable.
5. **Concurrence SIRET :** un verrou Apps Script entoure le second contrôle et l'insertion; son comportement doit encore être validé dans la recette Apps Script réelle.

## Contrôles locaux effectués

- syntaxe des 13 fichiers JavaScript historiques : réussie ;
- syntaxe des six fichiers serveur Eucalyptus : réussie ;
- JSON du manifeste, de `.clasp.json` et du fixture Grist : valide ;
- un seul `doGet`, un `onOpen`, un `onEdit`, aucun `doPost` ;
- route `?page=entreprises` détectée ;
- aucune collision ou duplication dans les fonctions `EUC_ENT_` ;
- 31 doublons historiques conservés et documentés ;
- aucune clé, jeton ou mot de passe littéral détecté dans `apps-script/` ;
- 31 tests locaux simulés réussis après le correctif API navigateur, sans écriture Grist ;
- `git diff --check` réussi ;
- comparaison des 14 noms téléchargés : aucun fichier manquant.

## Liste exacte actuellement suivie par CLASP

Un futur `clasp push` depuis cette arborescence proposerait exactement :

1. `apps-script/appsscript.json`
2. `apps-script/Code.js`
3. `apps-script/EDT.js`
4. `apps-script/EDT_API.js`
5. `apps-script/EDT_Calculs.js`
6. `apps-script/EDT_Config.js`
7. `apps-script/EDT_Install.js`
8. `apps-script/EDT_Install_Reset_V21.js`
9. `apps-script/EDT_Install_V24.js`
10. `apps-script/EDT_Install_V24_1.js`
11. `apps-script/EDT_Install_V25.js`
12. `apps-script/EDT_PFMP.js`
13. `apps-script/EDT_TRM.js`
14. `apps-script/EDT_WebApp.js`
15. `apps-script/EUC_ENT_ApiEntreprise.gs`
16. `apps-script/EUC_ENT_Config.gs`
17. `apps-script/EUC_ENT_Grist.gs`
18. `apps-script/EUC_ENT_InstallationGrist.gs`
19. `apps-script/EUC_ENT_Validation.gs`
20. `apps-script/EUC_ENT_WebApp.gs`
21. `apps-script/Index.html`
22. `apps-script/Scripts.html`
23. `apps-script/Styles.html`

`clasp status` ne signale aucun fichier ignoré ou non suivi dans `apps-script/`.

## Recette manuelle minimale après push autorisé

Dans un nouveau déploiement versionné limité au domaine, en utilisant la copie Grist :

1. exécuter `EUC_ENT_controlerConfiguration` et vérifier seulement l'état présent/absent ;
2. ouvrir la route EDT par défaut et vérifier la non-régression, ou confirmer officiellement qu'elle est inutilisée ;
3. ouvrir `?page=entreprises` avec un compte autorisé puis avec un compte non autorisé ;
4. rechercher un SIRET actif, fermé, introuvable et en diffusion partielle ;
5. charger une entreprise déjà présente dans Grist ;
6. enregistrer uniquement dans un document/table de recette, jamais dans les tables métier de production ;
7. simuler deux soumissions simultanées et vérifier l'absence de doublon ;
8. contrôler `onOpen`, les menus, `onEdit` ALT, calendriers, PFMP, alternance, EDT et TRM ;
9. contrôler les journaux sans valeur de secret ;
10. comparer à nouveau `clasp status` à la liste ci-dessus.

## État de la recette distante

Le déploiement Web App final est limité au domaine. Le test anonyme atteint correctement l'écran de connexion Google. L'automatisation de la recette authentifiée est suspendue : l'exécutable API temporaire limité au déployeur a été refusé par Google, puis supprimé, et le jeton Grist temporaire n'existe plus. Aucun appel métier et aucune écriture Grist n'ont été réalisés. La recette doit être poursuivie avec une session institutionnelle autorisée ou après recréation locale du jeton, sans transmettre de secret dans le chat.

Avant chaque synchronisation future, contrôler la cible, la liste des fichiers et la garde du Doc ID de recette. La production Grist reste exclue de la campagne de tests.
