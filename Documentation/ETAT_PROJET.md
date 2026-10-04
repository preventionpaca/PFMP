# État du projet Eucalyptus PFMP

## Mise à jour du 5 octobre 2026 — DEV445

- Version Apps Script immuable active : `794` sur les déploiements public et administrateur existants.
- Correctif performance : lecture du dernier snapshot enrichi pendant sa reconstruction, suppression des reconstructions synchrones sur les pages famille/détail et résumé global compact sans aller-retour normal au clic.
- Correctif géocodage : candidats construits depuis les snapshots annuels, déduplication SIRET/adresse, géocodage limité aux nouvelles adresses ou adresses modifiées et écritures Grist regroupées.
- Audit et chronométrages : voir `Documentation/AUDIT_PERFORMANCE_DEV445.md`.
- Tests DEV445 : 16 réussis. La suite globale conserve sept échecs de référence déjà présents dans le socle Git ancien ; aucun test n'a été affaibli.
- Blocages externes au 5 octobre : quota journalier Grist atteint (`429`) et DNS `apprenti.loucodi.fr` non résolu.
- Grist autorisé inchangé : recette `j1jDArBkzi7P` uniquement ; production `3pnVrygfNn7c` non consultée.

- Version stable et active : `Eucalyptus PFMP — v1.0.0-dev.27`.
- Version locale : dev.27.
- Version Apps Script immuable active : 26 avant la mise à jour documentaire/configuration de cette intervention ; version 25 conservée pour rollback.
- Référence Git : commit `14aa728`, tag annoté `v1.0.0-dev.27`, `main` aligné avec `origin/main` au début de l’intervention.
- Grist autorisé : copie `j1jDArBkzi7P` uniquement. Production `3pnVrygfNn7c` interdite.
- Web App : `https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec`.
- Routes : `pfmp`, `suivi-pfmp`, `import-pronote-pfmp`, `gestion-pfmp`, `entreprises` ; routeur EDT historique conservé.
- Modes exigés : soumissions `DRY_RUN`, courriels `DISABLED`, import Pronote `DRY_RUN`, mutations administratives `DRY_RUN`, Turnstile désactivé, accès `DOMAIN`.
- Actif : formulaire PFMP, recherche entreprise, suivi paginé et multiannuel, import Pronote en prévisualisation, gestion administrative consultable.
- Préparé mais désactivé : import réel, mutations de convention, annulation, affectations, courriels et ordres de mission.
- Tables PFMP principales : `EUC_OFFRES_FORMATION`, `EUC_OFFRES_PERIODES`, `EUC_ELEVES_PFMP`, `EUC_SOUMISSIONS_PFMP`, `EUC_SYNTHESE_SUIVI_PFMP`, `EUC_UTILISATEURS_PFMP`, `EUC_IMPORTS_PRONOTE_PFMP`, `EUC_HISTORIQUE_SOUMISSIONS_PFMP`, `EUC_PERSONNELS_PFMP`, `EUC_AFFECTATIONS_PFMP`.
- Tests : `node tests/run-tests.js` ; dernier résultat avant cette intervention : 318 réussis.
- Blocage connu : la recette visuelle authentifiée finale doit être réalisée avec une session institutionnelle.
- Reprise exacte : après renouvellement du quota Grist, laisser une reconstruction planifiée publier le résumé compact, contrôler le premier affichage des décomptes et traiter ensuite la page Destinataires/envois ainsi que le DNS du sous-domaine apprentis.
