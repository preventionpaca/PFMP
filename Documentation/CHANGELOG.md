# Changelog

# Eucalyptus PFMP — v1.0.0-dev.26 — 2026-08-02

- Ajout dans la copie Grist des statuts explicites `PERIODES_DEFINIES`, `AUCUNE_PERIODE_PREVUE` et `A_VERIFIER`.
- Les cinq offres validées sans période affichent désormais un message neutre et ne sont pas comptées comme anomalies calendaires.
- Les blocs `ENT.` et d’alternance sont exclus défensivement des périodes du formulaire scolaire.
- Les identifiants techniques Grist ne sont plus insérés dans le DOM comme numéros visibles de période.
- Vérification des premières années BTS ELEC et CIEL : deux lignes sources propres à leur spécialité, avec le même intervalle officiel du 24/05/2027 au 02/07/2027 ; aucune relation croisée ni relation vers une deuxième année.

# Eucalyptus PFMP — v1.0.0-dev.25 — 2026-08-02

- Audit en lecture seule des périodes 2026-2027 dans les sept tables Grist de la copie.
- Navigation locale du suivi restructurée par catégorie, spécialité, classe puis période, sans regroupement codé en dur.
- Les classes et périodes restent affichées avant tout chargement nominatif ; les élèves ne sont demandés qu’après le choix explicite d’une période.
- Ajout d’un état explicite pour les classes sans période reliée et maintien de la pagination serveur à 50 lignes.
- Aucun déploiement Apps Script et aucune écriture Grist pour cette version locale.

## Eucalyptus PFMP — v1.0.0-dev.24 — 2026-08-01

- séparation complète du référentiel années–classes–périodes, des cohortes et des soumissions ;
- année active choisie par `Annees_Scolaires.Active`, sans dépendance à un import d’élèves ;
- compatibilité avec les valeurs historiques texte ou référence de `Planning_Periodes.Annee_scolaire` ;
- reconstruction de la synthèse : 38 classes et 51 relations certaines en 2026-2027, compteurs à zéro sans faux élève ;
- bandeaux annuels dynamiques et tableau vide explicite conservant ses huit colonnes ;
- aucune relation ambiguë créée ou affichée ; performances asynchrones de dev.23 conservées ;
- **265 tests réussis**, dont 65 contrôles dédiés au suivi.

## Eucalyptus PFMP — v1.0.0-dev.23 — 2026-08-01

- séparation du chargement initial et des compteurs : aucune lecture d’élève ou de soumission avant l’affichage des tuiles ;
- compteurs chargés ensuite de façon asynchrone, avec état « … » puis repli non bloquant en cas d’erreur ;
- création de `EUC_SYNTHESE_SUIVI_PFMP` dans la copie de recette : 38 lignes agrégées, aucune colonne nominative, actualisation idempotente ;
- tuiles entièrement cliquables, état ouvert visible et boutons de période explicites, y compris lorsqu’une seule période existe ;
- mesures anonymisées des durées par phase et cache de cinq minutes limité aux métadonnées et synthèses ;
- **260 tests réussis**, dont 60 contrôles dédiés au suivi.

## Eucalyptus PFMP — v1.0.0-dev.22 — 2026-08-01

- livraison finale du tableau de bord rapide décrit en dev.21 ;
- correction de la résolution de l’année des périodes Grist par jointure sur `Annees_Scolaires`, la colonne `Planning_Periodes.Annee_scolaire` étant une référence et non un libellé ;
- clé de cache renouvelée afin d’écarter toute métadonnée issue de la requête antérieure ;
- **254 tests réussis**, dont 54 contrôles dédiés au suivi ; version Apps Script immuable créée après validation.

## Eucalyptus PFMP — v1.0.0-dev.21 — 2026-08-01

