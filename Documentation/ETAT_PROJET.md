# État du projet Eucalyptus PFMP

## Mise à jour du 5 octobre 2026 — DEV448/DEV449 (urgence saturation Grist)

- Diagnostic différentiel sur les exécutions réelles Apps Script : une affectation `EUC_SUIVI_AFFECTER_V156` a duré `814,797 s`; le déclencheur `EUC_DEV424_refreshScheduled` lancé à 08:42 a duré `1 383,047 s`; l'interface Apprentis a ensuite lancé simultanément de nombreuses exécutions `EUC_DEV225_saveApprenti`, dont plusieurs ont duré de 12 à 16 minutes. Cette concurrence explique le `429 Too many backlogged requests` et la consommation anormale.
- Mesure d'urgence : déclencheur automatique de snapshots supprimé (réinstallation possible par la fonction dédiée), deux reconstructions en cours et quatre sauvegardes Apprentis bloquées interrompues. Aucun déclencheur Apps Script ne reste actif.
- `DEV448` remplace l'affectation élève par élève par une écriture groupée : 4 à 6 appels Grist pour dix élèves, sans reconstruction générale synchrone. Le même point rapide est utilisé par l'administration et l'accès PP.
- `DEV449` supprime les sauvegardes automatiques sur chaque modification/blur de la page Apprentis. Une sauvegarde explicite lit seulement l'épisode ciblé et réalise une seule écriture, avec verrou court et dédoublonnage de 60 secondes; elle conserve notamment le code postal sous forme de texte.
- `DEV447` ajoute un coupe-circuit local : 2 minutes après un backlog, 15 minutes après un quota quotidien, sans nouvel appel Grist pendant l'ouverture du circuit; un `429` suspend aussi le déclencheur snapshot.
- Tests ciblés : 5 DEV449, 9 DEV448 et 23 DEV447 réussis. Suite complète : aucune nouvelle régression; sept échecs de référence préexistants et déjà documentés subsistent.
- Sources Apps Script distantes relues après `clasp push` : contrôles SHA-256 identiques pour les six fichiers critiques. Version immuable `799` créée, mais déploiements public et administrateur laissés sur `798` : l'application active renvoie le document Grist `b2CyeMEdVEMSsLZgmQcP6D`, tandis que les consignes du dépôt imposent la recette `j1jDArBkzi7P`. Aucun test d'écriture ni activation de la version 799 ne doit être effectué avant résolution explicite de cette divergence de cible.

## Mise à jour du 5 octobre 2026 — DEV447

- Version Apps Script immuable active : `798` sur les déploiements public et administrateur existants ; URL, `DOMAIN` et déployeur conservés.
- Nouvelle entrée `Paramétrage → Consommation API Grist`, réservée à l’administration.
- Le compteur est conservé dans les propriétés Apps Script, jamais dans Grist : total quotidien PFMP, succès, erreurs, erreurs `429`, durée moyenne, répartition fonctionnelle et historique glissant de 31 jours.
- Périmètre explicite : uniquement les appels effectués par PFMP depuis DEV447. Il ne reconstitue pas les appels antérieurs et ne compte pas les autres applications utilisant le même document Grist.
- Le plafond affiché est le quota configuré de `40 000` appels. L’heure de renouvellement reste indiquée « non vérifiée » tant que Grist ne la documente pas.
- Contrôle réel après déploiement : le chargement de TMP3D dans la gestion des apprentis a produit `26` appels comptés, dont `6` classés Apprentis, `4` Snapshots et `2` Imports/élèves ; aucune erreur ni `429` pendant ce contrôle.
- Afficher ou actualiser le tableau de consommation ne déclenche aucun appel Grist.
- Tests DEV447 : 23 réussis, couvrant le comptage, la passerelle Entreprises, l’absence de donnée métier enregistrée et le contrôle d’accès administrateur. La passerelle PFMP a en plus été vérifiée sur le déploiement réel par le chargement de TMP3D.
- Grist autorisé inchangé : recette `j1jDArBkzi7P` uniquement ; production `3pnVrygfNn7c` non consultée.

