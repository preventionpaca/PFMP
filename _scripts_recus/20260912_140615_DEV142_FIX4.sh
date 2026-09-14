#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV142_FIX3_avant_FIX4_${STAMP}"
mkdir -p "$BACKUP"

FILE="apps-script/EUC_CONVENTION_PFMP_NotificationsV142.gs"

if [ ! -f "$FILE" ]; then
  echo "ERREUR : fichier introuvable : $FILE"
  exit 1
fi

cp "$FILE" "$BACKUP/"

python3 <<'PY'
from pathlib import Path

p = Path("apps-script/EUC_CONVENTION_PFMP_NotificationsV142.gs")
s = p.read_text(encoding="utf-8")

old = "var dossier=DIAGNOSTIC_DEV141_DOSSIER(accesId);"

new = r"""var brut=DIAGNOSTIC_DEV141_DOSSIER(accesId);

  var anneeTxt=String(acces.Annee_scolaire||'').trim();
  var anneeDebut=(anneeTxt.match(/20\d{2}/)||['PFMP'])[0];

  var dossier={
    version:'v1.0.0-dev.142-fix4',
    accesId:Number(acces.id),
    numeroEnregistrement:
      brut.numeroEnregistrement ||
      brut.numero ||
      ('PFMP-'+anneeDebut+'-'+String(Number(acces.id||0)).padStart(6,'0')),

    eleve:brut.eleve||{},

    classe:brut.classe||{},

    periode:brut.periode||{
      debut:EUC_IMPORT_dateExistanteISO_(acces.Date_debut),
      fin:EUC_IMPORT_dateExistanteISO_(acces.Date_fin)
    },

    entreprise:{
      siret:
        (brut.entreprise&&brut.entreprise.siret) ||
        acces.Entreprise_siret || '',
      raisonSociale:
        (brut.entreprise&&(
          brut.entreprise.raisonSociale ||
          brut.entreprise.raison ||
          brut.entreprise.nom
        )) ||
        acces.Entreprise_raison_sociale || '',
      commune:
        (brut.entreprise&&brut.entreprise.commune) ||
        acces.Entreprise_commune || ''
    },

    responsablesLegaux:
      brut.responsablesLegaux ||
      brut.responsables ||
      [],

    professeursPrincipaux:
      brut.professeursPrincipaux ||
      brut.pp ||
      [],

    destinataires:{
      eleve:
        (brut.destinataires&&brut.destinataires.eleve) ||
        [],
      responsables:
        (brut.destinataires&&(
          brut.destinataires.responsables ||
          brut.destinataires.parents
        )) ||
        [],
      professeursPrincipaux:
        (brut.destinataires&&(
          brut.destinataires.professeursPrincipaux ||
          brut.destinataires.pp
        )) ||
        []
    }
  };"""

if old not in s:
    raise SystemExit("ERREUR : appel FIX3 introuvable. Aucun changement appliqué.")

s = s.replace(old, new, 1)

lines = s.splitlines()
lines[0] = "/** Eucalyptus PFMP — v1.0.0-dev.142-fix4 — normalisation des données DEV.141 validées. */"
s = "\n".join(lines) + "\n"

p.write_text(s, encoding="utf-8")
print("Correctif DEV.142 FIX4 appliqué.")
PY

echo
echo "=== CONTROLES DEV.142 FIX4 ==="
head -n 3 "$FILE"

grep -nE \
"v1.0.0-dev.142-fix4|numeroEnregistrement:|professeursPrincipaux:|raisonSociale:" \
"$FILE" | head -n 30

cp "$FILE" /tmp/EUC_CONVENTION_PFMP_NotificationsV142_FIX4.js
node --check /tmp/EUC_CONVENTION_PFMP_NotificationsV142_FIX4.js

echo
echo "=== PUSH APPS SCRIPT ==="
clasp push -f

echo
echo "============================================================"
echo " DEV.142 FIX4 TERMINE"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ numéro d'enregistrement normalisé"
echo "✓ entreprise normalisée"
echo "✓ parents normalisés"
echo "✓ professeur principal normalisé"
echo "✓ adresse BFE toujours paramétrable"
echo "✓ aucun courriel envoyé automatiquement"
echo
echo "Relancer dans Apps Script :"
echo "DIAGNOSTIC_DEV142_PFMP_000223"
echo "============================================================"
