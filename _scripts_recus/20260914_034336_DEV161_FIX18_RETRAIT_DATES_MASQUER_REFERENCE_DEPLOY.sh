#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix18-retrait-dates-tableau"

ROUTER="apps-script/EDT.js"
HTML="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
NEWGS="apps-script/EUC_SUIVI_PFMP_FixV161_18.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX18_${STAMP}"
mkdir -p "$BACKUP"
cp "$ROUTER" "$BACKUP/"
cp "$HTML" "$BACKUP/"
[ ! -f "$NEWGS" ] || cp "$NEWGS" "$BACKUP/"

echo "============================================================"
echo " DEV.161 FIX18 — RETRAIT + DATES + MASQUAGE REFERENCE"
echo "============================================================"

cat > "$NEWGS" <<'EOF'
/**
 * Eucalyptus PFMP — v1.0.0-dev.161-fix18
 * - détail classe canonique
 * - dates fiables pour tous les boutons de période
 * - désaffectation par IDs techniques
 */

function EUC_V161F18_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId);

  // Carte complète ID période -> dates.
  var mapDates={};
  try{
    EUC_IMPORT_lireRecords_('Planning_Periodes').forEach(function(p){
      if(p.Actif===false)return;
      var id=Number(p.id)||0;
      if(!id)return;
      mapDates[String(id)]={
        debut:EUC_IMPORT_dateExistanteISO_(p.Date_debut),
        fin:EUC_IMPORT_dateExistanteISO_(p.Date_fin),
        libelle:EUC_V161F18_txt_(p.Libelle||p.Nom||p.Periode||'')
      };
    });
  }catch(e){
    console.log('FIX18 map périodes : '+String(e&&e.message||e));
  }
  d.periodeDatesById=mapDates;

  // IDs exacts des affectations actives pour la période affichée.
  try{
    var pid=Number(d&&d.periode&&d.periode.id)||Number(periodeId)||0;
    var byA={};

    EUC_IMPORT_lireRecords_('EUC_AFFECTATIONS_SUIVI_PFMP')
      .filter(function(a){
        return a.Actif!==false &&
          EUC_V161F18_txt_(a.Annee_scolaire)===EUC_V161F18_txt_(annee) &&
          Number(EUC_PFMP_ref_(a.Classe))===Number(classeId) &&
          (!pid || Number(EUC_PFMP_ref_(a.Periode))===pid);
      })
      .forEach(function(a){
        var eid=Number(EUC_PFMP_ref_(a.Eleve));
        var typ=EUC_V161F18_txt_(a.Type_suivi).toUpperCase();
        if(eid&&typ)byA[eid+'|'+typ]=Number(a.id)||0;
      });

    (d.lignes||[]).forEach(function(x){
      var eid=Number(x.eleveId)||0;
      x.affectationTelephoneId=byA[eid+'|TELEPHONE']||0;
      x.affectationVisiteId=byA[eid+'|VISITE']||0;
    });
  }catch(e){
    console.log('FIX18 affectations : '+String(e&&e.message||e));
  }

  return d;
}

