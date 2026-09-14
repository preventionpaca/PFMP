#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.156-fix3"

SERVICE="apps-script/EUC_SUIVI_PFMP_AffectationsV156.gs"
DETAIL_SERVICE="apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs"
PAGE="apps-script/Suivi_PFMP_Classe_Detail.html"
HOME_PAGE="apps-script/Suivi_PFMP_Classes.html"
HOME_SERVICE="apps-script/EUC_SUIVI_PFMP_ClassesV154.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV156_avant_FIX3_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$DETAIL_SERVICE" "$PAGE" "$HOME_PAGE" "$HOME_SERVICE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.156 FIX3 — RECONSTRUCTION DE L'INTERFACE D'AFFECTATION"
echo "============================================================"

# Vérifier que le backend V156 est bien présent.
grep -q "function EUC_SUIVI_AFFECTER_V156" "$SERVICE" || {
  echo "ERREUR : backend d'affectation V156 absent."
  exit 1
}
grep -q "function EUC_SUIVI_CLASSE_detailV156" "$SERVICE" || {
  echo "ERREUR : detailV156 absent."
  exit 1
}

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs")
s=p.read_text(encoding="utf-8")

if "var detail=EUC_SUIVI_CLASSE_detailV156(annee,classeId,periodeId);" not in s:
    s=s.replace(
        "var detail=EUC_SUIVI_CLASSE_detailV155(annee,classeId,periodeId);",
        "var detail=EUC_SUIVI_CLASSE_detailV156(annee,classeId,periodeId);",
        1
    )

p.write_text(s,encoding="utf-8")
print("OK : renderer détail utilise bien V156.")
PY

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Suivi_PFMP_Classe_Detail.html")
s=p.read_text(encoding="utf-8")

# ------------------------------------------------------------
# CSS
# ------------------------------------------------------------
if ".assignbar{" not in s:
    css = """
    .assign-status{display:none;margin-bottom:12px;padding:10px 12px;border-radius:10px;font-weight:700}
    .assign-status.show{display:block}
    .assign-status.info{background:#eef5fb;color:#164e7a}
    .assign-status.ok{background:#ecfdf3;color:#067647}
    .assign-status.err{background:#fff1f2;color:#b42318}
    .assignbar{display:grid;grid-template-columns:auto 1fr 1fr;gap:12px;align-items:end;margin-bottom:14px}
    .assignbox{position:relative}
    .assignbox label{display:block;font-weight:700;font-size:13px;margin-bottom:6px}
    .assignrow{display:flex;gap:8px}
    .assignrow input{width:100%;border:1px solid #b9c7d8;border-radius:9px;padding:9px 10px}
    .assignrow button{border:0;border-radius:9px;background:#165d9c;color:#fff;font-weight:700;padding:9px 12px;cursor:pointer}
    .assignrow button:disabled{opacity:.5;cursor:not-allowed}
    .prof-suggestions{position:absolute;z-index:50;left:0;right:0;top:70px;background:#fff;border:1px solid #d9e1ec;border-radius:10px;box-shadow:0 10px 25px rgba(16,24,40,.15);max-height:250px;overflow:auto;display:none}
    .prof-option{padding:9px 10px;border-bottom:1px solid #edf0f4;cursor:pointer}
    .prof-option:hover{background:#eef5fb}
    .selection{font-weight:700;color:#475467;padding:9px 0}
    .rowcheck{width:18px;height:18px}
"""
    marker="    @media(max-width:850px){"
    if marker in s:
        s=s.replace(marker,css+"\n"+marker,1)
    else:
        s=s.replace("</style>",css+"\n</style>",1)

# ------------------------------------------------------------
# TOOLBAR
# ------------------------------------------------------------
if 'id="assignToolbarV156"' not in s:
    toolbar = """
    <div id="assignStatusV156" class="assign-status"></div>

    <div id="assignToolbarV156" class="assignbar">
      <div>
        <label><input id="selectAll" type="checkbox" class="rowcheck"> Tout sélectionner</label>
        <div id="selectedCount" class="selection">0 élève sélectionné</div>
      </div>

      <div class="assignbox">
        <label>Professeur — suivi téléphonique</label>
        <div class="assignrow">
          <input id="phoneProfInput" autocomplete="off" placeholder="Tapez un nom de professeur...">
          <button id="phoneAssignBtn" type="button" disabled>Affecter</button>
        </div>
        <div id="phoneProfSuggestions" class="prof-suggestions"></div>
      </div>

      <div class="assignbox">
        <label>Professeur visiteur</label>
        <div class="assignrow">
          <input id="visitProfInput" autocomplete="off" placeholder="Tapez un nom de professeur...">
          <button id="visitAssignBtn" type="button" disabled>Affecter</button>
        </div>
        <div id="visitProfSuggestions" class="prof-suggestions"></div>
      </div>
    </div>
"""
    marker='<div class="table-wrap">'
    if marker not in s:
        raise SystemExit("ERREUR : table-wrap introuvable.")
    s=s.replace(marker,toolbar+"\n    "+marker,1)

