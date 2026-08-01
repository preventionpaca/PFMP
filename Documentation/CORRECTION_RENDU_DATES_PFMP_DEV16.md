# Correction du rendu des dates PFMP — dev.16

## Diagnostic de l’écart dev.15

Les tests dev.15 étaient trompeurs parce qu’ils contrôlaient uniquement des expressions régulières dans `PFMP.html` et `PFMP_Scripts.html`. Ils ne construisaient pas le HTML final, n’exécutaient pas JavaScript et ne contrôlaient jamais `getComputedStyle` dans un navigateur.

La relecture indépendante de la version Apps Script `14` montre toutefois que ses 29 fichiers sont identiques au local et contiennent bien `dev.15`, `formatDateFr`, ainsi que la règle CSS de sécurité. La capture incorrecte correspond fonctionnellement au rendu antérieur à dev.15 : même URL de déploiement, mais document déjà chargé avant le passage effectif sur `@14`. L’ancien test ne pouvait ni détecter ce cas ni vérifier le marqueur réellement rendu.

L’affichage ISO provenait de trois concaténations directes des valeurs internes `aaaa-mm-jj` : les options de période, le bandeau de l’étape 4 et le récapitulatif. Dev.15 avait corrigé les deux premières, mais pas le récapitulatif. Le bloc motif restait visible dans les versions antérieures parce que `label { display:grid }` annulait visuellement l’attribut `hidden`; dev.15 avait ajouté la règle de priorité, sans test de style calculé ni resynchronisation lors de tous les chemins de navigation.

## Corrections

- `PFMP.html` : conteneur unique `motifWrap`, règle `[hidden] { display: none !important; }` et marqueur `dev.16` ;
- `PFMP_Scripts.html` : fonction unique `formatDateFrPourAffichage`, format français dans les options, le bandeau et le récapitulatif, synchronisation du motif à l’initialisation, au chargement, aux changements et au retour sur l’étape ;
- `EUC_PFMP_Service.gs` : normalisation serveur du motif officiel maintenue ;
- `tests/pfmp-render-dom.js` : assemblage du HTML final, exécution dans Chromium et contrôle des styles calculés, des valeurs internes et des transitions ;
- `tests/run-tests.js` : assertions sur le résultat DOM final.

Le test de rendu obtient réellement :

- bandeau `Dates officielles : 23/11/2026 au 18/12/2026` ;
- option `PFMP test — 23/11/2026 au 18/12/2026` ;
- récapitulatif `23/11/2026 → 18/12/2026` ;
- motif officiel avec `display: none`, `hidden=true`, `aria-hidden=true`, `required=false` et `tabIndex=-1` ;
- valeurs internes inchangées : `2026-11-23` et `2026-12-18` ;
- affichage obligatoire pour les deux situations dérogatoires, puis effacement complet au retour aux dates officielles.

## Livraison

- tests : **131 réussis, aucun échec** ;
- accès : **DOMAIN** ;
- soumissions : **DRY_RUN** ;
- courriels : **DISABLED** ;
- Turnstile : non activé ;
- production Grist : **ni consultée ni modifiée** ;
- copie autorisée : `j1jDArBkzi7P` exclusivement ;
- relecture distante : **29 fichiers identiques au local** ;
- version Apps Script immuable : **15** ;
- déploiement existant actif sur `@15`, sans changement d’URL.
