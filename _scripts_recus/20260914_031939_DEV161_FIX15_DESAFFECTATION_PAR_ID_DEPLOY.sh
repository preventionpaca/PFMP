#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix15-desaffectation-par-id"

V156="apps-script/EUC_SUIVI_PFMP_V156.gs"
SERVER="apps-script/EUC_SUIVI_PFMP_FixV161_3.gs"
HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX15_${STAMP}"
mkdir -p "$BACKUP"
for f in "$V156" "$SERVER" "$HTML"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX15 — DESAFFECTATION DIRECTE PAR ID"
echo "============================================================"

# 1) Exposer les IDs d'affectation dans le détail classe.
python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_SUIVI_PFMP_V156.gs")
s=p.read_text(encoding="utf-8")

old="""    x.professeurTelephone=tel?EUC_V156_txt_(tel.Nom_professeur_snapshot):'';
    x.professeurVisiteur=vis?EUC_V156_txt_(vis.Nom_professeur_snapshot):'';
    return x;"""

new="""    x.professeurTelephone=tel?EUC_V156_txt_(tel.Nom_professeur_snapshot):'';
    x.professeurVisiteur=vis?EUC_V156_txt_(vis.Nom_professeur_snapshot):'';
    x.affectationTelephoneId=tel?Number(tel.id)||0:0;
    x.affectationVisiteId=vis?Number(vis.id)||0:0;
    return x;"""

if old not in s:
    if "affectationTelephoneId" in s and "affectationVisiteId" in s:
        print("INFO : IDs d'affectation déjà exposés.")
    else:
        raise SystemExit("ERREUR : bloc detailV161 attendu introuvable.")

if old in s:
    s=s.replace(old,new,1)

p.write_text(s,encoding="utf-8")
print("OK 1/3 : IDs d'affectation exposés dans detail.lignes.")
PY

