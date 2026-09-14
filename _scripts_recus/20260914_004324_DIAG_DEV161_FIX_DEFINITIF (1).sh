#!/usr/bin/env bash
set -u
cd "$HOME/PFMP" || exit 1

echo "============================================================"
echo " DIAGNOSTIC CIBLE DEV.161 — PREPARATION FIX DEFINITIF"
echo "============================================================"

echo
echo "=== A) RENDERER LISTE CLASSES V154 ==="
sed -n '130,205p' apps-script/EUC_SUIVI_PFMP_ClassesV154.gs

echo
echo "=== B) SERVICE / RENDERER DETAIL V156 ==="
sed -n '1,135p' apps-script/EUC_SUIVI_PFMP_V156.gs

echo
echo "=== C) CONTEXTE ADMIN V144 — DEBUT DU FICHIER ==="
sed -n '1,55p' apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs

echo
echo "=== D) CONTEXTE ANNEE / LECTURE SEULE ==="
grep -RniE "contexteAnnee|contexte.*Lecture|anneeContext|yearContext" \
  apps-script/EUC_SUIVI_PFMP_ClassesV154.gs \
  apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs \
  apps-script/EUC_SUIVI_PFMP_V156.gs | head -n 160

echo
echo "=== E) QR — FORMULAIRE ENTREPRISE / PAYS / SIRET ==="
sed -n '300,380p' apps-script/PFMP_Acces_QR_V116.html

echo
echo "=== F) QR — CONTROLE SIRET ==="
sed -n '545,640p' apps-script/PFMP_Acces_QR_V116.html

echo
echo "=== G) QR — RECHERCHE ENTREPRISE ==="
sed -n '885,1045p' apps-script/PFMP_Acces_QR_V116.html

echo
echo "=== H) QR — PAYLOAD ET SAUVEGARDE ==="
sed -n '1045,1245p' apps-script/PFMP_Acces_QR_V116.html

echo
echo "=== I) TABLE ENTREPRISES CONFIGUREE + SCHEMA ==="
grep -nE "EUC_ENT_TABLE_ENTREPRISES|EUC_ENTREPRISES|columns:\\[" \
  apps-script/EUC_ENT_Config.gs \
  apps-script/EUC_ENT_InstallationGrist.gs \
  apps-script/EUC_ENT_Grist.gs | head -n 220

echo
echo "=== J) ROUTE IMPRESSION CONVENTION / TEMPLATE ==="
grep -RniE "Convention_PFMP_Print|Convention_PFMP_Batch_Print|createTemplateFromFile.*Convention_PFMP" \
  apps-script/EUC_CONVENTION_PFMP_*.gs apps-script/*.gs | head -n 180

echo
echo "============================================================"
echo " AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT"
echo "============================================================"
read -r -p "Appuyez sur Entrée pour fermer..."
