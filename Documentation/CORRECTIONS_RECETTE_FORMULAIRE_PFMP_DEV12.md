# Corrections de recette du formulaire PFMP — dev.12

Date : 1er août 2026. Cible exclusive : copie Grist `j1jDArBkzi7P`.

## Intitulé utilisateur

Le titre visible et le titre du document sont désormais « Enregistrement de convention de stage ». Le texte d’introduction et la description accessible sont : « Préparez les informations nécessaires à votre période de formation en milieu professionnel. » L’ancien titre utilisateur « Demande de PFMP » a été retiré de l’interface, sans renommer les fonctions, fichiers, identifiants, colonnes, constantes ni la route `?page=pfmp`.

## Comportement du motif

Pour « Dates officielles », le motif est masqué, désactivé, non obligatoire, retiré de l’ordre de tabulation et effacé. Les dates réelles sont remises aux dates officielles et restent verrouillées. Le payload force `motif` à une chaîne vide, le récapitulatif n’affiche aucune ligne de motif et le serveur normalise également toute valeur résiduelle à vide avant validation et mapping.

Pour « Début retardé » et « Autre situation exceptionnelle », le motif apparaît immédiatement, avec astérisque et aide courte, et devient obligatoire. La fin reste verrouillée à la date officielle pour un début retardé. Le commentaire facultatif reste visible et indépendant dans tous les cas.

## Vérifications et livraison

- tests locaux : **120 réussis, aucun échec** ;
- syntaxe JavaScript et fichiers JSON : **valides** ;
- relecture de la version distante `11` : **29 fichiers, aucune différence avec le local** ;
- accès Web App : **DOMAIN** ;
- mode soumission : **DRY_RUN** ;
- mode courriel : **DISABLED** ;
- Turnstile : non activé ;
- production Grist : **ni consultée ni modifiée** ;
- écriture Grist, soumission réelle, courriel réel, commit et push Git : aucun ;
- version Apps Script immuable : **11** ;
- déploiement existant mis à jour sur `@11`, sans changement d’URL.
