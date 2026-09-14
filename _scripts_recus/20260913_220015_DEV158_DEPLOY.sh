#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.158"

SERVICE="apps-script/EUC_SUIVI_PFMP_DestinatairesV158.gs"
PAGE="apps-script/Destinataires_Envois_PFMP_V158.html"
PARAM_PAGE="apps-script/Parametres_Envois_PFMP_V157.html"
ADMIN_HOME="apps-script/Admin_PFMP.html"
V157_SERVICE="apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs"
ROUTER="apps-script/EDT.js"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV158_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$PAGE" "$PARAM_PAGE" "$ADMIN_HOME" "$V157_SERVICE" "$ROUTER"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

echo "============================================================"
echo " DEV.158 — DESTINATAIRES & DROITS D'ENVOI"
echo "============================================================"

cat > "$SERVICE" <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.158 */
var EUC_V158_TABLE_='EUC_DESTINATAIRES_ENVOIS_PFMP';

var EUC_V158_SEED_=[
  {code:'PROVISEUR',fonction:'Proviseur',legacy:'SUIVI_PFMP_CC_PROVISEUR'},
  {code:'PROVISEUR_ADJOINT_LGT',fonction:'Proviseur adjoint — lycée général et technologique',legacy:'SUIVI_PFMP_CC_PROVISEUR_ADJOINT_LGT'},
  {code:'RESPONSABLE_LP',fonction:'Proviseur / responsable — lycée professionnel',legacy:'SUIVI_PFMP_CC_PROVISEUR_LP'},
  {code:'RESTAURATION',fonction:'Responsable du service de restauration',legacy:'SUIVI_PFMP_CC_RESTAURATION'},
  {code:'SECRETAIRE_GENERAL',fonction:'Secrétaire général',legacy:'SUIVI_PFMP_CC_SECRETAIRE_GENERAL'},
  {code:'BUREAU_ENTREPRISES',fonction:'Responsable du bureau des entreprises',legacy:'SUIVI_PFMP_CC_BUREAU_ENTREPRISES'},
  {code:'CPE_LP',fonction:'CPE vie scolaire — lycée professionnel',legacy:'SUIVI_PFMP_CC_CPE_LP'},
  {code:'CPE_LGT_1',fonction:'CPE vie scolaire — lycée général et technologique 1',legacy:'SUIVI_PFMP_CC_CPE_LGT_1'},
  {code:'CPE_LGT_2',fonction:'CPE vie scolaire — lycée général et technologique 2',legacy:'SUIVI_PFMP_CC_CPE_LGT_2'},
  {code:'DDFPT_NUMERIQUE',fonction:'DDFPT — filières du numérique',legacy:'SUIVI_PFMP_CC_DDFPT_NUMERIQUE'},
  {code:'DDFPT_MECANIQUE',fonction:'DDFPT — filières mécaniques',legacy:'SUIVI_PFMP_CC_DDFPT_MECANIQUE'},
  {code:'ASSISTANTE_DDFPT',fonction:'Assistante DDFPT',legacy:'SUIVI_PFMP_CC_ASSISTANTE_DDFPT'}
];

function EUC_V158_txt_(v){return String(v==null?'':v).trim();}
function EUC_V158_bool_(v){
  if(v===true)return true;
  var s=EUC_V158_txt_(v).toLowerCase();
  return ['1','true','oui','yes','on'].indexOf(s)>=0;
}
function EUC_V158_col_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}

function EUC_V158_assurerTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tables.some(function(t){return t.id===EUC_V158_TABLE_;});
  var c=EUC_V158_col_;
  var cols=[
    c('Code','Code'),
    c('Fonction','Fonction'),
    c('Nom','Nom'),
    c('Email','Email'),
    c('Actif','Actif','Bool'),
    c('TABLEAUX_SUIVI','Tableaux de suivi PFMP','Bool'),
    c('Ordre','Ordre','Int')
  ];
  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V158_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V158_TABLE_+'/columns').columns||[];
    var have={};current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_V158_TABLE_+'/columns',{columns:missing});
  }
  return true;
}

