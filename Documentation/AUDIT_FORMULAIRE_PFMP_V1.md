# Audit du formulaire PFMP v1 — lecture seule

Date : 31 juillet 2026  
Dépôt : `https://github.com/preventionpaca/PFMP.git`  
Projet Apps Script principal : `1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c`  
Copie Grist de recette : `j1jDArBkzi7P`  
Document Grist de production exclu : `3pnVrygfNn7c`

## 1. Périmètre et garanties

Cette passe est exclusivement un audit. Elle n'a réalisé :

- aucune écriture, création ou modification Grist ;
- aucune lecture d'enregistrement métier contenant des données personnelles ;
- aucune modification de propriété Apps Script ;
- aucun `clasp push`, aucune version et aucun déploiement ;
- aucun courriel ;
- aucun commit ni push Git.

L'accès anonyme actuel à la copie Grist répond `403`. Le jeton Grist reste uniquement dans les propriétés Apps Script et n'a pas été extrait. Le présent rapport consolide donc :

1. l'audit Grist authentifié conservé dans `AUDIT_GRIST_RECETTE.md` ;
2. l'audit détaillé des 38 tables historiques conservé dans `AUDIT_GRIST.md` ;
3. les schémas d'installation et les identifiants de colonnes réellement utilisés par le code local.

Les types ci-dessous marqués « vérifié » proviennent de ces audits ou de références explicites du schéma. Les colonnes seulement déclarées par les installateurs sont signalées comme telles et devront être relues par `GET /tables/{id}/columns` avant toute migration autorisée.

## 2. État réel du projet

- Une seule Web App et un seul routeur `doGet` sont conservés.
- La route `?page=entreprises` et la recherche SIRET sont fonctionnelles ; elles ne doivent pas être réécrites.
- Les 23 fichiers Apps Script historiques et Entreprises sont présents.
- `EDT_PFMP.js` calcule seulement une répartition d'enseignants depuis les quotas ; il ne contient pas de formulaire de soumission PFMP.
- `EUC_ENTREPRISES` et `EUC_CONTACTS_ENTREPRISES` existent dans la copie de recette.
- `EUC_CONTACTS_ENTREPRISES.Entreprise` est vérifiée en `Ref:EUC_ENTREPRISES`.
- `EUC_RELATIONS_ENTREPRISES` est absente et ne doit pas être créée.
- La suite locale actuelle contient 31 tests réussis ; elle ne couvre pas encore le futur formulaire PFMP.
- Le dépôt de travail est volontairement non stabilisé : seul le README initial est suivi par Git et les autres fichiers attendent le premier commit.

## 3. Tables Grist pertinentes trouvées

### `Annees_Scolaires`

Table existante et réutilisable comme source dynamique obligatoire.

| Colonne technique | Type observé/déclaré | Usage PFMP |
|---|---|---|
| `Code` | `Text` | libellé d'année scolaire |
| `Date_debut` | `Date` | borne de l'année |
| `Date_fin` | `Date` | borne de l'année |
| `Zone` | `Text` | zone scolaire |
| `Active` | `Bool` | filtrage des années proposées |
| `Commentaire` | `Text` | information interne |
| `Libelle` | `Text`, ajout d'installateur | affichage de référence |
| `Code_import` | `Text`, ajout d'installateur | correspondance d'import |

Le code historique lit dynamiquement `Code`, `Date_debut`, `Date_fin`, `Zone` et `Active`. Aucun libellé d'année ne doit être reproduit dans le futur HTML ou dans une constante Apps Script.

### `Classes`

Table existante et réutilisable comme source dynamique obligatoire.

| Colonne technique | Type vérifié/déclaré | Usage PFMP |
|---|---|---|
| `Nom` | `Text` | nom technique/métier de la classe |
| `Libelle` | `Text` | libellé affichable |
| `Formation` | `Text` | formation actuelle, non référentielle |
| `Niveau` | `Text` | niveau actuel, non référentiel |
| `Effectif` | `Int` | information de classe |
| `Couleur` | `Text` | présentation |
| `Actif` | `Bool` | filtrage |
| `Commentaire` | `Text` | information interne |
| `Code_import` | `Text`, ajout d'installateur | correspondance d'import |

