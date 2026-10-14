# Prochains lots — book entreprises et apprentissage

## DEV568 publié (@961) — attente visible et anti-doublon du QR

- Vérifier sur la prochaine saisie légitime que le bouton « Rechercher » puis
  le bouton d'enregistrement affichent bien leur spinner sur le téléphone et
  que la réponse revient avant leurs délais respectifs de 20 et 30 secondes.
- Si une ancienne saisie a finalement abouti alors que l'écran semblait
  bloqué, rescanner le même QR : l'interface doit afficher le numéro déjà
  attribué et préciser qu'aucun doublon n'a été créé, sans nouvelle écriture.
- Le serveur protège également deux requêtes simultanées par verrou et
  relecture. Le snapshot est reconstruit hors du temps de réponse utilisateur,
  et les notifications désactivées n'entraînent plus les lectures relationnelles
  lourdes.
- La référence publiée est la version Apps Script immuable `961`, issue du
  commit exact `b4754197b19db14dd100e06dfc42837e0f697b96`. Les tests passent
  `904/904`, les routes `30/30` et le contrôle navigateur en lecture seule
  confirme `DEV.568` sans erreur de console. Aucune écriture réelle ni aucun
  courriel n'ont été déclenchés pendant la validation.

## DEV567 publié (@960) — continuité de la validation SIRET du QR

- La recherche officielle réussie fournit une preuve serveur signée d'une
  heure. L'enregistrement vérifie sa signature, son échéance et le SIRET avant
  d'utiliser les données officielles ; le cache ne sert plus que
  d'accélérateur.
- Une preuve absente ou expirée impose une nouvelle recherche SIRET sans perdre
  les autres champs déjà saisis. Elle ne peut jamais autoriser un autre SIRET.
- La référence publiée est la version Apps Script immuable `960`, issue du
  commit exact `927ee7c014ddf4640b4a52310acb70234f807107`. Les tests passent
  `900/900`, les routes `30/30` et le contrôle navigateur confirme `DEV.141`
  sans erreur de console. Aucun enregistrement réel n'a été rejoué pendant la
  validation.

## DEV565/DEV566 publié (@959) — attestations scolaires et import Yparéo

- Valider sur une recette autorisée les états vide, chargement, succès et
  erreur de la page d'attestations, sans envoyer de courriel réel.
- Vérifier qu'une ligne active `1MELEC C` existe réellement dans `Classes` avec
  un identifiant propre ; tant qu'elle n'existe pas, ne jamais renommer
  `1MELEC G` ni fabriquer une classe technique.
- Prévisualiser un export Yparéo non nominatif ou de test pour confirmer les
  quatre correspondances `TPMMA`, `TPEEB`, `TSEC`, `CQPM ASC`. L'import demeure
  désactivé (`DRY_RUN`) jusqu'à une autorisation séparée d'écriture.
- La version Apps Script immuable `959`, issue du commit exact
  `4be3469cd12d6dd78ea6c7a668083ad99a861217`, est publiée sur les deux Web Apps
  vertes existantes. La suite complète passe `896/896`, le contrôle HTTP
  `30/30` routes et le contrôle navigateur confirme notamment les retours
  canoniques des deux nouveaux écrans.
- La table source ne contient aucune ligne distincte `1MELEC C` : deux lignes
  `1MELEC G` sont actuellement visibles. `TPMMA` et `CQPM ASC` existent mais
  sont exclus/inactifs, `TPEEB` est absent et seul `TSEC` alimente aujourd'hui
  l'accordéon actif « Autres formations ». Corriger ces référentiels exige une
  décision et une écriture métier séparées ; aucune classe n'a été fabriquée.

## DEV563 publié (@957) — portée des actions et correction centralisée des contacts

- Paramétrer par catégorie la visibilité professeurs et élèves/familles ;
  l'administration conserve toujours la vue complète et l'absence de réglage
  reste privée.
- Croiser cette portée avec la restriction de chaque action et son statut sans
  exposer un brouillon, un identifiant Drive ou un auteur aux pages publiques.
- Permettre la correction des responsables et tuteurs dans une liste centrale
  du book, sans réécriture des conventions historiques.
- Normaliser les noms dans les prochains imports JotForm et lors des saisies
  téléphone, côté client comme côté serveur, tout en conservant les surcharges
  manuelles pour les graphies particulières.
- La création de la table de catégories et toute correction de contact réelle
  restent paresseuses : aucune donnée Grist n'a été écrite par la publication.
- La référence publiée est la version Apps Script immuable `957`, issue du
  commit exact `4d68ca09d021e6c838f874985fc5a48803dce33a`. La suite
  complète passe `877/877` et le contrôle automatisé valide `28/28` routes.
  L'ancien projet Apps Script bleu a été supprimé ; le circuit de publication
  est désormais exclusivement direct vers les deux Web Apps vertes existantes.

## DEV562 publié (@956) — profil et mémoire de la relation entreprise

- Les trois tables sont créées paresseusement à la première écriture
  administrateur. Les états vide et chargement sont validés sur le site publié ;
  les écritures site, logo, correction de contact et ajout d'action restent à
  vérifier avec une entreprise de test explicitement désignée.
- Contrôler qu'une action brouillon/personnels ne ressort jamais dans le book
  familles et qu'une action publiée/publique y apparaît sans identifiant Drive
  ni auteur.
- Le premier lot crée un dossier Drive optionnel et fournit son lien à
  l'administration. Un téléversement multi-fichier directement depuis la fiche
  pourra être ajouté ensuite si l'usage le justifie, avec limites de taille et
  droits de diffusion explicites.
- Aucune correction réelle de contact, aucun logo et aucune action réelle ne
  doivent être enregistrés pendant la recette sans cible de test validée.
- La référence publiée est la version Apps Script immuable `956`. La suite
  complète passe `873/873`, le contrôle automatisé valide `28/28` routes et le
  contrôle navigateur confirme que le chargement du book ne dépasse plus son
  délai client. En cas de régression, le retour fonctionnel antérieur au lot
  est `954`.

## DEV561 publié (@954) — codes postaux et couverture cartographique du book

- Un code postal français numérique sur quatre chiffres retrouve son zéro
  initial avant tout affichage ou appel de géocodage. Cette correction est une
  normalisation de lecture et ne réécrit pas la donnée Grist d'origine.
- Les bulles publiques rappellent tous les diplômes distincts accueillis par
  l'entreprise, y compris lorsqu'un filtre de diplôme est actif.
- Les entreprises sans point enregistré peuvent être localisées à la demande
  par une recherche publique, précise, non nominative, mise en cache et sans
  écriture Grist. Le bouton respecte le contrat asynchrone : désactivation,
  spinner, libellé d'action, délai maximal et restauration dans tous les cas.
- La référence publiée est la version Apps Script immuable `954`. Le contrôle
  réel de Renault Antibes valide le parcours complet et la publication valide
  `866/866` tests et `28/28` routes. En cas de régression, le retour immédiat
  est `953`.

## DEV557 publié (@949) — contacts et contrats canoniques du book

- Deux écritures d'un même nom complet dans un ordre différent sont regroupées
  sans perdre leurs coordonnées ni leurs années. Le rapprochement reste exact
  et prudent : pas de fusion floue sur une initiale, un nom isolé ou une simple
  ressemblance.
- Pour un élève apprenti, une entreprise et une année scolaire, le book expose
  un seul contrat cohérent. Les doublons et dates impossibles restent dans les
  sources Grist pour audit, mais ne polluent plus la présentation.
