# Correctif de recette du formulaire PFMP — dev.13

Date : 1er août 2026. Cible exclusive : copie Grist `j1jDArBkzi7P`.

La version `dev.12` utilisait `addMetaTag('description', ...)`. Google Apps Script refuse cette balise dans ce contexte et empêchait entièrement le rendu de `?page=pfmp`. Le correctif retire uniquement cet appel incompatible. Le titre du document reste défini par `setTitle('Enregistrement de convention de stage')` ; le titre visible et le texte d’introduction restent présents dans l’en-tête HTML accessible.

Les corrections de l’étape Dates restent inchangées : motif masqué, désactivé, retiré de la tabulation et normalisé à vide pour les dates officielles ; motif visible et obligatoire dans les deux situations dérogatoires ; commentaire facultatif conservé.

- tests locaux : **120 réussis, aucun échec** ;
- accès Web App : **DOMAIN** ;
- soumissions : **DRY_RUN** ;
- courriels : **DISABLED** ;
- Turnstile : non activé ;
- version Apps Script immuable : **12** ;
- même déploiement mis à jour sur `@12`, sans changement d’URL ;
- aucune écriture Grist, consultation de la production, soumission réelle, courriel, opération Git ou modification de propriété.