Constat : `Formation` et `Niveau` sont du texte. La table ne référence ni un diplôme ni une année scolaire. Elle fournit bien les noms dynamiques de classes, mais pas une relation normalisée diplôme–classe–année.

### `Planning_Periodes`

Table existante contenant les périodes et dates réutilisables.

| Colonne technique | Type vérifié/déclaré | Usage PFMP |
|---|---|---|
| `Annee_scolaire` | `Text` | année, actuellement jointe par texte |
| `Formation` | `Text` | famille/formation, actuellement jointe par texte |
| `Niveau` | `Text` | niveau ou classe selon les générations historiques |
| `Classe` | `Text`, ajout V2.10.2 | classe, sans référence Grist |
| `Groupe` | `Text` | groupe éventuel |
| `Date_debut` | `Date` | date officielle de début |
| `Date_fin` | `Date` | date officielle de fin |
| `Type` | `Text` | permet d'identifier PFMP/stage/entreprise |
| `Couleur` | `Text` | présentation calendrier |
| `Ligne_sheet` | `Int` | ordre/liaison historique avec le tableur |
| `Duree_jour` | `Numeric` | durée journalière éventuelle |
| `Commentaire` | `Text` | information interne |
| `Actif` | `Bool` | filtrage |

Constat : les dates officielles existent, mais `Annee_scolaire`, `Formation`, `Niveau`, `Classe` et `Groupe` sont des textes. Il n'existe donc pas de clé relationnelle fiable reliant une ligne de période à une ligne précise de `Classes` et `Annees_Scolaires`.

### `Calendrier_Scolaire`

Table existante utile pour contrôles calendaires, mais pas comme catalogue de périodes PFMP.

Colonnes utiles : `Date` (`Date`), `Annee_scolaire` (`Text`), `Semaine_ISO` (`Int`), `Jour_nom` (`Text`), `Jour_numero` (`Int`), `Est_weekend` (`Bool`), `Est_ferie` (`Bool`), `Est_vacances` (`Bool`) et `Nom_vacances` (`Text`). Elle peut vérifier les bornes et informer l'administration, mais la période officielle reste issue de `Planning_Periodes`.

### `Eleves` et apprentis

La table existe avec `Nom`, `Prenom`, `Nom_complet`, `Classe_administrative` (`Text`), `Statut` (`Choice`), `Apprenti` (`Bool`), `Prof_referent` (`Ref:Enseignants`), `Actif` (`Bool`) et `Commentaire` (`Text`).

Elle ne contient ni entreprise ni période PFMP structurée. Conformément au cahier des charges, le formulaire v1 ne doit pas la lier automatiquement au jeune et ne doit pas dépendre d'un export Pronote.

### Tables PFMP historiques

- `Quotas_PFMP_Enseignants` : `Annee_scolaire` (`Ref:Annees_Scolaires`), `Classe` (`Ref:Classes`), `Enseignant` (`Ref:Enseignants`) et données de quota.
- `Repartition_PFMP` : mêmes références principales ; `Periode_PFMP` est du texte/formule et non une référence vers une période.

Ces tables servent à la répartition des enseignants. Elles ne peuvent pas recevoir les déclarations individuelles des jeunes.

### Entreprises et contacts

- `EUC_ENTREPRISES` : 29 colonnes vérifiées ; une ligne fonctionnelle par SIRET.
- `EUC_CONTACTS_ENTREPRISES` : 13 colonnes vérifiées.
- `EUC_CONTACTS_ENTREPRISES.Entreprise` : `Ref:EUC_ENTREPRISES` vérifiée.

Les champs publics (`Raison_sociale`, `Enseigne`, adresse) et locaux (`Telephone`, `Courriel`, `Commentaire_interne`, etc.) restent séparés. Le modèle actuel ne possède pas de colonnes explicites `Nom_usage_local` et `Ancien_nom`. Si ces notions sont confirmées, elles devront être proposées comme deux colonnes additionnelles de `EUC_ENTREPRISES`, après autorisation.

