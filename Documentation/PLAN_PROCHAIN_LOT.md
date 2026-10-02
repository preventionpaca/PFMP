## Validation et déploiement DEV418 autorisés

1. `b2CyeMEdVEMS` est confirmée comme base PFMP active et sa consultation en lecture seule est explicitement autorisée ;
2. valider en lecture seule les tables et références nécessaires, sans import ni écriture ;
3. créer la version immuable DEV418 et mettre à jour les deux déploiements existants après tests verts et relecture distante.

Correctifs DEV418 déjà préparés localement : alignement du tableau PUBLIC, maintien dans les sous-domaines, navigation publique rapide en lecture seule, cohérence des infobulles apprentis et résolution offre-vers-classe.

## Historique du plan DEV417

DEV417 est préparé localement depuis le snapshot DEV416 : chargeur apprentis protégé contre les réponses obsolètes, bulle longue interactive, listes des compteurs du détail ADMIN/PUBLIC, alignement commun des dix colonnes, consultation directe des correspondances Pronote et continuité annuelle des épisodes d’apprentissage. Prochaines étapes obligatoires avant déploiement :

1. installer `EUC_DEV270B_HMAC_SECRET` simultanément dans les propriétés privées de la passerelle et du projet PFMP ;
2. pousser puis relire le distant, créer la version immuable DEV417 et mettre à jour les deux déploiements existants sans changer leurs URL ;
3. lire uniquement la correspondance `1MELEC2` dans la base PFMP active `b2CyeMEdVEMS`, sans import réel ni écriture ;
4. tester visuellement TMP3D et TMVA2 en recette, puis mesurer le détail classe et le générateur de conventions.

Décisions acquises : suite complète verte (319 tests) et maintien de `ANYONE_ANONYMOUS` pour le Web App unique qui sert aussi les pages publiques ; l’administration reste protégée par l’authentification applicative.
