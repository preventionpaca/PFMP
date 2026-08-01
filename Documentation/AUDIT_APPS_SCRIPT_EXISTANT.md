# Audit du projet Apps Script existant

Audit effectué le **31 juillet 2026 à partir de 12:16 (Europe/Paris)**, en lecture seule.

- Projet : `1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c`
- Compte CLASP confirmé par l'utilisateur : compte institutionnel du lycée
- CLASP : `3.3.0`
- Copie de sécurité : dossier temporaire `/tmp/euc-apps-script-audit.tVxRu4`
- Commande : `clasp clone` dans un dossier initialement vide
- Aucun `clasp push`, déploiement, commit, push GitHub ou appel d'écriture Grist effectué

## Fichiers récupérés

CLASP a annoncé **14 fichiers** :

1. `appsscript.json`
2. `Code.js`
3. `EDT.js`
4. `EDT_API.js`
5. `EDT_Calculs.js`
6. `EDT_Install.js`
7. `EDT_Config.js`
8. `EDT_WebApp.js`
9. `EDT_PFMP.js`
10. `EDT_TRM.js`
11. `EDT_Install_Reset_V21.js`
12. `EDT_Install_V24.js`
13. `EDT_Install_V24_1.js`
14. `EDT_Install_V25.js`

CLASP a aussi créé localement son fichier de métadonnées `.clasp.json`; celui-ci n'est pas un fichier source distant. Les empreintes SHA-256 de tous les fichiers ont été relevées dans le journal d'audit sans être ajoutées au dépôt.

## Manifeste et dépendances

Le manifeste utilise V8, le fuseau `Europe/Paris`, Stackdriver et une Web App exécutée par l'utilisateur déployant avec accès anonyme. `dependencies` est vide : aucune bibliothèque Apps Script déclarée. Aucun `oauthScopes` explicite n'est présent.

Le code utilise les services natifs `SpreadsheetApp`, `DriveApp`, `UrlFetchApp`, `HtmlService`, `PropertiesService`, `Session` et `Utilities`. Aucun déclencheur installable créé avec `ScriptApp.newTrigger` n'a été détecté.

## Architecture existante

### `Code.js`

Fichier monolithique de 8 115 lignes et 345 déclarations de fonctions. Il regroupe :

- client Grist principal et récupération d'un logo depuis un autre document Grist ;
- création et alimentation de tables Grist historiques ;
- calendriers scolaires et feuilles Google Sheets ;
- calendriers par formation, calendriers hebdomadaires et détaillés ;
- alternance (`ALT_`), styles, légendes, totaux et saisies ;
- génération HTML et export PDF ;
- menus et navigation entre onglets ;
- opérations PFMP limitées à la représentation des périodes ;
- migrations et maintenances EDT/services jusqu'à la version interne V2.10.9 ;
- fonctions destructives de nettoyage de structure, suppression de colonnes/tables et suppression d'onglets.

### Modules EDT

- `EDT_API.js` : lecture Grist, actions, enregistrements, journal et utilitaires ;
- `EDT_Calculs.js` : normalisation des créneaux, séances, synthèses, TRM et versions ;
- `EDT_Install*.js` : schémas et migrations V2.0, V2.1, V2.4, V2.4.1 et V2.5 ;
- `EDT_PFMP.js` : calcul de répartition PFMP par quotas enseignants ;
- `EDT_TRM.js` : recalcul TRM ;
- `EDT.js` et `EDT_WebApp.js` : deux variantes d'entrée Web App ;
- `EDT_Config.js` : configuration Grist et paramètres EDT.

## Points d'entrée et déclencheurs

- `doGet(e)` : `EDT.js:9` ;
- `onEdit(e)` : `Code.js:2992`, recolore et recalcule les feuilles `ALT_` ;
- `onOpen()` : `Code.js:5803`, construit les menus Accueil, navigation et outils planning ;
- aucun `doPost`, `onInstall` ou `onFormSubmit` détecté ;
- `EDT_doGet(e)` existe dans `EDT_WebApp.js`, mais n'est pas le point d'entrée global.

Il n'existe aucun routeur par paramètre `page`. Le `doGet` actuel rend uniquement la consultation EDT.

## Anomalies Web App

`EDT.js` demande le template `WebApp_EDT`; `EDT_WebApp.js` demande `EDT_WebApp`. Or **aucun fichier HTML n'a été récupéré**. Le projet distant contient donc des références à deux templates absents du contenu retourné par l'API Apps Script. Le déploiement Web App correspondant peut être ancien, incomplet ou non utilisé; ce point doit être clarifié avant de modifier `doGet`.

La recherche complémentaire du 31 juillet 2026 dans l'arborescence locale, les six archives `dev.1` à `dev.6` et l'unique version Git disponible n'a trouvé aucune source fiable de `WebApp_EDT.html`. Son absence ne bloque pas `?page=entreprises`, car le routeur retourne cette application avant toute résolution du template EDT. Elle reste un risque fonctionnel pour la route EDT par défaut, qui appelle directement `WebApp_EDT`.

`EDT.js` appelle aussi des fonctions génériques telles que `getRecords_`, alors que les modules récupérés exposent surtout `EDT_getRecords_`. Une dépendance à du code ancien ou absent est possible.

## Secrets et identifiants sensibles

Une **même clé API Grist en clair** est présente dans trois zones :

| Fichier | Ligne/zone | Type | Traitement requis avant Git |
|---|---:|---|---|
| `Code.js` | ligne 10, objet `GRIST` | clé API Grist | remplacer par `PropertiesService.getScriptProperties()` |
| `EDT_Config.js` | ligne 12, objet `EDT_CONFIG` | clé API Grist | remplacer par une lecture de propriété |
| `EDT_Install_Reset_V21.js` | ligne 14, objet `EDT_V21_CONFIG` | clé API Grist | supprimer la copie et réutiliser la configuration centrale |

