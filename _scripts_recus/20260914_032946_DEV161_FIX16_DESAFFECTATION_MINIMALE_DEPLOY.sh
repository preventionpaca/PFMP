#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix16-desaffectation-minimale"

SERVER="apps-script/EUC_SUIVI_PFMP_FixV161_3.gs"
HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX16_${STAMP}"
mkdir -p "$BACKUP"
cp "$SERVER" "$BACKUP/"
cp "$HTML" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX16 — DESAFFECTATION MINIMALE"
echo "============================================================"

cat > /tmp/EUC_SUIVI_DESAFFECTER_V162_FIX16.txt <<'EOF'
function EUC_SUIVI_DESAFFECTER_V162(payload){
  var ctx=EUC_V156_admin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};

  var affectationIds=(payload.affectationIds||[])
    .map(Number)
    .filter(function(x){return x>0;});

  if(!affectationIds.length){
    return {
      ok:true,
      count:0,
      message:'Aucune affectation active à retirer.'
    };
  }

  var now=new Date().toISOString();

  /*
   * FIX16 :
   * on ne touche qu'aux 2 colonnes garanties par le schéma V156 :
   * - Actif
   * - Date_modification
   *
   * Aucun champ Date_retrait / Retire_par / Motif_retrait ici.
   */
  var patches=affectationIds.map(function(id){
    return {
      id:id,
      fields:{
        Actif:false,
        Date_modification:now
      }
    };
  });

  EUC_ENT_grist(
    'patch',
    '/tables/EUC_AFFECTATIONS_SUIVI_PFMP/records',
    {records:patches}
  );

  return {
    ok:true,
    count:patches.length,
    message:patches.length+' affectation(s) retirée(s).'
  };
}
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_SUIVI_PFMP_FixV161_3.gs")
s=p.read_text(encoding="utf-8")
new_fn=Path("/tmp/EUC_SUIVI_DESAFFECTER_V162_FIX16.txt").read_text(encoding="utf-8").rstrip()

needle="function EUC_SUIVI_DESAFFECTER_V162"
start=s.find(needle)
if start<0:
    raise SystemExit("ERREUR : fonction introuvable.")

brace=s.find("{",start)
if brace<0:
    raise SystemExit("ERREUR : accolade ouvrante introuvable.")

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
        if ch=="\n": line_comment=False
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

s=s[:start]+new_fn+s[end:]
p.write_text(s,encoding="utf-8")
print("OK : fonction serveur simplifiée.")
PY

# Retirer le traceur 3 étapes et remettre un handler normal.
python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

s=re.sub(
    r'\n?<script id="EUC_TRACE_DESAFFECT_UI_V161">.*?</script>\n?',
    '\n',
    s,
    flags=re.S
)

start=s.find("confirm.onclick=function(){")
if start<0:
    raise SystemExit("ERREUR : handler confirm introuvable.")

brace=s.find("{",start)
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
        if ch=="\n": line_comment=False
        i+=1; continue
    if block_comment:
        if ch=="*" and nxt=="/":
            block_comment=False
            i+=2; continue
        i+=1; continue
    if quote:
        if escape: escape=False
        elif ch=="\\": escape=True
        elif ch==quote: quote=None
        i+=1; continue
    if ch=="/" and nxt=="/":
        line_comment=True; i+=2; continue
    if ch=="/" and nxt=="*":
        block_comment=True; i+=2; continue
    if ch in ("'",'"','`'):
        quote=ch; i+=1; continue

    if ch=="{":
        depth+=1
    elif ch=="}":
        depth-=1
        if depth==0:
            j=i+1
            while j<len(s) and s[j].isspace(): j+=1
            if j<len(s) and s[j]==";": j+=1
            end=j
            break
    i+=1

if end is None:
    raise SystemExit("ERREUR : fin handler introuvable.")

handler=r"""confirm.onclick=function(){
      if(!pendingType)return;

      const old=confirm.innerHTML;
      const selected=ids();
      const selectedMap={};
      selected.forEach(function(id){selectedMap[Number(id)]=true;});

      const affectationIds=(detail.lignes||[])
        .filter(function(x){return selectedMap[Number(x.eleveId)]===true;})
        .map(function(x){
          return pendingType==='TELEPHONE'
            ? Number(x.affectationTelephoneId||0)
            : Number(x.affectationVisiteId||0);
        })
        .filter(function(id){return id>0;});

      if(!affectationIds.length){
        modal.classList.remove('show');
        showStatus('Aucune affectation active à retirer pour la sélection.','err');
        return;
      }

      confirm.disabled=true;
      confirm.innerHTML='<span class="spinner"></span>Retrait en cours...';

      google.script.run
        .withSuccessHandler(function(r){
          confirm.disabled=false;
          confirm.innerHTML=old;
          modal.classList.remove('show');
          pendingType=null;
          showStatus((r&&r.message)||'Affectation retirée.','ok');
          window.setTimeout(function(){window.location.reload();},250);
        })
        .withFailureHandler(function(e){
          confirm.disabled=false;
          confirm.innerHTML=old;
          modal.classList.remove('show');
          pendingType=null;
          showStatus('Erreur : '+(e&&e.message||e),'err');
        })
        .EUC_SUIVI_DESAFFECTER_V162({
          affectationIds:affectationIds
        });
    };"""

s=s[:start]+handler+s[end:]
p.write_text(s,encoding="utf-8")
print("OK : handler normal restauré.")
PY

echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

cp "$SERVER" /tmp/EUC_SUIVI_PFMP_FixV161_3_FIX16.js
node --check /tmp/EUC_SUIVI_PFMP_FixV161_3_FIX16.js

grep -q "Actif:false" "$SERVER"
grep -q "Date_modification:now" "$SERVER"
! grep -q "Date_retrait:now" "$SERVER"
! grep -q "Retire_par:" "$SERVER"
! grep -q "Motif_retrait:" "$SERVER"
grep -q "affectationIds:affectationIds" "$HTML"
! grep -q "EUC_TRACE_DESAFFECT_UI_V161" "$HTML"

echo "✓ patch minimal : Actif + Date_modification seulement"
echo "✓ aucun champ historique optionnel"
echo "✓ aucun GET"
echo "✓ aucun recalcul"
echo "✓ traceur retiré"
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

echo "============================================================"
echo " DEV.161 FIX16 DEPLOYEE AVEC SUCCES"
echo "============================================================"