- `MELEC C` n'appartient pas au périmètre Pronote PFMP actuellement retenu. Le
  prochain passage dans l'analyse d'import devra l'associer explicitement à la
  bonne classe Grist, ou créer une cible métier dédiée si aucune classe
  existante ne convient. Ce choix ne doit pas être automatisé à partir du seul
  libellé Pronote.
- La référence publiée est la version Apps Script immuable `949`. En cas de
  régression fonctionnelle, le retour immédiat est `948` ; aucune donnée Grist
  n'a été modifiée par ce lot.

## DEV556 publié (@948) — navigation interne des sous-domaines publics

- Les parcours publics PFMP et Apprentis échangent désormais leurs changements
  de route avec leurs enveloppes `pfmp.loucodi.fr` et
  `apprentis.loucodi.fr`. Les longues URL Apps Script restent internes aux
  iframes et ne remplacent plus le nom de domaine visible.
- Le book public affiche un spinner immédiat et empêche le double clic. Le
  chargement des familles annonce le niveau demandé : BAC PRO, BTS ou CAP.
- Les enveloppes n'acceptent que les routes publiques explicitement listées et
  les origines Google Apps Script attendues, y compris la forme rendue
  `script.googleusercontent.com` utilisée par certains liens internes.
- La référence publiée est la version Apps Script immuable `948`. En cas de
  régression fonctionnelle, le retour immédiat est `947` ; les données Grist ne
  sont pas concernées par ce retour de code.
- Le prochain lot YPAREO devra réutiliser le masque apprenti existant, ajouter
  une table de correspondance entre groupes/acronymes et formations, distinguer
  futur apprenti sans entreprise et rupture, puis afficher un repère `G` pour
  le GTA/formation continue, cumulable avec le repère rouge `A`.

## DEV555 publié (@947) — itinéraires depuis les bulles cartographiques

- Chaque bulle d'entreprise des cartes familles, personnels, administration,
  PFMP et apprentissage contient un bouton « Itinéraire depuis ma position ».
- La destination est l'emplacement validé de l'entreprise. Le point de départ
  est choisi ou déterminé par Google Maps : PFMP n'accède jamais à la position
  de l'utilisateur et n'ajoute aucun appel Grist.
- La référence publiée est la version Apps Script immuable `947`. En cas de
  régression fonctionnelle, le retour immédiat est `946` ; les données Grist ne
  sont pas concernées par ce retour de code.

## DEV554 publié (@946) — page familles épurée et contacts datés

- Le titre « Book des entreprises — élèves et familles » reste seul dans le
  bandeau. Les deux textes explicatifs demandés et le message de succès sur les
  trois dernières années ont été retirés sans modifier le périmètre de données,
  qui reste techniquement borné aux trois dernières années.
- Chaque responsable et tuteur affiche ses années scolaires avant son nom. Un
  contact reconnu par son téléphone ou son courriel reste unique ; toutes ses
  années sont conservées et les contacts les plus récemment saisis apparaissent
  en premier.
- Le cache public a été révisionné et les projections familles/carte conservent
  les années sans ajouter d'identité d'élève, de professeur, de classe ou de
  période. Aucun appel Grist supplémentaire n'est créé par l'affichage.
- La référence publiée est la version Apps Script immuable `946`. En cas de
  régression fonctionnelle, le retour immédiat est `945` ; les données Grist ne
  sont pas concernées par ce retour de code.

## DEV553 publié (@945) — communes fiables et réduction des lectures de classe

- La facette ville est désormais canonique et ne contient plus de doublons de
  casse/ponctuation ni de fragments d'adresse. Ce comportement est couvert par
  des tests ciblés et vérifié sur la Web App publique.
- Deux lectures post-rendu redondantes ont été supprimées de la fiche de
  classe. Le préchauffage familial est groupé et borné à une lecture des
  détails et une lecture des affectations ; toute réintroduction d'une
  exécution par vignette est interdite.
- Le prochain lot performance doit instrumenter séparément, dans le chemin
  réel, la lecture du détail persistant, le contrôle de fraîcheur, la
  réconciliation des affectations, la navigation interclasse et le rendu du
  grand modèle HTML. Une période froide dépasse encore `15 s` malgré le cache,
  alors que le même service chaud répond autour de `4–5 s`. Aucune optimisation
  supplémentaire ne sera déclarée terminée sans mesure navigateur froide et
  chaude sur une période non ouverte auparavant.
- La référence publiée est la version Apps Script immuable `945`. En cas de
  régression fonctionnelle, le retour immédiat est `944` ; les données Grist ne
  sont pas concernées par ce retour de code.

## DEV551 publié (@943) — périmètres cartographiques et démarrage public

- Une carte ouverte depuis une fiche doit contenir exactement un marqueur :
  l'entreprise sélectionnée. La carte globale du book reste distincte et
  continue d'appliquer la combinaison complète des filtres visibles.
- Une carte ouverte depuis le suivi d'une classe doit utiliser exclusivement la
  classe, la période et l'année présentes dans l'URL. Le catalogue public ne
  doit jamais appeler le catalogue protégé par l'administration.
- Les vues publiques ne doivent proposer aucun fil d'Ariane vers une route
  administrative. Une identité Google masquée doit produire la vue publique
  anonymisée, jamais une page blanche ou une erreur d'authentification.
- Les photos élèves/familles sont limitées aux fichiers dont le droit de
  diffusion est confirmé. Le contrôle en ligne a vérifié le parcours sans
  photo, qui termine explicitement sur « Aucune photo de devanture », sans
  téléversement ni écriture Grist. Un cas réel avec photo autorisée reste à
  contrôler lorsqu'une fiche de ce type sera disponible dans le périmètre.
- La réduction des appels Apps Script porte uniquement sur les lectures de
  propriétés du cache public. Le rechargement chaud du book administratif est
  mesuré à environ `11,5 s` ; le démarrage à froid reste dans la zone
  `20–30 s`. Le prochain lot doit compter les appels par table et remplacer la
  reconstruction nominative répétée par un agrégat révisionné côté serveur,
  avec invalidation sur écriture et comparaison stricte au rendu `@943`.

## DEV550 publié (@942) — books paginés, cartes filtrées et rattachements fiables

- Les books administration, personnels et élèves/familles affichent dix
  entreprises au démarrage, proposent la pagination et les tailles
  `10/30/40/50/100/200/Tous`. Le tri par dernière saisie est proposé par
  défaut ; le classement historique par nombre d'élèves reste disponible.
- La liste et la carte intégrée utilisent exactement les mêmes filtres. Les
  vues nominatives montrent l'historique complet autorisé ; la carte familles
  ne reçoit jamais d'identité d'élève, de professeur ni de SIRET.
- Les responsables et tuteurs sont regroupés par téléphone ou courriel
  normalisé. Le mode familles peut afficher leurs coordonnées professionnelles
  conformément à la décision métier du 11 octobre 2026.
- Les appellations explicitement rattachées utilisent la fiche canonique à la
  lecture. Une ligne d'accès QR incomplète ne crée plus un second accueil vide
  lorsqu'un snapshot représente déjà le même élève et la même PFMP. Les
  archives sans SIRET portant l'ancienne appellation suivent également la cible
  si ce nom source n'est pas ambigu.
- Le book familles repose sur un cache révisionné strictement non nominatif,
  partagé avec sa carte. Le cache publié a été préchauffé et le contrôle réel
  confirme une seule fiche canonique pour le rattachement SACOME.
- La page de réglage des quotas possède un fil d'Ariane vers l'administration
  et l'accueil. Aucune donnée métier Grist n'est modifiée par ce lot.

## Candidat DEV546 en validation

- Contrôler après publication sur le vert les trois books avec, pour une même entreprise,
  au moins un scolaire et un apprenti : total réconcilié, `A` rouge et période
  de contrat unique pour l'apprenti.
