# État du projet Eucalyptus PFMP

## Mise à jour du 9 octobre 2026 — DEV530 (coordonnées et contrat visuel du suivi)

- Le repli des anciens imports JotForm n'exige plus systématiquement un SIRET.
  Il rapproche d'abord l'élève, la classe et les dates exactes, puis seulement
  une correspondance unique élève-classe ou élève. Une divergence de nom,
  téléphone ou courriel rend la clé ambiguë et interdit tout choix arbitraire.
- Les anciens alias d'élève, de classe, de responsable et de dates sont
  normalisés. Les champs déjà portés par la convention, les références Grist
  entreprise/contact et les valeurs canoniques restent prioritaires.
- Le chemin ancien de détail de classe applique le même enrichissement que la
  vue canonique. Si aucun téléphone ou courriel nominatif n'existe, les
  coordonnées générales de l'entreprise restent le dernier repli affichable.
- Le marqueur de détail passe à `DEV530-C13` : toutes les fiches de classe
  précédemment mises en cache sont rejetées et reconstruites.
- Lors d'un chargement ciblé, les accès convention sont filtrés par année et
  classe avant les lectures entreprise, contact et JotForm. Le changement de
  classe n'enrichit donc plus les centaines de conventions de l'année.
- « Convention enregistrée » et « APPRENTI » sont verts à texte blanc. Le
  repère `A` et le fond jaune apprenti restent inchangés. Les absences de
  convention et les ruptures restent rouges sur fond rose. Une nouvelle
  convention active après rupture redevient l'état courant vert, sans effacer
  l'historique rouge.
- La pastille technique « ENVIRONNEMENT VERT — VERSION EN LIGNE » est retirée
  du vert. Le bandeau bleu reste seulement dans l'archive de recette.
- Le contrat anti-régression est inscrit dans `DECISIONS_METIER.md` et dans le
  contrat qualité. Treize tests ciblés DEV528/DEV530 couvrent les sources de
  coordonnées, les ambiguïtés, le filtrage avant enrichissement, les couleurs,
  le fond apprenti et les deux rendus. La suite complète passe `744/744`.
- Aucun accès à la production Grist ni aucune écriture métier n'a été exécuté
  par ces tests. La validation nominative réelle reste distincte de la
  validation du code et des routes.

## Mise à jour du 9 octobre 2026 — DEV529 (placement précis du PDF de convention)

- La page « Paramètres de la convention » expose maintenant les douze zones
  imprimées : onze lignes métier et le QR code. Pour chacune, l'administrateur
  peut régler la page, X, Y, la largeur et la hauteur en points PDF.
- Le repère est documenté dans l'interface : origine au coin inférieur gauche
  de l'A4, X vers la droite, Y vers le haut et `1 mm = 2,835 points`. Pour
  descendre une zone, il faut donc diminuer Y.
- Un aperçu du PDF maître superpose les cadres et un point d'ancrage au coin
  inférieur gauche. Le changement de page et les modifications de coordonnées
  sont visibles avant enregistrement.
- Le QR conserve sa taille renforcée de `92 × 92 pt` et sa position par défaut
  descend de `12 pt` (`Y 716` vers `Y 704`) afin de rester sous le bord
  supérieur du tableau du nouveau modèle.
- La mise en page est conservée dans les propriétés Apps Script, hors Grist :
  aucun schéma métier ni donnée de convention n'est modifié. Les valeurs sont
  validées contre la page A4 avant enregistrement et le moteur garde les
  coordonnées historiques comme repli.
- Le chargement, la sauvegarde et l'aperçu passent par le pont serveur déjà
  éprouvé par les modèles Word/PDF. Le chargement initial possède lui aussi un
  délai borné et ne peut plus rester indéfiniment sur « Chargement ».
- Neuf tests DEV529 couvrent les limites A4, la persistance, le transport dans
  le payload PDF, le QR, l'aperçu, le contrat des boutons asynchrones et la
  syntaxe des scripts intégrés. La suite complète passe `736/736`.
- Le commit applicatif `b91745a` est publié sur les deux Web Apps vertes en
  version immuable `918` ; les `25/25` routes sont valides. Le contrôle visuel
  authentifié confirme le chargement des douze zones, l'aperçu du PDF maître,
  dix repères sur la page 1 et deux repères sur la page 2.

## Mise à jour du 9 octobre 2026 — DEV528 (responsables JotForm et démarrage public)

- Les exports JotForm réels contiennent bien `Nom du responsable`,
  `Téléphone entreprise` et `Adresse e-mail de l'entreprise`. L'ancien mapping
  importait le tuteur mais ne transportait pas ces trois informations dans
  l'accès convention, alors qu'elles restaient disponibles dans le `Raw_JSON`
  du tampon validé.
- Les vues de classe et les ordres de mission complètent désormais en lecture
  seule les champs manquants depuis la ligne JotForm validée correspondant au
  même élève, à la même classe et au même SIRET. Un rapprochement ambigu ou une
  ligne non validée est ignoré ; les valeurs déjà portées par la convention
  restent prioritaires.
- Les prochains imports JotForm écrivent directement le nom et les coordonnées
  du responsable dans les colonnes canoniques de la convention.
- Le premier affichage public relisait un snapshot volumineux avec jusqu'à
  soixante appels successifs à `getProperty`, puis devenait rapide grâce au
  cache. Les blocs persistants sont maintenant obtenus par un seul
  `getProperties`, sans reconstruction métier sur le chemin de consultation.
- Le marqueur de détail passe à `DEV528-C12` afin de rejeter les anciennes
  fiches de classe dépourvues des coordonnées JotForm. Six tests dédiés couvrent
  restauration, refus des lignes non validées, prochains imports, invalidation
  du cache et lecture groupée du premier chargement.

## Mise à jour du 9 octobre 2026 — DEV527 (adresse SIRET complète)

- Le diagnostic comparatif des SIRET `45218779200034` et `49141406600036`
  confirme que l'API officielle fournit une adresse complète dans les deux cas.
  Pour le second, elle fournit `43 B BOULEVARD PIERRE SEMARD`, le complément
  `IMMEUBLE BEL CANTO`, le code postal `06300` et la ville `NICE`.
- La différence provenait du chemin local : une fiche Grist trouvée par SIRET
  était utilisée même si sa rue était vide, empêchant l'appel à l'API. Une
  fiche locale n'est désormais prioritaire que si raison sociale, voie, code
  postal et ville sont tous renseignés.
- La réponse officielle complète est gardée quinze minutes côté serveur pour
  la validation finale du formulaire QR. Aucun enregistrement entreprise Grist
  n'est modifié automatiquement par cette réparation.
- Cinq tests dédiés couvrent fiche complète, fiche locale partielle, réponse
  NGE exacte, validation finale et refus d'une identité sans rue. La suite
  complète passe `721/721`.

## Mise à jour du 9 octobre 2026 — DEV526 (stabilité des parcours opérationnels)

- La colonne « Coordonnées entreprise » restait vide pour les PFMP alors que
  les responsables étaient présents dans Grist. Le code d'enrichissement était
  correct, mais les fiches de classe acceptaient encore le marqueur de cache
  antérieur à cet enrichissement. Le marqueur canonique passe à `DEV526-C11` :
  les anciennes fiches sont rejetées et reconstruites avec le nom, le prénom,
  le téléphone et le courriel du responsable disponibles.
- Les boutons d'affectation téléphonique et visiteur rendent maintenant leur
  état initial après succès, erreur et délai de vingt-cinq secondes. Une
  réponse tardive est ignorée et le message demande de recharger la classe
  avant de relancer ; l'écriture serveur reste un upsert et ne crée pas de
  doublon.
- Depuis une fiche de classe, « Ordres de mission » transmet la cible exacte
  et les dates affichées. La page charge immédiatement ce seul détail sans
  reconstruire le catalogue des trois familles. Son bouton est rétabli après
  succès, erreur ou délai de trente secondes.
- Le générateur de conventions lit Classes, Élèves et Périodes en un seul
  appel réseau parallèle, puis mémorise le résultat dix minutes avec une clé
  liée aux révisions Grist. Il ne dépend plus de trois lectures successives qui
  pouvaient dépasser le délai de vingt secondes.
- Une convention existante de mêmes élève, période et dates est reprise sans
  doublon. Si les dates diffèrent, la génération est refusée et renvoie vers le
  dossier administratif. Toutes les impressions utilisent désormais
  l'identifiant durable `rid`, ce qui permet de rééditer une convention après
  fermeture du navigateur, y compris le remplacement relié à une rupture.
- Après fusion locale, le PDF reste téléchargeable immédiatement puis est
  archivé dans Drive sous `Eucalyptus PFMP/Conventions PDF/année/niveau/classe/
  période`. Le lien et la taille sont conservés dans la convention Grist et
  réaffichés dans l'administration. Un échec d'archivage ne retire jamais le
  PDF déjà produit au navigateur.
- Le remappage SIRET strict conserve désormais explicitement `numeroVoie`, le
  nom donné par le service entreprise et le cache Grist à la rue normalisée.
  Le test reproduit la réponse exacte où raison sociale, code postal et ville
  étaient présents mais où la rue disparaissait avant l'affichage QR.
- Les tests dédiés DEV526 passent `8/8` et la suite complète passe `716/716`.
  Les actions réelles d'affectation, de création de convention, d'ordre de
  mission et d'archivage n'ont pas été déclenchées par les tests.

## Mise à jour du 9 octobre 2026 — DEV524 (chargement du générateur consolidé)

- Le blocage « Chargement… » du générateur de conventions a été reproduit sur
  le vert. La page lançait trois exécutions Apps Script concurrentes ; elles
  relisaient au total trois fois les classes et deux fois les élèves, puis la
  page attendait les trois réponses sans aucun délai maximal.
- Le générateur utilise maintenant un seul point serveur cohérent. Il lit une
  seule fois les classes, une seule fois les élèves et une seule fois les
  périodes, puis construit dans la même exécution les listes d'élèves, de
  promotions et de périodes officielles.
- Un délai de vingt secondes garantit que l'interface quitte toujours l'état
  « Chargement… ». En cas de panne durable, les trois listes affichent leur
  état vide et un message précis demande de recharger, au lieu de laisser la
  page bloquée sans explication.
- Le test DEV488 vérifie le nombre exact de lectures, la réponse consolidée,
  l'absence des trois anciens appels concurrents et le délai maximal. Les tests
  ciblés passent.
- Une première publication du seul lot DEV523 a été interrompue dès le
  signalement utilisateur. Les deux Web Apps actives sont restées sur la
  version immuable `906` ; aucun déploiement n'a été déplacé.
- Une première publication combinée en version `907` a ensuite validé `24/25`
  routes mais la route publique `suivi-conventions-public` a dépassé deux fois
  le délai de soixante secondes. Le rollback automatique a remis les deux Web
  Apps sur `906`. Isolée après le rollback, cette route a répondu en `4,848 s`.
- Son démarrage sans paramètre d'année appelait encore le contexte annuel
  Grist. Il utilise maintenant l'année scolaire courante calculée localement ;
  la consultation d'une année explicitement demandée reste inchangée. La suite
  complète finale passe `708/708`.

## Mise à jour du 9 octobre 2026 — DEV523 (géocodage Grist résilient et régressions opérationnelles)

- La cause du refus Grist `400` pendant le géocodage a été isolée : la table
  `EUC_GEO_ENTREPRISES_PFMP` pouvait avoir été créée avant l'ajout de la
  colonne `Commune`, alors que le moteur tentait ensuite de l'écrire. Le
  contrôle de schéma existait mais n'était jamais appelé par le parcours
  courant.
- L'ouverture de l'outil et toute écriture de coordonnées contrôlent maintenant
  le schéma et ajoutent uniquement les colonnes structurelles absentes. Le
  contrôle réussi est mémorisé six heures sous une nouvelle clé de version.
- Les adresses sont enregistrées par sous-lots de dix. Si Grist refuse un
  sous-lot, chaque adresse est rejouée séparément : les adresses valides restent
  acquises, l'adresse fautive demeure à traiter et l'interface affiche le bilan
  partiel au lieu de perdre les quarante résultats du lot.
- Le géocodage complet reste plafonné à quarante recherches par exécution et
  reprend automatiquement les adresses restantes. Il s'arrête proprement sur
  une adresse refusée et peut être relancé sans retraiter les coordonnées déjà
  enregistrées.
- Le même lot corrige le voile « Chargement des données... » déclenché par des
  cartes non navigables, ajoute « Nom commercial / enseigne » à la correction
  administrative d'une convention et normalise les anciens alias JotForm pour
  restaurer le responsable entreprise dans les listes de classe.
- Les tests ciblés passent (`25/25` géocodage, `11/11` coordonnées entreprise,
  `4/4` régressions opérationnelles) et la suite complète combinée avec
  DEV524 et l'allègement de la route publique passe `708/708`.
  Aucun géocodage réel, aucune convention et aucune donnée nominative n'ont été
  écrits pendant les tests.

## Mise à jour du 9 octobre 2026 — DEV522 (remplacement après rupture retrouvable)

- Une convention enregistrée comme `INTERROMPUE` pouvait disparaître de la
  recherche annuelle de « Administration des conventions » lorsque les champs
  utilisés par l'ancien filtre d'éligibilité étaient absents. Le bureau ne
  pouvait alors plus rouvrir la convention d'origine pour créer son
  remplacement relié.
- Le filtre commun conserve désormais explicitement les conventions
  `INTERROMPUE`, y compris après révocation de leur ancien QR. Elles restent
  consultables dans l'administration, tandis que la création du remplacement
  continue d'exiger l'ouverture de la convention d'origine, de nouvelles dates
  et un motif.
- Le générateur général n'est pas utilisé pour ce parcours : le bouton
  « Créer la nouvelle convention après rupture » maintient le lien historique,
  ne copie aucune entreprise et génère un nouveau QR propre au remplacement.
- Un test dédié reproduit une convention interrompue sans les anciens champs
  d'éligibilité, vérifie sa présence dans la bonne année et son absence d'une
  autre année. Les tests ciblés passent et la suite complète passe `698/698`.
  Aucune donnée Grist ni convention réelle n'a été créée ou modifiée.
- Le commit applicatif `3a38bed91430375aeb2ab9d31b26d9779cbf012f` a été
  publié sur les deux Web Apps vertes existantes dans la version Apps Script
  immuable `906`. Le projet distant a été relu après le push et les `25/25`
  routes vertes sont valides ; aucun rollback n'a été nécessaire. La présence
  du dossier réel interrompu n'a pas été contrôlée nominativement afin de ne
  pas lire les données de production sans autorisation explicite.

## Mise à jour du 9 octobre 2026 — DEV521 (noms des jeunes dans l’administration des conventions)

- La liste « Administration des conventions » affichait « Jeune non
  renseigné » alors que la convention était bien reliée à un élève. La cause
  était le lecteur commun des références Grist : pour la forme sérialisée
  `["L", id]`, il tentait de convertir le marqueur `L` en identifiant et ne
  retrouvait donc jamais la fiche élève.
- Le lecteur accepte désormais les références numériques, les listes Grist,
  les objets portant un identifiant et les alias historiques réellement
  utilisés. La liste, la recherche et le détail d'une convention partagent la
  même résolution ; les instantanés de nom restent un repli lorsque la
  référence n'existe pas.
- La route prioritaire n'utilise plus l'ancien cache HTML nominatif P3.2, dont
  la clé ne distinguait pas les versions publiées. Elle appelle directement le
  chargeur courant et ses lectures groupées afin qu'un ancien onglet ne puisse
  pas réinjecter une liste périmée après publication.
- Quatre tests dédiés couvrent la forme `["L", id]`, l'affichage, la recherche,
  le détail et le repli historique. Les tests ciblés connexes passent et la
  suite complète passe `697/697`. Aucune donnée Grist ni convention n'a été
  modifiée par le correctif ou ses tests.
- Le commit applicatif `b779e5f41e9fe40e876633bc5d90578f46171e4f` a été
  publié sur les deux Web Apps vertes existantes dans la version Apps Script
  immuable `905`. Le projet distant a été relu après le push et les `25/25`
  routes vertes sont valides ; aucun rollback n'a été nécessaire.
- Le contrôle réel en lecture seule sur la Web App verte administrateur a
  chargé `129` dossiers pour `2026-2027`. Une recherche générique a affiché
  `20` propositions avec une identité élève et `0` occurrence de « Jeune non
  renseigné ». Aucun dossier n'a été ouvert et aucune action métier n'a été
  exécutée.

## Mise à jour du 9 octobre 2026 — DEV520 (canaux du centre et responsable entreprise)

- Le centre d'administration inversait les deux Web Apps vertes : les outils
  d'administration, dont « Administration des conventions », étaient envoyés
  vers le déploiement public, tandis que les deux accès de consultation
  utilisaient le déploiement administrateur. Les destinations sont maintenant
  injectées explicitement selon leur rôle avant le rendu ; aucun identifiant de
  déploiement n'est conservé dans le modèle du centre.
- La même correction est appliquée aux navigations administratives secondaires
  du suivi, du dossier d'apprentissage et du changement de classe. Une page
  publique conserve son URL publique et une page d'administration conserve son
  URL administrateur, même si les deux déploiements partagent le même projet
  Apps Script.
- La colonne « Coordonnées entreprise » ne délègue plus son rendu à l'ancien
  formateur qui ignorait les coordonnées générales déjà enrichies. Elle affiche
  le responsable explicite, reconnaît les anciens noms de colonnes, respecte la
  case « tuteur identique au responsable », puis utilise téléphone et courriel
  généraux de l'entreprise en dernier recours.
