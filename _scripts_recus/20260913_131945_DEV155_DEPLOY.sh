#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.155"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV155_${STAMP}"
mkdir -p "$BACKUP"

SERVICE="apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs"
PAGE="apps-script/Suivi_PFMP_Classe_Detail.html"
ROUTER="apps-script/EDT.js"
HOME="apps-script/Suivi_PFMP_Classes.html"

for f in "$SERVICE" "$PAGE" "$ROUTER" "$HOME"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

cat > "$SERVICE" <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.155
 * Tableau détaillé de suivi par classe et période.
 * Filtre majeur : année scolaire active.
 */

var EUC_SUIVI_DETAIL_V155_='v1.0.0-dev.155';

function EUC_V155_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_V155_professeursPrincipaux_(classeId){
  var out=[];
  try{
    var links=EUC_IMPORT_lireRecords_('EUC_CLASSES_PROFESSEURS_PFMP');
    var profs=EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP');
    var by={};
    profs.forEach(function(p){by[Number(p.id)]=p;});

    links.filter(function(l){
      return l.Actif!==false &&
        String(l.Role||'')==='PROFESSEUR_PRINCIPAL' &&
        Number(EUC_PFMP_ref_(l.Classe))===Number(classeId);
    }).forEach(function(l){
      var p=by[Number(EUC_PFMP_ref_(l.Professeur))];
      if(!p)return;
      out.push({
        id:Number(p.id),
        nom:[p.Civilite,p.Prenom,p.Nom].filter(Boolean).join(' '),
        email:EUC_V155_txt_(p.Email)
      });
    });
  }catch(e){}
  return out;
}

function EUC_V155_periodesClasse_(codeAnnee,classeId){
  var map=EUC_V154_anneesMap_();
  return EUC_IMPORT_lireRecords_('Planning_Periodes').filter(function(p){
    if(p.Actif===false)return false;

    var an=EUC_V154_anneeCode_(p.Annee_scolaire,map);
    if(codeAnnee && an && an!==codeAnnee)return false;

    var ids=EUC_V154_refIds_(p.Classes_concernees);
    if(!ids.length){
      var single=Number(EUC_PFMP_ref_(p.Classe));
      if(single>0)ids=[single];
    }

    return ids.indexOf(Number(classeId))>=0;
  }).map(function(p){
    return {
      id:Number(p.id),
      libelle:EUC_V154_periodeLibelle_(p),
      debut:EUC_IMPORT_dateExistanteISO_(p.Date_debut),
      fin:EUC_IMPORT_dateExistanteISO_(p.Date_fin)
    };
  }).sort(function(a,b){
    return String(a.debut||'').localeCompare(String(b.debut||''));
  });
}

function EUC_V155_statutLibelle_(a){
  if(!a)return {code:'SANS_CONVENTION',libelle:'Sans convention'};

  var s=String(a.Statut_administratif||a.Statut||'').toUpperCase();

  if(a.Supprimee_admin===true || s==='SUPPRIMEE_ADMIN'){
    return {code:'SUPPRIMEE',libelle:'Supprimée'};
  }
  if(s.indexOf('ANNULEE')>=0){
    return {code:'ANNULEE',libelle:'Annulée'};
  }
  if(s.indexOf('INTERROMP')>=0){
    return {code:'INTERROMPUE',libelle:'Interrompue'};
  }
  if(s==='PFMP_AUTORISEE'){
    return {code:'AUTORISEE',libelle:'PFMP autorisée'};
  }
  if(s==='CONVENTION_REMISE'){
    return {code:'REMISE',libelle:'Convention remise'};
  }
  if(s==='CONVENTION_FINALISEE'){
    return {code:'FINALISEE',libelle:'Convention finalisée'};
  }
  if(s==='SIGNE_PROVISEUR'){
    return {code:'SIGNEE',libelle:'Signée Proviseur'};
  }
  if(s==='ORIGINAL_DEPOSE_BFE'){
    return {code:'DEPOSEE',libelle:'Original déposé BFE'};
  }

  return {code:'ENREGISTREE',libelle:'Convention enregistrée'};
}

