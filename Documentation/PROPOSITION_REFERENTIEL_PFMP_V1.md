# Proposition de référentiel PFMP v1 — lecture seule

Date : 31 juillet 2026  
Source exclusive : copie Grist `j1jDArBkzi7P`  
Extraction : cinq requêtes HTTP `GET`, sans appel à la production et sans écriture

## 1. Données sources trouvées

| Table | Lignes | État |
|---|---:|---|
| `Annees_Scolaires` | 3 | 1 active, 2 prévisionnelles inactives |
| `Classes` | 38 | 38 actives, 0 inactive |
| `Planning_Periodes` | 368 | 368 actives |
| `EUC_DIPLOMES` | 0 | volontairement vide |
| `EUC_OFFRES_FORMATION` | 0 | volontairement vide |

L'extraction locale filtrée est conservée dans `proposals/pfmp-source-readonly.json`. Elle ne contient que les champs utiles au référentiel, aucun jeton et aucune donnée d'élève.

## 2. Années scolaires

| ID Grist | Code | Début | Fin | Active | Commentaire |
|---:|---|---|---|---|---|
| 1 | 2026-2027 | 2026-09-01 | 2027-08-31 | oui | Année active de départ |
| 2 | 2027-2028 | 2027-09-01 | 2028-08-31 | non | Année prévisionnelle |
| 3 | 2028-2029 | 2028-09-01 | 2029-08-31 | non | Année prévisionnelle |

Le formulaire devra lire `Active` et ne proposer actuellement que l'ID 1. Aucun code d'année ne doit être placé dans le HTML ou Apps Script.

## 3. Classes actives et inactives

Les 38 lignes sont marquées actives. Aucune classe inactive n'existe actuellement ; il est donc impossible de déduire automatiquement quelles anciennes classes devraient être masquées.

| IDs | Classes actives |
|---|---|
| 1–12 | `1CAP CAR`, `1CAPP`, `1CAR`, `1CIEL`, `1MELEC`, `1MELEC G`, `1MP3D`, `1MT`, `1MVA1`, `1MVA2`, `1RMO`, `1RSP` |
| 13–20 | `2CAR`, `2MP3D`, `2MTNE1`, `2MTNE2`, `2MVA1`, `2MVA2`, `2REMI1`, `2REMI2` |
| 23–33 | `TCAP CAR`, `TCAR`, `TCIEL`, `TMELEC`, `TMELEC G`, `TMP3D`, `TMT`, `TMVA1`, `TMVA2`, `TRMO`, `TRSP` |
| 34–40 | `TPMMA`, `TSEC`, `CQPM ASC`, `1MELEC G`, `TMELEC G`, `1BTS ELEC Alt`, `2BTS ELEC Alt` |

Toutes les classes ont `Formation` et `Niveau` vides ou nuls. Les IDs 34 à 40 n'ont ni `Code_import` ni `Libelle`. Deux doublons actifs exacts existent :

- `1MELEC G` : IDs 6 et 37 ;
- `TMELEC G` : IDs 27 et 38.

## 4. Diplômes proposés

Les diplômes ci-dessous sont reconstruits à partir des codes de classes et des couples formation/niveau du planning. Aucun libellé officiel développé n'existe dans les sources ; ils nécessitent donc une validation humaine.

| Code proposé | Libellé provisoire | Classes Grist | Classement |
|---|---|---|---|
| `CAP_CAR` | CAP CAR | 1, 23 | probable |
| `CAPP` | CAPP | 2 | impossible à préciser |
| `CAR` | CAR | 3, 13, 24 | probable, code planning `CPA` |
| `CIEL` | CIEL | 4, 25 | probable |
| `MELEC` | MELEC | 5, 6, 26, 27, 37, 38 | ambigu à cause des doublons et classes multiples |
| `MP3D` | MP3D | 7, 14, 28 | probable, une source utilise `MP3` |
| `MT` | MT | 8, 29 | probable |
| `MVA` | MVA | 9, 10, 17, 18, 30, 31 | probable, classes multiples |
| `RMO` | RMO | 11, 32 | probable |
| `RSP` | RSP | 12, 33 | probable |
| `MTNE` | MTNE | 15, 16 | probable, classes multiples |
| `REMI` | REMI | 19, 20 | probable, classes multiples |
| `TPMMA` | TPMMA | 34 | impossible à préciser |
| `TSEC` | TSEC | 35 | probable, formation `Ducretet` |
| `CQPM_ASC` | CQPM ASC | 36 | impossible à préciser |
| `BTS_ELEC` | BTS ELEC | 39, 40 | probable pour la première année, période absente pour la seconde |

