#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix8e"

QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX8E_${STAMP}"
mkdir -p "$BACKUP"
cp "$QR_SERVICE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX8E — SUPPRESSION DU DOUBLE RETURN"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

before=s

# Cas exact observé dans le contrôle Node.
s=s.replace(
    "return {ok:true,return {ok:true,reference:a.Reference_convention||''",
    "return {ok:true,reference:a.Reference_convention||''",
    1
)

# Garde-fou : normaliser toute répétition immédiate équivalente.
s=re.sub(
    r"return\s*\{\s*ok\s*:\s*true\s*,\s*return\s*\{\s*ok\s*:\s*true\s*,",
    "return {ok:true,",
    s,
    count=1
)

if s==before:
    if "return {ok:true,reference:a.Reference_convention||''" in s:
        print("INFO : double return déjà corrigé.")
    else:
        raise SystemExit("ERREUR : double return introuvable et retour correct absent.")

# Vérifier qu'il ne reste aucun double return.
if re.search(r"return\s*\{\s*ok\s*:\s*true\s*,\s*return\s*\{",s):
    raise SystemExit("ERREUR : double return encore présent.")

# Vérifier les éléments Monaco déjà posés.
required=[
    "var estMonaco=",
    "Entreprise_nis",
    "Entreprise_identifiant_type:estMonaco?'NIS':'SIRET'",
    "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)",
    "return {ok:true,reference:a.Reference_convention||''"
]
for token in required:
    if token not in s:
        raise SystemExit("ERREUR : élément requis manquant : "+token)

p.write_text(s,encoding="utf-8")
print("OK : double return supprimé et structure QR conservée.")
PY

echo
echo "============================================================"
echo " DEV.161 FIX8E — CONTROLE DE SYNTAXE"
echo "============================================================"

cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8E.js

if ! node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8E.js; then
  echo
  echo "ERREUR : le backend QR reste invalide."
  echo "AUCUN PUSH / AUCUN DEPLOIEMENT."
  exit 1
fi

echo "✓ syntaxe QR serveur valide"
echo "✓ double return supprimé"
echo "✓ backend Monaco conservé"

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
echo " DEV.161 FIX8E DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ backend QR syntaxiquement valide"
echo "✓ Monaco / NIS conservé"
echo "✓ push + version + déploiement principal"
echo "============================================================"
