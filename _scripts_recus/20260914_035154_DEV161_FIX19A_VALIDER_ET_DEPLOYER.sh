#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix19a-nettoyage-direct"

HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
FIX18="apps-script/EUC_SUIVI_PFMP_FixV161_18.gs"
ROUTER="apps-script/EDT.js"

echo "============================================================"
echo " DEV.161 FIX19A — VALIDATION + DEPLOIEMENT DU FIX19"
echo "============================================================"

for f in "$HTML" "$FIX18" "$ROUTER"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
done

# ============================================================
# 1) Confirmer que le FIX19, déjà appliqué localement avant
#    l'échec du validateur, est bien présent.
# ============================================================

grep -q "FIX19 : enrichir directement" "$FIX18" || {
  echo "ERREUR : modification serveur FIX19 absente."
  exit 1
}

grep -q "function fmtPfmpDate" "$HTML" || {
  echo "ERREUR : rendu direct des dates FIX19 absent."
  exit 1
}

grep -q "EUC_SUIVI_DESAFFECTER_F18" "$HTML" || {
  echo "ERREUR : retrait F18 non raccordé."
  exit 1
}

! grep -q "EUC_FIX18_UI_SCRIPT" "$HTML" || {
  echo "ERREUR : ancienne surcouche FIX18 encore présente."
  exit 1
}

! grep -q "EUC_PERIOD_DATES_FIX13" "$HTML" || {
  echo "ERREUR : ancienne surcouche FIX13 encore présente."
  exit 1
}

! grep -q "x.numero?'<div class=\"small\"'" "$HTML" || {
  echo "ERREUR : numéro de convention encore rendu dans le tableau."
  exit 1
}

echo "✓ modifications FIX19 présentes localement"

# ============================================================
# 2) Vérification syntaxique des fichiers serveur.
# ============================================================

cp "$FIX18" /tmp/FIX19A_server.js
cp "$ROUTER" /tmp/FIX19A_router.js
node --check /tmp/FIX19A_server.js
node --check /tmp/FIX19A_router.js

# ============================================================
# 3) Vérification syntaxique de TOUS les scripts inline.
#    Correction du bug du précédent validateur :
#    le motif est bien <script\b ...>, pas <script\\b ...>.
# ============================================================

rm -rf /tmp/fix19a_inline
mkdir -p /tmp/fix19a_inline

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")

# Neutraliser uniquement les insertions template Apps Script
# afin que Node puisse contrôler le JavaScript résultant.
s=s.replace("<?!= config ?>","{}")
s=s.replace("<?!= anneeContextJson ?>","{}")
s=s.replace("<?!= detailJson ?>","{}")

scripts=re.findall(r"<script\b([^>]*)>(.*?)</script>", s, flags=re.S|re.I)

out=Path("/tmp/fix19a_inline")
n=0
for attrs,code in scripts:
    if "src=" in attrs.lower():
        continue
    n+=1
    (out/f"inline_{n:02d}.js").write_text(code,encoding="utf-8")

if n==0:
    raise SystemExit("ERREUR : aucun script inline détecté.")

print("Scripts inline détectés :",n)
PY

shopt -s nullglob
FILES=(/tmp/fix19a_inline/*.js)
[ "${#FILES[@]}" -gt 0 ] || {
  echo "ERREUR : aucun fichier JS inline à contrôler."
  exit 1
}

for f in "${FILES[@]}"; do
  node --check "$f"
done

echo "✓ syntaxe de tous les scripts inline valide"

# ============================================================
# 4) Contrôles fonctionnels statiques.
# ============================================================

grep -q "const dates=(debut||fin)" "$HTML"
grep -q "historyNoteV161(x)" "$HTML"
grep -q "EUC_SUIVI_DESAFFECTER_F18" "$HTML"
grep -q "p.debut=src.debut" "$FIX18"
grep -q "EUC_SUIVI_CLASSE_afficherF18" "$ROUTER"

echo "✓ dates intégrées directement à renderTabs()"
echo "✓ référence convention supprimée directement de render()"
echo "✓ retrait raccordé au handler d'origine avec pendingType"
echo "✓ route F18 active"

# ============================================================
# 5) Push + création de version.
# ============================================================

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== CREATION VERSION ==="
VERSION_OUTPUT="$(clasp version "$LABEL")"
echo "$VERSION_OUTPUT"

VERSION="$(printf '%s\n' "$VERSION_OUTPUT" | grep -oE '[0-9]+' | tail -1)"
[ -n "$VERSION" ] || {
  echo "ERREUR : impossible d'extraire le numéro de version."
  exit 1
}

echo "Version créée : $VERSION"

# ============================================================
# 6) Mise à jour DU MEME déploiement.
#    Cette version de clasp accepte un seul argument positionnel
#    pour redeploy ; version et description passent en options.
# ============================================================

echo
echo "=== REDEPLOIEMENT DU DEPLOIEMENT PRINCIPAL ==="
clasp redeploy "$DEPLOYMENT_ID" -V "$VERSION" -d "$LABEL"

# ============================================================
# 7) Vérification finale.
# ============================================================

echo
echo "=== VERIFICATION DEPLOIEMENT ==="
DEPLOYMENTS="$(clasp deployments)"
echo "$DEPLOYMENTS"

TARGET="$(printf '%s\n' "$DEPLOYMENTS" | grep "$DEPLOYMENT_ID" || true)"
[ -n "$TARGET" ] || {
  echo "ERREUR : déploiement principal introuvable."
  exit 1
}

if ! printf '%s\n' "$TARGET" | grep -q "@$VERSION"; then
  echo "ERREUR : le déploiement principal ne pointe pas vers @$VERSION."
  exit 1
fi

echo
echo "============================================================"
echo " SUCCES — FIX19A DEPLOYE SUR LE MEME ID EN @$VERSION"
echo "============================================================"