Total proposé : **16 lignes candidates** dans `EUC_DIPLOMES`.

## 5. Offres de formation proposées

Une offre candidate est produite pour chacune des 38 lignes de `Classes`, avec :

- année proposée : ID 1, seule année active ;
- diplôme provisoire issu du tableau précédent ;
- référence vers l'ID Grist réel de la classe ;
- code temporaire `2026-2027__CLASSE_{id}` uniquement dans le CSV de validation.

Ce rattachement à l'année 2026-2027 est **probable à valider**, car `Classes` ne possède aucune référence vers `Annees_Scolaires`. Les offres des classes 2, 34, 36, 37, 38 et 40 doivent rester bloquées jusqu'à décision. La liste exhaustive figure dans `proposals/pfmp-offres-formation-proposees.csv`.

Total maximal après validation de toutes les lignes : **38 offres à créer**.

## 6. Périodes reconnues

Sur les 368 lignes de `Planning_Periodes` :

- 47 sont reconnues comme périodes officielles candidates car leur type contient `PFMP` ou `Stage BTS` ;
- 262 sont de type `ENT.` et décrivent surtout des séquences d'alternance ; elles ne sont pas transformées en période PFMP et aucune « Année complète » n'est créée ;
- les 59 autres sont des examens, visites, conseils, appels ou autres événements ;
- aucune duplication exacte n'a été trouvée parmi les 47 périodes officielles ;
- aucun chevauchement n'a été trouvé à couple formation/niveau identique parmi ces 47 lignes.

Classement des 47 périodes :

| Classement | Nombre | Traitement proposé |
|---|---:|---|
| Correspondance certaine | 20 | offre unique identifiable |
| Correspondance probable à valider | 10 | offre unique, mais code différent (`CAR/CPA`, `MP3D/MP3`, `CAR/CA`) |
| Correspondance impossible à déterminer | 17 | 11 partagées par plusieurs classes, 6 sans classe correspondante |

Les 6 périodes sans classe correspondante sont les IDs 271, 272, 273, 275, 277 et 278 (`BTS CIEL`, `CPRP`, `CPI`, `MV` et mixité MV).

Les 11 périodes partagées par plusieurs classes sont les IDs 11, 12, 27, 28, 35, 36, 63, 64, 138, 139 et 141. Elles concernent MVA, MELEC, REMI ou MTNE.

## 7. Valeurs proposées pour `Planning_Periodes`

Le CSV `proposals/pfmp-periodes-correspondances-proposees.csv` fournit pour chaque période reconnue :

- `Offre_temporaire_proposee` : renseignée seulement lorsqu'une offre unique est identifiable ;
- `Offres_candidates` : toutes les offres possibles lorsqu'elles sont plusieurs ;
- `Libelle_periode_propose` : type, niveau et dates officielles ;
- `Code_periode_propose` : année, formation, niveau et numéro séquentiel normalisés ;
- classement et explication de l'ambiguïté.

Résultat :

- 30 lignes pourraient recevoir directement les trois colonnes après création et résolution des IDs des offres ;
- 17 lignes pourraient recevoir `Libelle_periode` et `Code_periode`, mais pas une unique `Offre_formation` sans décision supplémentaire ;
- au total, 47 lignes de `Planning_Periodes` seraient modifiées après validation complète.

## 8. Relation offre–périodes : insuffisance du modèle actuel

La donnée réelle démontre une relation plusieurs-à-plusieurs : une période MVA, MELEC, REMI ou MTNE peut concerner plusieurs classes physiques. La colonne unique `Planning_Periodes.Offre_formation` ne peut stocker qu'une seule offre.

Options humaines :

1. créer une table de liaison minimale `EUC_OFFRES_PERIODES` avec `Offre_formation Ref:EUC_OFFRES_FORMATION`, `Periode Ref:Planning_Periodes`, `Actif Bool` et `Commentaire Text` ; option recommandée ;
2. dupliquer chaque période partagée par classe, avec risque de divergence des dates ;
3. choisir arbitrairement une classe, option rejetée car elle perd l'information.

