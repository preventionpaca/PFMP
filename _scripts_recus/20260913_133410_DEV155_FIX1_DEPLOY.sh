#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.155-fix1"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV155_FIX1_${STAMP}"
mkdir -p "$BACKUP"

PAGE="apps-script/Admin_Conventions_PFMP.html"
TRACE="apps-script/EUC_ADMIN_PFMP_TraceV154Fix.gs"
DETAIL="apps-script/Suivi_PFMP_Classe_Detail.html"
DETAIL_SERVICE="apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs"
ROUTER="apps-script/EDT.js"

for f in "$PAGE" "$TRACE" "$DETAIL" "$DETAIL_SERVICE" "$ROUTER"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

cat > "$TRACE" <<'EOF'
/** Eucalyptus PFMP — trace visuelle corrections/suppressions — v1.0.0-dev.155-fix1 */

function EUC_ADMIN_TRACE_listerV154Fix(){
  EUC_ADMIN_WORKFLOW_ctxV144_();

  var rows=EUC_CONVENTION_lireAccesFraisV108_();

  return rows.map(function(a){
    var hist=String(a.Historique_admin_JSON||'');
    return {
      id:Number(a.id),
      supprimee:
        a.Supprimee_admin===true ||
        String(a.Statut_administratif||'')==='SUPPRIMEE_ADMIN',
      corrigee:
        hist.indexOf('CORRECTION_ADMINISTRATIVE')>=0
    };
  });
}
EOF

cat > /tmp/dev155_trace_ui.html <<'EOF'
<style id="traceStylesV155Fix">
  .trace-correction{
    color:#b45309!important;
    background:#fff7ed!important;
    border-left:5px solid #f59e0b!important;
  }
  .trace-suppression{
    color:#b91c1c!important;
    background:#fff1f2!important;
    border-left:5px solid #dc2626!important;
    font-weight:800!important;
  }
  .trace-title-correction{
    color:#b45309!important;
    background:#fff7ed!important;
    border:1px solid #f59e0b!important;
    border-radius:10px;
    padding:10px;
  }
  .trace-title-suppression{
    color:#b91c1c!important;
    background:#fff1f2!important;
    border:2px solid #dc2626!important;
    border-radius:10px;
    padding:10px;
  }
</style>

