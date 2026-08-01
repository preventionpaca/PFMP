# Proposition de schéma suivi et missions PFMP V1 — non appliquée

## Affectations

`EUC_AFFECTATIONS_SUIVI_PFMP` : `Soumission_PFMP` Ref, `Professeur` Ref:Enseignants, snapshots courriel/nom, `Type_suivi`, dates affectation/début/fin, `Statut_affectation`, auteur, modification, commentaire, actif.

## Actions

`EUC_ACTIONS_SUIVI_PFMP` : affectation, soumission, professeur, type, dates prévue/réalisée, statut, mode, compte rendu, difficultés, suite, échéance, auteurs et dates.

## Visites

`EUC_VISITES_PFMP` : affectation/action, soumission, professeur, date prévue/réelle, snapshot destination JSON borné, départ/retour, lieu, transport, véhicule autorisé, distance prévisionnelle, objet, commentaire, statut et version.

## Ordres et frais

`EUC_ORDRES_MISSION_PFMP` et `EUC_FRAIS_MISSION_PFMP` suivent les colonnes détaillées dans les architectures dédiées. Ajouter une table `EUC_DOCUMENTS_PFMP` seulement si plusieurs documents/version deviennent communs : identifiant stable, type, objet métier, version, date/auteur, snapshot, empreinte et identifiant Drive sécurisé.

Les listes d’états proposées dans le cahier des charges restent des candidats. Elles doivent être comparées aux référentiels réels et validées avant création. Aucune table ni colonne n’a été créée.
