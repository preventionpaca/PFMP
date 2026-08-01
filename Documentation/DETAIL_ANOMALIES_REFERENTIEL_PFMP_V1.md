# Détail des anomalies du référentiel PFMP v1

Date : 31 juillet 2026  
Source : copie Grist `j1jDArBkzi7P`, lectures `GET` uniquement  
Production exclue : `3pnVrygfNn7c`

## 1. Traçabilité des informations

Dans les tableaux :

- **source** : valeur réellement enregistrée dans Grist ;
- **déduite** : rapprochement calculé depuis les codes, l'année active et les dates ;
- **proposée** : future valeur possible, non écrite.

La seconde lecture a inventorié les références structurées vers `Classes` dans 16 tables. Aucune ligne ne référence les classes 6, 27, 37 ou 38. Le fichier filtré est `proposals/pfmp-class-reference-usage.json`.

## 2. Tableau complet des 38 classes

`Actif Grist` est la valeur source réelle. L'année 2026-2027 est toujours déduite : aucune ligne de `Classes` ne référence une année.

|ID|Code source|Nom / libellé source|Formation / niveau source|Effectif|Actif Grist|Année|Diplôme proposé|Offre proposée|PFMP retrouvées|Confiance / commentaire|
|---:|---|---|---|---:|---|---|---|---|---:|---|
|1|1CAP_CAR|1CAP CAR / 1CAP CAR|— / —|10|oui|2026-2027 déduite|CAP_CAR|2026-2027__CLASSE_1|1|probable — `1 CA` dans le planning|
|2|1CAPP|1CAPP / 1CAPP|— / —|14|oui|2026-2027 déduite|CAPP|2026-2027__CLASSE_2|0|impossible — aucun libellé développé ni PFMP|
|3|1CAR|1CAR / 1CAR|— / —|23|oui|2026-2027 déduite|CAR|2026-2027__CLASSE_3|2|probable — `CPA` dans le planning|
|4|1CIEL|1CIEL / 1CIEL|— / —|32|oui|2026-2027 déduite|CIEL|2026-2027__CLASSE_4|2|probable — code spécialité identique|
|5|1MELEC|1MELEC / 1MELEC|— / —|26|oui|2026-2027 déduite|MELEC|2026-2027__CLASSE_5|2|probable — périodes partagées|
|6|1MELEC_G|1MELEC G / 1MELEC G|— / —|12|oui|2026-2027 déduite|MELEC|2026-2027__CLASSE_6|2|probable — doublon nominal 37|
|7|1MP3D|1MP3D / 1MP3D|— / —|12|oui|2026-2027 déduite|MP3D|2026-2027__CLASSE_7|2|probable — `MP3` dans deux périodes|
|8|1MT|1MT / 1MT|— / —|23|oui|2026-2027 déduite|MT|2026-2027__CLASSE_8|2|probable|
|9|1MVA1|1MVA1 / 1MVA1|— / —|29|oui|2026-2027 déduite|MVA|2026-2027__CLASSE_9|2|probable — périodes partagées avec 10|
|10|1MVA2|1MVA2 / 1MVA2|— / —|29|oui|2026-2027 déduite|MVA|2026-2027__CLASSE_10|2|probable — périodes partagées avec 9|
|11|1RMO|1RMO / 1RMO|— / —|12|oui|2026-2027 déduite|RMO|2026-2027__CLASSE_11|2|probable|
|12|1RSP|1RSP / 1RSP|— / —|10|oui|2026-2027 déduite|RSP|2026-2027__CLASSE_12|2|probable|
|13|2CAR|2CAR / 2CAR|— / —|20|oui|2026-2027 déduite|CAR|2026-2027__CLASSE_13|1|probable — `CPA` dans le planning|
|14|2MP3D|2MP3D / 2MP3D|— / —|12|oui|2026-2027 déduite|MP3D|2026-2027__CLASSE_14|1|probable|
|15|2MTNE1|2MTNE1 / 2MTNE1|— / —|30|oui|2026-2027 déduite|MTNE|2026-2027__CLASSE_15|1|probable — période partagée avec 16|
|16|2MTNE2|2MTNE2 / 2MTNE2|— / —|30|oui|2026-2027 déduite|MTNE|2026-2027__CLASSE_16|1|probable — période partagée avec 15|
|17|2MVA1|2MVA1 / 2MVA1|— / —|29|oui|2026-2027 déduite|MVA|2026-2027__CLASSE_17|1|probable — période partagée avec 18|
|18|2MVA2|2MVA2 / 2MVA2|— / —|31|oui|2026-2027 déduite|MVA|2026-2027__CLASSE_18|1|probable — période partagée avec 17|
|19|2REMI1|2REMI1 / 2REMI1|— / —|23|oui|2026-2027 déduite|REMI|2026-2027__CLASSE_19|1|probable — période partagée avec 20|
|20|2REMI2|2REMI2 / 2REMI2|— / —|19|oui|2026-2027 déduite|REMI|2026-2027__CLASSE_20|1|probable — période partagée avec 19|
|23|TCAP_CAR|TCAP CAR / TCAP CAR|— / —|9|oui|2026-2027 déduite|CAP_CAR|2026-2027__CLASSE_23|2|probable — `T CA` dans le planning|
|24|TCAR|TCAR / TCAR|— / —|14|oui|2026-2027 déduite|CAR|2026-2027__CLASSE_24|2|probable — `CPA` dans le planning|
|25|TCIEL|TCIEL / TCIEL|— / —|28|oui|2026-2027 déduite|CIEL|2026-2027__CLASSE_25|2|probable|
|26|TMELEC|TMELEC / TMELEC|— / —|22|oui|2026-2027 déduite|MELEC|2026-2027__CLASSE_26|2|probable — périodes partagées|
|27|TMELEC_G|TMELEC G / TMELEC G|— / —|13|oui|2026-2027 déduite|MELEC|2026-2027__CLASSE_27|2|probable — doublon nominal 38|
|28|TMP3D|TMP3D / TMP3D|— / —|12|oui|2026-2027 déduite|MP3D|2026-2027__CLASSE_28|2|probable|
|29|TMT|TMT / TMT|— / —|21|oui|2026-2027 déduite|MT|2026-2027__CLASSE_29|2|probable|
|30|TMVA1|TMVA1 / TMVA1|— / —|24|oui|2026-2027 déduite|MVA|2026-2027__CLASSE_30|2|probable — périodes partagées avec 31|
|31|TMVA2|TMVA2 / TMVA2|— / —|19|oui|2026-2027 déduite|MVA|2026-2027__CLASSE_31|2|probable — périodes partagées avec 30|
|32|TRMO|TRMO / TRMO|— / —|12|oui|2026-2027 déduite|RMO|2026-2027__CLASSE_32|2|probable|
|33|TRSP|TRSP / TRSP|— / —|6|oui|2026-2027 déduite|RSP|2026-2027__CLASSE_33|2|probable|
|34|—|TPMMA / —|— / —|10|oui|2026-2027 déduite|TPMMA|2026-2027__CLASSE_34|0|impossible|
|35|—|TSEC / —|— / —|10|oui|2026-2027 déduite|TSEC|2026-2027__CLASSE_35|0|probable — séquences `ENT.` seulement|
|36|—|CQPM ASC / —|— / —|0|oui|2026-2027 déduite|CQPM_ASC|2026-2027__CLASSE_36|0|impossible|
|37|—|1MELEC G / —|— / —|0|oui|2026-2027 déduite|MELEC|2026-2027__CLASSE_37|2|impossible — doublon actif 6|
|38|—|TMELEC G / —|— / —|0|oui|2026-2027 déduite|MELEC|2026-2027__CLASSE_38|2|impossible — doublon actif 27|
|39|—|1BTS ELEC Alt / —|— / —|0|oui|2026-2027 déduite|BTS_ELEC|2026-2027__CLASSE_39|1|probable|
|40|—|2BTS ELEC Alt / —|— / —|0|oui|2026-2027 déduite|BTS_ELEC|2026-2027__CLASSE_40|0|impossible — période absente|

