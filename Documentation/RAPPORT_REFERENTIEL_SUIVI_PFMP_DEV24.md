# Rapport — référentiel multiannuel du suivi PFMP dev.24

Date : 1er août 2026  
Version : **Eucalyptus PFMP — v1.0.0-dev.24**

Le menu du tableau de bord est désormais construit exclusivement depuis `Annees_Scolaires`, `EUC_OFFRES_FORMATION`, `EUC_OFFRES_PERIODES` et `Planning_Periodes`. Aucune cohorte et aucune soumission ne détermine la visibilité d’une année, d’une classe ou d’une période.

## Résultat Grist

- années disponibles dans le référentiel : **4** ;
- année active : **2026-2027** ;
- classes autorisées affichables en 2026-2027 : **38** ;
- lignes de synthèse classe–période certaines en 2026-2027 : **51** ;
- compteurs 2026-2027 : zéro en l’absence d’import, sans création d’élève ;
- relations ambiguës créées ou affichées : **0** ;
- synthèses historiques 2025-2026 conservées : **38** lignes avec période historique non reliée ;
- copie ciblée exclusivement : `j1jDArBkzi7P`.

Les 51 relations certaines correspondent aux 43 relations initiales du référentiel complétées par les 8 relations carrosserie validées dans la correction dev.9. La clé technique combine année, offre/classe et période. La reconstruction crée les clés absentes puis met à jour les mêmes clés lors des passages suivants.

## Interface et performance

L’année active est sélectionnée par défaut. Le bandeau historique n’apparaît qu’en 2025-2026. En 2026-2027, l’interface indique qu’aucun effectif Pronote n’est importé et que les périodes viennent du calendrier officiel.

Une période sans élève ouvre un tableau complet à huit colonnes et affiche le message explicatif demandé. Les élèves 2025-2026 restent exclus de toute requête 2026-2027.

Le chargement initial conserve les propriétés de dev.23 : aucune lecture d’élève, aucune lecture de soumission, compteurs asynchrones et métadonnées en cache. La génération locale instrumentée reste de l’ordre de **1 à 2 ms hors latence réseau Grist**.

## Tests et déploiement

**265 tests réussis**, dont **65 dédiés au suivi**. La version Apps Script immuable **24** a été créée et le déploiement existant `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg` a été mis à jour vers `@24`, sans changement d’URL.
