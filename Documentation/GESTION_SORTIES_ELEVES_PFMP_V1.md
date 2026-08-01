# Gestion des sorties d’élèves PFMP V1 — conception locale

## Disponibilité dans Pronote

Aucun fichier d’export Pronote réel n’a été transmis pendant ce lot. Il est donc impossible d’affirmer si la date, le statut ou le motif de sortie sont exportables dans la configuration de l’établissement. Le parseur local accepte plusieurs intitulés usuels, mais ils devront être adaptés à un export anonymisé réel.

## Modèle et confirmation

Les colonnes proposées complètent `EUC_ELEVES_PFMP` avec statut de scolarité, date/motif/commentaire de sortie, confirmation et auteur, dernière présence à l’import, présence au dernier import et exclusion de l’attente de stage. Les états restent proposés : `PRESENT`, `SORTI`, `SORTIE_A_CONFIRMER`, `REINTEGRE`, `INACTIF_AUTRE`.

Une date provenant du CSV ou une disparition entre imports donne `SORTIE_A_CONFIRMER`. Seuls `ADMIN_PFMP`, `DDFPT` ou `BUREAU_ENTREPRISES` disposant du droit de modification peuvent confirmer la date et le motif. Le professeur voit uniquement le badge et, si utile, la date.

## Règle temporelle

- sortie avant le début : ligne conservée, élève non concerné et non compté sans stage ;
- sortie entre début et fin inclus : non compté parmi les élèves restant à placer ; convention éventuelle conservée avec alerte administrative ;
- sortie après la fin : l’élève reste historiquement concerné pour cette période et les anciens compteurs ne sont pas recalculés comme s’il avait été absent ;
- sortie non confirmée : situation à vérifier, sans exclusion automatique ;
- réintégration : nouvel état et date d’effet, historique de sortie conservé, recalcul uniquement pour les périodes futures.

## Compteurs

`Effectif importé` contient tous les élèves de l’année/classe, sorties comprises. `Présents` est évalué à la date de référence. `Sortis` compte les sorties confirmées. `Concernés` applique la règle temporelle de la période. `Sans stage` compte uniquement les concernés non exclus sans convention recevable/validée. Les soumissions ambiguës ou hors classe sont signalées séparément.

## Conventions et disparitions

Aucune convention, entreprise, date ou action de suivi n’est supprimée ou détachée. Une sortie avant ou pendant une convention ne l’annule pas. Une absence dans un nouvel export conserve la fiche et ajoute une anomalie `SORTIE_A_CONFIRMER` ; elle n’est jamais assimilée automatiquement à une démission.

## État de validation

Le moteur et ses règles sont couverts par la suite locale. Aucun schéma Grist, aucune ligne, aucun courriel et aucun déploiement ne sont créés dans ce lot. Le nombre final de tests est consigné dans le compte rendu d’exécution du lot.
