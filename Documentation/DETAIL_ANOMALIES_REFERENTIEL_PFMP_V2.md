# Détail des anomalies du référentiel PFMP — V2

Date de révision : 31 juillet 2026  
Périmètre : copie Grist `j1jDArBkzi7P`, à partir des extractions locales en lecture seule  
Production exclue : `3pnVrygfNn7c`

## 1. Méthode et traçabilité

Cette révision rapproche systématiquement `Annee_scolaire + Formation + Niveau`. `Formation` n'est jamais interprétée seule. Les valeurs **source** sont enregistrées dans Grist ; les valeurs **utilisateur** sont les 38 libellés métier définitifs fournis ; les rapprochements, diplômes et rattachements de périodes sont **déduits ou proposés** et n'ont pas été écrits dans Grist.

L'année `2026-2027` est la seule année active dans l'extraction, mais son association aux classes reste déduite : `Classes` ne possède pas de référence d'année. `Mixité` est une modalité d'apprentissage, jamais un diplôme ni une 41e classe.

## 2. Résultat global des 38 classes autorisées

| Catégorie | Nombre |
|---|---:|
| Correspondance exacte | 28 |
| Correspondance normalisée certaine | 2 |
| Correspondance probable à valider | 0 |
| Classe introuvable | 8 |
| Plusieurs classes candidates | 0 |
| **Total** | **38** |

Le détail importable est dans `proposals/pfmp-classes-autorisees-proposees.csv`. Cette liste est une proposition d'alimentation du futur référentiel Grist ; elle ne doit pas devenir une constante HTML ou Apps Script.

## 3. Rapprochement exhaustif

`Périodes` indique les IDs source de `Planning_Periodes`. Les dates sont détaillées à la section 7.