- Inspecter la réponse réseau du book élèves/familles et confirmer l'absence de
  toute donnée nominative d'élève ou de professeur, de SIRET, de classe, de
  diplôme, de période et de coordonnées personnelles.
- Contrôler la nouvelle route publique
  `book-entreprises-eleves-pfmp`, ses états vide, chargement, succès, erreur et
  dépassement de délai, puis l'ajouter au lien Atrium après validation de la
  version verte immuable.
- Aucune écriture Grist n'est nécessaire pour ce lot ; les contrats et accueils
  existants restent inchangés.

## Candidat DEV545 en validation

- Vérifier sur la recette bleue les deux cartes apprentis, le bilan public et
  administratif, ainsi que l'enregistrement des modalités par classe.
- Contrôler le rattachement et la dissociation d'appellations avec des données
  de recette uniquement ; aucune fusion physique n'est prévue.
- Après autorisation explicite, promouvoir le candidat bleu exact vers les
  deux Web Apps vertes existantes, puis contrôler toute la matrice de routes.
- Une amélioration ultérieure pourra ajouter une période d'historique aux
  cartes apprentis ; le lot DEV545 porte volontairement sur les apprentis
  actuels et la confidentialité des deux modes.

## Référence publiée et règle de retour arrière

La version Apps Script immuable `945` et le commit
`e3afc71c0d55c7280b9450f229f6146246353013` sont la référence fonctionnelle.
Les performances, les coordonnées entreprise, les affectations, les statuts et
la navigation existante ne doivent pas être modifiés par le nouveau lot. Toute
régression lors d'une publication impose le retour immédiat à la version
immuable précédente `944`, puis à `943` si le défaut concerne aussi le
préchauffage groupé introduit en `945`.

Le cahier des charges détaillé du book, des trois niveaux d'accès et du pilotage
de l'apprentissage est dans
`Documentation/CAHIER_CHARGES_BOOK_ENTREPRISES_APPRENTISSAGE.md`.

## Hors lot — modèle PDF

Le modèle PDF a été corrigé par l'utilisateur et fonctionne. Il ne doit pas être
modifié dans les prochains lots tant qu'une nouvelle demande explicite ne le
remet pas dans le périmètre.

## Candidat DEV538 — socle en lecture seule du book

La liste, les filtres combinés, le classement par nombre d'élèves, l'historique
personnels, l'export CSV compatible Excel et l'impression PDF sont développés.
Les noms de l'infobulle cartographique sont chargés uniquement à son ouverture.
Le mode parents est agrégé sur trois ans et anonymisé. Le sous-domaine parents
reste à raccorder lorsqu'il sera fourni.

## Candidat DEV538 — quotas et relances apprentissage

La page administrative calcule les effectifs et états depuis les sources
existantes, stocke uniquement les pourcentages de quota et expose les dossiers
distribués ainsi que les relances J+14. Restent à réaliser les vignettes de
consultation en lecture seule et la gestion éventuelle d'une liste
complémentaire.

## DEV541 publié (@934) — bilan apprentissage intégré

La page de gestion administrative et sa consultation publique intègrent les
vignettes de bilan par diplôme, niveau et classe. Elles présentent les quotas,
apprentis actuels, futurs apprentis, dossiers distribués et dossiers transmis
au CFA. La réponse publique est exclusivement agrégée et ne contient aucun nom,
identifiant d'élève, dossier nominatif ou relance. La gestion éventuelle d'une
liste complémentaire reste hors de ce lot.

## DEV542 publié (@935) — périmètre des classes en apprentissage

Le réglage des quotas ajoute une activation par classe et année. Une classe
inactive reste réactivable dans ce seul écran mais sort des totaux, bilans,
dossiers, relances et sélecteurs de gestion. Toutes les classes sont actives
par défaut afin de garantir la compatibilité avec les réglages existants.
Pour `2026-2027`, `1MELEC G` et `TMELEC G` sont désactivées conformément à la
demande métier ; leurs données ne sont ni supprimées ni altérées.

## DEV543 publié (@936) — terminaison Monaco et effectifs présents

Le traitement automatique Monaco consomme une file finie par lots de trois et
ne réessaie plus dans la même demande les adresses restées sans coordonnées.
L'interface revient toujours à l'état disponible avec un bilan explicite.

Les effectifs servant aux quotas et aux bilans apprentissage excluent les
élèves déjà sortis selon les indicateurs d'activité, de dernier import, de
statut scolaire et de date de sortie. Les sorties futures restent comptées
jusqu'à leur date effective.

Le commit exact `8ba171b4b760610790ac4d51c93cef055da3642e` est publié sur
les deux Web Apps existantes en version immuable `936`. La suite complète passe
`812/812` tests et les `25/25` routes en ligne sont valides. La version `935`
reste disponible pour un retour immédiat.

## Candidat DEV544 — ventilation des indicateurs apprentissage

Les six indicateurs globaux affichent au survol et au clavier le total par
établissement `LP` / `LGT`, puis le détail de chaque classe active. Le service
réutilise les lignes agrégées déjà chargées et n'ajoute aucune lecture Grist.
La consultation publique reçoit uniquement ces nombres et libellés de classe,
sans élève ni dossier nominatif.

## Proposition à valider — rattachement et archivage des entreprises

Le SIRET reste l'identité canonique d'un établissement français. Une interface
administrative devra permettre de rattacher plusieurs noms historiques ou
commerciaux à une fiche canonique, sans réécrire ni supprimer les conventions
passées. Deux SIRET distincts ne seront jamais fusionnés automatiquement, même
à la même adresse.

Une entreprise fermée devra conserver tout son historique avec un état
`FERMEE` et une date de fermeture ; une entreprise archivée sera simplement
masquée des sélections courantes. La suppression physique restera interdite.
Ce lot nécessite la validation du schéma de correspondance avant toute écriture
dans Grist.

## Candidat DEV540 — lisibilité, géocodage et fiche entreprise

Le tableau de quotas est agrandi et explicite la différence entre contrats à
démarrage futur et dossiers transmis au CFA. Les anomalies de classement
France/étranger, les adresses répétées et les propositions BAN sans rapport avec
la voie sont bloquées. Monaco est traité par petits lots bornés.

Le book propose des filtres assistés, une identité SIRET prioritaire, un fil
d'Ariane et une fiche entreprise avec contacts et historique. La photo de
devanture est téléversée par l'administrateur dans Drive après confirmation des
droits et de l'absence de personne ou plaque lisible ; Grist ne contient que
les métadonnées. La galerie parents reste un lot distinct et devra conserver
l'anonymisation systématique.

## Lot terminé — DEV537 publié en version 927

Le lot regroupe la suppression de la relecture d'effectif sur un détail
déjà vérifié, le géocodage automatique de Monaco par Nominatim, le filtre
cartographique « Toutes les années », le nombre d'élèves distincts accueillis
et l'autocomplétion locale du générateur de conventions. La suite locale passe
`780/780`; les deux Web Apps existantes servent la version immuable `927`.

La publication a validé `25/25` routes. Le contrôle navigateur confirme les
coordonnées entreprise, la recherche élève locale, les deux moteurs de
géocodage et les trois périmètres de cartographie. Une seconde ouverture de la
PFMP TCAR après migration D17 a pris `6,6 s`.

## 1. Réduire l'ouverture d'une PFMP sans modifier le rendu

Le chemin à froid peut encore lire successivement le détail persistant,
l'effectif courant, les affectations et l'index familial. Cette séquence
explique qu'une page très légère puisse attendre `20–30 s` alors que les
accès suivants profitent des caches.

