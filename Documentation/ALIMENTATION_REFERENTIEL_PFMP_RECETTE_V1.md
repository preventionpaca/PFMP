# Alimentation du référentiel PFMP — copie Grist — V1

Date : 1er août 2026  
Document autorisé et alimenté : copie Grist `j1jDArBkzi7P`  
Document de production interdit : `3pnVrygfNn7c`

## Résultat

L'alimentation du référentiel PFMP a réussi. Le contrôle final a été effectué par une seconde lecture indépendante de la copie.

|Élément|Résultat|
|---|---:|
|Diplômes créés|14|
|Offres créées|38|
|Offres visibles (`Afficher_formulaire_PFMP=true`)|38|
|Offres supplémentaires visibles|0|
|BTS sans référence artificielle vers `Classes`|8|
|Relations certaines créées|43|
|Relations incertaines créées|0 sur 11|
|Doublons de `Code_liaison`|0|
|Liens directs écrits dans les périodes à offre certaine unique|29|
|Soumissions métier créées|0|
|Anomalies bloquantes|0|

`1CAPP` et `TMELEC G` ne sont visibles dans aucune offre. Leurs lignes historiques n'ont été ni modifiées, ni fusionnées, ni désactivées, ni supprimées.

## Schéma créé ou complété

Table créée : `EUC_OFFRES_PERIODES`.

|Colonne|Type vérifié|
|---|---|
|`Offre_formation`|`Ref:EUC_OFFRES_FORMATION`|
|`Periode`|`Ref:Planning_Periodes`|
|`Active`|`Bool`|
|`Code_liaison`|`Text`|
|`Commentaire`|`Text`|

Colonnes ajoutées à `EUC_OFFRES_FORMATION` :

|Colonne|Type vérifié|Usage|
|---|---|---|
|`Code_classe`|`Text`|libellé officiel de l'une des 38 classes, notamment pour les huit BTS sans ligne `Classes`|
|`Afficher_formulaire_PFMP`|`Bool`|pilotage dynamique de la visibilité|

La détection des doublons repose sur le couple `Offre_formation + Periode`, matérialisé par `Code_liaison = {offreId}:{periodeId}`. La relecture ne trouve aucun doublon.

## Diplômes créés

Les codes créés sont : `CAP_CAR`, `BAC_PRO_CAR`, `BAC_PRO_CIEL`, `BAC_PRO_MELEC`, `BAC_PRO_MP3D`, `BAC_PRO_MT`, `BAC_PRO_MVA`, `BAC_PRO_RMO`, `BAC_PRO_RSP`, `BTS_CPI`, `BTS_CPRP`, `BTS_MV`, `BTS_ELEC` et `BTS_CIEL`.

Les libellés encore administrativement incertains portent la mention `À valider` dans `Commentaire`. Aucun diplôme autonome `Mixité`, `MTNE`, `REMI`, niveau de classe ou modalité d'apprentissage n'a été créé. Les quatre offres `2MTNE1`, `2MTNE2`, `2REMI1` et `2REMI2` conservent donc une référence diplôme vide et un commentaire explicite, plutôt qu'une valeur inventée.

## Offres de formation

Les 38 lignes du CSV validé ont été créées pour l'année active `2026-2027`, avec `Actif=true` et `Afficher_formulaire_PFMP=true`.

- 30 offres possèdent la référence certaine ou normalisée vers leur ligne `Classes`.
- Les huit offres `1BTS CPI`, `2BTS CPI`, `1BTS CPRP`, `2BTS CPRP`, `1BTS MV`, `2BTS MV`, `1BTS CIEL` et `2BTS CIEL` ont une référence `Classes` vide et leur code officiel dans `Code_classe`.
- Aucune offre autre que les 38 autorisées n'est visible.

## Relations et périodes

Les 43 relations classées certaines ont été créées avec `Active=true`. Les 11 relations à valider n'ont provoqué aucune écriture : dix rapprochements `CAR/CPA/CA` ou `MP3/MP3D`, ainsi que la relation mixité ID 278.

Pour les périodes ayant exactement une offre certaine, 29 références `Planning_Periodes.Offre_formation` ont été renseignées. Pour les périodes partagées, aucune offre arbitraire n'a été choisie : seule `EUC_OFFRES_PERIODES` porte les relations.

La comparaison avant/après de l'intégralité de `Planning_Periodes` confirme :

- zéro lien direct incorrect ;
- zéro modification inattendue d'une autre colonne historique ;
- aucune modification des calendriers en dehors de `Offre_formation` pour les 29 périodes autorisées.

## Contrôles de sécurité

La relecture finale confirme :

- types de colonnes et références conformes ;
- 14 références diplômes existantes et aucune référence invalide ;
- 43 références offre–période existantes et valides ;
- zéro soumission dans `EUC_SOUMISSIONS_PFMP` ;
- zéro ligne entreprise et contact dans la copie au moment du contrôle, et aucun appel d'écriture vers ces tables ;
- aucun accès au document de production ;
- aucun `clasp push`, version, déploiement, courriel, commit ou push Git.

Le jeton temporaire `/tmp/euc_pfmp_grist_token`, lu sans affichage et protégé en mode 600, a été supprimé après la vérification.

## Sauvegarde et restauration ciblée

La sauvegarde préalable est :

`proposals/pfmp-recette-backup-before-v1-2026-07-31T23-54-04-109Z.json`

Elle est en mode 600 et ne contient aucune clé API. Elle conserve les colonnes et lignes antérieures de `EUC_DIPLOMES`, `EUC_OFFRES_FORMATION` et `Planning_Periodes`. La table `EUC_OFFRES_PERIODES` n'existait pas avant l'opération.

Une restauration ciblée est donc possible : retirer les lignes créées dans les trois tables de référentiel, restaurer les valeurs antérieures de `Planning_Periodes.Offre_formation`, puis retirer les colonnes/table créées uniquement après une autorisation de retour arrière explicite. Aucun retour arrière n'a été exécuté.

Les résultats techniques des deux contrôles sont conservés dans :

- `proposals/pfmp-recette-alimentation-result-v1.json` ;
- `proposals/pfmp-recette-verification-v1.json`.
