#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix19-nettoyage-direct"

HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
FIX18="apps-script/EUC_SUIVI_PFMP_FixV161_18.gs"
ROUTER="apps-script/EDT.js"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX19_${STAMP}"
mkdir -p "$BACKUP"
cp "$HTML" "$BACKUP/"
cp "$FIX18" "$BACKUP/"
cp "$ROUTER" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX19 — NETTOYAGE DIRECT DU RENDU REEL"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

# ============================================================
# A) SERVEUR : injecter les dates DIRECTEMENT dans detail.periodes
# ============================================================
p=Path("apps-script/EUC_SUIVI_PFMP_FixV161_18.gs")
s=p.read_text(encoding="utf-8")

needle="  d.periodeDatesById=mapDates;"
insert="""  d.periodeDatesById=mapDates;

  // FIX19 : enrichir directement les objets réellement utilisés par renderTabs().
  if(Array.isArray(d.periodes)){
    d.periodes.forEach(function(p){
      var src=mapDates[String(Number(p.id||p.periodeId||p.Periode)||0)];
      if(!src)return;
      p.debut=src.debut||'';
      p.fin=src.fin||'';
      p.dateDebut=p.debut;
      p.dateFin=p.fin;
    });
  }"""

if "FIX19 : enrichir directement" not in s:
    if needle not in s:
        raise SystemExit("ERREUR : point d'injection des dates introuvable dans FIX18.")
    s=s.replace(needle,insert,1)

p.write_text(s,encoding="utf-8")
print("OK A : dates injectées dans detail.periodes.")
PY

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

# ============================================================
# B) SUPPRIMER LES SURCOUCHES QUI SE MARCHENT DESSUS
# ============================================================
pairs=[
    ("EUC_PERIOD_DATES_FIX13_STYLE","EUC_PERIOD_DATES_FIX13"),
    ("EUC_FIX18_UI_STYLE","EUC_FIX18_UI_SCRIPT"),
]
for style_id,script_id in pairs:
    s=re.sub(
        r'\n?<style id="'+re.escape(style_id)+r'">.*?</style>\s*'
        r'<script id="'+re.escape(script_id)+r'">.*?</script>\n?',
        '\n',
        s,
        flags=re.S
    )

# ============================================================
# C) AJOUTER UN FORMATTEUR DE DATE DANS LE RENDU D'ORIGINE
# ============================================================
old="""  function esc(v){const d=document.createElement('div');d.textContent=v==null?'':v;return d.innerHTML}
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')}"""

new="""  function esc(v){const d=document.createElement('div');d.textContent=v==null?'':v;return d.innerHTML}
  function fmtPfmpDate(v){const m=String(v||'').trim().match(/^(\\d{4})-(\\d{2})-(\\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(v||'').trim()}
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')}"""

if "function fmtPfmpDate" not in s:
    if old not in s:
        raise SystemExit("ERREUR : fonctions utilitaires d'origine introuvables.")
    s=s.replace(old,new,1)

# ============================================================
# D) MODIFIER renderTabs() A LA SOURCE
# ============================================================
old_tabs="""  function renderTabs(){
    periodTabs.innerHTML=(detail.periodes||[]).map(function(p){const active=detail.periode&&Number(detail.periode.id)===Number(p.id);return '<button class="tab'+(active?' active':'')+'" data-p="'+p.id+'">'+esc(p.libelle)+'</button>'}).join('');
    Array.from(periodTabs.querySelectorAll('[data-p]')).forEach(function(btn){btn.onclick=function(){window.location.href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(detail.annee)+'&classe='+encodeURIComponent(detail.classe.id)+'&periode='+encodeURIComponent(btn.dataset.p)}});
  }"""

new_tabs="""  function renderTabs(){
    periodTabs.innerHTML=(detail.periodes||[]).map(function(p){
      const active=detail.periode&&Number(detail.periode.id)===Number(p.id);
      const debut=fmtPfmpDate(p.debut||p.dateDebut||p.Date_debut||'');
      const fin=fmtPfmpDate(p.fin||p.dateFin||p.Date_fin||'');
      const dates=(debut||fin)?'<span class="euc-period-dates">'+esc([debut,fin].filter(Boolean).join(' → '))+'</span>':'';
      return '<button class="tab'+(active?' active':'')+'" data-p="'+p.id+'">'+esc(p.libelle)+dates+'</button>';
    }).join('');
    Array.from(periodTabs.querySelectorAll('[data-p]')).forEach(function(btn){btn.onclick=function(){window.location.href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(detail.annee)+'&classe='+encodeURIComponent(detail.classe.id)+'&periode='+encodeURIComponent(btn.dataset.p)}});
  }"""

if old_tabs not in s:
    raise SystemExit("ERREUR : renderTabs() réel introuvable.")
s=s.replace(old_tabs,new_tabs,1)

# ============================================================
# E) RETIRER LE NUMERO DE CONVENTION DIRECTEMENT DU RENDU
# ============================================================
old_hist="""      return '<div><b>'+esc(v.type)+'</b>'+(v.numero?' — '+esc(v.numero):'')+(v.entreprise?' — '+esc(v.entreprise):'')+(v.raison?'<br><span>'+esc(v.raison)+'</span>':'')+'</div>';"""
new_hist="""      return '<div><b>'+esc(v.type)+'</b>'+(v.entreprise?' — '+esc(v.entreprise):'')+(v.raison?'<br><span>'+esc(v.raison)+'</span>':'')+'</div>';"""

if old_hist in s:
    s=s.replace(old_hist,new_hist,1)