Le lot doit faire du détail compact D16 la réponse autonome : effectif vérifié,
affectations et navigation minimale sont préparés lors de la reconstruction,
puis relus en une fois. Les vérifications de révision doivent invalider le
cache au moment d'une écriture, pas relire les tables à chaque premier affichage
d'une classe.

Preuves obligatoires : compteur d'appels Grist froid/chaud, mesure TMP3D et
TCAR, tests des coordonnées et des affectations, suite complète, 25 routes et
parcours navigateur comparé à `pfmp-green-925-stable`.

## 2. Géocodage Monaco / étranger

Conserver Géoplateforme / BAN en premier choix pour la France. Les adresses
non françaises ou refusées sont présentées dans une liste séparée et peuvent
être traitées par un second fournisseur configurable. Pour Monaco, le candidat
est Nominatim/OpenStreetMap, en recherche unitaire ou en très petit lot,
résultat mis en cache et soumis à validation si le score est insuffisant.

Le fournisseur de repli ne reçoit que l'adresse de l'entreprise, jamais le nom
d'un élève ou d'un professeur. Son usage doit respecter la limite de service,
l'identification du client et l'attribution exigées par le fournisseur.

## 3. Cartographie historique légère

La bulle de la période active ajoute le nom de l'élève et le professeur
visiteur. Un filtre `Toutes les années` affiche un résumé par entreprise. Le
détail historique complet — année, élève, classe/diplôme, période/dates et
professeur visiteur — est chargé uniquement quand l'utilisateur ouvre la
fiche de l'entreprise.

Les noms d'élèves ne sont visibles que dans une vue authentifiée autorisée ; la
cartographie publique conserve un résumé non nominatif.

## 4. Book entreprises

Créer une vue indépendante du périmètre de la carte, centrée sur l'entreprise,
avec : identité, adresse, contacts autorisés, métiers/diplômes, photo de
devanture Drive, nombre d'accueils et historique des stages. Filtres prévus :
année ou toutes les années, filière/métier, diplôme, classe, période, élève,
professeur visiteur et état du géocodage.

La première version est en lecture seule et réutilise les données existantes.
Elle ne duplique pas les conventions et ne stocke aucun binaire dans Grist.

## Lot terminé — DEV536

Après le contrôle D16, ajouter un garde-fou identique dans le rendu initial et
dans la normalisation tardive de la table : si le responsable distinct est
absent, afficher les coordonnées du tuteur déjà présentes. Contrôler sur TMP3D
et TCAR que toute convention couverte disposant d'au moins un contact n'affiche
plus un tiret. Aucune donnée métier Grist ne doit être réécrite.

Validation terminée sur le vert `925` : `25/25` routes, TMP3D `11/11` lignes
couvertes avec contact, TCAR `19/19`, remplacement actif et historique conservé.

## Lot terminé — DEV535

Publier le dernier recours de contact entreprise. Une convention scolaire avec
un responsable explicite doit continuer d'afficher celui-ci. Lorsqu'une ancienne
convention ne contient aucun responsable distinct, mais possède un tuteur, la
colonne « Coordonnées entreprise » doit afficher le nom, le téléphone et le
courriel du tuteur au lieu d'un tiret. Cette règle ne doit provoquer aucune
écriture métier dans Grist.

Reconstruire les détails persistants en `DEV535-D16`, puis contrôler TMP3D et
TCAR sur le vert. Toutes les lignes couvertes doivent disposer d'un contact
opérationnel dès qu'un responsable, une coordonnée générale ou un tuteur existe.
Les élèves sans convention peuvent naturellement rester sans coordonnées.

## Lot terminé — DEV534

Publier le compactage des détails et la navigation de classe indépendante de la
reconstruction familiale. Exécuter ensuite la reprise technique bornée : elle
ne doit accepter que l'état `DIRTY` créé par l'ancienne réparation DEV533,
reconstruire uniquement TMP3D / sa période concernée et republier `READY`, sans
modifier une convention, un élève ni une coordonnée.

Contrôler d'abord TMP3D puis TCAR depuis le suivi public. Le premier chargement
doit quitter son état d'attente sans reconstruction des 34 classes. Les
coordonnées historiques JotForm doivent afficher le responsable disponible,
son téléphone et son courriel. Le remplacement complet après rupture doit être
vert, tandis que l'ancienne interruption reste dans l'historique rouge. La date
de début du contrat apprenti doit rester lisible dans la pastille verte.

Les snapshots de détail doivent porter `DEV534-D15`, rester compacts et être
écrits par lots de moins de `80 000` octets. Le contrôle final comprend la suite
complète (`767/767` au stade local), les 25 routes vertes et la vérification que
les deux Web Apps existantes pointent vers la même version immuable.

## Lot terminé — DEV533

Publier le correctif de cohérence des responsables JotForm et des remplacements
complets. Contrôler TCAR et TMP3D sur une convention historique importée : nom,
téléphone et courriel du responsable doivent apparaître. Contrôler ensuite le
remplacement après rupture complet : il doit être vert et enregistré, tandis
que l'ancienne interruption reste dans l'historique rouge.

Après publication, exécuter l'audit borné DEV533. Il doit désigner exactement
les remplacements complets encore bloqués à `A_COMPLETER_ENTREPRISE`; la
réparation ne doit modifier que leurs deux statuts et la date de saisie absente,
jamais les coordonnées de l'entreprise, du responsable ou du tuteur.

La pastille apprenti conserve le fond vert et le texte blanc ; la date de début
du contrat doit être lisible sans zoom. Le marqueur `DEV533-C14` doit forcer la
reconstruction des anciennes fiches.

## Lot terminé — DEV531/DEV532 stockage Grist

La priorité est de publier d'abord le correctif de non-croissance des vues
matérialisées, sans nettoyage simultané. Avant livraison, exécuter la suite
complète, relire le paquet reconstruit et confirmer que les anciens writers
DEV190 sont bien redirigés vers les upserts DEV531.

Après publication autorisée, vérifier les 25 routes du canal prévu et mesurer
un parcours froid puis chaud. Contrôler en lecture seule le statut du
déclencheur planifié, le nombre d'actifs par clé et l'évolution du nombre de
lignes et des octets JSON. Aucune suppression ne doit intervenir à ce stade.

Le nettoyage a été exécuté après sauvegarde et audit : `6 007` lignes
techniques supprimées, `130` lignes courantes conservées, aucun candidat
restant. Le plan et les preuves sont dans
`Documentation/INCIDENT_STOCKAGE_GRIST_2026-10-09.md`.

## Lot fonctionnel en attente après DEV530

Après publication, le contrôle utilisateur prioritaire est une actualisation
forcée d'une fiche TMELEC puis TMP3D. Pour une convention récente issue du QR
et une convention historique JotForm, « Coordonnées entreprise » doit montrer
le responsable disponible, son téléphone et son courriel. Le changement de
classe doit quitter l'état de chargement sans enrichir toute l'année.

Vérifier dans les mêmes fiches : convention et apprenti en vert à texte blanc,
ligne apprenti toujours jaune avec son repère `A`, sans convention et rupture
en rouge sur fond rose, et absence du badge technique vert. Lorsqu'un élève a
une rupture puis une nouvelle convention, la nouvelle doit être l'état courant
vert et la rupture doit rester dans l'historique rouge.

La cartographie et le géocodage constituent un parcours séparé : les contrôler
après ce lot, sans lancer de géocodage réel tant qu'une autorisation d'écriture
métier n'a pas été donnée. Les contrôles automatisés ne consultent pas les
données nominatives de production ; une donnée réelle encore absente exigera
un diagnostic de lecture explicitement autorisé.

## Lot précédent — DEV529