## 3. Doublons 6/37 et 27/38

### Comparaison colonne par colonne

| Colonne | ID 6 | ID 37 | ID 27 | ID 38 |
|---|---|---|---|---|
| `Code_import` | `1MELEC_G` | vide | `TMELEC_G` | vide |
| `Nom` | `1MELEC G` | `1MELEC G` | `TMELEC G` | `TMELEC G` |
| `Libelle` | `1MELEC G` | vide | `TMELEC G` | vide |
| `Formation` | nul | vide | nul | vide |
| `Niveau` | nul | vide | nul | vide |
| `Effectif` | 12 | 0 | 13 | 0 |
| `Actif` | vrai | vrai | vrai | vrai |
| `Commentaire` | vide | vide | vide | vide |
| références structurées reçues | aucune | aucune | aucune | aucune |
| périodes PFMP textuellement associées | 28, 36 | 28, 36 | 12, 64 | 12, 64 |
| année d'utilisation déduite | 2026-2027 | 2026-2027 | 2026-2027 | 2026-2027 |

Différences exactes : les lignes 6 et 27 ont un code, un libellé et un effectif non nul ; 37 et 38 n'ont que le nom, un effectif nul et `Actif=true`. Aucune des quatre lignes n'est référencée par les 16 tables possédant une colonne `Ref:Classes`.