function EUC_V158_legacyMap_(){
  try{
    if(typeof EUC_V157_paramMap_==='function')return EUC_V157_paramMap_()||{};
  }catch(e){}
  return {};
}

function EUC_V158_assurerLignes_(){
  EUC_V158_assurerTable_();
  var rows=EUC_IMPORT_lireRecords_(EUC_V158_TABLE_);
  var byCode={};rows.forEach(function(r){byCode[EUC_V158_txt_(r.Code)]=r;});
  var legacy=EUC_V158_legacyMap_();

  EUC_V158_SEED_.forEach(function(seed,i){
    if(byCode[seed.code])return;
    var email='',actif=false;
    try{
      email=EUC_V158_txt_(legacy[seed.legacy+'_EMAIL']&&legacy[seed.legacy+'_EMAIL'].Valeur);
      actif=EUC_V158_bool_(legacy[seed.legacy+'_ACTIF']&&legacy[seed.legacy+'_ACTIF'].Valeur);
    }catch(e){}
    EUC_ENT_grist('post','/tables/'+EUC_V158_TABLE_+'/records',{
      records:[{fields:{
        Code:seed.code,Fonction:seed.fonction,Nom:'',Email:email,
        Actif:true,TABLEAUX_SUIVI:actif,Ordre:i+1
      }}]
    });
  });
  return true;
}

function INSTALLER_DEV158_DESTINATAIRES(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V158_assurerLignes_();
  return {ok:true,table:EUC_V158_TABLE_};
}

function EUC_V158_lire(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V158_assurerLignes_();
  return EUC_IMPORT_lireRecords_(EUC_V158_TABLE_).map(function(r){
    return {
      id:Number(r.id),code:EUC_V158_txt_(r.Code),fonction:EUC_V158_txt_(r.Fonction),
      nom:EUC_V158_txt_(r.Nom),email:EUC_V158_txt_(r.Email),actif:r.Actif!==false,
      tableauxSuivi:EUC_V158_bool_(r.TABLEAUX_SUIVI),ordre:Number(r.Ordre)||999
    };
  }).sort(function(a,b){return a.ordre-b.ordre||a.fonction.localeCompare(b.fonction,'fr');});
}

function EUC_V158_sauver(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  payload=payload||{};
  EUC_V158_assurerLignes_();

  var current=EUC_IMPORT_lireRecords_(EUC_V158_TABLE_);
  var byId={};current.forEach(function(r){byId[Number(r.id)]=r;});

  (payload.lignes||[]).forEach(function(x){
    var id=Number(x.id);
    if(!id||!byId[id])return;
    EUC_ENT_grist('patch','/tables/'+EUC_V158_TABLE_+'/records',{
      records:[{id:id,fields:{
        Nom:EUC_V158_txt_(x.nom),
        Email:EUC_V158_txt_(x.email),
        Actif:x.actif!==false,
        TABLEAUX_SUIVI:x.tableauxSuivi===true
      }}]
    });
  });

  return EUC_V158_lire();
}

function EUC_V158_ccMails_(){
  try{EUC_V158_assurerLignes_();}catch(e){return [];}
  var set={};
  EUC_IMPORT_lireRecords_(EUC_V158_TABLE_).forEach(function(r){
    if(r.Actif===false)return;
    if(!EUC_V158_bool_(r.TABLEAUX_SUIVI))return;
    var email=EUC_V158_txt_(r.Email).toLowerCase();
    if(email&&email.indexOf('@')>0)set[email]=true;
  });
  return Object.keys(set);
}

