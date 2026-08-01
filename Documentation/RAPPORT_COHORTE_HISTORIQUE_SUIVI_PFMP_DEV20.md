# Rapport dev.20 — cohorte historique et suivi PFMP

## Objectif

La cohorte Pronote de 628 inscriptions doit être rattachée à 2025-2026 et signalée comme donnée historique de recette. Elle ne doit jamais alimenter les effectifs 2026-2027 ni être présentée comme un effectif actuel.

## Modèle

Cinq colonnes complètent `EUC_ELEVES_PFMP` : `Donnee_test`, `Mode_donnee`, `Cohorte_import`, `Utilisable_production` et `Cle_inscription_annuelle`. La clé annuelle combine l’identité technique Pronote et l’année afin qu’un même élève puisse avoir plusieurs inscriptions annuelles distinctes.

Valeurs attendues pour les 628 lignes : année `2025-2026`, `Donnee_test=true`, `Mode_donnee=RECETTE_HISTORIQUE`, `Cohorte_import=PRONOTE_2025_2026_TEST` et `Utilisable_production=false`.

## Route de suivi

La route `?page=suivi-pfmp` est strictement en lecture seule. Elle sélectionne 2025-2026 par défaut, refuse d’inclure cette cohorte dans 2026-2027 et affiche les avertissements de test demandés. Les filtres couvrent année, classe, période, convention, scolarité et recherche nominative.

Les compteurs utilisent le libellé « Effectif de recette 2025-2026 ». Les élèves sortis restent visibles mais sont exclus des présents sans convention. La vue n’expose aucune date de naissance, aucun identifiant Pronote, aucune coordonnée et aucun motif détaillé de sortie.

Seules les périodes dont `Planning_Periodes.Annee_scolaire` vaut exactement `2025-2026` peuvent être reliées. À défaut, la vue affiche « Période historique non reliée » sans date inventée et sans modification du calendrier.

## Sécurité

La Web App ne propose aucune fonction de modification, suppression, affectation, courriel ou ordre de mission. `DOMAIN`, `DRY_RUN`, courriels désactivés, Turnstile désactivé et Doc ID de recette `j1jDArBkzi7P` sont conservés. Aucun commit ni push Git n’est réalisé.

## État d’exécution

La migration a créé l’année historique `2025-2026` avec la référence Grist 4, ajouté les cinq colonnes et requalifié les 628 lignes. La relecture confirme 42 colonnes, 628 clés annuelles uniques et toutes les protections de cohorte. Le second passage calcule zéro mise à jour : l’opération est idempotente. Aucune autre année élève n’a été modifiée et aucun accès à la production n’a eu lieu. Le jeton temporaire a été supprimé.

Les compteurs contrôlés sont : 628 inscriptions de recette, 548 présentes et 80 sorties. En l’absence de convention réelle dans la copie lors du dernier contrôle, « avec convention » vaut 0 et « présents sans convention » vaut 548 ; les 80 sorties en sont exclues. Les ambiguïtés et soumissions hors liste valent 0.

La suite complète compte **245 tests réussis, aucun échec**. Le mode `LECTURE_SEULE` neutralise explicitement les droits de modification, saisie, annulation et purge normalement associés au rôle DDFPT.

Le `clasp push` standard non forcé a transféré 35 fichiers vers le projet principal. Après ajout du compte en lecture seule, la version Apps Script immuable **20** a été créée, puis le déploiement existant a été mis à jour vers `@20`, sans changement d’identifiant ni d’URL. Le manifeste conserve `USER_DEPLOYING` et `DOMAIN`. Aucun commit ni push Git n’a été réalisé.

URL exacte de test :

`https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec?page=suivi-pfmp`