|Libellé utilisateur|Classe Grist (ID ; code/libellé)|Clé planning proposée|Diplôme proposé|Public|Périodes|Classement / anomalie|
|---|---|---|---|---|---|---|
|1CAP CAR|1 ; `1CAP_CAR` / `1CAP CAR`|2026-2027 + CAP + 1 CA|CAP_CAR|choix scolaire/apprenti|285|exacte ; CA/CAR à confirmer|
|1CAR|3 ; `1CAR` / `1CAR`|2026-2027 + 1 BAC PRO + CPA|BAC_PRO_CAR|choix scolaire/apprenti|26, 34|exacte ; CPA/CAR à confirmer|
|1CIEL|4 ; `1CIEL` / `1CIEL`|2026-2027 + 1 BAC PRO + CIEL|BAC_PRO_CIEL|choix scolaire/apprenti|25, 33|exacte|
|1MELEC|5 ; `1MELEC` / `1MELEC`|2026-2027 + 1 BAC PRO + MELEC|BAC_PRO_MELEC|choix scolaire/apprenti|28, 36|exacte|
|1MP3D|7 ; `1MP3D` / `1MP3D`|2026-2027 + 1 BAC PRO + MP3|BAC_PRO_MP3D|choix scolaire/apprenti|29, 37|exacte ; MP3/MP3D à confirmer|
|1MT|8 ; `1MT` / `1MT`|2026-2027 + 1 BAC PRO + MT|BAC_PRO_MT|choix scolaire/apprenti|30, 38|exacte|
|1MVA1|9 ; `1MVA1` / `1MVA1`|2026-2027 + 1 BAC PRO + MVA|BAC_PRO_MVA|choix scolaire/apprenti|27, 35|exacte ; périodes partagées|
|1MVA2|10 ; `1MVA2` / `1MVA2`|idem|BAC_PRO_MVA|choix scolaire/apprenti|27, 35|exacte ; périodes partagées|
|1RMO|11 ; `1RMO` / `1RMO`|2026-2027 + 1 BAC PRO + RMO|BAC_PRO_RMO|choix scolaire/apprenti|31, 39|exacte|
|1RSP|12 ; `1RSP` / `1RSP`|2026-2027 + 1 BAC PRO + RSP|BAC_PRO_RSP|choix scolaire/apprenti|32, 40|exacte|
|2CAR|13 ; `2CAR` / `2CAR`|2026-2027 + 2 BAC PRO + CPA|BAC_PRO_CAR|choix scolaire/apprenti|137|exacte ; CPA/CAR à confirmer|
|2MP3D|14 ; `2MP3D` / `2MP3D`|2026-2027 + 2 BAC PRO + MP3D|BAC_PRO_MP3D|choix scolaire/apprenti|140|exacte|
|2MTNE1|15 ; `2MTNE1` / `2MTNE1`|2026-2027 + 2 BAC PRO + MTNE|à déterminer|choix scolaire/apprenti|141|exacte ; famille, diplôme final inconnu|
|2MTNE2|16 ; `2MTNE2` / `2MTNE2`|idem|à déterminer|choix scolaire/apprenti|141|exacte ; famille, diplôme final inconnu|
|2MVA1|17 ; `2MVA1` / `2MVA1`|2026-2027 + 2 BAC PRO + MVA|BAC_PRO_MVA|choix scolaire/apprenti|138|exacte ; période partagée|
|2MVA2|18 ; `2MVA2` / `2MVA2`|idem|BAC_PRO_MVA|choix scolaire/apprenti|138|exacte ; période partagée|
|2REMI1|19 ; `2REMI1` / `2REMI1`|2026-2027 + 2 BAC PRO + REMI|à déterminer|choix scolaire/apprenti|139|exacte ; famille, diplôme final inconnu|
|2REMI2|20 ; `2REMI2` / `2REMI2`|idem|à déterminer|choix scolaire/apprenti|139|exacte ; famille, diplôme final inconnu|
|TCAP CAR|23 ; `TCAP_CAR` / `TCAP CAR`|2026-2027 + CAP + T CA|CAP_CAR|choix scolaire/apprenti|284, 287|exacte ; CA/CAR à confirmer|
|TCAR|24 ; `TCAR` / `TCAR`|2026-2027 + T BAC PRO + CPA|BAC_PRO_CAR|choix scolaire/apprenti|10, 62|exacte ; CPA/CAR à confirmer|
|TCIEL|25 ; `TCIEL` / `TCIEL`|2026-2027 + T BAC PRO + CIEL|BAC_PRO_CIEL|choix scolaire/apprenti|9, 61|exacte|
|TMELEC|26 ; `TMELEC` / `TMELEC`|2026-2027 + T BAC PRO + MELEC|BAC_PRO_MELEC|choix scolaire/apprenti|12, 64|exacte ; périodes partagées|
|TMP3D|28 ; `TMP3D` / `TMP3D`|2026-2027 + T BAC PRO + MP3D|BAC_PRO_MP3D|choix scolaire/apprenti|13, 65|exacte|
|TMT|29 ; `TMT` / `TMT`|2026-2027 + T BAC PRO + MT|BAC_PRO_MT|choix scolaire/apprenti|14, 66|exacte|
|TMVA1|30 ; `TMVA1` / `TMVA1`|2026-2027 + T BAC PRO + MVA|BAC_PRO_MVA|choix scolaire/apprenti|11, 63|exacte ; périodes partagées|
|TMVA2|31 ; `TMVA2` / `TMVA2`|idem|BAC_PRO_MVA|choix scolaire/apprenti|11, 63|exacte ; périodes partagées|
|TRMO|32 ; `TRMO` / `TRMO`|2026-2027 + T BAC PRO + RMO|BAC_PRO_RMO|choix scolaire/apprenti|15, 67|exacte|
|TRSP|33 ; `TRSP` / `TRSP`|2026-2027 + T BAC PRO + RSP|BAC_PRO_RSP|choix scolaire/apprenti|16, 68|exacte|
|1BTS CPI|absente|2026-2027 + 1BTS + CPI|BTS_CPI|choix scolaire/apprenti|273|introuvable ; période scolaire reconnue|
|2BTS CPI|absente|2026-2027 + 2BTS CPI-CPRP + Mixité|BTS_CPI|choix scolaire/apprenti|—|introuvable ; calendrier apprenti partagé seulement|
|1BTS CPRP|absente|2026-2027 + 1BTS + CPRP|BTS_CPRP|choix scolaire/apprenti|272|introuvable ; période scolaire reconnue|
|2BTS CPRP|absente|2026-2027 + 2BTS CPI-CPRP + Mixité|BTS_CPRP|choix scolaire/apprenti|—|introuvable ; calendrier apprenti partagé seulement|
|1BTS MV|absente|2026-2027 + 1BTS + MV ; 1BTS MV + Mixité|BTS_MV|choix scolaire/apprenti|275, 278|introuvable ; 278 est en mixité|
|2BTS MV|absente|2026-2027 + 2BTS + MV|BTS_MV|choix scolaire/apprenti|277|introuvable ; période scolaire reconnue|
|1BTS ELEC|39 ; code vide / `1BTS ELEC Alt`|2026-2027 + 1BTS + ELEC|BTS_ELEC|choix scolaire/apprenti|274|normalisée certaine ; suffixe `Alt` conservé|
|2BTS ELEC|40 ; code vide / `2BTS ELEC Alt`|aucune période scolaire trouvée|BTS_ELEC|choix scolaire/apprenti|—|normalisée certaine ; suffixe `Alt` conservé|
|1BTS CIEL|absente|2026-2027 + 1BTS + CIEL|BTS_CIEL|choix scolaire/apprenti|271|introuvable ; période scolaire reconnue|
|2BTS CIEL|absente|aucune période scolaire trouvée|BTS_CIEL|choix scolaire/apprenti|—|introuvable|