function EUC_V158_afficher(e){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  var tpl=HtmlService.createTemplateFromFile('Destinataires_Envois_PFMP_V158');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.dataJson=JSON.stringify(EUC_V158_lire());
  return tpl.evaluate().setTitle('Destinataires & envois PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
EOF

cat > "$PAGE" <<'EOF'
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;background:#f4f7fb;margin:0;color:#1d2939}
    .wrap{max-width:1180px;margin:auto;padding:24px}
    .top{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px}
    h1{margin:0}.sub{color:#667085}
    .card{background:#fff;border:1px solid #d9e1ec;border-radius:16px;padding:18px}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #edf0f4;padding:10px;text-align:left;vertical-align:middle}
    th{background:#f8fafc;color:#475467;font-size:13px}
    input[type=text],input[type=email]{width:100%;box-sizing:border-box;border:1px solid #b9c7d8;border-radius:9px;padding:9px 10px}
    input[type=checkbox]{width:18px;height:18px}
    .actions{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}
    button,a.btn{border:0;border-radius:9px;padding:10px 14px;font-weight:700;text-decoration:none;cursor:pointer}
    .primary{background:#165d9c;color:#fff}.secondary{background:#fff;color:#1d2939;border:1px solid #d9e1ec}
    #status{display:none;padding:10px 12px;border-radius:10px;margin-bottom:14px;font-weight:700}
    #status.show{display:block}.ok{background:#ecfdf3;color:#067647}.err{background:#fff1f2;color:#b42318}.info{background:#eef5fb;color:#164e7a}
    .spinner{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;margin-right:8px;vertical-align:-2px;animation:spin .75s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .hint{background:#eef5fb;border:1px solid #cfe0ef;border-radius:12px;padding:12px 14px;margin-bottom:16px;color:#164e7a}
  </style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div>
      <h1>Destinataires & envois PFMP</h1>
      <div class="sub">Table centrale des personnes et des droits de diffusion.</div>
    </div>
    <a id="back" class="btn secondary" href="#">← Retour</a>
  </div>

  <div class="hint">
    Les professeurs principal, de suivi téléphonique et visiteurs restent ajoutés automatiquement.
    Cette table gère les destinataires institutionnels. De futures colonnes d'envoi pourront être ajoutées ici.
  </div>

  <div id="status"></div>

  <div class="card">
    <table>
      <thead>
        <tr>
          <th style="width:28%">Fonction</th>
          <th style="width:20%">Nom</th>
          <th>Email</th>
          <th style="width:80px">Actif</th>
          <th style="width:150px">Tableaux de suivi PFMP</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>

    <div class="actions">
      <button id="save" class="primary" type="button">Enregistrer</button>
    </div>
  </div>
</div>

<script>
const C=<?!= config ?>;
let DATA=<?!= dataJson ?>;

const tbody=document.getElementById('tbody');
const save=document.getElementById('save');
const status=document.getElementById('status');

function esc(v){const d=document.createElement('div');d.textContent=v==null?'':v;return d.innerHTML}
function show(text,type){status.textContent=text||'';status.className=text?'show '+type:''}

function render(){
  tbody.innerHTML=(DATA||[]).map(function(x){
    return '<tr data-id="'+x.id+'">'+
      '<td><b>'+esc(x.fonction)+'</b></td>'+
      '<td><input class="nom" type="text" value="'+esc(x.nom||'')+'" placeholder="Nom de la personne"></td>'+
      '<td><input class="email" type="email" value="'+esc(x.email||'')+'" placeholder="adresse@domaine.fr"></td>'+
      '<td><input class="actif" type="checkbox" '+(x.actif?'checked':'')+'></td>'+
      '<td><input class="tableaux" type="checkbox" '+(x.tableauxSuivi?'checked':'')+'></td>'+
    '</tr>';
  }).join('');
}

save.onclick=function(){
  const old=save.innerHTML;
  save.disabled=true;
  save.innerHTML='<span class="spinner"></span>Enregistrement en cours...';
  show('Enregistrement en cours...','info');

  const lignes=Array.from(tbody.querySelectorAll('tr[data-id]')).map(function(tr){
    return {
      id:Number(tr.dataset.id),
      nom:tr.querySelector('.nom').value.trim(),
      email:tr.querySelector('.email').value.trim(),
      actif:tr.querySelector('.actif').checked,
      tableauxSuivi:tr.querySelector('.tableaux').checked
    };
  });

  google.script.run
    .withSuccessHandler(function(r){
      DATA=r;render();save.disabled=false;save.innerHTML=old;show('Paramètres enregistrés.','ok');
    })
    .withFailureHandler(function(e){
      save.disabled=false;save.innerHTML=old;show('Erreur : '+(e&&e.message||e),'err');
    })
    .EUC_V158_sauver({lignes:lignes});
};

document.getElementById('back').href=C.baseUrl+'?page=admin-pfmp';
render();
</script>
</body>
</html>
EOF

cat > "$PARAM_PAGE" <<'EOF'
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;background:#f4f7fb;margin:0;color:#1d2939}
    .wrap{max-width:950px;margin:auto;padding:24px}
    .card{background:#fff;border:1px solid #d9e1ec;border-radius:16px;padding:18px;margin-bottom:18px}
    h1{margin-top:0}.sub{color:#667085}
    label{font-weight:700;display:block;margin-bottom:6px}
    input[type=text],textarea{width:100%;box-sizing:border-box;border:1px solid #b9c7d8;border-radius:9px;padding:9px 10px}
    textarea{min-height:140px}
    .actions{display:flex;gap:10px;justify-content:flex-end}
    button,a.btn{border:0;border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none}
    .primary{background:#165d9c;color:#fff}.secondary{background:#fff;color:#1d2939;border:1px solid #d9e1ec}
    #status{display:none;padding:10px 12px;border-radius:10px;margin-bottom:14px;font-weight:700}
    #status.show{display:block}.ok{background:#ecfdf3;color:#067647}.err{background:#fff1f2;color:#b42318}.info{background:#eef5fb;color:#164e7a}
    .spinner{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;margin-right:8px;vertical-align:-2px;animation:spin .75s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
<div class="wrap">
  <h1>Paramètres du mail de suivi PFMP</h1>
  <p class="sub">Ici se règlent le sujet et le texte du mail. Les destinataires institutionnels sont gérés dans la table centrale « Destinataires & envois ».</p>

  <div id="status"></div>

  <div class="card">
    <label>Objet du mail</label>
    <input id="objet" type="text">
    <div class="sub" style="margin-top:6px">Variables : {{CLASSE}}, {{PERIODE}}, {{ANNEE}}</div>
  </div>

  <div class="card">
    <label>Message d’accompagnement</label>
    <textarea id="message"></textarea>
  </div>

  <div class="actions">
    <a id="destinataires" class="btn secondary" href="#">Destinataires & envois</a>
    <a id="back" class="btn secondary" href="#">Retour</a>
    <button id="save" class="primary" type="button">Enregistrer</button>
  </div>
</div>

<script>
const C=<?!= config ?>;
let P=<?!= paramsJson ?>;
const status=document.getElementById('status');
const save=document.getElementById('save');

function show(text,type){status.textContent=text||'';status.className=text?'show '+type:''}
function render(){
  document.getElementById('objet').value=P.objet||'';
  document.getElementById('message').value=P.message||'';
}

save.onclick=function(){
  const old=save.innerHTML;
  save.disabled=true;
  save.innerHTML='<span class="spinner"></span>Enregistrement en cours...';
  show('Enregistrement en cours...','info');

  google.script.run
    .withSuccessHandler(function(r){
      P=r;render();save.disabled=false;save.innerHTML=old;show('Paramètres enregistrés.','ok');
    })
    .withFailureHandler(function(e){
      save.disabled=false;save.innerHTML=old;show('Erreur : '+(e&&e.message||e),'err');
    })
    .EUC_V157_sauverParametres({
      objet:document.getElementById('objet').value,
      message:document.getElementById('message').value,
      destinataires:[]
    });
};

document.getElementById('back').href=C.baseUrl+'?page=suivi-pfmp-classes';
document.getElementById('destinataires').href=C.baseUrl+'?page=destinataires-envois-pfmp';
render();
</script>
</body>
</html>
EOF

python3 <<'PY'
from pathlib import Path

# V157 => droits V158
p=Path("apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs")
s=p.read_text(encoding="utf-8")
if "cc:EUC_V158_ccMails_()," not in s:
    s=s.replace("cc:EUC_V157_ccMails_(),","cc:EUC_V158_ccMails_(),",1)
p.write_text(s,encoding="utf-8")
print("OK : envois V157 branchés sur V158.")

# Route
p=Path("apps-script/EDT.js")
s=p.read_text(encoding="utf-8")
if "destinataires-envois-pfmp" not in s:
    marker="if (page === 'parametres-envois-pfmp')"
    pos=s.find(marker)
    if pos<0:
        marker="if(page === 'parametres-envois-pfmp')"
        pos=s.find(marker)
    if pos<0:
        raise SystemExit("ERREUR : route paramètres envois introuvable.")
    route="if (page === 'destinataires-envois-pfmp') return EUC_V158_afficher(e);
  "
    s=s[:pos]+route+s[pos:]
p.write_text(s,encoding="utf-8")
print("OK : route V158 ajoutée.")

# Vignette accueil Admin PFMP
p=Path("apps-script/Admin_PFMP.html")
s=p.read_text(encoding="utf-8")

if "destinataires-envois-pfmp" not in s:
    snippet = (
        '<style id="destV158Style">\n'
        '.euc-v158-tile{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #d9e1ec;border-radius:16px;padding:18px;margin:16px 0;box-shadow:0 2px 8px rgba(16,24,40,.05);transition:.15s ease}\n'
        '.euc-v158-tile:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(16,24,40,.10)}\n'
        '.euc-v158-title{font-weight:800;font-size:18px;color:#163a63;margin-bottom:6px}\n'
        '.euc-v158-sub{color:#667085;font-size:13px}\n'
        '</style>\n'
        '<script id="destV158Script">\n'
        '(function(){\n'
        '  function addV158Tile(){\n'
        '    if(document.getElementById("destV158Tile"))return;\n'
        '    const a=document.createElement("a");\n'
        '    a.id="destV158Tile";\n'
        '    a.className="euc-v158-tile";\n'
        '    a.href=location.href.split("?")[0]+"?page=destinataires-envois-pfmp";\n'
        '    a.innerHTML="<div class=\"euc-v158-title\">✉ Destinataires & envois</div><div class=\"euc-v158-sub\">Gérer les personnes, leurs emails et les documents qu’elles doivent recevoir.</div>";\n'
        '    const host=document.querySelector(".tiles,.cards,.grid,.menu-grid,.actions-grid,main,.container") || document.body;\n'
        '    host.appendChild(a);\n'
        '  }\n'
        '  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addV158Tile);else addV158Tile();\n'
        '})();\n'
        '</script>\n'
    )
    if "</body>" not in s:
        raise SystemExit("ERREUR : balise </body> absente de Admin_PFMP.html.")
    s=s.replace("</body>",snippet+"</body>",1)

p.write_text(s,encoding="utf-8")
print("OK : vignette Admin PFMP ajoutée.")
PY

echo "============================================================"
echo " DEV.158 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_DestinatairesV158.js
cp "$V157_SERVICE" /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV158.js
cp "$ROUTER" /tmp/EDT_DEV158.js

node --check /tmp/EUC_SUIVI_PFMP_DestinatairesV158.js
node --check /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV158.js
node --check /tmp/EDT_DEV158.js

grep -q "EUC_DESTINATAIRES_ENVOIS_PFMP" "$SERVICE"
grep -q "TABLEAUX_SUIVI" "$SERVICE"
grep -q "EUC_V158_ccMails_" "$V157_SERVICE"
grep -q "destinataires-envois-pfmp" "$ROUTER"
grep -q "destV158Tile" "$ADMIN_HOME"
grep -q "Enregistrement en cours" "$PAGE"
grep -q "Enregistrement en cours" "$PARAM_PAGE"

echo "OK : table centrale prête."
echo "OK : colonne Tableaux de suivi PFMP."
echo "OK : envois V157 utilisent les droits V158."
echo "OK : vignette accueil Admin PFMP."
echo "OK : spinner sur les boutons Enregistrer."

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
echo " DEV.158 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ table centrale Destinataires & envois"
echo "✓ droits Tableaux de suivi PFMP"
echo "✓ migration automatique des anciens emails si présents"
echo "✓ vignette sur l'accueil Admin PFMP"
echo "✓ paramètres mail séparés des destinataires"
echo "✓ spinner Enregistrement en cours..."
echo "✓ push + version + déploiement principal"
echo "============================================================"
