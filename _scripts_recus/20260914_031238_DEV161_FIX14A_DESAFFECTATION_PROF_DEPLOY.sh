#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix14a-desaffectation-prof"

SERVER="apps-script/EUC_SUIVI_PFMP_FixV161_3.gs"
HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX14A_${STAMP}"
mkdir -p "$BACKUP"
cp "$SERVER" "$BACKUP/"
cp "$HTML" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX14A — DESAFFECTATION PROFESSEUR"
echo "============================================================"

cat > /tmp/EUC_SUIVI_DESAFFECTER_V162_FIX14A.txt <<'EOF'
function EUC_SUIVI_DESAFFECTER_V162(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};

  var annee=EUC_V161F3_txt_(payload.annee);
  var classeId=Number(payload.classeId);
  var periodeId=Number(payload.periodeId);
  var type=EUC_V161F3_txt_(payload.type).toUpperCase();
  var ids=(payload.eleveIds||[])
    .map(Number)
    .filter(function(x){return x>0;});
  var motif=EUC_V161F3_txt_(payload.motif)||'Désaffectation administrative';

  if(['TELEPHONE','VISITE'].indexOf(type)<0){
    throw new Error('Type de suivi invalide.');
  }
  if(!annee||!classeId||!periodeId||!ids.length){
    throw new Error('Désaffectation incomplète.');
  }

  var rows=EUC_IMPORT_lireRecords_('EUC_AFFECTATIONS_SUIVI_PFMP');
  var wanted={};
  ids.forEach(function(id){wanted[id]=true;});

  var matches=rows.filter(function(r){
    if(r.Actif===false)return false;
    if(EUC_V161F3_txt_(r.Annee_scolaire)!==annee)return false;
    if(Number(EUC_PFMP_ref_(r.Classe))!==classeId)return false;
    if(Number(EUC_PFMP_ref_(r.Periode))!==periodeId)return false;
    if(!wanted[Number(EUC_PFMP_ref_(r.Eleve))])return false;
    if(EUC_V161F3_txt_(r.Type_suivi).toUpperCase()!==type)return false;
    return true;
  });

  if(!matches.length){
    return {ok:true,count:0,message:'Aucune affectation active à retirer.'};
  }

  var now=new Date().toISOString();
  var patches=matches.map(function(r){
    return {
      id:Number(r.id),
      fields:{
        Actif:false,
        Date_retrait:now,
        Retire_par:ctx.email||'',
        Motif_retrait:motif,
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
new_fn=Path("/tmp/EUC_SUIVI_DESAFFECTER_V162_FIX14A.txt").read_text(encoding="utf-8").rstrip()

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
        if ch=="\n":
            line_comment=False
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
    if ch in ("'", '"', '`'):
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
print("OK 1/2 : fonction serveur remplacée.")
PY

cat > /tmp/EUC_DESAFFECT_HTML_OLD.txt <<'EOF'
google.script.run.withSuccessHandler(function(r){confirm.disabled=false;confirm.innerHTML=old;modal.classList.remove('show');pendingType=null;detail=r.detail;showStatus('Affectation retirée.','ok');render();})
        .withFailureHandler(function(e){confirm.disabled=false;confirm.innerHTML=old;modal.classList.remove('show');showStatus('Erreur : '+(e&&e.message||e),'err');})
        .EUC_SUIVI_DESAFFECTER_V162({annee:detail.annee,classeId:detail.classe.id,periodeId:detail.periode.id,type:pendingType,eleveIds:ids(),motif:'Retrait depuis le tableau de suivi'});
EOF

cat > /tmp/EUC_DESAFFECT_HTML_NEW.txt <<'EOF'
google.script.run.withSuccessHandler(function(r){
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
          annee:detail.annee,
          classeId:detail.classe.id,
          periodeId:detail.periode.id,
          type:pendingType,
          eleveIds:ids(),
          motif:'Retrait depuis le tableau de suivi'
        });
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")
old=Path("/tmp/EUC_DESAFFECT_HTML_OLD.txt").read_text(encoding="utf-8").rstrip("\n")
new=Path("/tmp/EUC_DESAFFECT_HTML_NEW.txt").read_text(encoding="utf-8").rstrip("\n")

if old not in s:
    raise SystemExit("ERREUR : bloc HTML exact introuvable.")

s=s.replace(old,new,1)
p.write_text(s,encoding="utf-8")
print("OK 2/2 : handler HTML remplacé.")
PY

echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

cp "$SERVER" /tmp/EUC_SUIVI_PFMP_FixV161_3_FIX14A.js
node --check /tmp/EUC_SUIVI_PFMP_FixV161_3_FIX14A.js

grep -q "var patches=matches.map" "$SERVER"
grep -q "{records:patches}" "$SERVER"
grep -q "Date_retrait:now" "$SERVER"
grep -q "Retire_par:ctx.email" "$SERVER"
grep -q "Motif_retrait:motif" "$SERVER"
! grep -q "detail:EUC_SUIVI_CLASSE_detailV162" "$SERVER"
! grep -q "EUC_V161F3_assurerRetraitCols_();" "$SERVER"

grep -q "window.location.reload" "$HTML"
! grep -q "detail=r.detail;showStatus('Affectation retirée.','ok');render();" "$HTML"

python3 <<'PY'
from pathlib import Path

s=Path("apps-script/EUC_SUIVI_PFMP_FixV161_3.gs").read_text(encoding="utf-8")
a=s.find("function EUC_SUIVI_DESAFFECTER_V162")
b=s.find("function ",a+10)
blk=s[a:b if b>=0 else len(s)]

checks={
    "un seul PATCH Grist": blk.count("EUC_ENT_grist(")==1,
    "aucun recalcul detail": "EUC_SUIVI_CLASSE_detailV162" not in blk,
    "aucun assurerRetraitCols": "assurerRetraitCols" not in blk,
    "Date_retrait conservee": "Date_retrait:now" in blk,
    "Retire_par conserve": "Retire_par:ctx.email" in blk,
    "Motif_retrait conserve": "Motif_retrait:motif" in blk,
}
for label,ok in checks.items():
    print(("✓ " if ok else "✗ ")+label)
    if not ok:
        raise SystemExit(1)
PY

echo "✓ serveur léger"
echo "✓ historique conservé"
echo "✓ réponse immédiate après PATCH"
echo "✓ page rechargée après succès"
echo "✓ syntaxe valide"

echo "=== PUSH ==="
clasp push -f

echo "=== VERSION ==="
clasp version "$LABEL"

echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.161 FIX14A DEPLOYEE AVEC SUCCES"
echo "============================================================"