## 4. Classes absentes et exclues

Classes autorisées absentes de `Classes` : `1BTS CPI`, `2BTS CPI`, `1BTS CPRP`, `2BTS CPRP`, `1BTS MV`, `2BTS MV`, `1BTS CIEL`, `2BTS CIEL`.

Il ne reste **aucune classe ambiguë pour le formulaire**. L'ancienne ambiguïté `TMELEC G` est résolue par la décision métier de l'exclure. Les IDs 27 et 38 restent inchangés dans l'historique.

|ID|Code / nom source|Structure probable|Pourquoi exclue du formulaire|Périodes éventuelles|
|---:|---|---|---|---|
|2|`1CAPP` / 1CAPP|classe historique|exclusion métier définitive|aucune PFMP scolaire certaine|
|6|`1MELEC_G` / 1MELEC G|groupe ou ancienne variante|absente des 38 autorisées|28, 36 par rapprochement textuel|
|27|`TMELEC_G` / TMELEC G|classe/groupe historique|exclusion métier définitive|12, 64 par rapprochement textuel|
|34|vide / TPMMA|autre titre/structure, à confirmer|absente des 38|aucune PFMP reconnue|
|35|vide / TSEC|Ducretet/alternance probable|absente des 38|38 lignes `ENT.`, pas de PFMP scolaire|
|36|vide / CQPM ASC|certification/CFA-CFAI possible, non prouvé|absente des 38|aucune PFMP reconnue|
|37|vide / 1MELEC G|doublon historique probable de 6|absente des 38|28, 36 par texte|
|38|vide / TMELEC G|doublon historique probable de 27|exclusion métier définitive|12, 64 par rapprochement textuel|

« Exclue » signifie seulement non proposée dans ce formulaire et `Afficher_formulaire_PFMP=false` : aucune suppression, fusion, désactivation historique ou modification des calendriers n'est recommandée. Les IDs exclus sont 2, 6, 27, 34, 35, 36, 37 et 38.

## 5. Scolaire et apprenti

Le sélecteur de classe contient les mêmes offres métier, puis l'utilisateur choisit `Scolaire` ou `Apprenti`.

- Scolaire : charger les périodes officielles reliées à la classe et proposer dates normales, écart partiel, report/rattrapage.
- Apprenti : demander les dates réelles de début et de fin ; ne jamais générer « Année complète » ; autoriser une entrée/sortie en cours d'année et la reprise d'une entreprise existante.
- Les 262 lignes `ENT.` décrivent des rythmes d'entreprise ou de mixité. Elles apportent du contexte, mais ne deviennent ni PFMP officielles ni classes supplémentaires.

Répartition source des 262 lignes `ENT.` : CAP Connexe/CP 55 ; 1 BAC PRO/Mixité 35 ; T BAC PRO/Mixité 29 ; 1BTS CPI-CPRP/Mixité 36 ; 2BTS CPI-CPRP/Mixité 5 ; 1BTS MV/Mixité 33 ; 2BTS MV/Mixité 19 ; BACHELOR/IP 12 ; Ducretet/TSEC 38.

