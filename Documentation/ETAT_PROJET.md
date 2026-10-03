# État du projet Eucalyptus PFMP

- Version active déployée le 3 octobre 2026 : DEV424 R1, version Apps Script immuable `748`.
- Version locale récupérée : copie exacte de la version Apps Script immuable `722`, soit 343 fichiers dans `apps-script/`.
- Déploiements ADMIN et PUBLIC : tous deux positionnés sur `748`, avec leurs identifiants et URL historiques conservés.
- Référence Git de récupération : branche `codex/recover-dev416`, créée depuis `main` au commit `e5377d3`.
- Preuve d'identité : `Documentation/snapshots/apps-script-v722.sha256` et `node tests/run-dev416-recovery-tests.js`.
- Grist autorisé : base PFMP active `b2CyeMEdVEMS` uniquement. L’écriture des structures et affectations de situations administratives DEV420, puis des snapshots DEV424, a été autorisée explicitement le 3 octobre 2026 ; la production `3pnVrygfNn7c` reste interdite.
- Web App PUBLIC : `https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec`.
- Déploiement ADMIN : `AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA`.
- Routes : `pfmp`, `suivi-pfmp`, `import-pronote-pfmp`, `gestion-pfmp`, `entreprises` ; routeur EDT historique conservé.
- Modes exigés : soumissions `DRY_RUN`, courriels `DISABLED`, import Pronote `DRY_RUN`, mutations administratives `DRY_RUN`, Turnstile désactivé. Le snapshot distant déclare actuellement `ANYONE_ANONYMOUS`, en contradiction avec l'exigence historique `DOMAIN` ; aucune correction ou redéploiement n'a encore été effectué.
- Actif : formulaire PFMP, recherche entreprise, suivi paginé et multiannuel, import Pronote en prévisualisation, gestion administrative consultable.
- Préparé mais désactivé : import réel, mutations de convention, annulation, affectations, courriels et ordres de mission.
- Tables PFMP principales : `EUC_OFFRES_FORMATION`, `EUC_OFFRES_PERIODES`, `EUC_ELEVES_PFMP`, `EUC_SOUMISSIONS_PFMP`, `EUC_SYNTHESE_SUIVI_PFMP`, `EUC_UTILISATEURS_PFMP`, `EUC_IMPORTS_PRONOTE_PFMP`, `EUC_HISTORIQUE_SOUMISSIONS_PFMP`, `EUC_PERSONNELS_PFMP`, `EUC_AFFECTATIONS_PFMP`, `EUC_STATUTS_SUIVI_ELEVE_PFMP`, `EUC_SITUATIONS_ELEVES_PFMP`.
- Tests de récupération : `node tests/run-dev416-recovery-tests.js`.
- Tests historiques : migrés vers l’état DEV416/DEV417 sans suppression de contrôle ; suite complète verte (336 tests).
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

## DEV418 R6 déployée — 3 octobre 2026

