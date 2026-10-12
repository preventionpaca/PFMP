# Décisions métier permanentes

- Une simple ressemblance orthographique entre deux responsables ou tuteurs
  ne constitue jamais une preuve d'identité. La casse est normalisée uniquement
  pour l'affichage. Une correction nominative exige une action administrateur
  explicite et reste une surcouche traçable ; aucune convention historique
  n'est réécrite.
- Le profil éditorial et l'historique de relation d'une entreprise sont indexés
  dans Grist. Les logos, photos et pièces restent dans Drive afin de ne pas
  consommer la capacité documentaire de Grist. Les liens sont limités à HTTP(S).
- Une action de relation possède un statut `BROUILLON` ou `PUBLIE` et une
  visibilité `PERSONNELS` ou `PUBLIC`. Le public ne voit que la combinaison
  `PUBLIE` + `PUBLIC`. L'archivage futur devra être logique (`Actif=false`) et
  ne supprimera jamais physiquement l'historique.
- Les tables de relation utilisent une clé d'entreprise durable, le SIRET
  lorsqu'il est disponible et l'identité canonique en repli. Cette clé permettra
  de déplacer ultérieurement le journal vers un autre document Grist sans
  modifier les conventions ni les fichiers Drive.

- Un code postal français lu depuis une cellule numérique est toujours
  normalisé sur cinq chiffres. Lorsqu'il ne comporte que quatre chiffres, le
  zéro initial est restauré avant affichage, comparaison d'adresse ou
  géocodage ; la valeur source n'est pas réécrite pour cette seule correction.
- La bulle publique d'une entreprise affiche l'ensemble distinct des diplômes
  accueillis dans le périmètre historique autorisé. Le filtre de diplôme
  sélectionne les entreprises de la carte, mais ne réduit pas ce rappel à la
  seule valeur filtrée et plusieurs accueils du même diplôme produisent une
  seule ligne.
- Une entreprise déjà présente dans le book public mais dépourvue de point
  enregistré peut être géocodée à la demande. Le service ne reçoit que son
  adresse professionnelle publique, n'écrit jamais dans Grist, exige un
  résultat suffisamment spécifique et met en cache le point non nominatif.
  Une géolocalisation à la demande ne vaut pas validation administrative
  durable du point.

- La source d'import des groupes d'alternance et de formation continue se
  nomme `YPAREO`. Un futur lot réutilisera le masque apprenti existant :
  contrôle SIRET, entreprise, dates de contrat et qualification explicite de
  la situation du jeune. L'import ne créera pas un second formulaire métier.
- Une table de correspondance dédiée à YPAREO reliera l'acronyme ou le groupe
  source au nom officiel de la formation pour l'alternance et la formation
  continue. En l'absence d'une correspondance certaine, la classe reste
  choisie par l'administrateur ; aucune déduction approximative n'est admise.
- Le libellé YPAREO `SFP APP SANS ENTREPRISE` décrit une situation à qualifier :
  futur apprenti sans entreprise ou rupture de contrat. Il ne suffit jamais à
  classer automatiquement le jeune parmi les apprentis actuels.
- Le repère rouge `A` désigne l'apprentissage. Un repère `G` distinct désigne
  l'appartenance au GTA ou à la formation continue ; les deux repères peuvent
  être affichés simultanément. Ces règles sont documentées ici pour le futur
  lot YPAREO et n'entraînent aucune écriture métier dans le lot d'interface
  DEV556.

- Une bulle cartographique d'entreprise peut ouvrir un itinéraire externe vers
  ses coordonnées validées. PFMP transmet uniquement la destination à Google
  Maps dans un nouvel onglet : la position de départ est choisie ou déterminée
  par le service cartographique et n'est ni demandée, ni reçue, ni stockée par
  PFMP. Une entreprise sans coordonnées exploitables n'affiche pas ce lien.