Risque : faible pour les références Grist structurées, mais réel pour des filtres de vues, imports ou scripts externes utilisant le nom en texte. Recommandation : **fusion fonctionnelle puis désactivation proposée de 37 et 38**, uniquement après vérification manuelle des vues Grist et des imports. Conserver 6 et 27. Ne supprimer aucune ligne.

## 4. Divergences CAR / CPA / CA et MP3D / MP3

### Occurrences dans `Classes`

| ID | Code exact | Libellé exact | Rapprochement proposé | Confiance |
|---:|---|---|---|---|
| 1 | `1CAP_CAR` | `1CAP CAR` | `CAP / 1 CA` | probable |
| 3 | `1CAR` | `1CAR` | `1 BAC PRO / CPA` | probable |
| 7 | `1MP3D` | `1MP3D` | `1 BAC PRO / MP3` | probable |
| 13 | `2CAR` | `2CAR` | `2 BAC PRO / CPA` | probable |
| 14 | `2MP3D` | `2MP3D` | `2 BAC PRO / MP3D` | certaine sur le code métier |
| 23 | `TCAP_CAR` | `TCAP CAR` | `CAP / T CA` | probable |
| 24 | `TCAR` | `TCAR` | `T BAC PRO / CPA` | probable |
| 28 | `TMP3D` | `TMP3D` | `T BAC PRO / MP3D` | certaine sur le code métier |

### Occurrences dans `Planning_Periodes`

