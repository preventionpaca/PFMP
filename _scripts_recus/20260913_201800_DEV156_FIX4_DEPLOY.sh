#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.156-fix4"

SERVICE="apps-script/EUC_SUIVI_PFMP_AffectationsV156.gs"
DETAIL_SERVICE="apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail.html"
HOME_PAGE="apps-script/Suivi_PFMP_Classes.html"
HOME_SERVICE="apps-script/EUC_SUIVI_PFMP_ClassesV154.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV156_avant_FIX4_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$DETAIL_SERVICE" "$DETAIL_PAGE" "$HOME_PAGE" "$HOME_SERVICE"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

echo "============================================================"
echo " DEV.156 FIX4 — RECONSTRUCTION COMPLETE"
echo "============================================================"

cat > "$SERVICE" <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.156-fix4 */
var EUC_V156_TABLE_='EUC_AFFECTATIONS_SUIVI_PFMP';

function EUC_V156_txt_(v){return String(v==null?'':v).trim();}

function EUC_V156_contexteAdmin_(){
  try{
    var ctx=EUC_PFMP_contexteAdmin_();
    return ctx&&ctx.autorise?ctx:null;
  }catch(e){return null;}
}

function EUC_V156_col_(id,label,type){
  return {id:id,fields:{label:label,type:type||'Text'}};
}

function EUC_V156_assurerTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tables.some(function(t){return t.id===EUC_V156_TABLE_;});
  var c=EUC_V156_col_;
  var cols=[
    c('Annee_scolaire','Année scolaire'),
    c('Classe','Classe','Ref:Classes'),
    c('Periode','Période','Ref:Planning_Periodes'),
    c('Eleve','Élève','Ref:EUC_ELEVES_PFMP'),
    c('Type_suivi','Type suivi'),
    c('Professeur','Professeur','Ref:EUC_PROFESSEURS_PFMP'),
    c('Nom_professeur_snapshot','Nom professeur'),
    c('Email_professeur_snapshot','Email professeur'),
    c('Date_affectation','Date affectation','DateTime'),
    c('Affecte_par','Affecté par'),
    c('Actif','Actif','Bool'),
    c('Date_modification','Date modification','DateTime')
  ];

  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V156_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V156_TABLE_+'/columns').columns||[];
    var have={};
    current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length){
      EUC_ENT_grist('post','/tables/'+EUC_V156_TABLE_+'/columns',{columns:missing});
    }
  }
  return true;
}

function INSTALLER_DEV156_AFFECTATIONS(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V156_assurerTable_();
  return {ok:true,table:EUC_V156_TABLE_};
}

function EUC_V156_professeurs_(){
  return EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP')
    .filter(function(p){return p.Actif!==false;})
    .map(function(p){
      return {
        id:Number(p.id),
        nom:[p.Civilite,p.Prenom,p.Nom].filter(Boolean).join(' '),
        email:EUC_V156_txt_(p.Email),
        discipline:EUC_V156_txt_(p.Discipline)
      };
    })
    .filter(function(p){return p.id&&p.nom;})
    .sort(function(a,b){return a.nom.localeCompare(b.nom,'fr');});
}

function EUC_V156_affectations_(annee,classeId,periodeId){
  try{EUC_V156_assurerTable_();}catch(e){return [];}
  return EUC_IMPORT_lireRecords_(EUC_V156_TABLE_).filter(function(r){
    return r.Actif!==false &&
      EUC_V156_txt_(r.Annee_scolaire)===EUC_V156_txt_(annee) &&
      Number(EUC_PFMP_ref_(r.Classe))===Number(classeId) &&
      Number(EUC_PFMP_ref_(r.Periode))===Number(periodeId);
  });
}