DEV529 rend les coordonnées du PDF de convention réglables sans changement de
code. Le contrôle métier doit charger l'aperçu des pages 1 et 2, déplacer une
zone test, vérifier son point d'ancrage, puis générer une convention de test.
Le QR doit être entièrement contenu dans sa case, rester scannable après
impression et photocopie, et les lignes « Classe », « Diplôme préparé »,
« Proviseur » et « Professeur référent » ne doivent couper aucun trait du fond.

## Lot précédent — DEV528

DEV528 restaure dans les fiches de classe et les ordres de mission les
coordonnées du responsable conservées dans les imports JotForm validés. Le
contrôle métier doit comparer une convention saisie par QR et une convention
historique JotForm : les deux doivent afficher nom, téléphone et courriel dans
« Coordonnées entreprise », sans modifier les données Grist. Un dossier ambigu
doit rester vide plutôt que choisir une mauvaise personne.

Le premier accès public à une famille utilise maintenant une seule lecture
groupée des propriétés persistantes. Après publication, mesurer un premier
chargement BAC PRO après démarrage à froid puis un second chargement ; le
premier ne doit plus approcher soixante secondes et aucun recalcul complet ne
doit être lancé depuis la page publique.

## Lot précédent — DEV527

DEV527 empêche une fiche entreprise locale incomplète de masquer l'adresse
officielle d'un SIRET. Le contrôle métier obligatoire porte dorénavant sur les
quatre champs raison sociale, voie, code postal et ville. La validation par le
navigateur reste disponible quinze minutes pour l'enregistrement final sans
écriture automatique dans le référentiel d'entreprises Grist.

La suite complète locale passe `721/721`. Après publication, contrôler les
`25/25` routes vertes. Un essai manuel de recherche avec le SIRET
`49141406600036` doit afficher la voie `43 B BOULEVARD PIERRE SEMARD`, le
complément `IMMEUBLE BEL CANTO`, le code postal `06300` et la ville `NICE`.

## Lot précédent — DEV526

DEV526 consolide ensemble les quatre parcours signalés : coordonnées du
responsable dans les fiches de classe, affectation des professeurs, accès aux
ordres de mission et chargement du générateur de conventions. Il ajoute la
réédition durable par identifiant et l'archivage Drive des PDF.

Après publication, les contrôles verts autorisés sont : ouvrir une fiche de
classe et vérifier les coordonnées déjà présentes, ouvrir les ordres de mission
depuis cette fiche sans générer ni envoyer de document, ouvrir le générateur et
attendre ses listes, puis ouvrir un dossier administratif et vérifier les liens
de réédition. Les écritures d'affectation, de convention et d'archive restent
hors du contrôle automatisé : elles doivent être réalisées seulement sur un
cas réel choisi par l'utilisateur.

La suite complète locale passait `716/716`. La publication devait valider les
`25/25` routes vertes, la navigation interne et les quatre parcours en lecture
seule. Une réédition PDF réelle archivera le document dans Drive ; ce clic ne
doit donc pas être utilisé par le contrôle automatique.

## Lot précédent — DEV524

DEV524 remplace les trois chargements concurrents du générateur de conventions
par une réponse serveur unique et borne l'attente à vingt secondes. Après
publication verte, ouvrir `Générer les conventions`, vérifier que la liste des
élèves et la liste des promotions quittent immédiatement « Chargement… », puis
choisir un élève et une classe afin de confirmer que les périodes autorisées
s'affichent. Ce contrôle doit rester en lecture seule : ne pas cliquer sur
« Générer la convention et son accès QR ».

La suite complète locale passe `708/708`. La publication doit encore valider
les `25/25` routes vertes. Le vert actif est resté sur la version `906` pendant
la première tentative interrompue, puis y est revenu automatiquement lorsque
la version `907` n'a validé que `24/25` routes. La route publique en échec ne
consulte plus Grist pour déterminer l'année courante avant de rendre sa coque.

## Lot précédent — DEV523

DEV523 rend le géocodage des entreprises françaises reprenable : contrôle et
mise à niveau de la table avant écriture, sous-lots de dix et repli unitaire si
Grist refuse un lot. Après publication verte, le parcours attendu est
`Entreprises et cartographie` → analyse → géocodage de toutes les adresses
françaises. Pour environ 570 entreprises, plusieurs exécutions de quarante
adresses se succèdent ; les résultats sont persistés entre deux exécutions. Si
une adresse reste refusée, relever uniquement le nombre affiché et son statut,
sans copier de donnée nominative dans les journaux, puis corriger cette adresse
ou la valider manuellement. Le code ne doit jamais relancer les adresses déjà
validées ni masquer un refus Grist.

Le lot corrige aussi le voile bloquant de la synthèse famille, le champ
administratif « Nom commercial / enseigne » et les alias historiques des
coordonnées du responsable entreprise. Les tests locaux combinés avec DEV524
passent `708/708`.
La validation de publication doit encore confirmer les `25/25` routes vertes ;
aucun géocodage réel ne doit être lancé par la recette automatisée.

## Lot précédent — DEV522

DEV522 maintient les conventions `INTERROMPUE` dans la recherche annuelle de
« Administration des conventions ». Le parcours métier reste : ouvrir la
convention interrompue, renseigner les nouvelles dates et le motif, puis
utiliser « Créer la nouvelle convention après rupture ». Il ne faut pas passer
par le générateur général, qui ne porterait pas le lien avec l'ancienne
séquence. Après publication verte, contrôler en lecture seule qu'au moins une
convention interrompue est visible dans son année ; la création réelle du
remplacement reste interdite sans autorisation explicite d'écriture métier.
Le correctif est publié dans la version verte immuable `906` et les `25/25`
routes sont valides. Le contrôle nominatif d'un dossier interrompu reste à
faire par l'utilisateur ou après autorisation explicite de lecture de la
production.

## Lot précédent — DEV521

DEV521 rétablit les noms des jeunes dans la recherche et le détail de
« Administration des conventions ». Le lecteur commun des références Grist
reconnaît maintenant la forme `["L", id]` au lieu de perdre l'identifiant de
l'élève. La route ne consomme plus l'ancien cache HTML nominatif P3.2. Le lot a
été publié dans la version verte immuable `905` et les `25/25` routes sont
valides. Le contrôle réel en lecture seule affiche `20` propositions nommées et
aucun « Jeune non renseigné ». L'ouverture d'un dossier puis toute correction,
annulation ou interruption restent volontairement hors de ce contrôle afin de
ne déclencher aucune écriture métier.

## Lot précédent — DEV520

DEV520 corrige les deux régressions vertes signalées : le centre
d'administration sépare désormais sans ambiguïté ses destinations
administratives et publiques, et la colonne « Coordonnées entreprise » affiche
le responsable disponible au lieu de rester vide derrière l'ancien formateur.
Le renouvellement `DEV520-C10` force la reconstruction des anciennes vues
matérialisées. Le lot doit être publié automatiquement sur les deux Web Apps
vertes existantes après suite complète, puis contrôlé sur les 25 routes et par
un parcours réel en lecture seule depuis le centre vers « Administration des
conventions » et une fiche de classe.

DEV519 avait corrigé les deux régressions signalées sur le vert : le
formulaire QR ne reste plus bloqué sur des champs tuteur masqués et les
coordonnées entreprise des élèves en PFMP sont complétées en lecture seule
depuis les références déjà présentes dans Grist. La suite complète est à
`687/687`. Le lot a été publié dans la version immuable `902`, mais le contrôle
utilisateur a révélé que l'ancien formateur de la colonne ignorait encore les
coordonnées enrichies ; DEV520 remplace ce formateur. Le parcours
d'enregistrement QR réel reste non testé tant qu'aucune autorisation explicite
d'écriture de convention n'est donnée.

