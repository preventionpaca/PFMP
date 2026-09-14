#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.158-fix1"

ROUTER="apps-script/EDT.js"
ADMIN_HOME="apps-script/Admin_PFMP.html"
SERVICE="apps-script/EUC_SUIVI_PFMP_DestinatairesV158.gs"
PAGE="apps-script/Destinataires_Envois_PFMP_V158.html"
PARAM_PAGE="apps-script/Parametres_Envois_PFMP_V157.html"
V157_SERVICE="apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV158_avant_FIX1_${STAMP}"
mkdir -p "$BACKUP"

for f in "$ROUTER" "$ADMIN_HOME" "$SERVICE" "$PAGE" "$PARAM_PAGE" "$V157_SERVICE"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

echo "============================================================"
echo " DEV.158 FIX1 — CORRECTION DE LA ROUTE"
echo "============================================================"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EDT.js")
s=p.read_text(encoding="utf-8")

# Nettoyer d'abord une éventuelle insertion cassée de la tentative précédente.
broken1 = "if (page === 'destinataires-envois-pfmp') return EUC_V158_afficher(e);\\n  "
broken2 = "if(page === 'destinataires-envois-pfmp') return EUC_V158_afficher(e);\\n  "
s=s.replace(broken1,"")
s=s.replace(broken2,"")

# Ne rien doubler si la route existe déjà correctement.
if "destinataires-envois-pfmp" not in s:
    markers=[
        "if (page === 'parametres-envois-pfmp')",
        "if(page === 'parametres-envois-pfmp')"
    ]
    pos=-1
    for marker in markers:
        pos=s.find(marker)
        if pos>=0:
            break

    if pos<0:
        raise SystemExit("ERREUR : route parametres-envois-pfmp introuvable.")

    route = "if (page === 'destinataires-envois-pfmp') return EUC_V158_afficher(e);\n  "
    s=s[:pos]+route+s[pos:]

p.write_text(s,encoding="utf-8")
print("OK : route V158 corrigée.")
PY

echo "============================================================"
echo " DEV.158 FIX1 — CONTROLES"
echo "============================================================"

# Vérifier que les fichiers DEV158 ont bien été créés avant l'arrêt précédent.
[ -f "$SERVICE" ] || { echo "ERREUR : service V158 absent."; exit 1; }
[ -f "$PAGE" ] || { echo "ERREUR : page V158 absente."; exit 1; }

grep -q "EUC_DESTINATAIRES_ENVOIS_PFMP" "$SERVICE"
grep -q "TABLEAUX_SUIVI" "$SERVICE"
grep -q "EUC_V158_ccMails_" "$V157_SERVICE"
grep -q "destinataires-envois-pfmp" "$ROUTER"
grep -q "destV158Tile" "$ADMIN_HOME"
grep -q "Enregistrement en cours" "$PAGE"
grep -q "Enregistrement en cours" "$PARAM_PAGE"

cp "$ROUTER" /tmp/EDT_DEV158_FIX1.js
cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_DestinatairesV158_FIX1.js
cp "$V157_SERVICE" /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV158_FIX1.js

node --check /tmp/EDT_DEV158_FIX1.js
node --check /tmp/EUC_SUIVI_PFMP_DestinatairesV158_FIX1.js
node --check /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV158_FIX1.js

if grep -n "destinataires-envois-pfmp.*\\\\n" "$ROUTER"; then
  echo "ERREUR : un littéral \\\\n subsiste dans EDT.js."
  exit 1
fi

echo "OK : route V158 présente et syntaxiquement valide."
echo "OK : table centrale présente."
echo "OK : vignette Admin PFMP présente."
echo "OK : spinners présents."
echo "OK : envois V157 branchés sur les droits V158."

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
echo " DEV.158 FIX1 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ route Destinataires & envois corrigée"
echo "✓ table centrale conservée"
echo "✓ vignette Admin PFMP"
echo "✓ spinner Enregistrement en cours..."
echo "✓ push + version + déploiement principal"
echo "============================================================"