## 4. Correspondance classes–diplômes–périodes–dates

### Ce qui est réutilisable immédiatement

- années : lignes actives de `Annees_Scolaires` ;
- classes : lignes actives de `Classes` ;
- périodes candidates : lignes actives de `Planning_Periodes` dont `Type` désigne une PFMP, un stage ou une période entreprise ;
- dates officielles : `Planning_Periodes.Date_debut` et `Date_fin` ;
- formation/diplôme provisoire : valeurs distinctes réellement présentes dans `Classes.Formation` et `Planning_Periodes.Formation`.

Toutes ces valeurs doivent être lues par l'API Grist au chargement ou à la demande. Aucun nom de classe, diplôme, année ou période ne doit apparaître dans le HTML, dans une liste JavaScript ou dans une constante Apps Script. Les noms cités dans le cahier des charges sont seulement des exemples de rendu.

### Limites actuelles

1. aucune table `Diplomes` ou équivalente n'a été identifiée ;
2. `Classes.Formation` est un texte, pas une référence ;
3. `Planning_Periodes.Annee_scolaire` est un texte alors que `Annees_Scolaires` existe ;
4. `Planning_Periodes.Classe`, `Formation` et `Niveau` sont des textes ;
5. aucune référence technique unique ne relie une classe à ses périodes officielles ;
6. les générations historiques semblent utiliser tantôt `Niveau`, tantôt `Classe` pour identifier le groupe scolaire ;
7. aucun identifiant/libellé de période stable n'est garanti ; une ligne Grist peut servir d'identifiant technique, mais un libellé affichable manque.

Une jointure par normalisation de texte serait possible pour un prototype, mais elle est fragile et ne doit pas devenir le modèle définitif.

## 5. Modèle relationnel minimal proposé — non créé

Le minimum robuste proposé conserve les tables existantes et ajoute seulement les relations manquantes :

### Nouvelle table `EUC_DIPLOMES`

| ID | Type | Obligatoire | Rôle |
|---|---|---:|---|
| `Code` | `Text` | oui | code métier stable et unique fonctionnellement |
| `Libelle` | `Text` | oui | libellé dynamique affiché |
| `Actif` | `Bool` | oui, défaut `true` | filtrage |
| `Ordre` | `Int` | non | tri d'affichage |
| `Commentaire` | `Text` | non | administration |

### Nouvelle table `EUC_OFFRES_FORMATION`

Elle matérialise la combinaison offerte pendant une année et évite d'ajouter des valeurs en dur.

| ID | Type | Obligatoire | Référence |
|---|---|---:|---|
| `Annee_scolaire` | `Ref:Annees_Scolaires` | oui | année existante |
| `Diplome` | `Ref:EUC_DIPLOMES` | oui | diplôme dynamique |
| `Classe` | `Ref:Classes` | oui | classe existante |
| `Actif` | `Bool` | oui, défaut `true` | — |
| `Ordre` | `Int` | non | — |
| `Commentaire` | `Text` | non | — |

Unicité fonctionnelle attendue : `Annee_scolaire + Diplome + Classe`.

### Colonnes minimales à ajouter à `Planning_Periodes`

| ID | Type | Obligatoire à terme | Référence |
|---|---|---:|---|
| `Offre_formation` | `Ref:EUC_OFFRES_FORMATION` | oui pour une PFMP | combinaison année–diplôme–classe |
| `Libelle_periode` | `Text` | oui pour une PFMP | libellé dynamique administré dans Grist |
| `Code_periode` | `Text` | recommandé | clé métier stable et détection des doublons |

Les colonnes texte historiques restent temporairement pour compatibilité. Une migration ultérieure pourra renseigner `Offre_formation` sans supprimer les champs existants. Ce modèle ajoute deux tables et trois colonnes ; rien ne doit être créé avant la phrase d'autorisation exigée.

## 6. Schéma proposé pour `EUC_SOUMISSIONS_PFMP` — non créé

« Photographie » signifie que la valeur est copiée au moment de la soumission pour préserver l'historique même si le référentiel change.