## Décision de livraison active — Git vers vert

À la demande explicite de l'utilisateur du 9 octobre 2026, le projet bleu est
retiré du workflow courant et conservé uniquement comme archive. Les prochaines
évolutions partent d'une branche Git et sont livrées directement sur les deux
Web Apps vertes existantes par `scripts/pfmp-release.sh release-stable`. Cette
commande relit le distant, crée une version immuable, contrôle les 25 routes et
revient automatiquement aux versions précédentes en cas d'échec. Le bleu ne
doit plus être publié, consulté ou testé sans une nouvelle demande explicite.

## DEV514 — correction des conventions TCAR et des candidats au géocodage

L'accès annuel aux conventions ne filtre plus prématurément les références
Grist de classe et de période côté serveur. Les références sont normalisées et
filtrées en mémoire, après lecture, afin que les conventions historiques des
élèves témoins restent rattachées à TCAR / PFMP n°1. Le géocodage suit
la même règle et combine systématiquement le snapshot avec les conventions
actives avant dédoublonnage, même lorsque le snapshot existe mais est
incomplet. Le marqueur canonique est renouvelé pour invalider l'ancienne
synthèse erronée.

Les tests ciblés DEV513, DEV445, DEV504 et DEV459 passent respectivement
`13/13`, `18/18`, `15/15` et `16/16`. Après le retrait des anciens tests du
workflow bleu, la suite complète locale passe `672/672`. La validation verte
réelle doit encore confirmer les décomptes TCAR
et l'apparition de candidats au géocodage sans déclencher d'écriture de
coordonnées.

## DEV513 — candidat bleu techniquement contrôlé, homologation métier bloquée par la recette vide

DEV513 retire le recalcul lourd du parcours de consultation BAC PRO. Une page
famille sert toujours le dernier snapshot complet, y compris lorsqu'un nouveau
calcul est demandé, et le signale comme en cours de rafraîchissement. Les cartes
et infobulles consomment le même résumé embarqué. Un délai maximal et une action
de reprise remplacent tout chargement sans fin.

La génération unitaire ne dépend plus du temps de reconstruction des vues et
porte un identifiant de requête stable. Les QR sont agrandis et renforcés pour
la photocopie ; l'historique des classes écarte les fausses « séquences
précédentes » ; le géocodage retrouve les entreprises actives même lorsque les
détails matérialisés ne sont pas prêts. La maintenance ne référence plus
l'ancienne base `b2CyeMEdVEMS` : elle sélectionne exclusivement la base du
canal courant et refuse tout mélange bleu/vert. La suite locale passe
`672/672`.

Le code exact `5206f6802f1fd738f1e919df0bacb3b957d9b748` a été poussé et
relu sur le projet Apps Script bleu. Le contrôle automatisé obtient `25/25`
routes. Le navigateur obtient `29/29` pages valides : les `25` routes du contrat
plus la consommation API et les trois familles BAC PRO, BTS et CAP. Toutes les
destinations de navigation visibles découvertes ont été ouvertes et restent sur
le même `/dev`.

La reconstruction de recette se termine en `12,8 s`, mais son audit retourne
`0` période et `0` résumé BAC PRO. Le spinner infini est donc éliminé et remplacé
par un état vide explicite, sans que les décomptes TCAR puissent être homologués.

Avant toute promotion verte, il reste obligatoirement à :

1. fournir au bleu un jeu de recette BAC PRO représentatif sans lecture ni
   copie implicite depuis la production ;
2. vérifier sur le bleu la cohérence d'une classe témoin entre effectif,
   conventions, apprentis, sans convention et parcours différencié ;
3. documenter les parcours qui ne peuvent être exécutés réellement sans une
   écriture métier interdite.

Le vert ne doit être modifié qu'après une nouvelle autorisation explicite de
l'utilisateur et uniquement avec le candidat bleu exact homologué.

## DEV512 livré sur le vert

Le moteur de fusion PDF respecte maintenant la zone exacte de chaque balise,
utilise les métriques de la police incorporée et réduit seulement les valeurs
qui dépassent. Une donnée absente produit une ligne jaune à compléter ; une
donnée fusionnée ne reçoit aucun jaune. Le modèle PDF existant de huit pages a
été rendu et contrôlé localement sans chevauchement visible ni accolade
résiduelle.

Le candidat exact `54760a0605ab77178ba14fc9ffa61b48dff64666` passe
`656/656` tests et est publié dans la version Apps Script immuable `894` des
deux Web Apps vertes existantes. Le bleu et le vert ont chacun couvert leurs
`25` routes, tous les liens de navigation visibles détectés et les destinations
supplémentaires. Les URL vertes restent inchangées. La version `893`, refusée
pour un lien `Accueil PFMP` incorrect, a été retirée des deux déploiements avant
la promotion du candidat corrigé.

Prochaine validation métier : lorsque le Word retravaillé sera prêt, l'exporter
en PDF, l'enregistrer comme modèle dans le bleu, générer un dossier sur un élève
de recette et contrôler les huit pages. Il faut vérifier en particulier les
libellés courts (`Né le`, `Photo d'identité`), les champs longs, les zones jaunes
vides, la date d'édition et la pagination. Le moteur est testé et son ancien
modèle a été vérifié ; le futur modèle utilisateur ne peut pas être déclaré
validé avant cette génération.

## DEV511 — candidat bleu homologué

DEV511 met en œuvre les deux procédures demandées :

1. une convention unitaire à dates réelles différentes, toujours rattachée à
   sa période officielle et justifiée par un motif ;
2. une rupture suivie d'une nouvelle convention reliée à l'ancienne.

Après rupture, le bureau ne renseigne pas le nouveau lieu de stage. Il saisit
seulement les nouvelles dates et le motif. La remplaçante est créée vide de
toute entreprise, de tout responsable et de tout tuteur ; le jeune remet ces
informations par son nouveau QR après avoir fait compléter la convention par
l'entreprise. L'ancienne séquence est figée, affichée en rouge et exclue des
ordres de mission. La remplaçante reste visible mais non couvrante et non
missionnable jusqu'à la saisie QR.

Le commit applicatif exact `10476433ab2fc27afb0960b188d302e7402bd7f1` a passé
`651/651` tests, a été publié et relu à l'identique sur le bleu. Les `25/25`
routes ainsi que tous les liens de navigation visibles ont été parcourus dans
le navigateur ; les sous-parcours BAC PRO, BTS et CAP sont également valides.
Les écritures réelles de rupture, convention, QR et mission sont restées
interdites pendant la recette : leurs tests sont simulés et cette limite doit
être annoncée. Après autorisation explicite, le candidat exact a été promu sur
les deux Web Apps vertes existantes dans la version immuable `892`. Les URL sont
inchangées et les `25/25` routes vertes sont valides ; la version `891` reste le
point de repli précédent.

## DEV510 livré sur le vert

Le candidat exact `ffdac5922034163a77e05f3d7840141b36a00447` a été promu
sur la version Apps Script immuable `891` des deux Web Apps vertes existantes.
Les contrôles ont obtenu `25/25` routes valides sur le bleu puis `25/25` sur le
vert. La navigation publique réelle accueil → BAC PRO → TCAR → PFMP n°1 ne
contient plus `Ordres de mission`; la même commande reste présente dans le
détail administratif. Aucun import, aucune écriture Grist, aucun PDF, aucun
courriel et aucun ordre de mission réel n'ont été déclenchés.

La recette Camin ne fournit pas encore de détail de classe dans ce parcours :
le contrôle public complet a donc été fait en lecture sur le vert après la
promotion autorisée, tandis que le bleu couvre la séparation public/admin par
le test de rendu `16/16`. Ne pas transformer cette limitation en affirmation de
validation métier bleue de bout en bout.

