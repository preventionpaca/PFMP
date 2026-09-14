#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.146"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV146_${STAMP}"
mkdir -p "$BACKUP"

SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
ADMIN="apps-script/Admin_PFMP.html"
PAGE="apps-script/Admin_Conventions_PFMP.html"

for f in "$SERVICE" "$ADMIN" "$PAGE"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

cat >> "$SERVICE" <<'EOF'

/* DEV.146 — Centre administratif des conventions */
function EUC_ADMIN_WORKFLOW_listerDossiersV146(){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var rows=EUC_CONVENTION_lireAccesFraisV108_();
  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP'),byEleve={};
  eleves.forEach(function(e){byEleve[Number(e.id)]=e;});

  return rows.filter(function(a){
    return !!(a.Date_saisie_entreprise||a.Numero_enregistrement||a.Entreprise_raison_sociale||a.Statut==='ENTREPRISE_SAISIE');
  }).map(function(a){
    var e=byEleve[Number(EUC_PFMP_ref_(a.Eleve))]||{};
    var nom=String(e.Nom||a.Eleve_nom||a.Nom_eleve||'').trim();
    var prenom=String(e.Prenom_usage||e.Prenom||a.Eleve_prenom||'').trim();
    return {
      id:Number(a.id),
      numero:EUC_ADMIN_WORKFLOW_numeroV144_(a),
      nom:nom,prenom:prenom,
      jeune:[prenom,nom].filter(Boolean).join(' '),
      classe:String(a.Classe_convention_nom||''),
      entreprise:String(a.Entreprise_raison_sociale||''),
      statut:String(a.Statut_administratif||'INFORMATIONS_ENREGISTREES'),
      dateDebut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),
      dateFin:EUC_IMPORT_dateExistanteISO_(a.Date_fin),
      recherche:[EUC_ADMIN_WORKFLOW_numeroV144_(a),nom,prenom,a.Classe_convention_nom||'',a.Entreprise_raison_sociale||''].join(' ').toLowerCase()
    };
  }).sort(function(a,b){return String(b.numero||'').localeCompare(String(a.numero||''),'fr');});
}

function EUC_ADMIN_WORKFLOW_vueV146(accesId){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var base=EUC_ADMIN_WORKFLOW_vueV144(accesId);
  var a=EUC_ADMIN_WORKFLOW_lireDossierV144_(accesId);
  var e=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(x){
    return Number(x.id)===Number(EUC_PFMP_ref_(a.Eleve));
  })[0]||{};

  base.jeune={nom:String(e.Nom||a.Eleve_nom||a.Nom_eleve||''),prenom:String(e.Prenom_usage||e.Prenom||a.Eleve_prenom||'')};
  base.classe=String(a.Classe_convention_nom||'');
  base.periode={debut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),fin:EUC_IMPORT_dateExistanteISO_(a.Date_fin),libelle:String(a.Periode_libelle||'')};
  base.etapes=(base.etapes||[]).map(function(x){return Object.assign({},x,{dateLisible:x.date?EUC_ADMIN_WORKFLOW_dateLisibleV144_(x.date):''});});
  return base;
}
EOF