function EUC_V155_contactEntreprise_(a){
  if(!a)return '';
  var parts=[
    EUC_V155_txt_(a.Responsable_prenom),
    EUC_V155_txt_(a.Responsable_nom)
  ].filter(Boolean);

  var nom=parts.join(' ');
  var tel=EUC_V155_txt_(a.Responsable_telephone);
  var mail=EUC_V155_txt_(a.Responsable_courriel);

  return [nom,tel,mail].filter(Boolean).join(' · ');
}

function EUC_V155_adresseEntreprise_(a){
  if(!a)return '';
  var l1=EUC_V155_txt_(a.Entreprise_adresse);
  var l2=[a.Entreprise_code_postal,a.Entreprise_commune].map(EUC_V155_txt_).filter(Boolean).join(' ');
  return [l1,l2].filter(Boolean).join(', ');
}

function EUC_SUIVI_CLASSE_detailV155(codeAnnee,classeId,periodeId){
  EUC_ADMIN_WORKFLOW_ctxV144_();

  codeAnnee=EUC_V155_txt_(codeAnnee);
  classeId=Number(classeId);
  periodeId=Number(periodeId)||0;

  if(!(classeId>0))throw new Error('Classe invalide.');

  var classes=EUC_IMPORT_lireRecords_('Classes');
  var classe=classes.filter(function(c){return Number(c.id)===classeId;})[0];
  if(!classe)throw new Error('Classe introuvable.');

  var periodes=EUC_V155_periodesClasse_(codeAnnee,classeId);
  if(!periodeId && periodes.length)periodeId=periodes[0].id;

  var periode=periodes.filter(function(p){return Number(p.id)===periodeId;})[0]||null;

  var map=EUC_V154_anneesMap_();

  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(e){
    if(e.Actif===false)return false;
    if(e.Present_dernier_import===false)return false;

    var cid=Number(EUC_PFMP_ref_(e.Classe));
    if(cid!==classeId)return false;

    var an=EUC_V154_anneeCode_(e.Annee_scolaire,map);
    return !codeAnnee || !an || an===codeAnnee;
  });

  var dossiers=EUC_CONVENTION_lireAccesFraisV108_().filter(function(a){
    var cid=Number(EUC_PFMP_ref_(a.Classe_convention));
    var pid=Number(EUC_PFMP_ref_(a.Periode));

    if(cid!==classeId)return false;
    if(periodeId && pid!==periodeId)return false;

    var an=EUC_V154_anneeDossier_(a,map);
    return !codeAnnee || !an || an===codeAnnee;
  });

  var byEleve={};

  dossiers.forEach(function(a){
    var eid=Number(EUC_PFMP_ref_(a.Eleve));
    if(!(eid>0))return;

    if(!byEleve[eid])byEleve[eid]=[];
    byEleve[eid].push(a);
  });

  var pp=EUC_V155_professeursPrincipaux_(classeId);

  var lignes=eleves.map(function(e){
    var eid=Number(e.id);
    var d=(byEleve[eid]||[]).slice().sort(function(a,b){
      return Number(b.id)-Number(a.id);
    })[0]||null;

    var statut=EUC_V155_statutLibelle_(d);

    return {
      eleveId:eid,
      nom:EUC_V155_txt_(e.Nom),
      prenom:EUC_V155_txt_(e.Prenom_usage||e.Prenom),
      classe:EUC_V154_classeNom_(classe),

      conventionId:d?Number(d.id):0,
      numero:d?EUC_ADMIN_WORKFLOW_numeroV144_(d):'',
      statutCode:statut.code,
      statut:statut.libelle,

      entreprise:d?EUC_V155_txt_(d.Entreprise_raison_sociale):'',
      adresseEntreprise:EUC_V155_adresseEntreprise_(d),
      contactEntreprise:EUC_V155_contactEntreprise_(d),

      professeurPrincipal:pp.map(function(x){return x.nom;}).join(' / '),
      professeurTelephone:'',
      professeurVisiteur:''
    };
  }).sort(function(a,b){
    var n=a.nom.localeCompare(b.nom,'fr');
    return n!==0?n:a.prenom.localeCompare(b.prenom,'fr');
  });

  var stats={
    total:lignes.length,
    avecConvention:lignes.filter(function(x){return x.conventionId>0 && x.statutCode!=='SUPPRIMEE';}).length,
    sansConvention:lignes.filter(function(x){return !x.conventionId;}).length,
    annulees:lignes.filter(function(x){return x.statutCode==='ANNULEE';}).length,
    interrompues:lignes.filter(function(x){return x.statutCode==='INTERROMPUE';}).length
  };

  return {
    version:EUC_SUIVI_DETAIL_V155_,
    annee:codeAnnee,
    classe:{
      id:classeId,
      nom:EUC_V154_classeNom_(classe),
      categorie:EUC_V154_cat_(classe)
    },
    periodes:periodes,
    periode:periode,
    professeursPrincipaux:pp,
    lignes:lignes,
    stats:stats
  };
}

