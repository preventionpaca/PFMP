# Rapport de performance — suivi PFMP dev.23

Date : 1er août 2026  
Version : **Eucalyptus PFMP — v1.0.0-dev.23**

## Mesure et correction

Avant correction, le temps observé dans le navigateur était de **20 à 30 secondes**. Le chemin initial exécutait cinq requêtes Grist : autorisation, années, classes avec agrégation des 628 élèves, périodes et soumissions non rapprochées.

Après correction, le chemin initial exécute quatre requêtes au premier passage — autorisation, années, classes et périodes — puis une seule requête d’autorisation lorsque les métadonnées sont en cache. Il exécute **zéro lecture d’élève et zéro lecture de soumission**. Les compteurs sont demandés après l’affichage et lus dans une table de 38 lignes.

Les tests instrumentés mesurent une génération locale de la réponse initiale de **1 à 2 ms hors latence réseau Grist**. La mesure réelle à froid est désormais enregistrée anonymement dans les journaux Apps Script, par phase, sans donnée personnelle. Le seuil fonctionnel visé reste inférieur à trois secondes pour la structure.

## Synthèse Grist

La table `EUC_SYNTHESE_SUIVI_PFMP` a été créée exclusivement dans la copie `j1jDArBkzi7P`. Elle contient **38 lignes**, une par classe autorisée pour l’année historique lorsque les périodes ne sont pas reliées. La seconde passe a mis à jour les 38 mêmes clés sans création de doublon. Aucune colonne nominative n’est présente.

## Contrôles

- cache de cinq minutes : années, classes, périodes et synthèses seulement ;
- invalidation prévue après actualisation ;
- liste d’élèves chargée uniquement après clic sur un bouton de période ;
- maximum 50 lignes et pagination conservée ;
- rôle DDFPT, lecture seule, cohorte 2025-2026, courriels désactivés et absence d’accès production conservés ;
- **260 tests réussis**, dont **60 dédiés au suivi**.

## Déploiement

Le `clasp push` a transféré 35 fichiers. La version Apps Script immuable **23** a été créée et le déploiement existant `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg` a été mis à jour vers `@23`. La même URL, l’accès `DOMAIN`, `DRY_RUN`, les courriels désactivés et Turnstile désactivé sont conservés.