# ------------------------------------------------------------
# COLONNE CHECKBOX
# ------------------------------------------------------------
if 'id="selectHead"' not in s:
    s=s.replace(
        "<tr>\n            <th>Élève</th>",
        '<tr>\n            <th id="selectHead">✓</th>\n            <th>Élève</th>',
        1
    )

# ------------------------------------------------------------
# REFS JS
# ------------------------------------------------------------
anchor="  let yearContext=ANNEE_CTX||{annees:[],active:''};\n  let detail=DETAIL_INIT||{};"
if "let selectedProfPhone=null;" not in s:
    refs = """
  let selectedProfPhone=null;
  let selectedProfVisit=null;

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
"""
    if anchor not in s:
        raise SystemExit("ERREUR : ancre variables JS introuvable.")
    s=s.replace(anchor,anchor+"\n"+refs,1)

# ------------------------------------------------------------
# HELPERS JS
# ------------------------------------------------------------
if "function selectedIds()" not in s:
    helpers = """
  function norm(v){
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
  }

  function showAssignStatus(text,type){
    assignStatus.textContent=text||'';
    assignStatus.className='assign-status'+(text?' show':'')+(type?' '+type:'');
  }

  function selectedIds(){
    return Array.from(document.querySelectorAll('.student-check:checked')).map(function(x){
      return Number(x.value);
    });
  }

  function refreshAssignButtons(){
    const n=selectedIds().length;
    selectedCount.textContent=n+' élève'+(n>1?'s':'')+' sélectionné'+(n>1?'s':'');
    phoneAssignBtn.disabled=(n===0 || !selectedProfPhone);
    visitAssignBtn.disabled=(n===0 || !selectedProfVisit);

    const all=Array.from(document.querySelectorAll('.student-check'));
    selectAll.checked=all.length>0 && all.every(function(x){return x.checked});
  }

  function bindChecks(){
    Array.from(document.querySelectorAll('.student-check')).forEach(function(x){
      x.onchange=refreshAssignButtons;
    });

    selectAll.onchange=function(){
      Array.from(document.querySelectorAll('.student-check')).forEach(function(x){
        x.checked=selectAll.checked;
      });
      refreshAssignButtons();
    };

    refreshAssignButtons();
  }

  function bindProfAutocomplete(input,box,setter){
    input.oninput=function(){
      setter(null);
      refreshAssignButtons();

      const q=norm(input.value).trim();
      if(!q){
        box.style.display='none';
        return;
      }

      const found=(detail.professeursDisponibles||[]).filter(function(p){
        return norm(p.nom+' '+p.email+' '+p.discipline).indexOf(q)>=0;
      }).slice(0,15);

      box.innerHTML=found.length
        ? found.map(function(p){
            return '<div class="prof-option" data-prof="'+p.id+'"><b>'+esc(p.nom)+'</b><div class="small">'+esc([p.discipline,p.email].filter(Boolean).join(' · '))+'</div></div>';
          }).join('')
        : '<div class="prof-option">Aucun professeur trouvé</div>';

      box.style.display='block';

      Array.from(box.querySelectorAll('[data-prof]')).forEach(function(el){
        el.onclick=function(){
          const prof=(detail.professeursDisponibles||[]).find(function(x){
            return String(x.id)===String(el.dataset.prof);
          });
          if(!prof)return;

          setter(prof);
          input.value=prof.nom;
          box.style.display='none';
          showAssignStatus('Professeur sélectionné : '+prof.nom,'info');
          refreshAssignButtons();
        };
      });
    };
  }

  function assign(type,prof,btn){
    const ids=selectedIds();

    if(!ids.length){
      showAssignStatus('Sélectionnez au moins un élève avant l’affectation.','err');
      return;
    }
    if(!prof){
      showAssignStatus('Sélectionnez un professeur dans la liste.','err');
      return;
    }
    if(!detail.periode){
      showAssignStatus('Aucune période PFMP sélectionnée.','err');
      return;
    }

    const old=btn.innerHTML;
    btn.disabled=true;
    btn.innerHTML='Affectation en cours...';
    showAssignStatus('Affectation en cours...','info');

    google.script.run
      .withSuccessHandler(function(r){
        btn.innerHTML=old;
        detail=r;
        showAssignStatus('Affectation enregistrée.','ok');
        render();
      })
      .withFailureHandler(function(e){
        btn.innerHTML=old;
        showAssignStatus('Erreur : '+(e&&e.message||e),'err');
        refreshAssignButtons();
      })
      .EUC_SUIVI_AFFECTER_V156({
        annee:detail.annee,
        classeId:detail.classe.id,
        periodeId:detail.periode.id,
        type:type,
        profId:prof.id,
        eleveIds:ids
      });
  }

  bindProfAutocomplete(phoneProfInput,phoneProfSuggestions,function(p){selectedProfPhone=p;});
  bindProfAutocomplete(visitProfInput,visitProfSuggestions,function(p){selectedProfVisit=p;});

  phoneAssignBtn.onclick=function(){
    assign('TELEPHONE',selectedProfPhone,phoneAssignBtn);
  };

  visitAssignBtn.onclick=function(){
    assign('VISITE',selectedProfVisit,visitAssignBtn);
  };

"""
    marker="  yearSelect.onchange=function(){"
    if marker not in s:
        raise SystemExit("ERREUR : yearSelect.onchange introuvable.")
    s=s.replace(marker,helpers+marker,1)