- Une facette « Ville » est construite uniquement depuis une commune
  identifiable après un code postal. Sa clé est normalisée sans distinction de
  casse, d'accent, d'espace ou de tiret. Une voie, une corniche, une route, un
  quartier ou un lieu-dit ne devient jamais une commune du filtre ; une adresse
  dont la commune n'est pas déterminable reste sans facette plutôt que d'être
  classée arbitrairement.
- Le rendu initial d'une classe réutilise les données déjà embarquées et ne
  relance pas un service pour relire le même détail ou reconstruire la même
  navigation. Un préchauffage familial éventuel est groupé en une seule
  exécution, lit chaque source au plus une fois et ne modifie aucune donnée
  métier.

- Le book destiné aux élèves et familles est un troisième contrat d'affichage
  public, distinct des vues personnels et administration. Il porte
  obligatoirement sur les trois dernières années et ne transmet jamais SIRET,
  élève, professeur, classe, période ni historique nominatif. Il peut afficher
  l'entreprise, son adresse, les nombres agrégés scolaire/apprenti, les diplômes
  disponibles comme facette de recherche et les coordonnées professionnelles
  des responsables et tuteurs connus (nom, téléphone et courriel).
- Dans les vues nominatives autorisées du book, un apprenti est repéré par un
  `A` rouge. Son historique utilise la période réelle de son contrat
  d'apprentissage, éventuellement bornée par une rupture, et jamais les
  périodes PFMP artificiellement associées à sa classe.

- La modalité d'apprentissage est réglée par classe et par année scolaire :
  `MIXITE` ou `CLASSE_ENTIERE`. Elle n'est jamais déduite automatiquement du
  nombre d'apprentis et une classe reste en mixité par défaut tant qu'aucun
  réglage explicite n'existe.
- Un contrat complet non rompu est compté parmi les apprentis actuels, même si
  sa date de début est à venir. Un futur apprenti est un dossier engagé sans
  contrat complet. Les dossiers remis et les contrats valides disposent de
  compteurs distincts.
- La cartographie apprentis est strictement en lecture seule. Le mode public
  ne reçoit jamais le nom d'un jeune ni d'un professeur. Le mode administratif
  peut afficher le jeune, l'année scolaire, la classe et tous les professeurs
  visiteurs associés.
- Deux appellations d'entreprise ne sont jamais fusionnées automatiquement
  lorsqu'une ambiguïté demeure. L'administration peut rattacher explicitement
  une appellation à un établissement canonique ; ce rattachement est
  réversible et ne supprime ni ne réécrit les accueils historiques.
- Un rattachement d'appellation est appliqué à la lecture dans le book et sa
  cartographie. Les snapshots et conventions d'origine ne sont pas réécrits.
  Deux représentations techniques du même accueil sont dédoublonnées avec
  l'identifiant durable de l'élève, l'année, la classe et la période ; la ligne
  conservée porte le nom de l'élève, la période officielle et le professeur
  visiteur issus des sources canoniques.
- Dans les fiches entreprise, deux contacts partageant le même téléphone
  normalisé ou le même courriel normalisé sont regroupés. Le libellé retenu est
  le nom le plus complet disponible ; téléphone et courriel ne sont pas
  répétés en raison d'une simple variation de format ou de casse. Les années
  scolaires associées à ce contact sont fusionnées et affichées avant son nom,
  de la plus récente à la plus ancienne. Les contacts sont eux-mêmes classés
  d'abord par leur date de saisie la plus récente.

- Le book entreprises possède trois contrats distincts : parents anonymisé,
  personnels autorisés et administration. Les noms d'élèves et de professeurs
  ne sont jamais livrés au navigateur du mode parents, même sous forme masquée.
  Une vue nominative destinée aux personnels exige un contrôle d'accès réel.
- Les photos de devanture sont stockées dans Drive et non dans Grist. Grist ne
  conserve que les métadonnées et l'identifiant Drive. Une photo rendue
  publique ne montre ni personne reconnaissable ni plaque lisible.
- Dans le book et la cartographie, l'identité d'un établissement français est
  d'abord son SIRET. Le couple entreprise/adresse canonique sert uniquement de
  repli aux anciens accueils dépourvus de SIRET. Une variation de ponctuation ou
  un code postal/une commune répétés ne créent pas une seconde entreprise.