| ID technique | Type Grist | Requis | Défaut | Référence | Origine et justification |
|---|---|---:|---|---|---|
| `Reference` | `Text` | oui | générée serveur | — | identifiant public unique, calculé |
| `Date_creation` | `DateTime` | oui | serveur | — | horodatage calculé |
| `Date_modification` | `DateTime` | oui | serveur | — | suivi administratif calculé |
| `Annee_scolaire` | `Ref:Annees_Scolaires` | oui | — | année | sélection dynamique |
| `Annee_libelle_snapshot` | `Text` | oui | — | — | photographie du libellé |
| `Statut_jeune` | `Choice` | oui | — | — | `Scolaire` ou `Apprenti`, saisi |
| `Diplome` | `Ref:EUC_DIPLOMES` | scolaire | — | diplôme | sélection dynamique |
| `Diplome_snapshot` | `Text` | scolaire | — | — | photographie |
| `Classe` | `Ref:Classes` | scolaire | — | classe | sélection dynamique |
| `Classe_snapshot` | `Text` | scolaire | — | — | photographie |
| `Offre_formation` | `Ref:EUC_OFFRES_FORMATION` | scolaire | — | offre | garantit la combinaison |
| `Periode_officielle` | `Ref:Planning_Periodes` | scolaire | — | période | sélection dynamique |
| `Periode_snapshot` | `Text` | scolaire | — | — | photographie du libellé |
| `Date_officielle_debut` | `Date` | scolaire | copiée | — | photographie non modifiable par le jeune |
| `Date_officielle_fin` | `Date` | scolaire | copiée | — | photographie non modifiable |
| `Dates_conformes` | `Bool` | scolaire | — | — | réponse à la question de conformité |
| `Scenario_dates` | `Choice` | oui | — | — | scénario déclaré |
| `Date_declaree_debut` | `Date` | oui | dates officielles si conforme | — | date réelle/proposée |
| `Date_declaree_fin` | `Date` | oui | dates officielles si conforme | — | date réelle/proposée |
| `Motif` | `Text` | si dérogation | — | — | justification saisie |
| `Commentaire_jeune` | `Text` | non | — | — | précision saisie |
| `Jeune_nom` | `Text` | oui | — | — | saisie libre |
| `Jeune_prenom` | `Text` | oui | — | — | saisie libre |
| `Jeune_date_naissance` | `Date` | décision requise | — | — | saisie si nécessité administrative confirmée |
| `Jeune_telephone` | `Text` | oui | — | — | saisie ; visible aux professeurs autorisés |
| `Jeune_courriel` | `Text` | oui | — | — | saisie ; visible aux professeurs autorisés |
| `Jeune_adresse` | `Text` | oui | — | — | saisie |
| `Jeune_complement_adresse` | `Text` | non | — | — | saisie |
| `Jeune_code_postal` | `Text` | oui | — | — | saisie |
| `Jeune_commune` | `Text` | oui | — | — | saisie |
| `Entreprise` | `Ref:EUC_ENTREPRISES` | oui | — | entreprise | référence validée par SIRET |
| `Entreprise_siret_snapshot` | `Text` | oui | — | — | photographie |
| `Entreprise_raison_sociale_snapshot` | `Text` | oui | — | — | photographie officielle |
| `Entreprise_enseigne_snapshot` | `Text` | non | — | — | photographie API |
| `Entreprise_nom_usage_snapshot` | `Text` | non | — | — | photographie locale |
| `Entreprise_adresse_snapshot` | `Text` | oui | — | — | photographie |
| `Entreprise_commune_snapshot` | `Text` | oui | — | — | photographie |
| `Entreprise_confirmee` | `Bool` | oui | `false` | — | confirmation explicite du jeune |
| `Entreprise_telephone_snapshot` | `Text` | non | — | — | photographie locale |
| `Entreprise_courriel_snapshot` | `Text` | non | — | — | photographie locale |
| `Contact_entreprise` | `Ref:EUC_CONTACTS_ENTREPRISES` | non | — | contact | lien si contact existant et confirmé |
| `Responsable_nom` | `Text` | non | — | — | saisie/photographie |
| `Responsable_fonction` | `Text` | non | — | — | saisie/photographie |
| `Responsable_telephone` | `Text` | non | — | — | saisie/photographie |
| `Responsable_courriel` | `Text` | non | — | — | saisie/photographie |
| `Tuteur_nom` | `Text` | oui | — | — | saisie/photographie |
| `Tuteur_fonction` | `Text` | non | — | — | saisie/photographie |
| `Tuteur_telephone` | `Text` | non | — | — | saisie/photographie |
| `Tuteur_courriel` | `Text` | non | — | — | saisie/photographie |
| `Statut_administratif` | `Choice` | oui | calculé | — | workflow administratif |
| `Valide_par` | `Text` | non | — | — | courriel/identité administrative |
| `Date_validation` | `DateTime` | non | — | — | validation |
| `Commentaire_administratif` | `Text` | non | — | — | réservé administration |
| `Etat_courriel_admin` | `Choice` | oui | `À envoyer` | — | envoyé/à renvoyer/erreur |
| `Date_courriel_admin` | `DateTime` | non | — | — | preuve d'envoi |
| `Erreur_courriel_admin` | `Text` | non | — | — | message technique nettoyé, non montré au jeune |
| `Etat_courriel_jeune` | `Choice` | non | `Non demandé` | — | confirmation optionnelle |
| `Empreinte_doublon` | `Text` | oui | calculée serveur | — | hash normalisé sans secret |
| `Nonce_hash` | `Text` | oui | calculé serveur | — | anti-rejeu sans stocker le nonce brut |
| `Auteur_technique` | `Text` | oui | session serveur | — | traçabilité |
| `Version_formulaire` | `Text` | oui | version serveur | — | audit |

