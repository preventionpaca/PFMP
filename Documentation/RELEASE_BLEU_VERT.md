# Publication PFMP bleu / vert

## Objectif

Une modification ne doit plus remplacer immédiatement la version utilisée par
les personnels. Depuis le 7 octobre 2026, deux projets Apps Script réellement
séparés ont des rôles stricts :

- **bleu — développement** : projet `Eucalyptus PFMP — Développement BLEU`,
  propriétés isolées, cible Grist de recette exclusivement, modes d'écriture
  forcés à `DRY_RUN`/`DISABLED`, URL `/dev` réservée aux éditeurs ;
- **vert — stable** : les deux Web Apps existantes `/exec`, l'une
  administrative et l'autre publique, qui conservent leurs URL et leurs règles
  d'accès.

Le projet bleu et le projet vert affichent un macaron fixe en haut à droite :
bleu « DÉVELOPPEMENT », vert « VERSION EN LIGNE ». Les sous-domaines continuent
de viser exclusivement les déploiements verts connus.

## Liens du canal bleu

- éditeur : `https://script.google.com/home/projects/1WcYtmndRV7-Y9j3H_nH5MIJLMfkAOepagHS_RRGIHyou2YvgtlhlPAeo/edit` ;
- application de test : `https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbxZ24Op4PNUx6_SfDhA_3vOYTv4vUVRHTVrtjg1bYQ/dev?page=admin-pfmp`.

L'URL `/dev` requiert un compte éditeur du projet. Elle n'est jamais utilisée
par les personnels ni par les sous-domaines publics.

## Principe de promotion

1. Le candidat doit être un commit Git explicite.
2. `prepare` reconstruit ce commit dans un clone temporaire propre, lance la
   suite complète, fabrique le paquet Apps Script complet puis pousse seulement
   le `HEAD` du projet bleu.
3. Le contenu distant est relu et comparé par empreinte au paquet testé.
4. Les 25 routes critiques sont ouvertes sur le canal bleu. Une erreur Apps
   Script, une redirection de connexion ou un titre inattendu bloque le lot.
   Comme `/dev` est privé, le contrôle terminal peut s'arrêter sur
   `Authorization needed`. Le paquet reste alors « en attente » : après contrôle
   réel des 25 routes dans un navigateur éditeur, l'homologation manuelle exige
   le SHA exact et la formule explicite `25-ROUTES-VALIDEES`; elle relit encore
   l'empreinte distante avant de rendre le candidat promouvable.
5. `promote` exige le même commit et la même empreinte distante, relance les
   contrôles, copie exactement ce paquet dans le projet vert, le relit, crée une
   version Apps Script immuable puis attache cette même version aux deux
   déploiements verts existants.
6. Les 25 routes sont à nouveau contrôlées sur les URL vertes. Si ce contrôle
   échoue, les deux déploiements reviennent automatiquement à leurs versions
   immuables précédentes.

Le canal bleu protège la disponibilité et les propriétés du code vert. Il vise
uniquement la copie Grist Camin `kB8bvDag8x7D` sur
`https://camin.getgrist.com`, avec une clé de service limitée en lecture à cette copie.
Aucun import réel, envoi, ordre de mission ou écriture métier ne doit y être
activé.

### Initialisation sécurisée du projet bleu

1. Dans l'éditeur bleu, exécuter une fois `EUC_RELEASE_configurerProjetBleu`.
   Cette fonction ne peut pas s'exécuter sur le projet vert. Elle renseigne les
   valeurs non sensibles, impose l'hôte Camin et `kB8bvDag8x7D`, puis désactive les mutations.
   La même garde est rejouée automatiquement avant chaque page bleue : une
   modification accidentelle de ces modes est donc corrigée avant le routeur.
2. Dans **Paramètres du projet > Propriétés du script**, ajouter manuellement
   `EUC_ENT_GRIST_API_KEY` avec une clé limitée à la copie de recette. Ne jamais
   réutiliser une clé pouvant écrire dans la production.
3. Exécuter `EUC_RELEASE_controlerProjetBleu`. Le diagnostic doit indiquer
   `projetCorrect`, `recetteCorrecte` et `cleRecettePresente` à `true`, avec les
   quatre modes à `DRY_RUN` ou `DISABLED`. Aucune valeur de clé n'est renvoyée.

Tant que cette étape n'est pas terminée, les pages dépendant de Grist doivent
échouer fermement au lieu de se rabattre sur la production.

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

# Après contrôle humain des 25 routes sur le /dev privé
scripts/pfmp-release.sh approve-development COMMIT 25-ROUTES-VALIDEES

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
- conserver les deux URL vertes et leur configuration actuelle
  `ANYONE_ANONYMOUS` / `USER_DEPLOYING`, nécessaire au parcours QR public par
  jeton ;
- ne jamais créer un troisième Web App pour contourner un échec ;
- ne jamais affaiblir la matrice de tests ou supprimer une route pour faire
  passer une publication.
