#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix9-clean-qr-pdf"

QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"
STRICT_SERVICE="apps-script/EUC_SIRET_NIS_StrictV161.gs"
MONACO_SERVICE="apps-script/EUC_PFMP_Monaco_V161Fix8.gs"
PDF_HTML="apps-script/Convention_PFMP_PdfV95.html"
PDF_GS="apps-script/EUC_CONVENTION_PFMP_PdfV95.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX9_${STAMP}"
mkdir -p "$BACKUP"

for f in "$QR_PAGE" "$QR_SERVICE" "$STRICT_SERVICE" "$MONACO_SERVICE" "$PDF_HTML" "$PDF_GS"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX9 — NETTOYAGE QR + VERROUILLAGE + PDF MAITRE"
echo "============================================================"

cat > /tmp/EUC_QR_CONTROLLER_FIX9.html <<'EOF'
<script id="EUC_QR_CONTROLLER_FIX9">
(function(){
  'use strict';

  function txt(v){ return String(v==null?'':v).trim(); }
  function siretNorm(v){ return txt(v).replace(/\D/g,'').slice(0,14); }
  function nisNorm(v){ return txt(v).toUpperCase().replace(/[\s-]+/g,''); }

  function esc(v){ return String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"'); }

  function F(key){
    var el=document.getElementById(key);
    if(el) return el;
    if(typeof field==='function'){
      try{ el=field(key); if(el) return el; }catch(e){}
    }
    var sels=[
      '[name="'+esc(key)+'"]',
      '[data-field="'+esc(key)+'"]',
      '[data-key="'+esc(key)+'"]',
      '[data-name="'+esc(key)+'"]'
    ];
    for(var i=0;i<sels.length;i++){
      try{ el=document.querySelector(sels[i]); if(el) return el; }catch(e){}
    }
    return null;
  }

  function V(key,value){ var el=F(key); if(el) el.value=value==null?'':value; }

  function lockOne(key,on){
    var el=F(key);
    if(!el) return;
    if('readOnly' in el) el.readOnly=!!on;
    el.disabled=false;
    el.classList.toggle('euc-locked',!!on);
    el.setAttribute('aria-readonly',on?'true':'false');
  }

  function lockIdentity(on,includeTradeName){
    [
      'entrepriseRaisonSociale',
      'entrepriseAdresse',
      'entrepriseComplement',
      'entrepriseCodePostal',
      'entrepriseCommune',
      'entreprisePays'
    ].forEach(function(k){ lockOne(k,on); });
    if(includeTradeName) lockOne('entrepriseEnseigne',on);
  }

  function clearIdentity(clearTradeName){
    V('entrepriseRaisonSociale','');
    if(clearTradeName) V('entrepriseEnseigne','');
    V('entrepriseAdresse','');
    V('entrepriseComplement','');
    V('entrepriseCodePostal','');
    V('entrepriseCommune','');
  }

  function status(text,error){
    if(typeof msg==='function'){
      try{ msg(text,!!error); return; }catch(e){}
    }
    var ids=['message','msg','status','siretState'];
    for(var i=0;i<ids.length;i++){
      var el=document.getElementById(ids[i]);
      if(el){
        el.textContent=text;
        el.style.color=error?'#b42318':'#067647';
        return;
      }
    }
  }

  function fillIdentity(r,includeTradeName){
    V('entrepriseRaisonSociale',r.entrepriseRaisonSociale||r.nom||'');
    if(includeTradeName) V('entrepriseEnseigne',r.entrepriseEnseigne||r.enseigne||'');
    V('entrepriseAdresse',r.entrepriseAdresse||r.adresse||'');
    V('entrepriseComplement',r.entrepriseComplement||r.complement||'');
    V('entrepriseCodePostal',r.entrepriseCodePostal||r.cp||r.codePostal||'');
    V('entrepriseCommune',r.entrepriseCommune||r.ville||r.commune||'');
    V('entreprisePays',r.entreprisePays||r.pays||'');
  }

  function boot(){
    var country=document.getElementById('entreprisePaysSelectV161');
    var ident=document.getElementById('siret');
    var search=document.getElementById('search');
    var save=document.getElementById('save');
    if(!country||!ident||!search||!save){
      console.error('FIX9: éléments principaux QR introuvables.');
      return;
    }

    function franceMode(){
      V('entreprisePays','France');
      ident.value=siretNorm(ident.value);
      ident.setAttribute('maxlength','14');
      ident.setAttribute('pattern','[0-9]{14}');
      ident.setAttribute('inputmode','numeric');
      ident.placeholder='14 chiffres';
      clearIdentity(false);
      lockIdentity(true,false);
      lockOne('entrepriseEnseigne',false);
      document.documentElement.dataset.eucFranceVerified='0';
      document.documentElement.dataset.eucMonacoManual='0';
      search.disabled=ident.value.length!==14;
    }

    function monacoMode(){
      V('entreprisePays','Monaco');
      ident.value=nisNorm(ident.value);
      ident.removeAttribute('maxlength');
      ident.removeAttribute('pattern');
      ident.setAttribute('inputmode','text');
      ident.placeholder='NIS obligatoire';
      clearIdentity(true);
      lockIdentity(true,true);
      document.documentElement.dataset.eucFranceVerified='0';
      document.documentElement.dataset.eucMonacoManual='0';
      search.disabled=!nisNorm(ident.value);
    }

    function applyMode(){ country.value==='Monaco' ? monacoMode() : franceMode(); }

    country.addEventListener('change',function(ev){
      ev.stopImmediatePropagation();
      applyMode();
    },true);

    ident.addEventListener('input',function(ev){
      ev.stopImmediatePropagation();
      if(country.value==='France'){
        ident.value=siretNorm(ident.value);
        document.documentElement.dataset.eucFranceVerified='0';
        clearIdentity(false);
        lockIdentity(true,false);
        lockOne('entrepriseEnseigne',false);
        search.disabled=ident.value.length!==14;
      }else{
        ident.value=nisNorm(ident.value);
        document.documentElement.dataset.eucMonacoManual='0';
        clearIdentity(true);
        lockIdentity(true,true);
        search.disabled=!ident.value;
      }
    },true);

    search.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopImmediatePropagation();

      if(country.value==='France'){
        var siret=siretNorm(ident.value);
        ident.value=siret;
        if(siret.length!==14){
          status('Le SIRET est obligatoire et doit comporter 14 chiffres.',true);
          return;
        }
        search.disabled=true;
        status('Recherche du SIRET dans la base officielle…',false);

        google.script.run
          .withSuccessHandler(function(r){
            search.disabled=false;
            if(!r||!r.found){
              document.documentElement.dataset.eucFranceVerified='0';
              clearIdentity(false);
              lockIdentity(true,false);
              lockOne('entrepriseEnseigne',false);
              status('SIRET non retrouvé : enregistrement impossible.',true);
              return;
            }
            fillIdentity(r,false);
            V('entreprisePays','France');
            document.documentElement.dataset.eucFranceVerified='1';
            lockIdentity(true,false);
            lockOne('entrepriseEnseigne',false);
            status('✓ Entreprise française retrouvée. Données officielles verrouillées.',false);
          })
          .withFailureHandler(function(e){
            search.disabled=false;
            document.documentElement.dataset.eucFranceVerified='0';
            clearIdentity(false);
            lockIdentity(true,false);
            lockOne('entrepriseEnseigne',false);
            status('Erreur de recherche SIRET : '+(e&&e.message||e),true);
          })
          .EUC_V161_verifierSiretFrance(siret);
        return;
      }

      var nis=nisNorm(ident.value);
      ident.value=nis;
      if(!nis){
        status('Le NIS est obligatoire pour une entreprise monégasque.',true);
        return;
      }

      search.disabled=true;
      status('Recherche du NIS dans notre référentiel…',false);

      google.script.run
        .withSuccessHandler(function(r){
          search.disabled=false;
          if(r&&r.found){
            fillIdentity(r,true);
            V('entreprisePays','Monaco');
            document.documentElement.dataset.eucMonacoManual='0';
            lockIdentity(true,true);
            status('✓ Entreprise monégasque retrouvée. Données verrouillées.',false);
            return;
          }

          clearIdentity(true);
          V('entreprisePays','Monaco');
          lockIdentity(false,true);
          lockOne('entreprisePays',true);
          document.documentElement.dataset.eucMonacoManual='1';
          status('Entreprise absente de notre base. Merci de compléter manuellement ses coordonnées.',false);
          var first=F('entrepriseRaisonSociale');
          if(first) first.focus();
        })
        .withFailureHandler(function(e){
          search.disabled=false;
          document.documentElement.dataset.eucMonacoManual='0';
          lockIdentity(true,true);
          status('Erreur de recherche NIS : '+(e&&e.message||e),true);
        })
        .EUC_V161_rechercherEntrepriseMonaco(nis);
    },true);

    save.addEventListener('click',function(ev){
      if(country.value==='France'){
        if(siretNorm(ident.value).length!==14 || document.documentElement.dataset.eucFranceVerified!=='1'){
          ev.preventDefault();
          ev.stopImmediatePropagation();
          status('Recherche SIRET obligatoire avant enregistrement.',true);
          return;
        }
      }else{
        ident.value=nisNorm(ident.value);
        if(!ident.value){
          ev.preventDefault();
          ev.stopImmediatePropagation();
          status('Le NIS est obligatoire pour une entreprise monégasque.',true);
          return;
        }

        if(document.documentElement.dataset.eucMonacoManual==='1'){
          var req=[
            ['entrepriseRaisonSociale','raison sociale'],
            ['entrepriseAdresse','adresse'],
            ['entrepriseCodePostal','code postal'],
            ['entrepriseCommune','ville']
          ];
          for(var i=0;i<req.length;i++){
            var el=F(req[i][0]);
            if(!el||!txt(el.value)){
              ev.preventDefault();
              ev.stopImmediatePropagation();
              status('Le champ '+req[i][1]+' est obligatoire.',true);
              return;
            }
          }
        }
      }
    },true);

    applyMode();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
</script>
<style id="EUC_QR_CONTROLLER_FIX9_STYLE">
.euc-locked{
  background:#e9edf0 !important;
  color:#59636b !important;
  cursor:not-allowed !important;
  border-color:#c5ccd1 !important;
}
</style>
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/PFMP_Acces_QR_V116.html")
s=p.read_text(encoding="utf-8")

for pat in [
    r'<script id="EUC_FIX8_MONACO_FLOW">.*?</script>',
    r'<script id="EUC_SIRET_NIS_STRICT_V161">.*?</script>',
    r'<style id="EUC_SIRET_NIS_STRICT_STYLE_V161">.*?</style>',
    r'<script id="EUC_QR_CONTROLLER_FIX9">.*?</script>',
    r'<style id="EUC_QR_CONTROLLER_FIX9_STYLE">.*?</style>'
]:
    s=re.sub(pat,'',s,flags=re.S)

for block in re.findall(r'<script\b[^>]*>.*?</script>',s,flags=re.S|re.I):
    if 'EUC_V1617_rechercherNis' in block:
        s=s.replace(block,'')

controller=Path("/tmp/EUC_QR_CONTROLLER_FIX9.html").read_text(encoding="utf-8")
if "</body>" not in s:
    raise SystemExit("ERREUR : </body> introuvable.")
s=s.replace("</body>",controller+"\n</body>",1)
p.write_text(s,encoding="utf-8")
print("OK 1/4 : contrôleur QR unique installé.")
PY

cat > /tmp/EUC_QR_FAST_HELPERS_V161.txt <<'EOF'
function EUC_CONVENTION_lireRecordDirectV161_(table,id){
  id=Number(id||0);
  if(!Number.isInteger(id)||id<=0)throw new Error('Identifiant Grist invalide.');

  try{
    var raw=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/records/'+encodeURIComponent(id));
    var rec=raw&&raw.record ? raw.record : raw;
    if(raw&&raw.records&&raw.records.length)rec=raw.records[0];

    if(rec){
      var out={id:Number(rec.id||id)};
      var f=rec.fields||{};
      Object.keys(f).forEach(function(k){out[k]=f[k];});
      return out;
    }
  }catch(err){
    console.log('QR_DIRECT_READ_FALLBACK '+table+'#'+id+' : '+String(err&&err.message||err));
  }

  var rows=EUC_IMPORT_lireRecords_(table);
  return rows.filter(function(r){return Number(r.id)===id;})[0]||null;
}
EOF

cat > /tmp/EUC_QR_FAST_RESOLVE_V161.txt <<'EOF'
function EUC_CONVENTION_resoudreLienV113_(rid){
  rid=Number(rid||0);
  if(!Number.isInteger(rid)||rid<=0){
    throw new Error('[QR117-ENTREE] Identifiant d’accès invalide : '+String(rid||'')+'.');
  }

  var a;
  try{
    a=EUC_CONVENTION_lireRecordDirectV161_(EUC_CONVENTION_ACCES_TABLE_,rid);
  }catch(err){
    throw new Error('[QR117-GRIST] Lecture de l’accès impossible : '+(err&&err.message?err.message:String(err)));
  }

  if(!a)throw new Error('[QR117-ID] Accès '+rid+' introuvable.');
  if(a.Revoked===true)throw new Error('[QR117-REVOQUE] Cette convention a été révoquée.');

  return {acces:a,mode:'GRIST_ID_DIRECT',diag:'QR117-ID-DIRECT-OK rid='+rid};
}
EOF

cat > /tmp/EUC_QR_FAST_BIRTH_V161.txt <<'EOF'
function EUC_CONVENTION_verifierNaissanceV113_(resolved,jour,mois){
  var a=resolved.acces;
  jour=Number(jour||0);
  mois=Number(mois||0);

  if(jour<1||jour>31||mois<1||mois>12){
    throw new Error('[QR117-NAISSANCE] Jour ou mois invalide.');
  }

  var ref=Number(EUC_PFMP_ref_(a.Eleve));
  var el;

  try{
    el=EUC_CONVENTION_lireRecordDirectV161_('EUC_ELEVES_PFMP',ref);
  }catch(e){
    throw new Error('[QR117-ELEVES] Lecture élève impossible : '+(e&&e.message?e.message:String(e)));
  }

  if(!el)throw new Error('[QR117-ELEVE] Élève '+ref+' introuvable.');

  var iso=EUC_IMPORT_dateExistanteISO_(el.Date_naissance);
  var parts=String(iso||'').split('-');

  if(parts.length!==3){
    throw new Error('[QR117-DATE] Date de naissance illisible pour l’élève '+ref+'.');
  }

  if(Number(parts[2])!==jour||Number(parts[1])!==mois){
    throw new Error('[QR117-NAISSANCE] Accès trouvé, mais jour/mois ne correspondent pas à la date enregistrée.');
  }

  EUC_ENT_grist(
    'patch',
    '/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',
    {records:[{id:a.id,fields:{
      Tentatives_echec:0,
      Bloque_jusqua:null,
      Date_derniere_utilisation:new Date().toISOString(),
      Statut:'FORMULAIRE_OUVERT'
    }}]}
  );

  var resume=EUC_CONVENTION_creerRepriseV117_(a.id);

  return {
    ok:true,
    diagnostic:resolved.diag+' - NAISSANCE-OK',
    accessId:a.id,
    reference:a.Reference_convention||'',
    resume:resume,
    continuationUrl:'',
    eleve:{
      nom:el.Nom||'',
      prenom:el.Prenom_usage||el.Prenom||'',
      classe:a.Classe_convention_nom||'',
      annee:a.Annee_scolaire||''
    }
  };
}
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

helper=Path("/tmp/EUC_QR_FAST_HELPERS_V161.txt").read_text(encoding="utf-8")
resolve=Path("/tmp/EUC_QR_FAST_RESOLVE_V161.txt").read_text(encoding="utf-8")
birth=Path("/tmp/EUC_QR_FAST_BIRTH_V161.txt").read_text(encoding="utf-8")

if 'function EUC_CONVENTION_lireRecordDirectV161_' not in s:
    pos=s.find('\n',s.find('function EUC_CONVENTION_lireAccesFraisV108_'))
    if pos<0: raise SystemExit("ERREUR : point insertion helper direct introuvable.")
    s=s[:pos+1]+helper+'\n'+s[pos+1:]

s,n=re.subn(
    r'function EUC_CONVENTION_resoudreLienV113_\(rid\)\{.*?\}(?=\nfunction )',
    lambda m: resolve.strip(),
    s,
    count=1,
    flags=re.S
)
if n!=1: raise SystemExit("ERREUR : remplacement resoudreLienV113_ impossible.")

s,n=re.subn(
    r'function EUC_CONVENTION_verifierNaissanceV113_\(resolved,jour,mois\)\{.*?\}(?=\nfunction EUC_CONVENTION_verifierIdentiteV113)',
    lambda m: birth.strip(),
    s,
    count=1,
    flags=re.S
)
if n!=1: raise SystemExit("ERREUR : remplacement verifierNaissanceV113_ impossible.")

p.write_text(s,encoding="utf-8")
print("OK 2/4 : accès QR et élève lus directement par ID.")
PY

cat > /tmp/EUC_MONACO_SEARCH_FIX9.txt <<'EOF'
function EUC_V161_rechercherEntrepriseMonaco(nis){
  var table=EUC_V161F8_tableEntreprise_();
  nis=String(nis||'').trim().toUpperCase().replace(/[\s-]+/g,'');

  if(!nis)return {found:false};

  var rows=EUC_IMPORT_lireRecords_(table);
  var hit=rows.filter(function(r){
    var rn=String(r.NIS||'').trim().toUpperCase().replace(/[\s-]+/g,'');
    return rn===nis;
  })[0];

  if(!hit)return {found:false,nis:nis};

  return {
    found:true,
    id:Number(hit.id)||0,
    pays:'Monaco',
    nis:String(hit.NIS||'').trim(),
    rci:String(hit.RCI||'').trim(),
    nom:String(hit.Raison_sociale||hit.Nom||hit.Entreprise||'').trim(),
    enseigne:String(hit.Enseigne||'').trim(),
    adresse:String(hit.Adresse||hit.Adresse_complete||'').trim(),
    complement:String(hit.Complement_adresse||hit.Complement||'').trim(),
    cp:String(hit.Code_postal||'').trim(),
    ville:String(hit.Commune||'Monaco').trim(),
    email:String(hit.Email||'').trim(),
    telephone:String(hit.Telephone||'').trim(),
    statut:String(hit.Statut_validation||'').trim()
  };
}
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_PFMP_Monaco_V161Fix8.gs")
s=p.read_text(encoding="utf-8")
new=Path("/tmp/EUC_MONACO_SEARCH_FIX9.txt").read_text(encoding="utf-8")

s,n=re.subn(
    r'function EUC_V161_rechercherEntrepriseMonaco\(nis\)\{.*?\}(?=\nfunction )',
    lambda m: new.strip(),
    s,
    count=1,
    flags=re.S
)
if n!=1: raise SystemExit("ERREUR : remplacement recherche Monaco impossible.")

p.write_text(s,encoding="utf-8")
print("OK 3/4 : recherche NIS allégée.")
PY

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/Convention_PFMP_PdfV95.html")
s=p.read_text(encoding="utf-8")

s=re.sub(r',SIRET_LABEL_V161:\{p:0,x:[^}]+\}','',s,count=1)
s=re.sub(r'\s*function drawSiretNisLabel\(page,font,bold\)\{.*?\}\s*','\n',s,count=1,flags=re.S)
s=s.replace('drawSiretNisLabel(pages[0],font,bold);','')
p.write_text(s,encoding="utf-8")

pg=Path("apps-script/EUC_CONVENTION_PFMP_PdfV95.gs")
g=pg.read_text(encoding="utf-8")
g=g.replace('EUC_PFMP_PDF_MASTER_B64','EUC_PFMP_PDF_MASTER_B64_V161F9')
pg.write_text(g,encoding="utf-8")

print("OK 4/4 : surcharge PDF retirée ; cache maître renouvelé.")
PY

echo "============================================================"
echo " CONTROLES AVANT PUSH"
echo "============================================================"

test "$(grep -o 'EUC_QR_CONTROLLER_FIX9' "$QR_PAGE" | wc -l)" -eq 1
! grep -q "EUC_FIX8_MONACO_FLOW" "$QR_PAGE"
! grep -q "EUC_SIRET_NIS_STRICT_V161" "$QR_PAGE"
! grep -q "EUC_V1617_rechercherNis" "$QR_PAGE"

! grep -q "drawSiretNisLabel" "$PDF_HTML"
! grep -q "SIRET_LABEL_V161" "$PDF_HTML"
grep -q "EUC_PFMP_PDF_MASTER_B64_V161F9" "$PDF_GS"

grep -q "EUC_CONVENTION_lireRecordDirectV161_" "$QR_SERVICE"
grep -q "GRIST_ID_DIRECT" "$QR_SERVICE"

python3 <<'PY'
from pathlib import Path
s=Path("apps-script/EUC_PFMP_Monaco_V161Fix8.gs").read_text(encoding="utf-8")
a=s.find("function EUC_V161_rechercherEntrepriseMonaco(")
b=s.find("\nfunction ",a+10)
blk=s[a:b if b>=0 else len(s)]
if "assurerColonnesMonaco_" in blk:
    raise SystemExit("ERREUR : recherche Monaco vérifie encore le schéma.")
print("✓ recherche Monaco sans assurerColonnes")
PY

python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/PFMP_Acces_QR_V116.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_QR_CONTROLLER_FIX9">(.*?)</script>',s,re.S)
if not m: raise SystemExit("ERREUR : contrôleur FIX9 introuvable.")
Path("/tmp/EUC_QR_CONTROLLER_FIX9.js").write_text(m.group(1),encoding="utf-8")
PY

node --check /tmp/EUC_QR_CONTROLLER_FIX9.js

for f in "$QR_SERVICE" "$STRICT_SERVICE" "$MONACO_SERVICE"; do
  cp "$f" "/tmp/$(basename "$f").js"
  node --check "/tmp/$(basename "$f").js"
done

echo "✓ un seul contrôleur QR"
echo "✓ champs entreprise verrouillés par défaut"
echo "✓ France : SIRET vérifié avant enregistrement"
echo "✓ Monaco : NIS obligatoire ; manuel seulement si NIS inconnu"
echo "✓ ouverture QR optimisée par lecture directe"
echo "✓ surcharge PDF supprimée"
echo "✓ cache PDF maître renouvelé"

echo "=== PUSH ==="
clasp push -f

echo "=== VERSION ==="
clasp version "$LABEL"

echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.161 FIX9 DEPLOYEE AVEC SUCCES"
echo "============================================================"
