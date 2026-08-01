# Rapport unique — import Pronote réel PFMP dev.19

## État et prévisualisation

Version locale : **Eucalyptus PFMP — v1.0.0-dev.19**, déjà postérieure à dev.17. Aucun `clasp push`, version immuable ou déploiement n’a été effectué.

L’export est reconnu : UTF-16LE avec BOM, séparateur point-virgule, fins Windows, 898 lignes et 16 colonnes. Il est inchangé et ignoré par Git. La prévisualisation, fondée sur le dernier instantané vérifié des 38 offres de recette, compte :

- 628 élèves admissibles, dont 548 présents et 80 sortis ;
- 270 lignes exclues ou à contrôler ;
- 205 lignes sans classe ;
- 65 lignes dans une classe non autorisée : `1CAPP` 15, `1MELEC G` 11, `2UPE2A` 19, `PAE` 6 et `TMELEC G` 14 ;
- aucune date invalide, aucun doublon IDENT ou NUMERO et aucune identité ambiguë.

`N NATIONAL`, nationalité, coordonnées, responsables, données médicales, LOGIN et MDP ne sont pas importés.

## Compteurs admissibles par classe

| Classe | Total | Présents | Sortis |
|---|---:|---:|---:|
| 1CAP CAR | 11 | 9 | 2 |
| 1CAR | 23 | 22 | 1 |
| 1CIEL | 33 | 30 | 3 |
| 1MELEC | 26 | 23 | 3 |
| 1MP3D | 12 | 12 | 0 |
| 1MT | 24 | 20 | 4 |
| 1MVA1 | 30 | 29 | 1 |
| 1MVA2 | 34 | 27 | 7 |
| 1RMO | 13 | 9 | 4 |
| 1RSP | 14 | 8 | 6 |
| 2CAR | 24 | 21 | 3 |
| 2MP3D | 13 | 12 | 1 |
| 2MTNE1 | 32 | 31 | 1 |
| 2MTNE2 | 35 | 30 | 5 |
| 2MVA1 | 36 | 30 | 6 |
| 2MVA2 | 35 | 32 | 3 |
| 2REMI1 | 26 | 21 | 5 |
| 2REMI2 | 27 | 20 | 7 |
| TCAP CAR | 10 | 9 | 1 |
| TCAR | 15 | 14 | 1 |
| TCIEL | 29 | 28 | 1 |
| TMELEC | 24 | 22 | 2 |
| TMP3D | 13 | 12 | 1 |
| TMT | 21 | 19 | 2 |
| TMVA1 | 26 | 22 | 4 |
| TMVA2 | 24 | 19 | 5 |
| TRMO | 12 | 11 | 1 |
| TRSP | 6 | 6 | 0 |

Les dix autres offres PFMP autorisées n’ont aucune ligne dans cet export.

## Modèle, rapprochement et interface

Le schéma comporte 37 colonnes et les références `Classe → Classes`, `Offre_formation → EUC_OFFRES_FORMATION`, `Annee_scolaire → Annees_Scolaires` et `Soumission_PFMP → EUC_SOUMISSIONS_PFMP`. La table historique `Eleves` reste intacte.

Le chargeur refuse tout format, colonne obligatoire, largeur ou colonne sensible non conforme. L’importeur relit dynamiquement les 38 offres, réalise un upsert par clé stable, marque une disparition future `SORTIE_A_CONFIRMER` et vérifie l’unicité après écriture. Une sortie présente dans le premier export devient `SORTI` et confirmée.

Le rapprochement applique IDENT, NUMERO, identité/date/classe, puis identité/date si un changement de classe produit un résultat unique. Les soumissions `DRY_RUN` ou `SIMULATION` ne comptent jamais comme conventions réelles.

La route locale `?page=suivi-pfmp` est prête avec filtres, recherche, compteurs, badges et tableau allégé. Les actions futures restent inactives et aucune donnée sensible n’est affichée.

## Écriture Grist et contrôle réel

`EUC_ELEVES_PFMP` a été créée exclusivement dans la copie `j1jDArBkzi7P` avec 37 colonnes. L’import a créé 628 lignes, sans mise à jour et sans ligne marquée pour vérification d’un import antérieur. La relecture confirme 628 clés techniques uniques.

Le second passage idempotent calcule exactement zéro création, zéro mise à jour et zéro changement de statut restant. La table historique `Eleves` et toutes les autres tables sont restées inchangées. Aucun accès à la production n’a eu lieu.

La copie contient actuellement zéro ligne dans `EUC_SOUMISSIONS_PFMP` : aucun rapprochement de convention réelle n’est donc possible ou attendu à cet instant. Les simulations `DRY_RUN` restent explicitement exclues des conventions reçues.

Le jeton temporaire de recette a été supprimé automatiquement après l’opération. Un fichier identifié comme jeton de production a été ignoré et jamais lu.

Résultat local : **234 tests réussis, aucun échec**.

Les 270 lignes exclues restent des situations métier normales ou à examiner : 205 sans classe identifiable et 65 rattachées à cinq classes hors périmètre PFMP. Aucune ambiguïté technique ou date invalide ne bloque le référentiel créé.

La prochaine action est de connecter en lecture seule la route locale `?page=suivi-pfmp` aux 628 lignes de recette, vérifier les filtres et compteurs avec un compte administratif, puis préparer — sans l’exécuter automatiquement — le futur déploiement Apps Script.
