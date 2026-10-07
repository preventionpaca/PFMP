# Propriétés de recette du projet Apps Script bleu

Ces valeurs sont configurées dans le projet **Eucalyptus PFMP — Développement BLEU**, ID `1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo`.

| Propriété | Valeur de recette | Sensible |
|---|---|---:|
| `EUC_ENT_ENVIRONMENT` | `recette` | non |
| `EUC_ENT_ALLOWED_DOMAIN` | `lycee-les-eucalyptus.org` | non |
| `EUC_ENT_GRIST_API_URL` | `https://camin.getgrist.com` | non |
| `EUC_ENT_GRIST_DOC_ID` | `kB8bvDag8x7D` | non |
| `EUC_ENT_GRIST_API_KEY` | clé donnant accès uniquement à la copie de recette | **oui** |
| `EUC_ENT_TABLE_ENTREPRISES` | `EUC_ENTREPRISES` | non |
| `EUC_ENT_TABLE_CONTACTS` | `EUC_CONTACTS_ENTREPRISES` | non |
| `EUC_ENT_API_RECHERCHE_URL` | `https://recherche-entreprises.api.gouv.fr/search` | non |

Ne pas ajouter `EUC_ENT_TABLE_RELATIONS`. `EUC_ENT_GRIST_DOC_ID` désigne uniquement la copie Grist de recette. Les modules historiques conservent explicitement le Doc ID Grist de production.

La clé est celle d'un compte de service Grist dédié, limité en lecture à la copie de recette. Les fonctions historiques conservent leur propre configuration et ne doivent pas être redirigées vers cette copie. Aucune valeur sensible n'est consignée dans Git.

Après saisie, exécuter depuis l'éditeur `EUC_ENT_controlerConfiguration`. Le résultat attendu est `valide: true`, avec chaque propriété marquée `présente`; aucune valeur ni clé n'est renvoyée par le diagnostic.

## État actuel

Le 7 octobre 2026, le compte de service a été vérifié directement : accès `200` sur `kB8bvDag8x7D` et refus `403` sur le document officiel fourni par l'utilisateur. La garde applicative vérifie séparément l'environnement, l'hôte Camin et le Doc ID autorisé. Aucun secret n'est présent dans le dépôt ou dans la configuration CLASP.