## 6. CPI et CPRP

Les quatre classes restent distinctes. Les lignes `1BTS/CPI` et `1BTS/CPRP` sont des stages scolaires distincts. Les 36 lignes `1BTS CPI-CPRP/Mixité` et les 5 lignes `2BTS CPI-CPRP/Mixité` sont des calendriers d'apprentis partagés : elles peuvent concerner deux offres sans les fusionner.

|Source Planning_Periodes|Dates / volume|Classes candidates|Statut|
|---|---|---|---|
|ID 273, `1BTS + CPI`, Stage BTS|10/05/2027 → 02/07/2027|1BTS CPI|scolaire|
|ID 272, `1BTS + CPRP`, Stage BTS|10/05/2027 → 02/07/2027|1BTS CPRP|scolaire|
|`1BTS CPI-CPRP + Mixité`, `ENT.`|36 lignes, 05/10/2026 → 31/08/2027|1BTS CPI et 1BTS CPRP|apprentissage partagé|
|`2BTS CPI-CPRP + Mixité`, `ENT.`|5 lignes, 12/10/2026 → 03/09/2027|2BTS CPI et 2BTS CPRP|apprentissage partagé|

Il n'existe pas de Stage BTS scolaire identifié pour `2BTS CPI` ou `2BTS CPRP`. Une relation plusieurs-à-plusieurs est nécessaire pour représenter un calendrier partagé sans fusionner les offres.

## 7. Périodes officielles par classe

Les 47 lignes PFMP/Stage du périmètre restent reconnues. Le tableau suivant regroupe les périodes retenues pour le futur formulaire ; les visites et périodes différenciées restent des événements de calendrier, pas nécessairement des choix de période principale.

|Classes|IDs|Dates officielles source|
|---|---|---|
|1CAP CAR|285|24/05/2027 → 02/07/2027|
|TCAP CAR|287 ; 284|16/11/2026 → 04/12/2026 ; 15/03/2027 → 09/04/2027|
|1CAR, 1CIEL, 1MELEC, 1MP3D, 1MT, 1MVA1/2, 1RMO, 1RSP|26–32 ; 33–40|23/11/2026 → 18/12/2026 ; 22/03/2027 → 16/04/2027|
|2CAR, 2MP3D, 2MTNE1/2, 2MVA1/2, 2REMI1/2|137–141|24/05/2027 → 02/07/2027|
|TCAR, TCIEL, TMELEC, TMP3D, TMT, TMVA1/2, TRMO, TRSP|61–68 ; 9–16|28/09/2026 → 16/10/2026 ; 18/01/2027 → 05/02/2027|
|1BTS CIEL (271)|271|24/05/2027 → 02/07/2027|
|1BTS CPRP (272)|272|10/05/2027 → 02/07/2027|
|1BTS CPI (273)|273|10/05/2027 → 02/07/2027|
|1BTS ELEC (274)|274|24/05/2027 → 02/07/2027|
|1BTS MV (275)|275|31/05/2027 → 02/07/2027|
|2BTS MV (277)|277|16/11/2026 → 18/12/2026|
|1BTS MV mixité (278)|278|31/05/2027 → 31/08/2027 ; contexte apprentissage à valider|

`2BTS CPI`, `2BTS CPRP`, `2BTS ELEC` et `2BTS CIEL` n'ont pas de période scolaire officielle identifiée. Les six anciennes « périodes BTS orphelines » 271, 272, 273, 275, 277 et 278 sont désormais **toutes reconnues sémantiquement** ; l'absence de certaines classes dans `Classes` est un problème de référentiel, pas une période orpheline.

## 8. Périodes partagées révisées

|IDs|Offres autorisées concernées|Conclusion|
|---|---|---|
|11, 63|TMVA1, TMVA2|partage confirmé|
|12, 64|TMELEC uniquement|corrigé : `TMELEC G` est exclue|
|27, 35|1MVA1, 1MVA2|partage confirmé|
|28, 36|1MELEC uniquement|corrigé : `1MELEC G` n'est pas autorisée|
|138|2MVA1, 2MVA2|partage confirmé|
|139|2REMI1, 2REMI2|partage confirmé|
|141|2MTNE1, 2MTNE2|partage confirmé|

