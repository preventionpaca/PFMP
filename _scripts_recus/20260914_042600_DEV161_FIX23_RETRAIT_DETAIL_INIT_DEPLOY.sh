#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix23-retrait-detail-init"

HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX23_${STAMP}"
mkdir -p "$BACKUP"
cp "$HTML" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX23 — RETRAIT : DETAIL_INIT + NOTIFY LOCAL"
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

# Vérifier qu'on corrige bien le contrôleur réel vu dans la console.
if "confirm.onclick=function()" not in block:
    raise SystemExit("ERREUR : handler confirm introuvable.")

# 1) Ajouter notify local si absent.
anchor="""    const modal=document.getElementById('retModalV162'),txt=document.getElementById('retTextV162'),confirm=document.getElementById('retConfirmV162'),cancel=document.getElementById('retCancelV162');
    function ids(){return Array.from(document.querySelectorAll('.student-check:checked')).map(function(x){return Number(x.value);});}"""

replacement="""    const modal=document.getElementById('retModalV162'),txt=document.getElementById('retTextV162'),confirm=document.getElementById('retConfirmV162'),cancel=document.getElementById('retCancelV162');

    function notify(text,type){
      var el=document.getElementById('assignStatus');
      if(!el)return;
      el.textContent=text||'';
      el.className='assign-status'+(text?' show':'')+(type?' '+type:'');
    }

    function ids(){return Array.from(document.querySelectorAll('.student-check:checked')).map(function(x){return Number(x.value);});}"""

if "function notify(text,type)" not in block:
    if anchor not in block:
        raise SystemExit("ERREUR : point d'injection notify introuvable.")
    block=block.replace(anchor,replacement,1)

# 2) CORRECTION PRINCIPALE :
#    `detail` n'existe pas dans ce script séparé.
#    DETAIL_INIT, lui, est global et contient le détail rendu.
old_detail="const affectationIds=(detail.lignes||[])"
new_detail="const affectationIds=((typeof DETAIL_INIT!=='undefined'&&DETAIL_INIT&&DETAIL_INIT.lignes)||[])"

if old_detail not in block and new_detail not in block:
    raise SystemExit("ERREUR : usage detail.lignes attendu introuvable.")
block=block.replace(old_detail,new_detail,1)

# 3) showStatus appartient aussi à l'IIFE principale : remplacer par notify.
block=block.replace("showStatus('Sélectionnez au moins un élève.','err')",
                    "notify('Sélectionnez au moins un élève.','err')")
block=block.replace("showStatus('Aucun identifiant d’affectation actif trouvé.','err')",
                    "notify('Aucun identifiant d’affectation actif trouvé.','err')")
block=block.replace("showStatus((r&&r.message)||'Affectation retirée.','ok')",
                    "notify((r&&r.message)||'Affectation retirée.','ok')")
block=block.replace("showStatus('Erreur : '+(e&&e.message||e),'err')",
                    "notify('Erreur : '+(e&&e.message||e),'err')")

# 4) Utiliser la fonction serveur actuelle F18.
block=block.replace(".EUC_SUIVI_DESAFFECTER_V162({",
                    ".EUC_SUIVI_DESAFFECTER_F18({")

s=s[:m.start(1)] + block + s[m.end(1):]
p.write_text(s,encoding="utf-8")

print("OK : contrôleur réel corrigé.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

# Doit contenir la correction exacte.
grep -q "typeof DETAIL_INIT" "$HTML"
grep -q "function notify(text,type)" "$HTML"
grep -q "EUC_SUIVI_DESAFFECTER_F18" "$HTML"

# Le vieux bug ne doit plus être présent dans le bloc retrait.
python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
m=re.search(r'<script id="DEV161_FIX3_ENHANCEMENT">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : bloc introuvable après patch.")

b=m.group(1)
if "detail.lignes" in b:
    raise SystemExit("ERREUR : ancien detail.lignes encore présent.")
if "showStatus(" in b:
    raise SystemExit("ERREUR : ancien showStatus hors portée encore présent.")

print("✓ plus aucun detail.lignes dans le contrôleur retrait")
print("✓ plus aucun showStatus hors portée dans ce contrôleur")
PY

# Vérifier tous les scripts inline.
rm -rf /tmp/fix23_inline
mkdir -p /tmp/fix23_inline

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
s=s.replace("<?!= config ?>","{}")
s=s.replace("<?!= anneeContextJson ?>","{}")
s=s.replace("<?!= detailJson ?>","{}")

scripts=re.findall(r"<script\b([^>]*)>(.*?)</script>",s,re.S|re.I)
out=Path("/tmp/fix23_inline")
n=0
for attrs,code in scripts:
    if "src=" in attrs.lower():
        continue
    n+=1
    (out/f"inline_{n:02d}.js").write_text(code,encoding="utf-8")
if n==0:
    raise SystemExit("ERREUR : aucun script inline.")
print("Scripts inline :",n)
PY

shopt -s nullglob
FILES=(/tmp/fix23_inline/*.js)
for f in "${FILES[@]}"; do
  node --check "$f"
done

echo "✓ tous les JS inline valides"
echo "✓ dates / filtres / rendu tableau non touchés"

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
echo " DEV.161 FIX23 DEPLOYE"
echo "============================================================"
