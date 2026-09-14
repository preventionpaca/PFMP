#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.146-fix2"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV146_avant_FIX2_${STAMP}"
mkdir -p "$BACKUP"

ROUTER="apps-script/EDT.js"
SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
ADMIN="apps-script/Admin_PFMP.html"
PAGE="apps-script/Admin_Conventions_PFMP.html"

for f in "$ROUTER" "$SERVICE" "$ADMIN" "$PAGE"; do
  if [ ! -f "$f" ]; then
    echo "ERREUR : fichier introuvable : $f"
    exit 1
  fi
  cp "$f" "$BACKUP/"
done

# ============================================================
# 1. ROUTE REELLE DANS EDT.js
# ============================================================
python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EDT.js")
s=p.read_text(encoding="utf-8")

route="  if (page === 'admin-conventions-pfmp') return EUC_ADMIN_CONVENTIONS_afficherV146(e);"

if "page === 'admin-conventions-pfmp'" not in s:
    anchor="  if (page === 'parametres-convention-pfmp') return EUC_PARAM_CONV_afficher(e);"
    if anchor not in s:
        raise SystemExit("ERREUR : ancre de routage connue introuvable dans EDT.js.")
    s=s.replace(anchor,anchor+"\n"+route,1)
    p.write_text(s,encoding="utf-8")
    print("OK : route admin-conventions-pfmp ajoutée dans EDT.js.")
else:
    print("OK : route admin-conventions-pfmp déjà présente.")
PY

# ============================================================
# 2. RENDERER DE LA PAGE DEDIEE
# ============================================================
if ! grep -q "function EUC_ADMIN_CONVENTIONS_afficherV146" "$SERVICE"; then
cat >> "$SERVICE" <<'EOF'

function EUC_ADMIN_CONVENTIONS_afficherV146(e){
  EUC_ADMIN_WORKFLOW_ctxV144_();

  var tpl=HtmlService.createTemplateFromFile('Admin_Conventions_PFMP');
  tpl.config={
    baseUrl:ScriptApp.getService().getUrl()
  };

  return tpl.evaluate()
    .setTitle('Administration des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
EOF
fi

# ============================================================
# 3. VERIFIER / INSTALLER LA VIGNETTE
# ============================================================
if ! grep -q 'id="workflow-admin-v146-tile"' "$ADMIN"; then
cat > /tmp/dev146_tile_fix2.html <<'EOF'
<section class="card" id="workflow-admin-v146-tile">
  <h2>Administration des conventions</h2>
  <p>Recherche et suivi complet des conventions : finalisation, dépôt BFE, signature, remise, autorisation, annulation et interruption.</p>
  <a class="btn primary" href="<?!= config.baseUrl ?>?page=admin-conventions-pfmp">Ouvrir l'administration des conventions</a>
</section>
EOF

python3 <<'PY'
from pathlib import Path
p=Path("apps-script/Admin_PFMP.html")
s=p.read_text(encoding="utf-8")
tile=Path("/tmp/dev146_tile_fix2.html").read_text(encoding="utf-8")
marker="</main>"
if marker not in s:
    raise SystemExit("ERREUR : </main> introuvable dans Admin_PFMP.html.")
s=s.replace(marker,tile+marker,1)
p.write_text(s,encoding="utf-8")
print("OK : vignette Administration des conventions ajoutée.")
PY
else
  echo "OK : vignette Administration des conventions déjà présente."
fi

# ============================================================
# 4. CONTROLES BLOQUANTS
# ============================================================
echo
echo "============================================================"
echo " DEV.146 FIX2 — CONTROLES"
echo "============================================================"

cp "$ROUTER" /tmp/EDT_DEV146_FIX2.js
cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_DEV146_FIX2.js

node --check /tmp/EDT_DEV146_FIX2.js
node --check /tmp/EUC_ADMIN_WORKFLOW_DEV146_FIX2.js

grep -q "page === 'admin-conventions-pfmp'" "$ROUTER"
grep -q "EUC_ADMIN_CONVENTIONS_afficherV146" "$ROUTER"
grep -q "function EUC_ADMIN_CONVENTIONS_afficherV146" "$SERVICE"
grep -q "EUC_ADMIN_WORKFLOW_listerDossiersV146" "$SERVICE"
grep -q "EUC_ADMIN_WORKFLOW_vueV146" "$SERVICE"
grep -q 'id="workflow-admin-v146-tile"' "$ADMIN"
grep -q "Administration des conventions PFMP" "$PAGE"

echo "OK : route réelle EDT.js."
echo "OK : renderer dédié."
echo "OK : vignette dédiée."
echo "OK : page dédiée."
echo "OK : services V146."

# ============================================================
# 5. PUSH + VERSION + DEPLOIEMENT PRINCIPAL
# ============================================================
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
echo " DEV.146 FIX2 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ route ajoutée dans le vrai routeur EDT.js"
echo "✓ page Administration des conventions accessible"
echo "✓ vignette dédiée"
echo "✓ autocomplete référence / nom / prénom / classe / entreprise"
echo "✓ fiche jeune / classe / entreprise / période"
echo "✓ push + version + déploiement principal effectués"
echo "============================================================"
