#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.156-fix1"
PAGE="apps-script/Suivi_PFMP_Classe_Detail.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV156_avant_FIX1_${STAMP}"
mkdir -p "$BACKUP"
cp "$PAGE" "$BACKUP/"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Suivi_PFMP_Classe_Detail.html")
s=p.read_text(encoding="utf-8")

if 'id="assignStatusV156"' not in s:
    marker='<div id="assignToolbarV156" class="assignbar">'
    if marker not in s:
        raise SystemExit("ERREUR : toolbar affectations introuvable.")
    s=s.replace(marker,'<div id="assignStatusV156" class="assign-status"></div>\n'+marker,1)

if ".assign-status{" not in s:
    css=(
        "    .assign-status{display:none;margin-bottom:12px;padding:10px 12px;border-radius:10px;font-weight:700}\n"
        "    .assign-status.show{display:block}\n"
        "    .assign-status.info{background:#eef5fb;color:#164e7a}\n"
        "    .assign-status.ok{background:#ecfdf3;color:#067647}\n"
        "    .assign-status.err{background:#fff1f2;color:#b42318}\n"
        "    .assignrow button:disabled{opacity:.55;cursor:not-allowed}\n"
    )
    marker="    @media(max-width:850px){"
    if marker not in s:
        raise SystemExit("ERREUR : ancre CSS responsive introuvable.")
    s=s.replace(marker,css+marker,1)

anchor="  const visitAssignBtn=document.getElementById('visitAssignBtn');"
if "const assignStatusV156=" not in s:
    s=s.replace(anchor,anchor+"\n  const assignStatusV156=document.getElementById('assignStatusV156');",1)

marker="  function selectedIds(){"
if "function showAssignStatus(" not in s:
    helper=(
        "  function showAssignStatus(text,type){\n"
        "    assignStatusV156.textContent=text||'';\n"
        "    assignStatusV156.className='assign-status'+(text?' show':'')+(type?' '+type:'');\n"
        "  }\n\n"
        "  function refreshAssignButtons(){\n"
        "    const n=selectedIds().length;\n"
        "    phoneAssignBtn.disabled = n===0 || !selectedProfPhone;\n"
        "    visitAssignBtn.disabled = n===0 || !selectedProfVisit;\n"
        "  }\n\n"
    )
    if marker not in s:
        raise SystemExit("ERREUR : selectedIds introuvable.")
    s=s.replace(marker,helper+marker,1)

old="    selectAll.checked=all.length>0&&all.every(function(x){return x.checked});\n  }"
new="    selectAll.checked=all.length>0&&all.every(function(x){return x.checked});\n    refreshAssignButtons();\n  }"
if old in s:
    s=s.replace(old,new,1)

s=s.replace(
    "          setter(p);input.value=p.nom;box.style.display='none';",
    "          setter(p);input.value=p.nom;box.style.display='none';showAssignStatus('Professeur sélectionné : '+p.nom,'info');refreshAssignButtons();",
    1
)
s=s.replace(
    "      setter(null);\n      const q=norm(input.value).trim();",
    "      setter(null);\n      refreshAssignButtons();\n      const q=norm(input.value).trim();",
    1
)

s=s.replace("if(!prof){alert('Sélectionnez un professeur.');return}",
            "if(!prof){showAssignStatus('Sélectionnez d’abord un professeur dans la liste.','err');return}")
s=s.replace("if(!ids.length){alert('Sélectionnez au moins un élève.');return}",
            "if(!ids.length){showAssignStatus('Sélectionnez au moins un élève avant l’affectation.','err');return}")
s=s.replace("if(!detail.periode){alert('Aucune période sélectionnée.');return}",
            "if(!detail.periode){showAssignStatus('Aucune période PFMP sélectionnée.','err');return}")

old4="    const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='Affectation en cours...';\n    google.script.run\n      .withSuccessHandler(function(r){btn.disabled=false;btn.innerHTML=old;detail=r;render()})\n      .withFailureHandler(function(e){btn.disabled=false;btn.innerHTML=old;alert('Erreur : '+(e&&e.message||e))})"
new4=(
    "    const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='Affectation en cours...';showAssignStatus('Affectation en cours...','info');\n"
    "    google.script.run\n"
    "      .withSuccessHandler(function(r){btn.disabled=false;btn.innerHTML=old;detail=r;showAssignStatus('Affectation enregistrée.','ok');render()})\n"
    "      .withFailureHandler(function(e){btn.disabled=false;btn.innerHTML=old;showAssignStatus('Erreur : '+(e&&e.message||e),'err');refreshAssignButtons()})"
)
if old4 in s:
    s=s.replace(old4,new4,1)

if "  refreshAssignButtons();\n})();" not in s:
    s=s.replace("  render();\n})();","  render();\n  refreshAssignButtons();\n})();",1)

p.write_text(s,encoding="utf-8")
print("OK : UX affectation V156 corrigée.")
PY

echo "=== CONTROLES DEV.156 FIX1 ==="
grep -q 'id="assignStatusV156"' "$PAGE"
grep -q "refreshAssignButtons" "$PAGE"
grep -q "Sélectionnez au moins un élève avant l’affectation" "$PAGE"
grep -q "Affectation enregistrée" "$PAGE"

python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/Suivi_PFMP_Classe_Detail.html").read_text(encoding="utf-8")
scripts=re.findall(r"<script>(.*?)</script>",s,re.S)
js="\n".join(scripts)
js=re.sub(r"<\?!=.*?\?>","{}",js)
Path("/tmp/Suivi_PFMP_Classe_Detail_DEV156_FIX1.js").write_text(js,encoding="utf-8")
PY

node --check /tmp/Suivi_PFMP_Classe_Detail_DEV156_FIX1.js

echo "=== PUSH ==="
clasp push -f

echo "=== VERSION ==="
clasp version "$LABEL"

echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.156 FIX1 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ alerte système supprimée"
echo "✓ message intégré dans la page"
echo "✓ boutons Affecter activés seulement si élève + professeur sélectionnés"
echo "✓ Affectation en cours / Affectation enregistrée"
echo "✓ push + version + déploiement principal"
echo "============================================================"