## Mise à jour du 5 octobre 2026 — DEV446

- Version Apps Script immuable active : `795` sur les déploiements public et administrateur existants.
- Résilience Apprentis : l'épuisement du quota Grist (`429`) n'interrompt plus le rendu avec une page blanche et une erreur technique. La route affiche désormais un écran maîtrisé, sans nouvelle tentative automatique, avec actions « Réessayer » et retour administration.
- Contrôle réel après déploiement : `apprentis.loucodi.fr` et la route administrateur Apprentis chargent de nouveau leurs classes ; le quota journalier Grist s'était renouvelé au moment du contrôle.
- Tests DEV446 : 10 réussis, couvrant le `429`, les autres indisponibilités et le chemin nominal.
- Correctif performance : lecture du dernier snapshot enrichi pendant sa reconstruction, suppression des reconstructions synchrones sur les pages famille/détail et résumé global compact sans aller-retour normal au clic.
- Correctif géocodage : candidats construits depuis les snapshots annuels, déduplication SIRET/adresse, géocodage limité aux nouvelles adresses ou adresses modifiées et écritures Grist regroupées.
- Audit et chronométrages : voir `Documentation/AUDIT_PERFORMANCE_DEV445.md`.
- Tests DEV445 : 16 réussis. La suite globale conserve sept échecs de référence déjà présents dans le socle Git ancien ; aucun test n'a été affaibli.
- Point DNS : le sous-domaine opérationnel contrôlé est `apprentis.loucodi.fr` (pluriel). L'ancien libellé singulier `apprenti.loucodi.fr` désigne une entrée distincte.
- Grist autorisé inchangé : recette `j1jDArBkzi7P` uniquement ; production `3pnVrygfNn7c` non consultée.

- Version stable et active : `Eucalyptus PFMP — v1.0.0-dev.27`.
- Version locale : dev.27.
- Version Apps Script immuable active : 26 avant la mise à jour documentaire/configuration de cette intervention ; version 25 conservée pour rollback.
- Référence Git : commit `14aa728`, tag annoté `v1.0.0-dev.27`, `main` aligné avec `origin/main` au début de l’intervention.
- Grist autorisé : copie `j1jDArBkzi7P` uniquement. Production `3pnVrygfNn7c` interdite.
- Web App : `https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec`.
- Routes : `pfmp`, `suivi-pfmp`, `import-pronote-pfmp`, `gestion-pfmp`, `entreprises` ; routeur EDT historique conservé.
- Modes exigés : soumissions `DRY_RUN`, courriels `DISABLED`, import Pronote `DRY_RUN`, mutations administratives `DRY_RUN`, Turnstile désactivé, accès `DOMAIN`.
- Actif : formulaire PFMP, recherche entreprise, suivi paginé et multiannuel, import Pronote en prévisualisation, gestion administrative consultable.
- Préparé mais désactivé : import réel, mutations de convention, annulation, affectations, courriels et ordres de mission.
- Tables PFMP principales : `EUC_OFFRES_FORMATION`, `EUC_OFFRES_PERIODES`, `EUC_ELEVES_PFMP`, `EUC_SOUMISSIONS_PFMP`, `EUC_SYNTHESE_SUIVI_PFMP`, `EUC_UTILISATEURS_PFMP`, `EUC_IMPORTS_PRONOTE_PFMP`, `EUC_HISTORIQUE_SOUMISSIONS_PFMP`, `EUC_PERSONNELS_PFMP`, `EUC_AFFECTATIONS_PFMP`.
- Tests : `node tests/run-tests.js` ; dernier résultat avant cette intervention : 318 réussis.
- Blocage connu : la recette visuelle authentifiée finale doit être réalisée avec une session institutionnelle.
- Reprise exacte : contrôler la prochaine reconstruction planifiée du résumé compact, puis traiter la page Destinataires/envois et poursuivre les mesures de performance différentielles.