- transformation de `?page=suivi-pfmp` en tableau de bord classe puis période, accessible en deux clics ;
- accueil limité aux années, classes, périodes, compteurs et alertes agrégés, sans transfert nominatif ;
- chargement nominatif différé, filtré et autorisé côté serveur, avec pagination plafonnée à 50 lignes ;
- cache partagé de cinq minutes limité aux métadonnées non nominatives ;
- accès rapides, fil d’Ariane, navigation responsive et mémorisation locale sans donnée personnelle ;
- séparation stricte des années et conservation de la cohorte historique Pronote 2025-2026 en lecture seule ;
- cible Grist de recette, `DRY_RUN`, courriels désactivés, Turnstile désactivé et accès `DOMAIN` conservés ;
- **254 tests réussis**, dont 54 contrôles dédiés au suivi dev.21 ; version intermédiaire remplacée par dev.22 avant recette fonctionnelle.

## Eucalyptus PFMP — v1.0.0-dev.20 — 2026-08-01

- requalification de la cohorte Pronote importée comme données historiques de recette 2025-2026 ;
- séparation annuelle des inscriptions par clé composée, sans écrasement possible d’une future cohorte 2026-2027 ;
- route `?page=suivi-pfmp` finalisée en lecture seule avec avertissement visible, filtres et compteurs historiques ;
- périodes limitées strictement à 2025-2026, avec libellé explicite lorsqu’aucune relation historique n’existe ;
- confidentialité renforcée : aucune date de naissance, identité technique, coordonnée ou motif détaillé dans la vue ;
- modes `DRY_RUN`, courriels `DISABLED`, Turnstile désactivé et cible Grist de recette conservés.
- **245 tests réussis** ; garde-fou `Mode_acces=LECTURE_SEULE` prioritaire sur les droits du rôle DDFPT ; version Apps Script immuable `20`, déploiement existant mis à jour vers `@20`.

## Eucalyptus PFMP — v1.0.0-dev.19 — 2026-08-01

- ajout du chargeur réel Pronote UTF-16 sécurisé et de l’import Grist idempotent limité à la copie de recette ;
- ajout du schéma `EUC_ELEVES_PFMP` à 37 colonnes, quatre références Grist, sans INE ni coordonnées personnelles ;
- rapprochement par IDENT, NUMERO, identité/date/classe puis changement de classe unique, en excluant les simulations DRY_RUN ;
- prévisualisation agrégée du véritable export Pronote et protection Git de tous les imports réels ;
- correction des chemins absolus de lecture Grist du Centre de suivi après contrôle post-déploiement dev.18 ;
- maintien de la fermeture par défaut et de l’absence de toute écriture ;
- **234 tests réussis**.

## Eucalyptus PFMP — v1.0.0-dev.18 — 2026-08-01

- ajout de la route interne indépendante `?page=suivi-pfmp` et du prototype « Centre de suivi des conventions de stage » ;
- contrôle serveur des rôles et classes, fermé par défaut en l’absence de table d’autorisations ;
- tableau minimal, filtres, pagination, export limité et services DRY_RUN d’historisation, affectations, visites, missions et frais ;
- aucun schéma Grist, utilisateur réel, document, courriel ou écriture métier créé ;
- **173 tests réussis**, dont 35 contrôles dédiés au suivi interne.

## Eucalyptus PFMP — v1.0.0-dev.17 — 2026-08-01

- fallback postal `98000` appliqué après normalisation uniquement aux établissements identifiés comme monégasques et dépourvus de code postal ;
- priorité absolue conservée pour tout code postal structuré ou déjà extrait ;
- voie, ville, pays, raison sociale et nom commercial inchangés ;
- non-régression couverte pour Monaco, Monte-Carlo, BMW/Mougins et les communes françaises limitrophes.
- **138 tests réussis** ; version Apps Script immuable `16`, déploiement existant mis à jour vers `@16`.

## Eucalyptus PFMP — v1.0.0-dev.16 — 2026-08-01

- synchronisation explicite du bloc motif à l’initialisation, au chargement d’une classe et d’une période, à chaque changement de situation et au retour sur l’étape Dates ;
- ajout de `aria-hidden`, nettoyage des erreurs résiduelles et maintien de `[hidden] { display: none !important; }` ;
- fonction unique `formatDateFrPourAffichage` utilisée dans les listes, le bandeau et le récapitulatif ;
- ajout d’un test Chromium sur le HTML final assemblé, les styles calculés et toutes les transitions du motif ;
- **131 tests réussis**.

