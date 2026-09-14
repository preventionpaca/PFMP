#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

STAMP="$(date +%Y%m%d_%H%M%S)"
SNAP_ROOT="$HOME/PFMP/_snapshots"
SNAP_DIR="$SNAP_ROOT/PFMP_${STAMP}"
ARCHIVE="$SNAP_ROOT/PFMP_${STAMP}.tar.gz"
TAG="pfmp-stable-${STAMP}"

mkdir -p "$SNAP_DIR"

echo "============================================================"
echo " PFMP — SNAPSHOT COMPLET AVANT OPTIMISATION"
echo "============================================================"
echo "Projet   : $HOME/PFMP"
echo "Snapshot : $SNAP_DIR"
echo "Archive  : $ARCHIVE"
echo "Tag Git  : $TAG"
echo "============================================================"

# ------------------------------------------------------------
# 1) Métadonnées système / projet
# ------------------------------------------------------------

{
  echo "=== DATE ==="
  date -Is
  echo
  echo "=== HOST ==="
  hostname
  echo
  echo "=== GIT ==="
  git --version 2>/dev/null || true
  echo
  echo "=== CLASP ==="
  clasp --version 2>/dev/null || true
  echo
  echo "=== NODE ==="
  node --version 2>/dev/null || true
} > "$SNAP_DIR/ENVIRONNEMENT.txt"

# ------------------------------------------------------------
# 2) État Apps Script / déploiements / versions
# ------------------------------------------------------------

{
  echo "=== clasp deployments ==="
  clasp deployments 2>&1 || true
  echo
  echo "=== clasp versions ==="
  clasp versions 2>&1 || true
  echo
  echo "=== .clasp.json ==="
  cat .clasp.json 2>/dev/null || true
} > "$SNAP_DIR/CLASP_ET_DEPLOIEMENTS.txt"

# ------------------------------------------------------------
# 3) Sauvegarde des sources utiles
# ------------------------------------------------------------

mkdir -p "$SNAP_DIR/sources"

for path in \
  apps-script \
  scripts \
  proposals \
  README.md \
  package.json \
  package-lock.json \
  .clasp.json
do
  if [ -e "$path" ]; then
    cp -a "$path" "$SNAP_DIR/sources/"
  fi
done

# ------------------------------------------------------------
# 4) Manifest SHA256
# ------------------------------------------------------------

(
  cd "$HOME/PFMP"
  find apps-script -type f -print0 2>/dev/null \
    | sort -z \
    | xargs -0 sha256sum
) > "$SNAP_DIR/SHA256_APPS_SCRIPT.txt"

# ------------------------------------------------------------
# 5) État Git complet
# ------------------------------------------------------------

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  {
    echo "=== git status --short ==="
    git status --short
    echo
    echo "=== git branch --show-current ==="
    git branch --show-current
    echo
    echo "=== git log -20 ==="
    git log --oneline --decorate -20
    echo
    echo "=== git diff --stat ==="
    git diff --stat
  } > "$SNAP_DIR/GIT_ETAT_AVANT_SNAPSHOT.txt"

  # Commit local de sauvegarde.
  git add -A
  if git diff --cached --quiet; then
    echo "Aucune modification Git à committer."
  else
    git commit -m "snapshot: PFMP avant optimisation performance ${STAMP}"
  fi

  # Tag local, sans push distant.
  if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "Tag déjà existant : $TAG"
  else
    git tag -a "$TAG" -m "PFMP stable avant optimisation performance ${STAMP}"
  fi

  git rev-parse HEAD > "$SNAP_DIR/GIT_COMMIT_HEAD.txt"
  git show --stat --oneline HEAD > "$SNAP_DIR/GIT_DERNIER_COMMIT.txt"
else
  echo "ATTENTION : ~/PFMP n'est pas encore un dépôt Git." | tee "$SNAP_DIR/GIT_NON_INITIALISE.txt"

  git init
  git add -A
  git commit -m "snapshot initial: PFMP avant optimisation performance ${STAMP}"
  git tag -a "$TAG" -m "PFMP stable avant optimisation performance ${STAMP}"

  git rev-parse HEAD > "$SNAP_DIR/GIT_COMMIT_HEAD.txt"
fi

# ------------------------------------------------------------
# 6) Copie du dernier audit performance s'il existe
# ------------------------------------------------------------

LATEST_AUDIT="$(find "$HOME/PFMP" -maxdepth 1 -type f -name 'AUDIT_PERF_PFMP_*.txt' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2- || true)"

if [ -n "$LATEST_AUDIT" ] && [ -f "$LATEST_AUDIT" ]; then
  cp "$LATEST_AUDIT" "$SNAP_DIR/"
fi

# ------------------------------------------------------------
# 7) Archive compacte, indépendante de Git
# ------------------------------------------------------------

tar -czf "$ARCHIVE" \
  --exclude='./node_modules' \
  --exclude='./_snapshots' \
  --exclude='./.git' \
  --exclude='./backup_*' \
  --exclude='./_scripts_recus' \
  .

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

# ------------------------------------------------------------
# 8) Créer une branche de travail locale dédiée aux performances
# ------------------------------------------------------------

BRANCH="perf/pfmp-${STAMP}"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git switch "$BRANCH"
else
  git switch -c "$BRANCH"
fi

cat > "$SNAP_DIR/RESTAURATION.txt" <<EOF
SNAPSHOT PFMP
=============

Commit Git stable :
$(git rev-parse "$TAG^{}")

Tag :
$TAG

Branche d'optimisation créée :
$BRANCH

Pour revenir exactement à l'état stable :
  cd ~/PFMP
  git switch --detach $TAG

Ou pour restaurer dans une branche :
  git switch -c restauration-$STAMP $TAG

Archive complète :
$ARCHIVE

Vérification archive :
  sha256sum -c "$ARCHIVE.sha256"

IMPORTANT :
- Aucun push Git distant n'a été effectué.
- Aucun clasp push / deploy n'a été effectué par ce script.
EOF

echo
echo "============================================================"
echo " SNAPSHOT TERMINE"
echo "============================================================"
echo "Tag Git       : $TAG"
echo "Branche perf  : $BRANCH"
echo "Snapshot      : $SNAP_DIR"
echo "Archive       : $ARCHIVE"
echo
echo "AUCUN PUSH DISTANT."
echo "AUCUN DEPLOIEMENT APPS SCRIPT."
echo "============================================================"
