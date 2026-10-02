# État du projet Eucalyptus PFMP

- Version stable et active constatée le 2 octobre 2026 : `Eucalyptus PFMP — v1.0.0-dev.416`.
- Version locale récupérée : copie exacte de la version Apps Script immuable `722`, soit 343 fichiers dans `apps-script/`.
- Déploiements ADMIN et PUBLIC : tous deux positionnés sur `722` ; aucune DEV417 active.
- Référence Git de récupération : branche `codex/recover-dev416`, créée depuis `main` au commit `e5377d3`.
- Preuve d'identité : `Documentation/snapshots/apps-script-v722.sha256` et `node tests/run-dev416-recovery-tests.js`.
- Grist autorisé : copie `j1jDArBkzi7P` uniquement. Production `3pnVrygfNn7c` interdite.
- Web App PUBLIC : `https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec`.
- Déploiement ADMIN : `AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA`.
- Routes : `pfmp`, `suivi-pfmp`, `import-pronote-pfmp`, `gestion-pfmp`, `entreprises` ; routeur EDT historique conservé.
- Modes exigés : soumissions `DRY_RUN`, courriels `DISABLED`, import Pronote `DRY_RUN`, mutations administratives `DRY_RUN`, Turnstile désactivé. Le snapshot distant déclare actuellement `ANYONE_ANONYMOUS`, en contradiction avec l'exigence historique `DOMAIN` ; aucune correction ou redéploiement n'a encore été effectué.
- Actif : formulaire PFMP, recherche entreprise, suivi paginé et multiannuel, import Pronote en prévisualisation, gestion administrative consultable.
- Préparé mais désactivé : import réel, mutations de convention, annulation, affectations, courriels et ordres de mission.
- Tables PFMP principales : `EUC_OFFRES_FORMATION`, `EUC_OFFRES_PERIODES`, `EUC_ELEVES_PFMP`, `EUC_SOUMISSIONS_PFMP`, `EUC_SYNTHESE_SUIVI_PFMP`, `EUC_UTILISATEURS_PFMP`, `EUC_IMPORTS_PRONOTE_PFMP`, `EUC_HISTORIQUE_SOUMISSIONS_PFMP`, `EUC_PERSONNELS_PFMP`, `EUC_AFFECTATIONS_PFMP`.
- Tests de récupération : `node tests/run-dev416-recovery-tests.js`.
- Tests historiques : conservés, mais encore liés à dev.8/dev.27 et non entièrement compatibles avec le snapshot DEV416.
- Blocages connus avant déploiement : arbitrer `DOMAIN` contre `ANYONE_ANONYMOUS`, remettre la cible de recette en cohérence avec `j1jDArBkzi7P`, puis migrer les tests historiques sans les affaiblir.
- Reprise exacte : préparer DEV417 à partir de cette branche récupérée, en commençant par les corrections d'affichage et les tests ciblés, sans activer les mutations.

## DEV417 en préparation locale — 2 octobre 2026

- Les interfaces apprentis ADMIN et PUBLIC rejettent désormais les réponses de chargement obsolètes lorsqu'une autre classe ou année a été sélectionnée entre-temps. Cela supprime la course qui pouvait laisser une liste vide ou afficher la mauvaise réponse jusqu'à actualisation.
- La bulle des compteurs apprentis est maintenant interactive : maintien au passage du pointeur, délai de fermeture élargi, navigation clavier, roulette et barre de défilement stables, confinement du défilement pour les listes longues.
- Le détail de classe commun ADMIN/PUBLIC conserve exactement dix colonnes ordonnées. Les compteurs `Apprenti`, `Avec convention` et `Sans convention` exposent une liste triée et défilable des élèves concernés.
- La garde de cible active `EUC_ENT_DOC_ID_RECETTE_AUTORISE` a été réalignée sur la seule copie autorisée `j1jDArBkzi7P`.
- Le secret HMAC trouvé dans les sources a été retiré du code et remplacé par la propriété privée `EUC_DEV270B_HMAC_SECRET`. Avant déploiement, il faut faire tourner ce secret de façon coordonnée dans la passerelle d'authentification et le projet PFMP ; aucune valeur ne doit transiter par Git ou les journaux.
- Test ciblé : `node tests/run-dev417-ui-tests.js` vert. Les scripts HTML modifiés passent le contrôle syntaxique V8 local.
- La suite historique sait maintenant résoudre les fichiers `.gs` récupérés en `.js` sans supprimer d'assertion. Elle met toutefois en évidence plusieurs attentes devenues obsolètes (versions dev.8/dev.27, ancien manifeste `DOMAIN`, anciens artefacts absents et routeur incomplet en isolation) ; elle n'est pas encore verte et n'autorise donc aucun push Apps Script.
- Diagnostic `1MELEC2` : le moteur d'import est incrémental (création des absents, mise à jour des champs élève réellement modifiés, présence seule pour les autres) et ne modifie pas les tables conventions/apprentissage. La lecture anonyme de `EUC_CORRESPONDANCE_CLASSES_PRONOTE` sur la recette a répondu `403` ; il reste à contrôler, avec un accès privé limité à `j1jDArBkzi7P`, si la ligne est absente, inactive ou `Exclure_import=true`.
- Aucun accès production, aucune écriture Grist, aucun import, aucun `clasp push`, aucune version ni aucun déploiement n'a été effectué dans DEV417.

## Complément DEV417 — rentrée et apprentissage

- Le centre d’administration expose à nouveau un accès visible aux correspondances et exclusions de classes Pronote.
- La page Pronote peut lister directement, en lecture seule, les correspondances mémorisées par année et source, sans charger ni importer un fichier.
- Les inscriptions annuelles d’un même jeune sont désormais rapprochées par identifiants stables pour la lecture des épisodes d’apprentissage. L’inscription historique reste inchangée ; la nouvelle inscription annuelle retrouve les contrats antérieurs pertinents.
- La date de rupture borne réellement l’épisode : avant rupture `APPRENTI`, après rupture `SCOLAIRE`, chevauchement `MIXTE`. Un nouveau contrat crée un nouvel épisode et rétablit `APPRENTI` à partir de sa date d’effet.
- Tests ciblés verts : `node tests/run-dev417-ui-tests.js` et `node tests/run-dev417-schoolyear-tests.js`.
- Le déploiement reste bloqué tant que le secret privé `EUC_DEV270B_HMAC_SECRET` n’est pas installé de façon coordonnée dans la passerelle et PFMP et que la suite historique complète n’est pas migrée vers DEV416/DEV417.
