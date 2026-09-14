#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix13-suivi-classes-periodes"

SERVICE="apps-script/EUC_SUIVI_PFMP_ClassesV154.gs"
LIST_PAGE="apps-script/Suivi_PFMP_Classes.html"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX13_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$LIST_PAGE" "$DETAIL_PAGE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX13 — CLASSES PFMP + DATES DES PERIODES"
echo "============================================================"

# ============================================================
# 1) BACKEND : n'afficher que les classes qui ont AU MOINS
#    une période déclarée, avec ordre Terminale > Première >
#    Seconde > BTS1 > BTS2 > CAP.
# ============================================================

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_SUIVI_PFMP_ClassesV154.gs")
s=p.read_text(encoding="utf-8")

old="""  cards.sort(function(a,b){
    if(a.categorie!==b.categorie)return a.categorie.localeCompare(b.categorie,'fr');
    return a.classe.localeCompare(b.classe,'fr');
  });"""

new="""  // DEV.161 FIX13 — ne garder que les classes qui ont réellement
  // une période PFMP / stage déclarée dans Planning_Periodes.
  cards=cards.filter(function(c){
    return c && Array.isArray(c.periodes) && c.periodes.length>0;
  });

  function EUC_V161F13_norm_(v){
    return String(v||'')
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g,'')
      .toUpperCase()
      .trim();
  }

  function EUC_V161F13_catRank_(c){
    var cat=EUC_V161F13_norm_(c.categorie);
    if(cat.indexOf('BAC')>=0)return 0;
    if(cat.indexOf('BTS')>=0)return 1;
    if(cat.indexOf('CAP')>=0)return 2;
    return 9;
  }

  function EUC_V161F13_levelRank_(c){
    var n=EUC_V161F13_norm_(c.classe);

    // BAC PRO : Terminales, puis Premières, puis Secondes.
    if(EUC_V161F13_catRank_(c)===0){
      if(/^T/.test(n)||n.indexOf('TERMINALE')>=0)return 0;
      if(/^1/.test(n)||n.indexOf('PREMIERE')>=0)return 1;
      if(/^2/.test(n)||n.indexOf('SECONDE')>=0)return 2;
      return 3;
    }

    // BTS : premières années, puis deuxièmes années.
    if(EUC_V161F13_catRank_(c)===1){
      if(/^1/.test(n)||/1\\s*BTS/.test(n)||/BTS\\s*1/.test(n))return 0;
      if(/^2/.test(n)||/2\\s*BTS/.test(n)||/BTS\\s*2/.test(n))return 1;
      return 2;
    }

    // CAP : 1re année puis 2e/terminale CAP.
    if(EUC_V161F13_catRank_(c)===2){
      if(/^1/.test(n)||/1\\s*CAP/.test(n))return 0;
      if(/^2/.test(n)||/^T/.test(n)||/2\\s*CAP/.test(n))return 1;
      return 2;
    }

    return 9;
  }

  cards.sort(function(a,b){
    var ca=EUC_V161F13_catRank_(a),cb=EUC_V161F13_catRank_(b);
    if(ca!==cb)return ca-cb;

    var la=EUC_V161F13_levelRank_(a),lb=EUC_V161F13_levelRank_(b);
    if(la!==lb)return la-lb;

    return String(a.classe||'').localeCompare(String(b.classe||''),'fr');
  });"""

if old not in s:
    if "EUC_V161F13_catRank_" in s:
        print("INFO : tri FIX13 déjà présent.")
    else:
        raise SystemExit("ERREUR : bloc de tri V154 attendu introuvable.")
else:
    s=s.replace(old,new,1)

p.write_text(s,encoding="utf-8")
print("OK 1/3 : filtrage et ordre des classes corrigés.")
PY

# ============================================================
# 2) LISTE : supprimer les anciens filtres client qui avaient
#    masqué Premières / Secondes / BTS / CAP.
# ============================================================

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")

