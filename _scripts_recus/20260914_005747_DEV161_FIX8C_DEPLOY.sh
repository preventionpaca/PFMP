#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix8c"

QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX8C_${STAMP}"
mkdir -p "$BACKUP"
cp "$QR_SERVICE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX8C — REPARATION FIN FONCTION QR"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

bad="/* Compatibilité anciens appels. */ence:a.Reference_convention||''"
good="reference:a.Reference_convention||''"

if bad in s:
    s=s.replace(bad,good,1)
    print("OK : fragment corrompu réparé.")
else:
    # Variante plus souple si des espaces se sont glissés.
    s2,n=re.subn(
        r"/\*\s*Compatibilité anciens appels\.\s*\*/\s*ence\s*:\s*a\.Reference_convention\|\|''",
        "reference:a.Reference_convention||''",
        s,
        count=1
    )
    if n:
        s=s2
        print("OK : variante du fragment corrompu réparée.")
    elif "reference:a.Reference_convention||''" in s:
        print("INFO : champ reference déjà correct.")
    else:
        raise SystemExit("ERREUR : fragment corrompu introuvable ; aucun remplacement effectué.")

p.write_text(s,encoding="utf-8")

# Contrôles structurels ciblés
txt=p.read_text(encoding="utf-8")

required=[
    "var estMonaco=",
    "Entreprise_nis",
    "Entreprise_identifiant_type:estMonaco?'NIS':'SIRET'",
    "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)",
    "reference:a.Reference_convention||''",
    "numeroEnregistrement:numeroEnregistrement"
]
for token in required:
    if token not in txt:
        raise SystemExit("ERREUR : élément requis manquant après réparation : "+token)

if "/* Compatibilité anciens appels. */ence:" in txt:
    raise SystemExit("ERREUR : fragment corrompu encore présent.")

print("OK : structure QR Monaco + retour serveur cohérente.")
PY

echo
echo "============================================================"
echo " DEV.161 FIX8C — CONTROLES AVANT PUSH"
echo "============================================================"

cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8C.js
node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8C.js

check(){
  local label="$1"
  shift
  if "$@"; then
    echo "✓ $label"
  else
    echo "✗ ECHEC : $label"
    exit 1
  fi
}

check "variable estMonaco" grep -q "var estMonaco=" "$QR_SERVICE"
check "champ Entreprise_nis" grep -q "Entreprise_nis" "$QR_SERVICE"
check "type identifiant NIS/SIRET" grep -q "Entreprise_identifiant_type:estMonaco?'NIS':'SIRET'" "$QR_SERVICE"
check "création référentiel Monaco" grep -q "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)" "$QR_SERVICE"
check "retour reference réparé" grep -q "reference:a.Reference_convention||''" "$QR_SERVICE"

echo "✓ syntaxe QR serveur valide"

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
echo " DEV.161 FIX8C DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ fin de fonction QR réparée"
echo "✓ backend Monaco conservé"
echo "✓ push + version + déploiement principal"
echo "============================================================"