- Les filtres du book s'appliquent de façon identique à la liste, à la galerie,
  à la carte et aux exports. Un export respecte toujours le niveau de
  confidentialité de la vue qui l'a produit.
- Le pilotage de l'apprentissage distingue le quota, les apprentis actuels, les
  contrats signés à démarrage futur, les dossiers remis non retournés, les
  dossiers retournés en attente et les dossiers transmis au CFA. Pour les
  indicateurs courants, chaque jeune est compté dans son état le plus avancé.
  Les places restantes et tout dépassement de quota sont affichés explicitement.

- Pronote reste le progiciel officiel. Eucalyptus PFMP est l’outil opérationnel de suivi et de relation entreprise ; les informations utiles pourront être reportées dans Pronote.
- Aucune signature électronique : les conventions sont imprimées et signées sur papier. L’élève saisit sa convention après signature par l’entreprise.
- Le périmètre des classes utilisées par le module PFMP est commandé par l’import Élèves + responsables : les imports Classes/Professeurs ne font qu’enrichir ce périmètre et n’ajoutent pas de nouvelles classes PFMP.
- Les données 2025-2026 restent le jeu historique de test. La recette bleue autorisée est exclusivement la copie Camin `kB8bvDag8x7D` ; elle peut contenir des données Pronote réelles 2026-2027 limitées aux classes nécessaires aux essais. Ces données restent hors Git et ne doivent jamais être copiées vers la production sans une nouvelle autorisation explicite.
- Un élève sorti reste visible mais n’est plus compté sans convention après sa sortie.
- Homonymes et rapprochements ambigus ne sont jamais fusionnés automatiquement.
- Pendant la transition JotForm, des dates réellement travaillées peuvent être rattachées à une PFMP seulement si leur intervalle est entièrement inclus dans une unique période officielle de la vraie classe et de la même année scolaire. La convention conserve alors les bornes officielles ; un chevauchement partiel ou plusieurs périodes possibles imposent un contrôle manuel.
- Une PFMP commencée puis interrompue n'est jamais rouverte ni écrasée. Le bureau enregistre uniquement sa date de fin réelle et son motif ; l'ancien QR est révoqué. Une reprise est une nouvelle convention distincte, reliée à la convention interrompue et à la même période officielle, avec ses propres dates réelles et son propre QR. Ses dates peuvent dépasser la fin officielle et traverser les vacances scolaires après validation administrative explicite et saisie d'un motif.
- Pour la convention de remplacement après rupture, le bureau ne saisit et ne recopie ni entreprise, ni responsable, ni tuteur, même si l'entreprise est connue. Ces éléments sont renseignés par l'élève avec le nouveau QR après que la nouvelle convention papier a été complétée par l'entreprise. Tant que cette saisie n'est pas terminée, le remplacement reste `À compléter par l'entreprise`, ne couvre pas l'élève dans les décomptes et n'est pas admissible aux ordres de mission. Dès que tous les champs obligatoires de l'entreprise, du responsable et du tuteur sont présents, il devient `Convention enregistrée`; un ancien statut technique resté bloqué ne doit pas masquer une saisie complète.
- Dans le suivi de classe, la convention interrompue et sa remplaçante forment un seul parcours élève : l'élève n'est compté qu'une fois dans l'effectif. L'ancienne séquence et son entreprise restent visibles en rouge dans l'historique ; la remplaçante devient la séquence courante. Une convention interrompue n'est jamais incluse dans un ordre de mission. Les affectations de suivi téléphonique et de visite ne sont pas reconduites silencieusement vers une nouvelle destination.
- Une convention individuelle peut être créée en conservant la période officielle de rattachement tout en portant une date réelle de début et/ou de fin différente, accompagnée d'un motif obligatoire. Là encore, le bureau ne renseigne pas l'entreprise : le QR sert à la saisie de l'entreprise, du responsable et du tuteur.
- Le QR d'une convention est ouvert seulement avant sa date réelle de début. Dès le jour du début et jusqu'à la fin, il refuse la saisie normale et demande de passer au bureau PFMP pour recevoir une convention adaptée. Après la date de fin, il est définitivement expiré. Une convention interrompue ou annulée révoque immédiatement son QR.
- Une convention créée reste rééditable depuis son dossier administratif par son identifiant durable, y compris après fermeture du navigateur et pour un remplacement après rupture. La génération générale ne crée pas une deuxième convention active pour les mêmes élève, période et année : elle reprend l'existante si les dates sont identiques et impose le dossier administratif si elles diffèrent.
- Les PDF générés sont archivés dans Google Drive par année scolaire, niveau, classe et période. Grist conserve uniquement l'identifiant, le lien, le nom, la date et la taille du fichier ; le contenu binaire du PDF n'est pas stocké dans Grist. L'échec de l'archivage ne doit jamais empêcher le téléchargement local du PDF déjà généré.
- Pour un SIRET français, une fiche entreprise locale n'est prioritaire que si raison sociale, voie, code postal et ville sont tous présents. Une fiche partielle ne masque jamais la réponse officielle. Une entreprise ne peut pas être marquée vérifiée ni enregistrée si l'un de ces quatre champs manque.
- Pour une convention historique importée de JotForm, les coordonnées du responsable absentes de la convention peuvent être relues depuis le tampon JotForm si la ligne est validée ou porte `Importer = true`, et si elle correspond sans ambiguïté au même élève, à la même classe et au même SIRET ou aux mêmes dates. Une ligne seulement analysée, non importée, reste exclue. Cette récupération reste en lecture seule et ne remplace jamais une valeur déjà enregistrée sur la convention.
- Le placement des surimpressions du PDF de convention (lignes et QR) est un paramètre de présentation hors Grist. Il utilise le repère PDF standard, origine en bas à gauche, et toute zone doit rester dans les limites A4 avant d'être enregistrée.
- Les classes viennent de Grist. Les classes explicitement écartées lors de l’import Élèves + responsables restent hors périmètre PFMP, y compris si elles existent dans les exports Classes/Professeurs.
- En 2026-2027, `1MP3D`, `2BTS CPI`, `2BTS CPRP`, `2BTS ELEC` et `2BTS CIEL` n’ont volontairement aucune période officielle. Cette absence n’est pas une anomalie.
- `1BTS ELEC` et `1BTS CIEL` ont des périodes propres, aux mêmes dates : du 24/05/2027 au 02/07/2027.
- Les blocs `ENT.` et l’alternance ne deviennent jamais automatiquement des PFMP scolaires.
- Toute modification administrative est historisée. Une annulation est logique, jamais une suppression physique.
- Suivi téléphonique et visite en entreprise sont deux affectations distinctes. Aucun enseignant n’est codé en dur.
- Ordres de mission et remboursements relèvent d’un lot futur. Les finitions graphiques détaillées de la fiche administrative sont différées.
- Le dossier de demande d’apprentissage reprend les huit pages des annexes 11, 12d et du positionnement dans cet ordre. Il préremplit uniquement les données réellement disponibles, distingue l’INE du NIR et ajoute la date d’édition sur chaque page. Après génération, l’utilisateur confirme explicitement la distribution : cette confirmation seule alimente un registre append-only relié à l’élève ; le canal bleu la simule sans écriture. Si l’adresse élève est absente, l’adresse du responsable légal prioritaire sert de repli ; nationalité, lieu de naissance et NIR restent vides tant qu’aucune source explicite ne les fournit.
- Pour le dossier de demande d’apprentissage, l’année d’entrée est choisie dans la plage `2023-2024` à `2037-2038` et l’année scolaire courante est proposée par défaut. Le choix de formation associe un diplôme et un niveau d’entrée ; la « formation préparée » reprend automatiquement le diplôme sélectionné. Le catalogue diplôme/niveaux est administrable dans les propriétés Apps Script et ne génère aucun appel Grist.
- Le dossier d’apprentissage utilise un modèle maître Word librement modifiable, exporté en PDF par l’utilisateur puis téléversé directement dans l’application. Google Docs n’intervient pas. La fusion repère les balises textuelles à leur position dans le PDF. Le registre des modèles et l’identifiant du modèle par défaut sont conservés dans les propriétés Apps Script ; un seul modèle peut être par défaut et retirer un modèle de la liste ne supprime jamais physiquement son fichier.
- Une balise du dossier d’apprentissage doit rester un texte continu sur une seule ligne après export PDF. Les zones étroites utilisent les alias courts documentés dans `Documentation/BALISES_DOSSIER_APPRENTISSAGE.md`. La date d’édition et la pagination utilisent `{{DATE_HEURE_IMPRESSION}}`, `{{PAGE_COURANTE}}` et `{{NB_PAGES}}` dans le pied de chaque page.
- La convention PFMP de référence doit tenir strictement sur un recto-verso A4, sans page blanche ni grandes zones vides, avec une mise en page compacte mais lisible.
- Lorsque le modèle de convention sera stabilisé, il devra être exportable au format Word `.docx` modifiable afin de pouvoir être corrigé ultérieurement puis réintégré comme modèle de référence.
# Décision permanente du 9 octobre 2026 — contrat anti-régression du suivi PFMP

