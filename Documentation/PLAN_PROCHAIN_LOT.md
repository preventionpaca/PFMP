# Prochain lot après DEV486

DEV486 normalise toutes les URL calculées par Apps Script vers la forme
Workspace partageable `/a/macros/<domaine>/s/...`. La recette navigateur doit
reprendre sur le canal bleu en contrôlant le passage de l'accueil public à BAC
PRO, le retour vers l'administration bleue et la page Apprentis. Ne pas
homologuer le candidat tant que les routes encore signalées en erreur ne sont
pas validées.

Le lot DEV485 rend le canal bleu immédiatement identifiable sur toutes les
pages, maintient toute sa navigation dans le même `/dev` et restaure l'accès
administrateur réservé aux éditeurs du projet bleu. La prochaine étape reste
une recette navigateur des 25 routes avant toute homologation ou promotion.

## Lot DEV484 conservé

Le lot DEV484 corrige dans les sources du canal bleu les infobulles Apprentis,
la remontée des affectations visiteur dans les ordres de mission et les trois
régressions visuelles de l'accueil du suivi. La version verte `881` n'a pas été
modifiée. La prochaine action est une recette authentifiée sur le lien `/dev` :
contrôler un KPI Apprentis deux fois de suite, TRMO / PFMP n°1 avec M. Jérôme
Huart, l'accueil administratif du suivi, puis la route publique dédiée. Ne pas
générer de PDF et ne pas envoyer de courriel pendant cette recette.

Le projet bleu séparé existe et le workflow sait désormais publier le bleu,
puis promouvoir exactement le même paquet vers le projet vert. Les deux Web
Apps stables restent sur `881`.

Priorité immédiate : ouvrir l'éditeur bleu, exécuter
`EUC_RELEASE_configurerProjetBleu`, saisir manuellement une clé Grist limitée à
la copie de recette `j1jDArBkzi7P`, puis exécuter
`EUC_RELEASE_controlerProjetBleu`. Ne jamais copier une clé ayant accès à la
production. Après ce contrôle, lancer `scripts/pfmp-release.sh prepare` et
valider les 25 routes du nouveau canal bleu avant toute évolution fonctionnelle.
Comme l'URL `/dev` est réservée aux éditeurs, le contrôle terminal non connecté
retourne `Authorization needed`; la validation doit donc être effectuée dans un
navigateur Google Workspace connecté tant qu'un contrôle automatisé authentifié
n'a pas été mis en place. Après contrôle réel des 25 routes, homologuer le SHA
exact avec `scripts/pfmp-release.sh approve-development COMMIT
25-ROUTES-VALIDEES`; la commande relit l'empreinte distante et ne modifie aucun
déploiement vert.

Le prochain déploiement doit obligatoirement utiliser le workflow bleu / vert
décrit dans `Documentation/RELEASE_BLEU_VERT.md`. `prepare` ne modifie que le
projet de développement séparé ; `promote` est la seule commande autorisée à
copier le candidat validé dans le projet stable et à actualiser ses deux Web
Apps, après contrôle des 25 routes et avec retour automatique sur les versions
précédentes en cas d'échec.

DEV481 restaure les routes de l'accueil PFMP à partir d'un paquet complet et
isole les anciens routeurs optionnels. La variable `baseUrl` de la page Snapshot
est corrigée et cette route passe sur le canal bleu. La promotion reste bloquée
uniquement par la divergence de configuration partagée décrite ci-dessus.

DEV480 est publié en version immuable `880` sur les deux Web Apps existantes. Cette version est la première publication effective des réglages DEV478/DEV479 après correction du répertoire de préparation Apps Script. Le contrôle navigateur réel montre les champs `Texte de {{EXPEDITEUR}}`, `Lien de la procédure` et `Copie conforme systématique`. Aucun courriel de recette n'a été envoyé.

DEV479 met systématiquement `bfe@lycee-les-eucalyptus.org` en copie conforme par défaut pour les courriels prévisionnels et définitifs ; l’adresse est modifiable dans la gestion des modèles et apparaît dans la confirmation puis dans le résultat d’envoi. La publication effective est incluse dans DEV480 / version `880`.

