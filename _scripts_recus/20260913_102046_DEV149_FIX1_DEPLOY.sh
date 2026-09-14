#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.149-fix1"
SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
PAGE="apps-script/Admin_Conventions_PFMP.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV149_avant_FIX1_${STAMP}"
mkdir -p "$BACKUP"
cp "$SERVICE" "$BACKUP/"
cp "$PAGE" "$BACKUP/"

echo "============================================================"
echo " DEV.149 FIX1 — REPRISE APRES ECHEC D'INSERTION HTML"
echo "============================================================"

# Le premier DEV.149 a déjà pu modifier le service avant de s'arrêter.
# On vérifie donc d'abord que les fonctions serveur sont bien présentes.
grep -q "function EUC_ADMIN_WORKFLOW_corrigerV149" "$SERVICE" || {
  echo "ERREUR : fonction EUC_ADMIN_WORKFLOW_corrigerV149 absente."
  echo "Le service DEV.149 n'a pas été préparé."
  exit 1
}
grep -q "function EUC_ADMIN_WORKFLOW_supprimerV149" "$SERVICE" || {
  echo "ERREUR : fonction EUC_ADMIN_WORKFLOW_supprimerV149 absente."
  exit 1
}
grep -q "function INSTALLER_DEV149_CORRECTIONS_SUPPRESSIONS" "$SERVICE" || {
  echo "ERREUR : installateur DEV.149 absent."
  exit 1
}

cat > /tmp/dev149_block_fix1.html <<'EOF'
<div class="card" id="correctionAdminV149">
  <h2>Corriger la convention</h2>
  <div class="sub">Toute correction est historisée avec les valeurs avant/après et un motif obligatoire.</div>

  <div class="edit-grid" style="margin-top:14px">
    <label><span>Entreprise</span><input data-corr="Entreprise_raison_sociale"></label>
    <label><span>SIRET</span><input data-corr="Entreprise_siret"></label>
    <label><span>Adresse entreprise</span><input data-corr="Entreprise_adresse"></label>
    <label><span>Code postal</span><input data-corr="Entreprise_code_postal"></label>
    <label><span>Commune</span><input data-corr="Entreprise_commune"></label>

    <label><span>Nom responsable</span><input data-corr="Responsable_nom"></label>
    <label><span>Prénom responsable</span><input data-corr="Responsable_prenom"></label>
    <label><span>Fonction responsable</span><input data-corr="Responsable_fonction"></label>
    <label><span>Téléphone responsable</span><input data-corr="Responsable_telephone"></label>
    <label><span>Courriel responsable</span><input data-corr="Responsable_courriel"></label>

    <label><span>Nom tuteur</span><input data-corr="Tuteur_nom"></label>
    <label><span>Prénom tuteur</span><input data-corr="Tuteur_prenom"></label>
    <label><span>Fonction tuteur</span><input data-corr="Tuteur_fonction"></label>
    <label><span>Téléphone tuteur</span><input data-corr="Tuteur_telephone"></label>
    <label><span>Courriel tuteur</span><input data-corr="Tuteur_courriel"></label>

    <label><span>Date début</span><input type="date" data-corr="Date_debut"></label>
    <label><span>Date fin</span><input type="date" data-corr="Date_fin"></label>
  </div>

  <label style="display:block;margin-top:14px;font-weight:700">
    Motif de correction
    <textarea id="correctionReason" rows="3" placeholder="Motif obligatoire"></textarea>
  </label>

  <div class="edit-actions">
    <button id="saveCorrectionBtn" class="primary">Enregistrer les corrections</button>
  </div>
</div>

<div class="card">
  <div class="archive-box">
    <h3>Supprimer administrativement la convention</h3>
    <p class="sub">La convention disparaît des listes courantes, mais le motif, l'auteur, la date et un snapshot complet sont conservés.</p>
    <textarea id="deleteReason" rows="3" placeholder="Motif de suppression obligatoire"></textarea>
    <button id="deleteConventionBtn" class="danger" style="margin-top:10px">Supprimer la convention</button>
  </div>
</div>
EOF

python3 <<'PY'
from pathlib import Path

p = Path("apps-script/Admin_Conventions_PFMP.html")
s = p.read_text(encoding="utf-8")
block = Path("/tmp/dev149_block_fix1.html").read_text(encoding="utf-8")

if 'id="correctionAdminV149"' not in s:
    pos = s.find('<h2>Actions exceptionnelles</h2>')
    if pos < 0:
        pos = s.find('Actions exceptionnelles')
    if pos < 0:
        raise SystemExit("ERREUR : texte Actions exceptionnelles introuvable.")

    card_start = s.rfind('<div class="card">', 0, pos)
    if card_start < 0:
        card_start = s.rfind('<section class="card">', 0, pos)
    if card_start < 0:
        raise SystemExit("ERREUR : conteneur Actions exceptionnelles introuvable.")

    s = s[:card_start] + block + "\n" + s[card_start:]

