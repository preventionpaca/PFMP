## DEV422 — validation réelle et mesures froides avant conclusion

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
