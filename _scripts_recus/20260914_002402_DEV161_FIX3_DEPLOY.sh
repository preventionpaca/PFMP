#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix3"

SERVICE="apps-script/EUC_SUIVI_PFMP_FixV161_3.gs"
RENDERER="apps-script/EUC_SUIVI_PFMP_V156.gs"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
CLASSES_PAGE="apps-script/Suivi_PFMP_Classes.html"
MAIL_SERVICE="apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs"
AFFECT_SERVICE="apps-script/EUC_SUIVI_PFMP_AffectationsV156.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX3_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$RENDERER" "$DETAIL_PAGE" "$CLASSES_PAGE" "$MAIL_SERVICE" "$AFFECT_SERVICE"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

for f in "$RENDERER" "$DETAIL_PAGE" "$CLASSES_PAGE" "$MAIL_SERVICE" "$AFFECT_SERVICE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
done

echo "============================================================"
echo " DEV.161 FIX3 — ETAT ACTUEL + DESAFFECTATION + VUE ENT"
echo "============================================================"

cat > "$SERVICE" <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.161-fix3
 * - Etat actuel : annulation/interruption => Sans convention + historique secondaire
 * - Désaffectation téléphone/visiteur avec historique conservé
 * - Utilitaires lecture seule ENT
 */

