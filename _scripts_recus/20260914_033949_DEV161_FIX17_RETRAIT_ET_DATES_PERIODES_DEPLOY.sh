#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix17-route-detail-retrait-dates"

ROUTER="apps-script/EDT.js"
HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
NEWGS="apps-script/EUC_SUIVI_PFMP_FixV161_17.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX17_${STAMP}"
mkdir -p "$BACKUP"

for f in "$ROUTER" "$HTML"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done
[ ! -f "$NEWGS" ] || cp "$NEWGS" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX17 — ROUTE CANONIQUE + RETRAIT + DATES"
echo "============================================================"

cat > "$NEWGS" <<'EOF'
/**
 * Eucalyptus PFMP — v1.0.0-dev.161-fix17
 * Route canonique du détail classe + désaffectation + enrichissement périodes.
 */

function EUC_V161F17_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_V161F17_records_(table){
  return EUC_IMPORT_lireRecords_(table);
}

function EUC_SUIVI_CLASSE_detailF17_(annee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId);

  // 1) Enrichir les périodes avec leurs dates réelles.
  try{
    var planning=EUC_V161F17_records_('Planning_Periodes');
    var byP={};
    planning.forEach(function(p){
      byP[Number(p.id)]=p;
    });

    var ps=d.periodes||d.periodesDisponibles||d.periods||[];
    if(Array.isArray(ps)){
      ps.forEach(function(p){
        var id=Number(p.id||p.periodeId||p.Periode)||0;
        var src=byP[id];
        if(!src)return;
        p.debut=EUC_IMPORT_dateExistanteISO_(src.Date_debut);
        p.fin=EUC_IMPORT_dateExistanteISO_(src.Date_fin);
        p.dateDebut=p.debut;
        p.dateFin=p.fin;
      });

      // Uniformiser la propriété utilisée par le frontend.
      d.periodes=ps;
    }
  }catch(e){
    console.log('FIX17 périodes : '+String(e&&e.message||e));
  }

  // 2) Enrichir CHAQUE ligne avec l'ID exact des affectations actives.
  try{
    var pid=Number(d&&d.periode&&d.periode.id)||Number(periodeId)||0;
    var affs=EUC_V161F17_records_('EUC_AFFECTATIONS_SUIVI_PFMP').filter(function(a){
      return a.Actif!==false &&
        EUC_V161F17_txt_(a.Annee_scolaire)===EUC_V161F17_txt_(annee) &&
        Number(EUC_PFMP_ref_(a.Classe))===Number(classeId) &&
        (!pid || Number(EUC_PFMP_ref_(a.Periode))===pid);
    });

    var byA={};
    affs.forEach(function(a){
      var eid=Number(EUC_PFMP_ref_(a.Eleve));
      var typ=EUC_V161F17_txt_(a.Type_suivi).toUpperCase();
      if(eid&&typ)byA[eid+'|'+typ]=Number(a.id)||0;
    });

    (d.lignes||[]).forEach(function(x){
      var eid=Number(x.eleveId)||0;
      x.affectationTelephoneId=byA[eid+'|TELEPHONE']||0;
      x.affectationVisiteId=byA[eid+'|VISITE']||0;
    });
  }catch(e){
    console.log('FIX17 affectations : '+String(e&&e.message||e));
  }

  return d;
}

function EUC_SUIVI_CLASSE_afficherF17(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V161F17_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;

  if(classeId<=0)throw new Error('Classe manquante.');

  var detail=EUC_SUIVI_CLASSE_detailF17_(annee,classeId,periodeId);

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);

  return tpl.evaluate()
    .setTitle('Suivi PFMP — '+detail.classe.nom)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_DESAFFECTER_F17(payload){
  var ctx=EUC_V156_admin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  var ids=(payload.affectationIds||[])
    .map(Number)
    .filter(function(x){return x>0;});

  if(!ids.length){
    throw new Error('Aucun identifiant d’affectation valide reçu.');
  }

  var now=new Date().toISOString();

  // Même forme de PATCH que la fonction d'affectation V156 déjà éprouvée :
  // un seul record par requête.
  ids.forEach(function(id){
    EUC_ENT_grist(
      'patch',
      '/tables/EUC_AFFECTATIONS_SUIVI_PFMP/records',
      {records:[{
        id:id,
        fields:{
          Actif:false,
          Date_modification:now
        }
      }]}
    );
  });

  return {
    ok:true,
    count:ids.length,
    message:ids.length+' affectation(s) retirée(s).'
  };
}
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EDT.js")
s=p.read_text(encoding="utf-8")

