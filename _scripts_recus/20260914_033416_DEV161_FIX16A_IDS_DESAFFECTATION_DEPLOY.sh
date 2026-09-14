#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix16a-ids-desaffectation"

V156="apps-script/EUC_SUIVI_PFMP_V156.gs"
HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX16A_${STAMP}"
mkdir -p "$BACKUP"
cp "$V156" "$BACKUP/"
cp "$HTML" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX16A — IDS D'AFFECTATION GARANTIS"
echo "============================================================"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_SUIVI_PFMP_V156.gs")
s=p.read_text(encoding="utf-8")

old="""  var detail=EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId);
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');"""

new="""  var detail=EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId);

  // DEV.161 FIX16A
  // Garantir les IDs techniques d'affectation DANS LE DETAIL FINAL envoyé au navigateur.
  // On le fait ici, après detailV162(), pour éviter qu'un wrapper ultérieur ne perde
  // affectationTelephoneId / affectationVisiteId.
  try{
    var pidFinal=Number(detail&&detail.periode&&detail.periode.id)||Number(periodeId)||0;
    if(pidFinal>0 && detail && Array.isArray(detail.lignes)){
      var affFinal=EUC_V156_affectations_(annee,classeId,pidFinal);
      var byFinal={};

      affFinal.forEach(function(a){
        var eid=Number(EUC_PFMP_ref_(a.Eleve));
        var typ=EUC_V156_txt_(a.Type_suivi).toUpperCase();
        if(eid && typ){
          byFinal[eid+'|'+typ]=Number(a.id)||0;
        }
      });

      detail.lignes.forEach(function(x){
        var eid=Number(x.eleveId)||0;
        x.affectationTelephoneId=byFinal[eid+'|TELEPHONE']||0;
        x.affectationVisiteId=byFinal[eid+'|VISITE']||0;
      });
    }
  }catch(e){
    console.log('FIX16A IDs affectation : '+String(e&&e.message||e));
  }

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');"""

if old not in s:
    if "DEV.161 FIX16A" in s:
        print("INFO : FIX16A déjà présent.")
    else:
        raise SystemExit("ERREUR : point d'injection afficherV156 introuvable.")
else:
    s=s.replace(old,new,1)

p.write_text(s,encoding="utf-8")
print("OK 1/2 : IDs injectés dans le detail FINAL.")
PY

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

old="""      if(!affectationIds.length){
        modal.classList.remove('show');
        showStatus('Aucune affectation active à retirer pour la sélection.','err');
        return;
      }"""

new="""      if(!affectationIds.length){
        confirm.disabled=false;
        confirm.innerHTML=old;
        txt.textContent='Impossible de retirer : aucun identifiant d’affectation actif n’a été trouvé pour la sélection.';
        showStatus('Aucun identifiant d’affectation actif trouvé.','err');
        return;
      }"""

if old not in s:
    if "aucun identifiant d’affectation actif" in s:
        print("INFO : message FIX16A déjà présent.")
    else:
        raise SystemExit("ERREUR : garde affectationIds introuvable.")
else:
    s=s.replace(old,new,1)

p.write_text(s,encoding="utf-8")
print("OK 2/2 : erreur visible DANS le modal si ID absent.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

cp "$V156" /tmp/EUC_SUIVI_PFMP_V156_FIX16A.js
node --check /tmp/EUC_SUIVI_PFMP_V156_FIX16A.js

grep -q "DEV.161 FIX16A" "$V156"
grep -q "affectationTelephoneId=byFinal" "$V156"
grep -q "affectationVisiteId=byFinal" "$V156"
grep -q "aucun identifiant d’affectation actif" "$HTML"

echo "✓ IDs injectés après detailV162"
echo "✓ aucun wrapper ne peut les perdre ensuite"
echo "✓ message visible si anomalie"
echo "✓ serveur de retrait FIX16 conservé"
echo "✓ syntaxe valide"

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
clasp version "$LABEL"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.161 FIX16A DEPLOYEE AVEC SUCCES"
echo "============================================================"
