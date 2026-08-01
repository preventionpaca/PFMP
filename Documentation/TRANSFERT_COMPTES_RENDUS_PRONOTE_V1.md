# Transfert des comptes rendus vers Pronote V1

L’intégration reste manuelle tant qu’aucune API Pronote officielle compatible avec les suivis PFMP n’est confirmée.

La fiche préparée contient : élève, classe, période, professeur, type et date du suivi, personne contactée, résultat, résumé, difficulté/alerte et indicateur de visite.

Actions futures : `Copier le résumé`, `Marquer comme reporté dans Pronote`, `Signaler une modification après report`. Le marquage doit conserver date, auteur et version du compte rendu. Une modification ultérieure replace la fiche dans `A_REVERIFIER_DANS_PRONOTE` après validation de ce référentiel.

Le prototype produit uniquement un objet de transfert avec `copieManuelle: true` et `ecriturePronote: false`. Aucun appel réseau ou identifiant Pronote n’est utilisé.

Décisions restantes : emplacement exact dans Pronote, format du résumé, longueur maximale, catégories d’alertes, personnes habilitées, preuve du report et conduite à tenir lors d’une correction après report.