| ID | Formation / code exact | Type | Dates | Rapprochement proposé |
|---:|---|---|---|---|
| 2 | T BAC PRO / `CPA` | VFMP | 2026-09-23 → 2026-09-25 | TCAR, probable |
| 7 | T BAC PRO / `MP3D` | VFMP | 2026-09-23 → 2026-09-25 | TMP3D, certaine |
| 10 | T BAC PRO / `CPA` | PFMP Tbac | 2027-01-18 → 2027-02-05 | TCAR, probable |
| 13 | T BAC PRO / `MP3D` | PFMP Tbac | 2027-01-18 → 2027-02-05 | TMP3D, certaine |
| 17 | T BAC PRO / `CPA` | P.dif. | 2027-02-08 → 2027-02-19 | TCAR, probable |
| 20 | T BAC PRO / `MP3D` | P.dif. | 2027-02-08 → 2027-02-19 | TMP3D, certaine |
| 26 | 1 BAC PRO / `CPA` | PFMP 1ère | 2026-11-23 → 2026-12-18 | 1CAR, probable |
| 29 | 1 BAC PRO / `MP3` | PFMP 1ère | 2026-11-23 → 2026-12-18 | 1MP3D, probable |
| 34 | 1 BAC PRO / `CPA` | PFMP 1ère | 2027-03-22 → 2027-04-16 | 1CAR, probable |
| 37 | 1 BAC PRO / `MP3` | PFMP 1ère | 2027-03-22 → 2027-04-16 | 1MP3D, probable |
| 62 | T BAC PRO / `CPA` | PFMP Tbac | 2026-09-28 → 2026-10-16 | TCAR, probable |
| 65 | T BAC PRO / `MP3D` | PFMP Tbac | 2026-09-28 → 2026-10-16 | TMP3D, certaine |
| 137 | 2 BAC PRO / `CPA` | PFMP 2nde | 2027-05-24 → 2027-07-02 | 2CAR, probable |
| 140 | 2 BAC PRO / `MP3D` | PFMP 2nde | 2027-05-24 → 2027-07-02 | 2MP3D, certaine |
| 284 | CAP / `T CA` | PFMP TCAP | 2027-03-15 → 2027-04-09 | TCAP CAR, probable |
| 285 | CAP / `1 CA` | PFMP 1 CAP | 2027-05-24 → 2027-07-02 | 1CAP CAR, probable |
| 287 | CAP / `T CA` | PFMP T CAP | 2026-11-16 → 2026-12-04 | TCAP CAR, probable |

Raison : la progression scolaire et les dates concordent, mais aucune clé Grist ne prouve que `CAR=CPA=CA` ou `MP3=MP3D`. Aucune valeur ne doit être normalisée avant confirmation métier.

## 5. Cinq classes sans période officielle

| ID | Source disponible | Codes proches / périodes candidates | Échec | Recommandation |
|---:|---|---|---|---|
| 2 | `1CAPP`, effectif 14, active | `CAP Connexe/CP` possède 55 lignes `ENT.` ; CAP IDs 284, 285, 287 | CAPP, CP et CA ne sont pas reliés | masquer temporairement ou rattacher après décision métier ; ne pas saisir librement sans connaître le statut scolaire/apprenti |
| 34 | `TPMMA`, effectif 10, active | aucune occurrence TPMMA | aucun code proche | décision humaine ; compléter diplôme et période ou masquer |
| 35 | `TSEC`, effectif 10, active | `Ducretet/TSEC` : 38 lignes `ENT.` entre 2026-11-16 et 2027-11-12 | aucune ligne PFMP/Stage ; alternance probable | traiter comme apprentissage avec dates réelles, pas comme période officielle |
| 36 | `CQPM ASC`, effectif 0, active | aucune occurrence CQPM/ASC | aucun code proche | décision humaine ; probablement certification/apprentissage, masquer tant que non qualifiée |
| 40 | `2BTS ELEC Alt`, effectif 0, active | ID 274 : 1BTS/ELEC ; ID 277 : 2BTS/MV | aucune période 2BTS/ELEC | compléter une période si stage scolaire ; sinon traiter comme alternance avec dates réelles |

## 6. Six périodes BTS orphelines

| ID | Code proposé / libellé | Année | Dates | Type | Classe la plus proche | Blocage / solution |
|---:|---|---|---|---|---|---|
| 271 | `2026_2027_1BTS_CIEL_01` / Stage BTS — CIEL | 2026-2027 | 2027-05-24 → 2027-07-02 | Stage BTS | 1CIEL, mais ce n'est pas une classe BTS | créer/identifier la vraie classe BTS CIEL |
| 272 | `2026_2027_1BTS_CPRP_01` / Stage BTS — CPRP | 2026-2027 | 2027-05-10 → 2027-07-02 | Stage BTS | aucune | créer/identifier la classe BTS CPRP |
| 273 | `2026_2027_1BTS_CPI_01` / Stage BTS — CPI | 2026-2027 | 2027-05-10 → 2027-07-02 | Stage BTS | aucune | créer/identifier la classe BTS CPI |
| 275 | `2026_2027_1BTS_MV_01` / Stage BTS — MV | 2026-2027 | 2027-05-31 → 2027-07-02 | Stage BTS | classes MVA, mais niveau différent | confirmer si BTS MV doit avoir une classe propre |
| 277 | `2026_2027_2BTS_MV_01` / Stage BTS — MV | 2026-2027 | 2026-11-16 → 2026-12-18 | Stage BTS | aucune classe 2BTS MV | créer/identifier la classe correspondante |
| 278 | `2026_2027_1BTS_MV_MIXITE_01` / Stage BTS — Mixité | 2026-2027 | 2027-05-31 → 2027-08-31 | Stage BTS | aucune classe mixité | confirmer s'il s'agit d'alternance ; ne pas créer « Année complète » |