- Lorsqu'une entreprise possède plusieurs contacts, un contact explicitement
  qualifié de responsable, représentant, signataire ou dirigeant est retenu
  seulement s'il est unique. En cas d'ambiguïté, aucune personne n'est choisie
  arbitrairement. L'enrichissement reste groupé et strictement en lecture seule.
- Le marqueur canonique passe à `DEV520-C10` pour invalider les anciennes vues
  de classe où la colonne restait vide. Les tests ciblés couvrent les liens des
  deux canaux, les alias historiques, le responsable distinct du tuteur, le cas
  « tuteur responsable », le repli entreprise et le refus d'un choix ambigu.

## Mise à jour du 9 octobre 2026 — autorisation permanente de publication verte

- Chaque lot applicatif terminé est désormais publié automatiquement sur les
  deux Web Apps vertes existantes après tests complets, relecture du diff,
  commit et push Git. Aucune nouvelle confirmation de déploiement n'est requise.
- Cette règle ne modifie aucune protection métier : production Grist, import
  réel, écriture élève ou convention, courriel, ordre de mission et activation
  LIVE restent interdits sans autorisation explicite propre à l'action.
- Le contrat est protégé par un test dédié et la suite complète passe `687/687`.
- Le commit exact `c994f107c066ae0c746653b69d2e29f2efbbf1ce` a été publié
  automatiquement sur les deux Web Apps vertes existantes dans la version Apps
  Script immuable `902`. Le projet distant a été relu après le push et les
  `25/25` routes vertes sont valides ; aucun rollback n'a été nécessaire.

## Mise à jour du 9 octobre 2026 — DEV519 (QR et coordonnées entreprise PFMP)

- Le formulaire QR pouvait afficher un SIRET prérempli de quatorze chiffres
  tout en conservant le compteur à `0 / 14`. Le remplissage JavaScript ne
  déclenchait pas le contrôle `input`. Le compteur, l'état du bouton de
  recherche et la validation sont désormais recalculés après chaque
  préremplissage ou résultat officiel.
- Lorsque « tuteur identique au responsable » était coché, les cinq champs
  tuteur masqués restaient marqués `required` par une seconde couche de
  validation. La validation applicative les ignorait, puis la validation HTML
  native bloquait l'enregistrement avec le message générique observé. Leur
  caractère obligatoire et leur astérisque suivent maintenant réellement la
  case. Une autre erreur HTML nomme désormais le champ concerné.
- Dans le suivi de classe, les apprentis recevaient leurs coordonnées depuis la
  fiche apprentissage, mais les PFMP n'utilisaient que les copies présentes sur
  la convention. Lorsqu'elles étaient vides, les coordonnées pourtant
  disponibles dans la fiche entreprise ou le contact lié n'étaient pas
  affichées. Le détail privilégie toujours les valeurs historiques de la
  convention, puis complète en lecture seule depuis la fiche entreprise et le
  contact explicitement lié. Une entreprise sans référence directe peut être
  retrouvée par son SIRET ; un contact non lié n'est repris que s'il est unique
  et actif, afin de ne jamais choisir arbitrairement entre plusieurs personnes.
- L'enrichissement est groupé pour toute la famille : au plus une lecture des
  entreprises et une lecture des contacts, jamais une requête par élève. Aucun
  formulaire QR, aucune convention et aucune donnée Grist n'ont été écrits
  pendant le diagnostic et les tests.
- Les tests ciblés DEV519 passent `6/6`, les contrôles connexes DEV513,
  DEV459 et DEV511 passent `42/42`, et la suite complète passe `687/687`.
  Le correctif est publié sur le vert dans la version immuable `902`.

## Mise à jour du 9 octobre 2026 — DEV518 (spinner des boutons réellement occupés)

- Le spinner transversal confondait l'état fonctionnel `disabled` avec une
  opération asynchrone en cours. Les boutons `Affecter`, normalement
  indisponibles tant qu'aucun élève et aucun professeur ne sont sélectionnés,
  tournaient donc dès le rendu de la fiche sans qu'aucune action ait été
  déclenchée.
- Un bouton désactivé reste désormais immobile. Le spinner transversal ne
  s'affiche que si le bouton vient d'être cliqué puis est désactivé par son
  traitement, ou si la page le marque explicitement avec `aria-busy` ou la
  classe `busy`. Le marqueur temporaire est supprimé dès que le bouton redevient
  disponible.
- La simulation couvre les trois états : indisponible sans animation, traitement
  réel animé et retour à l'état normal. Tests ciblés : `9/9` pour le canal de
  rendu et `13/13` pour le workflow de publication. Suite complète : `679/679`.
  Ce correctif est publié sur le vert dans la version immuable `902`.
- Le contrôle de non-régression nomme maintenant les deux autres écrans signalés :
  le bouton « Ouvrir le dossier » de l'administration des conventions et le
  bouton de vérification de la saisie QR restent immobiles tant qu'aucune action
  n'est en cours. Le point d'entrée commun du paquet applique ce contrat à toutes
  les routes vertes.
- Après ajout de cette couverture explicite, la suite complète passe `687/687`.
- Le contrôle HTTP ciblé des pages vertes « Administration des conventions » et
  « Accès sécurisé PFMP » confirme le contrat corrigé : bouton inactif sans
  spinner, absence d'erreur d'exécution et bandeau vert. Aucune convention,
  donnée Grist, recherche SIRET ou autre action métier n'a été enregistrée.

## Mise à jour du 9 octobre 2026 — DEV517 (géocodage vert durable)

- Le faux résultat « zéro entreprise » de la cartographie provenait du délai
  d'analyse, pas de l'absence d'entreprises. À froid, l'écran relisait
  successivement l'index annuel des suivis, les accès de convention et la table
  des coordonnées ; le premier appel dépassait 20 secondes et sa réponse était
  ignorée par l'interface, tandis qu'un second essai bénéficiait du cache Grist.
- Les candidats sont maintenant réunis dans un index annuel persistant,
  fragmenté sous la limite des propriétés Apps Script. Les filtres famille,
  classe et période sont appliqués en mémoire. L'index est lié aux révisions du
  snapshot canonique et de la table géographique, expire après six heures et
  est réenregistré après chaque lot de géocodage ou validation manuelle.
- Le contrôle dynamique confirme la présence de `112` adresses uniques pour
  2026-2027, dont `107` adresses françaises encore à géocoder. Après amorçage,
  une analyse complète répond en environ `6,8 s`. La cartographie TCAR PFMP n°1
  affiche encore `0` point pour une raison désormais exacte : aucune
  coordonnée validée n'existe encore pour ce filtre. Aucun géocodage réel ni
  aucune écriture Grist n'a été lancé pendant cette recette.
- Les contrôles ciblés de géocodage passent `22/22` et la suite complète
  `679/679`. Le commit exact
  `9982e81bc32cf5348a48d835c39f778d52b79098` a été publié directement sur les
  deux Web Apps vertes existantes en version Apps Script immuable `901`. Le
  contrôle post-publication valide `25/25` routes vertes. Le bleu demeure une
  archive technique et n'a été ni consulté, ni testé, ni publié pour ce lot.

## Mise à jour du 9 octobre 2026 — DEV514 et workflow direct vers le vert

- À la demande explicite de l'utilisateur, le canal bleu est retiré du workflow
  courant et devient une archive technique. Les évolutions partent de Git et
  sont publiées directement sur les deux Web Apps vertes existantes avec
  `scripts/pfmp-release.sh release-stable`. Le script reconstruit le commit
  exact, relit le projet vert, crée une version immuable, contrôle les 25 routes
  et revient automatiquement aux versions précédentes si le contrôle échoue.
- La régression TCAR provenait d'un filtre Grist trop précoce sur des colonnes
  de référence. Des conventions existantes étaient absentes de la vue annuelle
  avant même la normalisation des identifiants, ce qui classait deux élèves
  témoins à tort « Sans convention » pour PFMP n°1.
- DEV514 lit désormais les accès de l'année puis applique en mémoire les
  filtres normalisés de classe et de période. Le géocodage utilise la même
  stratégie et complète toujours le snapshot par les conventions actives,
  même lorsque ce snapshot est seulement incomplet. Le marqueur canonique
  passe à `DEV514-C6` pour forcer le renouvellement de la synthèse erronée.
- Les tests ciblés passent (`13/13`, `18/18`, `15/15`, `16/16`) et, après le
  retrait des anciens tests du workflow bleu, la suite complète locale passe
  `672/672`. La publication et la validation réelle sur
  le vert sont consignées après leur exécution ; aucune écriture métier de
  production n'est utilisée comme test.

## Mise à jour du 9 octobre 2026 — DEV513 (stabilisation des suivis et des parcours QR)

- La cause de l'attente infinie de la synthèse BAC PRO et du chargement très
  lent des infobulles était une reconstruction complète de la famille Grist
  déclenchée dans le parcours utilisateur. Une création de convention
  supprimait en outre le dernier snapshot complet avant cette reconstruction :
  le suivi n'avait alors plus rien à servir et repartait dans le calcul lourd.
- Une invalidation conserve désormais le dernier snapshot complet et ne retire
  que ses données transitoires. Pendant le recalcul, la famille sert cette
  version cohérente avec la mention « recalcul en cours » ; elle ne lance plus
  de reconstruction lourde depuis la page. Les cartes et les contrôles rapides
  utilisent le même résumé canonique embarqué, sans une requête par infobulle.
  Un délai maximal de quinze secondes remplace tout spinner infini par une
  erreur explicite et une action de nouvelle tentative.
- La création unitaire d'une convention, notamment un rattrapage, utilise un
  identifiant de requête stable contre les doublons. Elle rend la convention et
  son QR sans attendre la reconstruction des vues, laquelle est finalisée en
  arrière-plan. En cas de délai dépassé, une nouvelle tentative avec le même
  identifiant est sûre.
- Les historiques du suivi n'affichent plus les enregistrements initiaux comme
  « séquences précédentes » et convertissent proprement les dates ISO ou Unix.
  Seules une rupture, une annulation ou une vraie séquence de remplacement sont
  présentées comme historique. Le parcours différencié reste un décompte de la
  période P.dif. et ne devient pas artificiellement un statut de PFMP n°1 ; ce
  choix futur ne retire toutefois jamais l'élève de l'effectif de PFMP n°1 ou
  n°2.
- Les QR des conventions ont été agrandis à environ 30 mm, rendus en haute
  définition et avec une correction d'erreur supérieure pour mieux résister à
  la photocopie. Leur règle métier ne change pas : utilisables avant la date
  réelle de début, passage obligatoire par le bureau à partir du début, puis
  expiration définitive après la fin.
- Le géocodage peut maintenant établir sa liste à partir des conventions
  actives lorsque les détails de suivi ne sont pas encore matérialisés. Il ne
  doit plus conclure à tort qu'il existe zéro entreprise dans ce cas ; les
  dossiers révoqués, supprimés, interrompus ou annulés restent exclus.
- Les tests ciblés couvrent les régressions observées : absence de calcul lourd
  dans le rendu famille, conservation du dernier snapshot, résumé rapide
  embarqué, délai visible, idempotence de la génération, historique lisible,
  QR agrandi et repli du géocodage.
- La maintenance du snapshot contenait encore l'identifiant d'une ancienne
  base Grist (`b2CyeMEdVEMS`). Le bleu refusait donc lui-même la reconstruction
  avant toute lecture métier. La cible est maintenant déterminée strictement
  par le canal : recette `kB8bvDag8x7D` sur le bleu, production
  `3pnVrygfNn7c` seulement sur le vert. Toute cible incohérente ou inconnue est
  refusée. Un test interdit le retour de l'ancien identifiant.
- La suite complète passe à `672/672`. Le code applicatif exact
  `5206f6802f1fd738f1e919df0bacb3b957d9b748` a été poussé puis relu sur le
  projet bleu. Le contrôle HTTP valide `25/25` routes. Le navigateur a ouvert
  les `25` routes contractuelles, toutes leurs destinations de navigation
  visibles et les quatre destinations supplémentaires détectées (consommation
  API et familles BAC PRO, BTS et CAP), soit `29/29` pages sans erreur, page
  blanche, authentification inattendue ni sortie du canal `/dev`.
- La reconstruction bleue s'est terminée en `12,8 s` au lieu d'échouer sur la
  cible Grist. L'audit de recette retourne toutefois `0` période et `0` résumé
  BAC PRO. L'interface termine donc par un état vide explicite et une action de
  reprise, mais la parité métier TCAR (`effectif`, `conventions`, `apprentis`,
  `sans convention`, `parcours différencié`) ne peut pas être certifiée avec
  cette recette vide.
- Ce lot ne touche ni la production Grist, ni les données élève/convention, ni
  les courriels ou ordres de mission. Le vert reste inchangé en version
  immuable `894`. Aucune promotion ne doit être faite tant que la recette ne
  contient pas un jeu BAC PRO représentatif permettant d'homologuer les
  décomptes observés par l'utilisateur.

## Mise à jour du 8 octobre 2026 — DEV512 (fusion PDF et signalement jaune)

- Le moteur de fusion du dossier d'apprentissage mesure désormais le texte avec
  les métriques exactes de la police incorporée au PDF. Il masque uniquement la
  zone de la balise, sur toute sa hauteur, puis redimensionne les valeurs longues
  dans cet emplacement. Les libellés voisins ne doivent plus perdre leurs
  caractères et les accolades résiduelles sont supprimées.
- Lorsqu'une balise reconnue n'a aucune donnée, sa zone devient une ligne jaune
  à compléter manuellement. Une valeur réellement fusionnée reste sans jaune.
  Le récapitulatif de génération indique le nombre de champs traités, de champs
  absents signalés en jaune et de valeurs compactées.
- Le contrôle visuel local du modèle PDF existant de huit pages a traité
  `195` emplacements, dont `157` valeurs absentes signalées en jaune et `3`
  valeurs compactées. Les huit pages ont été rendues et examinées sans accolade
  résiduelle ni chevauchement visible. Ce contrôle utilise le modèle disponible,
  pas encore le nouveau Word que l'utilisateur est en train de retravailler.
- Le parcours navigateur a aussi révélé deux défauts hors moteur PDF : le lien
  `Accueil PFMP` de `Fin de Terminale` repartait vers un alias Apps Script, et
  la cartographie échappait au repère visuel de canal. Le lien vert vise
  maintenant exactement `https://alternance.loucodi.fr/`; le bleu reste sur son
  `/dev`. La cartographie reçoit le bandeau bleu ou vert, et l'enregistrement du
  parcours différencié protège le double clic avec spinner et délai maximal.
- Une première promotion en version immuable `893` a été rejetée par le contrôle
  navigateur à cause du lien `Accueil PFMP` incorrect. Les deux Web Apps vertes
  ont été remises immédiatement sur `892`, avant la correction et la création
  d'un nouveau candidat.
- Le candidat final exact `54760a0605ab77178ba14fc9ffa61b48dff64666`
  passe `656/656` tests. Le bleu a été publié puis relu avec une empreinte
  identique. Les `25/25` routes, `49` navigations internes visibles et `3`
  destinations supplémentaires ont été contrôlées dans le navigateur. Les
  chargements Google transitoires observés lors de certains passages ont été
  rejoués avec succès sur les pages concernées.
- Après autorisation explicite, ce candidat a été promu à l'identique sur les
  deux Web Apps vertes existantes dans la version Apps Script immuable `894`.
  Les URL sont inchangées. Le contrôle HTTP vert est à `25/25`; le navigateur a
  couvert les `25` routes, `40` navigations internes visibles et les `3`
  destinations supplémentaires. Un incident transitoire sur l'import des
  professeurs a été rejoué isolément avec succès.
- La publication n'a déclenché aucun import Pronote ou JotForm, aucune écriture
  Grist métier, aucune distribution réelle, aucun courriel et aucun ordre de
  mission. Une génération réelle avec le futur PDF exporté du Word retravaillé
  reste nécessaire pour valider visuellement ce nouveau modèle particulier.

## Mise à jour du 8 octobre 2026 — DEV511 (dates individuelles et remplacement après rupture)

- La génération unitaire d'une convention permet désormais de conserver la
  période officielle de rattachement tout en enregistrant des dates réelles
  différentes et un motif obligatoire. L'administration ne saisit aucune
  entreprise dans ce parcours : l'entreprise, son responsable et le tuteur
  restent renseignés par l'élève au moyen du QR de la nouvelle convention.
- Une convention commencée peut être déclarée `INTERROMPUE` avec sa date de fin
  réelle et son motif. Son QR est révoqué immédiatement ; l'enregistrement et
  l'entreprise d'origine restent conservés dans l'historique.
- Depuis cette convention interrompue, l'administration peut créer une seule
  convention de remplacement, reliée à la même période officielle. Elle saisit
  uniquement les nouvelles dates et leur motif. La nouvelle séquence commence
  vide de toute entreprise, responsable ou tuteur et reçoit son propre QR.
- Le suivi conserve une seule ligne élève, montre l'ancienne séquence en rouge
  avec son ancien lieu et montre la nouvelle séquence comme
  `À compléter par l'entreprise`. Tant que le QR n'a pas été complété, elle ne
  compte pas comme convention couvrante et ne peut pas produire d'ordre de
  mission. La séquence interrompue n'est jamais missionnable.