DEV478 rend le mot « procédure » des courriels d’ordre de mission cliquable vers la fiche Drive sans afficher l’URL, tout en conservant un corps texte de secours. La signature `{{EXPEDITEUR}}` et le lien se règlent directement dans `Ordres de mission → Gérer les modèles de courriel`; la signature par défaut est `Bureau des entreprises`. La publication effective est incluse dans DEV480 / version `880`.

DEV477 est publié en version immuable `877` sur les deux Web Apps existantes. La première page décale le tableau des élèves d’environ `1 cm` vers la droite. La seconde page ménage environ `3 mm` entre le tableau et les signatures, sépare verticalement les deux encarts et centre leurs libellés. Aucun ordre réel n’a été généré pendant le déploiement : le prochain contrôle doit consister à régénérer un seul PDF depuis l’interface et à vérifier visuellement les deux pages avant tout autre ajustement.

DEV476 est publié en version immuable `876` sur les deux Web Apps existantes. Les objets et corps des courriels d’ordre de mission sont maintenant administrables séparément pour le prévisionnel et le définitif, avec variables contrôlées, prévisualisation et identification explicite du compte expéditeur. Aucun courriel de recette n’a été envoyé. Si une preuve applicative durable d’envoi devient nécessaire, décider séparément entre un journal d’envoi non nominatif et un passage à `GmailApp`, qui élargirait les autorisations Gmail.

DEV470 est publié en version immuable `863` sur les deux Web Apps existantes. Tous les liens actifs « Accueil PFMP » suivis dans Git visent `https://alternance.loucodi.fr/`; les clics réels depuis la synthèse et un détail de classe reviennent au centre administrateur sans page blanche. Les contrôles automatisés couvrent également Apprentis, migration JotForm et géocodage.

DEV468 est publié : après autorisation explicite, les 50 versions anciennes non déployées `664` à `713` ont été supprimées, puis la version immuable `858` a été publiée sur les deux Web Apps existantes, URL inchangées. Les déploiements actifs historiques ont été conservés.

DEV469 est publié en version immuable `859` sur les deux Web Apps existantes. La révision de la table pilote une réconciliation ciblée année/classe/période uniquement après une mutation. Le contrôle navigateur TMVA1, avec passage par une autre classe puis retour, conserve les affectations visiteur déjà enregistrées sur `24` des `25` élèves sans nouvelle écriture.

0. Après suppression éventuelle des pointillés dans le modèle source, refaire un seul contrôle visuel sur les huit pages sans déplacer les libellés, les marges, l’ordre ni le nombre de pages. Pour préremplir nationalité, lieu de naissance ou NIR, identifier d’abord une source autorisée et des colonnes explicites ; ne jamais les déduire de l’INE ou du responsable légal.

1. Observer une journée complète dans `Paramétrage → Consommation API Grist` et comparer le total PFMP aux informations que pourra fournir le support Grist; ne pas assimiler l'estimation PFMP au compteur officiel du document.
2. Conserver le déclencheur de snapshots désinstallé tant que son remplacement incrémental n'est pas prêt. Le futur traitement doit être différentiel, plafonné et interrompu immédiatement par le coupe-circuit.
3. Valider l'affectation par code PP sur un lot réel limité. L'affectation administrateur est validée; le chemin PP est couvert par les tests mais n'a pas utilisé de code nominatif réel pendant DEV452.
4. Réduire encore les lectures de structure : mutualiser en priorité `/tables` et les métadonnées répétitives. Objectif suivant pour la liste Apprentis : passer de `5,586 s` à moins de cinq secondes de façon reproductible à froid.
5. Étendre les mesures différentielles aux autres pages publiques et administratives, sans lancer simultanément des traitements qui fausseraient les résultats ou consommeraient inutilement le quota.
6. Transformer Destinataires/envois en coquille légère avec chargement ciblé; objectif inférieur à cinq secondes.
7. Conserver la suite complète à `560/560` et ajouter chaque nouvelle route à la matrice bleu / vert avant publication.
8. Conserver les modes protégés : Pronote `DRY_RUN`, courriels `DISABLED`, aucun envoi ni ordre de mission de test, aucune consultation de la production Grist `3pnVrygfNn7c`.
