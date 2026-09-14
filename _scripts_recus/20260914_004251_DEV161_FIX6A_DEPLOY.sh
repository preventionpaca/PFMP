#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix6a"

PAGE="apps-script/Suivi_PFMP_Classes.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX6A_${STAMP}"
mkdir -p "$BACKUP"
cp "$PAGE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX6A — FINALISATION RESTAURATION VIGNETTES"
echo "============================================================"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")

# Le patch FIX6 a déjà été appliqué avant l'arrêt du script.
# On le garantit ici de façon idempotente.

old = """  function hasDeclaredPeriod(link){
    var txt=(link.textContent||'');
    var hasDate=/\\b(?:\\d{2}\\/\\d{2}\\/\\d{4}|\\d{4}-\\d{2}-\\d{2})\\b/.test(txt);
    var hasPfmp=/\\b(PFMP|STAGE)\\b/i.test(txt);
    return hasDate && hasPfmp;
  }"""

new = """  function hasDeclaredPeriod(link){
    var txt=(link.textContent||'').trim();

    // Tant que la carte n'est pas réellement peuplée, ne jamais la masquer.
    if(!txt)return true;

    var hasPfmp=/\\b(PFMP|STAGE)\\b/i.test(txt);
    var hasDate=/\\b(?:\\d{1,2}\\/\\d{1,2}\\/\\d{4}|\\d{4}-\\d{2}-\\d{2})\\b/.test(txt);

    if(hasPfmp && hasDate)return true;

    // Pendant un rendu intermédiaire, conserver la carte.
    if(/élève\\(s\\)|eleve\\(s\\)/i.test(txt) && !hasPfmp)return true;

    return false;
  }"""

if old in s:
    s=s.replace(old,new,1)

old2 = """    links.forEach(function(link){
      hideVfmpForTerminale(link);
      if(!hasDeclaredPeriod(link)){
        link.style.display='none';
      }
    });"""

new2 = """    links.forEach(function(link){
      hideVfmpForTerminale(link);

      // Masquage réversible : une carte peut réapparaître après rendu.
      if(hasDeclaredPeriod(link)){
        link.style.display='';
      }else{
        link.style.display='none';
      }
    });"""

if old2 in s:
    s=s.replace(old2,new2,1)

if "function hasDeclaredPeriod(link)" not in s:
    raise SystemExit("ERREUR : hasDeclaredPeriod introuvable.")
if "link.style.display='';" not in s:
    raise SystemExit("ERREUR : restauration réversible absente.")

p.write_text(s,encoding="utf-8")
print("OK : logique de restauration des cartes présente.")
PY

echo
echo "=== CONTROLES EXPLICITES ==="

check(){
  local label="$1"
  shift
  if "$@"; then
    echo "✓ $label"
  else
    echo "✗ ECHEC : $label"
    exit 1
  fi
}

check "fonction hasDeclaredPeriod présente" grep -q "function hasDeclaredPeriod(link)" "$PAGE"
check "réaffichage des cartes présent" grep -q "link.style.display='';" "$PAGE"
check "mode ENT toujours présent" grep -q "mode.*ent" "$PAGE"
check "overlay Chargement en cours présent" grep -q "Chargement en cours" "$PAGE"

echo
echo "=== CONTROLE JS DE LA SURCOUCHE FIX5 ==="

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classes.html").read_text(encoding="utf-8")

m=re.search(
    r'<script id="EUC_CLASSES_FIX5_SCRIPT">(.*?)</script>',
    s,
    re.S
)

if not m:
    raise SystemExit("ERREUR : bloc EUC_CLASSES_FIX5_SCRIPT introuvable.")

Path("/tmp/EUC_CLASSES_FIX5_SCRIPT.js").write_text(m.group(1),encoding="utf-8")
print("OK : bloc JS isolé.")
PY

node --check /tmp/EUC_CLASSES_FIX5_SCRIPT.js
echo "✓ JavaScript de la surcouche valide"

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
echo " DEV.161 FIX6A DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ vignettes restaurées"
echo "✓ filtrage réversible"
echo "✓ mode ENT conservé"
echo "✓ push + version + déploiement principal"
echo "============================================================"