## 7. Onze périodes partagées

| ID | Code / libellé proposé | Dates | Classes / offres candidates | Associations | Confiance |
|---:|---|---|---|---:|---|
| 11 | T BAC PRO MVA 01 / PFMP Tbac — MVA | 2027-01-18 → 2027-02-05 | 30, 31 | 2 | élevée pour les deux |
| 12 | T BAC PRO MELEC 01 / PFMP Tbac — MELEC | 2027-01-18 → 2027-02-05 | 26, 27, 38 | 3 | élevée pour 26/27, doublon 38 à arbitrer |
| 27 | 1 BAC PRO MVA 01 / PFMP 1ère — MVA | 2026-11-23 → 2026-12-18 | 9, 10 | 2 | élevée pour les deux |
| 28 | 1 BAC PRO MELEC 01 / PFMP 1ère — MELEC | 2026-11-23 → 2026-12-18 | 5, 6, 37 | 3 | élevée pour 5/6, doublon 37 à arbitrer |
| 35 | 1 BAC PRO MVA 02 / PFMP 1ère — MVA | 2027-03-22 → 2027-04-16 | 9, 10 | 2 | élevée |
| 36 | 1 BAC PRO MELEC 02 / PFMP 1ère — MELEC | 2027-03-22 → 2027-04-16 | 5, 6, 37 | 3 | élevée sauf doublon 37 |
| 63 | T BAC PRO MVA 02 / PFMP Tbac — MVA | 2026-09-28 → 2026-10-16 | 30, 31 | 2 | élevée |
| 64 | T BAC PRO MELEC 02 / PFMP Tbac — MELEC | 2026-09-28 → 2026-10-16 | 26, 27, 38 | 3 | élevée sauf doublon 38 |
| 138 | 2 BAC PRO MVA 01 / PFMP 2nde — MVA | 2027-05-24 → 2027-07-02 | 17, 18 | 2 | élevée |
| 139 | 2 BAC PRO REMI 01 / PFMP 2nde — REMI | 2027-05-24 → 2027-07-02 | 19, 20 | 2 | élevée |
| 141 | 2 BAC PRO MTNE 01 / PFMP 2nde — MTNE | 2027-05-24 → 2027-07-02 | 15, 16 | 2 | élevée |

Exemple : l'ID 27 s'applique à 1MVA1 et 1MVA2. `Planning_Periodes.Offre_formation` ne peut stocker qu'une seule référence ; choisir l'une masquerait la période à l'autre.

### Schéma exact recommandé pour `EUC_OFFRES_PERIODES` — non créé

| Colonne | Type | Requis | Rôle |
|---|---|---:|---|
| `Offre_formation` | `Ref:EUC_OFFRES_FORMATION` | oui | offre/classe concernée |
| `Periode` | `Ref:Planning_Periodes` | oui | période officielle |
| `Actif` | `Bool` | oui | activation sans suppression |
| `Cle_doublon` | `Text` | oui | `{offreId}:{periodeId}`, calculée serveur et contrôlée avant insertion |
| `Commentaire` | `Text` | non | justification administrative |

Si cette table devient la source unique : 56 lignes candidates, soit 30 relations uniques et 26 relations pour les 11 périodes partagées. Après résolution des doublons 37/38, ce total descendrait à 52.

