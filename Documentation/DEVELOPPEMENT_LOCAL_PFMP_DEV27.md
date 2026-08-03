# Développement local PFMP dev.27

État : **développé localement, non déployé, non commité**.

## Import Pronote avec prévisualisation

La route protégée `?page=import-pronote-pfmp` accepte le format Pronote validé en UTF-16LE ou UTF-8 et détecte tabulation, point-virgule ou virgule. L’année scolaire doit être confirmée avant l’analyse. Le serveur refuse les formats inconnus, les colonnes sensibles et les années non consécutives.

La prévisualisation est sans écriture. Elle compare uniquement la cohorte de l’année choisie, détecte l’empreinte SHA-256, les créations, mises à jour, changements de classe, sorties explicites, absences du dernier export, doublons et ambiguïtés. Une absence sans date de sortie n’est jamais transformée automatiquement en sortie.

Exemple anonymisé : 3 lignes analysées, 2 admissibles, 1 hors périmètre, 1 création proposée, 1 ligne inchangée, aucune ambiguïté. Aucun nom, identifiant ou date de naissance n’est inclus dans le rapport public.

L’action de confirmation reste une simulation : verrou serveur, confirmation `CONFIRMER_IMPORT`, protection contre le double clic et propriété `EUC_PFMP_PRONOTE_IMPORT_MODE=DRY_RUN`. Aucun import réel 2026-2027 n’est possible dans cette version locale.

## Suivi des conventions

Les statuts métier distinguent `SANS_CONVENTION`, `SOUMISSION_RECUE`, `A_VERIFIER`, `CONVENTION_COMPLETEE_PRONOTE`, `ANNULEE` et `ELEVE_SORTI`. Une sortie confirmée est exclue des conventions manquantes. Une classe marquée `AUCUNE_PERIODE_PREVUE` ne produit ni convention manquante ni anomalie artificielle.

La synthèse non nominative est complétée par : soumissions reçues, rapprochements à vérifier, conventions annulées et conventions traitées dans Pronote. Les listes nominatives restent chargées seulement après sélection serveur d’une année, classe et période, avec pagination limitée à 50 lignes.

## Gestion administrative

La route protégée `?page=gestion-pfmp` prépare une fiche structurée en lecture seule. Les personnels sont lus dynamiquement depuis `EUC_PERSONNELS_PFMP`; aucun enseignant n’est codé en dur. Les corrections, annulations logiques, remplacements versionnés et affectations téléphonique/visite sont seulement simulés.

Les contrôles prévus sont : autorisation serveur, mode `EUC_PFMP_ADMIN_MUTATION_MODE=DRY_RUN`, verrou, numéro de révision, motif obligatoire et jeton anti-double-clic. Aucun courriel et aucun ordre de mission ne sont produits.

## Structure Grist proposée

Le script idempotent `scripts/grist/prepare-dev27-structure.js` cible exclusivement la copie `j1jDArBkzi7P`. Il prépare sans donnée métier :

- `EUC_IMPORTS_PRONOTE_PFMP` ;
- `EUC_HISTORIQUE_SOUMISSIONS_PFMP` ;
- `EUC_PERSONNELS_PFMP` ;
- `EUC_AFFECTATIONS_PFMP` ;
- quatre colonnes agrégées dans `EUC_SYNTHESE_SUIVI_PFMP`.

Il ne crée aucun personnel fictif, aucune ligne nominative et supprime le fichier temporaire du jeton à la fin.

## Validations requises avant un futur déploiement

1. Contrôler la structure créée dans la copie Grist et ses types de références.
2. Configurer les deux propriétés en `DRY_RUN` dans Apps Script.
3. Faire une recette avec un export strictement anonymisé pour 2026-2027.
4. Vérifier les droits DDFPT et lecture seule sur les deux routes.
5. Valider le vocabulaire et le parcours de confirmation avec le DDFPT.
6. Rejouer toute la suite de tests et un contrôle manuel responsive/clavier.
7. Donner une autorisation distincte avant tout `clasp push`, version ou déploiement dev.27.
8. Donner une autorisation distincte avant toute activation future d’import ou de mutation réelle.

Les 628 élèves historiques 2025-2026 ne sont ni modifiés ni utilisés comme effectif 2026-2027.
