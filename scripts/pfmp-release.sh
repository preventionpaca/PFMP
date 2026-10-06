#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_file="$repo_root/scripts/pfmp-release-config.json"
git_dir="$(git -C "$repo_root" rev-parse --absolute-git-dir)"
candidate_file="$git_dir/pfmp-release-candidate.json"
last_release_file="$git_dir/pfmp-release-last.json"

cfg() {
  node -e "const c=require(process.argv[1]); console.log($2);" "$config_file"
}

development_id="$(cfg config_file 'c.channels.development.deploymentId')"
admin_id="$(cfg config_file 'c.channels.stableAdmin.deploymentId')"
public_id="$(cfg config_file 'c.channels.stablePublic.deploymentId')"

usage() {
  cat <<'EOF'
Usage: scripts/pfmp-release.sh COMMAND

  prepare           construit et publie uniquement le canal bleu /dev
  check-development contrôle les 25 routes du canal bleu
  check-stable      contrôle les 25 routes du canal vert
  promote           promeut exactement le candidat bleu vers les URLs stables
  rollback VERSION  replace les deux URLs stables sur une version immuable
  status            affiche les déploiements et le candidat préparé
EOF
}

tree_hash() {
  local app_dir="$1/apps-script"
  (
    cd "$app_dir"
    find . -maxdepth 1 -type f \
      \( -name '*.js' -o -name '*.gs' -o -name '*.html' -o -name 'appsscript.json' \) \
      -print0 | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}'
  )
}

new_release_clone() {
  local release_root
  # Chromium installé par Snap ne peut pas lire les fichiers sous /tmp.
  # La copie reste hors du dépôt, mais dans le même répertoire utilisateur.
  release_root="$(mktemp -d "$(dirname "$repo_root")/pfmp-release.XXXXXX")"
  git clone --quiet --shared --no-hardlinks "$repo_root" "$release_root/repo"
  git -C "$release_root/repo" checkout --quiet "$(git -C "$repo_root" rev-parse HEAD)"
  printf '%s\n' "$release_root"
}

build_package() {
  local clone_root="$1"
  local package_dir="$2"
  "$clone_root/scripts/build-pfmp-apps-script-package.sh" "$package_dir" >/dev/null
}

pull_remote() {
  local package_dir="$1"
  local remote_dir="$2"
  cp "$package_dir/.clasp.json" "$remote_dir/.clasp.json"
  (cd "$remote_dir" && clasp pull >/dev/null)
}

write_candidate() {
  local commit="$1"
  local hash="$2"
  node -e '
    const fs=require("fs");
    fs.writeFileSync(process.argv[1], JSON.stringify({
      commit:process.argv[2],
      treeHash:process.argv[3],
      preparedAt:new Date().toISOString(),
      channel:"development"
    }, null, 2)+"\n");
  ' "$candidate_file" "$commit" "$hash"
}

read_candidate_field() {
  node -e 'const x=require(process.argv[1]); console.log(x[process.argv[2]]||"");' \
    "$candidate_file" "$1"
}

deployment_version() {
  local deployments="$1"
  local id="$2"
  awk -v wanted="$id" '$2==wanted {gsub(/^@/, "", $3); print $3}' <<<"$deployments"
}

deploy_version() {
  local package_dir="$1"
  local id="$2"
  local version="$3"
  local description="$4"
  (cd "$package_dir" && clasp deploy \
    --deploymentId "$id" \
    --versionNumber "$version" \
    --description "$description")
}

prepare() {
  local commit release_root clone_root package_dir remote_dir package_hash remote_hash
  commit="$(git -C "$repo_root" rev-parse HEAD)"
  release_root="$(new_release_clone)"
  clone_root="$release_root/repo"
  package_dir="$release_root/package"
  remote_dir="$release_root/remote"
  mkdir -p "$package_dir" "$remote_dir"

  echo "[1/5] Tests complets du commit $commit"
  (cd "$clone_root" && node tests/run-tests.js)
  echo "[2/5] Construction du paquet complet"
  build_package "$clone_root" "$package_dir"
  package_hash="$(tree_hash "$package_dir")"
  echo "[3/5] Publication sur HEAD uniquement (canal bleu)"
  (cd "$package_dir" && clasp push)
  echo "[4/5] Relecture distante"
  pull_remote "$package_dir" "$remote_dir"
  remote_hash="$(tree_hash "$remote_dir")"
  [[ "$package_hash" == "$remote_hash" ]] || {
    echo "Le contenu distant diffère du paquet candidat." >&2
    exit 1
  }
  echo "[5/5] Contrôle HTTP des routes du canal bleu"
  (cd "$clone_root" && node scripts/verify-pfmp-release.js --channel development)
  write_candidate "$commit" "$package_hash"
  echo
  echo "Candidat bleu prêt. Les déploiements verts n'ont pas été modifiés."
  echo "URL de test : https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/$development_id/dev?page=admin-pfmp"
}