La valeur n'a été reproduite ni dans ce rapport ni dans le dépôt. Les trois occurrences ont la même empreinte, donc semblent exposer le même secret. Aucun courriel, mot de passe ou jeton supplémentaire en littéral n'a été détecté.

Autres identifiants de configuration non secrets mais à centraliser : identifiant du document Grist principal, identifiant du document Grist des logos et trois identifiants de fichiers Drive dans `Code.js:16-18`. Ils peuvent rester dans `PropertiesService` ou dans une configuration non secrète documentée selon le niveau de confidentialité voulu.

Le projet distant n'a pas été modifié et sa clé n'a pas été révoquée pendant cet audit. Une rotation de la clé sera recommandée après migration vers les propriétés du script.

## Collisions et doublons

Le contrôle lexical trouve **31 noms de fonctions globales déclarés plusieurs fois**. Les plus importants sont :

- cinq versions de plusieurs fonctions ALT (`trouverPeriodesPourFeuilleALT_`, sélection de période, priorité visuelle et total annuel) ;
- trois versions de `gristApplyActions_`, `calculerStyleJourALT_`, `mettreAJourHorodatageActualisationALT_` et `typesVariablesPlanning_` ;
- doublons d'utilitaires de fusion et de présentation CAL ;
- doublons EDT entre `EDT_API.js`, `EDT_Calculs.js` et `EDT_Install_Reset_V21.js` ;
- doublons complets entre les installateurs V2.4 et V2.4.1.

Apps Script partage un espace global unique. Ces redéfinitions rendent la fonction effectivement utilisée dépendante de la résolution/concaténation du projet et compliquent fortement tout futur déploiement. Aucun doublon n'a été supprimé à ce stade, car il faut d'abord caractériser la version réellement utilisée en production.

Le module local Eucalyptus utilise le préfixe `EUC_ENT_`, mais son `Code.gs` définit actuellement un second `doGet`. Une copie directe créerait donc une collision certaine avec `EDT.js`. Le futur patch devra conserver un seul `doGet(e)` et router explicitement `?page=entreprises` vers `EUC_ENT_afficherApplication(e)`, avec la route EDT actuelle comme comportement par défaut.

## Opérations à risque présentes

Plusieurs fonctions peuvent supprimer ou remplacer des données : remise à zéro EDT, vidage de tables, suppression de `Groupes_Classes`, suppression de colonnes d'import, suppression de calendriers Grist et suppression d'onglets Sheets. Elles ne sont pas exécutées automatiquement par l'audit, mais certaines sont accessibles par menus ou appel manuel. Elles doivent être conservées lors de la première intégration, documentées et protégées avant toute recette de production.

`onOpen` efface également toutes les propriétés **du document** avant de reconstruire les entrées de navigation. Les futurs secrets doivent donc impérativement être placés dans les **propriétés du script**, jamais dans les propriétés du document.

## Contrôles effectués

- téléchargement dans un dossier temporaire vide : réussi ;
- nombre et liste des sources : relevés ;
- empreintes SHA-256 : relevées ;
- lecture et validation JSON du manifeste : réussies ;
- vérification syntaxique Node de tous les `.js` : réussie ;
- inventaire des 424 déclarations de fonctions : réalisé ;
- recherche des points d'entrée, services, écritures et opérations destructives : réalisée ;
- recherche de secrets, identifiants longs et courriels littéraux : réalisée ;
- recherche de doublons globaux : 31 noms dupliqués ;
- HTML attendu contre HTML téléchargé : deux templates attendus, aucun récupéré.

## État d'intégration

La copie distante **n'a pas été intégrée au dépôt**, car les trois fichiers contenant la clé ne peuvent pas être copiés avant assainissement. Les fichiers Eucalyptus locaux n'ont pas été fusionnés avec la copie distante. Cette séparation respecte l'arrêt demandé après téléchargement et audit.

## Proposition pour la prochaine passe

1. préparer dans un second dossier de travail une copie assainie des 14 sources ;
2. centraliser la configuration dans `PropertiesService.getScriptProperties()` sans valeur secrète par défaut ;
3. préserver tous les noms de fichiers et toutes les fonctions existantes, y compris les doublons, lors de la première importation ;
4. confirmer si les deux templates HTML manquants existent ailleurs ou si la Web App EDT n'est pas utilisée ;
5. intégrer les sources assainies dans `apps-script/` sans écraser les fichiers Eucalyptus ;
6. remplacer le `doGet` Eucalyptus autonome par une fonction routable et ajouter `?page=entreprises` au point d'entrée unique ;
7. produire `RECETTE_AVANT_CLASP_PUSH.md` et la liste exacte de synchronisation ;
8. s'arrêter de nouveau avant tout `clasp push`.

## Risques résiduels

- clé Grist encore présente dans le projet distant et dans la copie temporaire protégée ;
- comportement réel des fonctions globales dupliquées à confirmer ;
- templates Web App absents ;
- fonctions génériques potentiellement manquantes pour `EDT.js` ;
- absence de tests automatisés historiques ;
- aucun instantané des versions/déploiements Apps Script n'a été téléchargé, seulement le contenu courant du projet.

## Suivi après audit

Lors de la passe suivante, les 14 fichiers ont été intégrés localement après assainissement. Les deux dossiers temporaires de téléchargement et de transformation ont ensuite été supprimés afin de ne pas conserver la clé historique en clair. Le projet Apps Script distant est resté inchangé.