## Eucalyptus PFMP — v1.0.0-dev.15 — 2026-08-01

- priorité CSS explicite à l’attribut `hidden` afin que le motif disparaisse complètement avec les dates officielles ;
- affichage des dates proposées au format français `jj/mm/aaaa` dans la liste des périodes et le bandeau des dates officielles ;
- valeurs techniques ISO conservées dans les champs et le payload serveur.

## Eucalyptus PFMP — v1.0.0-dev.14 — 2026-08-01

- titre utilisateur corrigé en « Enregistrement de convention de PFMP » ;
- première étape renommée « Votre statut » ;
- sous-titre de la période de formation en milieu professionnel conservé sans modification.

## Eucalyptus PFMP — v1.0.0-dev.13 — 2026-08-01

- retrait de l’appel `addMetaTag('description', ...)`, refusé à l’exécution par Apps Script ;
- maintien du titre du document avec `setTitle`, du titre visible et du texte d’introduction accessible ;
- conservation intégrale du comportement dynamique du motif livré en `dev.12` ;
- 120 tests locaux réussis ; modes `DRY_RUN` et `DISABLED` maintenus.

## Eucalyptus PFMP — v1.0.0-dev.12 — 2026-08-01

- nouvel intitulé utilisateur « Enregistrement de convention de stage » et sous-titre associé dans la page, le titre du document et sa description accessible ;
- masquage, désactivation et retrait de la tabulation du motif avec les dates officielles ;
- affichage obligatoire et dynamique du motif pour un début retardé ou une situation exceptionnelle ;
- effacement immédiat du motif au retour aux dates officielles, avec normalisation identique dans le payload, le récapitulatif et côté serveur ;
- maintien des dates officielles verrouillées, de la fin officielle pour un début retardé et du commentaire facultatif ;
- 120 tests locaux réussis ; modes `DRY_RUN` et `DISABLED` maintenus.

## Eucalyptus PFMP — v1.0.0-dev.11 — 2026-08-01

- fusion des composants structurés du siège avec le résultat établissement incomplet de l’API ;
- nettoyage terminal itératif du code postal, de la ville, du pays et des codes pays connus ;
- conservation des occurrences légitimes de ville ou pays au milieu du nom de voie ;
- téléphones responsable/tuteur acceptés au format du pays de l’entreprise ou au format français ;
- téléphone du jeune maintenu sur la règle française ;
- 106 tests locaux réussis ; modes `DRY_RUN` et `DISABLED` maintenus.

## Eucalyptus PFMP — v1.0.0-dev.10 — 2026-08-01

- bloc SIRET accessible et responsive ;
- normalisation centralisée des adresses API et Grist existantes, sans modification en masse ;
- libellé visible « Nom commercial » sans renommage de la colonne `Enseigne` ;
- validation et formatage des téléphones côté client et serveur pour France, Monaco et les autres pays ;
- récapitulatif structuré, sans lignes facultatives vides, avec boutons de correction ;
- 88 tests locaux réussis ; modes `DRY_RUN` et `DISABLED` maintenus.

## Eucalyptus PFMP — v1.0.0-dev.9 — 2026-08-01

- trois situations de dates seulement, contrôlées dans l’interface et côté serveur ;
- huit relations carrosserie certaines ajoutées dans la copie Grist ;
- libellés d’affichage MTNE et REMI portés par les offres ;
- adresse entreprise séparée et entreprises étrangères acceptées sans SIRET ;
- responsable déplacé dans le panneau entreprise, copie éditable vers le tuteur et dédoublonnage simulé ;
- validation progressive accessible ; 61 colonnes historiques conservées et 3 snapshots d’adresse ajoutés ;
- 64 tests locaux réussis ; modes `DRY_RUN` et courriels `DISABLED` maintenus.

## Eucalyptus PFMP — v1.0.0-dev.8 — 2026-08-01

