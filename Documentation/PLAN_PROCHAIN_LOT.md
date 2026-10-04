## Après DEV442 — recettes contrôlées et optimisations séparées

1. Modèle : après modification du Google Docs par l’utilisateur, conserver les neuf marqueurs de fusion puis générer un ordre de mission réel. Le validateur doit refuser clairement un modèle incomplet avant toute copie ou envoi.
2. Courriel : effectuer un premier envoi réel seulement sur action ADMIN explicitement confirmée, après contrôle du destinataire, du texte, de la pièce jointe et du nom de signature. Aucun test automatique ne doit envoyer de message.
3. Performance missions : la génération réelle DEV442 est fonctionnelle mais mesurée à `34,8 s`. Profiler séparément copie Google Docs, insertion de section paysage et export PDF ; ne pas dégrader le chemin rapide des pages de suivi.
4. Recette PP : générer volontairement un premier code sur une classe/période choisie, vérifier son expiration au dernier jour et les seules affectations téléphone/visite. Aucun code n’a encore été créé.
5. Recette géocodage : lancer depuis l’administration un petit lot France, contrôler les scores et valider manuellement les résultats ambigus. Monaco et les autres pays restent hors traitement automatique.

## Après DEV441 — contrôles et optimisations séparés

1. Recette PP : générer volontairement un premier code sur une classe/période de test métier, vérifier l’expiration au dernier jour, l’affectation téléphone/visite et la reconstruction atomique du snapshot. Aucun code n’a été créé pendant DEV441.
2. Recette géocodage : lancer depuis l’administration un petit lot France, contrôler les scores et valider manuellement les résultats ambigus. Monaco et les autres pays restent hors traitement automatique.
3. Recherche SIRET : effectuer une recherche explicite sur une fiche apprenti autorisée et vérifier la voie avant l’enregistrement. Le test automatique couvre la régression, mais la recette n’a pas cliqué sur le bouton car le parcours actuel autosauvegarde la fiche.
4. Performance missions : la génération PDF finale mesurée est `10,2 s`, mais la préparation initiale des groupes après chargement complet reste sensiblement plus longue. Profiler séparément cette préparation sans modifier le modèle, les coordonnées hors connexion ni le chemin rapide des pages de suivi.
5. Cartographie : compléter progressivement la table de coordonnées validées, puis contrôler la carte classe/période et le tableau global avec des points réels. Ne jamais géocoder en série sur le chemin d’affichage.

## DEV424 R1 — snapshot partagé actif, surveillance du premier cycle

DEV424 R1 est déployée en version immuable `748`. Le déclencheur `EUC_DEV424_refreshScheduled` est installé toutes les 15 minutes et limité à la base active autorisée `b2CyeMEdVEMS`. La première reconstruction complète a duré environ 29 secondes en tâche de fond. Les parcours contrôlés sont revenus dans la fenêtre de 3 à 4 secondes : PUBLIC accueil `3,23 s`, famille BAC PRO `3,71 s`, détail TMVA2 environ `3,6 s`; ADMIN détail TCAR `3,91 s`.

Ordre de suivi :

1. vérifier dans l’historique Apps Script le premier cycle réellement lancé par le déclencheur, sa durée et l’absence d’erreur, sans journaliser de donnée nominative ;
2. mesurer le lendemain un vrai premier accès depuis un autre appareil sur PUBLIC, ADMIN et apprentis, sans confondre cache navigateur et snapshot partagé ;
3. surveiller le quota d’exécution et conserver un seul déclencheur `EUC_DEV424_refreshScheduled` ;
4. invalider ou reconstruire de façon ciblée après les seules mutations déjà autorisées, sans remettre de calcul global dans le chemin de consultation ;
5. reprendre ensuite les ordres de mission et le document d’organisation/bilan des déplacements, sans courriel ni création documentaire avant nouvelle autorisation explicite.

## Historique DEV422 — validation réelle et mesures froides avant conclusion

Le correctif DEV422 réunit les compteurs de cartes, les listes d’infobulle et les détails de classe sur les mêmes snapshots détaillés persistants. Le survol ne lance plus de calcul serveur et le voile plein écran est retiré. La validation finale doit mesurer séparément le premier passage et les passages répétés, sans présenter un résultat réchauffé comme une performance froide.

Ordre de validation :

1. vérifier PUBLIC et ADMIN sur TCAR, TCIEL et TCL : cartes, infobulles, ouverture de période et retour aux classes ;
2. mesurer accueil, famille, détail et retour, en distinguant temps HTTP Apps Script et temps visible dans le wrapper ;
3. vérifier que toutes les navigations PUBLIC restent sous `pfmp.loucodi.fr` et n’exposent pas l’URL Apps Script ;
4. contrôler les deux vues apprentis principales sans mutation ;
5. ne proposer l’activation d’un rafraîchissement périodique qu’après ces mesures, avec autorisation explicite, quotas et mécanisme d’arrêt documentés.