## Historique de cadrage — continuation après interruption

Le prochain candidat bleu doit traiter une PFMP commencée, interrompue, puis
reprise au-delà de la période officielle, y compris après les vacances
scolaires. Il ne faut ni modifier rétroactivement la convention interrompue, ni
faire disparaître l'incident, ni créer un second élève dans les décomptes.

Le centre administratif propose, uniquement sur un dossier au statut
`INTERROMPUE`, l'action de créer une nouvelle convention reliée. Le formulaire
demande seulement la date réelle de reprise, la date réelle de fin et le motif
obligatoire. Il confirme le rattachement à la période officielle d'origine,
même si la fin réelle la dépasse. Il ne demande ni l'entreprise, ni son
responsable, ni le tuteur ; le QR de la nouvelle convention recueille ces
éléments.

La remplaçante est un enregistrement distinct lié à la convention d'origine.
La convention initiale reste `INTERROMPUE` avec sa date de fin réelle et son
historique. La remplaçante conserve la classe, l'année et la période officielle
d'origine, mais porte ses propres dates réelles. Elle commence sans donnée
entreprise et ne devient exploitable qu'après la saisie du nouveau QR. Le
système ne transforme jamais automatiquement une rupture en convention signée.

Dans le tableau de suivi de classe et dans l'accès professeur principal :

- afficher une seule ligne pour l'élève avec le badge
  `À compléter par l'entreprise`, puis son statut courant ;
- afficher séparément les dates du segment interrompu et celles de la
  continuation, ainsi qu'un avertissement lorsque la fin dépasse la période
  officielle ;
- compter l'élève une seule fois dans l'effectif et comme non couvert tant que
  le QR de la remplaçante n'est pas complété, tout en conservant l'interruption
  dans l'historique ;
- ne jamais faire remonter la convention interrompue ni la remplaçante encore
  vide dans les ordres de mission.

Tests métier obligatoires sur le bleu avant livraison : dates individuelles,
fin après la période officielle, refus d'un remplacement sans dossier
interrompu, absence de double comptage, absence de copie des données entreprise,
ancien QR révoqué, nouveau QR utilisable avant le départ et exclusion des deux
séquences non missionnables. Le canal bleu simule les écritures ; aucune
convention réelle, aucun courriel et aucun ordre de mission ne sont créés.

DEV504 distingue désormais les routes des parcours métier et traite les trois
goulots observés lors de la recette utilisateur : l'import JotForm ne doit plus
réécrire les détails inchangés de toute une famille, le suivi sert d'abord son
snapshot persistant local, et la fusion PDF de lot ne sérialise/recharge plus
chaque convention avant de l'ajouter au document final. Le rattachement spécial
dispose d'un bouton d'enregistrement explicite pour le prochain import et d'un
retour de phase/durée.

Avant toute promotion, publier le candidat uniquement sur le bleu et exécuter
séparément : ouverture des routes, navigation, puis parcours métier. Le parcours
JotForm doit aller de la sélection d'une ligne de recette à sa présence dans le
suivi ciblé ; le parcours suivi doit afficher BAC PRO avec une durée relevée ;
le parcours PDF doit achever un lot représentatif sans dialogue « page ne
répondant pas ». Toute impossibilité due aux protections de recette doit être
rapportée comme non testée et non comme réussie.

## Historique immédiat après DEV503

DEV503 ajoute un rattachement manuel et contrôlé dans la migration JotForm.
Pour un élève qui commence sa PFMP en retard, conserver les dates réelles,
choisir la période officielle de sa vraie classe, sélectionner `Début retardé`
et renseigner le motif. La date de fin réelle doit être identique à la fin
officielle ; toute date postérieure reste bloquée avant écriture.

Le candidat bleu exact `9fc0536b7da66b9dd90e4af789aa2a875a5dd83a` a été
promu sur les deux Web Apps vertes existantes dans la version immuable `890`.
Les URL sont inchangées ; les contrôles ont réussi sur `25/25` routes bleues et
`25/25` routes vertes. La version `889` reste la version antérieure de repli.

Validation fonctionnelle encore à effectuer : cocher uniquement la ligne
concernée, ouvrir `Rattachement spécial / début retardé`, choisir sa PFMP,
contrôler `07/10/2026 → 16/10/2026`, saisir le motif, puis vérifier la
confirmation avant tout import. L’audit des routes prouve l’ouverture des pages,
mais ne remplace pas ce contrôle métier sur une vraie ligne JotForm prête. La
promotion elle-même n’a déclenché aucun import.

## Historique immédiat après DEV502

DEV502 sépare l’historique annuel de la cohorte utilisable dans le dossier
d’apprentissage et rend visible le sélecteur de périmètre de l’import Pronote.
Le candidat bleu exact a été publié et relu, la recherche `NIGITA` ne renvoie
plus que l’inscription courante `TMVA1`, puis le même paquet a été promu en
version immuable `889` sur les deux Web Apps vertes. Les contrôles de routes ont
réussi à `25/25` sur le bleu et à `25/25` sur le vert.

La promotion ne doit déclencher aucun import Pronote. Les choix de classes sont
appliqués seulement lors d’une future prévisualisation/import explicitement
confirmé par l’utilisateur. Les inscriptions des années antérieures restent
conservées dans Grist et ne doivent jamais être supprimées.

Prochaine validation fonctionnelle : charger un export Pronote en analyse seule,
décocher les classes hors périmètre (`prépas`, `STI2D`, etc.), vérifier la
prévisualisation puis seulement, sur autorisation explicite, confirmer un import.
Ce contrôle doit rester distinct de l’audit des routes, qui prouve l’ouverture des
pages mais pas le contenu d’un fichier Pronote particulier.

## Historique immédiat après DEV501

DEV501 ajoute au test du dossier le cas réel d’une recette contenant les élèves
mais pas les tables complémentaires responsables/apprentissage. Une route HTTP
valide ne vaut pas validation du parcours métier : avant toute promotion verte,
sélectionner un élève dans le bleu, vérifier que son formulaire s’affiche, puis
générer un PDF de huit pages avec un modèle enregistré.

## Historique immédiat après DEV500

DEV500 revient au flux simple demandé : modifier le Word, l’exporter en PDF,
puis téléverser ce PDF dans le site bleu. Les `137/137` balises du modèle préparé
restent continues dans le PDF ; les sept noms qui débordaient utilisent des
alias courts. Le moteur de fusion est de nouveau fondé sur les emplacements du
PDF, sans Google Docs.

Avant toute promotion verte, enregistrer le PDF validé comme modèle bleu et
générer un dossier avec un élève de recette. Contrôler les huit pages, les
données présentes et absentes, la date, la pagination et le comportement de la
confirmation simulée. Ne pas promouvoir sans ce contrôle métier.

## Historique immédiat après DEV499

DEV499 remplace la superposition sur un PDF par une fusion Google Docs puis un
export PDF. Le DOCX métier de huit pages est désormais la base éditable : ses
`135` balises sont acceptées, sa date d’édition est fusionnée sur chaque page et
sa pagination utilise de vrais champs Word. Le modèle maître n’est jamais
modifié ; seule une copie temporaire est exportée puis supprimée.

Avant promotion verte, importer le fichier préparé comme Google Docs dans Drive,
l’enregistrer dans la liste des modèles du site bleu et effectuer une génération
avec un élève de recette. Vérifier les huit pages, l’absence de balise résiduelle,
la date et les numéros de page. La confirmation de distribution doit rester une
simulation sur le bleu. Ne pas promouvoir tant que ce contrôle visuel n’est pas
réussi.

## Historique immédiat après DEV498