- ajout des gardes serveur `EUC_PFMP_SUBMISSION_MODE` et `EUC_PFMP_EMAIL_MODE`, fermées par défaut ;
- seule la valeur exacte `LIVE` peut autoriser une future écriture, et seule `ENABLED` peut autoriser un futur courriel ;
- ajout du bandeau permanent « MODE RECETTE — aucune donnée ne sera enregistrée » ;
- simulation autorisée sans Turnstile configuré avec état explicite `NON_CONFIGURE_RECETTE`, tandis que le mode `LIVE` refuse toute soumission sans CAPTCHA réel ;
- ajout de deux tests de sécurité, portant le total à 48 tests locaux sans réseau réel ;
- préparation du déploiement de recette sans écriture ni courriel.

## Eucalyptus PFMP — v1.0.0-dev.7 — 2026-08-01

- ajout local de la route indépendante `?page=pfmp` au routeur historique unique ;
- création d'un formulaire responsive en huit étapes avec progression, validation par étape, conservation des données et protection contre le double-clic ;
- chargement dynamique des années, 38 offres visibles, diplômes et 43 relations certaines depuis la copie Grist, sans liste métier codée dans le HTML ou Apps Script ;
- prise en charge distincte des scolaires et apprentis, des trois scénarios de dates, des dérogations et des dates libres d'apprentissage ;
- réutilisation de la recherche SIRET et des contacts existants, sans écriture réelle ;
- préparation et test du mapping complet des 61 colonnes de `EUC_SOUMISSIONS_PFMP`, avec référence, empreinte, nonce, verrou et idempotence simulée ;
- préparation de Cloudflare Turnstile, honeypot, délai minimal, action, hostname et protection contre le rejeu, sans secret dans les sources ;
- préparation des courriels administratifs et de la confirmation facultative au jeune avec boîte simulée, y compris l'échec après écriture simulée ;
- 46 tests locaux réussis, dont les 31 tests historiques, sans appel réseau réel ;
- aucun `clasp push`, aucune version Apps Script, aucun déploiement, aucune écriture Grist et aucun courriel réel.

## Eucalyptus Entreprises SIRET — v1.0.0-dev.6 — 2026-07-31

- après autorisation explicite, création vérifiée dans la seule copie Grist de `EUC_DIPLOMES`, `EUC_OFFRES_FORMATION`, `EUC_SOUMISSIONS_PFMP` et de trois colonnes relationnelles dans `Planning_Periodes`, sans aucun enregistrement métier ;
- correction de la documentation de configuration : environnement officiel `recette` et Doc ID imposé `j1jDArBkzi7P` ;
- confirmation de 29 tests locaux réussis sous Node.js 18, sans échec ;
- diagnostic manuel Apps Script validé : `valide: true` et huit propriétés présentes, sans affichage de valeur ;
- diagnostic réseau : API publique en HTTP `200` depuis le navigateur mais en `502` depuis `UrlFetchApp` ; préparation locale d'un appel navigateur limité à l'API publique, avec contrôle Grist et mapping serveur conservés ;
- synchronisation autorisée des 23 fichiers, création de la version Apps Script `6` et mise à jour du déploiement Web App existant sans changement d'URL ni écriture Grist ;
- recherche du template `WebApp_EDT.html` étendue aux sources, aux six archives et à l'historique Git : aucune source fiable trouvée ; la route Entreprises reste indépendante, la route EDT demeure à recetter ;
- classement reproductible des 31 noms historiques dupliqués, sans suppression ni modification du code historique ;
- confirmation définitive d'un projet Apps Script unique pour EDT, calendriers, PFMP, alternance et Entreprises ;
- abandon sans suppression du projet Apps Script de recette distinct, dont aucun déploiement Web App actif ne subsiste ;
- maintien temporaire du seul module `EUC_ENT_` sur la copie Grist `j1jDArBkzi7P`, sans modifier la configuration historique EDT ;
- création de la version immuable de sauvegarde `2` avant intégration et de la version finale `5` ;
- passage du manifeste Web App principal à `DOMAIN` avec exécution `USER_DEPLOYING` ;
- ajout de la route `?page=entreprises` avant toute résolution des templates EDT absents ;
- préparation de la recette fonctionnelle et de la procédure de retour arrière ; la production Grist reste exclue des écritures de test.
- tentative d'exécutable API temporaire limitée au déployeur, refusée par Google faute d'autorisation d'exécution, puis entièrement retirée sans appel métier ni écriture Grist.

