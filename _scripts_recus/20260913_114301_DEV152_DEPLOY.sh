#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.152"
PAGE="apps-script/Admin_Conventions_PFMP.html"
SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV152_${STAMP}"
mkdir -p "$BACKUP"
cp "$PAGE" "$BACKUP/"
cp "$SERVICE" "$BACKUP/"

cat > /tmp/dev152_client.js <<'EOF'

  // DEV.152 — gestion robuste par délégation d'événement.
  document.addEventListener('click',async function(ev){
    const saveBtn=ev.target.closest && ev.target.closest('#saveCorrectionBtn');
    const deleteBtn=ev.target.closest && ev.target.closest('#deleteConventionBtn');

    if(!saveBtn && !deleteBtn)return;

    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

    if(!current){
      setStatus('Aucun dossier ouvert.','err');
      return;
    }

    if(saveBtn){
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

      return;
    }

    if(deleteBtn){
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
          reloadYear(yearContext.active);
        })
        .withFailureHandler(function(e){
          deleteBtn.disabled=false;
          deleteBtn.classList.remove('busy');
          deleteBtn.innerHTML=oldText;
          setStatus('Erreur : '+(e&&e.message||e),'err');
        })
        .EUC_ADMIN_WORKFLOW_supprimerV149(current.id,motif);
    }
  },true);

EOF

python3 <<'PY'
from pathlib import Path
p=Path("apps-script/Admin_Conventions_PFMP.html")
s=p.read_text(encoding="utf-8")
binding=Path("/tmp/dev152_client.js").read_text(encoding="utf-8")

s=s.replace(' onclick="DEV151_saveCorrection()"','')
s=s.replace(' onclick="DEV151_deleteConvention()"','')

anchor="  renderSchoolYears();"
if anchor not in s:
    raise SystemExit("ERREUR : ancre renderSchoolYears introuvable.")

if "DEV.152 — gestion robuste par délégation" not in s:
    s=s.replace(anchor,binding+anchor,1)

p.write_text(s,encoding="utf-8")
print("OK : délégation robuste installée.")
PY

python3 <<'PY'
from pathlib import Path
p=Path("apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs")
s=p.read_text(encoding="utf-8")

for sig in [
  "function EUC_ADMIN_WORKFLOW_corrigerV149(accesId,changements,motif){",
  "function EUC_ADMIN_WORKFLOW_supprimerV149(accesId,motif){"
]:
    if sig not in s:
        raise SystemExit("ERREUR : fonction V149 absente : "+sig)
    wanted=sig+"\n  EUC_ADMIN_WORKFLOW_assurerColonnesV149_();"
    if wanted not in s:
        s=s.replace(sig,wanted,1)

p.write_text(s,encoding="utf-8")
print("OK : schéma V149 garanti avant écriture.")
PY

echo "=== CONTROLES DEV.152 ==="
cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_V152.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V152.js
grep -q "DEV.152 — gestion robuste par délégation" "$PAGE"
grep -q "Modification en cours" "$PAGE"
grep -q "Suppression en cours" "$PAGE"

python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/Admin_Conventions_PFMP.html").read_text(encoding="utf-8")
scripts=re.findall(r"<script>(.*?)</script>",s,re.S)
js="\n".join(scripts)
js=re.sub(r"<\?!=.*?\?>","{}",js)
Path("/tmp/Admin_Conventions_PFMP_DEV152.js").write_text(js,encoding="utf-8")
PY

node --check /tmp/Admin_Conventions_PFMP_DEV152.js

echo "=== PUSH ==="
clasp push -f
echo "=== VERSION ==="
clasp version "$LABEL"
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.152 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ correction/suppression interceptées en capture"
echo "✓ anciens onclick inline retirés"
echo "✓ schéma V149 garanti avant écriture"
echo "✓ push + version + déploiement principal"
echo "============================================================"
