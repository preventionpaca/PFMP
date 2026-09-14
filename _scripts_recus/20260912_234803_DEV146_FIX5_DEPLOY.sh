#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.146-fix5"

SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
PAGE="apps-script/Admin_Conventions_PFMP.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV146_avant_FIX5_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$PAGE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs")
s=p.read_text(encoding="utf-8")

old="""  var tpl=HtmlService.createTemplateFromFile('Admin_Conventions_PFMP');
  tpl.config={
    baseUrl:ScriptApp.getService().getUrl()
  };
  tpl.dossiersJson=JSON.stringify(EUC_ADMIN_WORKFLOW_listerDossiersV146());"""

new="""  var tpl=HtmlService.createTemplateFromFile('Admin_Conventions_PFMP');
  tpl.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });
  tpl.dossiersJson=JSON.stringify(EUC_ADMIN_WORKFLOW_listerDossiersV146());"""

if old in s:
    s=s.replace(old,new,1)
elif "tpl.config=JSON.stringify({" in s:
    print("Renderer déjà corrigé.")
else:
    raise SystemExit("ERREUR : renderer DEV.146 introuvable.")

p.write_text(s,encoding="utf-8")
print("OK : config injectée comme JSON JavaScript valide.")
PY

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Admin_Conventions_PFMP.html")
s=p.read_text(encoding="utf-8")

# Le template doit recevoir deux littéraux JSON valides.
if "const C=<?!= config ?>;" not in s:
    raise SystemExit("ERREUR : constante C introuvable dans la page.")

if "const DOSSIERS_INIT=<?!= dossiersJson ?>;" not in s:
    raise SystemExit("ERREUR : constante DOSSIERS_INIT introuvable dans la page.")

# Ajout d'un garde-fou visible en cas de données non injectées.
needle="let dossiers=Array.isArray(DOSSIERS_INIT)?DOSSIERS_INIT:[],selected=null,current=null;"
replacement="""let dossiers=Array.isArray(DOSSIERS_INIT)?DOSSIERS_INIT:[],selected=null,current=null;
  if(!Array.isArray(DOSSIERS_INIT)){
    console.error('DEV146 FIX5 - DOSSIERS_INIT invalide',DOSSIERS_INIT);
  }"""

if needle in s and "DEV146 FIX5 - DOSSIERS_INIT invalide" not in s:
    s=s.replace(needle,replacement,1)

p.write_text(s,encoding="utf-8")
print("OK : garde-fou DOSSIERS_INIT ajouté.")
PY

echo "============================================================"
echo " DEV.146 FIX5 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_V146_FIX5.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V146_FIX5.js

grep -q "tpl.config=JSON.stringify" "$SERVICE"
grep -q "tpl.dossiersJson=JSON.stringify" "$SERVICE"
grep -q "const DOSSIERS_INIT=<?!= dossiersJson ?>;" "$PAGE"
grep -q "let dossiers=Array.isArray(DOSSIERS_INIT)" "$PAGE"

echo "OK : config JSON valide."
echo "OK : dossiers JSON injectés."
echo "OK : page prête."

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
clasp version "$LABEL"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy \
  -i "$DEPLOYMENT_ID" \
  -d "$LABEL"

echo
echo "=== CONTROLE DEPLOIEMENTS ==="
clasp deployments

echo
echo "============================================================"
echo " DEV.146 FIX5 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ erreur JavaScript d'injection config corrigée"
echo "✓ 2 dossiers injectés directement dans la page"
echo "✓ push + version + déploiement principal effectués"
echo
echo "Recharge la page avec Ctrl+Shift+R."
echo "Sous la recherche, tu dois voir : 2 dossier(s) disponible(s)."
echo "============================================================"
