# Audit des tables professeurs, EDT et missions V1

## Référentiel recommandé

La table historique `Enseignants` est le candidat recommandé. Le schéma source prévoit `Nom`, `Prenom`, `Nom_complet`, `Initiales`, `Discipline`, `Categorie_PFMP`, `Service_hebdo_reference`, `Actif`, `Commentaire`, puis `Code_import`. Il ne prévoit ni courriel institutionnel, établissement/service administratif, adresse de départ, informations de mission ou de remboursement. Ces colonnes et les données réelles doivent être vérifiées en lecture seule avant décision.

`Quotas_PFMP_Enseignants` relie année, classe, enseignant, catégorie et heures. `Repartition_PFMP` calcule une charge théorique par année/classe/enseignant ; elle n’identifie aucun jeune et ne remplace donc pas les affectations nominatives.

`Creneaux_EDT`, `Seances_Generees` et `Indisponibilites_EDT` fournissent enseignant, dates, jours et heures. Une absence de cours n’est ni une disponibilité certifiée ni une autorisation de mission.

## Missions historiques

Aucune table ni modèle fiable d’ordre de mission, frais, visite ou justificatif n’a été retrouvé dans les sources locales, les documents ou installateurs. `Documentation/ORDRES_DE_MISSION.md` était uniquement une note prospective. Aucun template officiel, logo de mission, signataire, mentions réglementaires ou barème n’est disponible.

Limite : l’export local authentifié est ciblé PFMP et ne contient pas l’ensemble des tables EDT. Une relecture actuelle de la copie est obligatoire avant création.