- Un QR est utilisable avant la date réelle de début. À partir de cette date,
  il oriente l'élève vers le bureau PFMP au lieu d'accepter une saisie tardive ;
  après la date de fin, il est définitivement expiré. La validité est revérifiée
  lors de chaque reprise et au moment de l'enregistrement final.
- Les tests DEV511 couvrent `9/9` scénarios simulés, dont la révocation lors de
  la rupture, l'absence de copie des données entreprise, l'unicité du
  remplacement, le cycle de vie du QR, la visibilité dans le suivi et
  l'exclusion des ordres de mission. La suite complète passe à `651/651` ; le
  premier lancement depuis le worktree caché avait été refusé par le confinement
  Snap de Chromium, puis le même arbre exact a été contrôlé avec succès depuis
  un chemin visible par le navigateur.
- Le commit applicatif exact
  `10476433ab2fc27afb0960b188d302e7402bd7f1` a été poussé sur le `HEAD` bleu
  puis relu avec une empreinte identique. Le contrôle HTTP et le parcours réel
  dans le navigateur valident les `25/25` routes, le bandeau bleu, le maintien
  de tous les liens visibles sur `/dev`, ainsi que les trois sous-parcours
  BAC PRO, BTS et CAP. L'interface publique ne présente pas le bouton
  `Ordres de mission`.
- Le formulaire bleu affiche bien les dates individuelles, leur motif et
  l'instruction selon laquelle l'entreprise, le responsable et le tuteur sont
  saisis ultérieurement par le QR. La recette ne fournit toutefois aucun élève
  exploitable pour exécuter une rupture réelle : aucune écriture métier, aucun
  QR réel, aucun ordre de mission, aucun courriel et aucun accès à la production
  Grist n'ont été exécutés. Le parcours métier complet reste donc validé par
  simulation et tests, pas garanti de bout en bout sur une donnée réelle.
- Après autorisation explicite, exactement ce candidat bleu a été copié vers le
  projet stable et promu sur les deux Web Apps vertes existantes dans la version
  Apps Script immuable `892`. Leurs URL sont inchangées ; les `25/25` routes
  vertes sont valides et le retour automatique vers `891` n'a pas été
  nécessaire.

## Mise à jour du 8 octobre 2026 — DEV508 à DEV510 (navigation famille fiable)

- Le contrôle navigateur après DEV507 a montré que `doGet` appelait d'abord
  `EUC_DEV455_routeDetail_`. Ce routeur rendait encore directement la vue
  canonique synchrone et empêchait donc d'atteindre les deux délégations
  asynchrones déjà corrigées plus bas dans la chaîne.
- La route administrative `suivi-conventions-famille` délègue maintenant dès
  ce premier aiguillage à la coque DEV504. Une recette lente ou sans snapshot
  rend d'abord son interface et ses états de chargement, délai et erreur.
- La vue canonique, encore utilisée par le canal public, affiche désormais un
  état vide explicite lorsqu'aucune classe n'est disponible au lieu d'une zone
  blanche.
- Le contrôle navigateur du premier candidat DEV508 a ensuite montré que la
  route famille publique restait synchrone et dépassait le délai. Elle utilise
  désormais la même coque asynchrone, sans `Accueil PFMP`, sans maintenance
  Snapshot et avec des destinations exclusivement publiques.
- Le clic réel `Voir les classes` de l'accueil public a aussi révélé une
  navigation confinée dans l'iframe Apps Script, interprétée par Google comme
  un accès à une ressource Drive. Le bouton navigue maintenant explicitement
  dans la fenêtre haute vers la route Web App publique.
- Les tests de régression couvrent précisément le premier routeur, les routes
  publiques, la sortie d'iframe et l'état vide. Tests ciblés DEV504 : `13/13`;
  vues canoniques : `16/16`; suite complète : `642/642`.
- Le candidat exact
  `ffdac5922034163a77e05f3d7840141b36a00447` a été publié et relu sur le bleu.
  Les `25/25` routes bleues sont valides. Le navigateur a parcouru l'accueil
  public puis la famille BAC PRO : la coque s'affiche immédiatement et la
  recette vide se termine par un état explicite au lieu d'une erreur Apps
  Script. La recette ne fournissant pas de détail de classe, l'absence du
  bouton public reste couverte sur le bleu par le test de rendu `16/16`, et
  n'est pas présentée comme un parcours de bout en bout bleu.
- Après l'autorisation explicite, ce candidat a été promu à l'identique sur les
  deux Web Apps vertes existantes dans la version Apps Script immuable `891`.
  Leurs URL sont inchangées et les `25/25` routes vertes sont valides ; aucun
  retour à la version `890` n'a été nécessaire.
- Le contrôle métier réel du vert a parcouru l'accueil public, BAC PRO, TCAR et
  la PFMP n°1. Le détail public ne contient ni lien, ni bloc
  `Ordres de mission`; le même détail administratif conserve ce lien. Le fil
  administratif `Accueil PFMP` vise exactement
  `https://alternance.loucodi.fr/`. La navigation publique rejoint bien le
  déploiement public configuré, sans page blanche ni erreur Apps Script.
- La publication et ses contrôles n'ont déclenché aucun import, aucune écriture
  Grist, aucun PDF, aucun courriel et aucun ordre de mission réel.

## Mise à jour du 8 octobre 2026 — DEV506 (navigation famille réellement non bloquante)

- La recette navigateur suivant les liens visibles a mis en évidence un défaut
  que le contrôle `25/25` des URL de base ne pouvait pas voir : depuis
  `Suivi des conventions`, le clic `Voir les classes` appelait encore le
  routeur synchrone DEV340. Sur la recette bleue dépourvue de
  `EUC_SUIVI_PFMP_INDEX`, ce routeur produisait une page d'erreur Apps Script
  avant même que la coque asynchrone DEV504 soit rendue.
- Le routeur prioritaire délègue désormais immédiatement à la coque DEV504.
  L'absence de snapshot devient un état vide ou une erreur récupérable dans la
  page ; elle ne peut plus casser la navigation.
- Un test de régression contrôle l'ordre réel du routeur prioritaire. Tests
  ciblés : DEV504 `9/9`, vues publiques `16/16`, missions `12/12`. Suite
  complète : `638/638`.
- Le premier candidat bleu `8677e46` n'a volontairement pas été promu après la
  découverte de cette erreur. Le correctif DEV506 doit être commité, republié
  sur le bleu, puis la navigation famille et le détail public doivent être
  revérifiés avant toute promotion verte.
- La première republication DEV506 a aussi révélé une divergence de
  configuration : les garde-fous du code visaient de nouveau l'ancienne copie
  personnelle `j1j…`, contrairement au contrat permanent. La cible bleue est
  rétablie sur `https://camin.getgrist.com` / `kB8bvDag8x7D`; l'ancienne copie
  est de nouveau refusée par les tests.

## Mise à jour du 8 octobre 2026 — DEV505 (séparation des commandes publiques)

- Le détail public d'une classe ne contient plus le bouton administratif
  `Ordres de mission`. Le lien est retiré du HTML public, avec un filet CSS de
  sécurité ; le même gabarit conserve le bouton et son contexte complet dans
  l'administration.
- La synthèse administrative par famille rend désormais sa coque avant la
  lecture métier, puis charge les données par appel asynchrone avec états de
  chargement, délai prolongé, erreur exploitable et nouvelle tentative. Une
  lecture Grist lente ne doit plus produire une page blanche.
- Tests ciblés : vues publiques `16/16`, missions `12/12`, parcours DEV504
  `8/8`. Suite complète finale : `637/637`. Ces résultats sont des tests
  automatisés ; la publication bleue, les 25 routes et les parcours de
  navigation restent à contrôler avant toute promotion verte.
- La continuation après interruption est cadrée pour le prochain lot mais
  n'est pas encore implémentée dans ce candidat.

## Mise à jour du 8 octobre 2026 — DEV504 (parcours métier et temps de réponse)

- Le contrôle qualité distingue désormais quatre preuves : tests simulés,
  ouverture des routes, navigation et parcours métier de bout en bout. La
  formule « tout est testé » est interdite lorsque seul le contrôle des URL a
  été exécuté.
- Les journaux de la recette précédente ont objectivé les blocages : un import
  JotForm a terminé côté serveur en `262,759 s`, l'ouverture de la famille BAC
  PRO a attendu environ `41,872 s`, et les analyses concurrentes de la migration
  ont duré environ `77 à 102 s`. Le lot PDF a bloqué le navigateur à `18/31`.
- La reconstruction après import repart maintenant du snapshot familial déjà
  matérialisé, ne recalcule que les couples classe/période réellement touchés et
  ne réécrit plus les détails inchangés. Les lectures groupées de conventions
  et d'affectations sont filtrées aux classes ciblées.
- La synthèse par famille essaie d'abord son cache/payload persistant local,
  sans attendre une lecture Grist. Pendant un recalcul, la dernière synthèse
  complète reste visible avec son marqueur de recalcul.
- Le rattachement spécial JotForm dispose d'un bouton explicite
  `Enregistrer le rattachement pour cet import`. Une modification non
  enregistrée bloque le clic final ; l'import affiche sa phase et sa durée.
- La fusion de conventions en lot conserve chaque document PDF en mémoire et
  copie directement ses pages. Elle ne sérialise puis ne recharge plus chaque
  convention, cède régulièrement la main au navigateur et affiche le temps
  écoulé.
- Tests ciblés DEV504 : `7/7`; tests JotForm : `19/19`; suite complète :
  `635/635`. À ce stade, il s'agit de preuves automatisées : la publication
  bleue et les parcours navigateur chronométrés restent à effectuer avant de
  considérer le candidat homologué. Le vert n'est pas modifié.

## Mise à jour du 7 octobre 2026 — DEV503 (dates réelles et rattachement manuel JotForm)

- Le précontrôle de migration JotForm continue de refuser tout rapprochement automatique par simple chevauchement. Une convention dont les dates ne correspondent pas sans ambiguïté à la vraie classe reste bloquée avant toute écriture.
- L’écran d’import propose maintenant, pour les seules lignes cochées, un bouton `Rattachement spécial / début retardé`. L’utilisateur choisit explicitement la période officielle autorisée pour la classe et l’année, conserve les dates réelles et saisit un motif obligatoire.
- Pour `Début retardé`, le début réel doit être postérieur au début officiel et la fin réelle doit rester exactement la fin officielle. Le cas `7 octobre 2026 → 16 octobre 2026` peut donc être rattaché à la PFMP finissant le 16 ; `7 octobre → 17 octobre` reste refusé.
- Le suivi et les ordres de mission utilisent l’identifiant de la période officielle choisie. Les dates réelles et la situation sont conservées dans l’accès de convention ; le libellé garde également une trace lisible du rattachement et du motif.
- Tests ciblés JotForm : `19/19`. Suite complète : `628/628`. Aucun import, aucune convention, aucun courriel et aucun ordre de mission réel n’ont été déclenchés ; la production Grist n’a pas été consultée.
- Publication : le candidat bleu exact `9fc0536b7da66b9dd90e4af789aa2a875a5dd83a` a été relu puis promu par le workflow contrôlé sur la version Apps Script immuable `890` des deux Web Apps vertes existantes. Leurs URL n’ont pas changé ; les contrôles ont obtenu `25/25` routes valides sur le bleu puis `25/25` sur le vert. La version `889` reste disponible comme version antérieure de repli.
- La publication n’a déclenché aucun import JotForm, aucune convention, aucun courriel et aucun ordre de mission. L’ouverture des routes est validée ; le premier rattachement réel `07/10/2026 → 16/10/2026` doit encore être contrôlé fonctionnellement sur une ligne prête avant de confirmer son import.

## Mise à jour du 7 octobre 2026 — DEV502 (cohorte courante et sélection des classes Pronote)

- La recherche du dossier d’apprentissage mélangeait les inscriptions annuelles : un même jeune pouvait apparaître en `1MVA1` dans la cohorte historique 2025-2026 et en `TMVA1` dans la cohorte courante 2026-2027. Les deux lignes Grist sont légitimes et restent conservées ; l’erreur provenait de l’index applicatif qui filtrait seulement `Actif` et `Present_dernier_import` sans filtrer l’année scolaire.
- L’index du dossier d’apprentissage résout maintenant la référence `Annee_scolaire` par la table `Annees_Scolaires` et ne propose que l’année scolaire courante. Aucune inscription historique n’est supprimée ni modifiée.
- La page d’import Pronote possédait déjà la persistance des correspondances et exclusions de classes. Son écran rend désormais le choix explicite : après analyse, chaque classe Pronote dispose d’une case `Inclure dans PFMP`. Une classe décochée est exclue de la prévisualisation et de l’import, et le choix peut être mémorisé pour l’année et la source LP/LGT.
- Tests ciblés du dossier et de la sélection des classes : `28/28`. Suite complète : `624/624`.
- Contrôle navigateur bleu : la recherche `NIGITA` ne renvoie plus que l’inscription courante `TMVA1`; l’ancienne inscription `1MVA1` reste conservée dans l’historique mais n’est plus proposée dans ce dossier.
- Publication : le commit `cce5a6bb396d06450f69c856ad5c7e8bcf4bead7` a été publié et relu sur le bleu, puis promu par le workflow contrôlé sur la version Apps Script immuable `889` des deux Web Apps vertes existantes. Les URL n’ont pas changé; les contrôles ont obtenu `25/25` routes valides sur le bleu puis `25/25` sur le vert.
- Aucun import Pronote, aucune suppression d’inscription historique et aucune écriture dans Grist n’ont été déclenchés pendant cette publication. La production Grist n’a pas été consultée directement pendant le contrôle ciblé.

## Mise à jour du 7 octobre 2026 — DEV501 (table complémentaire absente en recette)

- Le contrôle métier du dossier d’apprentissage bleu a révélé un cas que l’audit des routes ne couvrait pas : la page HTML répondait correctement, mais le choix d’un élève déclenchait une lecture de `EUC_APPRENTISSAGE_PFMP`, table absente de la recette, puis un `404 Table not found`.
- Les élèves restent une donnée obligatoire. En revanche, l’absence en recette des tables complémentaires `EUC_RESPONSABLES_ELEVES_PFMP` ou `EUC_APPRENTISSAGE_PFMP` produit désormais un dossier avec champs vides, sans masquer les autres erreurs Grist.
- Un test reproduit explicitement le `404` observé et exige que le dossier reste chargeable. Le contrôle des routes ne sera plus présenté comme un test complet du parcours métier : il prouve seulement l’ouverture des pages.
- Tests ciblés du dossier : `26/26`. Suite complète : `622/622`.
- Le correctif vise uniquement le canal bleu. Le vert et la production Grist restent inchangés.

## Mise à jour du 7 octobre 2026 — DEV500 (Word éditable, PDF directement fusionné)

- Le modèle maître reste un fichier Word de huit pages. Après modification, l’utilisateur l’exporte en PDF puis charge directement ce PDF dans `Gérer les modèles PDF`; aucun import Google Docs n’est requis.
- La cause de l’échec de fusion a été reproduite : sept balises longues étaient coupées ou entrelacées dans le texte du PDF par Word, notamment dans les trois colonnes du positionnement. Elles sont remplacées par les alias courts `{{EL_PROJET}}`, `{{EL_SHN}}`, `{{PAA}}`, `{{PAE}}`, `{{PAO}}`, `{{PCE}}` et `{{PCO}}`.
- Le DOCX préparé et son export PDF contiennent `137/137` balises distinctes lisibles d’un seul tenant. Les huit pages A4 ont été rendues et contrôlées visuellement.
- Le site bleu accepte plusieurs PDF téléversés directement, conserve un seul modèle par défaut, retire un modèle de la configuration sans supprimer physiquement le fichier, et refuse les anciens modèles Google Docs devenus incompatibles.
- La fusion s’effectue côté navigateur avec les positions réellement extraites du PDF. Elle exige huit pages, la présence des balises cœur et au moins cent balises reconnues avant de produire le document.
- Tests ciblés DEV464/DEV500 : `25/25`. Suite complète : `621/621`. Le canal bleu a été publié, relu après `clasp push`, puis contrôlé avec `25/25` routes valides.
- Le vert et la production Grist restent inchangés.

## Historique DEV499 (solution Google Docs abandonnée)

- Le dossier d’apprentissage utilise désormais le document Word métier de huit pages comme base éditable. Une préparation locale conserve la mise en page, vérifie que chaque balise reste dans une seule séquence Word et remplace les anciennes balises de pagination par les champs natifs `PAGE` et `NUMPAGES`.
- Le fichier prêt à importer dans Google Drive reste hors Git, car il contient les mentions du document métier. Une documentation opératoire et un script reproductible permettent de repartir du DOCX source après chaque évolution.
- Le site bleu accepte plusieurs modèles Google Docs, impose un modèle par défaut et refuse les anciens fonds PDF. Lors d’une génération, il copie temporairement le document maître, remplace les `135` champs autorisés, ajoute la date d’édition, refuse toute balise résiduelle, exporte le résultat en PDF puis place uniquement la copie temporaire à la corbeille. Le modèle maître n’est jamais modifié.
- Les champs élève, responsables, scolarité antérieure, entreprise, contrat et positionnement déjà présents dans le formulaire sont transmis au moteur de fusion. Une donnée absente reste vide ; aucune valeur personnelle n’est inventée.
- Tests ciblés DEV464/DEV499 : `25/25`; suite complète : `621/621`. Le contrôle visuel local des huit pages confirme la conservation de la mise en page et les pieds de page `1/8` à `8/8`.
- Le commit applicatif `6ad78d12e40cbd48c1e44cfb840e118f9b2383a7` a été publié uniquement sur le `HEAD` bleu puis relu avec une empreinte identique. Les `25/25` routes bleues sont valides, dont `dossier-apprentissage-pfmp`.
- L’import automatique du DOCX dans Google Drive n’a pas abouti à cause d’une erreur interne du connecteur. Le fichier local validé est conservé ; son import manuel comme Google Docs et son enregistrement dans la liste des modèles bleus restent nécessaires avant le premier essai de fusion.
- Ce lot vise uniquement le canal bleu. Les Web Apps vertes, la production Grist, les imports réels, les courriels et les écritures élève/convention restent inchangés.

