# Incident de stockage Grist — audit DEV531 du 9 octobre 2026

## Décision immédiate

La croissance anormale est causée par des vues matérialisées techniques qui
conservent une nouvelle ligne JSON complète à chaque recalcul. Ces lignes ne
constituent pas l'historique métier des conventions : les lecteurs courants ne
consomment que la version active la plus récente.

Le correctif DEV531 est publié directement sur les deux Web Apps vertes en
version immuable `920`. Il remplace désormais le JSON de la ligne active, crée
une ligne uniquement lorsqu'une clé de cache est absente et filtre les lectures
Grist sur `Actif = true`. Les 25 routes vertes ont répondu correctement.

DEV532 corrige en plus la garde du reconstructeur : le projet vert utilise sa
cible Grist protégée configurée, comme DEV489, et non un ancien identifiant
codé dans Git. Son nettoyeur sécurisé est préparé mais la suppression attend
encore l'étape de confirmation finale.

## Inventaire exact sur la sauvegarde PFMP active

Une sauvegarde Grist complète avec historique du document Camin actif a été
téléchargée avant toute suppression. Taille : `431 001 600` octets ; SHA-256 :
`9eb2c4117ed93fda837bbe58766b9f569066916ee362e18720622e3ebe3dbc64`.

L'analyse SQLite hors ligne, limitée aux métadonnées et aux longueurs JSON,
établit le plan suivant :

| Table | Lignes actuelles | Clés actives conservées | Lignes candidates | JSON candidat |
| --- | ---: | ---: | ---: | ---: |
| `EUC_SUIVI_PFMP_INDEX` | 4 892 | 68 | 4 824 | 142 387 917 octets |
| `EUC_SUIVI_PFMP_DETAIL_SNAPSHOT` | 1 245 | 62 | 1 183 | 51 656 672 octets |
| **Total** | **6 137** | **130** | **6 007** | **194 044 589 octets** |

Chaque clé possède au moins une ligne active. Les 130 lignes conservées sont
les plus récentes par clé et leurs 130 JSON sont valides. Le plan ne touche à
aucune table métier.

## Mesures fournies par le diagnostic Grist

| Table | Lignes | Volume UTF-8 estimé |
| --- | ---: | ---: |
| `EUC_SUIVI_PFMP_INDEX` | 4 892 | 145,56 Mo |
| `EUC_SUIVI_PFMP_DETAIL_SNAPSHOT` | 1 245 | 54,57 Mo |
| `EUC_APPRENTISSAGE_DASHBOARD_SNAPSHOT` | 1 082 | 1,25 Mo |
| `EUC_SUIVI_PFMP_SNAPSHOT` | 3 242 | 0,72 Mo |

Les deux colonnes principales totalisent **199 580 538 octets** :

- `EUC_SUIVI_PFMP_INDEX.Payload_JSON` : 145 223 521 octets ;
- `EUC_SUIVI_PFMP_DETAIL_SNAPSHOT.Payload_JSON` : 54 357 017 octets.

Ces mesures sont des sommes UTF-8 accessibles, pas la taille interne officielle
du document Grist.

## Cause démontrée dans le code déployé

Le code contrôlé correspond au commit `fc34d47056fc`, publié sur les deux Web
Apps vertes en version immuable `919`.

### Écrivains append-only

1. `EUC_DEV190E_writeFamilyIndex_` désactive l'ancienne synthèse puis insère une
   nouvelle ligne portant le JSON complet d'une famille.
2. `EUC_DEV190I_syncOne` et `EUC_DEV190J_syncOne` font la même chose pour le
   détail complet d'une classe et d'une période.
3. `EUC_DEV424_writeFamily_` et `EUC_DEV424_writeDetails_` reproduisent ce
   remplacement par insertion sur les vues enrichies planifiées.
4. `EUC_DEV425_writeState_` stocke les états techniques `DIRTY` et `READY` dans
   la même table d'index en créant une ligne à chaque transition.
5. `EUC_DEV427_writeDetails_` stocke dans l'index un JSON complet par
   famille/classe/période et ajoute une nouvelle ligne à chaque reconstruction.

Une mutation ciblée de convention peut donc ajouter successivement un détail
complet, une synthèse familiale complète et deux états techniques. L'ancien
contenu est rendu inactif mais reste physiquement présent dans Grist.

### Déclencheurs et dépendances

- Les mutations de conventions utilisent `EUC_DEV425_beginMutation_` puis le
  recalcul et la publication `READY`.
- L'import JotForm utilise `EUC_DEV425_beginImportItems_` et
  `EUC_DEV425_finishMany_`.
- L'affectation du professeur principal utilise le même pipeline atomique.
- Les anciens imports et outils de réparation appellent encore
  `EUC_DEV315_clearCaches_`, puis `EUC_DEV190J_syncOne`.
- `EUC_DEV311_SnapshotAutoSync.js` appelle les synchronisations historiques de
  détail et de famille.
- L'outil historique `Snapshot_PFMP_Admin_V190.html` les expose encore comme
  actions manuelles.
- Le code sait installer un déclencheur `EUC_DEV424_refreshScheduled` toutes les
  quinze minutes. Sa présence effective sur le projet n'a pas pu être vérifiée
  avec les droits d'exécution disponibles ; elle reste à contrôler avant la
  publication.

## Contenu et rôle des JSON

- Le JSON familial contient les classes, périodes, compteurs et listes rapides
  nécessaires à la synthèse et aux infobulles.
- Le JSON de détail contient les lignes élèves, conventions, entreprises,
  responsables, tuteurs et professeurs d'une classe et d'une période.