- La version Apps Script immuable `730` est appliquée aux deux seuls déploiements historiques : PUBLIC `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg` et ADMIN `AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA`.
- Les compteurs apprentis ADMIN/PUBLIC ont une source unique : les anciennes réponses asynchrones ne peuvent plus écraser les valeurs réelles par des zéros. Contrôle PUBLIC : 18 apprentis au total ; TCAR : 19 élèves chargés et 3 apprentis.
- La liste détaillée PFMP utilise une largeur de travail accrue, réserve davantage d’espace à l’adresse entreprise et affiche contact et tuteur sur trois lignes : nom, téléphone, courriel.
- Le détail classe lit le snapshot avec un filtre année/classe/période, ne rejoue plus deux enrichissements déjà effectués et mutualise la lecture des épisodes apprentis. Mesure du profileur ADMIN : `3307 ms`, contre `12162 ms` et `15111 ms` avant correction.
- La navigation publique réelle a été vérifiée depuis `http://pfmp.loucodi.fr/` : accueil, BAC PRO puis TCAR restent sous le sous-domaine. Le dépôt de point d’accès `preventionpaca/pfmp-public` est publié au commit `879d36a` ; le wrapper de référence du dépôt PFMP est publié sur `main` au commit `67d07ce`.
- Les données de contrôle sont cohérentes : TCAR `19 / 3 / 16 / 0` et TCIEL `26 / 1 / 24 / 1` pour effectif, apprentis, conventions et sans convention.
- Le temps de calcul serveur est désormais dans la cible de 3 à 4 secondes. Le temps perçu complet peut rester supérieur lors d’un chargement froid à cause de la création des iframes et du bac à sable Google Apps Script ; ce reliquat devient le premier chantier du prochain lot.
- Suite complète finale verte : `node tests/run-tests.js`, 319 tests. Aucun accès à `3pnVrygfNn7c`, aucune écriture Grist, aucun import Pronote, aucun courriel et aucune mutation métier n’ont été exécutés.
- L’audit initial du parcours `alternance.loucodi.fr` a isolé un défaut de secret partagé. Un diagnostic limité à des codes non sensibles a été ajouté en version `731`, sans jamais rendre l’erreur brute, le courriel ou le jeton.

## DEV418 R8 déployée — passerelle administrative rétablie

- La version Apps Script immuable `732` est appliquée aux deux seuls déploiements historiques ADMIN et PUBLIC, avec leurs URL inchangées. Le distant Apps Script a été relu : 343 fichiers identiques aux sources locales.
- Le projet PFMP ne pouvait pas recevoir une propriété supplémentaire : son magasin de propriétés contient déjà de volumineux instantanés de cache. Aucun cache ni aucune propriété n’a été supprimé sans autorisation.
- Le secret d’authentification est désormais dérivé par HMAC-SHA256, avec le domaine dédié `EUC_DEV270B_AUTH_V1`, depuis une propriété privée PFMP existante. La passerelle ne conserve que la valeur dérivée ; aucun secret n’est présent dans Git ou dans les journaux.
- Parcours réel vérifié : `alternance.loucodi.fr` reconnaît le compte, ouvre le centre d’administration puis la gestion des apprentis sans retour à l’écran de connexion. Compteurs contrôlés en lecture seule : 18 apprentis, 18 dossiers remis, 18 transmis CFA, 18 contrats valides et 0 rupture.
- Dette technique identifiée : les instantanés de performance et les lignes d’accès ne doivent plus être stockés durablement dans `PropertiesService`. Leur migration vers un cache borné, puis la purge contrôlée des anciennes clés, nécessitera un lot séparé et une autorisation explicite avant toute suppression.

## DEV419 R1 déployée — navigation et maintenance publique

- La commande de maintenance Snapshot a été retirée du détail de classe partagé et des vues publiques apprentis/PFMP. Les anciennes occurrences sont en plus masquées par la garde publique ; les accès administratifs de maintenance utilisent désormais l’URL ADMIN explicite.
- Chaque changement de classe, période ou retour à la liste déclenche un indicateur de chargement visible. La navigation rapide réactive correctement le contrôle après réception des données.
- En mode PUBLIC, le détail classe réutilise maintenant la coque déjà affichée au lieu de reconstruire l’iframe Apps Script. La navigation reste sous `pfmp.loucodi.fr`.
- Deux causes de lenteur ont été corrigées : le préchauffage de la liste appelait par erreur une lecture sur la classe `0`, et le détail rapide comme le contrôle rapide ignoraient le cache final déjà enrichi.
- Les bulles de contrôle rapide restent ouvertes lorsque le pointeur entre dans leur contenu ; leurs listes longues peuvent donc être parcourues sans disparition de la bulle.
- Le compteur `Annulées / interrompues` est recalculé depuis les lignes effectivement rendues dans le détail de classe.
- Le besoin de statuts administratifs extensibles pour les élèves sans convention (`Dossier géré par avis scolaire`, `Démissionnaire`, `Absentéiste`, etc.) est spécifié mais non implémenté : il nécessite de nouvelles tables et des écritures dans Grist, non autorisées à ce stade.
- Les 343 fichiers distants ont été relus après `clasp push` et sont identiques aux sources locales. La version immuable `733` a été appliquée aux deux seuls déploiements historiques ADMIN et PUBLIC ; contrôles HTTP directs à `200`.
- Aucun accès à la production, aucune écriture Grist, aucun import, aucun courriel et aucune mutation métier n’ont été effectués. Le certificat HTTPS de `pfmp.loucodi.fr` reste invalide pour ce nom ; le point d’accès HTTP répond à `200`, sans contournement du contrôle TLS.