old="if (page === 'suivi-pfmp-classe') return EUC_SUIVI_CLASSE_afficherV156(e);"
new="if (page === 'suivi-pfmp-classe') return EUC_SUIVI_CLASSE_afficherF17(e);"

if old in s:
    s=s.replace(old,new,1)
elif new in s:
    print("INFO : route FIX17 déjà active.")
else:
    raise SystemExit("ERREUR : route suivi-pfmp-classe introuvable.")

p.write_text(s,encoding="utf-8")
print("OK 1/3 : route détail basculée sur FIX17.")
PY

cat > /tmp/EUC_FIX17_UI_BLOCK.html <<'EOF'
<style id="EUC_FIX17_UI_STYLE">
  [data-p] .euc-f17-period-date{
    display:block;
    margin-top:4px;
    font-size:11px;
    line-height:1.15;
    font-weight:500;
    opacity:.82;
    white-space:nowrap;
  }
</style>

<script id="EUC_FIX17_UI_SCRIPT">
(function(){
  'use strict';

  function fmt(v){
    var s=String(v||'').trim();
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3]+'/'+m[2]+'/'+m[1] : s;
  }

  function decoratePeriods(){
    try{
      var ps=(detail&&(
        detail.periodes||
        detail.periodesDisponibles||
        detail.periods
      ))||[];

      var by={};
      ps.forEach(function(p){
        var id=String(p.id||p.periodeId||p.Periode||'');
        if(id)by[id]=p;
      });

      document.querySelectorAll('[data-p]').forEach(function(btn){
        var p=by[String(btn.dataset.p||'')];
        if(!p)return;

        var d=fmt(p.debut||p.dateDebut||p.Date_debut||'');
        var f=fmt(p.fin||p.dateFin||p.Date_fin||'');
        if(!d&&!f)return;

        var old=btn.querySelector('.euc-f17-period-date');
        if(old)old.remove();

        var span=document.createElement('span');
        span.className='euc-f17-period-date';
        span.textContent=(d&&f)?(d+' → '+f):(d||f);
        btn.appendChild(span);
      });
    }catch(e){
      console.error('FIX17 périodes',e);
    }
  }

  function installRetrait(){
    var confirmBtn=document.getElementById('retConfirmV162');
    var modal=document.getElementById('retModalV162');
    var txt=document.getElementById('retTextV162');
    if(!confirmBtn||!modal)return;

    confirmBtn.onclick=function(){
      var old=confirmBtn.innerHTML;

      try{
        if(typeof pendingType==='undefined'||!pendingType){
          throw new Error('Type de suivi non défini.');
        }

        confirmBtn.disabled=true;
        confirmBtn.innerHTML='<span class="spinner"></span>Retrait en cours...';

        var selected=Array.from(document.querySelectorAll('.student-check:checked'))
          .map(function(x){return Number(x.value);})
          .filter(function(x){return x>0;});

        var selectedMap={};
        selected.forEach(function(id){selectedMap[id]=true;});

        var affectationIds=(detail.lignes||[])
          .filter(function(x){
            return selectedMap[Number(x.eleveId)]===true;
          })
          .map(function(x){
            return pendingType==='TELEPHONE'
              ? Number(x.affectationTelephoneId||0)
              : Number(x.affectationVisiteId||0);
          })
          .filter(function(id){return id>0;});

        if(!affectationIds.length){
          confirmBtn.disabled=false;
          confirmBtn.innerHTML=old;
          if(txt){
            txt.textContent='Impossible de retirer : aucun identifiant d’affectation actif trouvé pour la sélection.';
          }
          if(typeof showStatus==='function'){
            showStatus('Aucun identifiant d’affectation actif trouvé.','err');
          }
          return;
        }

        google.script.run
          .withSuccessHandler(function(r){
            confirmBtn.disabled=false;
            confirmBtn.innerHTML=old;
            modal.classList.remove('show');
            if(typeof pendingType!=='undefined')pendingType=null;
            if(typeof showStatus==='function'){
              showStatus((r&&r.message)||'Affectation retirée.','ok');
            }
            setTimeout(function(){window.location.reload();},250);
          })
          .withFailureHandler(function(e){
            confirmBtn.disabled=false;
            confirmBtn.innerHTML=old;
            if(txt){
              txt.textContent='Erreur de retrait : '+String(e&&e.message||e);
            }
            if(typeof showStatus==='function'){
              showStatus('Erreur : '+String(e&&e.message||e),'err');
            }
          })
          .EUC_SUIVI_DESAFFECTER_F17({
            affectationIds:affectationIds
          });

      }catch(e){
        confirmBtn.disabled=false;
        confirmBtn.innerHTML=old;
        if(txt)txt.textContent='Erreur interface : '+String(e&&e.message||e);
        if(typeof showStatus==='function'){
          showStatus('Erreur interface : '+String(e&&e.message||e),'err');
        }
      }
    };
  }

  function boot(){
    decoratePeriods();
    installRetrait();
    setTimeout(decoratePeriods,150);
    setTimeout(decoratePeriods,500);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }
})();
</script>
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")
block=Path("/tmp/EUC_FIX17_UI_BLOCK.html").read_text(encoding="utf-8")

