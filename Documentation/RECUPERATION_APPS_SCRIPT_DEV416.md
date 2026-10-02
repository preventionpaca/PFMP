# Récupération de la version Apps Script DEV416

Date de récupération : 2 octobre 2026.

## Source d'autorité

- Projet Apps Script : `1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c`.
- Version immuable : `722`.
- Libellé de déploiement : `PFMP v1.0.0-dev.416 - final detail cache + prewarm`.
- Déploiement ADMIN : `AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA`, version `722`.
- Déploiement PUBLIC : `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg`, version `722`.

La commande `clasp clone` a récupéré 343 fichiers applicatifs. Ils ont été placés sans transformation dans `apps-script/`. Le manifeste d'empreintes `Documentation/snapshots/apps-script-v722.sha256` permet de vérifier leur identité octet par octet.

## Vérification locale

```bash
node tests/run-dev416-recovery-tests.js
```

Cette vérification contrôle la liste et le SHA-256 des 343 fichiers, le projet et la racine `clasp`, la présence des composants DEV401/DEV415/DEV416, les références aux modes de sécurité et l'absence de motifs usuels de secrets.

## État hérité à ne pas confondre avec une validation

La récupération est fidèle au distant, mais elle ne vaut pas validation fonctionnelle ou de sécurité de DEV416. Deux contradictions héritées doivent être traitées avant tout prochain déploiement :

- le manifeste distant utilise `ANYONE_ANONYMOUS`, tandis que le cadre permanent historique exige `DOMAIN` ;
- `EUC_ENT_Config.js` contient une cible de recette historique différente de `j1jDArBkzi7P`.

Les tests historiques de dev.27 sont conservés. Ils ne constituent pas encore une suite compatible DEV416 : plusieurs assertions figent les versions dev.8/dev.27 et l'ancien ordre de chargement du routeur. Ils ne doivent pas être supprimés ou affaiblis ; leur migration doit être réalisée comme un lot distinct et justifié.

## Interdictions maintenues

Aucun accès à la production Grist, import Pronote réel, écriture élève ou convention, courriel, ordre de mission, activation LIVE/ENABLED, `clasp push`, création de version ou redéploiement n'a été effectué pendant cette récupération.

