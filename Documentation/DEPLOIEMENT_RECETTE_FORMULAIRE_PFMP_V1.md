# Déploiement de recette du formulaire PFMP — V1

Date : 1er août 2026  
Version locale : **Eucalyptus PFMP — v1.0.0-dev.11**  
Projet Apps Script principal : `1UhU3xymABJ-3kAJ5wwBbnCNgiLwcvqpWKyOqVYqB8Mtc8_z4yzgSPl-c`

## Déploiement

|Élément|Valeur|
|---|---|
|Version Apps Script immuable|`7`|
|Description|`Eucalyptus PFMP v1.0.0-dev.11 - recette DRY_RUN sans courriel`|
|Identifiant du déploiement conservé|`AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg`|
|Accès conservé|`DOMAIN`, exécution `USER_DEPLOYING`|
|URL de base|`https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec`|
|URL PFMP|`https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec?page=pfmp`|

Aucun second projet et aucun déploiement Web App parallèle n'a été créé. Le déploiement existant est passé de la version 6 à la version 7.

## Contrôles avant synchronisation

- `.clasp.json` correspond exactement au projet principal documenté ;
- le HEAD distant initial contenait 23 fichiers ;
- les 13 fichiers historiques hors routeur étaient identiques octet par octet au local ;
- `EDT.js` ne différait que par l'ajout de la branche `page === 'pfmp'` avant le fallback historique ;
- les modules Entreprises ne différaient fonctionnellement que par leur version ;
- les six fichiers PFMP étaient nouveaux et toutes leurs fonctions serveur portent le préfixe `EUC_PFMP_` ;
- le manifeste local et distant conserve `DOMAIN` et `USER_DEPLOYING` ;
- aucune valeur secrète ou clé OAuth n'a été ajoutée aux fichiers du dépôt ;
- 48 tests locaux réussissaient sans réseau réel.

## Synchronisation et relecture

Le `clasp push` a synchronisé 29 fichiers. Une seconde extraction isolée du HEAD distant a ensuite été comparée au local : 29 fichiers présents, aucune différence et aucun fichier distant supplémentaire.

La version immuable 7 a été créée après cette identité complète, puis le seul déploiement Web App existant a été mis à jour vers cette version.

## Modes de sécurité

Les gardes serveur de `dev.8` sont fermées par défaut :

|Propriété|Valeur demandée|État effectif si absente|
|---|---|---|
|`EUC_PFMP_SUBMISSION_MODE`|`DRY_RUN`|`DRY_RUN`|
|`EUC_PFMP_EMAIL_MODE`|`DISABLED`|`DISABLED`|

La tentative d'appeler la fonction protégée `EUC_PFMP_configurerModesRecette` par CLASP a été refusée avant exécution, car le projet ne possède pas de déploiement API exécutable. Aucun exécutable supplémentaire n'a été créé. Les propriétés n'ont donc pas été modifiées automatiquement ; elles restent à saisir explicitement dans les propriétés du script, mais leur absence produit déjà les deux modes sûrs ci-dessus.

Seule la valeur exacte `LIVE` peut franchir la future garde d'écriture. Seule `ENABLED` peut franchir la future garde d'envoi. Le service public déployé reste `EUC_PFMP_simulerSoumission`, sans appel Grist `POST/PATCH` et sans `MailApp`.

Turnstile n'est pas configuré. L'interface affiche cet état et le bandeau `MODE RECETTE — aucune donnée ne sera enregistrée`. La simulation renvoie l'état explicite `NON_CONFIGURE_RECETTE`; un futur mode `LIVE` refusera toute soumission sans CAPTCHA réel.

## Contrôles distants sans soumission

|Contrôle|Résultat|
|---|---|
|Métadonnée du déploiement|version 7 et même identifiant confirmés|
|Fichiers PFMP|six fichiers présents dans le HEAD relu|
|Route par défaut|branche et fallback historiques inchangés dans le distant|
|Route Entreprises|branche historique inchangée dans le distant|
|Route PFMP|branche et six templates/services présents dans le distant|
|Accès HTTP anonyme aux trois routes|redirection `302` vers la connexion du domaine pour chacune|
|Droits Web App|aucun passage à `ANYONE_ANONYMOUS`|
|Écriture Grist|aucune fonction d'écriture appelée|
|Courriel|aucune fonction d'envoi appelée|
|Soumission métier|aucune|

Le chargement authentifié des 38 classes ne peut pas être lancé par `clasp run`, faute de déploiement API exécutable. Aucun exécutable temporaire n'a été créé. Le contrôle statique et local confirme que la route distante appelle uniquement les offres visibles et exige exactement 38 résultats, les relations actives de `EUC_OFFRES_PERIODES`, les huit BTS sans référence `Classes`, et qu'aucun nom de classe exclue n'est codé dans l'application. La validation réelle avec la session du domaine reste le premier test visuel à effectuer.

## Propriétés restant à configurer

- `EUC_PFMP_SUBMISSION_MODE=DRY_RUN` ;
- `EUC_PFMP_EMAIL_MODE=DISABLED` ;
- `EUC_PFMP_NOTIFICATION_EMAIL` ;
- `EUC_PFMP_SEND_STUDENT_CONFIRMATION` ;
- `EUC_PFMP_TURNSTILE_SITE_KEY` ;
- `EUC_PFMP_TURNSTILE_SECRET_KEY` ;
- `EUC_PFMP_TURNSTILE_EXPECTED_HOSTNAME`.

Les propriétés Turnstile, de notification et de confirmation restent volontairement absentes pour cette première recette sans envoi.

## Test visuel à réaliser

Avec une session du domaine, ouvrir l'URL PFMP ci-dessus et contrôler : bandeau de recette, 38 classes, absence de `1CAPP` et `TMELEC G`, huit BTS, périodes scolaires, dates libres apprenti, recherche SIRET, contacts existants et ergonomie mobile. Ne pas chercher à produire une écriture : le bouton final ne fait qu'une simulation.

## Retour à la version précédente

Pour revenir au déploiement précédent sans créer de nouvelle URL :

```bash
npx --yes @google/clasp deploy -i AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg -V 6 -d "Retour recette Entreprises v1.0.0-dev.6 - DOMAIN"
```

Cette commande ne doit être exécutée qu'après une autorisation explicite. La version 7 reste immuable.

## Garanties

Aucune écriture Grist, création ou modification d'entreprise/contact, soumission métier, lecture ou modification du document de production, exécution de courriel, modification de droits Web App, création de clé Cloudflare, commit ou push Git n'a eu lieu pendant cette opération.
