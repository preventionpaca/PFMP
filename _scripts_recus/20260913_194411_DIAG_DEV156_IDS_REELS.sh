#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

PAGE="apps-script/Suivi_PFMP_Classe_Detail.html"

echo "============================================================"
echo " DIAGNOSTIC DEV.156 — IDENTIFIANTS REELS DE LA PAGE"
echo "============================================================"
echo

if [ ! -f "$PAGE" ]; then
  echo "ERREUR : fichier introuvable : $PAGE"
  exit 1
fi

echo "=== CHAMPS / BOUTONS AUTOUR DES AFFECTATIONS ==="
grep -nEi \
"téléphonique|telephonique|visiteur|Affecter|professeur|checkbox|sélectionner|selectionner" \
"$PAGE" | head -n 220

echo
echo "=== ID PRESENTS DANS LA PAGE ==="
grep -oE 'id="[^"]+"' "$PAGE" \
  | sed 's/id=//g' \
  | sort -u \
  | head -n 260

echo
echo "=== FONCTIONS JS LIEES AUX AFFECTATIONS ==="
grep -nE \
"function .*assign|function .*Prof|selectedProf|Affectation en cours|student-check|querySelectorAll.*check|google.script.run" \
"$PAGE" | head -n 260

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
