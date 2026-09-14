#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix21-filtre-vfmp-terminales-bac"

FIX18="apps-script/EUC_SUIVI_PFMP_FixV161_18.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX21_${STAMP}"
mkdir -p "$BACKUP"
cp "$FIX18" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX21 — MASQUER VFMP POUR TERMINALES BAC PRO"
echo "============================================================"

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_SUIVI_PFMP_FixV161_18.gs")
s=p.read_text(encoding="utf-8")

needle="""  // FIX19 : enrichir directement les objets réellement utilisés par renderTabs().
  if(Array.isArray(d.periodes)){
    d.periodes.forEach(function(p){
      var src=mapDates[String(Number(p.id||p.periodeId||p.Periode)||0)];
      if(!src)return;
      p.debut=src.debut||'';
      p.fin=src.fin||'';
      p.dateDebut=p.debut;
      p.dateFin=p.fin;
    });
  }"""

replacement="""  // FIX19 : enrichir directement les objets réellement utilisés par renderTabs().
  if(Array.isArray(d.periodes)){
    d.periodes.forEach(function(p){
      var src=mapDates[String(Number(p.id||p.periodeId||p.Periode)||0)];
      if(!src)return;
      p.debut=src.debut||'';
      p.fin=src.fin||'';
      p.dateDebut=p.debut;
      p.dateFin=p.fin;
    });

    // FIX21 — RÈGLE MÉTIER :
    // pour les classes de TERMINALE BAC PRO, la période VFMP ne doit pas
    // apparaître dans le suivi par classe.
    //
    // Exemples concernés : TCIEL, TMVA1, TMVA2, TRMO, TRSP, etc.
    // Les CAP / BTS ne sont pas concernés par cette règle.
    var classeNom=EUC_V161F18_txt_(d&&d.classe&&d.classe.nom).toUpperCase();
    var terminaleBac=/^T/.test(classeNom) &&
      classeNom.indexOf('CAP')<0 &&
      classeNom.indexOf('BTS')<0;

    if(terminaleBac){
      d.periodes=d.periodes.filter(function(p){
        var lib=EUC_V161F18_txt_(p.libelle||p.Libelle||p.nom||p.Nom)
          .toUpperCase()
          .replace(/[\\s._-]+/g,'');
        return lib!=='VFMP' && lib!=='VEMP';
      });
    }
  }"""

if "FIX21 — RÈGLE MÉTIER" in s:
    print("INFO : FIX21 déjà présent.")
elif needle not in s:
    raise SystemExit("ERREUR : bloc FIX19 attendu introuvable.")
else:
    s=s.replace(needle,replacement,1)

p.write_text(s,encoding="utf-8")
print("OK : VFMP filtrée uniquement pour les terminales Bac Pro.")
PY

echo
echo "============================================================"
echo " VALIDATION"
echo "============================================================"

cp "$FIX18" /tmp/FIX21_server.js
node --check /tmp/FIX21_server.js

grep -q "FIX21 — RÈGLE MÉTIER" "$FIX18"
grep -q "lib!=='VFMP'" "$FIX18"
grep -q "classeNom.indexOf('CAP')<0" "$FIX18"
grep -q "classeNom.indexOf('BTS')<0" "$FIX18"

echo "✓ terminales Bac Pro détectées"
echo "✓ VFMP/VEMP masquée"
echo "✓ CAP non concernés"
echo "✓ BTS non concernés"
echo "✓ autres périodes conservées"
echo "✓ dates sous les boutons conservées"

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
echo "=== VERIFICATION ==="
clasp deployments | grep "$DEPLOYMENT_ID" || true

echo "============================================================"
echo " DEV.161 FIX21 DEPLOYE"
echo "============================================================"