Aucun changement de schéma n'a été réalisé pendant cette étape.

## 9. Anomalies détaillées

1. les 38 classes sont actives ; aucune ancienne classe n'est explicitement désactivée ;
2. aucune classe ne porte directement son année scolaire ou son diplôme ;
3. les champs `Classes.Formation` et `Classes.Niveau` sont vides pour toutes les lignes ;
4. 7 classes récentes, IDs 34–40, n'ont ni code d'import ni libellé ;
5. deux paires de doublons actifs exacts : 6/37 et 27/38 ;
6. cinq classes n'ont aucune période officielle identifiable : IDs 2, 34, 35, 36 et 40 ;
7. la classe TSEC possède des séquences `ENT.` mais aucune PFMP/Stage ; elles ne doivent pas devenir une « Année complète » ;
8. 17 périodes ne peuvent pas recevoir une offre unique avec le schéma actuel ;
9. incohérences de codes : `CAR` face à `CPA` ou `CA`, `MP3D` face à `MP3` ;
10. six périodes BTS n'ont aucune classe active correspondante ;
11. la période BTS MV mixité ID 278 chevauche temporellement la période BTS MV ID 275 dans un autre couple formation/niveau ; cette coexistence doit être confirmée ;
12. la ligne 235 (`EXAMENS`, Ducretet/TSEC) n'a aucune année scolaire et porte la date 2027-10-12 ;
13. 367 périodes utilisent 2026-2027 et une seule n'a pas d'année ; aucune période n'utilise encore les années prévisionnelles ;
14. aucun commentaire d'exception n'est présent sur les 47 périodes officielles, donc une modification exceptionnelle de dates ne peut pas être distinguée automatiquement.

## 10. Décisions humaines nécessaires

1. fournir les libellés officiels complets des 16 diplômes ou corriger leur regroupement ;
2. décider si les 38 classes sont réellement actives en 2026-2027 ;
3. désactiver ou fusionner les doublons 6/37 et 27/38 ;
4. confirmer les correspondances `CAR ↔ CPA/CA` et `MP3D ↔ MP3` ;
5. préciser CAPP, TPMMA, CQPM ASC et le statut de TSEC ;
6. décider du sort des classes BTS et Bachelor présentes dans le planning mais absentes de `Classes` ;
7. confirmer la période de `1BTS ELEC Alt` et fournir celle de `2BTS ELEC Alt` si nécessaire ;
8. valider la création recommandée de `EUC_OFFRES_PERIODES` ;
9. décider si la colonne simple `Offre_formation` reste renseignée pour les 30 relations uniques et vide pour les relations multiples ;
10. corriger ou rattacher la ligne 235 à l'année appropriée ;
11. valider les 47 libellés et codes de période proposés ;
12. confirmer qu'aucune ligne `ENT.` ne doit alimenter le sélecteur des périodes scolaires.

## 11. Nombre exact de lignes après validation complète

| Opération proposée | Lignes |
|---|---:|
| Créations `EUC_DIPLOMES` | 16 |
| Créations `EUC_OFFRES_FORMATION` | 38 maximum |
| Modifications `Planning_Periodes` | 47 |
| Écritures réalisées pendant cette étape | **0** |

Le nombre de futures lignes de liaison dépendra de la décision sur `EUC_OFFRES_PERIODES`. Les 11 périodes partagées représentent 26 relations offre–période candidates ; les 30 périodes à offre unique représentent 30 relations supplémentaires, soit 56 relations si la table de liaison devient la source unique.

## 12. Fichiers de proposition

- source locale filtrée : `proposals/pfmp-source-readonly.json` ;
- diplômes : `proposals/pfmp-diplomes-proposes.csv` ;
- offres : `proposals/pfmp-offres-formation-proposees.csv` ;
- périodes et trois colonnes proposées : `proposals/pfmp-periodes-correspondances-proposees.csv` ;
- synthèse machine : `proposals/pfmp-proposition-summary.json`.

Ces fichiers n'ont pas été importés dans Grist. Ils ne contiennent aucun secret.

## 13. Point d'arrêt

Aucune alimentation de `EUC_DIPLOMES` ou `EUC_OFFRES_FORMATION`, aucune modification de `Planning_Periodes` et aucun changement de schéma ne sont autorisés sans une nouvelle validation explicite des propositions et des décisions ci-dessus.
