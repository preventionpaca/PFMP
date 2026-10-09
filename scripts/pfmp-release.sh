#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_file="$repo_root/scripts/pfmp-release-config.json"
git_dir="$(git -C "$repo_root" rev-parse --absolute-git-dir)"
last_release_file="$git_dir/pfmp-release-last.json"

cfg() {
  node -e "const c=require(process.argv[1]); console.log($2);" "$config_file"
}

stable_project_id="$(cfg config_file 'c.channels.stableAdmin.projectId')"
admin_id="$(cfg config_file 'c.channels.stableAdmin.deploymentId')"
public_id="$(cfg config_file 'c.channels.stablePublic.deploymentId')"

usage() {
  cat <<'EOF'
Usage: scripts/pfmp-release.sh COMMAND

  release-stable    teste le commit courant et le publie directement sur les
                    deux Web Apps vertes existantes, avec retour automatique
  check-stable      contrôle les 25 routes du canal vert
  rollback VERSION  replace les deux URLs stables sur une version immuable
  status            affiche les déploiements verts
EOF
}

tree_hash() {
  local app_dir="$1/apps-script"
  # `clasp pull` restitue tous les fichiers serveur en .js, même lorsqu'ils
  # ont été poussés en .gs. Comparer le nom logique Apps Script (le radical)
  # et les octets permet une relecture stricte sans faux écart d'extension.
  node - "$app_dir" <<'NODE'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dir = process.argv[2];
const logical = new Map();
for (const file of fs.readdirSync(dir)) {
  if (file !== 'appsscript.json' && !/\.(?:js|gs|html)$/.test(file)) continue;
  const key = file.replace(/\.gs$/, '.js');
  if (logical.has(key)) throw new Error(`Nom Apps Script dupliqué : ${key}`);
  logical.set(key, fs.readFileSync(path.join(dir, file)));
}
const hash = crypto.createHash('sha256');
for (const key of [...logical.keys()].sort()) {
  hash.update(key); hash.update('\0'); hash.update(logical.get(key)); hash.update('\0');
}
process.stdout.write(hash.digest('hex') + '\n');
NODE
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

write_clasp_project() {
  local package_dir="$1"
  local project_id="$2"
  node - "$package_dir/.clasp.json" "$project_id" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const projectId = process.argv[3];
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
config.scriptId = projectId;
fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
NODE
}

pull_remote() {
  local package_dir="$1"
  local remote_dir="$2"
  cp "$package_dir/.clasp.json" "$remote_dir/.clasp.json"
  (cd "$remote_dir" && clasp pull >/dev/null)
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

release_stable() {
  local commit release_root clone_root package_dir remote_dir
  local package_hash remote_hash deployments admin_previous public_previous
  local version_output version description promoted_admin promoted_public
  commit="$(git -C "$repo_root" rev-parse HEAD)"
  release_root="$(new_release_clone)"
  clone_root="$release_root/repo"
  package_dir="$release_root/package"
  remote_dir="$release_root/remote"
  mkdir -p "$package_dir" "$remote_dir"

  echo "[1/6] Tests complets du commit $commit"
  (cd "$clone_root" && node tests/run-tests.js)
  echo "[2/6] Construction du paquet complet depuis le commit exact"
  build_package "$clone_root" "$package_dir"
  write_clasp_project "$package_dir" "$stable_project_id"
  package_hash="$(tree_hash "$package_dir")"

  deployments="$(cd "$package_dir" && clasp deployments)"
  admin_previous="$(deployment_version "$deployments" "$admin_id")"
  public_previous="$(deployment_version "$deployments" "$public_id")"
  [[ "$admin_previous" =~ ^[0-9]+$ && "$public_previous" =~ ^[0-9]+$ ]] || {
    echo "Versions stables précédentes introuvables ; publication annulée." >&2
    exit 1
  }

  echo "[3/6] Publication directe sur le projet vert et relecture distante"
  (cd "$package_dir" && clasp push --force)
  pull_remote "$package_dir" "$remote_dir"
  remote_hash="$(tree_hash "$remote_dir")"
  [[ "$package_hash" == "$remote_hash" ]] || {
    echo "Le contenu distant vert diffère du paquet testé ; aucun déploiement n'est déplacé." >&2
    exit 1
  }

  echo "[4/6] Création de la version Apps Script immuable"
  version_output="$(cd "$package_dir" && clasp version "Release directe PFMP $commit")"
  version="$(sed -nE 's/^Created version ([0-9]+)$/\1/p' <<<"$version_output")"
  [[ "$version" =~ ^[0-9]+$ ]] || {
    echo "Numéro de version immuable introuvable ; les déploiements restent inchangés." >&2
    exit 1
  }
  description="Release PFMP directe ${commit:0:12}"

  promoted_admin=false
  promoted_public=false
  echo "[5/6] Mise à jour des deux Web Apps vertes existantes"
  if deploy_version "$package_dir" "$admin_id" "$version" "$description"; then
    promoted_admin=true
  else
    echo "Échec du déploiement admin ; les URL publiques restent sur leur version précédente." >&2
    exit 1
  fi
  if deploy_version "$package_dir" "$public_id" "$version" "$description"; then
    promoted_public=true
  else
    echo "Échec du déploiement public : retour immédiat de l'admin sur @$admin_previous." >&2
    deploy_version "$package_dir" "$admin_id" "$admin_previous" "Rollback automatique"
    exit 1
  fi

  echo "[6/6] Contrôle HTTP des 25 routes vertes"
  if ! (cd "$clone_root" && node scripts/verify-pfmp-release.js --channel stable); then
    echo "Recette verte en échec : retour automatique sur les versions précédentes." >&2
    [[ "$promoted_admin" == true ]] && deploy_version "$package_dir" "$admin_id" "$admin_previous" "Rollback automatique"
    [[ "$promoted_public" == true ]] && deploy_version "$package_dir" "$public_id" "$public_previous" "Rollback automatique"
    exit 1
  fi

  node -e '
    const fs=require("fs");
    fs.writeFileSync(process.argv[1], JSON.stringify({
      commit:process.argv[2], treeHash:process.argv[3], version:Number(process.argv[4]),
      releasedAt:new Date().toISOString(), channel:"stable-direct"
    }, null, 2)+"\n");
  ' "$last_release_file" "$commit" "$package_hash" "$version"
  echo
  echo "Release directe verte réussie : version immuable @$version."
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
  write_clasp_project "$package_dir" "$stable_project_id"
  description="Rollback PFMP explicite vers @$version"
  deploy_version "$package_dir" "$admin_id" "$version" "$description"
  deploy_version "$package_dir" "$public_id" "$version" "$description"
  (cd "$clone_root" && node scripts/verify-pfmp-release.js --channel stable)
  echo "Retour contrôlé terminé sur @$version."
}

command="${1:-}"
case "$command" in
  release-stable) release_stable ;;
  check-stable) node "$repo_root/scripts/verify-pfmp-release.js" --channel stable ;;
  rollback) rollback "${2:-}" ;;
  status)
    echo "VERT : deux deploiements stables existants"
    clasp deployments
    ;;
  *) usage; exit 1 ;;
esac