## DEV423 — priorité absolue : snapshot enrichi partagé

DEV423 R3 est déployée en version immuable `747`. Les compteurs sont cohérents, les contrôles rapides sont préchargés, le détail conserve les coordonnées, un seul fil d’Ariane reste visible et la navigation rapide reste sous le sous-domaine. Le changement de période mesuré après amorçage prend `149 ms` côté serveur et `3 336 ms` au total. En revanche, la famille BAC PRO à froid reste entre environ 22 et 34 secondes : le chemin de consultation reconstruit encore toutes les périodes depuis plusieurs tables Grist.

Ordre proposé, soumis à autorisation avant toute écriture ou activation :

1. choisir formellement la base de recette autorisée pour le snapshot, sans jamais utiliser `3pnVrygfNn7c` ;
2. construire hors consultation un snapshot enrichi versionné contenant les cartes et contrôles rapides déjà cohérents ;
3. déclencher sa mise à jour après les mutations autorisées, puis proposer un déclencheur périodique borné comme filet de sécurité ;
4. conserver le dernier snapshot valide en cas d’échec, journaliser uniquement les durées et rendre le déclencheur désactivable ;
5. mesurer ensuite les vrais premiers accès sur un autre appareil pour PUBLIC, ADMIN et apprentis, avec une cible de 2 à 3 secondes et un plafond de 4 secondes.

Tant que cette autorisation n’est pas donnée, ne pas activer de déclencheur, ne pas écrire de snapshot supplémentaire et ne pas présenter la performance réchauffée comme la performance froide.

## Historique DEV421 R2 — performance et automatisation contrôlée

DEV421 R2 est déployée en version immuable `737` sur les déploiements ADMIN et PUBLIC existants. La grille de classes et la navigation utilisent maintenant le snapshot persistant comme source première, avec un cache de cinq minutes invalidé lors des mises à jour connues. Les temps mesurés à chaud sont de `3,86 s` pour BAC PRO et `3,74–3,90 s` pour le détail TCAR.

Ordre proposé pour le prochain lot :

1. mesurer le premier accès après expiration du cache sur TCAR, TCIEL et TCL, en séparant lecture Grist, rendu Apps Script et affichage dans le wrapper ;
2. préparer un rafraîchissement ciblé du snapshot après chaque mutation autorisée, sans recalcul global dans le chemin de consultation ;
3. proposer, sans l’activer, un déclencheur périodique borné qui met à jour uniquement les familles et périodes modifiées, journalise seulement les durées et conserve le dernier snapshot valide en cas d’échec ;
4. soumettre l’activation de ce déclencheur à une autorisation explicite et documenter sa fréquence, son quota Apps Script et son mécanisme d’arrêt ;
5. poursuivre ensuite les ordres de mission et le document d’organisation/bilan des déplacements, sans courriel ni création documentaire avant nouvelle autorisation.

## Historique DEV419 — performance et situations administratives

DEV419 R1 est déployée en version immuable `733` sur les déploiements ADMIN et PUBLIC existants. Le retrait de Snapshot des vues publiques, les indicateurs de navigation, la coque persistante du détail et les réparations de préchauffage/cache sont actifs.

Ordre proposé pour le prochain lot :

1. remplacer les instantanés volumineux stockés dans `PropertiesService` par un cache borné ; préparer séparément la liste exacte des anciennes clés, leur sauvegarde et une purge soumise à autorisation explicite ;
2. réduire le temps perçu froid du détail classe, encore pénalisé par la navigation et la création du bac à sable Apps Script malgré un calcul serveur mesuré à `3307 ms` ;
3. privilégier une coque publique persistante avec chargement asynchrone du détail et squelette immédiat, afin de ne plus reconstruire toute la page et ses iframes à chaque classe ;
4. mesurer séparément temps serveur, première peinture, tableau visible et interaction possible sur TCAR, TCIEL et une classe sans apprenti ;
5. conserver les contrôles de cohérence `effectif = apprentis + conventions + sans convention`, la navigation sous `pfmp.loucodi.fr` et le parcours authentifié sous `alternance.loucodi.fr` ;
6. ne traiter HTTPS des sous-domaines qu’au niveau hébergement/DNS, sans contourner les avertissements du navigateur.

Le sous-domaine administratif `alternance.loucodi.fr` reste une redirection vers la passerelle d’authentification ; conserver une URL longue après authentification est le comportement retenu. Ne pas transformer l’administration en iframe sans décision explicite, car l’authentification Google peut être affectée.

## DEV420 R2 déployée — situation administrative des élèves sans convention

L’autorisation explicite a été reçue et le lot est déployé en version immuable `735`. Le référentiel administrable et la table d’affectation annuelle par élève, classe et période sont installés dans la seule base active `b2CyeMEdVEMS`.

