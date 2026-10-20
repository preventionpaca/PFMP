# Proposition — générateur de plannings annuels (à valider)

Statut : **modèle validé par l'utilisateur le 20 octobre 2026** ; lot A construit
(DEV610, page `?page=plannings-pfmp`). Elle remplace
l'outil Google Sheets « Planning PFMP et autres dates EK » (`apps-script/Code.js`,
menus « Outils planning ») et le classeur « Calendrier PFMP, Stages & Mixité ».

## 0. Décisions validées le 20 octobre 2026

- Les durées et ancrages sont une table de vérité **par année scolaire** : ils
  peuvent changer (circulaires, décrets, choix de l'établissement). Une année
  sans règles reprend celles de l'année précédente, à enregistrer.
- Placement collé à des vacances choisies, ou accolé à une autre période :
  Terminale BAC PRO 2026-2027 = 3 semaines avant la Toussaint, puis 3 semaines
  de PFMP accolées au P.dif. de 2 semaines, collé avant l'hiver. Les T CAP et
  les classes entières d'alternance sont placées à la main.
- Appel : règle d'établissement, la première semaine de chaque période en
  entreprise, pour tous les jeunes. Visite : la dernière semaine de chaque
  période en entreprise des mixités, pour tous les apprentis en mixité. Classes
  entières : appels et visites placés à la main. Examens et conseils : à la
  main.
- Mixités : 1re et Terminale BAC PRO (toutes filières), BTS CPI-CPRP (calendrier
  commun) et BTS MV ; pas de mixité en CIEL ni en ELEC (classe entière ELEC ALT).
  Semaines en entreprise = PFMP des scolaires + vacances + semaines ajoutées à la
  main (grosse période en entreprise dès mai, examens) ; en BTS, regroupement
  autour des petites vacances pour approcher un mois / un mois.
- Calendrier à part « formation continue et alternance classe entière » :
  TPMMA, CQPM ASC, TSEC, TPEEB, BTS ELEC ALT 1 et 2, Bachelor, CAP peintre.
- Heures : 7 h par jour de lycée par défaut, ajustées jour par jour ; total
  annuel comparé à un quota par formation (CAP peintre 450 h, BAC PRO et BTS
  675 h) — lot B.
- N+1 et N+2 chaque année. N+2 se construit sur des vacances prévisionnelles
  choisies au plus près des dates probables, et se diffuse aux entreprises
  marqué « Prévisionnel ». La partie jusqu'à Noël et l'été bougent peu ;
  janvier → juillet bouge avec les dates officielles. Réédition définitive fin
  août / début septembre ; historique de toutes les versions conservé.
- Jours particuliers : le lundi de Pentecôte reste férié au lycée et se
  rattrape un samedi déclaré « travaillé ».
- Création des tables Grist du générateur autorisée par l'utilisateur.

Écarts de mise en œuvre par rapport à la proposition ci-dessous :

- les périodes d'une version sont stockées dans la version elle-même
  (`EUC_PLAN_VERSIONS.Periodes_json`) au lieu d'une table `EUC_PLAN_PERIODES` :
  chaque version reste intacte, sans suppression ni réécriture de lignes ;
- les règles portent `Annee_scolaire` au lieu d'une validité « de / jusqu'à » ;
- une version N+2 vit seulement dans `EUC_PLAN_VERSIONS` tant que ses vacances
  sont prévisionnelles. Elle n'entre dans `Planning_Periodes` (lu par les
  conventions, le suivi, les affectations, les ordres de mission…) qu'une fois
  les dates officielles saisies : on régénère alors depuis les règles, les
  placements manuels sont conservés, puis on publie.

## 1. Constat sur l'outil actuel

- La sélection de cellules écrit `Formation`, `Niveau` et `Ligne_sheet` en texte,
  sans `Classes_concernees` : le lien classe Pronote ↔ période dépend de libellés
  et de numéros de ligne de feuille. C'est la source de la fragilité.
- Chaque génération relit tout Grist puis met en forme cellule par cellule : c'est
  la source de la lenteur. Régénérer écrase les calendriers déjà retouchés.
