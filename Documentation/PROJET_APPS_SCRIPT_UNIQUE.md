# Projet Apps Script unique

Décision corrigée le 31 juillet 2026 : le lycée conserve un seul projet Apps Script, **Planning PFMP et autres dates EK**, ID `1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c`.

La recette repose sur une copie Grist, pas sur un second projet Apps Script :

- fonctions historiques : document Grist de production `3pnVrygfNn7c` ;
- module `EUC_ENT_` pendant la recette : copie Grist `j1jDArBkzi7P`, lue depuis `EUC_ENT_GRIST_DOC_ID` ;
- aucune table Relations ;
- aucun enregistrement de recette sans marqueur `TEST RECETTE` et autorisation séparée.

Le second projet Apps Script créé par erreur avait pour ID `1UfPRHxRUa9sDTmD-o1CIqaZ8SHMKgICbx_RzPov-VScYTy3WjIituNvi`. Il est abandonné : son déploiement Web App versionné a été supprimé, seul `@HEAD` subsiste, aucun fichier local ne le cible et aucune nouvelle modification ne doit lui être envoyée. Il n'est pas supprimé ; une éventuelle mise à la corbeille pourra être décidée manuellement plus tard.

## Garde-fou avant push

Le premier `clasp push` vers le projet unique remplace le contenu HEAD complet. La version immuable `2`, créée avant intégration, conserve les 14 fichiers historiques et sert de point de retour arrière. Les déclencheurs simples et les exécutions depuis l'éditeur utilisent néanmoins le nouveau HEAD ; une comparaison distante/locale et le contrôle du Doc ID Grist de recette restent obligatoires immédiatement avant chaque push.
