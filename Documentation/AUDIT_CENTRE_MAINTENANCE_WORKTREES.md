# Audit du Centre de maintenance — prise en charge des worktrees

Date : 2 août 2026
Centre installé : `/home/rudy/.local/share/prevention-paca-centre-maintenance`
Version déclarée par `VERSION.txt` : **3.5.1**.

## Constat avant correction

Le projet PFMP n’est pas configuré dans `~/.config/prevention-paca-centre-maintenance/projects.d`. Le seul projet actuellement déclaré est Prévention PACA. Par conséquent, aucune action du centre ne sauvegarde aujourd’hui `/home/rudy/Documents/SIRET_PFMP/PFMP`.

L’action « Fin de journée » appelle seulement `dev_session_close`. Elle crée un snapshot **textuel** dans l’état local du centre : état Git, CLASP, fichiers récemment modifiés et contexte de session. Elle ne copie pas physiquement le projet et n’appelle pas `sauvegarder-projet.sh`.

La fonction `dev_find_git_root` ne reconnaît que les dossiers contenant un répertoire `.git`. Elle ne reconnaît pas le fichier `.git` d’un worktree lié et n’exécute pas `git worktree list --porcelain`.

Le script `sauvegarder-projet.sh` copie physiquement `LOCAL_ROOT` avec `rsync`, donc inclut les modifications suivies et les fichiers non suivis situés sous cette racine. Il ne détecte pas un worktree frère situé hors de `LOCAL_ROOT`. Le script `restaurer-projet.sh` restaure une seule racine et ne reconstruit aucun worktree.

Conclusion : le worktree `/home/rudy/Documents/SIRET_PFMP/PFMP-calendriers` et ses modifications non commitées seraient actuellement ignorés par « Fin de journée » comme par une sauvegarde PFMP limitée au worktree principal.

## Correctif précis proposé — version 3.5.2

Le centre est installé hors du périmètre d’écriture du dépôt PFMP et n’est pas lui-même un dépôt Git. Il n’a donc pas été modifié automatiquement. La correction doit être appliquée à son paquet source officiel, puis installée normalement.

### Fichiers à modifier

- `VERSION.txt` : passer à `3.5.2` ;
- `scripts/lib.sh` : en-tête et `APP_VERSION` à `3.5.2` ;
- `scripts/fin-de-journee.sh` : version `3.5.2` et déclenchement contrôlé de la sauvegarde physique avant le snapshot textuel ;
- `scripts/sauvegarder-projet.sh` : version `3.5.2`, découverte et copie séparée des worktrees ;
- `scripts/restaurer-projet.sh` : version `3.5.2`, restauration puis reconstruction contrôlée des worktrees ;
- `scripts/preparer-poste.sh` et `scripts/verifier-installation.sh` : version attendue `3.5.2` ;
- ajouter `CHANGELOG_v3.5.2.txt` et `RAPPORT_VALIDATION_v3.5.2.txt`.

### Fonctions à ajouter dans `scripts/lib.sh`

1. `git_root_from_path PATH` doit utiliser `git -C "$PATH" rev-parse --show-toplevel`. Cette méthode reconnaît un dépôt principal et un worktree dont `.git` est un fichier.
2. `git_worktrees_porcelain PATH` doit exécuter `git -C "$root" worktree list --porcelain` et retourner chaque champ `worktree`, `HEAD`, `branch`, `detached`, `locked` et `prunable` sans interprétation de contenu utilisateur.
3. `project_valid_worktrees` doit conserver uniquement les chemins absolus accessibles appartenant au même répertoire Git commun, obtenu avec `git rev-parse --git-common-dir`.
4. `safe_worktree_copy SRC DST` doit utiliser `rsync -a` avec lecture des `.gitignore` et exclusions de sécurité explicites : `.clasprc.json`, `.clasp-credentials.json`, `.env`, `.env.*`, `*.token`, `*.pem`, `*.key`, journaux, temporaires, caches, imports Pronote et exports réels. Le fichier `.git` d’un worktree lié ne doit jamais être copié comme contenu physique.
5. `worktree_manifest_write` doit produire un manifeste non sensible contenant uniquement un identifiant séquentiel, le chemin, la branche ou l’état détaché et le commit.

