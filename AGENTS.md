# Contexte permanent — Eucalyptus PFMP

Eucalyptus PFMP facilite le suivi opérationnel des conventions et la relation entreprise. Pronote reste le progiciel officiel ; l’application ne le remplace pas.

Architecture : sources GitHub dans ce dépôt, projet Google Apps Script bleu de développement, projet Google Apps Script vert stable avec ses deux Web Apps existantes, données Grist. Le bleu utilise exclusivement la recette Camin `kB8bvDag8x7D` ; ne jamais accéder à la production `3pnVrygfNn7c` sans autorisation explicite.

## Workflow obligatoire bleu → vert

- Toute évolution applicative commence sur une branche Git et est publiée d’abord, et uniquement, sur le projet Apps Script bleu avec `scripts/pfmp-release.sh prepare`.
- Ne jamais modifier directement le vert pour développer ou tester. La promotion vers le vert exige l’autorisation explicite de l’utilisateur et passe uniquement par `scripts/pfmp-release.sh promote` avec le candidat bleu exact.
- Avant de remettre un site modifié, contrôler les 25 routes du bleu, puis parcourir dans le navigateur tous les liens et boutons de navigation internes visibles sur l’ensemble de ces routes, pas seulement sur les pages modifiées. Aucun lien ne doit conduire à une erreur Apps Script, une page blanche, une demande de connexion inattendue ou au mauvais canal.
- Après une promotion autorisée, contrôler les 25 routes vertes. Toute route en échec impose le retour automatique à la version immuable précédente.
- Sur le vert, tout lien ou bouton libellé `Accueil PFMP` vise exactement `https://alternance.loucodi.fr/`. Sur le bleu, la réécriture de canal doit conserver la navigation sur le même `/dev`.
- Tout bouton qui lance une opération asynchrone dans le candidat livré doit immédiatement être désactivé contre le double clic et afficher un indicateur de chargement visible (spinner et libellé d’action), puis retrouver son état initial en succès, erreur et dépassement de délai. Vérifier ce contrat par tests ou simulations sûres lorsque l’action réelle est interdite. Les simples liens de navigation ne sont pas concernés par le spinner.
- Pour toute page modifiée, vérifier aussi les états vide, chargement, succès et erreur, sans supprimer un comportement qui fonctionnait auparavant.
- Si une vérification réelle est impossible parce que la recette est vide ou qu’une action dangereuse est désactivée, l’indiquer explicitement : ne jamais présenter ce parcours comme garanti de bout en bout.

La définition détaillée de fini est dans `Documentation/CONTRAT_QUALITE_UI.md`. Le workflow de publication est dans `Documentation/RELEASE_BLEU_VERT.md`.

Avant d’agir, lire `Documentation/ETAT_PROJET.md`, `Documentation/DECISIONS_METIER.md` et `Documentation/PLAN_PROCHAIN_LOT.md`. Faire normalement un audit différentiel, pas un nouvel audit complet.

Tests : `node tests/run-tests.js`. Pendant un lot, privilégier les tests ciblés puis une seule suite complète finale. Ne jamais affaiblir un test.

Git : préserver les changements extérieurs, contrôler secrets et données nominatives, utiliser un commit explicite, pousser seulement après tests verts. Ne jamais réécrire l’historique ni déplacer un tag publié.

Version et déploiement : ne jamais diminuer la version ; créer une version Apps Script immuable ; mettre à jour uniquement les deux Web Apps vertes existantes ; conserver leurs URL, `DOMAIN` et `USER_DEPLOYING`. Relire et comparer le distant après `clasp push`.

Interdictions permanentes sans autorisation explicite : production Grist, import Pronote réel, écriture élève ou convention, suppression physique, personnel inventé, courriel, ordre de mission, activation LIVE/ENABLED, nouveau Web App, secret ou donnée personnelle dans Git ou les journaux.

Secrets : utiliser uniquement des fichiers temporaires privés sous `/tmp`, ne jamais afficher leur valeur et les supprimer après usage. Les exports nominatifs restent hors Git.

Fin de tâche : tests verts, diff relu, protections confirmées, Git et distant cohérents, documentation d’état mise à jour. S’arrêter seulement pour un droit/secret manquant, une décision métier structurante, une action destructive, un risque personnel, une divergence inexpliquée ou un test important durablement en échec.
