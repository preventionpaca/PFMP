#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.159"

SERVICE="apps-script/EUC_SUIVI_PFMP_DestinatairesV158.gs"
PAGE="apps-script/Destinataires_Envois_PFMP_V158.html"
V157="apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV159_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$PAGE" "$V157"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.159 — PERIMETRES ETABLISSEMENT + FILIERE"
echo "============================================================"

cat > "$SERVICE" <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.159
 * Destinataires + périmètres établissement/filière.
 */

var EUC_V158_TABLE_='EUC_DESTINATAIRES_ENVOIS_PFMP';
var EUC_V159_CLASSES_TABLE_='EUC_PERIMETRES_CLASSES_PFMP';

var EUC_V158_SEED_=[
  {code:'PROVISEUR',fonction:'Proviseur',legacy:'SUIVI_PFMP_CC_PROVISEUR',etab:'TOUS'},
  {code:'PROVISEUR_ADJOINT_LGT',fonction:'Proviseur adjoint — lycée général et technologique',legacy:'SUIVI_PFMP_CC_PROVISEUR_ADJOINT_LGT',etab:'LGT'},
  {code:'RESPONSABLE_LP',fonction:'Proviseur / responsable — lycée professionnel',legacy:'SUIVI_PFMP_CC_PROVISEUR_LP',etab:'LP'},
  {code:'RESTAURATION',fonction:'Responsable du service de restauration',legacy:'SUIVI_PFMP_CC_RESTAURATION',etab:'TOUS'},
  {code:'SECRETAIRE_GENERAL',fonction:'Secrétaire général',legacy:'SUIVI_PFMP_CC_SECRETAIRE_GENERAL',etab:'TOUS'},
  {code:'BUREAU_ENTREPRISES',fonction:'Responsable du bureau des entreprises',legacy:'SUIVI_PFMP_CC_BUREAU_ENTREPRISES',etab:'TOUS'},
  {code:'CPE_LP',fonction:'CPE vie scolaire — lycée professionnel',legacy:'SUIVI_PFMP_CC_CPE_LP',etab:'LP'},
  {code:'CPE_LGT_1',fonction:'CPE vie scolaire — lycée général et technologique 1',legacy:'SUIVI_PFMP_CC_CPE_LGT_1',etab:'LGT'},
  {code:'CPE_LGT_2',fonction:'CPE vie scolaire — lycée général et technologique 2',legacy:'SUIVI_PFMP_CC_CPE_LGT_2',etab:'LGT'},
  {code:'DDFPT_NUMERIQUE',fonction:'DDFPT — filières du numérique',legacy:'SUIVI_PFMP_CC_DDFPT_NUMERIQUE',etab:'TOUS'},
  {code:'DDFPT_MECANIQUE',fonction:'DDFPT — filières mécaniques',legacy:'SUIVI_PFMP_CC_DDFPT_MECANIQUE',etab:'TOUS'},
  {code:'ASSISTANTE_DDFPT',fonction:'Assistante DDFPT',legacy:'SUIVI_PFMP_CC_ASSISTANTE_DDFPT',etab:'TOUS'}
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
    c('Perimetre_etablissement','Périmètre établissement'),
    c('Filieres_JSON','Filières concernées'),
    c('Ordre','Ordre','Int')
  ];

  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V158_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V158_TABLE_+'/columns').columns||[];
    var have={}; current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_V158_TABLE_+'/columns',{columns:missing});
  }
  return true;
}

function EUC_V159_assurerTableClasses_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tables.some(function(t){return t.id===EUC_V159_CLASSES_TABLE_;});
  var c=EUC_V158_col_;
  var cols=[
    c('Classe','Classe','Ref:Classes'),
    c('Libelle_classe','Libellé classe'),
    c('Etablissement','Établissement'),
    c('Filiere','Filière'),
    c('Actif','Actif','Bool'),
    c('Ordre','Ordre','Int')
  ];

  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V159_CLASSES_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V159_CLASSES_TABLE_+'/columns').columns||[];
    var have={}; current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_V159_CLASSES_TABLE_+'/columns',{columns:missing});
  }
  return true;
}

function EUC_V159_classeLabel_(r){
  return EUC_V158_txt_(r.Nom||r.Classe||r.Libelle||r.Code||r.Label||('Classe '+r.id));
}