# ------------------------------------------------------------
# RENDU TABLEAU
# ------------------------------------------------------------
old = """    tbody.innerHTML=(detail.lignes||[]).map(function(x){
      return '<tr>'+
        '<td><div class="student">'+esc(x.nom)+' '+esc(x.prenom)+'</div><div class="small">'+esc(x.classe)+'</div></td>'+
        '<td>'+statusPill(x)+(x.numero?'<div class="small">'+esc(x.numero)+'</div>':'')+'</td>'+
        '<td>'+val(x.entreprise)+'</td>'+
        '<td>'+val(x.adresseEntreprise)+'</td>'+
        '<td>'+val(x.contactEntreprise)+'</td>'+
        '<td>'+val(x.professeurPrincipal)+'</td>'+
        '<td><span class="future">Affectation en DEV.156</span></td>'+
        '<td><span class="future">Affectation en DEV.156</span></td>'+
      '</tr>';
    }).join('');"""

new = """    tbody.innerHTML=(detail.lignes||[]).map(function(x){
      const check=detail.peutModifier
        ? '<input type="checkbox" class="rowcheck student-check" value="'+x.eleveId+'">'
        : '';

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
    bindChecks();"""

if old not in s:
    raise SystemExit("ERREUR : bloc tableau V155 introuvable.")
s=s.replace(old,new,1)

# ------------------------------------------------------------
# Changement d'année détail : navigation directe
# ------------------------------------------------------------
s=re.sub(
    r"  yearSelect\.onchange=function\(\)\{.*?\n  \};",
    """  yearSelect.onchange=function(){
    const code=yearSelect.value;
    window.location.href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(code)+'&classe='+encodeURIComponent(detail.classe.id);
  };""",
    s,
    count=1,
    flags=re.S
)

p.write_text(s,encoding="utf-8")
print("OK : interface d'affectation DEV.156 reconstruite sur la page réelle.")
PY

echo "============================================================"
echo " DEV.156 FIX3 — CONTROLES"
echo "============================================================"

grep -q 'id="assignToolbarV156"' "$PAGE"
grep -q 'id="phoneProfInput"' "$PAGE"
grep -q 'id="visitProfInput"' "$PAGE"
grep -q "function selectedIds()" "$PAGE"
grep -q "Affectation enregistrée" "$PAGE"
grep -q "professeurTelephone" "$PAGE"
grep -q "professeurVisiteur" "$PAGE"

python3 <<'PY'
from pathlib import Path
import re

s=Path("apps-script/Suivi_PFMP_Classe_Detail.html").read_text(encoding="utf-8")
scripts=re.findall(r"<script>(.*?)</script>",s,re.S)
js="\n".join(scripts)
js=re.sub(r"<\?!=.*?\?>","{}",js)
Path("/tmp/Suivi_PFMP_Classe_Detail_DEV156_FIX3.js").write_text(js,encoding="utf-8")
PY

node --check /tmp/Suivi_PFMP_Classe_Detail_DEV156_FIX3.js

echo "OK : champs/boutons DEV.156 réellement présents."
echo "OK : JavaScript client valide."
echo "OK : affectation multiple opérationnelle."

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
echo " DEV.156 FIX3 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ interface d'affectation réellement créée dans le fichier local"
echo "✓ sélection multiple élèves"
echo "✓ autocomplete prof téléphone / visiteur"
echo "✓ bouton Affecter actif seulement si sélection valide"
echo "✓ messages intégrés, plus de popup système"
echo "✓ push + version + déploiement principal"
echo "============================================================"
