#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix9a-validated"

QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"
STRICT_SERVICE="apps-script/EUC_SIRET_NIS_StrictV161.gs"
MONACO_SERVICE="apps-script/EUC_PFMP_Monaco_V161Fix8.gs"
PDF_HTML="apps-script/Convention_PFMP_PdfV95.html"
PDF_GS="apps-script/EUC_CONVENTION_PFMP_PdfV95.gs"

echo "============================================================"
echo " DEV.161 FIX9A — VALIDATION COMPLETE AVANT DEPLOIEMENT"
echo "============================================================"
echo

fail=0

ok(){
  echo "✓ $1"
}

ko(){
  echo "✗ $1"
  fail=1
}

check_file(){
  if [ -f "$1" ]; then ok "fichier présent : $1"; else ko "fichier absent : $1"; fi
}

check_grep(){
  local label="$1"
  local pattern="$2"
  local file="$3"
  if grep -q -- "$pattern" "$file"; then ok "$label"; else ko "$label"; fi
}

check_not_grep(){
  local label="$1"
  local pattern="$2"
  local file="$3"
  if grep -q -- "$pattern" "$file"; then ko "$label"; else ok "$label"; fi
}

for f in "$QR_PAGE" "$QR_SERVICE" "$STRICT_SERVICE" "$MONACO_SERVICE" "$PDF_HTML" "$PDF_GS"; do
  check_file "$f"
done

echo
echo "=== 1) CONTROLEUR QR UNIQUE ==="
count_controller="$(grep -o 'id="EUC_QR_CONTROLLER_FIX9"' "$QR_PAGE" | wc -l | tr -d ' ')"
if [ "$count_controller" = "1" ]; then
  ok "un seul contrôleur FIX9"
else
  ko "contrôleur FIX9 : attendu 1, trouvé $count_controller"
fi

check_not_grep "ancien FIX8 Monaco supprimé" 'id="EUC_FIX8_MONACO_FLOW"' "$QR_PAGE"
check_not_grep "ancien strict V161 supprimé" 'id="EUC_SIRET_NIS_STRICT_V161"' "$QR_PAGE"
check_not_grep "ancien appel V1617 supprimé" 'EUC_V1617_rechercherNis' "$QR_PAGE"

echo
echo "=== 2) VERROUILLAGE SIRET / NIS ==="
check_grep "verrouillage visuel présent" 'euc-locked' "$QR_PAGE"
check_grep "France exige validation SIRET" 'eucFranceVerified' "$QR_PAGE"
check_grep "Monaco exige NIS" 'Le NIS est obligatoire pour une entreprise monégasque' "$QR_PAGE"
check_grep "mode manuel Monaco uniquement après NIS inconnu" 'eucMonacoManual' "$QR_PAGE"
check_grep "recherche France branchée" 'EUC_V161_verifierSiretFrance' "$QR_PAGE"
check_grep "recherche Monaco branchée" 'EUC_V161_rechercherEntrepriseMonaco' "$QR_PAGE"

echo
echo "=== 3) ACCELERATION QR ==="
check_grep "lecture directe par ID présente" 'EUC_CONVENTION_lireRecordDirectV161_' "$QR_SERVICE"
check_grep "résolution QR directe présente" 'GRIST_ID_DIRECT' "$QR_SERVICE"

echo
echo "=== 4) RECHERCHE MONACO ALLEGEE ==="
python3 <<'PY'
from pathlib import Path
s=Path("apps-script/EUC_PFMP_Monaco_V161Fix8.gs").read_text(encoding="utf-8")
a=s.find("function EUC_V161_rechercherEntrepriseMonaco(")
if a < 0:
    raise SystemExit(2)
b=s.find("\nfunction ", a+10)
blk=s[a:b if b >= 0 else len(s)]
if "assurerColonnesMonaco_" in blk:
    raise SystemExit(3)
print("OK")
PY
case $? in
  0) ok "recherche NIS sans vérification de schéma" ;;
  2) ko "fonction recherche Monaco introuvable" ;;
  3) ko "recherche Monaco vérifie encore le schéma" ;;
  *) ko "contrôle recherche Monaco indéterminé" ;;
esac

echo
echo "=== 5) PDF MAITRE ==="
check_not_grep "surcharge drawSiretNisLabel supprimée" 'drawSiretNisLabel' "$PDF_HTML"
check_not_grep "zone SIRET_LABEL_V161 supprimée" 'SIRET_LABEL_V161' "$PDF_HTML"
check_grep "nouvelle clé de cache PDF maître" 'EUC_PFMP_PDF_MASTER_B64_V161F9' "$PDF_GS"

echo
echo "=== 6) SYNTAXE JAVASCRIPT / APPS SCRIPT ==="

python3 <<'PY'
from pathlib import Path
import re, sys
s=Path("apps-script/PFMP_Acces_QR_V116.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_QR_CONTROLLER_FIX9">(.*?)</script>', s, re.S)
if not m:
    print("ERREUR: contrôleur FIX9 introuvable")
    sys.exit(1)
Path("/tmp/EUC_QR_CONTROLLER_FIX9.js").write_text(m.group(1), encoding="utf-8")
PY
if [ $? -eq 0 ] && node --check /tmp/EUC_QR_CONTROLLER_FIX9.js >/tmp/node_front.log 2>&1; then
  ok "syntaxe contrôleur QR"
else
  ko "syntaxe contrôleur QR"
  cat /tmp/node_front.log 2>/dev/null || true
fi

for f in "$QR_SERVICE" "$STRICT_SERVICE" "$MONACO_SERVICE"; do
  tmp="/tmp/$(basename "$f").js"
  cp "$f" "$tmp"
  if node --check "$tmp" >/tmp/node_check.log 2>&1; then
    ok "syntaxe : $f"
  else
    ko "syntaxe : $f"
    cat /tmp/node_check.log
  fi
done

echo
echo "============================================================"
if [ "$fail" -ne 0 ]; then
  echo " VALIDATION ECHOUEE — AUCUN PUSH, AUCUN DEPLOIEMENT"
  echo "============================================================"
  exit 1
fi

echo " TOUS LES CONTROLES SONT OK"
echo "============================================================"
echo

set -e

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
echo " DEV.161 FIX9A DEPLOYEE AVEC SUCCES"
echo "============================================================"