- Les mêmes informations opérationnelles se retrouvent donc dans les tables
  métiers, le détail historique, le détail technique de l'index et le résumé
  familial.

Ces structures ont une utilité réelle de cache : elles évitent de reconstruire
toutes les jointures lors de chaque consultation. En revanche, leur historique
inactif n'est lu par aucun parcours courant contrôlé. La source de vérité reste
dans les tables métiers.

## Conséquences de performance démontrées

- L'ancien `EUC_DEV190I_activeRows_` récupère toute la table de détails puis la
  filtre localement pour une seule classe/période.
- Les lecteurs `EUC_DEV421_fastFamilySnapshot_`,
  `EUC_DEV426_rawFamilySnapshot_`, `EUC_DEV427_readDetail_`,
  `EUC_DEV425_readState_` et `EUC_DEV424_readEnrichedDetail_` ne filtraient pas
  tous `Actif` côté Grist.
- `EUC_DEV427_rawDetailMap_` et `EUC_DEV427_writeDetails_` pouvaient transférer
  toutes les versions annuelles de l'index avant de filtrer en mémoire.
- `EUC_DEV424_buildAll_` relisait toutes les versions annuelles du détail.

Cela démontre un transfert et un parsing inutiles de JSON historiques. Les
temps avant/après réels ne sont pas encore mesurés : aucune exécution de
production n'a été déclenchée pendant cet audit.

## Correctif DEV531 préparé

Le lot ne change ni les routes, ni les écrans, ni les tables métiers.

- Famille, détail et état technique sont mis à jour par `PATCH` sur la ligne
  active existante.
- `POST` n'est utilisé que si la clé de cache n'existe pas.
- Un contenu strictement identique n'est pas réécrit.
- Les lignes actives concurrentes d'une même clé sont réduites à un seul
  détenteur actif sans suppression physique.
- Les anciens écrivains DEV190 sont redirigés, lors de la construction du
  paquet, vers les mêmes upserts bornés.
- Les lectures concernées portent désormais le filtre serveur `Actif = true`.
- La synchronisation historique de détail utilise un verrou de script.
- Une journalisation non nominative indique l'écrivain, le mode
  `UNCHANGED/PATCH/CREATE_MISSING`, les octets UTF-8 du JSON et la durée.

La croissance attendue après publication est bornée au nombre de clés de cache,
au lieu d'être proportionnelle au nombre de mutations. Cette attente devra être
confirmée par une mesure réelle après publication.

## Tables secondaires

`EUC_APPRENTISSAGE_DASHBOARD_SNAPSHOT` conserve également des versions
successives, mais son volume mesuré est de 1,25 Mo et son contenu est agrégé.
Il s'agit d'une dette secondaire, pas de la cause des 199,58 Mo.

`EUC_SUIVI_PFMP_SNAPSHOT` est une structure ligne par élève/période, remplacée
par périmètre et mesurée à 0,72 Mo. Elle n'est pas la cause principale de
l'incident JSON.

## Nettoyage sécurisé proposé — non exécuté

1. Publier et valider le correctif de non-croissance avant toute suppression.
2. Sauvegarder le document entier ou, au minimum, exporter intégralement les
   deux tables avec manifeste : nombre de lignes, identifiants et empreintes.
3. Construire en lecture seule l'inventaire exact par clé :
   - index : `(Annee_scolaire, Famille)` ;
   - détail : `(Annee_scolaire, Famille, Classe_id, Periode_id)`.
4. Conserver la ligne active la plus récente de chaque clé et signaler toute
   clé sans détenteur actif ou avec plusieurs actifs.
5. Vérifier que chaque famille, classe et période attendue possède un cache
   courant lisible dans ADMIN et PUBLIC.
6. Soumettre à validation la liste exacte des identifiants inactifs et
   redondants. Aucune ligne ne doit être supprimée avant cet accord.
7. Après accord, supprimer uniquement les candidats vérifiés, contrôler les
   routes et comparer le document à la sauvegarde.
8. Mesurer le stockage officiel Grist. Une suppression logique ou physique peut
   ne pas réduire immédiatement le stockage interne ; une compaction ou une
   copie propre du document peut rester nécessaire avec l'assistance Grist.

Le maximum théorique récupérable est proche des 199,58 Mo moins la somme des
JSON actifs conservés. Le gain exact n'est pas calculable sans l'inventaire
production actif/inactif. Aucun pourcentage de récupération n'est donc garanti
à ce stade.

## Retour arrière

- Application : remettre les deux Web Apps sur la version immuable `919`.
- Données : restaurer les deux tables depuis les exports vérifiés ou revenir à
  la copie complète du document.
- Ne jamais mélanger rollback applicatif et suppression de données dans la même
  opération non contrôlée.

## Reste à vérifier

- présence et état réel du déclencheur planifié ;
- nombre exact de clés actives, doublons actifs et lignes inactives ;
- volume officiel Grist avant puis après nettoyage ;
- mesures de temps et d'appels réseau avant/après sur un parcours froid puis
  chaud ;
- stabilité concurrente ADMIN/PUBLIC après publication contrôlée.

## État de validation locale

- tests DEV531 : remplacement en place, non-réécriture identique, filtre actif
  et redirection des trois écrivains historiques ;
- tests ciblés réussis : vues rapides, import JotForm, affectations,
  géocodage, performances de workflow et contrat de livraison ;
- suite complète locale réussie : `749/749` ;
- aucun déploiement, aucune écriture production et aucune suppression réalisés.