cat > "$PAGE" <<'EOF'
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    :root{--bg:#f4f7fb;--card:#fff;--ink:#1d2939;--muted:#667085;--line:#d9e1ec;--ok:#079669;--danger:#c62828;--accent:#165d9c;--soft:#eef5fb}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,sans-serif}
    .wrap{max-width:1180px;margin:0 auto;padding:24px}.top{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px}
    h1{margin:0;font-size:27px}.sub{color:var(--muted);margin-top:5px}.back{background:#fff;border:1px solid var(--line);padding:10px 14px;border-radius:10px;text-decoration:none;color:var(--ink)}
    .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:18px;box-shadow:0 2px 8px rgba(16,24,40,.04)}
    .searchbox{position:relative}.searchrow{display:grid;grid-template-columns:1fr auto;gap:10px}
    input,textarea,button{font:inherit}input,textarea{width:100%;border:1px solid #b9c7d8;border-radius:10px;padding:11px 12px}
    button{border:0;border-radius:10px;padding:11px 15px;font-weight:700;cursor:pointer}.primary{background:var(--accent);color:#fff}.danger{background:#fff0f0;color:var(--danger);border:1px solid #f3b7b7}
    .suggestions{position:absolute;z-index:20;left:0;right:0;top:48px;background:#fff;border:1px solid var(--line);border-radius:12px;max-height:300px;overflow:auto;box-shadow:0 10px 30px rgba(16,24,40,.16);display:none}
    .suggestion{padding:11px 13px;border-bottom:1px solid #edf0f4;cursor:pointer}.suggestion:hover{background:var(--soft)}.suggestion b{display:block}.suggestion small{color:var(--muted)}
    .identity{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.info{background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:13px}.info span{display:block;color:var(--muted);font-size:12px;margin-bottom:5px}.info b{font-size:16px}
    .steps{display:grid;gap:10px}.step{display:grid;grid-template-columns:38px 1fr auto;gap:12px;align-items:center;border:1px solid var(--line);border-radius:13px;padding:13px}
    .dot{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#edf2f7;font-weight:800}.step.done{background:#f0fbf7;border-color:#b9e8d7}.step.done .dot{background:var(--ok);color:#fff}
    .step-title{font-weight:700}.step-meta{color:var(--muted);font-size:13px;margin-top:3px}.step-actions{display:flex;gap:8px}.step-actions input{min-width:220px}
    .exceptions{display:grid;grid-template-columns:1fr 1fr;gap:16px}.exception{border:1px solid #f0caca;background:#fffafa;border-radius:13px;padding:16px}.exception h3{margin:0 0 12px;color:#8f1d1d}
    .history-item{padding:8px 0;border-bottom:1px solid #edf0f4}.hidden{display:none}.status{padding:11px 13px;border-radius:10px;margin-top:12px}.ok{background:#e9f8f2;color:#056c4d}.err{background:#fff0f0;color:#a61b1b}
    @media(max-width:850px){.identity,.exceptions{grid-template-columns:1fr}.step{grid-template-columns:38px 1fr}.step-actions{grid-column:2;flex-direction:column}.searchrow{grid-template-columns:1fr}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div><h1>Administration des conventions PFMP</h1><div class="sub">Recherche, finalisation, annulation et interruption des conventions.</div></div>
    <a id="back" class="back" href="#">← Retour Administration PFMP</a>
  </div>

  <section class="card">
    <h2>Rechercher une convention</h2>
    <div class="searchbox">
      <div class="searchrow">
        <input id="search" autocomplete="off" placeholder="Tapez une référence, le nom ou le prénom du jeune...">
        <button id="openBtn" class="primary" disabled>Ouvrir le dossier</button>
      </div>
      <div id="suggestions" class="suggestions"></div>
    </div>
    <div id="selectedHint" class="sub" style="margin-top:9px">Aucun dossier sélectionné.</div>
  </section>

  <section id="detail" class="hidden">
    <div class="card">
      <h2 id="title">Dossier</h2>
      <div class="identity">
        <div class="info"><span>Jeune</span><b id="young">—</b></div>
        <div class="info"><span>Classe</span><b id="class">—</b></div>
        <div class="info"><span>Entreprise</span><b id="company">—</b></div>
        <div class="info"><span>Période PFMP</span><b id="period">—</b></div>
      </div>
    </div>

    <div class="card"><h2>Parcours administratif</h2><div id="steps" class="steps"></div><div id="status"></div></div>
    <div class="card"><h2>Historique</h2><div id="history">Aucun historique complémentaire.</div></div>

    <div class="card">
      <h2>Actions exceptionnelles</h2>
      <div class="exceptions">
        <div class="exception"><h3>Annuler avant démarrage</h3><textarea id="cancelReason" rows="4" placeholder="Motif obligatoire"></textarea><button id="cancelBtn" class="danger" style="margin-top:10px">Enregistrer l'annulation</button></div>
        <div class="exception"><h3>Interrompre une PFMP commencée</h3><input id="stopDate" type="date"><textarea id="stopReason" rows="3" placeholder="Motif obligatoire" style="margin-top:8px"></textarea><button id="stopBtn" class="danger" style="margin-top:10px">Enregistrer l'interruption</button></div>
      </div>
    </div>
  </section>
</div>

<script>
const C=<?!= config ?>;
(function(){
  document.getElementById('back').href=C.baseUrl+'?page=admin-pfmp';
  const search=document.getElementById('search'),suggestions=document.getElementById('suggestions'),openBtn=document.getElementById('openBtn'),selectedHint=document.getElementById('selectedHint'),detail=document.getElementById('detail'),title=document.getElementById('title'),young=document.getElementById('young'),cls=document.getElementById('class'),company=document.getElementById('company'),period=document.getElementById('period'),steps=document.getElementById('steps'),history=document.getElementById('history'),status=document.getElementById('status');
  let dossiers=[],selected=null,current=null;
  function esc(v){const d=document.createElement('div');d.textContent=v==null?'':v;return d.innerHTML}
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
  function setStatus(t,k){status.className=k||'';status.textContent=t||''}
  function label(d){return [d.numero,d.jeune,d.classe,d.entreprise].filter(Boolean).join(' — ')}

  function renderSuggestions(){
    const q=norm(search.value).trim();
    if(!q){suggestions.style.display='none';return}
    const words=q.split(/\s+/).filter(Boolean);
    const found=dossiers.filter(d=>words.every(w=>norm(d.recherche||label(d)).includes(w))).slice(0,20);
    suggestions.innerHTML=found.length?found.map(d=>'<div class="suggestion" data-id="'+d.id+'"><b>'+esc(d.numero)+' — '+esc(d.jeune||'Jeune non renseigné')+'</b><small>'+esc([d.classe,d.entreprise].filter(Boolean).join(' — '))+'</small></div>').join(''):'<div class="suggestion">Aucun dossier trouvé</div>';
    suggestions.style.display='block';
    Array.from(suggestions.querySelectorAll('[data-id]')).forEach(el=>el.onclick=function(){
      selected=dossiers.find(x=>String(x.id)===String(el.dataset.id));
      if(!selected)return;
      search.value=label(selected);
      selectedHint.textContent='Sélectionné : '+label(selected);
      openBtn.disabled=false;
      suggestions.style.display='none';
    });
  }

  function render(v){
    current=v;
    detail.classList.remove('hidden');
    title.textContent=(v.numero||('Dossier '+v.id))+' — '+(v.statut||'');
    young.textContent=[v.jeune&&v.jeune.prenom,v.jeune&&v.jeune.nom].filter(Boolean).join(' ')||'—';
    cls.textContent=v.classe||'—';
    company.textContent=v.entreprise||'—';
    period.textContent=[v.periode&&v.periode.debut,v.periode&&v.periode.fin].filter(Boolean).join(' au ')||'—';

    steps.innerHTML=(v.etapes||[]).map(e=>'<div class="step '+(e.validee?'done':'')+'"><div class="dot">'+(e.validee?'✓':'○')+'</div><div><div class="step-title">'+esc(e.label)+'</div><div class="step-meta">'+(e.validee?('Validée'+(e.dateLisible?' le '+esc(e.dateLisible):'')+(e.auteur?' par '+esc(e.auteur):'')):'À valider')+'</div></div>'+(!e.validee?'<div class="step-actions"><input data-comment="'+esc(e.code)+'" placeholder="Commentaire facultatif"><button class="primary" data-step="'+esc(e.code)+'">Valider</button></div>':'')+'</div>').join('');

    Array.from(steps.querySelectorAll('[data-step]')).forEach(btn=>btn.onclick=function(){
      const code=btn.dataset.step,inp=steps.querySelector('[data-comment="'+code+'"]');
      btn.disabled=true;setStatus('Validation en cours...','');
      google.script.run.withSuccessHandler(r=>{setStatus('Étape validée.','ok');render(r)}).withFailureHandler(e=>{btn.disabled=false;setStatus('Erreur : '+(e&&e.message||e),'err')}).EUC_ADMIN_WORKFLOW_validerEtapeV145(v.id,code,inp?inp.value:'');
    });

    const h=v.historique||[];
    history.innerHTML=h.length?h.slice().reverse().map(x=>'<div class="history-item">'+esc((x.date||'')+' — '+(x.libelle||x.action||x.statut||'Action')+(x.auteur?' — '+x.auteur:'')+(x.motif?' — '+x.motif:'')+(x.commentaire?' — '+x.commentaire:''))+'</div>').join(''):'Aucun historique administratif complémentaire.';
  }

  search.oninput=function(){selected=null;openBtn.disabled=true;selectedHint.textContent='Aucun dossier sélectionné.';renderSuggestions()};

  openBtn.onclick=function(){
    if(!selected)return;
    openBtn.disabled=true;
    google.script.run.withSuccessHandler(v=>{openBtn.disabled=false;render(v)}).withFailureHandler(e=>{openBtn.disabled=false;alert('Erreur : '+(e&&e.message||e))}).EUC_ADMIN_WORKFLOW_vueV146(selected.id);
  };

  document.getElementById('cancelBtn').onclick=function(){
    if(!current)return;
    const motif=document.getElementById('cancelReason').value.trim();
    if(!motif){setStatus("Motif d'annulation obligatoire.",'err');return}
    if(!confirm("Confirmer l'annulation avant démarrage ?"))return;
    google.script.run.withSuccessHandler(v=>{document.getElementById('cancelReason').value='';setStatus('Annulation enregistrée.','ok');render(v)}).withFailureHandler(e=>setStatus('Erreur : '+(e&&e.message||e),'err')).EUC_ADMIN_WORKFLOW_annulerV145(current.id,motif);
  };

  document.getElementById('stopBtn').onclick=function(){
    if(!current)return;
    const date=document.getElementById('stopDate').value,motif=document.getElementById('stopReason').value.trim();
    if(!date){setStatus('Date de fin réelle obligatoire.','err');return}
    if(!motif){setStatus("Motif d'interruption obligatoire.",'err');return}
    if(!confirm("Confirmer l'interruption de la PFMP ?"))return;
    google.script.run.withSuccessHandler(v=>{document.getElementById('stopDate').value='';document.getElementById('stopReason').value='';setStatus('Interruption enregistrée.','ok');render(v)}).withFailureHandler(e=>setStatus('Erreur : '+(e&&e.message||e),'err')).EUC_ADMIN_WORKFLOW_interrompreV145(current.id,date,motif);
  };

  google.script.run.withSuccessHandler(rows=>{dossiers=rows||[];selectedHint.textContent=dossiers.length+' dossier(s) disponible(s).'}).withFailureHandler(e=>{selectedHint.textContent='Erreur : '+(e&&e.message||e)}).EUC_ADMIN_WORKFLOW_listerDossiersV146();
})();
</script>
</body>
</html>
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Admin_PFMP.html")
s=p.read_text(encoding="utf-8")

tile=(
    '<section class="card" id="workflow-admin-v146-tile">\n'
    '<h2>Administration des conventions</h2>\n'
    '<p>Recherche et suivi complet des conventions : finalisation, dépôt BFE, signature, remise, autorisation, annulation et interruption.</p>\n'
    '<a class="btn primary" href="<?!= config.baseUrl ?>?page=admin-conventions-pfmp">Ouvrir l\\'administration des conventions</a>\n'
    '</section>'
)

pattern=re.compile(r'<section class="card" id="workflow-admin-v145">.*?</section>',re.S)
if pattern.search(s):
    s=pattern.sub(tile,s,count=1)
elif 'workflow-admin-v146-tile' not in s:
    s=s.replace('</main>',tile+'</main>',1)

p.write_text(s,encoding="utf-8")
print("Vignette dédiée installée.")
PY

python3 <<'PY'
from pathlib import Path

old="admin-pfmp"; new="admin-conventions-pfmp"
told="Admin_PFMP"; tnew="Admin_Conventions_PFMP"

for p in list(Path("apps-script").glob("*.gs"))+[Path("apps-script/Code.js")]:
    if not p.exists(): continue
    txt=p.read_text(encoding="utf-8")
    if new in txt:
        print("Route déjà présente dans",p)
        raise SystemExit(0)
    for line in txt.splitlines():
        if old in line and told in line:
            newline=line.replace(old,new).replace(told,tnew)
            txt=txt.replace(line,line+"\n"+newline,1)
            p.write_text(txt,encoding="utf-8")
            print("Route ajoutée dans",p)
            raise SystemExit(0)

raise SystemExit("ERREUR : route admin-pfmp introuvable. Aucun déploiement effectué.")
PY

echo "=== CONTROLES DEV.146 ==="
cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_V146.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V146.js
grep -q "EUC_ADMIN_WORKFLOW_listerDossiersV146" "$SERVICE"
grep -q "EUC_ADMIN_WORKFLOW_vueV146" "$SERVICE"
grep -q "workflow-admin-v146-tile" "$ADMIN"
grep -q "Administration des conventions PFMP" "$PAGE"
grep -Rqs "admin-conventions-pfmp" apps-script
echo "OK : serveur, vignette, page dédiée et route présents."

echo "=== PUSH ==="
clasp push -f
echo "=== VERSION ==="
clasp version "$LABEL"
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.146 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ vignette dédiée dans Admin PFMP"
echo "✓ page complète Administration des conventions"
echo "✓ recherche autocomplete référence / nom / prénom"
echo "✓ bouton Ouvrir le dossier"
echo "✓ identité jeune + classe + entreprise + période"
echo "✓ étapes administratives modernisées"
echo "✓ actions exceptionnelles séparées"
echo "✓ dates lisibles"
echo "✓ push + version + déploiement principal"
echo "============================================================"