Les calendriers `CPI-CPRP + Mixité` constituent en plus un cas de partage entre offres apprenties distinctes. Le nombre de relations proposé pour les seules périodes listées dans le CSV est **54**, dont **43 certaines** et **11 à valider** : 10 rapprochements `CAR↔CPA↔CA` ou `MP3↔MP3D`, plus la relation mixité ID 278. Le total devra être recalculé lors de l'alimentation, après décisions métier et qualification précise des lignes `ENT.`.

## 9. Diplômes révisés

|Code proposé|Libellé complet proposé|Classes|Niveau / spécialité|Origine et confiance|Décision|
|---|---|---|---|---|---|
|CAP_CAR|CAP Carrossier automobile|1CAP CAR, TCAP CAR|CAP carrosserie|codes CAR/CA, probable|valider intitulé et équivalence CA|
|BAC_PRO_CAR|Bac pro Carrossier peintre automobile|1CAR, 2CAR, TCAR|Bac pro carrosserie|CAR/CPA, probable|confirmer CPA=CAR|
|BAC_PRO_CIEL|Bac pro Cybersécurité, Informatique et réseaux, Électronique|1CIEL, TCIEL|Bac pro numérique/électronique|CIEL, élevée|valider libellé officiel local|
|BAC_PRO_MELEC|Bac pro Métiers de l'électricité et de ses environnements connectés|1MELEC, TMELEC|Bac pro électricité|MELEC, élevée|valider libellé officiel local|
|BAC_PRO_MP3D|Bac pro Modélisation et prototypage 3D|1MP3D, 2MP3D, TMP3D|Bac pro conception|MP3/MP3D, probable|confirmer équivalence|
|BAC_PRO_MT|Bac pro Microtechniques|1MT, TMT|Bac pro microtechniques|MT, moyenne|valider intitulé|
|BAC_PRO_MVA|Bac pro Maintenance des véhicules, option voitures particulières|1MVA1/2, 2MVA1/2, TMVA1/2|Bac pro automobile|MVA, probable|confirmer option|
|BAC_PRO_RMO|Bac pro Réalisation de produits mécaniques, option réalisation et maintenance des outillages|1RMO, TRMO|Bac pro mécanique|RMO, probable|valider intitulé|
|BAC_PRO_RSP|Bac pro Réalisation de produits mécaniques, option réalisation et suivi de productions|1RSP, TRSP|Bac pro mécanique|RSP, probable|valider intitulé|
|BTS_CPI|BTS Conception de produits industriels|1BTS CPI, 2BTS CPI|BTS conception|planning CPI, élevée|créer les offres distinctes plus tard|
|BTS_CPRP|BTS Conception des processus de réalisation de produits|1BTS CPRP, 2BTS CPRP|BTS production|planning CPRP, élevée|créer les offres distinctes plus tard|
|BTS_MV|BTS Maintenance des véhicules|1BTS MV, 2BTS MV|BTS automobile|planning MV, élevée|confirmer option et modalités|
|BTS_ELEC|BTS Électrotechnique|1BTS ELEC, 2BTS ELEC|BTS électricité|ELEC/Alt, élevée|confirmer régime `Alt`|
|BTS_CIEL|BTS Cybersécurité, Informatique et réseaux, Électronique|1BTS CIEL, 2BTS CIEL|BTS numérique/électronique|planning CIEL, élevée|valider intitulé|

`MTNE` et `REMI` sont des familles de seconde : leur diplôme final doit être déterminé pour chaque parcours. `CPI-CPRP` est un regroupement de calendrier, pas un diplôme. `Mixité` est une modalité.

## 10. Pilotage dynamique recommandé

Ajouter ultérieurement à `EUC_OFFRES_FORMATION` une colonne `Afficher_formulaire_PFMP` de type `Bool`, valeur par défaut `false`. Une offre serait visible seulement si son année est active, si l'offre est active et si ce booléen vaut vrai. Cela permet de faire évoluer les classes chaque année sans modifier le HTML ni Apps Script. La classe affichée doit provenir de Grist ; le CSV sert uniquement à préparer la validation et l'alimentation initiale.

