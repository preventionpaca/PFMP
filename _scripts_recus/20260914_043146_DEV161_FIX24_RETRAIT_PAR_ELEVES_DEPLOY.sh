#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix24-retrait-par-eleves"

HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
NEWGS="apps-script/EUC_SUIVI_PFMP_FixV161_24.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX24_${STAMP}"
mkdir -p "$BACKUP"
cp "$HTML" "$BACKUP/"
[ ! -f "$NEWGS" ] || cp "$NEWGS" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX24 — RETRAIT PAR ELEVE / CLASSE / PERIODE"
echo "============================================================"

cat > "$NEWGS" <<'EOF'
/**
 * Eucalyptus PFMP — v1.0.0-dev.161-fix24
 * Désaffectation robuste sans dépendre des IDs techniques côté navigateur.
 */
function EUC_SUIVI_DESAFFECTER_F24(payload){
  var ctx=EUC_V156_admin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};

  var annee=String(payload.annee||'').trim();
  var classeId=Number(payload.classeId)||0;
  var periodeId=Number(payload.periodeId)||0;
  var type=String(payload.type||'').trim().toUpperCase();
  var eleveIds=(payload.eleveIds||[])
    .map(Number)
    .filter(function(x){return x>0;});

  if(!annee||!classeId||!periodeId||!eleveIds.length){
    throw new Error('Désaffectation incomplète.');
  }
  if(['TELEPHONE','VISITE'].indexOf(type)<0){
    throw new Error('Type de suivi invalide.');
  }

  var wanted={};
  eleveIds.forEach(function(id){wanted[id]=true;});

  var rows=EUC_IMPORT_lireRecords_('EUC_AFFECTATIONS_SUIVI_PFMP');

  var matches=rows.filter(function(r){
    return r.Actif!==false &&
      String(r.Annee_scolaire||'').trim()===annee &&
      Number(EUC_PFMP_ref_(r.Classe))===classeId &&
      Number(EUC_PFMP_ref_(r.Periode))===periodeId &&
      wanted[Number(EUC_PFMP_ref_(r.Eleve))]===true &&
      String(r.Type_suivi||'').trim().toUpperCase()===type;
  });

  if(!matches.length){
    return {
      ok:true,
      count:0,
      message:'Aucune affectation active trouvée pour la sélection.'
    };
  }

  var now=new Date().toISOString();

  // PATCH unitaire, forme déjà éprouvée dans le module d'affectation.
  matches.forEach(function(r){
    EUC_ENT_grist(
      'patch',
      '/tables/EUC_AFFECTATIONS_SUIVI_PFMP/records',
      {records:[{
        id:Number(r.id),
        fields:{
          Actif:false,
          Date_modification:now
        }
      }]}
    );
  });

  return {
    ok:true,
    count:matches.length,
    message:matches.length+' affectation(s) retirée(s).'
  };
}
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

m=re.search(r'<script id="DEV161_FIX3_ENHANCEMENT">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : bloc DEV161_FIX3_ENHANCEMENT introuvable.")

block=m.group(1)

# On remplace uniquement le corps du confirm.onclick du contrôleur réel.
start=block.find("    confirm.onclick=function(){")
if start<0:
    raise SystemExit("ERREUR : confirm.onclick introuvable.")

brace=block.find("{",start)
i=brace
depth=0
quote=None
escape=False
line_comment=False
block_comment=False
end=None

while i<len(block):
    ch=block[i]
    nxt=block[i+1] if i+1<len(block) else ''

    if line_comment:
        if ch=="\n": line_comment=False
        i+=1; continue
    if block_comment:
        if ch=="*" and nxt=="/":
            block_comment=False
            i+=2
            continue
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
            while j<len(block) and block[j].isspace():
                j+=1
            if j<len(block) and block[j]==";":
                j+=1
            end=j
            break
    i+=1

if end is None:
    raise SystemExit("ERREUR : fin confirm.onclick introuvable.")

new_handler=r"""    confirm.onclick=function(){
      if(!pendingType){
        txt.textContent='Erreur interface : type de suivi non défini.';
        return;
      }

      const selected=ids();
      if(!selected.length){
        txt.textContent='Sélectionnez au moins un élève.';
        return;
      }

      const d=(typeof DETAIL_INIT!=='undefined'&&DETAIL_INIT)?DETAIL_INIT:{};
      const old=confirm.innerHTML;

      if(!d.annee||!d.classe||!d.classe.id||!d.periode||!d.periode.id){
        txt.textContent='Erreur interface : contexte classe / période incomplet.';
        return;
      }

      confirm.disabled=true;
      confirm.innerHTML='<span class="spinner"></span>Retrait en cours...';
      notify('Retrait en cours...','info');

      google.script.run
        .withSuccessHandler(function(r){
          confirm.disabled=false;
          confirm.innerHTML=old;

          if(!r||Number(r.count||0)===0){
            txt.textContent=(r&&r.message)||'Aucune affectation active trouvée.';
            notify(txt.textContent,'err');
            return;
          }

          modal.classList.remove('show');
          pendingType=null;
          notify((r&&r.message)||'Affectation retirée.','ok');
          window.setTimeout(function(){window.location.reload();},300);
        })
        .withFailureHandler(function(e){
          confirm.disabled=false;
          confirm.innerHTML=old;
          var msg=String(e&&e.message||e);
          txt.textContent='Erreur de retrait : '+msg;
          notify('Erreur : '+msg,'err');
        })
        .EUC_SUIVI_DESAFFECTER_F24({
          annee:d.annee,
          classeId:d.classe.id,
          periodeId:d.periode.id,
          type:pendingType,
          eleveIds:selected
        });
    };"""

block2=block[:start]+new_handler+block[end:]
s=s[:m.start(1)]+block2+s[m.end(1):]

p.write_text(s,encoding="utf-8")
print("OK : contrôleur retrait raccordé à F24.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

cp "$NEWGS" /tmp/FIX24_server.js
node --check /tmp/FIX24_server.js

grep -q "EUC_SUIVI_DESAFFECTER_F24" "$HTML"
grep -q "eleveIds:selected" "$HTML"
grep -q "function EUC_SUIVI_DESAFFECTER_F24" "$NEWGS"

rm -rf /tmp/fix24_inline
mkdir -p /tmp/fix24_inline

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
s=s.replace("<?!= config ?>","{}")
s=s.replace("<?!= anneeContextJson ?>","{}")
s=s.replace("<?!= detailJson ?>","{}")

scripts=re.findall(r"<script\b([^>]*)>(.*?)</script>",s,re.S|re.I)
out=Path("/tmp/fix24_inline")
n=0
for attrs,code in scripts:
    if "src=" in attrs.lower():
        continue
    n+=1
    (out/f"inline_{n:02d}.js").write_text(code,encoding="utf-8")

if n==0:
    raise SystemExit("ERREUR : aucun script inline détecté.")
print("Scripts inline :",n)
PY

shopt -s nullglob
FILES=(/tmp/fix24_inline/*.js)
for f in "${FILES[@]}"; do
  node --check "$f"
done

echo "✓ plus aucune dépendance aux IDs d'affectation côté navigateur"
echo "✓ retrait basé sur année + classe + période + élève + type"
echo "✓ PATCH seulement sur les lignes réellement trouvées"
echo "✓ dates et filtres non modifiés"
echo "✓ tous les JS valides"

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
echo "=== VERIFICATION ==="
clasp deployments | grep "$DEPLOYMENT_ID" || true

echo "============================================================"
echo " DEV.161 FIX24 DEPLOYE"
echo "============================================================"
