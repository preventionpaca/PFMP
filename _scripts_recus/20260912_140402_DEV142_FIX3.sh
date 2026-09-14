#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV142_FIX_avant_FIX3_${STAMP}"
mkdir -p "$BACKUP"

V141="apps-script/EUC_CONVENTION_PFMP_AdminBridgeV141.gs"
V142="apps-script/EUC_CONVENTION_PFMP_NotificationsV142.gs"

if [ ! -f "$V141" ] || [ ! -f "$V142" ]; then
  echo "ERREUR : fichier DEV.141 ou DEV.142 introuvable."
  exit 1
fi

cp "$V141" "$BACKUP/"
cp "$V142" "$BACKUP/"

echo "=== VERIFICATION SOURCE DEV.141 VALIDEE ==="
if ! grep -q "function DIAGNOSTIC_DEV141_DOSSIER" "$V141"; then
  echo "ERREUR : DIAGNOSTIC_DEV141_DOSSIER absent de DEV.141."
  exit 1
fi
echo "OK : DIAGNOSTIC_DEV141_DOSSIER disponible."

python3 <<'PY'
from pathlib import Path

p = Path("apps-script/EUC_CONVENTION_PFMP_NotificationsV142.gs")
s = p.read_text(encoding="utf-8")

old = "var dossier=EUC_CONVENTION_preparerDossierAdminV142_(acces);"
new = "var dossier=DIAGNOSTIC_DEV141_DOSSIER(accesId);"

if old not in s:
    raise SystemExit("ERREUR : appel autonome DEV.142 introuvable, aucun changement appliqué.")

s = s.replace(old, new, 1)

lines = s.splitlines()
lines[0] = "/** Eucalyptus PFMP — v1.0.0-dev.142-fix3 — notification basée sur la source DEV.141 validée. */"
s = "\n".join(lines) + "\n"

p.write_text(s, encoding="utf-8")
print("Correctif DEV.142 FIX3 appliqué.")
PY

echo
echo "=== CONTROLE FIX3 ==="
head -n 3 "$V142"
grep -nE \
"DIAGNOSTIC_DEV141_DOSSIER\\(accesId\\)|DIAGNOSTIC_DEV142_PFMP_000223" \
"$V142"

if grep -n "var dossier=EUC_CONVENTION_preparerDossierAdminV142_" "$V142"; then
  echo "ERREUR : ancienne source autonome encore utilisée."
  exit 1
else
  echo "OK : DEV.142 utilise maintenant DEV.141 validée."
fi

cp "$V142" /tmp/EUC_CONVENTION_PFMP_NotificationsV142_FIX3.js
node --check /tmp/EUC_CONVENTION_PFMP_NotificationsV142_FIX3.js

echo
echo "=== PUSH APPS SCRIPT ==="
clasp push -f

echo
echo "============================================================"
echo " DEV.142 FIX3 TERMINE"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "Version locale attendue : v1.0.0-dev.142-fix3"
echo "✓ numéro / parents / PP repris de DEV.141 validée"
echo "✓ adresse BFE reste paramétrable dans DEV.142"
echo "✓ aucun courriel envoyé automatiquement"
echo
echo "Relancer dans Apps Script :"
echo "DIAGNOSTIC_DEV142_PFMP_000223"
echo "============================================================"
