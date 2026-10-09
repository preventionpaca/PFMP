# Prochain lot après DEV526

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

La suite complète locale passe `716/716`. La publication doit valider les
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
