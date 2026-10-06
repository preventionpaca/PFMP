# Publication PFMP bleu / vert

## Objectif

Une modification ne doit plus remplacer immédiatement la version utilisée par
les personnels. Le projet Apps Script reste unique, mais ses déploiements ont
désormais deux rôles strictement séparés :

- **bleu — développement** : le déploiement de test `@HEAD` existant, servi par
  une URL `/dev` réservée aux éditeurs du projet ;
- **vert — stable** : les deux Web Apps existantes `/exec`, l'une
  administrative et l'autre publique, qui conservent leurs URL et leurs règles
  d'accès.

Il n'est créé ni nouveau projet Apps Script ni nouvelle URL publique. Les
sous-domaines continuent donc de viser les déploiements verts connus.

## Principe de promotion

1. Le candidat doit être un commit Git explicite.
2. `prepare` reconstruit ce commit dans un clone temporaire propre, lance la
   suite complète, fabrique le paquet Apps Script complet puis pousse seulement
   `HEAD`.
3. Le contenu distant est relu et comparé par empreinte au paquet testé.
4. Les 25 routes critiques sont ouvertes sur le canal bleu. Une erreur Apps
   Script, une redirection de connexion ou un titre inattendu bloque le lot.
5. `promote` exige le même commit et la même empreinte distante, relance les
   contrôles, crée une version Apps Script immuable puis attache cette même
   version aux deux déploiements verts existants.
6. Les 25 routes sont à nouveau contrôlées sur les URL vertes. Si ce contrôle
   échoue, les deux déploiements reviennent automatiquement à leurs versions
   immuables précédentes.

Le canal bleu protège la disponibilité du code vert. Il ne constitue pas une
base de données distincte : les propriétés du script et la cible Grist sont
partagées par les déploiements du même projet. La recette automatique reste
donc strictement en lecture seule ; aucun import, envoi, ordre de mission ou
écriture métier ne doit être déclenché sans autorisation séparée.

## Commandes

Depuis la racine du dépôt :

```bash
# État des déploiements et éventuel candidat en attente
scripts/pfmp-release.sh status

# Tests, paquet complet, push sur le bleu et contrôle des 25 routes
scripts/pfmp-release.sh prepare

# Contrôle HTTP seul du bleu ou du vert
scripts/pfmp-release.sh check-development
scripts/pfmp-release.sh check-stable

# Promotion explicite du candidat déjà validé
scripts/pfmp-release.sh promote

# Retour explicite vers une version immuable connue
scripts/pfmp-release.sh rollback VERSION
```

Les identifiants de déploiement non secrets et la matrice des routes sont dans
`scripts/pfmp-release-config.json`. Le candidat validé est mémorisé uniquement
dans `.git/pfmp-release-candidate.json` et n'est jamais ajouté au dépôt.

## Règles permanentes

- ne plus exécuter directement `clasp deploy` pour une évolution ordinaire ;
- ne jamais promouvoir un autre commit que le candidat bleu contrôlé ;
- ne jamais utiliser un paquet construit depuis les modifications non
  commitées du répertoire de travail ;
- conserver les deux URL vertes et leur configuration `DOMAIN` /
  `USER_DEPLOYING` ;
- ne jamais créer un nouveau Web App pour contourner un échec ;
- ne jamais affaiblir la matrice de tests ou supprimer une route pour faire
  passer une publication.