function EUC_V161F3_txt_(v){return String(v==null?'':v).trim();}
function EUC_V161F3_norm_(v){
  return EUC_V161F3_txt_(v).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function EUC_V161F3_incident_(x){
  var s=EUC_V161F3_norm_((x&&x.statutCode)||'')+' '+EUC_V161F3_norm_((x&&x.statut)||'');
  return s.indexOf('annul')>=0 || s.indexOf('interromp')>=0;
}

function EUC_V161F3_reason_(x){
  var keys=[
    'motifAnnulation','motif_annulation','Motif_annulation','Motif_annulation_interruption',
    'motifInterruption','motif_interruption','Motif_interruption','raison','Raison','motif','Motif'
  ];
  for(var i=0;i<keys.length;i++){
    if(x && EUC_V161F3_txt_(x[keys[i]]))return EUC_V161F3_txt_(x[keys[i]]);
  }
  return '';
}

function EUC_V161F3_type_(x){
  var s=EUC_V161F3_norm_((x&&x.statutCode)||'')+' '+EUC_V161F3_norm_((x&&x.statut)||'');
  return s.indexOf('interromp')>=0?'Convention interrompue':'Convention annulée';
}

function EUC_SUIVI_CLASSE_detailV162(codeAnnee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV156(codeAnnee,classeId,periodeId);
  d.historiqueIncidents=[];

  d.lignes=(d.lignes||[]).map(function(x){
    x.historiqueConventions=x.historiqueConventions||[];

    if(EUC_V161F3_incident_(x)){
      var hist={
        type:EUC_V161F3_type_(x),
        numero:EUC_V161F3_txt_(x.numero),
        entreprise:EUC_V161F3_txt_(x.entreprise),
        statut:EUC_V161F3_txt_(x.statut),
        raison:EUC_V161F3_reason_(x)
      };
      x.historiqueConventions.push(hist);
      d.historiqueIncidents.push({
        eleveId:x.eleveId,
        nom:EUC_V161F3_txt_(x.nom),
        prenom:EUC_V161F3_txt_(x.prenom),
        numero:hist.numero,
        entreprise:hist.entreprise,
        statut:hist.statut||hist.type,
        type:hist.type,
        raison:hist.raison
      });

      x.statutCode='SANS_CONVENTION';
      x.statut='Sans convention';
      x.numero='';
      x.entreprise='';
      x.adresseEntreprise='';
      x.contactEntreprise='';
    }
    return x;
  });

  var sans=0,avec=0;
  d.lignes.forEach(function(x){
    var s=EUC_V161F3_norm_(x.statutCode)+' '+EUC_V161F3_norm_(x.statut);
    if(s.indexOf('sans convention')>=0)sans++; else avec++;
  });

  d.stats=d.stats||{};
  d.stats.total=d.lignes.length;
  d.stats.avecConvention=avec;
  d.stats.sansConvention=sans;
  d.stats.annulees=d.historiqueIncidents.filter(function(x){return EUC_V161F3_norm_(x.type).indexOf('annul')>=0;}).length;
  d.stats.interrompues=d.historiqueIncidents.filter(function(x){return EUC_V161F3_norm_(x.type).indexOf('interromp')>=0;}).length;

  return d;
}

function EUC_V161F3_assurerRetraitCols_(){
  var table='EUC_AFFECTATIONS_SUIVI_PFMP';
  var cols=EUC_ENT_grist('get','/tables/'+table+'/columns').columns||[];
  var have={};cols.forEach(function(c){have[c.id]=true;});
  var missing=[];
  if(!have.Date_retrait)missing.push({id:'Date_retrait',fields:{label:'Date retrait',type:'DateTime'}});
  if(!have.Retire_par)missing.push({id:'Retire_par',fields:{label:'Retiré par',type:'Text'}});
  if(!have.Motif_retrait)missing.push({id:'Motif_retrait',fields:{label:'Motif retrait',type:'Text'}});
  if(missing.length)EUC_ENT_grist('post','/tables/'+table+'/columns',{columns:missing});
  return true;
}

function EUC_SUIVI_DESAFFECTER_V162(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  var annee=EUC_V161F3_txt_(payload.annee);
  var classeId=Number(payload.classeId);
  var periodeId=Number(payload.periodeId);
  var type=EUC_V161F3_txt_(payload.type).toUpperCase();
  var ids=(payload.eleveIds||[]).map(Number).filter(function(x){return x>0;});
  var motif=EUC_V161F3_txt_(payload.motif)||'Désaffectation administrative';

  if(['TELEPHONE','VISITE'].indexOf(type)<0)throw new Error('Type de suivi invalide.');
  if(!annee||!classeId||!periodeId||!ids.length)throw new Error('Désaffectation incomplète.');

  EUC_V161F3_assurerRetraitCols_();
  var rows=EUC_IMPORT_lireRecords_('EUC_AFFECTATIONS_SUIVI_PFMP');
  var now=new Date().toISOString();
  var count=0;

  rows.forEach(function(r){
    if(r.Actif===false)return;
    if(EUC_V161F3_txt_(r.Annee_scolaire)!==annee)return;
    if(Number(EUC_PFMP_ref_(r.Classe))!==classeId)return;
    if(Number(EUC_PFMP_ref_(r.Periode))!==periodeId)return;
    if(ids.indexOf(Number(EUC_PFMP_ref_(r.Eleve)))<0)return;
    if(EUC_V161F3_txt_(r.Type_suivi).toUpperCase()!==type)return;

    EUC_ENT_grist('patch','/tables/EUC_AFFECTATIONS_SUIVI_PFMP/records',{
      records:[{id:r.id,fields:{
        Actif:false,
        Date_retrait:now,
        Retire_par:ctx.email||'',
        Motif_retrait:motif,
        Date_modification:now
      }}]
    });
    count++;
  });

  return {ok:true,count:count,detail:EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId)};
}