# Nettoyer une éventuelle version précédente FIX17.
s=re.sub(
    r'\n?<style id="EUC_FIX17_UI_STYLE">.*?</style>\s*'
    r'<script id="EUC_FIX17_UI_SCRIPT">.*?</script>\n?',
    '\n',
    s,
    flags=re.S
)

if "</body>" not in s:
    raise SystemExit("ERREUR : </body> introuvable.")

s=s.replace("</body>",block+"\n</body>",1)
p.write_text(s,encoding="utf-8")
print("OK 2/3 : UI retrait + dates installée.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

cp "$NEWGS" /tmp/EUC_SUIVI_PFMP_FixV161_17.js
cp "$ROUTER" /tmp/EDT_FIX17.js
node --check /tmp/EUC_SUIVI_PFMP_FixV161_17.js
node --check /tmp/EDT_FIX17.js

python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_FIX17_UI_SCRIPT">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : script UI FIX17 introuvable.")
Path("/tmp/EUC_FIX17_UI_SCRIPT.js").write_text(m.group(1),encoding="utf-8")
PY
node --check /tmp/EUC_FIX17_UI_SCRIPT.js

grep -q "EUC_SUIVI_CLASSE_afficherF17" "$ROUTER"
grep -q "function EUC_SUIVI_DESAFFECTER_F17" "$NEWGS"
grep -q "affectationTelephoneId" "$NEWGS"
grep -q "p.debut=EUC_IMPORT_dateExistanteISO_" "$NEWGS"
grep -q "euc-f17-period-date" "$HTML"
grep -q "Retrait en cours" "$HTML"
grep -q "EUC_SUIVI_DESAFFECTER_F17" "$HTML"

echo "✓ route canonique FIX17"
echo "✓ IDs affectation injectés dans detail final"
echo "✓ retrait = PATCH unitaire minimal, même forme que V156"
echo "✓ spinner immédiat + erreurs visibles"
echo "✓ dates ajoutées sous chaque bouton de période"
echo "✓ syntaxe serveur / route / UI valide"

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
echo " DEV.161 FIX17 DEPLOYEE AVEC SUCCES"
echo "============================================================"
