#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix12-final-qr"

QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX12_${STAMP}"
mkdir -p "$BACKUP"
cp "$QR_PAGE" "$BACKUP/"
cp "$QR_SERVICE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX12 — FONCTIONS OBLIGATOIRES + INFOS ELEVE"
echo "============================================================"

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/PFMP_Acces_QR_V116.html")
s=p.read_text(encoding="utf-8")

m=re.search(r'<script id="EUC_REQUIRED_CONTACTS_FIX11">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : bloc EUC_REQUIRED_CONTACTS_FIX11 introuvable.")

b=m.group(1)
b=b.replace("'responsablePrenom',\n    'responsableTelephone',","'responsablePrenom',\n    'responsableFonction',\n    'responsableTelephone',",1)
b=b.replace("'tuteurPrenom',\n    'tuteurTelephone',","'tuteurPrenom',\n    'tuteurFonction',\n    'tuteurTelephone',",1)
b=b.replace("['responsablePrenom','prénom du responsable'],\n      ['responsableTelephone','téléphone du responsable'],","['responsablePrenom','prénom du responsable'],\n      ['responsableFonction','fonction du responsable'],\n      ['responsableTelephone','téléphone du responsable'],",1)
b=b.replace("['tuteurPrenom','prénom du tuteur'],\n        ['tuteurTelephone','téléphone du tuteur'],","['tuteurPrenom','prénom du tuteur'],\n        ['tuteurFonction','fonction du tuteur'],\n        ['tuteurTelephone','téléphone du tuteur'],",1)
b=b.replace("'responsableNom','responsablePrenom','responsableTelephone','responsableCourriel',\n        'tuteurNom','tuteurPrenom','tuteurTelephone','tuteurCourriel'","'responsableNom','responsablePrenom','responsableFonction','responsableTelephone','responsableCourriel',\n        'tuteurNom','tuteurPrenom','tuteurFonction','tuteurTelephone','tuteurCourriel'",1)

s=s[:m.start(1)]+b+s[m.end(1):]
p.write_text(s,encoding="utf-8")
print("OK 1/4 : fonctions obligatoires côté navigateur.")
PY

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

a=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
b=s.find("\nfunction ",a+10)
blk=s[a:b if b>=0 else len(s)]

if "var respFonction=" not in blk:
    blk=blk.replace(
        "  var respPrenom=txt(d.responsablePrenom,150);\n  var respTelephone=txt(d.responsableTelephone,50);",
        "  var respPrenom=txt(d.responsablePrenom,150);\n  var respFonction=txt(d.responsableFonction,200);\n  var respTelephone=txt(d.responsableTelephone,50);",
        1
    )

blk=blk.replace(
    "if(!respNom||!respPrenom||!respTelephone||!respCourriel){\n    throw new Error('Nom, prénom, téléphone et e-mail du responsable de l’entreprise sont obligatoires.');\n  }",
    "if(!respNom||!respPrenom||!respFonction||!respTelephone||!respCourriel){\n    throw new Error('Nom, prénom, fonction, téléphone et e-mail du responsable de l’entreprise sont obligatoires.');\n  }",
    1
)

if "var tFonction=" not in blk:
    blk=blk.replace(
        "  var tPrenom=tuteurEst?respPrenom:txt(d.tuteurPrenom,150);\n  var tTelephone=tuteurEst?respTelephone:txt(d.tuteurTelephone,50);",
        "  var tPrenom=tuteurEst?respPrenom:txt(d.tuteurPrenom,150);\n  var tFonction=tuteurEst?respFonction:txt(d.tuteurFonction,200);\n  var tTelephone=tuteurEst?respTelephone:txt(d.tuteurTelephone,50);",
        1
    )

blk=blk.replace(
    "if(!tNom||!tPrenom||!tTelephone||!tCourriel){\n    throw new Error('Nom, prénom, téléphone et e-mail du tuteur sont obligatoires.');\n  }",
    "if(!tNom||!tPrenom||!tFonction||!tTelephone||!tCourriel){\n    throw new Error('Nom, prénom, fonction, téléphone et e-mail du tuteur sont obligatoires.');\n  }",
    1
)

blk=blk.replace("Responsable_fonction:txt(d.responsableFonction,200),","Responsable_fonction:respFonction,",1)
blk=blk.replace("Tuteur_fonction:tuteurEst?txt(d.responsableFonction,200):txt(d.tuteurFonction,200),","Tuteur_fonction:tFonction,",1)

s=s[:a]+blk+s[b if b>=0 else len(s):]
p.write_text(s,encoding="utf-8")
print("OK 2/4 : fonctions obligatoires côté serveur.")
PY

cat > /tmp/EUC_FIX12_RETURN.txt <<'EOF'
  var classe=String(a.Classe_convention_nom||'');
  var annee=String(a.Annee_scolaire||'');
  var periode=String(a.Periode_libelle||'');
  var debut=EUC_IMPORT_dateExistanteISO_(a.Date_debut);
  var fin=EUC_IMPORT_dateExistanteISO_(a.Date_fin);

  function dateFr_(iso){
    var p=String(iso||'').split('-');
    return p.length===3 ? [p[2],p[1],p[0]].join('/') : String(iso||'');
  }

  var dates=[dateFr_(debut),dateFr_(fin)].filter(Boolean).join(' au ');

  return {
    ok:true,
    diagnostic:resolved.diag+' - NAISSANCE-OK',
    accessId:a.id,
    reference:a.Reference_convention||'',
    resume:resume,
    continuationUrl:'',
    classe:classe,
    annee:annee,
    periode:periode,
    debut:debut,
    fin:fin,
    dates:dates,
    eleve:{
      nom:el.Nom||'',
      prenom:el.Prenom_usage||el.Prenom||'',
      classe:classe,
      annee:annee,
      periode:periode,
      debut:debut,
      fin:fin,
      dates:dates
    }
  };
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

a=s.find("function EUC_CONVENTION_verifierNaissanceV113_(")
b=s.find("\nfunction EUC_CONVENTION_verifierIdentiteV113",a)
blk=s[a:b]

rs=blk.rfind("  return {")
re=blk.find("\n  };",rs)
if rs<0 or re<0:
    raise SystemExit("ERREUR : return final introuvable dans verifierNaissanceV113_.")
re += len("\n  };")

new=Path("/tmp/EUC_FIX12_RETURN.txt").read_text(encoding="utf-8").rstrip()
blk=blk[:rs]+new+blk[re:]
s=s[:a]+blk+s[b:]
p.write_text(s,encoding="utf-8")

print("OK 3/4 : classe/année/PFMP/dates ajoutées au retour.")
PY

cat > /tmp/EUC_FIX12_VERIFIED.html <<'EOF'
<script id="EUC_VERIFIED_INFO_FIX12">
(function(){
  function t(v){return String(v==null?'':v).trim();}
  function set(id,v){var el=document.getElementById(id);if(el&&t(v))el.textContent=t(v);}
  window.EUC_FIX12_patchVerifiedInfo=function(r){
    if(!r||!r.ok)return;
    var e=r.eleve||{};
    set('name',[e.prenom||'',e.nom||''].filter(Boolean).join(' '));
    set('class',e.classe||r.classe||'');
    set('year',e.annee||r.annee||'');
    var dates=e.dates||r.dates||'';
    var periode=e.periode||r.periode||'';
    set('dates',[periode,dates].filter(Boolean).join(' — ')||dates||periode);
    set('ref',r.reference||'');
  };
})();
</script>
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/PFMP_Acces_QR_V116.html")
s=p.read_text(encoding="utf-8")

s=re.sub(r'\n?<script id="EUC_VERIFIED_INFO_FIX12">.*?</script>\n?','\n',s,flags=re.S)

pat=re.compile(
    r'(\.withSuccessHandler\(function\((\w+)\)\{)(.*?)(\}\)\s*\.withFailureHandler\(.*?\.EUC_CONVENTION_verifierIdentiteV113\()',
    re.S
)
m=pat.search(s)
if not m:
    raise SystemExit("ERREUR : handler succès verifierIdentiteV113 introuvable.")

param=m.group(2)
body=m.group(3)
if "EUC_FIX12_patchVerifiedInfo" not in body:
    body="\n      if(window.EUC_FIX12_patchVerifiedInfo){window.EUC_FIX12_patchVerifiedInfo("+param+");}\n"+body

s=s[:m.start()]+m.group(1)+body+m.group(4)+s[m.end():]

block=Path("/tmp/EUC_FIX12_VERIFIED.html").read_text(encoding="utf-8")
s=s.replace("</body>",block+"\n</body>",1)

p.write_text(s,encoding="utf-8")
print("OK 4/4 : affichage Classe / Année / PFMP corrigé.")
PY

echo "============================================================"
echo " CONTROLES AVANT PUSH"
echo "============================================================"

grep -q "responsableFonction" "$QR_PAGE"
grep -q "tuteurFonction" "$QR_PAGE"
grep -q "fonction du responsable" "$QR_PAGE"
grep -q "fonction du tuteur" "$QR_PAGE"
grep -q "respFonction" "$QR_SERVICE"
grep -q "tFonction" "$QR_SERVICE"
grep -q "dates:dates" "$QR_SERVICE"
grep -q "classe:classe" "$QR_SERVICE"
grep -q "annee:annee" "$QR_SERVICE"
grep -q "EUC_FIX12_patchVerifiedInfo" "$QR_PAGE"

cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX12.js
node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX12.js

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/PFMP_Acces_QR_V116.html").read_text(encoding="utf-8")
for sid in ["EUC_REQUIRED_CONTACTS_FIX11","EUC_VERIFIED_INFO_FIX12","EUC_QR_CONTROLLER_FIX9"]:
    m=re.search(r'<script id="'+sid+r'">(.*?)</script>',s,re.S)
    if not m:
        raise SystemExit("ERREUR : script "+sid+" introuvable.")
    Path("/tmp/"+sid+".js").write_text(m.group(1),encoding="utf-8")
PY

node --check /tmp/EUC_REQUIRED_CONTACTS_FIX11.js
node --check /tmp/EUC_VERIFIED_INFO_FIX12.js
node --check /tmp/EUC_QR_CONTROLLER_FIX9.js

echo "✓ fonction responsable obligatoire"
echo "✓ fonction tuteur obligatoire"
echo "✓ classe/année/PFMP renvoyées"
echo "✓ classe/année/PFMP affichées"
echo "✓ syntaxes valides"

echo "=== PUSH ==="
clasp push -f

echo "=== VERSION ==="
clasp version "$LABEL"

echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.161 FIX12 DEPLOYEE AVEC SUCCES"
echo "============================================================"
