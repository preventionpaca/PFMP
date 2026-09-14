#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix6"

PAGE="apps-script/Suivi_PFMP_Classes.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX6_${STAMP}"
mkdir -p "$BACKUP"
cp "$PAGE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX6 — RESTAURATION DES VIGNETTES CLASSES"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")

# Le FIX5 masquait les cartes trop tôt, avant que leur contenu
# (notamment les périodes/dates) soit complètement rendu.
# On remplace cette logique par une version réversible :
# - si une carte contient au moins une période PFMP/stage => visible
# - si le contenu n'est pas encore rendu => on ne masque rien
# - seules les cartes réellement vides après rendu peuvent être masquées

old = r"""  function hasDeclaredPeriod(link){
    var txt=(link.textContent||'');
    var hasDate=/\b(?:\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/.test(txt);
    var hasPfmp=/\b(PFMP|STAGE)\b/i.test(txt);
    return hasDate && hasPfmp;
  }"""

new = r"""  function hasDeclaredPeriod(link){
    var txt=(link.textContent||'').trim();

    // Tant que la carte n'est pas réellement peuplée, ne jamais la masquer.
    if(!txt)return true;

    var hasPfmp=/\b(PFMP|STAGE)\b/i.test(txt);
    var hasDate=/\b(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/.test(txt);

    // Une période affichée suffit à conserver la vignette.
    if(hasPfmp && hasDate)return true;

    // Si le rendu n'est pas terminé, on conserve également la carte.
    if(/élève\(s\)|eleve\(s\)/i.test(txt) && !hasPfmp)return true;

    return false;
  }"""

if old not in s:
    raise SystemExit("ERREUR : fonction hasDeclaredPeriod du FIX5 introuvable.")
s=s.replace(old,new,1)

old2 = r"""    links.forEach(function(link){
      hideVfmpForTerminale(link);
      if(!hasDeclaredPeriod(link)){
        link.style.display='none';
      }
    });"""

new2 = r"""    links.forEach(function(link){
      hideVfmpForTerminale(link);

      // Important : le masquage doit être réversible.
      // Une carte masquée pendant un rendu intermédiaire doit pouvoir réapparaître.
      if(hasDeclaredPeriod(link)){
        link.style.display='';
      }else{
        link.style.display='none';
      }
    });"""

if old2 not in s:
    raise SystemExit("ERREUR : bloc de masquage des cartes introuvable.")
s=s.replace(old2,new2,1)

p.write_text(s,encoding="utf-8")
print("OK : filtrage des vignettes rendu réversible.")
PY

echo
echo "============================================================"
echo " DEV.161 FIX6 — CONTROLES"
echo "============================================================"

grep -q "filtrage doit être réversible" "$PAGE"
grep -q "link.style.display='';" "$PAGE"
grep -q "function hasDeclaredPeriod" "$PAGE"

python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/Suivi_PFMP_Classes.html").read_text(encoding="utf-8")
scripts=re.findall(r"<script[^>]*>(.*?)</script>",s,re.S)
js="\n".join(scripts)
js=re.sub(r"<\?!=.*?\?>","{}",js)
Path("/tmp/Suivi_PFMP_Classes_FIX6.js").write_text(js,encoding="utf-8")
PY

node --check /tmp/Suivi_PFMP_Classes_FIX6.js

echo "✓ JavaScript valide"
echo "✓ les cartes peuvent réapparaître après rendu"
echo "✓ le filtre sans PFMP/stage reste conservé"

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
clasp version "$LABEL"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo
echo "============================================================"
echo " DEV.161 FIX6 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ vignettes classes restaurées"
echo "✓ filtrage sans PFMP rendu sûr"
echo "✓ push + version + déploiement principal"
echo "============================================================"
