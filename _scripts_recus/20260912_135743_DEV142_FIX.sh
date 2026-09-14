#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV142_avant_FIX_${STAMP}"
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

marker = "function EUC_CONVENTION_preparerNotificationV142_(accesId){"
if marker not in s:
    raise SystemExit("ERREUR : fonction preparerNotificationV142 introuvable.")

helper = r"""
function EUC_CONVENTION_preparerDossierAdminV142_(acces){
  if(!acces)throw new Error('Accès convention absent.');

  function txt(v,n){
    return String(v==null?'':v).trim().slice(0,n||500);
  }

  function email(v){
    var x=txt(v,250).toLowerCase();
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(x)?x:'';
  }

  function uniques(values){
    var seen={},out=[];
    (values||[]).forEach(function(v){
      var x=email(v);
      if(x&&!seen[x]){seen[x]=true;out.push(x);}
    });
    return out;
  }

  var eleveId=Number(EUC_PFMP_ref_(acces.Eleve));
  var classeId=Number(EUC_PFMP_ref_(acces.Classe_convention));
  var periodeId=Number(EUC_PFMP_ref_(acces.Periode));

  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');
  var eleve=eleves.filter(function(e){
    return Number(e.id)===eleveId;
  })[0];

  if(!eleve)throw new Error('Élève '+eleveId+' introuvable.');

  var numero=txt(acces.Numero_enregistrement,100);
  if(!numero){
    var annee=txt(acces.Annee_scolaire,50);
    var debut=(annee.match(/20\\d{2}/)||['PFMP'])[0];
    numero='PFMP-'+debut+'-'+String(Number(acces.id||0)).padStart(6,'0');
  }

  var responsables=[];
  try{
    responsables=EUC_IMPORT_lireRecords_('EUC_RESPONSABLES_ELEVES_PFMP')
      .filter(function(r){
        return Number(EUC_PFMP_ref_(r.Eleve))===eleveId;
      })
      .map(function(r){
        return {
          id:r.id,
          rang:txt(r.Rang_responsable,30),
          nom:[r.Prenom,r.Nom].filter(Boolean).join(' '),
          lien:txt(r.Lien_avec_eleve,100),
          responsableLegal:r.Responsable_legal===true,
          responsableEnCharge:r.Responsable_en_charge===true,
          email:email(r.Email)
        };
      })
      .filter(function(r){return !!r.email;});
  }catch(e){}

  var pp=[];
  try{
    var links=EUC_IMPORT_lireRecords_('EUC_CLASSES_PROFESSEURS_PFMP');
    var profs=EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP');
    var byId={};
    profs.forEach(function(p){byId[Number(p.id)]=p;});

    pp=links
      .filter(function(l){
        return l.Actif!==false &&
          String(l.Role||'')==='PROFESSEUR_PRINCIPAL' &&
          Number(EUC_PFMP_ref_(l.Classe))===classeId;
      })
      .map(function(l){
        var prof=byId[Number(EUC_PFMP_ref_(l.Professeur))];
        if(!prof)return null;
        return {
          id:prof.id,
          nom:[prof.Civilite,prof.Prenom,prof.Nom].filter(Boolean).join(' '),
          email:email(prof.Email)
        };
      })
      .filter(function(x){return x&&x.email;});
  }catch(e){}

  var emailEleve=email(eleve.Email_eleve||eleve.Courriel||eleve.Email);

  var destinataires={
    eleve:emailEleve?[emailEleve]:[],
    responsables:uniques(responsables.map(function(x){return x.email;})),
    professeursPrincipaux:uniques(pp.map(function(x){return x.email;}))
  };

  return {
    version:'v1.0.0-dev.142-fix',
    lectureSeule:true,
    aucuneEcriture:true,
    aucunCourriel:true,
    accesId:Number(acces.id),
    numeroEnregistrement:numero,
    eleve:{
      id:eleveId,
      nom:txt(eleve.Nom,150),
      prenom:txt(eleve.Prenom_usage||eleve.Prenom,150),
      email:emailEleve
    },
    classe:{
      id:classeId,
      nom:txt(acces.Classe_convention_nom,150)
    },
    periode:{
      id:periodeId,
      libelle:txt(acces.Periode_libelle,250),
      debut:EUC_IMPORT_dateExistanteISO_(acces.Date_debut),
      fin:EUC_IMPORT_dateExistanteISO_(acces.Date_fin)
    },
    entreprise:{
      siret:txt(acces.Entreprise_siret,30),
      raisonSociale:txt(acces.Entreprise_raison_sociale,250),
      commune:txt(acces.Entreprise_commune,150)
    },
    responsablesLegaux:responsables,
    professeursPrincipaux:pp,
    destinataires:destinataires
  };
}

"""

if "function EUC_CONVENTION_preparerDossierAdminV142_(" not in s:
    s = s.replace(marker, helper + marker, 1)

old = "var dossier=EUC_CONVENTION_preparerDossierAdminV141_(acces);"
new = "var dossier=EUC_CONVENTION_preparerDossierAdminV142_(acces);"

if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit("ERREUR : appel de préparation dossier introuvable.")

s = s.replace(
    "/** Eucalyptus PFMP — v1.0.0-dev.142 — notifications administratives et configuration destinataire BFE. */",
    "/** Eucalyptus PFMP — v1.0.0-dev.142-fix — notifications administratives autonomes. */",
    1
)

p.write_text(s, encoding="utf-8")
print("Correctif DEV.142 appliqué.")
PY

echo
echo "=== CONTROLES DEV.142 FIX ==="

grep -nE "dev.142-fix|preparerDossierAdminV142_|preparerNotificationV142_|DIAGNOSTIC_DEV142_PFMP_000223" "$FILE"

if grep -n "preparerDossierAdminV141_" "$FILE"; then
  echo "ERREUR : ancienne dépendance DEV.141 encore présente."
  exit 1
else
  echo "OK : aucune dépendance restante vers preparerDossierAdminV141_."
fi

cp "$FILE" /tmp/EUC_CONVENTION_PFMP_NotificationsV142_FIX.js
node --check /tmp/EUC_CONVENTION_PFMP_NotificationsV142_FIX.js

echo
echo "=== PUSH APPS SCRIPT ==="
clasp push -f

echo
echo "============================================================"
echo " DEV.142 FIX TERMINE"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ DEV.142 autonome"
echo "✓ syntaxe OK"
echo "✓ push Apps Script effectué"
echo "✓ aucun déploiement public"
echo "✓ aucun courriel envoyé automatiquement"
echo
echo "Dans Apps Script, relancer maintenant :"
echo "DIAGNOSTIC_DEV142_PFMP_000223"
echo "============================================================"
