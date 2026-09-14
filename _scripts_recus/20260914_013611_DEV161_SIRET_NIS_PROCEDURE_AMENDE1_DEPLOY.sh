#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-siret-nis-procedure-amende1"
QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_siret_nis_${STAMP}"
mkdir -p "$BACKUP"
cp "$QR_PAGE" "$BACKUP/"
cp "$QR_SERVICE" "$BACKUP/"

cat > /tmp/EUC_SIRET_NIS_StrictV161.gs <<'EOF'
function EUC_V161_verifierSiretFrance(siret){
  siret=String(siret||'').replace(/\D/g,'');
  if(!/^\d{14}$/.test(siret)) throw new Error('Le SIRET doit comporter exactement 14 chiffres.');
  var r=EUC_ENT_rechercherSiret(siret);
  if(!r || r.ok===false || r.found===false) return {found:false};
  var d=r.entreprise||r.data||r;
  function p(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;}return '';}
  return {
    found:true,
    entrepriseSiret:siret,
    entrepriseRaisonSociale:p(d.raisonSociale,d.raison_sociale,d.nom,d.nom_complet,d.denomination),
    entrepriseEnseigne:p(d.enseigne,d.nomCommercial,d.nom_commercial),
    entrepriseAdresse:p(d.adresse,d.adresse_complete,d.adresseComplete),
    entrepriseComplement:p(d.complement,d.complement_adresse,d.complementAdresse),
    entrepriseCodePostal:p(d.codePostal,d.code_postal,d.cp),
    entrepriseCommune:p(d.commune,d.ville,d.localite),
    entreprisePays:'France'
  };
}

function EUC_V161_normaliserNIS_(nis){
  return String(nis||'').trim().toUpperCase().replace(/[\s-]+/g,'');
}

function EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_(nis){
  nis=EUC_V161_normaliserNIS_(nis);
  if(!nis) throw new Error('Le NIS est obligatoire pour une entreprise monégasque.');
  var r=EUC_V161_rechercherEntrepriseMonaco(nis);
  return r&&r.found ? r : null;
}
EOF

cp /tmp/EUC_SIRET_NIS_StrictV161.gs apps-script/EUC_SIRET_NIS_StrictV161.gs