promote() {
  [[ -f "$candidate_file" ]] || {
    echo "Aucun candidat bleu préparé. Lancez prepare." >&2
    exit 1
  }

  local commit candidate_commit candidate_hash release_root clone_root package_dir
  local remote_dir package_hash remote_hash deployments admin_previous public_previous
  local version_output version description promoted_admin promoted_public
  commit="$(git -C "$repo_root" rev-parse HEAD)"
  candidate_commit="$(read_candidate_field commit)"
  candidate_hash="$(read_candidate_field treeHash)"
  [[ "$commit" == "$candidate_commit" ]] || {
    echo "Le commit courant n'est plus le candidat bleu validé." >&2
    exit 1
  }

  release_root="$(new_release_clone)"
  clone_root="$release_root/repo"
  package_dir="$release_root/package"
  remote_dir="$release_root/remote"
  mkdir -p "$package_dir" "$remote_dir"

  echo "[1/6] Tests complets avant promotion"
  (cd "$clone_root" && node tests/run-tests.js)
  build_package "$clone_root" "$package_dir"
  package_hash="$(tree_hash "$package_dir")"
  [[ "$package_hash" == "$candidate_hash" ]] || {
    echo "Le paquet local n'est plus le candidat validé." >&2
    exit 1
  }
  echo "[2/6] Comparaison avec le HEAD distant"
  pull_remote "$package_dir" "$remote_dir"
  remote_hash="$(tree_hash "$remote_dir")"
  [[ "$remote_hash" == "$candidate_hash" ]] || {
    echo "Le HEAD distant a changé depuis la recette bleue." >&2
    exit 1
  }
  echo "[3/6] Nouveau contrôle du canal bleu"
  (cd "$clone_root" && node scripts/verify-pfmp-release.js --channel development)

  deployments="$(cd "$package_dir" && clasp deployments)"
  admin_previous="$(deployment_version "$deployments" "$admin_id")"
  public_previous="$(deployment_version "$deployments" "$public_id")"
  [[ "$admin_previous" =~ ^[0-9]+$ && "$public_previous" =~ ^[0-9]+$ ]] || {
    echo "Versions stables précédentes introuvables." >&2
    exit 1
  }

  echo "[4/6] Création de la version immuable"
  version_output="$(cd "$package_dir" && clasp version "Promotion PFMP $commit")"
  version="$(sed -nE 's/^Created version ([0-9]+)$/\1/p' <<<"$version_output")"
  [[ "$version" =~ ^[0-9]+$ ]] || {
    echo "Numéro de version immuable introuvable." >&2
    exit 1
  }
  description="Release PFMP ${commit:0:12} - candidat bleu validé"

  promoted_admin=false
  promoted_public=false
  echo "[5/6] Promotion contrôlée vers les deux URLs vertes"
  if deploy_version "$package_dir" "$admin_id" "$version" "$description"; then
    promoted_admin=true
  else
    echo "Échec du déploiement admin, aucune promotion complète." >&2
    exit 1
  fi
  if deploy_version "$package_dir" "$public_id" "$version" "$description"; then
    promoted_public=true
  else
    echo "Échec du déploiement public, retour immédiat de l'admin sur @$admin_previous." >&2
    deploy_version "$package_dir" "$admin_id" "$admin_previous" "Rollback automatique"
    exit 1
  fi

  echo "[6/6] Contrôle HTTP des URLs vertes"
  if ! (cd "$clone_root" && node scripts/verify-pfmp-release.js --channel stable); then
    echo "Recette verte en échec : retour automatique sur les versions précédentes." >&2
    [[ "$promoted_admin" == true ]] && deploy_version "$package_dir" "$admin_id" "$admin_previous" "Rollback automatique"
    [[ "$promoted_public" == true ]] && deploy_version "$package_dir" "$public_id" "$public_previous" "Rollback automatique"
    exit 1
  fi

  mv "$candidate_file" "$last_release_file"
  echo
  echo "Release verte réussie : version immuable @$version."
}

rollback() {
  local version="${1:-}"
  [[ "$version" =~ ^[0-9]+$ ]] || {
    echo "Indiquez explicitement la version immuable de retour." >&2
    exit 1
  }
  local release_root clone_root package_dir description
  release_root="$(new_release_clone)"
  clone_root="$release_root/repo"
  package_dir="$release_root/package"
  mkdir -p "$package_dir"
  build_package "$clone_root" "$package_dir"
  description="Rollback PFMP explicite vers @$version"
  deploy_version "$package_dir" "$admin_id" "$version" "$description"
  deploy_version "$package_dir" "$public_id" "$version" "$description"
  (cd "$clone_root" && node scripts/verify-pfmp-release.js --channel stable)
  echo "Retour contrôlé terminé sur @$version."
}

command="${1:-}"
case "$command" in
  prepare) prepare ;;
  check-development) node "$repo_root/scripts/verify-pfmp-release.js" --channel development ;;
  check-stable) node "$repo_root/scripts/verify-pfmp-release.js" --channel stable ;;
  promote) promote ;;
  rollback) rollback "${2:-}" ;;
  status)
    clasp deployments
    if [[ -f "$candidate_file" ]]; then
      echo
      echo "Candidat bleu :"
      node -e 'const x=require(process.argv[1]); console.log(x.commit, x.preparedAt);' "$candidate_file"
    fi
    ;;
  *) usage; exit 1 ;;
esac