## DEV420 R2 déployée — situations administratives des élèves

- L’utilisateur a autorisé explicitement l’écriture limitée dans la base PFMP active `b2CyeMEdVEMS`. Deux tables ont été créées de façon idempotente : le référentiel `EUC_STATUTS_SUIVI_ELEVE_PFMP` et les affectations annuelles par classe, période et élève `EUC_SITUATIONS_ELEVES_PFMP`.
- Trois motifs initiaux actifs et excluants ont été créés : `Dossier géré par avis scolaire`, `Démissionnaire` et `Absentéiste`. Aucune affectation élève n’a été créée automatiquement.
- La page administrative « Élèves sans convention » permet d’affecter ou retirer logiquement une situation, d’ajouter un motif et de désactiver/réactiver un motif sans suppression physique. Une situation n’est enregistrable que pour un élève encore sans convention, non apprenti et sans convention annulée/interrompue.
- Le détail classe, les compteurs de famille et le contrôle rapide affichent les situations et retirent uniquement les motifs configurés comme excluants du compteur `Sans convention`. Un motif désactivé reste visible sur ses affectations historiques mais n’est plus proposé pour une nouvelle affectation.
- Version Apps Script immuable `735`, appliquée aux seuls déploiements ADMIN et PUBLIC existants. Le distant relu contient exactement les 344 fichiers locaux ; les contrôles HTTP directs ADMIN et PUBLIC répondent à `200`.
- Tests verts : `node tests/run-dev420-situations-tests.js` (14 tests) et suite complète `node tests/run-tests.js` (333 tests).
- Protections confirmées : aucun accès production, aucun import Pronote réel, aucune écriture de convention, aucun courriel, aucun ordre de mission, aucune activation LIVE/ENABLED et aucun nouveau Web App.

## DEV421 R2 déployée — affichage apprentis et lecture snapshot directe

- Le nom du responsable de l’entreprise est maintenant transporté, affiché et sauvegardé avec le téléphone et le courriel dans les cartes apprentis ADMIN et PUBLIC. Lors de la première sauvegarde concernée, la colonne `Responsable_nom` est créée uniquement si elle manque.
- Le tableau de détail classe ADMIN/PUBLIC aligne à nouveau l’élève sous l’en-tête `Élève`; la cellule de sélection vide est masquée en lecture seule. Le compteur `Annulées / interrompues` ouvre aussi sa liste, y compris lorsque le total vaut zéro.
- La grille des classes lit directement le payload persistant `EUC_SUIVI_PFMP_INDEX`, sans rejouer les enrichissements apprentissage/P.dif. sur le chemin d’affichage. Le résultat est conservé cinq minutes dans `CacheService`; une synchronisation du snapshot ou une modification de situation administrative invalide explicitement cette entrée.
- Les préchauffages concurrents de détail ont été supprimés. Le contrôle rapide reste ouvert lorsque le pointeur entre dans la bulle et ne se repositionne plus après réception des données, ce qui supprime le clignotement observé.
- Mesures HTTP PUBLIC après déploiement : accueil familles `3,43 s`; grille BAC PRO `6,98 s` à froid puis `3,86 s` avec snapshot en cache; détail TCAR `3,74–3,90 s` après amorçage. La cible de 3 à 4 secondes est atteinte sur la navigation courante; le premier accès après expiration du cache reste le prochain levier d’optimisation.
- Version Apps Script immuable `737`, appliquée aux seuls déploiements ADMIN et PUBLIC existants. Après `clasp push`, les 344 fichiers distants ont été relus et comparés sans divergence.
- Tests verts : suite complète `node tests/run-tests.js` (334 tests), contrôles ciblés DEV417 et DEV420, puis contrôles visuels en lecture seule du détail TCAR et du champ responsable entreprise. Aucune écriture Grist, aucun import, aucun courriel, aucun ordre de mission, aucun déclencheur et aucun nouveau Web App n’ont été exécutés pendant ce lot.
- Snapshot : il est confirmé comme le principal levier de performance. La consultation doit servir le snapshot immédiatement; sa reconstruction doit rester séparée. Aucun déclencheur périodique n’est activé dans DEV421. Une automatisation future devra être bornée, observable et invalidée après les seules mutations autorisées.