## Mise à jour du 7 octobre 2026 — DEV498 (promotion bleu → vert)

- L’audit différentiel du candidat bleu a localisé les quatre derniers échecs : trois tables optionnelles absentes de la recette provoquaient une erreur Grist `404`, tandis que la page Destinataires effectuait toutes ses initialisations avant le premier affichage et dépassait le délai de contrôle.
- L’administration des conventions affiche désormais son véritable écran avec un état vide explicite lorsque la table de conventions n’existe pas dans la recette. La page Fin de Terminale s’ouvre avant toute migration de schéma. La table de paramètres d’envoi est créée par son initialiseur avant sa première lecture, au lieu d’être lue avant d’exister.
- Les pages Destinataires et Paramètres d’envoi sont devenues des coquilles légères : elles s’affichent immédiatement, puis chargent leurs données côté client avec bouton désactivé, spinner et états succès/erreur. Une décoration commune ajoute également un spinner aux boutons asynchrones qui se déclarent occupés sans en fournir un eux-mêmes, sans doubler les spinners déjà présents.
- Les actions métier restent protégées sur le bleu (`DRY_RUN` / courriels `DISABLED`). Aucun envoi, import, ordre de mission, PDF ou écriture élève/convention n’est utilisé pour la recette. La production Grist `3pnVrygfNn7c` n’est pas consultée.
- Le commit applicatif `aa040c02fc0ba813fe352f3d39e78dcbb2688bf1` a passé `620/620` tests, a été publié sur le `HEAD` bleu puis relu avec une empreinte identique. Les `25/25` routes bleues sont valides. L’audit différentiel retrouve une route pour les `35` destinations internes littérales et un gestionnaire d’échec dans les `32` fichiers qui appellent le serveur.
- Après autorisation explicite, exactement ce candidat bleu a été copié vers le projet stable, relu avec la même empreinte et promu sur les deux Web Apps vertes existantes dans la version Apps Script immuable `888`. Leurs URL sont inchangées et les `25/25` routes vertes sont valides ; le retour automatique vers `887` n’a pas été nécessaire.
- La promotion n’a déclenché aucun courriel, import Pronote, ordre de mission, PDF, écriture élève/convention ni accès direct à la production Grist `3pnVrygfNn7c`.

## Mise à jour du 7 octobre 2026 — DEV497 (données de recette bleue testables)

- Sur autorisation explicite de l’utilisateur, le canal bleu cible de nouveau exclusivement la recette Grist `j1jDArBkzi7P` sur `https://docs.getgrist.com`. La production interdite `3pnVrygfNn7c` n’a pas été consultée et les deux Web Apps vertes n’ont pas été modifiées.
- La page d’import Pronote bleue prépare les références 2026-2027 et les classes `TMVA1`, `TMVA2` et `TRMO`, puis exige la prévisualisation et la confirmation habituelles avant toute écriture. Les garde-fous refusent cette préparation et cet import sur toute autre cible Grist ou sur un projet qui n’est pas le projet bleu identifié.
- L’export Pronote LP fourni a été filtré localement aux trois classes autorisées, sans ajout au dépôt. La prévisualisation a contrôlé `55` lignes, `0` ambiguïté, `0` rejet, `0` classe inconnue et `0` élève sans numéro national. L’import dans la recette bleue a créé `55` élèves : `25` en TMVA1, `25` en TMVA2 et `5` en TRMO. La relecture finale les reconnaît tous comme présents et inchangés.
- Le dossier d’apprentissage bleu charge maintenant un index de `603` élèves et peut donc être testé avec des données réelles de recette. Les données nominatives et le fichier filtré restent hors Git et hors journaux de version.
- Suite complète : `617/617` tests réussis. La relecture Apps Script distante du paquet bleu est cohérente. L’audit navigateur automatique valide `21/25` routes ; `admin-conventions-pfmp`, `destinataires-envois-pfmp`, `parametres-envois-pfmp` et `parcours-differencie-pfmp` restent à corriger ou revalider avant toute promotion verte. Le candidat n’est donc pas homologué.

## Mise à jour du 7 octobre 2026 — DEV496 (fusion PDF et annulation de distribution)

- Le moteur du dossier d’apprentissage ne dépend plus de coordonnées fixes : il localise les balises `{{...}}` dans les huit pages du PDF, mesure leur largeur réelle, masque le texte de fusion puis écrit la valeur correspondante à cet emplacement. Les champs élève demandés, la scolarité antérieure, les professions des responsables et les données d’entreprise sont raccordés ; les balises sans donnée restent visuellement vides au lieu d’être imprimées.
- Un contrôle local du PDF fourni, rendu en images, confirme le traitement des huit pages et de `195` occurrences. Ce contrôle utilise uniquement des valeurs fictives et n’écrit aucune donnée externe. Le PDF fourni contenait déjà des valeurs superposées issues de l’ancien moteur ; le prochain essai métier doit donc repartir du modèle PDF vierge enregistré dans Drive.
- L’historique des distributions est visible par élève. Une distribution faite par erreur peut être annulée logiquement avec un motif : son statut, sa date et son auteur d’annulation sont conservés, sans suppression physique. Sur le canal bleu, confirmation et annulation restent simulées sans écriture Grist.
- L’audit autorisé en lecture seule de la base officielle montre que, pour le dossier signalé, le courriel du jeune est vide et que les colonnes élève `Lieu_naissance`, `Nationalite`, `Dernier_etablissement`, `Derniere_classe` et `Dernier_diplome_prepare` n’existent pas encore dans la table actuelle. La table des responsables contient les dossiers familiaux disponibles, mais ne possède pas encore de colonne `Profession`. L’interface ne peut donc pas afficher ces valeurs sans les inventer. Le parseur d’import complet connaît déjà les colonnes Pronote `LIEU NAISS`, `NATIONALITE`, `EMAIL`, `DERNETAB`, `AP_CLASSE`, `AP_FORMATION`, `R1_L_PROFESSION` et `R2_L_PROFESSION`; leur alimentation exigera un import Pronote réel séparément autorisé.
- Les données d’entreprise déjà retrouvées restent inchangées. Aucun import Pronote, aucune écriture élève ou convention, aucun courriel, aucun ordre de mission et aucune suppression n’a été exécuté dans ce lot.
- Tests ciblés dossier d’apprentissage : `24/24`; suite complète `612/612`; contrôle de syntaxe HTML/JavaScript et `git diff --check` verts.
- Le commit applicatif `2b45f0c3a4c5fbeab3e0828a516638e9d292bd64` a été publié uniquement sur le `HEAD` bleu puis relu à l’identique. Les `25/25` routes bleues sont valides ; le contrôle navigateur confirme le bandeau bleu, le retour vers l’administration bleue, la gestion des modèles et le message d’annulation. La recette ne contient toujours aucun élève. Les deux Web Apps vertes restent inchangées sur la version immuable `887`.

## Mise à jour du 7 octobre 2026 — DEV495 (modèles et registre du dossier d’apprentissage)

- La rubrique de génération du dossier d’apprentissage gère désormais plusieurs modèles PDF conservés dans Google Drive : ajout par nom et lien, liste visible, sélection du modèle utilisé, bouton radio pour l’unique modèle par défaut et retrait non destructif de la liste. Le modèle par défaut est présélectionné et le PDF Drive n’est chargé qu’au moment de générer ; un PDF local temporaire reste disponible comme solution de secours.
- Le fichier de correspondance fourni confirme les colonnes Pronote `LIEU NAISS`, `NATIONALITE`, `EMAIL`, `DERNETAB`, `AP CLASSE`, `AP FORMATION`, ainsi que les téléphones et la profession des responsables. L’import complet sait déjà les normaliser. La lecture accepte en plus les anciens identifiants de colonnes afin de récupérer les valeurs historiques lorsqu’elles existent. Les fiches déjà importées ne sont pas rétroalimentées : si la valeur source n’est pas stockée, le champ reste vide au lieu d’être inventé.
- La date d’édition et l’heure sont inscrites sur chacune des huit pages. Après génération, un bouton séparé « Confirmer la distribution » évite de confondre téléchargement et remise réelle. Sur le vert, cette confirmation crée une ligne idempotente dans `EUC_DOSSIER_APPRENTISSAGE_IMPRESSIONS`, reliée à l’élève sans recopier son nom ni son prénom. Sur le bleu, l’action est simulée sans écriture Grist, conformément aux protections du canal de développement.
- Tests ciblés DEV464/DEV495 : `21/21`; tests du canal bleu `7/7`, régressions critiques `6/6`, workflow de release `14/14` et suite complète `609/609`. Aucun import Pronote réel, aucune donnée élève ou convention, aucun courriel et aucun ordre de mission n’a été déclenché ; la production Grist n’a pas été consultée.
- Le commit applicatif `beb7ddbed8a4590ea58ab15ded3c08133269a0d7` a été relu à l’identique sur le projet bleu, puis promu après autorisation explicite vers les deux Web Apps vertes existantes dans la version Apps Script immuable `887`. Les URL sont inchangées ; les `25/25` routes bleues et les `25/25` routes vertes sont valides.
- La recette bleue ne contient aucun élève. Elle a donc permis de contrôler le chargement, la navigation, les modèles et les protections, mais pas de générer visuellement un dossier renseigné ni d’exécuter le parcours complet avec un élève. Le modèle PDF annoncé n’était pas joint à ce lot. Le premier contrôle métier doit être limité à un élève connu sur le vert ; la confirmation de distribution ne doit être utilisée qu’après remise réelle du document.
- La promotion n’a exécuté aucun import Pronote, aucun courriel, aucun ordre de mission, aucune génération de PDF et aucun accès direct à la production Grist. Elle n’a créé aucun nouveau Web App et conserve la version `886` comme version immuable antérieure.

## Mise à jour du 7 octobre 2026 — DEV494 (dates et statut des apprentis)

- La divergence entre les fiches et les infobulles ne provenait pas des données Grist ni d'un snapshot effacé. La table `EUC_APPRENTISSAGE_PFMP` renvoie ses dates sous forme de secondes Unix ; le chargeur de détail DEV208 les convertissait en texte brut, par exemple `1798761600`, avant de les affecter aux champs HTML `type=date`. Le navigateur refusait cette valeur, affichait des dates vides puis reclassait l'élève actif en « Futur apprenti ». Le calcul agrégé des infobulles ne dépendait pas de ces champs HTML et continuait donc, à juste titre, de compter l'élève comme apprenti.
- Le chargeur commun aux écrans administrateur et public normalise désormais les neuf dates d'apprentissage en `AAAA-MM-JJ` avant leur transport JSON : début, fin, distribution, remise, transmission CFA, contrat officiel et rupture. Les booléens, entreprises, contacts, statuts enregistrés et données Grist ne sont pas modifiés.
- Le test DEV494 reproduit les formats Grist en secondes, millisecondes et ISO, contrôle le pont JSON partagé par les deux écrans et interdit qu'une date numérique brute atteigne un champ `type=date`. Tests ciblés DEV494 `3/3`, DEV449 `5/5`, DEV462 `10/10` et DEV463 `6/6` ; suite complète `603/603`.
- Le commit applicatif `65577e6` a été construit depuis un clone propre, publié uniquement sur le `HEAD` du projet bleu puis relu à l'identique. Les `25/25` routes bleues sont valides. Le contrôle navigateur confirme le chargement des pages Apprentis administrateur et publique, leur bandeau bleu et leur navigation dans le `/dev`; la recette séparée ne contient toutefois aucune classe nominative permettant de contrôler un élève réel.
- Les deux Web Apps vertes restent volontairement inchangées sur la version immuable `886`. Le défaut est donc encore présent sur le vert tant qu'une promotion de ce candidat n'est pas explicitement autorisée. Aucun accès à la production Grist, aucune écriture élève ou convention, aucun import, courriel, PDF ou ordre de mission n'a été exécuté.

## Mise à jour du 7 octobre 2026 — DEV493 (contrat permanent bleu et qualité d’interface)

- Le dépôt impose désormais dans `AGENTS.md` le développement et la publication sur le site bleu avant toute promotion verte. Une promotion exige toujours l’autorisation explicite de l’utilisateur et le candidat bleu exact.
- La définition de fini est détaillée dans `Documentation/CONTRAT_QUALITE_UI.md` : contrôle des 25 routes, parcours navigateur de tous les liens et boutons de navigation internes visibles sur l’ensemble du site, maintien dans le bon canal et vérification des états vide, chargement, succès et erreur.
- Tout accès vert libellé `Accueil PFMP` doit viser exactement `https://alternance.loucodi.fr/`; le bleu doit conserver sa navigation sur son propre `/dev`. Le test DEV470 inventorie maintenant automatiquement tous les fichiers qui affichent ce libellé au lieu d’une liste manuelle susceptible d’oublier une page.
- Tout bouton asynchrone du candidat livré doit être protégé contre le double clic, afficher un spinner avec un libellé d’action et restaurer son état en succès, erreur ou dépassement de délai. Une action réelle interdite est contrôlée par test ou simulation sûre. Les simples liens de navigation ne sont pas concernés.
- Deux tests de workflow empêchent la suppression silencieuse de ces règles. Les tests ciblés DEV470 (`8/8`) et release (`14/14`) ainsi que la suite complète (`600/600`) sont verts. Ce lot ne modifie aucun fichier applicatif et n’entraîne donc aucune publication Apps Script : le bleu et les deux Web Apps vertes restent sur le code applicatif DEV492, les vertes sur la version immuable `886` et leurs URL existantes.

## Mise à jour du 7 octobre 2026 — DEV492 (fiabilité des courriels d’ordre de mission)

- Le contrôle en lecture seule de l’historique d’exécution du Web App vert a isolé la panne : le 7 octobre à 13:51:34, `EUC_DEV440_prepareMissionTransportEmail` s’est terminé normalement en `8,423 s`, mais aucune exécution de `EUC_DEV440_sendMissionTransportEmail` n’a suivi. `MailApp.sendEmail` n’était donc jamais atteint ; l’absence de message chez le professeur et chez BFE ne provenait ni des spams ni du champ CC.
- La double séquence navigateur « préparation serveur → boîte `confirm()` native → nouvel appel serveur » est remplacée par un dialogue intégré à la page. Après confirmation explicite, un seul appel lance la génération du PDF et l’envoi. Le bouton est toujours rendu à l’utilisateur en cas de succès, d’échec ou de dépassement de délai.
- Chaque tentative reçoit un identifiant unique. Le serveur conserve un état `PREPARING`, `GENERATING`, `SENDING`, `SENT` ou `ERROR`, consultable par le navigateur si la réponse directe se perd. Une reprise avec le même identifiant ne renvoie jamais le courriel. Le quota restant est contrôlé avant l’appel à `MailApp` pour couvrir le professeur et la copie conforme.
- Le canal bleu refuse explicitement tout envoi réel d’ordre de mission. Les tests simulent la remise au professeur et à BFE, le quota insuffisant, la reprise idempotente et le refus bleu ; aucun courriel ni PDF réel n’a été produit.
- Le commit `ee73160` a passé `598/598` tests, a été poussé sur la branche de travail puis publié sur le `HEAD` du projet bleu. La relecture distante est cohérente et les `25/25` routes bleues sont valides, dont `ordres-mission-pfmp`.
- Après autorisation explicite, exactement ce candidat bleu a été promu vers les deux Web Apps vertes existantes dans la version Apps Script immuable `886`. Les URL sont inchangées et les `25/25` routes vertes sont valides. Le contrôle navigateur de la page verte « Ordres de mission » charge les `34` classes et conserve le lien d’accueil canonique. Aucun courriel ni PDF réel n’a été produit pendant la publication.

## Mise à jour du 7 octobre 2026 — DEV491 (régressions JotForm et navigation conventions)

- La panne de l'import JotForm provenait du paquet hybride reconstruit : l'adaptateur historique DEV331 appelait `EUC_V160_importCsv__DEV331_ORIG`, tandis que la source actuelle réinjectée par-dessus le socle complet exposait de nouveau seulement `EUC_V160_importCsv`. Le CSV et les données de l'utilisateur n'étaient pas en cause.
- Le point d'origine attendu par DEV331 est restauré. Le constructeur de paquet contrôle désormais tous les symboles `__…ORIG` et bloque la publication si l'un d'eux est appelé sans définition.
- Le générateur de conventions possède maintenant un fil d'Ariane administratif et un bouton explicite `Retour à l'accueil PFMP`. La réécriture du canal bleu conserve la navigation dans le `/dev`; le vert continue de viser le sous-domaine canonique.
- Les contrôles de ce lot n'exécutent aucun import, aucune génération de convention, aucune écriture Grist et aucun courriel.
- Le commit `96dabb1` a été validé sur les 25 routes du canal bleu, puis promu à l'identique sur les deux déploiements verts existants dans la version Apps Script immuable `885`. Les 25 routes vertes ont été recontrôlées après publication ; les URL administrateur et publique sont inchangées.

## Mise à jour du 7 octobre 2026 — DEV490 (recette Grist Camin isolée)

- La copie personnelle historique `j1jDArBkzi7P` est remplacée pour le canal bleu par le document Camin payant `kB8bvDag8x7D`, nommé `Base calendrier et planning — RECETTE BLEUE`, sur `https://camin.getgrist.com`. La copie a été créée avec la structure uniquement et ne contient aucune donnée nominative.
- Un compte de service Grist dédié dispose d'un accès en lecture seule à cette recette. Le contrôle direct confirme `200` sur la recette et `403` sur le document officiel fourni par l'utilisateur ; la clé n'est ni affichée ni versionnée.
- Les garde-fous du projet bleu imposent désormais simultanément l'hôte Camin et l'identifiant de recette. L'ancien hôte `docs.getgrist.com` et l'ancien document personnel ne peuvent donc plus être réinjectés automatiquement.
- Les modes bleus restent `DRY_RUN` / `DISABLED`. Aucun accès à la production Grist, import Pronote, écriture élève ou convention, courriel, ordre de mission ou promotion verte n'a été exécuté.

