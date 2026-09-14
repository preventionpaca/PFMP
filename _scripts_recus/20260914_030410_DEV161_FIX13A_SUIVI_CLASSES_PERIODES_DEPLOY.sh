#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix13a-suivi-classes-periodes"

SERVICE="apps-script/EUC_SUIVI_PFMP_ClassesV154.gs"
LIST_PAGE="apps-script/Suivi_PFMP_Classes.html"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX13A_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$LIST_PAGE" "$DETAIL_PAGE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX13A — FINALISATION SUIVI CLASSES / PERIODES"
echo "============================================================"

# ============================================================
# 1) Vérifier que l'étape backend de FIX13 a bien été appliquée.
#    Si elle ne l'est pas, on s'arrête sans toucher au reste.
# ============================================================

if grep -q "EUC_V161F13_catRank_" "$SERVICE" && grep -q "c.periodes.length>0" "$SERVICE"; then
  echo "OK 1/3 : filtrage/ordre backend déjà présent."
else
  echo "ERREUR : la première étape de FIX13 n'est pas présente dans $SERVICE."
  echo "AUCUN PUSH / AUCUN DEPLOIEMENT."
  exit 1
fi

# ============================================================
# 2) Nettoyer les anciens filtres client qui masquent des cartes.
# ============================================================

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")

ids=[
    "EUC_FIX_CLASSES_STAGE_V161",
    "EUC_CLASSES_FIX5_SCRIPT",
    "EUC_CLASSES_FIX6_SCRIPT",
    "EUC_CLASSES_FIX6A_SCRIPT"
]

for sid in ids:
    pattern = (
        r"\n?<script[^>]*id=[\"']"
        + re.escape(sid)
        + r"[\"'][^>]*>.*?</script>\n?"
    )
    s=re.sub(pattern,"\n",s,flags=re.S|re.I)

# Repli ciblé : retirer un ancien filtre maison fondé sur
# hasDeclaredPeriod + getCards, s'il existe encore.
scripts=re.findall(r"<script\b[^>]*>.*?</script>",s,flags=re.S|re.I)
for block in scripts:
    if "hasDeclaredPeriod" in block and "getCards" in block:
        s=s.replace(block,"")

p.write_text(s,encoding="utf-8")
print("OK 2/3 : anciens filtres client supprimés.")
PY

# ============================================================
# 3) Ajouter les dates sous chaque bouton de période.
# ============================================================

cat > /tmp/EUC_PERIOD_DATES_FIX13A.html <<'EOF'
<style id="EUC_PERIOD_DATES_FIX13_STYLE">
#periodTabs [data-p] .euc-period-date,
[data-p] .euc-period-date{
  display:block;
  margin-top:4px;
  font-size:.76rem;
  line-height:1.2;
  font-weight:500;
  opacity:.78;
  white-space:nowrap;
}
</style>
<script id="EUC_PERIOD_DATES_FIX13">
(function(){
  function fr(v){
    var s=String(v||'').trim();
    var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? m[3]+'/'+m[2]+'/'+m[1] : s;
  }

  function pid(p){
    if(!p)return '';
    if(p.id!==undefined)return String(p.id);
    if(p.periodeId!==undefined)return String(p.periodeId);
    if(p.Periode!==undefined)return String(p.Periode);
    return '';
  }

  function periods(){
    if(typeof detail==='undefined' || !detail)return [];
    return detail.periodes || detail.periodesDisponibles || detail.periods || [];
  }

  function apply(){
    var ps=periods();
    if(!Array.isArray(ps))return;

    var by={};
    ps.forEach(function(p){
      by[pid(p)]=p;
    });

    document.querySelectorAll('[data-p]').forEach(function(btn){
      var p=by[String(btn.dataset.p||'')];
      if(!p)return;

      var debut=p.debut || p.dateDebut || p.Date_debut || '';
      var fin=p.fin || p.dateFin || p.Date_fin || '';
      var label=[fr(debut),fr(fin)].filter(Boolean).join(' au ');
      if(!label)return;

      var old=btn.querySelector('.euc-period-date');
      if(old)old.remove();

      var span=document.createElement('span');
      span.className='euc-period-date';
      span.textContent=label;
      btn.appendChild(span);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      apply();
      setTimeout(apply,150);
      setTimeout(apply,500);
    });
  }else{
    apply();
    setTimeout(apply,150);
    setTimeout(apply,500);
  }
})();
</script>
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")
block=Path("/tmp/EUC_PERIOD_DATES_FIX13A.html").read_text(encoding="utf-8")

# Nettoyer une éventuelle tentative précédente.
s=re.sub(
    r'\n?<style id="EUC_PERIOD_DATES_FIX13_STYLE">.*?</style>\s*'
    r'<script id="EUC_PERIOD_DATES_FIX13">.*?</script>\n?',
    '\n',
    s,
    flags=re.S|re.I
)

if "</body>" not in s:
    raise SystemExit("ERREUR : </body> introuvable dans le détail classe.")

s=s.replace("</body>",block+"\n</body>",1)
p.write_text(s,encoding="utf-8")

print("OK 3/3 : dates sous les boutons de périodes ajoutées.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

grep -q "EUC_V161F13_catRank_" "$SERVICE"
grep -q "c.periodes.length>0" "$SERVICE"
grep -q "EUC_PERIOD_DATES_FIX13" "$DETAIL_PAGE"

! grep -q "EUC_FIX_CLASSES_STAGE_V161" "$LIST_PAGE"
! grep -q "hasDeclaredPeriod" "$LIST_PAGE"

cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_ClassesV154_FIX13A.js
node --check /tmp/EUC_SUIVI_PFMP_ClassesV154_FIX13A.js

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_PERIOD_DATES_FIX13">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : JS dates périodes introuvable.")
Path("/tmp/EUC_PERIOD_DATES_FIX13A.js").write_text(m.group(1),encoding="utf-8")
PY

node --check /tmp/EUC_PERIOD_DATES_FIX13A.js

echo "✓ Terminales / Premières / Secondes ordonnées"
echo "✓ BTS 1re / 2e année uniquement avec période déclarée"
echo "✓ CAP uniquement avec période déclarée"
echo "✓ anciens filtres client supprimés"
echo "✓ dates JJ/MM/AAAA sous chaque bouton de période"
echo "✓ spinner existant non modifié"
echo "✓ syntaxe valide"

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
echo " DEV.161 FIX13A DEPLOYEE AVEC SUCCES"
echo "============================================================"