old_row="""      return '<tr><td>'+check+'</td><td><div class="student">'+esc(x.nom)+' '+esc(x.prenom)+'</div><div class="small">'+esc(x.classe)+'</div></td><td>'+statusPill(x)+historyNoteV161(x)+(x.numero?'<div class="small">'+esc(x.numero)+'</div>':'')+'</td><td>'+val(x.entreprise)+'</td><td>'+val(x.adresseEntreprise)+'</td><td>'+val(x.contactEntreprise)+'</td><td>'+val(x.professeurPrincipal)+'</td><td>'+val(x.professeurTelephone)+'</td><td>'+val(x.professeurVisiteur)+'</td></tr>';"""
new_row="""      return '<tr><td>'+check+'</td><td><div class="student">'+esc(x.nom)+' '+esc(x.prenom)+'</div><div class="small">'+esc(x.classe)+'</div></td><td>'+statusPill(x)+historyNoteV161(x)+'</td><td>'+val(x.entreprise)+'</td><td>'+val(x.adresseEntreprise)+'</td><td>'+val(x.contactEntreprise)+'</td><td>'+val(x.professeurPrincipal)+'</td><td>'+val(x.professeurTelephone)+'</td><td>'+val(x.professeurVisiteur)+'</td></tr>';"""

if old_row not in s:
    raise SystemExit("ERREUR : ligne réelle du tableau introuvable.")
s=s.replace(old_row,new_row,1)

# ============================================================
# F) RETRAIT : UTILISER LE HANDLER D'ORIGINE QUI POSSEDE pendingType
#    et appeler directement la fonction F18.
# ============================================================
old_call=""".EUC_SUIVI_DESAFFECTER_V162({
          affectationIds:affectationIds
        });"""
new_call=""".EUC_SUIVI_DESAFFECTER_F18({
          affectationIds:affectationIds
        });"""

if old_call not in s and new_call not in s:
    raise SystemExit("ERREUR : appel réel de désaffectation introuvable.")
s=s.replace(old_call,new_call,1)

p.write_text(s,encoding="utf-8")
print("OK B-F : rendu réel modifié, overlays supprimés, retrait raccordé.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

# Vérifier la route réelle.
grep -q "EUC_SUIVI_CLASSE_afficherF18" "$ROUTER"

# Vérifier que les rustines problématiques sont parties.
! grep -q "EUC_FIX18_UI_SCRIPT" "$HTML"
! grep -q "EUC_PERIOD_DATES_FIX13" "$HTML"

# Vérifier les modifications DIRECTES.
grep -q "function fmtPfmpDate" "$HTML"
grep -q "euc-period-dates" "$HTML"
grep -q "EUC_SUIVI_DESAFFECTER_F18" "$HTML"
! grep -q "x.numero?'<div class=\"small\"'" "$HTML"
! grep -q "v.numero?' — '" "$HTML"

# Vérifier que les dates sont bien injectées dans detail.periodes.
grep -q "FIX19 : enrichir directement" "$FIX18"
grep -q "p.debut=src.debut" "$FIX18"

# Syntaxe serveur / route.
cp "$FIX18" /tmp/FIX18_FIX19_CHECK.js
cp "$ROUTER" /tmp/EDT_FIX19_CHECK.js
node --check /tmp/FIX18_FIX19_CHECK.js
node --check /tmp/EDT_FIX19_CHECK.js

# Vérifier les scripts inline rendus après substitution des tags Apps Script.
python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")

# Neutraliser les expressions de template Apps Script uniquement pour le check JS.
s=s.replace("<?!= config ?>","{}")
s=s.replace("<?!= anneeContextJson ?>","{}")
s=s.replace("<?!= detailJson ?>","{}")

scripts=re.findall(r"<script\\b([^>]*)>(.*?)</script>",s,re.S|re.I)
out=Path("/tmp/fix19_inline")
out.mkdir(exist_ok=True)
n=0
for attrs,code in scripts:
    if "src=" in attrs.lower():
        continue
    n+=1
    (out/f"inline_{n:02d}.js").write_text(code,encoding="utf-8")
print(n)
PY

for f in /tmp/fix19_inline/*.js; do
  node --check "$f"
done

echo "✓ rendu des dates modifié à la source"
echo "✓ numéro de convention supprimé à la source"
echo "✓ retrait branché dans le handler qui possède pendingType"
echo "✓ overlays FIX13/FIX18 supprimés"
echo "✓ syntaxe serveur + tous scripts inline valide"

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
VERSION_OUTPUT="$(clasp version "$LABEL")"
echo "$VERSION_OUTPUT"
VERSION="$(printf '%s\n' "$VERSION_OUTPUT" | grep -oE '[0-9]+' | tail -1)"
[ -n "$VERSION" ] || { echo "ERREUR : numéro de version introuvable."; exit 1; }

echo
echo "=== MISE A JOUR DU DEPLOIEMENT PRINCIPAL ==="
# Syntaxe clasp v3 : deploymentId en argument, version/description en options.
clasp redeploy "$DEPLOYMENT_ID" -V "$VERSION" -d "$LABEL"

echo
echo "=== VERIFICATION ==="
LINE="$(clasp deployments | grep "$DEPLOYMENT_ID" || true)"
echo "$LINE"

printf '%s\n' "$LINE" | grep -q "@$VERSION" || {
  echo "ERREUR : le déploiement principal ne pointe pas vers @$VERSION."
  exit 1
}

echo
echo "============================================================"
echo " DEV.161 FIX19 DEPLOYE SUR LE MEME ID — VERSION @$VERSION"
echo "============================================================"