cat > /tmp/EUC_SIRET_NIS_FRONTEND_V161.html <<'EOF'
<script id="EUC_SIRET_NIS_STRICT_V161">
(function(){
  function F(id){return document.getElementById(id)||(typeof field==='function'?field(id):null);}
  function T(v){return String(v==null?'':v).trim();}
  function D(v){return T(v).replace(/\D/g,'');}
  function N(v){return T(v).toUpperCase().replace(/[\s-]+/g,'');}
  function V(id,v){var e=F(id);if(e)e.value=v==null?'':v;}
  function L(id,on){var e=F(id);if(!e)return;e.readOnly=!!on;e.disabled=false;e.classList.toggle('euc-locked',!!on);}
  function LI(on,ens){['entrepriseRaisonSociale','entrepriseAdresse','entrepriseComplement','entrepriseCodePostal','entrepriseCommune','entreprisePays'].forEach(function(x){L(x,on);});if(ens)L('entrepriseEnseigne',on);}
  function C(ens){V('entrepriseRaisonSociale','');if(ens)V('entrepriseEnseigne','');V('entrepriseAdresse','');V('entrepriseComplement','');V('entrepriseCodePostal','');V('entrepriseCommune','');}
  function M(t,e){if(typeof msg==='function')msg(t,!!e);}
  function FI(r,ens){V('entrepriseRaisonSociale',r.entrepriseRaisonSociale||r.nom||'');V('entrepriseEnseigne',r.entrepriseEnseigne||r.enseigne||'');V('entrepriseAdresse',r.entrepriseAdresse||r.adresse||'');V('entrepriseComplement',r.entrepriseComplement||r.complement||'');V('entrepriseCodePostal',r.entrepriseCodePostal||r.cp||r.codePostal||'');V('entrepriseCommune',r.entrepriseCommune||r.ville||r.commune||'');V('entreprisePays',r.entreprisePays||r.pays||'');LI(true,!!ens);}

  function bind(){
    var country=F('entreprisePaysSelectV161'), input=F('siret'), search=F('search'), save=F('save');
    if(!country||!input||!search||!save)return;

    function mode(){
      if(country.value==='France'){
        V('entreprisePays','France'); input.value=D(input.value).slice(0,14);
        input.setAttribute('maxlength','14'); input.setAttribute('pattern','[0-9]{14}'); input.setAttribute('inputmode','numeric');
        C(false); LI(true,false); L('entrepriseEnseigne',false);
        document.documentElement.dataset.eucFranceVerified='0'; document.documentElement.dataset.eucMonacoManual='0';
        search.disabled=input.value.length!==14;
      }else{
        V('entreprisePays','Monaco'); input.value=N(input.value); input.removeAttribute('maxlength'); input.removeAttribute('pattern'); input.setAttribute('inputmode','text');
        C(true); LI(true,true);
        document.documentElement.dataset.eucFranceVerified='0'; document.documentElement.dataset.eucMonacoManual='0';
        search.disabled=!T(input.value);
      }
    }

    country.addEventListener('change',mode);
    input.addEventListener('input',function(){
      if(country.value==='France'){
        input.value=D(input.value).slice(0,14); document.documentElement.dataset.eucFranceVerified='0'; C(false); LI(true,false); L('entrepriseEnseigne',false); search.disabled=input.value.length!==14;
      }else{
        input.value=N(input.value); document.documentElement.dataset.eucMonacoManual='0'; C(true); LI(true,true); search.disabled=!N(input.value);
      }
    });

    search.addEventListener('click',function(ev){
      ev.preventDefault(); ev.stopImmediatePropagation();

      if(country.value==='France'){
        var siret=D(input.value);
        if(siret.length!==14){M('Le SIRET est obligatoire et doit comporter 14 chiffres.',true);return;}
        search.disabled=true; M('Recherche du SIRET dans la base officielle…',false);
        google.script.run.withSuccessHandler(function(r){
          search.disabled=false;
          if(!r||!r.found){document.documentElement.dataset.eucFranceVerified='0';C(false);LI(true,false);L('entrepriseEnseigne',false);M('SIRET non retrouvé : enregistrement impossible.',true);return;}
          FI(r,false);V('entreprisePays','France');document.documentElement.dataset.eucFranceVerified='1';LI(true,false);L('entrepriseEnseigne',false);M('✓ Entreprise française retrouvée. Données officielles verrouillées.',false);
        }).withFailureHandler(function(e){search.disabled=false;document.documentElement.dataset.eucFranceVerified='0';C(false);LI(true,false);M('Erreur SIRET : '+(e&&e.message||e),true);}).EUC_V161_verifierSiretFrance(siret);
      }else{
        var nis=N(input.value); input.value=nis;
        if(!nis){M('Le NIS est obligatoire pour une entreprise monégasque.',true);return;}
        search.disabled=true; M('Recherche du NIS dans notre référentiel…',false);
        google.script.run.withSuccessHandler(function(r){
          search.disabled=false;
          if(r&&r.found){FI(r,true);V('entreprisePays','Monaco');document.documentElement.dataset.eucMonacoManual='0';M('✓ Entreprise monégasque retrouvée. Données verrouillées.',false);}
          else{C(true);V('entreprisePays','Monaco');LI(false,true);L('entreprisePays',true);document.documentElement.dataset.eucMonacoManual='1';M('Entreprise absente de notre base. Merci de compléter manuellement ses coordonnées.',false);var x=F('entrepriseRaisonSociale');if(x)x.focus();}
        }).withFailureHandler(function(e){search.disabled=false;document.documentElement.dataset.eucMonacoManual='0';LI(true,true);M('Erreur NIS : '+(e&&e.message||e),true);}).EUC_V161_rechercherEntrepriseMonaco(nis);
      }
    },true);

    save.addEventListener('click',function(ev){
      if(country.value==='France' && (D(input.value).length!==14 || document.documentElement.dataset.eucFranceVerified!=='1')){
        ev.preventDefault();ev.stopImmediatePropagation();M('Recherche SIRET obligatoire avant enregistrement.',true);return;
      }
      if(country.value==='Monaco'){
        input.value=N(input.value); if(!N(input.value)){ev.preventDefault();ev.stopImmediatePropagation();M('Le NIS est obligatoire pour une entreprise monégasque.',true);return;}
        if(document.documentElement.dataset.eucMonacoManual==='1'){
          var req=[['entrepriseRaisonSociale','raison sociale'],['entrepriseAdresse','adresse'],['entrepriseCodePostal','code postal'],['entrepriseCommune','ville']];
          for(var i=0;i<req.length;i++){if(!T((F(req[i][0])||{}).value)){ev.preventDefault();ev.stopImmediatePropagation();M('Le champ '+req[i][1]+' est obligatoire.',true);return;}}
        }
      }
    },true);

    mode();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
</script>
<style id="EUC_SIRET_NIS_STRICT_STYLE_V161">.euc-locked{background:#eef1f3!important;color:#5d666d!important;cursor:not-allowed!important}</style>
EOF

python3 <<'PY'
from pathlib import Path
import re
p=Path("apps-script/PFMP_Acces_QR_V116.html")
s=p.read_text(encoding="utf-8")
b=Path("/tmp/EUC_SIRET_NIS_FRONTEND_V161.html").read_text(encoding="utf-8")
s=re.sub(r'\n?<script id="EUC_SIRET_NIS_STRICT_V161">.*?</script>\s*<style id="EUC_SIRET_NIS_STRICT_STYLE_V161">.*?</style>\n?','\n',s,flags=re.S)
if "</body>" not in s: raise SystemExit("ERREUR : </body> introuvable.")
s=s.replace("</body>",b+"\n</body>",1)
p.write_text(s,encoding="utf-8")
PY

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")
a=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
if a<0: raise SystemExit("ERREUR : fonction enregistrerEntrepriseV117 introuvable pour normalisation NIS.")
b=s.find("\nfunction ",a+10)
if b<0: b=len(s)
blk=s[a:b]

if "EUC_V161_normaliserNIS_(" not in blk:
    patterns=[
        (r"var nis=estMonaco\?identifiant:'';","var nis=estMonaco?EUC_V161_normaliserNIS_(identifiant):'';if(estMonaco)d.entrepriseSiret=nis;"),
        (r"var nis=estMonaco\?siret:'';","var nis=estMonaco?EUC_V161_normaliserNIS_(siret):'';if(estMonaco)d.entrepriseSiret=nis;")
    ]
    for pat,repl in patterns:
        blk2,n=re.subn(pat,repl,blk,count=1)
        if n:
            blk=blk2
            break
    else:
        raise SystemExit("ERREUR : déclaration NIS introuvable pour normalisation.")

s=s[:a]+blk+s[b:]
p.write_text(s,encoding="utf-8")
print("OK : NIS normalisé avant recherche et sauvegarde.")
PY

python3 <<'PY'
from pathlib import Path
p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")
a=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
if a<0: raise SystemExit("ERREUR : fonction enregistrerEntrepriseV117 introuvable.")
b=s.find("\nfunction ",a+10)
if b<0: b=len(s)
blk=s[a:b]

needle="if(!estMonaco&&!siret){\n    throw new Error('Le SIRET est obligatoire pour une entreprise française.');\n  }"
insert="if(!estMonaco&&!siret){\n    throw new Error('Le SIRET est obligatoire pour une entreprise française.');\n  }\n\n  var officielFrance=null;\n  var officielMonaco=null;\n  if(!estMonaco){\n    officielFrance=EUC_V161_verifierSiretFrance(siret);\n    if(!officielFrance||!officielFrance.found) throw new Error('SIRET non retrouvé dans la base officielle. Enregistrement impossible.');\n    raison=String(officielFrance.entrepriseRaisonSociale||'').trim();\n    adresse=String(officielFrance.entrepriseAdresse||'').trim();\n    commune=String(officielFrance.entrepriseCommune||'').trim();\n    d.entrepriseComplement=officielFrance.entrepriseComplement||'';\n    d.entrepriseCodePostal=officielFrance.entrepriseCodePostal||'';\n    pays='France';\n  }else{\n    officielMonaco=EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_(nis);\n    if(officielMonaco){\n      raison=String(officielMonaco.nom||'').trim();\n      adresse=String(officielMonaco.adresse||'').trim();\n      commune=String(officielMonaco.ville||'Monaco').trim();\n      d.entrepriseComplement=officielMonaco.complement||'';\n      d.entrepriseCodePostal=officielMonaco.cp||'';\n      if(officielMonaco.enseigne&&!String(d.entrepriseEnseigne||'').trim()) d.entrepriseEnseigne=officielMonaco.enseigne;\n    }\n  }"

if "EUC_V161_verifierSiretFrance" not in blk:
    if needle not in blk: raise SystemExit("ERREUR : bloc validation SIRET introuvable.")
    blk=blk.replace(needle,insert,1)

blk=blk.replace("Entreprise_validation_statut:estMonaco?'A_VALIDER':'VALIDE',","Entreprise_validation_statut:estMonaco?(officielMonaco?'VALIDE':'A_VALIDER'):'VALIDE',",1)
blk=blk.replace("if(estMonaco){\n    try{\n      EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d);","if(estMonaco&&!officielMonaco){\n    try{\n      EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d);",1)

s=s[:a]+blk+s[b:]
p.write_text(s,encoding="utf-8")
PY

python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/PFMP_Acces_QR_V116.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_SIRET_NIS_STRICT_V161">(.*?)</script>',s,re.S)
if not m: raise SystemExit("ERREUR : frontend introuvable.")
Path("/tmp/front.js").write_text(m.group(1),encoding="utf-8")
PY

node --check /tmp/front.js
cp "$QR_SERVICE" /tmp/qrservice.js
cp apps-script/EUC_SIRET_NIS_StrictV161.gs /tmp/strict.js
node --check /tmp/qrservice.js
node --check /tmp/strict.js

grep -q "Recherche SIRET obligatoire avant enregistrement" "$QR_PAGE"
grep -q "Entreprise absente de notre base" "$QR_PAGE"
grep -q "EUC_V161_verifierSiretFrance" "$QR_SERVICE"
grep -q "officielMonaco" "$QR_SERVICE"
grep -q "EUC_V161_normaliserNIS_" apps-script/EUC_SIRET_NIS_StrictV161.gs
grep -q "function N(v)" "$QR_PAGE"
grep -q "EUC_V161_normaliserNIS_(" "$QR_SERVICE"

echo "✓ France : SIRET obligatoire + recherche officielle + champs verrouillés"
echo "✓ Monaco : NIS obligatoire + recherche interne"
echo "✓ Monaco : NIS normalisé en MAJUSCULES sans espaces ni tirets"
echo "✓ Monaco connu : champs verrouillés"
echo "✓ Monaco inconnu : saisie manuelle autorisée + A_VALIDER"

clasp push -f
clasp version "$LABEL"
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.161 — SIRET / NIS DEPLOYE AVEC SUCCES"
echo "============================================================"