function EUC_V159_guessEtab_(r){
  var raw=EUC_V158_txt_(r.Etablissement||r.Type_etablissement||r.Structure||r.Site).toUpperCase();
  if(raw.indexOf('PROF')>=0||raw==='LP')return 'LP';
  if(raw.indexOf('GENERAL')>=0||raw.indexOf('GÉNÉRAL')>=0||raw.indexOf('TECHNO')>=0||raw==='LGT')return 'LGT';
  return '';
}

function EUC_V159_guessFiliere_(r){
  return EUC_V158_txt_(r.Filiere||r['Filière']||r.Formation||r.Diplome||r['Diplôme']||r.Libelle_diplome||r.Diplome_libelle);
}

function EUC_V159_assurerClasses_(){
  EUC_V159_assurerTableClasses_();

  var mapRows=EUC_IMPORT_lireRecords_(EUC_V159_CLASSES_TABLE_);
  var byClasse={};
  mapRows.forEach(function(r){
    var cid=Number(EUC_PFMP_ref_(r.Classe));
    if(cid)byClasse[cid]=r;
  });

  var classes=EUC_IMPORT_lireRecords_('Classes');
  classes.forEach(function(r,i){
    var id=Number(r.id);
    if(!id||byClasse[id])return;

    EUC_ENT_grist('post','/tables/'+EUC_V159_CLASSES_TABLE_+'/records',{
      records:[{fields:{
        Classe:id,
        Libelle_classe:EUC_V159_classeLabel_(r),
        Etablissement:EUC_V159_guessEtab_(r),
        Filiere:EUC_V159_guessFiliere_(r),
        Actif:true,
        Ordre:i+1
      }}]
    });
  });

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
  var byCode={}; rows.forEach(function(r){byCode[EUC_V158_txt_(r.Code)]=r;});
  var legacy=EUC_V158_legacyMap_();

  EUC_V158_SEED_.forEach(function(seed,i){
    if(byCode[seed.code]){
      if(!EUC_V158_txt_(byCode[seed.code].Perimetre_etablissement)){
        EUC_ENT_grist('patch','/tables/'+EUC_V158_TABLE_+'/records',{
          records:[{id:byCode[seed.code].id,fields:{Perimetre_etablissement:seed.etab||'TOUS'}}]
        });
      }
      return;
    }

    var email='',actif=false;
    try{
      email=EUC_V158_txt_(legacy[seed.legacy+'_EMAIL']&&legacy[seed.legacy+'_EMAIL'].Valeur);
      actif=EUC_V158_bool_(legacy[seed.legacy+'_ACTIF']&&legacy[seed.legacy+'_ACTIF'].Valeur);
    }catch(e){}

    EUC_ENT_grist('post','/tables/'+EUC_V158_TABLE_+'/records',{
      records:[{fields:{
        Code:seed.code,Fonction:seed.fonction,Nom:'',Email:email,
        Actif:true,TABLEAUX_SUIVI:actif,
        Perimetre_etablissement:seed.etab||'TOUS',
        Filieres_JSON:'[]',
        Ordre:i+1
      }}]
    });
  });

  return true;
}

function EUC_V159_parseFilieres_(raw){
  raw=EUC_V158_txt_(raw);
  if(!raw)return [];
  try{
    var a=JSON.parse(raw);
    return Array.isArray(a)?a.map(EUC_V158_txt_).filter(Boolean):[];
  }catch(e){
    return raw.split(',').map(EUC_V158_txt_).filter(Boolean);
  }
}

function EUC_V159_catalogueClasses_(){
  EUC_V159_assurerClasses_();
  return EUC_IMPORT_lireRecords_(EUC_V159_CLASSES_TABLE_)
    .map(function(r){
      return {
        id:Number(r.id),
        classeId:Number(EUC_PFMP_ref_(r.Classe)),
        classe:EUC_V158_txt_(r.Libelle_classe),
        etablissement:EUC_V158_txt_(r.Etablissement).toUpperCase(),
        filiere:EUC_V158_txt_(r.Filiere),
        actif:r.Actif!==false,
        ordre:Number(r.Ordre)||999
      };
    })
    .sort(function(a,b){return a.ordre-b.ordre||a.classe.localeCompare(b.classe,'fr');});
}

function EUC_V159_filieresCatalogue_(){
  var set={};
  EUC_V159_catalogueClasses_().forEach(function(x){
    if(x.actif&&x.filiere)set[x.filiere]=true;
  });
  return Object.keys(set).sort(function(a,b){return a.localeCompare(b,'fr');});
}