- Une fonctionnalité validée et en service ne peut plus être modifiée sans un test ciblé qui décrit son comportement attendu et un passage de la suite complète avant publication.
- Dans chaque liste d'élèves par classe, la colonne « Coordonnées entreprise » affiche, lorsqu'ils existent, le nom et le prénom du responsable, son téléphone et son courriel. Les sources QR canoniques, les anciens alias, les fiches entreprise/contact et le tampon JotForm validé sont supportés. Un rapprochement ambigu ne doit jamais choisir arbitrairement un contact.
- La pastille « Convention enregistrée » et la pastille « APPRENTI » utilisent un fond vert et une écriture blanche. Le fond jaune de la ligne apprenti et le repère `A` devant le nom sont conservés. « Sans convention », « Annulée » et « Interrompue » restent rouges sur fond rose.
- La date de début du contrat est affichée dans la pastille `APPRENTI` avec une taille et un contraste lisibles, sans texte miniature ni transparence atténuée.
- Lorsqu'une convention interrompue possède une convention de remplacement active, la ligne courante montre la nouvelle convention en vert ; l'interruption reste visible dans l'historique rouge.
- Le site vert ne montre plus la pastille technique « ENVIRONNEMENT VERT — VERSION EN LIGNE ». Le bandeau bleu reste un garde-fou propre à la recette.
- Le premier chargement d'une classe filtre les conventions de cette classe avant l'enrichissement des entreprises, contacts et données JotForm. Il est interdit de réintroduire un enrichissement de toutes les conventions annuelles sur ce parcours.

