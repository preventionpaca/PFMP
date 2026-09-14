#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161"

SERVICE="apps-script/EUC_PFMP_International_StatusV161.gs"
RENDERER="apps-script/EUC_SUIVI_PFMP_V156.gs"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
MAIL_SERVICE="apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs"
QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV161_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$RENDERER" "$DETAIL_PAGE" "$MAIL_SERVICE" "$QR_PAGE"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

echo "============================================================"
echo " DEV.161 — MONACO + ETAT ACTUEL DES CONVENTIONS"
echo "============================================================"

for f in "$RENDERER" "$DETAIL_PAGE" "$MAIL_SERVICE" "$QR_PAGE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
done

cat > "$SERVICE" <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.161
 * 1) Référentiel France / Monaco (SIRET / NIS)
 * 2) Etat actuel d'un élève : une ligne par élève/période
 *    avec historique secondaire des conventions annulées/interrompues.
 */

function EUC_V161_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_V161_norm_(v){
  return EUC_V161_txt_(v)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function EUC_V161_col_(id,label,type){
  return {id:id,fields:{label:label,type:type||'Text'}};
}

function EUC_V161_assurerColonnesEntreprises_(){
  var table='Entreprises';
  var current=EUC_ENT_grist('get','/tables/'+table+'/columns').columns||[];
  var have={};
  current.forEach(function(c){have[c.id]=true;});

  var c=EUC_V161_col_;
  var wanted=[
    c('Pays','Pays'),
    c('NIS','NIS Monaco'),
    c('RCI','RCI Monaco'),
    c('Statut_validation','Statut validation'),
    c('Source_creation','Source création')
  ];

  var missing=wanted.filter(function(x){return !have[x.id];});
  if(missing.length){
    EUC_ENT_grist('post','/tables/'+table+'/columns',{columns:missing});
  }
  return true;
}

function EUC_V161_rechercherEntrepriseMonaco(nis){
  EUC_V161_assurerColonnesEntreprises_();

  nis=EUC_V161_txt_(nis);
  if(!nis)return {found:false};

  var rows=EUC_IMPORT_lireRecords_('Entreprises');
  var hit=rows.filter(function(r){
    return EUC_V161_norm_(r.Pays)==='monaco' &&
           EUC_V161_norm_(r.NIS)===EUC_V161_norm_(nis);
  })[0];

  if(!hit)return {found:false,nis:nis};

  function get(names){
    for(var i=0;i<names.length;i++){
      if(EUC_V161_txt_(hit[names[i]]))return EUC_V161_txt_(hit[names[i]]);
    }
    return '';
  }

  return {
    found:true,
    id:Number(hit.id)||0,
    pays:'Monaco',
    nis:EUC_V161_txt_(hit.NIS),
    rci:EUC_V161_txt_(hit.RCI),
    nom:get(['Nom','Nom_entreprise','Raison_sociale','Entreprise']),
    adresse:get(['Adresse','Adresse_entreprise']),
    cp:get(['Code_postal','CP','Code_postal_entreprise']),
    ville:get(['Ville','Ville_entreprise'])||'Monaco',
    email:get(['Email','Email_entreprise','Adresse_email']),
    telephone:get(['Telephone','Téléphone','Telephone_entreprise']),
    statut:EUC_V161_txt_(hit.Statut_validation)
  };
}

function EUC_V161_estIncident_(x){
  var code=EUC_V161_norm_(
    (x&&x.statutCode)||' '+(x&&x.statut)||' '+(x&&x.status)||''
  );
  return code.indexOf('annul')>=0 || code.indexOf('interromp')>=0;
}

function EUC_V161_incidentLabel_(x){
  var code=EUC_V161_norm_((x&&x.statutCode)||' '+(x&&x.statut)||'');
  if(code.indexOf('interromp')>=0)return 'Convention interrompue';
  return 'Convention annulée';
}

function EUC_V161_historiqueDepuisLigne_(x){
  return {
    type:EUC_V161_incidentLabel_(x),
    numero:EUC_V161_txt_(x.numero),
    entreprise:EUC_V161_txt_(x.entreprise),
    statut:EUC_V161_txt_(x.statut),
    statutCode:EUC_V161_txt_(x.statutCode)
  };
}

function EUC_SUIVI_CLASSE_detailV161(codeAnnee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV156(codeAnnee,classeId,periodeId);
  d.historiqueIncidents=[];

  d.lignes=(d.lignes||[]).map(function(x){
    x.historiqueConventions=x.historiqueConventions||[];

    if(EUC_V161_estIncident_(x)){
      var hist=EUC_V161_historiqueDepuisLigne_(x);
      x.historiqueConventions.push(hist);
      d.historiqueIncidents.push({
        eleveId:x.eleveId,
        nom:EUC_V161_txt_(x.nom),
        prenom:EUC_V161_txt_(x.prenom),
        numero:hist.numero,
        entreprise:hist.entreprise,
        statut:hist.statut||hist.type,
        type:hist.type
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

  var total=d.lignes.length;
  var sans=0,avec=0;
  d.lignes.forEach(function(x){
    if(EUC_V161_norm_(x.statutCode).indexOf('sans convention')>=0 ||
       EUC_V161_norm_(x.statut).indexOf('sans convention')>=0){
      sans++;
    }else{
      avec++;
    }
  });

  d.stats=d.stats||{};
  d.stats.total=total;
  d.stats.avecConvention=avec;
  d.stats.sansConvention=sans;
  d.stats.annulees=d.historiqueIncidents.filter(function(x){
    return EUC_V161_norm_(x.type).indexOf('annul')>=0;
  }).length;
  d.stats.interrompues=d.historiqueIncidents.filter(function(x){
    return EUC_V161_norm_(x.type).indexOf('interromp')>=0;
  }).length;

  return d;
}

function EUC_V161_historiqueHtml_(detail){
  var incidents=(detail&&detail.historiqueIncidents)||[];
  if(!incidents.length)return '';

  function e(v){
    return String(v==null?'':v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var rows=incidents.map(function(x){
    return '<tr>'+ 
      '<td style="border:1px solid #cfd8e3;padding:7px">'+e((x.nom||'')+' '+(x.prenom||''))+'</td>'+ 
      '<td style="border:1px solid #cfd8e3;padding:7px">'+e(x.numero||'—')+'</td>'+ 
      '<td style="border:1px solid #cfd8e3;padding:7px">'+e(x.entreprise||'—')+'</td>'+ 
      '<td style="border:1px solid #cfd8e3;padding:7px;color:#b42318;font-weight:700">'+e(x.statut||x.type)+'</td>'+ 
    '</tr>';
  }).join('');

  return '<br><h3 style="font-family:Arial,sans-serif;color:#b42318">Conventions annulées ou interrompues pendant cette PFMP</h3>'+ 
    '<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px">'+ 
    '<thead><tr style="background:#fff1f2">'+ 
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Élève</th>'+ 
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Convention</th>'+ 
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Ancienne entreprise</th>'+ 
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Situation</th>'+ 
    '</tr></thead><tbody>'+rows+'</tbody></table>';
}
EOF

cat > /tmp/dev161_patch.py <<'PY'
from pathlib import Path

# 1) Renderer V156 -> V161
p=Path('apps-script/EUC_SUIVI_PFMP_V156.gs')
s=p.read_text(encoding='utf-8')
if 'EUC_SUIVI_CLASSE_detailV161(' not in s:
    if 'EUC_SUIVI_CLASSE_detailV156(' not in s:
        raise SystemExit('ERREUR : appel detailV156 introuvable dans EUC_SUIVI_PFMP_V156.gs')
    s=s.replace('EUC_SUIVI_CLASSE_detailV156(','EUC_SUIVI_CLASSE_detailV161(',1)
p.write_text(s,encoding='utf-8')
print('OK 1/5 : renderer classe branché sur V161.')

# 2) Page détail : note historique
p=Path('apps-script/Suivi_PFMP_Classe_Detail_V156.html')
s=p.read_text(encoding='utf-8')
if 'function historyNoteV161(' not in s:
    marker='  function statusPill(x)'
    pos=s.find(marker)
    if pos<0:
        raise SystemExit('ERREUR : fonction statusPill introuvable dans le template V156.')
    helper=(
"  function historyNoteV161(x){\n"
"    const h=x.historiqueConventions||[];\n"
"    if(!h.length)return '';\n"
"    return '<div class=\"small\" style=\"margin-top:5px;color:#b42318;font-weight:700\">'+\n"
"      h.map(function(v){\n"
"        return esc(v.type)+(v.numero?' — '+esc(v.numero):'')+(v.entreprise?' — '+esc(v.entreprise):'');\n"
"      }).join('<br>')+\n"
"    '</div>';\n"
"  }\n\n"
    )
    s=s[:pos]+helper+s[pos:]
if 'historyNoteV161(x)' not in s[s.find('tbody.innerHTML'):]:
    old="'<td>'+statusPill(x)+(x.numero?"
    new="'<td>'+statusPill(x)+historyNoteV161(x)+(x.numero?"
    if old not in s:
        raise SystemExit('ERREUR : cellule statut du tableau introuvable.')
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('OK 2/5 : historique visible sous le statut actuel.')

# 3) Email V157 -> détail V161 + bloc historique
p=Path('apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs')
s=p.read_text(encoding='utf-8')
s=s.replace(
    'EUC_SUIVI_CLASSE_detailV156(payload.annee,payload.classeId,payload.periodeId)',
    'EUC_SUIVI_CLASSE_detailV161(payload.annee,payload.classeId,payload.periodeId)'
)
old='htmlBody:\'<div style="font-family:Arial,sans-serif">\'+safeMsg+\'</div><br>\'+EUC_V157_htmlTable_(detail),'
new='htmlBody:\'<div style="font-family:Arial,sans-serif">\'+safeMsg+\'</div><br>\'+EUC_V157_htmlTable_(detail)+EUC_V161_historiqueHtml_(detail),'
if old in s:
    s=s.replace(old,new,1)
elif 'EUC_V161_historiqueHtml_(detail)' not in s:
    raise SystemExit('ERREUR : htmlBody V157 introuvable.')
p.write_text(s,encoding='utf-8')
print('OK 3/5 : email = situation actuelle + historique.')

# 4) Libellé papier
patterns=[
    ('N° SIRET','SIRET / NIS (Monaco)'),
    ('N° de SIRET','SIRET / NIS (Monaco)'),
    ('Numéro SIRET','SIRET / NIS (Monaco)')
]
changed=[]
for q in Path('apps-script').glob('Convention_PFMP_*.html'):
    txt=q.read_text(encoding='utf-8')
    before=txt
    for a,b in patterns:
        txt=txt.replace(a,b)
    if txt!=before:
        q.write_text(txt,encoding='utf-8')
        changed.append(q.name)
print('OK 4/5 : libellé papier modifié dans %d template(s).' % len(changed))

# 5) QR France / Monaco
p=Path('apps-script/PFMP_Acces_QR_V116.html')
s=p.read_text(encoding='utf-8')
if 'EUC_V161_MONACO_UI' not in s:
    inject=Path('/tmp/dev161_qr_inject.html').read_text(encoding='utf-8')
    if '</body>' not in s:
        raise SystemExit('ERREUR : </body> absent PFMP_Acces_QR_V116.html')
    s=s.replace('</body>',inject+'\n</body>',1)
p.write_text(s,encoding='utf-8')
print('OK 5/5 : QR France / Monaco ajouté.')
PY

cat > /tmp/dev161_qr_inject.html <<'EOF'
<style id="EUC_V161_MONACO_UI">
  .euc-v161-country{margin:10px 0;padding:10px;border:1px solid #d9e1ec;border-radius:10px;background:#f8fafc}
  .euc-v161-country select,.euc-v161-country input{width:100%;box-sizing:border-box;margin-top:6px;padding:9px;border:1px solid #b9c7d8;border-radius:8px}
  .euc-v161-msg{margin-top:8px;font-size:13px;font-weight:700}
</style>
<script id="EUC_V161_MONACO_UI_SCRIPT">
(function(){
  function norm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function findSiretInput(){
    var inputs=Array.from(document.querySelectorAll('input'));
    return inputs.find(function(inp){
      var ph=norm(inp.placeholder),nm=norm(inp.name),id=norm(inp.id);
      return ph.indexOf('siret')>=0 || nm.indexOf('siret')>=0 || id.indexOf('siret')>=0;
    }) || null;
  }
  function setByLabel(words,value){
    var labels=Array.from(document.querySelectorAll('label'));
    var lab=labels.find(function(l){
      var t=norm(l.textContent);
      return words.some(function(w){return t.indexOf(norm(w))>=0;});
    });
    if(!lab)return;
    var input=null;
    if(lab.htmlFor)input=document.getElementById(lab.htmlFor);
    if(!input)input=lab.querySelector('input,textarea');
    if(!input && lab.parentElement)input=lab.parentElement.querySelector('input,textarea');
    if(input && !input.value)input.value=value||'';
  }
  function init(){
    var siret=findSiretInput();
    if(!siret)return;

    var box=document.createElement('div');
    box.className='euc-v161-country';
    box.innerHTML=
      '<b>Pays de l’entreprise</b>'+ 
      '<select id="eucV161Country"><option value="FR">France</option><option value="MC">Monaco</option></select>'+ 
      '<div id="eucV161Monaco" style="display:none">'+ 
        '<label style="display:block;margin-top:8px;font-weight:700">NIS (Monaco)</label>'+ 
        '<input id="eucV161Nis" type="text" autocomplete="off" placeholder="Saisir le NIS">'+ 
        '<div id="eucV161Msg" class="euc-v161-msg"></div>'+ 
      '</div>';

    siret.parentElement.insertBefore(box,siret);

    var country=box.querySelector('#eucV161Country');
    var monaco=box.querySelector('#eucV161Monaco');
    var nis=box.querySelector('#eucV161Nis');
    var msg=box.querySelector('#eucV161Msg');

    country.onchange=function(){
      var mc=country.value==='MC';
      monaco.style.display=mc?'block':'none';
      siret.style.display=mc?'none':'';
    };

    nis.onblur=function(){
      var v=nis.value.trim();
      if(!v)return;
      msg.textContent='Recherche dans le référentiel Monaco...';
      msg.style.color='#164e7a';

      google.script.run
        .withSuccessHandler(function(r){
          if(r&&r.found){
            msg.textContent='Entreprise trouvée : '+(r.nom||'');
            msg.style.color='#067647';
            setByLabel(['nom entreprise','raison sociale','entreprise'],r.nom);
            setByLabel(['adresse entreprise','adresse'],r.adresse);
            setByLabel(['code postal','cp'],r.cp);
            setByLabel(['ville'],r.ville||'Monaco');
            setByLabel(['email entreprise','adresse e-mail de l’entreprise'],r.email);
            setByLabel(['telephone entreprise','téléphone entreprise'],r.telephone);
            siret.value='NIS:'+v;
          }else{
            msg.textContent='Entreprise Monaco inconnue : complétez manuellement les coordonnées. Elle devra être validée administrativement.';
            msg.style.color='#b45309';
            siret.value='NIS:'+v;
          }
        })
        .withFailureHandler(function(e){
          msg.textContent='Recherche impossible : '+(e&&e.message||e);
          msg.style.color='#b42318';
        })
        .EUC_V161_rechercherEntrepriseMonaco(v);
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>
EOF

python3 /tmp/dev161_patch.py

echo
echo "============================================================"
echo " DEV.161 — CONTROLES AVANT PUSH"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_PFMP_International_StatusV161.js
cp "$RENDERER" /tmp/EUC_SUIVI_PFMP_V156_DEV161.js
cp "$MAIL_SERVICE" /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV161.js

node --check /tmp/EUC_PFMP_International_StatusV161.js
node --check /tmp/EUC_SUIVI_PFMP_V156_DEV161.js
node --check /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV161.js

grep -q "EUC_SUIVI_CLASSE_detailV161" "$RENDERER"
grep -q "historyNoteV161" "$DETAIL_PAGE"
grep -q "EUC_V161_historiqueHtml_" "$MAIL_SERVICE"
grep -q "EUC_V161_MONACO_UI" "$QR_PAGE"

if ! grep -q "SIRET / NIS (Monaco)" apps-script/Convention_PFMP_*.html; then
  echo "ERREUR : aucun modèle de convention n'a reçu le libellé SIRET / NIS (Monaco)."
  exit 1
fi

echo "✓ syntaxe serveur valide"
echo "✓ une ligne = état actuel de l'élève"
echo "✓ historique annulé/interrompu secondaire"
echo "✓ email avec bloc historique"
echo "✓ convention papier SIRET / NIS (Monaco)"
echo "✓ QR France / Monaco + recherche NIS interne"

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
echo " DEV.161 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ Monaco : recherche NIS dans le référentiel Entreprises"
echo "✓ Monaco inconnu : saisie manuelle signalée à valider"
echo "✓ papier : SIRET / NIS (Monaco)"
echo "✓ élève avec convention annulée => Sans convention"
echo "✓ mention historique sous la ligne"
echo "✓ historique séparé dans l'email"
echo "✓ push + version + déploiement principal"
echo "============================================================"
