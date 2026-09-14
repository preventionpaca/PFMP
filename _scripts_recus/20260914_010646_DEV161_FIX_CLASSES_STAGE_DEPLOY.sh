#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix-classes-1"
PAGE="apps-script/Suivi_PFMP_Classes.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_filtre_classes_${STAMP}"
mkdir -p "$BACKUP"
cp "$PAGE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 — CORRECTION FILTRE CLASSES PFMP / STAGES"
echo "============================================================"

cat > /tmp/EUC_FIX_CLASSES_STAGE_V161.html <<'EOF'
<script id="EUC_FIX_CLASSES_STAGE_V161">
(function(){
  function norm(v){
    return String(v||'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase();
  }

  function isTerminale(txt){
    txt=norm(txt);
    return /\bterminale\b/.test(txt) ||
           /\bterm\b/.test(txt) ||
           /\bt[a-z0-9]/.test(txt);
  }

  function hasDeclaredPeriod(card){
    var txt=norm(card.innerText||card.textContent||'');

    var hasPeriod =
      /\bpfmp\b/.test(txt) ||
      /\bfmp\b/.test(txt) ||
      /\bstage\b/.test(txt) ||
      /\bperiode\b/.test(txt);

    if(!hasPeriod) return false;

    if(isTerminale(txt)){
      var withoutVfmp=txt.replace(/\bvfmp\b/g,' ');
      var hasRealTerminalePeriod =
        /\bpfmp\b/.test(withoutVfmp) ||
        /\bfmp\b/.test(withoutVfmp) ||
        /\bstage\b/.test(withoutVfmp);
      return hasRealTerminalePeriod;
    }

    return true;
  }

  function getCards(){
    var selectors=[
      '[data-classe-id]',
      '.classe-card',
      '.class-card',
      '.classeCard',
      '.classCard',
      '.card-classe'
    ];

    var found=[];
    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        if(found.indexOf(el)<0) found.push(el);
      });
    });

    if(found.length) return found;

    document.querySelectorAll('a[href*="suivi-pfmp-classe"],a[href*="suivi-pfmp-ent-classe"]').forEach(function(a){
      var el=a.closest('article,.card,.classe,.class-item,li,div');
      if(el && found.indexOf(el)<0) found.push(el);
    });

    return found;
  }

  function apply(){
    var cards=getCards();

    cards.forEach(function(card){
      var show=hasDeclaredPeriod(card);
      card.style.display=show?'':'none';
      card.hidden=!show;
    });

    document.querySelectorAll('section,.section,.group,.categorie,.category').forEach(function(sec){
      var localCards=getCards().filter(function(card){return sec.contains(card);});
      if(!localCards.length) return;

      var visible=localCards.some(function(card){
        return !card.hidden && card.style.display!=='none';
      });

      sec.style.display=visible?'':'none';
      sec.hidden=!visible;
    });
  }

  function delayedApply(){
    apply();
    setTimeout(apply,150);
    setTimeout(apply,500);
    setTimeout(apply,1200);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',delayedApply);
  }else{
    delayedApply();
  }

  var obs=new MutationObserver(function(){
    clearTimeout(window.__EUC_FIX_CLASSES_TIMER);
    window.__EUC_FIX_CLASSES_TIMER=setTimeout(apply,80);
  });

  obs.observe(document.documentElement,{childList:true,subtree:true});
})();
</script>
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")
block=Path("/tmp/EUC_FIX_CLASSES_STAGE_V161.html").read_text(encoding="utf-8")

s=re.sub(
    r'\n?<script id="EUC_FIX_CLASSES_STAGE_V161">.*?</script>\n?',
    '\n',
    s,
    flags=re.S
)

if "</body>" not in s:
    raise SystemExit("ERREUR : balise </body> introuvable.")

s=s.replace("</body>",block+"\n</body>",1)
p.write_text(s,encoding="utf-8")
print("OK : filtre final ajouté.")
PY

echo
echo "============================================================"
echo " CONTROLES"
echo "============================================================"

grep -q 'id="EUC_FIX_CLASSES_STAGE_V161"' "$PAGE"
grep -q "withoutVfmp" "$PAGE"

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classes.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_FIX_CLASSES_STAGE_V161">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : bloc JS introuvable.")
Path("/tmp/EUC_FIX_CLASSES_STAGE_V161.js").write_text(m.group(1),encoding="utf-8")
PY

node --check /tmp/EUC_FIX_CLASSES_STAGE_V161.js

echo "✓ syntaxe JS valide"
echo "✓ terminales : VFMP seule exclue"
echo "✓ premières : affichées si PFMP/FMP/stage déclaré"
echo "✓ secondes : affichées si PFMP/FMP/stage déclaré"
echo "✓ CAP : affichés si PFMP/FMP/stage déclaré"
echo "✓ BTS 1re année : affichés si stage déclaré"
echo "✓ BTS 2e année : affichés si stage déclaré"

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
echo " FILTRE CLASSES DEPLOYE AVEC SUCCES"
echo "============================================================"
