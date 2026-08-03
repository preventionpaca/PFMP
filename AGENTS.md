# Contexte permanent — Eucalyptus PFMP

Eucalyptus PFMP facilite le suivi opérationnel des conventions et la relation entreprise. Pronote reste le progiciel officiel ; l’application ne le remplace pas.

Architecture : sources GitHub dans ce dépôt, Web App Google Apps Script unique, données Grist. La recette utilise exclusivement `j1jDArBkzi7P` ; ne jamais accéder à la production `3pnVrygfNn7c` sans autorisation explicite.

Avant d’agir, lire `Documentation/ETAT_PROJET.md`, `Documentation/DECISIONS_METIER.md` et `Documentation/PLAN_PROCHAIN_LOT.md`. Faire normalement un audit différentiel, pas un nouvel audit complet.

Tests : `node tests/run-tests.js`. Pendant un lot, privilégier les tests ciblés puis une seule suite complète finale. Ne jamais affaiblir un test.

Git : préserver les changements extérieurs, contrôler secrets et données nominatives, utiliser un commit explicite, pousser seulement après tests verts. Ne jamais réécrire l’historique ni déplacer un tag publié.

Version et déploiement : ne jamais diminuer la version ; créer une version Apps Script immuable ; mettre à jour uniquement le Web App existant ; conserver son URL, `DOMAIN` et `USER_DEPLOYING`. Relire et comparer le distant après `clasp push`.

Interdictions permanentes sans autorisation explicite : production Grist, import Pronote réel, écriture élève ou convention, suppression physique, personnel inventé, courriel, ordre de mission, activation LIVE/ENABLED, nouveau Web App, secret ou donnée personnelle dans Git ou les journaux.

Secrets : utiliser uniquement des fichiers temporaires privés sous `/tmp`, ne jamais afficher leur valeur et les supprimer après usage. Les exports nominatifs restent hors Git.

Fin de tâche : tests verts, diff relu, protections confirmées, Git et distant cohérents, documentation d’état mise à jour. S’arrêter seulement pour un droit/secret manquant, une décision métier structurante, une action destructive, un risque personnel, une divergence inexpliquée ou un test important durablement en échec.