Lecture Apps Script : charger l'offre correspondant à l'année et la classe, filtrer `EUC_OFFRES_PERIODES` sur `Offre_formation` et `Actif=true`, puis charger les IDs `Periode` dans `Planning_Periodes`. Les dates restent exclusivement celles de `Planning_Periodes`.

## 8. Seize diplômes proposés

Les développements ci-dessous sont des **propositions non officielles** ; Grist ne contient que les codes courts.

| Code | Libellé Grist trouvé | Libellé complet proposé | Niveau | Classes | Certitude / décision |
|---|---|---|---|---|---|
| CAP_CAR | `CAP CAR`, `1 CA`, `T CA` | CAP Carrossier automobile | CAP | 1, 23 | probable ; confirmer l'intitulé officiel |
| CAPP | `1CAPP` | CAP Peintre automobile ou peinture en carrosserie | CAP | 2 | faible ; développer CAPP |
| CAR | `CAR`, planning `CPA` | Bac professionnel Carrossier peintre automobile | Bac pro | 3, 13, 24 | probable ; confirmer CAR=CPA |
| CIEL | `CIEL` | Bac professionnel Cybersécurité, Informatique et réseaux, Électronique | Bac pro | 4, 25 | élevée mais libellé à valider |
| MELEC | `MELEC` | Bac professionnel Métiers de l'électricité et de ses environnements connectés | Bac pro | 5, 6, 26, 27, 37, 38 | élevée ; résoudre doublons |
| MP3D | `MP3D`, `MP3` | Bac professionnel Modélisation et prototypage 3D | Bac pro | 7, 14, 28 | probable ; confirmer MP3=MP3D |
| MT | `MT` | Bac professionnel Microtechniques | Bac pro | 8, 29 | moyen ; développer MT |
| MVA | `MVA` | Bac professionnel Maintenance des véhicules, option voitures particulières | Bac pro | 9, 10, 17, 18, 30, 31 | probable ; confirmer l'option exacte |
| RMO | `RMO` | Bac professionnel Réalisation de produits mécaniques, option réalisation et maintenance des outillages | Bac pro | 11, 32 | probable ; valider l'option |
| RSP | `RSP` | Bac professionnel Réalisation de produits mécaniques, option réalisation et suivi de productions | Bac pro | 12, 33 | probable ; valider l'option |
| MTNE | `MTNE` | Seconde famille des métiers des transitions numérique et énergétique | famille Bac pro | 15, 16 | élevée sur le sigle ; décider si une famille doit être un « diplôme » |
| REMI | `REMI` | Seconde famille des métiers de la réalisation d'ensembles mécaniques et industriels | famille Bac pro | 19, 20 | élevée sur le sigle ; même décision |
| TPMMA | `TPMMA` | Titre professionnel mécanicien de maintenance automobile | titre professionnel supposé | 34 | faible ; intitulé à confirmer |
| TSEC | `Ducretet`, `TSEC` | Technicien services de l'électroménager connecté | titre professionnel supposé | 35 | moyen ; intitulé/statut à confirmer |
| CQPM_ASC | `CQPM ASC` | CQPM ASC — développement absent de Grist | certification | 36 | impossible ; fournir l'intitulé officiel |
| BTS_ELEC | `BTS`, `ELEC` | BTS Électrotechnique | BTS | 39, 40 | élevée ; confirmer le régime alternance |

## 9. Analyse de l'année scolaire

| ID | Code | Dates | Active source |
|---:|---|---|---|
| 1 | 2026-2027 | 2026-09-01 → 2027-08-31 | oui |
| 2 | 2027-2028 | 2027-09-01 → 2028-08-31 | non |
| 3 | 2028-2029 | 2028-09-01 → 2029-08-31 | non |

Les 38 offres ont été provisoirement rattachées à l'ID 1 parce que c'est la seule année `Active=true` et que 367/368 lignes de planning portent `2026-2027`. Ce rattachement reste déduit : `Classes` n'a aucune colonne année. Les classes TSEC et certaines formations en alternance ont des lignes datées après le 31 août 2027 ; elles pourraient relever de 2027-2028. Un rattachement automatique risquerait donc de classer une ancienne ou future cohorte dans la mauvaise année.