Les listes `Choice` proposées devront être configurées dans Grist et validées administrativement ; elles ne constituent pas des noms de classes, diplômes, années ou périodes codés en dur.

## 7. Règles fonctionnelles scolaire et apprenti

### Scolaire

1. charger les années actives depuis `Annees_Scolaires` ;
2. charger les diplômes et classes via `EUC_OFFRES_FORMATION` ;
3. charger uniquement les périodes actives reliées à l'offre choisie ;
4. afficher les dates officielles issues de la ligne `Planning_Periodes` sans permettre leur édition ;
5. demander si elles correspondent exactement à la situation ;
6. si oui, copier les dates et attribuer `Conforme au calendrier` ;
7. si non, exiger scénario, dates déclarées et motif, puis attribuer `Dérogation à vérifier`.

Scénarios proposés : `Conforme`, `Début retardé`, `Fin différente`, `Période entièrement reportée`, `Rattrapage`, `Autre situation exceptionnelle`. Les statuts administratifs sont distincts : `Enregistré`, `Conforme au calendrier`, `Dérogation à vérifier`, `À corriger`, `Validé`, `Refusé`, `Annulé`.

### Apprenti

- aucune période artificielle « Année complète » ;
- année scolaire toujours choisie dynamiquement pour le classement administratif ;
- dates réelles de début et fin obligatoires et indépendantes des périodes scolaires ;
- dates autorisées en cours d'année et, si nécessaire, au-delà de la borne scolaire selon règle administrative à confirmer ;
- aucune association permanente apprenti–entreprise en v1 ;
- recherche/réutilisation d'une entreprise existante, puis photographie dans la soumission.

## 8. Recherche et confirmation de l'entreprise

La recherche existante doit être étendue, pas remplacée :

- recherche exacte par SIRET ;
- recherche dans `EUC_ENTREPRISES` par raison sociale, enseigne, futur nom d'usage et commune ;
- affichage séparé des données publiques et locales ;
- confirmation explicite de l'établissement physique par SIRET, adresse et commune ;
- second contrôle SIRET sous verrou avant toute création éventuelle.

Les informations publiques ne doivent jamais écraser automatiquement `Nom_usage_local`, `Ancien_nom`, téléphone, courriel ou commentaires internes.

## 9. Courriel administratif

Propriété obligatoire : `EUC_PFMP_NOTIFICATION_EMAIL`. Une liste séparée par des virgules est acceptable après validation stricte de chaque adresse. Aucune adresse réelle dans Git.