## Mise à jour du 7 octobre 2026 — DEV489 (cibles Grist séparées bleu / vert)

- Après DEV487 et DEV488, le générateur ne restait plus bloqué mais les listes de production étaient vides. La cause était la garde historique `EUC_ENT_controlerCibleRecette_` : elle imposait la copie Grist de recette à tous les projets, y compris au Web App vert. Les erreurs étaient ensuite absorbées par le lecteur historique, qui retournait silencieusement des tableaux vides.
- La garde identifie désormais explicitement le projet Apps Script : le projet bleu accepte uniquement l'environnement et le document de recette autorisé ; le projet vert officiel accepte uniquement sa cible configurée non vide et différente de la recette ; tout autre projet est refusé. Le contrôle de domaine reste obligatoire sur le vert, même si une ancienne propriété d'environnement subsiste.
- La cible Grist de production n'est pas codée dans Git et aucune clé n'est journalisée. Les cinq tests DEV489 couvrent le bleu, le vert, le refus de la recette sur le vert, le refus des projets inconnus et le contrôle du domaine. Suite complète : `587/587` tests.
- Déploiement : version Apps Script immuable `884` attachée aux deux Web Apps vertes existantes, URL inchangées. La relecture distante est identique au fichier testé. Contrôle navigateur réel en lecture seule : la page de production charge les élèves, les classes et les promotions ; `TMVA1` affiche `25` élèves et ses deux périodes officielles. Aucune convention ni QR code n'a été généré et aucune donnée n'a été écrite.

## Mise à jour du 7 octobre 2026 — DEV488 (chargement fiable du générateur)

- Les élèves et promotions récupèrent maintenant le code de classe depuis la référence Grist `Classe` lorsque les anciennes colonnes textuelles ne sont pas recopiées.
- Le navigateur attend les trois réponses indépendamment et quitte toujours l'état « Chargement… ». Une liste vide est affichée comme telle et un chargement incomplet produit un diagnostic visible au lieu d'un blocage silencieux.
- Déploiement : version immuable `883` sur les deux Web Apps vertes existantes, URL inchangées. Ce lot a révélé la garde de recette indûment appliquée au projet vert, corrigée par DEV489.

## Mise à jour du 7 octobre 2026 — DEV487 (générateur de conventions)

- Cause de l'écran bloqué en production : le constructeur de paquet récupérait encore depuis le socle historique l'audit temporaire `EUC_PFMP_PerfAuditP71`. Ce module redéfinissait la lecture des élèves puis appelait `EUC_CONVENTION_lireElevesAdmin__P71_ORIG`, symbole absent des sources actuellement versionnées ; le navigateur restait donc sur « Chargement… ».
- Le constructeur exclut désormais explicitement cet audit obsolète. Les fonctions directes versionnées de lecture des élèves et des périodes restent seules dans le paquet publié.
- Le correctif ne modifie aucune donnée élève ou convention et ne nécessite aucune lecture de la production Grist pour être vérifié.

## Mise à jour du 7 octobre 2026 — DEV486 (URL canonique du canal bleu)

- La recette navigateur a identifié que `ScriptApp.getService().getUrl()` pouvait fournir l'alias Workspace `script.google.com/a/<domaine>/macros/s/...`. Depuis une page incorporée, cet alias ouvrait l'écran Google « Une autorisation est nécessaire », bien que l'utilisateur soit éditeur du projet bleu.
- L'URL du canal courant est désormais normalisée vers la forme partageable `script.google.com/a/macros/<domaine>/s/...` avant toute construction de lien. Les boutons et liens des pages bleues restent donc dans le même `/dev` sans déclencher ce faux refus d'accès.
- Le contrôle réel a confirmé le bandeau pleine largeur sur l'accueil public bleu et sur la page Apprentis bleue ; cette dernière affiche actuellement son écran maîtrisé « Données temporairement indisponibles », sans écriture ni nouvelle tentative automatique.
- Le paquet reste réservé au projet bleu. Aucun déploiement vert, accès à la production Grist, import, courriel, PDF, ordre de mission ou écriture métier n'a été exécuté.

## Mise à jour du 7 octobre 2026 — DEV485 (canal bleu identifiable et navigation isolée)

- Le canal bleu affiche désormais sur chaque sortie HTML un bandeau bleu fixe sur toute la largeur : `MODE DÉVELOPPEMENT — SITE BLEU — RECETTE SÉPARÉE`. Le bandeau est ajouté après le contenu de la page afin que les anciens modèles qui reconstruisent leur interface au chargement ne l'effacent plus.
- Dans le projet bleu uniquement, les liens historiques vers `alternance.loucodi.fr` et vers les deux déploiements verts sont réécrits vers le `/dev` courant. Le bouton `Accueil PFMP` revient donc à l'accueil administrateur bleu et les parcours internes ne quittent plus silencieusement la recette. Le projet vert conserve ses URL canoniques inchangées.
- Le `/dev`, accessible uniquement aux éditeurs du projet Apps Script bleu, dispose d'un contexte administrateur propre au bac à sable lorsque l'ancienne passerelle de session n'est pas initialisée. Cette exception est impossible sur le projet vert ; les garde-fous bleu conservent les soumissions et imports en `DRY_RUN`, les courriels en `DISABLED` et les mutations administratives en `DRY_RUN`.
- Les outils administratifs calculent maintenant leur URL de base depuis le déploiement courant au lieu d'un ancien identifiant de déploiement vert.
- Aucun accès à la production Grist, aucune écriture métier, aucun import, courriel, PDF ou ordre de mission n'a été exécuté pendant ce correctif.

## Mise à jour du 7 octobre 2026 — DEV484 (régressions ciblées sur le canal BLEU)

- Aucun changement n'a été appliqué aux deux Web Apps vertes, qui restent sur la version immuable `881`. Les correctifs de ce lot sont destinés exclusivement au projet Apps Script bleu avant recette navigateur.
- La page Apprentis lançait jusqu'à trois calculs concurrents de `EUC_DEV251_dashboardDetails` au chargement puis un nouveau calcul à chaque survol. Les infobulles utilisent maintenant un état partagé : une seule lecture est en vol, son résultat est réutilisé instantanément par tous les KPI et une sauvegarde explicite peut seule demander une actualisation.
- Le générateur d'ordres de mission ignorait les affectations visiteur récentes dès qu'il trouvait un snapshot rapide et écartait aussi les lignes dont le statut canonique indiquait « Convention enregistrée/signée » lorsque `conventionId` n'était pas transporté par ce snapshot. La réconciliation ciblée des affectations est désormais appliquée à tous les chemins de lecture et ces statuts canoniques sont éligibles, hors annulation/interruption.
- L'accueil administratif du suivi retrouve ses cartes sobres : les trois commentaires ajoutés sous BAC PRO, BTS et CAP sont supprimés au rendu, la hauteur artificielle est retirée et le lien `Accueil PFMP` reste vert dans tous ses états, y compris après visite. La transformation est limitée à la route administrative.
- La route `suivi-conventions-public` continue d'utiliser son modèle public séparé, lequel ne contient ni bouton ni fil `Accueil PFMP`. Aucun comportement public n'a été transformé par le nettoyage visuel administratif.
- Tests ciblés : `5/5` DEV484, `12/12` DEV472, `12/12` DEV481, `8/8` DEV470 et `5/5` DEV449. Aucun accès Grist, aucune écriture métier, aucun import, courriel, PDF ou ordre de mission n'a été exécuté pendant ces contrôles.

## Mise à jour du 7 octobre 2026 — DEV483 (projet BLEU réellement isolé)

- Le projet Apps Script `Eucalyptus PFMP — Développement BLEU` a été créé séparément du projet stable. Son ID est `1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo` et son déploiement de test `@HEAD` est `AKfycbxZ24Op4PNUx6_SfDhA_3vOYTv4vUVRHTVrtjg1bYQ`. Le projet vert et ses deux Web Apps restent inchangés sur la version immuable `881`.
- Le constructeur de release place le routeur existant derrière un point d'entrée unique qui ajoute un macaron visuel : bleu « DÉVELOPPEMENT » dans le nouveau projet, vert « VERSION EN LIGNE » dans le projet stable après la prochaine promotion contrôlée.
- `prepare` publie maintenant exclusivement dans le projet bleu. `promote` relit l'empreinte distante bleue, copie exactement le même paquet dans le projet stable, crée une version immuable puis rattache seulement les deux déploiements verts existants. Le retour automatique reste obligatoire si la recette verte échoue.
- La fonction `EUC_RELEASE_configurerProjetBleu` initialise les seules propriétés non sensibles, impose la recette `j1jDArBkzi7P` et maintient imports, courriels et mutations en `DRY_RUN`/`DISABLED`. La même garde est appliquée automatiquement avant chaque page bleue. La clé Grist n'est ni copiée ni stockée dans Git : une clé limitée à la recette doit encore être saisie manuellement dans les propriétés du nouveau projet, puis contrôlée avec `EUC_RELEASE_controlerProjetBleu`.
- Le paquet des `370` fichiers du commit a été poussé sur le `HEAD` bleu puis relu avec une empreinte identique. Le contrôle HTTP sans session retourne volontairement `Authorization needed` sur les `25` routes, car `/dev` est réservé aux éditeurs ; cela n'est pas une erreur applicative. Le paquet reste en attente. Après recette réelle des 25 routes, `approve-development COMMIT 25-ROUTES-VALIDEES` exige le SHA exact, reconstruit le paquet et relit l'empreinte distante avant de créer le candidat promouvable.
- Aucun accès à la production Grist, aucune écriture métier, aucun import, courriel, PDF ou ordre de mission n'a été déclenché. Aucune promotion verte n'a été réalisée.

## Mise à jour du 7 octobre 2026 — DEV482 (workflow de release bleu / vert)

- Un workflow de publication contrôlé est installé dans `scripts/pfmp-release.sh`. `prepare` travaille depuis un clone propre du commit, exécute la suite complète, construit le paquet Apps Script complet, pousse uniquement `@HEAD`, relit le distant par empreinte logique et contrôle 25 routes. `promote` exige exactement le candidat validé, crée une version immuable, met à jour uniquement les deux Web Apps stables existantes et revient automatiquement aux versions précédentes si la recette verte échoue.
- La suite complète est désormais verte : `560/560` tests. Les anciennes assertions `dev.8` / `dev.27` ont été réalignées sur les versions réellement présentes sans supprimer de contrôle métier. Les dépendances de test qui n'étaient présentes que dans le répertoire de travail sont maintenant versionnées ; un commit propre est reproductible.
- Le paquet complet contient `368` fichiers Apps Script logiques. La relecture distante est identique ; la comparaison normalise uniquement l'extension `.gs` restituée en `.js` par `clasp pull`, tout en comparant strictement les noms logiques et les octets.
- Le canal bleu `@HEAD` a été mis à jour sans modifier les URL vertes. Le contrôle réel donne `18/25` routes valides. Les sept autres sont arrêtées par la garde de cible Grist : les propriétés Apps Script sont partagées avec le vert et leur cible actuelle ne correspond pas à la recette désormais autorisée `j1jDArBkzi7P`.
- Aucune promotion n'a donc été réalisée. Les deux Web Apps stables restent sur la version immuable `881`; aucune propriété partagée n'a été changée. Changer la cible commune maintenant couperait la version stable. Une décision est nécessaire entre un projet Apps Script de développement réellement isolé (recommandé) et une migration coordonnée de la configuration commune.
- Aucun accès à la production Grist interdite, aucune écriture élève/convention/affectation, aucun import, aucun courriel, PDF ou ordre de mission n'a été déclenché.

## Mise à jour du 6 octobre 2026 — DEV480 (publication effective des réglages de courriel)

- Le contrôle navigateur après DEV479 a révélé que les versions `878` et `879` avaient été créées puis attachées aux Web Apps sans les deux fichiers modifiés : le répertoire de préparation ne respectait pas le `rootDir` `apps-script` de `.clasp.json`. Les numéros de version étaient donc corrects, mais l'interface servie restait l'ancienne.
- La préparation du déploiement a été corrigée, les sources ont été réellement poussées, puis la version Apps Script immuable `880` a été publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante des deux fichiers est strictement identique aux sources testées.
- Contrôle navigateur réel de la version `880` : la rubrique `Gérer les modèles de courriel` expose bien `Texte de {{EXPEDITEUR}}`, `Lien de la procédure` et `Copie conforme systématique`; la liste des variables inclut `{{PROCEDURE}}` et le lien `Accueil PFMP` vise toujours `https://alternance.loucodi.fr/`.
- Les fonctionnalités DEV478 et DEV479 sont donc effectivement disponibles à partir de la version `880`. Aucun courriel, PDF ou ordre de mission réel n'a été généré ou envoyé ; aucune donnée Grist n'a été lue ou écrite et la production Grist interdite n'a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV479 (copie conforme des courriels de mission)

- Tous les envois d’ordres de mission, prévisionnels comme définitifs, utilisent maintenant un véritable champ `CC` avec `bfe@lycee-les-eucalyptus.org` par défaut. La copie reçoit le même message et la même pièce jointe que le professeur destinataire.
- L’adresse est visible et modifiable dans `Ordres de mission → Gérer les modèles de courriel → Copie conforme systématique`. Sa syntaxe est contrôlée avant enregistrement.
- La fenêtre de confirmation annonce le destinataire principal et la copie avant toute génération. Après envoi, le résultat rappelle les deux adresses. La protection contre le double envoi inclut également l’adresse de copie.
- Tests ciblés : `12/12` DEV472 et `18/18` DEV461. La suite complète conserve exactement les sept échecs historiques déjà documentés et n’introduit aucun nouvel échec.
- La version `879` a été attachée aux Web Apps mais n'embarquait pas encore ces fichiers à cause du défaut de préparation décrit dans DEV480. La publication effective est la version `880`.
- Aucun courriel, PDF ou ordre de mission réel n’a été généré ou envoyé ; aucune donnée Grist n’a été lue ou écrite et la production Grist interdite n’a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV478 (procédure cliquable et signature des courriels de mission)

- Les courriels d’ordre de mission disposent maintenant d’une version HTML et d’une version texte de secours. Dans le courriel HTML, le mot « procédure » est cliquable et ouvre la fiche de remboursement fournie sur Google Drive ; l’adresse brute n’apparaît pas dans le corps du message.
- Le rendu couvre le modèle définitif par défaut avec `{{PROCEDURE}}` et les modèles déjà enregistrés qui contiennent le mot « procédure ». Aucun second PDF n’est joint : seule la pièce jointe de l’ordre de mission reste envoyée.
- La rubrique `Gérer les modèles de courriel` expose deux réglages persistants hors Grist : `Texte de {{EXPEDITEUR}}`, fixé par défaut à `Bureau des entreprises`, et `Lien de la procédure`. La prévisualisation affiche réellement le mot cliquable. Le compte technique d’envoi, le nom visible et l’adresse de réponse restent affichés séparément et inchangés.
- Tests ciblés : `12/12` DEV472 et `18/18` DEV461. La suite complète conserve exactement les sept échecs historiques déjà documentés et n’introduit aucun nouvel échec.
- La version `878` a été attachée aux Web Apps mais n'embarquait pas encore ces fichiers à cause du défaut de préparation décrit dans DEV480. La publication effective est la version `880`.
- Aucun courriel, PDF ou ordre de mission réel n’a été généré ou envoyé ; aucune donnée Grist n’a été lue ou écrite et la production Grist interdite n’a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV477 (calage des tableaux et signatures des ordres de mission)

- Le PDF définitif fourni a été contrôlé visuellement sur ses deux pages. Sur la première page, le tableau des élèves conserve sa largeur et son contenu mais son retrait gauche passe de `12 pt` à `40 pt`, soit un déplacement supplémentaire d’environ `1 cm` vers la droite, sans modifier les marges globales ni le modèle Google Docs.
- Sur la seconde page, une colonne invisible de `9 pt` (environ `3 mm`) sépare maintenant le tableau récapitulatif des encarts de signature. Les deux encarts sont des tableaux distincts séparés verticalement de `8 pt`; leurs libellés « Date et signature… » sont centrés horizontalement et verticalement.
- Le calcul de hauteur des encarts conserve la contrainte de quinze élèves sur une seule page A4 paysage. Les colonnes métier, les deux lignes de précisions complémentaires et le contenu des ordres de mission ne sont pas modifiés.
- Tests ciblés : `18/18` DEV461 et `12/12` DEV472. La suite complète conserve exactement les sept échecs historiques déjà documentés et n’introduit aucun nouvel échec.
- Déploiement : version Apps Script immuable `877` publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante confirme une empreinte strictement identique à la source testée.
- Aucun ordre de mission réel, PDF métier ou courriel n’a été généré ou envoyé ; aucune donnée Grist n’a été lue ou écrite et la production Grist interdite n’a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV476 (modèles de courriel des ordres de mission)

