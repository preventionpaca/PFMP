#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-trace-desaffectation"

SERVER="apps-script/EUC_SUIVI_PFMP_FixV161_3.gs"
HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_TRACE_DESAFFECT_${STAMP}"
mkdir -p "$BACKUP"
cp "$SERVER" "$BACKUP/"
cp "$HTML" "$BACKUP/"

echo "============================================================"
echo " DEV.161 — TRACE DESAFFECTATION PAR ETAPES"
echo "============================================================"

cat >> "$SERVER" <<'EOF'

/** DEV.161 — diagnostic temporaire de la désaffectation. */
function EUC_DIAG_DESAFFECT_PING_V161(){
  return {ok:true,etape:'PING',ts:new Date().toISOString()};
}

function EUC_DIAG_DESAFFECT_AUTH_V161(){
  var t0=Date.now();
  var ctx=null;
  try{
    if(typeof EUC_V156_admin_==='function')ctx=EUC_V156_admin_();
    else if(typeof EUC_V156_contexteAdmin_==='function')ctx=EUC_V156_contexteAdmin_();
  }catch(e){
    throw new Error('AUTH : '+String(e&&e.message||e));
  }
  if(!ctx)throw new Error('AUTH : accès administrateur non reconnu.');
  return {
    ok:true,
    etape:'AUTH',
    dureeMs:Date.now()-t0,
    email:String(ctx.email||'')
  };
}
EOF

cat > /tmp/EUC_TRACE_DESAFFECT_UI.html <<'EOF'
<script id="EUC_TRACE_DESAFFECT_UI_V161">
(function(){
  'use strict';

  function checkedIds(){
    return Array.from(document.querySelectorAll('.student-check:checked'))
      .map(function(x){return Number(x.value);})
      .filter(function(x){return x>0;});
  }

  function statusText(t){
    var confirm=document.getElementById('retConfirmV162');
    if(confirm){
      confirm.disabled=true;
      confirm.innerHTML='<span class="spinner"></span>'+t;
    }
  }

  function fail(e){
    var confirm=document.getElementById('retConfirmV162');
    var modal=document.getElementById('retModalV162');
    if(confirm){
      confirm.disabled=false;
      confirm.textContent='Retirer';
    }
    if(modal)modal.classList.remove('show');
    if(typeof showStatus==='function'){
      showStatus('DIAGNOSTIC : '+(e&&e.message||e),'err');
    }
  }

  function findAffectationIds(type,ids){
    var map={};
    ids.forEach(function(id){map[id]=true;});
    return (detail.lignes||[])
      .filter(function(x){return map[Number(x.eleveId)]===true;})
      .map(function(x){
        return type==='TELEPHONE'
          ? Number(x.affectationTelephoneId||0)
          : Number(x.affectationVisiteId||0);
      })
      .filter(function(id){return id>0;});
  }

  window.EUC_TRACE_DESAFFECT_RUN_V161=function(type){
    var ids=checkedIds();
    if(!ids.length){
      if(typeof showStatus==='function')showStatus('Sélectionnez au moins un élève.','err');
      return;
    }

    statusText('Étape 1/3 — test liaison…');

    google.script.run
      .withSuccessHandler(function(){
        statusText('Étape 2/3 — contrôle autorisation…');

        google.script.run
          .withSuccessHandler(function(){
            statusText('Étape 3/3 — retrait Grist…');

            var affectationIds=findAffectationIds(type,ids);

            google.script.run
              .withSuccessHandler(function(r){
                var confirm=document.getElementById('retConfirmV162');
                var modal=document.getElementById('retModalV162');
                if(confirm){
                  confirm.disabled=false;
                  confirm.textContent='Retirer';
                }
                if(modal)modal.classList.remove('show');

                if(typeof showStatus==='function'){
                  showStatus(
                    'DIAGNOSTIC OK — '+((r&&r.message)||'retrait terminé')+
                    (r&&r.dureeMs!==undefined?' — '+r.dureeMs+' ms':''),
                    'ok'
                  );
                }

                setTimeout(function(){window.location.reload();},500);
              })
              .withFailureHandler(fail)
              .EUC_SUIVI_DESAFFECTER_V162({
                annee:detail.annee,
                classeId:detail.classe.id,
                periodeId:detail.periode.id,
                type:type,
                eleveIds:ids,
                affectationIds:affectationIds,
                motif:'Retrait depuis le tableau de suivi'
              });
          })
          .withFailureHandler(fail)
          .EUC_DIAG_DESAFFECT_AUTH_V161();
      })
      .withFailureHandler(fail)
      .EUC_DIAG_DESAFFECT_PING_V161();
  };
})();
</script>
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

