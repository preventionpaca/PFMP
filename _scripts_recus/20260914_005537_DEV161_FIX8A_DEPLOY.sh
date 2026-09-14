#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix8a"

QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX8A_${STAMP}"
mkdir -p "$BACKUP"
cp "$QR_SERVICE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX8A — INSERTION MONACO APRES PATCH QR"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

# Si l'appel est déjà présent, ne pas le dupliquer.
if "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)" in s:
    print("INFO : appel Monaco déjà présent, aucune insertion nécessaire.")
else:
    fn_start=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
    if fn_start < 0:
        raise SystemExit("ERREUR : fonction EUC_CONVENTION_enregistrerEntrepriseV117 introuvable.")

    fn_end=s.find("\nfunction ",fn_start+10)
    if fn_end < 0:
        fn_end=len(s)

    block=s[fn_start:fn_end]

    # Chercher le PATCH du dossier d'accès, sans dépendre de ce qui suit.
    pat=re.compile(
        r"EUC_ENT_grist\('patch','/tables/'\+encodeURIComponent\(EUC_CONVENTION_ACCES_TABLE_\)\+'/records',\{records:\[\{id:a\.id,fields:fields\}\]\}\);"
    )
    m=pat.search(block)
    if not m:
        raise SystemExit("ERREUR : PATCH du dossier QR introuvable dans la fonction d'enregistrement.")

    insertion=(
        "if(estMonaco){"
        "try{EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d);}"
        "catch(monacoErr){console.log('MONACO_REF_WARNING '+String(monacoErr&&monacoErr.message||monacoErr));}"
        "}"
    )

    absolute=fn_start+m.end()
    s=s[:absolute]+insertion+s[absolute:]
    print("OK : création/rattachement Monaco inséré juste après le PATCH du dossier.")

# Vérifier que le bloc de variables Monaco existe bien.
if "var estMonaco=" not in s:
    raise SystemExit("ERREUR : variable estMonaco absente ; FIX8 incomplet.")
if "Entreprise_nis" not in s:
    raise SystemExit("ERREUR : champ Entreprise_nis absent ; FIX8 incomplet.")
if "Entreprise_identifiant_type" not in s:
    raise SystemExit("ERREUR : champ Entreprise_identifiant_type absent ; FIX8 incomplet.")

p.write_text(s,encoding="utf-8")
PY

echo
echo "============================================================"
echo " DEV.161 FIX8A — CONTROLES"
echo "============================================================"

cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8A.js
node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8A.js

check(){
  local label="$1"
  shift
  if "$@"; then
    echo "✓ $label"
  else
    echo "✗ ECHEC : $label"
    exit 1
  fi
}

check "appel Monaco après enregistrement présent" \
  grep -q "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)" "$QR_SERVICE"

check "champ Entreprise_nis présent" \
  grep -q "Entreprise_nis" "$QR_SERVICE"

check "type identifiant entreprise présent" \
  grep -q "Entreprise_identifiant_type" "$QR_SERVICE"

check "routes ENT du FIX8 conservées" \
  grep -q "suivi-pfmp-ent" apps-script/EDT.js

check "QR Monaco du FIX8 conservé" \
  grep -q "entreprisePaysSelectV161" apps-script/PFMP_Acces_QR_V116.html

check "PDF maître surchargé SIRET/NIS conservé" \
  grep -q "drawSiretNisLabel" apps-script/Convention_PFMP_PdfV95.html

echo "✓ syntaxe QR serveur valide"

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
echo " DEV.161 FIX8A DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ Monaco inconnu -> création référentiel A_VALIDER"
echo "✓ routes ENT conservées"
echo "✓ PDF SIRET/NIS conservé"
echo "✓ push + version + déploiement principal"
echo "============================================================"