## DEV422 — correction différentielle des compteurs et du chemin froid

- La régression des cartes à `0 / effectif` provenait de l’index de famille persistant, incomplet ou périmé, alors que la bulle et le détail relisaient une autre source détaillée correcte. La grille réconcilie désormais ses cartes avec les snapshots détaillés actifs de l’année, chargés en une seule requête groupée.
- Cartes et contrôles rapides partagent désormais exactement le même calcul. Les listes de l’infobulle sont préparées avec la page : aucun appel serveur ni enrichissement Grist n’est déclenché par le survol.
- Les apprentis, situations administratives et conventions annulées/interrompues sont isolés avant le calcul `Sans convention`, afin d’éviter les doubles comptes.
- Le voile plein écran `Chargement des donnees...` est supprimé. Seul le contrôle effectivement cliqué affiche un petit indicateur rotatif.
- Le wrapper PUBLIC conserve explicitement `wrapper=1` à chaque navigation interne ; l’année est restaurée lorsqu’un lien historique l’omet. Le retour aux classes privilégie l’année de l’URL active.
- Après une synchronisation autorisée d’un snapshot détaillé, les caches de famille et de contrôle rapide correspondants sont invalidés. Le flux de maintenance préparé reconstruit aussi l’index persistant de famille ; aucun déclencheur n’est activé par ce lot.
- Tests locaux verts : `node tests/run-tests.js` (335 tests), dont un scénario DEV422 reproduisant TCIEL avec 24 conventions, 1 apprenti et 1 sans convention sur 26 élèves.
- Aucun accès à la production, aucune écriture Grist, aucun import, aucun courriel, aucun ordre de mission et aucune activation LIVE/ENABLED n’ont été exécutés pendant la préparation du lot.

## DEV423 R3 déployée — cohérence, navigation et mesure froide

