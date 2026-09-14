#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix14-desaffectation-prof"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX14_${STAMP}"
mkdir -p "$BACKUP"

echo "============================================================"
echo " DEV.161 FIX14 — DESAFFECTATION PROFESSEUR"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re, shutil, sys

root=Path("apps-script")

# Localiser la fonction serveur.
candidates=[]
for p in root.glob("*.gs"):
    s=p.read_text(encoding="utf-8",errors="ignore")
    if "function EUC_SUIVI_DESAFFECTER_V162" in s:
        candidates.append(p)

if len(candidates)!=1:
    print("ERREUR : nombre de fichiers contenant EUC_SUIVI_DESAFFECTER_V162 =",len(candidates))
    for p in candidates: print(" -",p)
    sys.exit(1)

server=candidates[0]
print("Serveur :",server)

# Localiser les HTML concernés.
htmls=[]
for p in root.glob("*.html"):
    s=p.read_text(encoding="utf-8",errors="ignore")
    if "EUC_SUIVI_DESAFFECTER_V162" in s or "Retrait en cours" in s:
        htmls.append(p)

if not htmls:
    print("ERREUR : aucun HTML de désaffectation trouvé.")
    sys.exit(1)

print("HTML :",", ".join(str(p) for p in htmls))

# Sauvegarde.
backs=sorted(Path(".").glob("backup_DEV161_avant_FIX14_*"), key=lambda p:p.stat().st_mtime, reverse=True)
if not backs:
    print("ERREUR : dossier backup introuvable.")
    sys.exit(1)
backup=backs[0]
shutil.copy2(server,backup/server.name)
for p in htmls:
    shutil.copy2(p,backup/p.name)

# Remplacer la fonction serveur complète.
s=server.read_text(encoding="utf-8")

new_fn = '''function EUC_SUIVI_DESAFFECTER_V162(payload){
  var ctx=null;
  try{
    if(typeof EUC_V156_admin_==='function')ctx=EUC_V156_admin_();
    else if(typeof EUC_PFMP_contexteAdmin_==='function'){
      var c=EUC_PFMP_contexteAdmin_();
      ctx=c&&c.autorise?c:null;
    }
  }catch(e){ctx=null;}

  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};

  var annee=String(payload.annee||'').trim();
  var classeId=Number(payload.classeId||payload.classe||0);
  var periodeId=Number(payload.periodeId||payload.periode||0);
  var type=String(payload.type||payload.typeSuivi||'').trim().toUpperCase();
  var eleveIds=(payload.eleveIds||payload.eleves||[])
    .map(Number)
    .filter(function(x){return x>0;});

  if(!annee||!(classeId>0)||!(periodeId>0)||
     ['TELEPHONE','VISITE'].indexOf(type)<0||!eleveIds.length){
    throw new Error('Désaffectation incomplète.');
  }

  var table=(typeof EUC_V156_TABLE_!=='undefined'&&EUC_V156_TABLE_)
    ? EUC_V156_TABLE_
    : 'EUC_AFFECTATIONS_SUIVI_PFMP';

  var rows=EUC_IMPORT_lireRecords_(table);
  var wanted={};
  eleveIds.forEach(function(id){wanted[Number(id)]=true;});

  var matches=rows.filter(function(r){
    return r.Actif!==false &&
      String(r.Annee_scolaire||'').trim()===annee &&
      Number(EUC_PFMP_ref_(r.Classe))===classeId &&
      Number(EUC_PFMP_ref_(r.Periode))===periodeId &&
      wanted[Number(EUC_PFMP_ref_(r.Eleve))]===true &&
      String(r.Type_suivi||'').trim().toUpperCase()===type;
  });

  if(!matches.length){
    return {ok:true,count:0,message:'Aucune affectation active à retirer.'};
  }

  var now=new Date().toISOString();
  var records=matches.map(function(r){
    return {
      id:Number(r.id),
      fields:{
        Actif:false,
        Date_modification:now
      }
    };
  });

  EUC_ENT_grist(
    'patch',
    '/tables/'+encodeURIComponent(table)+'/records',
    {records:records}
  );

  return {
    ok:true,
    count:records.length,
    message:records.length+' affectation(s) retirée(s).'
  };
}'''

