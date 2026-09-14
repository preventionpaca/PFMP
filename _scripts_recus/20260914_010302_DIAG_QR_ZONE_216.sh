#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

FILE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

echo "============================================================"
echo " DIAGNOSTIC QR — AUTOUR DE verifierIdentiteV112"
echo "============================================================"

[ -f "$FILE" ] || { echo "ERREUR : fichier introuvable : $FILE"; exit 1; }

echo
echo "=== LIGNES 180 A 235 ==="
nl -ba "$FILE" | sed -n '180,235p'

echo
echo "=== FONCTIONS AUTOUR DE LA ZONE ==="
grep -nE "^function EUC_CONVENTION_|Compatibilité anciens appels" "$FILE" | tail -n 30

echo
echo "=== COMPTE ACCOLADES ENTRE enregistrerEntrepriseV117 ET verifierIdentiteV112 ==="
python3 <<'PY'
from pathlib import Path
s=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs").read_text(encoding="utf-8")
a=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
b=s.find("function EUC_CONVENTION_verifierIdentiteV112(",a)
if a<0 or b<0:
    raise SystemExit("ERREUR : fonctions cibles introuvables.")
chunk=s[a:b]
print("ouvrantes { :",chunk.count("{"))
print("fermantes } :",chunk.count("}"))
print("delta       :",chunk.count("{")-chunk.count("}"))
print("\n=== FIN DU CHUNK ===")
print(chunk[-1200:])
PY

echo
echo "=== NODE CHECK ==="
cp "$FILE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_DIAG2.js
node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_DIAG2.js || true

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
