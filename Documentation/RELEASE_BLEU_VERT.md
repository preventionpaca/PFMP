# Publication PFMP — Git vers le vert

## Décision active depuis le 9 octobre 2026

Le canal applicatif actif est le **vert**. Les deux Web Apps vertes existantes
restent les seules applications publiées et conservent leurs URL, leurs droits
d'accès et leur exécution sous `USER_DEPLOYING`.

L'ancien projet Apps Script bleu et sa recette Grist sont des archives
techniques. Ils ne font plus partie du développement, de la recette ni de la
publication courante. Il est interdit de les publier, de les consulter ou de
les utiliser comme étape intermédiaire sans une nouvelle demande explicite de
l'utilisateur.

Le nom historique de ce fichier est conservé pour ne pas casser les liens de
documentation existants ; son contenu décrit uniquement le workflow actif
**Git → vert**.

## Publication directe et sûre

Une livraison suit obligatoirement cet ordre :

1. partir d'une branche et d'un commit Git explicites ;
2. relire le diff, contrôler secrets et données nominatives, puis lancer les
   tests ciblés et la suite complète ;
3. exécuter `scripts/pfmp-release.sh release-stable` ;
4. la commande clone le commit exact dans un répertoire temporaire propre,
   relance la suite complète et construit le paquet Apps Script ;
5. elle pousse ce paquet sur le projet vert, relit le distant et exige une
   empreinte identique avant de toucher aux Web Apps ;
6. elle crée une version Apps Script immuable et met à jour uniquement les deux
   déploiements verts existants ;
7. elle contrôle les 25 routes vertes. Une route expirée lors du démarrage à
   froid peut être rejouée une fois ; tout second échec remet automatiquement
   les deux Web Apps sur leurs versions immuables précédentes ;
8. le navigateur parcourt ensuite les routes et toutes les destinations de
   navigation internes visibles. Les parcours métier modifiés sont vérifiés en
   lecture ou par simulation sûre quand une écriture réelle est interdite.

Une route HTTP valide ne vaut pas validation métier. Le compte rendu sépare
toujours les tests automatisés, les routes, la navigation réelle et les
actions métier effectivement exécutées.

## Commandes actives

Depuis la racine du dépôt :

```bash
# État des deux déploiements verts existants
scripts/pfmp-release.sh status

# Publication du commit courant directement sur le vert
scripts/pfmp-release.sh release-stable

# Nouveau contrôle HTTP des 25 routes vertes
scripts/pfmp-release.sh check-stable

# Retour explicite des deux Web Apps vers une version immuable connue
scripts/pfmp-release.sh rollback VERSION
```

Les anciennes commandes `prepare`, `approve-development`,
`check-development` et `promote` ont été retirées du script pour empêcher une
publication accidentelle sur l'ancien canal.

Les identifiants non secrets des deux déploiements existants et la matrice des
25 routes sont dans `scripts/pfmp-release-config.json`. Aucun secret et aucune
donnée personnelle ne doivent être placés dans Git ou dans les journaux.

## Contrôles permanents

- ne jamais construire depuis des modifications non commitées ;
- ne jamais diminuer la version Apps Script ni déplacer un tag Git publié ;
- ne jamais créer une troisième Web App pour contourner un échec ;
- préserver les URL, `DOMAIN`, `ANYONE_ANONYMOUS` et `USER_DEPLOYING` ;
- conserver `https://alternance.loucodi.fr/` comme destination exacte de tout
  lien ou bouton vert libellé `Accueil PFMP` ;
- refuser toute page Apps Script en erreur, page blanche, authentification
  inattendue ou lien vers l'ancien canal bleu ;
- protéger chaque bouton de traitement asynchrone contre le double clic,
  afficher immédiatement un spinner et rétablir le bouton en succès, erreur ou
  dépassement de délai ;
- contrôler les états vide, chargement, succès et erreur des pages modifiées ;
- ne jamais affaiblir un test ou retirer une route pour faire passer une
  publication ;
- ne jamais déclencher pour la recette un import réel, un courriel, un ordre de
  mission ou une écriture Grist non explicitement autorisés.

Le projet bleu ne doit apparaître dans aucun compte rendu courant, sauf pour
indiquer explicitement qu'il est resté inutilisé.
