#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.156-fix2"
PAGE="apps-script/Suivi_PFMP_Classe_Detail.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV156_avant_FIX2_${STAMP}"
mkdir -p "$BACKUP"
cp "$PAGE" "$BACKUP/"

python3 <<'PY'
from pathlib import Path
import re

p = Path("apps-script/Suivi_PFMP_Classe_Detail.html")
s = p.read_text(encoding="utf-8")

for r in ["phoneProfInput","visitProfInput","phoneAssignBtn","visitAssignBtn","selectedIds","bindProfAutocomplete"]:
    if r not in s:
        raise SystemExit("ERREUR : élément DEV.156 introuvable : " + r)

# CSS
if ".assign-status-v156{" not in s:
    css = (
        "    .assign-status-v156{display:none;margin:0 0 12px;padding:10px 12px;border-radius:10px;font-weight:700}\n"
        "    .assign-status-v156.show{display:block}\n"
        "    .assign-status-v156.info{background:#eef5fb;color:#164e7a}\n"
        "    .assign-status-v156.ok{background:#ecfdf3;color:#067647}\n"
        "    .assign-status-v156.err{background:#fff1f2;color:#b42318}\n"
        "    #phoneAssignBtn:disabled,#visitAssignBtn:disabled{opacity:.55;cursor:not-allowed}\n"
    )
    marker = "    @media(max-width:850px){"
    if marker in s:
        s = s.replace(marker, css + marker, 1)
    else:
        s = s.replace("</style>", css + "</style>", 1)

# Helpers JS
if "function ensureAssignStatusV156()" not in s:
    lines = [
        "  function ensureAssignStatusV156(){",
        "    let box=document.getElementById('assignStatusV156');",
        "    if(box)return box;",
        "    box=document.createElement('div');",
        "    box.id='assignStatusV156';",
        "    box.className='assign-status-v156';",
        "    const phone=document.getElementById('phoneProfInput');",
        "    if(phone){",
        "      const host=phone.closest('.assignbar') || phone.closest('.card') || phone.parentElement;",
        "      if(host && host.parentNode)host.parentNode.insertBefore(box,host);",
        "      else if(phone.parentNode)phone.parentNode.insertBefore(box,phone);",
        "    }",
        "    return box;",
        "  }",
        "",
        "  function showAssignStatusV156(text,type){",
        "    const box=ensureAssignStatusV156();",
        "    if(!box)return;",
        "    box.textContent=text||'';",
        "    box.className='assign-status-v156'+(text?' show':'')+(type?' '+type:'');",
        "  }",
        "",
        "  function refreshAssignButtonsV156(){",
        "    const ids=selectedIds();",
        "    const phoneBtn=document.getElementById('phoneAssignBtn');",
        "    const visitBtn=document.getElementById('visitAssignBtn');",
        "    if(phoneBtn)phoneBtn.disabled=(ids.length===0 || !selectedProfPhone);",
        "    if(visitBtn)visitBtn.disabled=(ids.length===0 || !selectedProfVisit);",
        "  }",
        ""
    ]
    helper = "\n".join(lines)
    marker = "  function selectedIds(){"
    if marker not in s:
        raise SystemExit("ERREUR : fonction selectedIds introuvable.")
    s = s.replace(marker, helper + marker, 1)

# Ajouter refresh des boutons dans refreshSelectedCount
m = re.search(r"(function refreshSelectedCount\(\)\{.*?selectAll\.checked=.*?;)(\s*\n\s*\})", s, re.S)
if m and "refreshAssignButtonsV156();" not in m.group(0):
    s = s[:m.start()] + m.group(1) + "\n    refreshAssignButtonsV156();" + m.group(2) + s[m.end():]

# Lorsqu'on retape le nom du prof, invalider la sélection précédente
s = s.replace(
    "      setter(null);\n      const q=norm(input.value).trim();",
    "      setter(null);\n      refreshAssignButtonsV156();\n      const q=norm(input.value).trim();",
    1
)