# 2) Remplacer la fonction serveur : aucun GET, PATCH direct par IDs.
cat > /tmp/EUC_SUIVI_DESAFFECTER_V162_FIX15.txt <<'EOF'
function EUC_SUIVI_DESAFFECTER_V162(payload){
  var t0=Date.now();

  var ctx=EUC_V156_admin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};

  var type=EUC_V161F3_txt_(payload.type).toUpperCase();
  var motif=EUC_V161F3_txt_(payload.motif)||'Désaffectation administrative';
  var affectationIds=(payload.affectationIds||[])
    .map(Number)
    .filter(function(x){return x>0;});

  if(['TELEPHONE','VISITE'].indexOf(type)<0){
    throw new Error('Type de suivi invalide.');
  }

  if(!affectationIds.length){
    return {
      ok:true,
      count:0,
      dureeMs:Date.now()-t0,
      message:'Aucune affectation active à retirer.'
    };
  }

  var now=new Date().toISOString();
  var patches=affectationIds.map(function(id){
    return {
      id:id,
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
new_fn=Path("/tmp/EUC_SUIVI_DESAFFECTER_V162_FIX15.txt").read_text(encoding="utf-8").rstrip()

needle="function EUC_SUIVI_DESAFFECTER_V162"
start=s.find(needle)
if start<0: raise SystemExit("ERREUR : fonction serveur introuvable.")

brace=s.find("{",start)
i=brace; depth=0; quote=None; esc=False; line=False; block=False; end=None
while i<len(s):
    ch=s[i]; nxt=s[i+1] if i+1<len(s) else ''
    if line:
        if ch=="\n": line=False
        i+=1; continue
    if block:
        if ch=="*" and nxt=="/": block=False; i+=2; continue
        i+=1; continue
    if quote:
        if esc: esc=False
        elif ch=="\\": esc=True
        elif ch==quote: quote=None
        i+=1; continue
    if ch=="/" and nxt=="/": line=True; i+=2; continue
    if ch=="/" and nxt=="*": block=True; i+=2; continue
    if ch in ("'",'"','`'): quote=ch; i+=1; continue
    if ch=="{": depth+=1
    elif ch=="}":
        depth-=1
        if depth==0:
            end=i+1
            break
    i+=1

if end is None: raise SystemExit("ERREUR : fin fonction serveur introuvable.")

s=s[:start]+new_fn+s[end:]
p.write_text(s,encoding="utf-8")
print("OK 2/3 : serveur = PATCH direct par IDs, aucun GET.")
PY

# 3) Frontend : calculer les IDs d'affectation depuis detail.lignes.
cat > /tmp/EUC_DESAFFECT_CALL_FIX15_OLD.txt <<'EOF'
        .EUC_SUIVI_DESAFFECTER_V162({
          annee:detail.annee,
          classeId:detail.classe.id,
          periodeId:detail.periode.id,
          type:pendingType,
          eleveIds:ids(),
          motif:'Retrait depuis le tableau de suivi'
        });
EOF

cat > /tmp/EUC_DESAFFECT_CALL_FIX15_NEW.txt <<'EOF'
        .EUC_SUIVI_DESAFFECTER_V162((function(){
          var selected=ids();
          var selectedMap={};
          selected.forEach(function(id){selectedMap[Number(id)]=true;});

          var affectationIds=(detail.lignes||[])
            .filter(function(x){return selectedMap[Number(x.eleveId)]===true;})
            .map(function(x){
              return pendingType==='TELEPHONE'
                ? Number(x.affectationTelephoneId||0)
                : Number(x.affectationVisiteId||0);
            })
            .filter(function(id){return id>0;});

          return {
            annee:detail.annee,
            classeId:detail.classe.id,
            periodeId:detail.periode.id,
            type:pendingType,
            eleveIds:selected,
            affectationIds:affectationIds,
            motif:'Retrait depuis le tableau de suivi'
          };
        })());
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")
old=Path("/tmp/EUC_DESAFFECT_CALL_FIX15_OLD.txt").read_text(encoding="utf-8").rstrip("\n")
new=Path("/tmp/EUC_DESAFFECT_CALL_FIX15_NEW.txt").read_text(encoding="utf-8").rstrip("\n")

if old not in s:
    # Accepter aussi l'ancienne forme compacte pré-FIX14A.
    old2=""".EUC_SUIVI_DESAFFECTER_V162({annee:detail.annee,classeId:detail.classe.id,periodeId:detail.periode.id,type:pendingType,eleveIds:ids(),motif:'Retrait depuis le tableau de suivi'});"""
    if old2 in s:
        s=s.replace(old2,new.strip(),1)
    elif "affectationIds:affectationIds" in s:
        print("INFO : appel frontend FIX15 déjà présent.")
    else:
        raise SystemExit("ERREUR : appel frontend désaffectation introuvable.")
else:
    s=s.replace(old,new,1)

p.write_text(s,encoding="utf-8")
print("OK 3/3 : frontend envoie les IDs exacts d'affectation.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

grep -q "affectationTelephoneId" "$V156"
grep -q "affectationVisiteId" "$V156"
grep -q "affectationIds" "$SERVER"
grep -q "affectationIds:affectationIds" "$HTML"

# La fonction serveur ne doit plus faire AUCUNE lecture.
python3 <<'PY'
from pathlib import Path

s=Path("apps-script/EUC_SUIVI_PFMP_FixV161_3.gs").read_text(encoding="utf-8")
a=s.find("function EUC_SUIVI_DESAFFECTER_V162")
b=s.find("function ",a+10)
blk=s[a:b if b>=0 else len(s)]

for forbidden in [
    "EUC_IMPORT_lireRecords_",
    "'get'",
    "EUC_SUIVI_CLASSE_detail",
    "assurerRetraitCols",
]:
    if forbidden in blk:
        raise SystemExit("ERREUR : appel interdit encore présent : "+forbidden)

if blk.count("EUC_ENT_grist(")!=1:
    raise SystemExit("ERREUR : nombre de grist() attendu = 1.")

print("✓ serveur : zéro lecture, un seul PATCH")
PY

cp "$V156" /tmp/EUC_SUIVI_PFMP_V156_FIX15.js
cp "$SERVER" /tmp/EUC_SUIVI_PFMP_FixV161_3_FIX15.js
node --check /tmp/EUC_SUIVI_PFMP_V156_FIX15.js
node --check /tmp/EUC_SUIVI_PFMP_FixV161_3_FIX15.js

echo "✓ IDs d'affectation disponibles côté page"
echo "✓ aucun GET serveur"
echo "✓ un seul PATCH groupé"
echo "✓ contexte admin standard EUC_V156_admin_"
echo "✓ historique conservé"
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
echo " DEV.161 FIX15 DEPLOYEE AVEC SUCCES"
echo "============================================================"
