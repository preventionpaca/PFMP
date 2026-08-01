# Corrections de recette du formulaire PFMP — dev.9

Date de contrôle : 1er août 2026. Cible exclusive : copie Grist `j1jDArBkzi7P`.

## Audit carrosserie

Les correspondances utilisent conjointement l’année `2026-2027`, le code de classe, la formation, le niveau, le type PFMP et les dates. Aucun rapprochement par simple ressemblance partielle n’a été créé.

| Classe (ligne) | Offre | Périodes officielles retenues | Formation / niveau source | Certitude et justification |
|---|---:|---|---|---|
| `1CAP CAR` (1) | 1 | 285 — 24/05/2027 au 02/07/2027 | CAP / 1 CA / PFMP 1 CAP | certaine : année, progression CAP et famille carrosserie concordantes |
| `1CAR` (3) | 2 | 26 — 23/11/2026 au 18/12/2026 ; 34 — 22/03/2027 au 16/04/2027 | 1 BAC PRO / CPA / PFMP 1ère | certaine : niveau première et code CPA concordants |
| `2CAR` (13) | 11 | 137 — 24/05/2027 au 02/07/2027 | 2 BAC PRO / CPA / PFMP 2nde | certaine : niveau seconde et code CPA concordants |
| `TCAP CAR` (23) | 19 | 284 — 15/03/2027 au 09/04/2027 ; 287 — 16/11/2026 au 04/12/2026 | CAP / T CA / PFMP TCAP ou T CAP | certaine : terminale CAP carrosserie et année concordantes |
| `TCAR` (24) | 20 | 10 — 18/01/2027 au 05/02/2027 ; 62 — 28/09/2026 au 16/10/2026 | T BAC PRO / CPA / PFMP Tbac | certaine : terminale bac professionnel et CPA concordants |

Huit relations ont été créées dans `EUC_OFFRES_PERIODES` : `1:285`, `2:26`, `2:34`, `11:137`, `19:284`, `19:287`, `20:10`, `20:62`. Les événements `VFMP` (2) et `P.dif` (17) ne sont pas des périodes PFMP officielles et n’ont pas été reliés. Il ne subsiste aucune relation carrosserie incertaine à créer automatiquement. Les ambiguïtés MP3/MP3D, hors de cet audit ciblé, restent inchangées.

## Évolution minimale du schéma

Une sauvegarde ciblée a été produite avant écriture dans `proposals/pfmp-dev9-backup-before-write.json`. Les colonnes suivantes ont été ajoutées sans suppression ni renommage :

- `EUC_OFFRES_FORMATION.Libelle_affichage` (`Text`) ;
- `EUC_SOUMISSIONS_PFMP.Entreprise_complement_adresse_snapshot` (`Text`) ;
- `EUC_SOUMISSIONS_PFMP.Entreprise_code_postal_snapshot` (`Text`) ;
- `EUC_SOUMISSIONS_PFMP.Entreprise_pays_snapshot` (`Text`).

Les 61 colonnes historiques de soumission sont conservées ; le schéma en compte désormais 64. La relecture distante confirme 38 offres, 51 relations, 64 colonnes de soumission et aucun doublon de relation.

## Libellés et formulaire

Les offres `2MTNE1`, `2MTNE2`, `2REMI1` et `2REMI2` utilisent désormais les libellés complets de famille MTNE et REMI via `Libelle_affichage`. Aucun diplôme autonome artificiel n’a été créé et « À valider » n’est plus affiché.

Le formulaire propose exactement `Dates officielles`, `Début retardé` et `Autre situation exceptionnelle`. Le serveur contrôle les dates, le motif et la chronologie. L’adresse distingue adresse, complément, code postal, ville et pays ; France est la valeur initiale et les entreprises étrangères, dont Monaco, peuvent être saisies sans SIRET.

Le responsable figure dans le panneau entreprise. Son nom est obligatoire ; prénom, fonction, téléphone et courriel sont facultatifs. Le panneau tuteur permet une copie visible, éditable et fidèle, y compris pour les valeurs vides. En mode « même personne », la préparation produit un contact unique portant les deux rôles. Les champs génériques téléphone/courriel de l’entreprise ne sont plus demandés dans ce parcours.

Chaque étape est validée séparément avec résumé, message sous le champ, focus et défilement vers la première erreur. Les champs obligatoires portent un astérisque textuel accessible.

## Sécurité et livraison

- tests locaux : **64 réussis, aucun échec** ;
- mode soumission : **DRY_RUN** ;
- mode courriel : **DISABLED** ;
- Turnstile : non activé ;
- production Grist : **ni consultée ni modifiée** ;
- soumission réelle et courriel réel : aucun ;
- version Apps Script immuable : **8** ;
- déploiement existant mis à jour : `AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg` (`@8`), sans changement d’URL.
