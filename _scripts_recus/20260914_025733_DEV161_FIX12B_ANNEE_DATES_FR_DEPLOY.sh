#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix12b-annee-dates-fr"

QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX12B_${STAMP}"
mkdir -p "$BACKUP"
cp "$QR_SERVICE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX12B — ANNEE SCOLAIRE + DATES FRANCAISES"
echo "============================================================"

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

old="""  var classe=String(a.Classe_convention_nom||'');
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
  var pfmp=[periode,dates].filter(Boolean).join(' — ');"""

new="""  var classe=String(a.Classe_convention_nom||'').trim();
  var periode=String(a.Periode_libelle||'').trim();
  var debutISO=EUC_IMPORT_dateExistanteISO_(a.Date_debut);
  var finISO=EUC_IMPORT_dateExistanteISO_(a.Date_fin);

  function dateFr_(iso){
    var p=String(iso||'').split('-');
    return p.length===3 ? [p[2],p[1],p[0]].join('/') : String(iso||'');
  }

  function anneeScolaire_(valeur,dateIso){
    var direct=String(valeur||'').trim();

    // Si la valeur contient déjà 2026-2027 ou 2026/2027, on la normalise.
    var m=direct.match(/(20\\d{2})\\D+(20\\d{2})/);
    if(m)return m[1]+'-'+m[2];

    // Si une seule année est fournie.
    m=direct.match(/^(20\\d{2})$/);
    if(m){
      var y0=Number(m[1]);
      return y0+'-'+(y0+1);
    }

    // Sinon on déduit l'année scolaire depuis la date de début de PFMP.
    var p=String(dateIso||'').split('-');
    if(p.length===3){
      var y=Number(p[0]), mo=Number(p[1]);
      if(y && mo){
        var debutAnnee=mo>=9 ? y : y-1;
        return debutAnnee+'-'+(debutAnnee+1);
      }
    }

    return direct;
  }

  var debutFr=dateFr_(debutISO);
  var finFr=dateFr_(finISO);
  var annee=anneeScolaire_(a.Annee_scolaire,debutISO);
  var dates=[debutFr,finFr].filter(Boolean).join(' au ');
  var pfmp=[periode,dates].filter(Boolean).join(' — ');"""

if old not in blk:
    raise SystemExit("ERREUR : bloc date/année FIX12A introuvable.")

blk=blk.replace(old,new,1)

# Remplacer les aliases debut/fin pour que l'ancien frontend reçoive directement du FR.
blk=blk.replace("    debut:debut,\n    fin:fin,", "    debut:debutFr,\n    fin:finFr,\n    debutISO:debutISO,\n    finISO:finISO,", 1)
blk=blk.replace("    dateDebut:debut,\n    dateFin:fin,", "    dateDebut:debutFr,\n    dateFin:finFr,", 1)

blk=blk.replace("      debut:debut,\n      fin:fin,", "      debut:debutFr,\n      fin:finFr,\n      debutISO:debutISO,\n      finISO:finISO,", 1)
blk=blk.replace("      dateDebut:debut,\n      dateFin:fin,", "      dateDebut:debutFr,\n      dateFin:finFr,", 1)

s=s[:a]+blk+s[b:]
p.write_text(s,encoding="utf-8")

print("OK : année scolaire calculée + dates françaises exposées.")
PY

echo "============================================================"
echo " CONTROLES AVANT PUSH"
echo "============================================================"

grep -q "function anneeScolaire_" "$QR_SERVICE"
grep -q "debut:debutFr" "$QR_SERVICE"
grep -q "fin:finFr" "$QR_SERVICE"
grep -q "debutISO:debutISO" "$QR_SERVICE"
grep -q "anneeScolaire:annee" "$QR_SERVICE"

cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX12B.js
node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX12B.js

echo "✓ année scolaire disponible"
echo "✓ dates au format JJ/MM/AAAA"
echo "✓ ISO conservé séparément pour sécurité"
echo "✓ syntaxe valide"

echo "=== PUSH ==="
clasp push -f

echo "=== VERSION ==="
clasp version "$LABEL"

echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.161 FIX12B DEPLOYEE AVEC SUCCES"
echo "============================================================"