# Remplacer uniquement le clic de confirmation existant par le traceur,
# sans toucher à la construction du modal.
start=s.find("confirm.onclick=function(){")
if start<0:
    raise SystemExit("ERREUR : confirm.onclick introuvable.")

# Parser léger jusqu'à la fin `};` du handler.
i=s.find("{",start)
depth=0
quote=None
esc=False
line=False
block=False
end=None

while i<len(s):
    ch=s[i]
    nxt=s[i+1] if i+1<len(s) else ''

    if line:
        if ch=="\n": line=False
        i+=1; continue
    if block:
        if ch=="*" and nxt=="/":
            block=False; i+=2; continue
        i+=1; continue
    if quote:
        if esc: esc=False
        elif ch=="\\": esc=True
        elif ch==quote: quote=None
        i+=1; continue
    if ch=="/" and nxt=="/":
        line=True; i+=2; continue
    if ch=="/" and nxt=="*":
        block=True; i+=2; continue
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
    raise SystemExit("ERREUR : fin confirm.onclick introuvable.")

new_handler="""confirm.onclick=function(){
      if(!pendingType)return;
      EUC_TRACE_DESAFFECT_RUN_V161(pendingType);
    };"""

s=s[:start]+new_handler+s[end:]

# Nettoyer ancienne version éventuelle du traceur.
s=re.sub(
    r'\n?<script id="EUC_TRACE_DESAFFECT_UI_V161">.*?</script>\n?',
    '\n',
    s,
    flags=re.S
)

block=Path("/tmp/EUC_TRACE_DESAFFECT_UI.html").read_text(encoding="utf-8")
if "</body>" not in s:
    raise SystemExit("ERREUR : </body> introuvable.")

s=s.replace("</body>",block+"\n</body>",1)
p.write_text(s,encoding="utf-8")

print("OK : interface instrumentée en 3 étapes.")
PY

echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

cp "$SERVER" /tmp/EUC_SUIVI_PFMP_FixV161_3_TRACE.js
node --check /tmp/EUC_SUIVI_PFMP_FixV161_3_TRACE.js

python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_TRACE_DESAFFECT_UI_V161">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : traceur UI introuvable.")
Path("/tmp/EUC_TRACE_DESAFFECT_UI_V161.js").write_text(m.group(1),encoding="utf-8")
PY
node --check /tmp/EUC_TRACE_DESAFFECT_UI_V161.js

grep -q "Étape 1/3 — test liaison" "$HTML"
grep -q "Étape 2/3 — contrôle autorisation" "$HTML"
grep -q "Étape 3/3 — retrait Grist" "$HTML"
grep -q "function EUC_DIAG_DESAFFECT_PING_V161" "$SERVER"
grep -q "function EUC_DIAG_DESAFFECT_AUTH_V161" "$SERVER"

echo "✓ traceur 3 étapes installé"
echo "✓ syntaxe serveur valide"
echo "✓ syntaxe navigateur valide"

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
echo " TRACE DESAFFECTATION DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Au prochain clic Retirer, le bouton indiquera précisément :"
echo "  Étape 1/3 — test liaison…"
echo "  Étape 2/3 — contrôle autorisation…"
echo "  Étape 3/3 — retrait Grist…"
echo "============================================================"
