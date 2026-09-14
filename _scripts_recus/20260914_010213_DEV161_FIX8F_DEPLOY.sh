#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix8f"
QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX8F_${STAMP}"
mkdir -p "$BACKUP"
cp "$QR_SERVICE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX8F — RECONSTRUCTION COMPLETE FONCTION QR"
echo "============================================================"

cat > /tmp/EUC_CONVENTION_enregistrerEntrepriseV117_FIX8F.txt <<'EOF'
function EUC_CONVENTION_enregistrerEntrepriseV117(token,d){
  var a=EUC_CONVENTION_lireRepriseV117_(token);
  d=d||{};

  function txt(v,n){
    return String(v==null?'':v).trim().replace(/[<>]/g,'').slice(0,n||500);
  }

  var pays=txt(d.entreprisePays,100)||'France';
  var siret=txt(d.entrepriseSiret,30);
  var raison=txt(d.entrepriseRaisonSociale,250);
  var adresse=txt(d.entrepriseAdresse,300);
  var commune=txt(d.entrepriseCommune,150);
  var respNom=txt(d.responsableNom,150);
  var tuteurEst=d.tuteurEstResponsable===true||String(d.tuteurEstResponsable)==='true';

  var estMonaco=pays.toLowerCase()==='monaco';
  var nis=estMonaco?siret:'';

  if(pays.toLowerCase()==='france'&&!siret){
    throw new Error('Le SIRET est obligatoire pour une entreprise française.');
  }
  if(estMonaco&&!nis){
    throw new Error('Le NIS est obligatoire pour une entreprise monégasque.');
  }
  if(!raison||!adresse||!commune||!respNom){
    throw new Error('Raison sociale, adresse, commune et nom du responsable sont obligatoires.');
  }

  var tNom=tuteurEst?respNom:txt(d.tuteurNom,150);
  if(!tNom)throw new Error('Le nom du tuteur est obligatoire.');

  var anneeTxt=String(a.Annee_scolaire||'').trim();
  var anneeDebut=(anneeTxt.match(/20\d{2}/)||['PFMP'])[0];
  var numeroEnregistrement=String(a.Numero_enregistrement||'').trim()||
    ('PFMP-'+anneeDebut+'-'+String(Number(a.id||0)).padStart(6,'0'));

  var fields={
    Entreprise_siret:estMonaco?'':siret,
    Entreprise_nis:nis,
    Entreprise_identifiant_type:estMonaco?'NIS':'SIRET',
    Entreprise_validation_statut:estMonaco?'A_VALIDER':'VALIDE',
    Entreprise_raison_sociale:raison,
    Entreprise_enseigne:txt(d.entrepriseEnseigne,250),
    Entreprise_adresse:adresse,
    Entreprise_complement:txt(d.entrepriseComplement,250),
    Entreprise_code_postal:txt(d.entrepriseCodePostal,20),
    Entreprise_commune:commune,
    Entreprise_pays:pays,
    Responsable_nom:respNom,
    Responsable_prenom:txt(d.responsablePrenom,150),
    Responsable_fonction:txt(d.responsableFonction,200),
    Responsable_telephone:txt(d.responsableTelephone,50),
    Responsable_courriel:txt(d.responsableCourriel,250),
    Tuteur_est_responsable:tuteurEst,
    Tuteur_nom:tuteurEst?respNom:tNom,
    Tuteur_prenom:tuteurEst?txt(d.responsablePrenom,150):txt(d.tuteurPrenom,150),
    Tuteur_fonction:tuteurEst?txt(d.responsableFonction,200):txt(d.tuteurFonction,200),
    Tuteur_telephone:tuteurEst?txt(d.responsableTelephone,50):txt(d.tuteurTelephone,50),
    Tuteur_courriel:tuteurEst?txt(d.responsableCourriel,250):txt(d.tuteurCourriel,250),
    Date_saisie_entreprise:new Date().toISOString(),
    Statut:'ENTREPRISE_SAISIE',
    Date_derniere_utilisation:new Date().toISOString()
  };

  EUC_ENT_grist(
    'patch',
    '/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',
    {records:[{id:a.id,fields:fields}]}
  );

  if(estMonaco){
    try{
      EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d);
    }catch(monacoErr){
      console.log('MONACO_REF_WARNING '+String(monacoErr&&monacoErr.message||monacoErr));
    }
  }

  var notif={};
  try{
    notif=EUC_CONVENTION_apresEnregistrementV143_(a.id,numeroEnregistrement);
  }catch(err143){
    notif={envoye:false,erreur:String(err143&&err143.message?err143.message:err143)};
  }

  return {
    ok:true,
    reference:a.Reference_convention||'',
    numeroEnregistrement:numeroEnregistrement,
    message:'Informations entreprise enregistrées.',
    notification:notif
  };
}

EOF

python3 <<'PY'
from pathlib import Path

target=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=target.read_text(encoding="utf-8")
new_fn=Path("/tmp/EUC_CONVENTION_enregistrerEntrepriseV117_FIX8F.txt").read_text(encoding="utf-8")

start=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
if start < 0:
    raise SystemExit("ERREUR : fonction cible introuvable.")

compat=s.find("/* Compatibilité anciens appels. */",start)
if compat < 0:
    raise SystemExit("ERREUR : marqueur de fin introuvable.")

s=s[:start]+new_fn+s[compat:]
target.write_text(s,encoding="utf-8")

txt=target.read_text(encoding="utf-8")
required=[
    "var estMonaco=pays.toLowerCase()==='monaco';",
    "Entreprise_nis:nis",
    "Entreprise_identifiant_type:estMonaco?'NIS':'SIRET'",
    "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d);",
    "reference:a.Reference_convention||''"
]
for token in required:
    if token not in txt:
        raise SystemExit("ERREUR : élément requis manquant : "+token)

print("OK : fonction QR reconstruite intégralement.")
PY

echo
echo "============================================================"
echo " DEV.161 FIX8F — CONTROLES AVANT PUSH"
echo "============================================================"

cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8F.js
node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8F.js

python3 <<'PY'
from pathlib import Path
s=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs").read_text(encoding="utf-8")
start=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
end=s.find("/* Compatibilité anciens appels. */",start)
block=s[start:end]
checks={
  "une seule reference": block.count("reference:a.Reference_convention||''")==1,
  "un seul appel Monaco": block.count("EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)")==1,
  "aucun V1617": "EUC_V1617_" not in block
}
for label,ok in checks.items():
    print(("✓ " if ok else "✗ ")+label)
    if not ok: raise SystemExit(1)
PY

grep -q "suivi-pfmp-ent" apps-script/EDT.js
grep -q "entreprisePaysSelectV161" apps-script/PFMP_Acces_QR_V116.html
grep -q "drawSiretNisLabel" apps-script/Convention_PFMP_PdfV95.html
grep -q "function EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_" apps-script/EUC_PFMP_Monaco_V161Fix8.gs

echo "✓ syntaxe QR valide"
echo "✓ ENT conservé"
echo "✓ QR France/Monaco conservé"
echo "✓ PDF surcharge conservée"
echo "✓ référentiel Monaco conservé"

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
echo " DEV.161 FIX8F DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ fonction QR reconstruite proprement"
echo "✓ doublons supprimés"
echo "✓ backend Monaco conservé"
echo "✓ push + version + déploiement principal"
echo "============================================================"