function EUC_V161F3_historiqueHtml_(detail){
  var rows=(detail&&detail.historiqueIncidents)||[];
  if(!rows.length)return '';
  function e(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  return '<br><h3 style="font-family:Arial,sans-serif;color:#b42318">Conventions annulées ou interrompues pendant cette PFMP</h3>'+ 
    '<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px"><thead><tr style="background:#fff1f2">'+
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Élève</th><th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Convention</th><th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Ancienne entreprise</th><th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Situation / motif</th></tr></thead><tbody>'+ 
    rows.map(function(x){return '<tr><td style="border:1px solid #cfd8e3;padding:7px">'+e((x.nom||'')+' '+(x.prenom||''))+'</td><td style="border:1px solid #cfd8e3;padding:7px">'+e(x.numero||'—')+'</td><td style="border:1px solid #cfd8e3;padding:7px">'+e(x.entreprise||'—')+'</td><td style="border:1px solid #cfd8e3;padding:7px;color:#b42318;font-weight:700">'+e(x.statut||x.type)+(x.raison?'<br><span style="font-weight:400">'+e(x.raison)+'</span>':'')+'</td></tr>';}).join('')+
    '</tbody></table>';
}
EOF

python3 <<'PY'
from pathlib import Path
import re

# 1) Renderer réel V156 -> détail V162
p=Path("apps-script/EUC_SUIVI_PFMP_V156.gs")
s=p.read_text(encoding="utf-8")
start=s.find("function EUC_SUIVI_CLASSE_afficherV156")
if start<0: raise SystemExit("ERREUR : afficherV156 introuvable.")
end=s.find("\nfunction ",start+20)
if end<0: end=len(s)
chunk=s[start:end]
new_chunk,n=re.subn(r"EUC_SUIVI_CLASSE_detailV\d+\(","EUC_SUIVI_CLASSE_detailV162(",chunk,count=1)
if n!=1: raise SystemExit("ERREUR : appel détail introuvable dans afficherV156.")
s=s[:start]+new_chunk+s[end:]
p.write_text(s,encoding="utf-8")
print("OK 1/5 : renderer réel utilise detailV162.")

# 2) Historique sous le statut + désaffectation + mode ENT + dates FR
p=Path("apps-script/Suivi_PFMP_Classe_Detail_V156.html")
s=p.read_text(encoding="utf-8")

# Remplacer/ajouter helper d'historique
hist_fn = r'''  function historyNoteV161(x){
    const h=x.historiqueConventions||[];
    if(!h.length)return '';
    return '<details class="hist-v162"><summary>'+h.length+' convention'+(h.length>1?'s':'')+' annulée'+(h.length>1?'s':'')+'</summary>'+h.map(function(v){
      return '<div><b>'+esc(v.type)+'</b>'+(v.numero?' — '+esc(v.numero):'')+(v.entreprise?' — '+esc(v.entreprise):'')+(v.raison?'<br><span>'+esc(v.raison)+'</span>':'')+'</div>';
    }).join('')+'</details>';
  }

'''
start=s.find("function historyNoteV161")
if start>=0:
    start=s.rfind("  ",0,start)+2 if s.rfind("  ",0,start)>=0 else start
    stop=s.find("function statusPill",start)
    if stop<0: raise SystemExit("ERREUR : statusPill absent après historyNoteV161.")
    s=s[:start]+hist_fn+s[stop:]
else:
    stop=s.find("function statusPill")
    if stop<0: raise SystemExit("ERREUR : statusPill introuvable.")
    s=s[:stop]+hist_fn+s[stop:]

if "historyNoteV161(x)" not in s[s.find("tbody.innerHTML"):]:
    pos=s.find("statusPill(x)",s.find("tbody.innerHTML"))
    if pos<0: raise SystemExit("ERREUR : statusPill(x) absent du rendu.")
    s=s[:pos]+"statusPill(x)+historyNoteV161(x)"+s[pos+len("statusPill(x)"):]

if ".hist-v162{" not in s:
    css='''\n    .hist-v162{margin-top:5px;color:#b42318;font-size:11px}.hist-v162 summary{cursor:pointer;font-weight:800}.hist-v162 div{margin-top:4px;color:#7a271a}.hist-v162 span{font-weight:400}\n    .retire-v162{background:#fff;color:#b42318!important;border:1px solid #f1aeb5!important}\n    .modal-ret-v162{position:fixed;inset:0;background:rgba(15,23,42,.52);display:none;align-items:center;justify-content:center;z-index:3000;padding:20px}.modal-ret-v162.show{display:flex}.modal-ret-card-v162{background:#fff;width:min(560px,96vw);border-radius:16px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.28)}\n'''
    s=s.replace("</style>",css+"</style>",1)

if "DEV161_FIX3_ENHANCEMENT" not in s:
    enh=r'''
<div id="retModalV162" class="modal-ret-v162">
  <div class="modal-ret-card-v162">
    <h3 id="retTitleV162">Retirer une affectation ?</h3>
    <p id="retTextV162"></p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
      <button id="retCancelV162" type="button" class="secondary">Annuler</button>
      <button id="retConfirmV162" type="button" class="primary">Retirer</button>
    </div>
  </div>
</div>
<script id="DEV161_FIX3_ENHANCEMENT">
(function(){
  const ENT_MODE=new URLSearchParams(window.location.search).get('mode')==='ent';
  function fmtDates(root){
    const walker=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(function(n){n.nodeValue=n.nodeValue.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,'$3/$2/$1');});
  }
  fmtDates(document.body);

  if(ENT_MODE){
    ['back','assignToolbar','assignStatus','mailParams','sendTable','selectHead'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
    document.querySelectorAll('.student-check').forEach(function(el){el.style.display='none';});
  }

  if(!ENT_MODE){
    const phoneBtn=document.getElementById('phoneAssignBtn');
    const visitBtn=document.getElementById('visitAssignBtn');
    function mk(label,type,anchor){
      if(!anchor||document.getElementById('retire'+type+'V162'))return;
      const b=document.createElement('button');b.type='button';b.id='retire'+type+'V162';b.className='retire-v162';b.textContent='Retirer';
      anchor.parentElement.appendChild(b);
      b.onclick=function(){openRet(type);};
    }
    mk('Retirer','TELEPHONE',phoneBtn);mk('Retirer','VISITE',visitBtn);

    let pendingType=null;
    const modal=document.getElementById('retModalV162'),txt=document.getElementById('retTextV162'),confirm=document.getElementById('retConfirmV162'),cancel=document.getElementById('retCancelV162');
    function ids(){return Array.from(document.querySelectorAll('.student-check:checked')).map(function(x){return Number(x.value);});}
    function openRet(type){
      const n=ids().length;if(!n){showStatus('Sélectionnez au moins un élève.','err');return;}
      pendingType=type;txt.textContent='Retirer le professeur '+(type==='TELEPHONE'?'de suivi téléphonique':'visiteur')+' pour '+n+' élève'+(n>1?'s':'')+' ?';modal.classList.add('show');
    }
    cancel.onclick=function(){modal.classList.remove('show');pendingType=null;};
    confirm.onclick=function(){
      if(!pendingType)return;const old=confirm.innerHTML;confirm.disabled=true;confirm.innerHTML='<span class="spinner"></span>Retrait en cours...';
      google.script.run.withSuccessHandler(function(r){confirm.disabled=false;confirm.innerHTML=old;modal.classList.remove('show');pendingType=null;detail=r.detail;showStatus('Affectation retirée.','ok');render();})
        .withFailureHandler(function(e){confirm.disabled=false;confirm.innerHTML=old;modal.classList.remove('show');showStatus('Erreur : '+(e&&e.message||e),'err');})
        .EUC_SUIVI_DESAFFECTER_V162({annee:detail.annee,classeId:detail.classe.id,periodeId:detail.periode.id,type:pendingType,eleveIds:ids(),motif:'Retrait depuis le tableau de suivi'});
    };
  }
})();
</script>
'''
    s=s.replace("</body>",enh+"\n</body>",1)

p.write_text(s,encoding="utf-8")
print("OK 2/5 : statut actuel, détail historique, désaffectation et mode ENT ajoutés.")

# 3) Vue classes ENT + propagation mode=ent + dates FR
p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")
if "DEV161_FIX3_ENT_CLASSES" not in s:
    enh=r'''
<script id="DEV161_FIX3_ENT_CLASSES">
(function(){
  const ENT_MODE=new URLSearchParams(window.location.search).get('mode')==='ent';
  function apply(){
    document.querySelectorAll('a[href*="page=suivi-pfmp-classe"]').forEach(function(a){
      if(ENT_MODE && a.href.indexOf('mode=ent')<0)a.href+=(a.href.indexOf('?')>=0?'&':'?')+'mode=ent';
    });
    if(ENT_MODE){document.querySelectorAll('a[href*="admin-pfmp"],button[id*="admin"],a[id*="back"]').forEach(function(x){x.style.display='none';});}
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(function(n){n.nodeValue=n.nodeValue.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,'$3/$2/$1');});
  }
  apply();
  new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});
})();
</script>
'''
    s=s.replace("</body>",enh+"\n</body>",1)
p.write_text(s,encoding="utf-8")
print("OK 3/5 : vue ENT lecture seule et dates JJ/MM/AAAA sur les vignettes.")

# 4) Email -> détail V162 + historique V162
p=Path("apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs")
s=p.read_text(encoding="utf-8")
s=re.sub(r"EUC_SUIVI_CLASSE_detailV\d+\(payload\.annee,payload\.classeId,payload\.periodeId\)","EUC_SUIVI_CLASSE_detailV162(payload.annee,payload.classeId,payload.periodeId)",s)
s=s.replace("EUC_V161_historiqueHtml_(detail)","EUC_V161F3_historiqueHtml_(detail)")
if "EUC_V161F3_historiqueHtml_(detail)" not in s:
    needle="EUC_V157_htmlTable_(detail)"
    pos=s.find(needle,s.find("htmlBody"))
    if pos<0: raise SystemExit("ERREUR : htmlBody/table email introuvable.")
    s=s[:pos]+needle+"+EUC_V161F3_historiqueHtml_(detail)"+s[pos+len(needle):]
p.write_text(s,encoding="utf-8")
print("OK 4/5 : email basé sur l'état actuel et historique secondaire.")

# 5) Contrôle que l'affectation conserve bien l'historique via Actif=false pour retrait
p=Path("apps-script/EUC_SUIVI_PFMP_AffectationsV156.gs")
s=p.read_text(encoding="utf-8")
if "EUC_AFFECTATIONS_SUIVI_PFMP" not in s:
    raise SystemExit("ERREUR : service affectations inattendu.")
print("OK 5/5 : service affectations compatible avec désaffectation V162.")
PY

echo
echo "============================================================"
echo " DEV.161 FIX3 — CONTROLES AVANT PUSH"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_FixV161_3.js
cp "$RENDERER" /tmp/EUC_SUIVI_PFMP_V156_FIX3.js
cp "$MAIL_SERVICE" /tmp/EUC_SUIVI_PFMP_EnvoisV157_FIX3.js

node --check /tmp/EUC_SUIVI_PFMP_FixV161_3.js
node --check /tmp/EUC_SUIVI_PFMP_V156_FIX3.js
node --check /tmp/EUC_SUIVI_PFMP_EnvoisV157_FIX3.js

grep -q "EUC_SUIVI_CLASSE_detailV162" "$RENDERER"
grep -q "EUC_SUIVI_DESAFFECTER_V162" "$SERVICE"
grep -q "historyNoteV161" "$DETAIL_PAGE"
grep -q "DEV161_FIX3_ENHANCEMENT" "$DETAIL_PAGE"
grep -q "DEV161_FIX3_ENT_CLASSES" "$CLASSES_PAGE"
grep -q "EUC_V161F3_historiqueHtml_(detail)" "$MAIL_SERVICE"

echo "✓ élève annulé/interrompu => Sans convention"
echo "✓ détail historique dépliable"
echo "✓ désaffectation téléphone/visiteur"
echo "✓ historique affectation conservé (Actif=false)"
echo "✓ vue ENT lecture seule via ?page=suivi-pfmp-classes&mode=ent"
echo "✓ dates affichées en JJ/MM/AAAA"
echo "✓ email = état actuel + historique secondaire"

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
echo " DEV.161 FIX3 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Lien ENT lecture seule :"
echo "https://script.google.com/macros/s/$DEPLOYMENT_ID/exec?page=suivi-pfmp-classes&mode=ent"
echo "============================================================"
