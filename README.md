# Eucalyptus — Entreprises SIRET

Application autonome du lycée Les Eucalyptus pour rechercher un établissement par SIRET, compléter sa fiche et, après validation, l'enregistrer dans Grist.

Version locale : **Eucalyptus PFMP — v1.0.0-dev.26**

- Backend et Web App : Google Apps Script existant, désormais copié localement dans `apps-script/`
- Base cible : Grist, sans accès direct depuis le navigateur
- API publique : API Recherche d'entreprises appelée directement par le navigateur après contrôle Grist côté serveur
- Documentation : `Documentation/README.md`

La version `dev.26` sépare le référentiel multiannuel des cohortes et charge séparément les compteurs depuis une synthèse non nominative. La liste nominative reste filtrée côté serveur après sélection. La seule cible autorisée reste la copie `j1jDArBkzi7P` ; les gardes `DRY_RUN` et `DISABLED` restent actives. La version Apps Script immuable `25` est publiée sur le déploiement de recette existant.

Aucun secret ne doit être commité. Aucune installation Grist, publication Apps Script ou écriture distante n'est exécutée automatiquement.