- La tentative accompagnée de l’exception Google Docs n’a envoyé aucun message : `EUC_DEV440_sendMissionTransportEmail` génère d’abord le PDF, puis appelle `MailApp.sendEmail`. L’exception s’est donc produite avant l’instruction d’envoi, ce qui explique l’absence de message dans les éléments envoyés.
- La page `Ordres de mission` comporte maintenant une rubrique repliable `Gérer les modèles de courriel`. Elle distingue les textes prévisionnel et définitif, permet de modifier l’objet et le corps, affiche une prévisualisation, propose une restauration des textes par défaut et persiste les réglages dans les propriétés Apps Script, sans accès Grist.
- Les variables autorisées sont explicitement contrôlées : `{{PROFESSEUR}}`, `{{CLASSE}}`, `{{PERIODE}}`, `{{DEBUT}}`, `{{FIN}}`, `{{TYPE}}` et `{{EXPEDITEUR}}`. Une variable inconnue bloque l’enregistrement au lieu de produire un courriel incomplet.
- L’écran affiche le compte expéditeur effectif du déploiement, le nom visible et l’adresse de réponse. Contrôle réel en lecture seule : expéditeur `rudy.themines@lycee-les-eucalyptus.org`, nom visible `PFMP — Lycée Les Eucalyptus`, réponse vers l’administrateur actif.
- Le succès d’envoi renvoie désormais l’horodatage, le compte expéditeur et l’adresse de réponse ; l’interface rappelle le compte utilisé. `MailApp` reste volontairement conservé : aucun élargissement d’autorisation Gmail et aucun envoi de contrôle n’ont été réalisés.
- Tests ciblés : `18/18` DEV461 et `12/12` DEV472. La suite complète conserve exactement les sept échecs historiques déjà documentés et n’introduit aucun nouvel échec.
- Déploiement : version Apps Script immuable `876` publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante confirme que le serveur et l’interface publiés sont identiques aux sources testées. Aucun courriel, PDF ou ordre de mission réel n’a été envoyé ou généré ; aucune donnée Grist n’a été lue ou écrite et la production interdite n’a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV475 (modèle mission terminé par la liste des élèves)

- Le modèle Google Docs `Ordre_de_mission_ok_suivi pfmp` a été contrôlé en lecture seule : un seul onglet, les neuf champs de fusion attendus et `{{LISTE_ELEVES}}` placé en dernière position utile, après le bloc de signature du proviseur. Le modèle n’a pas été modifié.
- Cause de l’exception « Impossible de supprimer le dernier paragraphe d’une partie du document » : après insertion du tableau, le compacteur tentait de retirer le paragraphe vide terminal. Google Docs impose qu’une partie conserve ce dernier paragraphe.
- Le marqueur `{{LISTE_ELEVES}}` est maintenant vidé sans supprimer son paragraphe, puis le tableau est inséré à son emplacement. Le compactage préserve toujours le dernier paragraphe obligatoire ; le moteur accepte donc un modèle dont la liste des élèves termine le contenu utile.
- Les courriels d’ordre de mission sont envoyés par `MailApp` sous l’identité du propriétaire du déploiement (`executeAs: USER_DEPLOYING`), actuellement `rudy.themines@lycee-les-eucalyptus.org`, avec le nom visible « PFMP — Lycée Les Eucalyptus ». L’adresse de réponse est celle de l’administrateur actif. L’objet et le corps restent définis dans `EUC_DEV440_prepareMissionTransportEmail` et ne disposent pas encore d’un écran de paramétrage.
- Tests ciblés : `18/18` DEV461 et `9/9` DEV472. La suite complète conserve exactement les sept échecs historiques déjà documentés et n’introduit aucun nouvel échec.
- Déploiement : version Apps Script immuable `875` publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante confirme que le générateur publié est identique à la source testée.
- Aucun courriel ni ordre de mission réel n’a été envoyé ou généré pendant le correctif ; aucune donnée Grist n’a été lue ou écrite et la production Grist interdite n’a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV474 (récapitulatif des visites sur une page A4)

- La troisième page provenait du bloc horizontal des signatures, ajouté sous un tableau déjà dimensionné sur toute sa largeur. Le récapitulatif paysage utilise maintenant la bande libre à droite du tableau des élèves : `630 pt` pour les douze colonnes existantes et `145 pt` pour deux encarts empilés « Date et signature du professeur » puis « Date et signature du directeur délégué aux formations ».
- La hauteur des deux encarts suit le nombre de lignes et reste bornée pour conserver jusqu’à `15` élèves sur la même page A4 paysage. Les largeurs des colonnes métier et la première page de l’ordre de mission ne sont pas modifiées.
- « Précisions complémentaires » comporte désormais exactement deux lignes et couvre toute la largeur utile de la page (`775 pt`), au lieu de six lignes limitées à la largeur du tableau. Le bloc de signatures inférieur qui créait la troisième page est supprimé.
- Contrôle visuel hors ligne avec quinze élèves fictifs : une seule page A4 paysage, quinze lignes lisibles, signatures dans la bande droite, deux lignes de précisions sur toute la largeur et aucun chevauchement ni élément coupé.
- Tests ciblés : `15/15` DEV461 et `9/9` DEV472. La suite complète conserve exactement les sept échecs historiques déjà documentés et n’introduit aucun nouvel échec.
- Déploiement : version Apps Script immuable `874` publiée sur les deux Web Apps existantes, URL inchangées. Une relecture complète depuis Google confirme que le générateur distant est strictement identique à la source testée.
- Aucun ordre de mission réel, PDF métier ou courriel n’a été généré ; aucune donnée élève, convention, affectation ou autre donnée métier Grist n’a été écrite. La production Grist interdite n’a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV473 (Accueil des missions et autocomplétion professeurs)

- La page des ordres de mission réécrivait encore son lien `Accueil PFMP` vers la route Apps Script interne après le rendu. Le lien est maintenant déclaré directement avec `href="https://alternance.loucodi.fr/"` et `target="_top"`; aucun script ne peut plus le remplacer par `?page=admin-pfmp`.
- L’audit des huit fichiers réellement publiés qui contiennent le libellé `Accueil PFMP` confirme que toutes les vues administratives actives connaissent le sous-domaine canonique. Le test DEV470 inclut désormais explicitement les ordres de mission et interdit le retour de l’ancienne réécriture locale.
- Cause de l’autocomplétion bloquée sur `Chargement des professeurs…` : la fiche appelait encore le point serveur historique `EUC_DEV435_professeursDisponibles`, absent du paquet actif. Le point d’accès est restauré sur le lecteur ciblé DEV448, protégé par le contexte administrateur et servi par le cache professeurs existant. En cas d’échec, le champ affiche désormais l’erreur et permet une nouvelle tentative au lieu de rester indéfiniment en chargement.
- Contrôle navigateur réel TRMO / PFMP n°1 : la saisie `huar` dans Professeur visiteur retourne `M. JEROME HUART`, sa discipline et son adresse institutionnelle. Le lien `Accueil PFMP` de la page des missions rend exactement `https://alternance.loucodi.fr/`. Aucune affectation n’a été déclenchée.
- Tests ciblés : `11/11` DEV448, `20/20` DEV455, `10/10` DEV462, `8/8` DEV470, `9/9` DEV472 et `10/10` DEV461. La suite complète conserve exactement les sept échecs historiques déjà documentés et n’introduit aucun nouvel échec.
- Déploiement : version Apps Script immuable `873` publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante avant création de version est identique pour les trois fichiers corrigés. La version `872`, créée avant le signalement de l’autocomplétion, n’a jamais été attachée aux Web Apps.
- Aucune affectation, donnée élève, convention ou autre donnée métier Grist n’a été écrite ; aucun PDF, courriel ou ordre de mission n’a été généré. La production Grist interdite n’a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV472 (ordres de mission intégrés à la fiche de classe)

- La fiche de classe administrative comporte désormais un unique bouton `Ordres de mission`, ajouté à côté de l’export PDF sans modifier le tableau des élèves, les compteurs ni les commandes d’affectation. Il transmet au Web App administrateur l’année scolaire, la famille, la classe et la période déjà affichées.
- La page des ordres de mission reçoit ce contexte depuis les paramètres externes Apps Script et sélectionne automatiquement les quatre filtres. Contrôle réel depuis TCAR / PFMP n°1 : `2026-2027`, `BACPRO`, `TCAR`, `PFMP n°1`, puis chargement automatique de deux groupes — M. SYLVAIN DELACHE (`10` visites) et M. GERALD FLORIOT (`9` visites), soit les `19` élèves attendus, dont Barbosa et Ben Khaled.
- Le catalogue de sélection réutilise les vues familiales déjà préparées et leurs caches persistant/mémoire. Il ne télécharge plus l’index nominatif global pour construire la liste des classes : `26` classes BAC Pro sont disponibles lors du contrôle, et une classe sans période reste sélectionnable avec le libellé explicite `Aucune période affichée`.
- La gestion des modèles affiche une ligne par modèle, avec un bouton radio garantissant un seul modèle par défaut et une commande de suppression. Le modèle Eucalyptus standard est protégé ; supprimer un modèle personnalisé retire uniquement sa configuration et ne supprime jamais le document Google Docs. Aucun modèle personnalisé n’était enregistré lors de la recette.
- Tests ciblés : `9/9` DEV472, `10/10` DEV461, `10/10` DEV462, `10/10` DEV448. La suite complète conserve exactement les sept échecs historiques déjà documentés et n’introduit aucun nouvel échec.
- Déploiement : version Apps Script immuable `871` publiée sur les deux Web Apps existantes, URL inchangées. Le contrôle navigateur réel confirme le préremplissage, la liste complète des classes et périodes, le chargement des missions et l’affichage du modèle protégé par défaut.
- Aucun PDF, courriel ou ordre de mission n’a été généré ; aucun modèle n’a été supprimé ou changé par défaut ; aucune donnée élève, convention, affectation ou autre donnée métier Grist n’a été écrite. La production Grist interdite n’a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV471 (écran Ordres de mission restauré)

- La route `ordres-mission-pfmp` appelait bien `Ordres_Mission_PFMP_V368`, mais ce modèle HTML n'était pas présent dans la branche déployée. Le moteur, la génération PDF et les données n'étaient pas en cause.
- Le modèle HTML précédemment validé est restauré sans modification du moteur d'ordre de mission ni des autres pages. Un test interdit désormais de livrer la route sans son fichier HTML.
- Tests : `10/10` DEV461. La suite complète conserve exactement les sept échecs historiques déjà documentés et n'introduit aucun nouvel échec.
- Déploiement : version Apps Script immuable `864` publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante confirme que le modèle est identique à la source ; le contrôle navigateur réel affiche l'écran « Ordres de mission — visites PFMP », ses filtres et le bouton `Afficher` sans erreur.
- Aucun filtre n'a été lancé, aucun ordre de mission n'a été généré ou envoyé et aucune donnée Grist n'a été modifiée.

## Mise à jour du 6 octobre 2026 — DEV470 (Accueil PFMP canonique)

- Tous les boutons et liens visibles « Accueil PFMP » des écrans administratifs pointent désormais vers `https://alternance.loucodi.fr/`, avec navigation dans la fenêtre haute. Ils ne dépendent plus de l'URL Apps Script courante ni du déploiement qui a rendu la page.
- La normalisation couvre les vues actives suivies dans Git : synthèses, familles, détails de classe, apprentis, migration JotForm et géocodage. Les autres liens internes restent sur leurs routes administratives ou publiques respectives.
- Le contrôle après publication a révélé que d'anciens wrappers DEV394 appelaient encore un profiler temporaire qui n'est plus livré. Trois fonctions de compatibilité neutres restaurent ces routes sans écriture de trace, sans appel réseau et sans accès Grist.
- Le centre administrateur accepte aussi l'authentification Google Workspace existante lorsque l'ancienne passerelle multi-domaines DEV270B n'est pas livrée. Le retour par le sous-domaine ne dépend donc plus de ce module historique.
- Le fil d'Ariane du détail de classe expose maintenant de vrais liens `href` en `_top` et son indicateur de chargement navigue lui aussi dans la fenêtre haute ; il ne peut plus enfermer l'accueil dans l'iframe Apps Script.
- Tests ciblés : `7/7` DEV470, `15/15` DEV459, `6/6` DEV463 et `15/15` DEV464. La suite complète conserve exactement les sept échecs historiques déjà documentés et n'introduit aucun nouvel échec.
- Déploiement : version Apps Script immuable `863` publiée sur les deux Web Apps existantes, URL inchangées, après comparaison exacte des fichiers relus depuis Google. Contrôle navigateur réel depuis la synthèse puis depuis le détail TCAR / PFMP n°1 : le lien rendu est exactement `https://alternance.loucodi.fr/`, cible `_top`, et le clic aboutit au « Centre d’administration PFMP + Apprentis » sans page blanche.
- Le contrôle navigateur s'est limité à l'affichage en lecture seule de la recette ; aucune donnée Grist n'a été modifiée, aucun import, courriel, ordre de mission ou traitement métier n'a été déclenché et la production Grist interdite n'a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV469 (affectations professeur durables à la relecture)

- Une affectation administrateur n'était pas perdue : le message de succès n'est renvoyé qu'après le `PATCH` ou le `POST` Grist. En revanche, le détail de classe conservé jusqu'à six heures dans `CacheService` pouvait réafficher l'ancien professeur après un changement de classe.
- Le détail compare désormais la révision DEV457 de `EUC_AFFECTATIONS_SUIVI_PFMP` avec celle embarquée dans son cache. Si elle a changé, une seule lecture Grist filtrée sur l'année, la classe et la période réconcilie les suivis téléphoniques et visiteurs puis remplace le cache ; si elle est identique, aucune lecture supplémentaire n'est effectuée.
- Le même mécanisme couvre les affectations administrateur, les affectations par code professeur principal, les réaffectations et les retraits. Une valeur retirée ne peut plus réapparaître depuis un ancien snapshot.
- Tests ciblés : `20/20` DEV455, `10/10` DEV448 et `10/10` DEV462. La suite complète conserve exactement les sept échecs historiques déjà documentés et n'introduit aucun nouvel échec.
- La version Apps Script immuable `859` a été publiée sur les deux Web Apps existantes, URL inchangées, après relecture distante identique de la source corrigée. Contrôle navigateur réel : après ouverture d'une autre classe puis retour dans TMVA1 / PFMP n°1, les `25` lignes sont présentes et les affectations visiteur déjà enregistrées restent affichées sur `24` élèves ; aucune affectation téléphonique n'était enregistrée sur cette période.
- Aucun professeur n'a été affecté ou retiré pendant le correctif, aucune donnée Grist n'a été modifiée et la production Grist interdite n'a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV468 (dates JotForm incluses dans une période officielle)

- Le blocage de `GHARDA Sayane` s'est produit pendant le précontrôle, avant toute écriture : aucune convention partielle et aucune modification élève n'ont été créées. Les dates JotForm `04/10/2026 → 15/10/2026` étaient entièrement incluses dans la PFMP officielle `28/09/2026 → 16/10/2026`, mais l'ancien rapprochement refusait tout début décalé de plus de trois jours.
- Le rapprochement accepte désormais un intervalle JotForm inclus seulement s'il appartient à une unique période officielle de la vraie classe et de la même année scolaire. Les bornes enregistrées restent celles de la période officielle ; un simple chevauchement, une autre classe, une période P.dif. ou plusieurs fenêtres possibles restent bloquants pour contrôle manuel.
- La règle utilise les métadonnées de période déjà chargées par le précontrôle et n'ajoute aucun appel Grist.
- Tests ciblés : `15/15` DEV466/DEV468. La suite complète conserve exactement les sept échecs historiques déjà documentés et n'introduit aucun nouvel échec.
- Le code a été poussé dans la tête du projet Apps Script puis relu avec une empreinte identique à la source testée. Après autorisation explicite, les 50 versions anciennes non déployées `664` à `713` ont été supprimées ; les versions utilisées par les déploiements actifs ont été conservées. La version immuable `858` a ensuite été créée et publiée sur les deux Web Apps existantes, URL inchangées. Aucun déploiement n'a été remplacé par `HEAD`.
- Aucun import n'a été déclenché, aucune donnée Grist n'a été modifiée et la production Grist interdite n'a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV467 (correspondances Pronote et choix de formation du dossier d’apprentissage)