function INSTALLER_DEV159_PERIMETRES(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V158_assurerLignes_();
  EUC_V159_assurerClasses_();
  return {ok:true};
}

function EUC_V158_lire(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  EUC_V158_assurerLignes_();
  EUC_V159_assurerClasses_();

  var lignes=EUC_IMPORT_lireRecords_(EUC_V158_TABLE_).map(function(r){
    return {
      id:Number(r.id),
      code:EUC_V158_txt_(r.Code),
      fonction:EUC_V158_txt_(r.Fonction),
      nom:EUC_V158_txt_(r.Nom),
      email:EUC_V158_txt_(r.Email),
      actif:r.Actif!==false,
      tableauxSuivi:EUC_V158_bool_(r.TABLEAUX_SUIVI),
      etablissement:EUC_V158_txt_(r.Perimetre_etablissement).toUpperCase()||'TOUS',
      filieres:EUC_V159_parseFilieres_(r.Filieres_JSON),
      ordre:Number(r.Ordre)||999
    };
  }).sort(function(a,b){return a.ordre-b.ordre||a.fonction.localeCompare(b.fonction,'fr');});

  return {
    lignes:lignes,
    classes:EUC_V159_catalogueClasses_(),
    filieres:EUC_V159_filieresCatalogue_()
  };
}

function EUC_V158_sauver(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  EUC_V158_assurerLignes_();
  EUC_V159_assurerClasses_();

  var current=EUC_IMPORT_lireRecords_(EUC_V158_TABLE_);
  var byId={}; current.forEach(function(r){byId[Number(r.id)]=r;});

  (payload.lignes||[]).forEach(function(x){
    var id=Number(x.id);
    if(!id||!byId[id])return;

    var etab=EUC_V158_txt_(x.etablissement).toUpperCase();
    if(['TOUS','LP','LGT'].indexOf(etab)<0)etab='TOUS';

    EUC_ENT_grist('patch','/tables/'+EUC_V158_TABLE_+'/records',{
      records:[{id:id,fields:{
        Nom:EUC_V158_txt_(x.nom),
        Email:EUC_V158_txt_(x.email),
        Actif:x.actif!==false,
        TABLEAUX_SUIVI:x.tableauxSuivi===true,
        Perimetre_etablissement:etab,
        Filieres_JSON:JSON.stringify((x.filieres||[]).map(EUC_V158_txt_).filter(Boolean))
      }}]
    });
  });

  var classRows=EUC_IMPORT_lireRecords_(EUC_V159_CLASSES_TABLE_);
  var byClassRow={}; classRows.forEach(function(r){byClassRow[Number(r.id)]=r;});

  (payload.classes||[]).forEach(function(x){
    var id=Number(x.id);
    if(!id||!byClassRow[id])return;

    var etab=EUC_V158_txt_(x.etablissement).toUpperCase();
    if(['','LP','LGT'].indexOf(etab)<0)etab='';

    EUC_ENT_grist('patch','/tables/'+EUC_V159_CLASSES_TABLE_+'/records',{
      records:[{id:id,fields:{
        Etablissement:etab,
        Filiere:EUC_V158_txt_(x.filiere),
        Actif:x.actif!==false
      }}]
    });
  });

  return EUC_V158_lire();
}

function EUC_V159_scopeClasse_(detail){
  EUC_V159_assurerClasses_();
  var cid=Number(detail&&detail.classe&&detail.classe.id);
  var row=EUC_IMPORT_lireRecords_(EUC_V159_CLASSES_TABLE_).filter(function(r){
    return Number(EUC_PFMP_ref_(r.Classe))===cid;
  })[0];

  return {
    etablissement:row?EUC_V158_txt_(row.Etablissement).toUpperCase():'',
    filiere:row?EUC_V158_txt_(row.Filiere):''
  };
}

