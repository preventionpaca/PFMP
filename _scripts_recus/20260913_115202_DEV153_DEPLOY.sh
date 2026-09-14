#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.153"
PAGE="apps-script/Admin_Conventions_PFMP.html"
SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV153_${STAMP}"
mkdir -p "$BACKUP"
cp "$PAGE" "$BACKUP/"
cp "$SERVICE" "$BACKUP/"

cat > /tmp/dev153_top_level.js <<'EOF'

  // DEV.153 — handlers TOP LEVEL correction / suppression.
  // IMPORTANT : ce bloc est injecté juste avant la fermeture de l'IIFE,
  // donc il est actif dès l'ouverture de la page.
  document.addEventListener('click', async function(ev){
    const saveBtn = ev.target.closest && ev.target.closest('#saveCorrectionBtn');
    const deleteBtn = ev.target.closest && ev.target.closest('#deleteConventionBtn');

    if(!saveBtn && !deleteBtn) return;

    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

    if(!current){
      setStatus('Aucun dossier ouvert.','err');
      return;
    }

    if(saveBtn){
      const motif = document.getElementById('correctionReason').value.trim();
      if(!motif){
        setStatus('Motif de correction obligatoire.','err');
        return;
      }

      const changements = {};
      Array.from(document.querySelectorAll('[data-corr]')).forEach(function(el){
        changements[el.dataset.corr] = el.value;
      });

      const ok = await askConfirm(
        'Enregistrer les modifications ?',
        'Les anciennes valeurs et les nouvelles valeurs seront conservées dans l’historique du dossier.',
        'Enregistrer les modifications'
      );
      if(!ok) return;

      const oldText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.classList.add('busy');
      saveBtn.innerHTML = '<span class="spinner"></span>Modification en cours';
      setStatus('Modification en cours...','');

      google.script.run
        .withSuccessHandler(function(v){
          saveBtn.disabled = false;
          saveBtn.classList.remove('busy');
          saveBtn.innerHTML = oldText;
          document.getElementById('correctionReason').value = '';
          setStatus('Modifications enregistrées.','ok');
          render(v);
        })
        .withFailureHandler(function(e){
          saveBtn.disabled = false;
          saveBtn.classList.remove('busy');
          saveBtn.innerHTML = oldText;
          setStatus('Erreur : '+(e&&e.message||e),'err');
        })
        .EUC_ADMIN_WORKFLOW_corrigerV149(current.id, changements, motif);

      return;
    }

    if(deleteBtn){
      const motif = document.getElementById('deleteReason').value.trim();
      if(!motif){
        setStatus('Motif de suppression obligatoire.','err');
        return;
      }

      const ok = await askConfirm(
        'Supprimer cette convention ?',
        'La convention sera retirée des listes courantes. Le motif, l’auteur, la date et un snapshot complet seront conservés.',
        'Supprimer la convention'
      );
      if(!ok) return;

      const oldText = deleteBtn.innerHTML;
      deleteBtn.disabled = true;
      deleteBtn.classList.add('busy');
      deleteBtn.innerHTML = '<span class="spinner"></span>Suppression en cours';
      setStatus('Suppression en cours...','');

      google.script.run
        .withSuccessHandler(function(){
          deleteBtn.disabled = false;
          deleteBtn.classList.remove('busy');
          deleteBtn.innerHTML = oldText;
          document.getElementById('deleteReason').value = '';
          detail.classList.add('hidden');
          current = null;
          selected = null;
          search.value = '';
          openBtn.disabled = true;
          reloadYear(yearContext.active);
        })
        .withFailureHandler(function(e){
          deleteBtn.disabled = false;
          deleteBtn.classList.remove('busy');
          deleteBtn.innerHTML = oldText;
          setStatus('Erreur : '+(e&&e.message||e),'err');
        })
        .EUC_ADMIN_WORKFLOW_supprimerV149(current.id, motif);
    }
  }, true);

EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Admin_Conventions_PFMP.html")
s=p.read_text(encoding="utf-8")
binding=Path("/tmp/dev153_top_level.js").read_text(encoding="utf-8")

# Retirer les anciens onclick inline s'il en reste.
s=s.replace(' onclick="DEV151_saveCorrection()"','')
s=s.replace(' onclick="DEV151_deleteConvention()"','')

# Injecter AVANT la toute dernière fermeture de l'IIFE.
marker="\n})();\n</script>"
pos=s.rfind(marker)
if pos < 0:
    raise SystemExit("ERREUR : fermeture finale de l'IIFE introuvable.")

if "DEV.153 — handlers TOP LEVEL" not in s:
    s=s[:pos] + "\n" + binding + s[pos:]

p.write_text(s,encoding="utf-8")
print("OK : handlers DEV.153 injectés au TOP LEVEL.")
PY

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs")
s=p.read_text(encoding="utf-8")

# Sécuriser le schéma avant correction/suppression.
for sig in [
  "function EUC_ADMIN_WORKFLOW_corrigerV149(accesId,changements,motif){",
  "function EUC_ADMIN_WORKFLOW_supprimerV149(accesId,motif){"
]:
    if sig not in s:
        raise SystemExit("ERREUR : fonction serveur absente : "+sig)
    wanted=sig+"\n  EUC_ADMIN_WORKFLOW_assurerColonnesV149_();"
    if wanted not in s:
        s=s.replace(sig,wanted,1)

p.write_text(s,encoding="utf-8")
print("OK : schéma V149 garanti avant mutation.")
PY

echo "============================================================"
echo " DEV.153 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_V153.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V153.js

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Admin_Conventions_PFMP.html").read_text(encoding="utf-8")

pos_handler=s.rfind("DEV.153 — handlers TOP LEVEL")
pos_close=s.rfind("})();\n</script>")

if pos_handler < 0:
    raise SystemExit("ERREUR : handler DEV.153 absent.")
if pos_handler > pos_close:
    raise SystemExit("ERREUR : handler DEV.153 mal positionné.")

scripts=re.findall(r"<script>(.*?)</script>",s,re.S)
js="\n".join(scripts)
js=re.sub(r"<\?!=.*?\?>","{}",js)
Path("/tmp/Admin_Conventions_PFMP_DEV153.js").write_text(js,encoding="utf-8")

print("OK : handler DEV.153 présent avant fermeture IIFE.")
PY

node --check /tmp/Admin_Conventions_PFMP_DEV153.js

grep -q "DEV.153 — handlers TOP LEVEL" "$PAGE"
grep -q "Modification en cours" "$PAGE"
grep -q "Suppression en cours" "$PAGE"

echo "OK : JavaScript client valide."
echo "OK : handlers réellement actifs dès le chargement."

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
echo " DEV.153 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ handlers correction/suppression au niveau principal"
echo "✓ actifs dès ouverture de la page"
echo "✓ modales + spinner conservés"
echo "✓ schéma V149 garanti avant écriture"
echo "✓ push + version + déploiement principal"
echo "============================================================"
