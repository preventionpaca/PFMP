#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV143_avant_FIX1_${STAMP}"
mkdir -p "$BACKUP"

QR="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"
NOTIF="apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs"
PARAMS="apps-script/Parametres_Convention_PFMP.html"

for f in "$QR" "$NOTIF" "$PARAMS"; do
  if [ -f "$f" ]; then
    cp "$f" "$BACKUP/"
  fi
done

python3 <<'PY'
from pathlib import Path

p = Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s = p.read_text(encoding="utf-8")

# DEV.143 initial a inséré les caractères littéraux "\n" dans le JavaScript.
# On ne corrige que le bloc post-enregistrement concerné.
old = (
    "var notif={};\\n"
    "try{notif=EUC_CONVENTION_apresEnregistrementV143_(a.id,numeroEnregistrement);}\\n"
    "catch(err143){notif={envoye:false,erreur:String(err143&&err143.message?err143.message:err143)};}\\n"
    "return {ok:true,reference:a.Reference_convention||'',numeroEnregistrement:numeroEnregistrement,message:'Informations entreprise enregistrées.',notification:notif};}"
)

new = (
    "var notif={};\n"
    "try{notif=EUC_CONVENTION_apresEnregistrementV143_(a.id,numeroEnregistrement);}\n"
    "catch(err143){notif={envoye:false,erreur:String(err143&&err143.message?err143.message:err143)};}\n"
    "return {ok:true,reference:a.Reference_convention||'',numeroEnregistrement:numeroEnregistrement,message:'Informations entreprise enregistrées.',notification:notif};}"
)

if old not in s:
    raise SystemExit("ERREUR : bloc DEV.143 avec \\\\n littéraux introuvable. Aucun changement appliqué.")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("FIX1 appliqué : les \\\\n littéraux ont été remplacés par de vrais retours à la ligne.")
PY

echo
echo "=== CONTROLES DEV.143 FIX1 ==="

cp "$QR" /tmp/EUC_QR_V143_FIX1.js
cp "$NOTIF" /tmp/EUC_NOTIF_V143_FIX1.js

node --check /tmp/EUC_QR_V143_FIX1.js
node --check /tmp/EUC_NOTIF_V143_FIX1.js

grep -q "EUC_CONVENTION_apresEnregistrementV143_" "$QR"
grep -q "DIAGNOSTIC_DEV143_PFMP_000223" "$NOTIF"
grep -q 'id="notif-config-v143"' "$PARAMS"

if grep -Fq '\ntry{notif=EUC_CONVENTION_apresEnregistrementV143_' "$QR"; then
  echo "ERREUR : séquence \\n littérale encore présente."
  exit 1
fi

echo "OK : syntaxe JavaScript valide."
echo "OK : pont post-enregistrement DEV.143 présent."
echo "OK : module notifications DEV.143 présent."
echo "OK : carte paramètres DEV.143 présente."

echo
echo "=== PUSH APPS SCRIPT ==="
clasp push -f

echo
echo "============================================================"
echo " DEV.143 FIX1 TERMINE"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ syntaxe réparée"
echo "✓ push Apps Script effectué"
echo "✓ aucun déploiement public"
echo "✓ aucun courriel envoyé"
echo
echo "Dans Apps Script, exécuter ensuite :"
echo "1. INSTALLER_DEV143_BLOC_A"
echo "2. DIAGNOSTIC_DEV143_PFMP_000223"
echo "============================================================"
