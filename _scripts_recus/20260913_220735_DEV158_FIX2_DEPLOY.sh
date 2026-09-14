#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.158-fix2"

ROUTER="apps-script/EDT.js"
ADMIN_HOME="apps-script/Admin_PFMP.html"
SERVICE="apps-script/EUC_SUIVI_PFMP_DestinatairesV158.gs"
PAGE="apps-script/Destinataires_Envois_PFMP_V158.html"
PARAM_PAGE="apps-script/Parametres_Envois_PFMP_V157.html"
V157_SERVICE="apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV158_avant_FIX2_${STAMP}"
mkdir -p "$BACKUP"

for f in "$ROUTER" "$ADMIN_HOME" "$SERVICE" "$PAGE" "$PARAM_PAGE" "$V157_SERVICE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.158 FIX2 — FINALISATION COMPLETE"
echo "============================================================"

python3 <<'PY'
from pathlib import Path

# ------------------------------------------------------------
# 1) Brancher les envois V157 sur la table centrale V158
# ------------------------------------------------------------
p=Path("apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs")
s=p.read_text(encoding="utf-8")

if "cc:EUC_V158_ccMails_()," not in s:
    if "cc:EUC_V157_ccMails_()," not in s:
        raise SystemExit("ERREUR : point de branchement CC introuvable dans EUC_SUIVI_PFMP_EnvoisV157.gs")
    s=s.replace(
        "cc:EUC_V157_ccMails_(),",
        "cc:EUC_V158_ccMails_(),",
        1
    )

p.write_text(s,encoding="utf-8")
print("OK 1/3 : envois V157 branchés sur la table centrale V158.")

# ------------------------------------------------------------
# 2) Garantir la route V158
# ------------------------------------------------------------
p=Path("apps-script/EDT.js")
s=p.read_text(encoding="utf-8")

# Nettoyage d'éventuels restes littéraux
s=s.replace(
    "if (page === 'destinataires-envois-pfmp') return EUC_V158_afficher(e);\\n  ",
    ""
)
s=s.replace(
    "if(page === 'destinataires-envois-pfmp') return EUC_V158_afficher(e);\\n  ",
    ""
)

if "destinataires-envois-pfmp" not in s:
    marker="if (page === 'parametres-envois-pfmp')"
    pos=s.find(marker)
    if pos < 0:
        marker="if(page === 'parametres-envois-pfmp')"
        pos=s.find(marker)

    if pos < 0:
        raise SystemExit("ERREUR : route parametres-envois-pfmp introuvable dans EDT.js")

    route="if (page === 'destinataires-envois-pfmp') return EUC_V158_afficher(e);\n  "
    s=s[:pos]+route+s[pos:]

p.write_text(s,encoding="utf-8")
print("OK 2/3 : route Destinataires & envois présente.")

# ------------------------------------------------------------
# 3) Ajouter la vignette Admin PFMP si elle manque
# ------------------------------------------------------------
p=Path("apps-script/Admin_PFMP.html")
s=p.read_text(encoding="utf-8")

if "destinataires-envois-pfmp" not in s:
    snippet = """
<style id="destV158Style">
.euc-v158-tile{
  display:block;
  text-decoration:none;
  color:inherit;
  background:#fff;
  border:1px solid #d9e1ec;
  border-radius:16px;
  padding:18px;
  margin:16px 0;
  box-shadow:0 2px 8px rgba(16,24,40,.05);
  transition:.15s ease
}
.euc-v158-tile:hover{
  transform:translateY(-1px);
  box-shadow:0 8px 20px rgba(16,24,40,.10)
}
.euc-v158-title{
  font-weight:800;
  font-size:18px;
  color:#163a63;
  margin-bottom:6px
}
.euc-v158-sub{
  color:#667085;
  font-size:13px
}
</style>

<script id="destV158Script">
(function(){
  function addV158Tile(){
    if(document.getElementById('destV158Tile')) return;

    var a=document.createElement('a');
    a.id='destV158Tile';
    a.className='euc-v158-tile';
    a.href=location.href.split('?')[0]+'?page=destinataires-envois-pfmp';
    a.innerHTML=
      '<div class="euc-v158-title">✉ Destinataires & envois</div>'+
      '<div class="euc-v158-sub">Gérer les personnes, leurs emails et les documents qu’elles doivent recevoir.</div>';

    var host=
      document.querySelector('.tiles') ||
      document.querySelector('.cards') ||
      document.querySelector('.grid') ||
      document.querySelector('.menu-grid') ||
      document.querySelector('.actions-grid') ||
      document.querySelector('main') ||
      document.querySelector('.container') ||
      document.body;

    host.appendChild(a);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',addV158Tile);
  }else{
    addV158Tile();
  }
})();
</script>
"""

    if "</body>" not in s:
        raise SystemExit("ERREUR : balise </body> absente de Admin_PFMP.html")

    s=s.replace("</body>",snippet+"\n</body>",1)

p.write_text(s,encoding="utf-8")
print("OK 3/3 : vignette Admin PFMP présente.")
PY

echo
echo "============================================================"
echo " DEV.158 FIX2 — CONTROLES EXPLICITES"
echo "============================================================"

check() {
  local label="$1"
  shift
  if "$@"; then
    echo "✓ $label"
  else
    echo "✗ ECHEC : $label"
    exit 1
  fi
}

check "service V158 présent" grep -q "EUC_DESTINATAIRES_ENVOIS_PFMP" "$SERVICE"
check "colonne TABLEAUX_SUIVI présente" grep -q "TABLEAUX_SUIVI" "$SERVICE"
check "V157 utilise EUC_V158_ccMails_" grep -q "EUC_V158_ccMails_" "$V157_SERVICE"
check "route destinataires-envois-pfmp présente" grep -q "destinataires-envois-pfmp" "$ROUTER"
check "vignette Admin PFMP présente" grep -q "destV158Tile" "$ADMIN_HOME"
check "spinner page destinataires présent" grep -q "Enregistrement en cours" "$PAGE"
check "spinner paramètres mail présent" grep -q "Enregistrement en cours" "$PARAM_PAGE"

echo
echo "=== CONTROLES DE SYNTAXE ==="

cp "$ROUTER" /tmp/EDT_DEV158_FIX2.js
cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_DestinatairesV158_FIX2.js
cp "$V157_SERVICE" /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV158_FIX2.js

node --check /tmp/EDT_DEV158_FIX2.js
node --check /tmp/EUC_SUIVI_PFMP_DestinatairesV158_FIX2.js
node --check /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV158_FIX2.js

if grep -n "destinataires-envois-pfmp.*\\\\n" "$ROUTER"; then
  echo "ERREUR : un littéral \\\\n subsiste dans EDT.js"
  exit 1
fi

echo "✓ syntaxe serveur valide"
echo "✓ aucun littéral \\\\n parasite dans la route"

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
echo " DEV.158 FIX2 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ table centrale Destinataires & envois"
echo "✓ droits Tableaux de suivi PFMP"
echo "✓ envois V157 branchés sur V158"
echo "✓ vignette Admin PFMP"
echo "✓ spinners Enregistrement en cours..."
echo "✓ push + version + déploiement principal"
echo "============================================================"
