#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.155-fix3"

HOME_SERVICE="apps-script/EUC_SUIVI_PFMP_ClassesV154.gs"
DETAIL_SERVICE="apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs"
HOME_PAGE="apps-script/Suivi_PFMP_Classes.html"
ROUTER="apps-script/EDT.js"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV155_avant_FIX3_${STAMP}"
mkdir -p "$BACKUP"

for f in "$HOME_SERVICE" "$DETAIL_SERVICE" "$HOME_PAGE" "$ROUTER"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

python3 <<'PY'
from pathlib import Path
import re

# ============================================================
# 1) SUPPRIMER TOUS LES CONTROLES ADMIN DES VUES LECTURE SEULE
# ============================================================
for filename in [
    "apps-script/EUC_SUIVI_PFMP_ClassesV154.gs",
    "apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs",
]:
    p=Path(filename)
    s=p.read_text(encoding="utf-8")

    # On retire explicitement les appels admin dans ces services lecture seule.
    s=s.replace("  EUC_ADMIN_WORKFLOW_ctxV144_();\n","")
    s=s.replace("EUC_ADMIN_WORKFLOW_ctxV144_();\n","")

    p.write_text(s,encoding="utf-8")
    print("OK : contrôles admin retirés de", filename)

# ============================================================
# 2) RENDRE TOUTES LES VIGNETTES DIRECTEMENT CLIQUABLES
#    AVEC UN LIEN HTML, PAS UN HANDLER JS FRAGILE.
# ============================================================
p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")

# Ajouter le style d'un lien de carte.
if ".classlink{" not in s:
    s=s.replace(
        ".classcard{cursor:pointer;transition:.15s ease}",
        ".classlink{display:block;text-decoration:none;color:inherit}.classcard{cursor:pointer;transition:.15s ease}",
        1
    )
    if ".classlink{" not in s:
        # fallback si la règle classcard diffère
        marker=".classhead{"
        if marker in s:
            s=s.replace(marker,".classlink{display:block;text-decoration:none;color:inherit}\n    "+marker,1)

# Remplacer le rendu de carte par un <a href=...>.
pattern=re.compile(
    r"return '<div class=\"card classcard\" data-class=\"'\+c\.classeId\+'\">'\+\s*"
    r"'<div class=\"classhead\"><b>'\+esc\(c\.classe\)\+'</b><span class=\"badge\">'\+c\.effectif\+' élève\(s\)</span></div>'\+\s*"
    r"periods\+\s*"
    r"'<div class=\"coming\">.*?</div></div>';",
    re.S
)

replacement="""const href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(yearContext.active)+'&classe='+encodeURIComponent(c.classeId);
        return '<a class="classlink" href="'+href+'"><div class="card classcard">'+
          '<div class="classhead"><b>'+esc(c.classe)+'</b><span class="badge">'+c.effectif+' élève(s)</span></div>'+
          periods+
          '<div class="coming">Cliquer pour ouvrir le tableau détaillé</div>'+
        '</div></a>';"""

m=pattern.search(s)
if m:
    s=s[:m.start()]+replacement+s[m.end():]
else:
    # Fallback plus large : localiser l'ancien return.
    old="return '<div class=\"card classcard\" data-class=\"'+c.classeId+'\"><div class=\"classhead\"><b>'+esc(c.classe)+'</b><span class=\"badge\">'+c.effectif+' élève(s)</span></div>'+periods+'<div class=\"coming\">Cliquer pour ouvrir le tableau détaillé</div></div>';"
    if old in s:
        s=s.replace(old,replacement,1)
    elif 'class="classlink"' not in s:
        raise SystemExit("ERREUR : rendu vignette classe introuvable.")

# Supprimer le handler JS des cartes s'il existe : le lien HTML suffit.
s=re.sub(
    r"\n\s*Array\.from\(content\.querySelectorAll\('\[data-class\]'\)\)\.forEach\(function\(el\)\{.*?\n\s*\}\);",
    "",
    s,
    count=1,
    flags=re.S
)

p.write_text(s,encoding="utf-8")
print("OK : toutes les cartes sont des liens HTML directs.")
PY

echo "============================================================"
echo " DEV.155 FIX3 — CONTROLES"
echo "============================================================"

cp "$HOME_SERVICE" /tmp/EUC_SUIVI_PFMP_ClassesV154_FIX3.js
cp "$DETAIL_SERVICE" /tmp/EUC_SUIVI_PFMP_ClasseDetailV155_FIX3.js
cp "$ROUTER" /tmp/EDT_DEV155_FIX3.js

node --check /tmp/EUC_SUIVI_PFMP_ClassesV154_FIX3.js
node --check /tmp/EUC_SUIVI_PFMP_ClasseDetailV155_FIX3.js
node --check /tmp/EDT_DEV155_FIX3.js

if grep -q "EUC_ADMIN_WORKFLOW_ctxV144_" "$HOME_SERVICE"; then
  echo "ERREUR : contrôle admin encore présent dans accueil suivi."
  exit 1
fi

if grep -q "EUC_ADMIN_WORKFLOW_ctxV144_" "$DETAIL_SERVICE"; then
  echo "ERREUR : contrôle admin encore présent dans détail suivi."
  exit 1
fi

grep -q 'class="classlink"' "$HOME_PAGE"
grep -q "page=suivi-pfmp-classe" "$HOME_PAGE"
grep -q "page === 'suivi-pfmp-classe'" "$ROUTER"

echo "OK : aucune exigence admin dans les vues lecture."
echo "OK : toutes les classes sont des liens directs."
echo "OK : route détail présente."

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
echo " DEV.155 FIX3 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ plus aucun contrôle admin sur le suivi lecture seule"
echo "✓ toutes les classes cliquables, même à 0 convention"
echo "✓ navigation par liens HTML directs, sans handler fragile"
echo "✓ année scolaire transmise dans l'URL"
echo "✓ push + version + déploiement principal"
echo "============================================================"
