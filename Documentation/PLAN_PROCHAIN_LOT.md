# Prochain lot après DEV446

1. Vérifier que la prochaine reconstruction planifiée publie le résumé compact et mesurer le tout premier clic « Afficher les décomptes » sans appel Grist.
2. Transformer Destinataires/envois en coquille légère avec chargement ciblé ; objectif inférieur à cinq secondes.
3. Conserver `apprentis.loucodi.fr` comme sous-domaine opérationnel et éliminer les références résiduelles au singulier si elles ne sont plus utilisées.
4. Réaligner le socle de tests Git historique (versions dev.8/dev.27, fichier d'audit dev.9 et routeur historique) sans affaiblir les assertions métier.
5. Conserver les modes protégés : Pronote `DRY_RUN`, courriels `DISABLED`, mutations administratives `DRY_RUN`, aucune production Grist.
