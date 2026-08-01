# Audit Grist — lecture seule du 31 juillet 2026

Document audité : `3pnVrygfNn7c` sur `docs.getgrist.com`. L'API a répondu en lecture sans clé après activation de l'accès lecteur. Seules les routes `GET` des tables et colonnes ont été utilisées : aucun enregistrement métier n'a été lu et aucune écriture, création, modification ou suppression n'a été tentée.

## Synthèse de l'inventaire

- 38 tables ;
- 499 colonnes, dont 108 formules ;
- 85 colonnes de référence ;
- aucune table dont le nom ou les colonnes désignent une entreprise, un établissement d'accueil, un contact, un tuteur, une visite ou un ordre de mission ;
- aucune colonne `SIRET` ou `SIREN` ;
- aucune référence existante vers une entreprise.

Tables existantes : `Annees_Scolaires`, `Types_Planning`, `Vacances_Scolaires`, `Calendrier_Scolaire`, `Planning_Periodes`, `Parametres_EDT`, `Roles_EDT`, `Enseignants`, `Eleves`, `Appartenances_Groupes`, `Services_Enseignants`, `Creneaux_EDT`, `Seances_Generees`, `Synthese_Hebdo_Enseignants`, `Synthese_Annuelle_Enseignants`, `Remplacements`, `Journal_EDT`, `Classes`, `Groupes`, `Groupes_Classes`, `Matieres`, `Salles`, `Regles_Decompte_EDT`, `Quotas_PFMP_Enseignants`, `Repartition_PFMP`, `Synthese_Hebdo_Ressources`, `Synthese_Annuelle_Ressources`, `Versions_EDT`, `TRM_Lignes`, `TRM_Repartition_Enseignants`, `TRM_Synthese`, `EDT_Historique_Actions`, `Zones_Salles`, `Vues_EDT`, `Vues_EDT_Lignes`, `Indisponibilites_EDT`, `Creneaux_Lieux` et `Groupes_Composition`.

## Tables pertinentes et dépendances

- `Eleves` contient identité, classe, statut, indicateur apprenti et une référence `Prof_referent → Enseignants`. Elle ne contient aucune entreprise ni période de stage structurée.
- `Enseignants` contient identité et coordonnées, avec des informations PFMP calculées, mais aucune référence vers une entreprise.
- `Planning_Periodes` décrit année, formation, niveau, groupe, dates et type, sans références Grist structurées vers élèves ou entreprises.
- `Quotas_PFMP_Enseignants` référence `Annees_Scolaires`, `Enseignants` et `Classes`.
- `Repartition_PFMP` référence `Annees_Scolaires`, `Classes` et `Enseignants`; `Periode_PFMP` y est une formule texte, pas une référence.
- Les calendriers et emplois du temps sont fortement interconnectés entre enseignants, classes, groupes, salles, années et versions EDT. Ils ne doivent pas recevoir directement les fiches entreprises.

## Doublons fonctionnels

Aucun doublon fonctionnel de `EUC_ENTREPRISES`, `EUC_CONTACTS_ENTREPRISES` ou `EUC_RELATIONS_ENTREPRISES` n'a été détecté dans le schéma. Le champ calculé `Eleves.Etab` ne constitue pas un référentiel d'entreprises : son type est `Any`, il est calculé et se rapporte au contexte de l'élève. Il ne doit pas être réutilisé comme table ou clé entreprise.

## Schéma cible recommandé

Créer, après autorisation d'écriture séparée :

1. `EUC_ENTREPRISES`, avec une ligne par SIRET et unicité fonctionnelle de `SIRET` ;
2. `EUC_CONTACTS_ENTREPRISES`, avec `Entreprise` de type `Ref:EUC_ENTREPRISES` ;
3. `EUC_RELATIONS_ENTREPRISES`, facultative en v1, avec `Entreprise` de type `Ref:EUC_ENTREPRISES`.

Le détail des colonnes figure dans `DICTIONNAIRE_GRIST.md`. Pour limiter la complexité initiale, les deux premières tables suffisent à la mise en service. La table de relations peut être différée jusqu'à la validation du besoin d'historique.

## Rapport d'impact

- création de deux tables métier nouvelles en v1, éventuellement trois ;
- aucune modification, suppression ou renommage des 38 tables existantes ;
- aucune référence ajoutée aux calendriers ou à l'EDT en v1 ;
- future table de placement/PFMP à concevoir séparément pour relier élève, période, entreprise, contact/tuteur et enseignant ;
- future visite et futur ordre de mission à relier à cette table de placement plutôt qu'à dupliquer les données dans les calendriers ;
- principale règle de qualité : normaliser et contrôler le SIRET côté serveur, puis revérifier son existence avant insertion ;
- risque restant : Grist ne fournit pas ici de contrainte d'unicité déclarative auditée; la concurrence devra être testée avant production.

## Décisions demandées avant écriture

1. **Décision validée le 31 juillet 2026 :** créer seulement `EUC_ENTREPRISES` et `EUC_CONTACTS_ENTREPRISES` en v1 ; `EUC_RELATIONS_ENTREPRISES` est reportée ;
2. valider les choix proposés pour `Statut_relation`, `Type_contact` et `Type_action` ;
3. décider si les dates de première/dernière relation sont stockées dans l'entreprise ou calculées depuis les relations ;
4. autoriser séparément la création réelle des tables après mise à jour du plan d'installation idempotent.

## Tentative de création du 31 juillet 2026

La création des deux tables v1 a été explicitement autorisée. La requête `POST /api/docs/3pnVrygfNn7c/tables` a été refusée par Grist avec `403 — No write access`, l'accès anonyme restant limité à la lecture. Une vérification `GET` consécutive confirme qu'aucune table, même partielle, n'a été créée. Le schéma et l'installateur idempotent sont prêts; leur exécution attend un accès `doc.schema:write` limité à ce document.

## Création authentifiée du 31 juillet 2026

Après fourniture temporaire d'un jeton autorisé, une requête authentifiée a créé avec succès uniquement :

- `EUC_ENTREPRISES` : 29 colonnes ;
- `EUC_CONTACTS_ENTREPRISES` : 13 colonnes.

La vérification en lecture confirme que `EUC_CONTACTS_ENTREPRISES.Entreprise` est de type `Ref:EUC_ENTREPRISES`. `EUC_RELATIONS_ENTREPRISES` n'a pas été créée et les 38 tables antérieures n'ont pas été modifiées. Le fichier temporaire contenant le jeton a été supprimé après vérification.
