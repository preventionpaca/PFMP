# État du projet Eucalyptus PFMP

- Version active déployée le 2 octobre 2026 : DEV417, version Apps Script immuable `723`.
- Version locale récupérée : copie exacte de la version Apps Script immuable `722`, soit 343 fichiers dans `apps-script/`.
- Déploiements ADMIN et PUBLIC : tous deux positionnés sur `723`, avec leurs identifiants et URL historiques conservés.
- Référence Git de récupération : branche `codex/recover-dev416`, créée depuis `main` au commit `e5377d3`.
- Preuve d'identité : `Documentation/snapshots/apps-script-v722.sha256` et `node tests/run-dev416-recovery-tests.js`.
- Grist autorisé : base PFMP active `b2CyeMEdVEMS` uniquement, après confirmation explicite du 2 octobre 2026. Production `3pnVrygfNn7c` interdite.
- Web App PUBLIC : `https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec`.
- Déploiement ADMIN : `AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA`.
- Routes : `pfmp`, `suivi-pfmp`, `import-pronote-pfmp`, `gestion-pfmp`, `entreprises` ; routeur EDT historique conservé.
- Modes exigés : soumissions `DRY_RUN`, courriels `DISABLED`, import Pronote `DRY_RUN`, mutations administratives `DRY_RUN`, Turnstile désactivé. Le snapshot distant déclare actuellement `ANYONE_ANONYMOUS`, en contradiction avec l'exigence historique `DOMAIN` ; aucune correction ou redéploiement n'a encore été effectué.
- Actif : formulaire PFMP, recherche entreprise, suivi paginé et multiannuel, import Pronote en prévisualisation, gestion administrative consultable.
- Préparé mais désactivé : import réel, mutations de convention, annulation, affectations, courriels et ordres de mission.
- Tables PFMP principales : `EUC_OFFRES_FORMATION`, `EUC_OFFRES_PERIODES`, `EUC_ELEVES_PFMP`, `EUC_SOUMISSIONS_PFMP`, `EUC_SYNTHESE_SUIVI_PFMP`, `EUC_UTILISATEURS_PFMP`, `EUC_IMPORTS_PRONOTE_PFMP`, `EUC_HISTORIQUE_SOUMISSIONS_PFMP`, `EUC_PERSONNELS_PFMP`, `EUC_AFFECTATIONS_PFMP`.
- Tests de récupération : `node tests/run-dev416-recovery-tests.js`.
- Tests historiques : migrés vers l’état DEV416/DEV417 sans suppression de contrôle ; suite complète verte (319 tests).
- Accès du Web App unique : `ANYONE_ANONYMOUS` conservé car les routes publiques et administratives partagent le même projet ; les routes administratives restent protégées par l’authentification applicative.
- Reprise exacte : préparer DEV417 à partir de cette branche récupérée, en commençant par les corrections d'affichage et les tests ciblés, sans activer les mutations.

## DEV417 en préparation locale — 2 octobre 2026

- Les interfaces apprentis ADMIN et PUBLIC rejettent désormais les réponses de chargement obsolètes lorsqu'une autre classe ou année a été sélectionnée entre-temps. Cela supprime la course qui pouvait laisser une liste vide ou afficher la mauvaise réponse jusqu'à actualisation.
- La bulle des compteurs apprentis est maintenant interactive : maintien au passage du pointeur, délai de fermeture élargi, navigation clavier, roulette et barre de défilement stables, confinement du défilement pour les listes longues.
- Le détail de classe commun ADMIN/PUBLIC conserve exactement dix colonnes ordonnées. Les compteurs `Apprenti`, `Avec convention` et `Sans convention` exposent une liste triée et défilable des élèves concernés.
- La garde de cible active avait été réalignée à tort sur `j1jDArBkzi7P`, ce qui a bloqué les lectures directes après le déploiement 723 ; DEV418 rétablit la base PFMP active explicitement confirmée `b2CyeMEdVEMS`.
- Le secret HMAC trouvé dans les sources a été retiré du code et remplacé par la propriété privée `EUC_DEV270B_HMAC_SECRET`. Avant déploiement, il faut faire tourner ce secret de façon coordonnée dans la passerelle d'authentification et le projet PFMP ; aucune valeur ne doit transiter par Git ou les journaux.
- Test ciblé : `node tests/run-dev417-ui-tests.js` vert. Les scripts HTML modifiés passent le contrôle syntaxique V8 local.
- La suite historique résout les fichiers `.gs` récupérés en `.js`, charge les dépendances du routeur en isolation et vérifie les versions/manifeste/artefacts réellement présents. Aucun contrôle métier ou de sécurité n’a été retiré.
- Diagnostic `1MELEC2` : le moteur d'import est incrémental (création des absents, mise à jour des champs élève réellement modifiés, présence seule pour les autres) et ne modifie pas les tables conventions/apprentissage. Il reste à contrôler en lecture seule dans `b2CyeMEdVEMS` si la ligne est absente, inactive ou `Exclure_import=true`.
- Aucun accès production, aucune écriture Grist, aucun import, aucun `clasp push`, aucune version ni aucun déploiement n'a été effectué dans DEV417.

