## DEV419 R1 déployée — prochain lot performance et situations administratives

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
