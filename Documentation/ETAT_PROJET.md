# État du projet Eucalyptus PFMP

## Mise à jour du 5 octobre 2026 — DEV446

- Version Apps Script immuable active : `795` sur les déploiements public et administrateur existants.
- Résilience Apprentis : l'épuisement du quota Grist (`429`) n'interrompt plus le rendu avec une page blanche et une erreur technique. La route affiche désormais un écran maîtrisé, sans nouvelle tentative automatique, avec actions « Réessayer » et retour administration.
- Contrôle réel après déploiement : `apprentis.loucodi.fr` et la route administrateur Apprentis chargent de nouveau leurs classes ; le quota journalier Grist s'était renouvelé au moment du contrôle.
- Tests DEV446 : 10 réussis, couvrant le `429`, les autres indisponibilités et le chemin nominal.
- Correctif performance : lecture du dernier snapshot enrichi pendant sa reconstruction, suppression des reconstructions synchrones sur les pages famille/détail et résumé global compact sans aller-retour normal au clic.
- Correctif géocodage : candidats construits depuis les snapshots annuels, déduplication SIRET/adresse, géocodage limité aux nouvelles adresses ou adresses modifiées et écritures Grist regroupées.
- Audit et chronométrages : voir `Documentation/AUDIT_PERFORMANCE_DEV445.md`.
- Tests DEV445 : 16 réussis. La suite globale conserve sept échecs de référence déjà présents dans le socle Git ancien ; aucun test n'a été affaibli.
- Point DNS : le sous-domaine opérationnel contrôlé est `apprentis.loucodi.fr` (pluriel). L'ancien libellé singulier `apprenti.loucodi.fr` désigne une entrée distincte.
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
- Reprise exacte : contrôler la prochaine reconstruction planifiée du résumé compact, puis traiter la page Destinataires/envois et poursuivre les mesures de performance différentielles.