DEV498 corrige les quatre routes qui bloquaient la promotion DEV497 et rend les
chargements Destinataires et Paramètres d’envoi non bloquants. Le candidat exact
`aa040c02fc0ba813fe352f3d39e78dcbb2688bf1` a été promu sur les deux Web Apps
vertes existantes dans la version immuable `888`. Les URL sont inchangées, les
`25/25` routes bleues et vertes sont valides et la relecture distante du projet
stable correspond exactement au paquet testé.

Le prochain lot repart obligatoirement du bleu. Conserver le contrôle des
`35` destinations internes, le spinner transversal des boutons asynchrones et
le retour `Accueil PFMP` vers `https://alternance.loucodi.fr/` sur le vert.
Les tests des boutons d’écriture restent simulés : ne déclencher ni courriel,
ni import, ni ordre de mission, ni mutation élève/convention. Ne jamais accéder
directement à la production Grist `3pnVrygfNn7c` pendant une recette.

## Historique immédiat après DEV497

La recette bleue autorisée `j1jDArBkzi7P` contient désormais `55` élèves issus
des classes TMVA1, TMVA2 et TRMO de l’export Pronote LP fourni. Le dossier
d’apprentissage bleu charge `603` élèves au total et permet donc un contrôle
fonctionnel réel sans utiliser la production Grist.

Avant toute promotion verte, corriger ou revalider les quatre routes encore en
échec dans l’audit bleu : `admin-conventions-pfmp`,
`destinataires-envois-pfmp`, `parametres-envois-pfmp` et
`parcours-differencie-pfmp`. Relancer ensuite les `25` routes, contrôler le
parcours dossier d’apprentissage sur au moins un élève des trois classes
importées et homologuer le commit exact seulement si tout est vert. Ne pas
promouvoir DEV497 en l’état.

Les données nominatives de recette et l’export filtré restent hors Git. La
production `3pnVrygfNn7c` et les Web Apps vertes restent interdites sans une
nouvelle autorisation explicite.

## Historique immédiat après DEV496

DEV496 remplace les coordonnées PDF fixes du dossier d’apprentissage par une
fusion fondée sur les balises réellement présentes dans le modèle. Il ajoute
aussi un historique consultable et l’annulation logique d’une distribution,
sans suppression. Le canal bleu simule toujours confirmation et annulation sans
écriture Grist.

La lecture autorisée de la base officielle a confirmé que plusieurs informations
signalées ne sont pas seulement masquées par l’interface : les colonnes riches
du jeune et la profession des responsables ne sont pas encore présentes dans le
schéma officiel, et le courriel du jeune contrôlé est vide. Le prochain lot de
données devra donc être un import Pronote complet explicitement autorisé, après
prévisualisation, afin de créer puis alimenter les colonnes déjà prises en charge
par `EUC_IMPORT_PFMP_RichData.gs`. Ne jamais déduire ni inventer les valeurs
manquantes.

Avant toute promotion verte, publier le commit exact uniquement sur le `HEAD`
bleu, contrôler les 25 routes, le parcours accueil → dossier → retour, la
sélection d’un modèle Drive et un PDF vierge de huit pages. La recette bleue ne
contenant pas le jeune signalé, la présence réelle de ses données ne pourra être
validée qu’après une copie limitée autorisée ou, plus tard, après promotion. La
distribution enregistrée par erreur sur le vert ne doit être annulée qu’après
promotion de DEV496 et choix explicite de sa ligne dans l’historique.

Le candidat bleu actuellement publié est le commit
`2b45f0c3a4c5fbeab3e0828a516638e9d292bd64`. Le paquet distant a été relu à
l’identique et les `25/25` routes bleues sont valides. Les deux Web Apps vertes
restent sur la version immuable `887`.

## Historique immédiat après DEV495

DEV495 ajoute la gestion de plusieurs modèles PDF du dossier d’apprentissage,
renforce la compatibilité avec les colonnes historiques Pronote et prépare le
registre de distribution. Le canal bleu simule toujours la confirmation sans
écriture ; le candidat exact `beb7ddbed8a4590ea58ab15ded3c08133269a0d7` a été
promu après autorisation explicite vers les deux Web Apps vertes existantes dans
la version Apps Script immuable `887`.

## Historique immédiat après DEV494

DEV494 corrige sur le canal bleu uniquement la conversion des dates Grist du
module Apprentis. Le candidat exact est le commit `65577e6`, la suite complète
compte `603/603` tests verts et les `25/25` routes bleues sont valides. Les
écrans administrateur et public chargent dans le bon `/dev`, mais la recette
séparée ne contient aucune classe nominative : la vérification d'un élève réel
reste donc impossible sans recopier des données personnelles, ce qui n'est pas
autorisé.

La prochaine étape est une promotion contrôlée du candidat bleu vers les deux
Web Apps vertes existantes, uniquement après autorisation explicite de
l'utilisateur. La promotion doit conserver leurs URL, créer une version Apps
Script immuable, contrôler les 25 routes vertes et revenir automatiquement à
la version `886` en cas d'échec. Après réussite, vérifier en lecture seule une
classe réelle sur les écrans Apprentis administrateur et public : dates visibles,
statut « Apprenti » et cohérence avec les compteurs. Ne modifier aucune donnée
pendant ce contrôle.

## Contrat permanent issu de DEV493

DEV493 ne change pas l’application publiée. Il grave le contrat permanent de
travail dans `AGENTS.md` et `Documentation/CONTRAT_QUALITE_UI.md` : toute
évolution applicative doit passer d’abord par le bleu, conserver sa navigation
dans le bon canal, contrôler les 25 routes et les contrôles visibles des pages
du site entier, et appliquer le comportement de chargement à tous les boutons
asynchrones du candidat livré.
La prochaine évolution fonctionnelle devra suivre ce contrat sans que
l’utilisateur ait à le rappeler.

Tests DEV493 : DEV470 `8/8`, workflow de release `14/14`, suite complète
`600/600`. Aucun paquet Apps Script n’a été publié pour ce lot documentaire et
de contrôle.

DEV492 est publié sur le `HEAD` bleu et sur les deux Web Apps vertes existantes
dans la version Apps Script immuable `886`, à partir du commit applicatif
`ee73160`. Les URL sont inchangées. Les `25/25` routes bleues et les `25/25`
routes vertes sont valides ; la suite complète compte `598/598` tests verts.

La prochaine étape éventuelle est un essai réel unique du courriel d’ordre de
mission. Il doit être autorisé séparément, car il générera un PDF et enverra un
message à une adresse institutionnelle réelle ainsi qu’à la copie
`bfe@lycee-les-eucalyptus.org`. Vérifier le dialogue, le destinataire, l’objet,
le corps et le type de pièce jointe avant de confirmer. Le canal bleu reste
volontairement incapable d’envoyer.

Conserver la séparation stricte : projet bleu uniquement sur la recette Camin
`kB8bvDag8x7D`, projet vert uniquement sur sa cible configurée non-recette, et
refus de tout projet Apps Script inconnu. Ne jamais coder l’identifiant de la
cible verte ni une clé dans Git. Les protections DEV487 à DEV491 restent
obligatoires lors de toute promotion.

## Historique immédiat après DEV487

DEV487 retire du paquet de publication l'ancien audit P7.1B qui interceptait
le générateur de conventions et appelait des fonctions supprimées. Contrôler
sur le bleu que les listes « Classe des élèves » et « Classe portée par la
convention » quittent bien l'état « Chargement… », puis promouvoir exactement
ce candidat sur les deux Web Apps vertes existantes sans changer leurs URL.

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
la copie de recette Camin `kB8bvDag8x7D`, puis exécuter
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
