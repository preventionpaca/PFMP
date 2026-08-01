# Développement local du formulaire PFMP — V1

Date : 1er août 2026  
Version de développement complétée : **Eucalyptus PFMP — v1.0.0-dev.8**  
Route préparée : `?page=pfmp`

## Périmètre réalisé

La première version complète du formulaire PFMP est construite localement. Elle n'a pas été synchronisée vers Apps Script et ne peut produire aucune écriture ou aucun courriel réel.

Le routeur `doGet` historique reste unique. La route PFMP est résolue avant la route EDT par défaut et ne charge aucun template EDT absent. Les routes Entreprises et historiques sont inchangées.

## Interface en huit étapes

1. choix obligatoire `Scolaire` ou `Apprenti` ;
2. identité et coordonnées complètes ;
3. année, classe et période dynamiques ;
4. dates officielles ou dates déclarées et scénario ;
5. recherche et confirmation de l'entreprise ;
6. responsable, tuteur et réutilisation d'un contact existant ;
7. récapitulatif ;
8. Turnstile et simulation d'envoi.

L'interface possède un indicateur de progression, des boutons précédent/suivant, une validation native et métier par étape, des erreurs en français et une protection contre le double-clic. Les champs restent dans le DOM lors d'une erreur contrôlée et conservent donc leurs valeurs. La mise en page devient mono-colonne sur téléphone.

## Référentiel dynamique

`EUC_PFMP_chargerReferentiel` lit exclusivement :

- l'année active dans `Annees_Scolaires` ;
- les offres `Actif=true` et `Afficher_formulaire_PFMP=true` ;
- les diplômes et éventuelles références `Classes` ;
- les relations `Active=true` de `EUC_OFFRES_PERIODES` ;
- les dates de `Planning_Periodes`.

Le service refuse le chargement si le total visible n'est pas exactement 38. Aucun nom de classe, diplôme, année ou période n'est codé dans le module ou les templates. Les huit BTS sans ligne `Classes` utilisent `Code_classe`. Les 11 relations incertaines ne sont pas présentes dans la table de liaison et ne peuvent donc pas être proposées.

## Dates

Pour un scolaire, la période officielle et ses dates sont conservées séparément des dates déclarées. Les cas conforme, partiellement différent et report/rattrapage produisent respectivement `Conforme au calendrier` ou `Dérogation à vérifier`. Les variantes proposées sont début retardé, fin différente, début et fin différents, période entièrement reportée, stage de rattrapage et autre situation exceptionnelle.

Pour un apprenti, aucune période artificielle n'est générée. Les dates réelles de début et de fin sont obligatoires et indépendantes du calendrier scolaire. Le statut préparé est `Enregistré`.

## Entreprise et contacts

La recherche appelle le module SIRET existant : contrôle Grist serveur, puis API publique côté navigateur si l'établissement n'existe pas. Les états existant, nouveau, fermé et introuvable sont pris en charge. La fiche doit être confirmée explicitement. Les contacts actifs liés à une entreprise existante peuvent préremplir le responsable.

Aucune fonction d'écriture Entreprises ou Contacts n'est appelée par le formulaire PFMP local.

## Soumission simulée

Le tableau `EUC_PFMP_SUBMISSION_COLUMNS` contient exactement les 61 colonnes de `EUC_SOUMISSIONS_PFMP`. Le mapping conserve les références et photographies, dates officielles et déclarées, scénario, motif, coordonnées, entreprise, responsable, tuteur, états de courriel, empreinte, nonce, auteur et version.

Le pipeline préparé comprend :

- référence serveur unique ;
- validation serveur ;
- verrou de script ;
- empreinte de doublon ;
- nonce haché et cache anti-rejeu ;
- limitation temporaire des soumissions identiques ;
- simulation de persistance injectable ;
- simulation de courriel injectable, y compris son échec après une écriture simulée.

La fonction publique locale est volontairement `EUC_PFMP_simulerSoumission`. Elle ne contient aucun appel `POST` ou `PATCH` vers Grist. En `dev.8`, `EUC_PFMP_SUBMISSION_MODE` est fermé par défaut sur `DRY_RUN` et `EUC_PFMP_EMAIL_MODE` sur `DISABLED` ; seules les valeurs exactes `LIVE` et `ENABLED` ouvriraient séparément les opérations futures.

## Turnstile et courriels

Turnstile vérifie côté serveur le secret provenant des propriétés, le succès Siteverify, l'action `pfmp_submit`, le nom d'hôte attendu et le rejeu. Le formulaire ajoute un honeypot, un délai minimal, un nonce, un verrou et une empreinte de répétition. Le widget est réinitialisé après succès ou erreur. Aucun secret n'est présent dans le HTML.

Le courriel administratif simulé utilise l'objet `[PFMP] CLASSE — NOM Prénom — ENTREPRISE — STATUT` et contient les données nécessaires au traitement Pronote. La confirmation facultative au jeune dépend de `EUC_PFMP_SEND_STUDENT_CONFIRMATION`.

## Propriétés restant à configurer

- `EUC_PFMP_SUBMISSION_MODE` — `DRY_RUN` pour la recette ;
- `EUC_PFMP_EMAIL_MODE` — `DISABLED` pour la recette ;
- `EUC_PFMP_NOTIFICATION_EMAIL` ;
- `EUC_PFMP_SEND_STUDENT_CONFIRMATION` ;
- `EUC_PFMP_TURNSTILE_SITE_KEY` ;
- `EUC_PFMP_TURNSTILE_SECRET_KEY` ;
- `EUC_PFMP_TURNSTILE_EXPECTED_HOSTNAME`.

Les propriétés existantes `EUC_ENT_*` restent nécessaires pour l'accès au domaine, Grist et la recherche SIRET.

## Tests

Résultat `dev.8` : **48 tests locaux réussis, aucun échec**, dont les 31 tests historiques et 17 contrôles PFMP. Aucun test n'utilise le réseau : Grist, Siteverify, verrou, cache et boîte d'envoi sont simulés.

## Recette réelle restant à autoriser

Après une autorisation séparée de synchronisation Apps Script :

1. configurer les cinq propriétés PFMP sans afficher leurs valeurs ;
2. vérifier que `?page=pfmp` charge réellement 38 classes pour un compte du domaine ;
3. tester sur téléphone et ordinateur les huit étapes, retour arrière et conservation des données ;
4. tester un établissement existant, nouveau, fermé et introuvable ;
5. tester Turnstile avec l'hôte réel, expiration et rejeu ;
6. effectuer une simulation Apps Script complète sans écriture ;
7. autoriser séparément seulement ensuite l'écriture d'une soumission de recette et les courriels réels.

## Garanties

Aucune écriture Grist, soumission métier, modification de propriété Apps Script, lecture de la production, exécution `clasp push`, création de version, déploiement, courriel, commit ou push Git n'a été effectué pendant ce développement local.
