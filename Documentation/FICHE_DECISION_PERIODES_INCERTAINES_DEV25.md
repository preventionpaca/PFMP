# Fiche de décision métier — cinq classes sans période certaine

Date : 2 août 2026  
Source : copie Grist `j1jDArBkzi7P`, audit strictement en lecture seule.  
Statut : **décisions métier rendues par Rudy**. Aucune période ni relation n’a été créée.

> Important : les nombres 29, 37 et 339–343 issus de l’audit sont des identifiants techniques de lignes Grist. Ils ne correspondent pas aux numéros métier visibles dans le calendrier de Rudy, dont la numérotation s’arrête à 45. Ils ne doivent pas servir à attribuer une période.

## Tableau de décision

| Classe | Période candidate | Dates | Nature probable | Problème | Décision demandée à Rudy |
|---|---|---|---|---|---|
| `1MP3D` | Aucune | — | Période absente | L’identifiant technique Grist 29 correspond métier à `TMP3D`, et le 37 à `1BTS CPI`, pas à `1MP3D`. | Décision rendue : ne relier ni 29 ni 37 à `1MP3D`. |
| `2BTS CPI` | Aucune | — | Période absente | Les identifiants techniques 339–343 ne sont pas des périodes métier reconnues ; le calendrier visible s’arrête à 45. | Décision rendue : ne relier aucune de ces lignes. |
| `2BTS CPRP` | Aucune | — | Période absente | Même constat que pour CPI. | Décision rendue : ne relier aucune de ces lignes. |
| `2BTS ELEC` | Aucune | — | Période absente confirmée | Aucune période officielle en deuxième année. | Aucune création ni relation. |
| `2BTS CIEL` | Aucune | — | Période absente confirmée | Aucune période officielle en deuxième année. | Aucune création ni relation. |

Décision transversale : parmi les BTS de deuxième année cités, seul `2BTS MV` possède une période. `2BTS ELEC`, `2BTS CIEL`, `2BTS CPI` et `2BTS CPRP` n’en possèdent pas. Les périodes de `1BTS ELEC` et `1BTS CIEL` sont communes.

## 1MP3D — détail des deux lignes

| ID | Année | Formation | Niveau | Libellé | Code | Type | Début | Fin | Autres classes ou offres reliées |
|---:|---|---|---|---|---|---|---|---|---|
| 29 | 2026-2027 | `1 BAC PRO` | `MP3` | vide | vide | `PFMP 1ère` | 23/11/2026 | 18/12/2026 | Aucune |
| 37 | 2026-2027 | `1 BAC PRO` | `MP3` | vide | vide | `PFMP 1ère` | 22/03/2027 | 16/04/2027 | Aucune |

Dans `Planning_Periodes`, le champ historique `Offre_formation` vaut zéro pour les deux lignes. Aucune relation active dans `EUC_OFFRES_PERIODES` ne les rattache à une autre offre.

La ressemblance technique avait produit une candidature automatique, mais Rudy l’a invalidée : dans la numérotation métier, 29 correspond à `TMP3D` et 37 à `1BTS CPI`. La décision définitive est donc de ne relier aucune de ces lignes à `1MP3D`.

## 2BTS CPI et 2BTS CPRP — détail des blocs d’entreprise

| ID | Formation | Niveau | Libellé | Code | Dates | Type | Indication métier | Autres classes ou offres reliées |
|---:|---|---|---|---|---|---|---|---|
| 339 | `2BTS CPI-CPRP` | `Mixité` | vide | vide | 12/10/2026 au 13/11/2026 | `ENT.` | Entreprise, origine « CAL hebdo » | Aucune |
| 340 | `2BTS CPI-CPRP` | `Mixité` | vide | vide | 07/12/2026 au 01/01/2027 | `ENT.` | Entreprise, origine « CAL hebdo » | Aucune |
| 341 | `2BTS CPI-CPRP` | `Mixité` | vide | vide | 08/02/2027 au 12/03/2027 | `ENT.` | Entreprise, origine « CAL hebdo » | Aucune |
| 342 | `2BTS CPI-CPRP` | `Mixité` | vide | vide | 05/04/2027 au 14/05/2027 | `ENT.` | Entreprise, origine « CAL hebdo » | Aucune |
| 343 | `2BTS CPI-CPRP` | `Mixité` | vide | vide | 07/06/2027 au 03/09/2027 | `ENT.` | Entreprise, origine « CAL hebdo » | Aucune |

