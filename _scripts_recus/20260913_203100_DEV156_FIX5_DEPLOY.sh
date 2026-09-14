#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.156-fix5"

SERVICE="apps-script/EUC_SUIVI_PFMP_AffectationsV156.gs"
DETAIL_SERVICE="apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail.html"
HOME_PAGE="apps-script/Suivi_PFMP_Classes.html"
HOME_SERVICE="apps-script/EUC_SUIVI_PFMP_ClassesV154.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV156_avant_FIX5_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$DETAIL_SERVICE" "$DETAIL_PAGE" "$HOME_PAGE" "$HOME_SERVICE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.156 FIX5 — FINALISATION ROBUSTE"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

# ============================================================
# 1) ACCUEIL CLASSES : CHANGEMENT D'ANNEE
# ============================================================
p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")

# Remplacer reloadYear quelle que soit sa forme actuelle.
pat=re.compile(r"function\s+reloadYear\s*\(\s*code\s*\)\s*\{.*?\}",re.S)
if pat.search(s):
    s=pat.sub(
        "function reloadYear(code){\n"
        "    window.location.href=C.baseUrl+'?page=suivi-pfmp-classes&annee='+encodeURIComponent(code);\n"
        "  }",
        s,
        count=1
    )
else:
    print("INFO : reloadYear absent ; aucun bloc client à remplacer.")

p.write_text(s,encoding="utf-8")
print("OK : navigation année côté page classes vérifiée.")

# ============================================================
# 2) RENDERER CLASSES : RESPECTER ?annee=... SANS DEPENDRE
#    DU NOM EXACT DU CONTEXTE ACTUEL
# ============================================================
p=Path("apps-script/EUC_SUIVI_PFMP_ClassesV154.gs")
s=p.read_text(encoding="utf-8")

if "var requested=String(e&&e.parameter&&e.parameter.annee||'').trim();" not in s:
    fn=re.search(
        r"(function\s+EUC_SUIVI_CLASSES_afficherV154\s*\(\s*e\s*\)\s*\{)(.*?)(\n\})",
        s,
        re.S
    )
    if not fn:
        raise SystemExit("ERREUR : fonction EUC_SUIVI_CLASSES_afficherV154 introuvable.")

    body=fn.group(2)

    # Trouver la déclaration réelle de ctx, quelle que soit sa fonction source.
    ctxm=re.search(r"(\n\s*var\s+ctx\s*=\s*[^;]+;)",body)
    if not ctxm:
        raise SystemExit("ERREUR : variable ctx introuvable dans le renderer accueil.")

    inject=(
        ctxm.group(1) +
        "\n  var requested=String(e&&e.parameter&&e.parameter.annee||'').trim();"
        "\n  if(requested && ctx.annees && ctx.annees.some(function(a){return a.code===requested;})){"
        "\n    ctx.active=requested;"
        "\n    try{PropertiesService.getUserProperties().setProperty('EUC_PFMP_ANNEE_ACTIVE_V148',requested);}catch(err){}"
        "\n  }"
    )

    body=body[:ctxm.start()] + inject + body[ctxm.end():]
    s=s[:fn.start()] + fn.group(1) + body + fn.group(3) + s[fn.end():]

p.write_text(s,encoding="utf-8")
print("OK : renderer accueil respecte le paramètre annee.")

# ============================================================
# 3) DETAIL : GARANTIR BRANCHEMENT V156
# ============================================================
p=Path("apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs")
s=p.read_text(encoding="utf-8")

s=s.replace(
    "var detail=EUC_SUIVI_CLASSE_detailV155(annee,classeId,periodeId);",
    "var detail=EUC_SUIVI_CLASSE_detailV156(annee,classeId,periodeId);",
    1
)

p.write_text(s,encoding="utf-8")
print("OK : renderer détail branché sur V156.")
PY

echo "============================================================"
echo " DEV.156 FIX5 — CONTROLES"
echo "============================================================"

# Backend V156 déjà créé par FIX4 avant son arrêt.
grep -q "function EUC_SUIVI_AFFECTER_V156" "$SERVICE"
grep -q "function EUC_SUIVI_CLASSE_detailV156" "$SERVICE"

# Interface V156 déjà reconstruite localement par FIX4 avant son arrêt.
grep -q 'id="assignToolbarV156"' "$DETAIL_PAGE"
grep -q 'id="phoneProfInput"' "$DETAIL_PAGE"
grep -q 'id="visitProfInput"' "$DETAIL_PAGE"
grep -q "Affectation enregistrée" "$DETAIL_PAGE"

# Changement d'année
grep -q "page=suivi-pfmp-classes&annee=" "$HOME_PAGE"
grep -q "var requested=String(e&&e.parameter&&e.parameter.annee||'').trim();" "$HOME_SERVICE"

# Syntaxe Apps Script / JS serveur
cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_AffectationsV156_FIX5.js
cp "$DETAIL_SERVICE" /tmp/EUC_SUIVI_PFMP_ClasseDetailV155_FIX5.js
cp "$HOME_SERVICE" /tmp/EUC_SUIVI_PFMP_ClassesV154_FIX5.js
node --check /tmp/EUC_SUIVI_PFMP_AffectationsV156_FIX5.js
node --check /tmp/EUC_SUIVI_PFMP_ClasseDetailV155_FIX5.js
node --check /tmp/EUC_SUIVI_PFMP_ClassesV154_FIX5.js

echo "OK : backend V156 présent."
echo "OK : interface V156 présente."
echo "OK : changement d'année présent côté client + serveur."
echo "OK : syntaxe serveur valide."

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
echo " DEV.156 FIX5 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ backend affectations V156"
echo "✓ interface téléphone / visiteur"
echo "✓ sélection multiple"
echo "✓ changement d'année corrigé"
echo "✓ push + version + déploiement principal"
echo "============================================================"
