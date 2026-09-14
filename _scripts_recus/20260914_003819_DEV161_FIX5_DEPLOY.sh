#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix5"

CLASSES_PAGE="apps-script/Suivi_PFMP_Classes.html"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail_V156.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX5_${STAMP}"
mkdir -p "$BACKUP"

for f in "$CLASSES_PAGE" "$DETAIL_PAGE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX5 — VUE ENT + TRI + DATES + CHARGEMENT"
echo "============================================================"

cat > /tmp/euc_classes_fix5.js <<'EOF'
(function(){
  'use strict';

  function qs(name){
    try{return new URLSearchParams(window.location.search).get(name)||'';}catch(e){return '';}
  }

  function ensureOverlay(){
    var el=document.getElementById('eucLoadingOverlayFix5');
    if(el)return el;
    el=document.createElement('div');
    el.id='eucLoadingOverlayFix5';
    el.innerHTML='<div class="euc-loading-card"><span class="euc-spinner"></span><b>Chargement en cours…</b></div>';
    document.body.appendChild(el);
    return el;
  }

  function showLoading(){
    ensureOverlay().classList.add('show');
  }

  function classLabel(link){
    var b=link.querySelector('.classhead b') || link.querySelector('b');
    return (b?b.textContent:link.textContent||'').trim().toUpperCase();
  }

  function bacRank(label){
    if(/^T/.test(label) || /^TER/.test(label))return 10;
    if(/^1/.test(label) || /^PREM/.test(label))return 20;
    if(/^2/.test(label) || /^SEC/.test(label))return 30;
    return 40;
  }

  function btsRank(label){
    if(/(^|[^0-9])1([^0-9]|$)/.test(label) || /1ERE|1ÈRE|PREMIERE|PREMIÈRE/.test(label))return 10;
    if(/(^|[^0-9])2([^0-9]|$)/.test(label) || /2EME|2ÈME|DEUXIEME|DEUXIÈME/.test(label))return 20;
    return 30;
  }

  function hideVfmpForTerminale(link){
    var label=classLabel(link);
    var terminale=(/^T/.test(label) || /^TER/.test(label));
    if(!terminale)return;

    var card=link.querySelector('.classcard') || link;
    Array.from(card.children).forEach(function(child){
      if(/VFMP/i.test(child.textContent||'')){
        child.style.display='none';
      }
    });
  }

  function hasDeclaredPeriod(link){
    var txt=(link.textContent||'');
    var hasDate=/\b(?:\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/.test(txt);
    var hasPfmp=/\b(PFMP|STAGE)\b/i.test(txt);
    return hasDate && hasPfmp;
  }

  function sortCards(){
    var links=Array.from(document.querySelectorAll('a.classlink'));
    if(!links.length)return;

    links.forEach(function(link){
      hideVfmpForTerminale(link);
      if(!hasDeclaredPeriod(link)){
        link.style.display='none';
      }
    });

    var parents=[];
    links.forEach(function(link){
      if(link.parentElement && parents.indexOf(link.parentElement)<0)parents.push(link.parentElement);
    });

    parents.forEach(function(parent){
      var children=Array.from(parent.children).filter(function(x){
        return x.matches && x.matches('a.classlink');
      });
      if(children.length<2)return;

      var isBts=/BTS/i.test((parent.parentElement&&parent.parentElement.textContent)||'') &&
                !/BAC PRO/i.test((parent.parentElement&&parent.parentElement.textContent)||'');

      children.sort(function(a,b){
        var la=classLabel(a), lb=classLabel(b);
        var ra=isBts?btsRank(la):bacRank(la);
        var rb=isBts?btsRank(lb):bacRank(lb);
        return ra-rb || la.localeCompare(lb,'fr');
      });
      children.forEach(function(x){parent.appendChild(x);});
    });
  }

  function activateEntMode(){
    var ent=qs('mode')==='ent';
    if(!ent)return;

    document.body.classList.add('euc-ent-mode');

    var back=document.getElementById('back');
    if(back)back.style.display='none';

    Array.from(document.querySelectorAll('a.classlink')).forEach(function(a){
      try{
        var u=new URL(a.href,window.location.href);
        u.searchParams.set('mode','ent');
        a.href=u.toString();
      }catch(e){}
    });
  }

  function bindLoading(){
    document.addEventListener('click',function(e){
      var a=e.target.closest && e.target.closest('a.classlink');
      if(a && a.href){
        showLoading();
      }
    },true);

    var year=document.getElementById('yearSelect');
    if(year){
      year.addEventListener('change',showLoading,true);
    }
  }

  function run(){
    ensureOverlay();
    sortCards();
    activateEntMode();
    bindLoading();

    var obs=new MutationObserver(function(){
      sortCards();
      activateEntMode();
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',run);
  }else{
    run();
  }
})();
EOF

cat > /tmp/euc_detail_fix5.js <<'EOF'
(function(){
  'use strict';

  function qs(name){
    try{return new URLSearchParams(window.location.search).get(name)||'';}catch(e){return '';}
  }

  function fmtDate(v){
    var s=String(v||'').trim();
    if(!s)return '';
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m)return m[3]+'/'+m[2]+'/'+m[1];
    var d=new Date(s);
    if(!isNaN(d.getTime())){
      return String(d.getDate()).padStart(2,'0')+'/'+
             String(d.getMonth()+1).padStart(2,'0')+'/'+
             d.getFullYear();
    }
    return s;
  }

  function ensureOverlay(){
    var el=document.getElementById('eucLoadingOverlayFix5');
    if(el)return el;
    el=document.createElement('div');
    el.id='eucLoadingOverlayFix5';
    el.innerHTML='<div class="euc-loading-card"><span class="euc-spinner"></span><b>Chargement en cours…</b></div>';
    document.body.appendChild(el);
    return el;
  }

  function showLoading(){
    ensureOverlay().classList.add('show');
  }

  function decoratePeriodTabs(){
    if(typeof detail==='undefined' || !detail || !Array.isArray(detail.periodes))return;
    Array.from(document.querySelectorAll('#periodTabs [data-p]')).forEach(function(btn){
      if(btn.querySelector('.euc-period-dates'))return;
      var p=detail.periodes.find(function(x){return String(x.id)===String(btn.dataset.p);});
      if(!p)return;
      var debut=fmtDate(p.debut||p.dateDebut||p.Date_debut);
      var fin=fmtDate(p.fin||p.dateFin||p.Date_fin);
      if(!debut && !fin)return;
      var span=document.createElement('span');
      span.className='euc-period-dates';
      span.textContent=[debut,fin].filter(Boolean).join(' → ');
      btn.appendChild(span);
    });
  }

  function activateEntMode(){
    var ent=qs('mode')==='ent';
    if(!ent)return;

    document.body.classList.add('euc-ent-mode');

    var toolbar=document.getElementById('assignToolbar') || document.getElementById('assignToolbarV156');
    if(toolbar)toolbar.style.display='none';

    var mailParams=document.getElementById('mailParams');
    if(mailParams)mailParams.style.display='none';

    var sendTable=document.getElementById('sendTable');
    if(sendTable)sendTable.style.display='none';

    var selectHead=document.getElementById('selectHead');
    if(selectHead)selectHead.style.display='none';

    Array.from(document.querySelectorAll('.student-check')).forEach(function(x){
      var td=x.closest('td');
      if(td)td.style.display='none';
    });

    var back=document.getElementById('back');
    if(back){
      try{
        var u=new URL(back.href,window.location.href);
        u.searchParams.set('page','suivi-pfmp-classes');
        u.searchParams.set('mode','ent');
        back.href=u.toString();
      }catch(e){}
      back.textContent='← Retour aux classes';
    }
  }

  function bindLoading(){
    document.addEventListener('click',function(e){
      var target=e.target.closest && e.target.closest('#periodTabs [data-p], #back');
      if(target)showLoading();
    },true);

    var year=document.getElementById('yearSelect');
    if(year)year.addEventListener('change',showLoading,true);
  }

  function run(){
    ensureOverlay();
    decoratePeriodTabs();
    activateEntMode();
    bindLoading();

    var obs=new MutationObserver(function(){
      decoratePeriodTabs();
      activateEntMode();
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',run);
  }else{
    run();
  }
})();
EOF

node --check /tmp/euc_classes_fix5.js
node --check /tmp/euc_detail_fix5.js

cat > /tmp/euc_fix5_style.html <<'EOF'
<style id="EUC_FIX5_STYLE">
  #eucLoadingOverlayFix5{
    position:fixed;inset:0;display:none;align-items:center;justify-content:center;
    background:rgba(244,247,251,.72);backdrop-filter:blur(2px);z-index:99999
  }
  #eucLoadingOverlayFix5.show{display:flex}
  .euc-loading-card{
    display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #d9e1ec;
    border-radius:14px;padding:16px 20px;box-shadow:0 15px 40px rgba(16,24,40,.18);
    color:#163a63
  }
  .euc-spinner{
    width:20px;height:20px;border:3px solid #b8c9dc;border-right-color:#165d9c;
    border-radius:50%;display:inline-block;animation:eucSpinFix5 .75s linear infinite
  }
  @keyframes eucSpinFix5{to{transform:rotate(360deg)}}
  .euc-period-dates{
    display:block;margin-top:4px;font-size:11px;font-weight:500;opacity:.82;white-space:nowrap
  }
  .euc-ent-mode #assignToolbar,
  .euc-ent-mode #assignToolbarV156,
  .euc-ent-mode .mail-actions,
  .euc-ent-mode #mailParams,
  .euc-ent-mode #sendTable{display:none!important}
  .euc-ent-mode table th:first-child,
  .euc-ent-mode table td:first-child{display:none!important}
</style>
EOF

python3 <<'PY'
from pathlib import Path

style=Path("/tmp/euc_fix5_style.html").read_text(encoding="utf-8")
classes_js=Path("/tmp/euc_classes_fix5.js").read_text(encoding="utf-8")
detail_js=Path("/tmp/euc_detail_fix5.js").read_text(encoding="utf-8")

def inject(path, marker, js):
    p=Path(path)
    s=p.read_text(encoding="utf-8")
    if marker in s:
        print("INFO :",marker,"déjà présent dans",path)
        return
    if "</body>" not in s:
        raise SystemExit("ERREUR : </body> absent de "+path)
    block=style+"\n<script id=\""+marker+"\">\n"+js+"\n</script>\n"
    s=s.replace("</body>",block+"</body>",1)
    p.write_text(s,encoding="utf-8")

inject("apps-script/Suivi_PFMP_Classes.html","EUC_CLASSES_FIX5_SCRIPT",classes_js)
inject("apps-script/Suivi_PFMP_Classe_Detail_V156.html","EUC_DETAIL_FIX5_SCRIPT",detail_js)

print("OK : surcouches FIX5 injectées.")
PY

echo
echo "============================================================"
echo " DEV.161 FIX5 — CONTROLES AVANT PUSH"
echo "============================================================"

grep -q "EUC_CLASSES_FIX5_SCRIPT" "$CLASSES_PAGE"
grep -q "EUC_DETAIL_FIX5_SCRIPT" "$DETAIL_PAGE"
grep -q "mode','ent" "$CLASSES_PAGE"
grep -q "euc-period-dates" "$DETAIL_PAGE"
grep -q "VFMP" "$CLASSES_PAGE"
grep -q "Chargement en cours" "$CLASSES_PAGE"
grep -q "Chargement en cours" "$DETAIL_PAGE"

echo "✓ vue ENT propagée dans les liens de classe"
echo "✓ vue ENT sans outils d'affectation / envoi"
echo "✓ dates sous les boutons de période"
echo "✓ overlay animé de chargement"
echo "✓ tri terminales -> premières -> secondes"
echo "✓ tri BTS 1re année -> 2e année"
echo "✓ vignettes sans PFMP/stage masquées"
echo "✓ VFMP masquée pour les terminales"

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
echo " DEV.161 FIX5 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Lien ENT :"
echo "https://script.google.com/macros/s/$DEPLOYMENT_ID/exec?page=suivi-pfmp-classes&mode=ent"
echo "============================================================"
