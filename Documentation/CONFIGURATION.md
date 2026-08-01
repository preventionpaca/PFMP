# Configuration Apps Script

Dans Apps Script : **Paramètres du projet → Propriétés du script → Ajouter une propriété**. Ne jamais placer la clé dans Git.

| Propriété | Valeur attendue |
|---|---|
| `EUC_ENT_ENVIRONMENT` | `recette` — seule valeur autorisée par `v1.0.0-dev.8` |
| `EUC_ENT_ALLOWED_DOMAIN` | `lycee-les-eucalyptus.org` ; absence = accès refusé |
| `EUC_ENT_GRIST_API_URL` | `https://docs.getgrist.com` |
| `EUC_ENT_GRIST_DOC_ID` | `j1jDArBkzi7P` — copie Grist de recette imposée par `v1.0.0-dev.8` |
| `EUC_ENT_GRIST_API_KEY` | secret saisi manuellement |
| `EUC_ENT_TABLE_ENTREPRISES` | `EUC_ENTREPRISES` |
| `EUC_ENT_TABLE_CONTACTS` | `EUC_CONTACTS_ENTREPRISES` |
| `EUC_ENT_API_RECHERCHE_URL` | `https://recherche-entreprises.api.gouv.fr/search` |

`EUC_ENT_TABLE_RELATIONS` n'est pas utilisée en v1 : la table correspondante n'a volontairement pas été créée.

Exécuter manuellement `EUC_ENT_controlerConfiguration` pour obtenir uniquement « présente/absente » et l'état global. La valeur des propriétés n'est pas retournée.

| Propriété PFMP | Valeur attendue |
|---|---|
| `EUC_PFMP_SUBMISSION_MODE` | `DRY_RUN` en recette ; seule la valeur exacte `LIVE` autorisera une future écriture |
| `EUC_PFMP_EMAIL_MODE` | `DISABLED` en recette ; seule la valeur exacte `ENABLED` autorisera un futur envoi |
| `EUC_PFMP_NOTIFICATION_EMAIL` | adresse administrative destinataire, à configurer manuellement |
| `EUC_PFMP_SEND_STUDENT_CONFIRMATION` | `true` ou `false` |
| `EUC_PFMP_TURNSTILE_SITE_KEY` | clé publique Cloudflare Turnstile |
| `EUC_PFMP_TURNSTILE_SECRET_KEY` | secret Turnstile, jamais dans Git ou le HTML |
| `EUC_PFMP_TURNSTILE_EXPECTED_HOSTNAME` | nom d’hôte exact du futur déploiement |

La version `dev.8` refuse toute autre combinaison que `EUC_ENT_ENVIRONMENT=recette` et `EUC_ENT_GRIST_DOC_ID=j1jDArBkzi7P`. Le Doc ID principal `3pnVrygfNn7c` reste réservé aux modules historiques et ne doit jamais être affecté à `EUC_ENT_GRIST_DOC_ID` dans cette version.

Le fichier `.clasp.json` cible le script fourni et `apps-script/`. CLASP n'était pas installé lors du diagnostic. Aucun `clasp push` ne doit être effectué sans autorisation explicite.