Objet construit côté serveur : `[PFMP] {classe dynamique} — {NOM} {Prénom} — {entreprise} — {statut}`.

Le HTML responsive doit regrouper : référence et horodatage, année/statut/diplôme/classe, identité et coordonnées du jeune, période et dates officielles, scénario et dates déclarées, motif, entreprise/SIRET/adresse, responsable/tuteur et statut initial.

Ordre transactionnel :

1. validation complète et Turnstile ;
2. écriture Grist réussie ;
3. tentative de courriel ;
4. mise à jour de l'état d'envoi.

Si le courriel échoue, la soumission reste enregistrée, passe à `Courriel à renvoyer`, et le jeune reçoit une confirmation neutre avec sa référence. Un renvoi administratif idempotent sera nécessaire.

Confirmation facultative au jeune : propriété `EUC_PFMP_SEND_STUDENT_CONFIRMATION`, désactivée par défaut jusqu'à décision.

## 10. Liens et vues par classe

Aucun nom de classe ne doit être codé dans une URL ou dans le code. Deux options compatibles :

1. une route Web App professeur `?page=pfmp-classe&classeId={recordId}` où `recordId` est validé côté serveur et le libellé relu dans `Classes` ;
2. des pages Grist privées filtrées par la référence `Classe`.

Les vues doivent montrer : jeune, période, dates, entreprise, commune, téléphone, courriel, scénario et statut. Les exemples de noms donnés dans le cahier des charges ne sont pas un catalogue à créer.

Automatisable par l'API Grist après autorisation : tables, colonnes, formules simples, données référentielles explicitement validées et éventuellement sections de vue si l'API Grist utilisée les expose de façon stable.

À réaliser/vérifier manuellement dans Grist : pages et disposition, filtres enregistrés par classe, règles ACL, groupes de professeurs, masquage des colonnes sensibles et test avec un compte non autorisé. Aucune vue contenant téléphone ou courriel de jeune ne doit être publique.

## 11. Turnstile et protections

Propriétés prévues :

- `EUC_PFMP_TURNSTILE_SITE_KEY` ;
- `EUC_PFMP_TURNSTILE_SECRET_KEY` ;
- `EUC_PFMP_TURNSTILE_EXPECTED_HOSTNAME` ;
- `EUC_PFMP_NOTIFICATION_EMAIL` ;
- `EUC_PFMP_SEND_STUDENT_CONFIRMATION`.

Flux : widget géré côté formulaire, jeton envoyé avec la soumission, appel serveur à Siteverify, contrôle de `success`, `action`, hostname, fraîcheur et unicité du jeton avant toute écriture. Le hostname réel d'une Web App HtmlService devra être observé pendant la recette avant de fixer `EXPECTED_HOSTNAME`.

Protections complémentaires : honeypot invisible accessible, temps minimal mesuré côté serveur, nonce aléatoire à usage unique conservé dans `CacheService`, verrou de script, double-clic bloqué, empreinte de doublon, quota glissant par combinaison hachée compte/classe plutôt que par IP seule afin de ne pas bloquer un établissement entier.

## 12. Plan de tests

### Référentiels dynamiques

- aucune classe/diplôme/année/période présente dans les sources HTML ou Apps Script ;
- ajout ou renommage dans Grist visible sans déploiement ;
- classe inactive masquée ;
- période sans relation rejetée avec diagnostic administratif ;
- aucune période d'une autre classe proposée.

### Dates et statuts

- scolaire conforme ; début retardé ; fin différente ; report ; rattrapage ; autre situation ;
- dates officielles immuables ;
- dates déclarées incohérentes rejetées ;
- apprenti commençant et terminant en cours d'année ;
- absence totale de la valeur « Année complète » pour un apprenti.

### Entreprises et concurrence

- entreprise existante et nouvelle ; recherche multi-critères ; confirmation ; doublon ; deux soumissions simultanées ;
- données locales non écrasées par les données publiques.

### Sécurité et résilience