function EUC_V158_ccMails_(detail){
  try{
    EUC_V158_assurerLignes_();
    EUC_V159_assurerClasses_();
  }catch(e){return [];}

  var scope=EUC_V159_scopeClasse_(detail);
  var set={};

  EUC_IMPORT_lireRecords_(EUC_V158_TABLE_).forEach(function(r){
    if(r.Actif===false)return;
    if(!EUC_V158_bool_(r.TABLEAUX_SUIVI))return;

    var etab=EUC_V158_txt_(r.Perimetre_etablissement).toUpperCase()||'TOUS';
    if(etab!=='TOUS' && etab!==scope.etablissement)return;

    var filieres=EUC_V159_parseFilieres_(r.Filieres_JSON);
    if(filieres.length && filieres.indexOf(scope.filiere)<0)return;

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

  return tpl.evaluate()
    .setTitle('Destinataires & envois PFMP')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
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
    .wrap{max-width:1450px;margin:auto;padding:24px}
    .top{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px}
    h1{margin:0}.sub{color:#667085}
    .card{background:#fff;border:1px solid #d9e1ec;border-radius:16px;padding:18px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #edf0f4;padding:9px;text-align:left;vertical-align:middle}
    th{background:#f8fafc;color:#475467;font-size:13px}
    input[type=text],input[type=email],select{width:100%;box-sizing:border-box;border:1px solid #b9c7d8;border-radius:9px;padding:8px 9px;background:#fff}
    select[multiple]{min-height:88px}
    input[type=checkbox]{width:18px;height:18px}
    .actions{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}
    button,a.btn{border:0;border-radius:9px;padding:10px 14px;font-weight:700;text-decoration:none;cursor:pointer}
    .primary{background:#165d9c;color:#fff}.secondary{background:#fff;color:#1d2939;border:1px solid #d9e1ec}
    #status{display:none;padding:10px 12px;border-radius:10px;margin-bottom:14px;font-weight:700}
    #status.show{display:block}.ok{background:#ecfdf3;color:#067647}.err{background:#fff1f2;color:#b42318}.info{background:#eef5fb;color:#164e7a}
    .spinner{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;margin-right:8px;vertical-align:-2px;animation:spin .75s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .hint{background:#eef5fb;border:1px solid #cfe0ef;border-radius:12px;padding:12px 14px;margin-bottom:16px;color:#164e7a}
    details{margin-top:18px}summary{cursor:pointer;font-weight:800;font-size:17px;padding:10px 0}
    .tiny{font-size:12px;color:#667085}
  </style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div>
      <h1>Destinataires & envois PFMP</h1>
      <div class="sub">Matrice centrale de diffusion par document, établissement et filière.</div>
    </div>
    <a id="back" class="btn secondary" href="#">← Retour</a>
  </div>

  <div class="hint">
    <b>Règle :</b> la personne reçoit le tableau si « Tableaux de suivi PFMP » est coché,
    si l’établissement correspond, et si la filière correspond. Une liste de filières vide signifie <b>toutes les filières</b>.
    Les professeurs du tableau restent ajoutés automatiquement.
  </div>

  <div id="status"></div>

  <div class="card">
    <h2>Destinataires</h2>
    <table>
      <thead>
        <tr>
          <th>Fonction</th>
          <th>Nom</th>
          <th>Email</th>
          <th>Actif</th>
          <th>Tableaux de suivi PFMP</th>
          <th>Établissement</th>
          <th>Filières concernées</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>

    <details>
      <summary>Référentiel classes → établissement / filière</summary>
      <p class="tiny">
        À régler une seule fois. Ce référentiel permet au système de savoir si une classe relève du LP ou du LGT
        et à quelle filière elle appartient.
      </p>
      <table>
        <thead>
          <tr>
            <th>Classe</th>
            <th>Établissement</th>
            <th>Filière</th>
            <th>Actif</th>
          </tr>
        </thead>
        <tbody id="classesBody"></tbody>
      </table>
    </details>

    <div class="actions">
      <button id="save" class="primary" type="button">Enregistrer</button>
    </div>
  </div>
</div>

<script>
const C=<?!= config ?>;
let DATA=<?!= dataJson ?>;

const tbody=document.getElementById('tbody');
const classesBody=document.getElementById('classesBody');
const save=document.getElementById('save');
const status=document.getElementById('status');

function esc(v){const d=document.createElement('div');d.textContent=v==null?'':v;return d.innerHTML}
function show(text,type){status.textContent=text||'';status.className=text?'show '+type:''}

function etabOptions(value,allowBlank){
  const vals=allowBlank
    ? [['','— à définir —'],['LP','LP'],['LGT','LGT']]
    : [['TOUS','Tous'],['LP','LP'],['LGT','LGT']];
  return vals.map(function(x){
    return '<option value="'+x[0]+'" '+(x[0]===value?'selected':'')+'>'+x[1]+'</option>';
  }).join('');
}

function filiereOptions(selected){
  selected=selected||[];
  return (DATA.filieres||[]).map(function(f){
    return '<option value="'+esc(f)+'" '+(selected.indexOf(f)>=0?'selected':'')+'>'+esc(f)+'</option>';
  }).join('');
}

function render(){
  tbody.innerHTML=(DATA.lignes||[]).map(function(x){
    return '<tr data-id="'+x.id+'">'+
      '<td><b>'+esc(x.fonction)+'</b></td>'+
      '<td><input class="nom" type="text" value="'+esc(x.nom||'')+'" placeholder="Nom"></td>'+
      '<td><input class="email" type="email" value="'+esc(x.email||'')+'" placeholder="adresse@domaine.fr"></td>'+
      '<td><input class="actif" type="checkbox" '+(x.actif?'checked':'')+'></td>'+
      '<td><input class="tableaux" type="checkbox" '+(x.tableauxSuivi?'checked':'')+'></td>'+
      '<td><select class="etab">'+etabOptions(x.etablissement||'TOUS',false)+'</select></td>'+
      '<td><select class="filieres" multiple>'+filiereOptions(x.filieres)+'</select><div class="tiny">Vide = toutes</div></td>'+
    '</tr>';
  }).join('');

  classesBody.innerHTML=(DATA.classes||[]).map(function(x){
    return '<tr data-id="'+x.id+'">'+
      '<td><b>'+esc(x.classe)+'</b></td>'+
      '<td><select class="classeEtab">'+etabOptions(x.etablissement||'',true)+'</select></td>'+
      '<td><input class="classeFiliere" type="text" value="'+esc(x.filiere||'')+'" placeholder="Ex. Numérique, MVA, MELEC..."></td>'+
      '<td><input class="classeActif" type="checkbox" '+(x.actif?'checked':'')+'></td>'+
    '</tr>';
  }).join('');
}

function selectedValues(select){
  return Array.from(select.selectedOptions).map(function(o){return o.value}).filter(Boolean);
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
      tableauxSuivi:tr.querySelector('.tableaux').checked,
      etablissement:tr.querySelector('.etab').value,
      filieres:selectedValues(tr.querySelector('.filieres'))
    };
  });

  const classes=Array.from(classesBody.querySelectorAll('tr[data-id]')).map(function(tr){
    return {
      id:Number(tr.dataset.id),
      etablissement:tr.querySelector('.classeEtab').value,
      filiere:tr.querySelector('.classeFiliere').value.trim(),
      actif:tr.querySelector('.classeActif').checked
    };
  });

  google.script.run
    .withSuccessHandler(function(r){
      DATA=r;
      render();
      save.disabled=false;
      save.innerHTML=old;
      show('Paramètres enregistrés.','ok');
    })
    .withFailureHandler(function(e){
      save.disabled=false;
      save.innerHTML=old;
      show('Erreur : '+(e&&e.message||e),'err');
    })
    .EUC_V158_sauver({lignes:lignes,classes:classes});
};

document.getElementById('back').href=C.baseUrl+'?page=admin-pfmp';
render();
</script>
</body>
</html>
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs")
s=p.read_text(encoding="utf-8")

old="cc:EUC_V158_ccMails_(),"
new="cc:EUC_V158_ccMails_(detail),"

if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit("ERREUR : appel EUC_V158_ccMails_ introuvable dans V157.")

p.write_text(s,encoding="utf-8")
print("OK : l'envoi V157 transmet maintenant la classe au filtre V159.")
PY

echo "============================================================"
echo " DEV.159 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_SUIVI_PFMP_DestinatairesV159.js
cp "$V157" /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV159.js

node --check /tmp/EUC_SUIVI_PFMP_DestinatairesV159.js
node --check /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV159.js

grep -q "Perimetre_etablissement" "$SERVICE"
grep -q "Filieres_JSON" "$SERVICE"
grep -q "EUC_PERIMETRES_CLASSES_PFMP" "$SERVICE"
grep -q "EUC_V158_ccMails_(detail)" "$V157"
grep -q "Référentiel classes" "$PAGE"
grep -q "Enregistrement en cours" "$PAGE"

echo "✓ périmètre établissement TOUS / LP / LGT"
echo "✓ périmètre filières multi-sélection"
echo "✓ référentiel classes → établissement / filière"
echo "✓ filtrage réel lors de l'envoi"
echo "✓ spinner Enregistrement en cours..."

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
echo " DEV.159 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ diffusion filtrée par établissement"
echo "✓ diffusion filtrée par filière"
echo "✓ classes paramétrables une seule fois"
echo "✓ push + version + déploiement principal"
echo "============================================================"
