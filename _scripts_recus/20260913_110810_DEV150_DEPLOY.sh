#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.150"
PAGE="apps-script/Admin_Conventions_PFMP.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV150_${STAMP}"
mkdir -p "$BACKUP"
cp "$PAGE" "$BACKUP/"

cat > /tmp/dev150_binding.js <<'EOF'

  // DEV.150 — rebinding explicite des boutons correction/suppression.
  (function bindCorrectionSuppressionV150(){
    const saveBtn=document.getElementById('saveCorrectionBtn');
    const deleteBtn=document.getElementById('deleteConventionBtn');

    if(saveBtn){
      saveBtn.onclick=async function(){
        if(!current)return;

        const motif=document.getElementById('correctionReason').value.trim();
        if(!motif){
          setStatus('Motif de correction obligatoire.','err');
          return;
        }

        const changements={};
        Array.from(document.querySelectorAll('[data-corr]')).forEach(function(el){
          changements[el.dataset.corr]=el.value;
        });

        const ok=await askConfirm(
          'Enregistrer les modifications ?',
          'Les anciennes valeurs et les nouvelles valeurs seront conservées dans l’historique du dossier.',
          'Enregistrer les modifications'
        );
        if(!ok)return;

        const oldText=saveBtn.innerHTML;
        saveBtn.disabled=true;
        saveBtn.classList.add('busy');
        saveBtn.innerHTML='<span class="spinner"></span>Modification en cours';
        setStatus('Modification en cours...','');

        google.script.run
          .withSuccessHandler(function(v){
            saveBtn.disabled=false;
            saveBtn.classList.remove('busy');
            saveBtn.innerHTML=oldText;
            document.getElementById('correctionReason').value='';
            setStatus('Modifications enregistrées.','ok');
            render(v);
          })
          .withFailureHandler(function(e){
            saveBtn.disabled=false;
            saveBtn.classList.remove('busy');
            saveBtn.innerHTML=oldText;
            setStatus('Erreur : '+(e&&e.message||e),'err');
          })
          .EUC_ADMIN_WORKFLOW_corrigerV149(current.id,changements,motif);
      };
    }

    if(deleteBtn){
      deleteBtn.onclick=async function(){
        if(!current)return;

        const motif=document.getElementById('deleteReason').value.trim();
        if(!motif){
          setStatus('Motif de suppression obligatoire.','err');
          return;
        }

        const ok=await askConfirm(
          'Supprimer cette convention ?',
          'La convention sera retirée des listes courantes. Le motif, l’auteur, la date et un snapshot complet seront conservés.',
          'Supprimer la convention'
        );
        if(!ok)return;

        const oldText=deleteBtn.innerHTML;
        deleteBtn.disabled=true;
        deleteBtn.classList.add('busy');
        deleteBtn.innerHTML='<span class="spinner"></span>Suppression en cours';
        setStatus('Suppression en cours...','');

        google.script.run
          .withSuccessHandler(function(){
            deleteBtn.disabled=false;
            deleteBtn.classList.remove('busy');
            deleteBtn.innerHTML=oldText;
            document.getElementById('deleteReason').value='';
            detail.classList.add('hidden');
            current=null;
            selected=null;
            search.value='';
            openBtn.disabled=true;
            setStatus('Convention supprimée administrativement.','ok');
            reloadYear(yearContext.active);
          })
          .withFailureHandler(function(e){
            deleteBtn.disabled=false;
            deleteBtn.classList.remove('busy');
            deleteBtn.innerHTML=oldText;
            setStatus('Erreur : '+(e&&e.message||e),'err');
          })
          .EUC_ADMIN_WORKFLOW_supprimerV149(current.id,motif);
      };
    }
  })();

EOF

python3 <<'PY'
from pathlib import Path

page=Path("apps-script/Admin_Conventions_PFMP.html")
s=page.read_text(encoding="utf-8")
binding=Path("/tmp/dev150_binding.js").read_text(encoding="utf-8")

marker="  renderSchoolYears();"
if marker not in s:
    raise SystemExit("ERREUR : ancre renderSchoolYears introuvable.")

if "bindCorrectionSuppressionV150" not in s:
    s=s.replace(marker,binding+marker,1)

page.write_text(s,encoding="utf-8")
print("DEV.150 appliquée.")
PY

echo "============================================================"
echo " DEV.150 — CONTROLES"
echo "============================================================"

grep -q "bindCorrectionSuppressionV150" "$PAGE"
grep -q "Modification en cours" "$PAGE"
grep -q "Suppression en cours" "$PAGE"
grep -q "Enregistrer les modifications ?" "$PAGE"
grep -q "Supprimer cette convention ?" "$PAGE"

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Admin_Conventions_PFMP.html").read_text(encoding="utf-8")
scripts=re.findall(r"<script>(.*?)</script>",s,re.S)
js="\n".join(scripts)
js=re.sub(r"<\?!=.*?\?>","{}",js)
Path("/tmp/Admin_Conventions_PFMP_DEV150.js").write_text(js,encoding="utf-8")
PY

node --check /tmp/Admin_Conventions_PFMP_DEV150.js

echo "OK : JavaScript client valide."
echo "OK : confirmation correction présente."
echo "OK : confirmation suppression présente."
echo "OK : spinner de traitement présent."

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
echo " DEV.150 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ bouton Enregistrer les corrections actif"
echo "✓ boîte de confirmation personnalisée"
echo "✓ Modification en cours + spinner"
echo "✓ bouton Supprimer la convention actif"
echo "✓ boîte de confirmation personnalisée"
echo "✓ Suppression en cours + spinner"
echo "✓ push + version + déploiement principal"
echo "============================================================"