## Complément DEV417 — rentrée et apprentissage

- Le centre d’administration expose à nouveau un accès visible aux correspondances et exclusions de classes Pronote.
- La page Pronote peut lister directement, en lecture seule, les correspondances mémorisées par année et source, sans charger ni importer un fichier.
- Les inscriptions annuelles d’un même jeune sont désormais rapprochées par identifiants stables pour la lecture des épisodes d’apprentissage. L’inscription historique reste inchangée ; la nouvelle inscription annuelle retrouve les contrats antérieurs pertinents.
- La date de rupture borne réellement l’épisode : avant rupture `APPRENTI`, après rupture `SCOLAIRE`, chevauchement `MIXTE`. Un nouveau contrat crée un nouvel épisode et rétablit `APPRENTI` à partir de sa date d’effet.
- Tests ciblés verts : `node tests/run-dev417-ui-tests.js` et `node tests/run-dev417-schoolyear-tests.js`.
- Tests verts : suite complète `node tests/run-tests.js` (319 tests), `run-dev417-ui-tests.js` et `run-dev417-schoolyear-tests.js`.
- Le secret privé `EUC_DEV270B_HMAC_SECRET` est installé de façon coordonnée dans la passerelle et PFMP. La passerelle conserve son déploiement historique, désormais sur sa version immuable `5` ; la valeur n’est plus présente dans son code.
- `clasp push` PFMP relu et comparé : 343 fichiers distants identiques aux sources locales. Version immuable `723` créée et appliquée aux seuls déploiements ADMIN et PUBLIC existants.
- Contrôles HTTP après déploiement : pages GitHub publiques et route Apps Script publique à `200`. Les trois sous-domaines `*.loucodi.fr` présentent encore un certificat TLS ne couvrant pas leurs noms ; ce point DNS/hébergement est indépendant de DEV417.

## Audit différentiel après recette visuelle — correctifs DEV418 locaux

- Les captures de recette ont confirmé quatre régressions d’interface : première cellule de sélection encore présente dans les lignes du tableau PUBLIC, navigation forcée hors des wrappers `*.loucodi.fr`, ancien calcul incohérent pour les infobulles apprentis et identifiants historiques d’offres utilisés comme identifiants de classes.
- Le correctif local masque désormais la première cellule PUBLIC avec son en-tête, maintient les navigations publiques dans l’iframe, fournit une navigation rapide publique en lecture seule, raccorde compteurs et infobulles apprentis à `EUC_DEV251_dashboardDetails` et résout en lecture seule une offre `EUC_OFFRES_FORMATION` vers sa classe canonique.
- Tests verts : `node tests/run-tests.js` (319 tests), `node tests/run-dev417-ui-tests.js` et `node tests/run-dev417-schoolyear-tests.js`.
- Diagnostic HTTP PUBLIC `page=pfmp-diagnostic` : arrêt avant toute lecture Grist avec `Accès recette refusé : cible Grist non autorisée`. La propriété Apps Script reste donc configurée sur une cible différente de `j1jDArBkzi7P` ; le snapshot immuable 722 et les sauvegardes DEV273 à DEV416 autorisaient `b2CyeMEdVEMS`.
- L’utilisateur a confirmé explicitement que `b2CyeMEdVEMS` est la base PFMP active et en a autorisé la consultation en lecture seule puis le déploiement DEV418. Toute écriture Grist, tout import et tout accès à la production `3pnVrygfNn7c` restent interdits.