- Le tableau de correspondance fourni a été intégré au dossier d’apprentissage. L’interface propose désormais un choix combiné `diplôme — niveau d’entrée`, puis alimente automatiquement « Formation préparée » avec le diplôme choisi.
- L’année d’entrée est une liste fermée de `2023-2024` à `2037-2038`; l’année scolaire déterminée à partir de la date courante est sélectionnée par défaut (`2026-2027` lors de la recette). Le choix reste une variable du dossier et n’est pas encore imprimé tant que le calage PDF correspondant n’est pas demandé.
- Le catalogue diplôme/niveaux peut être modifié depuis l’écran administrateur. Il est conservé dans les propriétés Apps Script, hors Grist, et sa lecture ou sa modification ne consomme donc aucun appel API Grist.
- Le prochain import Pronote complet conservera les colonnes validées utiles au dossier : lieu de naissance, nationalité, dernier établissement, dernière classe, dernier diplôme préparé, téléphones fixe/portable/professionnel et profession des responsables. `HEBERGE` alimente l’indicateur de responsable en charge. Le correctif antérieur de contrôle des dates de naissance a été conservé lors du réalignement Git/distant.
- Aucun import réel n’a été exécuté : les dossiers déjà présents ne sont pas rétroalimentés automatiquement. Les nouveaux champs seront renseignés au prochain import Pronote explicitement autorisé, si les colonnes existent dans l’export ; les valeurs absentes restent vides et modifiables dans l’interface.
- Tests ciblés DEV464/DEV467 : `15/15`. La suite complète conserve exactement les sept échecs historiques déjà documentés et n’introduit aucun nouvel échec.
- Déploiement : version Apps Script immuable `857` publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante des quatre fichiers du lot est identique à la source contrôlée ; le manifeste conserve `USER_DEPLOYING` / `ANYONE_ANONYMOUS`.
- Contrôle navigateur réel en lecture seule : l’index charge `788` élèves, la liste d’années contient les quinze valeurs attendues avec `2026-2027` sélectionnée, et le choix `BAC PRO Maintenance des Véhicules — Première` remplit immédiatement « Formation préparée » avec `BAC PRO Maintenance des Véhicules`.
- Aucune donnée Grist, aucun élève, aucune convention, aucun courriel et aucun ordre de mission n’ont été modifiés. La production Grist interdite n’a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV466 (import JotForm fiable et publication atomique)

- Le bouton final de migration JotForm utilise désormais un import de lot dédié. La sélection est obligatoirement explicite et le précontrôle de toutes les lignes est terminé avant la première écriture : élève rapproché, classe actuelle, période officielle non ambiguë, année scolaire et SIRET vérifié.
- La clé métier est `élève + classe + période + année`. Une convention QR/JotForm déjà complète avec le même SIRET est reconnue sans nouvelle création ; un dossier incomplet est seulement complété ; un autre SIRET provoque un conflit bloquant et aucune convention existante n'est écrasée.
- Les créations et compléments sont envoyés en écritures Grist groupées, puis une seule relecture contrôle les clés et SIRET réellement enregistrés. La reconstruction atomique est limitée aux classes/périodes touchées et le tampon JotForm n'est marqué validé qu'après présence effective de chaque convention dans la liste publiée de sa classe.
- Les caches familial, persistant et canonique vérifient maintenant la révision atomique. Une ancienne vue ne peut donc plus masquer pendant plusieurs heures une convention qui vient d'être importée ; une publication incomplète laisse le tampon à contrôler et le même lot peut être relancé sans créer de doublon.
- Le bilan utilisateur distingue les lignes créées, complétées, déjà existantes, vérifiées dans Grist et vérifiées dans les listes de classes. Aucun balayage de toutes les années, familles ou périodes n'est lancé après l'import.
- Correctif DEV466b après le premier essai réel : le journal Apps Script a localisé le `404` dans la lecture de l'ancienne table facultative `EUC_OFFRES_PERIODES`, absente du document courant. Comme dans le moteur historique, les quatre tables d'aide de rattachement sont désormais optionnelles et DEV312 utilise les métadonnées de classe/JotForm disponibles. L'échec était antérieur au passage en écriture ; aucun dossier n'avait été partiellement modifié. Le nouvel essai a été confirmé fonctionnel par l'utilisateur.
- Tests ciblés : `12/12` DEV466, `8/8` DEV453, `17/17` DEV455, `14/14` DEV456, `5/5` DEV457 et `15/15` DEV459. La suite complète conserve uniquement les sept échecs historiques déjà documentés ; aucun nouvel échec n'est introduit.
- Déploiement : version Apps Script immuable `856` publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante des fichiers publiés est identique au paquet testé, le manifeste conserve `USER_DEPLOYING` / `ANYONE_ANONYMOUS` et la page administrateur de migration a été ouverte avec succès après publication.
- Aucun import n'a été déclenché pendant ce lot et aucune donnée élève ou convention n'a été écrite. Aucun courriel, ordre de mission ou géocodage réel n'a été lancé ; la production Grist interdite n'a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV465 (données élève et calage du dossier d’apprentissage)

- Le fichier Pronote réellement importé contient la date de naissance, l’adresse élève, le code postal, la ville, le pays, le courriel, le téléphone, l’INE/numéro national et la formation. Il ne contient pas la nationalité, le lieu de naissance ni le NIR ; ces trois champs restent donc volontairement vides au lieu d’être déduits ou inventés.
- Quand l’adresse élève est absente, le dossier reprend désormais l’adresse, le code postal, la ville et le pays du responsable légal prioritaire, puis du responsable en charge. L’INE n’est jamais réutilisé comme NIR. L’année scolaire est complétée avec l’année courante et le dernier établissement est fixé au `Lycée Les Eucalyptus`.
- La formation n’est plus injectée dans le pied CFA de la page 2 : elle est placée dans `Dernière classe fréquentée` en page 1, avec l’établissement et l’année scolaire. La date et le lieu de naissance ont des zones séparées.
- La page 7 place la date et le lieu de naissance sur leur ligne et décale le téléphone et le courriel afin de ne plus recouvrir leurs libellés. La date d’impression et la pagination ajoutées par l’application sont remontées dans la marge utile sur les huit pages.
- Contrôle visuel hors ligne sur les huit pages du modèle, avec données fictives, puis contrôle du Web App administrateur réellement servi : l’index charge toujours `788` élèves et le dossier ciblé s’ouvre sans écriture métier. Les pointillés du modèle peuvent être retirés à condition de conserver strictement le format A4, l’ordre, le nombre de pages et la position des libellés.
- Tests ciblés DEV464/DEV465 : `11/11`. La suite complète conserve uniquement les sept échecs historiques déjà documentés (routeur ancien, versions dev.8/dev.27 et audit dev.9 absent) ; aucun test du lot n’échoue.
- Déploiement : version Apps Script immuable `854` publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante des deux fichiers modifiés est identique à la copie locale et le manifeste conserve `USER_DEPLOYING` / `ANYONE_ANONYMOUS`.
- Aucune donnée Grist, aucun élève, aucune convention, aucun courriel et aucun ordre de mission n’ont été modifiés. La production Grist interdite n’a pas été consultée.

## Mise à jour du 6 octobre 2026 — DEV464 (navigation canonique et dossier d’apprentissage)

- Correctif DEV464c après contrôle réel : la tuile du dossier utilisait encore une URL relative, résolue par Apps Script dans l’iframe technique `googleusercontent.com/userCodeAppPanel`, d’où la page blanche. La tuile et le retour « Administration PFMP » visent désormais explicitement le Web App administrateur existant et utilisent `target="_top"`. Les tests interdisent le retour à une navigation relative ou au déploiement public.
- Cause de la divergence lors d’un changement de classe par la liste déroulante : la navigation rapide appelait encore `EUC_DEV416_finalDetail_`, alors que l’ouverture directe utilisait la vue canonique DEV455/DEV459. La navigation rapide utilise désormais `EUC_DEV455_fastDetail_`, applique le même nettoyage périodique et conserve la séparation stricte administration/public. L’URL interne est synchronisée après le changement afin qu’un rafraîchissement conserve la classe réellement affichée.
- La rapidité des cartes et infobulles n’est pas modifiée : elles continuent à consommer le résumé familial canonique préparé et mémorisé, sans reconstruction Grist au survol. Les mutations prises en charge invalident les caches ciblés ; aucune durée supplémentaire n’a été ajoutée à ce chemin.
- Nouvelle entrée administrateur `Dossier de demande d’apprentissage`. L’autocomplétion charge une seule fois un index minimal nom/prénom/classe, puis le dossier sélectionné rassemble les coordonnées élève, deux responsables légaux au maximum, les identifiants disponibles et le dernier épisode d’apprentissage.
- Le numéro national/INE et le NIR restent deux champs distincts : aucune valeur n’est copiée de l’un vers l’autre. Les données absentes restent vides et peuvent être complétées dans l’interface avant génération.
- Le PDF fusionné fourni sert de modèle local de huit pages, dans l’ordre annexe 11, annexe 12d puis positionnement. Le navigateur superpose les valeurs sans téléverser le modèle, ajoute la date d’impression sur chaque page et ne crée aucun historique d’impression, conformément à la demande finale.
- Contrôle visuel hors ligne avec des valeurs fictives : les zones principales des pages 1 à 4 et 7 sont calées sur le PDF fourni, et le pied de page daté reste dans la marge sur les huit pages.
- Tests ciblés : `15/15` DEV459, `6/6` DEV463 et `9/9` DEV464. La suite complète exécutée depuis l’état publié conserve six échecs historiques (routeur ancien, versions dev.8/dev.27 et audit dev.9 manquant) ; aucun nouveau test du lot n’échoue.
- Déploiement : version Apps Script immuable `853` publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante est identique pour les fichiers de navigation corrigés et le manifeste conserve `USER_DEPLOYING` / `ANYONE_ANONYMOUS`. Le parcours réel centre administrateur → dossier → retour administrateur a été contrôlé ; l’index unique charge `788` élèves sans appel Grist à chaque frappe.
- Aucune donnée Grist, aucun élève, aucune convention, aucun courriel et aucun ordre de mission n’ont été modifiés pendant ce lot. La production Grist interdite n’a pas été consultée.

## Mise à jour du 5 octobre 2026 — DEV463 (routage administrateur, codes PP et fiche apprenti)

- Cause de la disparition des affectations : le centre administrateur injectait encore l’URL du Web App public dans ses liens dynamiques. L’écran ressemblait à l’administration, mais le détail était réellement rendu par le déploiement public, donc sans commandes de mutation. Le centre et tous les outils administratifs utilisent maintenant explicitement le Web App administrateur ; les navigations famille/période sortent de l’iframe avec `target="_top"`.
- Cause des codes PP neufs annoncés comme expirés : une date Grist numérique en secondes Unix était interprétée par JavaScript comme un nombre de millisecondes et retombait en 1970. Le lecteur accepte désormais secondes, millisecondes, chaîne numérique et ISO, avec repli sur la date de fin de PFMP. La règle métier reste inchangée : expiration le dernier jour de la période.
- La fiche apprenti affiche de nouveau le nom du responsable entreprise, son téléphone et son courriel, séparément du nom, du téléphone et du courriel du tuteur. La case « Tuteur identique au responsable » recopie les trois champs et les maintient synchronisés pendant la saisie.
- Les colonnes de la fiche sont rééquilibrées : largeur garantie pour les dates de début/fin et espace réservé à l’icône calendrier ; le bloc entreprise cède de la place aux deux blocs de contacts. Le responsable est transporté du chargeur Grist jusqu’au JSON puis à la sauvegarde ciblée.
- Le géocodage conserve l’architecture incrémentale DEV445 : comparaison SIRET/adresse en mémoire, BAN uniquement pour les adresses françaises nouvelles ou modifiées, puis écritures Grist groupées. La correction de routage rend également son retour Administration cohérent. Aucun géocodage réel n’a été lancé pendant ce lot.
- Tests ciblés : `6/6` DEV463, `10/10` DEV462, `16/16` DEV445, `10/10` DEV448 et `5/5` DEV449. La suite complète conserve exactement les sept échecs historiques déjà documentés ; aucun nouveau test n’échoue.
- Déploiement : version Apps Script immuable `848` publiée sur les deux Web Apps existantes, URL inchangées. La relecture distante est identique pour tous les fichiers du lot. Contrôle navigateur réel : le détail TCAR administrateur affiche les deux barres d’affectation ; la fiche Apprentis TMVA1 affiche les dates sans recouvrement ainsi que les deux contacts complets et la case de recopie. Le chargement TMVA1 mesuré après publication est de `9,137 s` : nette amélioration par rapport aux `35 s` signalées, mais l’objectif de `3 à 5 s` reste à traiter séparément.
- Aucune écriture élève/convention/affectation, aucun courriel, aucun ordre de mission et aucun géocodage réel n’ont été déclenchés ; la production Grist interdite n’a pas été consultée.

## Mise à jour du 5 octobre 2026 — DEV462 (navigation, apprentis et rendu canonique)

- Le fil d’Ariane est désormais déterministe : en administration, `Accueil PFMP` cible explicitement le Web App administrateur et ouvre le centre d’administration ; en consultation publique, ce cran n’est pas rendu et `Suivi des conventions` reste sur le déploiement public. Le choix ne dépend plus de `ScriptApp.getService().getUrl()`, ambigu avec deux déploiements du même projet.
- La synthèse famille retrouve ses groupes repliables calculés depuis les classes : Terminale/Première/Seconde en Bac Pro, première/deuxième année en BTS et première/terminale en CAP. Les clics de navigation affichent immédiatement un indicateur de chargement dans le contrôle activé.
- Le détail administrateur conserve toutes les commandes attendues : professeur principal, changement de classe, carte, PDF, accès PP, envoi du tableau, affectation téléphonique et affectation visiteur. La vue publique reste strictement en lecture seule.
- La remontée du circuit apprenti utilise maintenant les colonnes Grist exactes pour `Dossier distribué`, `Dossier remis`, `Transmis au CFA` et leurs dates. La sauvegarde transmet aussi la classe sélectionnée et invalide seulement les caches de cette classe, de ses périodes et de sa famille, sans lecture Grist supplémentaire.
- L’incohérence d’un apprenti signalé provenait d’un épisode actif dont la date de fin était antérieure à la date de début : l’écran Apprentis faisait confiance au statut actif tandis que la vue de classe appliquait le recouvrement de dates. Un épisode actif dans cet état est désormais classé comme ouvert jusqu’à correction de la donnée, avec un marqueur interne `dateIncoherente`; une rupture explicite reste prioritaire.
- Contrôle navigateur réel après publication : le clic `Accueil PFMP` affiche le centre d’administration ; TMVA1 / PFMP n°1 affiche `25` élèves, `7` apprentis, `16` conventions et `2` sans convention, avec l’apprenti signalé correctement classé et les deux barres d’affectation présentes. En public, TCAR / PFMP n°1 affiche `19/19`, soit `16 conventions + 3 apprentis`, sans lien Accueil administrateur.
- Le géocodage DEV445 reste incrémental : une lecture groupée du périmètre, une lecture de l’index géographique, déduplication et comparaison en mémoire, appels BAN uniquement pour les adresses françaises nouvelles ou modifiées, puis au maximum une écriture groupée de mises à jour et une de créations. Aucune campagne de géocodage réelle n’a été lancée pendant ce correctif.
- Tests ciblés : `15/15` DEV459, `10/10` DEV462, `16/16` DEV445, `10/10` DEV448 et `5/5` DEV449. La suite complète conserve exactement les sept échecs historiques déjà documentés ; aucun nouveau test n’échoue.
- Déploiement : version Apps Script immuable `846` publiée sur les deux Web Apps existantes, URL inchangées. Relecture distante identique pour les fichiers modifiés. Aucune écriture élève/convention/affectation, aucun courriel, aucun ordre de mission et aucun géocodage réel n’ont été déclenchés ; la production Grist interdite n’a pas été consultée.

## Mise à jour du 5 octobre 2026 — DEV459 à DEV461 (vue canonique transversale et ordre de mission)

- La cause finale de la divergence était double : le choix administration/public dépendait de l’URL renvoyée par `ScriptApp.getService()`, ambiguë dans un projet à deux déploiements, et un ancien snapshot familial pouvait conserver l’effectif tout en perdant les statuts convention/apprenti. Les routes sont maintenant explicites et les statuts sont reconstruits en une lecture groupée par famille à partir des conventions, apprentissages et affectations.
- Une donnée `quick` canonique alimente désormais à la fois les cartes, les infobulles et la liste détaillée. L’effectif courant complète les anciens détails sans appel par classe ; les valeurs P.dif. sont effacées de toute période ordinaire et restent limitées à la période P.dif.
- Audit matriciel réel : années `2025-2026` et `2026-2027`, familles BAC Pro/CAP/BTS, administration et public. L’année active couvre `34` classes, `62` périodes et `124` rendus administration/public ; aucune divergence de total, convention, apprentissage, P.dif. ou contenu admin/public. L’année `2025-2026` ne contient plus de classe exposée dans ces vues.
- Contrôle navigateur authentifié TCAR / PFMP n°1 : `19` élèves, `16` conventions, `3` apprentis, `0` sans convention ; Barbosa et Ben Khaled sont présents. L’administration affiche un seul fil commençant par `Accueil PFMP`, le professeur principal, le changement de classe, la carte, le PDF, l’accès PP, l’envoi du tableau et les deux affectations. Le public conserve le tableau complet mais aucune commande de mutation ; tous ses liens restent sur les routes publiques.
- Performances après amorçage : listes famille actives entre `3,33 s` et `5,82 s`, détail public TCAR `4,02 s`, détail administrateur chaud `4,75 s`. La première reconstruction familiale CAP/BTS après changement de format a pris respectivement `34,67 s` et `25,75 s`, puis n’est plus rejouée tant que le cache n’est pas invalidé.
- Géocodage : le fonctionnement incrémental DEV445 reste inchangé et testé (`16/16`) : index annuel unique, déduplication SIRET/adresse, seulement les nouvelles adresses, écritures regroupées et conservation des codes postaux comme texte.
- Ordres de mission : le tableau de première page est décalé vers la gauche et resserré pour rester dans la zone imprimable ; la seconde page reste en paysage avec récapitulatif, contacts, transport, kilomètres, justificatifs, précisions et signatures. Les variantes prévisionnelle/définitive, le véhicule personnel par défaut et le texte de courriel existant sont conservés. Aucun PDF ni courriel réel n’a été généré pendant cette recette.
- Tests ciblés finaux : `15/15` DEV459, `7/7` DEV461, `17/17` DEV455, `14/14` DEV456, `10/10` DEV448 et `16/16` DEV445. La suite complète finale conserve exactement les sept échecs historiques documentés, sans nouvel échec dans ce lot.
- Déploiement : version Apps Script immuable `844` sur les deux Web Apps existantes, URL inchangées. Relecture distante identique pour les quatre fichiers critiques ; manifeste conservé avec `USER_DEPLOYING` et `ANYONE_ANONYMOUS`. Aucune écriture élève/convention/affectation, aucun courriel et aucun ordre de mission n’ont été déclenchés ; la production Grist interdite n’a pas été consultée.