- Données 2026-2027 : 368 périodes ; les PFMP, P.dif. et stages BTS ont bien leurs
  `Classes_concernees`, mais pas les ENT., visites, appels, examens et conseils.
  Libellés de type en double (`PFMP TCAP`/`PFMP T CAP`, `Visite`/`VISITE`,
  `Stage BTS`/`BTS_STAGE`). Aucune période 2027-2028 ni 2028-2029.
- Environ vingt écrans et services lisent `Planning_Periodes` (conventions, suivi,
  affectations, ordres de mission, diagnostic). Le générateur ne doit donc jamais y
  laisser de brouillon.

## 2. Principe

1. Choisir l'année : la matrice semaines × lignes de planning s'affiche aussitôt,
   avec vacances, fériés et jours particuliers (calcul en mémoire, une seule
   lecture Grist).
2. Les **règles** placent automatiquement les périodes ancrées sur des vacances.
3. Les placements manuels se font par **sélection de cellules** dans la grille
   (glisser sur des semaines ou des jours), puis affinage dans un tableau.
4. Chaque génération crée une **version** (historique conservé). Rien n'est écrit
   dans `Planning_Periodes` avant « Publier », après un aperçu des changements.
5. Quand les dates officielles paraissent, une nouvelle version est recalculée :
   les périodes automatiques suivent leur règle, les périodes manuelles gardent
   leur position **par rapport aux vacances voisines**, et l'aperçu montre
   l'avant/après de chaque période.

## 3. Tables

Tables existantes conservées : `Annees_Scolaires`, `Vacances_Scolaires`
(colonne `Previsionnel`), `Calendrier_Scolaire`, `Types_Planning`, `Classes`,
`Planning_Periodes`.

### 3.1 `EUC_PLAN_JOURS_PARTICULIERS` (nouvelle)

Séparée de `Calendrier_Scolaire` pour survivre à sa régénération.

| Colonne | Type | Exemple |
|---|---|---|
| Annee_scolaire | Ref:Annees_Scolaires | 2026-2027 |
| Date | Date | 2027-02-05 |
| Nature | Choice | `TRAVAILLE` (rattrapage) / `NON_TRAVAILLE` / `BANALISE` |
| Libelle | Text | Rattrapage lundi de Pentecôte (portes ouvertes) |
| Heures | Numeric | 4 (facultatif : demi-journée) |
| Portee | RefList:EUC_PLAN_LIGNES | vide = tout l'établissement |

Le lundi de Pentecôte reste férié (non travaillé au lycée) ; le samedi rattrapé
est déclaré `TRAVAILLE`.

### 3.2 `EUC_PLAN_LIGNES` (nouvelle) — table de vérité des lignes de planning

Une ligne = une ligne de la grille.

| Colonne | Type | Rôle |
|---|---|---|
| Code | Text | `TBACPRO`, `1BACPRO`, `2NDE`, `1CAP`, `TCAP`, `1BTS_CIEL`, `1BTS_ELEC`, `1BTS_CPI`, `1BTS_CPRP`, `1BTS_MV`, `2BTS_MV`, `MIX_1BACPRO`, `MIX_TBACPRO`, `MIX_1BTS_CPI_CPRP`, `MIX_2BTS_CPI_CPRP`, `MIX_1BTS_MV`, `MIX_2BTS_MV`, `TSEC`, `BACHELOR_IP`, `CAP_PEINTRE`, `TPMMA`, `CQPM_ASC`, `TPEEB`, `1BTS_ELEC_ALT`, `2BTS_ELEC_ALT`… |
| Libelle | Text | « T BAC PRO — CIEL » |
| Calendrier | Choice | `SCOLAIRE` / `MIXITE` / `FC_ALTERNANCE` (formation continue et alternance classe entière : calendrier à part) |
| Groupe_affichage | Text | « T BAC PRO », « 1 BTS »… (bloc de la grille) |
| Ordre | Int | ordre d'affichage |
| Ligne_scolaire | RefList:EUC_PLAN_LIGNES | pour une mixité : lignes scolaires dont elle hérite les PFMP |
| Quota_heures | Numeric | 450 (CAP peintre), 675 (bac pro, BTS)… |
| Heures_jour_defaut | Numeric | 7 |
| Jours_lycee_defaut | Text | `L,M` pour le CAP peintre ; vide = 5 jours |
| Suivi_auto | Bool | crée l'appel (1re semaine) et la visite (dernière semaine) de chaque période en entreprise |
| Couleur | Text | couleur de la ligne |
| Actif | Bool | |

