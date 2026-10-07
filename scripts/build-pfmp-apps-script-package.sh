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

# Le socle complet historique contient encore l'instrumentation temporaire
# P7.1B. Ce fichier redéfinit les fonctions du générateur de conventions et
# délègue vers des symboles `__P71_ORIG` qui n'existent plus dans les sources
# actuelles. Le conserver dans un paquet reconstruit casse le chargement des
# classes en production. L'audit P7.1B étant terminé et absent de HEAD, il ne
# doit pas être republié depuis le socle de récupération.
rm -f \
  "$target_dir/apps-script/EUC_PFMP_PerfAuditP71.js" \
  "$target_dir/apps-script/EUC_PFMP_PerfAuditP71.gs"

# Refuser avant publication tout adaptateur historique qui appelle un point
# d'origine absent du paquet final. C'est ce qui avait cassé l'import JotForm :
# DEV331 était présent, mais EUC_V160_importCsv__DEV331_ORIG avait été remplacé
# par une source plus ancienne portant de nouveau le nom public.
node - "$target_dir/apps-script" <<'NODE'
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter(file => /\.(?:js|gs)$/.test(file));
const source = files.map(file => fs.readFileSync(path.join(dir, file), 'utf8')).join('\n');
const refs = [...new Set(source.match(/\b[A-Za-z_$][\w$]*__[A-Za-z0-9_$]*ORIG\b/g) || [])];
const missing = refs.filter(name => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !new RegExp('(?:function\\s+' + escaped + '\\s*\\(|(?:var|let|const)\\s+' + escaped + '\\s*=)').test(source);
});
if (missing.length) {
  throw new Error('Points d’origine absents du paquet Apps Script : ' + missing.join(', '));
}
NODE

cp .clasp.json "$target_dir/.clasp.json"

# Le depot conserve le routeur historique sous son nom naturel. Le paquet de
# publication le place derriere le point d'entree commun qui ajoute le repere
# BLEU/VERT sans modifier chacune des nombreuses pages HTML.
node - "$target_dir/apps-script/EDT.js" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
let source = fs.readFileSync(file, 'utf8');
const marker = 'function doGet(e) {';
const matches = source.split(marker).length - 1;
if (matches !== 1) {
  throw new Error(`Routeur doGet inattendu dans EDT.js : ${matches} occurrence(s)`);
}
source = source.replace(marker, 'function EUC_RELEASE_doGetCore_(e) {');
source += '\n\nfunction doGet(e) {\n  return EUC_RELEASE_doGet_(e);\n}\n';
fs.writeFileSync(file, source);
NODE

# Apps Script utilise le nom sans extension comme identifiant de fichier :
# un fichier serveur et un modèle HTML ne peuvent donc pas partager le même
# radical. Le nom des fichiers serveur n'étant pas utilisé par le runtime, on
# les renomme uniquement dans le paquet de publication.
while IFS= read -r html_file; do
  html_base="${html_file%.html}"
  for code_ext in js gs; do
    code_file="${html_base}.${code_ext}"
    if [[ -f "$code_file" ]]; then
      mv "$code_file" "${html_base}_Code.${code_ext}"
    fi
  done
done < <(find "$target_dir/apps-script" -maxdepth 1 -type f -name '*.html' -print)

duplicates="$({
  find "$target_dir/apps-script" -maxdepth 1 -type f \
    \( -name '*.js' -o -name '*.gs' -o -name '*.html' \) \
    -printf '%f\n' | sed -E 's/\.(js|gs|html)$//' | sort | uniq -d
} || true)"
if [[ -n "$duplicates" ]]; then
  printf 'Noms Apps Script en conflit dans le paquet :\n%s\n' "$duplicates" >&2
  exit 1
fi

printf '%s\n' "$target_dir"
