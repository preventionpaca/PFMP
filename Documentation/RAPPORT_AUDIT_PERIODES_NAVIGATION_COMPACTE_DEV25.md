# Rapport — audit des périodes et navigation compacte dev.25

Date : 2 août 2026  
Version locale : **Eucalyptus PFMP — v1.0.0-dev.25**  
Périmètre Grist : copie `j1jDArBkzi7P`, lecture seule.

## Résultat de l’audit Grist

Sept tables ont été lues sans écriture : `Planning_Periodes` (368 lignes), `Classes` (38), `EUC_DIPLOMES` (14), `EUC_OFFRES_FORMATION` (38), `EUC_OFFRES_PERIODES` (51), `EUC_SYNTHESE_SUIVI_PFMP` (89) et `Annees_Scolaires` (4).

Le référentiel comporte exactement 38 offres visibles. Pour 2026-2027, 51 relations actives et certaines sont déjà enregistrées. Toutes les offres possèdent au moins une période reliée sauf les cinq classes suivantes.

| Classe | Offre | Classe historique | Diplôme | Classement | Candidats / constat |
|---|---:|---:|---:|---|---|
| `1MP3D` | 5 | 7 | 5 | Correspondance probable à valider | Périodes 29 et 37, libellées `1 BAC PRO`, niveau `MP3`, type `PFMP 1ère`, du 23/11 au 18/12/2026 et du 22/03 au 16/04/2027. L’écart `MP3`/`MP3D` interdit une relation automatique. |
| `2BTS CPI` | 30 | — | 10 | Correspondance probable à valider | Périodes partagées 339 à 343, libellées `2BTS CPI-CPRP`, niveau `Mixité`, type `ENT.`. Leur nature PFMP doit être confirmée. |
| `2BTS CPRP` | 32 | — | 11 | Correspondance probable à valider | Même ensemble 339 à 343. Une décision métier doit confirmer que les cinq périodes concernent les deux formations. |
| `2BTS ELEC` | 36 | 40 | 13 | Période absente | Aucune période explicite de deuxième année. La période 274 concerne `1BTS ELEC` et ne doit pas être réutilisée. |
| `2BTS CIEL` | 38 | — | 14 | Période absente | Aucune période explicite de deuxième année. La période 271 concerne `1BTS CIEL` et ne doit pas être réutilisée. |

Les périodes 344 à 346 sont des examens et les périodes 347 à 348 des visites : elles sont classées **périodes non PFMP**. Les périodes MP3D 7, 13, 20 et 65 concernent la terminale ou un autre type ; la période 140 concerne la seconde. Elles ne sont pas candidates pour `1MP3D`.

## Relations proposées

Relation strictement certaine pouvant être créée immédiatement : **aucune**.

Sous réserve d’une validation métier, les propositions sont :

- offre 5 vers périodes 29 et 37 ;
- offres 30 et 32 vers chacune des périodes 339, 340, 341, 342 et 343.

Aucune de ces relations n’a été écrite. Aucune période n’est proposée pour les offres 36 et 38 tant qu’une source explicite de deuxième année n’est pas fournie.

## Décisions métier rendues

1. Les références 29 et 37 visibles par Rudy ne concernent pas `1MP3D` : 29 correspond à `TMP3D` et 37 à `1BTS CPI`. Les identifiants internes Grist ne doivent pas être confondus avec la numérotation métier du calendrier.
2. Les identifiants Grist 339–343 ne correspondent pas à des périodes métier reconnues par Rudy ; aucune relation ne doit être créée vers `2BTS CPI` ou `2BTS CPRP`.
3. Aucune période 2026-2027 n’existe pour `2BTS ELEC`, `2BTS CIEL`, `2BTS CPI` ou `2BTS CPRP`. Parmi ces BTS de deuxième année, seul `2BTS MV` possède une période.
4. `1BTS ELEC` et `1BTS CIEL` utilisent les mêmes périodes.

## Interface locale

La page `?page=suivi-pfmp` est réorganisée en quatre niveaux progressifs : catégorie dynamique issue du diplôme (`CAP`, `Bac professionnel`, `BTS`), spécialité dynamique, classe compacte, puis période dans un panneau adjacent. Aucun code de classe, diplôme ou période n’est inscrit en dur dans l’interface.

Toute la tuile de classe est actionnable à la souris, au clavier et au toucher. Le nombre de périodes reste informatif. Les boutons de période restent explicites, y compris lorsqu’il n’existe qu’une seule période. Une classe sans relation affiche un message visible et ne déclenche aucun chargement nominatif.

Le chargement des élèves reste exclusivement déclenché par le choix d’une période, filtré côté serveur par année, classe et période, avec une limite de 50 lignes. Le retour aux classes conserve les filtres. Les métadonnées et synthèses seules peuvent être mises en cache ; aucune liste nominative n’entre dans un cache partagé.

## Contrôles et restrictions

- 38 classes autorisées exactement, sans `1CAPP` ni `TMELEC G` ;
- aucune donnée nominative dans le fichier d’audit ;
- aucune écriture Grist ;
- aucun `clasp push`, aucune version Apps Script et aucun déploiement ;
- aucun commit ni push Git ;
- DRY_RUN, courriels désactivés et copie Grist inchangés.

Le résultat machine anonymisé est conservé dans `proposals/audit-periodes-non-reliees-dev25.json`.

## Prochaine étape proposée

Corriger d’abord la proposition locale pour représenter les cinq classes sans période et vérifier la période commune de `1BTS ELEC` et `1BTS CIEL`. Toute éventuelle écriture Grist devra faire l’objet d’une nouvelle autorisation explicite.