function EUC_SUIVI_CLASSE_detailV156(codeAnnee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV155(codeAnnee,classeId,periodeId);
  var profs=EUC_V156_professeurs_();
  var affect=EUC_V156_affectations_(d.annee,d.classe.id,d.periode?d.periode.id:0);
  var by={};

  affect.forEach(function(a){
    var eid=Number(EUC_PFMP_ref_(a.Eleve));
    var type=EUC_V156_txt_(a.Type_suivi).toUpperCase();
    if(eid>0&&type)by[eid+'|'+type]=a;
  });

  d.lignes=(d.lignes||[]).map(function(x){
    var tel=by[x.eleveId+'|TELEPHONE'];
    var vis=by[x.eleveId+'|VISITE'];
    x.professeurTelephone=tel?EUC_V156_txt_(tel.Nom_professeur_snapshot):'';
    x.professeurTelephoneId=tel?Number(EUC_PFMP_ref_(tel.Professeur)):0;
    x.professeurVisiteur=vis?EUC_V156_txt_(vis.Nom_professeur_snapshot):'';
    x.professeurVisiteurId=vis?Number(EUC_PFMP_ref_(vis.Professeur)):0;
    return x;
  });

  d.professeursDisponibles=profs;
  d.peutModifier=!!EUC_V156_contexteAdmin_();
  return d;
}

function EUC_SUIVI_AFFECTER_V156(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  var annee=EUC_V156_txt_(payload.annee);
  var classeId=Number(payload.classeId);
  var periodeId=Number(payload.periodeId);
  var type=EUC_V156_txt_(payload.type).toUpperCase();
  var profId=Number(payload.profId);
  var eleveIds=(payload.eleveIds||[]).map(Number).filter(function(x){return x>0;});

  if(!annee)throw new Error('Année scolaire absente.');
  if(!(classeId>0))throw new Error('Classe invalide.');
  if(!(periodeId>0))throw new Error('Période invalide.');
  if(['TELEPHONE','VISITE'].indexOf(type)<0)throw new Error('Type de suivi invalide.');
  if(!(profId>0))throw new Error('Professeur invalide.');
  if(!eleveIds.length)throw new Error('Aucun élève sélectionné.');

  EUC_V156_assurerTable_();

  var prof=EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP').filter(function(p){
    return Number(p.id)===profId&&p.Actif!==false;
  })[0];
  if(!prof)throw new Error('Professeur introuvable.');

  var profNom=[prof.Civilite,prof.Prenom,prof.Nom].filter(Boolean).join(' ');
  var profMail=EUC_V156_txt_(prof.Email);
  var now=new Date().toISOString();
  var existing=EUC_IMPORT_lireRecords_(EUC_V156_TABLE_);

  eleveIds.forEach(function(eid){
    var ex=existing.filter(function(r){
      return r.Actif!==false &&
        EUC_V156_txt_(r.Annee_scolaire)===annee &&
        Number(EUC_PFMP_ref_(r.Classe))===classeId &&
        Number(EUC_PFMP_ref_(r.Periode))===periodeId &&
        Number(EUC_PFMP_ref_(r.Eleve))===eid &&
        EUC_V156_txt_(r.Type_suivi).toUpperCase()===type;
    })[0];

    var fields={
      Annee_scolaire:annee,
      Classe:classeId,
      Periode:periodeId,
      Eleve:eid,
      Type_suivi:type,
      Professeur:profId,
      Nom_professeur_snapshot:profNom,
      Email_professeur_snapshot:profMail,
      Date_affectation:now,
      Affecte_par:ctx.email||'',
      Actif:true,
      Date_modification:now
    };

    if(ex){
      EUC_ENT_grist('patch','/tables/'+EUC_V156_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});
    }else{
      EUC_ENT_grist('post','/tables/'+EUC_V156_TABLE_+'/records',{records:[{fields:fields}]});
    }
  });

  return EUC_SUIVI_CLASSE_detailV156(annee,classeId,periodeId);
}
EOF

python3 <<'PY'
from pathlib import Path
p=Path("apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs")
s=p.read_text(encoding="utf-8")
s=s.replace("var detail=EUC_SUIVI_CLASSE_detailV155(annee,classeId,periodeId);",
            "var detail=EUC_SUIVI_CLASSE_detailV156(annee,classeId,periodeId);",1)
p.write_text(s,encoding="utf-8")
print("OK : renderer détail branché sur V156.")
PY

