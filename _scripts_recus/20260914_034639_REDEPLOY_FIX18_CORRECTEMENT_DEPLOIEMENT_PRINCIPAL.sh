#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix18-redeploy-correct"

echo "============================================================"
echo " PFMP — REDEPLOIEMENT CORRECT DU DEPLOIEMENT PRINCIPAL"
echo "============================================================"

# ------------------------------------------------------------
# 1) Vérifier que les correctifs attendus sont bien présents
#    dans les fichiers locaux AVANT de publier quoi que ce soit.
# ------------------------------------------------------------

ROUTER="apps-script/EDT.js"
HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
FIX18="apps-script/EUC_SUIVI_PFMP_FixV161_18.gs"

for f in "$ROUTER" "$HTML" "$FIX18"; do
  [ -f "$f" ] || {
    echo "ERREUR : fichier requis introuvable : $f"
    exit 1
  }
done

grep -q "EUC_SUIVI_CLASSE_afficherF18" "$ROUTER" || {
  echo "ERREUR : la route FIX18 n'est pas active localement."
  exit 1
}

grep -q "function EUC_SUIVI_DESAFFECTER_F18" "$FIX18" || {
  echo "ERREUR : fonction de retrait FIX18 absente."
  exit 1
}

grep -q "periodeDatesById" "$FIX18" || {
  echo "ERREUR : données de dates FIX18 absentes."
  exit 1
}

grep -q "EUC_FIX18_UI_SCRIPT" "$HTML" || {
  echo "ERREUR : interface FIX18 absente."
  exit 1
}

grep -q "PFMP-\\\\d{4}-\\\\d{4,}" "$HTML" || {
  echo "ERREUR : logique de masquage des références absente."
  exit 1
}

echo "✓ état local FIX18 confirmé"

# ------------------------------------------------------------
# 2) Vérifications syntaxiques.
# ------------------------------------------------------------

cp "$ROUTER" /tmp/EDT_REDEPLOY_CHECK.js
cp "$FIX18" /tmp/FIX18_REDEPLOY_CHECK.js

node --check /tmp/EDT_REDEPLOY_CHECK.js
node --check /tmp/FIX18_REDEPLOY_CHECK.js

echo "✓ syntaxe serveur / route valide"

# ------------------------------------------------------------
# 3) Push vers Apps Script.
# ------------------------------------------------------------

echo
echo "=== PUSH ==="
clasp push -f

# ------------------------------------------------------------
# 4) Créer UNE VERSION IMMUTABLE et récupérer son numéro.
# ------------------------------------------------------------

echo
echo "=== CREATION VERSION ==="
VERSION_OUTPUT="$(clasp version "$LABEL")"
echo "$VERSION_OUTPUT"

VERSION="$(printf '%s\n' "$VERSION_OUTPUT" | grep -oE '[0-9]+' | tail -1)"

if [ -z "$VERSION" ]; then
  echo "ERREUR : impossible d'extraire le numéro de version."
  exit 1
fi

echo "Version créée : $VERSION"

# ------------------------------------------------------------
# 5) IMPORTANT : mettre à jour LE DEPLOIEMENT EXISTANT.
#    On utilise clasp redeploy, pas clasp deploy.
# ------------------------------------------------------------

echo
echo "=== REDEPLOIEMENT DU MEME ID ==="
clasp redeploy "$DEPLOYMENT_ID" "$VERSION" "$LABEL"

# ------------------------------------------------------------
# 6) Vérification finale obligatoire.
# ------------------------------------------------------------

echo
echo "=== VERIFICATION DEPLOIEMENT PRINCIPAL ==="
DEPLOYMENTS="$(clasp deployments)"
echo "$DEPLOYMENTS"

TARGET_LINE="$(printf '%s\n' "$DEPLOYMENTS" | grep "$DEPLOYMENT_ID" || true)"

if [ -z "$TARGET_LINE" ]; then
  echo "ERREUR : déploiement principal introuvable après redeploy."
  exit 1
fi

echo
echo "Cible principale :"
echo "$TARGET_LINE"

if ! printf '%s\n' "$TARGET_LINE" | grep -q "@$VERSION"; then
  echo "ERREUR : le déploiement principal ne pointe PAS vers la version $VERSION."
  exit 1
fi

echo
echo "============================================================"
echo " SUCCES"
echo " Le déploiement principal pointe maintenant vers @$VERSION"
echo " $LABEL"
echo "============================================================"
echo
echo "Après cela, ferme l'onglet PFMP actuellement ouvert puis"
echo "rouvre l'administration depuis son URL habituelle."
echo "============================================================"