function EUC_SUIVI_CLASSE_afficherV155(e){
  EUC_ADMIN_WORKFLOW_ctxV144_();

  var ctx=EUC_PFMP_contexteAnneeV148();

  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V155_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;

  if(classeId<=0)throw new Error('Classe manquante.');

  var detail=EUC_SUIVI_CLASSE_detailV155(annee,classeId,periodeId);

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail');
  tpl.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);

  return tpl.evaluate()
    .setTitle('Suivi PFMP — '+detail.classe.nom)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function DIAGNOSTIC_DEV155_CLASSE(classeId){
  var ctx=EUC_PFMP_contexteAnneeV148();
  var d=EUC_SUIVI_CLASSE_detailV155(ctx.active,classeId,0);

  console.log('=== DEV.155 — DETAIL CLASSE ===');
  console.log('Année : '+d.annee);
  console.log('Classe : '+d.classe.nom);
  console.log('Périodes : '+d.periodes.length);
  console.log('Élèves : '+d.stats.total);
  console.log('Avec convention : '+d.stats.avecConvention);

  return d;
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
    :root{--bg:#f4f7fb;--card:#fff;--ink:#1d2939;--muted:#667085;--line:#d9e1ec;--accent:#165d9c;--ok:#079669;--warn:#d97706;--bad:#c62828;--soft:#eef5fb}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,sans-serif}
    .wrap{max-width:1400px;margin:0 auto;padding:24px}
    .top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px}
    h1{margin:0;font-size:28px}.sub{color:var(--muted);margin-top:5px}
    .back{background:#fff;border:1px solid var(--line);padding:10px 14px;border-radius:10px;text-decoration:none;color:var(--ink)}
    .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:18px;box-shadow:0 2px 8px rgba(16,24,40,.04)}
    .context{display:grid;grid-template-columns:220px 1fr;gap:14px;align-items:end}
    select{width:100%;border:1px solid #b9c7d8;border-radius:10px;padding:10px 12px;background:#fff;font:inherit}
    .tabs{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
    .tab{border:1px solid var(--line);background:#fff;padding:9px 12px;border-radius:10px;cursor:pointer;font-weight:700}
    .tab.active{background:var(--accent);color:#fff;border-color:var(--accent)}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    .metric{background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:12px}
    .metric span{display:block;color:var(--muted);font-size:12px}.metric b{font-size:22px}
    .table-wrap{overflow:auto}
    table{width:100%;border-collapse:separate;border-spacing:0;min-width:1200px}
    th,td{padding:10px 9px;border-bottom:1px solid #edf0f4;text-align:left;vertical-align:top}
    th{position:sticky;top:0;background:#f8fafc;z-index:2;font-size:13px;color:#475467}
    tbody tr:hover{background:#fafcff}
    .student{font-weight:700}.small{font-size:12px;color:var(--muted)}
    .status-pill{display:inline-block;padding:5px 8px;border-radius:999px;font-size:12px;font-weight:800}
    .s-SANS_CONVENTION{background:#fff1f2;color:#b42318}
    .s-ENREGISTREE,.s-DEPOSEE,.s-SIGNEE{background:#fff7ed;color:#b45309}
    .s-FINALISEE,.s-REMISE,.s-AUTORISEE{background:#ecfdf3;color:#067647}
    .s-ANNULEE,.s-INTERROMPUE,.s-SUPPRIMEE{background:#fee4e2;color:#b42318}
    .empty{color:var(--muted);font-style:italic}
    .future{color:#667085;background:#f8fafc;border-radius:8px;padding:6px 8px;font-size:12px}
    .period-meta{margin-top:8px;color:var(--muted)}
    @media(max-width:850px){.context,.summary{grid-template-columns:1fr 1fr}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div>
      <h1 id="pageTitle">Suivi PFMP</h1>
      <div id="pageSub" class="sub"></div>
    </div>
    <a id="back" class="back" href="#">← Retour aux classes</a>
  </div>

  <div class="card">
    <div class="context">
      <div>
        <label for="yearSelect" style="display:block;font-weight:700;margin-bottom:7px">Année scolaire</label>
        <select id="yearSelect"></select>
      </div>
      <div>
        <b id="classLabel"></b>
        <div class="period-meta" id="ppLabel"></div>
      </div>
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
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
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

  let yearContext=ANNEE_CTX||{annees:[],active:''};
  let detail=DETAIL_INIT||{};

  function esc(v){const d=document.createElement('div');d.textContent=v==null?'':v;return d.innerHTML}

  function renderYears(){
    yearSelect.innerHTML=(yearContext.annees||[]).map(function(y){
      return '<option value="'+esc(y.code)+'"'+(y.code===detail.annee?' selected':'')+'>'+esc(y.libelle||y.code)+'</option>';
    }).join('');
  }

  function renderTabs(){
    periodTabs.innerHTML=(detail.periodes||[]).map(function(p){
      const active=detail.periode&&Number(detail.periode.id)===Number(p.id);
      return '<button class="tab'+(active?' active':'')+'" data-p="'+p.id+'">'+esc(p.libelle)+'</button>';
    }).join('');

    Array.from(periodTabs.querySelectorAll('[data-p]')).forEach(function(btn){
      btn.onclick=function(){
        const p=btn.dataset.p;
        window.location.href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(detail.annee)+'&classe='+encodeURIComponent(detail.classe.id)+'&periode='+encodeURIComponent(p);
      };
    });
  }

  function statusPill(x){
    return '<span class="status-pill s-'+esc(x.statutCode)+'">'+esc(x.statut)+'</span>';
  }

  function val(v){
    return v?esc(v):'<span class="empty">—</span>';
  }

  function render(){
    back.href=C.baseUrl+'?page=suivi-pfmp-classes';

    pageTitle.textContent='Suivi PFMP — '+(detail.classe&&detail.classe.nom||'Classe');
    pageSub.textContent=detail.periode
      ? [detail.periode.libelle,detail.periode.debut,detail.periode.fin].filter(Boolean).join(' · ')
      : 'Aucune période sélectionnée';

    classLabel.textContent=(detail.classe&&detail.classe.nom||'')+' — '+detail.annee;

    const pp=(detail.professeursPrincipaux||[]).map(function(p){return p.nom}).join(' / ');
    ppLabel.textContent='Professeur principal : '+(pp||'non renseigné');

    renderYears();
    renderTabs();

    const s=detail.stats||{};
    document.getElementById('mTotal').textContent=s.total||0;
    document.getElementById('mAvec').textContent=s.avecConvention||0;
    document.getElementById('mSans').textContent=s.sansConvention||0;
    document.getElementById('mIncident').textContent=(s.annulees||0)+(s.interrompues||0);

    tbody.innerHTML=(detail.lignes||[]).map(function(x){
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
    }).join('');
  }

  yearSelect.onchange=function(){
    const code=yearSelect.value;
    google.script.run
      .withSuccessHandler(function(){
        window.location.href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(code)+'&classe='+encodeURIComponent(detail.classe.id);
      })
      .withFailureHandler(function(e){alert('Erreur : '+(e&&e.message||e))})
      .EUC_PFMP_definirAnneeActiveV148(code);
  };

  render();
})();
</script>
</body>
</html>
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EDT.js")
s=p.read_text(encoding="utf-8")

route="  if (page === 'suivi-pfmp-classe') return EUC_SUIVI_CLASSE_afficherV155(e);"

if "page === 'suivi-pfmp-classe'" not in s:
    anchor="  if (page === 'suivi-pfmp-classes') return EUC_SUIVI_CLASSES_afficherV154(e);"
    if anchor not in s:
        raise SystemExit("ERREUR : route suivi-pfmp-classes introuvable.")
    s=s.replace(anchor,anchor+"\n"+route,1)

p.write_text(s,encoding="utf-8")
print("OK : route détail classe ajoutée.")
PY

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Suivi_PFMP_Classes.html")
s=p.read_text(encoding="utf-8")

old="""        return '<div class="card classcard"><div class="classhead"><b>'+esc(c.classe)+'</b><span class="badge">'+c.effectif+' élève(s)</span></div>'+periods+'<div class="coming">Tableau détaillé par période : DEV.155</div></div>';"""

new="""        return '<div class="card classcard" data-class="'+c.classeId+'"><div class="classhead"><b>'+esc(c.classe)+'</b><span class="badge">'+c.effectif+' élève(s)</span></div>'+periods+'<div class="coming">Cliquer pour ouvrir le tableau détaillé</div></div>';"""

if old in s:
    s=s.replace(old,new,1)
elif 'data-class="'+c.classeId+'"' not in s:
    raise SystemExit("ERREUR : rendu vignette classe introuvable.")

anchor="""    content.innerHTML=html||'<div class="card empty">Aucune classe PFMP pour cette année scolaire.</div>';
    status.textContent=(accueil.cartes||[]).length+' classe(s) affichée(s) pour '+yearContext.active+'.';"""

replacement="""    content.innerHTML=html||'<div class="card empty">Aucune classe PFMP pour cette année scolaire.</div>';
    status.textContent=(accueil.cartes||[]).length+' classe(s) affichée(s) pour '+yearContext.active+'.';

    Array.from(content.querySelectorAll('[data-class]')).forEach(function(el){
      el.onclick=function(){
        window.location.href=C.baseUrl+'?page=suivi-pfmp-classe&annee='+encodeURIComponent(yearContext.active)+'&classe='+encodeURIComponent(el.dataset.class);
      };
    });"""

if anchor in s:
    s=s.replace(anchor,replacement,1)
elif "querySelectorAll('[data-class]')" not in s:
    raise SystemExit("ERREUR : ancre clic classe introuvable.")

p.write_text(s,encoding="utf-8")
print("OK : vignettes classes cliquables.")
PY

echo "============================================================"
echo " DEV.155 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_ClasseDetailV155.js
node --check /tmp/EUC_SUIVI_PFMP_ClasseDetailV155.js

cp "$ROUTER" /tmp/EDT_DEV155.js
node --check /tmp/EDT_DEV155.js

grep -q "EUC_SUIVI_CLASSE_detailV155" "$SERVICE"
grep -q "EUC_SUIVI_CLASSE_afficherV155" "$SERVICE"
grep -q "page === 'suivi-pfmp-classe'" "$ROUTER"
grep -q "Affectation en DEV.156" "$PAGE"
grep -q "querySelectorAll('\[data-class\]')" "$HOME"

echo "OK : page détail classe prête."
echo "OK : période sélectionnable."
echo "OK : année scolaire conservée."
echo "OK : tableau élèves / entreprise / PP."
echo "OK : colonnes téléphone / visite préparées pour DEV.156."

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
echo " DEV.155 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ clic sur une classe"
echo "✓ tableau détaillé par période"
echo "✓ année scolaire active"
echo "✓ élèves"
echo "✓ statut convention"
echo "✓ entreprise + adresse + contact"
echo "✓ professeur principal automatique"
echo "✓ colonnes suivi téléphonique / visiteur préparées"
echo "✓ push + version + déploiement principal"
echo "============================================================"