# Décision permanente du 10 octobre 2026 — référence 925 et sobriété des lectures

- La version verte `925`, le commit `60e8811` et le tag
  `pfmp-green-925-stable` forment le point de retour fonctionnel immuable. Le
  tag ne doit jamais être déplacé. Les invariants et les preuves associées sont
  détaillés dans `Documentation/REFERENCE_STABLE_VERTE_925.md`.
- Une fiche de classe doit être rendue depuis un détail compact déjà enrichi.
  Sur le chemin utilisateur, il est interdit de reconstruire une famille,
  d'enrichir toute l'année ou d'enchaîner des lectures Grist dont les données
  sont déjà présentes dans ce détail.
- À froid, la cible est une seule lecture distante du détail. À chaud, aucune
  lecture Grist n'est admise tant qu'aucune révision métier utile n'a changé.
  Chaque lot touchant ce parcours doit mesurer et comparer le nombre d'appels,
  la durée froide, la durée chaude et le volume JSON.
- La cartographie transporte uniquement les marqueurs et un résumé léger.
  L'historique des élèves et des professeurs visiteurs est chargé à la demande
  pour l'entreprise ouverte, jamais pour tous les marqueurs en bloc.
- Le book entreprises est une vue relationnelle sur les entreprises et les
  accueils existants. Les photos de devanture sont stockées dans Drive ; Grist
  ne conserve que leur identifiant, lien, source, date et droits d'usage.

