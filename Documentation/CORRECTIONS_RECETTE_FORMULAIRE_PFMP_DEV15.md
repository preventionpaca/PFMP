# Correctif d’affichage des dates — dev.15

Le motif de différence est désormais complètement absent de l’affichage avec « Dates officielles ». Une règle `[hidden]{display:none!important}` empêche les styles de grille appliqués aux labels de rendre visible un élément portant l’attribut `hidden`.

Les dates proposées sont affichées en français (`jj/mm/aaaa`) dans le choix de période et le bandeau des dates officielles. Les valeurs internes des champs `date` et celles envoyées au serveur restent au format ISO normalisé `aaaa-mm-jj`.

Les garde-fous restent inchangés : `DOMAIN`, `DRY_RUN`, courriels `DISABLED`, Turnstile non activé et copie Grist `j1jDArBkzi7P` exclusivement.

Résultat : **123 tests réussis**. Version Apps Script immuable **14**, déploiement existant mis à jour sur `@14` sans changement d’URL.