- CAPTCHA absent, invalide, expiré, mauvais hostname/action et rejeu ;
- honeypot, envoi trop rapide, nonce invalide, double-clic et répétitions ;
- échec Grist sans courriel ;
- succès Grist puis échec courriel, état `Courriel à renvoyer`, puis renvoi ;
- aucun secret dans Git ou les journaux.

### Droits et données

- téléphone et courriel visibles pour un professeur autorisé ;
- invisibles pour un compte non autorisé ;
- aucune vue publique ;
- snapshots inchangés après modification d'un référentiel.

## 13. Fichiers prévus après validation — aucun créé à ce stade

À créer :

- `apps-script/EUC_PFMP_Config.gs`
- `apps-script/EUC_PFMP_Referentiels.gs`
- `apps-script/EUC_PFMP_Validation.gs`
- `apps-script/EUC_PFMP_Grist.gs`
- `apps-script/EUC_PFMP_Notifications.gs`
- `apps-script/EUC_PFMP_Turnstile.gs`
- `apps-script/EUC_PFMP_WebApp.gs`
- `apps-script/PFMP_Index.html`
- `apps-script/PFMP_Styles.html`
- `apps-script/PFMP_Scripts.html`
- `tests/run-pfmp-tests.js`
- `tests/fixtures/pfmp-referentiels.json`

À modifier :

- `apps-script/EDT.js` pour ajouter une route explicite sans toucher aux routes existantes ;
- `apps-script/appsscript.json` seulement si les autorisations réellement nécessaires l'exigent ;
- documentation d'architecture, configuration, tests et déploiement.

À ne pas modifier fonctionnellement : recherche SIRET existante, modules EDT/calendriers/alternance/TRM, `onOpen`, `onEdit`, fonctions historiques dupliquées.

## 14. Décisions restantes

1. valider `EUC_DIPLOMES`, `EUC_OFFRES_FORMATION` et les trois colonnes relationnelles proposées dans `Planning_Periodes` ;
2. confirmer la nécessité administrative de la date de naissance ;
3. confirmer si un apprenti peut déclarer des dates au-delà des bornes de l'année choisie ;
4. valider les valeurs des scénarios et statuts ;
5. décider si `Nom_usage_local` et `Ancien_nom` sont ajoutés à `EUC_ENTREPRISES` ;
6. définir les responsables des ACL et des vues Grist ;
7. confirmer la politique de conservation des données personnelles ;
8. confirmer le format de référence de soumission ;
9. confirmer les destinataires administratifs et la confirmation facultative au jeune ;
10. valider le hostname Turnstile après observation en recette.

## 15. Point d'arrêt obligatoire

Aucun schéma n'a été créé. La suite exige exactement l'autorisation :

`SCHÉMA PFMP VALIDÉ — AUTORISATION DE CRÉER DANS LA COPIE GRIST`

Cette autorisation ne vaudra que pour la copie `j1jDArBkzi7P`. Un `clasp push`, une version Apps Script ou un déploiement nécessiteront encore une deuxième autorisation explicite.

## 16. Création autorisée dans la copie Grist

Autorisation reçue le 31 juillet 2026 : `SCHÉMA PFMP VALIDÉ — AUTORISATION DE CRÉER DANS LA COPIE GRIST`.

L'installateur local idempotent `scripts/grist-apply-pfmp-schema.js`, verrouillé sur `j1jDArBkzi7P`, a créé uniquement :

- `EUC_DIPLOMES` : 5 colonnes ;
- `EUC_OFFRES_FORMATION` : 6 colonnes ;
- `EUC_SOUMISSIONS_PFMP` : 61 colonnes ;
- dans `Planning_Periodes` : `Offre_formation`, `Libelle_periode` et `Code_periode`.

La relecture authentifiée consécutive confirme tous les identifiants et types attendus. Aucun conflit de type n'a été relevé. L'installateur n'appelle aucune route d'enregistrements : aucune ligne de diplôme, offre, soumission ou période n'a été créée ou modifiée. Le fichier temporaire du jeton a été supprimé immédiatement après vérification.

Aucun `clasp push`, aucune version Apps Script, aucun déploiement, aucun courriel et aucune opération Git n'ont accompagné cette création.