# Après clic sur un professeur proposé
old = "          setter(p);input.value=p.nom;box.style.display='none';"
new = "          setter(p);input.value=p.nom;box.style.display='none';showAssignStatusV156('Professeur sélectionné : '+p.nom,'info');refreshAssignButtonsV156();"
if old in s:
    s = s.replace(old, new, 1)

# Remplacer les alertes système
s = s.replace(
    "if(!prof){alert('Sélectionnez un professeur.');return}",
    "if(!prof){showAssignStatusV156('Sélectionnez d’abord un professeur dans la liste.','err');return}"
)
s = s.replace(
    "if(!ids.length){alert('Sélectionnez au moins un élève.');return}",
    "if(!ids.length){showAssignStatusV156('Sélectionnez au moins un élève avant l’affectation.','err');return}"
)
s = s.replace(
    "if(!detail.periode){alert('Aucune période sélectionnée.');return}",
    "if(!detail.periode){showAssignStatusV156('Aucune période PFMP sélectionnée.','err');return}"
)

# Feedback pendant affectation
old = (
    "    const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='Affectation en cours...';\n"
    "    google.script.run\n"
    "      .withSuccessHandler(function(r){btn.disabled=false;btn.innerHTML=old;detail=r;render()})\n"
    "      .withFailureHandler(function(e){btn.disabled=false;btn.innerHTML=old;alert('Erreur : '+(e&&e.message||e))})"
)
new = (
    "    const old=btn.innerHTML;\n"
    "    btn.disabled=true;\n"
    "    btn.innerHTML='Affectation en cours...';\n"
    "    showAssignStatusV156('Affectation en cours...','info');\n"
    "    google.script.run\n"
    "      .withSuccessHandler(function(r){btn.disabled=false;btn.innerHTML=old;detail=r;showAssignStatusV156('Affectation enregistrée.','ok');render()})\n"
    "      .withFailureHandler(function(e){btn.disabled=false;btn.innerHTML=old;showAssignStatusV156('Erreur : '+(e&&e.message||e),'err');refreshAssignButtonsV156()})"
)
if old in s:
    s = s.replace(old, new, 1)

# Initialiser l'état des boutons au premier rendu
if "ensureAssignStatusV156();" not in s[s.rfind("  render();"):]:
    s = s.replace(
        "  render();\n})();",
        "  render();\n  ensureAssignStatusV156();\n  refreshAssignButtonsV156();\n})();",
        1
    )

p.write_text(s, encoding="utf-8")
print("OK : DEV.156 FIX2 appliquée.")
PY

echo "============================================================"
echo " DEV.156 FIX2 — CONTROLES"
echo "============================================================"

grep -q "ensureAssignStatusV156" "$PAGE"
grep -q "refreshAssignButtonsV156" "$PAGE"
grep -q "Sélectionnez au moins un élève avant l’affectation" "$PAGE"
grep -q "Affectation enregistrée" "$PAGE"

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail.html").read_text(encoding="utf-8")
scripts=re.findall(r"<script>(.*?)</script>",s,re.S)
js="\n".join(scripts)
js=re.sub(r"<\?!=.*?\?>","{}",js)
Path("/tmp/Suivi_PFMP_Classe_Detail_DEV156_FIX2.js").write_text(js,encoding="utf-8")
PY

node --check /tmp/Suivi_PFMP_Classe_Detail_DEV156_FIX2.js

echo "OK : JavaScript client valide."
echo "OK : aucun besoin d'un id toolbar spécifique."

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
echo " DEV.156 FIX2 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ plus de boîte système si aucun élève"
echo "✓ message intégré"
echo "✓ boutons Affecter actifs seulement si élève + professeur"
echo "✓ Affectation en cours / Affectation enregistrée"
echo "✓ push + version + déploiement principal"
echo "============================================================"