## 11. Table de liaison recommandée

`EUC_OFFRES_PERIODES` est nécessaire : une offre a plusieurs périodes et une période peut servir plusieurs offres.

|Colonne|Type|Rôle|
|---|---|---|
|`Offre_formation`|`Ref:EUC_OFFRES_FORMATION`|offre distincte, y compris CPI et CPRP|
|`Periode`|`Ref:Planning_Periodes`|période source, dates non recopiées|
|`Active`|Bool|activation réversible|
|`Statut_public`|Choice (`Scolaire`, `Mixité/apprentissage`, éventuellement `Contexte seulement`)|nécessaire seulement pour empêcher qu'un calendrier apprenti soit proposé comme PFMP scolaire|
|`Cle_doublon`|Text ou formule|clé fonctionnelle `{offreId}:{periodeId}:{statut}` contrôlée avant insertion|
|`Commentaire`|Text|justification administrative|

Périmètre proposé : 47 périodes PFMP/Stage reconnues au total ; 54 relations candidates dans la proposition ciblée, 43 certaines et 11 à valider. Les lignes `ENT.` ne doivent être ajoutées à la liaison qu'après décision sur leur usage fonctionnel.

## 12. Révision du premier audit

|Sujet|Avant correction|Après correction|Statut|
|---|---|---|---|
|Six périodes BTS 271/272/273/275/277/278|orphelines|toutes reconnues via année + formation + niveau|**invalidé/corrigé**|
|Cinq classes sans période|2, 34, 35, 36, 40|1CAPP et 34–36 sont exclus ; 2BTS ELEC reste autorisée sans période|**corrigé**|
|ID 2 `1CAPP`|qualification envisagée|exclusion métier définitive du formulaire, historique conservé|**résolu par exclusion**|
|IDs 34, 35, 36|classes historiques à qualifier|hors liste des 40, exclues du sélecteur uniquement|**confirmé et précisé**|
|ID 40 `2BTS ELEC Alt`|sans période, alternance possible|correspondance normalisée à 2BTS ELEC ; période scolaire absente|**corrigé**|
|Doublon 6/37|conserver 6, désactiver 37 proposé|les deux sont hors liste ; aucune désactivation avant audit des usages textuels|**corrigé**|
|Doublon 27/38|choix canonique envisagé|les deux lignes TMELEC G sont exclues du formulaire et conservées|**résolu par exclusion**|
|CAR/CPA/CA|équivalence probable|toujours probable, non normalisée en source|**encore indéterminé**|
|MP3/MP3D|équivalence probable|toujours probable, non normalisée en source|**encore indéterminé**|
|Onze périodes partagées|11 groupes, jusqu'à 3 classes MELEC|partage fonctionnel révisé : 1MELEC G et TMELEC G exclues|**corrigé**|
|47 PFMP/Stage|reconnues|reconnues ; rattachements affinés|**confirmé**|
|262 `ENT.`|alternance probable|calendriers entreprise/mixité, pas PFMP automatiques|**confirmé et précisé**|
|ID 235|examen TSEC hors PFMP|toujours hors PFMP ; année vide à traiter dans l'audit calendrier|**confirmé**|

## 13. Décisions humaines restantes

1. Confirmer les équivalences métier `CAR=CPA=CA` et `MP3=MP3D`.
2. Déterminer les diplômes finaux derrière les familles `2MTNE1/2` et `2REMI1/2`.
3. Confirmer le régime `Alt` des deux BTS ELEC et les périodes scolaires manquantes de 2BTS CPI, CPRP, ELEC et CIEL.
4. Décider si la période 278 est proposée aux apprentis comme repère ou conservée comme simple contexte.
5. Valider les 11 relations de liaison non certaines avant toute écriture.

## 14. Garanties de cette étape

Aucune écriture Grist, modification de schéma, création de table, lecture de la production, modification de propriété Apps Script, commande `clasp push`, version, déploiement, courriel, commit ou push Git n'a été effectué. Les fichiers produits sont des propositions locales uniquement.
