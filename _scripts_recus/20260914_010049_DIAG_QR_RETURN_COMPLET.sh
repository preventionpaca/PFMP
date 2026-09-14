#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

FILE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

echo "============================================================"
echo " DIAGNOSTIC CIBLE — FIN DE EUC_CONVENTION_enregistrerEntrepriseV117"
echo "============================================================"
echo

[ -f "$FILE" ] || { echo "ERREUR : fichier introuvable : $FILE"; exit 1; }

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

start=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
if start < 0:
    raise SystemExit("ERREUR : fonction EUC_CONVENTION_enregistrerEntrepriseV117 introuvable.")

end=s.find("\nfunction ",start+10)
if end < 0:
    end=len(s)

block=s[start:end]

print("=== FONCTION COMPLETE ===")
print(block)

print("\n=== 700 DERNIERS CARACTERES DE LA FONCTION ===")
print(block[-700:])

print("\n=== OCCURRENCES return / reference / notif ===")
for token in ["return {ok:true", "reference:a.Reference_convention", "notification:notif", "var notif", "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_"]:
    print(f"{token} ->", block.count(token))
PY

echo
echo "=== CONTROLE NODE ACTUEL ==="
cp "$FILE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_DIAG.js
node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_DIAG.js || true

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
