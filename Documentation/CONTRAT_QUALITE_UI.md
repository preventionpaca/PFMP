# Contrat permanent de qualité — interface PFMP

Ce contrat s’applique à chaque évolution, sans que l’utilisateur ait à le
rappeler.

## 1. Développement uniquement sur le bleu

1. Partir d’un commit Git explicite contenant tout le code vert déjà publié.
2. Développer et tester localement.
3. Publier avec `scripts/pfmp-release.sh prepare`, exclusivement sur le projet
   bleu et sa recette Grist isolée.
4. Relire le projet distant et comparer son empreinte au paquet testé.
5. Ne promouvoir le candidat exact qu’après autorisation explicite.

Une correction directe sur le projet vert est interdite. Une modification de
documentation postérieure au candidat ne doit pas conduire à reconstruire un
autre paquet applicatif : la promotion repart du SHA candidat exact.

## 2. Navigation et liens

La recette de chaque livraison comprend obligatoirement les 25 routes et, sur
l’ensemble de ces routes :

- la route directe ;
- le fil d’Ariane et les boutons de retour ;
- chaque lien, carte ou bouton qui ouvre une autre page PFMP ;
- les liens produits après chargement de données ;
- les états sans donnée et avec erreur.

Sur le vert, `Accueil PFMP` vise exactement
`https://alternance.loucodi.fr/`. Sur le bleu, ces mêmes accès restent dans le
déploiement `/dev`. Une page Apps Script en erreur, une page blanche, une
connexion inattendue ou un passage silencieux du bleu vers le vert bloque la
livraison.

La matrice automatisée des routes reste un minimum. Le parcours navigateur de
tous les contrôles de navigation visibles du site est également obligatoire,
pas seulement celui des pages modifiées.

## 3. Boutons et traitements asynchrones

Tout bouton du candidat livré qui déclenche un appel serveur ou un traitement
potentiellement long doit :

1. réagir immédiatement au clic ;
2. se désactiver contre le double clic ;
3. afficher un spinner et un libellé précis, par exemple « Chargement… »,
   « Enregistrement… » ou « Génération… » ;
4. afficher un résultat compréhensible ;
5. retrouver son libellé et son état initial après succès, erreur ou délai
   dépassé.

Une erreur ne doit jamais laisser un bouton tourner indéfiniment. Les liens qui
ne font que changer de page n’ont pas besoin de spinner. Une action réelle
interdite ou destructive est contrôlée par un test ou une simulation sûre, sans
l’exécuter sur des données ou destinataires réels.

## 4. Contrôles avant remise

Quatre preuves différentes doivent être rapportées séparément :

1. **test unitaire ou simulé** : vérifie une règle de code avec des données
   fictives ;
2. **contrôle de route** : prouve seulement que l'URL s'ouvre sans erreur
   Apps Script ;
3. **contrôle de navigation** : prouve que les liens conduisent au bon écran et
   restent dans le bon canal ;
4. **parcours métier de bout en bout** : part d'un exemple de recette, réalise
   les choix et clics de l'utilisateur, attend la fin réelle du traitement puis
   vérifie son résultat dans l'écran ou le document consommateur.

La mention « testé » doit préciser laquelle de ces quatre preuves a été
obtenue. `25/25 routes` ne permet jamais d'écrire « tous les parcours sont
fonctionnels ». Une opération restée sur un spinner, terminée côté serveur sans
confirmation côté écran, ou dont le résultat final n'a pas été relu est un
échec de parcours métier.

Pour chaque domaine modifié, le bleu doit exécuter au moins un scénario complet
sur une donnée de recette autorisée. Les actions interdites (courriel réel,
production, import Pronote réel, ordre de mission réel) restent simulées et
sont explicitement listées comme non exécutées.

- tests ciblés du lot ;
- une seule suite complète finale ;
- diff relu et absence de secret ou donnée nominative dans Git ;
- publication bleue et relecture distante ;
- `25/25` routes bleues ;
- parcours de tous les liens et boutons de navigation internes des 25 routes ;
- documentation d’état mise à jour.

Après promotion autorisée : version immuable, URL inchangées, `25/25` routes
vertes et retour automatique si la recette échoue.

Les limites de recette doivent être annoncées. Un courriel, un import, une
écriture Grist ou un document réel ne peut servir de test sans autorisation
explicite.