Les trois motifs initiaux sont créés et excluants. La vue administrative `Élèves sans convention` porte la saisie ; les vues classe, famille et contrôle rapide affichent le motif et conservent les compteurs cohérents. Aucun élève n’a été affecté automatiquement.

Prochaine reprise fonctionnelle : finaliser les ordres de mission et concevoir le document d’organisation/bilan des déplacements. Ce chantier reste hors de DEV420 et ne doit provoquer aucun courriel ni création de document sans nouvelle autorisation explicite.

## Historique du plan DEV417

DEV417 est préparé localement depuis le snapshot DEV416 : chargeur apprentis protégé contre les réponses obsolètes, bulle longue interactive, listes des compteurs du détail ADMIN/PUBLIC, alignement commun des dix colonnes, consultation directe des correspondances Pronote et continuité annuelle des épisodes d’apprentissage. Prochaines étapes obligatoires avant déploiement :

1. installer `EUC_DEV270B_HMAC_SECRET` simultanément dans les propriétés privées de la passerelle et du projet PFMP ;
2. pousser puis relire le distant, créer la version immuable DEV417 et mettre à jour les deux déploiements existants sans changer leurs URL ;
3. lire uniquement la correspondance `1MELEC2` dans la base PFMP active `b2CyeMEdVEMS`, sans import réel ni écriture ;
4. tester visuellement TMP3D et TMVA2 en recette, puis mesurer le détail classe et le générateur de conventions.

Décisions acquises : suite complète verte (319 tests) et maintien de `ANYONE_ANONYMOUS` pour le Web App unique qui sert aussi les pages publiques ; l’administration reste protégée par l’authentification applicative.
## Après DEV435 — annuaire entreprises et cartographie (lot séparé)

État factuel après DEV438 : ce lot n’a pas commencé dans l’application déployée. Il n’existe actuellement ni bouton de carte dans le détail d’une période, ni tableau de bord cartographique ADMIN/PUBLIC, ni colonnes de latitude/longitude ou cache de géocodage. Les adresses d’entreprise nécessaires sont disponibles dans les détails de convention, mais elles ne doivent pas être envoyées à un service tiers sur le chemin d’affichage.

1. Créer d'abord un book entreprises ADMIN strictement en lecture seule, dérivé des conventions et snapshots existants, avec filtres année, famille, niveau, classe et période. Regrouper prioritairement par SIRET ; à défaut, utiliser une identité normalisée raison sociale + adresse et signaler les doublons incertains.
2. Prévoir une fiche entreprise en vignette avec coordonnées, classes/périodes associées et historique d'accueil. Cette première phase ne doit ni créer ni modifier la future base partenaires.
3. Soumettre ensuite les règles de rapprochement avec les autres listes Grist : priorité des sources, fusion des doublons, conservation de l'historique et champs que l'administration pourra corriger. Ce rapprochement constitue une décision métier structurante et un lot d'écriture distinct.
4. Pour les cartes, créer un cache de géocodage séparé et réutilisable. Le choix du fournisseur, les quotas, la précision diffusée et la gestion des adresses personnelles ou ambiguës doivent être validés avant tout appel externe.
5. Une fois ces choix acquis, proposer deux vues : carte filtrable des partenaires du lycée et carte des lieux de stage pour une classe/période. Les cartes consultent les coordonnées déjà géocodées et ne doivent jamais géocoder en série sur le chemin d'affichage.
6. Conserver comme contrainte de recette les temps actuels de DEV434/DEV435 : les nouvelles fonctions seront accessibles depuis des pages ADMIN dédiées et ne devront ajouter aucun travail aux grilles et détails existants.
7. Dans le détail d’une classe/période, ajouter un bouton `Carte des lieux de stage` qui transmet uniquement les identifiants du filtre à une page cartographique dédiée ; aucun moteur de carte ne doit être chargé dans le tableau des élèves.
8. Ajouter une vue globale accessible en consultation et en administration, avec filtres année, famille, niveau, classe et période. La précision publique des points et les coordonnées visibles devront être décidées avant ouverture de cette vue.

## Après DEV436 — accès professeur principal (lot de sécurité séparé)

1. Ajouter une table d'autorisations liée à l'année, la classe et le professeur principal, sans modifier les droits du Web App public.
2. Générer depuis l'administration un code aléatoire à usage limité ; ne stocker que son empreinte et permettre sa révocation. Aucun courriel automatique n'est prévu.
3. Après validation, créer une session courte strictement limitée à la classe et aux actions d'affectation `TELEPHONE` et `VISITE` ; refuser toute mutation d'élève, convention, situation ou paramétrage.
4. Ne charger le formulaire d'affectation et l'annuaire filtré qu'après ouverture volontaire de l'accès professeur principal. Le chemin de consultation ordinaire doit rester identique et sans appel supplémentaire.
5. Journaliser l'auteur, la classe, le type d'affectation et l'heure, sans consigner le code ni une liste nominative dans les journaux techniques.
