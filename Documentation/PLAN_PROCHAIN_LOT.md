# Prochain lot après DEV447

1. Observer une journée complète dans `Paramétrage → Consommation API Grist` et comparer le total PFMP aux informations que pourra fournir le support Grist ; ne pas assimiler l’estimation PFMP au compteur officiel du document.
2. Réduire les lectures de structure révélées par le contrôle DEV447 : une seule ouverture de TMP3D a encore nécessité 26 appels Grist. Mutualiser en priorité les lectures `/tables` et les métadonnées répétitives.
3. Vérifier que la prochaine reconstruction planifiée publie le résumé compact et mesurer le tout premier clic « Afficher les décomptes » sans appel Grist.
4. Transformer Destinataires/envois en coquille légère avec chargement ciblé ; objectif inférieur à cinq secondes.
5. Conserver `apprentis.loucodi.fr` comme sous-domaine opérationnel et éliminer les références résiduelles au singulier si elles ne sont plus utilisées.
6. Réaligner le socle de tests Git historique (versions dev.8/dev.27, fichier d'audit dev.9 et routeur historique) sans affaiblir les assertions métier.
7. Conserver les modes protégés : Pronote `DRY_RUN`, courriels `DISABLED`, mutations administratives `DRY_RUN`, aucune production Grist.