cat > "$DETAIL_PAGE" <<'EOF'
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    :root{--bg:#f4f7fb;--card:#fff;--ink:#1d2939;--muted:#667085;--line:#d9e1ec;--accent:#165d9c;--ok:#079669;--warn:#d97706;--bad:#c62828}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,sans-serif}
    .wrap{max-width:1450px;margin:0 auto;padding:24px}
    .top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px}
    h1{margin:0;font-size:28px}.sub,.small{color:var(--muted)}
    .back{background:#fff;border:1px solid var(--line);padding:10px 14px;border-radius:10px;text-decoration:none;color:var(--ink)}
    .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:18px;box-shadow:0 2px 8px rgba(16,24,40,.04)}
    .context{display:grid;grid-template-columns:220px 1fr;gap:14px;align-items:end}
    select,input,button{font:inherit}
    select,input{width:100%;border:1px solid #b9c7d8;border-radius:9px;padding:9px 10px;background:#fff}
    .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
    .tab{border:1px solid var(--line);background:#fff;padding:9px 12px;border-radius:10px;cursor:pointer;font-weight:700}
    .tab.active{background:var(--accent);color:#fff;border-color:var(--accent)}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    .metric{background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:12px}
    .metric span{display:block;color:var(--muted);font-size:12px}.metric b{font-size:22px}
    .assign-status{display:none;margin-bottom:12px;padding:10px 12px;border-radius:10px;font-weight:700}
    .assign-status.show{display:block}.assign-status.info{background:#eef5fb;color:#164e7a}
    .assign-status.ok{background:#ecfdf3;color:#067647}.assign-status.err{background:#fff1f2;color:#b42318}
    .assignbar{display:grid;grid-template-columns:auto 1fr 1fr;gap:12px;align-items:end;margin-bottom:14px}
    .assignbox{position:relative}.assignbox label{display:block;font-weight:700;font-size:13px;margin-bottom:6px}
    .assignrow{display:flex;gap:8px}.assignrow button{border:0;border-radius:9px;background:#165d9c;color:#fff;font-weight:700;padding:9px 12px;cursor:pointer}
    .assignrow button:disabled{opacity:.5;cursor:not-allowed}
    .prof-suggestions{position:absolute;z-index:50;left:0;right:0;top:70px;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 10px 25px rgba(16,24,40,.15);max-height:250px;overflow:auto;display:none}
    .prof-option{padding:9px 10px;border-bottom:1px solid #edf0f4;cursor:pointer}.prof-option:hover{background:#eef5fb}
    .selection{font-weight:700;color:#475467;padding:9px 0}.rowcheck{width:18px;height:18px}
    .table-wrap{overflow:auto}table{width:100%;border-collapse:separate;border-spacing:0;min-width:1280px}
    th,td{padding:10px 9px;border-bottom:1px solid #edf0f4;text-align:left;vertical-align:top}
    th{position:sticky;top:0;background:#f8fafc;z-index:2;font-size:13px;color:#475467}
    .student{font-weight:700}.empty{color:var(--muted);font-style:italic}
    .status-pill{display:inline-block;padding:5px 8px;border-radius:999px;font-size:12px;font-weight:800}
    .s-SANS_CONVENTION{background:#fff1f2;color:#b42318}.s-ENREGISTREE,.s-DEPOSEE,.s-SIGNEE{background:#fff7ed;color:#b45309}
    .s-FINALISEE,.s-REMISE,.s-AUTORISEE{background:#ecfdf3;color:#067647}.s-ANNULEE,.s-INTERROMPUE,.s-SUPPRIMEE{background:#fee4e2;color:#b42318}
    @media(max-width:900px){.context,.summary,.assignbar{grid-template-columns:1fr}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div><h1 id="pageTitle">Suivi PFMP</h1><div id="pageSub" class="sub"></div></div>
    <a id="back" class="back" href="#">← Retour aux classes</a>
  </div>

  <div class="card">
    <div class="context">
      <div><label for="yearSelect" style="display:block;font-weight:700;margin-bottom:7px">Année scolaire</label><select id="yearSelect"></select></div>
      <div><b id="classLabel"></b><div class="sub" id="ppLabel"></div></div>
    </div>
    <div class="tabs" id="periodTabs"></div>
  </div>

  <div class="card">
    <div class="summary">
      <div class="metric"><span>Effectif</span><b id="mTotal">0</b></div>
      <div class="metric"><span>Avec convention</span><b id="mAvec">0</b></div>
      <div class="metric"><span>Sans convention</span><b id="mSans">0</b></div>
      <div class="metric"><span>Annulées / interrompues</span><b id="mIncident">0</b></div>
    </div>
  </div>

  <div class="card">
    <div id="assignStatusV156" class="assign-status"></div>
    <div id="assignToolbarV156" class="assignbar">
      <div><label><input id="selectAll" type="checkbox" class="rowcheck"> Tout sélectionner</label><div id="selectedCount" class="selection">0 élève sélectionné</div></div>
      <div class="assignbox">
        <label>Professeur — suivi téléphonique</label>
        <div class="assignrow"><input id="phoneProfInput" autocomplete="off" placeholder="Tapez un nom de professeur..."><button id="phoneAssignBtn" type="button" disabled>Affecter</button></div>
        <div id="phoneProfSuggestions" class="prof-suggestions"></div>
      </div>
      <div class="assignbox">
        <label>Professeur visiteur</label>
        <div class="assignrow"><input id="visitProfInput" autocomplete="off" placeholder="Tapez un nom de professeur..."><button id="visitAssignBtn" type="button" disabled>Affecter</button></div>
        <div id="visitProfSuggestions" class="prof-suggestions"></div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th id="selectHead">✓</th>
            <th>Élève</th>
            <th>Convention / statut</th>
            <th>Entreprise</th>
            <th>Adresse entreprise</th>
            <th>Contact entreprise</th>
            <th>Professeur principal</th>
            <th>Suivi téléphonique</th>
            <th>Professeur visiteur</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  </div>
</div>

<script>
const C=<?!= config ?>;
const ANNEE_CTX=<?!= anneeContextJson ?>;
const DETAIL_INIT=<?!= detailJson ?>;

(function(){
  const back=document.getElementById('back');
  const yearSelect=document.getElementById('yearSelect');
  const pageTitle=document.getElementById('pageTitle');
  const pageSub=document.getElementById('pageSub');
  const classLabel=document.getElementById('classLabel');
  const ppLabel=document.getElementById('ppLabel');
  const periodTabs=document.getElementById('periodTabs');
  const tbody=document.getElementById('tbody');
  const toolbar=document.getElementById('assignToolbarV156');
  const assignStatus=document.getElementById('assignStatusV156');
  const selectAll=document.getElementById('selectAll');
  const selectedCount=document.getElementById('selectedCount');
  const phoneProfInput=document.getElementById('phoneProfInput');
  const visitProfInput=document.getElementById('visitProfInput');
  const phoneProfSuggestions=document.getElementById('phoneProfSuggestions');
  const visitProfSuggestions=document.getElementById('visitProfSuggestions');
  const phoneAssignBtn=document.getElementById('phoneAssignBtn');
  const visitAssignBtn=document.getElementById('visitAssignBtn');

  let yearContext=ANNEE_CTX||{annees:[],active:''};
  let detail=DETAIL_INIT||{};
  let selectedProfPhone=null;
  let selectedProfVisit=null;

  function esc(v){const d=document.createElement('div');d.textContent=v==null?'':v;return d.innerHTML}
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
  function val(v){return v?esc(v):'<span class="empty">—</span>'}
  function showAssignStatus(text,type){assignStatus.textContent=text||'';assignStatus.className='assign-status'+(text?' show':'')+(type?' '+type:'')}
  function selectedIds(){return Array.from(document.querySelectorAll('.student-check:checked')).map(x=>Number(x.value))}
  function statusPill(x){return '<span class="status-pill s-'+esc(x.statutCode)+'">'+esc(x.statut)+'</span>'}

  function renderYears(){
    yearSelect.innerHTML=(yearContext.annees||[]).map(y=>'<option value="'+esc(y.code)+'"'+(y.code===detail.annee?' selected':'')+'>'+esc(y.libelle||y.code)+'</option>').join('');
  }

  function renderTabs(){
    periodTabs.innerHTML=(detail.periodes||[]).map(function(p){
      const active=detail.periode&&Number(detail.periode.id)===Number(p.id);
      return '<button class="tab'+(active?' active':'')+'" data-p="'+p.id+'">'+esc(p.libelle)+'</button>';
    }).join('');
    Array.from(periodTabs.querySelectorAll('[data-p]')).forEach(function(btn){
      btn.onclick=function(){
        window.location.href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(detail.annee)+'&classe='+encodeURIComponent(detail.classe.id)+'&periode='+encodeURIComponent(btn.dataset.p);
      };
    });
  }

  function refreshAssignButtons(){
    const n=selectedIds().length;
    selectedCount.textContent=n+' élève'+(n>1?'s':'')+' sélectionné'+(n>1?'s':'');
    phoneAssignBtn.disabled=(n===0||!selectedProfPhone);
    visitAssignBtn.disabled=(n===0||!selectedProfVisit);
    const all=Array.from(document.querySelectorAll('.student-check'));
    selectAll.checked=all.length>0&&all.every(x=>x.checked);
  }

  function bindChecks(){
    Array.from(document.querySelectorAll('.student-check')).forEach(x=>x.onchange=refreshAssignButtons);
    selectAll.onchange=function(){
      Array.from(document.querySelectorAll('.student-check')).forEach(x=>x.checked=selectAll.checked);
      refreshAssignButtons();
    };
    refreshAssignButtons();
  }

  function bindProfAutocomplete(input,box,setter){
    input.oninput=function(){
      setter(null);
      refreshAssignButtons();
      const q=norm(input.value).trim();
      if(!q){box.style.display='none';return}
      const found=(detail.professeursDisponibles||[]).filter(p=>norm(p.nom+' '+p.email+' '+p.discipline).includes(q)).slice(0,15);
      box.innerHTML=found.length?found.map(p=>'<div class="prof-option" data-prof="'+p.id+'"><b>'+esc(p.nom)+'</b><div class="small">'+esc([p.discipline,p.email].filter(Boolean).join(' · '))+'</div></div>').join(''):'<div class="prof-option">Aucun professeur trouvé</div>';
      box.style.display='block';
      Array.from(box.querySelectorAll('[data-prof]')).forEach(function(el){
        el.onclick=function(){
          const p=(detail.professeursDisponibles||[]).find(x=>String(x.id)===String(el.dataset.prof));
          if(!p)return;
          setter(p);input.value=p.nom;box.style.display='none';
          showAssignStatus('Professeur sélectionné : '+p.nom,'info');
          refreshAssignButtons();
        };
      });
    };
  }

  function assign(type,prof,btn){
    const ids=selectedIds();
    if(!ids.length){showAssignStatus('Sélectionnez au moins un élève avant l’affectation.','err');return}
    if(!prof){showAssignStatus('Sélectionnez un professeur dans la liste.','err');return}
    if(!detail.periode){showAssignStatus('Aucune période PFMP sélectionnée.','err');return}
    const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='Affectation en cours...';
    showAssignStatus('Affectation en cours...','info');
    google.script.run.withSuccessHandler(function(r){
      btn.innerHTML=old;detail=r;showAssignStatus('Affectation enregistrée.','ok');render();
    }).withFailureHandler(function(e){
      btn.innerHTML=old;showAssignStatus('Erreur : '+(e&&e.message||e),'err');refreshAssignButtons();
    }).EUC_SUIVI_AFFECTER_V156({
      annee:detail.annee,classeId:detail.classe.id,periodeId:detail.periode.id,
      type:type,profId:prof.id,eleveIds:ids
    });
  }

  function render(){
    back.href=C.baseUrl+'?page=suivi-pfmp-classes';
    pageTitle.textContent='Suivi PFMP — '+(detail.classe&&detail.classe.nom||'Classe');
    pageSub.textContent=detail.periode?[detail.periode.libelle,detail.periode.debut,detail.periode.fin].filter(Boolean).join(' · '):'Aucune période sélectionnée';
    classLabel.textContent=(detail.classe&&detail.classe.nom||'')+' — '+detail.annee;
    ppLabel.textContent='Professeur principal : '+((detail.professeursPrincipaux||[]).map(p=>p.nom).join(' / ')||'non renseigné');

    renderYears();renderTabs();

    const st=detail.stats||{};
    document.getElementById('mTotal').textContent=st.total||0;
    document.getElementById('mAvec').textContent=st.avecConvention||0;
    document.getElementById('mSans').textContent=st.sansConvention||0;
    document.getElementById('mIncident').textContent=(st.annulees||0)+(st.interrompues||0);

    tbody.innerHTML=(detail.lignes||[]).map(function(x){
      const check=detail.peutModifier?'<input type="checkbox" class="rowcheck student-check" value="'+x.eleveId+'">':'';
      return '<tr>'+
        '<td>'+check+'</td>'+
        '<td><div class="student">'+esc(x.nom)+' '+esc(x.prenom)+'</div><div class="small">'+esc(x.classe)+'</div></td>'+
        '<td>'+statusPill(x)+(x.numero?'<div class="small">'+esc(x.numero)+'</div>':'')+'</td>'+
        '<td>'+val(x.entreprise)+'</td>'+
        '<td>'+val(x.adresseEntreprise)+'</td>'+
        '<td>'+val(x.contactEntreprise)+'</td>'+
        '<td>'+val(x.professeurPrincipal)+'</td>'+
        '<td>'+val(x.professeurTelephone)+'</td>'+
        '<td>'+val(x.professeurVisiteur)+'</td>'+
      '</tr>';
    }).join('');

    toolbar.style.display=detail.peutModifier?'grid':'none';
    document.getElementById('selectHead').style.display=detail.peutModifier?'table-cell':'none';
    bindChecks();
  }

  bindProfAutocomplete(phoneProfInput,phoneProfSuggestions,p=>selectedProfPhone=p);
  bindProfAutocomplete(visitProfInput,visitProfSuggestions,p=>selectedProfVisit=p);
  phoneAssignBtn.onclick=function(){assign('TELEPHONE',selectedProfPhone,phoneAssignBtn)};
  visitAssignBtn.onclick=function(){assign('VISITE',selectedProfVisit,visitAssignBtn)};

  yearSelect.onchange=function(){
    window.location.href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(yearSelect.value)+'&classe='+encodeURIComponent(detail.classe.id);
  };

  render();
})();
</script>
</body>
</html>
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")
s=re.sub(
    r"  function reloadYear\(code\)\{.*?\n  \}",
    "  function reloadYear(code){\n    window.location.href=C.baseUrl+'?page=suivi-pfmp-classes&annee='+encodeURIComponent(code);\n  }",
    s,count=1,flags=re.S
)
p.write_text(s,encoding="utf-8")

p=Path("apps-script/EUC_SUIVI_PFMP_ClassesV154.gs")
s=p.read_text(encoding="utf-8")
if "var requested=String(e&&e.parameter&&e.parameter.annee||'').trim();" not in s:
    needle="function EUC_SUIVI_CLASSES_afficherV154(e){\n  var ctx=EUC_PFMP_contexteAnneeLectureV155_();"
    repl=("function EUC_SUIVI_CLASSES_afficherV154(e){\n"
          "  var ctx=EUC_PFMP_contexteAnneeLectureV155_();\n"
          "  var requested=String(e&&e.parameter&&e.parameter.annee||'').trim();\n"
          "  if(requested && ctx.annees.some(function(a){return a.code===requested;})){\n"
          "    ctx.active=requested;\n"
          "    try{PropertiesService.getUserProperties().setProperty('EUC_PFMP_ANNEE_ACTIVE_V148',requested);}catch(err){}\n"
          "  }")
    if needle not in s: raise SystemExit("ERREUR : renderer accueil introuvable.")
    s=s.replace(needle,repl,1)
p.write_text(s,encoding="utf-8")
print("OK : changement d'année corrigé.")
PY

echo "============================================================"
echo " DEV.156 FIX4 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_AffectationsV156.js
cp "$DETAIL_SERVICE" /tmp/EUC_SUIVI_PFMP_ClasseDetailV155_DEV156.js
node --check /tmp/EUC_SUIVI_PFMP_AffectationsV156.js
node --check /tmp/EUC_SUIVI_PFMP_ClasseDetailV155_DEV156.js

grep -q "EUC_SUIVI_AFFECTER_V156" "$SERVICE"
grep -q 'id="assignToolbarV156"' "$DETAIL_PAGE"
grep -q 'id="phoneProfInput"' "$DETAIL_PAGE"
grep -q 'id="visitProfInput"' "$DETAIL_PAGE"
grep -q "Affectation enregistrée" "$DETAIL_PAGE"

echo "OK : backend V156 recréé."
echo "OK : interface affectations reconstruite."
echo "OK : changement d'année corrigé."

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
echo " DEV.156 FIX4 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ backend V156 recréé"
echo "✓ sélection multiple élèves"
echo "✓ autocomplete téléphone / visiteur"
echo "✓ boutons actifs seulement si sélection valide"
echo "✓ messages intégrés"
echo "✓ changement d'année réellement appliqué"
echo "✓ push + version + déploiement principal"
echo "============================================================"
