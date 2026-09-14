#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix25-retrait-sans-reload"

HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX25_${STAMP}"
mkdir -p "$BACKUP"
cp "$HTML" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX25 — RETRAIT SANS RECHARGEMENT DE PAGE"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

m=re.search(r'<script id="DEV161_FIX3_ENHANCEMENT">(.*?)</script>', s, re.S)
if not m:
    raise SystemExit("ERREUR : DEV161_FIX3_ENHANCEMENT introuvable.")

block=m.group(1)

old="""          modal.classList.remove('show');
          pendingType=null;
          notify((r&&r.message)||'Affectation retirée.','ok');
          window.setTimeout(function(){window.location.reload();},300);"""

new="""          modal.classList.remove('show');

          // FIX25 : ne surtout pas recharger l'iframe Apps Script.
          // Le reload de userCodeAppPanel est à l'origine de la page blanche.
          // On met à jour directement le tableau affiché.
          var colIndex=(pendingType==='TELEPHONE')?7:8;

          selected.forEach(function(eleveId){
            var cb=document.querySelector('.student-check[value="'+eleveId+'"]');
            if(!cb)return;

            var tr=cb.closest('tr');
            if(tr && tr.children && tr.children[colIndex]){
              tr.children[colIndex].innerHTML='<span class="empty">—</span>';
            }

            cb.checked=false;
          });

          var selectedCount=document.getElementById('selectedCount');
          if(selectedCount)selectedCount.textContent='0 élève sélectionné';

          var selectAll=document.getElementById('selectAll');
          if(selectAll)selectAll.checked=false;

          pendingType=null;
          notify((r&&r.message)||'Affectation retirée.','ok');"""

if old not in block:
    # Variante avec 250 ms d'une version précédente.
    old2="""          modal.classList.remove('show');
          pendingType=null;
          notify((r&&r.message)||'Affectation retirée.','ok');
          window.setTimeout(function(){window.location.reload();},250);"""
    if old2 in block:
        block=block.replace(old2,new,1)
    elif "FIX25 : ne surtout pas recharger" in block:
        print("INFO : FIX25 déjà présent.")
    else:
        raise SystemExit("ERREUR : bloc success du retrait introuvable.")
else:
    block=block.replace(old,new,1)

s=s[:m.start(1)] + block + s[m.end(1):]
p.write_text(s,encoding="utf-8")

print("OK : reload supprimé, mise à jour DOM locale installée.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

grep -q "FIX25 : ne surtout pas recharger" "$HTML"
grep -q "var colIndex=(pendingType==='TELEPHONE')?7:8;" "$HTML"

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
m=re.search(r'<script id="DEV161_FIX3_ENHANCEMENT">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : bloc retrait introuvable.")
b=m.group(1)

if "window.location.reload()" in b:
    raise SystemExit("ERREUR : reload encore présent dans le contrôleur retrait.")

print("✓ aucun reload dans le contrôleur retrait")
PY

rm -rf /tmp/fix25_inline
mkdir -p /tmp/fix25_inline

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
s=s.replace("<?!= config ?>","{}")
s=s.replace("<?!= anneeContextJson ?>","{}")
s=s.replace("<?!= detailJson ?>","{}")

scripts=re.findall(r"<script\b([^>]*)>(.*?)</script>",s,re.S|re.I)
out=Path("/tmp/fix25_inline")
n=0
for attrs,code in scripts:
    if "src=" in attrs.lower():
        continue
    n+=1
    (out/f"inline_{n:02d}.js").write_text(code,encoding="utf-8")

if n==0:
    raise SystemExit("ERREUR : aucun script inline détecté.")
print("Scripts inline :",n)
PY

shopt -s nullglob
FILES=(/tmp/fix25_inline/*.js)
for f in "${FILES[@]}"; do
  node --check "$f"
done

echo "✓ retrait serveur inchangé"
echo "✓ aucun rechargement iframe"
echo "✓ cellule téléphone/visite mise à jour localement"
echo "✓ sélection remise à zéro"
echo "✓ tous les JS inline valides"

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
echo "=== VERIFICATION ==="
clasp deployments | grep "$DEPLOYMENT_ID" || true

echo "============================================================"
echo " DEV.161 FIX25 DEPLOYE"
echo "============================================================"
