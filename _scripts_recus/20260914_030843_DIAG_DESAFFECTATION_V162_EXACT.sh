#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

FILE="apps-script/EUC_SUIVI_PFMP_FixV161_3.gs"

echo "============================================================"
echo " DIAGNOSTIC CIBLE — EUC_SUIVI_DESAFFECTER_V162"
echo "============================================================"

[ -f "$FILE" ] || { echo "ERREUR : fichier introuvable : $FILE"; exit 1; }

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_SUIVI_PFMP_FixV161_3.gs")
s=p.read_text(encoding="utf-8")

needle="function EUC_SUIVI_DESAFFECTER_V162"
start=s.find(needle)
if start<0:
    raise SystemExit("ERREUR : fonction introuvable.")

# Trouver l'accolade ouvrante de la fonction.
brace=s.find("{",start)
if brace<0:
    raise SystemExit("ERREUR : accolade ouvrante introuvable.")

# Parser léger d'accolades en ignorant chaînes/commentaires.
i=brace
depth=0
quote=None
escape=False
line_comment=False
block_comment=False
end=None

while i<len(s):
    ch=s[i]
    nxt=s[i+1] if i+1<len(s) else ''

    if line_comment:
        if ch=="\n":
            line_comment=False
        i+=1
        continue

    if block_comment:
        if ch=="*" and nxt=="/":
            block_comment=False
            i+=2
            continue
        i+=1
        continue

    if quote:
        if escape:
            escape=False
        elif ch=="\\":
            escape=True
        elif ch==quote:
            quote=None
        i+=1
        continue

    if ch=="/" and nxt=="/":
        line_comment=True
        i+=2
        continue
    if ch=="/" and nxt=="*":
        block_comment=True
        i+=2
        continue
    if ch in ("'",'"','`'):
        quote=ch
        i+=1
        continue

    if ch=="{":
        depth+=1
    elif ch=="}":
        depth-=1
        if depth==0:
            end=i+1
            break
    i+=1

if end is None:
    raise SystemExit("ERREUR : fin de fonction introuvable.")

block=s[start:end]

print("=== FONCTION COMPLETE ===")
print(block)

print("\n=== INFORMATIONS ===")
print("longueur :",len(block))
print("lignes   :",block.count("\\n")+1)
print("detail recalculé :", "EUC_SUIVI_CLASSE_detail" in block)
print("assurer table     :", "assurer" in block.lower())
print("patch Grist       :", "EUC_ENT_grist" in block)
print("return ok         :", "return" in block)

# Afficher aussi le code appelant côté HTML.
hp=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
if hp.exists():
    h=hp.read_text(encoding="utf-8")
    idx=h.find("EUC_SUIVI_DESAFFECTER_V162")
    if idx>=0:
        a=max(0,idx-1800)
        b=min(len(h),idx+1800)
        print("\n=== APPEL HTML AUTOUR DE EUC_SUIVI_DESAFFECTER_V162 ===")
        print(h[a:b])
    else:
        print("\nHTML : appel EUC_SUIVI_DESAFFECTER_V162 introuvable.")
PY

echo
echo "=== NODE CHECK FICHIER SERVEUR ==="
cp "$FILE" /tmp/EUC_SUIVI_PFMP_FixV161_3_DIAG.js
node --check /tmp/EUC_SUIVI_PFMP_FixV161_3_DIAG.js || true

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
