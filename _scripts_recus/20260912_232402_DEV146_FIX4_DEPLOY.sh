#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.146-fix4"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV146_avant_FIX4_${STAMP}"
mkdir -p "$BACKUP"

SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
PAGE="apps-script/Admin_Conventions_PFMP.html"

for f in "$SERVICE" "$PAGE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

python3 <<'PY'
from pathlib import Path

# ------------------------------------------------------------
# 1) Injecter la liste des dossiers directement au rendu serveur
# ------------------------------------------------------------
p=Path("apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs")
s=p.read_text(encoding="utf-8")

old="""  var tpl=HtmlService.createTemplateFromFile('Admin_Conventions_PFMP');
  tpl.config={
    baseUrl:ScriptApp.getService().getUrl()
  };"""

new="""  var tpl=HtmlService.createTemplateFromFile('Admin_Conventions_PFMP');
  tpl.config={
    baseUrl:ScriptApp.getService().getUrl()
  };
  tpl.dossiersJson=JSON.stringify(EUC_ADMIN_WORKFLOW_listerDossiersV146());"""

if old not in s:
    if "tpl.dossiersJson=JSON.stringify(EUC_ADMIN_WORKFLOW_listerDossiersV146())" not in s:
        raise SystemExit("ERREUR : renderer DEV.146 introuvable.")
else:
    s=s.replace(old,new,1)

p.write_text(s,encoding="utf-8")
print("OK : dossiers injectés côté serveur dans le template.")
PY

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Admin_Conventions_PFMP.html")
s=p.read_text(encoding="utf-8")

# 2) Ajouter la constante serveur juste après config
old="const C=<?!= config ?>;"
new="const C=<?!= config ?>;\nconst DOSSIERS_INIT=<?!= dossiersJson ?>;"

if old in s and "const DOSSIERS_INIT=" not in s:
    s=s.replace(old,new,1)

# 3) Initialiser directement dossiers avec le contenu serveur
old2="let dossiers=[],selected=null,current=null;"
new2="let dossiers=Array.isArray(DOSSIERS_INIT)?DOSSIERS_INIT:[],selected=null,current=null;"

if old2 in s:
    s=s.replace(old2,new2,1)

# 4) Remplacer l'appel asynchrone final par simple affichage du nombre
old3="""  google.script.run
    .withSuccessHandler(function(rows){
      dossiers=rows||[];
      selectedHint.textContent=dossiers.length+' dossier(s) disponible(s).';
    })
    .withFailureHandler(function(e){
      selectedHint.textContent='Erreur : '+(e&&e.message||e);
    })
    .EUC_ADMIN_WORKFLOW_listerDossiersV146();"""

new3="""  selectedHint.textContent=dossiers.length+' dossier(s) disponible(s).';"""

if old3 in s:
    s=s.replace(old3,new3,1)
elif new3 not in s:
    raise SystemExit("ERREUR : bloc de chargement dossiers introuvable.")

p.write_text(s,encoding="utf-8")
print("OK : autocomplétion alimentée directement par les 2 dossiers serveur.")
PY

echo "============================================================"
echo " DEV.146 FIX4 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_V146_FIX4.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V146_FIX4.js

grep -q "dossiersJson=JSON.stringify(EUC_ADMIN_WORKFLOW_listerDossiersV146())" "$SERVICE"
grep -q "const DOSSIERS_INIT=" "$PAGE"
grep -q "let dossiers=Array.isArray(DOSSIERS_INIT)" "$PAGE"

echo "OK : injection serveur des dossiers présente."
echo "OK : autocomplétion n'attend plus un appel google.script.run."

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
echo " DEV.146 FIX4 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ les dossiers sont chargés dès l'ouverture de la page"
echo "✓ aucune dépendance à un appel asynchrone pour l'autocomplétion"
echo "✓ recherche référence / nom / prénom / classe / entreprise"
echo "✓ push + version + déploiement principal"
echo
echo "Recharge la page avec Ctrl+Shift+R."
echo "La ligne sous le champ doit afficher : 2 dossier(s) disponible(s)."
echo "============================================================"
