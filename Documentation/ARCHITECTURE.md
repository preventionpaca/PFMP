# Architecture

Architecture de recette `v1.0.0-dev.8` : un seul projet Apps Script regroupe les fonctions historiques, le module Entreprises et le nouveau module PFMP. Les modules `EUC_ENT_` et `EUC_PFMP_` utilisent uniquement la copie Grist `j1jDArBkzi7P`. Le projet Apps Script de recette distinct est abandonné et ne reçoit plus aucune modification.

## Flux

`Navigateur → doGet historique → routeur → EDT par défaut, Entreprises ou PFMP → Apps Script → Grist`

Si la fiche est absente : `Apps Script signale l'absence → navigateur → API Recherche d'entreprises → validation/mapping Apps Script → formulaire`. L'enregistrement éventuel suit ensuite `navigateur → Apps Script → Grist`.

La clé Grist reste dans les propriétés du script. Le navigateur ne reçoit jamais ce secret et n'accède jamais directement à Grist. L'appel navigateur concerne uniquement l'API publique sans authentification, afin de contourner le `502` reproductible entre `UrlFetchApp` et cette API. Aucun composant Supabase, Cloudflare ou Netlify n'est utilisé.

## Composants

- `EDT.js` : point d'entrée Web App unique et routeur ;
- `Code.js` et modules `EDT_*.js` : application historique calendriers, alternance, EDT et PFMP ;
- `EUC_ENT_WebApp.gs` : rendu de la route `?page=entreprises` et inclusion HTML ;
- `EUC_ENT_Config.gs` : configuration et diagnostic sans valeur sensible ;
- `EUC_ENT_Validation.gs` : normalisation, Luhn et nettoyage ;
- `EUC_ENT_ApiEntreprise.gs` : recherche et mapping ;
- `EUC_ENT_Grist.gs` : lecture, doublon et écriture ;
- `EUC_ENT_InstallationGrist.gs` : plan idempotent futur, exécution bloquée avant audit ;
- `Index.html`, `Styles.html`, `Scripts.html` : interface accessible et responsive.
- `EUC_PFMP_Config.gs`, `EUC_PFMP_Service.gs`, `EUC_PFMP_WebApp.gs` : configuration, catalogue dynamique, validation et simulations PFMP ;
- `PFMP.html`, `PFMP_Styles.html`, `PFMP_Scripts.html` : formulaire responsive en huit étapes.

## Sécurité et concurrence

Les données sont nettoyées côté serveur. Le bouton est désactivé pendant un appel. Le second contrôle serveur limite les doublons, mais l'installation finale devra aussi imposer une contrainte opérationnelle sur SIRET (ou gérer atomiquement les conflits) après audit Grist.

La route Entreprises vérifie le domaine autorisé avant le rendu, la recherche et l'écriture. L'insertion est protégée par un verrou Apps Script puis un second contrôle SIRET.
