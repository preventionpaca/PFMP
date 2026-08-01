# Rapport de livraison — tableau de bord suivi PFMP dev.22

Date : 1er août 2026  
Version locale : **Eucalyptus PFMP — v1.0.0-dev.22**

## Périmètre livré

La route `?page=suivi-pfmp` présente désormais une entrée par année, puis une grille de classes et les périodes de la classe choisie. Aucun nom d’élève n’est envoyé au navigateur au chargement initial. La liste nominative n’est demandée qu’après sélection d’une classe et d’une période.

Les tuiles affichent les effectifs, présents, sortis, périodes, conventions manquantes et anomalies. Les boutons de période affichent les dates françaises et les compteurs utiles. Le fil d’Ariane, les retours rapides, les filtres et la mémorisation locale non nominative complètent la navigation.

## Sécurité et performance

- contrôles DDFPT et lecture seule appliqués côté serveur ;
- requêtes Grist SQL limitées aux instructions `SELECT` paramétrées ;
- année, classe et période obligatoires et validées côté serveur avant toute liste ;
- pagination limitée à 50 résultats ;
- cache de cinq minutes réservé aux années, classes, périodes et agrégats ;
- aucune liste nominative dans le cache partagé ;
- cohorte de recette 2025-2026 isolée de 2026-2027 ;
- aucune écriture métier, suppression, saisie manuelle, affectation ou émission de courriel ;
- copie Grist `j1jDArBkzi7P` exclusivement, avec `DRY_RUN`, courriels désactivés et Turnstile désactivé.

## Recette automatisée

La suite complète contient **254 tests réussis**, dont **54 tests dédiés au suivi**. Elle couvre notamment l’absence de chargement nominatif initial, le cache non nominatif, les filtres serveur, la pagination, l’isolation des années, les compteurs, les sorties, les droits, les accès rapides et l’affichage mobile.

## État du déploiement

Le `clasp push` a transféré 35 fichiers. La version Apps Script immuable **22** a été créée, puis le déploiement existant `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg` a été mis à jour vers `@22`. L’accès demeure `DOMAIN` et l’URL de recette est inchangée.
