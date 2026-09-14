#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

SERVER="apps-script/EUC_SUIVI_PFMP_FixV161_3.gs"
HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

echo "============================================================"
echo " DIAGNOSTIC DESAFFECTATION — ETAT REEL APRES FIX14A"
echo "============================================================"

for f in "$SERVER" "$HTML"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
done

python3 <<'PY'
from pathlib import Path

def extract_function(s, name):
    start=s.find("function "+name)
    if start<0:
        raise SystemExit("ERREUR : fonction "+name+" introuvable.")
    brace=s.find("{",start)
    i=brace; depth=0; quote=None; esc=False; line=False; block=False
    while i<len(s):
        ch=s[i]; nxt=s[i+1] if i+1<len(s) else ''
        if line:
            if ch=="\n": line=False
            i+=1; continue
        if block:
            if ch=="*" and nxt=="/": block=False; i+=2; continue
            i+=1; continue
        if quote:
            if esc: esc=False
            elif ch=="\\": esc=True
            elif ch==quote: quote=None
            i+=1; continue
        if ch=="/" and nxt=="/": line=True; i+=2; continue
        if ch=="/" and nxt=="*": block=True; i+=2; continue
        if ch in ("'",'"','`'): quote=ch; i+=1; continue
        if ch=="{": depth+=1
        elif ch=="}":
            depth-=1
            if depth==0:
                return s[start:i+1]
        i+=1
    raise SystemExit("ERREUR : fin de fonction introuvable.")

sp=Path("apps-script/EUC_SUIVI_PFMP_FixV161_3.gs")
s=sp.read_text(encoding="utf-8")
fn=extract_function(s,"EUC_SUIVI_DESAFFECTER_V162")

print("=== FONCTION SERVEUR ACTUELLE ===")
print(fn)
print("\n=== ANALYSE RAPIDE ===")
print("PATCH groupé :", "{records:patches}" in fn)
print("recalcul detail :", "EUC_SUIVI_CLASSE_detailV162" in fn)
print("assurerRetraitCols :", "assurerRetraitCols" in fn)
print("lecture table complète :", "EUC_IMPORT_lireRecords_('EUC_AFFECTATIONS_SUIVI_PFMP')" in fn)
print("contexte admin :", "EUC_V156_contexteAdmin_" in fn)

hp=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
h=hp.read_text(encoding="utf-8")
idx=h.find(".EUC_SUIVI_DESAFFECTER_V162(")
if idx<0:
    raise SystemExit("ERREUR : appel HTML introuvable.")
print("\n=== APPEL HTML ACTUEL ===")
print(h[max(0,idx-1600):min(len(h),idx+1200)])
PY

echo
echo "=== VERIFICATION SYNTAXE ==="
cp "$SERVER" /tmp/EUC_SUIVI_PFMP_FixV161_3_DIAG_ACTUEL.js
node --check /tmp/EUC_SUIVI_PFMP_FixV161_3_DIAG_ACTUEL.js || true

echo
echo "=== COMPTAGE APPROXIMATIF DES LECTURES LOURDES DANS LE FICHIER ==="
grep -nE "EUC_IMPORT_lireRecords_\\('EUC_AFFECTATIONS_SUIVI_PFMP'\\)|EUC_ENT_grist\\('get'.*EUC_AFFECTATIONS_SUIVI_PFMP|EUC_V156_contexteAdmin_|EUC_SUIVI_DESAFFECTER_V162" "$SERVER" || true

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
