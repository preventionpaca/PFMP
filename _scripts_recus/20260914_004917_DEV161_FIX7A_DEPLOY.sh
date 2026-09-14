#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix7a"

PDF="apps-script/Convention_PFMP_PdfV95.html"
ROUTER="apps-script/EDT.js"
QR="apps-script/PFMP_Acces_QR_V116.html"
V161="apps-script/EUC_PFMP_International_StatusV161.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX7A_${STAMP}"
mkdir -p "$BACKUP"

for f in "$PDF" "$ROUTER" "$QR" "$V161"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX7A — PDF V95 + FINALISATION FIX7"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Convention_PFMP_PdfV95.html")
s=p.read_text(encoding="utf-8")

before=s

# Remplacements ciblés du libellé SIRET dans le vrai template PDF V95.
patterns=[
    r"N\s*[°ºo]?\s*de\s*SIRET",
    r"N\s*[°ºo]?\s*SIRET",
    r"Num[ée]ro\s*SIRET",
    r"SIRET\s*:"
]

for pat in patterns:
    s=re.sub(pat,"N° SIRET (France) / NIS (Monaco)",s,flags=re.I)

# Eviter un doublon de ':' si le template en ajoutait déjà un.
s=s.replace("N° SIRET (France) / NIS (Monaco) ::","N° SIRET (France) / NIS (Monaco) :")

if "N° SIRET (France) / NIS (Monaco)" not in s:
    raise SystemExit("ERREUR : aucun libellé SIRET n'a pu être corrigé dans Convention_PFMP_PdfV95.html.")

p.write_text(s,encoding="utf-8")

if s != before:
    print("OK : Convention_PFMP_PdfV95.html corrigé.")
else:
    print("INFO : Convention_PFMP_PdfV95.html était déjà corrigé.")
PY

echo
echo "=== CONTROLES FIX7 DEJA APPLIQUES LOCALEMENT ==="

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

check "PDF V95 : SIRET France / NIS Monaco" \
  grep -q "N° SIRET (France) / NIS (Monaco)" "$PDF"

check "route ENT classes présente" \
  grep -q "suivi-pfmp-ent" "$ROUTER"

check "mode ENT présent dans le suivi" \
  grep -q "mode.*ent" apps-script/Suivi_PFMP_Classes.html

check "QR Monaco présent" \
  grep -q "EUC_V161_MONACO_UI" "$QR"

check "recherche NIS Monaco présente" \
  grep -q "EUC_V161_rechercherEntrepriseMonaco" "$V161"

echo
echo "=== CONTROLES DE SYNTAXE ==="

cp "$ROUTER" /tmp/EDT_DEV161_FIX7A.js
cp "$V161" /tmp/EUC_PFMP_International_StatusV161_FIX7A.js

node --check /tmp/EDT_DEV161_FIX7A.js
node --check /tmp/EUC_PFMP_International_StatusV161_FIX7A.js

echo "✓ syntaxe serveur valide"

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
echo " DEV.161 FIX7A DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ vrai template PDF V95 corrigé"
echo "✓ routes ENT conservées"
echo "✓ QR Monaco conservé"
echo "✓ push + version + déploiement principal"
echo "============================================================"