if ".edit-grid{" not in s:
    css = (
        "    .edit-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}\n"
        "    .edit-grid label span{display:block;margin-bottom:6px;font-weight:700}\n"
        "    .edit-actions{display:flex;justify-content:flex-end;margin-top:14px}\n"
        "    .archive-box{border:1px solid #f3b7b7;background:#fff8f8;border-radius:14px;padding:16px}\n"
        "    .archive-box h3{margin:0 0 8px;color:#a61b1b}\n"
    )
    marker = "    @media(max-width:850px){"
    if marker not in s:
        raise SystemExit("ERREUR : ancre CSS responsive introuvable.")
    s = s.replace(marker, css + marker, 1)

p.write_text(s, encoding="utf-8")
print("OK : blocs correction/suppression + CSS ajoutés.")
PY

python3 <<'PY'
from pathlib import Path

p = Path("apps-script/Admin_Conventions_PFMP.html")
s = p.read_text(encoding="utf-8")

marker = "    period.textContent=detailPeriod;"
fill = '''    const corr=v.correction||{};
    Array.from(document.querySelectorAll('[data-corr]')).forEach(function(el){
      el.value=corr[el.dataset.corr]||'';
    });'''

if "const corr=v.correction||{};" not in s:
    if marker not in s:
        raise SystemExit("ERREUR : ancre de remplissage fiche introuvable.")
    s = s.replace(marker, marker + "\n" + fill, 1)

handlers = r'''
  document.getElementById('saveCorrectionBtn').onclick=async function(){
    if(!current)return;

    const btn=this;
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
      'Enregistrer les corrections ?',
      'Les anciennes et nouvelles valeurs seront conservées dans l’historique.',
      'Enregistrer les corrections'
    );
    if(!ok)return;

    const old=btn.innerHTML;
    btn.disabled=true;
    btn.classList.add('busy');
    btn.innerHTML='<span class="spinner"></span>Correction en cours';

    google.script.run
      .withSuccessHandler(function(v){
        btn.disabled=false;
        btn.classList.remove('busy');
        btn.innerHTML=old;
        document.getElementById('correctionReason').value='';
        setStatus('Corrections enregistrées.','ok');
        render(v);
      })
      .withFailureHandler(function(e){
        btn.disabled=false;
        btn.classList.remove('busy');
        btn.innerHTML=old;
        setStatus('Erreur : '+(e&&e.message||e),'err');
      })
      .EUC_ADMIN_WORKFLOW_corrigerV149(current.id,changements,motif);
  };

  document.getElementById('deleteConventionBtn').onclick=async function(){
    if(!current)return;

    const btn=this;
    const motif=document.getElementById('deleteReason').value.trim();

    if(!motif){
      setStatus('Motif de suppression obligatoire.','err');
      return;
    }

    const ok=await askConfirm(
      'Supprimer cette convention ?',
      'Elle sera retirée des listes courantes. Un snapshot complet et le motif resteront conservés.',
      'Supprimer la convention'
    );
    if(!ok)return;

    const old=btn.innerHTML;
    btn.disabled=true;
    btn.classList.add('busy');
    btn.innerHTML='<span class="spinner"></span>Suppression en cours';

    google.script.run
      .withSuccessHandler(function(){
        btn.disabled=false;
        btn.classList.remove('busy');
        btn.innerHTML=old;
        detail.classList.add('hidden');
        current=null;
        selected=null;
        search.value='';
        openBtn.disabled=true;
        reloadYear(yearContext.active);
      })
      .withFailureHandler(function(e){
        btn.disabled=false;
        btn.classList.remove('busy');
        btn.innerHTML=old;
        setStatus('Erreur : '+(e&&e.message||e),'err');
      })
      .EUC_ADMIN_WORKFLOW_supprimerV149(current.id,motif);
  };

'''

if "document.getElementById('saveCorrectionBtn').onclick" not in s:
    anchor = "  renderSchoolYears();"
    if anchor not in s:
        raise SystemExit("ERREUR : ancre JS finale introuvable.")
    s = s.replace(anchor, handlers + anchor, 1)

p.write_text(s, encoding="utf-8")
print("OK : handlers correction/suppression ajoutés.")
PY

echo
echo "============================================================"
echo " DEV.149 FIX1 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_V149_FIX1.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V149_FIX1.js

grep -q "EUC_ADMIN_WORKFLOW_corrigerV149" "$SERVICE"
grep -q "EUC_ADMIN_WORKFLOW_supprimerV149" "$SERVICE"
grep -q 'id="correctionAdminV149"' "$PAGE"
grep -q 'id="deleteConventionBtn"' "$PAGE"

python3 <<'PY'
from pathlib import Path
import re

s = Path("apps-script/Admin_Conventions_PFMP.html").read_text(encoding="utf-8")
scripts = re.findall(r"<script>(.*?)</script>", s, re.S)
js = "\n".join(scripts)
js = re.sub(r"<\?!=.*?\?>", "{}", js)
Path("/tmp/Admin_Conventions_PFMP_DEV149_FIX1.js").write_text(js, encoding="utf-8")
PY

node --check /tmp/Admin_Conventions_PFMP_DEV149_FIX1.js

echo "OK : service V149 valide."
echo "OK : interface V149 valide."

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
echo " DEV.149 FIX1 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Avant test, lancer dans Apps Script :"
echo "INSTALLER_DEV149_CORRECTIONS_SUPPRESSIONS"
echo "============================================================"