## Mise à jour du 5 octobre 2026 — DEV457/DEV458 (stabilisation finale des vues et déduplication Grist)

- Les deux vues de classe ont été contrôlées dans des sessions navigateur neuves. En administration, le fil commence bien par `Accueil PFMP`, le professeur principal et le changement de classe sont présents, et les commandes d’affectation « suivi téléphonique » et « professeur visiteur » sont visibles. En public, le clic sur une vignette ouvre le détail complet en lecture seule, sans commandes d’affectation.
- Contrôle TCAR / PFMP n°1 : `19` élèves, dont `3` apprentis, `16` conventions et `0` sans convention ; Barbosa et Ben Khaled sont présents. Le détail public conserve la carte, l’export PDF et l’accès professeur principal.
- Le calcul P.dif. exclut maintenant les apprentis même lorsque le snapshot familial compact ne contient pas la liste `quick.apprentis`. Pour TCAR, le résultat contrôlé est `2` parcours différenciés au lycée, `1` poursuite PFMP2 en entreprise et `13` scolaires restant à définir, soit `16` élèves scolaires ; les trois apprentis ne sont plus mélangés à cette période.
- DEV457 mémorise pendant deux minutes les lectures Grist strictement identiques (`tables`, `records`, `columns`) dans un mémo d’exécution et dans `CacheService`. Toute écriture incrémente immédiatement la révision de la table concernée : une ancienne réponse n’est donc jamais réutilisée après une mutation.
- Mesure sur le compteur DEV447 : point de départ `12 206` appels, puis deux chargements de la liste publique et deux chargements du détail TCAR en `3,70–4,62 s` ; point d’arrivée inchangé à `12 206`, soit **zéro appel Grist supplémentaire** pour ces quatre consultations répétées. Le premier recalcul exceptionnel du nouveau cache familial a pris `28,40 s`, puis la liste chaude est revenue à `4,01–4,42 s`.
- Tests ciblés : `14/14` DEV456 et `5/5` DEV457 réussis avant publication. La suite complète conserve exactement les sept échecs historiques déjà documentés, sans nouvel échec. Déploiement : version Apps Script immuable `840`, publiée sur les deux Web Apps existantes sans changement d’URL. Aucun élève, aucune convention, aucune affectation et aucun courriel n’ont été modifiés pendant la recette ; la production Grist interdite n’a pas été consultée.

## Mise à jour du 5 octobre 2026 — DEV456 (rendu exact restauré et navigation publique réparée)

- Les vues publique et administrative utilisent à nouveau le tableau complet `Suivi_PFMP_Classe_Detail_V156` : professeur principal, changement de classe, fil d’Ariane, carte, export PDF et accès PP sont présents ; l’administration conserve en plus l’envoi du tableau et les affectations téléphoniques/visiteurs.
- La cause du blocage public au clic était une confusion entre l’iframe technique Google et le wrapper public : la navigation était envoyée à un parent qui ne l’écoutait pas. Les périodes sont maintenant de vrais liens HTML et la navigation locale n’utilise le wrapper que lorsqu’il a effectivement répondu.
- Contrôle navigateur réel TCAR / PFMP n°1 : le clic public aboutit, les `19` élèves sont présents, dont Barbosa et Ben Khaled, avec `3` apprentis, `16` conventions et `0` sans convention. La consultation publique masque uniquement les commandes de mutation.
- La navigation de classe administrative réutilise désormais le cache familial vérifié au lieu de relancer l’ancienne construction de navigation. Mesures après publication : famille publique `3,28–3,85 s`, détail public `4,68–4,73 s`, détail administrateur `5,28–6,01 s`.
- La cohérence des effectifs est obtenue en recroisant les snapshots avec l’effectif courant ; les mutations ciblées invalident les caches concernés et la reconstruction planifiée republie le cache persistant, sans rétablir de lecture globale au clic.
- Tests ciblés : `16/16` DEV455 et `11/11` DEV456 réussis. La suite complète conserve les sept échecs historiques déjà documentés, sans nouvel échec. Déploiement : version Apps Script immuable `836`, publiée sur les deux Web Apps existantes sans changement d’URL ; relecture distante et empreintes DEV455/DEV456 identiques à la copie locale. Aucune écriture métier, aucun courriel et aucun ordre de mission n’ont été déclenchés pendant ce correctif.

## Mise à jour du 5 octobre 2026 — DEV455 (vues de classe rapides et P.dif. strictement périodique)

- Cause différentielle de la nouvelle latence : la route de détail `DEV190I` relisait toute la table historique des snapshots à chaque ouverture de classe, en public comme en administration. DEV455 utilise désormais le cache final vérifié, puis uniquement une lecture filtrée année/classe/période ; si aucun détail n'existe, seule la classe demandée est reconstruite.
- L'effectif affiché est systématiquement recroisé avec `EUC_ELEVES_PFMP` pour la classe courante. Un élève présent au dernier import est ajouté même s'il manque dans un ancien snapshot ; une ancienne ligne absente de l'effectif courant est retirée. Le cache de cet effectif est invalidé par l'import ciblé.
- La valeur `PARCOURS_DIFF_LYCEE` reste disponible pour la période de fin d'année et la prolongation métier de PFMP n°2, mais ne produit plus aucun statut ni badge « parcours différencié » dans PFMP n°1 ou PFMP n°2.
- Validation réelle TCAR / PFMP n°1, publique et administrative : `19` lignes, `3` apprentis, `16` conventions, `0` sans convention, les deux élèves signalés présents et `0` ligne marquée parcours différencié. La vue administrative conserve le changement de classe, l'export PDF, l'accès PP et les commandes d'affectation.
- Le professeur principal est désormais résolu par une lecture filtrée sur la seule classe, puis conservé trente minutes en cache. TCAR remonte bien son professeur principal dans l'en-tête et dans les `19` lignes, sans rétablir les lectures globales des tables de professeurs à chaque affichage.
- Mesures publiques après déploiement : `14,0 s` pour la reconstruction ciblée initiale après changement de version, puis `4,8 s` avec le détail vérifié en cache. Le blocage de plus de 30 secondes et la lecture globale ont disparu ; le prochain audit devra encore réduire le coût du tout premier chargement froid.
- Tests ciblés : `14/14` DEV455, `10/10` DEV454 et `8/8` DEV453 réussis. Suite complète exécutée : les sept échecs historiques déjà documentés restent inchangés, aucune nouvelle régression.
- Déploiement : version Apps Script immuable `819`, publiée sur les deux Web Apps existantes sans changement d'URL. Aucune donnée Grist n'a été écrite et la production interdite n'a pas été consultée.

## Mise à jour du 5 octobre 2026 — DEV454 (effectifs de classe cohérents)

- Audit différentiel du CSV `Base calendrier et planning-EUC_ELEVES_PFMP.csv` : `804` lignes, dont `788` élèves actifs, présents dans le dernier import et au statut `PRESENT`, répartis dans `38` classes.
- Cause racine de TCAR à `17` au lieu de `19` : le détail persistant conservait une ancienne liste et, lors de sa reconstruction, le choix futur `PARCOURS_DIFF_LYCEE` retirait à tort les deux élèves signalés des PFMP ordinaires. Ils existaient bien dans la table courante mais étaient filtrés après lecture.
- DEV454 compare désormais le détail au compteur de la vignette, reconstruit une vue incohérente depuis les élèves courants, puis rejoue en lots conventions, apprentissage et affectations. Une sélection future de parcours différencié ne retire plus l'élève de PFMP n°1 ou PFMP n°2 ; la vue P.dif. conserve son traitement propre.
- Le détail réparé conserve sa révision et son cache final. Une prochaine importation invalide toujours explicitement ce cache ciblé via DEV453 ; l'ancienne révision familiale ne provoque plus une reconstruction répétée à chaque clic.
- Validation réelle TCAR / PFMP n°1 sur la route publique effectivement utilisée : `19` élèves, `16` conventions, `3` apprentis, `0` sans convention ; les deux élèves signalés sont présents.
- Rapprochement global : les `34` classes disposant d'une période affichable ont exactement le même effectif dans les trois vues publiques que dans le CSV, après équivalence des libellés BTS. Les `87` élèves non affichés au niveau famille correspondent aux quatre classes de deuxième année BTS sans période officielle (`2TSCIEL`, `2TSCPI`, `2TSCPRP`, `2TSELT`).
- Temps mesurés après correction sur la route publique TCAR : `16,3 s` au premier contrôle après déploiement, puis `13,4 s` et `13,1 s` avec le détail en cache. Le blocage de plusieurs minutes est supprimé, mais cette latence globale Apps Script reste au-dessus de l'objectif de `3–5 s` et doit encore être optimisée séparément.
- Tests DEV454 : `10/10` réussis ; tests ciblés DEV445 (`16`), DEV448 (`10`) et DEV453 (`8`) réussis. La suite complète ne présente que les sept échecs de référence déjà documentés dans l'ancien socle.
- Déploiement : version Apps Script immuable `814`, publiée sur les deux Web Apps existantes sans changement d'URL. Aucune donnée Grist n'a été modifiée ; seule la recette autorisée `j1jDArBkzi7P` a été lue, et la production interdite n'a pas été consultée.

## Mise à jour du 5 octobre 2026 — DEV453 (import visible et navigation publique)

- Le contrôle différentiel confirme que les quatre élèves du dernier import JotForm sont bien écrits dans Grist et apparaissent dans leurs classes : trois en TMVA1 et un en TRSP. Le message « 2 créée(s), 2 déjà existante(s), 2 contrôlée(s) » mélangeait création, idempotence et vérification ; il ne signifiait pas que deux élèves supplémentaires avaient été créés.
- Cause de l’affichage retardé : après la reconstruction ciblée, les caches `DEV423_DETAIL_*` (court) et `D423_*` (détail final, six heures) n’étaient pas purgés. DEV453 les invalide désormais uniquement pour l’année, la classe et la période importées, sans lecture Grist supplémentaire.
- La resynchronisation de synthèse post-import ne recalcule plus systématiquement BAC Pro, BTS et CAP : seule la famille réellement touchée est reconstruite.
- Le bilan d’import affiche maintenant les nombres sélectionnés, créés, déjà existants, vérifiés et rejetés, ainsi que les premières erreurs éventuelles.
- Les routes publiques famille et détail remplacent systématiquement l’URL et les noms de routes du déploiement administrateur par ceux du déploiement public. En administration, le fil historique sans « Accueil PFMP » est masqué et tous les retours restent sur le déploiement administrateur ; en consultation publique, le fil administratif reste masqué.
- Tests ciblés DEV453 : `8/8` réussis. Suite complète : aucune nouvelle régression ; les sept échecs de référence déjà documentés restent inchangés.
- Déploiement : version Apps Script immuable `805`, publiée sur les deux Web Apps existantes sans changement d’URL. Contrôle navigateur réel : un seul fil d’Ariane public sans « Accueil », un seul fil administrateur avec « Accueil PFMP », retours sur le bon déploiement, accueil public non vide.
- Contrôle des données rendues après déploiement : `BEN BELKIR Kossay` apparaît en TRSP ; `GHARDA Sayane`, `GUZJA Younès` et `VIAL Quentin` apparaissent en TMVA1. Leur présence dans les listes est corrigée ; leur statut affiché reste « Sans convention » tant qu’aucune convention/entreprise n’est reliée dans les données métier.

## Mise à jour du 5 octobre 2026 — DEV450 à DEV452 (validation réelle et réduction des appels)

- Autorisation explicite donnée pour intervenir sur le document Grist actif `b2CyeMEdVEMSsLZgmQcP6D`, mettre à jour les deux Web Apps existantes et exécuter des essais limités de sauvegarde et d'affectation. La production interdite `3pnVrygfNn7c` n'a pas été consultée.
- Les deux déploiements existants, public et administrateur, ont été mis à jour sans changer leurs identifiants jusqu'à la version immuable `802` (`DEV452 - apprentis un chargement consolide`). `DOMAIN` et le déployeur existant sont conservés; aucun nouveau Web App n'a été créé.
- Le déclencheur de reconstruction automatique des snapshots reste supprimé. Les exécutions anciennes bloquées ont été interrompues et aucun nouveau déclencheur n'a été installé.
- Validation réelle DEV449 : sauvegarde explicite de l'apprenti KIROF, sans modification de valeur, réussie en `4,821 s` côté Apps Script.
- DEV451 : l'affectation administrateur reçoit le périmètre des élèves déjà affichés et n'effectue plus de lecture/reconstruction de snapshot. L'accès PP mémorise le même périmètre lors du déverrouillage. Les tests couvrent dix élèves avec trois appels au premier passage et deux appels lors d'une réaffectation.
- Validation réelle de l'affectation : premier passage de compatibilité réussi en `6,178 s`; après suppression de la relecture snapshot, retour fonctionnel affiché en `2,924 s` côté serveur (`7,579 s` navigateur, latence Web App comprise).
- DEV452 : la page Apprentis ne lance plus en parallèle `EUC_DEV192_getDashboard`, `EUC_DEV251_dashboardDetails` et `EUC_DEV348_dashboard`. Un seul chargement consolidé du tableau de bord est conservé; la sélection d'une classe ne relit plus ce tableau de bord.
- Mesure réelle TMP3D après DEV452 : `12` élèves chargés en `5,586 s` affichés par l'application (`5,946 s` bout en bout), contre `19,943 s` avant correction. Le journal d'exécution confirme une seule exécution `EUC_DEV348_dashboard` au démarrage puis une seule `EUC_DEV235_loadStudentsJson` lors du choix de TMP3D.
- Mesures publiques complémentaires avec URL anti-cache : liste BAC PRO affichée en `5,743 s`; détail TMP3D / PFMP n°1 affiché en `5,655 s`. Les deux parcours sont revenus très loin des 12 à 20 secondes observées pendant la saturation, mais restent légèrement au-dessus de l'objectif strict de cinq secondes à froid.
- Contrôle du distant après `clasp push` : les empreintes SHA-256 des modules DEV448, de la page Apprentis active et de la page détail de classe sont identiques entre la copie relue et le projet Apps Script.
- Tests ciblés : `10` DEV448, `5` DEV449 et `23` DEV447 réussis. Aucun courriel ni ordre de mission n'a été envoyé ou généré pendant les validations.

## Mise à jour du 5 octobre 2026 — DEV448/DEV449 (urgence saturation Grist)

- Diagnostic différentiel sur les exécutions réelles Apps Script : une affectation `EUC_SUIVI_AFFECTER_V156` a duré `814,797 s`; le déclencheur `EUC_DEV424_refreshScheduled` lancé à 08:42 a duré `1 383,047 s`; l'interface Apprentis a ensuite lancé simultanément de nombreuses exécutions `EUC_DEV225_saveApprenti`, dont plusieurs ont duré de 12 à 16 minutes. Cette concurrence explique le `429 Too many backlogged requests` et la consommation anormale.
- Mesure d'urgence : déclencheur automatique de snapshots supprimé (réinstallation possible par la fonction dédiée), deux reconstructions en cours et quatre sauvegardes Apprentis bloquées interrompues. Aucun déclencheur Apps Script ne reste actif.
- `DEV448` remplace l'affectation élève par élève par une écriture groupée : 4 à 6 appels Grist pour dix élèves, sans reconstruction générale synchrone. Le même point rapide est utilisé par l'administration et l'accès PP.
- `DEV449` supprime les sauvegardes automatiques sur chaque modification/blur de la page Apprentis. Une sauvegarde explicite lit seulement l'épisode ciblé et réalise une seule écriture, avec verrou court et dédoublonnage de 60 secondes; elle conserve notamment le code postal sous forme de texte.
- `DEV447` ajoute un coupe-circuit local : 2 minutes après un backlog, 15 minutes après un quota quotidien, sans nouvel appel Grist pendant l'ouverture du circuit; un `429` suspend aussi le déclencheur snapshot.
- Tests ciblés initiaux : 5 DEV449, 9 DEV448 et 23 DEV447 réussis. Suite complète : aucune nouvelle régression; sept échecs de référence préexistants et déjà documentés subsistent.
- Sources Apps Script distantes relues après `clasp push` : contrôles SHA-256 identiques pour les six fichiers critiques. Version immuable `799` créée. La divergence de cible a ensuite été levée pour cette intervention par l'autorisation explicite de travailler sur le document actif `b2CyeMEdVEMSsLZgmQcP6D`; voir DEV450 à DEV452 ci-dessus.

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