### 3.3 `EUC_PLAN_LIGNES_CLASSES` (nouvelle) — rattachement annuel aux classes Pronote

Les noms Pronote changent selon les promotions (TPEEB 19, 20…). Le rattachement
est donc annuel, **proposé automatiquement** depuis `Classes` (Classe_PFMP,
Niveau_Pronote, Filiere_Pronote, Etab) puis confirmé dans l'aperçu.

| Colonne | Type |
|---|---|
| Annee_scolaire | Ref:Annees_Scolaires |
| Ligne | Ref:EUC_PLAN_LIGNES |
| Classes | RefList:Classes |

C'est ce rattachement qui remplit toujours `Planning_Periodes.Classes_concernees`.
Mixités : toutes les filières de 1re et de Terminale BAC PRO ; en BTS, CPI-CPRP
(calendrier commun) et MV ; pas de mixité en CIEL ni en ELEC (classe entière
ELEC ALT).

### 3.4 `EUC_PLAN_REGLES` (nouvelle) — durées et ancrages, datés par texte officiel

Une ligne = une période d'une ligne de planning. Les durées changent avec les
circulaires et décrets : chaque règle a une validité.

| Colonne | Type | Exemple TBACPRO |
|---|---|---|
| Ligne | Ref:EUC_PLAN_LIGNES | TBACPRO |
| Numero | Int | 1 / 2 / 3 |
| Type | Ref:Types_Planning | PFMP Tbac / PFMP Tbac / P.dif. |
| Duree_semaines | Numeric | 3 / 3 / 2 |
| Placement | Choice | `AUTO` / `MANUEL` |
| Ancrage | Choice | `TOUSSAINT`, `NOEL`, `HIVER`, `PRINTEMPS`, `ETE` ou `REGLE` (accolée à une autre règle) |
| Regle_ancrage | Ref:EUC_PLAN_REGLES | n°2 accolée **avant** n°3 (P.dif.), n°3 accolée avant l'hiver |
| Position | Choice | `AVANT` / `APRES` |
| Ecart_semaines | Int | 0 = collée |
| Valable_de / Valable_jusqua | Ref:Annees_Scolaires | 2026-2027 / vide |
| Reference_texte | Text | circulaire, décret |

Valeurs initiales, telles qu'observées en 2026-2027, à confirmer :

| Ligne | Périodes |
|---|---|
| TBACPRO | 3 sem. avant la Toussaint ; 3 sem. accolées avant le P.dif. ; P.dif. 2 sem. collé avant l'hiver |
| 1BACPRO | 4 sem. avant Noël ; 4 sem. avant le printemps |
| 2NDE | 6 sem. avant l'été |
| 1CAP | 6 sem. avant l'été |
| TCAP | 2 périodes, placement **manuel** |
| 1BTS_CIEL, 1BTS_ELEC | 6 sem. avant l'été |
| 1BTS_CPI, 1BTS_CPRP | 8 sem. avant l'été |
| 1BTS_MV | 4 sem. avant l'été (5 dans la grille 2026-2027, à vérifier) |
| 2BTS_MV | 5 sem. avant Noël |
| Mixités | héritent des PFMP + vacances, puis semaines ajoutées **à la main** |
| Classes entières (FC_ALTERNANCE) | placement entièrement **manuel** |

L'allongement de la convention de 2 semaines pour les élèves restant en
entreprise pendant le P.dif. reste géré par les conventions ; le générateur n'y
touche pas.

### 3.5 `EUC_PLAN_VERSIONS` (nouvelle) — historique

| Colonne | Type |
|---|---|
| Annee_scolaire | Ref:Annees_Scolaires |
| Numero | Int (1, 2, 3…) |
| Statut | `BROUILLON` / `PREVISIONNEL_DIFFUSE` / `PUBLIE` / `REMPLACE` |
| Base_dates | `OFFICIELLES` / `PREVISIONNELLES` |
| Version_source | Ref:EUC_PLAN_VERSIONS |
| Commentaire | Text (« P.dif. déplacé après la 2e période »…) |
| Date_creation / Date_publication | DateTime |

