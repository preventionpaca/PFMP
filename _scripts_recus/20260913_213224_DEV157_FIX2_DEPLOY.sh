#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.157-fix2"

SRC="apps-script/Suivi_PFMP_Classe_Detail.html"
DST="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
RENDERER="apps-script/EUC_SUIVI_PFMP_V156.gs"
ROUTER="apps-script/EDT.js"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV157_avant_FIX2_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SRC" "$DST" "$RENDERER" "$ROUTER"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.157 FIX2 — CIBLAGE DU VRAI TEMPLATE V156"
echo "============================================================"

echo
echo "=== VERIFICATION DU RENDERER REEL ==="
grep -nA18 -B2 "function EUC_SUIVI_CLASSE_afficherV156" "$RENDERER"

echo
echo "=== VERIFICATION DES VARIABLES INJECTEES ==="
grep -q "createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156')" "$RENDERER" || {
  echo "ERREUR : le renderer V156 ne charge pas Suivi_PFMP_Classe_Detail_V156."
  exit 1
}

grep -q "tpl.config" "$RENDERER" || {
  echo "ERREUR : tpl.config absent du renderer V156."
  exit 1
}

grep -q "tpl.anneeContextJson" "$RENDERER" || {
  echo "ERREUR : tpl.anneeContextJson absent du renderer V156."
  exit 1
}

grep -q "tpl.detailJson" "$RENDERER" || {
  echo "ERREUR : tpl.detailJson absent du renderer V156."
  exit 1
}

echo "OK : le renderer V156 injecte bien config + anneeContextJson + detailJson."

echo
echo "=== SYNCHRONISATION DU TEMPLATE V157 VERS LE TEMPLATE REEL V156 ==="

# Le template non suffixé contient déjà l'interface DEV.157 validée par les contrôles précédents.
grep -q 'id="sendTable"' "$SRC" || {
  echo "ERREUR : bouton Envoyer absent du template source."
  exit 1
}
grep -q 'id="mailParams"' "$SRC" || {
  echo "ERREUR : bouton Paramètres absent du template source."
  exit 1
}
grep -q "EUC_V157_preparerEnvoi" "$SRC" || {
  echo "ERREUR : logique de préparation d'envoi absente du template source."
  exit 1
}

cp "$SRC" "$DST"

echo "OK : Suivi_PFMP_Classe_Detail_V156.html remplacé par la version DEV.157."

echo
echo "=== CONTROLES DU TEMPLATE REEL ==="
grep -q 'id="sendTable"' "$DST"
grep -q 'id="mailParams"' "$DST"
grep -q 'id="mailModal"' "$DST"
grep -q "EUC_V157_preparerEnvoi" "$DST"
grep -q "EUC_V157_envoyerTableau" "$DST"
grep -q "parametres-envois-pfmp" "$DST"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

scripts=re.findall(r"<script>(.*?)</script>",s,re.S)
js="\n".join(scripts)

# Remplacer les expressions de template Apps Script pour contrôle JS local.
js=re.sub(r"<\?!=\s*config\s*\?>","{}",js)
js=re.sub(r"<\?!=\s*anneeContextJson\s*\?>","{}",js)
js=re.sub(r"<\?!=\s*detailJson\s*\?>","{}",js)

Path("/tmp/Suivi_PFMP_Classe_Detail_V156_DEV157_FIX2.js").write_text(js,encoding="utf-8")
PY

node --check /tmp/Suivi_PFMP_Classe_Detail_V156_DEV157_FIX2.js

echo "OK : JavaScript du vrai template V156 valide."

echo
echo "=== CONTROLE ROUTES ==="
grep -q "page === 'parametres-envois-pfmp'" "$ROUTER"
grep -q "page === 'suivi-pfmp-classe'" "$ROUTER"
echo "OK : routes présentes."

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
echo " DEV.157 FIX2 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ vrai template V156 mis à jour"
echo "✓ bouton Paramètres des envois visible"
echo "✓ bouton Envoyer le tableau par email visible"
echo "✓ modale personnalisée présente"
echo "✓ routes présentes"
echo "✓ push + version + déploiement principal"
echo "============================================================"
