# Comparaison finale avant push vers le projet unique

Date : 31 juillet 2026. Cible vérifiée : `1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c`, avec `rootDir: apps-script`.

Mise à jour `v1.0.0-dev.6` : la version immuable de sauvegarde `2` a été créée avant intégration. Le manifeste local limite désormais la Web App au domaine (`DOMAIN`, `USER_DEPLOYING`).

## Synthèse

| Élément | Distant actuel | Local proposé |
|---|---:|---:|
| Fichiers Apps Script | 14 | 23 |
| Fonctions globales | 424 | 443 |
| Points d'entrée globaux | 3 | 3 |
| `doGet` | 1 | 1 |
| `onOpen` | 1 | 1 |
| `onEdit` | 1 | 1 |
| `doPost` | 0 | 0 |

Aucun des 14 fichiers distants n'est absent de la version locale.

## Différences exactes

Trois fichiers changent uniquement pour retirer la même clé Grist codée en dur et la lire depuis `EUC_ENT_GRIST_API_KEY` :

- `Code.js` ;
- `EDT_Config.js` ;
- `EDT_Install_Reset_V21.js`.

Un seul fichier historique reçoit une modification fonctionnelle :

- `EDT.js` conserve l'unique `doGet(e)`, ajoute la branche `?page=entreprises`, puis délègue sans autre changement la route historique à `EDT_afficherWebAppExistante_(e)`.

Neuf fichiers sont ajoutés :

- `EUC_ENT_ApiEntreprise.gs`
- `EUC_ENT_Config.gs`
- `EUC_ENT_Grist.gs`
- `EUC_ENT_InstallationGrist.gs`
- `EUC_ENT_Validation.gs`
- `EUC_ENT_WebApp.gs`
- `Index.html`
- `Scripts.html`
- `Styles.html`

Les dix autres fichiers historiques et le manifeste sont sémantiquement inchangés. Les 31 noms de fonctions historiques dupliqués restent conservés.

## Isolation Grist dans le projet unique

- les modules historiques gardent le Doc ID de production `3pnVrygfNn7c` ;
- le module `EUC_ENT_` lit `EUC_ENT_GRIST_DOC_ID`, actuellement configuré pour la copie `j1jDArBkzi7P` ;
- aucune table `EUC_RELATIONS_ENTREPRISES` n'est créée ;
- aucune écriture Grist n'est effectuée par le push lui-même.

La clé `EUC_ENT_GRIST_API_KEY` doit être une véritable clé fonctionnelle. Si la valeur visible dans la capture (`clé donnant accès à la copie Grist`) a été saisie littéralement et n'est pas un masquage, le push ne doit pas être lancé avant son remplacement.

## Effet du push

CLASP remplacera le contenu HEAD complet du projet existant par ces 23 fichiers. Les versions déjà déployées restent immuables, mais les exécutions directes et déclencheurs simples utiliseront le nouveau HEAD. Aucun déploiement, aucune version et aucun commit Git ne sont inclus automatiquement dans cette opération.

## Validation locale

- syntaxe serveur : valide ;
- 31 tests simulés : réussis après ajout du contournement navigateur pour l'API publique ;
- aucun secret littéral dans `apps-script/` ;
- un seul routeur `doGet` ;
- aucune collision `EUC_ENT_` ;
- schéma Grist de recette vérifié en lecture seule ;
- `git diff --check` réussi.

## Commande d'intégration autorisée

```bash
clasp push --force
```

Cette commande utilise exclusivement `.clasp.json`. Elle ne doit être exécutée qu'après contrôle de la cible, de la liste des 23 fichiers, de l'absence de secret et du Doc ID de recette du module Entreprises.
