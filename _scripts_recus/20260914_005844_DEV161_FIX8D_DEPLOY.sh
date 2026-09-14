#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix8d"

QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX8D_${STAMP}"
mkdir -p "$BACKUP"
cp "$QR_SERVICE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX8D — REPARATION DU RETURN QR"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

# Le fragment "reference:..." est actuellement nu dans la fonction :
# il manque le "return {ok:true," qui précédait l'objet de réponse.
bad="reference:a.Reference_convention||'',numeroEnregistrement:numeroEnregistrement,message:'Informations entreprise enregistrées.',notification:notif};}"
good="return {ok:true,reference:a.Reference_convention||'',numeroEnregistrement:numeroEnregistrement,message:'Informations entreprise enregistrées.',notification:notif};}"

if bad in s:
    s=s.replace(bad,good,1)
    print("OK : return {ok:true,...} restauré.")
else:
    # Variante tolérante aux espaces.
    pat=re.compile(
        r"(?<![\w{])reference\s*:\s*a\.Reference_convention\|\|''\s*,\s*"
        r"numeroEnregistrement\s*:\s*numeroEnregistrement\s*,\s*"
        r"message\s*:\s*'Informations entreprise enregistrées\.'\s*,\s*"
        r"notification\s*:\s*notif\s*\}\s*;\s*\}"
    )
    m=pat.search(s)
    if m:
        repl="return {ok:true,reference:a.Reference_convention||'',numeroEnregistrement:numeroEnregistrement,message:'Informations entreprise enregistrées.',notification:notif};}"
        s=s[:m.start()]+repl+s[m.end():]
        print("OK : variante du return QR restaurée.")
    elif "return {ok:true,reference:a.Reference_convention||''" in s:
        print("INFO : return QR déjà correct.")
    else:
        # Afficher le voisinage exact pour ne pas patcher à l'aveugle.
        idx=s.find("reference:a.Reference_convention")
        if idx>=0:
            print("ERREUR : structure inattendue autour de reference :")
            print(s[max(0,idx-350):idx+350])
        raise SystemExit("ERREUR : impossible de restaurer le return QR automatiquement.")

p.write_text(s,encoding="utf-8")

txt=p.read_text(encoding="utf-8")
required=[
    "return {ok:true,reference:a.Reference_convention||''",
    "var estMonaco=",
    "Entreprise_nis",
    "Entreprise_identifiant_type:estMonaco?'NIS':'SIRET'",
    "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)"
]
for token in required:
    if token not in txt:
        raise SystemExit("ERREUR : élément requis manquant : "+token)

print("OK : structure fonctionnelle QR complète.")
PY

echo
echo "============================================================"
echo " DEV.161 FIX8D — CONTROLE DE SYNTAXE"
echo "============================================================"

cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8D.js

if ! node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8D.js; then
  echo
  echo "ERREUR : le fichier QR n'est toujours pas syntaxiquement valide."
  echo "AUCUN PUSH / AUCUN DEPLOIEMENT."
  exit 1
fi

echo "✓ syntaxe QR serveur valide"
echo "✓ return objet restauré"
echo "✓ backend Monaco conservé"

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
echo " DEV.161 FIX8D DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ retour serveur QR réparé"
echo "✓ backend Monaco conservé"
echo "✓ push + version + déploiement principal"
echo "============================================================"
