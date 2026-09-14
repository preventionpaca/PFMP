#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix2"

MAIL_SERVICE="apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs"
SERVICE="apps-script/EUC_PFMP_International_StatusV161.gs"
RENDERER="apps-script/EUC_SUIVI_PFMP_V156.gs"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX2_${STAMP}"
mkdir -p "$BACKUP"

for f in "$MAIL_SERVICE" "$SERVICE" "$RENDERER" "$DETAIL_PAGE" "$QR_PAGE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX2 — CORRECTION DU SERVICE EMAIL"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p = Path("apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs")
s = p.read_text(encoding="utf-8")

# 1) Réparer la déclaration de fonction cassée par le FIX précédent.
bad = "function EUC_V157_htmlTable_(detail)+EUC_V161_historiqueHtml_(detail){"
good = "function EUC_V157_htmlTable_(detail){"

if bad in s:
    s = s.replace(bad, good, 1)
    print("OK 1/3 : déclaration EUC_V157_htmlTable_ réparée.")
elif good in s:
    print("OK 1/3 : déclaration EUC_V157_htmlTable_ déjà correcte.")
else:
    raise SystemExit("ERREUR : fonction EUC_V157_htmlTable_ introuvable.")

# 2) Garantir l'utilisation de l'état actuel V161 pour préparer et envoyer.
s = s.replace(
    "EUC_SUIVI_CLASSE_detailV156(payload.annee,payload.classeId,payload.periodeId)",
    "EUC_SUIVI_CLASSE_detailV161(payload.annee,payload.classeId,payload.periodeId)"
)

# 3) Ajouter l'historique uniquement dans htmlBody, jamais dans la déclaration.
if "EUC_V161_historiqueHtml_(detail)" not in s:
    needle = "EUC_V157_htmlTable_(detail)"
    # Chercher l'appel situé dans MailApp.sendEmail/htmlBody et ignorer la déclaration.
    positions = [m.start() for m in re.finditer(re.escape(needle), s)]
    call_pos = None
    for pos in positions:
        prefix = s[max(0, pos-250):pos]
        if "htmlBody" in prefix or "safeMsg" in prefix:
            call_pos = pos
            break

    if call_pos is None:
        raise SystemExit("ERREUR : appel EUC_V157_htmlTable_(detail) dans htmlBody introuvable.")

    replacement = "EUC_V157_htmlTable_(detail)+EUC_V161_historiqueHtml_(detail)"
    s = s[:call_pos] + replacement + s[call_pos+len(needle):]
    print("OK 2/3 : historique ajouté uniquement dans le corps du mail.")
else:
    print("OK 2/3 : historique déjà présent dans le corps du mail.")

# Vérification anti-régression : aucune déclaration ne doit contenir un +
if re.search(r"function\s+EUC_V157_htmlTable_\s*\([^)]*\)\s*\+", s):
    raise SystemExit("ERREUR : déclaration de fonction encore corrompue.")

p.write_text(s, encoding="utf-8")
print("OK 3/3 : service email DEV.161 corrigé.")
PY

echo
echo "============================================================"
echo " DEV.161 FIX2 — CONTROLES AVANT PUSH"
echo "============================================================"

cp "$MAIL_SERVICE" /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV161_FIX2.js
cp "$SERVICE" /tmp/EUC_PFMP_International_StatusV161_FIX2.js
cp "$RENDERER" /tmp/EUC_SUIVI_PFMP_V156_DEV161_FIX2.js

node --check /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV161_FIX2.js
node --check /tmp/EUC_PFMP_International_StatusV161_FIX2.js
node --check /tmp/EUC_SUIVI_PFMP_V156_DEV161_FIX2.js

grep -q "function EUC_V157_htmlTable_(detail){" "$MAIL_SERVICE"
grep -q "EUC_V161_historiqueHtml_(detail)" "$MAIL_SERVICE"
grep -q "EUC_SUIVI_CLASSE_detailV161" "$RENDERER"
grep -q "historyNoteV161" "$DETAIL_PAGE"
grep -q "EUC_V161_MONACO_UI" "$QR_PAGE"

if grep -q "function EUC_V157_htmlTable_(detail)+" "$MAIL_SERVICE"; then
  echo "ERREUR : déclaration de fonction email encore corrompue."
  exit 1
fi

echo "✓ syntaxe serveur valide"
echo "✓ fonction HTML email réparée"
echo "✓ historique ajouté seulement dans htmlBody"
echo "✓ état actuel V161 conservé"
echo "✓ QR Monaco conservé"

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
echo " DEV.161 FIX2 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ email réparé"
echo "✓ situation actuelle + historique secondaire"
echo "✓ Monaco / NIS conservé"
echo "✓ push + version + déploiement principal"
echo "============================================================"
