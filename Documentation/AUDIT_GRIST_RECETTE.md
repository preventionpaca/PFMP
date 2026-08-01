# Audit du document Grist de recette

Document annoncé : `RECETTE — PFMP EDT ENTREPRISES`.

- Doc ID recette : `j1jDArBkzi7P` ;
- Doc ID production : `3pnVrygfNn7c` ;
- contrôle : les deux identifiants sont différents ;
- URL recette : `https://docs.getgrist.com/j1jDArBkzi7P/RECETTE-PFMP-EDT-ENTREPRISES`.

## Résultat de l'audit authentifié du 31 juillet 2026

L'audit a utilisé uniquement des requêtes `GET` authentifiées vers `j1jDArBkzi7P`. Aucun enregistrement métier n'a été lu et aucune route d'écriture n'a été appelée.

Résultats :

1. 40 tables au total : les 38 tables historiques et les deux tables EUC ;
2. `EUC_ENTREPRISES` : exactement 29 colonnes ;
3. `EUC_CONTACTS_ENTREPRISES` : exactement 13 colonnes ;
4. `EUC_CONTACTS_ENTREPRISES.Entreprise` : type `Ref:EUC_ENTREPRISES` ;
5. `EUC_RELATIONS_ENTREPRISES` : absente.

Le schéma de recette est donc conforme. Aucun enregistrement n'a été créé. Les futurs tests d'écriture devront contenir un marqueur explicite `TEST RECETTE` et attendre une autorisation séparée.

Un nouveau contrôle anonyme en lecture seule a été tenté le 31 juillet 2026 sur la route des tables. Grist a répondu `403`, ce qui confirme que le schéma n'est plus publiquement lisible. Sans réutiliser ni extraire la clé stockée dans Apps Script, le présent contrôle ne peut donc pas remplacer l'audit `GET` authentifié ci-dessus. Aucune route d'écriture et aucune route d'enregistrements métier n'ont été appelées.

## Isolation Apps Script

Les quatre clients/configurations Grist du code de recette utilisent désormais la propriété commune `EUC_ENT_GRIST_DOC_ID`. Le Doc ID de production a été retiré du code local de recette. Tant que les propriétés ne sont pas saisies, l'accès Grist échoue sans effectuer d'écriture.

## Diagnostic des propriétés Apps Script

Le diagnostic a été exécuté manuellement depuis l'éditeur Apps Script le 31 juillet 2026. Résultat : `valide: true`, version `v1.0.0-dev.6`, et les huit propriétés marquées `présente`. Aucune valeur de propriété ni aucun secret n'a été affiché. Aucun exécutable API ou nouveau déploiement n'a été créé.