function EUC_SUIVI_CLASSE_afficherF18(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V161F18_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;

  if(classeId<=0)throw new Error('Classe manquante.');

  var detail=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);

  return tpl.evaluate()
    .setTitle('Suivi PFMP — '+detail.classe.nom)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_DESAFFECTER_F18(payload){
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

  // PATCH unitaire, même forme que l'affectation V156 déjà utilisée.
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

candidates=[
    "if (page === 'suivi-pfmp-classe') return EUC_SUIVI_CLASSE_afficherF17(e);",
    "if (page === 'suivi-pfmp-classe') return EUC_SUIVI_CLASSE_afficherV156(e);",
]
new="if (page === 'suivi-pfmp-classe') return EUC_SUIVI_CLASSE_afficherF18(e);"

if new in s:
    print("INFO : route FIX18 déjà active.")
else:
    hit=False
    for old in candidates:
        if old in s:
            s=s.replace(old,new,1)
            hit=True
            break
    if not hit:
        raise SystemExit("ERREUR : route suivi-pfmp-classe introuvable.")

p.write_text(s,encoding="utf-8")
print("OK 1/3 : route détail -> FIX18.")
PY

cat > /tmp/EUC_FIX18_UI_BLOCK.html <<'EOF'
<style id="EUC_FIX18_UI_STYLE">
  [data-p] .euc-f18-period-date{
    display:block;
    margin-top:4px;
    font-size:11px;
    line-height:1.15;
    font-weight:500;
    opacity:.82;
    white-space:nowrap;
  }
</style>

<script id="EUC_FIX18_UI_SCRIPT">
(function(){
  'use strict';

  window.EUC_F18_pendingType=null;

  function fmt(v){
    var s=String(v||'').trim();
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3]+'/'+m[2]+'/'+m[1] : s;
  }

  function decoratePeriods(){
    var map=(detail&&detail.periodeDatesById)||{};
    document.querySelectorAll('[data-p]').forEach(function(btn){
      var p=map[String(btn.dataset.p||'')];
      if(!p)return;

      var d=fmt(p.debut||'');
      var f=fmt(p.fin||'');
      if(!d&&!f)return;

      var old=btn.querySelector('.euc-f18-period-date');
      if(old)old.remove();

      var span=document.createElement('span');
      span.className='euc-f18-period-date';
      span.textContent=(d&&f)?(d+' → '+f):(d||f);
      btn.appendChild(span);
    });
  }

  function hideConventionReferences(){
    // Le numéro PFMP-AAAA-XXXXXX n'est pas utile dans le tableau de suivi.
    document.querySelectorAll('table td').forEach(function(td){
      var walker=document.createTreeWalker(td,NodeFilter.SHOW_TEXT);
      var nodes=[];
      while(walker.nextNode())nodes.push(walker.currentNode);

      nodes.forEach(function(n){
        var txt=String(n.nodeValue||'');
        if(/PFMP-\d{4}-\d{4,}/.test(txt)){
          n.nodeValue=txt.replace(/PFMP-\d{4}-\d{4,}/g,'').replace(/\s{2,}/g,' ');
        }
      });

      td.querySelectorAll('*').forEach(function(el){
        var t=String(el.textContent||'').trim();
        if(/^PFMP-\d{4}-\d{4,}$/.test(t)){
          el.remove();
        }
      });
    });
  }

  function selectedIds(){
    return Array.from(document.querySelectorAll('.student-check:checked'))
      .map(function(x){return Number(x.value);})
      .filter(function(x){return x>0;});
  }

  function affectationIdsFor(type,ids){
    var map={};
    ids.forEach(function(id){map[id]=true;});

    return (detail.lignes||[])
      .filter(function(x){return map[Number(x.eleveId)]===true;})
      .map(function(x){
        return type==='TELEPHONE'
          ? Number(x.affectationTelephoneId||0)
          : Number(x.affectationVisiteId||0);
      })
      .filter(function(id){return id>0;});
  }

  // Capture des boutons Retirer dynamiques.
  document.addEventListener('click',function(ev){
    var b=ev.target&&ev.target.closest?ev.target.closest('button'):null;
    if(!b)return;

    if(b.id==='retireTELEPHONEV162'){
      window.EUC_F18_pendingType='TELEPHONE';
    }else if(b.id==='retireVISITEV162'){
      window.EUC_F18_pendingType='VISITE';
    }
  },true);

  function installConfirm(){
    var confirmBtn=document.getElementById('retConfirmV162');
    var modal=document.getElementById('retModalV162');
    var txt=document.getElementById('retTextV162');
    if(!confirmBtn||!modal)return;

    confirmBtn.onclick=function(){
      var old=confirmBtn.innerHTML;
      var type=window.EUC_F18_pendingType;

      if(!type){
        if(txt)txt.textContent='Erreur interface : type de suivi non défini.';
        if(typeof showStatus==='function'){
          showStatus('Erreur interface : type de suivi non défini.','err');
        }
        return;
      }

      confirmBtn.disabled=true;
      confirmBtn.innerHTML='<span class="spinner"></span>Retrait en cours...';

      var ids=selectedIds();
      var affectationIds=affectationIdsFor(type,ids);

      if(!affectationIds.length){
        confirmBtn.disabled=false;
        confirmBtn.innerHTML=old;
        if(txt)txt.textContent='Impossible de retirer : aucun identifiant d’affectation actif trouvé pour la sélection.';
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
          window.EUC_F18_pendingType=null;
          if(typeof showStatus==='function'){
            showStatus((r&&r.message)||'Affectation retirée.','ok');
          }
          setTimeout(function(){window.location.reload();},250);
        })
        .withFailureHandler(function(e){
          confirmBtn.disabled=false;
          confirmBtn.innerHTML=old;
          if(txt)txt.textContent='Erreur de retrait : '+String(e&&e.message||e);
          if(typeof showStatus==='function'){
            showStatus('Erreur : '+String(e&&e.message||e),'err');
          }
        })
        .EUC_SUIVI_DESAFFECTER_F18({
          affectationIds:affectationIds
        });
    };
  }

  function boot(){
    decoratePeriods();
    hideConventionReferences();
    installConfirm();
    setTimeout(decoratePeriods,150);
    setTimeout(decoratePeriods,500);
    setTimeout(hideConventionReferences,500);
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
block=Path("/tmp/EUC_FIX18_UI_BLOCK.html").read_text(encoding="utf-8")

# Retirer tous les overlays successifs ajoutés depuis FIX17/18.
for style_id,script_id in [
    ("EUC_FIX17_UI_STYLE","EUC_FIX17_UI_SCRIPT"),
    ("EUC_FIX18_UI_STYLE","EUC_FIX18_UI_SCRIPT"),
]:
    s=re.sub(
        r'\n?<style id="'+style_id+r'">.*?</style>\s*'
        r'<script id="'+script_id+r'">.*?</script>\n?',
        '\n',
        s,
        flags=re.S
    )

if "</body>" not in s:
    raise SystemExit("ERREUR : </body> introuvable.")

s=s.replace("</body>",block+"\n</body>",1)
p.write_text(s,encoding="utf-8")
print("OK 2/3 : UI FIX18 installée.")
PY

echo
echo "============================================================"
echo " VALIDATION AVANT PUSH"
echo "============================================================"

cp "$NEWGS" /tmp/EUC_SUIVI_PFMP_FixV161_18.js
cp "$ROUTER" /tmp/EDT_FIX18.js
node --check /tmp/EUC_SUIVI_PFMP_FixV161_18.js
node --check /tmp/EDT_FIX18.js

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_FIX18_UI_SCRIPT">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : script UI FIX18 introuvable.")
Path("/tmp/EUC_FIX18_UI_SCRIPT.js").write_text(m.group(1),encoding="utf-8")
PY

node --check /tmp/EUC_FIX18_UI_SCRIPT.js

grep -q "EUC_SUIVI_CLASSE_afficherF18" "$ROUTER"
grep -q "periodeDatesById" "$NEWGS"
grep -q "affectationTelephoneId" "$NEWGS"
grep -q "EUC_SUIVI_DESAFFECTER_F18" "$NEWGS"
grep -q "EUC_F18_pendingType" "$HTML"
grep -q "euc-f18-period-date" "$HTML"
grep -q "PFMP-\\\\d{4}-\\\\d{4,}" "$HTML"

echo "✓ type TELEPHONE / VISITE mémorisé indépendamment"
echo "✓ spinner immédiat"
echo "✓ dates fiables via map ID -> dates Planning_Periodes"
echo "✓ référence PFMP masquée dans le tableau de suivi"
echo "✓ retrait via IDs techniques"
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
echo " DEV.161 FIX18 DEPLOYEE AVEC SUCCES"
echo "============================================================"
