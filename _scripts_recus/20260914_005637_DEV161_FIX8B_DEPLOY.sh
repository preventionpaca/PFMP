#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix8b"

QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"
MONACO_SERVICE="apps-script/EUC_PFMP_Monaco_V161Fix8.gs"
ROUTER="apps-script/EDT.js"
QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
PDF_HTML="apps-script/Convention_PFMP_PdfV95.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX8B_${STAMP}"
mkdir -p "$BACKUP"

for f in "$QR_SERVICE" "$MONACO_SERVICE" "$ROUTER" "$QR_PAGE" "$PDF_HTML"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX8B — COMPLETER LE BACKEND QR MONACO"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

fn_start=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
if fn_start < 0:
    raise SystemExit("ERREUR : fonction EUC_CONVENTION_enregistrerEntrepriseV117 introuvable.")

fn_end=s.find("\nfunction ",fn_start+10)
if fn_end < 0:
    fn_end=len(s)

block=s[fn_start:fn_end]

# ------------------------------------------------------------
# 1) Déclarer estMonaco + nis juste après la déclaration pays/siret
# ------------------------------------------------------------
if "var estMonaco=" not in block:
    marker="var pays=txt(d.entreprisePays,100)||'France',siret=txt(d.entrepriseSiret,30),raison=txt(d.entrepriseRaisonSociale,250),adresse=txt(d.entrepriseAdresse,300),commune=txt(d.entrepriseCommune,150),respNom=txt(d.responsableNom,150),tuteurEst=d.tuteurEstResponsable===true||String(d.tuteurEstResponsable)==='true';"
    if marker not in block:
        raise SystemExit("ERREUR : déclaration pays/siret exacte introuvable dans le backend QR.")

    replacement=marker+"var estMonaco=pays.toLowerCase()==='monaco',nis=estMonaco?siret:'';"
    block=block.replace(marker,replacement,1)
    print("OK 1/4 : variables estMonaco + nis ajoutées.")
else:
    print("INFO 1/4 : variables Monaco déjà présentes.")

# ------------------------------------------------------------
# 2) Ajouter les colonnes d'accès si elles n'existent pas encore
# ------------------------------------------------------------
if "Entreprise_nis" not in s:
    defs_marker="['Entreprise_siret','SIRET entreprise','Text']"
    defs_repl="['Entreprise_siret','SIRET entreprise','Text'],['Entreprise_nis','NIS Monaco','Text'],['Entreprise_identifiant_type','Type identifiant entreprise','Text'],['Entreprise_validation_statut','Statut validation entreprise','Text']"
    if defs_marker not in s:
        raise SystemExit("ERREUR : définition colonne Entreprise_siret introuvable.")
    s=s.replace(defs_marker,defs_repl,1)
    print("OK 2/4 : colonnes NIS/type/statut ajoutées.")
else:
    print("INFO 2/4 : colonnes Monaco déjà présentes.")

# ------------------------------------------------------------
# 3) Enregistrer SIRET ou NIS selon le pays
# ------------------------------------------------------------
if "Entreprise_identifiant_type:estMonaco?'NIS':'SIRET'" not in block:
    fields_marker="var fields={Entreprise_siret:siret,Entreprise_raison_sociale:raison,"
    fields_repl="var fields={Entreprise_siret:estMonaco?'':siret,Entreprise_nis:nis,Entreprise_identifiant_type:estMonaco?'NIS':'SIRET',Entreprise_validation_statut:estMonaco?'A_VALIDER':'VALIDE',Entreprise_raison_sociale:raison,"
    if fields_marker not in block:
        raise SystemExit("ERREUR : objet fields entreprise introuvable.")
    block=block.replace(fields_marker,fields_repl,1)
    print("OK 3/4 : sauvegarde SIRET/NIS différenciée.")
else:
    print("INFO 3/4 : sauvegarde différenciée déjà présente.")

# ------------------------------------------------------------
# 4) Vérifier l'appel création référentiel Monaco
# ------------------------------------------------------------
if "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)" not in block:
    patch_pat=re.compile(
        r"EUC_ENT_grist\('patch','/tables/'\+encodeURIComponent\(EUC_CONVENTION_ACCES_TABLE_\)\+'/records',\{records:\[\{id:a\.id,fields:fields\}\]\}\);"
    )
    m=patch_pat.search(block)
    if not m:
        raise SystemExit("ERREUR : PATCH dossier QR introuvable pour insertion Monaco.")
    insertion=(
        "if(estMonaco){"
        "try{EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d);}"
        "catch(monacoErr){console.log('MONACO_REF_WARNING '+String(monacoErr&&monacoErr.message||monacoErr));}"
        "}"
    )
    block=block[:m.end()]+insertion+block[m.end():]
    print("OK 4/4 : création référentiel Monaco ajoutée.")
else:
    print("INFO 4/4 : création référentiel Monaco déjà présente.")

# Réinjecter la fonction modifiée dans le fichier complet.
s=s[:fn_start]+block+s[fn_end:]
p.write_text(s,encoding="utf-8")

# Contrôles structurels immédiats
check=p.read_text(encoding="utf-8")
for token in [
    "var estMonaco=",
    "Entreprise_nis",
    "Entreprise_identifiant_type:estMonaco?'NIS':'SIRET'",
    "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)"
]:
    if token not in check:
        raise SystemExit("ERREUR : élément Monaco manquant après patch : "+token)

print("OK : backend QR Monaco complet.")
PY

echo
echo "============================================================"
echo " DEV.161 FIX8B — CONTROLES AVANT PUSH"
echo "============================================================"

cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8B.js
cp "$MONACO_SERVICE" /tmp/EUC_PFMP_Monaco_V161Fix8B.js
cp "$ROUTER" /tmp/EDT_DEV161_FIX8B.js

node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8B.js
node --check /tmp/EUC_PFMP_Monaco_V161Fix8B.js
node --check /tmp/EDT_DEV161_FIX8B.js

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

check "variable estMonaco présente" grep -q "var estMonaco=" "$QR_SERVICE"
check "champ Entreprise_nis présent" grep -q "Entreprise_nis" "$QR_SERVICE"
check "type NIS/SIRET présent" grep -q "Entreprise_identifiant_type:estMonaco?'NIS':'SIRET'" "$QR_SERVICE"
check "création Monaco A_VALIDER présente" grep -q "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)" "$QR_SERVICE"
check "service référentiel Monaco présent" grep -q "function EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_" "$MONACO_SERVICE"
check "routes ENT FIX8 conservées" grep -q "suivi-pfmp-ent" "$ROUTER"
check "QR France/Monaco conservé" grep -q "entreprisePaysSelectV161" "$QR_PAGE"
check "surcharge PDF SIRET/NIS conservée" grep -q "drawSiretNisLabel" "$PDF_HTML"

echo "✓ syntaxe serveur valide"

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
echo " DEV.161 FIX8B DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ backend QR Monaco complet"
echo "✓ NIS stocké séparément du SIRET"
echo "✓ entreprise Monaco inconnue créée A_VALIDER"
echo "✓ ENT + PDF + QR conservés"
echo "✓ push + version + déploiement principal"
echo "============================================================"
