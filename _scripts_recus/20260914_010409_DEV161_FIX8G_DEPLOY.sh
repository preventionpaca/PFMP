#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix8g"

QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX8G_${STAMP}"
mkdir -p "$BACKUP"
cp "$QR_SERVICE" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX8G — RECONSTRUCTION REPRISE + ENREGISTREMENT QR"
echo "============================================================"

cat > /tmp/EUC_QR_BLOCK_FIX8G.txt <<'EOF'
function EUC_CONVENTION_repriseEntrepriseV117(token){
  var a=EUC_CONVENTION_lireRepriseV117_(token);
  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');
  var e=eleves.filter(function(x){
    return Number(x.id)===Number(EUC_PFMP_ref_(a.Eleve));
  })[0];

  if(!e)throw new Error('Élève introuvable.');

  return {
    ok:true,
    accessId:a.id,
    reference:a.Reference_convention||'',
    eleve:{
      nom:e.Nom||'',
      prenom:e.Prenom_usage||e.Prenom||'',
      classe:a.Classe_convention_nom||'',
      annee:a.Annee_scolaire||''
    },
    entreprise:{
      siret:a.Entreprise_nis||a.Entreprise_siret||'',
      raisonSociale:a.Entreprise_raison_sociale||'',
      enseigne:a.Entreprise_enseigne||'',
      adresse:a.Entreprise_adresse||'',
      complement:a.Entreprise_complement||'',
      codePostal:a.Entreprise_code_postal||'',
      commune:a.Entreprise_commune||'',
      pays:a.Entreprise_pays||'France',
      identifiantType:a.Entreprise_identifiant_type||'SIRET',
      nis:a.Entreprise_nis||''
    },
    responsable:{
      nom:a.Responsable_nom||'',
      prenom:a.Responsable_prenom||'',
      fonction:a.Responsable_fonction||'',
      telephone:a.Responsable_telephone||'',
      courriel:a.Responsable_courriel||''
    },
    tuteur:{
      estResponsable:a.Tuteur_est_responsable===true,
      nom:a.Tuteur_nom||'',
      prenom:a.Tuteur_prenom||'',
      fonction:a.Tuteur_fonction||'',
      telephone:a.Tuteur_telephone||'',
      courriel:a.Tuteur_courriel||''
    }
  };
}

function EUC_CONVENTION_enregistrerEntrepriseV117(token,d){
  var a=EUC_CONVENTION_lireRepriseV117_(token);
  d=d||{};

  function txt(v,n){
    return String(v==null?'':v).trim().replace(/[<>]/g,'').slice(0,n||500);
  }

  var pays=txt(d.entreprisePays,100)||'France';
  var identifiant=txt(d.entrepriseSiret,30);
  var raison=txt(d.entrepriseRaisonSociale,250);
  var adresse=txt(d.entrepriseAdresse,300);
  var commune=txt(d.entrepriseCommune,150);
  var respNom=txt(d.responsableNom,150);
  var tuteurEst=d.tuteurEstResponsable===true||String(d.tuteurEstResponsable)==='true';

  var estMonaco=pays.toLowerCase()==='monaco';
  var siret=estMonaco?'':identifiant;
  var nis=estMonaco?identifiant:'';

  if(!estMonaco&&!siret){
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
    Entreprise_siret:siret,
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
    notif={
      envoye:false,
      erreur:String(err143&&err143.message?err143.message:err143)
    };
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
new_block=Path("/tmp/EUC_QR_BLOCK_FIX8G.txt").read_text(encoding="utf-8")

start=s.find("function EUC_CONVENTION_repriseEntrepriseV117(")
if start < 0:
    raise SystemExit("ERREUR : début repriseEntrepriseV117 introuvable.")

compat=s.find("/* Compatibilité anciens appels. */", start)
if compat < 0:
    raise SystemExit("ERREUR : marqueur Compatibilité anciens appels introuvable.")

s=s[:start]+new_block+s[compat:]
target.write_text(s,encoding="utf-8")

txt=target.read_text(encoding="utf-8")
required=[
    "function EUC_CONVENTION_repriseEntrepriseV117",
    "function EUC_CONVENTION_enregistrerEntrepriseV117",
    "tuteur:{",
    "var estMonaco=pays.toLowerCase()==='monaco';",
    "Entreprise_nis:nis",
    "EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d);",
    "/* Compatibilité anciens appels. */"
]
for token in required:
    if token not in txt:
        raise SystemExit("ERREUR : élément requis absent : "+token)

print("OK : bloc reprise + enregistrement reconstruit intégralement.")
PY

echo
echo "============================================================"
echo " DEV.161 FIX8G — CONTROLES AVANT PUSH"
echo "============================================================"

cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8G.js

if ! node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX8G.js; then
  echo
  echo "ERREUR : backend QR encore invalide."
  echo "AUCUN PUSH / AUCUN DEPLOIEMENT."
  exit 1
fi

python3 <<'PY'
from pathlib import Path

s=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs").read_text(encoding="utf-8")

a=s.find("function EUC_CONVENTION_repriseEntrepriseV117(")
b=s.find("/* Compatibilité anciens appels. */",a)
block=s[a:b]

checks={
  "1 repriseEntrepriseV117": block.count("function EUC_CONVENTION_repriseEntrepriseV117(")==1,
  "1 enregistrerEntrepriseV117": block.count("function EUC_CONVENTION_enregistrerEntrepriseV117(")==1,
  "1 appel Monaco": block.count("EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d)")==1,
  "pas de fonction imbriquée dans tuteur": "tuteur:{estResponsable:function" not in block,
  "accolades équilibrées": block.count("{")==block.count("}")
}

for label,ok in checks.items():
  print(("✓ " if ok else "✗ ")+label)
  if not ok:
    raise SystemExit(1)
PY

echo "✓ syntaxe QR serveur valide"

echo
echo "=== CONTROLES FIX8 CONSERVES ==="
grep -q "suivi-pfmp-ent" apps-script/EDT.js
grep -q "entreprisePaysSelectV161" apps-script/PFMP_Acces_QR_V116.html
grep -q "drawSiretNisLabel" apps-script/Convention_PFMP_PdfV95.html
grep -q "function EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_" apps-script/EUC_PFMP_Monaco_V161Fix8.gs

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
echo " DEV.161 FIX8G DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ reprise QR reconstruite"
echo "✓ enregistrement QR reconstruit"
echo "✓ backend Monaco conservé"
echo "✓ push + version + déploiement principal"
echo "============================================================"
