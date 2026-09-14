#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix14b-desaffectation-directe"

SERVER="apps-script/EUC_SUIVI_PFMP_FixV161_3.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX14B_${STAMP}"
mkdir -p "$BACKUP"
cp "$SERVER" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX14B — DESAFFECTATION DIRECTE GRIST"
echo "============================================================"

cat > /tmp/EUC_SUIVI_DESAFFECTER_V162_FIX14B.txt <<'EOF'
function EUC_SUIVI_DESAFFECTER_V162(payload){
  var t0=Date.now();

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

  /*
   * IMPORTANT :
   * on ne relit PLUS toute la table EUC_AFFECTATIONS_SUIVI_PFMP.
   * Grist filtre directement sur classe / période / type / élèves.
   */
  var filtre={
    Classe:[classeId],
    Periode:[periodeId],
    Type_suivi:[type],
    Eleve:ids
  };

  var raw=EUC_ENT_grist(
    'get',
    '/tables/EUC_AFFECTATIONS_SUIVI_PFMP/records?filter='+
      encodeURIComponent(JSON.stringify(filtre))
  );

  var rows=(raw.records||[]).map(function(r){
    var o={id:r.id};
    var f=r.fields||{};
    Object.keys(f).forEach(function(k){o[k]=f[k];});
    return o;
  });

  var matches=rows.filter(function(r){
    return r.Actif!==false &&
      EUC_V161F3_txt_(r.Annee_scolaire)===annee &&
      Number(EUC_PFMP_ref_(r.Classe))===classeId &&
      Number(EUC_PFMP_ref_(r.Periode))===periodeId &&
      ids.indexOf(Number(EUC_PFMP_ref_(r.Eleve)))>=0 &&
      EUC_V161F3_txt_(r.Type_suivi).toUpperCase()===type;
  });

  if(!matches.length){
    return {
      ok:true,
      count:0,
      dureeMs:Date.now()-t0,
      message:'Aucune affectation active à retirer.'
    };
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
    dureeMs:Date.now()-t0,
    message:patches.length+' affectation(s) retirée(s).'
  };
}
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_SUIVI_PFMP_FixV161_3.gs")
s=p.read_text(encoding="utf-8")
new_fn=Path("/tmp/EUC_SUIVI_DESAFFECTER_V162_FIX14B.txt").read_text(encoding="utf-8").rstrip()

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

print("OK : fonction désaffectation remplacée.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

cp "$SERVER" /tmp/EUC_SUIVI_PFMP_FixV161_3_FIX14B.js
node --check /tmp/EUC_SUIVI_PFMP_FixV161_3_FIX14B.js

grep -q "records?filter=" "$SERVER"
grep -q "Eleve:ids" "$SERVER"
grep -q "{records:patches}" "$SERVER"
grep -q "dureeMs:Date.now()-t0" "$SERVER"

python3 <<'PY'
from pathlib import Path

s=Path("apps-script/EUC_SUIVI_PFMP_FixV161_3.gs").read_text(encoding="utf-8")
a=s.find("function EUC_SUIVI_DESAFFECTER_V162")
b=s.find("function ",a+10)
blk=s[a:b if b>=0 else len(s)]

checks={
    "aucune lecture table complète": "EUC_IMPORT_lireRecords_('EUC_AFFECTATIONS_SUIVI_PFMP')" not in blk,
    "filtre Grist direct": "records?filter=" in blk,
    "un seul GET ciblé": blk.count("'get'")==1,
    "un seul PATCH": blk.count("'patch'")==1,
    "aucun recalcul detail": "EUC_SUIVI_CLASSE_detailV162" not in blk,
    "historique retrait": all(x in blk for x in ["Date_retrait:now","Retire_par:ctx.email","Motif_retrait:motif"]),
}
for label,ok in checks.items():
    print(("✓ " if ok else "✗ ")+label)
    if not ok:
        raise SystemExit(1)
PY

echo "✓ lecture Grist ciblée"
echo "✓ un seul PATCH groupé"
echo "✓ aucun recalcul"
echo "✓ historique conservé"
echo "✓ durée serveur renvoyée"
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
echo " DEV.161 FIX14B DEPLOYEE AVEC SUCCES"
echo "============================================================"