## 10. Période ID 235

| Champ | Valeur source |
|---|---|
| `Annee_scolaire` | vide |
| `Formation` | Ducretet |
| `Niveau` | TSEC |
| `Classe` | nul |
| `Groupe` | vide |
| `Date_debut` / `Date_fin` | 2027-10-12 / 2027-10-12 |
| `Type` | EXAMENS |
| `Couleur` | `#18c46b` |
| `Ligne_sheet` | 0 |
| `Commentaire` | Créé depuis sélection `ALT_2026-2027_Ducretet_TSEC` |
| `Actif` | vrai |

Usage probable : événement d'examen du calendrier TSEC, pas PFMP. L'absence d'année peut provenir de la création depuis une sélection ALT alors que la date appartient à 2027-2028. Pour le référentiel PFMP, il suffit de l'exclure par type. Une correction de calendrier est recommandée séparément, mais n'est pas nécessaire au formulaire PFMP.

## 11. Analyse des 262 lignes `ENT.`

Toutes portent textuellement `2026-2027`; plage globale 2026-09-01 → 2027-11-12.

| Formation / niveau | Lignes | Première date | Dernière date | Usage probable |
|---|---:|---|---|---|
| CAP Connexe / CP | 55 | 2026-09-01 | 2027-08-31 | alternance/apprentissage |
| 1 BAC PRO / Mixité | 35 | 2026-10-12 | 2027-08-31 | mixité scolaire-apprentissage |
| T BAC PRO / Mixité | 29 | 2026-09-28 | 2027-08-31 | mixité scolaire-apprentissage |
| 1BTS CPI-CPRP / Mixité | 36 | 2026-10-05 | 2027-08-31 | alternance BTS |
| 2BTS CPI-CPRP / Mixité | 5 | 2026-10-12 | 2027-09-03 | alternance, dépasse la borne annuelle |
| 1BTS MV / Mixité | 33 | 2026-10-12 | 2027-08-31 | alternance BTS |
| 2BTS MV / Mixité | 19 | 2026-10-12 | 2027-08-31 | alternance BTS |
| BACHELOR / IP | 12 | 2026-09-01 | 2027-09-17 | alternance Bachelor |
| Ducretet / TSEC | 38 | 2026-11-16 | 2027-11-12 | alternance/titre professionnel |

Ces lignes sont des plages discontinues d'entreprise, souvent hebdomadaires, créées depuis des calendriers ALT. Elles servent principalement à l'alternance et à l'apprentissage, pas à une PFMP scolaire unique. Certaines dépassent la borne de l'année textuelle, ce qui confirme que les apprentis doivent saisir leurs dates contractuelles réelles. Aucune période « Année complète » ne doit être créée.

## 12. Décisions humaines réellement nécessaires

1. confirmer la désactivation future des doublons 37 et 38 après contrôle manuel des vues/imports ;
2. confirmer `CAR=CPA=CA` et `MP3=MP3D`, ou fournir une table de correspondance métier différente ;
3. décider individuellement du statut de CAPP, TPMMA, TSEC, CQPM ASC et 2BTS ELEC Alt ;
4. fournir/créer les classes manquantes pour les six périodes BTS, ou déclarer ces périodes obsolètes ;
5. valider les libellés officiels des 16 diplômes ;
6. décider si MTNE et REMI sont des diplômes ou des familles d'orientation ;
7. autoriser ou refuser le futur schéma `EUC_OFFRES_PERIODES` ;
8. confirmer que les lignes `ENT.` sont exclues du sélecteur scolaire et seulement exploitées comme contexte d'alternance ;
9. définir une règle explicite d'appartenance des classes aux années ;
10. traiter l'ID 235 dans le calendrier, indépendamment du formulaire PFMP.

## 13. Garanties de cette étape

Aucune ligne Grist n'a été créée, modifiée ou supprimée. Aucun schéma, projet Apps Script, déploiement, courriel ou dépôt Git n'a été modifié à distance. Le jeton temporaire a été supprimé après les lectures.
