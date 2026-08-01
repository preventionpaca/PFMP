# Correction du code postal Monaco — dev.17

Le fallback est appliqué dans `EUC_ENT_appliquerCodePostalMonaco_`, appelée par `EUC_ENT_normaliserAdresse_` après l’extraction et le nettoyage existants. La fonction clone l’objet normalisé et ne complète que `codePostal` lorsqu’il est vide.

Monaco est reconnu par un pays normalisé égal à `Monaco`, ou par un code pays explicite `MC`/`MCO`. Les graphies de ville `Monaco`, `Monte-Carlo` et `Monte Carlo` sont couvertes lorsque le pays est Monaco. La présence de « Monaco » dans une voie ou une raison sociale ne suffit jamais.

Un code postal structuré ou déjà extrait reste prioritaire et n’est jamais remplacé. En son absence, le code métier `98000` est appliqué. SAM SACOME et SIAMP CEDAP obtiennent ainsi `98000`; les établissements de Monte-Carlo conservent leur graphie de ville et obtiennent également `98000`.

Les tests couvrent Beausoleil, Cap-d’Ail, Roquebrune-Cap-Martin, Menton, une rue de Monaco en France et une raison sociale française contenant Monaco. Le cas BMW/Mougins demeure inchangé.

La suite complète totalise **138 tests réussis**, notamment le rendu Chromium, BMW/Mougins et les communes limitrophes. La relecture de HEAD après synchronisation confirme **29 fichiers distants identiques aux 29 fichiers locaux**.

La version Apps Script immuable créée est la **16**. Le déploiement existant `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg` cible désormais `@16`, sans changement d’URL. Les modes restent `DRY_RUN`, courriels `DISABLED`, Turnstile désactivé et copie Grist `j1jDArBkzi7P` exclusivement.