# Décision permanente du 10 octobre 2026 — cartographie et recherche d'élève

- Le nombre affiché pour une entreprise est le nombre d'élèves distincts
  accueillis dans le périmètre actif : période sélectionnée, ensemble de
  l'année scolaire, ou ensemble de toutes les années. Plusieurs séquences du
  même élève dans ce périmètre ne doivent pas le compter deux fois.
- La carte publique reste non nominative. Elle reçoit uniquement l'identité de
  l'entreprise, son adresse, ses coordonnées géographiques, le périmètre
  demandé et le total agrégé. Les identifiants et noms d'élèves, même hachés,
  ne sont jamais transmis au navigateur public.
- Pour la France, le fournisseur de référence reste Géoplateforme / Base
  Adresse Nationale. Pour Monaco, Nominatim/OpenStreetMap est un moteur de
  repli en petit lot, temporisé et mis en cache. Il ne reçoit que l'adresse de
  l'entreprise ; les résultats insuffisamment sûrs exigent une validation.
  Dans une demande de masse, chaque adresse monégasque n'est interrogée qu'une
  seule fois. Une absence de résultat ne relance jamais automatiquement la même
  adresse en boucle ; une nouvelle tentative exige une nouvelle action humaine.
- Dans le générateur de conventions, la recherche d'un élève s'effectue dans
  la liste déjà chargée. La frappe de quelques lettres ne déclenche aucun
  nouvel appel Grist et la valeur métier conservée reste l'identifiant durable
  de l'élève sélectionné.

# Décision permanente du 10 octobre 2026 — quotas, relances et confidentialité du book

- Le quota d'apprentissage est saisi en pourcentage pour chaque classe et année
  scolaire. Le nombre de places affiché est l'arrondi mathématique de
  `effectif réel × pourcentage / 100`. Le pourcentage est une configuration
  Apps Script ; il ne duplique pas les états d'apprentissage dans Grist.
- Le périmètre apprentissage est paramétrable par classe et année scolaire.
  Toute classe est active par défaut pour préserver l'existant. Une classe
  désactivée reste visible dans la page de réglage afin de pouvoir être
  réactivée, mais elle est exclue des bilans public et administratif, des
  totaux, des dossiers, des relances et du sélecteur de classe. Cette exclusion
  ne supprime ni élève, ni contrat, ni historique.
- L'effectif utilisé pour calculer les quotas comprend uniquement les élèves
  encore présents dans l'établissement pour l'année sélectionnée. Un élève
  inactif, absent du dernier import, sorti/radié ou dont la date de sortie est
  atteinte est exclu de l'effectif et des indicateurs apprentissage. Une date de
  sortie future ne l'exclut qu'à compter du jour effectif de son départ.
- Chaque indicateur global du pilotage apprentissage expose, au survol et au
  clavier, le même total ventilé d'abord entre `LP` et `LGT`, puis par classe.
  Cette ventilation ne comprend que les classes actives et ne déclenche aucune
  lecture Grist supplémentaire : elle est calculée dans la réponse agrégée
  déjà chargée. La réponse publique reste exclusivement non nominative.
- L'impression ou la confirmation de distribution d'un dossier alimente le
  registre existant. Un dossier distribué et non retourné apparaît dans la
  liste de relance à partir du quatorzième jour. Cette alerte n'envoie aucun
  courriel automatiquement.
- La cartographie destinée aux parents agrège les trois dernières années
  scolaires. Elle affiche seulement l'entreprise et le nombre d'élèves
  distincts accueillis ; elle ne transmet ni nom d'élève, ni professeur
  visiteur, ni SIRET au navigateur.
- Les noms d'élèves et de professeurs visiteurs sont réservés à un personnel
  authentifié ou à l'administration. Sur la carte, ils sont chargés seulement
  à l'ouverture de l'infobulle afin de ne pas alourdir le chargement des
  marqueurs.
