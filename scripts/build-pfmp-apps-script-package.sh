#!/usr/bin/env bash
set -euo pipefail

# Le commit ci-dessous est la dernière récupération complète du projet Apps
# Script. La branche courante ne contient historiquement qu'un sous-ensemble
# des fichiers distants : un `git archive HEAD` seul produit donc un paquet
# incomplet. Les fichiers suivis actuels prennent toujours le dessus.
complete_base_ref="${PFMP_COMPLETE_BASE_REF:-18addabe4882ab4c5381fb158e5ad98117621b02}"
target_dir="${1:-}"

if [[ -z "$target_dir" ]]; then
  target_dir="$(mktemp -d /tmp/pfmp-apps-script-package.XXXXXX)"
fi

mkdir -p "$target_dir/apps-script"
git cat-file -e "${complete_base_ref}^{commit}"
git archive "$complete_base_ref" apps-script | tar -x -C "$target_dir"

while IFS= read -r source_file; do
  relative_file="${source_file#apps-script/}"
  destination="$target_dir/apps-script/$relative_file"
  mkdir -p "$(dirname "$destination")"

  case "$relative_file" in
    *.gs) rm -f "$target_dir/apps-script/${relative_file%.gs}.js" ;;
    *.js) rm -f "$target_dir/apps-script/${relative_file%.js}.gs" ;;
  esac

  git show "HEAD:$source_file" > "$destination"
done < <(git ls-files apps-script)

cp .clasp.json "$target_dir/.clasp.json"

duplicates="$({
  find "$target_dir/apps-script" -maxdepth 1 -type f \( -name '*.js' -o -name '*.gs' \) \
    -printf '%f\n' | sed -E 's/\.(js|gs)$//' | sort | uniq -d
} || true)"
if [[ -n "$duplicates" ]]; then
  printf 'Doublons .js/.gs dans le paquet :\n%s\n' "$duplicates" >&2
  exit 1
fi

printf '%s\n' "$target_dir"
