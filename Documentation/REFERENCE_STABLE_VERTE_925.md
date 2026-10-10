# Référence fonctionnelle immuable — vert 925

## Point de retour

- Version Apps Script servie par les deux Web Apps vertes : `925`.
- Commit applicatif exact : `60e88114ac6b2406d10ed319eaf779bea65ebe65`.
- Tag Git immuable : `pfmp-green-925-stable`.
- Suite complète associée : `769/769` tests réussis.
- Contrôle de livraison associé : `25/25` routes vertes réussies.
- Contrôle navigateur associé : TMP3D `11/11` conventions couvertes avec un
  contact exploitable, TCAR `19/19`, remplacement actif et historique de
  rupture conservés.

Ce tag est le retour arrière fonctionnel de référence. Il ne doit jamais être
déplacé ni réécrit. Toute livraison ultérieure qui échoue à conserver les
invariants ci-dessous doit être refusée ou ramenée sur cette version.

## Invariants figés

1. Les effectifs, apprentis, conventions et absences de convention sont
   calculés dans la période choisie, sans fuite du parcours différencié.
2. La convention active après rupture est l'état courant ; la rupture reste
   dans l'historique et n'entre pas dans les ordres de mission.
3. La colonne « Coordonnées entreprise » affiche le responsable disponible,
   puis les coordonnées générales, puis le tuteur en dernier recours.
4. Les conventions et apprentis valides sont verts à texte blanc ; les
   absences, annulations et interruptions restent rouges sur fond rose.
5. Les affectations de suivi téléphonique et de visite restent distinctes.
6. La navigation admin/public reste sur son canal et `Accueil PFMP` vise
   `https://alternance.loucodi.fr/` sur le vert.
7. Aucun affichage ne doit provoquer une écriture métier dans Grist.

## Barrière anti-régression

Une évolution touchant le suivi, les conventions, les entreprises, les
affectations, les caches ou la cartographie doit fournir avant promotion :

- un test ciblé pour chaque invariant concerné ;
- la suite complète sans test affaibli ;
- le contrôle des 25 routes et de leur navigation ;
- les parcours navigateur TMP3D et TCAR comparés à cette référence ;
- une mesure du nombre d'appels Grist et du volume JSON du parcours modifié ;
- un retour automatique vers `925` si le contrôle vert échoue.

## Budget de lecture du détail de classe

Le détail persistant contient déjà les élèves, conventions, entreprises,
contacts, tuteurs et affectations nécessaires au rendu. Le chemin normal doit
donc respecter les règles suivantes :

- aucun recalcul familial ou annuel sur le clic d'une PFMP ;
- aucun enrichissement global des conventions ;
- une seule lecture distante du détail compact lors d'un démarrage à froid ;
- aucune lecture Grist lors d'un accès chaud tant que la révision métier n'a
  pas changé ;
- effectif et navigation inclus dans le détail ou servis par un index compact,
  sans lectures séquentielles supplémentaires ;
- historique complet chargé seulement à la demande.

La latence de `20–30 s` observée le 10 octobre 2026 n'est pas acceptée comme
référence. Elle constitue le prochain défaut de performance à corriger sans
modifier les invariants fonctionnels ci-dessus.

## Limite du contrôle du 10 octobre 2026

Une nouvelle tentative de contrôle automatisé depuis le poste a été rendue
inexploitable par l'expiration de l'authentification Google CLASP
(`invalid_rapt`) : les routes publiques répondaient, mais les routes
administratives recevaient une page d'autorisation. Ce résultat ne remplace
pas la preuve `25/25` obtenue lors de la livraison `925`. Une nouvelle preuve
administrative exige d'abord une reconnexion Google du poste.
