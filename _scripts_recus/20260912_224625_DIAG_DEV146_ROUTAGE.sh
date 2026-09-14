#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

echo "============================================================"
echo " DIAGNOSTIC DEV.146 — ROUTAGE WEBAPP"
echo "============================================================"
echo

echo "=== OCCURRENCES admin-pfmp / Admin_PFMP / page= ==="
grep -RInE \
"admin-pfmp|Admin_PFMP|page=|doGet\\(|createTemplateFromFile|createHtmlOutputFromFile" \
apps-script 2>/dev/null \
| head -n 400

echo
echo "=== FICHIERS WEBAPP / ROUTER PROBABLES ==="
find apps-script -maxdepth 1 -type f \
  \( -iname '*WebApp*.gs' -o -iname 'Code.js' -o -iname 'Code.gs' -o -iname 'Index.html' \) \
  -printf '%f\n' | sort

echo
echo "=== EXTRAITS DES doGet ==="
grep -RInA80 -B10 "function doGet" apps-script 2>/dev/null | head -n 500

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