## Eucalyptus Entreprises SIRET — v1.0.0-dev.5 — 2026-07-31

- retour à l'architecture cible avec un seul projet Apps Script existant ;
- suppression du déploiement du second projet créé par erreur ; projet distant conservé, abandonné et non utilisé ;
- isolation Grist : modules historiques sur le document de production, module Entreprises sur la copie de recette ;
- suppression de toute configuration locale ciblant le second projet ;
- préparation de la comparaison finale avant le premier push vers le projet existant.

## Eucalyptus Entreprises SIRET — v1.0.0-dev.4 — 2026-07-31

- création d'un projet Apps Script autonome et vide dédié à la recette ;
- ajout d'une configuration CLASP multi-environnement séparant strictement recette et production ;
- envoi et vérification des 23 fichiers exclusivement sur la recette ;
- contrôle par empreintes confirmant que la production est inchangée ;
- aucune version, aucun déploiement Web App et aucune propriété secrète créée ; seul le `@HEAD` automatique existe.
- isolation du Doc ID Grist par propriété commune à tous les modules de recette ;
- test dynamique confirmant l'indépendance de la route Entreprises vis-à-vis des templates EDT absents ;
- préparation d'un futur déploiement de recette limité au domaine, sans le créer.
- audit authentifié réussi du schéma Grist de recette : 40 tables, schémas EUC conformes, table Relations absente ;
- tentative de diagnostic Apps Script arrêtée avant création d'un exécutable API.
- manifeste spécifique recette appliqué avec accès `DOMAIN` et exécution `USER_DEPLOYING` ;
- création de la version 1 et du déploiement Web App de recette ; aucune route métier appelée pendant l'opération.

## Eucalyptus Entreprises SIRET — v1.0.0-dev.3 — 2026-07-31

- intégration locale des 14 fichiers du projet Apps Script existant ;
- remplacement des trois clés Grist en clair par `ScriptProperties` ;
- conservation d'un seul `doGet` avec route `?page=entreprises` ;
- garde d'accès au domaine, refusant l'accès Eucalyptus par défaut ;
- manifeste historique et fonctionnalités existantes préservés ;
- aucune synchronisation ou modification Apps Script distante.

## Eucalyptus Entreprises SIRET — v1.0.0-dev.2 — 2026-07-31

- téléchargement CLASP en lecture seule des 14 fichiers du projet Apps Script existant dans un dossier temporaire ;
- audit du socle calendriers, alternance, EDT et PFMP ;
- détection d'une clé Grist en clair dans trois fichiers, sans divulgation ni copie dans Git ;
- détection de 31 noms de fonctions globales dupliqués et de deux templates HTML manquants ;
- aucune intégration, publication ou modification distante effectuée.

## Eucalyptus Entreprises SIRET — v1.0.0-dev.1 — 2026-07-31

- ossature Apps Script autonome ;
- validation SIRET et recherche API/Grist ;
- formulaire responsive et protection contre double soumission ;
- schéma Grist proposé, connecteur et installation protégée ;
- documentation, simulations et contrôles locaux.
- audit en lecture seule du schéma Grist : 38 tables et 499 colonnes, sans référentiel d'entreprises existant.
- validation du périmètre Grist v1 : `EUC_ENTREPRISES` et `EUC_CONTACTS_ENTREPRISES` uniquement ; installation idempotente préparée.
- tentative de création refusée par Grist faute d'accès d'écriture (`403`) ; aucune table partielle créée.
- création authentifiée et vérifiée des deux tables Grist v1 ; jeton temporaire supprimé après usage.
