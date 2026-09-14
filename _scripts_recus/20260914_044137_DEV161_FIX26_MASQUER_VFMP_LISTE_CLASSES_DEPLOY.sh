#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix26-masquer-vfmp-liste-classes"

SERVICE="apps-script/EUC_SUIVI_PFMP_ClassesV154.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX26_${STAMP}"
mkdir -p "$BACKUP"
cp "$SERVICE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX26 — MASQUER VFMP DANS LA LISTE DES CLASSES"
echo "============================================================"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_SUIVI_PFMP_ClassesV154.gs")
s=p.read_text(encoding="utf-8")

marker="// FIX26 — masquer VFMP/VEMP dans la synthèse des terminales Bac Pro."

block = (
"  // FIX26 — masquer VFMP/VEMP dans la synthèse des terminales Bac Pro.\n"
"  // Règle provisoire métier :\n"
"  // - scolaires de terminale Bac Pro : VFMP/VEMP non affichée ;\n"
"  // - CAP / BTS : non concernés ;\n"
"  // - apprentis : traitement spécifique ultérieur.\n"
"  cards.forEach(function(card){\n"
"    var cat=String(card.categorie||'').toUpperCase().trim();\n"
"    var classe=String(card.classe||'').toUpperCase().trim();\n"
"\n"
"    var terminaleBac=\n"
"      cat.indexOf('BAC')>=0 &&\n"
"      /^T/.test(classe) &&\n"
"      classe.indexOf('CAP')<0 &&\n"
"      classe.indexOf('BTS')<0;\n"
"\n"
"    if(!terminaleBac || !Array.isArray(card.periodes))return;\n"
"\n"
"    card.periodes=card.periodes.filter(function(p){\n"
"      var lib=String((p&&p.libelle)||'')\n"
"        .toUpperCase()\n"
"        .replace(/[\\s._-]+/g,'');\n"
"\n"
"      return lib!=='VFMP' && lib!=='VEMP';\n"
"    });\n"
"  });\n"
"\n"
)

if marker in s:
    print("INFO : FIX26 déjà présent.")
else:
    anchor="  cards.sort(function(a,b){"
    if anchor not in s:
        raise SystemExit("ERREUR : point d'injection cards.sort introuvable.")
    s=s.replace(anchor,block+anchor,1)

p.write_text(s,encoding="utf-8")
print("OK : VFMP/VEMP filtrée dans la synthèse des terminales Bac Pro.")
PY

echo
echo "============================================================"
echo " VALIDATION"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_ClassesV154_FIX26.js
node --check /tmp/EUC_SUIVI_PFMP_ClassesV154_FIX26.js

grep -q "FIX26 — masquer VFMP/VEMP" "$SERVICE"
grep -q "lib!=='VFMP'" "$SERVICE"
grep -q "lib!=='VEMP'" "$SERVICE"

echo "✓ terminales Bac Pro ciblées"
echo "✓ VFMP/VEMP masquée dans les cartes de la liste des classes"
echo "✓ CAP et BTS non concernés"
echo "✓ détail classe inchangé"
echo "✓ dates sous les boutons inchangées"
echo "✓ retrait professeur inchangé"

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

echo "============================================================"
echo " DEV.161 FIX26 DEPLOYE"
echo "============================================================"
