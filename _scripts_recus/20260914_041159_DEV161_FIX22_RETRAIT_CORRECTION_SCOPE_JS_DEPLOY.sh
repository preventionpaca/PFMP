#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix22-retrait-scope"

HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
FIX18="apps-script/EUC_SUIVI_PFMP_FixV161_18.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX22_${STAMP}"
mkdir -p "$BACKUP"
cp "$HTML" "$BACKUP/"
cp "$FIX18" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX22 — RETRAIT : CORRECTION DE PORTEE JS"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

# Supprimer le contrôleur FIX20 s'il existe : il n'a pas pris la main.
s=re.sub(
    r'\n?<script id="EUC_FIX20_RETRAIT_SCRIPT">.*?</script>\n?',
    '\n',
    s,
    flags=re.S
)

m=re.search(r'<script id="DEV161_FIX3_ENHANCEMENT">(.*?)</script>', s, re.S)
if not m:
    raise SystemExit("ERREUR : DEV161_FIX3_ENHANCEMENT introuvable.")

block=m.group(1)

# On exige le vrai contrôleur ancien, celui dont le bouton onclick appelle openRet(type).
if "b.onclick=function(){openRet(type);};" not in block:
    raise SystemExit("ERREUR : contrôleur retrait réel inattendu.")

# 1) Ajouter un notify local, car showStatus appartient à l'IIFE principale
# et n'est PAS visible depuis ce script séparé.
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

# 2) Remplacer showStatus hors portée par notify local.
block=block.replace("showStatus('Sélectionnez au moins un élève.','err')",
                    "notify('Sélectionnez au moins un élève.','err')")
block=block.replace("showStatus('Aucun identifiant d’affectation actif trouvé.','err')",
                    "notify('Aucun identifiant d’affectation actif trouvé.','err')")
block=block.replace("showStatus((r&&r.message)||'Affectation retirée.','ok')",
                    "notify((r&&r.message)||'Affectation retirée.','ok')")
block=block.replace("showStatus('Erreur : '+(e&&e.message||e),'err')",
                    "notify('Erreur : '+(e&&e.message||e),'err')")

# 3) Le vrai bug : `detail` appartient à une AUTRE IIFE.
# Ici on utilise DETAIL_INIT, déclaré au niveau global de la page.
old="""      const affectationIds=(detail.lignes||[])
        .filter(function(x){return selectedMap[Number(x.eleveId)]===true;})"""

new="""      const detailRetrait=(typeof DETAIL_INIT!=='undefined'&&DETAIL_INIT)?DETAIL_INIT:{};
      const affectationIds=(detailRetrait.lignes||[])
        .filter(function(x){return selectedMap[Number(x.eleveId)]===true;})"""

if old not in block:
    raise SystemExit("ERREUR : usage detail.lignes attendu introuvable.")
block=block.replace(old,new,1)

# 4) Appeler la fonction serveur actuelle F18.
block=block.replace(
    ".EUC_SUIVI_DESAFFECTER_V162({",
    ".EUC_SUIVI_DESAFFECTER_F18({"
)

# 5) Si erreur JS locale, elle doit être visible dans le modal au lieu d'un clic muet.
old_confirm="""    confirm.onclick=function(){
      if(!pendingType)return;

      const old=confirm.innerHTML;"""

new_confirm="""    confirm.onclick=function(){
      if(!pendingType){
        txt.textContent='Erreur interface : type de suivi non défini.';
        return;
      }

      const old=confirm.innerHTML;
      confirm.disabled=true;
      confirm.innerHTML='<span class="spinner"></span>Retrait en cours...';"""

if old_confirm not in block:
    raise SystemExit("ERREUR : début handler confirm introuvable.")
block=block.replace(old_confirm,new_confirm,1)

# Retirer l'ancien démarrage spinner plus bas pour éviter doublon.
block=block.replace(
"""      confirm.disabled=true;
      confirm.innerHTML='<span class="spinner"></span>Retrait en cours...';

      google.script.run""",
"""      google.script.run""",
1
)

# Si aucun ID, remettre le bouton normal.
old_noids="""      if(!affectationIds.length){
        confirm.disabled=false;
        confirm.innerHTML=old;
        txt.textContent='Impossible de retirer : aucun identifiant d’affectation actif n’a été trouvé pour la sélection.';
        notify('Aucun identifiant d’affectation actif trouvé.','err');
        return;
      }"""
if old_noids not in block:
    raise SystemExit("ERREUR : garde no-ids introuvable.")

# Remonter le bloc modifié dans le HTML.
s=s[:m.start(1)] + block + s[m.end(1):]
p.write_text(s, encoding="utf-8")

print("OK : ancien contrôleur corrigé directement, sans surcouche.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

# Le contrôleur réel doit maintenant utiliser DETAIL_INIT, pas detail.
grep -q "const detailRetrait=(typeof DETAIL_INIT" "$HTML"
grep -q "function notify(text,type)" "$HTML"
grep -q "EUC_SUIVI_DESAFFECTER_F18" "$HTML"
! grep -q "EUC_FIX20_RETRAIT_SCRIPT" "$HTML"

# Vérifier que F18 existe toujours.
grep -q "function EUC_SUIVI_DESAFFECTER_F18" "$FIX18"

# Vérifier tous les scripts inline.
rm -rf /tmp/fix22_inline
mkdir -p /tmp/fix22_inline

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
s=s.replace("<?!= config ?>","{}")
s=s.replace("<?!= anneeContextJson ?>","{}")
s=s.replace("<?!= detailJson ?>","{}")

scripts=re.findall(r"<script\b([^>]*)>(.*?)</script>", s, re.S|re.I)
out=Path("/tmp/fix22_inline")
n=0
for attrs,code in scripts:
    if "src=" in attrs.lower():
        continue
    n+=1
    (out/f"inline_{n:02d}.js").write_text(code,encoding="utf-8")
if n==0:
    raise SystemExit("ERREUR : aucun script inline détecté.")
print("Scripts inline :", n)
PY

shopt -s nullglob
FILES=(/tmp/fix22_inline/*.js)
[ "${#FILES[@]}" -gt 0 ] || { echo "ERREUR : aucun JS inline."; exit 1; }

for f in "${FILES[@]}"; do
  node --check "$f"
done

echo "✓ bug de portée `detail` supprimé"
echo "✓ bug de portée `showStatus` supprimé"
echo "✓ spinner lancé avant calcul des IDs"
echo "✓ appel serveur F18"
echo "✓ JS inline validé"

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
echo " DEV.161 FIX22 DEPLOYE"
echo "============================================================"