- Les cartes de famille, les contrôles rapides et les détails de classe reposent sur le même détail enrichi. Contrôle réel TCIEL PFMP n°1 : `24 conventions + 1 apprenti + 1 sans convention` sur 26 élèves ; TCAR PFMP n°1 : `16 conventions + 3 apprentis`, aucun sans convention.
- Le survol de contrôle rapide ne déclenche plus d’appel serveur : les listes sont incluses dans la réponse de famille. Le voile plein écran a été retiré et seul l’élément cliqué porte un indicateur rotatif.
- Le détail préchargé conserve désormais toutes les informations de convention, notamment entreprise, adresse, responsable, téléphone, courriel et tuteur. Un test de non-régression couvre explicitement ce point.
- La navigation rapide ne tente plus de pousser une URL Apps Script absolue dans l’historique de l’iframe `googleusercontent`. Le changement TCIEL PFMP n°1 vers PFMP n°2 reste sous `pfmp.loucodi.fr` ; mesure navigateur : `149 ms` serveur et `3 336 ms` au total.
- Les anciens fils d’Ariane superposés sont masqués ; un seul chemin de navigation est recalculé après le changement rapide de période.
- Mesure froide différentielle : la famille BAC PRO n’était pas encore visible après environ 22 secondes et l’était avant 34 secondes. Cette valeur, très au-dessus de la cible, provient de la reconstruction synchrone de toutes les classes/périodes à partir de plusieurs lectures Grist successives. Le cache Apps Script partagé ramène ensuite la famille et le détail dans une fenêtre contrôlée inférieure à environ 6 secondes, mais il expire au bout de cinq minutes et ne constitue donc pas la solution du premier accès quotidien.
- Conclusion de performance : atteindre durablement 2 à 3 secondes à froid exige de servir un snapshot enrichi déjà construit, commun à tous les appareils, et de le rafraîchir hors du chemin de consultation. Le code de maintenance existe, mais aucun déclencheur n’a été activé : son activation et les écritures de snapshot doivent faire l’objet d’une autorisation explicite et d’un choix de cible conforme aux règles de recette.
- Version Apps Script immuable `747`, appliquée aux seuls déploiements PUBLIC et ADMIN existants. Après `clasp push`, les 344 fichiers ont été relus : aucune divergence avec les sources locales.
- Suite complète verte : `node tests/run-tests.js`, 335 tests. Aucun accès à `3pnVrygfNn7c`, aucun import Pronote, aucune écriture élève/convention, aucun courriel, aucun ordre de mission, aucune activation LIVE/ENABLED et aucun nouveau Web App.

## DEV424 R1 déployée — snapshots enrichis planifiés

- Les consultations famille et détail servent désormais en priorité un snapshot enrichi partagé déjà construit. Les lectures multi-tables Grist, jointures des élèves, conventions, apprentis, situations et affectations ne sont plus rejouées dans le chemin du premier utilisateur.
- Le rafraîchissement `EUC_DEV424_refreshScheduled` est installé comme unique déclencheur temporel toutes les 15 minutes. Il est verrouillé, observable, strictement limité à `b2CyeMEdVEMS`, conserve le dernier snapshot valide en cas d’échec et n’écrit que les snapshots modifiés.
- La première reconstruction complète manuelle a abouti en environ 29 secondes en tâche de fond, sans erreur. Ce coût est désormais payé hors navigation et partagé entre les appareils.
- Mesures visibles après alimentation : accueil PUBLIC `3 229 ms`, grille BAC PRO PUBLIC `3 710 ms`, retour aux classes PUBLIC environ `3,4 s`, détail TMVA2 PUBLIC environ `3,6 s`, détail TCAR ADMIN `3 906 ms`. La cible de 3 à 4 secondes est atteinte sur les parcours contrôlés.
- Données contrôlées : TCAR `19 / 3 / 16 / 0 / 0` et TMVA2 `25 / 5 / 18 / 2 / 0` pour effectif, apprentis, avec convention, sans convention et annulées/interrompues. Les cartes, le détail et les contrôles rapides lisent les mêmes données persistées.
- La navigation PUBLIC reste sous `pfmp.loucodi.fr`; le détail et le retour ne font pas sortir l’utilisateur vers l’URL Apps Script visible. Le parcours ADMIN conserve volontairement son URL authentifiée Apps Script historique.
- Version Apps Script immuable `748`, appliquée aux deux seuls déploiements historiques ADMIN et PUBLIC. Après `clasp push`, les sources distantes ont été relues et comparées sans divergence avec `apps-script/`.
- Tests verts : `node tests/run-dev424-snapshot-trigger-tests.js` et suite complète `node tests/run-tests.js` (336 tests). Commit applicatif poussé : `078d7e1`.
- Protections confirmées : aucun accès à `3pnVrygfNn7c`, aucun import Pronote réel, aucune écriture élève/convention, aucun courriel, aucun ordre de mission, aucune activation LIVE/ENABLED et aucun nouveau Web App.