### Modification de `sauvegarder-projet.sh`

- Continuer à sauvegarder le worktree principal dans `Projet_courant`.
- Créer `Worktrees_courants/manifest.tsv`.
- Pour chaque worktree secondaire valide, copier séparément son contenu physique dans `Worktrees_courants/wt-NNN/fichiers`, sans `.git` et avec les exclusions de sécurité.
- Inclure le même ensemble dans chaque archive datée sous `Archives/<date>/Worktrees`.
- Ne copier les objets Git partagés qu’une seule fois, depuis le dépôt principal ; ne jamais recopier le répertoire commun dans chaque worktree.
- Journaliser uniquement le chemin, la branche, le commit et le résultat de chaque copie. Ne journaliser aucune valeur de propriété, jeton ou contenu de fichier.
- Signaler tout worktree inaccessible, verrouillé, incomplet ou marqué `prunable` sans le supprimer.

### Modification de `fin-de-journee.sh`

Avant `dev_session_close`, appeler `sauvegarder-projet.sh "$PROJECT_ID"`. En cas d’échec de la sauvegarde physique, afficher une erreur claire et ne pas annoncer que les fichiers ont été sauvegardés. Après réussite, créer le snapshot textuel et afficher la liste des worktrees sauvegardés.

### Modification de `restaurer-projet.sh`

1. Restaurer d’abord le dépôt/worktree principal sans détruire la copie préalable existante.
2. Lire le manifeste des worktrees.
3. Vérifier que chaque chemin cible est absolu, distinct de `/`, de `$HOME` et de `LOCAL_ROOT`.
4. Si le worktree est déjà déclaré et accessible, restaurer ses fichiers physiques sans toucher à son fichier `.git`.
5. S’il est absent et que sa branche existe, le reconstruire avec `git worktree add PATH BRANCHE`, puis restaurer ses fichiers.
6. Si le chemin contient des fichiers utiles ou si la branche/path est ambigu, arrêter ce worktree sans `--force` et demander une décision humaine.
7. Ne jamais exécuter `git clean`, `git reset`, `git checkout --` ou supprimer un worktree automatiquement.

### Configuration PFMP à créer après installation de la correction

Créer une fiche projet dédiée avec :

- `PROJECT_ID="eucalyptus-pfmp"` ;
- `PROJECT_NAME="Eucalyptus PFMP"` ;
- `LOCAL_ROOT="/home/rudy/Documents/SIRET_PFMP/PFMP"` ;
- `GITHUB_PATH="."` ;
- `APPS_SCRIPT_PATH="apps-script"` ;
- destination de sauvegarde à choisir explicitement par Rudy avant activation.

Aucun identifiant Grist, jeton, adresse nominative ni secret ne doit être inscrit dans cette fiche.

## Tests exigés pour v3.5.2

- `bash -n` et, si disponible, `shellcheck` sur tous les scripts modifiés ;
- fixture temporaire comportant un dépôt principal et deux worktrees ;
- détection des trois chemins par `git worktree list --porcelain` ;
- détection et copie d’un fichier non suivi non ignoré dans le second worktree ;
- exclusion d’un faux `.clasprc.json`, d’un faux `.env` et d’un faux fichier `*.token` ;
- absence de la valeur factice de secret dans les journaux ;
- restauration des fichiers physiques dans les worktrees existants ;
- reconstruction d’un worktree absent sans `--force` ;
- arrêt sûr lorsque le chemin cible contient des fichiers ;
- compatibilité d’une sauvegarde/restauration d’un projet sans worktree ;
- aucune suppression d’archive existante au-delà de la politique de rétention déjà configurée.
