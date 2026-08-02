# Rapport — statuts du calendrier PFMP dev.26

Date : 2 août 2026

## Périmètre

- copie Grist exclusivement : `j1jDArBkzi7P` ;
- production non consultée ;
- aucune création de période, modification d’élève, soumission ou courriel ;
- interface conservée en lecture seule, DRY_RUN, courriels DISABLED et Turnstile désactivé.

## Écriture Grist ciblée

Deux colonnes Text ont été ajoutées à `EUC_OFFRES_FORMATION` :

- `Statut_calendrier_PFMP` ;
- `Motif_statut_calendrier`.

Les 38 offres autorisées ont été classées de manière idempotente :

- 33 `PERIODES_DEFINIES` ;
- 5 `AUCUNE_PERIODE_PREVUE` ;
- 0 `A_VERIFIER`.

Les cinq offres sans période prévue sont `1MP3D`, `2BTS CPI`, `2BTS CPRP`, `2BTS ELEC` et `2BTS CIEL`. Leur motif est : « Aucune période officielle prévue dans le calendrier 2026-2027 — décision métier validée le 02/08/2026. »

Cette valeur provient exclusivement de la décision métier. Le script ne déduit jamais `AUCUNE_PERIODE_PREVUE` de la seule absence d’une relation.

## Première année BTS ELEC et CIEL

Avant toute écriture de relation, les liens existants ont été contrôlés :

| Offre | ID Grist de la ligne source | Code/numéro métier | Formation | Niveau | Type | Dates |
|---|---:|---|---|---|---|---|
| `1BTS ELEC` | 274 | non renseigné | `1BTS` | `ELEC` | `Stage BTS` | 24/05/2027 au 02/07/2027 |
| `1BTS CIEL` | 271 | non renseigné | `1BTS` | `CIEL` | `Stage BTS` | 24/05/2027 au 02/07/2027 |

Les deux lignes techniques sont propres à leur spécialité mais représentent le même intervalle officiel. Chaque offre est déjà reliée à sa ligne correcte. Aucune relation n’a été recréée ou croisée, afin d’éviter deux boutons identiques et tout doublon. Rien n’a été propagé vers `2BTS ELEC` ou `2BTS CIEL`.

Les nombres 271 et 274 sont uniquement des **ID Grist internes**. Ils ne sont pas des numéros métier du calendrier et ne sont jamais affichés à l’utilisateur.

## Interface dev.26

Trois états sont distingués :

- périodes définies : boutons et dates normales ;
- absence validée : « Aucune période de stage prévue en 2026-2027. » puis « Cette situation correspond au calendrier officiel enregistré. » ;
- situation à contrôler : « Les périodes de cette classe restent à vérifier. »

L’absence validée utilise un bloc neutre, ne crée aucune période fictive, ne permet aucun chargement nominatif et n’augmente pas les anomalies. Seul `A_VERIFIER` ajoute une anomalie calendaire.

Les périodes `ENT.`, `ENT` et `ALTERNANCE` sont exclues par la requête serveur. La navigation reste catégorie, spécialité, classe, période, puis tableau limité à 50 élèves. Aucun élève n’est chargé avant le choix d’une période.

## Tests et déploiement

La suite complète a réussi avec **282 tests**. Les 35 fichiers distants ont ensuite été relus et comparés au contenu local ; ils sont identiques après la normalisation habituelle des extensions `.gs` en `.js` par CLASP.

- version Apps Script immuable : **25** ;
- description : `Eucalyptus PFMP v1.0.0-dev.26 - statuts calendaires explicites` ;
- déploiement existant mis à jour : `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg` ;
- aucune nouvelle Web App créée ;
- URL conservée ;
- aucune propriété Apps Script modifiée.
