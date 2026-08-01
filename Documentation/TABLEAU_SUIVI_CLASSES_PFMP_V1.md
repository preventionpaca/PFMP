# Tableau de suivi des classes PFMP V1

La ligne source est l’élève officiel Pronote, pas la soumission. Le tableau contient donc aussi les élèves sans convention.

## Colonnes allégées proposées

- prénom et nom ;
- classe ;
- période ;
- état synthétique de convention ;
- entreprise et ville, après validation institutionnelle ;
- professeur téléphone et professeur visite ;
- état du suivi téléphonique et de la visite ;
- état du traitement Pronote ;
- alerte synthétique.

La ligne d’un élève sorti reste à sa place. Elle porte `Sorti le jj/mm/aaaa` ou `Sortie à confirmer`, avec un style discret. Le motif, le commentaire et l’auteur administratif de la sortie restent exclus du tableau allégé.

Sont exclus : naissance, téléphones et courriels personnels, adresse complète, coordonnées du tuteur, compte rendu, difficultés, incidents, justificatifs et frais.

Compteurs séparés : effectif importé historique, élèves présents à la date de référence, sorties confirmées, élèves concernés par la période, conventions reçues/validées, présents sans stage, situations à vérifier, doublons et suivis. La formule est : `sans stage = élèves concernés, présents et non exclus – élèves couverts par une convention recevable ou validée`.

Filtres : tous, présents, sortis, sorties à confirmer et sans stage. Le filtre sans stage exclut toujours les sorties confirmées.

L’URL Atrium ne confère aucun droit. Le tableau reste authentifié et filtré côté serveur. La liste exacte, notamment entreprise/ville et identité complète, doit être validée avant déploiement de cette extension.
