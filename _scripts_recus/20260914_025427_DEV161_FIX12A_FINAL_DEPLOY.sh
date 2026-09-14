#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix12a-final"

QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX12A_${STAMP}"
mkdir -p "$BACKUP"

cp "$QR_PAGE" "$BACKUP/"
cp "$QR_SERVICE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX12A — FINALISATION SANS PATCHER LE HANDLER"
echo "============================================================"

# ------------------------------------------------------------
# 1) Vérifier / compléter les fonctions obligatoires déjà appliquées
# ------------------------------------------------------------
python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/PFMP_Acces_QR_V116.html")
s=p.read_text(encoding="utf-8")

m=re.search(r'<script id="EUC_REQUIRED_CONTACTS_FIX11">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : bloc EUC_REQUIRED_CONTACTS_FIX11 introuvable.")

b=m.group(1)

def ensure_once(old,new):
    global b
    if new in b:
        return
    if old not in b:
        raise SystemExit("ERREUR : motif frontend introuvable : "+old[:60])
    b=b.replace(old,new,1)

ensure_once(
    "'responsablePrenom',\n    'responsableTelephone',",
    "'responsablePrenom',\n    'responsableFonction',\n    'responsableTelephone',"
)
ensure_once(
    "'tuteurPrenom',\n    'tuteurTelephone',",
    "'tuteurPrenom',\n    'tuteurFonction',\n    'tuteurTelephone',"
)
ensure_once(
    "['responsablePrenom','prénom du responsable'],\n      ['responsableTelephone','téléphone du responsable'],",
    "['responsablePrenom','prénom du responsable'],\n      ['responsableFonction','fonction du responsable'],\n      ['responsableTelephone','téléphone du responsable'],"
)
ensure_once(
    "['tuteurPrenom','prénom du tuteur'],\n        ['tuteurTelephone','téléphone du tuteur'],",
    "['tuteurPrenom','prénom du tuteur'],\n        ['tuteurFonction','fonction du tuteur'],\n        ['tuteurTelephone','téléphone du tuteur'],"
)
ensure_once(
    "'responsableNom','responsablePrenom','responsableTelephone','responsableCourriel',\n        'tuteurNom','tuteurPrenom','tuteurTelephone','tuteurCourriel'",
    "'responsableNom','responsablePrenom','responsableFonction','responsableTelephone','responsableCourriel',\n        'tuteurNom','tuteurPrenom','tuteurFonction','tuteurTelephone','tuteurCourriel'"
)

s=s[:m.start(1)]+b+s[m.end(1):]
p.write_text(s,encoding="utf-8")
print("OK 1/3 : Fonction responsable + Fonction tuteur obligatoires côté formulaire.")
PY

# ------------------------------------------------------------
# 2) Vérifier / compléter validation serveur
# ------------------------------------------------------------
python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

a=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
if a<0:
    raise SystemExit("ERREUR : fonction enregistrerEntrepriseV117 introuvable.")
b=s.find("\nfunction ",a+10)
if b<0:b=len(s)
blk=s[a:b]

if "var respFonction=" not in blk:
    marker="  var respPrenom=txt(d.responsablePrenom,150);\n"
    if marker not in blk:
        raise SystemExit("ERREUR : point insertion respFonction introuvable.")
    blk=blk.replace(marker,marker+"  var respFonction=txt(d.responsableFonction,200);\n",1)

blk=blk.replace(
    "if(!respNom||!respPrenom||!respTelephone||!respCourriel){",
    "if(!respNom||!respPrenom||!respFonction||!respTelephone||!respCourriel){",
    1
)
blk=blk.replace(
    "Nom, prénom, téléphone et e-mail du responsable de l’entreprise sont obligatoires.",
    "Nom, prénom, fonction, téléphone et e-mail du responsable de l’entreprise sont obligatoires.",
    1
)

if "var tFonction=" not in blk:
    marker="  var tPrenom=tuteurEst?respPrenom:txt(d.tuteurPrenom,150);\n"
    if marker not in blk:
        raise SystemExit("ERREUR : point insertion tFonction introuvable.")
    blk=blk.replace(marker,marker+"  var tFonction=tuteurEst?respFonction:txt(d.tuteurFonction,200);\n",1)

blk=blk.replace(
    "if(!tNom||!tPrenom||!tTelephone||!tCourriel){",
    "if(!tNom||!tPrenom||!tFonction||!tTelephone||!tCourriel){",
    1
)
blk=blk.replace(
    "Nom, prénom, téléphone et e-mail du tuteur sont obligatoires.",
    "Nom, prénom, fonction, téléphone et e-mail du tuteur sont obligatoires.",
    1
)

blk=blk.replace(
    "Responsable_fonction:txt(d.responsableFonction,200),",
    "Responsable_fonction:respFonction,",
    1
)
blk=blk.replace(
    "Tuteur_fonction:tuteurEst?txt(d.responsableFonction,200):txt(d.tuteurFonction,200),",
    "Tuteur_fonction:tFonction,",
    1
)

s=s[:a]+blk+s[b:]
p.write_text(s,encoding="utf-8")
print("OK 2/3 : fonctions obligatoires côté serveur.")
PY

# ------------------------------------------------------------
# 3) Retour de vérification : fournir TOUS les alias probables
#    pour l'ancien frontend sans toucher à son handler.
# ------------------------------------------------------------
cat > /tmp/EUC_FIX12A_RETURN.txt <<'EOF'
  var classe=String(a.Classe_convention_nom||'');
  var annee=String(a.Annee_scolaire||'');
  var periode=String(a.Periode_libelle||'');
  var debut=EUC_IMPORT_dateExistanteISO_(a.Date_debut);
  var fin=EUC_IMPORT_dateExistanteISO_(a.Date_fin);

  function dateFr_(iso){
    var p=String(iso||'').split('-');
    return p.length===3 ? [p[2],p[1],p[0]].join('/') : String(iso||'');
  }

  var debutFr=dateFr_(debut);
  var finFr=dateFr_(fin);
  var dates=[debutFr,finFr].filter(Boolean).join(' au ');
  var pfmp=[periode,dates].filter(Boolean).join(' — ');

  return {
    ok:true,
    diagnostic:resolved.diag+' - NAISSANCE-OK',
    accessId:a.id,
    reference:a.Reference_convention||'',
    resume:resume,
    continuationUrl:'',

    classe:classe,
    classeConvention:classe,
    className:classe,

    annee:annee,
    anneeScolaire:annee,
    year:annee,

    periode:periode,
    periodeLibelle:periode,
    pfmp:pfmp,

    debut:debut,
    fin:fin,
    dateDebut:debut,
    dateFin:fin,
    debutFr:debutFr,
    finFr:finFr,
    dates:dates,

    eleve:{
      nom:el.Nom||'',
      prenom:el.Prenom_usage||el.Prenom||'',
      classe:classe,
      classeConvention:classe,
      annee:annee,
      anneeScolaire:annee,
      periode:periode,
      periodeLibelle:periode,
      pfmp:pfmp,
      debut:debut,
      fin:fin,
      dateDebut:debut,
      dateFin:fin,
      debutFr:debutFr,
      finFr:finFr,
      dates:dates
    }
  };
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

a=s.find("function EUC_CONVENTION_verifierNaissanceV113_(")
if a<0:
    raise SystemExit("ERREUR : verifierNaissanceV113_ introuvable.")
b=s.find("\nfunction EUC_CONVENTION_verifierIdentiteV113",a)
if b<0:
    raise SystemExit("ERREUR : fin verifierNaissanceV113_ introuvable.")
blk=s[a:b]

# Si FIX12 avait déjà enrichi le retour, on remplace proprement depuis var classe.
start=blk.find("  var classe=String(a.Classe_convention_nom||'');")
if start<0:
    start=blk.rfind("  return {")

if start<0:
    raise SystemExit("ERREUR : point de remplacement du retour introuvable.")

# Trouver le dernier return/fin de fonction avant le prochain function.
new=Path("/tmp/EUC_FIX12A_RETURN.txt").read_text(encoding="utf-8").rstrip()

# On conserve tout avant start et on termine avec le nouveau bloc.
# Le bloc original verifierNaissance se termine par } ; le prochain function est hors blk.
prefix=blk[:start]
# enlever l'accolade finale éventuelle afin de la reconstruire une seule fois
prefix=prefix.rstrip()
if prefix.endswith("}"):
    # seulement si on est tombé après un ancien return complet, ce qui ne devrait pas arriver
    pass

blk=prefix+"\n"+new+"\n}"
s=s[:a]+blk+s[b:]
p.write_text(s,encoding="utf-8")
print("OK 3/3 : classe / année / PFMP / dates exposées sous tous les alias utiles.")
PY

echo
echo "============================================================"
echo " VALIDATION COMPLETE AVANT PUSH"
echo "============================================================"

# Contrôles métier
grep -q "fonction du responsable" "$QR_PAGE"
grep -q "fonction du tuteur" "$QR_PAGE"
grep -q "respFonction" "$QR_SERVICE"
grep -q "tFonction" "$QR_SERVICE"
grep -q "classeConvention:classe" "$QR_SERVICE"
grep -q "anneeScolaire:annee" "$QR_SERVICE"
grep -q "periodeLibelle:periode" "$QR_SERVICE"
grep -q "pfmp:pfmp" "$QR_SERVICE"

# Syntaxe serveur
cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX12A.js
node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX12A.js

# Syntaxe du bloc frontend obligatoire
python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/PFMP_Acces_QR_V116.html").read_text(encoding="utf-8")
for sid in ["EUC_REQUIRED_CONTACTS_FIX11","EUC_QR_CONTROLLER_FIX9"]:
    m=re.search(r'<script id="'+sid+r'">(.*?)</script>',s,re.S)
    if not m:
        raise SystemExit("ERREUR : script "+sid+" introuvable.")
    Path("/tmp/"+sid+"_FIX12A.js").write_text(m.group(1),encoding="utf-8")
PY

node --check /tmp/EUC_REQUIRED_CONTACTS_FIX11_FIX12A.js
node --check /tmp/EUC_QR_CONTROLLER_FIX9_FIX12A.js

echo "✓ Fonction responsable obligatoire"
echo "✓ Fonction tuteur obligatoire"
echo "✓ Classe exposée"
echo "✓ Année exposée"
echo "✓ PFMP + dates exposées"
echo "✓ Syntaxes valides"

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
echo " DEV.161 FIX12A DEPLOYEE AVEC SUCCES"
echo "============================================================"
