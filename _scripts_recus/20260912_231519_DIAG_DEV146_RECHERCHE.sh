#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

FILE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV146_diag_recherche_${STAMP}"
mkdir -p "$BACKUP"
cp "$FILE" "$BACKUP/"

cat >> "$FILE" <<'EOF'

function DIAGNOSTIC_DEV146_RECHERCHE_DOSSIERS(){
  var rows=EUC_CONVENTION_lireAccesFraisV108_();
  console.log('=== DEV.146 — DIAGNOSTIC RECHERCHE DOSSIERS ===');
  console.log('Accès totaux : '+rows.length);

  rows.forEach(function(a){
    var eligible=!!(
      a.Date_saisie_entreprise ||
      a.Numero_enregistrement ||
      a.Entreprise_raison_sociale ||
      a.Statut==='ENTREPRISE_SAISIE'
    );
    if(!eligible)return;

    console.log(
      'ID='+a.id+
      ' | Numero='+String(a.Numero_enregistrement||'')+
      ' | EleveRef='+String(a.Eleve||'')+
      ' | Eleve_nom='+String(a.Eleve_nom||'')+
      ' | Nom_eleve='+String(a.Nom_eleve||'')+
      ' | Classe='+String(a.Classe_convention_nom||'')+
      ' | Entreprise='+String(a.Entreprise_raison_sociale||'')
    );
  });

  var out=EUC_ADMIN_WORKFLOW_listerDossiersV146();
  console.log('Dossiers V146 : '+out.length);

  out.forEach(function(d){
    console.log(
      'V146 ID='+d.id+
      ' | '+d.numero+
      ' | jeune='+d.jeune+
      ' | classe='+d.classe+
      ' | entreprise='+d.entreprise+
      ' | recherche='+d.recherche
    );
  });

  return out;
}
EOF

cp "$FILE" /tmp/EUC_ADMIN_WORKFLOW_V146_DIAG.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V146_DIAG.js

clasp push -f

echo "============================================================"
echo " DIAGNOSTIC DEV.146 RECHERCHE AJOUTE"
echo "============================================================"
echo "Aucun déploiement nécessaire pour exécuter le diagnostic."
echo "Dans Apps Script, lance :"
echo
echo "DIAGNOSTIC_DEV146_RECHERCHE_DOSSIERS"
echo
echo "Aucune donnée modifiée. Aucun courriel envoyé."
echo "============================================================"