pat=re.compile(
    r"function EUC_SUIVI_DESAFFECTER_V162\s*\([^)]*\)\s*\{.*?\n\}(?=\nfunction |\Z)",
    re.S
)
s2,n=pat.subn(new_fn,s,count=1)
if n!=1:
    print("ERREUR : remplacement fonction serveur impossible.")
    sys.exit(1)

server.write_text(s2,encoding="utf-8")
print("OK 1/2 : fonction serveur remplacée.")

# Ajouter filet UI.
ui_block = '''
<script id="EUC_FIX14_DESAFFECT_UI">
(function(){
  var watchdog=null;

  function closeModal(){
    document.querySelectorAll('[role="dialog"],.modal,.modal-backdrop,.dialog-backdrop').forEach(function(el){
      var t=String(el.textContent||'');
      if(t.indexOf('Retirer une affectation')>=0 || t.indexOf('Retrait en cours')>=0){
        el.style.display='none';
      }
    });
  }

  document.addEventListener('click',function(ev){
    var b=ev.target&&ev.target.closest?ev.target.closest('button'):null;
    if(!b)return;
    var t=String(b.textContent||'').trim();
    if(t==='Retirer' || t.indexOf('Retrait en cours')>=0){
      clearTimeout(watchdog);
      watchdog=setTimeout(function(){
        document.querySelectorAll('button').forEach(function(x){
          if(String(x.textContent||'').indexOf('Retrait en cours')>=0){
            x.disabled=false;
            x.textContent='Retirer';
          }
        });
      },25000);
    }
  },true);

  window.EUC_FIX14_desaffectSuccess=function(){
    clearTimeout(watchdog);
    closeModal();
    window.location.reload();
  };
})();
</script>
'''

for p in htmls:
    h=p.read_text(encoding="utf-8")
    if "EUC_FIX14_DESAFFECT_UI" not in h and "</body>" in h:
        h=h.replace("</body>",ui_block+"\n</body>",1)
        p.write_text(h,encoding="utf-8")

print("OK 2/2 : filet de sécurité UI ajouté.")
print("BACKUP :",backup)
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

SERVER_FILE="$(grep -rl --include='*.gs' 'function EUC_SUIVI_DESAFFECTER_V162' apps-script | head -1)"
[ -n "$SERVER_FILE" ]

cp "$SERVER_FILE" /tmp/EUC_SUIVI_DESAFFECTER_FIX14.js
node --check /tmp/EUC_SUIVI_DESAFFECTER_FIX14.js

grep -q "Aucune affectation active à retirer" "$SERVER_FILE"
grep -q "Actif:false" "$SERVER_FILE"
grep -q "Date_modification:now" "$SERVER_FILE"

python3 <<'PY'
from pathlib import Path
import re

found=[]
for p in Path("apps-script").glob("*.gs"):
    s=p.read_text(encoding="utf-8",errors="ignore")
    if "function EUC_SUIVI_DESAFFECTER_V162" in s:
        found.append((p,s))

if len(found)!=1:
    raise SystemExit("ERREUR : fonction serveur non unique.")

p,s=found[0]
m=re.search(
    r"function EUC_SUIVI_DESAFFECTER_V162\s*\([^)]*\)\s*\{.*?\n\}(?=\nfunction |\Z)",
    s,re.S
)
if not m:
    raise SystemExit("ERREUR : fonction serveur illisible.")

blk=m.group(0)
for forbidden in [
    "EUC_SUIVI_CLASSE_detail",
    "EUC_V156_assurerTable_()",
    "assurerColonnes",
    "EUC_V161F3_assurer"
]:
    if forbidden in blk:
        raise SystemExit("ERREUR : traitement lourd encore présent : "+forbidden)

print("✓ fonction serveur légère :",p)
PY

echo "✓ désaffectation = un PATCH groupé"
echo "✓ historique conservé via Actif=false"
echo "✓ aucun recalcul complet avant réponse"
echo "✓ syntaxe serveur valide"

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
echo " DEV.161 FIX14 DEPLOYEE AVEC SUCCES"
echo "============================================================"