Le champ historique `Offre_formation` vaut zéro et aucune relation active ne les rattache à une offre. Les lignes 344–346 sont explicitement des examens et les lignes 347–348 des visites ; elles ne sont donc pas des périodes candidates.

### Analyse séparée — 2BTS CPI

La mention commune `2BTS CPI-CPRP` montre que CPI est concerné par le calendrier, mais ne prouve pas que ces blocs doivent alimenter un formulaire de convention PFMP scolaire. Les cinq intervalles couvrent des séquences récurrentes d’entreprise réparties sur l’année. Associés à `Mixité`, au type abrégé `ENT.` et à l’origine « CAL hebdo », ils correspondent plus vraisemblablement à plusieurs regroupements de semaines d’entreprise d’un rythme d’alternance. Aucun champ ne contient `PFMP` ou `Stage BTS`.

Décision métier : **ne pas les afficher dans le formulaire PFMP**. Rudy confirme qu’aucune période n’est identifiée pour `2BTS CPI` ; les identifiants Grist 339–343 ne sont pas des numéros de période de son calendrier.

### Analyse séparée — 2BTS CPRP

Le constat est identique pour CPRP. La source ne sépare pas les deux spécialités et ne distingue pas les publics scolaires et apprentis. On ne peut donc ni transformer `ENT.` en PFMP, ni attribuer automatiquement les cinq blocs à l’offre `2BTS CPRP`.

Décision métier : **ne pas les afficher dans le formulaire PFMP**. Rudy confirme qu’aucune période n’est identifiée pour `2BTS CPRP`. La question d’un calendrier commun CPI/CPRP devient sans objet.

## 2BTS ELEC et 2BTS CIEL — recherche des variantes

### 2BTS ELEC

Aucune ligne 2026-2027 de `Planning_Periodes` ne porte la combinaison deuxième année + ELEC. La seule variante BTS/ELEC trouvée est la ligne 274 : `Formation=1BTS`, `Niveau=ELEC`, `Type=Stage BTS`, du 24/05/2027 au 02/07/2027. Elle est déjà reliée à l’offre `1BTS ELEC` et ne doit pas être copiée pour la deuxième année.

La table historique `Classes` contient `2BTS ELEC Alt`, mais cette variante ne justifie aucune période. Rudy confirme qu’il n’existe pas de période officielle pour `2BTS ELEC`. Aucune information complémentaire n’est donc attendue et aucune période ne doit être créée.

### 2BTS CIEL

Aucune ligne 2026-2027 ne porte la combinaison deuxième année + CIEL. La seule variante BTS/CIEL est la ligne 271 : `Formation=1BTS`, `Niveau=CIEL`, `Type=Stage BTS`, du 24/05/2027 au 02/07/2027. Elle est déjà reliée à `1BTS CIEL` et ne doit pas être réutilisée.

Aucune ligne historique de classe `2BTS CIEL` n’est disponible. Rudy confirme qu’il n’existe pas de période officielle pour `2BTS CIEL`. Aucune information complémentaire n’est donc attendue et aucune période ne doit être créée. La période commune signalée concerne uniquement les premières années `1BTS ELEC` et `1BTS CIEL`.

## Réponses métier enregistrées

1. **D1 — Non.** La ligne métier 29 concerne `TMP3D` et la 37 `1BTS CPI`.
2. **D2 — Aucune période identifiée pour `2BTS CPI`.** Ne pas utiliser les identifiants Grist 339–343.
3. **D3 — Aucune période identifiée pour `2BTS CPRP`.**
4. **D4 — Sans objet.** Il n’existe pas de périodes CPI/CPRP à déclarer communes.
5. **D5 — Aucune période officielle pour `2BTS ELEC`.**
6. **D6 — Aucune période officielle pour `2BTS CIEL`.**
7. **D7 — Sans objet pour les deuxièmes années.** En première année, `1BTS ELEC` et `1BTS CIEL` utilisent les mêmes périodes.