<script id="traceScriptV155Fix">
(function(){
  let traceMap={};

  function cleanPrefix(txt){
    return String(txt||'')
      .replace(/^CORRIGÉE — /,'')
      .replace(/^SUPPRIMÉE — /,'')
      .replace(/^CONVENTION CORRIGÉE — /,'')
      .replace(/^CONVENTION SUPPRIMÉE — /,'');
  }

  function styleHistory(){
    const history=document.getElementById('history');
    if(!history)return;

    Array.from(history.querySelectorAll('.history-item')).forEach(function(el){
      const raw=(el.textContent||'').trim();
      const up=raw.toUpperCase();

      el.classList.remove('trace-correction','trace-suppression');

      if(
        up.indexOf('SUPPRESSION_CONVENTION')>=0 ||
        up.indexOf('SUPPRIMEE_ADMIN')>=0 ||
        up.indexOf('CONVENTION SUPPRIMÉE')>=0
      ){
        el.classList.add('trace-suppression');
        if(raw.indexOf('CONVENTION SUPPRIMÉE — ')!==0){
          el.textContent='CONVENTION SUPPRIMÉE — '+cleanPrefix(raw);
        }
      }else if(
        up.indexOf('CORRECTION_ADMINISTRATIVE')>=0 ||
        up.indexOf('CORRECTION APPORTÉE')>=0
      ){
        el.classList.add('trace-correction');
        if(raw.indexOf('CORRECTION APPORTÉE — ')!==0){
          el.textContent='CORRECTION APPORTÉE — '+cleanPrefix(raw);
        }
      }
    });
  }

  function styleTitle(){
    const title=document.getElementById('title');
    if(!title)return;

    const history=document.getElementById('history');
    const historyTxt=(history&&history.textContent||'').toUpperCase();

    const raw=(title.textContent||'').trim();
    const up=raw.toUpperCase();

    const isDeleted=
      up.indexOf('SUPPRIM')>=0 ||
      historyTxt.indexOf('SUPPRESSION_CONVENTION')>=0 ||
      historyTxt.indexOf('CONVENTION SUPPRIMÉE')>=0;

    const isCorrected=
      !isDeleted &&
      (
        historyTxt.indexOf('CORRECTION_ADMINISTRATIVE')>=0 ||
        historyTxt.indexOf('CORRECTION APPORTÉE')>=0
      );

    title.classList.remove('trace-title-correction','trace-title-suppression');

    if(isDeleted){
      title.classList.add('trace-title-suppression');
      if(raw.indexOf('CONVENTION SUPPRIMÉE — ')!==0){
        title.textContent='CONVENTION SUPPRIMÉE — '+cleanPrefix(raw);
      }
    }else if(isCorrected){
      title.classList.add('trace-title-correction');
      if(raw.indexOf('CONVENTION CORRIGÉE — ')!==0){
        title.textContent='CONVENTION CORRIGÉE — '+cleanPrefix(raw);
      }
    }
  }

  function styleSuggestions(){
    const box=document.getElementById('suggestions');
    if(!box)return;

    Array.from(box.querySelectorAll('.suggestion[data-id]')).forEach(function(el){
      const id=String(el.dataset.id||'');
      const t=traceMap[id];
      if(!t)return;

      el.classList.remove('trace-correction','trace-suppression');

      const bold=el.querySelector('b');
      if(!bold)return;

      let txt=cleanPrefix(bold.textContent||'');

      if(t.supprimee){
        el.classList.add('trace-suppression');
        bold.textContent='SUPPRIMÉE — '+txt;
      }else if(t.corrigee){
        el.classList.add('trace-correction');
        bold.textContent='CORRIGÉE — '+txt;
      }else{
        bold.textContent=txt;
      }
    });
  }

  function applyAll(){
    styleHistory();
    styleTitle();
    styleSuggestions();
  }

  google.script.run
    .withSuccessHandler(function(rows){
      traceMap={};
      (rows||[]).forEach(function(x){
        traceMap[String(x.id)]=x;
      });
      applyAll();
    })
    .withFailureHandler(function(e){
      console.error('Trace V155 FIX1',e);
    })
    .EUC_ADMIN_TRACE_listerV154Fix();

  const obs=new MutationObserver(function(){
    setTimeout(applyAll,0);
  });

  obs.observe(document.body,{
    subtree:true,
    childList:true,
    characterData:true
  });

  const search=document.getElementById('search');
  if(search){
    search.addEventListener('input',function(){
      setTimeout(styleSuggestions,0);
    });
  }

  setTimeout(applyAll,0);
})();
</script>
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Admin_Conventions_PFMP.html")
s=p.read_text(encoding="utf-8")
extra=Path("/tmp/dev155_trace_ui.html").read_text(encoding="utf-8")

# Remplacer l'ancien patch visuel DEV154 s'il existe pour éviter les conflits.
start=s.find('<style id="traceStylesV155Fix">')
if start>=0:
    end=s.find('</script>',start)
    if end>=0:
        s=s[:start]+s[end+9:]

if 'id="traceScriptV155Fix"' not in s:
    marker='</body>'
    if marker not in s:
        raise SystemExit("ERREUR : </body> introuvable.")
    s=s.replace(marker,extra+'\n'+marker,1)

p.write_text(s,encoding="utf-8")
print("OK : patch visuel correction/suppression installé.")
PY

echo "============================================================"
echo " DEV.155 FIX1 — CONTROLES"
echo "============================================================"

cp "$TRACE" /tmp/EUC_ADMIN_PFMP_TraceV154Fix.js
node --check /tmp/EUC_ADMIN_PFMP_TraceV154Fix.js

grep -q "EUC_ADMIN_TRACE_listerV154Fix" "$TRACE"
grep -q 'id="traceScriptV155Fix"' "$PAGE"
grep -q "trace-correction" "$PAGE"
grep -q "trace-suppression" "$PAGE"
grep -q "CONVENTION CORRIGÉE" "$PAGE"
grep -q "CONVENTION SUPPRIMÉE" "$PAGE"

# Vérifie que la DEV.155 préparée localement est bien là.
test -f "$DETAIL"
test -f "$DETAIL_SERVICE"
grep -q "EUC_SUIVI_CLASSE_afficherV155" "$DETAIL_SERVICE"
grep -q "page === 'suivi-pfmp-classe'" "$ROUTER"

echo "OK : correction = ORANGE."
echo "OK : suppression = ROUGE."
echo "OK : historique / titre / autocomplétion."
echo "OK : DEV.155 tableau détaillé présente localement."

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
echo " DEV.155 FIX1 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ correction orange"
echo "✓ suppression rouge"
echo "✓ historique"
echo "✓ titre"
echo "✓ liste/autocomplétion"
echo "✓ DEV.155 détail classe déployée"
echo "✓ push + version + déploiement principal"
echo "============================================================"
