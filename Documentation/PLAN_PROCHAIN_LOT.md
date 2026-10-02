DEV417 est préparé localement depuis le snapshot DEV416 : chargeur apprentis protégé contre les réponses obsolètes, bulle longue interactive, listes des compteurs du détail ADMIN/PUBLIC et alignement commun des dix colonnes. Prochaines étapes obligatoires avant déploiement :

1. lire uniquement la correspondance `1MELEC2` dans la recette `j1jDArBkzi7P` avec un secret privé, sans import réel ni écriture ;
2. faire tourner et installer `EUC_DEV270B_HMAC_SECRET` simultanément dans la passerelle et le projet PFMP ;
3. décider explicitement le modèle d'accès du Web App commun (`ANYONE_ANONYMOUS` actuellement nécessaire aux pages publiques, contre l'ancienne attente `DOMAIN`) ;
4. terminer la migration de la suite historique vers DEV416/DEV417 sans retirer ni affaiblir les contrôles métier encore applicables ;
5. tester visuellement TMP3D et TMVA2 en recette, puis mesurer le détail classe et le générateur de conventions ;
6. seulement après tests verts : `clasp push`, relecture distante, version immuable DEV417 et mise à jour des deux déploiements existants.