# Supprimer uniquement les anciens correctifs de filtrage ajoutés
# pendant les FIX précédents.
ids=[
    "EUC_FIX_CLASSES_STAGE_V161",
    "EUC_CLASSES_FIX5_SCRIPT",
    "EUC_CLASSES_FIX6_SCRIPT",
    "EUC_CLASSES_FIX6A_SCRIPT"
]

for sid in ids:
    s=re.sub(
        r'\\n?<script[^>]*id=["\\']'+re.escape(sid)+r'["\\'][^>]*>.*?</script>\\n?',
        '\\n',
        s,
        flags=re.S|re.I
    )

# Repli ciblé : retirer un ancien script maison fondé sur
# hasDeclaredPeriod/getCards s'il existe encore.
for block in re.findall(r'<script\\b[^>]*>.*?</script>',s,flags=re.S|re.I):
    if "hasDeclaredPeriod" in block and "getCards" in block:
        s=s.replace(block,'')

p.write_text(s,encoding="utf-8")
print("OK 2/3 : anciens filtres client supprimés.")
PY

# ============================================================
# 3) DETAIL : afficher sous CHAQUE bouton de période ses dates
#    début/fin, sans toucher au spinner déjà fonctionnel.
# ============================================================

cat > /tmp/EUC_PERIOD_DATES_FIX13.html <<'EOF'
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
    var m=/^(\\d{4})-(\\d{2})-(\\d{2})/.exec(s);
    return m ? m[3]+'/'+m[2]+'/'+m[1] : s;
  }

  function periodId(p){
    return String(
      p && (
        p.id!==undefined ? p.id :
        p.periodeId!==undefined ? p.periodeId :
        p.Periode!==undefined ? p.Periode : ''
      )
    );
  }

  function addDates(){
    if(typeof detail==='undefined' || !detail)return;

    var periods=detail.periodes||detail.periodesDisponibles||detail.periods||[];
    if(!Array.isArray(periods))return;

    var by={};
    periods.forEach(function(p){
      by[periodId(p)]=p;
    });

    document.querySelectorAll('[data-p]').forEach(function(btn){
      var p=by[String(btn.dataset.p||'')];
      if(!p)return;

      var debut=p.debut||p.dateDebut||p.Date_debut||'';
      var fin=p.fin||p.dateFin||p.Date_fin||'';
      var text=[fr(debut),fr(fin)].filter(Boolean).join(' au ');
      if(!text)return;

      var old=btn.querySelector('.euc-period-date');
      if(old)old.remove();

      var small=document.createElement('span');
      small.className='euc-period-date';
      small.textContent=text;
      btn.appendChild(small);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      addDates();
      setTimeout(addDates,150);
    });
  }else{
    addDates();
    setTimeout(addDates,150);
  }
})();
</script>
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")
block=Path("/tmp/EUC_PERIOD_DATES_FIX13.html").read_text(encoding="utf-8")

s=re.sub(
    r'\\n?<style id="EUC_PERIOD_DATES_FIX13_STYLE">.*?</style>\\s*'
    r'<script id="EUC_PERIOD_DATES_FIX13">.*?</script>\\n?',
    '\\n',
    s,
    flags=re.S|re.I
)

if "</body>" not in s:
    raise SystemExit("ERREUR : </body> introuvable dans le détail classe.")

s=s.replace("</body>",block+"\\n</body>",1)
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

cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_ClassesV154_FIX13.js
node --check /tmp/EUC_SUIVI_PFMP_ClassesV154_FIX13.js

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_PERIOD_DATES_FIX13">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : JS dates périodes introuvable.")
Path("/tmp/EUC_PERIOD_DATES_FIX13.js").write_text(m.group(1),encoding="utf-8")
PY

node --check /tmp/EUC_PERIOD_DATES_FIX13.js

echo "✓ Terminales / Premières / Secondes ordonnées"
echo "✓ BTS 1re / 2e année affichés uniquement avec période déclarée"
echo "✓ CAP affichés uniquement avec période déclarée"
echo "✓ anciens filtres masquant les cartes supprimés"
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
echo " DEV.161 FIX13 DEPLOYEE AVEC SUCCES"
echo "============================================================"
