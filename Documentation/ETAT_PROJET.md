# État du projet Eucalyptus PFMP

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
- Reprise exacte : effectuer la recette visuelle des routes dev.27 puis définir le prochain lot fonctionnel sans activer les mutations.
