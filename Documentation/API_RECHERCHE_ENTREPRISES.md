# API Recherche d'entreprises — analyse au 31 juillet 2026

Documentation officielle : <https://recherche-entreprises.api.gouv.fr/docs/>.

- Endpoint : `GET https://recherche-entreprises.api.gouv.fr/search`.
- Paramètre direct : `q=<SIRET>` ; exactement 14 chiffres déclenchent la recherche directe et rendent les autres filtres sans effet.
- Réponse : objet contenant `results`; l'unité légale expose notamment `siren`, noms, nature juridique, statut de diffusion, activité et `matching_etablissements`; chaque établissement contient notamment `siret`, état administratif, siège, adresse, activité et statut de diffusion.
- Limites publiées : 7 requêtes/s/adresse IP et 30 requêtes/s/ASN, non garanties. HTTP 429 fournit `Retry-After`. Un `User-Agent` explicite est recommandé.
- Les entreprises non diffusibles ne sont pas accessibles. Une diffusion partielle peut produire des champs absents : l'interface doit accepter une fiche incomplète et ne jamais inventer téléphone ou courriel.
- Un établissement fermé reste représentable par `etat_administratif` différent de `A` et éventuellement `date_fermeture`.

Le mapping sélectionne dans `matching_etablissements`, puis dans `siege`, le SIRET exact. Les champs absents deviennent des chaînes vides. Le libellé d'activité n'étant pas garanti dans la réponse décrite, il reste modifiable et vide en v1.

## Compatibilité Google Apps Script

Le 31 juillet 2026, le même endpoint et le même SIRET ont répondu immédiatement en HTTP `200` depuis le navigateur et depuis un client local, mais systématiquement en HTTP `502` depuis `UrlFetchApp`, y compris sans `User-Agent` personnalisé. Le correctif local appelle donc l'API publique depuis le navigateur après un contrôle préalable dans Grist côté Apps Script. La réponse publique est renvoyée à Apps Script pour validation et mapping avant remplissage du formulaire. Grist et sa clé restent exclusivement côté serveur.