Une seule version `PUBLIE` par année. Elle est la seule copiée dans
`Planning_Periodes`.

### 3.6 `EUC_PLAN_PERIODES` (nouvelle) — périodes de chaque version

| Colonne | Type |
|---|---|
| Version | Ref:EUC_PLAN_VERSIONS |
| Ligne | Ref:EUC_PLAN_LIGNES |
| Regle | Ref:EUC_PLAN_REGLES (vide = manuelle) |
| Type | Ref:Types_Planning |
| Date_debut / Date_fin | Date |
| Origine | `REGLE` / `GRILLE` / `TABLEAU` / `SUIVI_AUTO` |
| Ancre_vacances / Decalage_semaines | Choice / Int (mémorise « 1 sem. après l'hiver » pour le recalcul) |
| Verrou | Bool (ne jamais déplacer au recalcul sans confirmation) |
| Periode_publiee | Ref:Planning_Periodes (lien après publication) |

### 3.7 `EUC_PLAN_HEURES` (nouvelle) — heures par jour, exceptions seulement

Pour les mixités et les classes entières : 7 h par jour de lycée par défaut, et
seules les exceptions sont stockées (4 h le lundi de fin, une matinée de rentrée,
vendredi à la place du mardi).

| Colonne | Type |
|---|---|
| Version | Ref:EUC_PLAN_VERSIONS |
| Ligne | Ref:EUC_PLAN_LIGNES |
| Date | Date |
| Heures | Numeric |
| Motif | Text |

Le total annuel est comparé à `Quota_heures` : écart affiché en rouge ou en vert.

## 4. Publication dans `Planning_Periodes`

- « Publier » une version de l'année compare ses périodes aux lignes existantes
  et affiche l'aperçu : créées, modifiées (dates avant/après), désactivées.
- Chaque ligne écrite porte `Classes_concernees` (depuis 3.3), `Classe_PFMP`,
  `Annee_scolaire`, `Type` normalisé (un seul libellé par type), `Date_debut`,
  `Date_fin`, `Formation`, `Niveau`, `Couleur` et `Actif`.
- Une période retirée passe à `Actif = false` : aucune suppression physique,
  aucune convention cassée.
- Les versions N+2 **prévisionnelles** ne sont jamais écrites dans
  `Planning_Periodes`. Elles servent au document destiné aux entreprises, marqué
  « Prévisionnel ». Elles deviennent publiables quand les dates officielles sont
  saisies.
- Contrôle automatique avant publication : chaque période PFMP, P.dif. ou stage
  est reconnue par le moteur de suivi (R1–R7 : type, dates, année, classes
  concernées).

## 5. Écrans (application PFMP)

- **Planning général** : grille semaines × lignes, vacances en noir, une couleur
  par type de période. Visites, appels, examens, conseils et VFMP sont des
  **pastilles** (lettre ou icône) dans la case, et non des fonds de couleur. Un
  filtre permet de les masquer, pour ne pas surcharger.
- **Calendrier de classe** (annexe 32a) : mois en colonnes, jours en lignes,
  colonnes D / J / H. On clique sur un jour pour modifier ses heures. Totaux par
  mois et total annuel comparés au quota. Impression A4 ou A3 et PDF.
- **Calendrier à part** pour la formation continue et l'alternance en classe
  entière : TPMMA, CQPM ASC, TSEC, TPEEB, BTS ELEC ALT 1 et 2, Bachelor, CAP
  peintre.
- **Tableau** d'affinage des périodes, puis aperçu de publication.

## 6. Découpage proposé

1. Lot A : tables, règles, rattachement Pronote, génération des calendriers
   scolaires N+1, grille avec saisie par sélection, aperçu, publication.
2. Lot B : mixités (héritage, ajout manuel des semaines) et classes entières,
   heures par jour et quotas, calendriers de classe imprimables.
3. Lot C : versions N+2 prévisionnelles, document « Prévisionnel » pour les
   entreprises, recalcul après parution des dates officielles avec aperçu
   avant/après.
