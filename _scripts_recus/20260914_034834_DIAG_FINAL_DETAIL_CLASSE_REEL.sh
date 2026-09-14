#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
ROUTER="apps-script/EDT.js"
FIX18="apps-script/EUC_SUIVI_PFMP_FixV161_18.gs"

echo "============================================================"
echo " DIAGNOSTIC FINAL CIBLE — DETAIL CLASSE REEL"
echo "============================================================"

for f in "$HTML" "$ROUTER" "$FIX18"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
done

echo
echo "=== 1) DEPLOIEMENT PRINCIPAL ==="
clasp deployments | grep -E 'AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg|Found' || true

echo
echo "=== 2) ROUTE REELLE ==="
grep -n "suivi-pfmp-classe" "$ROUTER" || true

echo
echo "=== 3) RENDU DES BOUTONS DE PERIODE ==="
grep -nE "periodTabs|data-p|periodesDisponibles|detail\.periodes|PFMP 1|periode.*button|button.*periode" "$HTML" || true

echo
echo "=== 4) RENDU DE LA REFERENCE CONVENTION ==="
grep -nE "reference|Reference|PFMP-|numero|Numéro|Convention / statut|Convention.*statut" "$HTML" || true

echo
echo "=== 5) RENDU DU TABLEAU / render() ==="
grep -nE "function render|const render|render=function|render\(\)|innerHTML=.*lignes|detail\.lignes|tbody" "$HTML" || true

echo
echo "=== 6) BLOCS FIX AJOUTES ET ORDRE ==="
grep -nE "EUC_FIX[0-9]+|EUC_DETAIL_FIX|EUC_PERIOD|EUC_TRACE|</body>|</html>" "$HTML" || true

echo
echo "=== 7) DETAIL / DECLARATION JS ==="
grep -nE "const detail|let detail|var detail|detailJson|JSON\.parse" "$HTML" || true

echo
echo "=== 8) CONTENU DU FIX18 SERVEUR ==="
sed -n '1,260p' "$FIX18"

echo
echo "=== 9) EXTRAITS HTML AUTOUR DES POINTS CLES ==="
python3 <<'PY'
from pathlib import Path

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")

needles=[
    ("PERIODES", "periodTabs"),
    ("TABLEAU", "function render"),
    ("REFERENCE", "reference"),
    ("CONFIRM RETRAIT", "confirm.onclick=function"),
    ("FIX18 UI", 'id="EUC_FIX18_UI_SCRIPT"'),
]

for title,needle in needles:
    print("\n----------------",title,"----------------")
    i=s.find(needle)
    if i<0:
        print("INTRouvable :",needle)
        continue
    print(s[max(0,i-2200):min(len(s),i+5200)])
PY

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
