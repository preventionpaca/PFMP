# Propriétés de recette du module Entreprises dans le projet Apps Script unique

Ces valeurs sont configurées dans le projet existant **Planning PFMP et autres dates EK**, ID `1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c`.

| Propriété | Valeur de recette | Sensible |
|---|---|---:|
| `EUC_ENT_ENVIRONMENT` | `recette` | non |
| `EUC_ENT_ALLOWED_DOMAIN` | `lycee-les-eucalyptus.org` | non |
| `EUC_ENT_GRIST_API_URL` | `https://docs.getgrist.com` | non |
| `EUC_ENT_GRIST_DOC_ID` | `j1jDArBkzi7P` | non |
| `EUC_ENT_GRIST_API_KEY` | clé donnant accès uniquement à la copie de recette | **oui** |
| `EUC_ENT_TABLE_ENTREPRISES` | `EUC_ENTREPRISES` | non |
| `EUC_ENT_TABLE_CONTACTS` | `EUC_CONTACTS_ENTREPRISES` | non |
| `EUC_ENT_API_RECHERCHE_URL` | `https://recherche-entreprises.api.gouv.fr/search` | non |

Ne pas ajouter `EUC_ENT_TABLE_RELATIONS`. `EUC_ENT_GRIST_DOC_ID` désigne uniquement la copie Grist de recette. Les modules historiques conservent explicitement le Doc ID Grist de production.

La clé doit être une véritable clé API Grist limitée à la copie de recette. Les fonctions historiques conservent leur propre configuration et ne doivent pas être redirigées vers cette copie. Aucune valeur sensible n'est consignée dans Git.

Après saisie, exécuter depuis l'éditeur `EUC_ENT_controlerConfiguration`. Le résultat attendu est `valide: true`, avec chaque propriété marquée `présente`; aucune valeur ni clé n'est renvoyée par le diagnostic.

## État actuel

Le diagnostic manuel du 31 juillet 2026 retourne `valide: true` et confirme les huit propriétés comme `présente`, sans afficher leurs valeurs. La garde applicative vérifiera séparément, lors d'un appel métier, que l'environnement vaut `recette` et que le Doc ID correspond à la copie autorisée. Aucun secret n'est présent dans le dépôt ou dans la configuration CLASP.
