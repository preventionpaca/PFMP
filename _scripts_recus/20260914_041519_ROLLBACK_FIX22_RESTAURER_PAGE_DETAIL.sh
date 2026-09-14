#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-rollback-fix22-html"

TARGET="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

echo "============================================================"
echo " ROLLBACK CIBLE — RETOUR AVANT FIX22"
echo "============================================================"

BACKUP_DIR="$(find . -maxdepth 1 -type d -name 'backup_DEV161_avant_FIX22_*' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)"

if [ -z "$BACKUP_DIR" ]; then
  echo "ERREUR : sauvegarde avant FIX22 introuvable."
  exit 1
fi

SOURCE="$BACKUP_DIR/$(basename "$TARGET")"

if [ ! -f "$SOURCE" ]; then
  echo "ERREUR : fichier sauvegardé introuvable : $SOURCE"
  exit 1
fi

echo "Sauvegarde utilisée : $BACKUP_DIR"
echo "Restauration        : $SOURCE"
echo "Vers                : $TARGET"

cp "$SOURCE" "$TARGET"

echo
echo "=== VERIFICATION STRUCTURE HTML ==="
python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

for tag in ["html","body","script","style","div"]:
    o=len(re.findall(r"<"+tag+r"\b",s,re.I))
    c=len(re.findall(r"</"+tag+r">",s,re.I))
    print(f"{tag}: ouverts={o} fermés={c} delta={o-c}")
    if o!=c:
        raise SystemExit("ERREUR : structure HTML déséquilibrée pour "+tag)

print("✓ structure HTML équilibrée")
PY

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
echo "=== VERIFICATION ==="
clasp deployments | grep "$DEPLOYMENT_ID" || true

echo
echo "============================================================"
echo " ROLLBACK TERMINE"
echo " La page détail est revenue à l'état juste avant FIX22."
echo "============================================================"
